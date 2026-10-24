import * as pc from 'playcanvas';
import { COLORS, ACABADO } from './palette.js';

/**
 * ===========================================================================
 * BIBLIOTECA DE PROPS
 * ===========================================================================
 * Cada objeto de la calle, armado con piezas. Low-poly no quiere decir
 * "un cubo pintado": quiere decir pocas formas, pero las correctas.
 *
 * A la distancia de camara del juego (unos 20 m, 57 grados) un metro ocupa
 * cerca de 58 pixeles. Un arbol de cuatro metros es una figura grande en
 * pantalla, asi que tiene que tener tronco, copa y sombra propia o se lee
 * como una mancha verde.
 *
 * ---------------------------------------------------------------------------
 * REGLAS DE CONSTRUCCION
 * ---------------------------------------------------------------------------
 *  - Entre 3 y 8 piezas por prop. Menos y es un cubo; mas y no se nota.
 *  - La SILUETA manda. Desde arriba se ve sobre todo el contorno: un
 *    contenedor se reconoce por la tapa que sobresale, una parada de
 *    colectivo por el techo volado.
 *  - Todo lo que mida mas de medio metro proyecta sombra. La sombra es lo
 *    que lo apoya en el piso.
 *  - Nada de materiales nuevos: todos salen del cache compartido.
 *  - El origen de cada prop esta en el PISO y centrado, para poder
 *    colocarlo con la coordenada del suelo sin hacer cuentas.
 */

/**
 * Ayudante para armar props. Acumula piezas bajo una raiz comun.
 */
class Armador {
  /**
   * @param {string} nombre
   * @param {import('./palette.js').Materiales} mats
   */
  constructor(nombre, mats) {
    this.raiz = new pc.Entity(nombre);
    this.mats = mats;
    this.piezas = 0;
  }

  /**
   * Agrega una pieza.
   *
   * @param {string} tipo primitiva: box, cylinder, sphere, cone, capsule
   * @param {number[]} pos [x, y, z] con y = base de la pieza, no su centro
   * @param {number[]} esc [ancho, alto, profundidad]
   * @param {number[]} color
   * @param {object} [opt]
   */
  add(tipo, pos, esc, color, opt = {}) {
    const e = new pc.Entity(`${this.raiz.name}_${this.piezas++}`);
    e.addComponent('render', {
      type: tipo,
      material: this.mats.get(color, opt.acabado ?? ACABADO.revoque),
      // Por debajo de medio metro la sombra no aporta y si cuesta.
      /*
       * Umbral de sombra. Antes era medio metro y entraba casi todo. A un
       * metro, las piezas que dejan de proyectar son las que de todos
       * modos quedaban escondidas bajo el prop: ruedas, manijas, barandas.
       * Se gana mucho en llamadas de dibujo y no se nota.
       */
      castShadows: opt.sombra ?? esc[1] > 1.0
    });
    e.setLocalScale(esc[0], esc[1], esc[2]);
    // El eje Y de las primitivas esta centrado: se compensa aca para poder
    // pensar en "apoyado sobre el piso".
    e.setLocalPosition(pos[0], pos[1] + esc[1] / 2, pos[2]);
    if (opt.rot) e.setLocalEulerAngles(opt.rot[0], opt.rot[1], opt.rot[2]);
    this.raiz.addChild(e);
    return e;
  }

  /** Termina y devuelve la raiz. */
  fin() {
    return this.raiz;
  }
}

/* =========================================================================
   VEGETACION
   ========================================================================= */

/**
 * Arbol de vereda, tipo fresno o platano: tronco recto y copa redonda.
 *
 * La copa son tres esferas achatadas y desplazadas, cada una de un verde
 * distinto. Una sola esfera se lee como una pelota; tres irregulares se
 * leen como follaje, y sigue siendo barato.
 */
