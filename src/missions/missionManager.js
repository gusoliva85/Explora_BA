import { EV } from '../core/events.js';

/**
 * Progreso de la mision: controles intermedios y destino final.
 *
 * Mantiene aparte el "punto de reaparicion", que es lo que convierte un
 * recorrido largo en algo jugable: al morir se vuelve al ultimo control, no
 * al principio.
 */
export class MissionManager {
  /**
   * @param {object} mission definicion de la mision
   * @param {import('../core/events.js').EventBus} bus
   */
  constructor(mission, bus) {
    this.mission = mission;
    this.bus = bus;
    this.reset();
  }

  reset() {
    /** Indice del proximo control pendiente. */
    this.nextCheckpoint = 0;
    this.completed = false;
    this.elapsed = 0;
    const s = this.mission.spawn;
    this.respawn = { x: s.x, z: s.z, yaw: s.yaw ?? 0 };
  }

  get objectiveText() {
    const i = Math.min(this.nextCheckpoint, this.mission.objectives.length - 1);
    return this.mission.objectives[i];
  }

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} playerPos
   */
  update(dt, playerPos) {
    if (this.completed) return;
    this.elapsed += dt;

    // Control intermedio. Se exige en orden: no se saltea ninguno.
    const cp = this.mission.checkpoints[this.nextCheckpoint];
    if (cp) {
      const p = this.mission.route[cp.atRouteIndex];
      if (within(playerPos, p, cp.radius)) {
        this.nextCheckpoint++;
        this.respawn = { x: p.x, z: p.z, yaw: 0 };
        this.bus.emit(EV.CHECKPOINT_REACHED, { index: this.nextCheckpoint, label: cp.label });
        this.bus.emit(EV.OBJECTIVE_CHANGED, { text: this.objectiveText });
      }
      return;
    }

    // Meta: solo cuenta con todos los controles hechos.
    const goalPoint = this.mission.route[this.mission.goal.atRouteIndex];
    if (within(playerPos, goalPoint, this.mission.goal.radius)) {
      this.completed = true;
      this.bus.emit(EV.MISSION_COMPLETE, { elapsed: this.elapsed });
    }
  }
}

/** Distancia 2D dentro de un radio. Se compara al cuadrado para evitar la raiz. */
export function within(a, b, radius) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz <= radius * radius;
}
