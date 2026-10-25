/**
 * ===========================================================================
 * RUMBOS: UN SOLO CONVENIO PARA TODO EL JUEGO
 * ===========================================================================
 * Un rumbo es un angulo en grados alrededor del eje vertical.
 *
 *   **Rumbo 0 es mirar hacia -Z. El angulo crece girando hacia -X.**
 *
 * Visto desde la camara cenital, eso es girar en sentido horario.
 *
 * Esta es la unica definicion valida en el proyecto. No es una eleccion de
 * gusto: es la que ya impone PlayCanvas. `setEulerAngles(0, g, 0)` apunta
 * el frente local de la entidad —que es -Z— hacia ese rumbo, y todos los
 * modelos del juego estan armados mirando a -Z (el zombi tiene los brazos
 * en z negativo, ver zombie.js). La camara y las misiones ya lo usaban.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTE ARCHIVO EXISTE
 * ---------------------------------------------------------------------------
 * Antes convivian DOS convenios sin que ninguno estuviera escrito. La
 * camara y los modelos usaban este; el cerebro del zombi y el arma usaban
 * el contrario, `atan2(dx, dz)`, donde el rumbo 0 mira a +Z. Los dos eran
 * coherentes consigo mismos, asi que cada uno andaba bien por separado y
 * sus pruebas pasaban.
 *
 * El error aparecia solo en el cruce. El arma recibia el rumbo del jugador
 * —convenio de modelo— y lo comparaba con `atan2(dx, dz)` —el otro—: 180
 * grados de diferencia. El cuchillo golpeaba exactamente para atras. Al
 * zombi le pasaba lo mismo: su cuerpo apuntaba al reves de donde caminaba.
 *
 * De ahi la regla: **ningun `atan2` de rumbos fuera de este archivo**. Si
 * hay un solo lugar donde vive el signo, no puede haber dos convenios.
 */

const RAD_A_GRADOS = 180 / Math.PI;
const GRADOS_A_RAD = Math.PI / 180;

/**
 * Rumbo que corresponde a una direccion en el plano.
 *
 * Los signos negativos son el convenio en si: con rumbo 0 el frente es -Z,
 * asi que una direccion (0, -1) tiene que dar 0.
 *
 * @param {number} dx
 * @param {number} dz
 * @returns {number} grados, entre -180 y 180
 */
export function rumboHacia(dx, dz) {
  return Math.atan2(-dx, -dz) * RAD_A_GRADOS;
}

/**
 * Rumbo del que esta en `origen` para mirar a `objetivo`.
 *
 * @param {{x:number,z:number}} origen
 * @param {{x:number,z:number}} objetivo
 */
export function rumboEntre(origen, objetivo) {
  return rumboHacia(objetivo.x - origen.x, objetivo.z - origen.z);
}

/**
 * Direccion unitaria a la que apunta un rumbo. Es la inversa exacta de
 * `rumboHacia`, y la que hay que usar para dibujar o lanzar cualquier cosa
 * "hacia adelante".
 *
 * @param {number} grados
 * @returns {{x:number,z:number}}
 */
export function dirDeRumbo(grados) {
  const a = grados * GRADOS_A_RAD;
  return { x: -Math.sin(a), z: -Math.cos(a) };
}

/**
 * Convierte una entrada de pantalla en una direccion del mundo.
 *
 * Es la cuenta que traduce "el dedo fue hacia arriba a la derecha" en "el
 * personaje va hacia alla", y depende de hacia donde mira la camara: con la
 * calle en diagonal, arriba en la pantalla NO es arriba en el mapa.
 *
 * Vive aca porque la usan dos cosas que tienen que coincidir exactamente:
 * el joystick de movimiento y el de apuntado. Si cada una hiciera su propia
 * version, el dia que una cambie el personaje caminaria hacia un lado y
 * dispararia hacia otro.
 *
 * @param {number} ejeX -1 izquierda, +1 derecha
 * @param {number} ejeY -1 abajo, +1 arriba de la pantalla
 * @param {number} yawCamara grados
 * @returns {{x:number, z:number}} sin normalizar: conserva la intensidad
 */
export function direccionDeEntrada(ejeX, ejeY, yawCamara) {
  // Adelante de la camara es su rumbo; la derecha es su perpendicular.
  const adelante = dirDeRumbo(yawCamara);
  const derechaX = -adelante.z;
  const derechaZ = adelante.x;
  return {
    x: ejeX * derechaX + ejeY * adelante.x,
    z: ejeX * derechaZ + ejeY * adelante.z
  };
}

/** Lleva cualquier angulo al rango de 0 a 360. */
export function normalizarRumbo(grados) {
  return ((grados % 360) + 360) % 360;
}

/**
 * Diferencia ANGULAR entre dos rumbos, siempre de 0 a 180.
 *
 * Es lo que hace falta para preguntar "esto cae dentro de mi cono?" sin
 * equivocarse en el cruce de los 360 grados, que es el error clasico con
 * angulos: 350 y 10 estan a 20 grados, no a 340.
 *
 * El `% 360` de JavaScript conserva el signo del dividendo, asi que la
 * forma corta y habitual —`abs(((a - b + 540) % 360) - 180)`— devuelve
 * numeros mayores que 180 en cuanto la resta baja de -540. No es
 * hipotetico: el rumbo del zombi quieto se incrementa cuadro a cuadro sin
 * volver nunca al rango, asi que llegaba ahi solo con dejarlo parado un
 * rato, y a partir de ese momento su cono de vision se rompia y dejaba de
 * ver al jugador. Normalizando primero no puede pasar.
 */
export function difRumbos(a, b) {
  return 180 - Math.abs(normalizarRumbo(a - b) - 180);
}
