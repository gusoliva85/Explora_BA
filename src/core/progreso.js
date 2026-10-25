/**
 * ===========================================================================
 * ESTADISTICAS DE PARTIDA Y PROGRESO GUARDADO
 * ===========================================================================
 * Dos cosas con vidas distintas, y conviene no confundirlas:
 *
 * - **`Estadisticas`** dura lo que dura un intento. Se reinicia con la
 *   misión y alimenta las pantallas de victoria y derrota.
 * - **`Progreso`** sobrevive a cerrar la pestaña (D-14): el mejor tiempo y
 *   hasta dónde se llegó. Es lo único que convierte una serie de intentos
 *   en algo que avanza.
 *
 * ---------------------------------------------------------------------------
 * POR QUE LAS ESTADISTICAS NO SON SOLO NUMEROS
 * ---------------------------------------------------------------------------
 * Una pantalla de victoria que dice "ganaste" no enseña nada. Una que dice
 * "11:42, 14 zombis, 38 de vida" le cuenta al jugador CÓMO ganó, y eso es
 * lo que hace que quiera volver a intentarlo distinto: más rápido, o más
 * entero, o sin disparar.
 *
 * Por eso se cuentan cosas que el jugador puede cambiar con su manera de
 * jugar, y no cosas que simplemente pasan.
 */

export class Estadisticas {
  constructor() {
    this.reiniciar();
  }

  reiniciar() {
    this.tiempo = 0;
    this.zombisEliminados = 0;
    this.disparos = 0;
    this.golpesRecibidos = 0;
    this.dañoRecibido = 0;
    this.botiquinesUsados = 0;
    this.muertes = 0;
    this.controles = 0;
    this.bazookasUsadas = 0;
  }

  /**
   * Avanza el reloj.
   *
   * Lo llama el bucle solo mientras se está jugando: en pausa y en las
   * pantallas de resultado la simulación está congelada, y un cronómetro
   * que corre durante la pausa convertiría el mejor tiempo en una medida
   * de cuánto tardaste en leer la pantalla.
   */
  update(dt) {
    this.tiempo += dt;
  }

  /**
   * Un resumen listo para mostrar.
   *
   * @returns {{tiempo:number, zombis:number, vida:number, precision:number|null}}
   */
  resumen(vidaRestante) {
    return {
      tiempo: this.tiempo,
      zombis: this.zombisEliminados,
      vida: Math.max(0, Math.round(vidaRestante)),
      golpes: this.golpesRecibidos,
      muertes: this.muertes,
      disparos: this.disparos,
      /*
       * La puntería se devuelve como `null` y no como 0 cuando no se
       * disparó. Un "0 %" al lado de "0 disparos" acusa al jugador de
       * errar todos los tiros que no hizo; y pasar la misión sin disparar
       * es justamente una de las formas buenas de jugarla.
       */
      precision: this.disparos > 0 ? this.zombisEliminados / this.disparos : null
    };
  }
}

/** Formatea segundos como m:ss. */
export function formatearTiempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const CLAVE = 'explorarba.progreso';

/**
 * Lo que sobrevive a cerrar la pestaña.
 *
 * Igual que los ajustes, TODO el acceso a `localStorage` pasa por acá y va
 * envuelto: en una ventana privada tira excepción al escribir, con las
 * cookies bloqueadas lanza al leer, y en una captura automatizada puede
 * volver vacío. Quien pregunta siempre recibe un valor válido, aunque el
 * navegador no colabore.
 */
export class Progreso {
  /**
   * @param {Storage|null} [almacen] se inyecta para poder probarlo sin
   *   navegador, y para poder simular uno que falla.
   */
  constructor(almacen = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.almacen = almacen;
    this.datos = this.#leer();
  }

  #leer() {
    const vacio = { mejorTiempo: null, mejorControl: 0, partidas: 0, victorias: 0 };
    try {
      const crudo = this.almacen?.getItem(CLAVE);
      if (!crudo) return vacio;
      const datos = JSON.parse(crudo);
      /*
       * Se valida campo por campo en vez de confiar en lo guardado.
       * `localStorage` lo puede haber escrito una version vieja del juego,
       * o directamente otra cosa: un dato con forma inesperada no tiene
       * que poder romper la pantalla de victoria.
       */
      return {
        mejorTiempo:
          typeof datos.mejorTiempo === 'number' && datos.mejorTiempo > 0
            ? datos.mejorTiempo
            : null,
        mejorControl: Number.isInteger(datos.mejorControl) ? datos.mejorControl : 0,
        partidas: Number.isInteger(datos.partidas) ? datos.partidas : 0,
        victorias: Number.isInteger(datos.victorias) ? datos.victorias : 0
      };
    } catch {
      return vacio;
    }
  }

  #guardar() {
    try {
      this.almacen?.setItem(CLAVE, JSON.stringify(this.datos));
      return true;
    } catch {
      // Sin almacenamiento el juego funciona igual; solo no recuerda.
      return false;
    }
  }

  get mejorTiempo() {
    return this.datos.mejorTiempo;
  }

  get mejorControl() {
    return this.datos.mejorControl;
  }

  get partidas() {
    return this.datos.partidas;
  }

  get victorias() {
    return this.datos.victorias;
  }

  contarPartida() {
    this.datos.partidas++;
    this.#guardar();
  }

  /**
   * Registra hasta dónde se llegó. Solo sube, nunca baja: lo que interesa
   * es lo más lejos que se llegó alguna vez, no dónde terminó el último
   * intento.
   */
  registrarControl(indice) {
    if (indice > this.datos.mejorControl) {
      this.datos.mejorControl = indice;
      this.#guardar();
    }
  }

  /**
   * Registra una victoria.
   *
   * @returns {boolean} true si es un récord
   */
  registrarVictoria(tiempo) {
    this.datos.victorias++;
    const esRecord = this.datos.mejorTiempo === null || tiempo < this.datos.mejorTiempo;
    if (esRecord) this.datos.mejorTiempo = tiempo;
    this.#guardar();
    return esRecord;
  }

  /** Borra todo. Lo usa el menú de ajustes y las pruebas. */
  borrar() {
    this.datos = { mejorTiempo: null, mejorControl: 0, partidas: 0, victorias: 0 };
    try {
      this.almacen?.removeItem(CLAVE);
    } catch {
      /* da igual: el objeto en memoria ya quedó limpio */
    }
  }
}
