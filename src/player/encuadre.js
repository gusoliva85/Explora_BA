/**
 * ===========================================================================
 * ENCUADRE — cuanto se ve y de que tamaño
 * ===========================================================================
 * Fase 12R, tarea 12R.1.
 *
 * Dos numeros deciden si una camara sirve en este juego, y los dos tiran para
 * lados opuestos:
 *
 *   1. **De que tamaño se ve Gus.** Si mide cuarenta pixeles no es un
 *      personaje, es un icono, y todo el trabajo de modelarlo se tira.
 *   2. **Cuanta calle se ve por delante.** Es el tiempo que tenes para
 *      reaccionar cuando aparece un zombi. Si baja, la dificultad cambio sin
 *      que nadie lo haya decidido.
 *
 * Esto esta en un archivo aparte, sin motor y sin estado, por un motivo: una
 * camara se discute a ojo para siempre. Con las cuentas acá hay pruebas que
 * fallan si alguien mueve un angulo y rompe el encuadre, y el diagnostico del
 * telefono muestra los mismos numeros que verifican las pruebas.
 */

const GRADOS = Math.PI / 180;

/**
 * Pasa el campo de vision horizontal a vertical.
 *
 * Hace falta porque el juego fija el HORIZONTAL (decision D-02: con el
 * telefono en vertical, fijar el vertical deja un horizontal de 27 grados y
 * no entra ni el ancho de la calle). Pero las dos cuentas de abajo necesitan
 * el vertical, que es el que decide cuanto cielo y cuanta calle entran.
 *
 * @param {number} fovGrados el campo configurado
 * @param {boolean} esHorizontal si ese campo es el horizontal
 * @param {number} aspecto ancho / alto de la pantalla
 */
export function fovVertical(fovGrados, esHorizontal, aspecto) {
  if (!esHorizontal) return fovGrados;
  const mitad = Math.atan(Math.tan((fovGrados * GRADOS) / 2) / aspecto);
  return (mitad * 2) / GRADOS;
}

/**
 * Altura de la camara sobre el piso.
 *
 * @param {{alturaFoco:number, pitchGrados:number, distancia:number}} c
 */
export function alturaCamara({ alturaFoco, pitchGrados, distancia }) {
  return alturaFoco + Math.sin(pitchGrados * GRADOS) * distancia;
}

/**
 * Metros de calle visibles por delante del jugador.
 *
 * Se calcula con el rayo que sale por el borde de ARRIBA de la pantalla: el
 * punto donde ese rayo toca el piso es lo mas lejos que se ve. Si el rayo
 * apunta al horizonte o por encima, no toca nunca y se ve "hasta donde tape
 * un edificio", que acá se devuelve como Infinity.
 *
 * Ojo con algo que es contraintuitivo: **bajar el angulo hace ver MAS lejos,
 * no menos.** Al bajarlo, el borde de arriba se acerca al horizonte. Lo que
 * se pierde al bajar no es distancia, es que la calle lejana queda aplastada
 * en pocos pixeles y las fachadas de los costados tapan mas.
 *
 * @param {object} c
 * @param {number} c.alturaFoco altura del punto al que mira la camara
 * @param {number} c.pitchGrados inclinacion, 90 seria cenital
 * @param {number} c.distancia del foco a la camara
 * @param {number} c.fovVerticalGrados
 * @param {number} [c.adelanto] cuanto esta el foco por delante del jugador
 */
export function metrosVisiblesAdelante({
  alturaFoco,
  pitchGrados,
  distancia,
  fovVerticalGrados,
  adelanto = 0
}) {
  const bordeSuperior = pitchGrados - fovVerticalGrados / 2;
  // Medio grado de margen: mas plano que eso, el punto se va a kilometros y
  // el numero deja de querer decir nada.
  if (bordeSuperior <= 0.5) return Infinity;

  const h = alturaCamara({ alturaFoco, pitchGrados, distancia });
  const desdeLaCamara = h / Math.tan(bordeSuperior * GRADOS);
  // La camara esta por detras del foco, y el foco por delante del jugador.
  const retroceso = Math.cos(pitchGrados * GRADOS) * distancia;
  return desdeLaCamara - retroceso + adelanto;
}

/**
 * Distancia de la camara al jugador.
 *
 * No es `distancia`: eso es del foco a la camara. Con el foco corrido hacia
 * adelante, el jugador queda mas cerca.
 */
