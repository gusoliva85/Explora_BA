import { describe, it, expect, vi } from 'vitest';
import { EventBus, EV } from '../src/core/events.js';
import { GameStateMachine, State } from '../src/core/gameState.js';
import { MissionManager, within, distanceToSegment } from '../src/missions/missionManager.js';
import { approach, approachAngle } from '../src/player/playerController.js';
import { normalizarAngulo, diferenciaAngular } from '../src/player/cameraController.js';
import { createRng } from '../src/core/rng.js';
import { mission001 } from '../src/config/mission001.js';

describe('GameStateMachine', () => {
  it('permite el recorrido normal de una partida', () => {
    const sm = new GameStateMachine(new EventBus());
    expect(sm.set(State.MENU)).toBe(true);
    expect(sm.set(State.LOADING)).toBe(true);
    expect(sm.set(State.PLAYING)).toBe(true);
    expect(sm.set(State.PAUSED)).toBe(true);
    expect(sm.set(State.PLAYING)).toBe(true);
  });

  it('rechaza transiciones invalidas y no cambia de estado', () => {
    const sm = new GameStateMachine(new EventBus());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    sm.set(State.MENU);
    sm.set(State.LOADING);
    sm.set(State.PLAYING);
    sm.set(State.GAME_OVER);
    // Estando muerto no se puede pausar.
    expect(sm.set(State.PAUSED)).toBe(false);
    expect(sm.current).toBe(State.GAME_OVER);
  });

  it('solo simula en PLAYING', () => {
    const sm = new GameStateMachine(new EventBus());
    sm.set(State.MENU);
    sm.set(State.LOADING);
    sm.set(State.PLAYING);
    expect(sm.isSimulating).toBe(true);
    sm.set(State.PAUSED);
    expect(sm.isSimulating).toBe(false);
  });
});

describe('MissionManager', () => {
  const run = () => {
    const bus = new EventBus();
    return { bus, m: new MissionManager(mission001, bus) };
  };

  it('arranca con el primer objetivo y sin controles tomados', () => {
    const { m } = run();
    expect(m.nextCheckpoint).toBe(0);
    expect(m.objectiveText).toBe(mission001.objectives[0]);
  });

  it('toma los controles en orden y mueve el punto de reaparicion', () => {
    const { bus, m } = run();
    const seen = [];
    bus.on(EV.CHECKPOINT_REACHED, (p) => seen.push(p.index));

    const cp1 = mission001.route[mission001.checkpoints[0].atRouteIndex];
    m.update(0.1, { x: cp1.x, z: cp1.z });
    expect(seen).toEqual([1]);
    expect(m.respawn.z).toBe(cp1.z);
  });

  it('no completa la mision si quedan controles pendientes', () => {
    const { bus, m } = run();
    const done = vi.fn();
    bus.on(EV.MISSION_COMPLETE, done);

    const goal = mission001.route[mission001.goal.atRouteIndex];
    m.update(0.1, { x: goal.x, z: goal.z });
    expect(done).not.toHaveBeenCalled();
    expect(m.completed).toBe(false);
  });

  it('completa la mision tras pasar por todos los controles', () => {
    const { bus, m } = run();
    const done = vi.fn();
    bus.on(EV.MISSION_COMPLETE, done);

    for (const cp of mission001.checkpoints) {
      const p = mission001.route[cp.atRouteIndex];
      m.update(0.1, { x: p.x, z: p.z });
    }
    const goal = mission001.route[mission001.goal.atRouteIndex];
    m.update(0.1, { x: goal.x, z: goal.z });
    expect(done).toHaveBeenCalledOnce();
  });

  it('reset deja todo como al principio', () => {
    const { m } = run();
    const p = mission001.route[mission001.checkpoints[0].atRouteIndex];
    m.update(0.1, { x: p.x, z: p.z });
    m.reset();
    expect(m.nextCheckpoint).toBe(0);
    expect(m.respawn).toEqual({ x: 0, z: 0, yaw: 0 });
  });
});

describe('utilidades de movimiento', () => {
  it('approach no se pasa del objetivo', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(0, 2, 3)).toBe(2);
    expect(approach(0, -2, 3)).toBe(-2);
  });

  it('approachAngle gira por el camino corto cruzando 0/360', () => {
    // De 350 a 10 son 20 grados hacia adelante, no 340 hacia atras.
    expect(approachAngle(350, 10, 100)).toBeCloseTo(10, 5);
    expect(approachAngle(350, 10, 5)).toBeCloseTo(355, 5);
  });

  it('within compara en 2D', () => {
    expect(within({ x: 0, z: 0 }, { x: 3, z: 4 }, 5)).toBe(true);
    expect(within({ x: 0, z: 0 }, { x: 3, z: 4 }, 4.9)).toBe(false);
  });
});

