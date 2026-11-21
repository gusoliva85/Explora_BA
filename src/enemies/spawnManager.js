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
      /*
       * La variante sale del indice, no del azar.
       *
       * Asi quedan repartidas parejo: con doce zombis en reserva hay
       * cuatro de cada una. Con azar podrian salir doce iguales, que es
       * justo lo que las variantes vienen a evitar.
       */
      this.reserva.push(
        new Zombie(this.app, this.world, this.mats, this.grupoLote.id, this.reserva.length)
      );
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
      /*
       * Cuantos zombis pone la zona.
       *
       * Si la zona lo declara, manda ella. Es **la perilla que decide
       * cuanto dura cada cuadra** (19A.11), y con la esclusa pasa a ser lo
       * mas sensible del juego: la puerta no abre hasta que no quede uno
       * vivo en el tramo, asi que este numero por 1,6 s —lo que cuesta
       * matar uno (D-31)— es el piso del tiempo que el jugador pasa ahi.
       *
       * El `peso * 5` queda de respaldo para las zonas sueltas puestas a
       * mano, que no declaran cantidad.
       */
      const cuantos = zona.cantidad ?? Math.max(1, Math.round(zona.peso * 5));
      for (let i = 0; i < cuantos; i++) {
        const p = this.#puntoLibre(zona);
        /*
         * El puesto se queda con **el tramo** de su zona, no solo con su
         * nota (19A.1).
         *
         * Hasta ahora llevaba `zona.nota`, que es un texto para leer en el
         * diagnostico. La esclusa necesita otra cosa: poder preguntar
         * **cuantos quedan vivos en ESTE tramo**, y un texto no se cuenta.
         */
        if (p) puestos.push({ ...p, tramo: zona.tramo ?? 0, zona: zona.nota });
      }
    }
    return puestos;
  }

  /**
   * Busca una posicion dentro de la zona que no caiga sobre un obstaculo.
   *
   * ---------------------------------------------------------------------------
   * UNA ZONA ES UN CORREDOR DE CALLE, NO UN CIRCULO
   * ---------------------------------------------------------------------------
   * Hasta la Fase 18.9 las zonas eran circulos y funcionaban de casualidad:
   * eran chicas y estaban puestas a mano encima de la calzada.
   *
   * Con una zona por tramo (D-46) el circulo se rompe. Un tramo son
   * doscientos metros, asi que el circulo tiene cien de radio: **31.400 m²,
   * de los cuales la calle son 3.200**. El 90 % de los intentos cae adentro
   * de un edificio y se descarta.
   *
   * Y con la ciudad por tramos (18.12) eso dejo de ser solo ineficiente y
   * paso a ser un error visible: **las cuadras que todavia no se
   * construyeron no tienen cajas de colision**, asi que ahi ningun punto se
   * descarta. El resultado era que los veintisiete zombis se juntaban todos
   * en la parte del mapa que no existia todavia, a ciento cuarenta metros
   * del jugador, y las primeras cuadras quedaban vacias.
   *
   * Asi que una zona con `a` y `b` es **el tramo de calle entre esos dos
   * puntos**: se sortea a lo largo y se desvia de costado como mucho medio
   * ancho de calzada. Las redondas siguen andando para lo colocado a mano.
   */
  #puntoLibre(zona) {
    for (let intento = 0; intento < 24; intento++) {
      let x;
      let z;

      if (zona.a && zona.b) {
        const t = this.rng();
        const largo = Math.hypot(zona.b.x - zona.a.x, zona.b.z - zona.a.z) || 1;
        const dx = (zona.b.x - zona.a.x) / largo;
        const dz = (zona.b.z - zona.a.z) / largo;
        // Perpendicular a la calle, para el desvio de costado.
        const lateral = (this.rng() * 2 - 1) * (zona.ancho ?? 6) * 0.5;
        x = zona.a.x + dx * largo * t - dz * lateral;
        z = zona.a.z + dz * largo * t + dx * lateral;
      } else {
        const ang = this.rng() * Math.PI * 2;
        const r = Math.sqrt(this.rng()) * zona.radio;
        x = zona.x + Math.cos(ang) * r;
        z = zona.z + Math.sin(ang) * r;
      }

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

  /**
   * Cuantos zombis quedan **vivos** en un tramo (19A.1, D-37).
   *
   * ---------------------------------------------------------------------------
   * SE CUENTAN LOS PUESTOS, NO LOS QUE ESTAN EN PANTALLA
   * ---------------------------------------------------------------------------
   * Es la unica forma correcta y conviene entender por que. `enJuego` son
   * los que estan encendidos **cerca del jugador**: un zombi del tramo que
   * quedo a sesenta metros no esta ahi, y contarlo asi daria cero con el
   * tramo todavia sucio. La puerta abriria antes de tiempo.
   *
   * Un puesto que no esta en `puestosUsados` es un zombi **que todavia no
   * aparecio pero existe**. Uno que esta marcado y cuyo zombi ya no esta
   * encendido es **un muerto**. Esa distincion es exactamente el arreglo
   * de la 19A.0.
   */
  vivosEnTramo(tramo) {
    let vivos = 0;
    for (let i = 0; i < this.puestos.length; i++) {
      if (this.puestos[i].tramo !== tramo) continue;
      // Sin usar: todavia no aparecio, pero esta vivo.
      if (!this.puestosUsados.has(i)) {
        vivos++;
        continue;
      }
      // Usado: vive mientras su zombi siga vivo.
      const z = this.enJuego.find((e) => e.puestoId === i);
      if (z && z.vivo) vivos++;
    }
    return vivos;
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
        /*
         * Aca el puesto NO se libera: si llego inactivo a este punto es
         * porque murio, y un muerto no vuelve (D-31). Es la otra mitad de
         * la regla de arriba, y la que hace que limpiar un tramo sea
         * permanente.
         */
        this.enJuego.splice(i, 1);
        continue;
      }
      const p = z.posicion;
      const d = Math.hypot(p.x - jugador.x, p.z - jugador.z);
      // Un zombi que te esta persiguiendo no se apaga aunque te alejes: se
      // apagaria justo cuando mas importa que siga ahi.
      if (d > corte * 1.4 && !z.ai.persiguiendo) {
        /*
         * 🐛 EL ZOMBI QUE DESAPARECIA SIN MORIR (19A.0)
         * -------------------------------------------------------------------
         * Al alejarse, el zombi se apaga y sale de `enJuego` — **pero su
         * puesto quedaba marcado en `puestosUsados` para siempre**. O sea
         * que un zombi del que te alejabas se iba del juego sin morir y no
         * volvia nunca.
         *
         * Era invisible porque hasta ahora nada dependia de las muertes:
         * el jugador corria hacia la meta y un zombi de menos no se nota.
         *
         * Con la esclusa (D-37) deja de ser invisible y pasa a ser fatal:
         * el jugador recibe la orden de matar a todos los del tramo, y
         * algunos **ya no existen**. La puerta no abre jamas y la partida
         * es imposible de terminar.
         *
         * El puesto se libera porque el zombi **sigue vivo**: no murio, se
         * apago. Los puestos de los muertos quedan marcados, que es lo que
         * hace que un tramo se pueda limpiar de verdad.
         */
        if (z.puestoId !== undefined) this.puestosUsados.delete(z.puestoId);
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
      libre.tramo = puesto.tramo;
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
