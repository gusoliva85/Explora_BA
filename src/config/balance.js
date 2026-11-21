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
  /**
   * La vida de Gus. **120, y el número lo fijó Gus** (D-31).
   *
   * Era 100. Subió junto con la baja del daño del zombi, y las dos cosas
   * apuntan al mismo lado: **doce golpes para matarte** en vez de ocho.
   *
   * ---------------------------------------------------------------------
   * POR QUE MAS MARGEN, SI EL JUEGO SE SUPONE QUE ES MAS DURO
   * ---------------------------------------------------------------------
   * Porque el jugador deja de apretar botones. Con el combate automático
   * (D-28), quedarse quieto para pelear es **la** decisión, y una decisión
   * sólo existe si se puede tomar mal sin perder la partida en el acto.
   * Con ocho golpes, pararse al lado de dos zombis era una sentencia, y
   * nadie elige una sentencia: todos corren. Con doce hay lugar para
   * equivocarse, ver qué pasó y volver a intentar.
   *
   * No hay curación en el juego, así que esto es todo lo que hay para toda
   * la partida salvo lo que den las cartas (D-31, D-32).
   */
  maxHealth: 120,
  /**
   * La velocidad. **Una sola** (D-30).
   *
   * Habia dos, `walkSpeed: 3.2` y `runSpeed: 6.0`, y un boton para
   * alternarlas. Se fue la lenta en la Fase 16.5, y con ella el boton.
   *
   * ---------------------------------------------------------------------
   * POR QUE SE LLAMA `speed` Y NO `runSpeed`
   * ---------------------------------------------------------------------
   * El numero es el de correr, asi que `runSpeed` seguiria siendo cierto.
   * Pero un nombre que dice "correr" implica que hay otra cosa que no es
   * correr, y no la hay: **Gus se mueve de una sola manera.** Un nombre que
   * sugiere una alternativa inexistente es la misma clase de mentira que la
   * funda del cuchillo en la bota, y cuesta lo mismo arreglarla: nada.
   *
   * El zombi SI conserva sus dos velocidades —`walkSpeed` y `chaseSpeed`,
   * mas abajo— porque el zombi si cambia de marcha cuando te ve. La
   * asimetria es a proposito: el jugador no tiene marchas, el zombi si.
   */
  speed: 6.0,
  /** Cuanto tarda en alcanzar la velocidad objetivo (m/s^2). Evita el arranque robotico. */
  acceleration: 28,
  deceleration: 34,
  /** Velocidad de giro del personaje hacia su direccion de movimiento (grados/s). */
  turnSpeed: 720,
  /** Resistencia para correr, en segundos de carrera continua. 0 = sin limite. */
  staminaSeconds: 0,
  /** Segundos de invulnerabilidad despues de recibir un golpe. */
  damageInvulnerability: 0.6,

  /**
   * Cuanto hay que tener el joystick en cero para contar como QUIETO.
   *
   * Es la entrada de todo el combate automatico (D-28): Gus pelea solo
   * mientras esta quieto, asi que esto decide cuando empieza a pelear.
   *
   * ---------------------------------------------------------------------
   * QUIETO ES LA ENTRADA, NO LA VELOCIDAD
   * ---------------------------------------------------------------------
   * Se mide **el joystick en cero**, no que el cuerpo se haya detenido.
   * Las dos cosas se parecen mucho hasta que no se parecen:
   *
   * - Gus frena por inercia en unos 0,18 s. Mirando la velocidad, cada
   *   parada sumaria esa demora ENCIMA de este retardo: casi un tercio de
   *   segundo entre soltar y disparar, en un juego donde matar un zombi
   *   lleva 1,6 s. Se sentiria como que el personaje duda.
   * - Y al reves: chocar de frente contra una pared deja la velocidad en
   *   cero con el pulgar clavado en el joystick. Mirando la velocidad, eso
   *   seria "quieto", y Gus se pondria a pelear contra una pared mientras
   *   el jugador cree que esta escapando.
   *
   * Lo que el juego quiere saber es **si el jugador decidio frenar**, y eso
   * esta en el pulgar, no en el cuerpo.
   *
   * ---------------------------------------------------------------------
   * Y POR QUE HAY RETARDO
   * ---------------------------------------------------------------------
   * No es para castigar: son dos cosas concretas.
   *
   * 1. Un roce del pulgar no tiene que disparar. En un joystick virtual el
   *    dedo nunca vuelve exacto al centro.
   * 2. El jugador tiene que VER a Gus frenar y encarar antes de que salga
   *    la bala. Sin eso, el primer tiro aparece de la nada.
   *
   * Si jugandolo se siente lento, **lo que baja es este numero, no la
   * regla**: quieto sigue siendo el joystick en cero.
   */
  quietoDelay: 0.15
};

