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

    // Colision de camara en el plano XZ: no la dejamos entrar en un edificio.
    // La prueba es en dos dimensiones y no sabe de alturas, asi que solo
    // tiene sentido cuando la camara va por debajo de los techos. Mas
    // arriba, vuela sobre la cuadra y nada puede taparla.
    let dist = this.distance;
    if (this.focus.y + offY < CAMERA.collisionMaxHeight) {
      const hit = this.world.raycast(this.focus.x, this.focus.z, this.focus.x + offX, this.focus.z + offZ);
      if (hit) {
        // 0.4 m de margen para que no se vea el interior de la pared.
        dist = Math.max(CAMERA.distanceMin * 0.5, this.distance * hit.t - 0.4);
      }
    }

    const scale = dist / this.distance;
    this.camera.setPosition(
      this.focus.x + offX * scale,
      this.focus.y + offY * scale,
      this.focus.z + offZ * scale
    );
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
