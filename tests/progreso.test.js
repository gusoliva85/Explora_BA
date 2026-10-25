import { describe, it, expect, beforeEach } from 'vitest';
import { Estadisticas, Progreso, formatearTiempo } from '../src/core/progreso.js';

/**
 * ===========================================================================
 * ESTADISTICAS Y PROGRESO
 * ===========================================================================
 * El reloj de la partida y lo que sobrevive a cerrar la pestaña.
 *
 * Lo de guardar se prueba con un almacen falso, no con el `localStorage`
 * real: asi se puede simular el caso que importa de verdad, que es el
 * navegador que NO deja guardar. En una ventana privada eso pasa siempre.
 */

/** Un `localStorage` de mentira. */
const almacenFalso = () => {
  const mapa = new Map();
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
    _mapa: mapa
  };
};

/** Uno que falla en todo, como una ventana privada. */
const almacenRoto = () => ({
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
  removeItem: () => {
    throw new Error('bloqueado');
  }
});

describe('el reloj de la partida', () => {
  it('arranca en cero y avanza con dt', () => {
    const e = new Estadisticas();
    expect(e.tiempo).toBe(0);
    e.update(0.5);
    e.update(0.5);
    expect(e.tiempo).toBeCloseTo(1, 6);
  });

  it('reiniciar lo deja como nuevo', () => {
    const e = new Estadisticas();
    e.update(10);
    e.zombisEliminados = 5;
    e.golpesRecibidos = 3;
    e.reiniciar();
    expect(e.tiempo).toBe(0);
    expect(e.zombisEliminados).toBe(0);
    expect(e.golpesRecibidos).toBe(0);
  });
});

describe('el resumen', () => {
  it('redondea la vida y nunca la deja negativa', () => {
    const e = new Estadisticas();
    expect(e.resumen(37.6).vida).toBe(38);
    expect(e.resumen(-5).vida).toBe(0);
  });

  it('sin disparos, la punteria es null y NO cero', () => {
    /*
     * Un "0 %" al lado de "0 disparos" acusa al jugador de errar todos los
     * tiros que no hizo. Y pasar la mision sin disparar es justamente una
     * de las formas buenas de jugarla: el cuchillo es silencioso.
     */
    const e = new Estadisticas();
    expect(e.resumen(100).precision).toBeNull();
  });

  it('con disparos, la punteria es la fraccion', () => {
    const e = new Estadisticas();
    e.disparos = 10;
    e.zombisEliminados = 4;
    expect(e.resumen(100).precision).toBeCloseTo(0.4, 6);
  });

  it('lleva las cuentas que el jugador puede cambiar jugando', () => {
    const e = new Estadisticas();
    e.update(72.5);
    e.zombisEliminados = 14;
    e.golpesRecibidos = 3;
    e.muertes = 1;
    const r = e.resumen(38);
    expect(r).toMatchObject({
      zombis: 14,
      vida: 38,
      golpes: 3,
      muertes: 1
    });
    expect(r.tiempo).toBeCloseTo(72.5, 6);
  });
});

describe('formatear el tiempo', () => {
  it('muestra minutos y segundos con dos digitos', () => {
    expect(formatearTiempo(0)).toBe('0:00');
    expect(formatearTiempo(9)).toBe('0:09');
    expect(formatearTiempo(65)).toBe('1:05');
    expect(formatearTiempo(600)).toBe('10:00');
  });

  it('trunca, no redondea hacia arriba', () => {
    // 1:59,9 todavia no es 2:00: redondear hacia arriba mostraria un
    // tiempo que el jugador no hizo.
    expect(formatearTiempo(119.9)).toBe('1:59');
  });

  it('aguanta valores raros sin romperse', () => {
    expect(formatearTiempo(-10)).toBe('0:00');
  });
});

