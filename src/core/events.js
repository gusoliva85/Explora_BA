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
  /**
   * Un ruido salio al mundo.
   *
   * ⚠️ **Lo emite `spawnManager`, y hoy NO lo escucha nadie.** Queda, y
   * queda a proposito, con fecha: **lo va a consumir la Fase 11 (audio)**,
   * que es exactamente un sistema que necesita enterarse de cada estruendo
   * con su posicion y su alcance.
   *
   * Se revisa la 16.6, donde se borro `INTERACT_AVAILABLE` justamente por
   * ser un evento sin emisor ni oyente. La diferencia es que aquel no tenia
   * a quien esperar —el sistema que lo iba a usar se habia borrado— y este
   * espera a una fase que esta en el plan. Si la 11 pasa y nadie lo
   * escucha, se borra.
   */
  NOISE_EMITTED: 'world:noise',

  /**
   * Un control de la esclusa abrio (19A.10, D-37).
   *
   * Lleva el numero de control. Existe para que **las cartas de la 19B se
   * enchufen sin tocar nada de la esclusa**: tomar una carta pasa a ser
   * escuchar este evento, y la esclusa no se entera de que existen las
   * cartas.
   *
   * Es el mismo criterio que `NOISE_EMITTED`, con una diferencia que vale
   * la pena: aquel espera a la Fase 11 y este a la 19B, que es la que
   * sigue. Si la 19B pasa y nadie lo escucha, se borra.
   */
  CONTROL_ABIERTO: 'mission:controlAbierto'
  /*
   * Habia un `INTERACT_AVAILABLE: 'player:interactAvailable'`, y se fue en
   * la Fase 16.6. No lo emitia nadie y no lo escuchaba nadie: era el aviso
   * de "hay algo que podes levantar", y lo que podia levantarse se borro en
   * la 16.1 con los items.
   */
};
