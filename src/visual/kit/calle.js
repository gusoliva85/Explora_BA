import { CALLE } from '../paleta.js';
import { UNITS } from '../../config/balance.js';
import { createRng } from '../../core/rng.js';

/**
 * ===========================================================================
 * EL SUELO — calzada, cordon y vereda
 * ===========================================================================
 * Fase 12R, tarea 12R.3. Primer pedazo del mundo que se reemplaza.
 *
 * ---------------------------------------------------------------------------
 * POR QUE PARECIA UNA AVENIDA, Y NO ERA POR EL ANCHO
 * ---------------------------------------------------------------------------
 * El plan decia "angostar la calzada, que hoy parece una avenida". Se midio
 * antes de tocar: la calzada tiene **10 m entre cordones**, y eso es
 * exactamente lo que mide una calle de barrio porteña —un carril y
 * estacionamiento de los dos lados—. El ancho estaba bien.
 *
 * Lo que la hacia parecer avenida era la **pintura**: linea de eje
 * discontinua y dos lineas de borde. Una calle de Boedo no tiene nada de eso.
 * Tiene asfalto pelado, la senda peatonal en las esquinas y el cordon
 * pintado. Sacando las tres lineas, la misma calzada pasa a leerse como
 * barrio.
 *
 * Y es una suerte, porque angostarla habria corrido las fachadas, y con las
 * fachadas se mueven todas sus cajas de colision.
 *
 * ---------------------------------------------------------------------------
 * EL CORDON ERA UNA FRANJA PINTADA
 * ---------------------------------------------------------------------------
 * Estaba a la misma altura que la vereda, asi que desde la camara se leia
 * como una raya de color en el piso. Ahora es un volumen: sobresale dos
 * centimetros de la vereda y tiene **la cara vertical a la vista** contra la
 * calzada. Con la camara nueva (48 grados, D-23) esa cara se ve, y es lo que
 * hace que la vereda este arriba y la calle abajo.
 */

/** Acabados del suelo. Todo mate: el asfalto brillante se lee como mojado. */
export const ACABADO = {
  asfalto: { gloss: 0.1, metalness: 0 },
  baldosa: { gloss: 0.06, metalness: 0 },
  hormigon: { gloss: 0.05, metalness: 0 }
};

export const MEDIDAS = {
  /** Lo que sobresale el cordon por encima de la vereda. */
  resalte: 0.02,
  /** Ancho del cordon visto desde arriba. */
  anchoCordon: 0.32,
  /** Cada cuanto se corta la vereda con una junta. */
  juntaCada: 2.4,
  /** Ancho de la junta. Fina: es una sombra, no una zanja. */
  juntaAncho: 0.06,
  /** Cada cuantos metros va una rejilla de desague contra el cordon. */
  rejillaCada: 34
};

/**
 * Ayuda para orientar una medida segun si la cuadra corre en X o en Z.
 * @param {boolean} alongX
 */
const eje_ = (alongX) => (largo, ancho) =>
  (alongX ? { x: largo, z: ancho } : { x: ancho, z: largo });

/**
 * La calzada: la plancha de asfalto y sus remiendos.
 *
 * Los remiendos van casi del mismo tono que el asfalto. Con mas contraste se
 * leen como manchas pegadas encima en vez de como un parche de reparacion:
 * la variacion tiene que insinuarse, no anunciarse.
 */
/**
 * @param {number} semilla **propia de la calzada, y tiene que serlo.**
 *
 * El primer intento usaba el generador compartido del mundo. Al cambiar
 * cuantos remiendos se dibujan cambio cuantos numeros al azar consume la
 * calzada, y eso corrio la secuencia entera: se movieron props, vehiculos
 * y **siete cajas de colision**, por un retoque de pintura.
 *
 * Con un generador propio, lo visual no puede volver a mover el juego.
 */