describe('progreso guardado', () => {
  let almacen;
  let p;

  beforeEach(() => {
    almacen = almacenFalso();
    p = new Progreso(almacen);
  });

  it('arranca vacio', () => {
    expect(p.mejorTiempo).toBeNull();
    expect(p.mejorControl).toBe(0);
    expect(p.victorias).toBe(0);
  });

  it('la primera victoria siempre es record', () => {
    expect(p.registrarVictoria(180)).toBe(true);
    expect(p.mejorTiempo).toBe(180);
  });

  it('un tiempo peor NO pisa el record', () => {
    p.registrarVictoria(180);
    expect(p.registrarVictoria(240)).toBe(false);
    expect(p.mejorTiempo).toBe(180);
  });

  it('un tiempo mejor si lo pisa', () => {
    p.registrarVictoria(180);
    expect(p.registrarVictoria(150)).toBe(true);
    expect(p.mejorTiempo).toBe(150);
  });

  it('el control mas lejano solo sube', () => {
    // Interesa lo mas lejos que se llego alguna vez, no donde termino el
    // ultimo intento.
    p.registrarControl(2);
    p.registrarControl(1);
    expect(p.mejorControl).toBe(2);
  });

  it('cuenta partidas y victorias por separado', () => {
    p.contarPartida();
    p.contarPartida();
    p.registrarVictoria(100);
    expect(p.partidas).toBe(2);
    expect(p.victorias).toBe(1);
  });

  it('sobrevive a recargar la pagina', () => {
    p.registrarVictoria(123);
    p.registrarControl(2);

    // Otra instancia sobre el mismo almacen: es lo que pasa al recargar.
    const otro = new Progreso(almacen);
    expect(otro.mejorTiempo).toBe(123);
    expect(otro.mejorControl).toBe(2);
  });

  it('borrar lo deja como al principio, tambien al recargar', () => {
    p.registrarVictoria(123);
    p.borrar();
    expect(p.mejorTiempo).toBeNull();
    expect(new Progreso(almacen).mejorTiempo).toBeNull();
  });
});

describe('cuando el navegador no deja guardar', () => {
  it('no explota al construirlo', () => {
    expect(() => new Progreso(almacenRoto())).not.toThrow();
  });

  it('funciona igual, solo que no recuerda', () => {
    /*
     * El caso de la ventana privada. El juego tiene que ser jugable: lo
     * unico que se pierde es el record. Si esto tirara, la pantalla de
     * victoria no se mostraria y parecería que el juego se colgo al ganar.
     */
    const p = new Progreso(almacenRoto());
    expect(() => p.registrarVictoria(100)).not.toThrow();
    expect(p.mejorTiempo).toBe(100); // en memoria si lo sabe
    expect(() => p.borrar()).not.toThrow();
  });

  it('sin almacen en absoluto tampoco explota', () => {
    const p = new Progreso(null);
    expect(() => p.registrarVictoria(100)).not.toThrow();
    expect(p.mejorTiempo).toBe(100);
  });
});

describe('datos guardados corruptos', () => {
  it('ignora lo que no tenga sentido en vez de romperse', () => {
    /*
     * Lo guardado lo pudo escribir una version vieja del juego, o
     * directamente otra cosa. Un dato con forma inesperada no tiene que
     * poder romper la pantalla de victoria.
     */
    const almacen = almacenFalso();
    almacen.setItem('explorarba.progreso', '{"mejorTiempo":"rapidisimo","mejorControl":[]}');
    const p = new Progreso(almacen);
    expect(p.mejorTiempo).toBeNull();
    expect(p.mejorControl).toBe(0);
  });

  it('ignora un tiempo negativo o cero', () => {
    const almacen = almacenFalso();
    almacen.setItem('explorarba.progreso', '{"mejorTiempo":-5}');
    expect(new Progreso(almacen).mejorTiempo).toBeNull();
  });

  it('aguanta texto que no es JSON', () => {
    const almacen = almacenFalso();
    almacen.setItem('explorarba.progreso', 'no soy json');
    expect(() => new Progreso(almacen)).not.toThrow();
    expect(new Progreso(almacen).mejorTiempo).toBeNull();
  });
});
