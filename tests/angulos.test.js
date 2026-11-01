import { describe, it, expect } from 'vitest';
import { anguloDeElevacion, sombraPorMetro } from '../src/visual/angulos.js';
import { UNITS } from '../src/config/balance.js';

/**
 * El error que estas pruebas impiden que vuelva: durante meses el sol estuvo
 * a 17 grados creyendo que estaba a 73, y la calle estaba siempre en sombra.
 */
describe('la elevacion del sol', () => {
  it('un sol cenital es angulo cero, y uno en el horizonte es noventa', () => {
    expect(anguloDeElevacion(90)).toBe(0);
    expect(anguloDeElevacion(0)).toBe(90);
  });

  it('mas elevacion es MENOS angulo: es justo lo que se confundia', () => {
    expect(anguloDeElevacion(73)).toBeLessThan(anguloDeElevacion(58));
  });

  it('73 grados de elevacion se escriben como 17', () => {
    expect(anguloDeElevacion(73)).toBe(17);
  });
});

describe('cuanta sombra tira el sol', () => {
  it('cuanto mas bajo el sol, mas larga la sombra', () => {
    expect(sombraPorMetro(17)).toBeGreaterThan(sombraPorMetro(73));
  });

  it('con el sol en el horizonte la sombra es infinita', () => {
    expect(sombraPorMetro(0)).toBe(Infinity);
  });

  it('a 73 grados la fachada mas alta NO tapa la calzada', () => {
    // Es la regla de D-16, ahora comprobable. Una fachada de 18 m contra una
    // calzada de 10: con el sol bien alto la sombra se queda en la vereda.
    const fachada = 18;
    expect(sombraPorMetro(73) * fachada).toBeLessThan(UNITS.streetWidth);
  });

  it('a 17 grados, que es donde estaba de verdad, la tapaba entera', () => {
    expect(sombraPorMetro(17) * 18).toBeGreaterThan(UNITS.streetWidth * 5);
  });
});
