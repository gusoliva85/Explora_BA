import { describe, it, expect, beforeEach } from 'vitest';
import { ZombieAI, EstadoZombi } from '../src/enemies/zombieAI.js';
import { Health } from '../src/entities/health.js';
import { CollisionWorld, Box2D } from '../src/physics/collisionWorld.js';
import { ZOMBIE_STANDARD } from '../src/config/balance.js';
import { rumboHacia } from '../src/core/rumbo.js';

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

/*
 * Casi todas estas pruebas ponen al jugador en +Z, asi que el zombi tiene
 * que estar mirando hacia +Z para verlo.
 *
 * El rumbo NO se escribe como numero. Antes aca decia `ai.rumbo = 0` con un
 * comentario que afirmaba "mira hacia +Z", y la afirmacion era falsa: en el
 * convenio del juego el rumbo 0 mira hacia -Z. Las pruebas pasaban porque
 * el cerebro del zombi usaba internamente el convenio invertido, el mismo
 * que escondia que el cuchillo golpeara para atras.
 *
 * Pidiendoselo a `rumboHacia`, la prueba dice que quiere decir y no puede
 * volver a quedar desfasada del juego.
 */
const MIRANDO_A_MAS_Z = rumboHacia(0, 1);

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
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    conPared.rumbo = MIRANDO_A_MAS_Z;
    // De frente y dentro del alcance, pero con la pared en el medio.
    expect(conPared.detectar({ x: 0, z: 0 }, { x: 0, z: 10 })).toBeNull();
  });

  it('una barricada baja NO le corta la vista', () => {
    const w = new CollisionWorld(8);
    // Altura 1.1: por debajo de la linea de ojos.
    w.add(new Box2D(-10, 4.5, 10, 5.5, 'prop', 1.1));
    const bajo = crear(w);
    bajo.rumbo = MIRANDO_A_MAS_Z;
    expect(bajo.detectar({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe('vista');
  });
});

describe('maquina de estados', () => {
  it('arranca quieto', () => {
    expect(crear(mundoVacio()).estado).toBe(EstadoZombi.IDLE);
  });

  it('pasa a perseguir cuando te ve', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = MIRANDO_A_MAS_Z;
    ai.update(0.1, { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 8 }, jugadorVivo: true });
    expect(ai.estado).toBe(EstadoZombi.CHASE);
  });

  it('persiguiendo, se acerca al jugador', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = MIRANDO_A_MAS_Z;
    const { pos } = correr(ai, { x: 0, z: 12 }, 40);
    expect(pos.z).toBeGreaterThan(1);
  });

  it('al alcance deja de caminar y ataca', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    ai.rumbo = MIRANDO_A_MAS_Z;
    ai.update(0.1, { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 8 }, jugadorVivo: false });
    expect(ai.estado).not.toBe(EstadoZombi.CHASE);
  });

  it('aturdido no se mueve ni ataca', () => {
    const ai = crear(mundoVacio());
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    ai.rumbo = MIRANDO_A_MAS_Z;
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

  it('mide la distancia desde donde esta, no desde su puesto de origen', () => {
    /*
     * Un zombi que ya camino treinta metros tiene que escuchar lo que suena
     * CERCA DE EL. Midiendo contra su puesto de origen —que es lo que hacia
     * antes— podia no escuchar un disparo al lado, o alertarse por uno que
     * sono lejisimo. Para un zombi quieto da lo mismo, y por eso no se
     * notaba.
     */
    const ai = crear(mundoVacio(), { x: 0, z: 0 });
    const lejosDeSuPuesto = { x: 60, z: 0 };

    // Ruido al lado de donde ESTA: lo tiene que escuchar.
    expect(ai.oirRuido(62, 0, 10, lejosDeSuPuesto)).toBe(true);

    // Y uno al lado de su puesto, que ya quedo lejos: no.
    const otro = crear(mundoVacio(), { x: 0, z: 0 });
    expect(otro.oirRuido(1, 0, 10, lejosDeSuPuesto)).toBe(false);
  });

  it('persiguiendo, un ruido no lo distrae', () => {
    /*
     * Si lo distrajera, disparar con un zombi encima lo mandaria a
     * investigar el lugar del disparo, o sea donde esta parado el jugador:
     * se veria como que pierde el rastro de alguien que tiene delante. Y
     * seria explotable —disparar al aire para sacarselo de encima—, que es
     * lo contrario de lo que el ruido tiene que lograr.
     */
    const ai = crear(mundoVacio());
    ai.rumbo = MIRANDO_A_MAS_Z;
    ai.update(0.1, { pos: { x: 0, z: 0 }, jugador: { x: 0, z: 8 }, jugadorVivo: true });
    expect(ai.estado).toBe(EstadoZombi.CHASE);

    expect(ai.oirRuido(2, 2, 50, { x: 0, z: 0 })).toBe(false);
    expect(ai.estado).toBe(EstadoZombi.CHASE);
  });

  it('un ruido justo en el borde del radio todavia se escucha', () => {
    const ai = crear(mundoVacio());
    expect(ai.oirRuido(20, 0, 20, { x: 0, z: 0 })).toBe(true);
  });

  it('un zombi muerto no escucha nada', () => {
    const ai = crear(mundoVacio());
    ai.morir();
    expect(ai.oirRuido(1, 1, 50, { x: 0, z: 0 })).toBe(false);
  });
});

describe('navegacion', () => {
  it('no atraviesa una pared yendo hacia el jugador', () => {
    // El esquive tiene que desviarlo, no dejarlo empujando contra el muro.
    const ai = crear(mundoConPared());
    ai.rumbo = MIRANDO_A_MAS_Z;
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
    ai.rumbo = MIRANDO_A_MAS_Z;
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
