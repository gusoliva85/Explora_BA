/**
 * ===========================================================================
 * ENTRADA UNIFICADA
 * ===========================================================================
 * El resto del juego nunca pregunta "¿hay teclado o hay dedo?". Solo lee un
 * estado abstracto: un vector de movimiento, un delta de camara y unos pocos
 * botones. Asi la misma logica corre en la PC mientras se desarrolla y en el
 * telefono cuando se prueba (ver doc 02, decision D-08).
 *
 * Tactil: mitad izquierda = joystick que aparece donde apoyas el dedo;
 * mitad derecha = arrastre de camara. Cada dedo queda "dueño" de su zona, de
 * modo que mover y mirar a la vez nunca se pisan.
 *
 * Los dos esquemas estan siempre activos a la vez. Una notebook con pantalla
 * tactil puede usar los dos, y un celular con un teclado bluetooth tambien.
 * Lo que decide `device` no es que entradas se escuchan, sino que controles
 * se DIBUJAN en pantalla.
 */

import { device } from '../core/device.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;

    /** Movimiento deseado, normalizado. x = derecha, y = adelante. */
    this.move = { x: 0, y: 0 };
    /** Delta de camara acumulado este frame (pixeles). */
    this.look = { x: 0, y: 0 };

    /**
     * Apuntado con el pulgar derecho.
     *
     * El boton de atacar hace dos cosas segun como se lo toque:
     *
     * - **Un toque** dispara hacia donde el personaje ya esta mirando.
     * - **Mantenerlo y arrastrar** lo convierte en un segundo joystick:
     *   la direccion del arrastre es hacia donde se apunta, y mientras
     *   tanto el pulgar izquierdo sigue manejando el movimiento. Eso es lo
     *   que permite retroceder disparando en vez de solo correr.
     *
     * `aim` esta en ejes de PANTALLA (x derecha, y arriba), igual que
     * `move`: quien lo usa lo convierte a mundo con la misma funcion que
     * el movimiento, para que caminar y apuntar nunca se desalineen.
     */
    this.aim = { x: 0, y: 0 };
    /** true mientras el arrastre pasa el umbral y hay direccion de apuntado. */
    this.apuntando = false;

    this.buttons = {
      run: false,
      attack: false,
      interact: false,
      heal: false,
      swap: false,
      reload: false,
      special: false
    };
    /** Botones que se activaron en este frame (flanco de subida). */
    this.pressed = new Set();

    /**
     * Solo afecta la sensibilidad de camara y el dibujo del joystick: los
     * eventos de dedo y de teclado se escuchan siempre, sin importar el modo.
     */
    this.hasTouch = device.isTouch;
    device.onChange(() => {
      this.hasTouch = device.isTouch;
      this.reset();
    });

    /** @type {Set<string>} */
    this.keys = new Set();
    /** @type {{id:number, startX:number, startY:number, x:number, y:number}|null} */
    this.moveTouch = null;
    /** @type {{id:number, x:number, y:number}|null} */
    this.lookTouch = null;
    this.mouseLookActive = false;

    this.joystickRadius = 56;
    this.enabled = false;

    this.#bindKeyboard();
    this.#bindPointer();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.reset();
  }

  reset() {
    this.move.x = this.move.y = 0;
    this.look.x = this.look.y = 0;
    this.aim.x = this.aim.y = 0;
    this.apuntando = false;
    this.aimTouch = null;
    this.keys.clear();
    this.moveTouch = null;
    this.lookTouch = null;
    this.mouseLookActive = false;
    for (const k of Object.keys(this.buttons)) this.buttons[k] = false;
    this.pressed.clear();
  }

  /** Llamar al final de cada frame: los deltas y flancos no se acumulan. */
  endFrame() {
    this.look.x = 0;
    this.look.y = 0;
    this.pressed.clear();
  }

  wasPressed(name) {
    return this.pressed.has(name);
  }

  #setButton(name, value) {
    if (value && !this.buttons[name]) this.pressed.add(name);
    this.buttons[name] = value;
  }

  // --- Teclado y mouse (desarrollo en PC) ----------------------------------

  #bindKeyboard() {
    const KEYMAP = {
      ShiftLeft: 'run',
      ShiftRight: 'run',
      KeyE: 'interact',
      KeyQ: 'swap',
      // R es recargar, que es lo que espera cualquiera que haya jugado a
      // algo con armas. Curarse se movio a H: todavia no existe (Fase 8) y
      // si llegara a quedarse con la R, recargar seria la tecla rara.
      KeyR: 'reload',
      KeyH: 'heal',
      // F de la bazooka: cerca de WASD, no se aprieta sin querer, y no
      // pisa nada. Q y R ya estan tomadas por cambiar de arma y recargar.
      KeyF: 'special',
      Space: 'attack'
    };

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (KEYMAP[e.code]) {
        this.#setButton(KEYMAP[e.code], true);
        e.preventDefault();
      }
    });

    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (KEYMAP[e.code]) this.#setButton(KEYMAP[e.code], false);
    });

    // Si la pestaña pierde el foco, soltamos todo: evita quedar corriendo solo.
    addEventListener('blur', () => this.reset());
  }

  #bindPointer() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      c.setPointerCapture(e.pointerId);

      if (e.pointerType === 'mouse') {
        // En PC: arrastrar con cualquier boton gira la camara, y el click
        // izquierdo ademas ataca.
        this.mouseLookActive = true;
        if (e.button === 0) this.#setButton('attack', true);
        return;
      }

      const isLeftHalf = e.clientX < innerWidth * 0.45;
      if (isLeftHalf && !this.moveTouch) {
        this.moveTouch = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY };
      } else if (!this.lookTouch) {
        this.lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;

      if (e.pointerType === 'mouse') {
        if (this.mouseLookActive) {
          this.look.x += e.movementX ?? 0;
          this.look.y += e.movementY ?? 0;
        }
        return;
      }

      if (this.moveTouch && e.pointerId === this.moveTouch.id) {
        this.moveTouch.x = e.clientX;
        this.moveTouch.y = e.clientY;
      } else if (this.lookTouch && e.pointerId === this.lookTouch.id) {
        this.look.x += e.clientX - this.lookTouch.x;
        this.look.y += e.clientY - this.lookTouch.y;
        this.lookTouch.x = e.clientX;
        this.lookTouch.y = e.clientY;
      }
    });

    const end = (e) => {
      if (e.pointerType === 'mouse') {
        this.mouseLookActive = false;
        if (e.button === 0) this.#setButton('attack', false);
        return;
      }
      if (this.moveTouch?.id === e.pointerId) this.moveTouch = null;
      if (this.lookTouch?.id === e.pointerId) this.lookTouch = null;
    };

    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  /**
   * Conecta los botones del HUD. Se usa pointerdown/up en vez de click para
   * que el ataque responda al apoyar el dedo, no al soltarlo.
   */
  /**
   * El boton de atacar: boton y joystick de apuntado a la vez.
   *
   * @param {HTMLElement} el
   * @param {string} name boton logico que se activa
   */
  bindAimButton(el, name) {
    if (!el) return;

    /*
     * El umbral existe para que un toque no se lea como un arrastre.
     *
     * Un pulgar nunca toca un punto exacto: al apoyarlo y levantarlo se
     * mueve unos pixeles solo. Sin umbral, cada disparo simple saldria
     * apuntado a un lado al azar, que es peor que no tener apuntado.
     *
     * 18 px es aproximadamente el temblor de un pulgar apoyado, medido en
     * pixeles CSS para que no dependa de la densidad de la pantalla.
     */
    const UMBRAL = 18;
    /* Mas alla de este radio el stick ya esta al maximo. */
    const RADIO = 56;

    const down = (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      this.aimTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.apuntando = false;
      this.aim.x = this.aim.y = 0;
      this.#setButton(name, true);
    };

    const move = (e) => {
      if (!this.aimTouch || this.aimTouch.id !== e.pointerId) return;
      e.preventDefault();
      const dx = e.clientX - this.aimTouch.x;
      // En pantalla, Y crece hacia ABAJO. Se invierte para que arrastrar
      // hacia arriba signifique apuntar hacia adelante.
      const dy = this.aimTouch.y - e.clientY;
      const largo = Math.hypot(dx, dy);

      if (largo < UMBRAL) {
        this.apuntando = false;
        this.aim.x = this.aim.y = 0;
        return;
      }

      const k = Math.min(1, largo / RADIO) / largo;
      this.aim.x = dx * k;
      this.aim.y = dy * k;
      this.apuntando = true;
    };

    const up = (e) => {
      if (this.aimTouch && this.aimTouch.id !== e.pointerId) return;
      e.preventDefault();
      el.releasePointerCapture?.(e.pointerId);
      this.aimTouch = null;
      this.apuntando = false;
      this.aim.x = this.aim.y = 0;
      this.#setButton(name, false);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  bindHudButton(el, name) {
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      this.#setButton(name, true);
    };
    const up = (e) => {
      e.preventDefault();
      this.#setButton(name, false);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  /** Recalcula `move` a partir de teclado o joystick. Llamar antes del update. */
  sample() {
    if (!this.enabled) {
      this.move.x = this.move.y = 0;
      return;
    }

    let x = 0;
    let y = 0;

    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;

    if (this.moveTouch) {
      const dx = this.moveTouch.x - this.moveTouch.startX;
      // En pantalla, Y crece hacia abajo; "adelante" es hacia arriba.
      const dy = -(this.moveTouch.y - this.moveTouch.startY);
      const len = Math.hypot(dx, dy);
      if (len > 6) {
        const clamped = Math.min(len, this.joystickRadius) / this.joystickRadius;
        x += (dx / len) * clamped;
        y += (dy / len) * clamped;
      }
    }

    // Normalizar solo si excede 1: permite caminar despacio con el joystick
    // pero impide que la diagonal del teclado sea 1.41x mas rapida.
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    this.move.x = x;
    this.move.y = y;
  }

  /** Estado visual del joystick para que el HUD lo dibuje. */
  getJoystickVisual() {
    if (!this.moveTouch) return null;
    const dx = this.moveTouch.x - this.moveTouch.startX;
    const dy = this.moveTouch.y - this.moveTouch.startY;
    const len = Math.hypot(dx, dy);
    const k = len > this.joystickRadius ? this.joystickRadius / len : 1;
    return {
      baseX: this.moveTouch.startX,
      baseY: this.moveTouch.startY,
      knobX: dx * k,
      knobY: dy * k
    };
  }
}
