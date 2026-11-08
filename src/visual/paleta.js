/**
 * ===========================================================================
 * PALETA — MUESTREADA DE LA REFERENCIA
 * ===========================================================================
 *
 * Fase 12R, tarea 12R.0. Reemplaza a `src/art/styleGuide.js` y a la parte de
 * color de `src/world/palette.js`, que se eligieron a ojo.
 *
 * Ningun color de este archivo se eligio mirando. Todos salen de leer los
 * pixeles de `documentacion/visual/REFERENCIA_VISUAL.png`, y los de Gus de
 * `documentacion/personajes/Gus.jpeg` (decision D-24).
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO ALCANZA CON COPIAR EL PIXEL
 * ---------------------------------------------------------------------------
 * La referencia esta bañada en luz dorada de tarde. Un pixel no es el color
 * del material: es el material MULTIPLICADO por la luz. Si se copia el pixel
 * como albedo y despues el motor le pone su propio sol encima, el color se
 * dora dos veces y toda la escena termina naranja.
 *
 * Asi que primero se midio la luz, sobre seis superficies que sabemos
 * blancas: la raya vial, la franja blanca de la barricada, la carroceria del
 * colectivo, la franja del guante, la cruz del botiquin y la camisa del
 * primer zombi. Un blanco fotografiado ES el color de la luz.
 *
 *   Calle:   (1.000, 0.808, 0.645)   un sol muy anaranjado, de las 17:30
 *   Paneles: (1.000, 0.843, 0.729)   los paneles estan menos dorados
 *
 * El albedo es el pixel dividido por ese factor. Es lo que esta en la columna
 * "medido" de los comentarios de abajo.
 *
 * ---------------------------------------------------------------------------
 * DONDE LA MEDICION NO ALCANZA, Y QUE SE HIZO
 * ---------------------------------------------------------------------------
 * El metodo corrige el COLOR de la luz, no su INTENSIDAD ni la neblina. Tres
 * medidas salieron mal por eso, y estan corregidas a mano y anotadas:
 *
 * 1. El asfalto medido da 0.42 de luminancia. El asfalto de verdad refleja
 *    entre 0.10 y 0.20: la ilustracion lo tiene clarisimo porque el sol le
 *    pega rasante. Y a 0.42 pasa algo peor: queda a 0.016 de la piel de los
 *    zombis, o sea que un zombi parado en la calle SE FUNDE CON EL PISO.
 *
 *    Bajarlo tampoco es libre: el jean de Gus esta en 0.25 y el cuero en
 *    0.19, asi que un asfalto oscuro se come al protagonista. La ventana que
 *    deja contento a todo el mundo es estrecha, entre 0.31 y 0.37, y el valor
 *    elegido es 0.335. Esto no se vio mirando: lo encontro la prueba.
 * 2. El obelisco y la carroceria del colectivo saturaron el sensor (dan
 *    blanco puro o se van a azul por la neblina de distancia). Se derivan de
 *    la vereda y del blanco de los paneles.
 * 3. Gus.jpeg tiene luz de estudio y no tiene ningun blanco con el que medir,
 *    asi que sus colores van sin balancear. Se anota para no olvidarlo.
 *
 * ---------------------------------------------------------------------------
 * EL FORMATO
 * ---------------------------------------------------------------------------
 * `[r, g, b]` de 0 a 1, albedo, igual que esperaba la capa vieja, para que el
 * cambio de paleta no obligue a tocar como se crean los materiales.
 */

/* =========================================================================
   LA LUZ
   ========================================================================= */

/**
 * El sol tal como esta medido en la referencia. NO es el que usa el juego.
 *
 * Es de tarde dorada, y D-16 tiene medido que un sol bajo tira 11 m de
 * sombra sobre una calzada de 10 y la tapa entera. Queda para que el banco
 * visual pueda mostrar las dos y para que nadie vuelva a medirlo.
 */
export const SOL_MEDIDO = [1.0, 0.808, 0.645];

/**
 * El sol del juego. Decision D-25: elevacion alta de D-16, color calido de la
 * referencia.
 *
 * Es el punto medio entre el sol medido y el blanco. Con el sol a 70-73 grados
 * un naranja de 0.645 de azul no existe en la naturaleza y ademas tiñe tanto
 * que se come las diferencias entre materiales.
 */
