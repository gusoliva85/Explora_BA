/**
 * ===========================================================================
 * SALUD
 * ===========================================================================
 * Un componente que no sabe nada de quien lo lleva. Lo usan Gus y los
 * zombis, y mas adelante lo van a usar las barricadas destructibles.
 *
 * Toda la logica de "puede recibir daño ahora" vive aca y en ningun otro
 * lado. Es la clase de regla que, si se reparte, termina con un enemigo que
 * sigue golpeando en la pantalla de victoria.
 */
export class Health {
  /**
   * @param {number} maximo
   * @param {object} [opt]
   * @param {number} [opt.invulnerabilidad] segundos de gracia tras un golpe
   * @param {(info: object) => void} [opt.alRecibirDaño]
   * @param {(info: object) => void} [opt.alMorir]
   */
  constructor(maximo, opt = {}) {
    this.maximo = maximo;
    this.actual = maximo;
    this.invulnerabilidad = opt.invulnerabilidad ?? 0;
    this.restanteInvulnerable = 0;
    this.alRecibirDaño = opt.alRecibirDaño;
    this.alMorir = opt.alMorir;
  }

  get vivo() {
    return this.actual > 0;
  }

  /** Fraccion de 0 a 1. Lo usa el HUD y lo usa la IA para decidir. */
  get fraccion() {
    return this.maximo > 0 ? this.actual / this.maximo : 0;
  }

  update(dt) {
    if (this.restanteInvulnerable > 0) this.restanteInvulnerable -= dt;
  }

  /**
   * Aplica daño.
   *
   * @param {number} cantidad
   * @param {object} [info] de donde vino: arma, atacante, direccion
   * @returns {boolean} true si el daño se aplico de verdad
   */
  recibirDaño(cantidad, info = {}) {
    if (!this.vivo || this.restanteInvulnerable > 0 || cantidad <= 0) return false;

    this.actual = Math.max(0, this.actual - cantidad);
    this.restanteInvulnerable = this.invulnerabilidad;

    const evento = { ...info, cantidad, actual: this.actual, fraccion: this.fraccion };
    this.alRecibirDaño?.(evento);
    if (!this.vivo) this.alMorir?.(evento);
    return true;
  }

  /** @returns {number} cuanto curo de verdad. */
  curar(cantidad) {
    if (!this.vivo || cantidad <= 0) return 0;
    const antes = this.actual;
    this.actual = Math.min(this.maximo, this.actual + cantidad);
    return this.actual - antes;
  }

  /** Vuelve a la vida con la salud llena. Lo usa el reciclado de zombis. */
  reiniciar(maximo = this.maximo) {
    this.maximo = maximo;
    this.actual = maximo;
    this.restanteInvulnerable = 0;
  }
}
