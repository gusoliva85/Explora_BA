import * as pc from 'playcanvas';
import { PLAYER, UNITS } from '../config/balance.js';
import { EV } from '../core/events.js';
import { rumboHacia, direccionDeEntrada, normalizarRumbo } from '../core/rumbo.js';

/**
 * Controlador cinematico del protagonista (Gus).
 *
 * No usa rigidbody: integra velocidad a mano y resuelve el choque contra el
 * CollisionWorld. El movimiento es relativo a la camara, que es lo que
 * espera cualquiera que juegue en tercera persona: "arriba" en el joystick
 * es "hacia donde estoy mirando".
 */
export class PlayerController {
  /**
   * @param {pc.Entity} entity
   * @param {import('../physics/collisionWorld.js').CollisionWorld} world
   * @param {import('../core/events.js').EventBus} bus
   */
  constructor(entity, world, bus) {
    this.entity = entity;
    this.world = world;
    this.bus = bus;

    this.health = PLAYER.maxHealth;
    this.radius = UNITS.playerRadius;

    /** Velocidad actual en el plano XZ. */
    this.velocity = new pc.Vec3();
    /** Angulo al que mira el personaje, en grados. */
    this.yaw = 0;
    this.isRunning = false;
    this.invulnerableFor = 0;

    this._desired = new pc.Vec3();
    this._tmp = new pc.Vec3();
  }

  get position() {
    return this.entity.getPosition();
  }

  /** Reubica al jugador sin arrastrar inercia (spawn, checkpoint, reinicio). */
  teleport(x, z, yaw = 0) {
    this.entity.setPosition(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.entity.setEulerAngles(0, yaw, 0);
  }

  /**
   * @param {number} dt
   * @param {{x:number,y:number}} moveInput vector de entrada normalizado
   * @param {boolean} runHeld
   * @param {number} cameraYaw orientacion horizontal de la camara, en grados
   * @param {number} [rumboForzado] si se pasa, el personaje MIRA hacia ahi
   *   aunque camine para otro lado. Lo usa el apuntado con el pulgar.
   */
  update(dt, moveInput, runHeld, cameraYaw, rumboForzado = null) {
    if (this.invulnerableFor > 0) this.invulnerableFor -= dt;

    // 1. Entrada -> direccion en el mundo, relativa a la camara.
    const dir = direccionDeEntrada(moveInput.x, moveInput.y, cameraYaw);
    const dirX = dir.x;
    const dirZ = dir.z;
    const inputMag = Math.hypot(dirX, dirZ);

    // 2. Velocidad objetivo con aceleracion, no instantanea.
    this.isRunning = runHeld && inputMag > 0.6;
    const topSpeed = this.isRunning ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const targetX = inputMag > 0 ? (dirX / inputMag) * topSpeed * Math.min(inputMag, 1) : 0;
    const targetZ = inputMag > 0 ? (dirZ / inputMag) * topSpeed * Math.min(inputMag, 1) : 0;

    const rate = inputMag > 0 ? PLAYER.acceleration : PLAYER.deceleration;
    this.velocity.x = approach(this.velocity.x, targetX, rate * dt);
    this.velocity.z = approach(this.velocity.z, targetZ, rate * dt);

    // 3. Mover y resolver colisiones.
    const pos = this.entity.getPosition();
    const res = this.world.moveCircle(
      { x: pos.x, z: pos.z },
      this.velocity.x * dt,
      this.velocity.z * dt,
      this.radius
    );
    // Si chocamos contra un eje, matamos esa componente para no acumular
    // velocidad "pegado" a la pared y salir disparado al despegarse.
    if (res.hitX) this.velocity.x = 0;
    if (res.hitZ) this.velocity.z = 0;
    this.entity.setPosition(res.x, 0, res.z);

    /*
     * 4. Girar el personaje.
     *
     * Normalmente mira hacia donde camina. Pero si viene un rumbo forzado
     * —el pulgar derecho apuntando— MANDA ESE, y entonces se puede caminar
     * para un lado y disparar para el otro. Es lo que separa "correr" de
     * "retroceder tirando", que es la diferencia entre escapar y pelear.
     *
     * El giro hacia el rumbo apuntado es instantaneo y no suavizado: el
     * pulgar ya es el suavizado. Pasarlo por el mismo `turnSpeed` que el
     * caminar haria que la mira vaya atras del dedo, que se siente como
     * que el juego no responde.
     */
    if (rumboForzado !== null) {
      this.yaw = normalizarRumbo(rumboForzado);
      this.entity.setEulerAngles(0, this.yaw, 0);
      return;
    }

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.15) {
      // Mismo convenio que todo el resto: ver core/rumbo.js.
      const targetYaw = rumboHacia(this.velocity.x, this.velocity.z);
      this.yaw = approachAngle(this.yaw, targetYaw, PLAYER.turnSpeed * dt);
      this.entity.setEulerAngles(0, this.yaw, 0);
    }
  }

  /**
   * Velocidad actual en el plano, en m/s.
   *
   * La usa la curacion para saber si el jugador freno de verdad. Se mira
   * la VELOCIDAD y no la entrada del joystick a proposito: soltar el dedo
   * no frena en seco —hay desaceleracion— y cancelar la curacion por un
   * resbalon de inercia se sentiria arbitrario.
   */
  get velocidadActual() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** @returns {boolean} true si el daño se aplico. */
  applyDamage(amount, source = 'unknown') {
    if (this.invulnerableFor > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableFor = PLAYER.damageInvulnerability;
    this.bus.emit(EV.PLAYER_DAMAGED, { amount, health: this.health, source });
    if (this.health === 0) this.bus.emit(EV.PLAYER_DIED, { source });
    return true;
  }

  heal(amount) {
    const before = this.health;
    this.health = Math.min(PLAYER.maxHealth, this.health + amount);
    if (this.health !== before) {
      this.bus.emit(EV.PLAYER_HEALED, { amount: this.health - before, health: this.health });
    }
  }

  reset(x, z, yaw = 0) {
    this.health = PLAYER.maxHealth;
    this.invulnerableFor = 0;
    this.teleport(x, z, yaw);
  }
}

/** Acerca `current` a `target` sin pasarse, como maximo `maxDelta`. */
export function approach(current, target, maxDelta) {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** Igual que `approach` pero por el camino corto del circulo (grados). */
export function approachAngle(current, target, maxDelta) {
  let d = ((target - current + 540) % 360) - 180;
  if (Math.abs(d) <= maxDelta) return ((target % 360) + 360) % 360;
  return ((current + Math.sign(d) * maxDelta) % 360 + 360) % 360;
}
