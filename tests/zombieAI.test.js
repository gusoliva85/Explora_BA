import { describe, it, expect, beforeEach } from 'vitest';
import { ZombieAI, EstadoZombi } from '../src/enemies/zombieAI.js';
import { Health } from '../src/entities/health.js';
import { CollisionWorld, Box2D } from '../src/physics/collisionWorld.js';
import { ZOMBIE_STANDARD } from '../src/config/balance.js';

/**
 * ===========================================================================
 * CEREBRO DEL ZOMBI
 * ===========================================================================
 * El cerebro es logica pura, asi que se puede probar entero sin navegador.
 * Eso importa: una maquina de seis estados con tres formas de detectar
 * tiene demasiadas combinaciones para verificarlas jugando.
 */

/** Mundo vacio: todo se ve, nada bloquea. */
const mundoVacio = () => new CollisionWorld(8);

/** Mundo con una pared entre el zombi y el jugador. */
const mundoConPared = () => {
  const w = new CollisionWorld(8);
  // Pared alta y ancha cruzada en z = 5.
  w.add(new Box2D(-10, 4.5, 10, 5.5, 'building', 12));
  return w;
};

const crear = (world, origen = { x: 0, z: 0 }) =>
  new ZombieAI({ world, origen, azar: () => 0.5 });

/** Corre la IA varios cuadros con el jugador quieto. */
const correr = (ai, jugador, cuadros = 30, dt = 1 / 30, pos = { x: 0, z: 0 }) => {
  let ultimo = null;
  for (let i = 0; i < cuadros; i++) {
    ultimo = ai.update(dt, { pos, jugador, jugadorVivo: true });
    if (ultimo.velocidad > 0) {
      pos.x += ultimo.dirX * ultimo.velocidad * dt;
      pos.z += ultimo.dirZ * ultimo.velocidad * dt;
    }
  }
  return { ultimo, pos };
};

