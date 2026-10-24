import { dirDeRumbo, rumboHacia, difRumbos } from '../core/rumbo.js';

/**
 * ===========================================================================
 * BALISTICA DEL DISPARO INSTANTANEO
 * ===========================================================================
 * La cuenta del disparo de la pistola, separada del arma y sin motor: dado
 * un origen, un rumbo y una lista de objetivos, decide a quien le pega y
 * donde termina la bala.
 *
 * Vive aparte de `weaponController` por una razon concreta: el disparo es
 * la parte del combate que mas se puede equivocar en silencio. Un tiro que
 * atraviesa una pared, uno que le pega a un zombi que estaba detras de
 * otro, o uno que elige el blanco mas lejano en vez del mas cercano, se ven
 * todos igual en pantalla —un fogonazo y un zombi que se cae— y no hay
 * forma de distinguirlos jugando. Con numeros si.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ES INSTANTANEO Y NO UN PROYECTIL
 * ---------------------------------------------------------------------------
 * Una bala de 9 mm cruza los 28 metros de alcance en unas ocho centesimas.
 * Simularla como un objeto que viaja agrega un cuerpo movil por disparo,
 * una prueba de colision por cuadro y una demora que el jugador no puede
 * aprovechar. El rayo instantaneo da el mismo resultado y se puede probar.
 *
 * La bazooka de la Fase 7 SI va a ser un proyectil, porque ahi la demora es
 * parte del arma: se ve venir, se puede errar por adelantarse.
 */

/**
 * Aplica dispersion a un rumbo.
 *
 * La dispersion es lo unico que impide que la pistola sea un puntero
 * perfecto. Es chica a proposito —dos grados y medio— porque a tres metros
 * no se nota y a veinticinco si: castiga el tiro de larga distancia sin
 * volver injusto el de cerca, que es donde se juega.
 *
 * El azar entra por parametro, nunca `Math.random`. El juego corre con un
 * generador con semilla (D-12): si el azar viniera de afuera, dos partidas
 * con la misma semilla dejarian de ser comparables y ninguna prueba de esto
 * seria repetible.
 *
 * @param {number} rumbo grados
 * @param {number} grados dispersion maxima a cada lado
 * @param {() => number} azar devuelve 0..1
 */
export function dispersar(rumbo, grados, azar) {
  if (!grados) return rumbo;
  return rumbo + (azar() * 2 - 1) * grados;
}

/**
 * A quien le pega un rayo, y donde termina.
 *
 * @param {{x:number,z:number}} origen
 * @param {number} rumbo grados, ya con la dispersion aplicada
 * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
 * @param {object} opt
 * @param {number} opt.alcance metros
 * @param {number} [opt.radioBlanco] ancho del cuerpo del objetivo
 * @param {(ax:number,az:number,bx:number,bz:number,alturaMinima:number) =>
 *   ({t:number}|null)} [opt.rayo] prueba contra el escenario
 * @param {number} [opt.alturaTiro] ignora obstaculos mas bajos que esto
 * @returns {{objetivo:object|null, distancia:number, x:number, z:number,
 *   pared:boolean}}
 */
