/**
 * ===========================================================================
 * GUIA DE ESTILO — FASE 12.A
 * ===========================================================================
 * Las reglas del arte del juego, escritas como código y no como un PDF que
 * nadie vuelve a abrir. Lo que está acá se puede **verificar**: hay pruebas
 * que fallan si la paleta deja de cumplir sus propias reglas.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO SON 8 A 12 COLORES
 * ---------------------------------------------------------------------------
 * La tarea 12.1 pedía "paleta cerrada: 8 a 12 colores para todo el juego".
 * La intención es coherencia, y eso sí se cumple. Pero 8 a 12 colores
 * *planos* rompen la regla que hace legible a este juego: **dos superficies
 * que se tocan nunca comparten valor**. El asfalto, la vereda y el cordón
 * se tocan entre sí y los tres tienen que separarse solos.
 *
 * La solución es la misma de cualquier guía de estilo seria: **8 a 12
 * FAMILIAS**, cada una con una rampa de claros y oscuros derivados del
 * mismo tono. Todos los grises de la calle son la misma familia; lo que
 * cambia es cuánta luz reflejan. Así hay coherencia de verdad —nada se
 * elige a ojo— y legibilidad al mismo tiempo.
 *
 * Una rampa derivada tiene además una ventaja práctica: si mañana se
 * decide que la calle tira más a marrón, se cambia **un** valor y toda la
 * calle lo acompaña, sin que aparezcan dos grises que no combinan.
 */

/**
 * Las familias. Esto SÍ es la paleta cerrada.
 *
 * Cada una es un tono base en RGB lineal. Todo color del juego tiene que
 * poder explicarse como una familia más un paso de rampa, salvo los
 * acentos, que son la excepción deliberada.
 */
export const FAMILIAS = {
  /** Asfalto, cordón, vereda, hormigón. El fondo de todo. */
  calle: [0.5, 0.49, 0.47],
  /** Revoques y fachadas: el ocre porteño. */
  revoque: [0.76, 0.66, 0.48],
  /** Ladrillo visto de las medianeras. */
  ladrillo: [0.56, 0.4, 0.33],
  /** Persianas, rejas, postes, chapa. */
  metal: [0.34, 0.36, 0.38],
  /** Árboles, canteros, plazas. */
  vegetacion: [0.3, 0.45, 0.24],
  /** Madera: bancos, cajones, puertas viejas. */
  madera: [0.47, 0.35, 0.22],
  /** Piel. */
  piel: [0.72, 0.56, 0.44],
  /** Ropa de Gus: el azul de la campera. */
  heroe: [0.22, 0.3, 0.44],
  /** Ropa de los zombis: el verde enfermo que los separa de Gus. */
  infectado: [0.42, 0.5, 0.3],
  /** Ámbar: todo lo que el jugador tiene que mirar. */
  atencion: [0.95, 0.72, 0.15],
  /** Rojo: daño, peligro, salud. */
  alarma: [0.85, 0.22, 0.18],
  /** Verde: objetivo cumplido, curación. */
  exito: [0.25, 0.75, 0.42]
};

/**
 * La rampa.
 *
 * Son pocos pasos a propósito. Con una rampa continua cualquiera elegiría
 * un valor intermedio y volveríamos a tener cuarenta grises que no se
 * eligieron, pasaron. Con cinco escalones hay que elegir uno.
 *
 * Los números son multiplicadores de luminancia. El salto entre escalones
 * vecinos es de al menos 18 %, que es aproximadamente el mínimo que el ojo
 * separa sin dudar a la distancia de cámara de este juego.
 */
export const RAMPA = {
  sombra: 0.52,
  oscuro: 0.72,
  base: 1.0,
  claro: 1.28,
  brillo: 1.55
};

/** Orden de la rampa, de más oscuro a más claro. */
export const ESCALONES = ['sombra', 'oscuro', 'base', 'claro', 'brillo'];

/**
 * Deriva un color de una familia.
 *
 * @param {string} familia clave de `FAMILIAS`
 * @param {string} [escalon] clave de `RAMPA`
 * @returns {number[]} rgb
 */
export function tono(familia, escalon = 'base') {
  const base = FAMILIAS[familia];
  if (!base) throw new Error(`Familia de color desconocida: ${familia}`);
  const k = RAMPA[escalon];
  if (k === undefined) throw new Error(`Escalon de rampa desconocido: ${escalon}`);
  // Se acota a 1: pasado ese punto el color se "quema" y pierde el tono.
  return base.map((c) => Math.min(1, c * k));
}

