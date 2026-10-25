import { describe, it, expect } from 'vitest';
import { Inventario, UsoDeObjeto, MotivoCancelacion } from '../src/items/inventario.js';
import { ITEMS, PLAYER, ZOMBIE_STANDARD } from '../src/config/balance.js';

/**
 * ===========================================================================
 * INVENTARIO Y USO DE OBJETOS
 * ===========================================================================
 * Lo que el jugador lleva, y la regla que convierte curarse en una
 * decisión: lleva tiempo, hay que frenar, y un golpe lo corta.
 */

const crear = () => new Inventario(ITEMS);

describe('inventario', () => {
  it('arranca vacio', () => {
    const inv = crear();
    for (const clave of Object.keys(ITEMS)) expect(inv.cuantos(clave)).toBe(0);
  });

  it('guarda y saca', () => {
    const inv = crear();
    expect(inv.agregar('medkit', 1)).toBe(1);
    expect(inv.cuantos('medkit')).toBe(1);
    expect(inv.quitar('medkit')).toBe(true);
    expect(inv.cuantos('medkit')).toBe(0);
  });

  it('no saca lo que no tiene', () => {
    const inv = crear();
    expect(inv.quitar('medkit')).toBe(false);
    expect(inv.cuantos('medkit')).toBe(0);
  });

  it('respeta el tope', () => {
    const inv = crear();
    const tope = ITEMS.medkit.maxCarried;
    expect(inv.agregar('medkit', tope + 5)).toBe(tope);
    expect(inv.cuantos('medkit')).toBe(tope);
    expect(inv.lleno('medkit')).toBe(true);
  });

  it('devuelve cuantos entraron de verdad, no cuantos se pidieron', () => {
    /*
     * Importa porque quien llama decide que hacer con el resto: un
     * botiquin que no entra tiene que QUEDARSE EN EL PISO, no evaporarse.
     */
    const inv = crear();
    const tope = ITEMS.medkit.maxCarried;
    inv.agregar('medkit', tope - 1);
    expect(inv.agregar('medkit', 3)).toBe(1);
    expect(inv.cuantos('medkit')).toBe(tope);
    expect(inv.agregar('medkit', 1)).toBe(0);
  });

  it('ignora claves que no existen', () => {
    const inv = crear();
    expect(inv.agregar('lanzallamas', 1)).toBe(0);
  });

  it('vaciar lo deja como al principio', () => {
    const inv = crear();
    inv.agregar('medkit', 2);
    inv.vaciar();
    expect(inv.cuantos('medkit')).toBe(0);
  });

  it('los topes salen del balance, no de numeros sueltos', () => {
    const inv = crear();
    expect(inv.tope('medkit')).toBe(ITEMS.medkit.maxCarried);
    expect(inv.tope('medkit')).toBeGreaterThan(0);
  });
});

describe('usar un objeto lleva tiempo', () => {
  const armar = () => {
    const ev = { completos: [], cancelados: [] };
    const uso = new UsoDeObjeto({
      alCompletar: (i) => ev.completos.push(i),
      alCancelar: (i) => ev.cancelados.push(i)
    });
    return { uso, ev };
  };

  const D = ITEMS.medkit.useTime;

  it('no se completa en el instante en que se aprieta', () => {
    /*
     * Es la regla entera de la tarea. Un botiquin que cura al apretar no
     * es una decision: es un segundo medidor de vida, y la respuesta
     * correcta a estar herido seria siempre "curarse ya".
     */
    const { uso, ev } = armar();
    expect(uso.iniciar('medkit', D)).toBe(true);
    expect(uso.enCurso).toBe(true);
    uso.update(D / 2);
    expect(ev.completos).toHaveLength(0);
    expect(uso.enCurso).toBe(true);
  });

  it('se completa al cumplirse el tiempo', () => {
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    expect(uso.update(D + 0.01)).toBe(true);
    expect(ev.completos).toEqual([{ clave: 'medkit' }]);
    expect(uso.enCurso).toBe(false);
  });

  it('no se pueden usar dos cosas a la vez', () => {
    const { uso } = armar();
    uso.iniciar('medkit', D);
    expect(uso.iniciar('medkit', D)).toBe(false);
  });

  it('el progreso va de cero a uno', () => {
    const { uso } = armar();
    expect(uso.progreso).toBe(0);
    uso.iniciar('medkit', D);
    expect(uso.progreso).toBeCloseTo(0, 5);
    uso.update(D / 2);
    expect(uso.progreso).toBeCloseTo(0.5, 2);
    uso.update(D);
    expect(uso.progreso).toBe(0);
  });

  it('terminado, el progreso vuelve a cero y no sigue corriendo', () => {
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    uso.update(D + 0.01);
    expect(uso.update(1)).toBe(false);
    expect(ev.completos).toHaveLength(1);
  });
});

