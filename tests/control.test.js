import { describe, it, expect } from 'vitest';
import { cruzoElControl, puntoDeControl } from '../src/missions/missionManager.js';
import { mission001 } from '../src/config/mission001.js';

/**
 * ===========================================================================
 * EL CONTROL ES LA PUERTA (19C.5)
 * ===========================================================================
 * Lo encontró Gus jugando: *"los checkpoints no los estás dejando en la
 * puerta que coordinamos para que se abra, sino que están del otro lado"*.
 *
 * Y era literal. La hoja se planta diez metros antes del cruce —porque una
 * puerta atravesada en una esquina cierra cuatro calles en vez de una— y el
 * control estaba en el cruce: se tomaba diez metros después de cruzarla.
 *
 * Lo que se prueba acá no es la posición sino **las dos cosas que, si se
 * rompen, rompen la partida**:
 *
 *   1. Que el control no se pueda tomar sin cruzar. Si se pudiera, se
 *      tomaría apoyado contra la puerta cerrada, con el tramo sucio: la
 *      misión avanzaría de tramo sin que el jugador se moviera.
 *   2. Que se tome apenas se cruza. Si se tomara tarde, el tramo, la
 *      ventana del mundo y el punto de reaparición quedarían desalineados
 *      de lo único que el jugador ve, que es la puerta.
 */

const controles = mission001.checkpoints;

/** Un punto a `d` metros del plano, medido hacia adentro (positivo = pasó). */
const aMetros = (cp, d, costado = 0) => {
  const { x, z, dirX, dirZ } = cp.plano;
  return {
    x: x + dirX * d - dirZ * costado,
    z: z + dirZ * d + dirX * costado
  };
};

describe('donde esta el control', () => {
  it('los siete tienen plano de puerta y punto de reaparicion', () => {
    expect(controles).toHaveLength(7);
    for (const cp of controles) {
      expect(cp.plano, cp.label).toBeTruthy();
      expect(cp.reaparecer, cp.label).toBeTruthy();
    }
  });

  it('cada control cae EXACTAMENTE sobre su puerta', () => {
    /*
     * La prueba que no existía. La hoja y el control salían de dos cuentas
     * distintas escritas en dos lugares distintos, y se desincronizaron sin
     * que nada fallara: ahora salen de `puntoDePuerta`, una sola.
     */
    for (const cp of controles) {
      const puerta = mission001.puertas.find((p) => p.control === cp.puerta);
      expect(puerta, `no hay puerta para ${cp.label}`).toBeTruthy();
      expect(Math.hypot(puerta.x - cp.plano.x, puerta.z - cp.plano.z)).toBeCloseTo(0, 6);
    }
  });

  it('y la brujula apunta a la puerta, no a la esquina', () => {
    for (const cp of controles) {
      const p = puntoDeControl(mission001, cp);
      const esquina = mission001.route[cp.atRouteIndex];
      expect(p.x).toBeCloseTo(cp.plano.x, 6);
      // Y está a diez metros de la esquina, que es el retiro de la puerta.
      expect(Math.hypot(p.x - esquina.x, p.z - esquina.z)).toBeCloseTo(10, 6);
    }
  });

  it('se reaparece del lado de ADENTRO (19A.9)', () => {
    /*
     * Ocho metros pasando la hoja. Ni en la hoja —una puerta sellada tiene
     * su chapa ahí— ni en el cruce, porque la cuadra de atrás ya puede no
     * existir en memoria.
     */
    for (const cp of controles) {
      const { dirX, dirZ } = cp.plano;
      const dx = cp.reaparecer.x - cp.plano.x;
      const dz = cp.reaparecer.z - cp.plano.z;
      expect(dx * dirX + dz * dirZ).toBeCloseTo(8, 6);
    }
  });
});

describe('cuando se toma el control', () => {
  const cp = controles[0];

  it('NO se toma apoyado contra la puerta cerrada', () => {
    /*
     * Ésta es la razón de que sea un plano y no un círculo. Contra la hoja
     * el jugador llega a medio metro del plano: con radio 5 estaría dentro
     * de cualquier círculo razonable sin haber cruzado nada.
     */
    expect(cruzoElControl(aMetros(cp, -0.5), cp, mission001)).toBe(false);
    expect(cruzoElControl(aMetros(cp, -3), cp, mission001)).toBe(false);
  });

  it('se toma apenas se cruza', () => {
    expect(cruzoElControl(aMetros(cp, 0.1), cp, mission001)).toBe(true);
  });

  it('no se toma de lejos, ni viniendo por otra calle', () => {
    // Cien metros antes: todavía no.
    expect(cruzoElControl(aMetros(cp, -100), cp, mission001)).toBe(false);
    // Pasado el plano pero fuera del ancho de la hoja: por ahí no se cruza,
    // porque ahí están los edificios.
    expect(cruzoElControl(aMetros(cp, 5, 30), cp, mission001)).toBe(false);
  });

  it('se puede cruzar por cualquier punto del ancho de la puerta', () => {
    const { medioAncho } = cp.plano;
    for (const costado of [-medioAncho + 0.5, 0, medioAncho - 0.5]) {
      expect(cruzoElControl(aMetros(cp, 1, costado), cp, mission001)).toBe(true);
    }
  });

  it('una mision sin puertas sigue usando el circulo de siempre', () => {
    /*
     * El respaldo no es decorativo: hay pruebas que arman misiones a mano,
     * con controles que son un punto y un radio y ninguna esclusa.
     */
    const simple = { route: [{ x: 0, z: 0 }, { x: 50, z: 0 }] };
    const viejo = { atRouteIndex: 1, radius: 5 };
    expect(cruzoElControl({ x: 48, z: 0 }, viejo, simple)).toBe(true);
    expect(cruzoElControl({ x: 20, z: 0 }, viejo, simple)).toBe(false);
  });
});