export const SOL = [1.0, 0.9, 0.8];

/** Cielo, medido en el cenit de la referencia. Es la luz de las sombras. */
export const CIELO = [0.671, 0.765, 0.914];

/** Horizonte, medido. Es el calido que separa el cielo del fondo de la calle. */
export const HORIZONTE = [0.941, 0.824, 0.663];

/**
 * Rebote del piso. No se mide: es la vereda devolviendo luz hacia arriba, y
 * es lo que evita que los bajos de todo queden negros.
 */
export const REBOTE = [0.45, 0.4, 0.34];

/* =========================================================================
   LA CALLE
   ========================================================================= */

export const CALLE = {
  /**
   * medido #706873 (lum 0.42) -> bajado a 0.30 Y NEUTRALIZADO.
   *
   * Dos correcciones, y la segunda la encontro recien 12R.3, cuando el
   * color se puso en el mundo en vez de mirarse en un casillero:
   *
   * 1. La luminancia. Ver la nota 1 de la cabecera.
   * 2. **El tono.** El medido tiene mas azul que rojo, y puesto en una
   *    calle entera bajo la luz de cielo la calzada se veia LILA. El
   *    descuento de la luz divide por un sol calido, y eso sobre-corrige:
   *    da por sentado que el sol es la unica luz, cuando en la referencia
   *    la calle tambien recibe el azul del cielo. En un parche de 40 px
   *    no se nota; en diez metros de calzada, si.
   */
  asfalto: [0.31, 0.3, 0.295],
  /**
   * Derivado del asfalto: el parche remendado.
   *
   * Apenas mas oscuro, y es a proposito. Con mas contraste deja de leerse
   * como un remiendo y pasa a leerse como una mancha pegada encima: fue lo
   * primero que se vio mal al probar 12R.3 en el celular.
   */
  asfalto_remiendo: [0.288, 0.279, 0.274],
  /** medido #e8e1db. Pintura vial: blanco sucio, nunca blanco puro. */
  raya: [0.91, 0.882, 0.859],
  /** medido #c19b40. El amarillo del cordon, gastado. */
  cordon: [0.757, 0.608, 0.251],
  /**
   * medido #ddccc2 (lum 0.81) -> bajado a 0.62.
   *
   * 0,81 es el albedo de una hoja de papel. La baldosa medida sale tan
   * clara porque en la referencia le pega el sol de frente, y el descuento
   * de la luz corrige el color pero no la intensidad. Puesta en el mundo,
   * la vereda brillaba mas que la ropa de los zombis.
   */
  vereda: [0.663, 0.612, 0.582],
  /** medido #baa8a4. La junta entre baldosas, y la baldosa alterna. */
  vereda_junta: [0.513, 0.464, 0.453],
  /** Derivado de la vereda: hormigon de cordon, rampa y tapas. */
  hormigon: [0.572, 0.542, 0.521]
};

/* =========================================================================
   LAS FACHADAS
   ========================================================================= */

export const FACHADA = {
  /** medido #f9f0cd. El crema de los edificios al sol. */
  crema: [0.976, 0.941, 0.804],
  /** medido #dfb5a3. El terracota apagado de la referencia. */
  terracota: [0.875, 0.71, 0.639],
  /** medido #928895. Gris calido, el mas comun del fondo. */
  gris: [0.573, 0.533, 0.584],
  /** medido #685d65. Ladrillo oscuro y zocalos. */
  ladrillo: [0.408, 0.365, 0.396],
  /** Derivado: el revoque claro, para variar sin repetir el crema. */
  revoque: [0.82, 0.78, 0.72],
  /** medido #3a3e4f. Persiana metalica bajada: gris con azul, nunca negra. */
  persiana: [0.227, 0.243, 0.31],
  /** medido #262936. Barandas, rejas y carpinteria oscura. */
  metal_oscuro: [0.149, 0.161, 0.212],
  /**
   * El fondo de un hueco: el interior de un local sin luz, visto desde la
   * vereda.
   *
   * Estaba en 0,11 y era practicamente negro. Puesto en la calle, cada local
   * se leia como un agujero recortado y la cuadra parecia rota. Un interior
   * en penumbra NO es negro: le entra luz de la calle. A 0,19 sigue siendo
   * lo mas oscuro de la fachada y deja de parecer un error.
   */
  hueco: [0.19, 0.185, 0.2],

  /**
   * El vidrio de una vidriera o una ventana.
   *
   * De dia un vidrio no es negro ni es un espejo: refleja el cielo, asi que
   * es un gris azulado medio-oscuro, mas CLARO que el hueco que tiene
   * detras. Esa diferencia entre el vidrio y el hueco es lo que hace que se
   * lea como vidrio y no como un agujero.
   */
  vidrio: [0.27, 0.3, 0.36],
  /** medido #515a7b. Postes, columnas y luminarias. */
  poste: [0.318, 0.353, 0.482]
};

