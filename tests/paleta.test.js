import { describe, it, expect } from 'vitest';
import {
  SOL,
  SOL_MEDIDO,
  CIELO,
  CALLE,
  FACHADA,
  CARTEL,
  VERDE,
  VEHICULO,
  ABANDONO,
  ZOMBI,
  GUS,
  OBJETO,
  luminancia,
  separacion,
  saturacion,
  mezclar,
  destaca,
  variar,
  SEPARACION_MINIMA,
  SATURACION_DECORADO_MAX,
  SATURACION_INFO_MIN
} from '../src/visual/paleta.js';

const FAMILIAS = { CALLE, FACHADA, CARTEL, VERDE, VEHICULO, ABANDONO, ZOMBI, GUS, OBJETO };
const todos = Object.entries(FAMILIAS).flatMap(([f, obj]) =>
  Object.entries(obj).map(([k, v]) => [`${f}.${k}`, v]));

describe('la paleta esta bien formada', () => {
  it('todo color es una terna de 0 a 1', () => {
    for (const [nombre, c] of todos) {
      expect(c, nombre).toHaveLength(3);
      for (const v of c) {
        expect(Number.isFinite(v), nombre).toBe(true);
        expect(v, nombre).toBeGreaterThanOrEqual(0);
        expect(v, nombre).toBeLessThanOrEqual(1);
      }
    }
  });

  it('no hay negro puro ni blanco puro', () => {
    // Un material a 0 o a 1 se come el modelado: no devuelve ni un gradiente.
    for (const [nombre, c] of todos) {
      expect(luminancia(c), nombre).toBeGreaterThan(0.03);
      expect(luminancia(c), nombre).toBeLessThan(0.99);
    }
  });
});

describe('la luz', () => {
  it('el sol del juego es calido pero menos que el medido', () => {
    // D-25: se toma el color de la referencia, moderado, porque el sol va alto.
    expect(SOL[0]).toBe(1);
    expect(SOL[2]).toBeLessThan(SOL[1]);
    expect(SOL[1]).toBeLessThan(1);
    expect(SOL[2]).toBeGreaterThan(SOL_MEDIDO[2]);
    expect(SOL[1]).toBeGreaterThan(SOL_MEDIDO[1]);
  });

  it('el cielo es frio: es lo que hace que las sombras no sean grises', () => {
    expect(CIELO[2]).toBeGreaterThan(CIELO[0]);
  });
});

describe('lo que se tiene que leer, se lee', () => {
  const lee = (a, b) => separacion(a, b) >= SEPARACION_MINIMA;

  it('un zombi no se funde con el asfalto', () => {
    // Fue el hallazgo que obligo a bajar el asfalto: medido daba 0.016.
    expect(separacion(ZOMBI.piel, CALLE.asfalto)).toBeGreaterThan(0.1);
    expect(separacion(ZOMBI.camisa, CALLE.asfalto)).toBeGreaterThan(0.3);
  });

  it('Gus de negro se separa del asfalto', () => {
    // Es la duda que dejaba abierta D-24.
    expect(lee(GUS.cuero, CALLE.asfalto)).toBe(true);
    expect(lee(GUS.jean, CALLE.asfalto)).toBe(true);
  });

  it('Gus se distingue de un zombi de un vistazo', () => {
    expect(separacion(GUS.cuero, ZOMBI.piel)).toBeGreaterThan(0.15);
    expect(separacion(GUS.cuero, ZOMBI.camisa)).toBeGreaterThan(0.15);
  });

  it('calzada, cordon y vereda se separan de a pares', () => {
    // Se tocan fisicamente, asi que no alcanza con que sean distintos: cada
    // par tiene que separarse solo.
    expect(lee(CALLE.asfalto, CALLE.cordon)).toBe(true);
    expect(lee(CALLE.cordon, CALLE.vereda)).toBe(true);
    expect(lee(CALLE.asfalto, CALLE.vereda)).toBe(true);
  });

  it('la raya vial se ve sobre el asfalto', () => {
    expect(separacion(CALLE.raya, CALLE.asfalto)).toBeGreaterThan(0.4);
  });

  it('los objetos recogibles se despegan del piso donde caen', () => {
    // Por luminancia o por color: el botiquin esta casi a la misma
    // luminancia que el asfalto y salta igual, porque el asfalto no tiene
    // color y el botiquin si.
    for (const piso of [CALLE.vereda, CALLE.asfalto]) {
      expect(destaca(OBJETO.botiquin, piso)).toBe(true);
      expect(destaca(OBJETO.municion, piso)).toBe(true);
    }
  });


  it('las tres verdes de una copa se separan entre si', () => {
    expect(lee(VERDE.claro, VERDE.medio)).toBe(true);
    expect(lee(VERDE.medio, VERDE.oscuro)).toBe(true);
  });

  it('el tronco se separa de la hoja en sombra, que es lo que toca', () => {
    // Si no, la copa y el tronco se leen como una mancha sola.
    expect(lee(VERDE.tronco, VERDE.oscuro)).toBe(true);
  });
});

describe('la saturacion esta jerarquizada', () => {
  it('el botiquin es lo mas saturado del juego', () => {
    expect(saturacion(OBJETO.botiquin)).toBeGreaterThanOrEqual(SATURACION_INFO_MIN);
    for (const [nombre, c] of todos) {
      if (nombre === 'OBJETO.botiquin') continue;
      expect(saturacion(c), nombre).toBeLessThanOrEqual(saturacion(OBJETO.botiquin));
    }
  });

  it('ningun decorado compite con la informacion', () => {
    const decorado = [
      ...Object.entries(CALLE), ...Object.entries(FACHADA),
      ...Object.entries(CARTEL), ...Object.entries(VERDE),
      ...Object.entries(VEHICULO), ...Object.entries(ABANDONO)
    ];
    for (const [nombre, c] of decorado) {
      expect(saturacion(c), nombre).toBeLessThanOrEqual(SATURACION_DECORADO_MAX);
    }
  });
});

describe('las herramientas', () => {
  it('mezclar devuelve los extremos y el medio', () => {
    const a = [0, 0, 0];
    const b = [1, 0.5, 0.25];
    expect(mezclar(a, b, 0)).toEqual(a);
    expect(mezclar(a, b, 1)).toEqual(b);
    expect(mezclar(a, b, 0.5)).toEqual([0.5, 0.25, 0.125]);
  });

  it('variar aclara, oscurece y nunca se sale de rango', () => {
    const base = [0.5, 0.4, 0.3];
    expect(luminancia(variar(base, 0.5))).toBeGreaterThan(luminancia(base));
    expect(luminancia(variar(base, -0.5))).toBeLessThan(luminancia(base));
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
      for (const v of variar([0.98, 0.02, 0.5], k)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