export const CAMERA = {
  /**
   * Inclinacion. 90 seria cenital pura, 0 seria a la altura del hombro.
   *
   * Estuvo en 57 grados, elegido sobre los mockups (D-02). Lo baja D-23,
   * porque medido en el juego Gus quedaba en 29 pixeles de alto: a eso no
   * se le ve ni la ropa ni el arma, y todo el trabajo de modelarlo se tira.
   *
   * 48 grados lo deja en 54 px, casi el doble, y las fachadas entran en el
   * encuadre, que es donde vive la identidad porteña.
   *
   * ⚠️ **Lo contraintuitivo, y esta medido:** bajar el angulo NO hace ver
   * menos calle por delante, hace ver mas (el borde de arriba de la pantalla
   * se acerca al horizonte): de 40 m pasa a 59 m. Lo que de verdad se paga
   * al acercarse es el ANCHO: de 13,8 m de calle visible se baja a 10,3 m,
   * o sea que las veredas de los costados se ven menos. Las cuentas estan en
   * `src/player/encuadre.js` y las verifican pruebas.
   */
  pitchDegrees: 48,
  pitchMin: 36,
  pitchMax: 70,

  /**
   * Giro de la camara respecto del eje de la calle, en grados.
   *
   * Esto es lo que pone la calle en DIAGONAL en vez de subir derecho por el
   * medio de la pantalla. Con el telefono en vertical, una calle vertical
   * desperdicia los costados y una horizontal desperdicia el alto: la
   * diagonal usa la pantalla entera y deja ver mucho mas recorrido hacia
   * adelante. Ver doc 02, D-02 y los mockups.
   *
   * El signo decide hacia que lado cae la diagonal. NEGATIVO manda la calle
   * de abajo a la derecha hacia arriba a la izquierda, que es la
   * composicion elegida; positivo la espeja.
   */
  diagonalOffsetDegrees: -16,

  /**
   * Suavizado con el que la camara vuelve sola a la diagonal despues de que
   * el jugador la movio a mano. Mas alto, vuelve mas rapido.
   */
  alignLerp: 2.2,
  /** Segundos sin tocar la camara antes de que empiece a volver sola. */
  alignDelay: 1.4,

  /**
   * Distancia del pivote a la camara.
   *
   * Estuvo en 20 m para imitar la proyeccion casi ortografica del mockup,
   * que mostraba el ancho de la calle y cincuenta metros de profundidad al
   * mismo tiempo. Funcionaba para eso y convertia a Gus en un icono.
   *
   * A 15 m, con 48 grados y la mira corrida (D-23), el personaje se lee y
   * la cuadra sigue entrando. El tope de 26 deja mirar la cuadra entera
   * cuando hace falta; el piso de 10 evita que la camara se meta adentro
   * de Gus al chocar contra una fachada.
   */
  distance: 15,
  distanceMin: 10,
  distanceMax: 26,

  /**
   * Cuantos metros POR DELANTE del jugador mira la camara, decision D-23.
   *
   * Es la pieza que permite acercarse sin perder lo que viene. Con la mira
   * clavada sobre Gus, acercar la camara se lleva puesta la calle de
   * adelante; corriendo el punto de interes, Gus baja en el encuadre y la
   * calle que viene sube, sin tocar el angulo.
   *
   * Tres metros es poco en el mundo y mucho en pantalla: son unos 70
   * pixeles de un telefono. Mas que eso y Gus empieza a quedar pegado al
   * borde de abajo, que es justo donde esta el pulgar.
   */
  lookAhead: 3,
  /**
   * Por encima de esta altura la camara vuela sobre los techos y ya nada
   * puede taparla, asi que se saltea la prueba de colision. Sin esto, la
   * camara se tiraria encima del jugador cada vez que el rayo roza un
   * edificio que en realidad pasa muy por debajo.
   */
  /** Ya no se usa: la altura la aporta cada caja. Ver cameraController. */
  collisionMaxHeight: 20,
  /** Altura del punto al que mira, sobre los pies del jugador. */
  targetHeight: 1.2,
  /** Suavizado del seguimiento: mas alto, mas pegada al jugador. */
  followLerp: 9,
  /** Sensibilidad de giro horizontal. */
  sensitivityMouse: 0.22,
  sensitivityTouch: 0.28,
  /**
   * Campo de vision HORIZONTAL, en grados.
   *
   * Es importante que sea horizontal y no vertical. Con el telefono en
   * vertical la pantalla es angosta y alta: si se fija el campo vertical,
   * el horizontal queda en unos 27 grados y no entra ni el ancho de la
   * calle. Fijando el horizontal, el vertical se agranda solo y se ve
   * mucho mas lejos por la diagonal, que es justo lo que se busca.
   */
  fov: 38,
  /** Ver arriba: el campo se mide a lo ancho. */
  fovHorizontal: true
};

