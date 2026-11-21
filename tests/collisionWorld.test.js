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

  describe('el rayo que sube, que es el que usa la camara', () => {
    /** Un colectivo de 3 m parado a mitad de camino. */
    const conColectivo = () => {
      const w = new CollisionWorld(8);
      w.add(Box2D.fromCenter(0, 5, 3, 10, 'colectivo', 3));
      return w;
    };

    it('tapa cuando el rayo todavia viene bajo', () => {
      // Del pecho de Gus hacia una camara a 12 m: a mitad de camino el rayo
      // va por los 6,7 m... pero el colectivo empieza antes, donde el rayo
      // esta por debajo de sus 3 m.
      const hit = conColectivo().raycast(0, 0, 0, 20, 1.2, 12.3);
      expect(hit).not.toBeNull();
      expect(hit.box.tag).toBe('colectivo');
    });

    it('no tapa cuando el rayo ya pasa por encima', () => {
      // El mismo colectivo, pero con el rayo saliendo ya alto.
      expect(conColectivo().raycast(0, 0, 0, 20, 12, 12.3)).toBeNull();
    });

    it('con una sola altura se comporta como siempre', () => {
      const w = conColectivo();
      expect(w.raycast(0, 0, 0, 20, 12.3)).toBeNull();
      expect(w.raycast(0, 0, 0, 20, 1)).not.toBeNull();
    });
  });
});

/**
 * ===========================================================================
 * SACAR CAJAS — lo que hace posible construir la ciudad por tramos
 * ===========================================================================
 * Hasta la Fase 18 el mapa se construia entero y se borraba entero: `add` y
 * `clear` alcanzaban. Con dieciseis cuadras (D-46) el juego no abre en un
 * telefono sin liberar lo que queda atras (D-47), y liberar significa sacar
 * cajas de a una mientras el resto sigue en pie.
 *
 * **Una caja que sobrevive a su fachada es una pared invisible**, y es el
 * peor error posible en un juego de correr por una calle: el jugador choca
 * contra nada y no hay nada en pantalla que se pueda mirar para entenderlo.
 */
describe('CollisionWorld.remove', () => {
  it('una caja sacada deja de frenar al jugador', () => {
    const w = new CollisionWorld(8);
    const pared = w.add(Box2D.fromCenter(0, 0, 10, 1));

    const antes = w.moveCircle({ x: 0, z: -3 }, 0, 4, 0.35);
    expect(antes.hitZ, 'la pared no frenaba ni antes de sacarla').toBe(true);

    expect(w.remove(pared)).toBe(true);
    const despues = w.moveCircle({ x: 0, z: -3 }, 0, 4, 0.35);
    expect(despues.hitZ, 'quedo una pared invisible').toBe(false);
    expect(despues.z).toBeCloseTo(1);
  });

  it('sale de la grilla en TODAS las celdas que ocupaba', () => {
    /*
     * Es la parte que falla en silencio. La grilla indexa la MISMA caja en
     * varias celdas —una de doce metros con celdas de ocho entra en varias—
     * asi que olvidarse de una deja la pared viva en un pedazo del mapa y
     * muerta en el resto. Eso es peor que no borrarla: **falla a veces**.
     */
    const w = new CollisionWorld(8);
    const larga = w.add(Box2D.fromCenter(0, 0, 40, 2));
    w.remove(larga);

    // Se barre a lo largo de toda la caja, celda por celda.
    for (let x = -20; x <= 20; x += 2) {
      expect(w.query(x, 0, 1).size, `quedo indexada cerca de x=${x}`).toBe(0);
    }
  });

  it('sacar una no toca a las demas', () => {
    const w = new CollisionWorld(8);
    const a = w.add(Box2D.fromCenter(0, 0, 4, 4));
    const b = w.add(Box2D.fromCenter(2, 0, 4, 4)); // comparte celdas con `a`
    w.remove(a);

    expect(w.boxes).toHaveLength(1);
    expect([...w.query(2, 0, 1)]).toEqual([b]);
  });

  it('sacar dos veces la misma caja no revienta ni descuenta de mas', () => {
    const w = new CollisionWorld(8);
    const caja = w.add(Box2D.fromCenter(0, 0, 4, 4));
    expect(w.remove(caja)).toBe(true);
    expect(w.remove(caja)).toBe(false);
    expect(w.boxes).toHaveLength(0);
  });

  it('no deja celdas vacias colgadas', () => {
    /*
     * Con dieciseis cuadras construyendose y liberandose, las claves
     * vacias se acumulan: es una fuga lenta que nadie vuelve a mirar
     * porque no rompe nada.
     */
    const w = new CollisionWorld(8);
    const caja = w.add(Box2D.fromCenter(100, 100, 4, 4));
    expect(w.grid.size).toBeGreaterThan(0);
    w.remove(caja);
    expect(w.grid.size).toBe(0);
  });

  it('poner y sacar cien veces deja el mundo como estaba', () => {
    /*
     * El caso real: el jugador recorre dieciseis cuadras y cada una se
     * construye y se libera. Si cada ciclo dejara un resto, al final del
     * recorrido el mundo seria una sopa de paredes invisibles.
     */
    const w = new CollisionWorld(8);
    const fija = w.add(Box2D.fromCenter(-50, -50, 2, 2));

    for (let i = 0; i < 100; i++) {
      const temp = w.add(Box2D.fromCenter(i * 3, 0, 6, 6));
      w.remove(temp);
    }

    expect(w.boxes).toHaveLength(1);
    expect(w.boxes[0]).toBe(fija);
    expect([...w.query(-50, -50, 1)]).toEqual([fija]);
    // Y la grilla quedo con lo justo para la unica caja que sigue viva.
    expect(w.grid.size).toBeGreaterThan(0);
    expect(w.grid.size).toBeLessThan(10);
  });
});