export function calzada(ctx, { cx, cz, alongX, length, index, semilla = 0 }) {
  const road = UNITS.streetWidth;
  const size = eje_(alongX);
  const rng = createRng(90001 + semilla + index * 7919);

  const s = size(length, road);
  ctx.addBox(
    `Calzada_${index}`,
    { x: cx, y: -0.06, z: cz },
    { x: s.x, y: 0.12, z: s.z },
    CALLE.asfalto,
    { acabado: ACABADO.asfalto }
  );

  /*
   * Los remiendos son tiras largas y angostas, no rectangulos anchos: una
   * reparacion de calle sigue la zanja que abrieron, y eso es lo que hace
   * que se lean como remiendo y no como una mancha pegada encima. La
   * primera version eran rectangulos de 3 x 6 m y Gus los vio desde el
   * celular como manchas raras.
   */
  for (let i = 0; i < Math.floor(length / 26); i++) {
    const largo = rng.range(4, 9);
    const ancho = rng.range(0.7, 1.4);
    const along = rng.range(-length / 2 + 4, length / 2 - 4);
    const cross = rng.range(-road / 2 + 1, road / 2 - 1);
    const p = size(largo, ancho);
    ctx.addBox(
      `Parche_${index}_${i}`,
      {
        x: cx + (alongX ? along : cross),
        y: -0.005,
        z: cz + (alongX ? cross : along)
      },
      { x: p.x, y: 0.02, z: p.z },
      CALLE.asfalto_remiendo,
      { acabado: ACABADO.asfalto }
    );
  }
}

/**
 * Linea de eje discontinua, para las calles de DOBLE MANO.
 *
 * La primera version de 12R.3 saco toda la pintura de la calzada para que
 * dejara de parecer una avenida, y se llevo puesta esta, que si corresponde:
 * una calle de doble mano tiene su eje pintado. Lo que sobraba eran las dos
 * lineas de BORDE, que son de avenida.
 *
 * Va con material plano, sin iluminar: la pintura de una calle no cambia de
 * color al entrar en sombra, y asi sigue marcando el carril en la mitad
 * sombreada de la calzada, que es donde mas falta hace.
 */
export function eje(ctx, { cx, cz, alongX, length, index }) {
  const size = eje_(alongX);
  const paso = 4.5;
  for (let d = -length / 2 + paso; d < length / 2 - paso; d += paso) {
    const s = size(2.4, 0.14);
    ctx.addBox(
      `Eje_${index}_${d.toFixed(0)}`,
      { x: cx + (alongX ? d : 0), y: 0.012, z: cz + (alongX ? 0 : d) },
      { x: s.x, y: 0.02, z: s.z },
      CALLE.raya,
      { plano: true }
    );
  }
}

/**
 * El cordon: hormigon con la cara vertical a la vista y el amarillo arriba.
 *
 * El amarillo va solo en la cara de arriba, no en todo el bloque. En la calle
 * de verdad lo que se pinta es el canto, y pintar el volumen entero lo
 * convierte en una barra de color que compite con los objetos de mision.
 */
export function cordon(ctx, { cx, cz, alongX, length, side, index }) {
  const road = UNITS.streetWidth;
  const size = eje_(alongX);
  const alto = UNITS.curbHeight + MEDIDAS.resalte;
  /*
   * El cordon va CENTRADO en el borde de la calzada, igual que el viejo.
   * Correrlo hacia afuera parecia mas prolijo y movia la vereda con el,
   * metiendola 32 cm adentro de las fachadas.
   */
  const offset = (road / 2) * side;
  const pos = (o) => ({
    x: cx + (alongX ? 0 : o),
    y: 0,
    z: cz + (alongX ? o : 0)
  });

  const cuerpo = size(length, MEDIDAS.anchoCordon);
  const p = pos(offset);
  ctx.addBox(
    `Cordon_${index}_${side}`,
    { x: p.x, y: alto / 2, z: p.z },
    { x: cuerpo.x, y: alto, z: cuerpo.z },
    CALLE.hormigon,
    { acabado: ACABADO.hormigon }
  );

  // La pintura amarilla, gastada, apoyada sobre el canto.
  const pintura = size(length, MEDIDAS.anchoCordon * 0.82);
  ctx.addBox(
    `CordonPintura_${index}_${side}`,
    { x: p.x, y: alto + 0.004, z: p.z },
    { x: pintura.x, y: 0.01, z: pintura.z },
    CALLE.cordon,
    { acabado: ACABADO.hormigon }
  );
}

