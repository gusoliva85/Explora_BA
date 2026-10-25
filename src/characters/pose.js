/**
 * ===========================================================================
 * POSES Y ANIMACION — FASE 12.B
 * ===========================================================================
 * Qué ángulo tiene cada articulación en cada momento. Lógica pura: no sabe
 * de PlayCanvas, de entidades ni de mallas. Recibe un estado y un reloj, y
 * devuelve números.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO HAY ESQUELETO NI MIXAMO
 * ---------------------------------------------------------------------------
 * El roadmap pedía un esqueleto compatible con Mixamo y animaciones
 * importadas. No se hizo, y conviene decir por qué en vez de dejarlo como
 * una tarea a medias:
 *
 * - Un `.glb` con esqueleto y nueve animaciones pesa cientos de kilobytes.
 *   El juego se abre desde un enlace en el teléfono, muchas veces con
 *   datos: ese peso es tiempo antes de poder jugar. Ver la decisión de no
 *   usar texturas, que es el mismo razonamiento.
 * - Todo el proyecto es texto versionable (D-01). Un binario exportado
 *   desde una herramienta externa no se puede revisar en un diff, no se
 *   puede probar, y cuando algo sale mal no se sabe qué cambió.
 * - A veinte metros de cámara, lo que se lee de una animación NO es la
 *   deformación de la malla: es el movimiento de los volúmenes grandes.
 *   Brazos, piernas y torso girando sobre sus pivotes dan exactamente eso.
 *
 * Lo que hay en su lugar es un esqueleto **jerárquico de primitivas**: cada
 * parte cuelga de su padre y gira sobre su pivote, igual que un muñeco
 * articulado. Las poses se calculan acá, con números que se pueden probar.
 *
 * Si algún día hace falta deformación de verdad —una cara, ropa que cae—
 * el camino es el `.glb`, y esta capa se reemplaza entera.
 */

/** Los estados que puede tener un personaje. */
export const Pose = {
  QUIETO: 'quieto',
  CAMINAR: 'caminar',
  CORRER: 'correr',
  ATACAR: 'atacar',
  DISPARAR: 'disparar',
  RECARGAR: 'recargar',
  GOLPEADO: 'golpeado',
  CURARSE: 'curarse',
  MUERTO: 'muerto'
};

/**
 * Cuánto tarda en mezclarse un cambio de pose, en segundos.
 *
 * Sin mezcla, pasar de caminar a quieto es un salto: las piernas se clavan
 * en mitad del paso. Con mezcla, el cuerpo "aterriza".
 *
 * Es corto a propósito. Más de dos décimas y el personaje se siente
 * pesado, como si respondiera tarde; y en un juego donde se esquiva
 * mordiscos, responder tarde es un problema de jugabilidad, no de estética.
 */
export const MEZCLA = 0.12;

/**
 * La pose neutral. Todas las demás son variaciones de ésta.
 *
 * Los ángulos están en grados. El convenio es el del proyecto: positivo
 * levanta o adelanta.
 */
export function poseNeutral() {
  return {
    /** Inclinación del torso hacia adelante. */
    torso: 0,
    /** Giro del torso sobre su eje, para acompañar el paso. */
    torsoGiro: 0,
    /** Altura de la cadera respecto de la base, en metros. */
    cadera: 0,
    cabeza: 0,
    cabezaGiro: 0,
    /** Brazos: negativo echa el brazo hacia atrás. */
    brazoI: 0,
    brazoD: 0,
    /** Codos: siempre doblan en el mismo sentido. */
    codoI: 0,
    codoD: 0,
    piernaI: 0,
    piernaD: 0,
    rodillaI: 0,
    rodillaD: 0,
    /** Giro del cuerpo entero al caer. */
    desplome: 0
  };
}

