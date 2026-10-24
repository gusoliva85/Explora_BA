import * as pc from 'playcanvas';
import { Box2D } from '../physics/collisionWorld.js';
import { UNITS } from '../config/balance.js';
import { createRng } from '../core/rng.js';
import { crearFarol, LUZ } from './lighting.js';
import { COLORS, ACABADO, Materiales } from './palette.js';
import { PROPS } from './props.js';

/**
 * ===========================================================================
 * CONSTRUCTOR DE ESCENARIO
 * ===========================================================================
 * Arma la cuadra a partir de la polilinea de la mision: calzada, veredas,
 * pintura vial, hileras de edificios, mobiliario urbano, vehiculos y los
 * obstaculos que el diseño pide colocar a mano.
 *
 * ---------------------------------------------------------------------------
 * COLOCADO A MANO vs. GENERADO
 * ---------------------------------------------------------------------------
 * Las dos cosas conviven, y la division no es arbitraria:
 *
 *   GENERADO  todo lo que es relleno y tiene que variar sin que importe
 *             donde cae exactamente: edificios, arboles, autos sueltos,
 *             bolsas de basura. Sale de una semilla, asi que es siempre
 *             igual entre recargas y entre la PC y el telefono.
 *
 *   A MANO    todo lo que es decision de diseño: donde esta la barricada
 *             que obliga a desviarse, donde el kiosco que marca el
 *             control, por donde se entra al pasaje. Vive en el archivo de
 *             la mision, porque es diseño de nivel, no generacion.
 *
 * Si algo cambia como se JUEGA, va a mano. Si solo cambia como se VE, se
 * genera.
 *
 * ---------------------------------------------------------------------------
 * AGRUPADO DE MALLAS
 * ---------------------------------------------------------------------------
 * Un arbol son nueve piezas y hay veinte arboles. Dibujados de a uno serian
 * ciento ochenta llamadas de dibujo solo en vegetacion. El agrupado
 * estatico del motor funde todas las mallas que comparten material, y lo
 * baja a unas pocas decenas. Es la diferencia entre que esto corra en un
 * telefono o no.
 */

/** Metros de calle que se construyen por detras del punto de aparicion. */
const PROLOGO = 26;

/** Devuelve un punto `metros` mas atras de `a`, sobre la recta de a hacia b. */
function extenderHaciaAtras(a, b, metros) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: a.x - (dx / len) * metros, z: a.z - (dz / len) * metros };
}

export class WorldBuilder {
  /**
   * @param {pc.Application} app
   * @param {import('../physics/collisionWorld.js').CollisionWorld} collision
   * @param {object} matsLuz materiales compartidos de iluminacion
   */
  constructor(app, collision, matsLuz) {
    this.app = app;
    this.collision = collision;
    this.matsLuz = matsLuz;

    /** @type {pc.Entity} raiz de todo lo construido, para poder borrarlo de una. */
    this.root = new pc.Entity('World');
    this.app.root.addChild(this.root);

    this.mats = new Materiales();
    this.faroles = [];

    /*
     * Grupo de agrupado estatico. `dynamic: false` promete que nada de lo
     * que entre se va a mover, que es lo que permite fundir las mallas.
     * El tope de tamaño evita que una sola malla gigante arruine el
     * descarte por volumen: si todo fuera un unico objeto, nunca se podria
     * descartar nada que este fuera de pantalla.
     */
    this.grupoEstatico = this.app.batcher.addGroup('mundo', false, 60);

    /**
     * Zonas que el diseño reserva. Todo lo colocado a mano reclama un
     * radio alrededor suyo donde el generador no puede poner nada.
     *
     * Sin esto, un auto generado al azar puede caer justo al lado de la
     * barricada que uno puso para dejar un paso justo, y cerrarlo. El
     * resultado es un nivel que a veces se puede terminar y a veces no,
     * segun la semilla. Lo diseñado a mano gana siempre.
     *
     * @type {{x:number, z:number, r:number}[]}
     */
    this.reservado = [];

    this.stats = { piezas: 0, colliders: 0, props: 0, luces: 0 };
  }

