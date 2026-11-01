import { FACHADA, CARTEL, CALLE, OBJETO } from '../paleta.js';
import { ALTO_CARTEL } from '../carteles.js';

/**
 * ===========================================================================
 * FACHADAS — la planta baja es lo que se ve
 * ===========================================================================
 * Fase 12R, tarea 12R.4.
 *
 * ---------------------------------------------------------------------------
 * 1. CUANTA FACHADA VE EL JUGADOR, MEDIDO
 * ---------------------------------------------------------------------------
 * El plan decia "los edificios son cajas lisas, no tienen una sola ventana".
 * **Era falso.** El generador viejo ya ponia 180 ventanas, 79 balcones con su
 * baranda, persianas, toldos, carteles y tanques de agua.
 *
 * Lo que pasa es otra cosa, y se midio proyectando la linea municipal a la
 * pantalla con la camara del juego:
 *
 * | Distancia por delante | Altura de fachada en pantalla |
 * |---|---|
 * | al lado del jugador | **nada**: queda fuera del encuadre por arriba |
 * | 10 m | hasta 8 m |
 * | 25 m | hasta 4 m |
 * | 45 m | apenas el pie |
 *
 * O sea que **los pisos altos casi no se ven** y los primeros cuatro metros
 * se ven siempre. Todo el detalle que el generador viejo ponia arriba se
 * estaba dibujando para nadie.
 *
 * ---------------------------------------------------------------------------
 * 2. Y EL RELIEVE APUNTABA PARA EL LADO EQUIVOCADO
 * ---------------------------------------------------------------------------
 * El toldo viejo "volaba" 1,5 m... **hacia adentro del edificio**. Medido: la
 * cara de la fachada estaba en x = 10,04 y el toldo ocupaba de 10,04 a 11,54,
 * o sea enterrado en la pared. Lo mismo el cartel y la persiana.
 *
 * Con todas las piezas enterradas, la fachada es un plano liso por mas piezas
 * que tenga. Es la causa real de que se vieran "cajas de color".
 *
 * Para que no vuelva a pasar, este kit no habla de coordenadas: habla de
 * **cuanto sobresale hacia la calle**. Positivo vuela sobre la vereda,
 * negativo se hunde en el edificio. El que traduce eso a ejes es el
 * generador, una sola vez.
 */

/** Acabados. Mate casi todo; la chapa y el vidrio son las excepciones. */
export const ACABADO = {
  revoque: { gloss: 0.06, metalness: 0 },
  persiana: { gloss: 0.26, metalness: 0.45 },
  metal: { gloss: 0.35, metalness: 0.55 },
  /*
   * El vidrio NO brilla. De dia una vidriera se ve oscura, porque adentro no
   * hay luz. Con el brillo alto que tenia antes se volvia un espejo claro
   * que se confundia con el revoque de al lado.
   */
  vidrio: { gloss: 0.3, metalness: 0.1 },
  madera: { gloss: 0.1, metalness: 0 },
  tela: { gloss: 0.05, metalness: 0 }
};

export const MEDIDAS = {
  /** Alto de la planta baja hasta la cornisa. Manda la puerta de 2,10. */
  altoPlantaBaja: 4.2,
  /** Cuanto se hunde el local respecto de la linea municipal. */
  hundidoLocal: 0.45,
  /** Cuanto vuela la cornisa que separa la planta baja de los pisos. */
  vueloCornisa: 0.38,
  /** Cuanto vuela el toldo sobre la vereda. */
  vueloToldo: 1.6,
  altoZocalo: 0.55
};

/**
 * La planta baja: lo unico que el jugador ve siempre.
 *
 * @param {Function} poner `(nombre, vuela, y, largo, alto, prof, color, opt)`.
 *   `vuela` es cuanto sobresale el CENTRO de la pieza hacia la calle desde la
 *   linea municipal: positivo vuela sobre la vereda, negativo se hunde.
 *   `opt.offset` corre la pieza a lo ancho de la fachada.
 */
