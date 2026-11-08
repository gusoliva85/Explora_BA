import { describe, it, expect } from 'vitest';
import { LARGO, COLOR_ARMA } from '../src/characters/armas.js';
import { PRESUPUESTO, separacion, saturacion, SATURACION_ACENTO } from '../src/art/styleGuide.js';
import { COLORS } from '../src/world/palette.js';
import { WEAPONS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * LAS ARMAS SE DISTINGUEN ENTRE SI
 * ===========================================================================
 * Un arma en la mano de un personaje de cuarenta píxeles ocupa unos ocho. A
 * esa escala no existe el detalle: lo único que llega es el **contorno**.
 *
 * Así que lo que se prueba no es que estén bien modeladas —eso lo decide un
 * ojo— sino que sus siluetas no se confundan, que es lo que se puede medir.
 */

describe('el largo es lo que separa las siluetas', () => {
  /*
   * Habia dos pruebas mas, y las dos eran sobre la bazooka: que fuera
   * MUCHO mas larga que las otras, y que pasara el ancho del cuerpo. Se
   * fueron con el arma en la Fase 16.3 (D-29).
   *
   * Lo que dejan es una advertencia para la 16.4, que borra el cuchillo:
   * **con una sola arma, este archivo entero deja de tener sentido**. Una
   * silueta no se puede confundir con nada si es la unica que hay.
   */

  it('el cuchillo y la pistola son cortos, casi no sobresalen', () => {
    for (const arma of ['cuchillo', 'pistola']) {
      expect(LARGO[arma], arma).toBeLessThan(0.35);
    }
  });

  it('los largos NO son los reales, y eso es deliberado', () => {
    /*
     * Una pistola de 9 mm mide 19 cm. Acá mide 26, por la misma razón que
     * el pelo de Gus tiene más volumen del natural: a cuarenta píxeles, lo
     * real no se ve. Lo que tiene que leerse es la diferencia.
     */
    expect(LARGO.pistola).toBeGreaterThan(0.19);
  });
});

describe('los colores de las armas', () => {
  it('ninguna compite con lo de mision', () => {
    // Un arma más llamativa que un botiquín manda a mirar el lugar
    // equivocado.
    for (const [nombre, rgb] of Object.entries(COLOR_ARMA)) {
      expect(saturacion(rgb), `el color ${nombre}`).toBeLessThan(SATURACION_ACENTO);
    }
  });

  it('el filo se separa del metal del cuerpo', () => {
    // Si no, el cuchillo es un bloque sin forma.
    expect(separacion(COLOR_ARMA.filo, COLOR_ARMA.metalOscuro)).toBeGreaterThan(0.15);
  });

  it('el metal se separa del asfalto', () => {
    // Un arma tirada o en la mano, contra la calzada.
    expect(separacion(COLOR_ARMA.filo, COLORS.asphalt)).toBeGreaterThan(0.15);
  });

});

describe('el presupuesto de detalle', () => {
  /*
   * Las piezas son cajas: doce triángulos cada una. Los números salen de
   * contar las piezas en `armas.js`.
   */
  const PIEZAS = { cuchillo: 3, pistola: 4 };

  it.each(Object.entries(PIEZAS))('%s entra en su presupuesto', (arma, piezas) => {
    expect(piezas * 12, `${arma}: ${piezas * 12} triangulos`).toBeLessThanOrEqual(
      PRESUPUESTO.arma
    );
  });

});

describe('las armas del modelo son las del balance', () => {
  it('hay un modelo por cada arma que el juego define', () => {
    /*
     * Si alguien agrega un arma al balance y se olvida del modelo, lo que
     * pasa en el juego es que el personaje la "usa" con las manos vacías.
     * No tira ningún error.
     */
    const delBalance = Object.keys(WEAPONS).sort();
    const conModelo = ['knife', 'pistol'];
    expect(conModelo).toEqual(delBalance);
  });

  it('el alcance de la pistola es mayor que el del cuchillo', () => {
    // Coherencia basica entre el balance y lo que se ve en la mano.
    expect(WEAPONS.pistol.range).toBeGreaterThan(WEAPONS.knife.range);
  });
});
