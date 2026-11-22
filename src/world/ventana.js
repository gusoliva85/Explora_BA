/**
 * ===========================================================================
 * LA VENTANA — que cuadras estan en pie, y cuales se sueltan
 * ===========================================================================
 * La ciudad no se construye entera: se construye una ventana de cuadras
 * alrededor del jugador, y lo que queda atras se suelta (D-42, D-47).
 *
 * ---------------------------------------------------------------------------
 * NO ES UNA OPTIMIZACION, ES LA UNICA FORMA DE QUE ABRA
 * ---------------------------------------------------------------------------
 * La ciudad es el 86 % de las mallas del juego y **lo unico que crece con
 * los metros**. Las dieciseis cuadras de D-46 proyectan unas 12.700
 * entidades y ~1.100 llamadas de dibujo contra un presupuesto de 150. No es
 * que ande lento: no abre.
 *
 * ---------------------------------------------------------------------------
 * CUATRO CUADRAS, Y POR QUE NO TRES
 * ---------------------------------------------------------------------------
 * La ventana es: **la ultima del tramo anterior, las dos del tramo actual, y
 * la primera del siguiente.**
 *
 * Con tramos de dos cuadras (D-46: siete puertas, una cada dos cuadras), una
 * ventana de tres no alcanza. Al entrar a un tramo, el jugador esta parado
 * en la primera de sus dos cuadras y ya ve hasta el fondo de la segunda: si
 * la del tramo siguiente no estuviera, veria el borde del mapa desde el
 * primer paso.
 *
 * La de atras existe por el motivo contrario: al cruzar la puerta, la cuadra
 * que uno acaba de dejar sigue en el campo de vision por unos segundos. Sin
 * ella, el mundo se borraria a espaldas del jugador de una manera que se ve.
 *
 * ---------------------------------------------------------------------------
 * EL DISPARADOR ES UN EVENTO, NO UNA DISTANCIA
 * ---------------------------------------------------------------------------
 * La ventana se mueve cuando el jugador **cruza una puerta**, que es un
 * hecho del juego, no cuando se acerca a una distancia inventada.
 *
 * Y con la esclusa (D-37) el recorrido es **de ida**: la puerta se cierra a
 * tus espaldas, asi que no se vuelve. Eso quita de un plumazo el problema
 * clasico de estos sistemas —la histeresis, el borde que titila cuando uno
 * camina de un lado a otro del limite— porque no hay ida y vuelta posible.
 *
 * **La mecanica le simplifico la vida a la tecnica**, que es la misma
 * historia que la puerta corrediza contandole a la Fase 16 que la explosion
 * podia morir.
 */

/**
 * Las cuadras que tienen que estar en pie para un tramo dado.
 *
 * Logica pura: se le dice en que tramo esta el jugador y devuelve indices.
 * Nada de entidades, nada de motor — se prueba con numeros.
 *
 * @param {number} tramo indice del tramo actual, desde 0
 * @param {object} opt
 * @param {number} opt.cuadrasPorTramo cuantas cuadras tiene un tramo (D-46: 2)
 * @param {number} opt.totalCuadras cuantas cuadras tiene el recorrido
 * @returns {number[]} indices de cuadra, en orden
 */
export function cuadrasDeLaVentana(tramo, { cuadrasPorTramo, totalCuadras }) {
  const primera = tramo * cuadrasPorTramo;

  /*
   * Una antes y una despues del tramo. El `-1` y el `+1` son las dos
   * cuadras de colchon explicadas arriba: la que se acaba de dejar y la
   * que ya se ve de frente.
   */
  const desde = Math.max(0, primera - 1);
  const hasta = Math.min(totalCuadras - 1, primera + cuadrasPorTramo);

  const out = [];
  for (let i = desde; i <= hasta; i++) out.push(i);
  return out;
}

/**
 * Lleva la cuenta de que esta construido y decide que hacer en cada cuadro.
 *
 * No construye nada: **devuelve ordenes**. Quien la usa las ejecuta contra
 * el generador. Esa separacion es lo que permite probar la ventana entera
 * sin abrir un navegador, que es donde vive el 90 % de los errores de este
 * tipo de sistema.
 */
export class VentanaDeMundo {
  /**
   * @param {object} opt
   * @param {number} opt.cuadrasPorTramo
   * @param {number} opt.totalCuadras
   */
  constructor(opt) {
    this.cuadrasPorTramo = opt.cuadrasPorTramo;
    this.totalCuadras = opt.totalCuadras;

    /*
     * No hay `porCuadro`, y que no lo haya es la correccion de la 19C.4.
     *
     * Habia uno, con valor 1 por omision y la posibilidad de pedir mas.
     * Poder pedir mas **era el error**: una cuadra por cuadro no es una
     * preferencia que se pueda aflojar, es el unico ritmo al que esto no
     * se traba. Ahora lo garantiza la forma de `siguienteTarea`, que
     * devuelve una tarea y no una lista.
     */

    /** @type {Set<number>} las que estan construidas */
    this.enPie = new Set();
    /** @type {number[]} las que faltan construir, en orden de urgencia */
    this.pendientes = [];
    /**
     * @type {number[]} las que faltan soltar.
     *
     * Esta cola es la 19C.4 y existe por un error que Gus sintio jugando:
     * *"cuando pasas la puerta se traba todo el juego"*. Ver `siguienteTarea`.
     */
    this.porSoltar = [];
    this.tramo = 0;
  }

