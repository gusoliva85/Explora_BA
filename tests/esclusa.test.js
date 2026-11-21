import { describe, it, expect, vi } from 'vitest';
import { SpawnManager } from '../src/enemies/spawnManager.js';

/**
 * ===========================================================================
 * EL CONTEO POR TRAMO — lo que la esclusa necesita saber (19A.0 y 19A.1)
 * ===========================================================================
 * Con D-37, **la puerta no abre hasta que no quede un zombi vivo en el
 * tramo**. O sea que la pregunta "¿cuántos quedan?" deja de ser un dato de
 * diagnóstico y pasa a ser la condición de victoria de cada cuadra.
 *
 * Y tiene que contestarse bien en el caso que más incomoda: **cuando el
 * zombi no está en pantalla**.
 */

/** Un gestor de mentira: sin PlayCanvas, sin mundo, sin zombis de verdad. */
function gestor(puestos) {
  const g = Object.create(SpawnManager.prototype);
  g.puestos = puestos;
  g.puestosUsados = new Set();
  g.enJuego = [];
  return g;
}

const puesto = (tramo) => ({ x: 0, z: 0, tramo });

describe('cuantos quedan vivos en un tramo', () => {
  it('al empezar, todos los del tramo: ninguno aparecio todavia', () => {
    const g = gestor([puesto(0), puesto(0), puesto(1)]);
    expect(g.vivosEnTramo(0)).toBe(2);
    expect(g.vivosEnTramo(1)).toBe(1);
  });

  it('un zombi encendido y vivo sigue contando', () => {
    const g = gestor([puesto(0), puesto(0)]);
    g.puestosUsados.add(0);
    g.enJuego.push({ puestoId: 0, vivo: true });
    expect(g.vivosEnTramo(0)).toBe(2);
  });

  it('un zombi muerto NO cuenta, y es lo que deja limpiar el tramo', () => {
    const g = gestor([puesto(0), puesto(0)]);
    g.puestosUsados.add(0);
    g.enJuego.push({ puestoId: 0, vivo: false });
    expect(g.vivosEnTramo(0)).toBe(1);
  });

  it('se limpia cuando todos murieron, y recien ahi da cero', () => {
    const g = gestor([puesto(0), puesto(0)]);
    g.puestosUsados.add(0);
    g.puestosUsados.add(1);
    g.enJuego.push({ puestoId: 0, vivo: false }, { puestoId: 1, vivo: false });
    expect(g.vivosEnTramo(0)).toBe(0);
  });

  it('un zombi LEJOS del jugador sigue contando aunque este apagado', () => {
    /*
     * ESTA es la prueba que justifica contar puestos y no `enJuego`.
     *
     * `enJuego` son los que estan encendidos cerca del jugador. Un zombi
     * del tramo que quedo a sesenta metros no esta ahi, y contar asi daria
     * **cero con el tramo todavia sucio**: la puerta abriria antes de
     * tiempo y la esclusa dejaria de ser una esclusa.
     */
    const g = gestor([puesto(0), puesto(0)]);
    // Nadie encendido: el jugador se alejo y el gestor los apago.
    expect(g.enJuego).toHaveLength(0);
    expect(g.vivosEnTramo(0)).toBe(2);
  });

  it('no cuenta los de otros tramos', () => {
    const g = gestor([puesto(0), puesto(1), puesto(1), puesto(2)]);
    expect(g.vivosEnTramo(1)).toBe(2);
    expect(g.vivosEnTramo(3)).toBe(0);
  });
});

/**
 * ===========================================================================
 * EL ZOMBI QUE DESAPARECIA SIN MORIR (19A.0)
 * ===========================================================================
 * Era un error de verdad, invisible hasta que la esclusa lo vuelve fatal.
 *
 * Al alejarse mas de 55 × 1,4 m, el zombi se apagaba y salia de `enJuego`,
 * **pero su puesto quedaba marcado para siempre**. Se iba del juego sin
 * morir y no volvia nunca. Con D-37 el jugador recibe la orden de matar a
 * todos y algunos ya no existen: la puerta no abre jamas.
 */
describe('alejarse no mata a nadie', () => {
  /** Reproduce el ciclo: aparece, el jugador se aleja, vuelve. */
  const ciclo = () => {
    const g = gestor([puesto(0)]);
    g.enJuego = [];

    // 1. Aparece: se marca el puesto.
    const z = { puestoId: 0, vivo: true, activo: true, ai: { persiguiendo: false } };
    g.puestosUsados.add(0);
    g.enJuego.push(z);
    return { g, z };
  };

  it('al apagarse por distancia, el puesto se libera', () => {
    const { g, z } = ciclo();
    expect(g.vivosEnTramo(0)).toBe(1);

    // El jugador se aleja: el gestor lo apaga y libera el puesto.
    g.puestosUsados.delete(z.puestoId);
    g.enJuego.length = 0;

    // Sigue contando, porque **sigue vivo**: puede volver a aparecer.
    expect(g.vivosEnTramo(0)).toBe(1);
  });

  it('sin liberar el puesto, el tramo quedaria limpio con el zombi vivo', () => {
    /*
     * La demostracion del error, escrita al reves: si NO se libera, el
     * conteo da cero. Es exactamente lo que hacia que la puerta no abriera
     * nunca... no: lo que hacia que abriera **de mas**, con un zombi vivo
     * del otro lado que ya no iba a volver.
     *
     * Las dos cosas son malas y por eso el arreglo es obligatorio.
     */
    const { g, z } = ciclo();
    g.enJuego.length = 0; // se apago, pero el puesto sigue marcado
    expect(g.vivosEnTramo(0)).toBe(0);
  });
});
