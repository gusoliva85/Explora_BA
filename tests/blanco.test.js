import { describe, it, expect } from 'vitest';
import { SelectorDeBlanco } from '../src/combat/blanco.js';

/**
 * ===========================================================================
 * A QUIEN LE DISPARA, Y DESDE CUANDO
 * ===========================================================================
 * Sin botones (D-28), el jugador no elige a quien le tira: elige **cuando**
 * pelear, quedandose quieto. Esta es la maquina que traduce esa decision en
 * un enemigo concreto, y por eso se prueba como maquina de estados y no como
 * funcion: lo que importa no es a quien elige una vez, sino **cuando vuelve
 * a elegir**.
 *
 * La eleccion en si —el mas cercano con linea de vista— ya tiene sus once
 * pruebas en `objetivo.test.js`. Aca no se vuelve a probar: se prueba el
 * flanco, el mantenimiento y el soltar.
 */

const zombi = (x, z, vivo = true) => ({ posicion: { x, z }, vivo });
const ORIGEN = { x: 0, z: 0 };

const nuevo = (opt = {}) => new SelectorDeBlanco({ alcance: 28, ...opt });

describe('moverse y frenar', () => {
  it('moviendose no hay blanco, aunque haya zombis encima', () => {
    const s = nuevo();
    expect(s.update(false, ORIGEN, [zombi(0, 2)])).toBe(null);
  });

  it('al quedarse quieto elige al mas cercano', () => {
    const cerca = zombi(0, 3);
    const lejos = zombi(0, 12);
    const s = nuevo();
    expect(s.update(true, ORIGEN, [lejos, cerca])).toBe(cerca);
  });

  it('moverse suelta el blanco EN EL ACTO, sin arrastre', () => {
    /*
     * Es la 17.6, y es a favor del jugador. Con cualquier demora, Gus
     * seguiria encarando al zombi del que esta huyendo durante el primer
     * paso de la huida, que es justo el paso en el que uno huye porque
     * algo salio mal.
     */
    const z = zombi(0, 3);
    const s = nuevo();
    s.update(true, ORIGEN, [z]);
    expect(s.actual).toBe(z);

    expect(s.update(false, ORIGEN, [z])).toBe(null);
    expect(s.actual).toBe(null);
  });
});

describe('el blanco se elige UNA vez, al entrar en quieto', () => {
  it('no cambia aunque otro zombi pase a estar mas cerca', () => {
    /*
     * ESTA es la prueba que justifica la clase entera.
     *
     * Eligiendo al mas cercano en cada cuadro, dos zombis que se acercan a
     * la par se alternan varias veces por segundo: Gus giraria en el lugar
     * repartiendo el daño en vez de concentrarlo. Y con cuatro tiros por
     * zombi (D-31), ninguno llegaria nunca a los cuatro: el combate
     * automatico no mataria a nadie.
     */
    const elegido = zombi(0, 5);
    const otro = zombi(0, 9);
    const s = nuevo();
    expect(s.update(true, ORIGEN, [elegido, otro])).toBe(elegido);

    // El otro se acerca y pasa a ser el mas cercano, de lejos.
    otro.posicion.z = 1;
    expect(s.update(true, ORIGEN, [elegido, otro])).toBe(elegido);
  });

  it('la eleccion es una foto del momento en que freno', () => {
    // Moverse y volver a frenar SI vuelve a elegir: es otra decision.
    const primero = zombi(0, 5);
    const segundo = zombi(0, 9);
    const s = nuevo();
    s.update(true, ORIGEN, [primero, segundo]);

    segundo.posicion.z = 1;
    s.update(false, ORIGEN, [primero, segundo]);
    expect(s.update(true, ORIGEN, [primero, segundo])).toBe(segundo);
  });
});

describe('frenar donde no hay nadie', () => {
  it('sin zombis a la vista no hay blanco, y no es un error', () => {
    const s = nuevo();
    expect(s.update(true, ORIGEN, [])).toBe(null);
  });

  it('si uno aparece despues, lo toma sin tener que moverse y volver a frenar', () => {
    /*
     * El caso de pararse en una cuadra vacia y que un zombi doble la
     * esquina tres segundos despues. Si hiciera falta moverse para que el
     * juego "se entere", el jugador tendria que hacer un gesto inutil que
     * ademas lo expone.
     */
    const s = nuevo();
    expect(s.update(true, ORIGEN, [])).toBe(null);

    const tarde = zombi(0, 6);
    expect(s.update(true, ORIGEN, [tarde])).toBe(tarde);
  });

  it('los muertos no son blanco', () => {
    const s = nuevo();
    expect(s.update(true, ORIGEN, [zombi(0, 2, false)])).toBe(null);
  });

  it('fuera del alcance del arma tampoco', () => {
    /*
     * El alcance se lo pasa `main` desde el arma, no es un numero propio:
     * lo que se puede elegir tiene que ser exactamente lo que se puede
     * alcanzar de un tiro. Si el selector buscara mas lejos, Gus se
     * quedaria encarando a alguien al que no le llega.
     */
    const s = nuevo({ alcance: 10 });
    expect(s.update(true, ORIGEN, [zombi(0, 11)])).toBe(null);
    expect(s.update(true, ORIGEN, [zombi(0, 9)])).not.toBe(null);
  });
});

describe('la linea de vista decide, y vale para los dos lados (D-36)', () => {
  /** Un escenario con una pared entre el origen y todo lo que este a +Z. */
  const paredAlNorte = (ax, az, bx, bz) => (bz > 0 ? { t: 0.5 } : null);

  it('un zombi tapado no es blanco, aunque sea el mas cercano', () => {
    const tapado = zombi(0, 3);
    const libre = zombi(0, -8);
    const s = nuevo({ rayo: paredAlNorte });
    expect(s.update(true, ORIGEN, [tapado, libre])).toBe(libre);
  });

  it('si el unico que hay esta tapado, no hay blanco', () => {
    const s = nuevo({ rayo: paredAlNorte });
    expect(s.update(true, ORIGEN, [zombi(0, 3)])).toBe(null);
  });
});

describe('reiniciar', () => {
  it('olvida el blanco y el estado de quieto', () => {
    /*
     * Lo llama el arranque de mision. Sin esto, reaparecer en un control
     * dejaria a Gus apuntandole a un zombi de la cuadra anterior, que
     * ademas puede estar a cien metros.
     */
    const z = zombi(0, 3);
    const s = nuevo();
    s.update(true, ORIGEN, [z]);
    expect(s.actual).toBe(z);

    s.reiniciar();
    expect(s.actual).toBe(null);
    expect(s.quietoAntes).toBe(false);
    expect(s.distancia).toBe(0);
  });

  it('despues de reiniciar, estar quieto vuelve a elegir', () => {
    const z = zombi(0, 3);
    const s = nuevo();
    s.update(true, ORIGEN, [z]);
    s.reiniciar();
    expect(s.update(true, ORIGEN, [z])).toBe(z);
  });
});
