import { describe, it, expect } from 'vitest';
import { CollisionWorld, Box2D, rayBox2D } from '../src/physics/collisionWorld.js';

/**
 * Estas pruebas cubren la regla que mas rompe un juego de este tipo: que el
 * jugador no atraviese una pared. Corren sin navegador y en milisegundos,
 * asi que se pueden ejecutar en cada cambio.
 */

describe('CollisionWorld.moveCircle', () => {
  const makeWorld = () => {
    const w = new CollisionWorld(8);
    // Pared de 10x1 centrada en el origen, perpendicular a Z.
    w.add(Box2D.fromCenter(0, 0, 10, 1));
    return w;
  };

  it('deja pasar cuando no hay nada en el camino', () => {
    const w = new CollisionWorld(8);
    const r = w.moveCircle({ x: 0, z: 0 }, 1, 2, 0.35);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(2);
    expect(r.hitX).toBe(false);
    expect(r.hitZ).toBe(false);
  });

  it('frena al jugador contra la pared y lo deja justo afuera', () => {
    const w = makeWorld();
    const radius = 0.35;
    const r = w.moveCircle({ x: 0, z: -3 }, 0, 4, radius);
    expect(r.hitZ).toBe(true);
    // La pared ocupa z en [-0.5, 0.5]: el centro debe quedar a radio de distancia.
    expect(r.z).toBeCloseTo(-0.5 - radius, 5);
  });

  it('nunca deja el centro dentro de la caja, aunque el paso sea grande', () => {
    const w = makeWorld();
    const r = w.moveCircle({ x: 0, z: -0.2 }, 0, 0.4, 0.35);
    expect(w.boxes[0].contains(r.x, r.z)).toBe(false);
  });

  it('desliza por la pared en vez de frenar en seco', () => {
    const w = makeWorld();
    // Diagonal contra la pared: Z se bloquea, X debe seguir avanzando.
    const r = w.moveCircle({ x: 0, z: -1 }, 0.5, 1, 0.35);
    expect(r.hitZ).toBe(true);
    expect(r.x).toBeCloseTo(0.5, 5);
  });

  it('la grilla espacial no cambia el resultado al alejarse del origen', () => {
    const w = new CollisionWorld(8);
    w.add(Box2D.fromCenter(500, -500, 10, 1));
    const r = w.moveCircle({ x: 500, z: -503 }, 0, 4, 0.35);
    expect(r.hitZ).toBe(true);
    expect(r.z).toBeCloseTo(-500.5 - 0.35, 5);
  });
});

describe('raycast y linea de vision', () => {
  it('detecta la pared entre dos puntos', () => {
    const w = new CollisionWorld(8);
    w.add(Box2D.fromCenter(0, 0, 10, 1));
    expect(w.hasLineOfSight(0, -5, 0, 5)).toBe(false);
  });

  it('ve libre cuando la pared queda al costado', () => {
    const w = new CollisionWorld(8);
    w.add(Box2D.fromCenter(0, 0, 2, 1));
    expect(w.hasLineOfSight(8, -5, 8, 5)).toBe(true);
  });

  it('devuelve el impacto mas cercano cuando hay dos paredes', () => {
    const w = new CollisionWorld(8);
    w.add(Box2D.fromCenter(0, 4, 10, 1, 'lejos'));
    w.add(Box2D.fromCenter(0, 1, 10, 1, 'cerca'));
    const hit = w.raycast(0, -5, 0, 10);
    expect(hit).not.toBeNull();
    expect(hit.box.tag).toBe('cerca');
  });

  it('rayBox2D ignora un rayo paralelo que pasa de largo', () => {
    const box = new Box2D(-1, -1, 1, 1);
    expect(rayBox2D(5, 0, 0, 10, box)).toBeNull();
  });
});