/* =========================================================================
   CARTELERIA Y TOLDOS
   ========================================================================= */

export const CARTEL = {
  /** medido #c96251. El rojo de "La Esquina". */
  rojo: [0.788, 0.384, 0.318],
  /** medido #ca584c. El toldo, apenas mas saturado que el cartel. */
  toldo: [0.792, 0.345, 0.298],
  /** medido #4a6e60. El verde de la farmacia. */
  verde: [0.29, 0.431, 0.376],
  /** Derivado: la letra crema sobre fondo oscuro. */
  letra: [0.93, 0.9, 0.84]
};

/* =========================================================================
   VEGETACION
   ========================================================================= */

/**
 * Tres verdes, no uno. La regla de la referencia es que ninguna copa es de un
 * solo color: lo que la hace leerse como copa y no como esfera es que los
 * volumenes de adentro tengan valores distintos.
 */
export const VERDE = {
  /** medido #768d4e */
  claro: [0.463, 0.553, 0.306],
  /** medido #68724e */
  medio: [0.408, 0.447, 0.306],
  /** medido #3e4c30 */
  oscuro: [0.243, 0.298, 0.188],
  /**
   * medido #433a38 (lum 0.23) -> subido a 0.34.
   *
   * El tronco y la hoja en sombra quedaban a 0.044, y se tocan en todo el
   * borde de la copa: el arbol se leia como una mancha sola. Ademas el
   * platano de Buenos Aires tiene la corteza clara y manchada, asi que
   * aclararlo es mas parecido, no menos.
   */
  tronco: [0.382, 0.33, 0.32]
};

/* =========================================================================
   VEHICULOS
   ========================================================================= */

export const VEHICULO = {
  /** medido #b88381. El rojo apagado del auto de la referencia. */
  rojo: [0.722, 0.514, 0.506],
  /** medido #4b5470. Vidrios: azulados y oscuros, no negros. */
  vidrio: [0.294, 0.329, 0.439],
  /** Derivado del blanco de panel: la carroceria clara del colectivo. */
  claro: [0.808, 0.816, 0.855],
  /** medido #3e64a6. La franja azul del colectivo y el banco de la parada. */
  azul: [0.243, 0.392, 0.651],
  /** Derivado: goma de las ruedas. */
  goma: [0.1, 0.1, 0.11]
};

/* =========================================================================
   ABANDONO
   ========================================================================= */

export const ABANDONO = {
  /** medido #c57e5a. El naranja de la barricada vial. */
  barricada: [0.773, 0.494, 0.353],
  /** medido #c18b4c. Cajon de verduleria. */
  madera: [0.757, 0.545, 0.298],
  /** medido #2c2d36. Bolsa de consorcio. */
  bolsa: [0.173, 0.176, 0.212],
  /** Derivado del hormigon, mas sucio: escombro y polvo. */
  escombro: [0.5, 0.47, 0.44]
};

/* =========================================================================
   ZOMBIS
   ========================================================================= */

