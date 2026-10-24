/**
 * Bus de eventos minimo.
 *
 * Los sistemas (jugador, IA, mision, HUD, audio) se comunican por aca en vez
 * de guardarse referencias entre si. Eso permite agregar o sacar un sistema
 * sin tocar los demas, y sobre todo probar cada uno por separado.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /** Suscribe `fn` a `name`. Devuelve una funcion para desuscribir. */
  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    this.listeners.get(name)?.delete(fn);
  }

  emit(name, payload) {
    const set = this.listeners.get(name);
    if (!set) return;
    // Se copia antes de iterar: un handler puede desuscribirse a si mismo.
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[events] error en handler de "${name}"`, err);
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

/** Nombres de evento centralizados para evitar strings sueltos con typos. */
export const EV = {
  STATE_CHANGED: 'state:changed',
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_HEALED: 'player:healed',
  PLAYER_DIED: 'player:died',
  CHECKPOINT_REACHED: 'mission:checkpoint',
  MISSION_COMPLETE: 'mission:complete',
  OBJECTIVE_CHANGED: 'mission:objective',
  NOISE_EMITTED: 'world:noise',
  INTERACT_AVAILABLE: 'player:interactAvailable'
};
