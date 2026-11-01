/**
 * ===========================================================================
 * ANGULOS DE LUZ
 * ===========================================================================
 * Una sola cuenta, en un archivo propio, por un motivo: estuvo mal durante
 * meses y nadie lo vio, porque estaba enterrada en el medio del armado de la
 * escena y no habia forma de probarla.
 */

/**
 * Pasa una elevacion sobre el horizonte al angulo que hay que darle a la
 * entidad de una luz direccional.
 *
 * ⚠️ **ESTO ESTUVO MAL DESDE LA FASE 2B.** El codigo viejo hacia
 * `setEulerAngles(73, …)` creyendo que ponia el sol a 73 grados sobre el
 * horizonte. **Lo ponia a 17**, casi un atardecer, y por eso la calle estaba
 * siempre en sombra: un edificio de 18 m tiraba casi sesenta metros de sombra
 * y tapaba la cuadra entera.
 *
 * Peor todavia: D-16 "arreglo" ese problema subiendo el numero de 58 a 73,
 * que en realidad **bajo** el sol de 32 a 17 grados y lo empeoro. La medicion
 * que justificaba el cambio era sobre un numero que no existia.
 *
 * Comprobado mirando, con el sol puesto en cuatro angulos distintos:
 *
 * | `eulerX` | Lo que se ve | Elevacion real |
 * |---|---|---|
 * | 89 | la cuadra entera en sombra | ~1° |
 * | 73 | una banda de sombra cruzando la calzada | ~17° |
 * | 40 | casi despejado | ~50° |
 * | 17 | despejado, sombras cortas bajo los arboles | ~73° |
 *
 * @param {number} grados elevacion sobre el horizonte: 90 es cenital
 * @returns {number} el angulo X para `setEulerAngles`
 */
export function anguloDeElevacion(grados) {
  return 90 - grados;
}

/**
 * Cuanta sombra tira algo de un metro de alto, con el sol a esta elevacion.
 *
 * Es la cuenta con la que se decide la elevacion: la calzada mide 10 m y una
 * fachada mide hasta 18, asi que por debajo de unos 60 grados la sombra cruza
 * la calle entera.
 */
export function sombraPorMetro(elevacionGrados) {
  const rad = (elevacionGrados * Math.PI) / 180;
  const t = Math.tan(rad);
  return t <= 0 ? Infinity : 1 / t;
}
