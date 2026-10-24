/**
 * ===========================================================================
 * NUMEROS DE BALANCE
 * ===========================================================================
 * Todo valor que se vaya a tocar mientras se prueba el juego vive aca y en
 * ningun otro lado. Ningun sistema debe tener numeros magicos adentro.
 *
 * Los valores actuales son un PUNTO DE PARTIDA razonable, no una decision
 * cerrada: hay que ajustarlos jugando, y en el telefono, no en la PC.
 *
 * Unidades: metros y segundos. 1 unidad de PlayCanvas = 1 metro.
 */

export const UNITS = {
  /** Altura del protagonista, de pies a cabeza. */
  playerHeight: 1.8,
  /** Radio del cilindro de colision del jugador. */
  playerRadius: 0.35,
  /** Ancho de calzada entre cordones. */
  streetWidth: 10,
  /** Ancho de vereda a cada lado. */
  sidewalkWidth: 3,
  /** Alto del cordon. */
  curbHeight: 0.15,
  /** Largo nominal de una cuadra porteña. */
  blockLength: 100,
  /** Alto de una puerta, referencia de escala para todo el arte. */
  doorHeight: 2.1
};

export const PLAYER = {
  maxHealth: 100,
  walkSpeed: 3.2,
  runSpeed: 6.0,
  /** Cuanto tarda en alcanzar la velocidad objetivo (m/s^2). Evita el arranque robotico. */
  acceleration: 28,
  deceleration: 34,
  /** Velocidad de giro del personaje hacia su direccion de movimiento (grados/s). */
  turnSpeed: 720,
  /** Resistencia para correr, en segundos de carrera continua. 0 = sin limite. */
  staminaSeconds: 0,
  /** Distancia a la que aparece el boton de interactuar. */
  interactRange: 1.8,
  /** Segundos de invulnerabilidad despues de recibir un golpe. */
  damageInvulnerability: 0.6
};

export const CAMERA = {
  /** Angulo de inclinacion por defecto. 90 seria cenital pura. Ver doc 02, D-02. */
  pitchDegrees: 58,
  pitchMin: 35,
  pitchMax: 80,
  /** Distancia del pivote a la camara. */
  distance: 9.5,
  distanceMin: 6,
  distanceMax: 14,
  /** Altura del punto al que mira, sobre los pies del jugador. */
  targetHeight: 1.2,
  /** Suavizado del seguimiento: mas alto, mas pegada al jugador. */
  followLerp: 9,
  /** Sensibilidad de giro horizontal. */
  sensitivityMouse: 0.22,
  sensitivityTouch: 0.28,
  fov: 55
};

export const ZOMBIE_STANDARD = {
  maxHealth: 60,
  walkSpeed: 1.3,
  chaseSpeed: 2.9,
  /** Radio de deteccion si hay linea de vision. */
  sightRange: 16,
  /** Angulo total del cono de vision, en grados. */
  sightAngle: 120,
  /** Radio al que detecta sin necesidad de verte (lo escucha/huele). */
  hearRange: 4,
  attackRange: 1.5,
  attackDamage: 12,
  /** Segundos entre ataques. */
  attackCooldown: 1.4,
  /** Segundos que sigue buscando en el ultimo lugar conocido antes de calmarse. */
  searchDuration: 6,
  /** Distancia maxima a la que se aleja de su zona antes de volver. */
  leashRange: 35,
  collisionRadius: 0.4
};

export const WEAPONS = {
  knife: {
    id: 'knife',
    name: 'Cuchillo',
    type: 'melee',
    damage: 45,
    range: 1.7,
    /** Semiangulo del arco de golpe, en grados. */
    arcDegrees: 55,
    cooldown: 0.55,
    /** Demora entre apretar y aplicar el daño: sincroniza con la animacion. */
    windup: 0.12,
    noiseRadius: 2,
    ammoType: null
  },
  pistol: {
    id: 'pistol',
    name: 'Pistola',
    type: 'hitscan',
    damage: 34,
    range: 28,
    cooldown: 0.4,
    windup: 0.05,
    /** Dispersion en grados. Pequeña, pero castiga el tiro a maxima distancia. */
    spreadDegrees: 2.5,
    noiseRadius: 22,
    ammoType: 'pistol',
    magazineSize: 12,
    reloadTime: 1.6
  },
  bazooka: {
    id: 'bazooka',
    name: 'Bazooka',
    type: 'special',
    /** Daño directo al impacto. */
    damage: 250,
    /** Daño en el borde del radio; interpola hacia el centro. */
    damageEdge: 60,
    blastRadius: 6,
    range: 40,
    /** Se apunta sola al zombi mas cercano dentro de `range`. Ver doc 02, D-03. */
    autoTarget: true,
    /** Segundos de recarga de la barra especial. */
    cooldown: 30,
    windup: 0.35,
    projectileSpeed: 24,
    noiseRadius: 45,
    ammoType: null
  }
};

export const ITEMS = {
  medkit: { id: 'medkit', name: 'Botiquin', heal: 45, useTime: 1.2, maxCarried: 3 },
  bandage: { id: 'bandage', name: 'Venda', heal: 18, useTime: 0.6, maxCarried: 5 },
  ammoPistol: { id: 'ammoPistol', name: 'Munición 9mm', amount: 12, maxCarried: 60 }
};

export const NOISE = {
  /** Segundos que un evento de ruido queda "vivo" atrayendo zombis. */
  lifetime: 1.5,
  /** Multiplicador global; subirlo hace el juego mas tenso. */
  rangeMultiplier: 1.0
};

export const PERF = {
  /** Techo de simulacion por frame: evita saltos gigantes al volver de un alt-tab. */
  maxDeltaTime: 1 / 15,
  /** Cuantos zombis pueden estar activos (IA corriendo) a la vez. */
  maxActiveZombies: 12,
  /** Mas alla de esta distancia el zombi deja de actualizar IA. */
  zombieCullDistance: 55,
  /** Tope de resolucion en moviles. Evita renderizar a 3x en pantallas densas. */
  maxDevicePixelRatio: 2
};

/** Semilla por defecto del mundo. Cambiarla cambia toda la generacion. */
export const WORLD_SEED = 20261024;