export function arbol(mats, rng) {
  const a = new Armador('Arbol', mats);
  const alturaTronco = rng.range(2.2, 3.0);
  const radioCopa = rng.range(1.5, 2.1);

  // Cantero: el cuadrado de tierra sin baldosa. Detalle chico, muy porteño.
  a.add('box', [0, 0.01, 0], [1.5, 0.06, 1.5], COLORS.soil, {
    acabado: ACABADO.vereda,
    sombra: false
  });
  // Cordon del cantero.
  for (const [dx, dz, w, d] of [
    [0, 0.78, 1.6, 0.14],
    [0, -0.78, 1.6, 0.14],
    [0.78, 0, 0.14, 1.6],
    [-0.78, 0, 0.14, 1.6]
  ]) {
    a.add('box', [dx, 0.02, dz], [w, 0.14, d], COLORS.curb, { acabado: ACABADO.vereda });
  }

  a.add('cylinder', [0, 0, 0], [0.32, alturaTronco, 0.32], COLORS.trunk, {
    acabado: ACABADO.madera
  });

  const base = alturaTronco - 0.2;
  const lobulos = [
    [0, base, 0, 1.0],
    [radioCopa * 0.42, base + radioCopa * 0.35, radioCopa * 0.2, 0.72],
    [-radioCopa * 0.35, base + radioCopa * 0.3, -radioCopa * 0.3, 0.66]
  ];
  lobulos.forEach(([dx, dy, dz, k], i) => {
    const r = radioCopa * k;
    a.add('sphere', [dx, dy, dz], [r * 2, r * 1.5, r * 2], COLORS.leaves[i % COLORS.leaves.length], {
      acabado: ACABADO.hoja
    });
  });

  return a.fin();
}

/* =========================================================================
   BASURA
   ========================================================================= */

/** Contenedor de basura: cuerpo, tapa volada y dos ruedas. */
export function contenedor(mats, rng) {
  const a = new Armador('Contenedor', mats);
  a.add('box', [0, 0.18, 0], [1.9, 1.05, 1.0], COLORS.binGreen, { acabado: ACABADO.chapa });
  // La tapa sobresale: es lo que lo hace reconocible desde arriba.
  a.add('box', [0, 1.2, 0.04], [2.05, 0.14, 1.15], COLORS.metalDark, { acabado: ACABADO.chapa });
  // Manija frontal.
  a.add('box', [0, 0.78, -0.55], [1.1, 0.08, 0.1], COLORS.metalDark, { acabado: ACABADO.metal });
  for (const dx of [-0.72, 0.72]) {
    a.add('cylinder', [dx, 0, 0.3], [0.34, 0.18, 0.34], COLORS.tire, {
      acabado: ACABADO.revoque,
      rot: [0, 0, 90],
      sombra: false
    });
  }
  if (rng.chance(0.4)) {
    // Tapa entreabierta con una bolsa asomando.
    a.add('sphere', [0.3, 1.2, 0], [0.7, 0.5, 0.6], COLORS.bag, { acabado: ACABADO.tela });
  }
  return a.fin();
}

/** Monton de bolsas de residuos contra la pared. */
export function bolsas(mats, rng) {
  const a = new Armador('Bolsas', mats);
  const n = rng.int(3, 6);
  for (let i = 0; i < n; i++) {
    const r = rng.range(0.3, 0.52);
    a.add(
      'sphere',
      [rng.range(-0.8, 0.8), 0, rng.range(-0.5, 0.5)],
      [r * 2, r * 1.7, r * 2],
      rng.chance(0.25) ? COLORS.rubble : COLORS.bag,
      { acabado: ACABADO.tela, sombra: r > 0.4 }
    );
  }
  return a.fin();
}

/** Cesto de basura de vereda: canasto calado sobre un poste. */
export function cesto(mats) {
  const a = new Armador('Cesto', mats);
  a.add('cylinder', [0, 0, 0], [0.12, 1.0, 0.12], COLORS.metal, { acabado: ACABADO.metal });
  a.add('cylinder', [0, 0.95, 0], [0.6, 0.6, 0.6], COLORS.metalDark, { acabado: ACABADO.metal });
  return a.fin();
}

/* =========================================================================
   MOBILIARIO URBANO
   ========================================================================= */

/**
 * Parada de colectivo: dos postes, techo volado, banco y cartel.
 * El techo volado es la silueta que la identifica desde arriba.
 */
export function paradaColectivo(mats) {
  const a = new Armador('Parada', mats);
  for (const dx of [-1.6, 1.6]) {
    a.add('cylinder', [dx, 0, 0.5], [0.12, 2.6, 0.12], COLORS.metal, { acabado: ACABADO.metal });
  }
  a.add('box', [0, 2.6, 0.2], [3.8, 0.12, 1.5], COLORS.metalDark, { acabado: ACABADO.chapa });
  // Panel trasero y banco.
  a.add('box', [0, 0.4, 0.95], [3.4, 1.6, 0.08], COLORS.glass, { acabado: ACABADO.vidrio });
  a.add('box', [0, 0.45, 0.65], [3.0, 0.1, 0.42], COLORS.wood, { acabado: ACABADO.madera });
  for (const dx of [-1.2, 1.2]) {
    a.add('box', [dx, 0, 0.65], [0.1, 0.45, 0.38], COLORS.metal, { acabado: ACABADO.metal });
  }
  // Cartel con el numero de linea: el acento de color.
  a.add('box', [1.55, 2.0, -0.2], [0.5, 0.7, 0.08], COLORS.toldo[2], { acabado: ACABADO.pintura });
  return a.fin();
}

