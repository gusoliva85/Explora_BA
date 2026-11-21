/**
 * ===========================================================================
 * LA ESCLUSA — la puerta que no abre hasta que el tramo esté limpio (D-37)
 * ===========================================================================
 * Es el corazón del juego nuevo. Todo lo demás —el combate automático, el
 * recorrido de ida, las cartas— existe alrededor de esto.
 *
 * La regla en una línea: **cada dos cuadras hay una puerta del ejército que
 * no abre hasta que no quede un zombi vivo en el tramo, y que se cierra a
 * tus espaldas.**
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTO ES LOGICA PURA Y NO UNA ENTIDAD
 * ---------------------------------------------------------------------------
 * No conoce PlayCanvas, ni la puerta de verdad, ni la colisión. Recibe
 * cuántos zombis quedan vivos por tramo y dónde está el jugador; devuelve
 * **qué puerta está abierta y cuál no**.
 *
 * Esa separación es lo que permite probar la máquina entera con números, y
 * acá importa más que en ningún otro lado: **si la esclusa se equivoca, la
 * partida es imposible de terminar** y no hay nada en pantalla que lo
 * explique. El jugador ve "queda 1" y no encuentra a nadie.
 */

/** Los estados de una puerta. */
export const EstadoPuerta = {
  /** Con zombis vivos en el tramo. No se pasa. */
  CERRADA: 'CERRADA',
  /** Tramo limpio: se corre y deja pasar. */
  ABIERTA: 'ABIERTA',
  /**
   * El jugador ya pasó y se alejó: la puerta volvió a cerrarse.
   *
   * No es lo mismo que CERRADA, y la diferencia importa: una puerta
   * SELLADA no vuelve a abrir aunque el tramo de atrás esté limpio —y lo
   * está, por eso pasó—. Es lo que hace que el recorrido sea de ida.
   */
  SELLADA: 'SELLADA'
};

/**
 * A cuántos metros de la puerta se vuelve a cerrar (D-37, 19A.8).
 *
 * El número sale de la cámara, no del gusto: se sienta 7 m detrás de Gus y
 * hasta 14,4 m si el jugador la aleja al máximo. Pasados los veinte, la
 * cuadra de atrás ya no se ve desde ninguna distancia de cámara, así que
 * cerrar ahí **no se ve cerrar**: lo que el jugador nota después es que no
 * puede volver, no que algo se movió a sus espaldas.
 *
 * Y es el mismo evento que libera la cuadra de atrás (D-42).
 */
export const DISTANCIA_SELLADO = 20;

export class Esclusa {
  /**
   * @param {Array<{tramo:number, control:number, x:number, z:number}>} puertas
   */
  constructor(puertas) {
    this.puertas = puertas;
    /** @type {Map<number, string>} tramo -> estado */
    this.estados = new Map();
    this.reiniciar();
  }

  reiniciar() {
    this.estados.clear();
    for (const p of this.puertas) this.estados.set(p.tramo, EstadoPuerta.CERRADA);
  }

  /** El estado de la puerta de un tramo. Sin puerta, se considera abierta. */
  estado(tramo) {
    return this.estados.get(tramo) ?? EstadoPuerta.ABIERTA;
  }

  /** La puerta que le toca a un tramo, o `null` si no tiene. */
  puertaDe(tramo) {
    return this.puertas.find((p) => p.tramo === tramo) ?? null;
  }

  /**
   * Un paso de la máquina.
   *
   * @param {number} tramo en qué tramo está el jugador
   * @param {{x:number,z:number}} jugador
   * @param {(tramo:number) => number} vivosEnTramo cuántos quedan vivos
   * @returns {Array<{tipo:string, tramo:number, control:number}>} lo que cambió
   */
  update(tramo, jugador, vivosEnTramo) {
    const eventos = [];

    /*
     * ABRIR: sólo la puerta del tramo donde está el jugador.
     *
     * No se recorren todas. Una puerta de un tramo que el jugador todavía
     * no pisó no tiene por qué abrirse aunque esté limpio —puede estarlo
     * porque sus zombis no aparecieron nunca— y abrirla de antemano le
     * quitaría a la esclusa lo único que la hace una esclusa: que el
     * jugador la encuentre cerrada.
     */
    const puerta = this.puertaDe(tramo);
    if (puerta && this.estado(tramo) === EstadoPuerta.CERRADA && vivosEnTramo(tramo) === 0) {
      this.estados.set(tramo, EstadoPuerta.ABIERTA);
      eventos.push({ tipo: 'abre', tramo, control: puerta.control });
    }

    /*
     * SELLAR: las que quedaron atrás, cuando el jugador se alejó lo
     * suficiente como para que no se vea cerrar.
     *
     * Se recorren TODAS las abiertas y no sólo la anterior, porque el
     * jugador puede morir y reaparecer, y entonces la cuenta de "la
     * anterior" deja de ser obvia. Preguntar por distancia no se equivoca
     * nunca.
     */
    for (const p of this.puertas) {
      if (this.estado(p.tramo) !== EstadoPuerta.ABIERTA) continue;
      const d = Math.hypot(jugador.x - p.x, jugador.z - p.z);
      // Sólo se sella si el jugador ya está del otro lado, o sea en un
      // tramo posterior. Alejarse para atrás no sella nada.
      if (tramo <= p.tramo) continue;
      if (d < DISTANCIA_SELLADO) continue;
      this.estados.set(p.tramo, EstadoPuerta.SELLADA);
      eventos.push({ tipo: 'sella', tramo: p.tramo, control: p.control });
    }

    return eventos;
  }

  /** ¿Hay algo que frene al jugador en este tramo? */
  frena(tramo) {
    return this.estado(tramo) === EstadoPuerta.CERRADA;
  }
}
