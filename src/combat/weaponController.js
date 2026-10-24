import { WEAPONS } from '../config/balance.js';
import { rumboHacia, difRumbos } from '../core/rumbo.js';
import { blancoDelRayo, dispersar, rumboAsistido } from './ballistics.js';
import { objetivoAutomatico } from './explosion.js';

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
  ESPERANDO: 'ESPERANDO',
  /**
   * Cambiando el cargador.
   *
   * Es un estado propio y no un "esperando mas largo" porque el jugador
   * tiene que poder VERLO: durante la recarga esta indefenso, y esa es la
   * mitad del costo de usar la pistola. Si no se distingue de la espera
   * normal, el jugador no entiende por que no dispara.
   */
  RECARGANDO: 'RECARGANDO'
};

export class WeaponController {
  /**
   * @param {object} [opt]
   * @param {string} [opt.armaInicial] clave de WEAPONS
   * @param {(info:object) => void} [opt.alIniciarAtaque] al arrancar el swing
   * @param {(info:object) => void} [opt.alGolpear] se llama cuando el golpe conecta
   * @param {(info:object) => void} [opt.alFallar] se llama cuando el golpe no alcanza a nadie
   * @param {(info:object) => void} [opt.alHacerRuido] para el sistema de ruido (D-05)
   * @param {(info:object) => void} [opt.alDisparar] trazado y fogonazo
   * @param {(info:object) => void} [opt.alClicVacio] gatillo sin municion
   * @param {(info:object) => void} [opt.alRecargar] arranca el cambio de cargador
   * @param {(info:object) => void} [opt.alCambiarMunicion] para el HUD
   * @param {Function} [opt.rayo] prueba del escenario, firma de CollisionWorld.raycast
   * @param {() => number} [opt.azar] generador con semilla (D-12)
   * @param {() => boolean} [opt.asistirApuntado] si corresponde ayudar a apuntar
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

    /*
     * Municion.
     *
     * Se lleva por TIPO de municion, no por arma. Hoy da lo mismo porque
     * solo la pistola gasta balas, pero el dia que haya dos armas de 9 mm
     * tienen que compartir la reserva: si cada arma tuviera su propia
     * cuenta, cambiar de arma seria una forma gratis de recargar.
     */
    this.cargador = {};
    this.reserva = {};
    for (const arma of Object.values(this.armas)) {
      if (!arma.ammoType) continue;
      this.cargador[arma.ammoType] = arma.magazineSize ?? 0;
      this.reserva[arma.ammoType] = arma.startingReserve ?? 0;
    }

    /*
     * El azar por omision NO es aleatorio.
     *
     * Devuelve siempre el centro, o sea cero dispersion. Es a proposito:
     * una prueba que no le pase un generador obtiene un disparo perfecto y
     * repetible, y nunca falla por mala suerte. El juego si le pasa el
     * generador con semilla (D-12).
     */
    /*
     * La bazooka.
     *
     * No es un arma que se equipa: es un boton aparte que esta siempre
     * disponible cuando la barra esta llena (D-03). Y por eso la barra
     * CARGA SIEMPRE, tengas el cuchillo o la pistola en la mano.
     *
     * Si cargara solo con la bazooka equipada, el jugador tendria que
     * elegir entre pelear y esperar, y lo racional seria andar con la
     * bazooka puesta sin usarla. Cargando sola, la decision pasa a ser la
     * unica que importa: CUANDO gastarla.
     */
    this.cargaEspecial = 0;
    this.lanzarProyectil = opt.lanzarProyectil;
    this.alCargarEspecial = opt.alCargarEspecial;
    this.alDispararEspecial = opt.alDispararEspecial;
    this.alEspecialSinBlanco = opt.alEspecialSinBlanco;

    this.azar = opt.azar ?? (() => 0.5);
    this.rayo = opt.rayo;
    this.asistirApuntado = opt.asistirApuntado ?? (() => false);

    this.alIniciarAtaque = opt.alIniciarAtaque;
    this.alGolpear = opt.alGolpear;
    this.alFallar = opt.alFallar;
    this.alHacerRuido = opt.alHacerRuido;
    this.alDisparar = opt.alDisparar;
    this.alClicVacio = opt.alClicVacio;
    this.alRecargar = opt.alRecargar;
    this.alCambiarMunicion = opt.alCambiarMunicion;
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

