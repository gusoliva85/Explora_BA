/**
 * ===========================================================================
 * OBJETOS DEL SUELO
 * ===========================================================================
 * Quien hay tirado en el piso, quien lo puede levantar y que pasa cuando lo
 * levanta. Logica pura, sin motor.
 *
 * ---------------------------------------------------------------------------
 * POR QUE SE LEVANTAN SOLOS Y NO CON UN BOTON
 * ---------------------------------------------------------------------------
 * Hay un boton de interactuar reservado desde la Fase 0 y no se usa aca.
 *
 * En una pantalla de telefono, con el pulgar izquierdo en el joystick y el
 * derecho en disparar, no queda dedo libre. Pedir un tercer toque para
 * levantar un botiquin significa frenar, mirar el HUD, buscar el boton y
 * apretarlo, con zombis encima. Pisarlo y que se levante solo es lo que
 * hace que recoger cosas sea parte de moverse y no una pausa.
 *
 * El boton de interactuar queda para lo que SI es una decision: abrir una
 * puerta, activar algo. Levantar municion no lo es.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO SIRVE NO SE LEVANTA
 * ---------------------------------------------------------------------------
 * Un botiquin pisado con la vida llena se perderia para siempre, y el
 * jugador ni se enteraria de que lo piso. Por eso cada objeto declara si
 * `sirve` en el estado actual: si no sirve, se queda en el piso esperando.
 *
 * Es mas importante de lo que parece. Es la diferencia entre un recurso que
 * se administra y uno que se desperdicia por caminar distraido.
 */

/** Tipos de objeto que pueden aparecer tirados. */
export const TipoObjeto = {
  MUNICION: 'municion',
  BOTIQUIN: 'botiquin'
};

/** A que distancia se levanta un objeto, en metros. */
export const RADIO_RECOGIDA = 1.1;

export class BolsaDeObjetos {
  constructor() {
    /** @type {Array<{id:number, tipo:string, x:number, z:number, activo:boolean}>} */
    this.objetos = [];
    this.proximoId = 0;
  }

  /** Los que estan en el piso ahora mismo. */
  get enElPiso() {
    return this.objetos.filter((o) => o.activo);
  }

  /**
   * Tira un objeto en el piso.
   *
   * @param {string} tipo
   * @param {number} x
   * @param {number} z
   */
  soltar(tipo, x, z) {
    const o = { id: ++this.proximoId, tipo, x, z, activo: true };
    this.objetos.push(o);
    return o;
  }

  /**
   * Suelta un grupo de objetos repartidos alrededor de un punto.
   *
   * Se reparten en circulo y no todos en el mismo lugar por una razon
   * practica: encimados, el jugador los pisa todos de una sola pasada y no
   * llega a ver que levanto. Separados, los va juntando de a uno.
   *
   * El angulo de arranque entra por parametro —del generador con semilla—
   * para que dos partidas con la misma semilla dejen los objetos igual
   * (D-12).
   *
   * @param {string[]} tipos
   * @param {{x:number,z:number}} centro
   * @param {number} radio
   * @param {number} [anguloInicial] en grados
   */
  soltarGrupo(tipos, centro, radio, anguloInicial = 0) {
    const out = [];
    for (let i = 0; i < tipos.length; i++) {
      const a = ((anguloInicial + (360 / tipos.length) * i) * Math.PI) / 180;
      out.push(
        this.soltar(tipos[i], centro.x + Math.sin(a) * radio, centro.z + Math.cos(a) * radio)
      );
    }
    return out;
  }

  /**
   * Levanta todo lo que el jugador este pisando Y le sirva.
   *
   * @param {{x:number,z:number}} pos
   * @param {(tipo:string) => boolean} sirve
   * @param {number} [radio]
   * @returns {Array} los objetos levantados
   */
  recoger(pos, sirve, radio = RADIO_RECOGIDA) {
    const out = [];
    for (const o of this.objetos) {
      if (!o.activo) continue;
      if (Math.hypot(o.x - pos.x, o.z - pos.z) > radio) continue;
      if (!sirve(o.tipo)) continue;
      o.activo = false;
      out.push(o);
    }
    return out;
  }

  /** Cuantos hay de cada tipo en el piso. Para el HUD y el diagnostico. */
  contar() {
    const n = {};
    for (const o of this.enElPiso) n[o.tipo] = (n[o.tipo] ?? 0) + 1;
    return n;
  }

  limpiar() {
    this.objetos.length = 0;
  }
}

/**
 * Cuanto cura un botiquin: LA MITAD DE LA VIDA TOTAL, siempre.
 *
 * Se suma a lo que haya, no lleva a un valor fijo. Con un cuarto de vida,
 * curarse deja tres cuartos; con la vida llena no cura nada —y por eso el
 * botiquin no se levanta en ese caso—.
 *
 * Es la mitad del TOTAL y no la mitad de lo que falta, que seria la otra
 * lectura posible: la mitad de lo que falta cura mucho cuando estas por
 * morir y casi nada cuando estas bien, que premia justo lo contrario de lo
 * que conviene premiar.
 *
 * @param {number} vidaMaxima
 */
export function curaDeBotiquin(vidaMaxima) {
  return vidaMaxima / 2;
}
