import { describe, it, expect } from 'vitest';
import {
  FAMILIAS,
  RAMPA,
  ESCALONES,
  tono,
  luminancia,
  separacion,
  saturacion,
  SEPARACION_MINIMA,
  SATURACION_ACENTO,
  FAMILIAS_ACENTO,
  PRESUPUESTO,
  ESCALA,
  TEXTURAS,
  escalaCorrecta
} from '../src/art/styleGuide.js';
import { COLORS } from '../src/world/palette.js';
import { UNITS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * LA GUIA DE ESTILO SE CUMPLE
 * ===========================================================================
 * Una guía de estilo que no se puede verificar es un PDF que nadie vuelve a
 * abrir. Estas pruebas fallan si la paleta del juego deja de cumplir sus
 * propias reglas, que es la única forma de que una guía siga viva después
 * de la tercera semana.
 */

describe('la paleta es cerrada', () => {
  it('son entre 8 y 12 familias', () => {
    // La tarea 12.1 pedía 8 a 12 colores. Son familias, no colores planos:
    // ver el comentario de styleGuide.js sobre por qué.
    const n = Object.keys(FAMILIAS).length;
    expect(n).toBeGreaterThanOrEqual(8);
    expect(n).toBeLessThanOrEqual(12);
  });

  it('cada familia es un rgb valido', () => {
    for (const [nombre, rgb] of Object.entries(FAMILIAS)) {
      expect(rgb, nombre).toHaveLength(3);
      for (const c of rgb) {
        expect(c, nombre).toBeGreaterThanOrEqual(0);
        expect(c, nombre).toBeLessThanOrEqual(1);
      }
    }
  });

  it('pedir una familia que no existe falla fuerte, no devuelve gris', () => {
    // Un color por omisión silencioso es como se cuelan los colores que
    // nadie eligió: aparecen, nadie se da cuenta, y rompen la coherencia.
    expect(() => tono('inventada')).toThrow();
    expect(() => tono('calle', 'inventado')).toThrow();
  });
});

describe('la rampa separa de verdad', () => {
  it('los escalones estan ordenados de oscuro a claro', () => {
    for (let i = 1; i < ESCALONES.length; i++) {
      expect(RAMPA[ESCALONES[i]]).toBeGreaterThan(RAMPA[ESCALONES[i - 1]]);
    }
  });

  it('dos escalones vecinos se distinguen a simple vista', () => {
    /*
     * Es la regla que hace legible al juego: la cámara está a veinte
     * metros y casi todo es mate, así que lo que separa dos planos es el
     * VALOR. Dos escalones que no se separan son un escalón de más.
     */
    for (const familia of Object.keys(FAMILIAS)) {
      for (let i = 1; i < ESCALONES.length; i++) {
        const a = tono(familia, ESCALONES[i - 1]);
        const b = tono(familia, ESCALONES[i]);
        const d = separacion(a, b);
        // Las familias muy claras se "queman" arriba, donde el acotado a 1
        // junta los escalones. Ahí la separación la da el escalón de abajo.
        if (luminancia(a) > 0.75) continue;
        expect(
          d,
          `${familia}: ${ESCALONES[i - 1]} y ${ESCALONES[i]} no se separan`
        ).toBeGreaterThan(0.04);
      }
    }
  });

  it('ningun tono se pasa de uno', () => {
    for (const familia of Object.keys(FAMILIAS)) {
      for (const escalon of ESCALONES) {
        for (const c of tono(familia, escalon)) {
          expect(c, `${familia}/${escalon}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('el escalon base es la familia tal cual', () => {
    for (const [nombre, rgb] of Object.entries(FAMILIAS)) {
      expect(tono(nombre, 'base'), nombre).toEqual(rgb.map((c) => Math.min(1, c)));
    }
  });
});

describe('las superficies que se tocan se separan', () => {
  /*
   * La regla número uno de la legibilidad del juego, comprobada sobre los
   * colores REALES que usa la calle, no sobre los de la guía. Si alguien
   * aclara el asfalto o oscurece la vereda hasta que se confundan, esto se
   * queja antes de que se vea feo en el teléfono.
   */
  const VECINOS = [
    ['asfalto', 'sidewalk'],
    ['sidewalk', 'curb'],
    ['asfalto', 'paint'],
    ['sidewalk', 'pasaje'],
    ['facade0', 'plinth'],
    ['sidewalk', 'trunk']
  ];

  const color = (clave) => {
    if (clave === 'asfalto') return COLORS.asphalt;
    if (clave === 'facade0') return COLORS.facade[0];
    if (clave === 'trunk') return COLORS.trunk;
    return COLORS[clave];
  };

  it.each(VECINOS)('%s y %s se distinguen', (a, b) => {
    const d = separacion(color(a), color(b));
    expect(d, `${a} vs ${b}: separacion ${d.toFixed(3)}`).toBeGreaterThanOrEqual(
      SEPARACION_MINIMA
    );
  });

  it('las seis fachadas se separan del zocalo', () => {
    for (let i = 0; i < COLORS.facade.length; i++) {
      const d = separacion(COLORS.facade[i], COLORS.plinth);
      expect(d, `fachada ${i} contra el zocalo`).toBeGreaterThanOrEqual(SEPARACION_MINIMA);
    }
  });
});

describe('los colores saturados estan reservados', () => {
  it('las familias de acento estan por encima del umbral', () => {
    for (const f of FAMILIAS_ACENTO) {
      expect(saturacion(FAMILIAS[f]), f).toBeGreaterThan(SATURACION_ACENTO);
    }
  });

  it('las familias que NO son de acento estan por debajo', () => {
    /*
     * Si todo tiene color, nada resalta y el jugador pierde la pista de lo
     * que importa. Un revoque saturado compite con un botiquín.
     */
    for (const [nombre, rgb] of Object.entries(FAMILIAS)) {
      if (FAMILIAS_ACENTO.includes(nombre)) continue;
      expect(saturacion(rgb), `la familia ${nombre} esta demasiado saturada`).toBeLessThan(
        SATURACION_ACENTO
      );
    }
  });

  it('el objetivo y el control son mas saturados que cualquier decorado', () => {
    /*
     * Lo que hay que mirar tiene que ganarle a lo que solo esta ahi.
     *
     * Esta prueba encontro algo que no se ve en una captura: el toldo
     * amarillo de un comercio estaba en 0,79 de saturacion y la meta de la
     * mision en 0,63. Un toldo hay veinte; la meta hay una.
     *
     * Los semaforos quedan FUERA de la comparacion a proposito: son luces,
     * no superficies, estan a siete metros de altura y son los unicos
     * colores puros del juego por decision expresa de la paleta. No
     * compiten con un objeto del piso.
     */
    const decorado = [
      ...COLORS.toldo,
      ...COLORS.car,
      ...COLORS.facade,
      COLORS.taxiTecho,
      COLORS.bus,
      COLORS.busFranja
    ];
    const maxDecorado = Math.max(...decorado.map(saturacion));
    expect(saturacion(COLORS.checkpoint)).toBeGreaterThan(maxDecorado);
    expect(saturacion(COLORS.goal)).toBeGreaterThan(maxDecorado);
  });
});

describe('presupuesto de detalle', () => {
  it('lo que mas se repite es lo que menos gasta', () => {
    /*
     * El orden importa mas que los numeros: un objeto del piso aparece
     * muchas mas veces que Gus, asi que no puede gastar mas que el.
     */
    expect(PRESUPUESTO.protagonista).toBeGreaterThan(PRESUPUESTO.enemigo);
    expect(PRESUPUESTO.enemigo).toBeGreaterThan(PRESUPUESTO.arma);
    expect(PRESUPUESTO.arma).toBeGreaterThan(PRESUPUESTO.objeto);
  });

  it('nada pasa de unos pocos miles de triangulos', () => {
    // Un modelo denso no solo cuesta: delata el estilo low-poly del resto.
    for (const [que, n] of Object.entries(PRESUPUESTO)) {
      expect(n, que).toBeLessThanOrEqual(2000);
      expect(n, que).toBeGreaterThan(0);
    }
  });

  it('el juego no usa texturas, y eso esta declarado', () => {
    expect(TEXTURAS.usar).toBe(false);
    expect(TEXTURAS.motivo.length).toBeGreaterThan(10);
  });
});

describe('la escala', () => {
  it('la puerta coincide con la del balance: es LA referencia', () => {
    // Si estos dos se separan, el arte y el mundo generado dejan de
    // coincidir y Gus pasa a tener el tamaño equivocado en su propia calle.
    expect(ESCALA.puerta).toBe(UNITS.doorHeight);
  });

  it('Gus entra por una puerta', () => {
    expect(ESCALA.gus).toBeLessThan(ESCALA.puerta);
  });

  it('el zombi es mas bajo que Gus: va encorvado', () => {
    // Es una de las dos cosas que separan sus siluetas a distancia.
    expect(ESCALA.zombi).toBeLessThan(ESCALA.gus);
  });

  it('las alturas estan ordenadas como en la calle', () => {
    expect(ESCALA.banco).toBeLessThan(ESCALA.auto);
    expect(ESCALA.auto).toBeLessThan(ESCALA.colectivo);
    expect(ESCALA.colectivo).toBeLessThan(ESCALA.poste);
  });

  it('acepta una diferencia chica y rechaza una grande', () => {
    expect(escalaCorrecta(1.8, ESCALA.gus)).toBe(true);
    expect(escalaCorrecta(1.85, ESCALA.gus)).toBe(true);
    expect(escalaCorrecta(2.4, ESCALA.gus), 'acepto un Gus de 2,4 m').toBe(false);
    expect(escalaCorrecta(1.2, ESCALA.gus)).toBe(false);
  });
});
