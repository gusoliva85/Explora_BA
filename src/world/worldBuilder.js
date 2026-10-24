import * as pc from 'playcanvas';
import { Box2D } from '../physics/collisionWorld.js';
import { UNITS } from '../config/balance.js';
import { createRng } from '../core/rng.js';

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

const COLORS = {
  asphalt: [0.14, 0.145, 0.16],
  sidewalk: [0.34, 0.34, 0.33],
  curb: [0.42, 0.42, 0.40],
  facade: [
    [0.42, 0.36, 0.30],
    [0.33, 0.35, 0.38],
    [0.46, 0.42, 0.36],
    [0.30, 0.32, 0.30],
    [0.38, 0.30, 0.28]
  ],
  shutter: [0.22, 0.24, 0.26],
  car: [
    [0.30, 0.10, 0.10],
    [0.12, 0.18, 0.30],
    [0.20, 0.20, 0.22],
    [0.45, 0.45, 0.43]
  ],
  checkpoint: [0.88, 0.65, 0.15],
  goal: [0.25, 0.76, 0.45]
};

export class WorldBuilder {
  /**
   * @param {pc.Application} app
   * @param {import('../physics/collisionWorld.js').CollisionWorld} collision
   */
  constructor(app, collision) {
    this.app = app;
    this.collision = collision;
    /** @type {pc.Entity} raiz de todo lo construido, para poder borrarlo de una. */
    this.root = new pc.Entity('World');
    this.app.root.addChild(this.root);
    /** @type {Map<string, pc.StandardMaterial>} */
    this.materials = new Map();
    this.stats = { boxes: 0, colliders: 0 };
  }

  /** Materiales cacheados por color: menos materiales = menos draw calls. */
  material(rgb) {
    const key = rgb.map((v) => v.toFixed(3)).join(',');
    let m = this.materials.get(key);
    if (!m) {
      m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
      m.gloss = 0.1;
      m.metalness = 0;
      m.useMetalness = true;
      m.update();
      this.materials.set(key, m);
    }
    return m;
  }

  /**
   * Caja visual, con colision opcional.
   * @param {{x:number,y:number,z:number}} pos centro de la caja
   */
  addBox(name, pos, size, rgb, { collide = false, tag = 'static' } = {}) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'box', material: this.material(rgb), castShadows: false });
    e.setLocalScale(size.x, size.y, size.z);
    e.setPosition(pos.x, pos.y, pos.z);
    this.root.addChild(e);
    this.stats.boxes++;

    if (collide) {
      this.collision.add(Box2D.fromCenter(pos.x, pos.z, size.x, size.z, tag));
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
    const e = new pc.Entity(name);
    e.addComponent('render', { type: 'cylinder', material: this.material(rgb), castShadows: false });
    e.setLocalScale(radius * 2, 0.08, radius * 2);
    e.setPosition(point.x, 0.04, point.z);
    this.root.addChild(e);

    // Baliza vertical para verlo por encima de los autos y las barricadas.
    const beacon = new pc.Entity(`${name}_Baliza`);
    beacon.addComponent('render', { type: 'box', material: this.material(rgb), castShadows: false });
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
      COLORS.asphalt
    );

    // Veredas y cordones, uno a cada lado.
    for (const side of [-1, 1]) {
      const offset = (road + walk) / 2 * side;
      const wSize = size(length, walk);
      this.addBox(
        `Vereda_${index}_${side}`,
        { x: cx + (alongX ? 0 : offset), y: UNITS.curbHeight / 2, z: cz + (alongX ? offset : 0) },
        { x: wSize.x, y: UNITS.curbHeight, z: wSize.z },
        COLORS.sidewalk
      );

      // Cordon: solo visual. Que el jugador pueda subir a la vereda sin
      // tropezar es intencional; la colision real son los edificios.
      const curbOffset = (road / 2) * side;
      const cSize = size(length, 0.25);
      this.addBox(
        `Cordon_${index}_${side}`,
        { x: cx + (alongX ? 0 : curbOffset), y: UNITS.curbHeight, z: cz + (alongX ? curbOffset : 0) },
        { x: cSize.x, y: 0.06, z: cSize.z },
        COLORS.curb
      );

      this.#buildFacadeRow(a, b, alongX, length, side, full, cfg, rng, index);
    }

    this.#buildProps(a, b, alongX, length, road, rng, index);
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
        tag: 'building'
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
      this.addBox(`Persiana_${index}_${side}_${n}`, pbPos, pbSz, COLORS.shutter);

      cursor += width;
      n++;
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
        tag: 'vehicle'
      });
    }
  }

  destroy() {
    this.root.destroy();
    this.collision.clear();
    this.materials.clear();
    this.stats = { boxes: 0, colliders: 0 };
  }
}
