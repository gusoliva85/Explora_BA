import * as pc from 'playcanvas';
import { CAMERA } from '../config/balance.js';

/**
 * ===========================================================================
 * CAMARA
 * ===========================================================================
 * Tercera persona a 57 grados, con la calle cruzando la pantalla en
 * diagonal. Es la variante 3 de los mockups, elegida como definitiva
 * (decision D-02).
 *
 * Dos cosas la distinguen de una camara orbital comun:
 *
 * 1. **Se alinea sola a la calle.** No apunta hacia el objetivo ni hacia
 *    donde mira el jugador: apunta al eje del tramo que esta pisando, mas
 *    un giro fijo que es el que produce la diagonal. Cuando el recorrido
 *    dobla en una esquina, la camara acompaña sola.
 *
 * 2. **El jugador puede moverla, y despues vuelve.** Arrastrando se gira
 *    como siempre; al soltar, despues de un segundo y pico, la camara
 *    regresa suavemente a la diagonal. Asi se puede mirar a los costados
 *    sin perder nunca la composicion, y sin obligar al pulgar a
 *    reorientarla todo el tiempo.
 *
 * Incluye colision de camara: si hay un edificio entre el jugador y la
 * camara, la camara se acerca hasta despejar la vista.
 */
export class CameraController {
  /**
   * @param {pc.Entity} camera
   * @param {import('../physics/collisionWorld.js').CollisionWorld} world
   */
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    this.yaw = 0;
    this.pitch = CAMERA.pitchDegrees;
    this.distance = CAMERA.distance;

    /**
     * Rumbo al que la camara quiere volver: el de la calle mas el giro
     * diagonal. Lo fija `setStreetHeading` desde el bucle principal.
     */
    this.targetYaw = 0;
    /** Segundos desde la ultima vez que el jugador toco la camara. */
    this.sinceManual = Infinity;

    /** Punto suavizado al que sigue la camara. */
    this.focus = new pc.Vec3();
    this.initialized = false;

    this._desired = new pc.Vec3();

    /** Sacudon activo: cuanto queda y con que fuerza. */
    this.sacudonRestante = 0;
    this.sacudonFuerza = 0;
    this._semillaSacudon = 0;

