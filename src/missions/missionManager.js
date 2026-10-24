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

  /**
   * Hacia donde corre la calle en el tramo donde esta el jugador, en grados.
   *
   * La camara lo usa para mantener la calle en diagonal: en vez de que el
   * jugador tenga que reorientarla con el dedo cada vez que el recorrido
   * dobla en una esquina, la camara se alinea sola al tramo. Es un dedo
   * menos de trabajo en una pantalla chica.
   *
   * Devuelve el rumbo del segmento mas cercano, no el del proximo objetivo:
   * si el jugador se mete en una calle lateral a explorar, la camara no
   * tiene por que seguir mirando hacia el control.
   *
   * El angulo sigue la convencion de la camara: con rumbo 0 la camara se
   * para en +Z y mira hacia -Z. Por eso se usa `atan2(-dx, -dz)` y no
   * `atan2(dx, dz)`: con el segundo la camara se ubicaria delante del
   * jugador mirandolo venir, en vez de atras acompañandolo.
   *
   * @param {{x:number,z:number}} pos
   * @returns {number} rumbo en grados
   */
  streetHeading(pos) {
    const route = this.mission.route;
    let mejor = 0;
    let mejorDist = Infinity;

    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const d = distanceToSegment(pos, a, b);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = Math.atan2(-(b.x - a.x), -(b.z - a.z)) * (180 / Math.PI);
      }
    }
    return mejor;
  }

  /**
   * El punto al que hay que ir ahora: el proximo control pendiente, o la
   * meta si ya estan todos tomados.
   *
   * @returns {{x:number, z:number, label:string}|null}
   */
  objetivoActual() {
    if (this.completed) return null;
    const cp = this.mission.checkpoints[this.nextCheckpoint];
    if (cp) {
      const p = this.mission.route[cp.atRouteIndex];
      return { x: p.x, z: p.z, label: cp.label };
    }
    const g = this.mission.route[this.mission.goal.atRouteIndex];
    return { x: g.x, z: g.z, label: this.mission.goal.label };
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

/**
 * Distancia de un punto al segmento a-b, en el plano XZ.
 *
 * Se proyecta el punto sobre la recta del segmento y se recorta el
 * parametro a [0,1]: sin ese recorte, un jugador parado mas alla del final
 * de una cuadra quedaria asociado a esa cuadra igual.
 */
export function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.z - a.z);

  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Distancia 2D dentro de un radio. Se compara al cuadrado para evitar la raiz. */
export function within(a, b, radius) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz <= radius * radius;
}