export function plantaBaja(poner, { width, rng, clave, hayLocal }) {
  const h = MEDIDAS.altoPlantaBaja;

  if (hayLocal) {
    /*
     * El local: un hueco oscuro con la vidriera adentro.
     *
     * El hueco es lo que hace el trabajo. Una vidriera al ras se lee como un
     * rectangulo de color; hundida 45 cm, el marco le tira sombra encima y se
     * lee como un local. Misma idea que las juntas de la vereda: la
     * profundidad es lo que da la lectura.
     */
    const anchoLocal = width * 0.72;
    poner(`${clave}_Hueco`, -MEDIDAS.hundidoLocal / 2, 1.9,
      anchoLocal, 3.0, MEDIDAS.hundidoLocal, FACHADA.hueco,
      { acabado: ACABADO.revoque });

    poner(`${clave}_Vidriera`, -MEDIDAS.hundidoLocal + 0.08, 1.95,
      anchoLocal * 0.94, 2.5, 0.1, FACHADA.persiana,
      { acabado: ACABADO.vidrio });

    // El marco: dos jambas y un dintel, apenas salidos. Le dan borde al hueco.
    const jamba = 0.3;
    for (const s of [-1, 1]) {
      poner(`${clave}_Jamba${s > 0 ? 'D' : 'I'}`, 0.08, 1.95,
        jamba, 3.3, 0.4, FACHADA.crema,
        { acabado: ACABADO.revoque, offset: ((anchoLocal + jamba) / 2) * s });
    }
    poner(`${clave}_Dintel`, 0.08, 3.62,
      anchoLocal + jamba * 2, 0.36, 0.4, FACHADA.crema,
      { acabado: ACABADO.revoque });

    /*
     * La persiana: baja, a media asta o levantada.
     *
     * Un barrio abandonado tiene casi todo cerrado, pero si estan TODAS
     * cerradas la cuadra se vuelve un muro. Una de cada tres queda abierta y
     * deja ver el hueco negro, que ademas es lo que mas contrasta.
     */
    const r = rng();
    const estado = r < 0.6 ? 'baja' : r < 0.78 ? 'media' : 'abierta';
    if (estado !== 'abierta') {
      const alto = estado === 'baja' ? 2.9 : 1.5;
      const y = estado === 'baja' ? 1.85 : 2.55;
      poner(`${clave}_Persiana`, 0.02, y,
        anchoLocal * 0.98, alto, 0.1, FACHADA.persiana,
        { acabado: ACABADO.persiana });

      // Las lamas: franjas finas que la separan de una chapa lisa.
      // Tres lamas alcanzan: a 20 m, mas se funden en una sola mancha y
      // solo suman piezas.
      const n = 3;
      for (let i = 1; i < n; i++) {
        poner(`${clave}_Lama${i}`, 0.07, y - alto / 2 + (alto * i) / n,
          anchoLocal * 0.98, 0.04, 0.03, FACHADA.metal_oscuro,
          { acabado: ACABADO.persiana });
      }
    }
  } else {
    // Sin local: pared con revoque y nada mas. Rompe la hilera de vidrieras.
    poner(`${clave}_Pared`, 0.04, 2.1, width * 0.82, 4.1, 0.12,
      FACHADA.revoque, { acabado: ACABADO.revoque });
  }

  /*
   * Zocalo: la franja sucia de abajo. En la calle existe porque ahi pega el
   * agua; aca ademas apoya el edificio en la vereda en vez de dejarlo
   * flotando.
   */
  poner(`${clave}_Zocalo`, 0.06, MEDIDAS.altoZocalo / 2,
    width * 0.96, MEDIDAS.altoZocalo, 0.24, FACHADA.ladrillo,
    { acabado: ACABADO.revoque });

  /*
   * Cornisa: la linea horizontal que separa la planta baja de los pisos.
   *
   * Es la pieza mas barata y la que mas rinde: vuela 38 cm, le tira una
   * sombra dura a todo lo de abajo y le pone un techo a la vereda. Sin ella
   * la fachada es una pared que sube sin accidentes.
   */
  poner(`${clave}_Cornisa`, MEDIDAS.vueloCornisa / 2, h,
    width, 0.3, MEDIDAS.vueloCornisa, FACHADA.crema,
    { acabado: ACABADO.revoque, sombra: true });
}

/**
 * El toldo. Dos piezas: el plano que vuela y la faldilla del borde.
 *
 * La faldilla es lo que lo separa de una tabla: la tira vertical que cuelga
 * del frente, que es por donde se reconoce un toldo desde arriba.
 */