  /** Tipo de municion del arma equipada, o null si no gasta. */
  get tipoMunicion() {
    return this.arma.ammoType;
  }

  /** Balas en el cargador. `Infinity` si el arma no gasta municion. */
  get enCargador() {
    const t = this.tipoMunicion;
    return t ? this.cargador[t] : Infinity;
  }

  /** Balas de reserva. */
  get enReserva() {
    const t = this.tipoMunicion;
    return t ? this.reserva[t] : 0;
  }

  get recargando() {
    return this.estado === EstadoArma.RECARGANDO;
  }

  /** Fraccion de 0 a 1 de la barra de la bazooka. */
  get progresoEspecial() {
    return this.cargaEspecial;
  }

  get especialLista() {
    return this.cargaEspecial >= 1;
  }

  /** Fraccion de 0 a 1 de la recarga. Para la barra del HUD. */
  get progresoRecarga() {
    if (!this.recargando) return 1;
    return 1 - this.restante / this.arma.reloadTime;
  }

  equipar(clave) {
    if (!this.armas[clave]) return false;
    this.equipada = clave;
    /*
     * Cambiar de arma CANCELA la recarga en curso.
     *
     * Es lo correcto y ademas cierra un agujero: si la recarga siguiera
     * corriendo, se podria empezar a recargar, pasar al cuchillo, pelear
     * con el cuchillo y volver a la pistola ya cargada. La recarga dejaria
     * de costar nada, y su costo es justamente el punto.
     */
    this.estado = EstadoArma.LISTA;
    this.restante = 0;
    this.swing = null;
    this.#avisarMunicion();
    return true;
  }

  /** Alterna entre las armas que el jugador tiene encima. */
  cambiarA(clave) {
    return this.equipar(clave);
  }

  /**
   * Empieza a cambiar el cargador.
   *
   * @returns {boolean} true si arranco de verdad
   */
  recargar() {
    const t = this.tipoMunicion;
    if (!t) return false;
    if (this.recargando) return false;
    // Un cargador lleno no se recarga: seria tirar balas de la reserva.
    if (this.cargador[t] >= this.arma.magazineSize) return false;
    if (this.reserva[t] <= 0) return false;
    // En medio de un disparo no, pero desde la espera entre tiros si: es
    // lo que deja recargar sin tener que esperar el ciclo completo.
    if (this.estado === EstadoArma.PREPARANDO) return false;

    this.estado = EstadoArma.RECARGANDO;
    this.restante = this.arma.reloadTime;
    this.alRecargar?.({ arma: this.arma.id, duracion: this.arma.reloadTime });
    return true;
  }

  /**
   * Vuelve al estado de arranque de mision.
   *
   * Hace falta porque la municion es la primera cosa del juego que
   * PERSISTE entre intentos. Sin esto, morir y reaparecer en el ultimo
   * control dejaria al jugador con el cargador como lo tenia al morir —o
   * sea, probablemente vacio, justo donde lo mataron.
   */
  reiniciar(armaInicial = 'knife') {
    for (const arma of Object.values(this.armas)) {
      if (!arma.ammoType) continue;
      this.cargador[arma.ammoType] = arma.magazineSize ?? 0;
      this.reserva[arma.ammoType] = arma.startingReserve ?? 0;
    }
    this.yaGolpeados.clear();
    /*
     * La bazooka arranca DESCARGADA, no cargada.
     *
     * Empezar con ella lista convertiria el principio de cada intento en
     * "gasto la bazooka en el primer grupo", que es justo la decision que
     * el arma no quiere que sea automatica. Y al morir, reaparecer con la
     * barra llena premiaria morirse.
     */
    this.cargaEspecial = 0;
    this.equipar(armaInicial);
  }

  /** Suma municion a la reserva. Lo usaran los objetos de la Fase 8. */
  sumarMunicion(tipo, cantidad) {
    if (this.reserva[tipo] === undefined) return false;
    this.reserva[tipo] += cantidad;
    this.#avisarMunicion();
    return true;
  }

