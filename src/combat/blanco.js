import { objetivoAutomatico } from './objetivo.js';
import { rumboHacia, difRumbos } from '../core/rumbo.js';

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
     * Se REVALIDA al actual; no se lo compara contra los demas.
     *
     * Es la distincion entera de esta clase y conviene tenerla a la vista,
     * porque revalidar cada cuadro se parece peligrosamente a **elegir**
     * cada cuadro, que es justo lo que no hay que hacer:
     *
     *   - Si el actual sigue sirviendo, **se queda**, aunque haya otro a la
     *     mitad de distancia.
     *   - Recien cuando deja de servir se abre la busqueda.
     *
     * Si eso se confunde, vuelve el problema de la 17.3: con cuatro tiros
     * por zombi (D-31), un blanco que cambia solo garantiza que ninguno
     * llegue nunca a los cuatro, y el combate automatico no mata a nadie.
     *
     * El `|| !this.actual` tampoco es un parche: es el caso de pararse
     * donde no hay nadie. Si el jugador frena en una cuadra vacia y un
     * zombi dobla la esquina tres segundos despues, tiene que empezar a
     * dispararle sin necesidad de moverse y volver a frenar.
     */
    if (entroRecien || !this.#sigueSiendoValido(origen)) {
      this.#elegir(origen, objetivos);
    }
    return this.actual;
  }

  /**
   * ¿Gus ya esta mirando al blanco?
   *
   * Es lo que decide **cuando empieza a disparar** (17.5), y no tiene nada
   * que ver con la punteria: el tiro apuntado sale exacto hacia el blanco y
   * no falla (D-36). Lo que esto cuida es que el trazado no salga de un
   * cuerpo que esta mirando para otro lado.
   *
   * Sin blanco devuelve `false`: no hay a quien encarar.
   *
   * @param {number} yaw hacia donde mira Gus, en grados
   * @param {number} tolerancia grados de desvio admitidos
   */
  encarado(yaw, tolerancia) {
    if (!this.actual) return false;
    return difRumbos(yaw, this.rumbo) <= tolerancia;
  }

  /** Olvida el blanco. Para reiniciar la mision o al morir. */
  reiniciar() {
    this.actual = null;
    this.quietoAntes = false;
    this.distancia = 0;
    this.rumbo = 0;
  }

  /**
   * ¿El blanco actual todavia sirve?
   *
   * Tres cosas lo invalidan, y las tres terminan en lo mismo: **seguir
   * disparandole seria tirar tiempo mientras otro zombi se acerca.** En un
   * juego donde la unica decision es cuanto tiempo quedarse quieto, eso no
   * es un detalle.
   *
   * | Pasa esto | Por que invalida |
   * |---|---|
   * | Murio | Gus le seguiria disparando a un cadaver |
   * | Salio del alcance | Mas alla de 28 m el tiro no llega: es solo ruido |
   * | Se perdio de vista | Doblo una esquina o se metio detras de un auto (D-36) |
   *
   * **La perdida de vista es inmediata, sin gracia ni retardo.** Un retardo
   * haria que Gus siga disparandole al auto que lo tapa, que es exactamente
   * lo que D-36 vino a impedir. Y seria invisible: el jugador veria los
   * trazados pegarle a la chapa sin entender por que nadie se muere.
   */
  #sigueSiendoValido(origen) {
    const z = this.actual;
    if (!z || !z.vivo) return false;

    const q = z.posicion;
    const dx = q.x - origen.x;
    const dz = q.z - origen.z;
    const d = Math.hypot(dx, dz);
    if (d > this.alcance) return false;

    if (this.rayo) {
      const hit = this.rayo(origen.x, origen.z, q.x, q.z, this.altura ?? 0);
      // `t` cerca de 1 es el propio cuerpo del blanco, no una pared. Es el
      // mismo criterio que usa `objetivoAutomatico` al elegir: si los dos
      // no coincidieran, un blanco recien elegido podria invalidarse en el
      // cuadro siguiente y Gus cambiaria de objetivo sin parar.
      if (hit && hit.t < 0.95) return false;
    }

    /*
     * Y de paso se refrescan distancia y rumbo. **El blanco es una foto
     * del momento en que se eligio, pero su POSICION no**: el zombi camina,
     * y lo que la 17.5 necesita para girar es hacia donde esta ahora, no
     * hacia donde estaba cuando lo eligieron.
     */
    this.distancia = d;
    this.rumbo = rumboHacia(dx, dz);
    return true;
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
