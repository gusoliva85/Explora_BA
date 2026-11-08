import { State } from '../core/gameState.js';
import { EV } from '../core/events.js';
import { PLAYER } from '../config/balance.js';
import { device } from '../core/device.js';

/**
 * Interfaz en DOM sobre el canvas.
 *
 * El HUD no conoce al jugador ni a la mision: escucha eventos del bus y
 * muestra pantallas segun el estado. Eso permite rediseñar la interfaz sin
 * tocar una linea de logica de juego.
 */
export class Hud {
  /**
   * @param {import('../core/events.js').EventBus} bus
   * @param {import('../core/gameState.js').GameStateMachine} state
   */

  constructor(bus, state) {
    this.bus = bus;
    this.state = state;

    this.el = {
      screens: {
        [State.BOOT]: document.getElementById('screen-boot'),
        [State.MENU]: document.getElementById('screen-boot'),
        [State.LOADING]: document.getElementById('screen-loading'),
        [State.PAUSED]: document.getElementById('screen-paused'),
        [State.MISSION_COMPLETE]: document.getElementById('screen-complete'),
        [State.GAME_OVER]: document.getElementById('screen-gameover')
      },
      hud: document.getElementById('screen-hud'),
      healthFill: document.getElementById('health-fill'),
      healthText: document.getElementById('health-text'),
      objective: document.getElementById('objective'),
      joystick: document.getElementById('joystick'),
      joystickKnob: document.getElementById('joystick-knob'),
      completeDetail: document.getElementById('complete-detail'),
      gameoverDetail: document.getElementById('gameover-detail'),
      marcadorWin: document.getElementById('marcador-win'),
      marcadorLose: document.getElementById('marcador-lose'),
      record: document.getElementById('record'),
      loadingBar: document.getElementById('loading-bar'),
      bar: document.querySelector('.bar-health'),
      brujula: document.getElementById('brujula'),
      brujulaFlecha: document.getElementById('brujula-flecha'),
      brujulaTexto: document.getElementById('brujula-texto'),
      dano: document.getElementById('dano'),
      armaCaja: document.getElementById('arma-caja'),
      armaNombre: document.getElementById('arma-nombre'),
      btnAttack: document.getElementById('btn-attack')
    };

    // Si el dispositivo cambia de modo (girar, conectar un mouse, forzarlo
    // para probar), el HUD se redibuja sin recargar la pagina.
    device.onChange(() => {
      this.#showForState(this.state.current);
      this.#checkOrientation();
    });

    bus.on(EV.STATE_CHANGED, ({ to }) => this.#showForState(to));
    bus.on(EV.PLAYER_DAMAGED, ({ health }) => {
      this.setHealth(health);
      this.destelloDano();
    });
    bus.on(EV.PLAYER_HEALED, ({ health }) => this.setHealth(health));
    bus.on(EV.OBJECTIVE_CHANGED, ({ text }) => this.setObjective(text));
    bus.on(EV.CHECKPOINT_REACHED, ({ label }) => this.flash(label));
    /*
     * El subtitulo de la victoria NO repite el tiempo: el marcador ya lo
     * dice, mas grande y acompañado del resto. Repetirlo obligaba a tener
     * dos relojes, y los dos relojes terminaron mostrando numeros
     * distintos en la misma pantalla.
     *
     * Lo que dice es a donde se llego, que es lo unico que el marcador no
     * cuenta y lo que cierra la mision como historia.
     */
    bus.on(EV.MISSION_COMPLETE, () => {
      this.el.completeDetail.textContent = 'Llegaste a Billinghurst 240.';
    });

    addEventListener('resize', () => this.#checkOrientation());
    this.#checkOrientation();
  }

  #showForState(state) {
    for (const s of new Set(Object.values(this.el.screens))) s.classList.add('hidden');
    const screen = this.el.screens[state];
    if (screen) screen.classList.remove('hidden');

    // El HUD se mantiene visible detras de pausa y resultados: ver la vida
    // con la que terminaste es informacion util.
    const showHud = [State.PLAYING, State.PAUSED, State.MISSION_COMPLETE, State.GAME_OVER].includes(state);
    this.el.hud.classList.toggle('hidden', !showHud);
    this.el.joystick.classList.toggle('hidden', !(device.isTouch && state === State.PLAYING));
  }

  /** @deprecated usar `device.isTouch`. Se mantiene por compatibilidad. */
  get isTouch() {
    return device.isTouch;
  }

  /**
   * Arma equipada.
   *
   * Hasta la Fase 16.2 mostraba tambien el cargador y la reserva, con tres
   * niveles de aviso: lleno, poca y vacio. El momento interesante era el de
   * "me quedan tres balas", cuando se podia elegir entre tirar o guardar y
   * pasar al cuchillo. Ya no hay municion que contar (D-29) ni cuchillo al
   * que pasar, asi que lo unico que queda es el nombre.
   *
   * @param {{nombre:string, gastaMunicion:boolean}} info
   */
  setArma(info) {
    if (!this.el.armaCaja) return;
    this.el.armaNombre.textContent = info.nombre.toUpperCase();

    /*
     * El boton grande dice lo que hace AHORA.
     *
     * Con la pistola en la mano, un boton que dice ATACAR sugiere cuerpo a
     * cuerpo, que es justo la decision contraria. El boton es lo unico que
     * se mira antes de apretar, asi que tiene que decir cual de las dos
     * cosas va a pasar.
     */
    if (this.el.btnAttack) {
      this.el.btnAttack.textContent = info.gastaMunicion ? 'DISPARAR' : 'ATACAR';
      this.el.btnAttack.classList.toggle('btn-disparar', info.gastaMunicion);
    }
  }

  setHealth(value) {
    const pct = Math.max(0, Math.min(100, (value / PLAYER.maxHealth) * 100));
    this.el.healthFill.style.width = `${pct}%`;
    this.el.healthText.textContent = String(Math.ceil(value));

    // Por debajo de un tercio la barra late y el numero se pone rojo. Es
    // informacion: en plena corrida nadie lee un numero chico.
    const critico = pct <= 33;
    this.el.bar?.classList.toggle('critica', critico);
    this.el.healthText.classList.toggle('critico', critico);
  }

  /**
   * Destello rojo al recibir un golpe.
   *
   * Se reinicia la animacion a mano quitando la clase y forzando un
   * reflujo: si llegan dos golpes seguidos, sin esto el segundo no se
   * veria porque la animacion ya estaria corriendo.
   */
  destelloDano() {
    const el = this.el.dano;
    if (!el) return;
    el.classList.remove('activo');
    void el.offsetWidth;
    el.classList.add('activo');
  }

  /**
   * Brujula hacia el objetivo.
   *
   * Con la calle poblada de autos, arboles y barricadas, el marcador del
   * piso deja de verse desde lejos. La flecha resuelve la pregunta que el
   * jugador se hace todo el tiempo: hacia donde sigo.
   *
   * El angulo es RELATIVO a la camara, no absoluto: la flecha tiene que
   * apuntar a donde el jugador ve, no al norte.
   *
   * @param {number} anguloGrados 0 = hacia arriba de la pantalla
   * @param {number} distancia en metros
   */
  setBrujula(anguloGrados, distancia) {
    if (!this.el.brujulaFlecha) return;
    this.el.brujulaFlecha.style.transform = `rotate(${anguloGrados.toFixed(1)}deg)`;
    this.el.brujulaTexto.textContent = `${Math.round(distancia)} m`;
  }

  mostrarBrujula(visible) {
    this.el.brujula?.classList.toggle('hidden', !visible);
  }

  setObjective(text) {
    const el = this.el.objective;
    const nuevo = `Objetivo: ${text}`;
    if (el.textContent === nuevo) return;
    el.textContent = nuevo;
    // Reinicio de la animacion de entrada, igual que con el daño.
    el.classList.remove('nuevo');
    void el.offsetWidth;
    el.classList.add('nuevo');
  }

  /**
   * Llena el marcador de fin de partida.
   *
   * @param {'win'|'lose'} cual
   * @param {Array<{etiqueta:string, valor:string, principal?:boolean}>} filas
   */
  setMarcador(cual, filas) {
    const dl = cual === 'win' ? this.el.marcadorWin : this.el.marcadorLose;
    if (!dl) return;

    /*
     * Se arma con `textContent` fila por fila y no con una plantilla de
     * HTML. Son pocos elementos y asi ningun texto —el nombre de un
     * objetivo, un motivo de muerte— puede inyectar marcado.
     */
    dl.replaceChildren();
    for (const fila of filas) {
      const dt = document.createElement('dt');
      dt.textContent = fila.etiqueta;
      const dd = document.createElement('dd');
      dd.textContent = fila.valor;
      if (fila.principal) dd.classList.add('principal');
      dl.append(dt, dd);
    }
  }

  /** Muestra u oculta el cartel de record. */
  setRecord(visible) {
    this.el.record?.classList.toggle('hidden', !visible);
  }

  setGameOverReason(text) {
    this.el.gameoverDetail.textContent = text;
  }

  setLoadingProgress(pct) {
    this.el.loadingBar.style.width = `${Math.round(pct * 100)}%`;
  }

  /** Mensaje breve en la linea de objetivo. */
  flash(text, ms = 2200) {
    const prev = this.el.objective.textContent;
    this.el.objective.textContent = text;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      if (this.el.objective.textContent === text) this.el.objective.textContent = prev;
    }, ms);
  }

  /** Dibuja el joystick donde el jugador apoyo el dedo. */
  updateJoystick(visual) {
    if (!device.isTouch) return;
    const j = this.el.joystick;
    if (!visual) {
      j.style.opacity = '0.35';
      this.el.joystickKnob.style.transform = 'translate(0px, 0px)';
      return;
    }
    j.style.opacity = '1';
    j.style.left = `${visual.baseX - 66}px`;
    j.style.top = `${visual.baseY - 66}px`;
    j.style.position = 'fixed';
    j.style.bottom = 'auto';
    this.el.joystickKnob.style.transform = `translate(${visual.knobX}px, ${visual.knobY}px)`;
  }

  #checkOrientation() {
    // El juego se diseña para vertical (D-15) y funciona igual en
    // horizontal, asi que no hay nada que avisar. El metodo se conserva
    // porque el HUD si tiene que reacomodarse al girar, cosa que hace el
    // CSS a traves de la clase `is-portrait` que pone `device`.
  }
}
