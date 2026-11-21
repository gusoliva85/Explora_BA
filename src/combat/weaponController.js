import { WEAPONS } from '../config/balance.js';
import { blancoDelRayo } from './ballistics.js';
import { proyectilesDeRafaga } from './rafaga.js';

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
     * Habia dos cosas mas aca y se fueron en la 17.3 bis (D-36): `azar`, el
     * generador con semilla, y `asistirApuntado`.
     *
     * El `azar` por omision devolvia siempre el centro —cero dispersion—
     * para que una prueba que no pasara generador obtuviera un disparo
     * perfecto y repetible. **Ahora todos los disparos son asi, siempre**,
     * y el truco de las pruebas paso a ser la regla del juego.
     */
    this.rayo = opt.rayo;

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
      this.#resolverRafaga(pos, rumboGrados, objetivos);
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
   * ---------------------------------------------------------------------
   * EL TIRO NO FALLA POR AZAR (D-36, Fase 17.3 bis)
   * ---------------------------------------------------------------------
   * Habia tres pasos y queda uno. El rumbo pasaba primero por el apuntado
   * asistido —que corregia el temblor del pulgar— y despues por la
   * dispersion, en ese orden y no al reves, porque si la asistencia venia
   * segunda podia cancelar la dispersion y el arma se volvia un puntero
   * perfecto en cuanto hubiera un zombi cerca del centro.
   *
   * Los dos se fueron con el combate automatico. **El jugador ya no
   * apunta**, asi que no hay temblor que perdonar ni merito que quitarle a
   * un acierto: lo unico que decide es si hay algo fisico en el medio, y
   * eso lo resuelve el rayo.
   *
   * El rumbo que entra es el que sale.
   */
  /**
   * Una rafaga: todos los proyectiles de un disparo (D-44).
   *
   * Hoy son uno, y el bucle da una sola vuelta. Ver `combat/rafaga.js`, que
   * explica por que se escribe asi desde el primer dia.
   *
   * -------------------------------------------------------------------------
   * EL RUIDO ES UNO POR RAFAGA, NO UNO POR PROYECTIL
   * -------------------------------------------------------------------------
   * Se decide aca y conviene que quede escrito antes de que importe. **Es
   * un disparo, no diez**: lo que suena es el arma, no cada bala.
   *
   * Y tiene consecuencia de balance: con las cartas acumuladas de la 19B,
   * un ruido por proyectil haria que una rafaga tardia —dieciseis
   * impactos— despertara literalmente a todo el mapa, y el jugador no
   * tendria forma de relacionar una cosa con la otra.
   */
  #resolverRafaga(pos, rumboGrados, objetivos = []) {
    const arma = this.arma;

    for (const p of proyectilesDeRafaga(arma)) {
      /*
       * Hoy todos los proyectiles se resuelven como rayo, porque hoy hay
       * **uno solo** y es el apuntado.
       *
       * Los `tipo: 'proyectil'` —que vuelan y pueden errar— no estan
       * implementados a proposito: con `carriles: 1` no existe ninguno, y
       * un sistema de proyectiles con cero proyectiles seria codigo que no
       * se puede probar jugando, que es justo lo que la Fase 16 estuvo
       * ocho tareas borrando. Llegan con la primera carta que produzca un
       * segundo proyectil (19B).
       *
       * Lo que si esta decidido y escrito es **cual es cual**: el indice 0
       * es el tiro apuntado y no falla (D-36); el resto vuela.
       */
      this.#resolverProyectil(pos, rumboGrados + p.desvio, objetivos);
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

  /** Un proyectil de la rafaga, resuelto como rayo instantaneo. */
  #resolverProyectil(pos, rumbo, objetivos) {
    const arma = this.arma;

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
  }
}