  /** @returns {boolean} true si el punto cae en una zona reservada. */
  estaReservado(x, z, margen = 0) {
    for (const r of this.reservado) {
      const alcance = r.r + margen;
      const dx = x - r.x;
      const dz = z - r.z;
      if (dx * dx + dz * dz < alcance * alcance) return true;
    }
    return false;
  }

  /** Atajo al cache de materiales. */
  material(rgb, acabado = ACABADO.revoque) {
    return this.mats.get(rgb, acabado);
  }

  /**
   * Caja visual, con colision opcional.
   * @param {{x:number,y:number,z:number}} pos centro de la caja
   */
  addBox(
    name,
    pos,
    size,
    rgb,
    { collide = false, tag = 'static', acabado, sombra = false, plano = false } = {}
  ) {
    const e = new pc.Entity(name);
    e.addComponent('render', {
      type: 'box',
      material: plano ? this.mats.getPlano(rgb) : this.material(rgb, acabado),
      castShadows: sombra,
      batchGroupId: this.grupoEstatico.id
    });
    e.setLocalScale(size.x, size.y, size.z);
    e.setPosition(pos.x, pos.y, pos.z);
    this.root.addChild(e);
    this.stats.piezas++;

    if (collide) {
      const alturaCima = pos.y + size.y / 2;
      this.collision.add(Box2D.fromCenter(pos.x, pos.z, size.x, size.z, tag, alturaCima));
      this.stats.colliders++;
    }
    return e;
  }

  /**
   * Coloca un prop de la biblioteca.
   *
   * @param {string} tipo clave de PROPS
   * @param {{x:number,z:number}} pos
   * @param {number} rot grados alrededor del eje vertical
   * @param {object} rng
   * @param {object} [opt] colision y argumentos del constructor
   */
  addProp(tipo, pos, rot, rng, opt = {}) {
    const constructor = PROPS[tipo];
    if (!constructor) {
      console.warn(`[mundo] prop desconocido: ${tipo}`);
      return null;
    }

    const e = constructor(this.mats, rng, opt.args);
    e.setPosition(pos.x, 0, pos.z);
    e.setEulerAngles(0, rot, 0);

    // Todas las piezas del prop entran al mismo grupo de agrupado.
    for (const hijo of e.find((n) => n.render)) {
      hijo.render.batchGroupId = this.grupoEstatico.id;
    }

    this.root.addChild(e);
    this.stats.props++;

    if (opt.collide) {
      const { w, d, h = 2 } = opt.collide;
      this.collision.add(Box2D.fromCenter(pos.x, pos.z, w, d, opt.tag ?? 'prop', h));
      this.stats.colliders++;
    }
    return e;
  }

  // =========================================================================
  // CONSTRUCCION
  // =========================================================================

