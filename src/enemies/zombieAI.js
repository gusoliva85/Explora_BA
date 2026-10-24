import { ZOMBIE_STANDARD } from '../config/balance.js';
import {
  rumboHacia,
  rumboEntre,
  dirDeRumbo,
  difRumbos,
  normalizarRumbo
} from '../core/rumbo.js';

/**
 * ===========================================================================
 * CEREBRO DEL ZOMBI
 * ===========================================================================
 * Logica pura: no conoce PlayCanvas, no tiene entidades, no dibuja nada.
 * Recibe posiciones y devuelve una direccion y un estado. Eso permite
 * probarla entera sin navegador, que para una maquina de estados con seis
 * estados y tres formas de detectar es la diferencia entre confiar en ella
 * o no.
 *
 * ---------------------------------------------------------------------------
 * LOS ESTADOS
 * ---------------------------------------------------------------------------
 *   IDLE     quieto o paseando. No sabe que existis.
 *   ALERT    escucho o vio algo. Se gira y mira, sin moverse todavia.
 *   CHASE    te vio. Va hacia vos.
 *   SEARCH   te perdio de vista. Va al ultimo lugar donde te vio y busca.
 *   ATTACK   te tiene al alcance. Golpea con su tiempo de espera.
 *   STUNNED  lo interrumpieron. No hace nada por un momento.
 *   DEAD     terminado.
 *
 * SEARCH no estaba en el documento 01 y es la diferencia entre un enemigo
 * que da miedo y uno que no: sin el, esconderse detras de un auto apaga al
 * zombi de golpe y el juego se vuelve trivial. Con el, el zombi va hasta
 * donde te vio por ultima vez y da vueltas ahi, asi que esconderse es una
 * apuesta y no un boton de apagado.
 *
 * ---------------------------------------------------------------------------
 * COMO NAVEGA (decision D-10)
 * ---------------------------------------------------------------------------
 * No hay navmesh ni A*. Hay tres fuerzas que se suman:
 *
 *   1. PERSEGUIR   direccion al objetivo.
 *   2. ESQUIVAR    tres rayos hacia adelante. Si el del centro choca, gira
 *                  hacia el lado que tenga mas espacio.
 *   3. SEPARARSE   empuje suave contra los otros zombis cercanos.
 *
 * Es barato —tres rayos por zombi por cuadro— y alcanza para calles, que
 * son pasillos sin laberintos. Si alguna vez se ven zombis dando vueltas
 * contra una esquina en vez de rodearla, ahi recien hace falta A* (NOTA-05
 * del documento 02).
 */

export const EstadoZombi = {
  IDLE: 'IDLE',
  ALERT: 'ALERT',
  CHASE: 'CHASE',
  SEARCH: 'SEARCH',
  ATTACK: 'ATTACK',
  STUNNED: 'STUNNED',
  DEAD: 'DEAD'
};

/** Altura a la que mira un zombi. Ver `#puedeVer`. */
const ALTURA_OJOS = 1.5;

export class ZombieAI {
  /**
   * @param {object} opt
   * @param {object} opt.world CollisionWorld, para la linea de vista
   * @param {object} [opt.cfg] valores de balance
   * @param {{x:number,z:number}} opt.origen su zona, para el limite de alejamiento
   * @param {() => number} [opt.azar] fuente de aleatoriedad, inyectable para pruebas
   */
  constructor({ world, cfg = ZOMBIE_STANDARD, origen, azar = Math.random }) {
    this.world = world;
    this.cfg = cfg;
    this.origen = { x: origen.x, z: origen.z };
    this.azar = azar;

    this.estado = EstadoZombi.IDLE;
    /** Ultimo lugar donde vio al jugador. Null si nunca lo vio. */
    this.ultimoVisto = null;
    /** Hacia donde mira, en grados. */
    this.rumbo = 0;

    this.tiempoEnEstado = 0;
    this.esperaAtaque = 0;
    this.restanteAturdido = 0;
    /** Hacia donde gira cuando esquiva. Se mantiene para no oscilar. */
    this.ladoEsquive = 1;
  }

  // =========================================================================
  // ESTADO
  // =========================================================================

