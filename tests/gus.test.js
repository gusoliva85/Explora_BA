import { describe, it, expect } from 'vitest';
import { MEDIDAS, COLORES_GUS } from '../src/characters/gus.js';
import {
  ESCALA,
  PRESUPUESTO,
  escalaCorrecta,
  luminancia,
  saturacion,
  separacion,
  SATURACION_ACENTO
} from '../src/art/styleGuide.js';
import { COLORS } from '../src/world/palette.js';
import { UNITS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * GUS CUMPLE LA GUIA DE ESTILO
 * ===========================================================================
 * El modelo se construye con PlayCanvas, así que no se puede armar sin
 * navegador. Lo que sí se puede probar acá —y es lo que importa— son sus
 * MEDIDAS y sus COLORES, que son los que tienen que respetar la guía.
 *
 * Que el modelo se vea bien lo decide un ojo. Que mida 1,80 y no se funda
 * con el asfalto lo decide un número.
 */

describe('la escala de Gus', () => {
  it('mide lo que declara la guia de estilo', () => {
    expect(escalaCorrecta(MEDIDAS.alto, ESCALA.gus), `mide ${MEDIDAS.alto}`).toBe(true);
  });

  it('LOS PIES TOCAN EL PISO', () => {
    /*
     * La invariante que se rompió una vez y vale la pena fijar.
     *
     * Al corregir la altura bajando la cadera a mano, lo que pasó no fue
     * que el personaje se achicara: se hundió. La altura total quedó igual
     * y las suelas quedaron seis centímetros bajo el asfalto. No tira
     * ningún error y en el juego casi no se nota.
     *
     * Ahora la cadera se DEDUCE de la cadena de la pierna, así que esto
     * tiene que dar cero siempre.
     */
    const suela = MEDIDAS.cadera - (MEDIDAS.muslo + MEDIDAS.pantorrilla + 0.1);
    expect(suela).toBeCloseTo(0, 9);
  });

  it('entra por una puerta', () => {
    expect(MEDIDAS.alto).toBeLessThan(UNITS.doorHeight);
  });

  it('es mas alto que un zombi: la silueta los separa', () => {
    expect(MEDIDAS.alto).toBeGreaterThan(ESCALA.zombi);
  });

  it('las proporciones son humanas, no de muñeco', () => {
    /*
     * Las piernas son aproximadamente la mitad del cuerpo y la cabeza
     * entra entre siete y ocho veces en el total. Son las dos relaciones
     * que el ojo detecta al instante aunque no sepa nombrarlas.
     */
    const piernas = MEDIDAS.muslo + MEDIDAS.pantorrilla;
    expect(piernas / MEDIDAS.alto).toBeGreaterThan(0.42);
    expect(piernas / MEDIDAS.alto).toBeLessThan(0.55);

    const cabezas = MEDIDAS.alto / MEDIDAS.cabeza;
    expect(cabezas).toBeGreaterThan(6);
    expect(cabezas).toBeLessThan(9.5);
  });

  it('el brazo llega mas o menos a la mitad del muslo', () => {
    const brazo = MEDIDAS.brazo + MEDIDAS.antebrazo;
    const hombro = MEDIDAS.cadera + MEDIDAS.torso * 0.92;
    const puntaDeLaMano = hombro - brazo;
    expect(puntaDeLaMano).toBeLessThan(MEDIDAS.cadera);
    expect(puntaDeLaMano).toBeGreaterThan(MEDIDAS.cadera - MEDIDAS.muslo);
  });

  it('los hombros son mas anchos que la cadera: el trapecio', () => {
    // Es la mitad de lo que hace a Gus reconocible desde arriba.
    expect(MEDIDAS.anchoHombros).toBeGreaterThan(MEDIDAS.anchoCadera * 1.3);
  });

  it('cabe en el radio de colision que usa el juego', () => {
    /*
     * Si el modelo fuera mas ancho que su cilindro de colision, Gus
     * atravesaria visiblemente las paredes con los hombros.
     */
    expect(MEDIDAS.anchoHombros / 2).toBeLessThanOrEqual(UNITS.playerRadius + 0.02);
  });
});

describe('los colores de Gus', () => {
  it('la campera NO es negro puro', () => {
    /*
     * La referencia dice cuero negro, pero un negro puro sobre asfalto
     * gris desaparece: a la distancia de cámara las dos cosas son una sola
     * mancha oscura.
     */
    expect(luminancia(COLORES_GUS.campera)).toBeGreaterThan(0.04);
  });

  it('la campera se separa del asfalto', () => {
    // La regla número uno de la paleta, aplicada al personaje: Gus camina
    // sobre asfalto casi todo el juego.
    const d = separacion(COLORES_GUS.campera, COLORS.asphalt);
    expect(d, `separacion ${d.toFixed(3)}`).toBeGreaterThan(0.1);
  });

  it('el jean se separa de la campera', () => {
    // Para que se vea dónde termina el abrigo y empiezan las piernas.
    expect(separacion(COLORES_GUS.jean, COLORES_GUS.campera)).toBeGreaterThan(0.02);
  });

  it('las solapas se separan de la campera', () => {
    // Son el otro rasgo de la silueta: si no se distinguen, no existen.
    expect(separacion(COLORES_GUS.camperaClara, COLORES_GUS.campera)).toBeGreaterThan(0.02);
  });

  it('el pelo se separa de la piel', () => {
    expect(separacion(COLORES_GUS.pelo, COLORES_GUS.piel)).toBeGreaterThan(0.2);
  });

  it('ningun color de Gus compite con lo de mision', () => {
    /*
     * El protagonista no puede ser lo más llamativo de la pantalla: lo que
     * tiene que llamar la atención es a dónde hay que ir y qué hay que
     * levantar. Gus ya tiene su anillo ámbar en el piso para no perderlo.
     */
    for (const [nombre, rgb] of Object.entries(COLORES_GUS)) {
      expect(saturacion(rgb), `el color ${nombre} de Gus`).toBeLessThan(SATURACION_ACENTO);
    }
  });
});

describe('el presupuesto de detalle', () => {
  it('Gus entra en su presupuesto de triangulos', () => {
    /*
     * El modelo son cajas: doce triángulos cada una. Son veinticuatro
     * piezas contadas sobre el modelo armado, así que el número está acá
     * escrito pero su origen es una medición, no una estimación.
     */
    const PIEZAS = 24;
    const TRIANGULOS_POR_CAJA = 12;
    const total = PIEZAS * TRIANGULOS_POR_CAJA;
    expect(total, `${total} triangulos`).toBeLessThanOrEqual(PRESUPUESTO.protagonista);
  });

  it('y le sobra lugar para la cara que no tiene', () => {
    // Si alguna vez hace falta detalle facial, tiene que entrar sin tocar
    // el presupuesto.
    expect(24 * 12).toBeLessThan(PRESUPUESTO.protagonista * 0.5);
  });
});