/**
 * La vereda: la plancha de baldosa y sus juntas.
 *
 * Las juntas son geometria y no textura. Son lo unico que convierte un plano
 * gris de tres metros de ancho en una vereda: sin ellas no hay escala, y sin
 * escala la calle no dice de que tamaño es nada.
 */
export function vereda(ctx, { cx, cz, alongX, length, side, index }) {
  const road = UNITS.streetWidth;
  const walk = UNITS.sidewalkWidth;
  const size = eje_(alongX);
  const offset = ((road + walk) / 2) * side;
  const centro = (o) => ({
    x: cx + (alongX ? 0 : o),
    y: 0,
    z: cz + (alongX ? o : 0)
  });

  const p = centro(offset);
  const plancha = size(length, walk);
  ctx.addBox(
    `Vereda_${index}_${side}`,
    { x: p.x, y: UNITS.curbHeight / 2, z: p.z },
    { x: plancha.x, y: UNITS.curbHeight, z: plancha.z },
    CALLE.vereda,
    { acabado: ACABADO.baldosa }
  );

  const yJunta = UNITS.curbHeight + 0.003;

  // Juntas a lo largo: dos, que es lo que parte la vereda en tres hiladas.
  for (const k of [-1, 1]) {
    const o = offset + ((walk / 3) * k) / 1;
    const q = centro(o);
    const j = size(length, MEDIDAS.juntaAncho);
    ctx.addBox(
      `VeredaJuntaLarga_${index}_${side}_${k}`,
      { x: q.x, y: yJunta, z: q.z },
      { x: j.x, y: 0.006, z: j.z },
      CALLE.vereda_junta,
      { acabado: ACABADO.baldosa }
    );
  }

  // Y las juntas cruzadas, que son las que dan la escala al caminar.
  const n = Math.floor(length / MEDIDAS.juntaCada);
  for (let i = 1; i < n; i++) {
    const along = -length / 2 + i * MEDIDAS.juntaCada;
    const j = size(MEDIDAS.juntaAncho, walk);
    ctx.addBox(
      `VeredaJunta_${index}_${side}_${i}`,
      {
        x: p.x + (alongX ? along : 0),
        y: yJunta,
        z: p.z + (alongX ? 0 : along)
      },
      { x: j.x, y: 0.006, z: j.z },
      CALLE.vereda_junta,
      { acabado: ACABADO.baldosa }
    );
  }
}

/**
 * Rejillas de desague contra el cordon.
 *
 * Cuestan dos cajas y son de esas cosas que nadie mira pero que, si no
 * estan, hacen que la calle se vea dibujada en vez de construida.
 */
export function rejillas(ctx, { cx, cz, alongX, length, side, index }) {
  const road = UNITS.streetWidth;
  const size = eje_(alongX);
  const offset = (road / 2 - 0.45) * side;
  const n = Math.floor(length / MEDIDAS.rejillaCada);

  for (let i = 0; i < n; i++) {
    const along = -length / 2 + MEDIDAS.rejillaCada * (i + 0.5);
    const s = size(0.8, 0.5);
    ctx.addBox(
      `Rejilla_${index}_${side}_${i}`,
      {
        x: cx + (alongX ? along : offset),
        y: 0.005,
        z: cz + (alongX ? offset : along)
      },
      { x: s.x, y: 0.03, z: s.z },
      CALLE.asfalto_remiendo,
      { acabado: ACABADO.hormigon }
    );
    ctx.addBox(
      `RejillaHueco_${index}_${side}_${i}`,
      {
        x: cx + (alongX ? along : offset),
        y: 0.012,
        z: cz + (alongX ? offset : along)
      },
      { x: s.x * 0.74, y: 0.03, z: s.z * 0.6 },
      [0.08, 0.08, 0.09],
      { acabado: ACABADO.hormigon }
    );
  }
}

