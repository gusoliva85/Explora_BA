import { PERF, ZOMBIE_STANDARD, NOISE } from '../config/balance.js';
import { createRng } from '../core/rng.js';
import { dirDeRumbo } from '../core/rumbo.js';
import { Zombie } from './zombie.js';
import { EV } from '../core/events.js';

/**
 * Altura a la que se comprueba si el jugador ve un puesto (19B.3).
 *
 * Es la del pecho, la misma a la que mira un zombi: un auto tapa, un cordon
 * no. No se usa la de la camara —doce metros— a proposito, porque desde ahi
 * no tapa nada y la regla no existiria.
 */
const ALTURA_VISTA = 1.5;

/**
 * Hasta donde molesta ver aparecer a uno.
 *
 * -------------------------------------------------------------------------
 * LA REGLA SOLO VALE DE CERCA, Y ESO LO DIJO UNA CAPTURA
 * -------------------------------------------------------------------------
 * La primera version no miraba la distancia: bastaba con que hubiera linea
 * de vista. Y una captura del arranque mostro **el contador en 16 y la
 * calle vacia**, que es peor que el problema que venia a arreglar.
 *
 * El motivo es geometrico y obvio una vez visto: *una cuadra es una recta
 * de doscientos metros*. Desde la vereda se ve entera, asi que la regla
 * bloqueaba todo y el tramo tardaba dos segundos en existir.
 *
 * A treinta metros, uno que aparece se lee como alguien que acaba de salir
 * de un zaguan —no se estaba mirando ese punto, se estaba mirando la
 * calle—. A quince, en el medio del asfalto vacio, se lee como un error
 * del juego. La molestia es de cerca; la regla, tambien.
 */
const DISTANCIA_POP = 30;

/**
 * ===========================================================================
 * LAS EMBOSCADAS (19B.6)
 * ===========================================================================
 * Un tercio de los zombis esta puesto en el mapa desde el principio. Los
 * otros dos tercios **no tienen lugar hasta que haga falta**: salen de
 * atras de un auto o de un zaguan, cerca tuyo, cuando llegas.
 *
 * ---------------------------------------------------------------------------
 * POR QUE, Y NO ES PARA QUE SEAN MAS
 * ---------------------------------------------------------------------------
 * Con todos repartidos por la calle, el juego se resolvia asi: los ves de
 * lejos, esperas a tenerlos a tiro, te quedas quieto y disparas. Lo dijo
 * Gus: *"estan constantemente lejos y lo unico que haces es quedarte
 * quieto, disparar y listo"*.
 *
 * Un zombi que aparece a doce metros de atras de un auto no se resuelve
 * asi. Hay que **moverse primero y disparar despues**, que es el bucle que
 * el juego busca desde que el combate es automatico (D-28).
 *
 * ---------------------------------------------------------------------------
 * LOS CARRILES DE DONDE SALEN
 * ---------------------------------------------------------------------------
 * Distancias al eje de la calle, en metros:
 *
 *   ±3,6  **el carril de los autos.** Ahi se generan los abandonados, asi
 *         que un zombi que aparece ahi aparece *al lado de un auto*, y
 *         casi siempre tapado por el.
 *   ±5,8  **la linea municipal**: el cordon y los zaguanes. Un zombi que
 *         aparece ahi sale de una puerta.
 *
 * No hace falta buscar la posicion exacta de cada auto ni de cada puerta:
 * los dos carriles estan donde estan *por construccion*, porque el
 * generador pone los autos y las fachadas con esas mismas medidas.
 */
const CARRILES_EMBOSCADA = [-5.8, -3.6, 3.6, 5.8];

/** Ni encima ni lejos: la emboscada tiene que obligar a moverse. */
const EMBOSCADA_MIN = 9;
const EMBOSCADA_MAX = 20;

