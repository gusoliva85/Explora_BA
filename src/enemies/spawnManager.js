import { PERF, ZOMBIE_STANDARD, NOISE } from '../config/balance.js';
import { createRng } from '../core/rng.js';
import { Zombie } from './zombie.js';
import { EV } from '../core/events.js';

/**
 * ===========================================================================
 * APARICION DE ZOMBIS
 * ===========================================================================
 * Reparte los zombis por las zonas que define la mision y decide cuales
 * piensan en cada cuadro.
 *
 * ---------------------------------------------------------------------------
 * TRES REGLAS QUE SOSTIENEN TODO
 * ---------------------------------------------------------------------------
 * 1. SE RECICLAN, NO SE CREAN.
 *    Las entidades se crean una vez al cargar y despues se encienden y se
 *    apagan. Crear y destruir objetos en pleno juego produce tirones por
 *    recoleccion de basura, y en un telefono eso se ve.
 *
 * 2. SOLO PIENSAN LOS CERCANOS.
 *    Un zombi a ochenta metros no tiene nada que decidir. Por encima de la
 *    distancia de corte deja de actualizarse del todo. Esto es lo que
 *    permite tener cuarenta zombis repartidos por el mapa y pagar solo por
 *    los que importan.
 *
 * 3. HAY UN TOPE DE ACTIVOS.
 *    Aunque el jugador junte a media cuadra, nunca se simulan mas de los
 *    que el telefono aguanta. Los que sobran esperan apagados.
 *
 * ---------------------------------------------------------------------------
 * DE DONDE SALEN
 * ---------------------------------------------------------------------------
 * De las zonas de `mission.zonas` con tipo `zombis`, que se definieron en
 * la Fase 3 con el mapa fresco. Cada zona tiene un peso de 0 a 1 que dice
 * cuanta presion pone, y de ahi sale cuantos le tocan.
 *
 * La posicion exacta dentro de la zona es aleatoria pero con semilla: la
 * misma partida tiene siempre los mismos zombis en los mismos lugares, que
 * es lo que permite ajustar la dificultad comparando intentos.
 */

export class SpawnManager {
  /**
   * @param {pc.Application} app
   * @param {import('../physics/collisionWorld.js').CollisionWorld} world
   * @param {import('../world/palette.js').Materiales} mats
   * @param {import('../core/events.js').EventBus} bus
   */
  constructor(app, world, mats, bus) {
    this.app = app;
    this.world = world;
    this.mats = mats;
    this.bus = bus;

    /** @type {Zombie[]} reserva completa, activos y apagados. */
    this.reserva = [];
    /** @type {Zombie[]} los que estan en juego ahora. */
    this.enJuego = [];

    this.mission = null;
    this.rng = null;

    /** Posiciones donde reaparecer, calculadas una vez por partida. */
    this.puestos = [];

    /*
     * Grupo dinamico para todos los zombis. Al marcarlo como dinamico, el
     * motor entiende que estas mallas se mueven y rehace los buffers en
     * cada cuadro. El tope de tamaño es chico porque los zombis andan
     * juntos: lotes grandes no aportarian y empeorarian el descarte.
     */
    this.grupoLote = this.app.batcher.addGroup('zombis', true, 24);

    this.stats = { total: 0, vivos: 0, pensando: 0 };
  }

  /**
   * Prepara la reserva y calcula los puestos. Se llama una vez por mision.
   */
  preparar(mission) {
    this.mission = mission;
    this.rng = createRng(mission.seed ^ 0x5a5a);
    this.puestos = this.#calcularPuestos(mission);

    // La reserva se dimensiona por lo que puede haber en juego a la vez,
    // no por el total del mapa: los lejanos estan apagados igual.
    const necesarios = Math.min(this.puestos.length, PERF.maxActiveZombies + 6);
    while (this.reserva.length < necesarios) {
      this.reserva.push(new Zombie(this.app, this.world, this.mats, this.grupoLote.id));
    }
    this.stats.total = this.puestos.length;
    // Armar los lotes una vez creadas todas las entidades.
    this.app.batcher.generate([this.grupoLote]);
  }

