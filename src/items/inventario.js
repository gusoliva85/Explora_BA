/**
 * ===========================================================================
 * INVENTARIO Y USO DE OBJETOS
 * ===========================================================================
 * Lo que el jugador lleva encima, y qué pasa mientras lo usa.
 *
 * ---------------------------------------------------------------------------
 * POR QUE CURARSE LLEVA TIEMPO
 * ---------------------------------------------------------------------------
 * Un botiquín que cura al apretar un botón no es una decisión: es un
 * segundo medidor de vida. Si curarse es gratis e instantáneo, la respuesta
 * correcta a estar herido es siempre "curarse ya", y no hay nada que
 * pensar.
 *
 * Con tiempo de uso, la pregunta cambia a **cuándo**. Curarse con tres
 * zombis encima pasa a ser una mala idea; alejarse primero, perdiendo
 * terreno, pasa a ser una opción con costo. Eso es lo que convierte un
 * recurso en una decisión.
 *
 * ---------------------------------------------------------------------------
 * PARA CURARSE HAY QUE PARAR
 * ---------------------------------------------------------------------------
 * Moverse cancela el uso, y recibir un golpe también.
 *
 * Sin la regla de moverse, curarse mientras se corre sería gratis: el
 * tiempo de uso no costaría nada porque se gastaría haciendo lo que uno
 * iba a hacer igual. Teniendo que frenar, el costo es terreno y distancia,
 * que es exactamente la moneda de este juego.
 *
 * El objeto NO se gasta si el uso se cancela. Perder el botiquín además de
 * los 1,2 segundos sería castigar dos veces el mismo error, y llevaría a
 * que nadie se anime a usarlo nunca, que es lo contrario de lo que se
 * busca.
 */

/** Por qué se interrumpió un uso. Lo lee el HUD para decir algo útil. */
export const MotivoCancelacion = {
  GOLPE: 'golpe',
  MOVIMIENTO: 'movimiento',
  MANUAL: 'manual'
};

export class Inventario {
  /**
   * @param {Record<string, {maxCarried:number}>} definiciones de `ITEMS`
   */
  constructor(definiciones) {
    this.definiciones = definiciones;
    /** @type {Record<string, number>} */
    this.cantidades = {};
    for (const clave of Object.keys(definiciones)) this.cantidades[clave] = 0;
  }

  cuantos(clave) {
    return this.cantidades[clave] ?? 0;
  }

  tope(clave) {
    return this.definiciones[clave]?.maxCarried ?? 0;
  }

  lleno(clave) {
    return this.cuantos(clave) >= this.tope(clave);
  }

  /**
   * Guarda objetos, hasta el tope.
   *
   * @returns {number} cuántos entraron de verdad. Puede ser menos de los
   *   pedidos, o cero: quien llama decide qué hacer con el resto.
   */
  agregar(clave, cantidad = 1) {
    if (this.cantidades[clave] === undefined) return 0;
    const lugar = this.tope(clave) - this.cantidades[clave];
    const entran = Math.max(0, Math.min(cantidad, lugar));
    this.cantidades[clave] += entran;
    return entran;
  }

  /** Saca uno. @returns {boolean} true si había. */
  quitar(clave) {
    if (this.cuantos(clave) <= 0) return false;
    this.cantidades[clave]--;
    return true;
  }

  vaciar() {
    for (const clave of Object.keys(this.cantidades)) this.cantidades[clave] = 0;
  }
}

/**
 * El uso de un objeto, que lleva tiempo y se puede interrumpir.
 *
 * Es una máquina de estados mínima y pura: no sabe de vida, de inventario
 * ni de motor. Quien la usa le dice cuándo empezar y qué pasó; ella avisa
 * cuando se completó o se cortó.
 */
export class UsoDeObjeto {
  /**
   * @param {object} [opt]
   * @param {(info:object) => void} [opt.alCompletar]
   * @param {(info:object) => void} [opt.alCancelar]
   */
  constructor(opt = {}) {
    /** @type {string|null} */
    this.clave = null;
    this.restante = 0;
    this.duracion = 0;
    this.alCompletar = opt.alCompletar;
    this.alCancelar = opt.alCancelar;
  }

  get enCurso() {
    return this.clave !== null;
  }

  /** Fracción de 0 a 1 de lo que lleva hecho. Para la barra del HUD. */
  get progreso() {
    if (!this.enCurso || this.duracion <= 0) return 0;
    return 1 - this.restante / this.duracion;
  }

  /**
   * @param {string} clave
   * @param {number} duracion segundos
   * @returns {boolean} true si arrancó
   */
  iniciar(clave, duracion) {
    if (this.enCurso) return false;
    this.clave = clave;
    this.duracion = duracion;
    this.restante = duracion;
    return true;
  }

  /**
   * @param {number} dt
   * @param {object} [situacion]
   * @param {boolean} [situacion.moviendose]
   * @returns {boolean} true si el uso se completó en este cuadro
   */
  update(dt, situacion = {}) {
    if (!this.enCurso) return false;

    if (situacion.moviendose) {
      this.cancelar(MotivoCancelacion.MOVIMIENTO);
      return false;
    }

    this.restante -= dt;
    if (this.restante > 0) return false;

    const clave = this.clave;
    this.clave = null;
    this.restante = 0;
    this.alCompletar?.({ clave });
    return true;
  }

  /** Corta el uso. El objeto NO se gasta. */
  cancelar(motivo = MotivoCancelacion.MANUAL) {
    if (!this.enCurso) return false;
    const clave = this.clave;
    this.clave = null;
    this.restante = 0;
    this.alCancelar?.({ clave, motivo });
    return true;
  }
}
