import { PLAYER, WEAPONS } from '../config/balance.js';
import { CARTAS, carta, mazoDe, CLASE } from './catalogo.js';

/**
 * ===========================================================================
 * LA CAPA DE MODIFICADORES (19B.1)
 * ===========================================================================
 * Lo que el jugador fue tomando, convertido en números de juego.
 *
 * ---------------------------------------------------------------------------
 * `balance.js` NO SE TOCA, Y ES UNA REGLA DURA
 * ---------------------------------------------------------------------------
 * El criterio de salida de la fase lo dice así: *"Ningún valor de
 * `balance.js` quedó modificado en disco"*. Esto lee la base y devuelve
 * valores nuevos; nunca escribe.
 *
 * El motivo es que **la progresión se pierde al morir** (19B.8) y los
 * valores base tienen que seguir estando para volver a empezar. Si las
 * cartas escribieran sobre la tabla, morir dejaría al jugador con los
 * números de la partida anterior, y el error sería invisible: todo
 * seguiría funcionando, sólo que mal.
 *
 * Y hay una segunda razón, que es la que hace que esto se pueda probar:
 * una tabla que no cambia es una tabla desde la que se puede calcular dos
 * veces y comparar.
 *
 * ---------------------------------------------------------------------------
 * TODO ES ADITIVO. NO ES UN DETALLE
 * ---------------------------------------------------------------------------
 * *Mejora de Ataque* (+15 %) y su *Premium* (+30 %) dan **1,45 veces** el
 * daño base. Multiplicando darían 1,495, y la diferencia no es el 4 %: es
 * que **multiplicar hace que el orden importe** en cuanto algo reste, y el
 * criterio de salida de la fase exige lo contrario —*"las quince cartas de
 * Guerrero conviven en cualquier orden, y el resultado no depende del orden
 * en que se tomaron"* (D-44)—.
 *
 * Con sumas el orden no cambia el resultado... **casi.** En coma flotante
 * sumar no es asociativo, y una prueba lo encontró: las mismas cinco
 * cartas al revés daban 27,500000000000004 contra 27,499999999999996. Por
 * eso los ejes se suman recorriendo el catálogo y no la lista de tomadas.
 * Está explicado en `ejes()`.
 */

/** Los ejes que se acumulan sumando, y en cuánto arrancan. */
const EJES_EN_CERO = {
  dano: 0,
  velocidad: 0,
  carriles: 0,
  repeticiones: 0,
  critProb: 0,
  critDano: 0,
  roboVida: 0,
  rebotes: 0,
  rebotePerdida: 0,
  rebotePared: 0,
  reboteParedPerdida: 0,
  muerteNova: 0,
  muerteNovaDano: 0,
  orbes: 0,
  vidaMaxima: 0
};

/** Los efectos que NO son números: el último tomado manda. */
const EJES_DE_TEXTO = ['elemento', 'orbeElemento'];

export class Modificadores {
  /**
   * @param {string} [clase] la clase del personaje. Gus es Guerrero.
   */
  constructor(clase = CLASE.GUERRERO) {
    this.clase = clase;
    /** @type {string[]} los ids tomados, en orden. */
    this.tomadas = [];
  }

  /** Vuelve a cero. Lo llama el reinicio de la misión: al morir se pierde todo. */
  reiniciar() {
    this.tomadas.length = 0;
  }

  /** Las cartas que este personaje puede llegar a ver. */
  get mazo() {
    return mazoDe(this.clase);
  }

  /**
   * Las que todavía pueden salir: las de su mazo menos las ya tomadas.
   *
   * **Una carta tomada no vuelve a salir en la partida**, y eso lo pidió la
   * especificación con esas palabras. No es sólo para que no se repita el
   * texto: con cartas aditivas, repetir una sería la forma más aburrida de
   * subir un número, y la decisión de cada control dejaría de serlo.
   */
  get disponibles() {
    return this.mazo.filter((c) => !this.tomadas.includes(c.id));
  }

  /**
   * ¿Se puede tomar esta carta?
   *
   * Tres motivos para que no: que no exista, que no sea de su clase, o que
   * ya la tenga.
   */
  puedeTomar(id) {
    const c = carta(id);
    if (!c) return false;
    if (c.clase !== this.clase && c.clase !== CLASE.GENERAL) return false;
    return !this.tomadas.includes(id);
  }

  /**
   * Toma una carta.
   *
   * @returns {{ok:boolean, instantaneo?:object, reemplazo?:string}}
   *   `instantaneo` es lo que hay que aplicar **una vez** —curar, por
   *   ejemplo—, y `reemplazo` es la carta que salió por exclusión mutua.
   */
  tomar(id) {
    if (!this.puedeTomar(id)) return { ok: false };
    const c = carta(id);

    /*
     * EXCLUSIÓN MUTUA (los cuatro elementos de Mago).
     *
     * Elegir un elemento **reemplaza** al anterior en vez de sumarse. Y
     * se resuelve sacando la carta vieja de la lista, no marcándola:
     * así el resto del sistema —el cálculo, el "no repetir", la pantalla
     * de lo que llevás puesto— no necesita saber que la exclusión existe.
     *
     * Ojo con lo que eso implica y está decidido a propósito: la carta
     * reemplazada **puede volver a salir**. Es coherente, porque ya no la
     * tenés; y es necesario, porque si no, cambiar de elemento costaría
     * perder para siempre el que dejaste.
     */
    let reemplazo;
    if (c.grupo) {
      const previa = this.tomadas.find((t) => carta(t)?.grupo === c.grupo);
      if (previa) {
        this.tomadas.splice(this.tomadas.indexOf(previa), 1);
        reemplazo = previa;
      }
    }

    this.tomadas.push(id);
    return { ok: true, instantaneo: c.instantaneo, reemplazo };
  }