export const ZOMBI = {
  /**
   * medido #726d73. Gris con un toque violeta, nada de verde fosforescente.
   *
   * Medida da 0.433 y queda a 0.098 del asfalto: justo en el limite. Subida
   * a 0.46, que ademas es mas creible (un muerto esta palido, no bronceado).
   * Aun asi es poco, y es a proposito: lo que
   * separa a un zombi del piso no es la piel, es la ROPA. Si en algun momento
   * hay un zombi en cueros, hay que volver sobre este numero.
   */
  piel: [0.475, 0.454, 0.479],
  /** medido #dfddcf. Camisa que fue blanca. Es lo que mas lo separa del piso. */
  camisa: [0.875, 0.867, 0.812],
  /** medido #61544e. Pantalon de vestir gastado. */
  pantalon: [0.38, 0.329, 0.306],
  /** medido #4c5260. Jean lavado. */
  jean: [0.298, 0.322, 0.376],
  /** medido #303a4d. Jean oscuro de trabajo. */
  jean_oscuro: [0.188, 0.227, 0.302],
  /** medido #3d4459. Camisa de obrero. */
  camisa_azul: [0.239, 0.267, 0.349],
  /** medido #4f2c31. El chaleco rojo del segundo zombi. */
  chaleco_rojo: [0.31, 0.173, 0.192],
  /** medido #ac5e1e (sat 0.83) -> bajado a 0.72, para que no le gane al botiquin. */
  chaleco_naranja: [0.675, 0.33, 0.189],
  /** medido #dbb438. El casco. */
  casco: [0.859, 0.706, 0.22],
  /** medido #463931. Botas y zapatos. */
  calzado: [0.275, 0.224, 0.192]
};

/* =========================================================================
   GUS — dos referencias, decision D-24
   ========================================================================= */

/**
 * Gus sale de DOS referencias, y cada parte tiene la suya. Decision D-24.
 *
 *   El cuerpo entero, la ropa y el equipo -> el superviviente del panel de
 *   REFERENCIA_VISUAL.png, con el balance de blancos de los paneles.
 *   La campera de cuero y la cara      -> Gus.jpeg, sin balance, porque esa
 *   foto tiene luz de estudio y ningun blanco con el que medir.
 *
 * Que la campera sea de cuero negro y no la azul de jean del panel es lo
 * unico que cambia respecto del modelo nuevo, y es a proposito: es lo que
 * hace que sea Gus y no un superviviente generico.
 *
 * El cuero queda a 0.145 de luminancia del asfalto y a 0.24 de la piel de los
 * zombis: se lee. Era la duda que dejaba abierta D-24 y la respuesta es que de
 * negro se lo ve, siempre que el asfalto no sea tambien oscuro.
 */
export const GUS = {
  /* --- De Gus.jpeg: la campera -------------------------------------------- */
  /** medido #352f32. Cuero negro: negro con violeta, nunca 0,0,0. */
  cuero: [0.208, 0.184, 0.196],
  /** medido #201d22. El lado en sombra de la campera. */
  cuero_sombra: [0.125, 0.114, 0.133],
  /** medido #4b3f40. El brillo del cuero donde le pega la luz. */
  cuero_luz: [0.294, 0.247, 0.251],

  /* --- Del panel de la referencia: el resto -------------------------------- */
  /** medido #b5b1b4. Remera gris de cuello en V. */
  remera: [0.71, 0.694, 0.706],
  /**
   * medido #51627b (lum 0.377) -> subido a 0.42.
   *
   * Medido quedaba a 0.042 del asfalto: las piernas de Gus se fundian con la
   * calle. Es el mismo problema que tenian los zombis y se arregla igual, con
   * la diferencia de que aca hay que subir, no bajar.
   */
  jean: [0.354, 0.428, 0.537],
  /** medido #344156. El jean en sombra y los pliegues. */
  jean_sombra: [0.204, 0.255, 0.337],
  /** medido #4b4145. Pelo castaño oscuro. */
  pelo: [0.294, 0.255, 0.271],
  /** Derivado: las puntas, que son el rasgo de la silueta junto con las solapas. */
  pelo_luz: [0.42, 0.37, 0.39],
  /** medido #e2a380. Piel calida. */
  piel: [0.886, 0.639, 0.502],
  /** medido #c08b68. La piel en sombra, en el cuello y bajo el menton. */
  piel_sombra: [0.753, 0.533, 0.424],
  /** medido #83794b. Mochila verde oliva. */
  mochila: [0.514, 0.475, 0.294],
  /** medido #635d3e. Las correas de la mochila. */
  correa: [0.388, 0.365, 0.243],
  /** medido #4d403a. Cinturon de cuero marron. */
  cinturon: [0.302, 0.251, 0.227],
  /** medido #594d35. Las cartucheras del cinto. */
  cartuchera: [0.349, 0.302, 0.208],
  /** medido #3c393b. Guantes oscuros sin dedos. */
  guante: [0.235, 0.224, 0.231],
  /** medido #544a46. Zapatillas de lona con puntera de cuero. */
  calzado: [0.329, 0.29, 0.275],
  /** medido #b6bab4. La suela, que es lo unico claro de los pies. */
  suela: [0.714, 0.729, 0.706],
  /** medido #484447. El reloj de la muñeca derecha. */
  reloj: [0.282, 0.267, 0.278]
};

