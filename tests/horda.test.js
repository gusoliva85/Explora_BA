import { describe, it, expect } from 'vitest';
import { ZombieAI, EstadoZombi } from '../src/enemies/zombieAI.js';
import { CollisionWorld } from '../src/physics/collisionWorld.js';
import { ZOMBIE_STANDARD, PLAYER, PERF } from '../src/config/balance.js';
import { mission001 } from '../src/config/mission001.js';
import { rumboHacia } from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * LA HORDA (19C.1 y 19C.2)
 * ===========================================================================
 * Dos cambios que vienen juntos porque por separado no funcionan.
 *
 * Gus jugó el recorrido entero y dijo dos cosas: que había cinco zombis por
 * tramo y tendrían que ser quince o veinte, y que **te tienen que obligar a
 * moverte**. Lo segundo no se arregla con cantidad: cinco zombis a 2,9 m/s
 * y veinte zombis a 2,9 m/s se esquivan igual de caminando. Lo que obliga a
 * moverse es que **aceleren cuando te ven**.
 *
 * Y lo que se prueba acá no es el balance —ese se ajusta jugando— sino las
 * dos cosas que, si se rompen, rompen el juego entero:
 *
 *   1. Que el zombi **nunca** corra más que el jugador. Si lo hiciera,
 *      escapar sería imposible y la única respuesta sería pelear; pelear es
 *      pararse, y pararse es justo lo que esto vino a hacer caro.
 *   2. Que cada tramo tenga de verdad los que el diseño dice. Con la
 *      esclusa (D-37) este número es el tiempo mínimo de cada tramo, y un
 *      error acá no se ve: se siente como que el juego dura mal.
 */

const mundoVacio = () => new CollisionWorld(8);
const MIRANDO_A_MAS_Z = rumboHacia(0, 1);

const crearViendo = () => {
  const ai = new ZombieAI({ world: mundoVacio(), origen: { x: 0, z: 0 }, azar: () => 0.5 });
  ai.rumbo = MIRANDO_A_MAS_Z;
  return ai;
};

/** Un cuadro con el jugador a la vista, de frente y fuera del alcance de golpe. */
const paso = (ai, dt = 1 / 30, pos = { x: 0, z: 0 }) =>
  ai.update(dt, { pos, jugador: { x: 0, z: 10 }, jugadorVivo: true });

describe('apura la marcha cuando te ve', () => {
  it('el primer cuadro todavia es casi caminando', () => {
    const ai = crearViendo();
    const r = paso(ai);
    expect(ai.estado).toBe(EstadoZombi.CHASE);
    /*
     * Lo importante no es el número sino que esté MUCHO más cerca de
     * caminar que de correr: ese primer momento lento es el aviso. Desde
     * una cámara cenital, que un zombi te detectó sólo se nota porque
     * cambia de velocidad.
     */
    expect(r.velocidad).toBeLessThan(ZOMBIE_STANDARD.walkSpeed * 1.5);
    expect(r.velocidad).toBeGreaterThanOrEqual(ZOMBIE_STANDARD.walkSpeed);
  });

  it('acelera cuadro a cuadro, sin saltos', () => {
    const ai = crearViendo();
    let anterior = 0;
    for (let i = 0; i < 20; i++) {
      const r = paso(ai);
      expect(r.velocidad).toBeGreaterThanOrEqual(anterior);
      anterior = r.velocidad;
    }
  });

  it('llega a la velocidad de persecucion al terminar la rampa, y no antes', () => {
    const ai = crearViendo();
    const dt = 1 / 30;
    const cuadros = Math.ceil(ZOMBIE_STANDARD.chaseRampUp / dt);

    // Justo antes de terminar todavía no llegó.
    for (let i = 0; i < cuadros - 2; i++) paso(ai, dt);
    expect(ai.velocidadPersecucion).toBeLessThan(ZOMBIE_STANDARD.chaseSpeed);

    for (let i = 0; i < 4; i++) paso(ai, dt);
    expect(ai.velocidadPersecucion).toBeCloseTo(ZOMBIE_STANDARD.chaseSpeed, 5);
  });

  it('y no pasa de ahi por mas que corra', () => {
    const ai = crearViendo();
    for (let i = 0; i < 600; i++) paso(ai);
    expect(ai.velocidadPersecucion).toBeCloseTo(ZOMBIE_STANDARD.chaseSpeed, 5);
    expect(ai.impulso).toBe(1);
  });

  it('al perderte se calma, pero mas despacio de lo que acelero', () => {
    const ai = crearViendo();
    const dt = 1 / 30;
    for (let i = 0; i < 60; i++) paso(ai, dt);
    expect(ai.impulso).toBe(1);

    // El jugador desaparece: pasa a buscar.
    const pos = { x: 0, z: 0 };
    for (let i = 0; i < 10; i++) {
      ai.update(dt, { pos, jugador: { x: 0, z: 500 }, jugadorVivo: true });
    }
    expect(ai.estado).toBe(EstadoZombi.SEARCH);

    const trasDiezCuadros = ai.impulso;
    expect(trasDiezCuadros).toBeLessThan(1);
    /*
     * Baja a la mitad de velocidad que subió, y eso es deliberado: un zombi
     * que se apaga de golpe al romper la línea de vista convierte cada auto
     * en un botón de apagado. Con el impulso a medias, volver a asomarse lo
     * encuentra ya lanzado.
     */
    expect(1 - trasDiezCuadros).toBeLessThan(0.5);
  });

  it('un zombi que no te vio nunca sigue caminando', () => {
    const ai = crearViendo();
    const pos = { x: 0, z: 0 };
    for (let i = 0; i < 30; i++) {
      ai.update(1 / 30, { pos, jugador: { x: 0, z: 500 }, jugadorVivo: true });
    }
    expect(ai.impulso).toBe(0);
    expect(ai.velocidadPersecucion).toBe(ZOMBIE_STANDARD.walkSpeed);
  });
});

