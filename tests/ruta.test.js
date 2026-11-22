import { describe, it, expect } from 'vitest';
import { corredor, flechaDeGiro, CORREDOR } from '../src/visual/kit/calle.js';
import { UNITS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * LA RUTA MARCADA EN EL PISO (18.6, D-43)
 * ===========================================================================
 * El kit de la calle no conoce PlayCanvas: recibe un `ctx` y le pide cajas.
 * Eso permite probarlo entero con un `ctx` de mentira que, en vez de crear
 * entidades, anota lo que le pidieron.
 *
 * Y lo que hay que probar acá no es que se vea lindo —eso se mira— sino las
 * dos cosas que una captura no contesta:
 *
 *   1. Que la pintura caiga **dentro de la calzada**. Medio metro de más y
 *      queda sobre la vereda o debajo de un auto estacionado.
 *   2. Que las flechas apunten **al sentido nuevo**, y no al que traía. Una
 *      flecha al revés en una esquina es peor que ninguna flecha.
 */

/** Un `ctx` que no dibuja: anota. */
const papel = () => {
  const cajas = [];
  return {
    cajas,
    addBox(nombre, pos, size, color, opt = {}) {
      cajas.push({ nombre, pos, size, color, rot: opt.rot ?? 0 });
    }
  };
};

const ORO = [0.6, 0.46, 0.15];

describe('la franja del corredor', () => {
  // Una cuadra de cien metros que se recorre hacia el oeste.
  const a = { x: 0, z: 0 };
  const b = { x: -100, z: 0 };
  const avance = { x: -1, z: 0 };

  const pintar = () => {
    const ctx = papel();
    corredor(ctx, { a, b, avance, index: 3, color: ORO });
    return ctx.cajas;
  };

  it('pinta varios tramos repartidos a lo largo de la cuadra', () => {
    const cajas = pintar();
    expect(cajas.length).toBeGreaterThan(10);
    const xs = cajas.map((c) => c.pos.x);
    expect(Math.min(...xs)).toBeLessThan(-80);
    expect(Math.max(...xs)).toBeGreaterThan(-20);
  });

  it('cae DENTRO de la calzada, con el ancho de la franja incluido', () => {
    /*
     * El borde de la calzada está a 5 m del eje. Si la franja se pasara,
     * quedaría encima del cordón o debajo de los autos estacionados, que
     * se generan contra él.
     */
    const borde = UNITS.streetWidth / 2;
    for (const c of pintar()) {
      const lateral = Math.abs(c.pos.z) + CORREDOR.ancho / 2;
      expect(lateral, `una pieza se sale de la calzada: z=${c.pos.z}`).toBeLessThan(borde);
    }
  });

  it('va del lado por el que se avanza, no de un lado fijo del mundo', () => {
    /*
     * La prueba de que el corrimiento usa la derecha DEL SENTIDO y no una
     * coordenada: la misma cuadra recorrida al revés tiene que pintar del
     * otro lado. Sin esto, en la mitad de las cuadras la pintura quedaría
     * del lado contrario al que camina el jugador.
     */
    const ida = pintar();
    const ctx = papel();
    corredor(ctx, { a: b, b: a, avance: { x: 1, z: 0 }, index: 3, color: ORO });
    expect(Math.sign(ida[0].pos.z)).toBe(-Math.sign(ctx.cajas[0].pos.z));
  });

  it('se dibuja por encima del eje de la calle', () => {
    // El eje va a 0.012; si empataran, el orden de dibujo decidiría cuál
    // gana y cambiaría entre máquinas.
    for (const c of pintar()) expect(c.pos.y).toBeGreaterThan(0.012);
  });
});

describe('las flechas del giro', () => {
  // Se viene hacia el oeste y se dobla hacia el sur.
  const punto = { x: -200, z: 0 };
  const desde = { x: -1, z: 0 };
  const hacia = { x: 0, z: -1 };

  const pintar = () => {
    const ctx = papel();
    flechaDeGiro(ctx, { punto, desde, hacia, nombre: '2', color: ORO });
    return ctx.cajas;
  };

  it('son tres flechas de dos barras cada una', () => {
    expect(pintar()).toHaveLength(6);
  });

  it('van DESPUES del cruce, sobre la calle nueva', () => {
    /*
     * Antes iban antes del cruce y una captura mostró por qué no sirve:
     * ahí está la puerta de la esclusa con su disco ámbar, y las flechas
     * del mismo color encima se leían como una mancha. Además, antes del
     * cruce el giro todavía no se puede hacer.
     */
    for (const c of pintar()) {
      const avanzado = (c.pos.x - punto.x) * hacia.x + (c.pos.z - punto.z) * hacia.z;
      expect(avanzado, 'una flecha quedó antes del cruce').toBeGreaterThan(0);
    }
  });

  it('las tres se escalonan, no se enciman', () => {
    const avances = [
      ...new Set(
        pintar().map((c) =>
          Math.round((c.pos.x - punto.x) * hacia.x + (c.pos.z - punto.z) * hacia.z)
        )
      )
    ];
    expect(avances.length).toBeGreaterThanOrEqual(3);
  });

  it('las dos barras de una flecha se abren hacia lados opuestos', () => {
    /*
     * Lo que hace que se lea una punta y no una cruz: una barra girada +45
     * respecto del sentido nuevo y la otra −45.
     */
    const [uno, dos] = pintar();
    const base = (Math.atan2(hacia.x, hacia.z) * 180) / Math.PI;
    expect(uno.rot - base).toBeCloseTo(-45, 6);
    expect(dos.rot - base).toBeCloseTo(45, 6);
  });

  it('apuntan al sentido NUEVO, no al que se traía', () => {
    /*
     * El error que esta prueba existe para impedir. Una flecha que apunta
     * hacia donde venías, en la única esquina donde hay que decidir, manda
     * al jugador contra la valla que cierra la calle de enfrente.
     */
    const base = (Math.atan2(hacia.x, hacia.z) * 180) / Math.PI;
    const otro = (Math.atan2(desde.x, desde.z) * 180) / Math.PI;
    expect(base).not.toBeCloseTo(otro, 0);
    for (const c of pintar()) {
      expect(Math.abs(c.rot - base)).toBeCloseTo(45, 6);
    }
  });
});