export function distanciaAlJugador({
  alturaFoco,
  pitchGrados,
  distancia,
  adelanto = 0,
  alturaObjeto = 1.8
}) {
  const horizontal = Math.cos(pitchGrados * GRADOS) * distancia - adelanto;
  const vertical = alturaCamara({ alturaFoco, pitchGrados, distancia }) - alturaObjeto / 2;
  return Math.hypot(horizontal, vertical);
}

/**
 * Alto en pixeles de algo parado en el piso, visto desde esta camara.
 *
 * Lo que llega a la pantalla no es la altura entera: la camara mira desde
 * arriba, asi que de un cuerpo vertical se ve la componente perpendicular a
 * la vista, que es `alto x cos(inclinacion)`. Es la razon de que a 75 grados
 * las figuras se vean achatadas.
 */
export function altoEnPantalla({
  alturaObjeto,
  alturaFoco,
  pitchGrados,
  distancia,
  fovVerticalGrados,
  altoPantalla,
  adelanto = 0
}) {
  const horizontal = Math.cos(pitchGrados * GRADOS) * distancia - adelanto;
  const vertical = alturaCamara({ alturaFoco, pitchGrados, distancia }) - alturaObjeto / 2;
  const d = Math.hypot(horizontal, vertical);

  /*
   * Ojo: el angulo que importa NO es la inclinacion de la camara, es el
   * angulo al que se ve el objeto, que es otro cuando el objeto no esta en
   * el centro del encuadre. Con la mira corrida, Gus queda en la mitad de
   * abajo de la pantalla y se lo mira mas en picada que al centro.
   *
   * Usar la inclinacion de la camara daba 54 px donde el motor mide 43: un
   * 25 % de error, suficiente para elegir mal un angulo.
   */
  const anguloAlObjeto = Math.atan2(vertical, horizontal);
  const aparente = (alturaObjeto * Math.cos(anguloAlObjeto)) / d;
  const porRadian = altoPantalla / (2 * Math.tan((fovVerticalGrados * GRADOS) / 2));
  return aparente * porRadian;
}

/**
 * Donde cae el jugador en la pantalla: 0 es el borde de arriba, 1 el de abajo.
 *
 * Es la tercera restriccion, y la que limita cuanto se puede correr la mira
 * hacia adelante. Corriendola, Gus baja; si baja demasiado queda atras del
 * joystick y del boton de atacar, que es justo donde esta el pulgar.
 */
export function posicionEnPantalla({
  alturaFoco,
  pitchGrados,
  distancia,
  fovVerticalGrados,
  adelanto = 0,
  alturaObjeto = 1.8
}) {
  const horizontal = Math.cos(pitchGrados * GRADOS) * distancia - adelanto;
  const vertical = alturaCamara({ alturaFoco, pitchGrados, distancia }) - alturaObjeto / 2;
  const anguloAlObjeto = Math.atan2(vertical, horizontal) / GRADOS;
  const bajoElEje = (anguloAlObjeto - pitchGrados) * GRADOS;
  return 0.5 + Math.tan(bajoElEje) / (2 * Math.tan((fovVerticalGrados * GRADOS) / 2));
}

/**
 * Las medidas juntas, que es como hay que mirarlas.
 *
 * @param {object} cam los valores de CAMERA
 * @param {number} anchoPantalla en pixeles
 * @param {number} altoPantalla en pixeles
 * @param {number} [alturaGus]
 */
export function medirEncuadre(cam, anchoPantalla, altoPantalla, alturaGus = 1.8) {
  const aspecto = anchoPantalla / altoPantalla;
  const fovV = fovVertical(cam.fov, cam.fovHorizontal, aspecto);
  const base = {
    alturaFoco: cam.targetHeight,
    pitchGrados: cam.pitchDegrees,
    distancia: cam.distance,
    fovVerticalGrados: fovV,
    adelanto: cam.lookAhead ?? 0
  };
  return {
    fovVertical: fovV,
    alturaCamara: alturaCamara(base),
    metrosAdelante: metrosVisiblesAdelante(base),
    pixelesGus: altoEnPantalla({ ...base, alturaObjeto: alturaGus, altoPantalla }),
    posicionGus: posicionEnPantalla({ ...base, alturaObjeto: alturaGus }),
    anchoVisible: 2 * cam.distance * Math.tan((cam.fov * GRADOS) / 2)
  };
}