/**
 * ===========================================================================
 * LA VALVULA, QUE NO ES OPCIONAL
 * ===========================================================================
 * Una emboscada pide tres cosas a la vez —cerca, adelante y tapada— y
 * puede no encontrar ninguna. Eso esta bien: espera.
 *
 * Lo que NO puede pasar es que espere para siempre, y la primera version
 * lo hacia: **el tramo 0 se quedaba con seis vivos despues de trescientas
 * vueltas.** Con la esclusa (D-37) eso no es una molestia, es una partida
 * imposible de terminar: el contador dice "quedan 6" y no hay seis en
 * ningun lado.
 *
 * Asi que la exigencia se afloja sola con el tiempo que lleve sin poder
 * encender a nadie:
 *
 *   < 3 s    cerca, adelante y tapada. La emboscada de verdad.
 *   3 a 7 s  se perdona lo de tapada. Sigue saliendo cerca y de frente.
 *   > 7 s    se perdona tambien la distancia: hasta el corte entero.
 *
 * Lo que **nunca** se afloja es *adelante*. Esa no es una condicion de
 * ritmo sino de camara: a las espaldas no hay pantalla, y un zombi que
 * aparece ahi no es dificil, es invisible.
 */
const AFLOJAR_TAPADA = 3;
const AFLOJAR_DISTANCIA = 7;

/**
 * Lo que hay que tener delante para que algo pueda aparecer.
 *
 * -------------------------------------------------------------------------
 * NUNCA A LAS ESPALDAS, Y ES UNA REGLA DE CAMARA
 * -------------------------------------------------------------------------
 * Gus: *"no quiero que entren zombies que esten por detras de uno porque
 * uno no los puede ver en base a como esta la camara"*.
 *
 * Y tiene razon de una forma que no es de gusto: la camara es cenital y
 * va **detras** del jugador, asi que lo que esta a sus espaldas no esta
 * lejos en pantalla, esta FUERA de la pantalla. Un zombi que se enciende
 * ahi no aparece: se materializa en un lugar que el jugador no tiene forma
 * de mirar, y lo unico que percibe es que lo muerden de la nada.
 *
 * 0,15 deja pasar un poco mas de un cuarto de vuelta a cada lado del
 * frente —lo que entra en pantalla y un margen— y descarta el resto.
 */
const DELANTE_MINIMO = 0.15;

/**
 * Cuanto se posterga como mucho un zombi por estar a la vista.
 *
 * Es la valvula de escape de la regla de arriba, y existe para que una
 * partida no se pueda trabar. Dos segundos es tiempo de sobra para que el
 * jugador mueva la camara medio metro, y lo bastante corto para que si de
 * verdad no hay donde esconderlo, el juego siga.
 */