/**
 * Kiosco de esquina. Uno de los objetos mas reconocibles de una cuadra
 * portena: cuerpo chico, toldo que sobresale y mostrador.
 */
export function kiosco(mats, rng) {
  const a = new Armador('Kiosco', mats);
  a.add('box', [0, 0, 0], [3.2, 2.7, 2.4], COLORS.facade[2], { acabado: ACABADO.revoque });
  // Toldo volado, el acento de color.
  a.add('box', [0, 2.3, -1.5], [3.6, 0.16, 1.3], rng.pick(COLORS.toldo), {
    acabado: ACABADO.tela
  });
  // Mostrador y vitrina.
  a.add('box', [0, 0.9, -1.25], [2.8, 0.12, 0.5], COLORS.wood, { acabado: ACABADO.madera });
  a.add('box', [0, 1.05, -1.2], [2.6, 1.1, 0.1], COLORS.glass, { acabado: ACABADO.vidrio });
  // Cartel sobre el toldo.
  a.add('box', [0, 2.75, -0.9], [2.4, 0.55, 0.1], COLORS.metalDark, { acabado: ACABADO.pintura });
  return a.fin();
}

/** Banco de plaza: asiento, respaldo y patas. */
export function banco(mats) {
  const a = new Armador('Banco', mats);
  a.add('box', [0, 0.45, 0], [1.9, 0.1, 0.55], COLORS.wood, { acabado: ACABADO.madera });
  a.add('box', [0, 0.55, 0.26], [1.9, 0.5, 0.08], COLORS.wood, {
    acabado: ACABADO.madera,
    rot: [-12, 0, 0]
  });
  for (const dx of [-0.8, 0.8]) {
    a.add('box', [dx, 0, 0], [0.1, 0.45, 0.5], COLORS.metalDark, { acabado: ACABADO.metal });
  }
  return a.fin();
}

/**
 * Semaforo. Los tres circulos de color son los unicos colores puros de
 * toda la escena, asi que marcan la esquina de lejos.
 */
export function semaforo(mats) {
  const a = new Armador('Semaforo', mats);
  a.add('cylinder', [0, 0, 0], [0.16, 3.6, 0.16], COLORS.metalDark, { acabado: ACABADO.metal });
  a.add('box', [0, 3.5, -0.15], [0.42, 1.15, 0.36], COLORS.metalDark, { acabado: ACABADO.metal });
  const luces = [
    [3.9, COLORS.lightRed],
    [3.55, COLORS.lightAmber],
    [3.2, COLORS.lightGreen]
  ];
  for (const [y, color] of luces) {
    a.add('cylinder', [0, y, -0.34], [0.26, 0.06, 0.26], color, {
      acabado: ACABADO.pintura,
      rot: [90, 0, 0],
      sombra: false
    });
  }
  return a.fin();
}

/** Cartel de nombre de calle: poste con dos chapas cruzadas. */
export function carteCalle(mats) {
  const a = new Armador('CartelCalle', mats);
  a.add('cylinder', [0, 0, 0], [0.1, 2.8, 0.1], COLORS.metal, { acabado: ACABADO.metal });
  a.add('box', [0.4, 2.55, 0], [1.0, 0.26, 0.05], COLORS.police, { acabado: ACABADO.pintura });
  a.add('box', [0, 2.25, 0.4], [0.05, 0.26, 1.0], COLORS.police, { acabado: ACABADO.pintura });
  return a.fin();
}

/* =========================================================================
   OBSTACULOS
   ========================================================================= */

/**
 * Barricada: dos caballetes y tablones cruzados.
 *
 * Es el obstaculo que obliga a elegir ruta, asi que tiene que leerse como
 * "no se pasa" de un vistazo. Los tablones en diagonal son lo que lo
 * comunica; una pared lisa se leeria como decorado.
 */