  /**
   * La suma de todos los ejes. Es la cuenta cruda, sin aplicar a nada.
   *
   * Está expuesta aparte del resultado final porque es lo que se puede
   * probar sin arrastrar `balance.js`: si mañana el daño base cambia, las
   * pruebas de los ejes siguen valiendo.
   */
  ejes() {
    const suma = { ...EJES_EN_CERO };
    for (const eje of EJES_DE_TEXTO) suma[eje] = null;

    /*
     * SE SUMA EN EL ORDEN DEL CATÁLOGO, NO EN EL QUE SE TOMARON.
     *
     * Parecía innecesario —sumar es conmutativo— y una prueba mostró que
     * no: **en coma flotante, sumar no es asociativo.** Las mismas cinco
     * cartas tomadas al revés daban 27,500000000000004 contra
     * 27,499999999999996.
     *
     * Para el juego esa diferencia no existe. Para la regla que la fase
     * exige —*"el resultado no depende del orden en que se tomaron"*
     * (D-44)— sí, porque obligaría a escribirla como "casi no depende", y
     * una regla con "casi" no se puede probar: hay que elegir cuánto es
     * casi, y ese número no lo decide nadie.
     *
     * Recorriendo el catálogo, que es un orden fijo e independiente de la
     * partida, la igualdad vuelve a ser exacta. Y de paso arregla otra
     * cosa que nadie había decidido: con dos orbes de elementos distintos,
     * cuál manda dejaba de depender del azar del sorteo.
     */
    const tomadas = new Set(this.tomadas);
    for (const c of CARTAS) {
      if (!tomadas.has(c.id)) continue;
      const efectos = c.efectos;
      if (!efectos) continue;
      for (const [eje, valor] of Object.entries(efectos)) {
        if (EJES_DE_TEXTO.includes(eje)) {
          // No se suman dos elementos: manda uno. Ver el comentario de
          // arriba sobre por qué el que manda sale del catálogo.
          suma[eje] = valor;
        } else {
          suma[eje] = (suma[eje] ?? 0) + valor;
        }
      }
    }
    return suma;
  }

  /**
   * Los valores de juego, ya aplicados sobre la base.
   *
   * Acá es donde se lee `balance.js` y donde **no se escribe**.
   */
  valores() {
    const e = this.ejes();
    const base = WEAPONS.pistol;

    /*
     * La velocidad sube, así que la espera BAJA.
     *
     * Es el único eje que no se aplica multiplicando hacia arriba, y vale
     * decir por qué: `cooldown` son segundos entre tiros, o sea lo
     * inverso de la velocidad. Un +25 % de velocidad es dividir la espera
     * por 1,25, no multiplicarla.
     *
     * Y se le pone piso: con suficientes cartas de ritmo y el −15 % del
     * disparo múltiple, la suma podría llegar a −1 y dividir por cero.
     */
    const factorVelocidad = Math.max(0.2, 1 + e.velocidad);

    const carriles = base.carriles + e.carriles;
    const repeticiones = base.repeticiones + e.repeticiones;

    return {
      /** Daño de UN proyectil. Nunca baja de cero por más costos que haya. */
      dano: Math.max(0, base.damage * (1 + e.dano)),
      cadencia: base.cooldown / factorVelocidad,

      carriles,
      repeticiones,
      /**
       * `proyectiles = carriles × repeticiones` (D-44).
       *
       * **Los dos ejes se multiplican, no se suman**, y esa multiplicación
       * *es* la escalada de la partida. Está acá, calculado desde los ejes,
       * para que nadie tenga que acordarse de hacerla.
       */
      proyectiles: carriles * repeticiones,

      critProb: Math.min(1, e.critProb),
      critDano: e.critDano,
      roboVida: e.roboVida,

      rebotes: e.rebotes,
      rebotePerdida: e.rebotePerdida,
      rebotePared: e.rebotePared,
      reboteParedPerdida: e.reboteParedPerdida,
      muerteNova: e.muerteNova,
      muerteNovaDano: e.muerteNovaDano,
      orbes: e.orbes,

      elemento: e.elemento,
      orbeElemento: e.orbeElemento,

      /** Sube el techo. **No cura**: eso lo hace `Sanar`, y es otra carta. */
      vidaMaxima: Math.round(PLAYER.maxHealth * (1 + e.vidaMaxima))
    };
  }
}
