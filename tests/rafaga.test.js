import { describe, it, expect } from 'vitest';
import {
  cuantosProyectiles,
  proyectilesDeRafaga,
  desvioDeCarril
} from '../src/combat/rafaga.js';
import { WEAPONS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * LA RAFAGA — la formula de D-44, escrita antes de que haga falta
 * ===========================================================================
 * Hoy sale **un** proyectil. Estas pruebas no comprueban el juego de hoy:
 * comprueban que la formula que va a sostener toda la progresion de la 19B
 * este bien escrita **antes** de que alguien la necesite.
 *
 * Por eso casi todas usan armas inventadas con los multiplicadores subidos.
 * Es a proposito: con los dos ejes en 1, la unica prueba posible seria
 * "sale uno", que no distingue una multiplicacion de una suma ni de una
 * constante.
 */

/** Un arma de mentira, con lo minimo que la formula necesita. */
const arma = (carriles, repeticiones, carrilDegrees = 12) => ({
  carriles,
  repeticiones,
  carrilDegrees
});

describe('cuantos proyectiles salen', () => {
  it('hoy sale uno, y el arma de verdad lo dice asi', () => {
    expect(cuantosProyectiles(WEAPONS.pistol)).toBe(1);
    expect(WEAPONS.pistol.carriles).toBe(1);
    expect(WEAPONS.pistol.repeticiones).toBe(1);
  });

  it('los dos ejes se MULTIPLICAN, no se suman', () => {
    /*
     * ESTA es la prueba que justifica el archivo entero.
     *
     * Es literal de lo que pidio Gus: "en cada tiro que antes era uno solo,
     * ahora dispara 4 tiros de una sola vez". Dos carriles por dos
     * repeticiones son **cuatro**, no tres.
     *
     * Si alguna vez esto diera 3, la progresion de la partida entera se
     * aplana: el final dejaria de ser el "lio terrible de proyectiles" que
     * es la gracia del juego, y pasaria a ser un aumento mas.
     */
    expect(cuantosProyectiles(arma(2, 2))).toBe(4);
    expect(cuantosProyectiles(arma(2, 2))).not.toBe(3);
  });

  it('la cuenta del ejemplo de D-44 da lo que dice D-44', () => {
    // Tiro doble (un carril mas) y disparo multiple (una repeticion mas).
    expect(cuantosProyectiles(arma(1, 1))).toBe(1);
    expect(cuantosProyectiles(arma(2, 1))).toBe(2);
    expect(cuantosProyectiles(arma(2, 2))).toBe(4);
  });

  it('con diagonales, que suman DOS carriles', () => {
    // 1 + tiro_doble(1) + 2 × diagonales(1) = 4 carriles.
    expect(cuantosProyectiles(arma(4, 1))).toBe(4);
    // Y con disparo multiple encima: ocho.
    expect(cuantosProyectiles(arma(4, 2))).toBe(8);
  });
});

describe('cual proyectil es cual', () => {
  it('el primero es el tiro apuntado, y no falla', () => {
    /*
     * D-36: el tiro apuntado no falla, salvo barrera fisica. Es la promesa
     * del juego —quedarse quieto SIRVE— y no puede depender de la suerte.
     */
    const [primero] = proyectilesDeRafaga(arma(4, 2));
    expect(primero.indice).toBe(0);
    expect(primero.tipo).toBe('rayo');
    expect(primero.desvio).toBe(0);
  });

  it('TODOS los demas vuelan, incluidos los de las repeticiones', () => {
    /*
     * Si todos fueran infalibles, acumular cartas seria sumar daño
     * garantizado y el final de la partida seria una planilla. Lo que Gus
     * describe es un LIO de proyectiles, y un lio necesita que algunos se
     * pierdan.
     *
     * Ojo con la repeticion: el segundo abanico repite el carril 0, y ESE
     * tampoco es apuntado. Sólo hay un tiro apuntado por rafaga.
     */
    const todos = proyectilesDeRafaga(arma(2, 2));
    expect(todos).toHaveLength(4);
    expect(todos.filter((p) => p.tipo === 'rayo')).toHaveLength(1);
    expect(todos.slice(1).every((p) => p.tipo === 'proyectil')).toBe(true);
  });

  it('hoy, con un solo proyectil, ese unico es el apuntado', () => {
    const hoy = proyectilesDeRafaga(WEAPONS.pistol);
    expect(hoy).toHaveLength(1);
    expect(hoy[0].tipo).toBe('rayo');
    expect(hoy[0].desvio).toBe(0);
  });
});

describe('el abanico de carriles', () => {
  it('el carril del medio va derecho', () => {
    expect(desvioDeCarril(0, 12)).toBe(0);
  });

  it('se abre a los dos lados, alternando', () => {
    /*
     * Alternar no es cosmetico. Si los carriles extra se fueran todos para
     * el mismo lado, el arma apuntaria torcido al tomar una carta y el
     * jugador lo leeria como un error del juego.
     *
     * Abriendose parejo, el tiro apuntado sigue siendo el centro del
     * abanico, que es lo que el jugador ve y espera.
     */
    expect(desvioDeCarril(1, 12)).toBe(12);
    expect(desvioDeCarril(2, 12)).toBe(-12);
    expect(desvioDeCarril(3, 12)).toBe(24);
    expect(desvioDeCarril(4, 12)).toBe(-24);
  });

  it('con cantidad IMPAR de carriles el abanico cierra simetrico', () => {
    const desvios = proyectilesDeRafaga(arma(3, 1)).map((p) => p.desvio);
    expect(desvios).toEqual([0, 12, -12]);
    expect(desvios.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('⚠️ con cantidad PAR queda cargado a un lado, y hay que mirarlo en la 19B', () => {
    /*
     * Esto lo encontro una prueba que escribi mal: di por hecho que el
     * abanico cerraba siempre y pedi que los desvios sumaran cero. Con
     * cuatro carriles suman 24.
     *
     * **No es un error del codigo: es inevitable.** El carril 0 tiene que
     * ir a cero —es el tiro apuntado, el que no falla (D-36)— asi que con
     * cantidad par siempre sobra uno de un lado. No hay forma de centrar un
     * abanico par alrededor de un rayo fijo.
     *
     * El caso que importa es el mas comun de todos: **`tiro doble` da dos
     * carriles**, o sea 0 y +12. Siempre a la derecha. Si eso se lee como
     * que el arma apunta torcido, la salida no es tocar esta funcion sino
     * decidir que `tiro doble` abra a ±6 y mueva el rayo apuntado al centro
     * del par — y eso cambia D-36, asi que es una decision, no un ajuste.
     *
     * Queda como prueba y no como comentario para que la 19B se tropiece
     * con el numero cuando la carta exista y se pueda mirar jugando.
     */
    const dos = proyectilesDeRafaga(arma(2, 1)).map((p) => p.desvio);
    expect(dos).toEqual([0, 12]);

    const cuatro = proyectilesDeRafaga(arma(4, 1)).map((p) => p.desvio);
    expect(cuatro).toEqual([0, 12, -12, 24]);
    expect(cuatro.reduce((a, b) => a + b, 0)).toBe(24);
  });

  it('las repeticiones NO desvian: son el mismo abanico otra vez', () => {
    /*
     * Lo que separa a las repeticiones es el tiempo, no el angulo. Si
     * desviaran, "disparo multiple" seria en realidad otra carta de
     * dispersion y los dos ejes dejarian de ser dos ejes.
     */
    const dos = proyectilesDeRafaga(arma(2, 2));
    const primerAbanico = dos.filter((p) => p.repeticion === 0).map((p) => p.desvio);
    const segundoAbanico = dos.filter((p) => p.repeticion === 1).map((p) => p.desvio);
    expect(segundoAbanico).toEqual(primerAbanico);
  });

  it('la separacion sale del arma, no de un numero escrito aca', () => {
    expect(desvioDeCarril(1, WEAPONS.pistol.carrilDegrees)).toBe(
      WEAPONS.pistol.carrilDegrees
    );
  });

  it('a diez metros, dos carriles separan mas de dos cuerpos de zombi', () => {
    /*
     * De donde sale el 12, que si no es un numero elegido a ojo.
     *
     * El zombi mide unos 0,9 m de ancho (`targetRadius` es medio cuerpo).
     * A diez metros —la distancia tipica de una pelea— el abanico tiene que
     * abrirse lo suficiente como para que el segundo proyectil le pegue a
     * OTRO zombi del grupo, no al mismo.
     */
    const sep = WEAPONS.pistol.carrilDegrees;
    const metros = 2 * Math.tan((sep * Math.PI) / 180) * 10;
    expect(metros).toBeGreaterThan(WEAPONS.pistol.targetRadius * 2 * 2);
  });
});

describe('equivalencia: con los multiplicadores en 1 nada cambia', () => {
  it('la rafaga de hoy es un unico rayo derecho, sin desvio', () => {
    /*
     * La prueba que pide la tarea: escribir el disparo como rafaga **no
     * puede cambiar el juego de hoy**. Si cambiara algo —el orden, el
     * desvio, la cantidad— la refactorizacion se llevo puesto algo, y
     * conviene enterarse ahora y no en la 19B con numeros ajustados
     * encima.
     *
     * El resto de la equivalencia la cubren las 39 pruebas de
     * `pistola.test.js`, que pasaron sin tocar una sola linea.
     */
    const hoy = proyectilesDeRafaga(WEAPONS.pistol);
    expect(hoy).toEqual([{ indice: 0, tipo: 'rayo', desvio: 0, repeticion: 0 }]);
  });
});