describe('deteccion', () => {
  let ai;
  beforeEach(() => {
    ai = crear(mundoVacio());
    ai.rumbo = 0; // mira hacia +Z
  });

  it('ve al jugador de frente, dentro del alcance', () => {
    expect(ai.detectar({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe('vista');
  });

  it('no ve al jugador fuera del alcance', () => {
    const lejos = ZOMBIE_STANDARD.sightRange + 5;
    expect(ai.detectar({ x: 0, z: 0 }, { x: 0, z: lejos })).toBeNull();
  });

  it('no ve al jugador que esta a su espalda', () => {
    expect(ai.detectar({ x: 0, z: 0 }, { x: 0, z: -10 })).toBeNull();
  });

  it('ve dentro del cono pero no fuera', () => {
    // El cono es de 120 grados en total, o sea 60 a cada lado.
    const r = 10;
    const dentro = (50 * Math.PI) / 180;
    const fuera = (75 * Math.PI) / 180;
    expect(
      ai.detectar({ x: 0, z: 0 }, { x: Math.sin(dentro) * r, z: Math.cos(dentro) * r })
    ).toBe('vista');
    expect(
      ai.detectar({ x: 0, z: 0 }, { x: Math.sin(fuera) * r, z: Math.cos(fuera) * r })
    ).toBeNull();
  });

  it('lo nota por cercania aunque este detras', () => {
    // A la espalda, pero a menos del alcance de oido.
    const cerca = ZOMBIE_STANDARD.hearRange - 1;
    expect(ai.detectar({ x: 0, z: 0 }, { x: 0, z: -cerca })).toBe('cerca');
  });

  it('una pared le corta la vista', () => {
    const conPared = crear(mundoConPared());
    conPared.rumbo = 0;
    // De frente y dentro del alcance, pero con la pared en el medio.
    expect(conPared.detectar({ x: 0, z: 0 }, { x: 0, z: 10 })).toBeNull();
  });

  it('una barricada baja NO le corta la vista', () => {
    const w = new CollisionWorld(8);
    // Altura 1.1: por debajo de la linea de ojos.
    w.add(new Box2D(-10, 4.5, 10, 5.5, 'prop', 1.1));
    const bajo = crear(w);
    bajo.rumbo = 0;
    expect(bajo.detectar({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe('vista');
  });
});

describe('maquina de estados', () => {
  it('arranca quieto', () => {
    expect(crear(mundoVacio()).estado).toBe(EstadoZombi.IDLE);
  });

  it('pasa a perseguir cuando te ve', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    ai.update(0.1, { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 8 }, jugadorVivo: true });
    expect(ai.estado).toBe(EstadoZombi.CHASE);
  });

  it('persiguiendo, se acerca al jugador', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const { pos } = correr(ai, { x: 0, z: 12 }, 40);
    expect(pos.z).toBeGreaterThan(1);
  });

  it('al alcance deja de caminar y ataca', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const jugador = { x: 0, z: ZOMBIE_STANDARD.attackRange - 0.2 };
    const pos = { x: 0, z: 0 };

    ai.update(0.1, { pos, jugador, jugadorVivo: true });
    expect(ai.estado).toBe(EstadoZombi.ATTACK);

    const r = ai.update(0.1, { pos, jugador, jugadorVivo: true });
    expect(r.atacar).toBe(true);
    expect(r.velocidad).toBe(0);
  });

  it('respeta el tiempo de espera entre ataques', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const jugador = { x: 0, z: 1 };
    const pos = { x: 0, z: 0 };
    const ctx = { pos, jugador, jugadorVivo: true };

    ai.update(0.1, ctx);
    expect(ai.update(0.1, ctx).atacar).toBe(true);
    // Inmediatamente despues no puede volver a pegar.
    expect(ai.update(0.1, ctx).atacar).toBe(false);

    // Pasado el tiempo de espera, si.
    let pego = false;
    for (let i = 0; i < 40; i++) {
      if (ai.update(0.1, ctx).atacar) pego = true;
    }
    expect(pego).toBe(true);
  });

  it('si lo perdes de vista, va a buscarte al ultimo lugar', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const pos = { x: 0, z: 0 };

    ai.update(0.1, { pos, jugador: { x: 0, z: 10 }, jugadorVivo: true });
    expect(ai.estado).toBe(EstadoZombi.CHASE);

    // El jugador desaparece de su alcance.
    ai.update(0.1, { pos, jugador: { x: 0, z: 200 }, jugadorVivo: true });
    expect(ai.estado).toBe(EstadoZombi.SEARCH);
    expect(ai.ultimoVisto).toEqual({ x: 0, z: 10 });
  });

  it('despues de buscar un rato, se calma', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const pos = { x: 0, z: 0 };
    ai.update(0.1, { pos, jugador: { x: 0, z: 10 }, jugadorVivo: true });

    // Lejos, para que no lo detecte mas.
    const lejos = { x: 0, z: 500 };
    for (let i = 0; i < 200; i++) {
      const r = ai.update(0.1, { pos, jugador: lejos, jugadorVivo: true });
      if (r.velocidad > 0) {
        pos.x += r.dirX * r.velocidad * 0.1;
        pos.z += r.dirZ * r.velocidad * 0.1;
      }
    }
    expect(ai.estado).toBe(EstadoZombi.IDLE);
    expect(ai.ultimoVisto).toBeNull();
  });

  it('no persigue a un jugador muerto', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    ai.update(0.1, { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 8 }, jugadorVivo: false });
    expect(ai.estado).not.toBe(EstadoZombi.CHASE);
  });

  it('aturdido no se mueve ni ataca', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const ctx = { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 1 }, jugadorVivo: true };
    ai.update(0.1, ctx);
    ai.aturdir(0.5);

    const r = ai.update(0.1, ctx);
    expect(ai.estado).toBe(EstadoZombi.STUNNED);
    expect(r.velocidad).toBe(0);
    expect(r.atacar).toBe(false);
  });

  it('al pasarse el aturdimiento vuelve a perseguir', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const ctx = { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 8 }, jugadorVivo: true };
    ai.update(0.1, ctx);
    ai.aturdir(0.3);
    for (let i = 0; i < 6; i++) ai.update(0.1, ctx);
    expect(ai.estado).not.toBe(EstadoZombi.STUNNED);
  });

  it('muerto no hace nada', () => {
    const ai = crear(mundoVacio());
    ai.morir();
    const r = ai.update(0.1, { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 1 }, jugadorVivo: true });
    expect(r.velocidad).toBe(0);
    expect(r.atacar).toBe(false);
    expect(ai.vivo).toBe(false);
  });
});

