/**
 * ===========================================================================
 * DETECCION DE DISPOSITIVO
 * ===========================================================================
 * El juego esta pensado para el navegador de un celular. El escritorio es un
 * modo secundario que existe sobre todo para desarrollar: ahi se juega con
 * WASD y mouse, y los controles tactiles no se muestran.
 *
 * La deteccion NO se hace por el user agent. Ese string miente, cambia solo
 * y no sabe nada de una notebook con pantalla tactil ni de un celular con
 * teclado conectado. Lo que importa es otra pregunta: **¿cual es la forma
 * principal de tocar esta pantalla?**
 *
 * La respuesta sale de tres señales combinadas:
 *
 *   1. `pointer: coarse`  -> el puntero principal es grueso (un dedo)
 *   2. `hover: none`      -> no se puede pasar por encima sin tocar
 *   3. ancho de pantalla  -> descarta tablets grandes y kioscos tactiles
 *
 * Si las tres dan tactil, el juego entra en modo celular. Si cambian (girar
 * el telefono, conectar un mouse, redimensionar la ventana), se vuelve a
 * evaluar y se avisa a quien escuche.
 *
 * El modo se puede forzar para probar:
 *   ?input=touch     fuerza controles tactiles en la PC
 *   ?input=desktop   fuerza teclado y mouse
 * Es la forma mas rapida de revisar el HUD de celular sin levantar el
 * telefono, y por eso tambien hay un boton en el menu de pausa.
 */

/** Modos de entrada posibles. */
export const InputMode = {
  TOUCH: 'touch',
  DESKTOP: 'desktop'
};

/** Ancho por encima del cual, aunque sea tactil, tratamos la pantalla como grande. */
const PHONE_MAX_WIDTH = 1180;

class Device {
  constructor() {
    /** @type {Set<Function>} */
    this.listeners = new Set();

    const params = new URLSearchParams(location.search);
    const forced = params.get('input');
    /** Modo forzado por URL o por el menu; null = detectar solo. */
    this.forcedMode = forced === 'touch' || forced === 'desktop' ? forced : null;

    this.mode = this.#detectMode();
    this.orientation = this.#detectOrientation();

    // Girar el telefono y redimensionar la ventana disparan lo mismo.
    const onChange = () => this.refresh();
    addEventListener('resize', onChange);
    addEventListener('orientationchange', onChange);

    // Si aparece un mouse real en un dispositivo que parecia tactil, o al
    // reves, la media query cambia y lo detectamos sin recargar.
    for (const q of ['(pointer: coarse)', '(hover: none)']) {
      matchMedia(q).addEventListener?.('change', onChange);
    }
  }

  // --- Señales crudas ------------------------------------------------------

  /** El puntero principal es grueso (un dedo), no un mouse. */
  get hasCoarsePointer() {
    return matchMedia('(pointer: coarse)').matches;
  }

  /** No existe la posibilidad de "pasar por encima" sin tocar. */
  get cannotHover() {
    return matchMedia('(hover: none)').matches;
  }

