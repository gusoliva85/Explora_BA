import { describe, it, expect } from 'vitest';
import { cuadrasDeLaVentana, VentanaDeMundo } from '../src/world/ventana.js';

/**
 * ===========================================================================
 * LA VENTANA DE MUNDO
 * ===========================================================================
 * Decide que cuadras estan en pie. No es una optimizacion: con las dieciseis
 * cuadras de D-46 el juego **no abre** en un telefono sin esto (D-47).
 *
 * Se prueba con numeros porque la ventana es aritmetica, y porque es donde
 * vive el 90 % de los errores de este tipo de sistema: fuera de rango en los
 * bordes, cuadras que se sueltan de mas, cuadras que no se sueltan nunca.
 */

/** El recorrido real: 16 cuadras, 8 tramos de 2 (D-46). */
const REAL = { cuadrasPorTramo: 2, totalCuadras: 16 };

describe('que cuadras pide cada tramo', () => {
  it('en el medio del recorrido son cuatro: una atras, dos propias, una adelante', () => {
    expect(cuadrasDeLaVentana(3, REAL)).toEqual([5, 6, 7, 8]);
  });

  it('en el primer tramo son tres: no hay nada atras', () => {
    /*
     * El borde que mas facil se rompe. Un `primera - 1` sin acotar pide la
     * cuadra -1, y segun como lo tome el generador eso es un error o, peor,
     * una cuadra fantasma.
     */
    expect(cuadrasDeLaVentana(0, REAL)).toEqual([0, 1, 2]);
  });

  it('en el ultimo tramo son tres: no hay nada adelante', () => {
    // Tramo 7 son las cuadras 14 y 15, y 15 es la ultima que existe.
    expect(cuadrasDeLaVentana(7, REAL)).toEqual([13, 14, 15]);
  });

  it('nunca pide una cuadra que no existe', () => {
    for (let t = 0; t < 8; t++) {
      for (const i of cuadrasDeLaVentana(t, REAL)) {
        expect(i, `tramo ${t}`).toBeGreaterThanOrEqual(0);
        expect(i, `tramo ${t}`).toBeLessThan(REAL.totalCuadras);
      }
    }
  });

  it('las dos cuadras del tramo SIEMPRE estan, en todos los tramos', () => {
    /*
     * Es la unica garantia que no se puede negociar: el jugador esta parado
     * en una de ellas. Si faltara, estaria caminando sobre el vacio.
     */
    for (let t = 0; t < 8; t++) {
      const v = cuadrasDeLaVentana(t, REAL);
      expect(v, `tramo ${t}`).toContain(t * 2);
      expect(v, `tramo ${t}`).toContain(t * 2 + 1);
    }
  });

  it('con un solo tramo corto no se pasa de largo', () => {
    // El mapa de hoy: tres cuadras, un tramo.
    expect(cuadrasDeLaVentana(0, { cuadrasPorTramo: 3, totalCuadras: 3 })).toEqual([0, 1, 2]);
  });
});

/**
 * Corre la ventana hasta que no le quede trabajo, de a una tarea por vuelta
 * —que es exactamente como la corre el juego, un cuadro por tarea.
 */
const terminar = (v) => {
  let tarea;
  let vueltas = 0;
  while ((tarea = v.siguienteTarea())) {
    if (++vueltas > 500) throw new Error('la ventana no termina nunca');
  }
  return tarea;
};

describe('el avance tramo a tramo', () => {
  const nueva = () => new VentanaDeMundo(REAL);

  it('al arrancar pide construir las tres del principio y soltar nada', () => {
    const v = nueva();
    const { construir, soltar } = v.irAlTramo(0);
    expect(construir).toEqual([0, 1, 2]);
    expect(soltar).toEqual([]);
  });

  it('al pasar de tramo suelta lo que quedo atras y pide lo nuevo', () => {
    const v = nueva();
    v.irAlTramo(0);
    terminar(v);

    const { construir, soltar } = v.irAlTramo(1);
    // Del [0,1,2] al [1,2,3,4]: se va la 0, vienen la 3 y la 4.
    expect(soltar).toEqual([0]);
    expect(construir).toEqual([3, 4]);
  });

  it('recorrido entero: nunca hay mas de cuatro cuadras en pie', () => {
    /*
     * El numero que decide si el juego abre. Con dieciseis cuadras en pie a
     * la vez son ~12.700 entidades; con cuatro, la cuarta parte.
     */
    const v = nueva();
    for (let t = 0; t < 8; t++) {
      v.irAlTramo(t);
      terminar(v);
      expect(v.enPie.size, `tramo ${t}`).toBeLessThanOrEqual(4);
    }
  });

  it('recorrido entero: las cuadras del tramo estan SIEMPRE antes de pisarlas', () => {
    const v = nueva();
    for (let t = 0; t < 8; t++) {
      v.irAlTramo(t);
      terminar(v);
      expect(v.enPie.has(t * 2), `tramo ${t}, cuadra ${t * 2}`).toBe(true);
      expect(v.enPie.has(t * 2 + 1), `tramo ${t}, cuadra ${t * 2 + 1}`).toBe(true);
    }
  });

  it('al final del recorrido no quedan cuadras sueltas por construir', () => {
    const v = nueva();
    for (let t = 0; t < 8; t++) {
      v.irAlTramo(t);
      terminar(v);
    }
    expect([...v.enPie].sort((a, b) => a - b)).toEqual([13, 14, 15]);
  });
});

