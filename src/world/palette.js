import * as pc from 'playcanvas';

/**
 * ===========================================================================
 * PALETA Y MATERIALES DEL MUNDO
 * ===========================================================================
 * Vive aparte porque la comparten el generador de calles y la biblioteca de
 * props. Que todo salga del mismo lugar es lo que evita el efecto "collage":
 * dos verdes distintos para dos arboles vecinos se nota inmediatamente.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA DE LA LEGIBILIDAD
 * ---------------------------------------------------------------------------
 * Low-poly claro, pero con todo distinguible. Eso NO se consigue con mas
 * poligonos, sino con tres reglas de color:
 *
 *   1. Dos superficies que se tocan nunca comparten valor. El asfalto es
 *      medio, la vereda clara, el cordon mas claro todavia. Asi los planos
 *      se separan solos aunque no haya ni una textura.
 *   2. Los colores saturados se reservan. Toldos, taxis, semaforos y
 *      objetos de mision. Si todo tiene color, nada resalta, y el jugador
 *      pierde la pista de lo que importa.
 *   3. Todo es mate salvo chapa y persianas. El especular fuerte es lo que
 *      hace que un low-poly se vea de plastico, y encima compite con la
 *      lectura de las formas.
 *
 * Los numeros son albedo: cuanta luz refleja la superficie.
 */

export const COLORS = {
  // --- Calle ----------------------------------------------------------------
  asphalt: [0.33, 0.325, 0.315],
  asphaltWet: [0.28, 0.277, 0.272],
  sidewalk: [0.62, 0.6, 0.56],
  sidewalkAlt: [0.58, 0.565, 0.53],
  curb: [0.7, 0.68, 0.64],
  /** Pintura vial: blanco sucio, nunca blanco puro. */
  paint: [0.82, 0.8, 0.74],
  paintYellow: [0.8, 0.66, 0.2],

  // --- Edificios ------------------------------------------------------------
  // Ocre, celeste desvaido, crema, verde agua, terracota y gris: los colores
  // que uno ve caminando por Boedo.
  facade: [
    [0.76, 0.66, 0.48],
    [0.58, 0.66, 0.7],
    [0.82, 0.78, 0.66],
    [0.55, 0.64, 0.56],
    [0.74, 0.54, 0.44],
    [0.68, 0.7, 0.72]
  ],
  /** Zocalo de la planta baja: siempre mas oscuro que la fachada. */
  plinth: [0.38, 0.36, 0.34],
  shutter: [0.42, 0.44, 0.45],
  /** Medianera sin revocar: el ladrillo a la vista de los laterales. */
  brick: [0.56, 0.4, 0.33],
  balcony: [0.3, 0.31, 0.33],

  // --- Acentos --------------------------------------------------------------
  toldo: [
    [0.62, 0.22, 0.18],
    [0.18, 0.42, 0.28],
    [0.17, 0.32, 0.52],
    [0.66, 0.5, 0.14]
  ],

  // --- Vehiculos ------------------------------------------------------------
  car: [
    [0.6, 0.17, 0.14],
    [0.16, 0.3, 0.54],
    [0.78, 0.78, 0.76],
    [0.24, 0.25, 0.27]
  ],
  glass: [0.26, 0.33, 0.38],
  tire: [0.09, 0.09, 0.1],
  taxi: [0.12, 0.12, 0.13],
  taxiTecho: [0.88, 0.72, 0.1],
  bus: [0.2, 0.36, 0.58],
  busFranja: [0.78, 0.3, 0.2],

  // --- Vegetacion y mobiliario ---------------------------------------------
  trunk: [0.32, 0.26, 0.2],
  leaves: [
    [0.3, 0.45, 0.24],
    [0.26, 0.4, 0.22],
    [0.36, 0.5, 0.27]
  ],
  soil: [0.26, 0.21, 0.16],
  metal: [0.34, 0.36, 0.38],
  metalDark: [0.2, 0.21, 0.23],
  wood: [0.47, 0.35, 0.22],
  binGreen: [0.22, 0.36, 0.26],
  bag: [0.14, 0.15, 0.16],
  rubble: [0.5, 0.48, 0.45],

  // --- Semaforo. Los unicos colores puros de toda la escena. ---------------
  lightRed: [0.85, 0.12, 0.1],
  lightAmber: [0.9, 0.62, 0.08],
  lightGreen: [0.15, 0.72, 0.3],

  // --- Mision ---------------------------------------------------------------
  checkpoint: [0.95, 0.72, 0.15],
  goal: [0.3, 0.8, 0.48],
  police: [0.16, 0.26, 0.45]
};

/** Acabados: cuanto brilla y cuanto de metal tiene cada superficie. */
export const ACABADO = {
  asfalto: { gloss: 0.12, metalness: 0.0 },
  vereda: { gloss: 0.08, metalness: 0.0 },
  revoque: { gloss: 0.05, metalness: 0.0 },
  tela: { gloss: 0.06, metalness: 0.0 },
  hoja: { gloss: 0.04, metalness: 0.0 },
  madera: { gloss: 0.1, metalness: 0.0 },
  pintura: { gloss: 0.2, metalness: 0.0 },
  // Las unicas superficies con brillo. Si todo brilla, nada destaca.
  chapa: { gloss: 0.55, metalness: 0.45 },
  persiana: { gloss: 0.3, metalness: 0.5 },
  metal: { gloss: 0.4, metalness: 0.6 },
  vidrio: { gloss: 0.8, metalness: 0.1 }
};

/**
 * Fabrica de materiales con cache.
 *
 * Reutilizar importa mas de lo que parece: cada material distinto rompe el
 * agrupado de mallas, y con doscientos props en pantalla eso es la
 * diferencia entre treinta llamadas de dibujo y trescientas.
 */
export class Materiales {
  constructor() {
    /** @type {Map<string, pc.StandardMaterial>} */
    this.cache = new Map();
  }

  /**
   * @param {number[]} rgb albedo
   * @param {{gloss:number, metalness:number}} [acabado]
   */
  get(rgb, acabado = ACABADO.revoque) {
    const key = `${rgb.map((v) => v.toFixed(3)).join(',')}|${acabado.gloss}|${acabado.metalness}`;
    let m = this.cache.get(key);
    if (!m) {
      m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(rgb[0], rgb[1], rgb[2]);
      m.gloss = acabado.gloss;
      m.metalness = acabado.metalness;
      m.useMetalness = true;
      m.update();
      this.cache.set(key, m);
    }
    return m;
  }

  /**
   * Material plano, sin iluminar. Para la pintura vial y los marcadores de
   * mision: tienen que verse igual al sol que en sombra, porque son
   * informacion, no decorado.
   */
  getPlano(rgb, opacidad = 1) {
    const key = `P|${rgb.map((v) => v.toFixed(3)).join(',')}|${opacidad}`;
    let m = this.cache.get(key);
    if (!m) {
      m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color(rgb[0], rgb[1], rgb[2]);
      m.useLighting = false;
      if (opacidad < 1) {
        m.blendType = pc.BLEND_NORMAL;
        m.opacity = opacidad;
        m.depthWrite = false;
      }
      m.update();
      this.cache.set(key, m);
    }
    return m;
  }

  clear() {
    this.cache.clear();
  }
}