  /** Construye la mision entera. */
  build(mission) {
    const rng = createRng(mission.seed);
    const markers = [];

    /*
     * Primero se anotan las reservas, despues se genera. El orden importa:
     * el generador consulta `estaReservado` mientras coloca, asi que las
     * zonas tienen que existir antes de que empiece.
     *
     * El radio sale del tamaño del colisionador del prop, con un piso de
     * cuatro metros: un cesto de basura tambien merece que no le pongan un
     * auto encima.
     */
    for (const item of mission.props ?? []) {
      const c = item.collide;
      const r = c ? Math.max(4, Math.hypot(c.w, c.d) * 0.75) : 3;
      this.reservado.push({ x: item.x, z: item.z, r });
    }

    for (let i = 0; i < mission.route.length - 1; i++) {
      let a = mission.route[i];
      const b = mission.route[i + 1];
      const cfg = mission.blocks[Math.min(i, mission.blocks.length - 1)];

      // El primer tramo se estira hacia atras del punto de aparicion: sin
      // esta cola, al arrancar se ve el borde del mapa.
      if (i === 0) a = extenderHaciaAtras(a, b, PROLOGO);

      this.#buildStreetSegment(a, b, cfg, rng, i);
    }

    this.#buildEsquinas(mission, rng);

    // Lo colocado a mano va despues de lo generado, para que pueda pisarlo.
    for (const item of mission.props ?? []) {
      this.addProp(item.tipo, item, item.rot ?? 0, rng, {
        collide: item.collide,
        tag: item.tag,
        args: item.args
      });
    }

    for (const cp of mission.checkpoints) {
      const p = mission.route[cp.atRouteIndex];
      markers.push(this.#addMarker(`Control_${cp.atRouteIndex}`, p, cp.radius, COLORS.checkpoint));
    }
    const goalPoint = mission.route[mission.goal.atRouteIndex];
    markers.push(this.#addMarker('Meta', goalPoint, mission.goal.radius, COLORS.goal));

    /*
     * Fundir las mallas. Tiene que ser lo ultimo: todo lo que se agregue
     * despues de este punto queda fuera del agrupado y se dibuja suelto.
     */
    this.app.batcher.generate([this.grupoEstatico]);

    return { markers, stats: this.stats };
  }

  /** Una cuadra: calzada, veredas, cordones, pintura, edificios y props. */
  #buildStreetSegment(a, b, cfg, rng, index) {
    const alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
    const length = alongX ? Math.abs(b.x - a.x) : Math.abs(b.z - a.z);
    const cx = (a.x + b.x) / 2;
    const cz = (a.z + b.z) / 2;

    const road = UNITS.streetWidth;
    const walk = UNITS.sidewalkWidth;
    const full = road + walk * 2;

    const size = (largo, ancho) => (alongX ? { x: largo, z: ancho } : { x: ancho, z: largo });

    // --- Calzada ------------------------------------------------------------
    const roadSize = size(length, road);
    this.addBox(
      `Calzada_${index}`,
      { x: cx, y: -0.06, z: cz },
      { x: roadSize.x, y: 0.12, z: roadSize.z },
      COLORS.asphalt,
      { acabado: ACABADO.asfalto }
    );

    /*
     * Parches de reparacion. Van muy cerca del tono del asfalto: con mas
     * contraste se leen como manchas geometricas pegadas encima, no como
     * un remiendo. La variacion tiene que insinuarse, no anunciarse.
     */
    for (let i = 0; i < Math.floor(length / 22); i++) {
      const largo = rng.range(2.5, 7);
      const ancho = rng.range(1.5, 3.5);
      const along = rng.range(-length / 2 + 4, length / 2 - 4);
      const cross = rng.range(-road / 2 + 1, road / 2 - 1);
      const p = size(largo, ancho);
      this.addBox(
        `Parche_${index}_${i}`,
        {
          x: cx + (alongX ? along : cross),
          y: -0.005,
          z: cz + (alongX ? cross : along)
        },
        { x: p.x, y: 0.02, z: p.z },
        COLORS.asphaltWet,
        { acabado: ACABADO.asfalto }
      );
    }

    this.#pintura(cx, cz, alongX, length, road, index);

    // --- Veredas y cordones -------------------------------------------------
    for (const side of [-1, 1]) {
      const offset = ((road + walk) / 2) * side;
      const wSize = size(length, walk);
      this.addBox(
        `Vereda_${index}_${side}`,
        { x: cx + (alongX ? 0 : offset), y: UNITS.curbHeight / 2, z: cz + (alongX ? offset : 0) },
        { x: wSize.x, y: UNITS.curbHeight, z: wSize.z },
        COLORS.sidewalk,
        { acabado: ACABADO.vereda }
      );

      // Franja de baldosa distinta pegada a la fachada: parte la vereda en
      // dos y se lee muy bien desde arriba.
      const franjaOff = ((full - walk * 0.45) / 2) * side;
      const fSize = size(length, walk * 0.45);
      this.addBox(
        `VeredaFranja_${index}_${side}`,
        {
          x: cx + (alongX ? 0 : franjaOff),
          y: UNITS.curbHeight + 0.005,
          z: cz + (alongX ? franjaOff : 0)
        },
        { x: fSize.x, y: 0.02, z: fSize.z },
        COLORS.sidewalkAlt,
        { acabado: ACABADO.vereda }
      );

      const curbOffset = (road / 2) * side;
      const cSize = size(length, 0.3);
      this.addBox(
        `Cordon_${index}_${side}`,
        {
          x: cx + (alongX ? 0 : curbOffset),
          y: UNITS.curbHeight / 2,
          z: cz + (alongX ? curbOffset : 0)
        },
        { x: cSize.x, y: UNITS.curbHeight + 0.04, z: cSize.z },
        COLORS.curb,
        { acabado: ACABADO.vereda }
      );

      this.#buildFacadeRow(a, b, alongX, length, side, full, cfg, rng, index);
      this.#buildVereda(a, b, alongX, length, side, road, walk, rng, index);
    }

    this.#buildVehiculos(a, b, alongX, length, road, rng, index);
    this.#buildFaroles(a, b, alongX, length, road, index);
  }

  /**
   * Pintura vial: eje central discontinuo y lineas de borde.
   *
   * Se dibuja con material plano, sin iluminar. La pintura de una calle no
   * cambia de color al entrar en sombra, y ademas asi sigue marcando el
   * carril en la mitad sombreada de la calzada, que es donde mas falta
   * hace.
   */
  #pintura(cx, cz, alongX, length, road, index) {
    const size = (largo, ancho) => (alongX ? { x: largo, z: ancho } : { x: ancho, z: largo });

    for (let d = -length / 2; d < length / 2; d += 4.5) {
      const s = size(2.4, 0.16);
      this.addBox(
        `Eje_${index}_${d.toFixed(0)}`,
        { x: cx + (alongX ? d : 0), y: 0.012, z: cz + (alongX ? 0 : d) },
        { x: s.x, y: 0.02, z: s.z },
        COLORS.paint,
        { plano: true }
      );
    }

    // Linea continua de borde, a un metro del cordon.
    for (const side of [-1, 1]) {
      const off = (road / 2 - 1.0) * side;
      const s = size(length - 2, 0.12);
      this.addBox(
        `Borde_${index}_${side}`,
        { x: cx + (alongX ? 0 : off), y: 0.012, z: cz + (alongX ? off : 0) },
        { x: s.x, y: 0.02, z: s.z },
        COLORS.paint,
        { plano: true }
      );
    }
  }

