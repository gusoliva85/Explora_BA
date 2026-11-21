import { WEAPONS } from '../config/balance.js';
import { blancoDelRayo, dispersar, rumboAsistido } from './ballistics.js';

/**
 * ===========================================================================
 * EL ARMA
 * ===========================================================================
 * Cuando se puede disparar, cuanto tarda el tiro en salir y a quien
 * alcanza.
 *
 * Como el cerebro del zombi, es logica pura: no conoce PlayCanvas ni
 * entidades. Recibe la posicion del jugador, hacia donde mira y una lista
 * de objetivos con posicion; devuelve a quienes alcanzo. Eso permite
 * probar la balistica entera con numeros en vez de a ojo.
 *
 * ---------------------------------------------------------------------------
 * UNA SOLA ARMA (D-29)
 * ---------------------------------------------------------------------------
 * Hasta la Fase 16.4 esta clase manejaba tres armas y el cambio entre
 * ellas: tenia `equipar()`, `cambiarA()`, un aviso `alCambiarArma`, y dos
 * formas distintas de resolver el golpe —el arco del cuchillo y el rayo de
 * la pistola—. Se fue todo. Lo que queda es **el arma**, en singular, y
 * por eso ya no hay nada que elegir ni estado que sincronizar.
 *
 * Con el cuerpo a cuerpo se fueron tres cosas mas que solo existian para
 * el arco, y conviene decir por que, porque son del tipo de resto que
 * sobrevive a un borrado:
 *
 * - **`yaGolpeados`**, el conjunto de a quienes ya alcanzo este swing.
 *   Existia porque un arco puede barrer al mismo zombi dos veces si entra
 *   y sale durante el golpe. Un rayo le pega a UNO y se termina.
 * - **`swing`**, desde donde y hacia donde iba el golpe en curso. Lo leia
 *   el dibujo del arco, y el arco ya no se dibuja.
 * - **`alIniciarAtaque`**, el aviso de que el golpe arrancaba. Servia para
 *   mostrar el arco al apretar, antes de que saliera el daño, y para pedir
 *   la pose del cuchillazo. Las dos cosas se borraron: lo que el jugador ve
 *   ahora al disparar lo avisa `alDisparar`, que sale en el mismo momento
 *   en que el tiro se resuelve.
 *
 * ---------------------------------------------------------------------------
 * POR QUE EL TIRO TIENE DEMORA
 * ---------------------------------------------------------------------------
 * Entre apretar y aplicar el daño pasan unos centesimos. No es un
 * capricho: es lo que hace que el combate se pueda leer.
 *
 * Con daño instantaneo, el jugador aprieta y el zombi muere en el mismo
 * cuadro en que empieza la animacion. No hay nada que anticipar y el tiro
 * se siente despegado del personaje. Con la demora, el gesto empieza, el
 * jugador ve el movimiento, y recien ahi conecta. Ademas abre la puerta a
 * que un zombi alcance a interrumpirte, que es de donde sale la tension.
 *
 * Son cinco centesimas, mucho menos que las doce del cuchillazo: un tiro
 * no tiene recorrido que anticipar, y lo que en el cuerpo a cuerpo se
 * sentia como peso, en la pistola se sentiria como retardo.
 */

/** Estados del arma. */
export const EstadoArma = {
  LISTA: 'LISTA',
  /** Se apreto, el tiro todavia no salio. */
  PREPARANDO: 'PREPARANDO',
  /** Daño aplicado, esperando para poder volver a disparar. */
  ESPERANDO: 'ESPERANDO'
  /*
   * Hubo un cuarto estado, RECARGANDO, y se fue en la Fase 16.2 con la
   * municion (D-29). Era un estado propio y no una espera mas larga porque
   * el jugador tenia que poder VERLO: durante la recarga estaba indefenso,
   * y esa era la mitad del costo de usar la pistola. Ahora no hay costo que
   * mostrar: el arma dispara siempre.
   */
};

export class WeaponController {
  /**
   * @param {object} [opt]
   * @param {(info:object) => void} [opt.alGolpear] se llama cuando el tiro conecta
   * @param {(info:object) => void} [opt.alFallar] se llama cuando el tiro no alcanza a nadie
   * @param {(info:object) => void} [opt.alHacerRuido] para el sistema de ruido (D-05)
   * @param {(info:object) => void} [opt.alDisparar] trazado y fogonazo
   * @param {Function} [opt.rayo] prueba del escenario, firma de CollisionWorld.raycast
   * @param {() => number} [opt.azar] generador con semilla (D-12)
   * @param {() => boolean} [opt.asistirApuntado] si corresponde ayudar a apuntar
   */
  constructor(opt = {}) {
    /*
     * El arma se lee de la tabla y no se recibe por parametro.
     *
     * Habia un `armaInicial`, que era con cual de las tres arrancaba la
     * mision. Con una sola, un parametro para elegirla seria exactamente
     * el tipo de cosa que la Fase 16 vino a borrar: una perilla que solo
     * puede estar en una posicion.
     */
    this.arma = WEAPONS.pistol;

    this.estado = EstadoArma.LISTA;
    this.restante = 0;

    /*
     * El azar por omision NO es aleatorio.
     *
     * Devuelve siempre el centro, o sea cero dispersion. Es a proposito:
     * una prueba que no le pase un generador obtiene un disparo perfecto y
     * repetible, y nunca falla por mala suerte. El juego si le pasa el
     * generador con semilla (D-12).
     */

    this.azar = opt.azar ?? (() => 0.5);
    this.rayo = opt.rayo;
    this.asistirApuntado = opt.asistirApuntado ?? (() => false);

    this.alGolpear = opt.alGolpear;
    this.alFallar = opt.alFallar;
    this.alHacerRuido = opt.alHacerRuido;
    this.alDisparar = opt.alDisparar;
  }