export const ZOMBIE_STANDARD = {
  /**
   * Vida del zombi normal. **100, fijado por Gus** (D-31).
   *
   * Era 60, y con el arma en 34 morían en dos tiros. Ahora son **cuatro**,
   * y eso es lo que de verdad cambia: el tiempo que hay que quedarse
   * quieto al lado de un zombi pasa de 0,4 s a 1,2 s. El triple de
   * exposición por cada muerte es lo que hace que *dónde pararse* sea una
   * pregunta y no un trámite.
   */
  maxHealth: 100,
  walkSpeed: 1.3,
  chaseSpeed: 2.9,
  /** Radio de deteccion si hay linea de vision. */
  sightRange: 16,
  /** Angulo total del cono de vision, en grados. */
  sightAngle: 120,
  /** Radio al que detecta sin necesidad de verte (lo escucha/huele). */
  hearRange: 4,
  attackRange: 1.5,
  /** Daño por mordida. 10, de D-31: doce mordidas matan a Gus. */
  attackDamage: 10,
  /** Segundos entre ataques. */
  attackCooldown: 1.4,
  /** Segundos que sigue buscando en el ultimo lugar conocido antes de calmarse. */
  searchDuration: 6,
  /** Distancia maxima a la que se aleja de su zona antes de volver. */
  leashRange: 35,
  collisionRadius: 0.4
};

/**
 * El arma. **Una sola, y por eso es un diccionario de una entrada** (D-29).
 *
 * Hasta la Fase 16.4 habia tres —cuchillo, pistola y bazooka— y el juego
 * tenia un boton para alternarlas. Las tres se fueron: la bazooka en la
 * 16.3, el cuchillo y el cambio de arma en la 16.4. Lo que queda no es
 * "la pistola de antes": es **el arma**, y el jugador no elige nada.
 *
 * ---------------------------------------------------------------------------
 * POR QUE SIGUE SIENDO UNA TABLA
 * ---------------------------------------------------------------------------
 * Un diccionario de una entrada parece de mas, y se podria haber escrito
 * `export const ARMA = { ... }`. No se hizo por una razon concreta: en la
 * 20.8 Gus elige cual de las once armas renderizadas es la suya, y lo que
 * va a cambiar es el contenido de esta entrada, no su forma. Dejarla como
 * tabla mantiene el cambio en un solo lugar.
 *
 * Lo que SI se fueron son `name` y `type`. `name` lo leia la caja del HUD,
 * que se borro con el cambio de arma; `type` separaba `melee` de `hitscan`,
 * y sin cuerpo a cuerpo no hay nada que separar. Quedaron huerfanos y el
 * criterio de la fase no admite constantes huerfanas.
 */
export const WEAPONS = {
  pistol: {
    id: 'pistol',
    /**
     * Daño por tiro. **25**, de D-31: cuatro tiros matan a un zombi normal.
     *
     * Era 34, que mataba en dos. El número no se eligió por el arma sino
     * por la cuenta: 25 × 4 = 100, que es la vida del zombi, **exacto**.
     * Esa exactitud es deliberada y está fijada con pruebas: si alguien
     * sube la vida del zombi a 101, hacen falta cinco tiros y la pelea dura
     * un 25% más sin que nadie lo haya decidido.
     */
    damage: 25,
    range: 28,
    cooldown: 0.4,
    windup: 0.05,
    /** Dispersion en grados. Pequeña, pero castiga el tiro a maxima distancia. */
    spreadDegrees: 2.5,
    noiseRadius: 22,
    /*
     * Sin municion, sin cargador y sin recarga (D-29, Fase 16.2).
     *
     * Habia `ammoType`, `magazineSize: 12`, `reloadTime: 1.6` y
     * `startingReserve: 24`. El costo de la pistola era quedarse sin balas
     * en el peor momento; ahora el costo es otro y es espacial: para
     * disparar hay que frenar, y frenar con zombis encima es la decision.
     */

    /**
     * Altura a la que vuela la bala, en metros.
     *
     * Decide QUE la detiene. A un metro veinte, a la altura del pecho, un
     * auto de uno setenta la para y un cordon de quince centimetros no.
     * Sin esto, o los tiros pasan por arriba de todo o los frena cualquier
     * baldosa. Es el mismo criterio que la linea de ojos del zombi.
     */
    shotHeight: 1.2,
    /** Medio ancho del cuerpo de un zombi para el rayo. */
    targetRadius: 0.45,

    /**
     * Apuntado asistido, SOLO en pantallas tactiles (tarea 6.3).
     *
     * `cono` es cuanto busca alrededor del centro; `maxima`, cuanto puede
     * corregir. La correccion es deliberadamente mas chica que el cono: el
     * jugador decide a quien le tira, el juego solo le perdona el temblor
     * del pulgar. Subir `maxima` por encima de unos 6 grados ya se siente
     * como que el juego apunta solo, y acertar deja de tener merito.
     */
    aimAssist: { cono: 14, maxima: 5 }
  }
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
