import { rumboHacia } from '../core/rumbo.js';

/**
 * ===========================================================================
 * DAÑO EN AREA
 * ===========================================================================
 * Quien recibe una explosion y cuanto. Logica pura, sin motor.
 *
 * Vive aparte porque el daño en area es de las cosas que se sienten
 * injustas cuando estan mal y no hay forma de darse cuenta jugando. Si un
 * zombi al borde del radio muere igual que uno en el centro, el jugador no
 * ve ninguna diferencia: ve que todos murieron. Pero el arma deja de tener
 * puntería y se vuelve un boton de borrar pantalla.
 *
 * ---------------------------------------------------------------------------
 * POR QUE EL DAÑO BAJA HACIA EL BORDE
 * ---------------------------------------------------------------------------
 * Porque es lo unico que convierte "apuntar la bazooka" en una habilidad.
 * Con 250 en el centro y 60 en el borde, acertarle al medio de un grupo
 * mata a todos y acertarle al costado deja heridos. Esa diferencia es la
 * razon de que el arma tenga apuntado automatico al MAS CERCANO y no al
 * grupo mas grande: el jugador decide cuando dispararla, y de donde.
 */

/**
 * Daño que recibe algo a `distancia` metros del centro.
 *
 * La caida es LINEAL, no cuadratica. Una caida fisica realista concentra
 * casi todo el daño en el primer metro y deja el resto del radio como
 * decoracion: el jugador ve una explosion de seis metros que en la practica
 * mata en dos. Lineal se corresponde con lo que se ve.
 *
 * @param {number} distancia metros desde el centro
 * @param {object} opt
 * @param {number} opt.radio radio de la explosion
 * @param {number} opt.centro daño en el centro
 * @param {number} opt.borde daño justo en el borde
 * @returns {number} 0 si esta fuera del radio
 */
export function dañoPorDistancia(distancia, opt) {
  if (distancia >= opt.radio) return 0;
  const k = Math.max(0, Math.min(1, distancia / opt.radio));
  return opt.centro + (opt.borde - opt.centro) * k;
}

/**
 * A quienes alcanza una explosion, con cuanto daño y hacia donde los empuja.
 *
 * @param {{x:number,z:number}} centro
 * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
 * @param {object} opt ver `dañoPorDistancia`
 * @returns {Array<{objetivo:object, daño:number, distancia:number,
 *   dirX:number, dirZ:number}>}
 */
export function alcanzadosPorExplosion(centro, objetivos, opt) {
  const out = [];
  for (const objetivo of objetivos) {
    if (!objetivo.vivo) continue;
    const q = objetivo.posicion;
    const dx = q.x - centro.x;
    const dz = q.z - centro.z;
    const d = Math.hypot(dx, dz);
    const daño = dañoPorDistancia(d, opt);
    if (daño <= 0) continue;

    /*
     * El empujon sale DEL centro hacia afuera. Con la distancia en cero
     * —un impacto directo— no hay direccion que calcular, asi que se usa
     * una cualquiera: lo que importa es que el zombi salga despedido, no
     * para que lado exacto cuando la bomba le explota encima.
     */
    const largo = d || 1;
    out.push({
      objetivo,
      daño,
      distancia: d,
      dirX: d === 0 ? 0 : dx / largo,
      dirZ: d === 0 ? 1 : dz / largo
    });
  }
  return out;
}

/**
 * El zombi al que apunta sola la bazooka (D-03).
 *
 * El mas cercano dentro del alcance, **y que se pueda ver**. La linea de
 * vista no esta en el documento 02 y se agrega a proposito: sin ella, el
 * arma elegiria un zombi del otro lado de una persiana, el cohete
 * reventaria contra la pared a dos metros del jugador y la explosion de
 * seis metros se lo llevaria puesto. El jugador no tendria forma de
 * entender que paso.
 *
 * @param {{x:number,z:number}} origen
 * @param {Array} objetivos
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