  #avisarMunicion() {
    this.alCambiarMunicion?.({
      arma: this.arma.id,
      tipo: this.tipoMunicion,
      cargador: this.enCargador,
      reserva: this.enReserva,
      capacidad: this.arma.magazineSize ?? 0
    });
  }

  /** Termina la recarga: pasa balas de la reserva al cargador. */
  #completarRecarga() {
    const t = this.tipoMunicion;
    const falta = this.arma.magazineSize - this.cargador[t];
    const pasan = Math.min(falta, this.reserva[t]);
    this.cargador[t] += pasan;
    this.reserva[t] -= pasan;
    this.#avisarMunicion();
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

    /*
     * Gatillo en vacio.
     *
     * Tiene que ser un aviso, no un silencio. El jugador que aprieta y no
     * pasa nada cree que se trabo el boton; el que aprieta y escucha el
     * clic entiende que se quedo sin balas, que es una informacion que
     * necesita YA, con tres zombis encima.
     *
     * Y despues se recarga solo. No es comodidad: nadie que se queda sin
     * municion en una pelea decide NO recargar, asi que obligar a un
     * segundo botón solo agrega un paso que siempre se quiere dar.
     */
    if (this.tipoMunicion && this.enCargador <= 0) {
      this.alClicVacio?.({
        arma: this.arma.id,
        reserva: this.enReserva,
        x: pos.x,
        z: pos.z
      });
      this.recargar();
      return false;
    }

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
    this.#cargarEspecial(dt);
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

    if (this.estado === EstadoArma.RECARGANDO && this.restante <= 0) {
      this.#completarRecarga();
      this.estado = EstadoArma.LISTA;
      this.swing = null;
      return;
    }

    if (this.estado === EstadoArma.ESPERANDO && this.restante <= 0) {
      this.estado = EstadoArma.LISTA;
      this.swing = null;
    }
  }

  /** Llena la barra de la bazooka. Corre siempre, se use o no. */
  #cargarEspecial(dt) {
    if (this.cargaEspecial >= 1) return;
    const antes = this.cargaEspecial;
    this.cargaEspecial = Math.min(1, this.cargaEspecial + dt / this.armas.bazooka.cooldown);
    // Se avisa solo al llenarse, no en cada cuadro: el HUD lee la barra
    // directamente, y lo que necesita un aviso es el momento en que el
    // boton se habilita.
    if (antes < 1 && this.cargaEspecial >= 1) {
      this.alCargarEspecial?.({ arma: 'bazooka' });
    }
  }

  /**
   * Dispara la bazooka.
   *
   * No pasa por `atacar` ni cambia el arma equipada: es un boton propio.
   *
   * @param {{x:number,z:number}} pos
   * @param {Array} objetivos
   * @returns {boolean} true si salio el cohete
   */
  dispararEspecial(pos, objetivos = []) {
    if (!this.especialLista) return false;

    const arma = this.armas.bazooka;
    const blanco = objetivoAutomatico(pos, objetivos, {
      alcance: arma.range,
      rayo: this.rayo,
      altura: arma.shotHeight ?? 1.2
    });

    /*
     * Sin blanco NO se gasta la carga (tarea 7.11).
     *
     * Es lo contrario de lo que hace la pistola, donde errar cuesta una
     * bala a proposito. La diferencia es el precio: una bala son cinco
     * segundos de recarga, la barra son treinta. Hacer perder treinta
     * segundos por un boton apretado sin querer —en una pantalla tactil,
     * con zombis encima— es castigar un error de dedo, no una decision.
     */
    if (!blanco) {
      this.alEspecialSinBlanco?.({ x: pos.x, z: pos.z, alcance: arma.range });
      return false;
    }

    this.cargaEspecial = 0;

    this.lanzarProyectil?.({
      origen: { x: pos.x, z: pos.z },
      rumbo: blanco.rumbo,
      velocidad: arma.projectileSpeed,
      // El cohete no puede volar mas alla del blanco elegido: si el zombi
      // se corre, detona donde estaba, no sigue de largo hasta los 40 m.
      alcance: blanco.distancia + arma.blastRadius,
      altura: arma.shotHeight ?? 1.2
    });

    this.alDispararEspecial?.({
      arma: arma.id,
      x: pos.x,
      z: pos.z,
      rumbo: blanco.rumbo,
      objetivo: blanco.objetivo,
      distancia: blanco.distancia
    });

    // El estruendo del disparo, aparte del de la explosion.
    if (arma.noiseRadius > 0) {
      this.alHacerRuido?.({ x: pos.x, z: pos.z, radio: arma.noiseRadius, arma: arma.id });
    }
    return true;
  }

  /** A quien apuntaria la bazooka ahora. Lo usa el indicador del HUD. */
  blancoEspecial(pos, objetivos) {
    const arma = this.armas.bazooka;
    return objetivoAutomatico(pos, objetivos, {
      alcance: arma.range,
      rayo: this.rayo,
      altura: arma.shotHeight ?? 1.2
    });
  }

  /** Resuelve el ataque segun el tipo de arma. */
  #resolverGolpe(pos, rumboGrados, objetivos) {
    if (this.arma.type === 'hitscan') {
      this.#resolverDisparo(pos, rumboGrados, objetivos);
      return;
    }
    this.#resolverArco(pos, rumboGrados, objetivos);
  }

  /**
   * El disparo instantaneo.
   *
   * El orden de los tres pasos no es casual:
   *
   * 1. **Asistencia** primero, sobre el rumbo limpio. Corrige el temblor
   *    del pulgar antes de que intervenga el azar.
   * 2. **Dispersion** despues. Si fuera al revés, la asistencia podria
   *    cancelar la dispersion y el arma seria un puntero perfecto en
   *    cuanto hubiera un zombi cerca del centro.
   * 3. **El rayo** al final, con el rumbo ya definitivo.
   */
  #resolverDisparo(pos, rumboGrados, objetivos) {
    const arma = this.arma;

    // La bala se descuenta al SALIR, no al apretar: un disparo que se
    // interrumpe —porque cambiaste de arma a mitad del windup— no la gasta.
    const t = arma.ammoType;
    if (t) {
      this.cargador[t] = Math.max(0, this.cargador[t] - 1);
      this.#avisarMunicion();
    }

    let rumbo = rumboGrados;
    if (this.asistirApuntado()) {
      rumbo = rumboAsistido(pos, rumbo, objetivos, {
        alcance: arma.range,
        cono: arma.aimAssist.cono,
        maxima: arma.aimAssist.maxima
      });
    }
    rumbo = dispersar(rumbo, arma.spreadDegrees, this.azar);

    const impacto = blancoDelRayo(pos, rumbo, objetivos, {
      alcance: arma.range,
      radioBlanco: arma.targetRadius,
      rayo: this.rayo,
      alturaTiro: arma.shotHeight
    });

    /*
     * El trazado se avisa SIEMPRE, acierte o no. Es lo unico que le dice
     * al jugador por donde paso la bala, y por lo tanto lo unico que le
     * permite corregir. Un disparo sin trazado que falla no enseña nada.
     */
    this.alDisparar?.({
      arma: arma.id,
      desde: { x: pos.x, z: pos.z },
      hasta: { x: impacto.x, z: impacto.z },
      rumbo,
      altura: arma.shotHeight,
      acerto: !!impacto.objetivo,
      pared: impacto.pared,
      distancia: impacto.distancia
    });

    if (impacto.objetivo) {
      const q = impacto.objetivo.posicion;
      const dx = q.x - pos.x;
      const dz = q.z - pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.yaGolpeados.add(impacto.objetivo);
      this.alGolpear?.({
        objetivo: impacto.objetivo,
        daño: arma.damage,
        arma: arma.id,
        dirX: dx / d,
        dirZ: dz / d
      });
    } else {
      this.alFallar?.({ arma: arma.id, x: pos.x, z: pos.z, rumbo });
    }

    /*
     * El ruido sale IGUAL si el tiro falla. Es el corazon de la fase: lo
     * que atrae a los zombis es el estruendo, no el acierto. Un jugador
     * que erra y se queda sin saber por que vino la horda aprendio algo
     * importante sobre disparar.
     */
    if (arma.noiseRadius > 0) {
      this.alHacerRuido?.({ x: pos.x, z: pos.z, radio: arma.noiseRadius, arma: arma.id });
    }
  }

  /** Aplica el daño del swing a todo lo que caiga dentro del arco. */
  #resolverArco(pos, rumboGrados, objetivos) {
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
        // `rumboHacia` y el rumbo del jugador tienen que estar en el MISMO
        // convenio. Aca habia un `atan2(dx, dz)` suelto, que es el convenio
        // contrario, y el cuchillo golpeaba para atras. Ver core/rumbo.js.
        if (difRumbos(rumboHacia(dx, dz), rumboGrados) > arma.arcDegrees) continue;
      }

      out.push(objetivo);
    }
    return out;
  }
}
