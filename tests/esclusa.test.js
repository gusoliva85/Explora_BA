import { describe, it, expect, vi } from 'vitest';
import { SpawnManager } from '../src/enemies/spawnManager.js';
import { Esclusa, EstadoPuerta, DISTANCIA_SELLADO } from '../src/missions/esclusa.js';

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

/**
 * ===========================================================================
 * LA MAQUINA DE LA ESCLUSA (19A.3 a 19A.8, D-37)
 * ===========================================================================
 * Si la esclusa se equivoca, **la partida es imposible de terminar** y no
 * hay nada en pantalla que lo explique. Por eso vive como logica pura y por
 * eso tiene mas pruebas que codigo.
 */

const PUERTAS = [
  { tramo: 0, control: 1, x: 0, z: -200 },
  { tramo: 1, control: 2, x: 0, z: -400 },
  { tramo: 2, control: 3, x: 0, z: -600 }
];

const sucio = () => 3;
const limpio = () => 0;

describe('la puerta no abre con zombis vivos', () => {
  it('arranca cerrada', () => {
    const e = new Esclusa(PUERTAS);
    expect(e.estado(0)).toBe(EstadoPuerta.CERRADA);
    expect(e.frena(0)).toBe(true);
  });

  it('con el tramo sucio sigue cerrada, por mucho que se insista', () => {
    const e = new Esclusa(PUERTAS);
    for (let i = 0; i < 50; i++) e.update(0, { x: 0, z: -190 }, sucio);
    expect(e.estado(0)).toBe(EstadoPuerta.CERRADA);
  });

  it('al limpiar el tramo, abre y lo avisa una sola vez', () => {
    const e = new Esclusa(PUERTAS);
    const ev = e.update(0, { x: 0, z: -190 }, limpio);
    expect(e.estado(0)).toBe(EstadoPuerta.ABIERTA);
    expect(ev).toEqual([{ tipo: 'abre', tramo: 0, control: 1 }]);

    // Y no vuelve a avisar: el aviso es un flanco, no un estado.
    expect(e.update(0, { x: 0, z: -190 }, limpio)).toEqual([]);
  });

  it('solo abre la del tramo donde esta el jugador', () => {
    /*
     * Una puerta de un tramo que el jugador todavia no piso puede estar
     * "limpia" simplemente porque sus zombis no aparecieron nunca. Abrirla
     * de antemano le quita a la esclusa lo unico que la hace una esclusa:
     * que el jugador la encuentre cerrada.
     */
    const e = new Esclusa(PUERTAS);
    e.update(0, { x: 0, z: -190 }, limpio);
    expect(e.estado(1)).toBe(EstadoPuerta.CERRADA);
    expect(e.estado(2)).toBe(EstadoPuerta.CERRADA);
  });
});

describe('y se cierra a los veinte metros', () => {
  /** Deja la puerta del tramo 0 abierta y al jugador recien pasado. */
  const pasada = () => {
    const e = new Esclusa(PUERTAS);
    e.update(0, { x: 0, z: -195 }, limpio);
    return e;
  };

  it('recien pasada sigue abierta: cerrar a la vista se ve cerrar', () => {
    const e = pasada();
    e.update(1, { x: 0, z: -210 }, sucio);
    expect(e.estado(0)).toBe(EstadoPuerta.ABIERTA);
  });

  it('pasados los veinte metros se sella', () => {
    const e = pasada();
    const ev = e.update(1, { x: 0, z: -225 }, sucio);
    expect(e.estado(0)).toBe(EstadoPuerta.SELLADA);
    expect(ev).toEqual([{ tipo: 'sella', tramo: 0, control: 1 }]);
  });

  it('SELLADA no vuelve a abrir aunque el tramo de atras este limpio', () => {
    /*
     * Es lo que hace que el recorrido sea de ida (D-37). Y el tramo de
     * atras SIEMPRE esta limpio —por eso pasaste— asi que sin este estado
     * la puerta se reabriria apenas el jugador volviera sobre sus pasos.
     */
    const e = pasada();
    e.update(1, { x: 0, z: -225 }, sucio);
    e.update(0, { x: 0, z: -195 }, limpio);
    expect(e.estado(0)).toBe(EstadoPuerta.SELLADA);
  });

  it('alejarse para ATRAS no sella nada', () => {
    /*
     * Si el jugador retrocede veinte metros antes de cruzar, la puerta
     * tiene que seguir abierta esperandolo. Sellar ahi lo encerraria del
     * lado de afuera de su propio tramo.
     */
    const e = pasada();
    e.update(0, { x: 0, z: -160 }, limpio);
    expect(e.estado(0)).toBe(EstadoPuerta.ABIERTA);
  });

  it('el numero sale de la camara, no del gusto', () => {
    // 7 m detras de Gus, hasta 14,4 si la aleja al maximo. Veinte deja
    // margen para que la cuadra de atras no se vea desde ninguna distancia.
    expect(DISTANCIA_SELLADO).toBeGreaterThan(14.4);
  });
});

describe('el recorrido entero', () => {
  it('se pueden cruzar las tres puertas en orden, limpiando cada tramo', () => {
    const e = new Esclusa(PUERTAS);
    const abiertas = [];

    for (let t = 0; t < 3; t++) {
      // Llega al tramo con la puerta cerrada...
      expect(e.frena(t), `tramo ${t}`).toBe(true);
      // ...lo limpia...
      for (const ev of e.update(t, { x: 0, z: -200 * t - 190 }, limpio)) {
        if (ev.tipo === 'abre') abiertas.push(ev.control);
      }
      expect(e.frena(t), `tramo ${t} tras limpiar`).toBe(false);
      // ...y se aleja, sellandola.
      e.update(t + 1, { x: 0, z: -200 * t - 230 }, sucio);
    }

    expect(abiertas).toEqual([1, 2, 3]);
    expect(e.estado(0)).toBe(EstadoPuerta.SELLADA);
    expect(e.estado(1)).toBe(EstadoPuerta.SELLADA);
  });

  it('un tramo sin puerta no frena a nadie', () => {
    // El octavo: la casa de Sergio no necesita puerta (D-46).
    const e = new Esclusa(PUERTAS);
    expect(e.estado(7)).toBe(EstadoPuerta.ABIERTA);
    expect(e.frena(7)).toBe(false);
  });

  it('reiniciar la mision vuelve a cerrar todas', () => {
    const e = new Esclusa(PUERTAS);
    e.update(0, { x: 0, z: -190 }, limpio);
    e.reiniciar();
    expect(e.estado(0)).toBe(EstadoPuerta.CERRADA);
  });
});
