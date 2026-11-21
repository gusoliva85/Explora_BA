import { objetivoAutomatico } from './objetivo.js';

/**
 * ===========================================================================
 * EL BLANCO — a quien le esta disparando Gus, y desde cuando
 * ===========================================================================
 * Sin botones de accion (D-28), el jugador no elige a quien le tira: elige
 * **cuando** pelear, quedandose quieto. Esta clase es la que traduce esa
 * decision en un enemigo concreto.
 *
 * Es logica pura: no conoce PlayCanvas ni entidades. Recibe si el jugador
 * esta quieto, donde esta y la lista de enemigos; devuelve a quien le
 * corresponde dispararle. Eso permite probar la maquina de estados entera
 * con numeros, que es lo que pide la 17.10.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO SE ELIGE EN CADA CUADRO
 * ---------------------------------------------------------------------------
 * Elegir al mas cercano sesenta veces por segundo parece lo mismo y no lo
 * es. Con dos zombis acercandose a la par, el "mas cercano" se alterna
 * varias veces por segundo: Gus giraria en el lugar sin terminar de matar a
 * ninguno, y repartiria el daño en vez de concentrarlo.
 *
 * Peor todavia con la regla de D-31: hacen falta **cuatro tiros** por zombi.
 * Un blanco que cambia solo garantiza que ningun zombi llegue nunca a los
 * cuatro, y el combate automatico no mataria a nadie.
 *
 * Asi que el blanco se elige **una vez**, al entrar en quieto, y se mantiene.
 * Lo que puede soltarlo esta en `#sigueSiendoValido`.
 */

export class SelectorDeBlanco {
  /**
   * @param {object} opt
   * @param {number} opt.alcance hasta donde se busca, en metros
   * @param {Function} [opt.rayo] prueba del escenario, firma de CollisionWorld.raycast
   * @param {number} [opt.altura] altura a la que se mira, en metros
   */
  constructor(opt) {
    this.alcance = opt.alcance;
    this.rayo = opt.rayo;
    this.altura = opt.altura;

    /** El enemigo elegido, o `null`. */
    this.actual = null;
    /** Distancia y rumbo al blanco, del momento en que se eligio. */
    this.distancia = 0;
    this.rumbo = 0;
    /** Estaba quieto el cuadro anterior: sirve para detectar el flanco. */
    this.quietoAntes = false;
  }

  /**
   * @param {boolean} quieto el jugador solto el joystick (ver `avanzarQuieto`)
   * @param {{x:number,z:number}} origen
   * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
   * @returns {object|null} el blanco, o `null` si no hay
   */
  update(quieto, origen, objetivos) {
    /*
     * Moverse suelta el blanco EN EL ACTO y sin arrastre (17.6).
     *
     * Sin esto, Gus seguiria encarando al zombi del que esta huyendo
     * durante el primer paso de la huida, que es justo el paso en el que
     * uno huye porque algo salio mal.
     */
    if (!quieto) {
      this.actual = null;
      this.quietoAntes = false;
      return null;
    }

    /*
     * El flanco: se elige al ENTRAR en quieto, no mientras se esta quieto.
     *
     * Es lo que hace que la eleccion sea una foto del momento en que el
     * jugador decidio pararse, que es lo que el criterio de salida de la
     * fase pide con todas las letras: "el blanco elegido es siempre el mas
     * cercano *en ese momento*".
     */
    const entroRecien = !this.quietoAntes;
    this.quietoAntes = true;

    /*
     * El `|| !this.actual` no es un parche: es el caso de pararse donde no
     * hay nadie. Si el jugador frena en una cuadra vacia y un zombi dobla
     * la esquina tres segundos despues, tiene que empezar a dispararle sin
     * necesidad de moverse y volver a frenar.
     *
     * ⚠️ **Lo que todavia NO hace es soltar un blanco que dejo de servir**
     * —que murio, que se alejo, que quedo tapado—. Eso es la 17.4, y hasta
     * que exista un blanco muerto se queda elegido. No rompe nada porque
     * la 17.3 todavia no dispara.
     */
    if (entroRecien || !this.actual) this.#elegir(origen, objetivos);
    return this.actual;
  }

  /** Olvida el blanco. Para reiniciar la mision o al morir. */
  reiniciar() {
    this.actual = null;
    this.quietoAntes = false;
    this.distancia = 0;
    this.rumbo = 0;
  }

  #elegir(origen, objetivos) {
    const elegido = objetivoAutomatico(origen, objetivos, {
      alcance: this.alcance,
      rayo: this.rayo,
      altura: this.altura
    });

    if (!elegido) {
      this.actual = null;
      return;
    }

    this.actual = elegido.objetivo;
    this.distancia = elegido.distancia;
    this.rumbo = elegido.rumbo;
  }
}
