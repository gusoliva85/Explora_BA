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
 *   2. Los colores saturados se reservan, Y HAY UN ORDEN entre ellos.
 *
 *      Lo de mision —control, meta, objetos— va siempre MAS saturado que
 *      cualquier decorado. Antes esta regla decia "toldos, taxis,
 *      semaforos y objetos de mision" en la misma frase, como si fueran lo
 *      mismo, y el resultado medido fue que el toldo amarillo de un
 *      comercio (0,79 de saturacion) le ganaba a la meta de la mision
 *      (0,63). Un toldo hay veinte; la meta hay una.
 *
 *      Lo encontro una prueba de la guia de estilo, no el ojo: en una
 *      captura los dos se ven "de color" y nadie los compara.
 *
 *      El tope de los decorados es 0,75; lo de mision arranca en 0,82.
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
  /*
   * Piso de pasaje: adoquin oscuro.
   *
   * Tiene que separarse CLARAMENTE de la vereda, que es 0.62. Con un tono
   * parecido, la boca del pasaje no se lee como entrada desde la vereda de
   * enfrente: parece un hueco mas entre dos edificios. Siendo mucho mas
   * oscuro, el contraste solo ya dice "por aca se entra a otra cosa".
   */
  pasaje: [0.33, 0.3, 0.27],
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
  // El amarillo bajo de 0,79 a 0,70 de saturacion: era el decorado mas
  // llamativo de todo el juego, por encima de la meta de la mision.
  toldo: [
    [0.62, 0.22, 0.18],
    [0.18, 0.42, 0.28],
    [0.17, 0.32, 0.52],
    [0.64, 0.5, 0.19]
  ],

  // --- Vehiculos ------------------------------------------------------------
  car: [
    // El rojo baja un punto por lo mismo que el toldo amarillo.
    [0.58, 0.2, 0.17],
    [0.16, 0.3, 0.54],
    [0.78, 0.78, 0.76],
    [0.24, 0.25, 0.27]
  ],
  glass: [0.26, 0.33, 0.38],
  tire: [0.09, 0.09, 0.1],
  taxi: [0.12, 0.12, 0.13],
  /*
   * El techo del taxi es lo mas llamativo que puede haber en la calzada, y
   * aun asi tiene que quedar por debajo de un control. Estaba en 0,89 de
   * saturacion —mas que cualquier cosa del juego salvo el semaforo— y un
   * taxi abandonado llamaba mas la atencion que el objetivo.
   */
  taxiTecho: [0.86, 0.72, 0.22],
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
  /*
   * La meta: el verde mas saturado del juego, por encima de todo decorado.
   * Subio de 0,63 a 0,83 de saturacion por el mismo motivo que bajaron los
   * toldos: es lo que el jugador tiene que encontrar.
   */
  goal: [0.14, 0.82, 0.42],
  police: [0.16, 0.26, 0.45]
};

/** Acabados: cuanto brilla y cuanto de metal tiene cada superficie. */
/*
 * Acabados.
 *
 * Son POCOS a proposito. Cada combinacion distinta de color y acabado crea
 * un material, y cada material rompe el agrupado de mallas: dos cajas del
 * mismo color pero con brillo distinto ya no se pueden fundir en una.
 *
 * Antes habia siete acabados mates con brillos entre 0.04 y 0.2, una
 * diferencia que nadie distingue en pantalla pero que multiplicaba los
 * materiales. Ahora los mates son uno solo. Los nombres viejos se
 * conservan apuntando al mismo objeto, para que el codigo siga leyendose
 * como lo que representa (tela, madera, hoja) sin costar nada.
 */
const MATE = { gloss: 0.07, metalness: 0.0 };

export const ACABADO = {
  asfalto: { gloss: 0.12, metalness: 0.0 },
  // Todos estos son el mismo material: la diferencia de brillo entre un
  // revoque y un toldo de lona no se ve a veinte metros de distancia.
  revoque: MATE,
  vereda: MATE,
  tela: MATE,
  hoja: MATE,
  madera: MATE,
  pintura: MATE,
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
