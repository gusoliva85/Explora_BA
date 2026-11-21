import { describe, it, expect } from 'vitest';
import { mission001 } from '../src/config/mission001.js';
import { UNITS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * LA CASA DE SERGIO — Billinghurst 250 (D-41, 18.11)
 * ===========================================================================
 * El final de los 1.600 m, y el motivo del juego entero: Gus no va a un
 * refugio, va a buscar a un amigo.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTAS PRUEBAS CUIDAN
 * ---------------------------------------------------------------------------
 * **Que se distinga sin dejar de pertenecer.** Es lo dificil de la tarea:
 *
 *  - Si se pasa de distinta, se lee como un objeto de videojuego apoyado
 *    encima del barrio.
 *  - Si se pasa de igual, el jugador camina mil seiscientos metros para no
 *    reconocer el final.
 *
 * La respuesta no es el color sino **la forma**: una casa baja donde todo lo
 * demas es planta baja comercial. Eso se puede medir; "se ve linda", no.
 */

const CASA = mission001.props.find((p) => p.tipo === 'casaDeSergio');
const META = mission001.route[mission001.goal.atRouteIndex];
const ULTIMO_BLOQUE = mission001.blocks[mission001.blocks.length - 1];

describe('esta donde tiene que estar', () => {
  it('existe una sola', () => {
    expect(mission001.props.filter((p) => p.tipo === 'casaDeSergio')).toHaveLength(1);
  });

  it('su frente cae sobre la linea municipal, no adentro de la manzana', () => {
    /*
     * La primera version la dejaba cinco metros adentro: un diente en la
     * cuadra que se lee como un error de construccion, no como un zaguan.
     */
    const dEje = Math.hypot(CASA.x - META.x, CASA.z - META.z);
    const linea = UNITS.streetWidth / 2 + UNITS.sidewalkWidth;
    const frente = dEje - CASA.collide.d / 2;
    // Se mide contra el tramo final, que corre derecho hasta la meta.
    expect(frente).toBeLessThan(linea + 3);
  });

  it('esta cerca de la meta, pero no encima del vertice', () => {
    /*
     * Una casa no esta en la esquina: esta sobre la linea de fachadas. El
     * marcador de meta se queda en el vertice —es donde hay que llegar— y
     * la casa es lo que se VE.
     */
    const d = Math.hypot(CASA.x - META.x, CASA.z - META.z);
    expect(d).toBeGreaterThan(6);
    expect(d).toBeLessThan(25);
  });
});

describe('se distingue de sus vecinas', () => {
  it('es MAS BAJA que cualquier edificio de su cuadra', () => {
    /*
     * El dato que hace todo el trabajo desde la camara cenital. Si alguna
     * vez el ultimo tramo baja de altura y la casa deja de sobresalir hacia
     * abajo, el final se pierde entre las fachadas.
     */
    const [minVecino] = ULTIMO_BLOQUE.buildingHeight;
    expect(CASA.collide.h).toBeLessThan(minVecino);
  });

  it('se queda con su pedazo de hilera, asi el generador no la tapa', () => {
    /*
     * Sin el hueco quedan dos paredes en el mismo lugar —la casa adentro de
     * un edificio— y lo peor es que **no se ve**: desde arriba se lee como
     * una fachada mas.
     */
    expect(CASA.hueco).toBeTruthy();
    expect(CASA.hueco.w).toBeGreaterThan(CASA.collide.w);
    expect(CASA.hueco.d).toBeGreaterThan(CASA.collide.d);
  });

  it('tiene su cartel, y dice la direccion de D-41', () => {
    const cartel = mission001.props.find(
      (p) => p.tipo === 'carteDireccion' && p.args.texto === 'Billinghurst 250'
    );
    expect(cartel).toBeTruthy();
    const d = Math.hypot(cartel.x - CASA.x, cartel.z - CASA.z);
    // Cerca, para que se lean juntos; no encima, para que no se tapen.
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(40);
  });

  it('bloquea el paso: es un edificio, no un decorado', () => {
    expect(CASA.tag).toBe('building');
    expect(CASA.collide.w).toBeGreaterThan(6);
  });
});
