/**
 * ===========================================================================
 * MUNDO DE COLISIONES 2D
 * ===========================================================================
 * El escenario es una ciudad: paredes verticales sobre suelo plano. Eso se
 * resuelve con circulos contra rectangulos en el plano XZ, sin necesidad de
 * un motor de fisica completo (ver doc 02, decision D-09).
 *
 * Ventajas concretas: cero descargas de wasm, cero coste de arranque en
 * movil, comportamiento determinista (el jugador nunca "vibra" ni atraviesa
 * una pared por un frame largo) y un unico lugar donde depurar el
 * movimiento. Si mas adelante hacen falta ragdolls o escombros, se agrega
 * ammo.js solo para eso, sin tocar al jugador ni a los zombis.
 */

/**
 * Caja alineada a los ejes, en el plano XZ.
 *
 * Guarda tambien su altura. El movimiento no la usa —todo pasa a ras del
 * piso— pero la camara si: vuela a casi veinte metros y necesita saber que
 * un auto de metro y medio no puede taparla.
 */
export class Box2D {
  constructor(minX, minZ, maxX, maxZ, tag = 'static', height = Infinity) {
    this.minX = minX;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxZ = maxZ;
    this.tag = tag;
    this.height = height;
  }

  /** Crea una caja desde centro y tamaño. */
  static fromCenter(cx, cz, width, depth, tag = 'static', height = Infinity) {
    return new Box2D(
      cx - width / 2, cz - depth / 2,
      cx + width / 2, cz + depth / 2,
      tag, height
    );
  }

  contains(x, z) {
    return x >= this.minX && x <= this.maxX && z >= this.minZ && z <= this.maxZ;
  }
}

export class CollisionWorld {
  constructor(cellSize = 8) {
    /** @type {Box2D[]} */
    this.boxes = [];
    /**
     * Grilla espacial. Sin esto, cada zombi compararia contra cada pared en
     * cada frame; con 12 zombis y 200 cajas serian 2400 pruebas por frame.
     */
    this.cellSize = cellSize;
    /** @type {Map<string, Box2D[]>} */
    this.grid = new Map();
  }

  add(box) {
    this.boxes.push(box);
    this.#index(box);
    return box;
  }

  clear() {
    this.boxes.length = 0;
    this.grid.clear();
  }

