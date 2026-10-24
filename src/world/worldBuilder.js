import * as pc from 'playcanvas';
import { Box2D } from '../physics/collisionWorld.js';
import { UNITS } from '../config/balance.js';
import { createRng } from '../core/rng.js';
import { crearFarol, LUZ } from './lighting.js';

/**
 * ===========================================================================
 * CONSTRUCTOR DE ESCENARIO (grey-box)
 * ===========================================================================
 * Arma la ciudad con cajas a partir de la polilinea de la mision. Esto es
 * deliberadamente provisional: sirve para validar escala, recorrido,
 * colisiones y rendimiento ANTES de modelar nada en Blender. Cuando existan
 * los modulos definitivos, se reemplaza la caja por el modelo en el mismo
 * sitio y con la misma caja de colision.
 *
 * Todo lo aleatorio sale de la semilla de la mision, asi el mapa es siempre
 * el mismo entre recargas y entre la PC y el telefono.
 */

/** Metros de calle que se construyen por detras del punto de aparicion. */
const PROLOGO = 26;

/** Devuelve un punto `metros` mas atras de `a`, sobre la recta que va de a hacia b. */
function extenderHaciaAtras(a, b, metros) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: a.x - (dx / len) * metros, z: a.z - (dz / len) * metros };
}

/*
 * Colores base. Son mucho mas oscuros de lo que uno esperaria, y es a
 * proposito: con iluminacion real lo que se ve en pantalla es luz
 * reflejada, no el color plano del material. Un asfalto con 0.14 de
 * difuso, bajo un farol de sodio, sale blanco quemado.
 *
 * Cada entrada lleva ademas brillo y metalicidad, que es lo que diferencia
 * una chapa de auto de una pared revocada bajo la misma luz.
 */
const COLORS = {
  asphalt: [0.115, 0.122, 0.138],
  asphaltWet: [0.085, 0.095, 0.12],
  sidewalk: [0.21, 0.215, 0.222],
  curb: [0.27, 0.27, 0.26],
  facade: [
    [0.3, 0.25, 0.19],
    [0.19, 0.21, 0.24],
    [0.34, 0.3, 0.23],
    [0.17, 0.2, 0.18],
    [0.27, 0.19, 0.17]
  ],
  shutter: [0.1, 0.11, 0.12],
  car: [
    [0.22, 0.045, 0.04],
    [0.04, 0.085, 0.2],
    [0.08, 0.085, 0.095],
    [0.26, 0.245, 0.21]
  ],
  checkpoint: [0.88, 0.65, 0.15],
  goal: [0.25, 0.76, 0.45]
};

/** Acabados: cuanto brilla y cuanto de metal tiene cada tipo de superficie. */
const ACABADO = {
  asfalto: { gloss: 0.42, metalness: 0.0 },
  vereda: { gloss: 0.22, metalness: 0.0 },
  revoque: { gloss: 0.12, metalness: 0.0 },
  chapa: { gloss: 0.78, metalness: 0.65 },
  persiana: { gloss: 0.55, metalness: 0.8 }
};

export class WorldBuilder {
  /**
   * @param {pc.Application} app
   * @param {import('../physics/collisionWorld.js').CollisionWorld} collision
   */
  constructor(app, collision, matsLuz) {
    this.app = app;
    this.collision = collision;
    /** Materiales compartidos de iluminacion: faroles y ventanas. */
    this.matsLuz = matsLuz;
    /** @type {pc.Entity[]} faroles creados, para poder borrarlos. */
    this.faroles = [];
    /** @type {pc.Entity} raiz de todo lo construido, para poder borrarlo de una. */
    this.root = new pc.Entity('World');
    this.app.root.addChild(this.root);
    /** @type {Map<string, pc.StandardMaterial>} */
    this.materials = new Map();
    this.stats = { boxes: 0, colliders: 0, luces: 0, ventanas: 0 };
  }

  /**
   * Materiales cacheados por color y acabado. Reutilizarlos importa: cada
   * material distinto es un cambio de estado en la placa, y con cien cajas
   * en pantalla eso se paga.
   */
  material(rgb, acabado = ACABADO.revoque) {
    const key = rgb.map((v) => v.toFixed(3)).join(',') + '|' + acabado.gloss + '|' + acabado.metalness;
    let m = this.materials.get(key);
    if (!m) {
      m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
      m.gloss = acabado.gloss;
      m.metalness = acabado.metalness;
      m.useMetalness = true;
      m.update();
      this.materials.set(key, m);
    }
    return m;
  }