const ESPERA_A_CIEGAS = 2.0;

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

    /*
     * Las zonas agrupadas por tramo.
     *
     * Una emboscada **no pertenece a su cuadra, pertenece a su tramo**, y
     * esa fue la otra mitad del error de arriba. Atada a la cuadra, la que
     * nacia en la primera cuadra de un tramo no podia aparecer nunca mas
     * una vez que el jugador pasaba a la segunda — y el jugador termina el
     * tramo **parado contra la puerta**, que esta al final de la segunda.
     * O sea que las de la primera cuadra quedaban muertas de hambre
     * justo cuando el contador las estaba esperando.
     *
     * Atada al tramo, sale por donde el jugador este. Y eso ademas es
     * mejor juego: la ultima pelea de cada tramo ocurre en la puerta.
     */
    this.zonasPorTramo = new Map();
    for (const z of (mission.zonas ?? []).filter((z) => z.tipo === 'zombis')) {
      const t = z.tramo ?? 0;
      if (!this.zonasPorTramo.has(t)) this.zonasPorTramo.set(t, []);
      this.zonasPorTramo.get(t).push(z);
    }

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

      /*
       * UN TERCIO PUESTO, DOS TERCIOS EMBOSCADA (19B.6).
       *
       * Los fijos son los que se ven de lejos y dan la forma de la cuadra.
       * Los otros no tienen lugar todavia: se lo buscan cuando el jugador
       * llega, al lado de un auto o en un zaguan. Ver `#lugarDeEmboscada`.
       *
       * El reparto es por zona y no global, para que *cada cuadra* tenga
       * de las dos clases: un tercio global podria dejar cuadras enteras
       * sin nadie a la vista, y una cuadra que se ve vacia no se camina
       * con cuidado.
       */
      const fijos = Math.max(1, Math.round(cuantos / 3));

      for (let i = 0; i < cuantos; i++) {
        if (i >= fijos) {
          /*
           * Una emboscada es un puesto SIN POSICION. Y eso, de paso,
           * arregla de raiz el problema que obligo a encerrar los puestos
           * fijos en el carril del medio: las posiciones se calculan al
           * empezar la mision, cuando las cuadras lejanas todavia no
           * tienen una sola caja de colision contra la cual verificar
           * nada. La emboscada se ubica **cuando la cuadra ya esta en
           * pie**, asi que puede comprobar de verdad.
           */
          puestos.push({
            emboscada: true,
            zona,
            tramo: zona.tramo ?? 0,
            zonaNota: zona.nota
          });
          continue;
        }

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

  /** Distancia del jugador al eje de una cuadra. */
  #distanciaAlEje(zona, jugador) {
    if (!zona?.a || !zona?.b) return Infinity;
    const dx = zona.b.x - zona.a.x;
    const dz = zona.b.z - zona.a.z;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((jugador.x - zona.a.x) * dx + (jugador.z - zona.a.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(jugador.x - (zona.a.x + dx * t), jugador.z - (zona.a.z + dz * t));
  }

  /**
   * La cuadra de ESTE TRAMO por la que anda el jugador.
   *
   * Es la que presta la calle para la emboscada. Ver `zonasPorTramo`: lo
   * que no puede pasar es que una emboscada dependa de la cuadra donde
   * estaba escrita, porque el jugador termina el tramo contra la puerta.
   */
  #zonaDelJugador(tramo, jugador) {
    let mejor = null;
    let mejorD = 14;
    for (const z of this.zonasPorTramo?.get(tramo) ?? []) {
      const d = this.#distanciaAlEje(z, jugador);
      if (d < mejorD) {
        mejorD = d;
        mejor = z;
      }
    }
    return mejor;
  }

  /**
   * ¿Esta libre este punto? Mismo criterio que `#puntoLibre`, pero suelto:
   * la emboscada no sortea dentro de una zona, elige un carril.
   */
  #libre(x, z) {
    const r = ZOMBIE_STANDARD.collisionRadius * 2.5;
    for (const b of this.world.query(x, z, r)) {
      const nx = Math.max(b.minX, Math.min(x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
      if (Math.hypot(x - nx, z - nz) < r) return false;
    }
    return true;
  }

  /**
   * Busca de donde sale una emboscada: **cerca, adelante y tapado**.
   *
   * Las tres condiciones a la vez son la emboscada. Si falta alguna deja
   * de serlo:
   *
   *  - **cerca** (9 a 20 m) o no obliga a moverse, que es todo el punto;
   *  - **adelante** o aparece donde la camara no llega (ver
   *    `DELANTE_MINIMO`);
   *  - **tapado**, o sea sin linea de vista, porque lo que tiene que ver
   *    el jugador es *un zombi que sale de atras de un auto*, no un zombi
   *    que se materializa en el asfalto vacio.
   *
   * Si no encuentra ninguno devuelve null y el puesto espera. No pasa
   * nada: esperar es gratis y la esclusa lo sigue contando vivo, asi que
   * el tramo no se puede terminar sin el.
   *
   * @returns {{x:number,z:number}|null}
   */
  #lugarDeEmboscada(zona, jugador, adelante, espera = 0) {
    if (!zona?.a || !zona?.b) return null;

    // Ver la valvula, arriba.
    const exigirTapada = espera < AFLOJAR_TAPADA;
    const lejos = espera < AFLOJAR_DISTANCIA ? EMBOSCADA_MAX : PERF.zombieCullDistance;

    const largo = Math.hypot(zona.b.x - zona.a.x, zona.b.z - zona.a.z) || 1;
    const ux = (zona.b.x - zona.a.x) / largo;
    const uz = (zona.b.z - zona.a.z) / largo;

    // Donde cae el jugador sobre el eje de la cuadra.
    const t0 = (jugador.x - zona.a.x) * ux + (jugador.z - zona.a.z) * uz;

    for (let intento = 0; intento < 12; intento++) {
      /*
       * El avance puede ser hacia adelante o hacia atras SOBRE LA CALLE, y
       * eso no contradice lo de "nunca a las espaldas": el jugador puede
       * estar mirando hacia atras. Quien decide es la camara, abajo.
       */
      const avance = (this.rng() * 2 - 1) * lejos;
      const t = Math.max(0, Math.min(largo, t0 + avance));
      const carril = CARRILES_EMBOSCADA[Math.floor(this.rng() * CARRILES_EMBOSCADA.length)];

      const x = zona.a.x + ux * t - uz * carril;
      const z = zona.a.z + uz * t + ux * carril;

      const dx = x - jugador.x;
      const dz = z - jugador.z;
      const d = Math.hypot(dx, dz);
      if (d < EMBOSCADA_MIN || d > lejos) continue;

      // Adelante, siempre.
      if ((dx / d) * adelante.x + (dz / d) * adelante.z < DELANTE_MINIMO) continue;

      // Y tapado: que salga de atras de algo. Esto es lo primero que se
      // perdona si el tramo no avanza.
      if (exigirTapada && this.world.hasLineOfSight(jugador.x, jugador.z, x, z, ALTURA_VISTA)) {
        continue;
      }

      if (!this.#libre(x, z)) continue;
      return { x, z };
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
    this.esperandoLugar = 0;
    if (this.mission) {
      this.rng = createRng(this.mission.seed ^ 0x5a5a);
      /*
       * Los puestos se RECALCULAN, no se reusan.
       *
       * Un puesto fijo del que el jugador se alejo quedo convertido en
       * emboscada y sin su lugar original (19B.6). Reusar la lista
       * arrastraria esas conversiones a la partida siguiente: cada
       * reintento tendria menos zombis puestos en el mapa que el anterior,
       * **y el mapa cambiaria sin que nadie lo haya decidido**.
       *
       * Recalcular cuesta nada —un puesto son dos numeros— y devuelve el
       * reparto exacto del primer intento, que es lo que permite comparar
       * dos intentos entre si.
       */
      this.puestos = this.#calcularPuestos(this.mission);
      this.stats.total = this.puestos.length;
    }
    this.stats.vivos = 0;
    this.stats.pensando = 0;
  }

  /**
   * Enciende los zombis cuyo puesto esta cerca del jugador y apaga los que
   * quedaron lejos.
   */
  #gestionarPoblacion(jugador, dt, rumboCamara) {
    const corte = PERF.zombieCullDistance;
    /*
     * Hacia donde mira la camara. Es lo que define "adelante", y no el
     * rumbo del jugador: lo que el jugador puede ver es lo que la camara
     * encuadra. Ver `DELANTE_MINIMO`.
     */
    const adelante = dirDeRumbo(rumboCamara ?? 0);

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
      /*
       * 🐛 Y EL CADAVER QUE RESUCITABA AL ALEJARTE (19B.1)
       * ---------------------------------------------------------------------
       * El hermano exacto del de abajo, y aparecio recien cuando los zombis
       * se volvieron rapidos y hubo que matar y correr.
       *
       * Un zombi muerto **sigue `activo` seis segundos**: es el cadaver en
       * el piso. Si en esos seis segundos el jugador se alejaba mas de 77
       * metros, caia por esta rama —esta lejos y no persigue, porque esta
       * muerto— y **se le liberaba el puesto**. O sea que volvia a contar
       * como vivo y volvia a aparecer entero mas tarde.
       *
       * Con cinco zombis lentos por tramo no se notaba: matabas parado y
       * los veias desarmarse. Con dieciseis que corren a 5,2, matar y salir
       * corriendo es LA forma de jugar, asi que pasaba todo el tiempo — y
       * con la esclusa (D-37) significa que **el contador no baja nunca y
       * el tramo no se puede limpiar.**
       *
       * Lo encontro una medicion, no el ojo: ciento veinte vueltas matando
       * todo lo que se encendia y el tramo seguia con ocho vivos.
       *
       * La condicion, entonces, es `z.vivo` y no `z.activo`: lo que vuelve
       * es el que se apago, nunca el que murio.
       */
      if (z.vivo && d > corte * 1.4 && !z.ai.persiguiendo) {
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
        if (z.puestoId !== undefined) {
          this.puestosUsados.delete(z.puestoId);
          /*
           * Y DESDE ACA ES UNA EMBOSCADA (19B.6).
           *
           * El puesto conservaba su posicion original. Para un zombi del
           * que te alejaste cien metros eso significa que **no vuelve a
           * entrar en rango nunca**: la ventana de encendido son 55 m.
           *
           * Mientras el jugador cruzaba el tramo de punta a punta no se
           * notaba, porque pasaba cerca de todo. Se volvio fatal cuando el
           * tramo pasa a terminar con el jugador **parado contra una
           * puerta que no abre hasta que no quede uno vivo** (D-37): lo
           * que quedo atras se cuenta vivo y no puede aparecer, y la
           * partida no se puede terminar.
           *
           * Convertido en emboscada, pierde el lugar donde estaba y vuelve
           * por donde esta el jugador. Que ademas es lo que hace un zombi
           * al que le escapaste: **te siguio.**
           */
          const puesto = this.puestos[z.puestoId];
          if (puesto) puesto.emboscada = true;
        }
        z.desactivar();
        this.enJuego.splice(i, 1);
      }
    }

    /*
     * EL CUPO CUENTA VIVOS, NO CUERPOS.
     *
     * Un muerto sigue `activo` seis segundos: es el cadaver en el piso. Si
     * cuenta para el tope, **una pelea grande llena el cupo de cuerpos** y
     * los que faltan no pueden entrar hasta que se desarmen.
     *
     * Lo encontro una medicion: el tramo 0 se quedaba con uno vivo y el
     * diagnostico decia `enJuego: 22, tope: 22` — los veintidos eran
     * cadaveres. Con la esclusa eso traba la partida, porque el que falta
     * es justo el que hay que matar para que la puerta abra.
     *
     * Y es gratis: un cadaver no piensa —su IA esta en DEAD— asi que lo
     * unico que cuesta es dibujarlo, que es lo que ya se estaba pagando.
     */
    const vivosAhora = () => {
      let n = 0;
      for (const z of this.enJuego) if (z.vivo) n++;
      return n;
    };
    if (vivosAhora() >= PERF.maxActiveZombies) return;
    let cupo = PERF.maxActiveZombies - vivosAhora();

    /*
     * -------------------------------------------------------------------------
     * APARECEN DONDE NO LOS ESTAS MIRANDO (19B.3)
     * -------------------------------------------------------------------------
     * Con 16 a 22 zombis por tramo en vez de 5, el encendido deja de ser
     * invisible: antes entraban de a uno cada tanto, ahora entran de a
     * varios en la misma cuadra, y **un zombi que se materializa en medio
     * de la calle vacia que estas mirando rompe el juego mas de lo que lo
     * llena**.
     *
     * La regla: si el puesto esta **cerca y a la vista**, no se enciende
     * todavia. Detras de un auto, detras de una pared, cruzando la
     * esquina, a tus espaldas, o simplemente lejos: ahi si. Es barato —un
     * rayo por candidato cercano, y solo mientras falte cupo— y usa la
     * misma vista que ya usa el zombi para verte a vos.
     *
     * LA SALVEDAD, QUE NO ES OPCIONAL. Un puesto que no se enciende nunca
     * **es un zombi que no se puede matar**, y con la esclusa (D-37) eso
     * traba la partida para siempre: `vivosEnTramo` cuenta los puestos sin
     * usar como vivos, asi que la puerta esperaria a alguien que no existe.
     *
     * Por eso la vista solo pospone, no prohibe: pasados `ESPERA_A_CIEGAS`
     * segundos sin poder encender a nadie, se enciende igual. Un jugador
     * parado en una cuadra despejada mirando el unico puesto que queda es
     * raro, pero posible, y el juego tiene que seguir.
     */
    const seVe = (p) =>
      this.world.hasLineOfSight(jugador.x, jugador.z, p.x, p.z, ALTURA_VISTA);

    this.esperandoLugar = (this.esperandoLugar ?? 0) + dt;
    const aCiegas = this.esperandoLugar < ESPERA_A_CIEGAS;

    /*
     * UNA sola busqueda de emboscada por cuadro, y aca esta el por que.
     *
     * Buscar un lugar cuesta hasta doce tiradas, y cada tirada es **un rayo
     * de linea de vista mas una consulta de colision**. Si fallan las doce,
     * van a fallar igual para la siguiente emboscada pendiente: las
     * condiciones —donde esta el jugador, hacia donde mira, que lo tapa—
     * son las mismas para todas en ese instante.
     *
     * Sin este corte, un tramo con diez emboscadas pendientes y ningun
     * lugar bueno costaba ciento veinte rayos **por cuadro**. Se noto en
     * una prueba de punta a punta que paso de pasar a agotar su tiempo:
     * no se habia colgado nada, el juego iba a paso de hombre.
     */
    let yaBusque = false;

    // Encender los puestos cercanos que todavia no estan ocupados.
    for (let i = 0; i < this.puestos.length; i++) {
      if (cupo <= 0) break;
      if (this.puestosUsados.has(i)) continue;

      const puesto = this.puestos[i];

      /*
       * LA EMBOSCADA SE UBICA ACA, no al empezar la mision (19B.6).
       *
       * Hasta que no encuentra un lugar no se enciende, y mientras tanto
       * sigue contando como vivo para la esclusa, asi que el tramo no se
       * puede terminar sin el.
       */
      let lugar = puesto;
      if (puesto.emboscada) {
        if (yaBusque) continue;
        const zona = this.#zonaDelJugador(puesto.tramo, jugador);
        if (!zona) continue;
        yaBusque = true;
        lugar = this.#lugarDeEmboscada(zona, jugador, adelante, this.esperandoLugar ?? 0);
        if (!lugar) continue;
      }

      const dx = lugar.x - jugador.x;
      const dz = lugar.z - jugador.z;
      const d = Math.hypot(dx, dz);
      const deFrente = d > 0 ? (dx / d) * adelante.x + (dz / d) * adelante.z : 1;

      if (d > corte) {
        /*
         * UN FIJO QUE QUEDO LEJOS Y ATRAS SE VUELVE EMBOSCADA.
         *
         * Es el mismo arreglo que el del zombi al que le escapaste, para
         * el caso del que **nunca llego a aparecer**: si el jugador pasa
         * de largo con el cupo lleno, ese puesto queda a cien o
         * doscientos metros a sus espaldas y la ventana de encendido son
         * 55. No vuelve a entrar en rango jamas.
         *
         * Medido: el tramo 0 se quedaba con un fijo sin usar **a 177
         * metros**, y la puerta no abria. Con la esclusa eso no es una
         * molestia, es una partida que no se puede terminar.
         *
         * "Lejos" y "atras" van juntas a proposito. Lejos y ADELANTE es lo
         * normal —todavia no llegaste— y ahi no hay que tocar nada: el
         * tercio de zombis puestos en el mapa existe justamente para que
         * se los vea venir de lejos.
         */
        if (!puesto.emboscada && deFrente < 0) puesto.emboscada = true;
        continue;
      }
      // Tampoco encima del jugador: un zombi que aparece de la nada a tres
      // metros no es tension, es una trampa.
      if (d < (puesto.emboscada ? EMBOSCADA_MIN : 12)) continue;

      /*
       * NUNCA A LAS ESPALDAS (19B.6). Vale para los dos tipos: el de la
       * emboscada ya lo comprobo al elegir lugar, y el fijo lo comprueba
       * aca. Ver `DELANTE_MINIMO`.
       */
      if (deFrente < DELANTE_MINIMO) continue;

      if (!puesto.emboscada && aCiegas && d < DISTANCIA_POP && seVe(lugar)) continue;

      const libre = this.reserva.find((z) => !z.activo);
      if (!libre) break;

      libre.activar(lugar.x, lugar.z, this.rng);
      libre.puestoId = i;
      libre.tramo = puesto.tramo;
      this.puestosUsados.add(i);
      this.enJuego.push(libre);
      cupo--;
      // Entro uno: la espera vuelve a cero.
      this.esperandoLugar = 0;
    }
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} jugador
   * @param {boolean} jugadorVivo
   * @param {(daño:number, zombi:Zombie) => void} alAtacar
   */
  update(dt, jugador, jugadorVivo, alAtacar, rumboCamara = 0) {
    if (!this.mission) return;
    if (!this.puestosUsados) this.puestosUsados = new Set();

    this.#gestionarPoblacion(jugador, dt, rumboCamara);

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