/* =========================================================================
   ARMAS Y OBJETOS
   ========================================================================= */

export const OBJETO = {
  /*
   * Los colores del botiquin, su cruz y la caja de municion se fueron en la
   * Fase 16, con los objetos. Eran los tres mas saturados del juego, por
   * una regla que ya no aplica: eran lo unico que el jugador NECESITABA
   * encontrar. Si la curacion vuelve como carta (D-32), vuelven con ella.
   */
  /** medido #ad7d3a. Vaina de laton. */
  laton: [0.678, 0.49, 0.227],
  /** medido #7e3f25. Culote del cartucho. */
  cartucho: [0.494, 0.247, 0.145],
  /** medido #cec5ba. Venda. */
  venda: [0.808, 0.773, 0.729],
  /** medido #8a93a9. Acero de la hoja. */
  acero: [0.541, 0.576, 0.663],
  /** medido #363942. Metal negro de empuñaduras y cañones. */
  metal: [0.212, 0.224, 0.259],
  /** medido #654635. Madera de culata y mango. */
  madera: [0.396, 0.275, 0.208]
};

/* =========================================================================
   HERRAMIENTAS DE MEDICION
   ========================================================================= */

/** Luminancia percibida, 0 a 1. Es con lo que se decide si algo se lee. */
export function luminancia([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Cuanto se separan dos colores en luminancia. */
export function separacion(a, b) {
  return Math.abs(luminancia(a) - luminancia(b));
}

/**
 * Dos superficies que se tocan nunca pueden estar mas cerca que esto.
 *
 * Se mantiene el numero de la guia vieja porque no era el problema: estaba
 * bien pensado y hay pruebas que lo usan. Lo que estaba mal eran los colores.
 */
export const SEPARACION_MINIMA = 0.06;

/** Saturacion, 0 a 1. Sirve para que el decorado no le gane a lo importante. */
export function saturacion([r, g, b]) {
  const M = Math.max(r, g, b);
  return M === 0 ? 0 : (M - Math.min(r, g, b)) / M;
}

/**
 * Tope de saturacion del decorado, y piso de lo que es informacion.
 *
 * El botiquin esta en 0.71 y es lo mas saturado que hay. Nada del decorado
 * puede acercarsele: si una persiana compite con el unico objeto que el
 * jugador necesita encontrar, el jugador no lo encuentra.
 */
export const SATURACION_DECORADO_MAX = 0.7;
export const SATURACION_INFO_MIN = 0.78;

/**
 * Cuanto color tiene, mas alla de si es claro u oscuro.
 *
 * Hace falta porque la luminancia sola miente con los acentos: el botiquin
 * rojo esta casi a la misma luminancia que el asfalto y sin embargo salta a
 * la vista, porque el asfalto no tiene color y el botiquin si.
 */
export function cromaticidad(c) {
  return saturacion(c) * Math.max(...c);
}

/**
 * Si un objeto se despega del piso sobre el que esta.
 *
 * Vale por luminancia o por color. No alcanza para los objetos recogibles:
 * esos ademas llevan un acento emisivo, que se decide en 12R.14. Lo que esta
 * prueba garantiza es que la PALETA no los vuelva invisibles.
 */
export function destaca(objeto, piso) {
  return separacion(objeto, piso) >= SEPARACION_MINIMA ||
    Math.abs(cromaticidad(objeto) - cromaticidad(piso)) >= 0.2;
}

/** Mezcla dos colores. Para rampas y para variar sin inventar tonos nuevos. */
export function mezclar(a, b, k) {
  return a.map((v, i) => v + (b[i] - v) * k);
}

/**
 * Varia un color sin salirse de su familia.
 *
 * Es lo que evita que veinte fachadas del mismo crema se vean copiadas y
 * pegadas, sin tener que inventar veinte colores a mano.
 *
 * @param {number[]} base
 * @param {number} k de -1 a 1: negativo oscurece, positivo aclara
 */
export function variar(base, k) {
  return base.map((v) => Math.max(0, Math.min(1, v * (1 + k * 0.28))));
}