describe('la promesa del que corre', () => {
  /*
   * Esta es LA regla, y es la única de este archivo que no se puede
   * aflojar jugando: **escaparse se tiene que poder siempre.**
   *
   * Es lo que hace que morir sea culpa del jugador. Si el zombi corriera
   * más que vos, no habría decisión: pelear sería obligatorio, y pelear es
   * pararse.
   */
  it('el zombi a maxima velocidad sigue siendo mas lento que el jugador', () => {
    expect(ZOMBIE_STANDARD.chaseSpeed).toBeLessThan(PLAYER.speed);
  });

  it('y la ventaja alcanza para darse vuelta y disparar', () => {
    /*
     * El margen, por los dos lados, y los dos bordes los encontró Gus
     * jugando:
     *
     *  - **Muy chico** y el bucle del juego se rompe. Con 5,2 escribió
     *    *"me alcanzan y no puedo darme vuelta para disparar"*. Como
     *    disparar es frenar (D-28), si la ventaja no abre el hueco en el
     *    que se frena, no queda más que correr hasta morir.
     *  - **Muy grande** y el barrio se cruza caminando, que es lo que
     *    pasaba con 2,9.
     *
     * 1,6 m/s abre diez metros en algo más de seis segundos. Matar a uno
     * cuesta 1,6 s (D-31), así que entra una muerte por hueco, que es la
     * unidad de decisión que el juego quiere.
     */
    const ventaja = PLAYER.speed - ZOMBIE_STANDARD.chaseSpeed;
    expect(ventaja).toBeGreaterThan(1.2);
    expect(ventaja).toBeLessThan(2.5);
  });
});

describe('cuantos hay en cada tramo', () => {
  const zonas = mission001.zonas.filter((z) => z.tipo === 'zombis');

  const porTramo = () => {
    const m = new Map();
    for (const z of zonas) m.set(z.tramo, (m.get(z.tramo) ?? 0) + z.cantidad);
    return m;
  };

  it('ningun tramo baja de quince', () => {
    // El piso que pidió Gus. Era de 4 a 10.
    for (const [tramo, n] of porTramo()) {
      expect(n, `el tramo ${tramo + 1} tiene ${n}`).toBeGreaterThanOrEqual(15);
    }
  });

  it('y ninguno pasa del tope de activos', () => {
    /*
     * Importa que no lo pase: si un tramo pidiera más de los que pueden
     * estar encendidos a la vez, los que sobran esperarían apagados y la
     * puerta tardaría en abrir **sin nada en pantalla que lo explique** —
     * el jugador ve "queda 1" y no encuentra a nadie.
     */
    for (const [tramo, n] of porTramo()) {
      expect(n, `el tramo ${tramo + 1} pide ${n}`).toBeLessThanOrEqual(PERF.maxActiveZombies);
    }
  });

  it('la curva sigue subiendo hasta el final y despues afloja', () => {
    /*
     * La forma, no los números. La curva es 16 18 18 20 20 22 22 20, así
     * que el pico EMPATA entre el sexto y el séptimo: redondear a enteros
     * aplana los escalones, y eso está bien. Una primera versión de esta
     * prueba exigía que el máximo cayera exactamente en el anteúltimo y
     * fallaba por el empate — medía el redondeo, no el diseño.
     *
     * Lo que sí tiene que valer: el primero es el más flojo, el último
     * afloja, y el pico está en el último tercio. Llegar a lo de Sergio
     * tiene que sentirse como llegar, no como una pared.
     */
    const n = [...porTramo().entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    const pico = Math.max(...n);
    const ultimo = n.length - 1;

    expect(n[0]).toBe(Math.min(...n));
    expect(n[ultimo]).toBeLessThan(pico);
    expect(n.indexOf(pico)).toBeGreaterThan(n.length * 0.6);
    // Y no baja en el camino: cada tramo pide al menos lo del anterior,
    // salvo el último.
    for (let i = 1; i < ultimo; i++) expect(n[i]).toBeGreaterThanOrEqual(n[i - 1]);
  });

  it('cada cuadra pone su parte, y ninguna queda vacia', () => {
    for (const z of zonas) expect(z.cantidad).toBeGreaterThan(0);
  });
});
