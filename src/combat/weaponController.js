import { WEAPONS } from '../config/balance.js';

/**
 * ===========================================================================
 * ARMAS
 * ===========================================================================
 * Controla el arma equipada: cuando se puede atacar, cuanto tarda el golpe
 * en salir y a quien alcanza.
 *
 * Como el cerebro del zombi, es logica pura: no conoce PlayCanvas ni
 * entidades. Recibe la posicion del jugador, hacia donde mira y una lista
 * de objetivos con posicion; devuelve a quienes golpeo. Eso permite probar
 * el arco de ataque con numeros en vez de a ojo.
 *
 * ---------------------------------------------------------------------------
 * POR QUE EL GOLPE TIENE DEMORA
 * ---------------------------------------------------------------------------
 * Entre apretar el boton y aplicar el daño pasan unos centesimos. No es un
 * capricho: es lo que hace que el combate se pueda leer.
 *
 * Con daño instantaneo, el jugador aprieta y el zombi muere en el mismo
 * cuadro en que empieza la animacion. No hay nada que anticipar, nada que
 * esquivar, y el golpe se siente despegado del personaje. Con la demora,
 * el swing empieza, el jugador ve el movimiento, y recien ahi conecta.
 * Ademas abre la puerta a que un zombi alcance a interrumpirte, que es de
 * donde sale la tension del cuerpo a cuerpo.
 *
 * ---------------------------------------------------------------------------
 * EL ARCO
 * ---------------------------------------------------------------------------
 * El cuchillo no golpea en un punto: barre un arco de 55 grados a cada
 * lado, hasta 1,7 m. Un golpe puede alcanzar a varios zombis, pero a cada
 * uno UNA sola vez. Si no se lleva esa cuenta, un zombi que entra y sale
 * del arco durante el mismo swing recibe daño dos veces.
 */

/** Estados del arma. */
export const EstadoArma = {
  LISTA: 'LISTA',
  /** Se apreto, el golpe todavia no salio. */
  PREPARANDO: 'PREPARANDO',
  /** Golpe aplicado, esperando para poder volver a atacar. */
  ESPERANDO: 'ESPERANDO'
};

export class WeaponController {
  /**
   * @param {object} [opt]
   * @param {string} [opt.armaInicial] clave de WEAPONS
   * @param {(info:object) => void} [opt.alIniciarAtaque] al arrancar el swing
   * @param {(info:object) => void} [opt.alGolpear] se llama cuando el golpe conecta
   * @param {(info:object) => void} [opt.alFallar] se llama cuando el golpe no alcanza a nadie
   * @param {(info:object) => void} [opt.alHacerRuido] para el sistema de ruido (D-05)
   */
  constructor(opt = {}) {
    this.armas = WEAPONS;
    this.equipada = opt.armaInicial ?? 'knife';

    this.estado = EstadoArma.LISTA;
    this.restante = 0;
    /** Golpes de este swing, para no pegarle dos veces al mismo. */
    this.yaGolpeados = new Set();
    /** Datos del swing en curso: desde donde y hacia donde. */
    this.swing = null;

    this.alIniciarAtaque = opt.alIniciarAtaque;
    this.alGolpear = opt.alGolpear;
    this.alFallar = opt.alFallar;
    this.alHacerRuido = opt.alHacerRuido;
  }

  get arma() {
    return this.armas[this.equipada];
  }

  get puedeAtacar() {
    return this.estado === EstadoArma.LISTA;
  }

  /** Fraccion de 0 a 1 de lo que falta para poder volver a atacar. */
  get progresoEspera() {
    if (this.estado !== EstadoArma.ESPERANDO) return 1;
    return 1 - this.restante / this.arma.cooldown;
  }

  equipar(clave) {
    if (!this.armas[clave]) return false;
    this.equipada = clave;
    this.estado = EstadoArma.LISTA;
    this.restante = 0;
    return true;
  }

