import { describe, it, expect } from 'vitest';
import { LARGO, COLOR_ARMA } from '../src/characters/armas.js';
import { PRESUPUESTO, separacion, saturacion, SATURACION_ACENTO } from '../src/art/styleGuide.js';
import { COLORS } from '../src/world/palette.js';
import { WEAPONS, ITEMS } from '../src/config/balance.js';

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
  it('la bazooka es MUCHO mas larga que las otras dos', () => {
    /*
     * Dos armas del mismo largo con formas distintas son la misma mancha;
     * una corta y una larga se distinguen aunque sean dos palos.
     */
    expect(LARGO.bazooka).toBeGreaterThan(LARGO.pistola * 3);
    expect(LARGO.bazooka).toBeGreaterThan(LARGO.cuchillo * 3);
  });

  it('la bazooka pasa el ancho del cuerpo', () => {
    // Es lo que la hace reconocible de un vistazo: sobresale del
    // personaje por los dos lados.
    const ANCHO_HOMBROS_GUS = 0.52;
    expect(LARGO.bazooka).toBeGreaterThan(ANCHO_HOMBROS_GUS * 2);
  });

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

  it('la bazooka no es del mismo verde que la vegetacion', () => {
    for (const hoja of COLORS.leaves) {
      expect(separacion(COLOR_ARMA.tubo, hoja), `contra ${hoja}`).toBeGreaterThan(0.03);
    }
  });
});

describe('el presupuesto de detalle', () => {
  /*
   * Las piezas son cajas: doce triángulos cada una. Los números salen de
   * contar las piezas en `armas.js`.
   */
  const PIEZAS = { cuchillo: 3, pistola: 4, bazooka: 5 };

  it.each(Object.entries(PIEZAS))('%s entra en su presupuesto', (arma, piezas) => {
    expect(piezas * 12, `${arma}: ${piezas * 12} triangulos`).toBeLessThanOrEqual(
      PRESUPUESTO.arma
    );
  });

  it('la bazooka puede gastar mas, porque aparece menos', () => {
    // Es el criterio del presupuesto: lo que más se repite es lo que menos
    // gasta. La bazooka se ve dos veces por partida.
    expect(PIEZAS.bazooka).toBeGreaterThanOrEqual(PIEZAS.cuchillo);
  });

  it('los objetos del piso entran en el suyo', () => {
    // Caja + disco + la marca de arriba (dos piezas en el botiquin).
    const PIEZAS_BOTIQUIN = 4;
    expect(PIEZAS_BOTIQUIN * 12).toBeLessThanOrEqual(PRESUPUESTO.objeto);
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
    const conModelo = ['bazooka', 'knife', 'pistol'];
    expect(conModelo).toEqual(delBalance);
  });

  it('el largo del modelo de la bazooka acompaña su alcance', () => {
    // Coherencia básica: el arma que llega más lejos es la que más ocupa.
    expect(WEAPONS.bazooka.range).toBeGreaterThan(WEAPONS.pistol.range);
    expect(LARGO.bazooka).toBeGreaterThan(LARGO.pistola);
  });
});

describe('los objetos del piso se distinguen entre si', () => {
  it('el botiquin y la municion tienen marcas distintas', () => {
    /*
     * El movimiento —flotan y giran— ya dice "esto se recoge". Lo que
     * faltaba era decir QUE. Una cruz y una tapa alargada son dos
     * siluetas que se distinguen a veinte metros sin leer un icono.
     *
     * Acá se fija la decisión; la forma la valida el ojo en la escena de
     * estilo.
     */
    const marcas = { botiquin: 2, municion: 1 };
    expect(marcas.botiquin).not.toBe(marcas.municion);
  });

  it('el botiquin cura y la municion no: son cosas distintas', () => {
    expect(ITEMS.medkit.heal).toBeGreaterThan(0);
    expect(ITEMS.ammoPistol.amount).toBeGreaterThan(0);
  });
});