export function barricada(mats, rng) {
  const a = new Armador('Barricada', mats);
  const ancho = 4.2;

  for (const dx of [-ancho / 2 + 0.2, ancho / 2 - 0.2]) {
    a.add('box', [dx, 0, 0], [0.5, 1.0, 0.5], COLORS.metalDark, { acabado: ACABADO.metal });
  }
  for (let i = 0; i < 4; i++) {
    const y = 0.35 + i * 0.28;
    a.add('box', [rng.range(-0.15, 0.15), y, rng.range(-0.1, 0.1)], [ancho, 0.22, 0.14], COLORS.wood, {
      acabado: ACABADO.madera,
      rot: [0, 0, rng.range(-4, 4)]
    });
  }
  // Dos tablones en aspa, que es lo que la vuelve inconfundible.
  for (const signo of [1, -1]) {
    a.add('box', [0, 0.55, 0.12], [ancho * 0.95, 0.18, 0.1], COLORS.wood, {
      acabado: ACABADO.madera,
      rot: [0, 0, signo * 16]
    });
  }
  // Cinta de peligro.
  a.add('box', [0, 1.02, -0.12], [ancho, 0.12, 0.06], COLORS.paintYellow, {
    acabado: ACABADO.pintura,
    sombra: false
  });
  return a.fin();
}

/** Escombros: pedazos de mamposteria desparramados. */
export function escombros(mats, rng) {
  const a = new Armador('Escombros', mats);
  const n = rng.int(5, 9);
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.25, 0.7);
    a.add(
      'box',
      [rng.range(-1.2, 1.2), 0, rng.range(-0.9, 0.9)],
      [s, s * rng.range(0.3, 0.7), s * rng.range(0.6, 1.2)],
      rng.chance(0.3) ? COLORS.brick : COLORS.rubble,
      { acabado: ACABADO.revoque, rot: [0, rng.range(0, 360), 0], sombra: s > 0.45 }
    );
  }
  return a.fin();
}

/** Valla de obra: chapa corrugada sobre pies de hormigon. */
export function valla(mats, largo = 4) {
  const a = new Armador('Valla', mats);
  a.add('box', [0, 0.1, 0], [largo, 1.8, 0.12], COLORS.metal, { acabado: ACABADO.persiana });
  for (const dx of [-largo / 2 + 0.3, largo / 2 - 0.3]) {
    a.add('box', [dx, 0, 0], [0.7, 0.2, 0.6], COLORS.rubble, { acabado: ACABADO.revoque });
  }
  return a.fin();
}

/* =========================================================================
   VEHICULOS
   ========================================================================= */

/**
 * Auto abandonado.
 *
 * Antes era una caja con otra caja encima. Ahora tiene carroceria, cabina
 * mas angosta, cuatro ruedas, parabrisas y luces: a esta distancia de
 * camara la diferencia se nota muchisimo.
 */
export function auto(mats, rng, { esTaxi = false, color } = {}) {
  const a = new Armador(esTaxi ? 'Taxi' : 'Auto', mats);
  const cuerpo = esTaxi ? COLORS.taxi : color ?? rng.pick(COLORS.car);
  const largo = 4.3;
  const ancho = 1.82;

  // Ruedas primero: van debajo de todo.
  for (const dz of [-1.35, 1.35]) {
    for (const dx of [-ancho / 2, ancho / 2]) {
      a.add('cylinder', [dx, 0.05, dz], [0.62, 0.26, 0.62], COLORS.tire, {
        acabado: ACABADO.revoque,
        rot: [0, 0, 90],
        sombra: false
      });
    }
  }

  a.add('box', [0, 0.38, 0], [ancho, 0.62, largo], cuerpo, { acabado: ACABADO.chapa });
  // Cabina: mas angosta y corrida hacia atras, que es lo que da la silueta.
  a.add('box', [0, 1.0, 0.15], [ancho * 0.88, 0.62, largo * 0.48], cuerpo, {
    acabado: ACABADO.chapa
  });
  // Vidrios.
  a.add('box', [0, 1.05, -0.88], [ancho * 0.8, 0.5, 0.1], COLORS.glass, {
    acabado: ACABADO.vidrio,
    sombra: false
  });
  a.add('box', [0, 1.05, 1.2], [ancho * 0.8, 0.46, 0.1], COLORS.glass, {
    acabado: ACABADO.vidrio,
    sombra: false
  });
  // Luces.
  a.add('box', [0, 0.52, -largo / 2], [ancho * 0.82, 0.16, 0.08], COLORS.paint, {
    acabado: ACABADO.pintura,
    sombra: false
  });
  a.add('box', [0, 0.52, largo / 2], [ancho * 0.82, 0.16, 0.08], COLORS.toldo[0], {
    acabado: ACABADO.pintura,
    sombra: false
  });

  if (esTaxi) {
    // Techo amarillo y baliza: se reconoce a una cuadra.
    a.add('box', [0, 1.62, 0.15], [ancho * 0.9, 0.1, largo * 0.5], COLORS.taxiTecho, {
      acabado: ACABADO.chapa
    });
    a.add('box', [0, 1.72, 0.1], [0.5, 0.18, 0.22], COLORS.taxiTecho, {
      acabado: ACABADO.pintura,
      sombra: false
    });
  }
  return a.fin();
}