  get puedeAtacar() {
    return this.estado === EstadoArma.LISTA;
  }

  /** Vuelve al estado de arranque de mision. */
  reiniciar() {
    this.estado = EstadoArma.LISTA;
    this.restante = 0;
  }

  /**
   * Aprieta el gatillo.
   *
   * No aplica daño todavia: arranca el tiro. El daño sale en `update`
   * cuando se cumple la demora.
   *
   * **No recibe nada, y antes recibia tres cosas.** Tomaba la posicion, el
   * rumbo y la lista de objetivos para guardar el swing y para avisar si el
   * golpe iba a conectar. Las dos cosas se fueron con el arco: el tiro se
   * resuelve en `update` con la posicion y el rumbo del momento en que
   * sale, que es justamente el motivo por el que girar durante la demora
   * sirve. Dejar los parametros habria sido dejar tres argumentos que nadie
   * lee, que es la forma mas facil de que alguien crea que importan.
   *
   * @returns {boolean} true si el tiro arranco
   */
  atacar() {
    if (!this.puedeAtacar) return false;

    this.estado = EstadoArma.PREPARANDO;
    this.restante = this.arma.windup;
    return true;
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} pos posicion actual del jugador
   * @param {number} rumboGrados
   * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
   */
  update(dt, pos, rumboGrados, objetivos) {
    if (this.restante > 0) this.restante -= dt;

    if (this.estado === EstadoArma.PREPARANDO && this.restante <= 0) {
      // El tiro sale desde donde esta el jugador AHORA, no desde donde
      // estaba al apretar: si no, girar durante la demora no serviria de
      // nada y el combate se sentiria rigido.
      this.#resolverDisparo(pos, rumboGrados, objetivos);
      this.estado = EstadoArma.ESPERANDO;
      this.restante = this.arma.cooldown;
      return;
    }

    if (this.estado === EstadoArma.ESPERANDO && this.restante <= 0) {
      this.estado = EstadoArma.LISTA;
    }
  }

  /**
   * El disparo instantaneo.
   *
   * El orden de los tres pasos no es casual:
   *
   * 1. **Asistencia** primero, sobre el rumbo limpio. Corrige el temblor
   *    del pulgar antes de que intervenga el azar.
   * 2. **Dispersion** despues. Si fuera al revés, la asistencia podria
   *    cancelar la dispersion y el arma seria un puntero perfecto en
   *    cuanto hubiera un zombi cerca del centro.
   * 3. **El rayo** al final, con el rumbo ya definitivo.
   */
  #resolverDisparo(pos, rumboGrados, objetivos = []) {
    const arma = this.arma;

    let rumbo = rumboGrados;
    if (this.asistirApuntado()) {
      rumbo = rumboAsistido(pos, rumbo, objetivos, {
        alcance: arma.range,
        cono: arma.aimAssist.cono,
        maxima: arma.aimAssist.maxima
      });
    }
    rumbo = dispersar(rumbo, arma.spreadDegrees, this.azar);

    const impacto = blancoDelRayo(pos, rumbo, objetivos, {
      alcance: arma.range,
      radioBlanco: arma.targetRadius,
      rayo: this.rayo,
      alturaTiro: arma.shotHeight
    });

    /*
     * El trazado se avisa SIEMPRE, acierte o no. Es lo unico que le dice
     * al jugador por donde paso la bala, y por lo tanto lo unico que le
     * permite corregir. Un disparo sin trazado que falla no enseña nada.
     */
    this.alDisparar?.({
      arma: arma.id,
      desde: { x: pos.x, z: pos.z },
      hasta: { x: impacto.x, z: impacto.z },
      rumbo,
      altura: arma.shotHeight,
      acerto: !!impacto.objetivo,
      pared: impacto.pared,
      distancia: impacto.distancia
    });

    if (impacto.objetivo) {
      const q = impacto.objetivo.posicion;
      const dx = q.x - pos.x;
      const dz = q.z - pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.alGolpear?.({
        objetivo: impacto.objetivo,
        daño: arma.damage,
        arma: arma.id,
        dirX: dx / d,
        dirZ: dz / d
      });
    } else {
      this.alFallar?.({ arma: arma.id, x: pos.x, z: pos.z, rumbo });
    }

    /*
     * El ruido sale IGUAL si el tiro falla. Es el corazon de la mecanica:
     * lo que atrae a los zombis es el estruendo, no el acierto. Un jugador
     * que erra y se queda sin saber por que vino la horda aprendio algo
     * importante sobre disparar.
     */
    if (arma.noiseRadius > 0) {
      this.alHacerRuido?.({ x: pos.x, z: pos.z, radio: arma.noiseRadius, arma: arma.id });
    }
  }
}
