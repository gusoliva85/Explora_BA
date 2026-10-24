import { EV } from './events.js';

/** Estados de partida. Coinciden con los del documento 01, seccion 10. */
export const State = {
  BOOT: 'BOOT',
  MENU: 'MENU',
  LOADING: 'LOADING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  MISSION_COMPLETE: 'MISSION_COMPLETE',
  GAME_OVER: 'GAME_OVER'
};

/**
 * Transiciones validas. Una maquina explicita evita bugs tipicos: recibir
 * daño en la pantalla de victoria, pausar estando muerto, o reiniciar dos
 * veces y duplicar enemigos.
 */
const TRANSITIONS = {
  [State.BOOT]: [State.MENU, State.LOADING],
  [State.MENU]: [State.LOADING],
  [State.LOADING]: [State.PLAYING, State.MENU],
  [State.PLAYING]: [State.PAUSED, State.MISSION_COMPLETE, State.GAME_OVER],
  [State.PAUSED]: [State.PLAYING, State.LOADING, State.MENU],
  [State.MISSION_COMPLETE]: [State.LOADING, State.MENU],
  [State.GAME_OVER]: [State.LOADING, State.MENU]
};

export class GameStateMachine {
  /** @param {import('./events.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
    this.current = State.BOOT;
    this.previous = null;
  }

  canGoTo(next) {
    return (TRANSITIONS[this.current] ?? []).includes(next);
  }

  /** @returns {boolean} true si la transicion se aplico. */
  set(next) {
    if (next === this.current) return false;
    if (!this.canGoTo(next)) {
      console.warn(`[state] transicion invalida ${this.current} -> ${next}`);
      return false;
    }
    this.previous = this.current;
    this.current = next;
    this.bus.emit(EV.STATE_CHANGED, { from: this.previous, to: next });
    return true;
  }

  /** Solo en PLAYING corre la simulacion (fisica, IA, daño, timers). */
  get isSimulating() {
    return this.current === State.PLAYING;
  }
}