describe('el trabajo repartido', () => {
  it('una cuadra por cuadro, y ni una mas', () => {
    /*
     * Varias juntas en el mismo cuadro son un tirón, y el momento en que la
     * ventana se mueve es el peor para tenerlo: es justo cuando el jugador
     * cruza una puerta, o sea cuando viene de pelear.
     *
     * Antes había una opción `porCuadro` para pedir más de una. Se fue en
     * la 19B.4: **poder pedir más era el error**, no una preferencia.
     */
    const v = new VentanaDeMundo(REAL);
    v.irAlTramo(0);
    expect(v.siguienteTarea()).toEqual({ tipo: 'construir', indice: 0 });
    expect(v.siguienteTarea()).toEqual({ tipo: 'construir', indice: 1 });
    expect(v.siguienteTarea()).toEqual({ tipo: 'construir', indice: 2 });
    expect(v.siguienteTarea()).toBeNull();
    expect(v.completa).toBe(true);
  });

  it('soltar tambien hace cola, y va PRIMERO', () => {
    /*
     * 🐛 El juego que se trababa al cruzar la puerta (19B.4).
     *
     * Soltar era inmediato y sin tope: al cambiar de tramo se destruían las
     * cuadras sobrantes enteras —entidades, mallas, grupo de lote y cajas de
     * colisión— **en el mismo cuadro** en que empezaba a construirse la
     * primera nueva. Medido: 851 ms y 1546 ms contra una base de 200.
     *
     * Va primero por lo de siempre: así el pico de memoria es el de la
     * ventana y no el de la ventana más lo que sobra.
     */
    const v = new VentanaDeMundo(REAL);
    v.irAlTramo(0);
    terminar(v);

    v.irAlTramo(1);
    // Del [0,1,2] al [1,2,3,4]: primero se suelta la 0, sola.
    expect(v.siguienteTarea()).toEqual({ tipo: 'soltar', indice: 0 });
    expect(v.siguienteTarea()).toEqual({ tipo: 'construir', indice: 3 });
    expect(v.siguienteTarea()).toEqual({ tipo: 'construir', indice: 4 });
    expect(v.siguienteTarea()).toBeNull();
  });

  it('una cuadra soltada sale de las que estan en pie', () => {
    const v = new VentanaDeMundo(REAL);
    v.irAlTramo(0);
    terminar(v);
    expect(v.enPie.has(0)).toBe(true);

    v.irAlTramo(1);
    v.siguienteTarea();
    expect(v.enPie.has(0)).toBe(false);
  });

  it('cruzar dos puertas seguidas sin terminar de construir no pierde ninguna', () => {
    /*
     * ESTA es la prueba del riesgo de repartir.
     *
     * Si el jugador cruza una puerta antes de que la cuadra de adelante
     * termine de construirse, el pedido viejo se reemplaza por el nuevo. Lo
     * que no puede pasar es que una cuadra de la ventana nueva **se pierda**
     * por haber quedado en una lista que se descarto.
     */
    const v = new VentanaDeMundo(REAL);
    v.irAlTramo(0);
    v.siguienteTarea(); // solo la 0

    v.irAlTramo(1);
    terminar(v);

    // Las cuatro de la ventana del tramo 1, sin que falte la 1 ni la 2.
    expect([...v.enPie].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('pedir el mismo tramo dos veces no construye nada de nuevo', () => {
    const v = new VentanaDeMundo(REAL);
    v.irAlTramo(0);
    terminar(v);
    const otra = v.irAlTramo(0);
    expect(otra.construir).toEqual([]);
    expect(otra.soltar).toEqual([]);
  });
});

describe('a que tramo pertenece cada cuadra', () => {
  it('las dos primeras son del tramo 0, las dos siguientes del 1', () => {
    const v = new VentanaDeMundo(REAL);
    expect(v.tramoDeCuadra(0)).toBe(0);
    expect(v.tramoDeCuadra(1)).toBe(0);
    expect(v.tramoDeCuadra(2)).toBe(1);
    expect(v.tramoDeCuadra(15)).toBe(7);
  });
});