  #cambiarA(estado) {
    if (this.estado === estado) return;
    this.estado = estado;
    this.tiempoEnEstado = 0;
  }

  get vivo() {
    return this.estado !== EstadoZombi.DEAD;
  }

  get persiguiendo() {
    return this.estado === EstadoZombi.CHASE || this.estado === EstadoZombi.ATTACK;
  }

  morir() {
    this.#cambiarA(EstadoZombi.DEAD);
  }

  /** Lo interrumpe: deja de atacar y se queda quieto un momento. */
  aturdir(segundos) {
    if (!this.vivo) return;
    this.restanteAturdido = Math.max(this.restanteAturdido, segundos);
    this.#cambiarA(EstadoZombi.STUNNED);
  }

  /**
   * Un ruido lo atrae. Lo dispara el sistema de ruido de la Fase 6.
   *
   * No lo pone en CHASE: lo pone a BUSCAR en el origen del ruido. Un zombi
   * que corre derecho hacia un disparo que escucho a veinte metros sabe
   * demasiado; uno que va hasta ahi a investigar es creible y ademas deja
   * margen para escapar.
   */
  oirRuido(x, z, radio, posActual = null) {
    if (!this.vivo || this.estado === EstadoZombi.STUNNED) return false;

    /*
     * La distancia se mide desde DONDE ESTA, no desde su puesto de origen.
     *
     * Antes se media contra `this.origen`, el lugar donde lo pusieron al
     * generar el mapa. Para un zombi quieto da lo mismo, y por eso no se
     * notaba; para uno que ya se habia movido treinta metros persiguiendo
     * o buscando, estaba midiendo desde un lugar donde no estaba. Podia
     * escuchar un disparo que sono lejisimo de el, o no escuchar uno que
     * sono al lado.
     *
     * `posActual` es opcional para no romper a quien no la tenga, pero el
     * juego siempre la pasa: el gestor de zombis la tiene a mano.
     */
    const desde = posActual ?? this.origen;
    const d = Math.hypot(x - desde.x, z - desde.z);
    if (d > radio) return false;

    /*
     * Ya persiguiendo, un ruido no lo distrae.
     *
     * Si lo distrajera, disparar con un zombi encima lo mandaria a
     * investigar el lugar del disparo —donde esta el jugador parado— lo
     * cual se ve como que pierde el rastro de alguien que tiene delante.
     * Y seria explotable: disparar al aire para sacarse uno de encima.
     */
    if (this.estado === EstadoZombi.CHASE || this.estado === EstadoZombi.ATTACK) {
      return false;
    }

    this.ultimoVisto = { x, z };
    this.#cambiarA(EstadoZombi.ALERT);
    return true;
  }

  // =========================================================================
  // PERCEPCION
  // =========================================================================

  /**
   * Linea de vista.
   *
   * El umbral de altura es lo que hace que un zombi vea POR ENCIMA de una
   * barricada de un metro pero no a traves de un auto de uno setenta. Sin
   * eso, o no ve nada o lo ve todo.
   */
  #puedeVer(pos, objetivo) {
    return this.world.hasLineOfSight(pos.x, pos.z, objetivo.x, objetivo.z, ALTURA_OJOS);
  }

  /**
   * @returns {'vista'|'cerca'|null} como lo detecto, o null
   */
  detectar(pos, jugador) {
    const dx = jugador.x - pos.x;
    const dz = jugador.z - pos.z;
    const d = Math.hypot(dx, dz);

    // Muy cerca lo nota sin verlo: lo escucha, lo huele. Evita el absurdo
    // de pasarle por detras a un metro y que siga quieto.
    if (d <= this.cfg.hearRange) return 'cerca';

    if (d > this.cfg.sightRange) return null;

    // Cono de vision. El angulo es TOTAL, asi que se compara con la mitad.
    const diff = difRumbos(rumboHacia(dx, dz), this.rumbo);
    if (diff > this.cfg.sightAngle / 2) return null;

    return this.#puedeVer(pos, jugador) ? 'vista' : null;
  }

  // =========================================================================
  // NAVEGACION
  // =========================================================================

  /**
   * Esquive por rayos. Devuelve la direccion corregida.
   *
   * Tres rayos: centro, y treinta grados a cada lado. Si el del centro
   * choca, se va hacia el lado cuyo rayo llegue mas lejos. El lado elegido
   * se recuerda hasta que el camino se despeja, que es lo que evita que el
   * zombi tiemble entre dos opciones delante de un obstaculo.
   */
  #esquivar(pos, dirX, dirZ) {
    const alcance = 3.2;
    const base = rumboHacia(dirX, dirZ);
    const rayo = (anguloGrados) => {
      const d = dirDeRumbo(base + anguloGrados);
      const hx = pos.x + d.x * alcance;
      const hz = pos.z + d.z * alcance;
      const hit = this.world.raycast(pos.x, pos.z, hx, hz, ALTURA_OJOS * 0.4);
      return hit ? hit.t : 1;
    };

    if (rayo(0) > 0.95) {
      // Camino despejado: se olvida del lado elegido.
      this.ladoEsquive = 0;
      return { x: dirX, z: dirZ };
    }

    if (this.ladoEsquive === 0) {
      this.ladoEsquive = rayo(32) >= rayo(-32) ? 1 : -1;
    }

    // Girar noventa grados hacia el lado libre. Menos que eso no alcanza
    // para despegarse de una pared larga.
    return dirDeRumbo(base + this.ladoEsquive * 70);
  }

  /**
   * Separacion de los companeros.
   *
   * Sin esto, cinco zombis persiguiendo al mismo jugador terminan todos en
   * la misma coordenada y se ven como uno solo. Es el empujon mas barato
   * que convierte un grupo en una horda.
   */
  #separar(pos, vecinos) {
    let sx = 0;
    let sz = 0;
    const radio = this.cfg.collisionRadius * 2.6;

    for (const v of vecinos) {
      const dx = pos.x - v.x;
      const dz = pos.z - v.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001 && d < radio) {
        // Mas fuerte cuanto mas cerca.
        const fuerza = (radio - d) / radio;
        sx += (dx / d) * fuerza;
        sz += (dz / d) * fuerza;
      }
    }
    return { x: sx, z: sz };
  }

  // =========================================================================
  // CICLO
  // =========================================================================

  /**
   * Un paso de pensamiento.
   *
   * @param {number} dt
   * @param {object} ctx
   * @param {{x:number,z:number}} ctx.pos donde esta
   * @param {{x:number,z:number}} ctx.jugador
   * @param {boolean} ctx.jugadorVivo
   * @param {{x:number,z:number}[]} [ctx.vecinos] otros zombis cerca
   * @returns {{dirX:number, dirZ:number, velocidad:number, atacar:boolean}}
   */
  update(dt, ctx) {
    const quieto = { dirX: 0, dirZ: 0, velocidad: 0, atacar: false };

    this.tiempoEnEstado += dt;
    if (this.esperaAtaque > 0) this.esperaAtaque -= dt;

    if (this.estado === EstadoZombi.DEAD) return quieto;

    if (this.estado === EstadoZombi.STUNNED) {
      this.restanteAturdido -= dt;
      if (this.restanteAturdido <= 0) {
        this.#cambiarA(this.ultimoVisto ? EstadoZombi.CHASE : EstadoZombi.IDLE);
      }
      return quieto;
    }

    const { pos, jugador, jugadorVivo, vecinos = [] } = ctx;

    // --- Percepcion ---------------------------------------------------------
    const deteccion = jugadorVivo ? this.detectar(pos, jugador) : null;
    if (deteccion) {
      this.ultimoVisto = { x: jugador.x, z: jugador.z };
      if (this.estado !== EstadoZombi.ATTACK) this.#cambiarA(EstadoZombi.CHASE);
    }

    // --- Limite de alejamiento ---------------------------------------------
    // Si se fue demasiado de su zona, vuelve. Sin esto, un zombi sigue al
    // jugador por todo el mapa y el recorrido se convierte en una bola de
    // nieve: todos los que detectaste alguna vez estan siempre atras.
    const lejosDeCasa = Math.hypot(pos.x - this.origen.x, pos.z - this.origen.z);
    if (lejosDeCasa > this.cfg.leashRange && !deteccion) {
      this.ultimoVisto = null;
      this.#cambiarA(EstadoZombi.SEARCH);
    }

    // --- Decision por estado ------------------------------------------------
    let objetivo = null;
    let velocidad = 0;

    switch (this.estado) {
      case EstadoZombi.IDLE:
        // Quieto, girando despacio: barre el cono de vision y asi llega a
        // detectar algo que entro por un costado.
        //
        // Se normaliza en cada vuelta. Sin esto el angulo crece para
        // siempre —un zombi parado dos minutos pasa de los 2000 grados— y
        // aunque los rumbos sean equivalentes de a 360, arrastrar numeros
        // grandes invita a errores de rango en todo lo que los compare.
        this.rumbo = normalizarRumbo(this.rumbo + dt * 18);
        break;

      case EstadoZombi.ALERT:
        // Se orienta hacia el ruido antes de moverse. El medio segundo de
        // pausa es lo que da tiempo a reaccionar al jugador.
        if (this.ultimoVisto) {
          this.rumbo = this.#rumboHacia(pos, this.ultimoVisto);
        }
        if (this.tiempoEnEstado > 0.5) this.#cambiarA(EstadoZombi.SEARCH);
        break;

      case EstadoZombi.CHASE: {
        if (!deteccion) {
          this.#cambiarA(EstadoZombi.SEARCH);
          break;
        }
        const d = Math.hypot(jugador.x - pos.x, jugador.z - pos.z);
        if (d <= this.cfg.attackRange) {
          this.#cambiarA(EstadoZombi.ATTACK);
          break;
        }
        objetivo = jugador;
        velocidad = this.cfg.chaseSpeed;
        break;
      }

      case EstadoZombi.SEARCH: {
        const destino = this.ultimoVisto ?? this.origen;
        const d = Math.hypot(destino.x - pos.x, destino.z - pos.z);
        if (d < 1.5 || this.tiempoEnEstado > this.cfg.searchDuration) {
          this.ultimoVisto = null;
          this.#cambiarA(EstadoZombi.IDLE);
          break;
        }
        objetivo = destino;
        velocidad = this.cfg.walkSpeed;
        break;
      }

      case EstadoZombi.ATTACK: {
        const d = Math.hypot(jugador.x - pos.x, jugador.z - pos.z);
        // Un poco de margen para salir, asi no parpadea entre atacar y
        // perseguir cuando el jugador camina justo en el limite.
        if (!jugadorVivo || d > this.cfg.attackRange * 1.25) {
          this.#cambiarA(deteccion ? EstadoZombi.CHASE : EstadoZombi.SEARCH);
          break;
        }
        this.rumbo = this.#rumboHacia(pos, jugador);
        if (this.esperaAtaque <= 0) {
          this.esperaAtaque = this.cfg.attackCooldown;
          return { dirX: 0, dirZ: 0, velocidad: 0, atacar: true };
        }
        break;
      }
    }

    if (!objetivo) {
      // Aun quieto, se separa de los companeros encimados.
      const sep = this.#separar(pos, vecinos);
      if (sep.x || sep.z) {
        return { dirX: sep.x, dirZ: sep.z, velocidad: this.cfg.walkSpeed * 0.5, atacar: false };
      }
      return quieto;
    }

    // --- Direccion final ----------------------------------------------------
    let dx = objetivo.x - pos.x;
    let dz = objetivo.z - pos.z;
    const largo = Math.hypot(dx, dz) || 1;
    dx /= largo;
    dz /= largo;

    const esquivado = this.#esquivar(pos, dx, dz);
    const sep = this.#separar(pos, vecinos);

    // La separacion pesa menos que ir hacia el objetivo: si pesara igual,
    // una horda se abriria en abanico en vez de cerrarse sobre el jugador.
    let fx = esquivado.x + sep.x * 0.8;
    let fz = esquivado.z + sep.z * 0.8;
    const mag = Math.hypot(fx, fz) || 1;
    fx /= mag;
    fz /= mag;

    this.rumbo = rumboHacia(fx, fz);
    return { dirX: fx, dirZ: fz, velocidad, atacar: false };
  }

  #rumboHacia(pos, objetivo) {
    return rumboEntre(pos, objetivo);
  }
}