    addEventListener(
      'wheel',
      (e) => {
        this.distance = pc.math.clamp(
          this.distance + Math.sign(e.deltaY) * 0.6,
          CAMERA.distanceMin,
          CAMERA.distanceMax
        );
      },
      { passive: true }
    );
  }

  /**
   * Fija el rumbo al que la camara debe volver, a partir de la direccion de
   * la calle. El giro diagonal se suma aca y en ningun otro lado.
   *
   * @param {number} headingDegrees rumbo del tramo, en grados
   */
  setStreetHeading(headingDegrees) {
    this.targetYaw = normalizarAngulo(headingDegrees + CAMERA.diagonalOffsetDegrees);
  }

  /**
   * Sacude la camara.
   *
   * Es la forma mas barata y mas efectiva de comunicar un impacto. Sin
   * esto, recibir una mordida es un numero que baja en una esquina de la
   * pantalla; con esto, se siente.
   *
   * El sacudon decae de forma cuadratica: empieza fuerte y se apaga
   * rapido. Un decaimiento lineal se siente como un temblor que no termina.
   *
   * @param {number} fuerza en metros de desplazamiento maximo
   * @param {number} duracion en segundos
   */
  sacudir(fuerza = 0.35, duracion = 0.35) {
    this.sacudonFuerza = Math.max(this.sacudonFuerza, fuerza);
    this.sacudonRestante = Math.max(this.sacudonRestante, duracion);
    this.sacudonDuracion = duracion;
    this._semillaSacudon = Math.random() * 1000;
  }

  /** Lleva la camara de una a la diagonal, sin animacion (spawn, reinicio). */
  snapToStreet() {
    this.yaw = this.targetYaw;
    this.sinceManual = Infinity;
  }

  /**
   * @param {number} dt
   * @param {pc.Vec3} targetPos posicion del jugador (pies)
   * @param {{x:number,y:number}} lookDelta desplazamiento de entrada en pixeles
   * @param {boolean} isTouch
   */
  update(dt, targetPos, lookDelta, isTouch) {
    const sens = isTouch ? CAMERA.sensitivityTouch : CAMERA.sensitivityMouse;

    if (lookDelta.x !== 0 || lookDelta.y !== 0) {
      this.yaw -= lookDelta.x * sens;
      this.pitch = pc.math.clamp(this.pitch + lookDelta.y * sens, CAMERA.pitchMin, CAMERA.pitchMax);
      this.sinceManual = 0;
    } else {
      this.sinceManual += dt;
    }
    this.yaw = normalizarAngulo(this.yaw);

    // Vuelta a la diagonal. Se espera un momento antes de empezar: si la
    // camara volviera apenas se suelta el dedo, mirar a un costado seria
    // imposible y se sentiria como que pelea contra el jugador.
    if (this.sinceManual > CAMERA.alignDelay) {
      const k = 1 - Math.exp(-CAMERA.alignLerp * dt);
      this.yaw = normalizarAngulo(this.yaw + diferenciaAngular(this.yaw, this.targetYaw) * k);
    }

    // Punto de interes: a la altura del pecho, no de los pies.
    const tx = targetPos.x;
    const ty = targetPos.y + CAMERA.targetHeight;
    const tz = targetPos.z;

    if (!this.initialized) {
      this.focus.set(tx, ty, tz);
      this.initialized = true;
    } else {
      // Suavizado independiente del framerate: a 30 y a 120 FPS se siente igual.
      const k = 1 - Math.exp(-CAMERA.followLerp * dt);
      this.focus.x += (tx - this.focus.x) * k;
      this.focus.y += (ty - this.focus.y) * k;
      this.focus.z += (tz - this.focus.z) * k;
    }

    // Posicion orbital deseada.
    const yawRad = this.yaw * pc.math.DEG_TO_RAD;
    const pitchRad = this.pitch * pc.math.DEG_TO_RAD;
    const horiz = Math.cos(pitchRad) * this.distance;
    const offX = Math.sin(yawRad) * horiz;
    const offZ = Math.cos(yawRad) * horiz;
    const offY = Math.sin(pitchRad) * this.distance;

    /*
     * Colision de camara.
     *
     * La prueba es en el plano XZ, pero la camara vuela a casi veinte
     * metros: si no se tuviera en cuenta la altura, cualquier auto o
     * cordon que cruce el rayo la tiraria encima del jugador aunque pase
     * ocho metros por debajo. Por eso solo cuentan las cajas mas altas que
     * la propia camara, que son las unicas que de verdad pueden taparla.
     */
    const alturaCamara = this.focus.y + offY;
    let dist = this.distance;
    const hit = this.world.raycast(
      this.focus.x, this.focus.z,
      this.focus.x + offX, this.focus.z + offZ,
      alturaCamara
    );
    if (hit) {
      // 0.4 m de margen para que no se vea el interior de la pared.
      dist = Math.max(CAMERA.distanceMin * 0.5, this.distance * hit.t - 0.4);
    }

    const scale = dist / this.distance;
    let px = this.focus.x + offX * scale;
    let py = this.focus.y + offY * scale;
    let pz = this.focus.z + offZ * scale;

    if (this.sacudonRestante > 0) {
      this.sacudonRestante -= dt;
      const k = Math.max(0, this.sacudonRestante / (this.sacudonDuracion || 1));
      const amplitud = this.sacudonFuerza * k * k;
      // Dos frecuencias distintas por eje: con una sola, el movimiento se
      // lee como una oscilacion regular en vez de como un golpe.
      const t = this._semillaSacudon + (this.sacudonDuracion - this.sacudonRestante) * 60;
      px += Math.sin(t * 1.7) * amplitud;
      py += Math.sin(t * 2.3) * amplitud * 0.6;
      pz += Math.cos(t * 1.9) * amplitud;
      if (this.sacudonRestante <= 0) this.sacudonFuerza = 0;
    }

    this.camera.setPosition(px, py, pz);
    this.camera.lookAt(this.focus);
  }

  reset(yaw = 0) {
    this.yaw = normalizarAngulo(yaw);
    this.targetYaw = this.yaw;
    this.sinceManual = Infinity;
    this.pitch = CAMERA.pitchDegrees;
    this.distance = CAMERA.distance;
    this.initialized = false;
  }
}

/** Lleva un angulo en grados al rango [0, 360). */
export function normalizarAngulo(grados) {
  return ((grados % 360) + 360) % 360;
}

/**
 * Diferencia entre dos angulos por el camino corto, en [-180, 180].
 *
 * Sin esto, ir de 350 a 10 grados daria -340 y la camara pegaria una vuelta
 * entera en el sentido equivocado.
 */
export function diferenciaAngular(desde, hasta) {
  return ((hasta - desde + 540) % 360) - 180;
}