export function toldo(poner, { width, rng, clave }) {
  const color = rng.pick([CARTEL.toldo, CARTEL.verde, CARTEL.rojo]);
  const ancho = width * 0.68;
  poner(`${clave}_Toldo`, MEDIDAS.vueloToldo / 2, 3.2,
    ancho, 0.14, MEDIDAS.vueloToldo, color,
    { acabado: ACABADO.tela, sombra: true });
  poner(`${clave}_ToldoFaldilla`, MEDIDAS.vueloToldo, 2.98,
    ancho, 0.42, 0.08, color, { acabado: ACABADO.tela });
}

/**
 * El cartel del comercio. El texto llega en 12R.5.
 *
 * Va entre el dintel y la cornisa, que es donde esta en la calle. Mas arriba
 * de la cornisa no se ve desde esta camara.
 */
export function cartel(poner, { width, clave, material }) {
  /*
   * La banda mide 0,95 y no 0,58 como antes, y es por legibilidad, no por
   * gusto: a 25 m un cartel de 0,58 ocupa 8 pixeles en pantalla y el texto
   * adentro seria la mitad. Es mas grande de lo que seria en la calle real,
   * y un cartel que no se puede leer no cumple ninguna funcion.
   */
  poner(`${clave}_Cartel`, 0.22, 3.9, width * 0.62, ALTO_CARTEL, 0.14,
    null, { acabado: ACABADO.revoque, material });
}

/**
 * La puerta del edificio, al costado del local.
 *
 * Marco, hoja hundida y escalon. El escalon son ocho centimetros y es lo que
 * hace que la puerta este APOYADA en la vereda y no pegada encima.
 */
export function puerta(poner, { width, clave }) {
  const off = width * 0.41;
  poner(`${clave}_PuertaMarco`, 0.06, 1.25, 1.5, 2.5, 0.3,
    FACHADA.ladrillo, { acabado: ACABADO.revoque, offset: off });
  poner(`${clave}_Puerta`, -0.1, 1.1, 1.18, 2.2, 0.16,
    OBJETO.madera, { acabado: ACABADO.madera, offset: off });
  poner(`${clave}_Escalon`, 0.22, 0.04, 1.6, 0.08, 0.5,
    CALLE.hormigon, { acabado: ACABADO.revoque, offset: off });
}

/**
 * Los pisos altos: baratos, y resueltos como silueta.
 *
 * Se ven hasta los 8 m, y solo cuando estan unos 10 m por delante. Mas lejos
 * lo unico que llega es el contorno contra el cielo. Asi que:
 *
 *  - el primer piso lleva ventana Y balcon, porque ese si se ve;
 *  - los de arriba llevan solo la ventana hundida, que a esa distancia es una
 *    mancha oscura y alcanza;
 *  - y la cornisa de remate, que es lo que recorta el edificio contra el cielo.
 *
 * El generador viejo ponia balcon con baranda en todos los pisos: 79 balcones
 * y 79 barandas dibujados, casi todos para nadie.
 */
export function pisosAltos(poner, { width, height, rng, clave }) {
  const base = MEDIDAS.altoPlantaBaja + 1.0;
  const pisos = Math.max(0, Math.floor((height - base) / 3));
  const cols = Math.max(1, Math.round(width / 4.2));

  for (let p = 0; p < pisos; p++) {
    const y = base + p * 3;
    for (let c = 0; c < cols; c++) {
      const off = -width / 2 + ((c + 0.5) * width) / cols;

      // La ventana es un hueco hundido, no un panel pegado: el marco le tira
      // sombra y por eso se lee como ventana y no como un azulejo.
      poner(`${clave}_Ventana_${p}_${c}`, -0.16, y + 0.8, 1.4, 1.5, 0.3,
        FACHADA.hueco, { acabado: ACABADO.vidrio, offset: off });

      if (p === 0 && rng.chance(0.55)) {
        poner(`${clave}_Balcon_${p}_${c}`, 0.45, y, 2.1, 0.13, 0.9,
          FACHADA.crema, { acabado: ACABADO.revoque, offset: off });
        poner(`${clave}_Baranda_${p}_${c}`, 0.86, y + 0.48, 2.1, 0.85, 0.07,
          FACHADA.metal_oscuro, { acabado: ACABADO.metal, offset: off });
      }
    }
  }

  // Remate: la cornisa de arriba de todo, la que recorta la silueta.
  poner(`${clave}_Remate`, 0.3, height - 0.2, width, 0.42, 0.62,
    FACHADA.gris, { acabado: ACABADO.revoque, sombra: true });
}