/** Interpola linealmente dos poses. */
export function mezclarPoses(a, b, k) {
  const t = Math.max(0, Math.min(1, k));
  const out = {};
  for (const clave of Object.keys(a)) {
    out[clave] = a[clave] + (b[clave] - a[clave]) * t;
  }
  return out;
}

/**
 * Un ciclo de pasos.
 *
 * `fase` va de 0 a 1 y vuelve a empezar. Las piernas van en oposición —una
 * adelante, la otra atrás— y los brazos van al revés que las piernas, que
 * es lo que hace que un caminar se lea como caminar y no como un muñeco
 * arrastrado.
 *
 * El torso sube y baja dos veces por ciclo, una por cada paso. Es el
 * detalle que más hace: sin eso, el personaje flota.
 */
function cicloDePasos(fase, { amplitud, amplitudBrazo, rebote, inclinacion }) {
  const a = fase * Math.PI * 2;
  const sen = Math.sin(a);
  const p = poseNeutral();

  p.piernaI = sen * amplitud;
  p.piernaD = -sen * amplitud;

  /*
   * Las rodillas solo doblan cuando la pierna va hacia ATRAS.
   *
   * Una rodilla que dobla en los dos sentidos se ve como una pata de
   * saltamontes. `Math.max(0, ...)` es lo que hace la diferencia entre un
   * paso y un pedaleo.
   */
  p.rodillaI = Math.max(0, -sen) * amplitud * 1.3;
  p.rodillaD = Math.max(0, sen) * amplitud * 1.3;

  // Los brazos, al revés que las piernas del mismo lado.
  p.brazoI = -sen * amplitudBrazo;
  p.brazoD = sen * amplitudBrazo;
  p.codoI = 12 + Math.max(0, sen) * 18;
  p.codoD = 12 + Math.max(0, -sen) * 18;

  // Dos rebotes por ciclo: uno por paso.
  p.cadera = -Math.abs(Math.cos(a)) * rebote;
  p.torso = inclinacion;
  p.torsoGiro = sen * amplitudBrazo * 0.14;

  return p;
}

/**
 * La pose de un estado en un momento dado.
 *
 * @param {string} estado una clave de `Pose`
 * @param {number} fase 0..1 para los ciclos; 0..1 de progreso para los
 *   gestos de una sola vez (atacar, recargar)
 * @returns {object}
 */