  #key(cx, cz) {
    return `${cx},${cz}`;
  }

  #index(box) {
    const c = this.cellSize;
    const x0 = Math.floor(box.minX / c);
    const x1 = Math.floor(box.maxX / c);
    const z0 = Math.floor(box.minZ / c);
    const z1 = Math.floor(box.maxZ / c);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const k = this.#key(x, z);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(box);
      }
    }
  }

  /** Cajas candidatas para un circulo en (x, z) de radio `r`. */
  query(x, z, r) {
    const c = this.cellSize;
    const x0 = Math.floor((x - r) / c);
    const x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c);
    const z1 = Math.floor((z + r) / c);
    const out = new Set();
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const cell = this.grid.get(this.#key(cx, cz));
        if (cell) for (const b of cell) out.add(b);
      }
    }
    return out;
  }

  /**
   * Mueve un circulo de `from` por `delta` y devuelve la posicion resuelta.
   *
   * Se mueve en X y en Z por separado. Eso produce el "deslizar por la
   * pared" que el jugador espera: si vas en diagonal contra un muro, seguis
   * avanzando por el eje libre en vez de frenar en seco.
   *
   * El desplazamiento se subdivide en pasos menores al radio. Sin esto, un
   * frame largo (cambio de pestaña, pico de GC, telefono lento) o una
   * bazooka empujando al jugador lo haria atravesar una pared finita: a
   * mitad de camino el circulo ya esta del otro lado y no hay solape que
   * detectar. Es el bug clasico de tunneling, y lo cubre un test.
   *
   * @param {{x:number,z:number}} from
   * @param {number} dx
   * @param {number} dz
   * @param {number} radius
   * @returns {{x:number, z:number, hitX:boolean, hitZ:boolean}}
   */
  moveCircle(from, dx, dz, radius) {
    let x = from.x;
    let z = from.z;
    let hitX = false;
    let hitZ = false;

    const dist = Math.hypot(dx, dz);
    const maxStep = radius * 0.8;
    const steps = Math.max(1, Math.ceil(dist / maxStep));
    const sx = dx / steps;
    const sz = dz / steps;

    for (let i = 0; i < steps; i++) {
      if (sx !== 0) {
        x += sx;
        const r = this.#resolveAxis(x, z, radius, 'x');
        if (r !== null) {
          x = r;
          hitX = true;
        }
      }
      if (sz !== 0) {
        z += sz;
        const r = this.#resolveAxis(x, z, radius, 'z');
        if (r !== null) {
          z = r;
          hitZ = true;
        }
      }
    }

    return { x, z, hitX, hitZ };
  }

  /**
   * Si el circulo penetra alguna caja, devuelve la coordenada corregida del
   * eje indicado. Devuelve null si no hay penetracion.
   */
  #resolveAxis(x, z, radius, axis) {
    let corrected = null;
    let value = axis === 'x' ? x : z;

    for (const b of this.query(x, z, radius)) {
      // Punto de la caja mas cercano al centro del circulo.
      const nx = Math.max(b.minX, Math.min(x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const ddx = x - nx;
      const ddz = z - nz;
      if (ddx * ddx + ddz * ddz >= radius * radius) continue;

      // Hay solape: empuja hacia el lado mas cercano del eje que se movio.
      if (axis === 'x') {
        const toLeft = b.minX - radius;
        const toRight = b.maxX + radius;
        value = Math.abs(x - toLeft) < Math.abs(x - toRight) ? toLeft : toRight;
        x = value;
      } else {
        const toBack = b.minZ - radius;
        const toFront = b.maxZ + radius;
        value = Math.abs(z - toBack) < Math.abs(z - toFront) ? toBack : toFront;
        z = value;
      }
      corrected = value;
    }

    return corrected;
  }

  /**
   * Linea de vision entre dos puntos del plano XZ.
   *
   * Lo usa la IA del zombi para no "verte" a traves de una pared y el
   * disparo de la pistola para no atravesar edificios. Algoritmo de slab
   * sobre cada caja candidata, que para cajas alineadas a ejes es exacto y
   * muy barato.
   *
   * @returns {boolean} true si NO hay obstaculo entre a y b.
   */
  hasLineOfSight(ax, az, bx, bz, alturaMinima = 0) {
    return this.raycast(ax, az, bx, bz, alturaMinima) === null;
  }

  /**
   * Lanza un rayo de (ax,az) a (bx,bz).
   *
   * @param {number} [alturaMinima] ignora las cajas mas bajas que esto. La
   *   camara lo usa para que un auto o un cordon no le tapen la vista
   *   cuando esta volando por encima de los techos.
   * @returns {{x:number, z:number, t:number, box:Box2D}|null} impacto mas cercano, o null.
   */
  raycast(ax, az, bx, bz, alturaMinima = 0) {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len === 0) return null;

    // Se recorre la grilla por celdas a lo largo del rayo para no probar
    // todas las cajas del mapa.
    const candidates = new Set();
    const c = this.cellSize;
    const steps = Math.max(1, Math.ceil(len / c) * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = ax + dx * t;
      const pz = az + dz * t;
      const cell = this.grid.get(`${Math.floor(px / c)},${Math.floor(pz / c)}`);
      if (cell) for (const b of cell) candidates.add(b);
    }

    let best = null;
    for (const b of candidates) {
      if (b.height < alturaMinima) continue;
      const hit = rayBox2D(ax, az, dx, dz, b);
      if (hit !== null && (best === null || hit < best.t)) {
        best = { t: hit, box: b, x: ax + dx * hit, z: az + dz * hit };
      }
    }
    return best;
  }
}

/**
 * Interseccion rayo-caja por el metodo de slabs.
 * @returns {number|null} t en [0,1] del primer impacto, o null.
 */
export function rayBox2D(ox, oz, dx, dz, box) {
  let tmin = 0;
  let tmax = 1;

  for (const axis of ['x', 'z']) {
    const o = axis === 'x' ? ox : oz;
    const d = axis === 'x' ? dx : dz;
    const lo = axis === 'x' ? box.minX : box.minZ;
    const hi = axis === 'x' ? box.maxX : box.maxZ;

    if (Math.abs(d) < 1e-9) {
      // Rayo paralelo a este eje: o esta dentro de la franja, o no toca nunca.
      if (o < lo || o > hi) return null;
      continue;
    }

    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  return tmin;
}
