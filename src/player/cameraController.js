import * as pc from 'playcanvas';
import { CAMERA } from '../config/balance.js';

/**
 * Camara de tercera persona en angulo alto.
 *
 * El documento 01 proponia dos cosas incompatibles ("tercera persona, vista
 * cenital"). Aca se implementa el punto medio que resuelve ambas
 * necesidades: se ve al personaje y su equipo, pero desde bastante arriba,
 * asi en calles angostas no se pierde la lectura de la escena. El pitch es
 * ajustable en vivo (balance.js y rueda del mouse) para poder decidir el
 * valor definitivo jugando, no discutiendo. Ver doc 02, decision D-02.
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
   * @param {number} dt
   * @param {pc.Vec3} targetPos posicion del jugador (pies)
   * @param {{x:number,y:number}} lookDelta desplazamiento de entrada en pixeles
   * @param {boolean} isTouch
   */
  update(dt, targetPos, lookDelta, isTouch) {
    const sens = isTouch ? CAMERA.sensitivityTouch : CAMERA.sensitivityMouse;
    this.yaw -= lookDelta.x * sens;
    this.pitch = pc.math.clamp(this.pitch + lookDelta.y * sens, CAMERA.pitchMin, CAMERA.pitchMax);
    this.yaw = ((this.yaw % 360) + 360) % 360;

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
    let dist = this.distance;
    const hit = this.world.raycast(this.focus.x, this.focus.z, this.focus.x + offX, this.focus.z + offZ);
    if (hit) {
      // 0.4 m de margen para que no se vea el interior de la pared.
      dist = Math.max(CAMERA.distanceMin * 0.5, this.distance * hit.t - 0.4);
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
    this.yaw = yaw;
    this.pitch = CAMERA.pitchDegrees;
    this.distance = CAMERA.distance;
    this.initialized = false;
  }
}