describe('ruido', () => {
  it('un ruido cercano lo alerta y le marca el origen', () => {
    const ai = crear(mundoVacio());
    expect(ai.oirRuido(5, 5, 20)).toBe(true);
    expect(ai.estado).toBe(EstadoZombi.ALERT);
    expect(ai.ultimoVisto).toEqual({ x: 5, z: 5 });
  });

  it('un ruido lejano no lo alerta', () => {
    const ai = crear(mundoVacio());
    expect(ai.oirRuido(100, 100, 20)).toBe(false);
    expect(ai.estado).toBe(EstadoZombi.IDLE);
  });

  it('el ruido lo pone a BUSCAR, no a perseguir', () => {
    // Un zombi que corre derecho hacia un disparo lejano sabe demasiado.
    const ai = crear(mundoVacio());
    ai.oirRuido(5, 5, 20);
    const pos = { x: 0, z: 0 };
    // Jugador lejos, para que no lo detecte de verdad.
    for (let i = 0; i < 10; i++) {
      ai.update(0.1, { pos, jugador: { x: 0, z: 500 }, jugadorVivo: true });
    }
    expect(ai.estado).toBe(EstadoZombi.SEARCH);
  });
});

describe('navegacion', () => {
  it('no atraviesa una pared yendo hacia el jugador', () => {
    // El esquive tiene que desviarlo, no dejarlo empujando contra el muro.
    const ai = crear(mundoConPared());
    ai.rumbo = 0;
    const pos = { x: 0, z: 0 };
    // Se lo fuerza a perseguir poniendolo muy cerca primero.
    ai.ultimoVisto = { x: 0, z: 10 };
    ai.estado = EstadoZombi.SEARCH;

    let desvio = 0;
    for (let i = 0; i < 60; i++) {
      const r = ai.update(1 / 30, { pos, jugador: { x: 0, z: 500 }, jugadorVivo: true });
      if (r.velocidad > 0) {
        pos.x += r.dirX * r.velocidad * (1 / 30);
        pos.z += r.dirZ * r.velocidad * (1 / 30);
        desvio = Math.max(desvio, Math.abs(pos.x));
      }
    }
    // Se tiene que haber movido de costado buscando la vuelta.
    expect(desvio).toBeGreaterThan(0.5);
  });

  it('se separa de un companero encimado', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = 0;
    const pos = { x: 0, z: 0 };
    const r = ai.update(1 / 30, {
      pos,
      jugador: { x: 0, z: 500 },
      jugadorVivo: true,
      vecinos: [{ x: 0.3, z: 0 }]
    });
    // Se aleja del vecino, que esta a su derecha.
    expect(r.velocidad).toBeGreaterThan(0);
    expect(r.dirX).toBeLessThan(0);
  });

  it('vuelve a su zona si se alejo demasiado', () => {
    const ai = crear(mundoVacio(), { x: 0, z: 0 });
    const lejos = ZOMBIE_STANDARD.leashRange + 10;
    ai.estado = EstadoZombi.CHASE;
    ai.ultimoVisto = { x: 0, z: lejos };
    ai.update(0.1, {
      pos: { x: 0, z: lejos },
      jugador: { x: 0, z: 500 },
      jugadorVivo: true
    });
    expect(ai.estado).toBe(EstadoZombi.SEARCH);
    expect(ai.ultimoVisto).toBeNull();
  });
});

describe('Health', () => {
  it('baja y marca muerto en cero', () => {
    const h = new Health(60);
    expect(h.recibirDaño(40)).toBe(true);
    expect(h.actual).toBe(20);
    expect(h.vivo).toBe(true);
    h.recibirDaño(30);
    expect(h.actual).toBe(0);
    expect(h.vivo).toBe(false);
  });

  it('un muerto no recibe mas daño', () => {
    const h = new Health(10);
    h.recibirDaño(20);
    expect(h.recibirDaño(5)).toBe(false);
  });

  it('la invulnerabilidad bloquea golpes seguidos', () => {
    const h = new Health(100, { invulnerabilidad: 0.5 });
    expect(h.recibirDaño(10)).toBe(true);
    expect(h.recibirDaño(10)).toBe(false);
    h.update(0.6);
    expect(h.recibirDaño(10)).toBe(true);
    expect(h.actual).toBe(80);
  });

  it('avisa al morir una sola vez', () => {
    let muertes = 0;
    const h = new Health(10, { alMorir: () => muertes++ });
    h.recibirDaño(20);
    h.recibirDaño(20);
    expect(muertes).toBe(1);
  });

  it('curar no pasa del maximo y devuelve lo real', () => {
    const h = new Health(100);
    h.recibirDaño(30);
    expect(h.curar(50)).toBe(30);
    expect(h.actual).toBe(100);
  });
});