export function poseDe(estado, fase) {
  const f = ((fase % 1) + 1) % 1;

  switch (estado) {
    case Pose.CAMINAR:
      return cicloDePasos(f, {
        amplitud: 26,
        amplitudBrazo: 20,
        rebote: 0.035,
        inclinacion: 4
      });

    case Pose.CORRER:
      /*
       * Correr no es caminar más rápido: es otra postura. Zancada más
       * larga, torso más volcado hacia adelante y brazos más altos. Si
       * sólo se acelerara el ciclo, el personaje se vería como alguien
       * caminando en cámara rápida.
       */
      return cicloDePasos(f, {
        amplitud: 42,
        amplitudBrazo: 38,
        rebote: 0.07,
        inclinacion: 13
      });

    case Pose.ATACAR: {
      /*
       * El cuchillazo: el brazo sale rápido y vuelve despacio.
       *
       * La asimetría es el gesto. Un ida y vuelta simétrico se ve como
       * saludar; con la salida en la primera cuarta parte y la vuelta en
       * las tres restantes, se lee como un golpe.
       */
      const p = poseNeutral();
      const golpe = f < 0.25 ? f / 0.25 : 1 - (f - 0.25) / 0.75;
      p.brazoD = -40 - golpe * 95;
      p.codoD = 70 - golpe * 60;
      p.torsoGiro = -golpe * 26;
      p.torso = golpe * 10;
      p.brazoI = golpe * 22;
      p.codoI = 30;
      return p;
    }

    case Pose.DISPARAR: {
      // Brazo extendido al frente y un retroceso corto hacia atrás.
      const p = poseNeutral();
      const culatazo = Math.max(0, 1 - f * 5);
      p.brazoD = -88 + culatazo * 16;
      p.codoD = 10;
      p.brazoI = -62;
      p.codoI = 38;
      p.torsoGiro = -12;
      p.torso = 5 - culatazo * 4;
      return p;
    }

    case Pose.RECARGAR: {
      /*
       * Dos tiempos: la mano izquierda baja a buscar el cargador y sube a
       * encastrarlo. Se nota aunque el cargador no exista como objeto,
       * porque lo que se lee es el recorrido de la mano.
       */
      const p = poseNeutral();
      const baja = f < 0.5 ? f / 0.5 : 1 - (f - 0.5) / 0.5;
      p.brazoD = -70;
      p.codoD = 40;
      p.brazoI = -20 + baja * 50;
      p.codoI = 30 + baja * 70;
      p.cabeza = -baja * 14;
      p.torso = baja * 8;
      return p;
    }

    case Pose.CURARSE: {
      // Encorvado sobre sí mismo, quieto. Tiene que verse vulnerable.
      const p = poseNeutral();
      const respirar = Math.sin(f * Math.PI * 2) * 0.5 + 0.5;
      p.torso = 22 + respirar * 4;
      p.cabeza = -18;
      p.brazoI = -52;
      p.brazoD = -46;
      p.codoI = 85;
      p.codoD = 80;
      p.cadera = -0.06;
      return p;
    }

    case Pose.GOLPEADO: {
      // Un latigazo hacia atrás que se recupera solo.
      const p = poseNeutral();
      const k = Math.max(0, 1 - f * 2.2);
      p.torso = -24 * k;
      p.cabeza = -16 * k;
      p.brazoI = 26 * k;
      p.brazoD = 30 * k;
      p.codoI = 20 * k;
      p.codoD = 20 * k;
      return p;
    }

    case Pose.MUERTO: {
      /*
       * Se desploma hacia adelante y se queda. El progreso NO vuelve a
       * empezar: un muerto que repite su caída en bucle es lo primero que
       * delata que un juego está hecho de ciclos.
       */
      const p = poseNeutral();
      const caida = Math.min(1, fase);
      p.desplome = caida * 86;
      p.cadera = -caida * 0.25;
      p.torso = caida * 20;
      p.brazoI = caida * 40;
      p.brazoD = caida * 34;
      p.piernaI = caida * 18;
      p.piernaD = -caida * 12;
      return p;
    }

    case Pose.QUIETO:
    default: {
      /*
       * Quieto no es inmóvil: respira y se balancea apenas.
       *
       * Un personaje perfectamente congelado se lee como un error del
       * juego, no como alguien parado. Son grados, no decenas.
       */
      const p = poseNeutral();
      const r = Math.sin(f * Math.PI * 2);
      p.torso = 2 + r * 1.2;
      p.cadera = r * 0.012;
      p.brazoI = -4 + r * 2;
      p.brazoD = -4 - r * 2;
      p.codoI = 14;
      p.codoD = 14;
      p.cabezaGiro = r * 3;
      return p;
    }
  }
}

/**
 * Cuántos ciclos por segundo le corresponden a cada estado.
 *
 * Caminar y correr se multiplican por la velocidad real, para que los pies
 * no patinen: un ciclo fijo hace que el personaje parezca arrastrado por el
 * piso en vez de empujarse contra él.
 */
export function velocidadDeCiclo(estado, velocidad = 0) {
  switch (estado) {
    case Pose.CAMINAR:
    case Pose.CORRER:
      // Un paso por cada 0,85 m recorridos, aproximadamente.
      return Math.max(0.3, velocidad / 1.7);
    case Pose.QUIETO:
      return 0.35;
    case Pose.CURARSE:
      return 0.5;
    default:
      return 1;
  }
}

