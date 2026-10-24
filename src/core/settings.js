/**
 * ===========================================================================
 * AJUSTES
 * ===========================================================================
 * Lo poco que el jugador elige y tiene que sobrevivir a cerrar la pestaña:
 * el esquema de controles y el perfil de calidad.
 *
 * Es la decision D-14: `localStorage` para ajustes, ultimo control y mejor
 * tiempo. Nada de cuentas ni de guardado en la nube.
 *
 * ---------------------------------------------------------------------------
 * POR QUE TODO PASA POR ACA
 * ---------------------------------------------------------------------------
 * `localStorage` puede fallar de maneras poco obvias: en una ventana
 * privada tira excepcion al escribir, con las cookies bloqueadas lanza al
 * leer, y en una captura automatizada puede volver vacio. Si cada modulo lo
 * tocara por su cuenta, cada uno tendria que acordarse de envolverlo en un
 * try. Concentrado en un solo lugar, el resto del juego pide un valor y
 * siempre recibe uno valido.
 *
 * ---------------------------------------------------------------------------
 * PRIORIDAD
 * ---------------------------------------------------------------------------
 *   1. Lo que diga la URL (`?input=touch`, `?calidad=alta`). Gana siempre:
 *      sirve para abrir un enlace con una configuracion concreta sin
 *      pisarle la preferencia al jugador.
 *   2. Lo que el jugador haya elegido y quedo guardado.
 *   3. El valor por omision.
 */

const CLAVE = 'explorarba.ajustes';

/** Esquemas de control. */
export const Controles = {
  TACTIL: 'touch',
  TECLADO: 'desktop'
};

/** Perfiles de calidad de imagen. */
export const Calidad = {
  NORMAL: 'normal',
  ALTA: 'alta'
};

/**
 * Valores por omision.
 *
 * Los controles arrancan en TACTIL a proposito. El juego se diseña para el
 * celular (D-15), y ahi es lo correcto. En la computadora no estorba: el
 * teclado y el mouse siguen funcionando igual, porque la capa de entrada
 * escucha las dos cosas siempre; lo unico que cambia es que se dibujan los
 * botones en pantalla.
 */
const POR_OMISION = {
  controles: Controles.TACTIL,
  calidad: Calidad.NORMAL
};

/** Valores que se aceptan para cada ajuste. */
const VALIDOS = {
  controles: Object.values(Controles),
  calidad: Object.values(Calidad)
};

/** Nombres viejos que todavia pueden estar guardados en algun telefono. */
const EQUIVALENCIAS = {
  movil: Calidad.NORMAL
};

function normalizar(clave, valor) {
  const v = EQUIVALENCIAS[valor] ?? valor;
  return VALIDOS[clave]?.includes(v) ? v : null;
}

class Ajustes {
  constructor() {
    this.valores = { ...POR_OMISION, ...this.#leerGuardado() };
    this.deLaUrl = this.#leerUrl();
    /** @type {Set<(clave:string, valor:any) => void>} */
    this.oyentes = new Set();
  }

  #leerGuardado() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return {};
      const datos = JSON.parse(crudo);
      const limpio = {};
      for (const [k, v] of Object.entries(datos)) {
        const n = normalizar(k, v);
        if (n !== null) limpio[k] = n;
      }
      return limpio;
    } catch {
      // Ventana privada, cookies bloqueadas o datos corruptos: se arranca
      // con los valores por omision y listo.
      return {};
    }
  }

  #leerUrl() {
    const p = new URLSearchParams(location.search);
    const out = {};
    const controles = normalizar('controles', p.get('input'));
    if (controles) out.controles = controles;
    const calidad = normalizar('calidad', p.get('calidad'));
    if (calidad) out.calidad = calidad;
    return out;
  }

  /** @returns {string} el valor efectivo, mirando la URL primero. */
  get(clave) {
    return this.deLaUrl[clave] ?? this.valores[clave] ?? POR_OMISION[clave];
  }

  /** @returns {boolean} true si este ajuste viene impuesto por la URL. */
  vieneDeLaUrl(clave) {
    return this.deLaUrl[clave] !== undefined;
  }

  /**
   * Cambia un ajuste y lo guarda.
   * @returns {boolean} true si el valor era valido y se aplico
   */
  set(clave, valor) {
    const n = normalizar(clave, valor);
    if (n === null || this.valores[clave] === n) return false;

    this.valores[clave] = n;
    // Lo elegido a mano le gana a la URL de ahora en mas: si no, tocar el
    // boton no haria nada visible y pareceria roto.
    delete this.deLaUrl[clave];

    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.valores));
    } catch {
      // No se pudo guardar. El cambio vale igual para esta sesion.
    }

    for (const fn of this.oyentes) {
      try {
        fn(clave, n);
      } catch (err) {
        console.error('[ajustes] error en un oyente', err);
      }
    }
    return true;
  }

  /** Alterna entre los dos valores posibles de un ajuste. */
  alternar(clave) {
    const opciones = VALIDOS[clave];
    const actual = this.get(clave);
    const i = opciones.indexOf(actual);
    this.set(clave, opciones[(i + 1) % opciones.length]);
    return this.get(clave);
  }

  /** @param {(clave:string, valor:any) => void} fn */
  alCambiar(fn) {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }
}

/** Instancia unica: los ajustes son uno solo. */
export const ajustes = new Ajustes();