  /** Hay alguna forma de entrada tactil, aunque no sea la principal. */
  get supportsTouch() {
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  /** La pantalla tiene tamaño de telefono, en cualquier orientacion. */
  get hasPhoneSizedScreen() {
    return Math.min(innerWidth, innerHeight) <= 820 && Math.max(innerWidth, innerHeight) <= PHONE_MAX_WIDTH;
  }

  /**
   * iOS necesita tratos especiales en varios lugares: no deja bloquear la
   * orientacion, maneja la pantalla completa distinto y tiene su propia
   * barra de gestos. Safari en iPad se presenta como escritorio, asi que se
   * detecta por la combinacion de plataforma Mac y pantalla tactil.
   */
  get isIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.platform ?? '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      /iPhone|iPad|iPod/.test(navigator.userAgent)
    );
  }

  get isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  // --- Estado derivado -----------------------------------------------------

  #detectMode() {
    if (this.forcedMode) return this.forcedMode;
    // Dos de las tres señales alcanzan: una notebook tactil tiene puntero
    // grueso disponible pero conserva hover y pantalla grande.
    const signals = [this.hasCoarsePointer, this.cannotHover, this.hasPhoneSizedScreen];
    return signals.filter(Boolean).length >= 2 ? InputMode.TOUCH : InputMode.DESKTOP;
  }

  #detectOrientation() {
    return innerWidth >= innerHeight ? 'landscape' : 'portrait';
  }

  /** @returns {boolean} true si estamos en modo celular. */
  get isTouch() {
    return this.mode === InputMode.TOUCH;
  }

  get isDesktop() {
    return this.mode === InputMode.DESKTOP;
  }

  get isPortrait() {
    return this.orientation === 'portrait';
  }

  /**
   * El juego esta diseñado para el telefono EN VERTICAL (decision D-15): la
   * camara mira la calle en diagonal y el HUD reparte joystick y botones en
   * las dos esquinas de abajo, que es donde caen los pulgares cuando se
   * sostiene el telefono parado.
   *
   * Horizontal no se bloquea ni se penaliza: el juego se adapta y se ve mas
   * calle a lo ancho. Simplemente no es la orientacion para la que se
   * diseña, asi que no hay ningun cartel pidiendo girar el telefono.
   */
  get esOrientacionPrincipal() {
    return this.isPortrait;
  }

  // --- Cambios -------------------------------------------------------------

  /** Vuelve a evaluar y avisa si algo cambio. */
  refresh() {
    const mode = this.#detectMode();
    const orientation = this.#detectOrientation();
    if (mode === this.mode && orientation === this.orientation) return;

    const previous = { mode: this.mode, orientation: this.orientation };
    this.mode = mode;
    this.orientation = orientation;
    this.#applyBodyClasses();
    for (const fn of this.listeners) fn(this, previous);
  }

  /** Fuerza un modo, o pasa `null` para volver a la deteccion automatica. */
  setForcedMode(mode) {
    this.forcedMode = mode;
    this.refresh();
    // Si el modo forzado coincide con el detectado, refresh() no dispara
    // nada; aplicamos las clases igual para que el HUD quede consistente.
    this.#applyBodyClasses();
  }

  /** Alterna entre tactil y escritorio. Lo usa el boton de prueba de la pausa. */
  toggleForcedMode() {
    this.setForcedMode(this.isTouch ? InputMode.DESKTOP : InputMode.TOUCH);
    return this.mode;
  }

  /** @param {(device: Device, previous: object) => void} fn */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Escribe el estado en el `<body>` para que el CSS pueda mostrar u ocultar
   * controles sin que ningun JavaScript toque estilos.
   */
  #applyBodyClasses() {
    const c = document.body.classList;
    c.toggle('is-touch', this.isTouch);
    c.toggle('is-desktop', this.isDesktop);
    c.toggle('is-portrait', this.isPortrait);
    c.toggle('is-ios', this.isIOS);
    c.toggle('is-android', this.isAndroid);
  }

  /** Llamar una vez al arrancar, cuando el body ya existe. */
  init() {
    this.#applyBodyClasses();
    return this;
  }

  /**
   * Pide pantalla completa. Solo se puede desde un gesto del usuario, por eso
   * se llama al tocar "empezar". En iOS no existe para elementos, asi que
   * falla en silencio: no es un error, es una limitacion conocida.
   */
  async requestFullscreen() {
    if (!this.isTouch || document.fullscreenElement) return false;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } catch {
      return false;
    }
  }

  /** Resumen para el overlay de diagnostico. */
  describe() {
    return [
      this.mode,
      this.forcedMode ? '(forzado)' : '',
      this.orientation,
      `${innerWidth}x${innerHeight}`,
      this.isIOS ? 'iOS' : this.isAndroid ? 'Android' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
}

/** Instancia unica: el dispositivo es uno solo. */
export const device = new Device();