  /**
   * Material emisivo cacheado. Lo usan los marcadores de objetivo: con el
   * bloom encendido, un emisivo por encima de 1 derrama luz y se ve desde
   * lejos aunque este tapado por el humo o la niebla.
   */
  materialEmisivo(rgb, intensidad) {
    const key = `E|${rgb.map((v) => v.toFixed(3)).join(',')}|${intensidad}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color(rgb[0], rgb[1], rgb[2]);
      m.emissiveIntensity = intensidad;
      m.useLighting = false;
      m.update();
      this.materials.set(key, m);
    }
    return m;
  }

  /**
   * Caja visual, con colision opcional.
   * @param {{x:number,y:number,z:number}} pos centro de la caja
   */
  addBox(name, pos, size, rgb, { collide = false, tag = 'static', acabado, sombra = false } = {}) {
    const e = new pc.Entity(name);
    e.addComponent('render', {
      type: 'box',
      material: this.material(rgb, acabado),
      castShadows: sombra
    });
    e.setLocalScale(size.x, size.y, size.z);
    e.setPosition(pos.x, pos.y, pos.z);
    this.root.addChild(e);
    this.stats.boxes++;

    if (collide) {
      // La altura real importa para la camara: ver Box2D.
      const alturaCima = pos.y + size.y / 2;
      this.collision.add(Box2D.fromCenter(pos.x, pos.z, size.x, size.z, tag, alturaCima));
      this.stats.colliders++;
    }
    return e;
  }

  /** Construye la mision entera. @returns {{markers: object[]}} */
  build(mission) {
    const rng = createRng(mission.seed);
    const markers = [];

    for (let i = 0; i < mission.route.length - 1; i++) {
      let a = mission.route[i];
      const b = mission.route[i + 1];
      const cfg = mission.blocks[Math.min(i, mission.blocks.length - 1)];

      // El primer tramo se estira hacia atras del punto de aparicion. La
      // camara mira desde arriba y bastante lejos: sin esta cola, al
      // arrancar se ve el borde del mapa en la mitad de abajo de la
      // pantalla. No es jugable, es escenografia.
      if (i === 0) a = extenderHaciaAtras(a, b, PROLOGO);

      this.#buildStreetSegment(a, b, cfg, rng, i);
    }

    // Esquinas: una plancha de vereda que tape el hueco entre dos tramos.
    for (let i = 1; i < mission.route.length - 1; i++) {
      const p = mission.route[i];
      const w = UNITS.streetWidth + UNITS.sidewalkWidth * 2;
      this.addBox(`Esquina_${i}`, { x: p.x, y: -0.05, z: p.z }, { x: w, y: 0.1, z: w }, COLORS.sidewalk);
    }

    // Marcadores de control y destino: cilindros de luz, visibles de lejos.
    for (const cp of mission.checkpoints) {
      const p = mission.route[cp.atRouteIndex];
      markers.push(this.#addMarker(`Control_${cp.atRouteIndex}`, p, cp.radius, COLORS.checkpoint));
    }
    const goalPoint = mission.route[mission.goal.atRouteIndex];
    markers.push(this.#addMarker('Meta', goalPoint, mission.goal.radius, COLORS.goal));

    return { markers, stats: this.stats };
  }

  #addMarker(name, point, radius, rgb) {
    const mat = this.materialEmisivo(rgb, 2.2);
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'cylinder', material: mat, castShadows: false });
    e.setLocalScale(radius * 2, 0.08, radius * 2);
    e.setPosition(point.x, 0.04, point.z);
    this.root.addChild(e);

    // Baliza vertical para verlo por encima de los autos y las barricadas.
    const beacon = new pc.Entity(`${name}_Baliza`);
    beacon.addComponent('render', { type: 'box', material: mat, castShadows: false });
    beacon.setLocalScale(0.35, 6, 0.35);
    beacon.setPosition(point.x, 3, point.z);
    this.root.addChild(beacon);

    return { name, x: point.x, z: point.z, radius, entity: e };
  }

  /** Una cuadra: calzada, veredas, cordones, edificios y props. */
  #buildStreetSegment(a, b, cfg, rng, index) {
    const alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
    const length = alongX ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    const cx = (a.x + b.x) / 2;
    const cz = (a.z + b.z) / 2;

    const road = UNITS.streetWidth;
    const walk = UNITS.sidewalkWidth;
    const full = road + walk * 2;

    const size = (lengthAxis, crossAxis) =>
      alongX ? { x: lengthAxis, y: 0, z: crossAxis } : { x: crossAxis, y: 0, z: lengthAxis };

    // Calzada.
    const roadSize = size(length, road);
    this.addBox(
      `Calzada_${index}`,
      { x: cx, y: -0.06, z: cz },
      { x: roadSize.x, y: 0.12, z: roadSize.z },
      COLORS.asphalt,
      { acabado: ACABADO.asfalto }
    );

    // Veredas y cordones, uno a cada lado.
    for (const side of [-1, 1]) {
      const offset = (road + walk) / 2 * side;
      const wSize = size(length, walk);
      this.addBox(
        `Vereda_${index}_${side}`,
        { x: cx + (alongX ? 0 : offset), y: UNITS.curbHeight / 2, z: cz + (alongX ? offset : 0) },
        { x: wSize.x, y: UNITS.curbHeight, z: wSize.z },
        COLORS.sidewalk,
        { acabado: ACABADO.vereda }
      );

      // Cordon: solo visual. Que el jugador pueda subir a la vereda sin
      // tropezar es intencional; la colision real son los edificios.
      const curbOffset = (road / 2) * side;
      const cSize = size(length, 0.25);
      this.addBox(
        `Cordon_${index}_${side}`,
        { x: cx + (alongX ? 0 : curbOffset), y: UNITS.curbHeight, z: cz + (alongX ? curbOffset : 0) },
        { x: cSize.x, y: 0.06, z: cSize.z },
        COLORS.curb,
        { acabado: ACABADO.vereda }
      );

      this.#buildFacadeRow(a, b, alongX, length, side, full, cfg, rng, index);
    }

    this.#buildProps(a, b, alongX, length, road, rng, index);
    this.#buildFaroles(a, b, alongX, length, road, index);
  }

  /** Hilera de fachadas de ancho variable a un lado de la cuadra. */
  #buildFacadeRow(a, b, alongX, length, side, fullWidth, cfg, rng, index) {
    const depth = 12;
    const centerCross = (fullWidth / 2 + depth / 2) * side;
    const start = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);

    // Margen en las puntas para no tapar las esquinas del recorrido.
    const margin = fullWidth / 2 + 2;
    let cursor = start + margin;
    const end = start + length - margin;
    let n = 0;

    while (cursor < end - 4) {
      const width = Math.min(rng.range(8, 18), end - cursor);
      const centerAlong = cursor + width / 2;
      const [hMin, hMax] = cfg.buildingHeight;
      const height = rng.range(hMin, hMax);

      // Un hueco ocasional: un baldio o un pasaje. Rompe el "muro infinito"
      // y da rutas alternativas que explorar en fases posteriores.
      if (!rng.chance(cfg.density)) {
        cursor += width;
        continue;
      }

      const pos = alongX
        ? { x: centerAlong, y: height / 2, z: (a.z + b.z) / 2 + centerCross }
        : { x: (a.x + b.x) / 2 + centerCross, y: height / 2, z: centerAlong };
      const sz = alongX ? { x: width, y: height, z: depth } : { x: depth, y: height, z: width };

      this.addBox(`Edificio_${index}_${side}_${n}`, pos, sz, rng.pick(COLORS.facade), {
        collide: true,
        tag: 'building',
        acabado: ACABADO.revoque,
        // Los edificios si proyectan sombra: es lo que corta la luz de la
        // luna en franjas a lo largo de la calle y da profundidad.
        sombra: true
      });

      // Planta baja mas oscura: lee como persiana metalica y marca la escala
      // humana del edificio sin costar una textura.
      const pbHeight = Math.min(3.2, height * 0.4);
      const pbDepth = 0.4;
      const pbCross = (fullWidth / 2 + pbDepth / 2) * side;
      const pbPos = alongX
        ? { x: centerAlong, y: pbHeight / 2, z: (a.z + b.z) / 2 + pbCross }
        : { x: (a.x + b.x) / 2 + pbCross, y: pbHeight / 2, z: centerAlong };
      const pbSz = alongX
        ? { x: width * 0.9, y: pbHeight, z: pbDepth }
        : { x: pbDepth, y: pbHeight, z: width * 0.9 };
      this.addBox(`Persiana_${index}_${side}_${n}`, pbPos, pbSz, COLORS.shutter, {
        acabado: ACABADO.persiana
      });

      // Ventanas encendidas en los pisos altos. No iluminan la calle: son
      // puntos emisivos para que el bloom los tome y la fachada deje de ser
      // una masa negra. Cuesta una caja chica por ventana.
      this.#addVentanas(alongX, centerAlong, a, b, side, fullWidth, width, height, rng, index, n);

      cursor += width;
      n++;
    }
  }

  /**
   * Ventanas encendidas en la fachada de un edificio.
   *
   * Se colocan como cajas finisimas pegadas a la pared, con material
   * emisivo y sin recibir luz. Solo se enciende una de cada cuatro: una
   * ciudad donde todas las ventanas estan prendidas no parece abandonada.
   */
  #addVentanas(alongX, centerAlong, a, b, side, fullWidth, width, height, rng, index, n) {
    const mats = this.matsLuz;
    if (!mats) return;

    const cross = (fullWidth / 2 + 0.12) * side;
    const pisos = Math.max(0, Math.floor((height - 4.2) / 3));
    const cols = Math.max(1, Math.round(width / 3));

    for (let p = 0; p < pisos; p++) {
      for (let c = 0; c < cols; c++) {
        if (!rng.chance(0.26)) continue;

        const along = centerAlong - width / 2 + ((c + 0.5) * width) / cols;
        const y = 4.2 + p * 3;
        const mat = rng.chance(0.78) ? mats.ventana : mats.ventanaFria;

        const e = new pc.Entity(`Ventana_${index}_${side}_${n}_${p}_${c}`);
        e.addComponent('render', { type: 'box', material: mat, castShadows: false });
        const w = rng.range(0.9, 1.35);
        const h = rng.range(1.0, 1.4);
        e.setLocalScale(alongX ? w : 0.08, h, alongX ? 0.08 : w);
        e.setPosition(
          alongX ? along : (a.x + b.x) / 2 + cross,
          y,
          alongX ? (a.z + b.z) / 2 + cross : along
        );
        this.root.addChild(e);
        this.stats.ventanas++;
      }
    }
  }

  /**
   * Faroles de sodio a lo largo de la cuadra, alternando de vereda.
   *
   * Son la unica fuente de luz que realmente ilumina la calle. Alternarlos
   * en vez de ponerlos enfrentados deja zonas oscuras entre medio, que es
   * lo que hace que avanzar se sienta como avanzar y no como caminar por
   * un pasillo parejo.
   */
  #buildFaroles(a, b, alongX, length, road, index) {
    if (!this.matsLuz) return;

    const start = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const crossCenter = alongX ? (a.z + b.z) / 2 : (a.x + b.x) / 2;
    const offset = road / 2 + 1.2;

    let lado = index % 2 === 0 ? 1 : -1;
    for (let d = LUZ.farolCada * 0.5; d < length; d += LUZ.farolCada) {
      const along = start + d;
      const cross = crossCenter + offset * lado;
      const pos = alongX ? { x: along, z: cross } : { x: cross, z: along };

      // El brazo mira hacia el centro de la calzada.
      let angulo;
      if (alongX) angulo = lado > 0 ? 0 : 180;
      else angulo = lado > 0 ? 270 : 90;

      this.faroles.push(crearFarol(this.app, pos, angulo, this.matsLuz));
      this.stats.luces++;
      lado *= -1;
    }
  }

  /** Autos abandonados y barricadas: obstaculos y cobertura. */
  #buildProps(a, b, alongX, length, road, rng, index) {
    const start = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const crossCenter = alongX ? (a.z + b.z) / 2 : (a.x + b.x) / 2;
    const count = Math.max(2, Math.floor(length / 28));

    for (let i = 0; i < count; i++) {
      const along = start + rng.range(12, length - 12);
      const cross = crossCenter + rng.range(-road / 2 + 1.6, road / 2 - 1.6);
      const isBus = rng.chance(0.18);

      const len = isBus ? 11 : rng.range(4.1, 4.7);
      const wide = isBus ? 2.5 : 1.85;
      const high = isBus ? 3.0 : 1.5;
      // Girado al azar: un auto cruzado estrecha el paso y obliga a decidir.
      const turned = rng.chance(0.3);
      const aLen = turned ? wide : len;
      const aWide = turned ? len : wide;

      const pos = alongX
        ? { x: along, y: high / 2, z: cross }
        : { x: cross, y: high / 2, z: along };
      const sz = alongX ? { x: aLen, y: high, z: aWide } : { x: aWide, y: high, z: aLen };

      this.addBox(`${isBus ? 'Colectivo' : 'Auto'}_${index}_${i}`, pos, sz, rng.pick(COLORS.car), {
        collide: true,
        tag: 'vehicle',
        acabado: ACABADO.chapa,
        sombra: true
      });
    }
  }

  destroy() {
    this.root.destroy();
    for (const f of this.faroles) f.destroy();
    this.faroles.length = 0;
    this.collision.clear();
    this.materials.clear();
    this.stats = { boxes: 0, colliders: 0, luces: 0, ventanas: 0 };
  }
}