/**
 * Los gestos que ocurren UNA vez y vuelven solos a lo anterior.
 *
 * Los ciclos —quieto, caminar, correr— no están acá: ésos duran mientras
 * dure la situación.
 */
export const GESTOS = {
  [Pose.ATACAR]: 0.45,
  [Pose.DISPARAR]: 0.3,
  [Pose.RECARGAR]: 1.6,
  [Pose.GOLPEADO]: 0.5
};

export function esGesto(estado) {
  return Object.prototype.hasOwnProperty.call(GESTOS, estado);
}

/**
 * Lleva la cuenta de qué pose toca, mezclando los cambios.
 *
 * Es el único pedazo con estado, y sigue sin tocar el motor: quien la usa
 * le pide `pose()` y aplica los números a donde quiera.
 */
export class Animador {
  constructor(estadoInicial = Pose.QUIETO) {
    this.estado = estadoInicial;
    this.anterior = estadoInicial;
    this.fase = 0;
    /** Progreso del gesto en curso, en segundos. */
    this.gesto = null;
    /** Cuánto falta para terminar de mezclar, en segundos. */
    this.mezclando = 0;
    this.faseAnterior = 0;
  }

  /**
   * Pide un estado. Si es un gesto, se reproduce entero y después vuelve.
   *
   * @returns {boolean} true si el estado cambió
   */
  pedir(estado) {
    if (esGesto(estado)) {
      // Un gesto nuevo reinicia el gesto en curso: apretar atacar dos veces
      // tiene que dar dos golpes, no uno largo.
      this.#cambiarA(estado);
      this.gesto = 0;
      /*
       * La fase se reinicia ACA y no en el proximo `update`.
       *
       * `#cambiarA` solo la reinicia si el estado cambia, y pedir el mismo
       * gesto dos veces no lo cambia. Sin esta linea, entre el `pedir` y
       * el siguiente `update` quedaba la fase del golpe anterior: quien
       * leyera `pose()` en el medio veia el cuchillazo a mitad de camino.
       */
      this.fase = 0;
      return true;
    }
    if (this.estado === estado) return false;
    // Un ciclo no interrumpe un gesto en curso: el cuchillazo se termina.
    if (this.gesto !== null) {
      this.estadoDeFondo = estado;
      return false;
    }
    this.#cambiarA(estado);
    return true;
  }

  #cambiarA(estado) {
    this.anterior = this.estado;
    this.faseAnterior = this.fase;
    this.estado = estado;
    this.mezclando = MEZCLA;
    if (estado !== this.anterior) this.fase = 0;
  }

  /**
   * @param {number} dt
   * @param {number} [velocidad] m/s, para que los pasos no patinen
   */
  update(dt, velocidad = 0) {
    if (this.mezclando > 0) this.mezclando = Math.max(0, this.mezclando - dt);

    if (this.gesto !== null) {
      this.gesto += dt;
      const dura = GESTOS[this.estado];
      this.fase = Math.min(1, this.gesto / dura);
      if (this.gesto >= dura) {
        this.gesto = null;
        const volverA = this.estadoDeFondo ?? Pose.QUIETO;
        this.estadoDeFondo = null;
        this.#cambiarA(volverA);
      }
      return;
    }

    if (this.estado === Pose.MUERTO) {
      // La caída avanza una sola vez y se queda ahí.
      this.fase = Math.min(1, this.fase + dt * 2.2);
      return;
    }

    this.fase += dt * velocidadDeCiclo(this.estado, velocidad);
  }

  /** La pose de este instante, ya mezclada. */
  pose() {
    const actual = poseDe(this.estado, this.fase);
    if (this.mezclando <= 0 || this.anterior === this.estado) return actual;
    const vieja = poseDe(this.anterior, this.faseAnterior);
    // `mezclando` baja de MEZCLA a 0, así que el peso de la nueva sube.
    const k = 1 - this.mezclando / MEZCLA;
    return mezclarPoses(vieja, actual, k);
  }
}