/**
 * Senda peatonal: las cebras de la esquina.
 *
 * Es la unica pintura que queda en la calzada, y es la que de verdad existe
 * en un barrio. Va con material plano, sin iluminar: la pintura de una calle
 * no cambia de color al entrar en sombra, y asi sigue marcando el cruce en la
 * mitad sombreada, que es donde mas falta hace.
 */
export function senda(ctx, { punto, alongX, nombre }) {
  const road = UNITS.streetWidth;
  const size = eje_(alongX);
  for (let i = 0; i < 7; i++) {
    const off = -2.4 + i * 0.8;
    const s = size(0.45, road);
    ctx.addBox(
      `Senda_${nombre}_${i}`,
      {
        x: punto.x + (alongX ? off : 0),
        y: 0.014,
        z: punto.z + (alongX ? 0 : off)
      },
      { x: s.x, y: 0.02, z: s.z },
      CALLE.raya,
      { plano: true }
    );
  }
}

/**
 * La esquina: CUATRO ochavas, no una plancha.
 *
 * ---------------------------------------------------------------------------
 * EL BUG QUE ESTO ARREGLA
 * ---------------------------------------------------------------------------
 * Antes la esquina era una sola plancha de vereda de 16 x 16 m centrada en el
 * cruce. O sea que **la bocacalle entera era vereda**: el asfalto desaparecia
 * y los cordones de las dos calles cruzaban por encima, uno sobre otro. Con
 * el cordon viejo, chato y del mismo gris, no se notaba; con el cordon nuevo,
 * amarillo y con volumen, el cruce se volvio un dibujo sin sentido.
 *
 * Una bocacalle de verdad es al reves: el centro es **calzada**, y la vereda
 * aparece solo en las cuatro esquinas. Eso es lo que se arma acá: cuatro
 * planchas de 3 x 3 en las diagonales, cada una con sus dos cordones en L
 * mirando a la calle.
 *
 * Y las veredas de las dos calles que llegan tienen que CORTARSE antes del
 * cruce, o vuelven a pasarle por encima. Eso lo hace `recorte`, mas abajo.
 */
export function esquina(ctx, { punto, nombre }) {
  const road = UNITS.streetWidth;
  const walk = UNITS.sidewalkWidth;
  const alto = UNITS.curbHeight;
  const d = road / 2 + walk / 2;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = punto.x + d * sx;
      const pz = punto.z + d * sz;
      ctx.addBox(
        `Ochava_${nombre}_${sx}_${sz}`,
        { x: px, y: alto / 2, z: pz },
        { x: walk, y: alto, z: walk },
        CALLE.vereda,
        { acabado: ACABADO.baldosa }
      );

      // Los dos cordones en L, sobre los lados que miran a la calzada.
      const altoCordon = alto + MEDIDAS.resalte;
      const borde = [
        { x: punto.x + (road / 2) * sx, z: pz, w: MEDIDAS.anchoCordon, d: walk },
        { x: px, z: punto.z + (road / 2) * sz, w: walk, d: MEDIDAS.anchoCordon }
      ];
      borde.forEach((b, i) => {
        ctx.addBox(
          `OchavaCordon_${nombre}_${sx}_${sz}_${i}`,
          { x: b.x, y: altoCordon / 2, z: b.z },
          { x: b.w, y: altoCordon, z: b.d },
          CALLE.hormigon,
          { acabado: ACABADO.hormigon }
        );
        ctx.addBox(
          `OchavaPintura_${nombre}_${sx}_${sz}_${i}`,
          { x: b.x, y: altoCordon + 0.004, z: b.z },
          { x: b.w * (b.w > b.d ? 1 : 0.82), y: 0.01, z: b.d * (b.d > b.w ? 1 : 0.82) },
          CALLE.cordon,
          { acabado: ACABADO.hormigon }
        );
      });
    }
  }
}

/**
 * Cuanto hay que recortarle a la vereda y al cordon en cada punta.
 *
 * Media calzada: es lo que ocupa la bocacalle. Si no se recorta, la vereda de
 * una calle le pasa por encima a la de la otra en el cruce.
 */
export const RECORTE_EN_ESQUINA = UNITS.streetWidth / 2;