export function blancoDelRayo(origen, rumbo, objetivos, opt) {
  const dir = dirDeRumbo(rumbo);
  const alcance = opt.alcance;
  const radio = opt.radioBlanco ?? 0.45;

  /*
   * Primero la pared, despues los zombis.
   *
   * El orden importa y es la parte facil de equivocar: si se buscara el
   * zombi mas cercano y despues se preguntara por la pared, un tiro contra
   * una persiana con un zombi del otro lado igual lo mataria. Acotando
   * primero cuanto vuela la bala, lo que esta mas alla simplemente no
   * existe para este disparo.
   */
  let libre = alcance;
  let pared = false;
  if (opt.rayo) {
    const hit = opt.rayo(
      origen.x,
      origen.z,
      origen.x + dir.x * alcance,
      origen.z + dir.z * alcance,
      opt.alturaTiro ?? 0
    );
    if (hit) {
      libre = hit.t * alcance;
      pared = true;
    }
  }

  let elegido = null;
  let mejorDistancia = Infinity;

  for (const objetivo of objetivos) {
    if (!objetivo.vivo) continue;
    const q = objetivo.posicion;
    const dx = q.x - origen.x;
    const dz = q.z - origen.z;

    // Distancia a lo largo del rayo. Negativa = esta atras del tirador.
    const sobre = dx * dir.x + dz * dir.z;
    if (sobre <= 0 || sobre > libre) continue;

    // Distancia perpendicular: cuanto se desvia del eje del rayo. Es el
    // margen que decide si la bala le roza el cuerpo o le pasa al lado.
    const costado = Math.abs(dx * -dir.z + dz * dir.x);
    if (costado > radio) continue;

    /*
     * El mas cercano gana, y los de atras no reciben nada. Un zombi tapa
     * al que viene detras: es lo que hace que una fila de zombis en un
     * pasillo angosto sea un problema y no una oportunidad.
     */
    if (sobre < mejorDistancia) {
      mejorDistancia = sobre;
      elegido = objetivo;
    }
  }

  if (elegido) {
    return {
      objetivo: elegido,
      distancia: mejorDistancia,
      x: origen.x + dir.x * mejorDistancia,
      z: origen.z + dir.z * mejorDistancia,
      pared: false
    };
  }

  // Sin blanco: la bala termina en la pared, o al final de su alcance.
  return {
    objetivo: null,
    distancia: libre,
    x: origen.x + dir.x * libre,
    z: origen.z + dir.z * libre,
    pared
  };
}

/**
 * Correccion de apuntado para pantallas tactiles (tarea 6.3).
 *
 * En el telefono no hay mira: el rumbo del disparo es hacia donde mira el
 * personaje, y el personaje mira hacia donde lo lleva el pulgar sobre un
 * joystick de dos centimetros. Pedir precision de grados con eso es pedir
 * que el jugador falle por culpa del control y no por culpa suya.
 *
 * La correccion es CHICA y acotada a proposito:
 *
 * - Solo mira objetivos que ya estan cerca del centro (`cono`). No busca
 *   blancos a los costados: el jugador sigue decidiendo a quien le tira.
 * - Corrige como maximo unos pocos grados (`maxima`). Si corrigiera todo
 *   seria apuntado automatico, y acertar dejaria de tener merito.
 * - Elige el mas cercano al centro, no el mas cercano en distancia: es lo
 *   que coincide con la intencion de quien esta mirando la pantalla.
 *
 * @param {{x:number,z:number}} origen
 * @param {number} rumbo grados
 * @param {Array} objetivos
 * @param {object} opt
 * @param {number} opt.alcance
 * @param {number} opt.cono semiangulo de busqueda, en grados
 * @param {number} opt.maxima correccion maxima, en grados
 * @returns {number} el rumbo corregido
 */
export function rumboAsistido(origen, rumbo, objetivos, opt) {
  let mejor = null;
  let mejorDesvio = Infinity;

  for (const objetivo of objetivos) {
    if (!objetivo.vivo) continue;
    const q = objetivo.posicion;
    const dx = q.x - origen.x;
    const dz = q.z - origen.z;
    if (Math.hypot(dx, dz) > opt.alcance) continue;

    const desvio = difRumbos(rumboHacia(dx, dz), rumbo);
    if (desvio > opt.cono) continue;
    if (desvio < mejorDesvio) {
      mejorDesvio = desvio;
      mejor = { dx, dz };
    }
  }

  if (!mejor) return rumbo;

  /*
   * Se gira HACIA el objetivo, como maximo `maxima` grados. El signo sale
   * de la diferencia CON SIGNO, no de comparar los angulos crudos: cerca
   * del cruce de los 360 grados eso corregiria para el lado contrario.
   */
  const deseado = rumboHacia(mejor.dx, mejor.dz);
  const delta = ((deseado - rumbo + 540) % 360) - 180;
  const paso = Math.max(-opt.maxima, Math.min(opt.maxima, delta));
  return rumbo + paso;
}
