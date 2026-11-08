import { rumboHacia } from '../core/rumbo.js';

/**
 * ===========================================================================
 * A QUIEN LE TIRA — la eleccion del blanco
 * ===========================================================================
 * El enemigo mas cercano que se pueda ver. Logica pura, sin motor.
 *
 * ---------------------------------------------------------------------------
 * DE DONDE SALIO ESTE ARCHIVO
 * ---------------------------------------------------------------------------
 * Hasta la Fase 16.3 esta funcion vivia adentro de `combat/explosion.js`,
 * porque fue la bazooka la primera que la necesito: era su apuntado
 * automatico (doc 02, D-03). No tenia por que vivir ahi —elegir un blanco no
 * tiene nada que ver con el daño en area— pero quedo donde la escribieron
 * primero.
 *
 * Cuando la Fase 16 borro la bazooka entera, esta funcion casi se va con
 * ella. Se rescato a proposito y ANTES de borrar nada, porque es exactamente
 * lo que necesita el combate automatico de D-28: **Gus se queda quieto y le
 * dispara solo al enemigo mas cercano**. La regla nueva del juego ya estaba
 * escrita, guardada en el archivo equivocado.
 *
 * La leccion, que vale para toda la poda: en un borrado grande lo que se
 * pierde no es el codigo que uno recuerda, es el que quedo guardado en el
 * lugar equivocado.
 *
 * ---------------------------------------------------------------------------
 * POR QUE LA LINEA DE VISTA NO ES OPCIONAL
 * ---------------------------------------------------------------------------
 * Un blanco al que no se le puede tirar no es un blanco. Si la eleccion
 * ignorara las paredes, Gus se quedaria quieto apuntandole a un zombi del
 * otro lado de una persiana y vaciando el cargador contra el revoque,
 * mientras otro se le acerca por el costado. El jugador no tendria forma de
 * entender por que no pasa nada.
 *
 * Y vale para los dos lados (D-36): si un arbol te tapa al zombi, el mismo
 * arbol te tapa a vos. Esa simetria es lo que convierte a los autos y a los
 * arboles en cobertura y no en adorno.
 */

/**
 * El enemigo mas cercano dentro del alcance, y que se pueda ver.
 *
 * @param {{x:number,z:number}} origen
 * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
 * @param {object} opt
 * @param {number} opt.alcance
 * @param {Function} [opt.rayo] prueba del escenario; sin ella, todos se ven
 * @param {number} [opt.altura] altura a la que se mira
 * @returns {{objetivo:object, distancia:number, rumbo:number}|null}
 */
export function objetivoAutomatico(origen, objetivos, opt) {
  let mejor = null;
  let mejorDistancia = Infinity;

  for (const objetivo of objetivos) {
    if (!objetivo.vivo) continue;
    const q = objetivo.posicion;
    const dx = q.x - origen.x;
    const dz = q.z - origen.z;
    const d = Math.hypot(dx, dz);
    if (d > opt.alcance || d >= mejorDistancia) continue;

    if (opt.rayo) {
      const hit = opt.rayo(origen.x, origen.z, q.x, q.z, opt.altura ?? 0);
      // `t` cerca de 1 es el propio cuerpo del objetivo, no una pared.
      if (hit && hit.t < 0.95) continue;
    }

    mejorDistancia = d;
    mejor = objetivo;
  }

  if (!mejor) return null;
  const q = mejor.posicion;
  return {
    objetivo: mejor,
    distancia: mejorDistancia,
    rumbo: rumboHacia(q.x - origen.x, q.z - origen.z)
  };
}
