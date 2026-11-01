import { VERDE, CALLE } from '../paleta.js';

/**
 * ===========================================================================
 * ARBOLES — plátanos de vereda
 * ===========================================================================
 * Fase 12R, tarea 12R.6. Reemplaza a `arbol()` de `src/world/props.js`.
 *
 * ---------------------------------------------------------------------------
 * EL CRITERIO DE ACEPTACION ES TEXTUAL
 * ---------------------------------------------------------------------------
 * El prompt maestro lo dice con todas las letras: *"los árboles no son esferas
 * verdes idénticas sobre cilindros"*. El viejo era exactamente eso: un
 * cilindro y tres esferas, iguales en todos lados salvo por el tamaño.
 *
 * Lo que lo arregla no es poner más esferas, son cuatro cosas:
 *
 *  1. **El tronco se abre.** Un plátano no es un palo: sube un tramo y se
 *     parte en dos o tres ramas gruesas que salen en abanico. Ese contorno
 *     es el que se reconoce desde arriba cuando la copa está rala.
 *  2. **La copa es irregular.** Cinco volúmenes de tamaños distintos,
 *     desplazados y achatados cada uno a su manera, en los tres verdes
 *     medidos de la referencia. Nunca centrados.
 *  3. **Ninguno es igual a otro.** Altura, giro, inclinación y mezcla de
 *     verdes salen del generador, así que dos árboles pegados no se leen
 *     como el mismo copiado.
 *  4. **La corteza es clara.** El plátano porteño la tiene manchada y clara,
 *     no marrón oscuro. Además así se separa de la hoja en sombra, que era
 *     el otro problema: el árbol viejo se leía como una sola mancha.
 */

export const ACABADO = {
  corteza: { gloss: 0.08, metalness: 0 },
  hoja: { gloss: 0.04, metalness: 0 },
  tierra: { gloss: 0.03, metalness: 0 }
};

export const MEDIDAS = {
  /** Lado del cantero cuadrado sin baldosa. */
  cantero: 1.5,
  /** Alto del tronco antes de abrirse en ramas. */
  fusteMin: 2.0,
  fusteMax: 2.8,
  /** Radio de la copa entera. */
  copaMin: 1.6,
  copaMax: 2.3
};

/**
 * Arma un arbol.
 *
 * @param {object} a el `Armador` de props: `a.add(tipo, pos, esc, color, opt)`
 *   con `pos[1]` = base de la pieza, no su centro
 * @param {object} rng
 */
export function construir(a, rng, { sinCantero = false } = {}) {
  const fuste = rng.range(MEDIDAS.fusteMin, MEDIDAS.fusteMax);
  const radio = rng.range(MEDIDAS.copaMin, MEDIDAS.copaMax);
  const grosor = rng.range(0.3, 0.42);
  const giro = rng.range(0, 360);

  if (!sinCantero) cantero(a);

  // El fuste, apenas inclinado: un arbol de vereda nunca esta a plomo.
  const inclina = rng.range(-3, 3);
  a.add('cylinder', [0, 0, 0], [grosor, fuste, grosor], VERDE.tronco, {
    acabado: ACABADO.corteza,
    rot: [inclina, giro, inclina * 0.6],
    sombra: true
  });

  /*
   * Las ramas: dos o tres, en abanico. Son cilindros inclinados que salen de
   * la punta del fuste. Es la pieza que mas cambia la silueta y la que el
   * arbol viejo no tenia.
   */
  const ramas = rng.int(2, 3);
  for (let i = 0; i < ramas; i++) {
    const dir = giro + (360 / ramas) * i + rng.range(-25, 25);
    const rad = (dir * Math.PI) / 180;
    const largo = rng.range(0.9, 1.5);
    const tumbado = rng.range(26, 42);
    const d = Math.sin((tumbado * Math.PI) / 180) * largo * 0.5;
    a.add(
      'cylinder',
      [Math.cos(rad) * d, fuste - 0.15, Math.sin(rad) * d],
      [grosor * 0.62, largo, grosor * 0.62],
      VERDE.tronco,
      {
        acabado: ACABADO.corteza,
        rot: [Math.sin(rad) * tumbado, 0, -Math.cos(rad) * tumbado],
        sombra: true
      }
    );
  }

  copa(a, rng, { fuste, radio, giro });
}

/** El cantero: el cuadrado de tierra sin baldosa, con su cordon. */
export function cantero(a) {
  const l = MEDIDAS.cantero;
  a.add('box', [0, 0.01, 0], [l, 0.06, l], VERDE.oscuro, {
    acabado: ACABADO.tierra,
    sombra: false
  });
  const b = l / 2 + 0.05;
  for (const [dx, dz, w, d] of [
    [0, b, l + 0.1, 0.14],
    [0, -b, l + 0.1, 0.14],
    [b, 0, 0.14, l + 0.1],
    [-b, 0, 0.14, l + 0.1]
  ]) {
    a.add('box', [dx, 0.02, dz], [w, 0.14, d], CALLE.hormigon, {
      acabado: ACABADO.tierra,
      sombra: false
    });
  }
}

/**
 * La copa: cinco volumenes irregulares.
 *
 * Ninguno esta centrado y ninguno comparte tamaño con otro. El de abajo es el
 * mas grande y el mas oscuro, porque es el que queda a la sombra de los de
 * arriba: eso solo ya da volumen sin costar una luz.
 */
function copa(a, rng, { fuste, radio, giro }) {
  const base = fuste + radio * 0.35;
  /*
   * El verde claro NO va arriba, y es contraintuitivo. La camara mira desde
   * arriba, asi que el lobulo superior es casi todo lo que se ve: ponerle el
   * verde mas claro pinta el arbol entero de un verde acido que no existe en
   * la calle y que ademas le gana en atencion a los objetos de mision. Va en
   * un lobulo lateral, donde se lee como un reflejo del sol y no como el
   * color del arbol.
   */
  const verdes = [VERDE.oscuro, VERDE.claro, VERDE.oscuro, VERDE.medio, VERDE.medio];

  const lobulos = [
    { k: 1.0, alto: 0.62, dist: 0.0, dir: 0, sube: -0.25 },
    { k: 0.78, alto: 0.74, dist: 0.5, dir: 20, sube: 0.18 },
    { k: 0.72, alto: 0.7, dist: 0.52, dir: 150, sube: 0.05 },
    { k: 0.66, alto: 0.78, dist: 0.48, dir: 265, sube: 0.3 },
    { k: 0.54, alto: 0.82, dist: 0.3, dir: 60, sube: 0.52 }
  ];

  lobulos.forEach((l, i) => {
    const r = radio * l.k * rng.range(0.88, 1.12);
    const rad = ((giro + l.dir + rng.range(-18, 18)) * Math.PI) / 180;
    const d = radio * l.dist;
    a.add(
      'sphere',
      [
        Math.cos(rad) * d,
        base + radio * l.sube - r * l.alto,
        Math.sin(rad) * d
      ],
      [r * 2, r * 2 * l.alto, r * 2 * rng.range(0.9, 1.1)],
      verdes[i],
      { acabado: ACABADO.hoja, sombra: i < 3 }
    );
  });
}
