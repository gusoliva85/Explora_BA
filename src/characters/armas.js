import * as pc from 'playcanvas';
import { ACABADO } from '../world/palette.js';

/**
 * ===========================================================================
 * ARMAS Y OBJETOS — FASE 12.D
 * ===========================================================================
 * El cuchillo y la pistola en la mano de Gus.
 *
 * Tenia tambien la bazooka, el botiquin y la caja de municion. Los tres se
 * fueron en la Fase 16 (D-29, D-32).
 *
 * ---------------------------------------------------------------------------
 * LA SILUETA ES TODO
 * ---------------------------------------------------------------------------
 * Un arma en la mano de un personaje de cuarenta píxeles ocupa unos ocho.
 * A esa escala no existe el detalle: lo único que llega es **el contorno
 * contra el fondo**. Así que cada arma está diseñada alrededor de una sola
 * pregunta: ¿se distingue de las otras dos de un vistazo?
 *
 * | Arma | Lo que la identifica |
 * |---|---|
 * | Cuchillo | Corto y fino. Casi no sobresale de la mano |
 * | Pistola | Corta pero con guardamonte: una L |
 *
 * El largo es lo que hace el trabajo. Dos armas del mismo largo con formas
 * distintas son la misma mancha; una corta y una larga se distinguen aunque
 * sean dos palos.
 *
 * ---------------------------------------------------------------------------
 * Y EN EL PISO, LO MISMO AL REVES
 * ---------------------------------------------------------------------------
 * Los objetos recogibles tienen el problema contrario: tienen que
 * distinguirse **del decorado**, no entre sí. La calle ya está llena de
 * cajas chicas —escombros, bolsas, cordones— así que lo que los separa no
 * es la forma sino que **se mueven**: flotan y giran, y nada más en la
 * escena lo hace.
 *
 * Lo que agrega esta fase es que además tengan una silueta propia: una cruz
 * para el botiquín y una tapa para la caja de munición, para que el jugador
 * sepa qué va a levantar antes de pisarlo.
 */

/** Colores de las armas. Metal y madera oscuros, nunca brillantes. */
export const COLOR_ARMA = {
  metal: [0.3, 0.31, 0.34],
  metalOscuro: [0.17, 0.18, 0.2],
  filo: [0.62, 0.64, 0.68],
  madera: [0.3, 0.22, 0.14],
  tubo: [0.26, 0.3, 0.24],
  boca: [0.12, 0.12, 0.13]
};

/**
 * Largo de cada arma, en metros. Es el dato que define la silueta.
 *
 * Están exagerados respecto de lo real —una pistola de 9 mm mide 19 cm, no
 * 26— por la misma razón que el pelo de Gus: a cuarenta píxeles, lo real
 * no se ve. Lo que tiene que leerse es la diferencia entre las tres.
 */
export const LARGO = {
  cuchillo: 0.26,
  pistola: 0.26
};

function pieza(mats, padre, nombre, color, escala, pos, rot = null, acabado = ACABADO.metal) {
  const e = new pc.Entity(nombre);
  e.addComponent('render', {
    type: 'box',
    material: mats.get(color, acabado),
    // Las armas NO proyectan sombra: son chicas, están en movimiento y su
    // sombra cae dentro de la del brazo. Es una llamada de dibujo por
    // pieza que no cambia nada en pantalla.
    castShadows: false
  });
  e.setLocalScale(escala[0], escala[1], escala[2]);
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  padre.addChild(e);
  return e;
}

/**
 * El cuchillo: mango y hoja.
 *
 * Apunta hacia adelante (`-Z`), que es el frente de todos los modelos del
 * proyecto. Ver `core/rumbo.js`.
 */
export function construirCuchillo(mats) {
  const raiz = new pc.Entity('Cuchillo');
  pieza(mats, raiz, 'Mango', COLOR_ARMA.madera, [0.035, 0.035, 0.09], [0, 0, 0.03], null, ACABADO.madera);
  pieza(mats, raiz, 'Guarda', COLOR_ARMA.metalOscuro, [0.07, 0.02, 0.02], [0, 0, -0.02]);
  pieza(mats, raiz, 'Hoja', COLOR_ARMA.filo, [0.022, 0.012, 0.17], [0, 0, -0.11]);
  return raiz;
}

/**
 * La pistola: una L.
 *
 * El guardamonte y la culata hacia abajo son lo que la separa del cuchillo
 * en silueta. Sin ellos, las dos son un palito corto.
 */
export function construirPistola(mats) {
  const raiz = new pc.Entity('Pistola');
  pieza(mats, raiz, 'Corredera', COLOR_ARMA.metal, [0.035, 0.05, 0.2], [0, 0.01, -0.06]);
  pieza(mats, raiz, 'Cañon', COLOR_ARMA.metalOscuro, [0.022, 0.022, 0.06], [0, 0.01, -0.18]);
  // La culata hacia abajo y atrás: el palo corto de la L.
  pieza(mats, raiz, 'Culata', COLOR_ARMA.metalOscuro, [0.032, 0.11, 0.05], [0, -0.07, 0.02], [12, 0, 0]);
  pieza(mats, raiz, 'Guardamonte', COLOR_ARMA.metal, [0.02, 0.04, 0.02], [0, -0.025, -0.04]);
  return raiz;
}

/**
 * Cuelga las armas del anclaje y deja visible sólo la equipada.
 *
 * Se construyen una vez y se encienden y apagan, igual que todo lo demás
 * en el juego: crear y destruir mallas en pleno combate produce tirones
 * por recolección de basura, y cambiar de arma es justo algo que se hace
 * con zombis encima.
 */
export class ArmasEnMano {
  /**
   * @param {pc.Entity} ancla
   * @param {import('../world/palette.js').Materiales} mats
   */
  constructor(ancla, mats) {
    this.modelos = {
      knife: construirCuchillo(mats),
      pistol: construirPistola(mats)
    };

    for (const modelo of Object.values(this.modelos)) {
      /*
       * Cada arma se agarra distinto, y eso se ajusta acá y no dentro del
       * modelo: el modelo describe el arma, el anclaje describe cómo la
       * sostiene esta mano en particular.
       */
      modelo.setLocalPosition(0, -0.02, -0.06);
      modelo.setLocalEulerAngles(-8, 0, 0);
      modelo.enabled = false;
      ancla.addChild(modelo);
    }

    this.equipada = null;
  }

  /** @param {string|null} clave */
  equipar(clave) {
    if (this.equipada === clave) return;
    for (const [k, modelo] of Object.entries(this.modelos)) {
      modelo.enabled = k === clave;
    }
    this.equipada = clave;
  }
}
