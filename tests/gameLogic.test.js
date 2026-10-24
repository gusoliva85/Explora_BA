import { describe, it, expect, vi } from 'vitest';
import { EventBus, EV } from '../src/core/events.js';
import { GameStateMachine, State } from '../src/core/gameState.js';
import { MissionManager, within } from '../src/missions/missionManager.js';
import { approach, approachAngle } from '../src/player/playerController.js';
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