describe('moverse y los golpes cortan el uso', () => {
  const armar = () => {
    const ev = { completos: [], cancelados: [] };
    const uso = new UsoDeObjeto({
      alCompletar: (i) => ev.completos.push(i),
      alCancelar: (i) => ev.cancelados.push(i)
    });
    return { uso, ev };
  };
  const D = ITEMS.medkit.useTime;

  it('moverse lo corta', () => {
    /*
     * Sin esta regla, curarse mientras se corre seria gratis: el tiempo de
     * uso no costaria nada porque se gastaria haciendo lo que uno iba a
     * hacer igual. Teniendo que frenar, el costo es terreno.
     */
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    uso.update(D / 3);
    uso.update(0.1, { moviendose: true });

    expect(uso.enCurso).toBe(false);
    expect(ev.completos).toHaveLength(0);
    expect(ev.cancelados[0].motivo).toBe(MotivoCancelacion.MOVIMIENTO);
  });

  it('un golpe lo corta', () => {
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    uso.update(D / 2);
    expect(uso.cancelar(MotivoCancelacion.GOLPE)).toBe(true);

    expect(uso.enCurso).toBe(false);
    expect(ev.completos).toHaveLength(0);
    expect(ev.cancelados[0].motivo).toBe(MotivoCancelacion.GOLPE);
  });

  it('el motivo llega entero, para poder decir algo util en pantalla', () => {
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    uso.cancelar(MotivoCancelacion.GOLPE);
    expect(ev.cancelados[0]).toEqual({
      clave: 'medkit',
      motivo: MotivoCancelacion.GOLPE
    });
  });

  it('cancelar sin nada en curso no hace nada', () => {
    const { uso, ev } = armar();
    expect(uso.cancelar()).toBe(false);
    expect(ev.cancelados).toHaveLength(0);
  });

  it('cortado a ultimo momento, NO cura', () => {
    // El caso mas cruel y el que tiene que funcionar: a una centesima del
    // final, un mordisco deja al jugador igual de herido.
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    uso.update(D - 0.01);
    uso.cancelar(MotivoCancelacion.GOLPE);
    expect(ev.completos).toHaveLength(0);
  });

  it('despues de cortarse se puede volver a empezar', () => {
    const { uso, ev } = armar();
    uso.iniciar('medkit', D);
    uso.cancelar(MotivoCancelacion.GOLPE);
    expect(uso.iniciar('medkit', D)).toBe(true);
    uso.update(D + 0.01);
    expect(ev.completos).toHaveLength(1);
  });
});

describe('el objeto no se gasta si el uso se corta', () => {
  it('el inventario queda igual que antes de empezar', () => {
    /*
     * Perder el botiquin ADEMAS de los 1,2 segundos seria castigar dos
     * veces el mismo error, y llevaria a que nadie se anime a usarlo
     * nunca: lo contrario de lo que se busca.
     *
     * Se prueba la cadena completa —inventario mas uso— porque el error
     * estaria justo en el cruce: descontar al empezar en vez de al
     * terminar.
     */
    const inv = crear();
    inv.agregar('medkit', 2);

    const uso = new UsoDeObjeto({
      alCompletar: ({ clave }) => inv.quitar(clave)
    });

    uso.iniciar('medkit', ITEMS.medkit.useTime);
    uso.update(ITEMS.medkit.useTime * 0.9);
    uso.cancelar(MotivoCancelacion.GOLPE);

    expect(inv.cuantos('medkit'), 'se gasto un botiquin sin curar').toBe(2);
  });

  it('completado, SI se gasta', () => {
    const inv = crear();
    inv.agregar('medkit', 2);
    const uso = new UsoDeObjeto({ alCompletar: ({ clave }) => inv.quitar(clave) });

    uso.iniciar('medkit', ITEMS.medkit.useTime);
    uso.update(ITEMS.medkit.useTime + 0.01);

    expect(inv.cuantos('medkit')).toBe(1);
  });
});

describe('balance de la curacion', () => {
  it('curarse tarda lo suficiente como para que un zombi llegue', () => {
    /*
     * El numero suelto no dice nada: 1,2 segundos es mucho o poco segun
     * cuanto se acerque la amenaza mientras tanto. Lo que importa es que
     * frenar a curarse tenga consecuencias.
     *
     * Un zombi persiguiendo recorre `chaseSpeed * useTime` metros mientras
     * uno esta parado. Eso tiene que ser MAS que su alcance de ataque: si
     * no, curarse delante de uno que ya te estaba por alcanzar seria
     * gratis.
     */
    const avanza = ZOMBIE_STANDARD.chaseSpeed * ITEMS.medkit.useTime;
    expect(avanza).toBeGreaterThan(ZOMBIE_STANDARD.attackRange);

    // Y el jugador caminando se despega: huir sigue siendo una opcion.
    expect(PLAYER.runSpeed).toBeGreaterThan(ZOMBIE_STANDARD.chaseSpeed);
  });

  it('el botiquin cura la mitad del total', () => {
    expect(ITEMS.medkit.heal).toBe(PLAYER.maxHealth / 2);
  });

  it('se pueden llevar varios, pero pocos', () => {
    // Suficientes para administrar, pocos para que importe gastarlos.
    expect(ITEMS.medkit.maxCarried).toBeGreaterThan(1);
    expect(ITEMS.medkit.maxCarried).toBeLessThanOrEqual(4);
  });
});