/** Luminancia percibida de un color. */
export function luminancia(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Cuánto se separan dos colores por luminancia, de 0 a 1.
 *
 * Es la medida que importa para la legibilidad de este juego: la cámara
 * está a veinte metros, el sol es cenital y casi todo es mate, así que lo
 * que separa dos planos es el VALOR, no el tono. Dos superficies con el
 * mismo valor y distinto color se funden en una sola mancha.
 */
export function separacion(a, b) {
  return Math.abs(luminancia(a) - luminancia(b));
}

/**
 * Separación mínima entre dos superficies que se tocan.
 *
 * Salió de mirar la calle en el teléfono: por debajo de esto, el cordón
 * deja de leerse contra la vereda y la calle se ve como una alfombra
 * plana.
 */
export const SEPARACION_MINIMA = 0.06;

/**
 * Saturación de un color, de 0 a 1.
 *
 * Hace falta para poder verificar la regla de los acentos: el juego es
 * mayormente apagado, y los colores saturados se reservan para lo que el
 * jugador tiene que mirar. Si todo tiene color, nada resalta.
 */
export function saturacion(rgb) {
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  return max === 0 ? 0 : (max - min) / max;
}

/** Por encima de esto, un color cuenta como acento y hay que justificarlo. */
export const SATURACION_ACENTO = 0.55;

/**
 * Las familias que pueden pasar el umbral de acento.
 *
 * Todo lo demás del juego vive por debajo. Un toldo rojo de comercio es
 * decorado y tiene que quedar por debajo de un botiquín, o el jugador
 * aprende a mirar el lugar equivocado.
 */
export const FAMILIAS_ACENTO = ['atencion', 'alarma', 'exito'];

/**
 * ===========================================================================
 * PRESUPUESTO DE DETALLE — TAREAS 12.3 Y 12.4
 * ===========================================================================
 */

/**
 * Resolución de texturas: NINGUNA.
 *
 * El juego no usa una sola textura, y es una decisión, no una pendiente.
 *
 * - Una textura obliga a descargarla. Este juego se abre desde un enlace en
 *   el teléfono, muchas veces con datos móviles: cada kilobyte es tiempo
 *   antes de poder jugar, y lo que hoy carga en un segundo pasaría a
 *   depender de la señal.
 * - Las texturas rompen el agrupado de mallas igual que los materiales.
 *   Doscientos props con textura son doscientas llamadas de dibujo.
 * - A veinte metros de cámara y 57 grados, el detalle de textura no se ve.
 *   Lo que se ve es la SILUETA y el VALOR.
 *
 * Lo que reemplaza a la textura es geometría: un balcón de verdad en vez de
 * un balcón pintado. Cuesta polígonos, que en un teléfono sobran mucho
 * antes que las llamadas de dibujo.
 *
 * Si alguna vez hace falta —una cartelería legible, por ejemplo— la salida
 * es un atlas único compartido por todo el juego, nunca una textura por
 * objeto.
 */
export const TEXTURAS = {
  usar: false,
  motivo: 'geometria en vez de textura; ver el comentario de arriba',
  /** Si alguna vez se usan: un solo atlas para todo, de este tamaño. */
  atlasMaximo: 1024
};

/**
 * Cuántos triángulos puede gastar cada tipo de cosa.
 *
 * No son límites de capricho: salen de cuántos de cada uno hay en pantalla
 * a la vez. Un edificio aparece veinte veces y puede gastar; un zombi
 * aparece doce veces y gasta menos; un casquillo aparece cien veces y no
 * puede gastar nada.
 *
 * El número que de verdad limita en un teléfono NO es el de triángulos,
 * sino el de llamadas de dibujo (ver PERF y el agrupado de mallas). Estos
 * topes están para que nadie meta un modelo de cien mil triángulos
 * "porque total los triángulos son gratis": gratis no son, y además un
 * modelo denso delata el estilo low-poly del resto.
 */
export const PRESUPUESTO = {
  /** Gus. Es el único que se ve de cerca y el que más se mira. */
  protagonista: 1400,
  /** Un zombi. Hay hasta doce a la vez. */
  enemigo: 700,
  /** Un arma en la mano. */
  arma: 250,
  /** Un objeto del piso. Tiene que leerse por silueta, no por detalle. */
  objeto: 160,
  /** Un prop de la calle: banco, poste, contenedor. */
  prop: 300,
  /** Un vehículo. */
  vehiculo: 600,
  /** Un edificio entero, con fachada. */
  edificio: 900
};

/**
 * ===========================================================================
 * ESCALA — LA REGLA QUE MAS SE ROMPE
 * ===========================================================================
 * Todo se mide contra la altura de una puerta (2,1 m). Es la referencia que
 * usa cualquiera para leer el tamaño de una escena sin darse cuenta.
 *
 * Estas medidas no son decorativas: son las que hacen que Gus al lado de
 * una puerta se vea creíble, que es el punto 1 de la prueba de la fase.
 */
export const ESCALA = {
  puerta: 2.1,
  gus: 1.8,
  /** Un poco más bajo que Gus: encorvado. */
  zombi: 1.72,
  /** Alto del asiento de un banco. */
  banco: 0.45,
  /** Techo de un auto. */
  auto: 1.45,
  /** Techo de un colectivo. */
  colectivo: 3.1,
  /** Alto de un poste de luz. */
  poste: 7.5,
  /** Alto de un piso de edificio. */
  piso: 3.0
};

/**
 * Comprueba que un modelo respete la escala declarada.
 *
 * @param {number} alturaReal
 * @param {number} alturaEsperada
 * @param {number} [tolerancia] fracción
 */
export function escalaCorrecta(alturaReal, alturaEsperada, tolerancia = 0.08) {
  return Math.abs(alturaReal - alturaEsperada) / alturaEsperada <= tolerancia;
}