  /**
   * Reparte puestos entre las zonas, proporcional al peso.
   *
   * Se evita colocar un zombi dentro de una pared: se prueban varias
   * posiciones y se descartan las que caen sobre un colisionador. Un zombi
   * encerrado en un edificio no molesta a nadie, pero gasta un puesto que
   * hacia falta en la calle.
   */
  #calcularPuestos(mission) {
    const zonas = (mission.zonas ?? []).filter((z) => z.tipo === 'zombis');
    const puestos = [];

    for (const zona of zonas) {
      // El peso se traduce a cantidad: una zona de peso 1 pone cinco.
      const cuantos = Math.max(1, Math.round(zona.peso * 5));
      for (let i = 0; i < cuantos; i++) {
        const p = this.#puntoLibre(zona);
        if (p) puestos.push({ ...p, zona: zona.nota });
      }
    }
    return puestos;
  }

  /** Busca una posicion dentro de la zona que no caiga sobre un obstaculo. */
  #puntoLibre(zona) {
    for (let intento = 0; intento < 24; intento++) {
      const a = this.rng() * Math.PI * 2;
      const r = Math.sqrt(this.rng()) * zona.radio;
      const x = zona.x + Math.cos(a) * r;
      const z = zona.z + Math.sin(a) * r;

      // El radio de prueba es mayor que el del zombi: si nace pegado a una
      // pared, el primer paso lo traba.
      const cajas = this.world.query(x, z, ZOMBIE_STANDARD.collisionRadius * 2.5);
      let libre = true;
      for (const b of cajas) {
        const nx = Math.max(b.minX, Math.min(x, b.maxX));
        const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
        const d = Math.hypot(x - nx, z - nz);
        if (d < ZOMBIE_STANDARD.collisionRadius * 2.5) {
          libre = false;
          break;
        }
      }
      if (libre) return { x, z };
    }
    return null;
  }

  /** Vuelve todo al estado inicial. Lo llama el reinicio de la mision. */
  reiniciar() {
    for (const z of this.reserva) z.desactivar();
    this.enJuego.length = 0;
    this.puestosUsados = new Set();
    if (this.mission) this.rng = createRng(this.mission.seed ^ 0x5a5a);
    this.stats.vivos = 0;
    this.stats.pensando = 0;
  }

  /**
   * Enciende los zombis cuyo puesto esta cerca del jugador y apaga los que
   * quedaron lejos.
   */
  #gestionarPoblacion(jugador) {
    const corte = PERF.zombieCullDistance;

    // Apagar los que se fueron de rango y ya no estan persiguiendo.
    for (let i = this.enJuego.length - 1; i >= 0; i--) {
      const z = this.enJuego[i];
      if (!z.activo) {
        this.enJuego.splice(i, 1);
        continue;
      }
      const p = z.posicion;
      const d = Math.hypot(p.x - jugador.x, p.z - jugador.z);
      // Un zombi que te esta persiguiendo no se apaga aunque te alejes: se
      // apagaria justo cuando mas importa que siga ahi.
      if (d > corte * 1.4 && !z.ai.persiguiendo) {
        z.desactivar();
        this.enJuego.splice(i, 1);
      }
    }

    if (this.enJuego.length >= PERF.maxActiveZombies) return;

    // Encender los puestos cercanos que todavia no estan ocupados.
    for (let i = 0; i < this.puestos.length; i++) {
      if (this.enJuego.length >= PERF.maxActiveZombies) break;
      if (this.puestosUsados.has(i)) continue;

      const puesto = this.puestos[i];
      const d = Math.hypot(puesto.x - jugador.x, puesto.z - jugador.z);
      if (d > corte) continue;
      // Tampoco encima del jugador: un zombi que aparece de la nada a tres
      // metros no es tension, es una trampa.
      if (d < 12) continue;

      const libre = this.reserva.find((z) => !z.activo);
      if (!libre) break;

      libre.activar(puesto.x, puesto.z, this.rng);
      libre.puestoId = i;
      this.puestosUsados.add(i);
      this.enJuego.push(libre);
    }
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} jugador
   * @param {boolean} jugadorVivo
   * @param {(daño:number, zombi:Zombie) => void} alAtacar
   */
  update(dt, jugador, jugadorVivo, alAtacar) {
    if (!this.mission) return;
    if (!this.puestosUsados) this.puestosUsados = new Set();

    this.#gestionarPoblacion(jugador);

    let vivos = 0;
    let pensando = 0;

    for (const z of this.enJuego) {
      if (!z.activo) continue;

      const p = z.posicion;
      const d = Math.hypot(p.x - jugador.x, p.z - jugador.z);

      // Fuera de rango de pensamiento: ni se actualiza. Es la regla 2.
      if (d > PERF.zombieCullDistance) continue;
      pensando++;
      if (z.vivo) vivos++;

      // Vecinos para la separacion. Solo los que de verdad estan encima:
      // comparar contra todos seria cuadratico y no aporta nada.
      const vecinos = [];
      for (const otro of this.enJuego) {
        if (otro === z || !otro.vivo) continue;
        const q = otro.posicion;
        if (Math.abs(q.x - p.x) < 2.5 && Math.abs(q.z - p.z) < 2.5) {
          vecinos.push({ x: q.x, z: q.z });
        }
      }

      const ataco = z.update(dt, jugador, jugadorVivo, vecinos);
      if (ataco) alAtacar?.(z.cfg.attackDamage, z);
    }

    this.stats.vivos = vivos;
    this.stats.pensando = pensando;
  }

  /**
   * Un ruido atrae a todos los que lo escuchen (D-05).
   *
   * Es el mecanismo central de la Fase 6: lo que convierte disparar en una
   * decision y no en la opcion obviamente mejor. El cuchillo no es un arma
   * de emergencia, es el arma silenciosa, y eso no significa nada hasta que
   * exista algo ruidoso.
   *
   * ---------------------------------------------------------------------------
   * QUIENES ALCANZA A ESCUCHARLO
   * ---------------------------------------------------------------------------
   * Solo los zombis EN JUEGO. Los que estan mas alla de la distancia de
   * corte tienen la IA apagada y no se enteran de nada.
   *
   * Es una limitacion real y conviene tenerla escrita: el radio del disparo
   * son 22 m y el corte esta en 55, asi que hoy no cambia nada. Si alguna
   * vez un arma hiciera mas ruido que la distancia de corte, habria que
   * despertar a los que estan fuera, y nadie se acordaria de por que el
   * ruido "no llega" mas alla de cierto punto.
   *
   * @returns {number} cuantos lo escucharon
   */
  propagarRuido(x, z, radio) {
    // El multiplicador global es la perilla para hacer el juego mas tenso
    // de una sola vez, sin tocar el balance de cada arma.
    const alcance = radio * NOISE.rangeMultiplier;

    let alertados = 0;
    for (const zb of this.enJuego) {
      if (zb.vivo && zb.ai.oirRuido(x, z, alcance, zb.posicion)) alertados++;
    }

    /*
     * El evento se emite SIEMPRE, aunque no lo haya escuchado nadie.
     *
     * Es lo que permite dibujar el circulo del ruido en modo diagnostico
     * incluso cuando no hay zombis cerca, que es justo el caso en el que
     * uno quiere ver hasta donde llego: si solo se emitiera al alertar a
     * alguien, el diagnostico mostraria el radio unicamente cuando ya no
     * hace falta mirarlo.
     */
    this.bus?.emit(EV.NOISE_EMITTED, { x, z, radio: alcance, alertados });
    return alertados;
  }

  /** @returns {Zombie[]} los vivos dentro de un radio. Lo usara el combate. */
  vivosCerca(x, z, radio) {
    const out = [];
    for (const zb of this.enJuego) {
      if (!zb.vivo) continue;
      const p = zb.posicion;
      if (Math.hypot(p.x - x, p.z - z) <= radio) out.push(zb);
    }
    return out;
  }

  destruir() {
    for (const z of this.reserva) z.destruir();
    this.reserva.length = 0;
    this.enJuego.length = 0;
  }
}