describe('RNG con semilla', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('semillas distintas divergen', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it('int respeta los limites inclusive', () => {
    const r = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('EventBus', () => {
  it('un handler que falla no corta a los demas', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bus = new EventBus();
    const ok = vi.fn();
    bus.on('x', () => {
      throw new Error('boom');
    });
    bus.on('x', ok);
    bus.emit('x');
    expect(ok).toHaveBeenCalledOnce();
  });

  it('off desuscribe', () => {
    const bus = new EventBus();
    const fn = vi.fn();
    const off = bus.on('x', fn);
    off();
    bus.emit('x');
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('rumbo de la calle y alineacion de camara', () => {
  const bus = new EventBus();

  it('devuelve el rumbo del tramo donde esta parado el jugador', () => {
    const m = new MissionManager(mission001, bus);
    // Primer tramo: de (0,0) a (0,-110), es decir hacia -Z.
    expect(m.streetHeading({ x: 0, z: -20 })).toBeCloseTo(0, 4);
    // Segundo tramo: de (0,-110) a (-90,-110), hacia -X.
    expect(m.streetHeading({ x: -40, z: -110 })).toBeCloseTo(90, 4);
    // Tercer tramo: de (-90,-110) a (-90,-230), otra vez hacia -Z.
    expect(m.streetHeading({ x: -90, z: -180 })).toBeCloseTo(0, 4);
  });

  it('el rumbo pone la camara detras del jugador, no delante', () => {
    const m = new MissionManager(mission001, bus);
    const yaw = m.streetHeading({ x: 0, z: -20 });
    // Con la convencion de la camara, el frente del jugador es
    // (-sin yaw, -cos yaw). Avanzar por el primer tramo es ir hacia -Z.
    const rad = (yaw * Math.PI) / 180;
    expect(-Math.sin(rad)).toBeCloseTo(0, 4);
    expect(-Math.cos(rad)).toBeCloseTo(-1, 4);
  });

  it('se queda con el tramo mas cercano, no con el proximo objetivo', () => {
    const m = new MissionManager(mission001, bus);
    // Un jugador que se metio lejos del recorrido sigue asociado al tramo
    // que tiene mas cerca.
    expect(m.streetHeading({ x: -85, z: -112 })).toBeCloseTo(90, 4);
  });

  it('distanceToSegment recorta en los extremos del segmento', () => {
    const a = { x: 0, z: 0 };
    const b = { x: 0, z: -10 };
    // Proyeccion dentro del segmento.
    expect(distanceToSegment({ x: 3, z: -5 }, a, b)).toBeCloseTo(3, 5);
    // Mas alla del final: la distancia se mide al extremo, no a la recta.
    expect(distanceToSegment({ x: 0, z: -30 }, a, b)).toBeCloseTo(20, 5);
    // Antes del comienzo.
    expect(distanceToSegment({ x: 0, z: 7 }, a, b)).toBeCloseTo(7, 5);
  });
});

describe('angulos de camara', () => {
  it('normalizarAngulo deja todo en [0, 360)', () => {
    expect(normalizarAngulo(-10)).toBeCloseTo(350, 5);
    expect(normalizarAngulo(370)).toBeCloseTo(10, 5);
    expect(normalizarAngulo(0)).toBe(0);
  });

  it('diferenciaAngular toma el camino corto cruzando 0/360', () => {
    expect(diferenciaAngular(350, 10)).toBeCloseTo(20, 5);
    expect(diferenciaAngular(10, 350)).toBeCloseTo(-20, 5);
    // Media vuelta exacta es ambigua: -180 y +180 son el mismo giro, y
    // cualquiera de los dos sirve. Lo que importa es la magnitud.
    expect(Math.abs(diferenciaAngular(0, 180))).toBeCloseTo(180, 5);
  });

  it('la camara nunca da una vuelta entera para corregir 20 grados', () => {
    // Simula la vuelta automatica a la diagonal desde 350 hacia 10.
    let yaw = 350;
    for (let i = 0; i < 40; i++) {
      yaw = normalizarAngulo(yaw + diferenciaAngular(yaw, 10) * 0.25);
      // Si tomara el camino largo, pasaria por 180 en algun momento.
      expect(Math.abs(diferenciaAngular(yaw, 0))).toBeLessThan(25);
    }
    expect(diferenciaAngular(yaw, 10)).toBeCloseTo(0, 3);
  });
});