/** Colectivo abandonado: caja larga, franja de linea y ventanillas. */
export function colectivo(mats, rng) {
  const a = new Armador('Colectivo', mats);
  const largo = 11;
  const ancho = 2.5;

  for (const dz of [-3.6, 2.2, 3.6]) {
    for (const dx of [-ancho / 2, ancho / 2]) {
      a.add('cylinder', [dx, 0.05, dz], [0.9, 0.3, 0.9], COLORS.tire, {
        acabado: ACABADO.revoque,
        rot: [0, 0, 90],
        sombra: false
      });
    }
  }

  a.add('box', [0, 0.5, 0], [ancho, 2.5, largo], COLORS.bus, { acabado: ACABADO.chapa });
  // Franja de la linea: lo que lo hace un colectivo y no un camion.
  a.add('box', [0, 1.35, 0], [ancho + 0.06, 0.45, largo * 0.98], COLORS.busFranja, {
    acabado: ACABADO.chapa,
    sombra: false
  });
  // Ventanillas corridas a los dos lados.
  for (const dx of [-ancho / 2 - 0.02, ancho / 2 + 0.02]) {
    a.add('box', [dx, 1.95, 0.4], [0.08, 0.85, largo * 0.72], COLORS.glass, {
      acabado: ACABADO.vidrio,
      sombra: false
    });
  }
  a.add('box', [0, 1.9, -largo / 2], [ancho * 0.85, 1.0, 0.1], COLORS.glass, {
    acabado: ACABADO.vidrio,
    sombra: false
  });
  // Cartel de recorrido.
  a.add('box', [0, 2.75, -largo / 2 + 0.1], [1.2, 0.3, 0.1], COLORS.paintYellow, {
    acabado: ACABADO.pintura,
    sombra: false
  });
  if (rng.chance(0.5)) {
    a.add('box', [0, 3.0, 1.5], [ancho * 0.6, 0.12, 2.0], COLORS.rubble, {
      acabado: ACABADO.revoque
    });
  }
  return a.fin();
}

/* =========================================================================
   MISION
   ========================================================================= */

/**
 * Comisaria: el destino final. Edificio bajo con cartel y garita.
 * Tiene que verse distinto a todo lo demas desde lejos.
 */
export function comisaria(mats) {
  const a = new Armador('Comisaria', mats);
  a.add('box', [0, 0, 0], [12, 7, 10], COLORS.facade[5], { acabado: ACABADO.revoque });
  // Zocalo y franja azul: el codigo de color de una dependencia policial.
  a.add('box', [0, 0, -5.1], [12.2, 1.4, 0.3], COLORS.police, { acabado: ACABADO.pintura });
  a.add('box', [0, 4.6, -5.1], [12.2, 0.9, 0.3], COLORS.police, { acabado: ACABADO.pintura });
  // Entrada.
  a.add('box', [0, 0, -5.2], [3.0, 3.0, 0.4], COLORS.metalDark, { acabado: ACABADO.metal });
  a.add('box', [0, 3.0, -6.0], [4.2, 0.2, 1.8], COLORS.police, { acabado: ACABADO.chapa });
  for (const dx of [-1.8, 1.8]) {
    a.add('cylinder', [dx, 0, -6.6], [0.14, 3.0, 0.14], COLORS.metal, { acabado: ACABADO.metal });
  }
  // Mastil con bandera.
  a.add('cylinder', [5.0, 0, -6.5], [0.12, 6.0, 0.12], COLORS.metal, { acabado: ACABADO.metal });
  return a.fin();
}

/** Todos los constructores, por nombre, para colocarlos desde datos. */
export const PROPS = {
  arbol,
  contenedor,
  bolsas,
  cesto,
  paradaColectivo,
  kiosco,
  banco,
  semaforo,
  carteCalle,
  barricada,
  escombros,
  valla,
  auto,
  colectivo,
  comisaria
};