  /**
   * Intenta atacar.
   *
   * No aplica daño todavia: arranca el swing. El daño sale en `update`
   * cuando se cumple la demora.
   *
   * El aviso de que el swing arranco sale de ACA y no de quien llama. Es
   * deliberado: antes el arco del cuchillo se dibujaba desde el bucle
   * principal, junto al chequeo del boton, y entonces un ataque que no
   * viniera del boton —una prueba, una captura, un ataque automatico mas
   * adelante— no mostraba nada. El arma es la unica que sabe que ataco,
   * asi que es la que tiene que avisarlo.
   *
   * @param {{x:number,z:number}} pos
   * @param {number} rumboGrados hacia donde mira el jugador
   * @param {Array} [objetivos] para saber si el golpe conectaria
   * @returns {boolean} true si el ataque arranco
   */
  atacar(pos, rumboGrados, objetivos = []) {
    if (!this.puedeAtacar) return false;

    this.estado = EstadoArma.PREPARANDO;
    this.restante = this.arma.windup;
    this.yaGolpeados.clear();
    this.swing = { x: pos.x, z: pos.z, rumbo: rumboGrados };

    /*
     * Se avisa si el golpe CONECTARIA, mirando el estado actual. Es una
     * prediccion: el daño real se resuelve cuando se cumple la demora y
     * para entonces los zombis se movieron. Sirve igual, porque lo que
     * decide es el momento en que el jugador aprieta.
     */
    this.alIniciarAtaque?.({
      x: pos.x,
      z: pos.z,
      rumbo: rumboGrados,
      arma: this.arma.id,
      conectaria: this.alcanzados(pos, rumboGrados, objetivos).length > 0
    });
    return true;
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} pos posicion actual del jugador
   * @param {number} rumboGrados
   * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
   */
  update(dt, pos, rumboGrados, objetivos) {
    if (this.restante > 0) this.restante -= dt;

    if (this.estado === EstadoArma.PREPARANDO && this.restante <= 0) {
      // El golpe sale desde donde esta el jugador AHORA, no desde donde
      // estaba al apretar: si no, girar durante el swing no serviria de
      // nada y el combate se sentiria rigido.
      this.#resolverGolpe(pos, rumboGrados, objetivos);
      this.estado = EstadoArma.ESPERANDO;
      this.restante = this.arma.cooldown;
      return;
    }

    if (this.estado === EstadoArma.ESPERANDO && this.restante <= 0) {
      this.estado = EstadoArma.LISTA;
      this.swing = null;
    }
  }

  /** Aplica el daño del swing a todo lo que caiga dentro del arco. */
  #resolverGolpe(pos, rumboGrados, objetivos) {
    const arma = this.arma;
    const alcanzados = this.alcanzados(pos, rumboGrados, objetivos);

    for (const objetivo of alcanzados) {
      this.yaGolpeados.add(objetivo);
      const q = objetivo.posicion;
      const dx = q.x - pos.x;
      const dz = q.z - pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.alGolpear?.({
        objetivo,
        daño: arma.damage,
        arma: arma.id,
        // Direccion del empuje, para que el zombi retroceda.
        dirX: dx / d,
        dirZ: dz / d
      });
    }

    if (alcanzados.length === 0) {
      // Fallar tiene que notarse. Sin aviso, el jugador no sabe si erro el
      // golpe o si el arma no hizo nada, y deja de confiar en el combate.
      this.alFallar?.({ arma: arma.id, x: pos.x, z: pos.z, rumbo: rumboGrados });
    }

    if (arma.noiseRadius > 0) {
      this.alHacerRuido?.({ x: pos.x, z: pos.z, radio: arma.noiseRadius, arma: arma.id });
    }
  }

  /**
   * Quienes caen dentro del arco del arma.
   *
   * Separado del golpe para poder probarlo solo, y para que el diagnostico
   * pueda dibujar a quien alcanzaria sin tener que atacar.
   *
   * @returns {Array} los objetivos alcanzados
   */
  alcanzados(pos, rumboGrados, objetivos) {
    const arma = this.arma;
    if (arma.type !== 'melee') return [];

    const out = [];
    for (const objetivo of objetivos) {
      if (!objetivo.vivo) continue;
      if (this.yaGolpeados.has(objetivo)) continue;

      const q = objetivo.posicion;
      const dx = q.x - pos.x;
      const dz = q.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > arma.range) continue;

      // Pegado encima, el angulo deja de importar: a medio metro uno
      // alcanza para cualquier lado.
      if (d > 0.6) {
        const rumboObjetivo = Math.atan2(dx, dz) * (180 / Math.PI);
        const diff = Math.abs(((rumboObjetivo - rumboGrados + 540) % 360) - 180);
        if (diff > arma.arcDegrees) continue;
      }

      out.push(objetivo);
    }
    return out;
  }
}