  /** Senda peatonal cruzando la calzada. */
  #senda(punto, alongX, road, nombre) {
    const size = (largo, ancho) => (alongX ? { x: largo, z: ancho } : { x: ancho, z: largo });
    for (let i = 0; i < 7; i++) {
      const off = -2.4 + i * 0.8;
      const s = size(0.45, road);
      this.addBox(
        `Senda_${nombre}_${i}`,
        {
          x: punto.x + (alongX ? off : 0),
          y: 0.014,
          z: punto.z + (alongX ? 0 : off)
        },
        { x: s.x, y: 0.02, z: s.z },
        COLORS.paint,
        { plano: true }
      );
    }
  }

  /** Plancha de vereda en cada esquina, con senda peatonal y semaforo. */
  #buildEsquinas(mission, rng) {
    const w = UNITS.streetWidth + UNITS.sidewalkWidth * 2;
    for (let i = 1; i < mission.route.length - 1; i++) {
      const p = mission.route[i];
      this.addBox(
        `Esquina_${i}`,
        { x: p.x, y: UNITS.curbHeight / 2, z: p.z },
        { x: w, y: UNITS.curbHeight, z: w },
        COLORS.sidewalk,
        { acabado: ACABADO.vereda }
      );

      const previo = mission.route[i - 1];
      const alongX = Math.abs(p.x - previo.x) > Math.abs(p.z - previo.z);
      const retroceso = alongX ? { x: p.x + 9, z: p.z } : { x: p.x, z: p.z + 9 };
      this.#senda(retroceso, alongX, UNITS.streetWidth, `e${i}`);

      // Semaforo y cartel de calle: marcan que ahi hay un cruce desde lejos.
      const esq = UNITS.streetWidth / 2 + 1.4;
      this.addProp('semaforo', { x: p.x + esq, z: p.z + esq }, rng.range(0, 360), rng, {
        collide: { w: 0.4, d: 0.4, h: 3.6 }
      });
      this.addProp('carteCalle', { x: p.x - esq, z: p.z - esq }, 0, rng);
    }
  }

  /**
   * Hilera de fachadas de ancho y altura variables.
   *
   * La variacion no es decorativa: una hilera pareja se lee como un muro y
   * el jugador pierde las referencias para ubicarse. Alturas distintas y
   * retiros ocasionales le dan puntos de referencia.
   */
  #buildFacadeRow(a, b, alongX, length, side, fullWidth, cfg, rng, index) {
    const depth = 12;
    const start = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const margin = fullWidth / 2 + 2;
    let cursor = start + margin;
    const end = start + length - margin;
    let n = 0;

    const cruzado = (v) => (alongX ? (a.z + b.z) / 2 + v : (a.x + b.x) / 2 + v);

    while (cursor < end - 4) {
      const width = Math.min(rng.range(8, 18), end - cursor);
      const centerAlong = cursor + width / 2;
      const [hMin, hMax] = cfg.buildingHeight;
      const height = rng.range(hMin, hMax);

      // Un hueco ocasional: un baldio. Rompe el muro continuo y da algo
      // que explorar.
      if (!rng.chance(cfg.density)) {
        this.#baldio(centerAlong, cruzado((fullWidth / 2 + 3) * side), alongX, width, side, rng, index, n);
        cursor += width;
        n++;
        continue;
      }

      // Retiro: algunos edificios se corren hacia atras de la linea
      // municipal y dejan un zaguan. Es lo que quiebra la pared continua.
      const retiro = rng.chance(0.22) ? rng.range(1.0, 2.2) : 0;
      const centerCross = (fullWidth / 2 + depth / 2 + retiro) * side;

      const pos = alongX
        ? { x: centerAlong, y: height / 2, z: cruzado(centerCross) }
        : { x: cruzado(centerCross), y: height / 2, z: centerAlong };
      const sz = alongX ? { x: width, y: height, z: depth } : { x: depth, y: height, z: width };

      this.addBox(`Edificio_${index}_${side}_${n}`, pos, sz, rng.pick(COLORS.facade), {
        collide: true,
        tag: 'building',
        acabado: ACABADO.revoque,
        sombra: true
      });

      this.#frenteEdificio(
        centerAlong, cruzado, alongX, side, fullWidth, width, height, retiro, rng, index, n
      );

      cursor += width;
      n++;
    }
  }

  /**
   * El frente de un edificio: zocalo, persiana, toldo, cartel y balcones.
   * Es donde esta casi todo el detalle que se ve desde la calle.
   */
  #frenteEdificio(centerAlong, cruzado, alongX, side, fullWidth, width, height, retiro, rng, index, n) {
    const linea = fullWidth / 2 + retiro;

    const poner = (nombre, cross, y, largo, alto, prof, color, opt) => {
      const pos = alongX
        ? { x: centerAlong, y, z: cruzado(cross * side) }
        : { x: cruzado(cross * side), y, z: centerAlong };
      const sz = alongX ? { x: largo, y: alto, z: prof } : { x: prof, y: alto, z: largo };
      this.addBox(nombre, pos, sz, color, opt);
    };

    // Planta baja: persiana metalica con zocalo mas oscuro abajo.
    poner(`Persiana_${index}_${side}_${n}`, linea + 0.2, 1.75, width * 0.88, 3.1, 0.4,
      COLORS.shutter, { acabado: ACABADO.persiana });
    poner(`Zocalo_${index}_${side}_${n}`, linea + 0.26, 0.3, width * 0.9, 0.6, 0.5,
      COLORS.plinth, { acabado: ACABADO.revoque });

    // Toldo volado: proyecta sombra sobre la vereda y aporta el color.
    if (width > 9 && rng.chance(0.6)) {
      poner(`Toldo_${index}_${side}_${n}`, linea + 0.75, 3.5, width * 0.78, 0.18, 1.5,
        rng.pick(COLORS.toldo), { acabado: ACABADO.tela, sombra: true });
    }

    // Cartel del comercio.
    if (width > 8) {
      poner(`Cartel_${index}_${side}_${n}`, linea + 0.3, 4.4, width * 0.72, 0.9, 0.25,
        COLORS.metalDark, { acabado: ACABADO.pintura });
    }

    // Puerta de entrada al edificio, al costado del local.
    const offPuerta = width * 0.38;
    const posPuerta = alongX
      ? { x: centerAlong + offPuerta, y: 1.15, z: cruzado((linea + 0.22) * side) }
      : { x: cruzado((linea + 0.22) * side), y: 1.15, z: centerAlong + offPuerta };
    const szPuerta = alongX ? { x: 1.3, y: 2.3, z: 0.44 } : { x: 0.44, y: 2.3, z: 1.3 };
    this.addBox(`Puerta_${index}_${side}_${n}`, posPuerta, szPuerta, COLORS.wood, {
      acabado: ACABADO.madera
    });

    // Balcones y ventanas de los pisos altos.
    const pisos = Math.max(0, Math.floor((height - 5.2) / 3));
    const cols = Math.max(1, Math.round(width / 4.5));
    for (let p = 0; p < pisos; p++) {
      const y = 5.4 + p * 3;
      for (let c = 0; c < cols; c++) {
        const off = -width / 2 + ((c + 0.5) * width) / cols;

        const posV = alongX
          ? { x: centerAlong + off, y: y + 0.75, z: cruzado((linea + 0.12) * side) }
          : { x: cruzado((linea + 0.12) * side), y: y + 0.75, z: centerAlong + off };
        const szV = alongX ? { x: 1.5, y: 1.5, z: 0.2 } : { x: 0.2, y: 1.5, z: 1.5 };
        this.addBox(`Ventana_${index}_${side}_${n}_${p}_${c}`, posV, szV,
          rng.chance(0.78) ? COLORS.glass : COLORS.shutter, { acabado: ACABADO.vidrio });

        /*
         * Balcon: losa y baranda. La losa es lo que de verdad se ve desde
         * la camara, porque sobresale y proyecta sombra sobre la fachada.
         * Sin ella los pisos altos son una pared lisa con cuadraditos.
         */
        if (rng.chance(0.45)) {
          const posB = alongX
            ? { x: centerAlong + off, y, z: cruzado((linea + 0.5) * side) }
            : { x: cruzado((linea + 0.5) * side), y, z: centerAlong + off };
          const szB = alongX ? { x: 2.2, y: 0.14, z: 0.95 } : { x: 0.95, y: 0.14, z: 2.2 };
          /*
           * El balcon NO proyecta sombra. Es la unica concesion de la
           * fachada, y se midio: los balcones solos eran casi la mitad de
           * las llamadas de dibujo del mapa de sombras. La losa igual se
           * lee porque sobresale y recibe la luz de canto.
           */
          this.addBox(`Balcon_${index}_${side}_${n}_${p}_${c}`, posB, szB, COLORS.plinth, {
            acabado: ACABADO.revoque
          });

          const posR = alongX
            ? { x: centerAlong + off, y: y + 0.5, z: cruzado((linea + 0.95) * side) }
            : { x: cruzado((linea + 0.95) * side), y: y + 0.5, z: centerAlong + off };
          const szR = alongX ? { x: 2.2, y: 0.9, z: 0.08 } : { x: 0.08, y: 0.9, z: 2.2 };
          this.addBox(`Baranda_${index}_${side}_${n}_${p}_${c}`, posR, szR, COLORS.balcony, {
            acabado: ACABADO.metal
          });
        }
      }
    }

    // Medianera de ladrillo a la vista entre edificios de distinta altura.
    if (rng.chance(0.5)) {
      const offM = width / 2;
      const posM = alongX
        ? { x: centerAlong + offM, y: height + 0.6, z: cruzado((fullWidth / 2 + 6) * side) }
        : { x: cruzado((fullWidth / 2 + 6) * side), y: height + 0.6, z: centerAlong + offM };
      const szM = alongX ? { x: 0.35, y: 1.2, z: 12 } : { x: 12, y: 1.2, z: 0.35 };
      this.addBox(`Medianera_${index}_${side}_${n}`, posM, szM, COLORS.brick, {
        acabado: ACABADO.revoque
      });
    }

    // Tanque de agua en la azotea.
    if (width > 10 && rng.chance(0.65)) {
      const offT = rng.range(-2, 2);
      const posT = alongX
        ? { x: centerAlong + offT, y: height + 1.1, z: cruzado((fullWidth / 2 + 5) * side) }
        : { x: cruzado((fullWidth / 2 + 5) * side), y: height + 1.1, z: centerAlong + offT };
      this.addBox(`Tanque_${index}_${side}_${n}`, posT, { x: 1.5, y: 1.7, z: 1.5 }, COLORS.rubble, {
        acabado: ACABADO.chapa
      });
    }
  }

  /** Un baldio: terreno vacio con escombros y, a veces, una valla de obra. */
  #baldio(centerAlong, cross, alongX, width, side, rng, index, n) {
    const pos = alongX ? { x: centerAlong, z: cross } : { x: cross, z: centerAlong };
    this.addProp('escombros', pos, rng.range(0, 360), rng);

    if (rng.chance(0.6)) {
      const vp = alongX
        ? { x: centerAlong, z: cross - 2.5 * side }
        : { x: cross - 2.5 * side, z: centerAlong };
      const largo = Math.min(width * 0.8, 8);
      this.addProp('valla', vp, alongX ? 0 : 90, rng, {
        collide: {
          w: alongX ? largo : 0.3,
          d: alongX ? 0.3 : largo,
          h: 1.9
        },
        args: largo
      });
    }
  }

  /** Mobiliario de una vereda: arboles, cestos, bancos y basura. */
  #buildVereda(a, b, alongX, length, side, road, walk, rng, index) {
    const start = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const crossCenter = alongX ? (a.z + b.z) / 2 : (a.x + b.x) / 2;
    // Los arboles van sobre el cordon, no pegados a la pared.
    const offArbol = (road / 2 + 1.3) * side;
    const offPared = (road / 2 + walk - 0.9) * side;

    for (let d = rng.range(8, 14); d < length - 8; d += rng.range(9, 14)) {
      const along = start + d;
      const pos = alongX
        ? { x: along, z: crossCenter + offArbol }
        : { x: crossCenter + offArbol, z: along };
      if (this.estaReservado(pos.x, pos.z, 3)) continue;

      this.addProp('arbol', pos, rng.range(0, 360), rng, {
        collide: { w: 0.8, d: 0.8, h: 4 },
        tag: 'tree'
      });

      // Cerca del arbol suele haber algo mas: un cesto, un banco, basura.
      if (rng.chance(0.55)) {
        const extra = rng.pick(['cesto', 'banco', 'bolsas', 'contenedor']);
        const offExtra = extra === 'contenedor' ? offArbol : offPared;
        const p2 = alongX
          ? { x: along + rng.range(3, 6), z: crossCenter + offExtra }
          : { x: crossCenter + offExtra, z: along + rng.range(3, 6) };
        this.addProp(extra, p2, alongX ? rng.pick([0, 180]) : rng.pick([90, 270]), rng, {
          collide: extra === 'contenedor' ? { w: 2.1, d: 1.2, h: 1.4 } : undefined
        });
      }
    }
  }

  /** Autos y colectivos estacionados o abandonados en la calzada. */
  #buildVehiculos(a, b, alongX, length, road, rng, index) {
    const start = alongX ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
    const crossCenter = alongX ? (a.z + b.z) / 2 : (a.x + b.x) / 2;

    for (let d = rng.range(12, 20); d < length - 12; d += rng.range(22, 34)) {
      const along = start + d;
      const lado = rng.chance(0.5) ? 1 : -1;
      // Estacionado contra el cordon, o cruzado en medio de la calle.
      const esCruzado = rng.chance(0.22);
      const cross = esCruzado
        ? crossCenter + rng.range(-road / 4, road / 4)
        : crossCenter + (road / 2 - 1.5) * lado;

      const pos = alongX ? { x: along, z: cross } : { x: cross, z: along };

      // Si el diseño reservo esta zona, no se pone nada: lo colocado a
      // mano manda. El margen extra es el largo de un auto.
      if (this.estaReservado(pos.x, pos.z, 6)) continue;

      const rotBase = alongX ? 90 : 0;
      const rot = esCruzado ? rotBase + rng.range(55, 125) : rotBase + (lado > 0 ? 180 : 0);

      if (rng.chance(0.14)) {
        this.addProp('colectivo', pos, rotBase, rng, {
          collide: { w: alongX ? 11 : 2.6, d: alongX ? 2.6 : 11, h: 3.2 },
          tag: 'vehicle'
        });
      } else {
        const esTaxi = rng.chance(0.3);
        this.addProp('auto', pos, rot, rng, {
          collide: {
            w: esCruzado ? 4.4 : alongX ? 4.4 : 2,
            d: esCruzado ? 4.4 : alongX ? 2 : 4.4,
            h: 1.7
          },
          tag: 'vehicle',
          args: { esTaxi }
        });
      }
    }
  }

  /** Faroles a lo largo de la cuadra, alternando de vereda. */
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

      let angulo;
      if (alongX) angulo = lado > 0 ? 0 : 180;
      else angulo = lado > 0 ? 270 : 90;

      this.faroles.push(crearFarol(this.app, pos, angulo, this.matsLuz));
      this.stats.luces++;
      lado *= -1;
    }
  }

  /**
   * Marcador de objetivo: anillo en el piso y haz vertical.
   *
   * Material plano para que el color sea el mismo al sol y en sombra: es
   * informacion de mision, no decorado.
   */
  #addMarker(name, point, radius, rgb) {
    const anillo = new pc.Entity(name);
    anillo.addComponent('render', {
      type: 'cylinder',
      material: this.mats.getPlano(rgb, 0.45),
      castShadows: false
    });
    anillo.setLocalScale(radius * 2, 0.02, radius * 2);
    anillo.setPosition(point.x, 0.03, point.z);
    this.root.addChild(anillo);

    // Haz vertical: se ve por encima de los autos y las barricadas.
    const haz = new pc.Entity(`${name}_Haz`);
    haz.addComponent('render', {
      type: 'cylinder',
      material: this.mats.getPlano(rgb, 0.22),
      castShadows: false
    });
    haz.setLocalScale(1.1, 9, 1.1);
    haz.setPosition(point.x, 4.5, point.z);
    this.root.addChild(haz);

    return { name, x: point.x, z: point.z, radius, entity: anillo };
  }

  destroy() {
    this.reservado.length = 0;
    this.app.batcher.removeGroup(this.grupoEstatico.id);
    this.root.destroy();
    for (const f of this.faroles) f.destroy();
    this.faroles.length = 0;
    this.collision.clear();
    this.mats.clear();
    this.stats = { piezas: 0, colliders: 0, props: 0, luces: 0 };
  }
}