  /**
   * El jugador entro a un tramo. Recalcula que falta y que sobra.
   *
   * @returns {{construir:number[], soltar:number[]}} las ordenes
   */
  irAlTramo(tramo) {
    this.tramo = tramo;
    const quiero = cuadrasDeLaVentana(tramo, {
      cuadrasPorTramo: this.cuadrasPorTramo,
      totalCuadras: this.totalCuadras
    });

    const soltar = [...this.enPie].filter((i) => !quiero.includes(i));
    const construir = quiero.filter((i) => !this.enPie.has(i));

    /*
     * LAS DOS SE REPARTEN, Y SOLTAR VA PRIMERO.
     *
     * Soltar era inmediato, y ahi estaba el tiron (19C.4). El orden —
     * primero liberar y despues construir— sigue siendo el de siempre, y
     * sigue siendo por lo mismo: asi el pico de memoria es el de la
     * ventana, y no el de la ventana mas lo que sobra.
     *
     * Lo que cambia es que ahora liberar tambien hace cola.
     */
    this.porSoltar = soltar;
    this.pendientes = construir;
    return { construir, soltar };
  }

  /**
   * Lo que toca construir en ESTE cuadro.
   *
   * ---------------------------------------------------------------------------
   * LA PARTE QUE PUEDE SALIR MAL
   * ---------------------------------------------------------------------------
   * Repartir la construccion es lo que evita el tiron **y tambien lo que
   * puede dejar media ventana en pie** si el jugador cruza dos puertas
   * seguidas mas rapido de lo que se construye.
   *
   * Lo que impide que eso se vea es la cuadra de colchon: cuando el jugador
   * entra a un tramo, las dos cuadras que va a pisar ya estaban en pie
   * —fueron el colchon del tramo anterior o se construyeron durante el—, y
   * lo unico que queda pendiente es la de adelante, que esta a cien metros.
   *
   * O sea: **la ventana no es ancha por prolijidad, es ancha para que
   * repartir sea seguro.**
   *
   * @returns {number[]} indices a construir ahora
   */
  /**
   * UNA sola unidad de trabajo para este cuadro: soltar una cuadra, o
   * construir una. Nunca las dos, nunca varias.
   *
   * ---------------------------------------------------------------------------
   * 🐛 EL JUEGO QUE SE TRABABA AL CRUZAR LA PUERTA (19C.4)
   * ---------------------------------------------------------------------------
   * Gus lo describio asi: *"cuando pasas la puerta, se traba todo el
   * juego"*. Y era cierto y medible — dos cuadros seguidos de **851 ms y
   * 1546 ms** contra una base de 200, justo despues de tomar el control.
   *
   * El motivo es que todo el trabajo caia junto en ese instante. La
   * ventana ya repartia la CONSTRUCCION de a una cuadra por cuadro, que es
   * la mitad cara... pero **soltar era inmediato y sin tope**: al cambiar
   * de tramo se destruian dos cuadras enteras —entidades, mallas, grupo de
   * lote y cajas de colision— en el mismo cuadro en que empezaba a
   * construirse la primera nueva.
   *
   * Y el lugar donde pasaba era el peor posible. No es un tiron en
   * cualquier parte: es **el tiron en el momento exacto en que se cruza la
   * esclusa**, o sea cuando el jugador viene de pelear y tiene zombis
   * encima.
   *
   * La leccion general, que vale para cualquier cosa que se reparta entre
   * cuadros: **repartir la mitad no sirve de nada si la otra mitad sigue
   * cayendo junta, y encima en el mismo cuadro.**
   *
   * @returns {{tipo:'soltar'|'construir', indice:number}|null}
   */
  siguienteTarea() {
    if (this.porSoltar.length > 0) {
      const indice = this.porSoltar.shift();
      this.enPie.delete(indice);
      return { tipo: 'soltar', indice };
    }
    if (this.pendientes.length > 0) {
      const indice = this.pendientes.shift();
      this.enPie.add(indice);
      return { tipo: 'construir', indice };
    }
    return null;
  }

  /** ¿Queda algo por hacer? */
  get completa() {
    return this.pendientes.length === 0 && this.porSoltar.length === 0;
  }

  /** En que tramo cae una cuadra. */
  tramoDeCuadra(indice) {
    return Math.floor(indice / this.cuadrasPorTramo);
  }
}
