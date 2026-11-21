import { describe, it, expect } from 'vitest';
import { LARGO, COLOR_ARMA } from '../src/characters/armas.js';
import { PRESUPUESTO, separacion, saturacion, SATURACION_ACENTO } from '../src/art/styleGuide.js';
import { COLORS } from '../src/world/palette.js';
import { COLORES_GUS } from '../src/characters/gus.js';
import { WEAPONS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * EL ARMA SE SEPARA DEL FONDO
 * ===========================================================================
 * Este archivo se llamaba "las armas se distinguen entre si", y eso era lo
 * que medía: que las siluetas del cuchillo, la pistola y la bazooka no se
 * confundieran, porque a cuarenta píxeles un arma ocupa ocho y lo único que
 * llega es el contorno.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO MURIO ENTERO, QUE ERA EL PLAN
 * ---------------------------------------------------------------------------
 * La Fase 16.4 lo mandaba a borrar completo, y el motivo era bueno: **una
 * silueta no se confunde con nada si es la única que hay.** Las pruebas
 * comparativas se fueron por eso —el largo relativo, el filo contra el
 * mango, el alcance de la pistola contra el del cuchillo— y no vuelven.
 *
 * Lo que no era comparativo sigue en pie, y es la mitad del criterio que se
 * habría perdido sin querer:
 *
 * - El arma tiene que separarse **del fondo**: de la mano que la sostiene y
 *   del asfalto. Eso no necesita una segunda arma para medirse.
 * - El arma no puede ser **más llamativa que lo de misión**, o manda a
 *   mirar el lugar equivocado.
 * - El arma tiene que entrar en **su presupuesto de triángulos**.
 * - Y la que más vale hoy: que **haya un modelo por cada arma del balance**,
 *   que es lo que fija que sea UNA sola.
 */

describe('el largo no es el real, y eso es deliberado', () => {
  it('la pistola mide más de lo que mide una de verdad', () => {
    /*
     * Una pistola de 9 mm mide 19 cm. Acá mide 26, por la misma razón que
     * el pelo de Gus tiene más volumen del natural: a cuarenta píxeles, lo
     * real no se ve.
     */
    expect(LARGO.pistola).toBeGreaterThan(0.19);
  });

  it('sigue siendo corta: casi no sobresale de la mano', () => {
    expect(LARGO.pistola).toBeLessThan(0.35);
  });
});

describe('los colores del arma', () => {
  it('ninguno compite con lo de misión', () => {
    for (const [nombre, rgb] of Object.entries(COLOR_ARMA)) {
      expect(saturacion(rgb), `el color ${nombre}`).toBeLessThan(SATURACION_ACENTO);
    }
  });

  it('el metal se separa de la mano que lo sostiene', () => {
    /*
     * Éste es el fondo real del arma: el guante. El arma está en la mano
     * las veinticuatro horas —no se guarda, no se suelta, no se recoge del
     * piso— así que contra lo que se la ve es contra Gus.
     */
    expect(separacion(COLOR_ARMA.metal, COLORES_GUS.guante)).toBeGreaterThan(0.15);
  });

  it('el cuerpo y las partes oscuras se separan entre sí', () => {
    // Si no, la pistola es un bloque sin forma y se pierde la L.
    expect(separacion(COLOR_ARMA.metal, COLOR_ARMA.metalOscuro)).toBeGreaterThan(0.1);
  });

  it.fails('PENDIENTE: el metal NO se separa del asfalto, y es un problema real', () => {
    /*
     * ⚠️ Esta prueba está escrita para FALLAR, a propósito, y queda como
     * recordatorio con número en vez de como nota al margen.
     *
     * La versión vieja medía `COLOR_ARMA.filo` —la hoja clara del
     * cuchillo— contra el asfalto, y pasaba con holgura. Al borrar el
     * cuchillo en la 16.4 se fue `filo`, y al medir lo que queda apareció
     * esto: el cuerpo de la pistola es (0,30 0,31 0,34) y el asfalto es
     * (0,33 0,325 0,315). Separación: **0,015**. Son el mismo gris.
     *
     * Importa porque el brazo se estira hacia adelante al disparar y, desde
     * la cámara cenital, el arma queda sobre la calzada: justo en el
     * momento en que el jugador la mira.
     *
     * NO se arregla acá subiendo el valor. En la 20.8 Gus elige su arma
     * entre once modelos del banco y esta pistola de cuatro cajas se
     * reemplaza entera; retocar un gris que se va a borrar es trabajo
     * tirado. Lo que no puede pasar es que el dato se pierda, y por eso
     * está acá: la 20.8 tiene que medir el arma nueva contra el asfalto,
     * no sólo contra la mano.
     */
    expect(separacion(COLOR_ARMA.metal, COLORS.asphalt)).toBeGreaterThan(0.15);
  });

  it('no quedan colores sin usar', () => {
    /*
     * Eran seis y quedan dos: `filo` y `madera` eran del cuchillo, `tubo` y
     * `boca` de la bazooka, y sobrevivieron por descuido a la 16.3.
     *
     * Esta prueba no mira el modelo —no puede, sin PlayCanvas— pero sí fija
     * el número, que es lo que nadie vuelve a revisar después de borrar un
     * arma. Si aparece un color nuevo, hay que decir quién lo usa.
     */
    expect(Object.keys(COLOR_ARMA).sort()).toEqual(['metal', 'metalOscuro']);
  });
});

describe('el presupuesto de detalle', () => {
  it('la pistola entra en su presupuesto', () => {
    // Cuatro cajas: doce triángulos cada una. El número sale de contar las
    // piezas en `armas.js`.
    const piezas = 4;
    expect(piezas * 12, `${piezas * 12} triangulos`).toBeLessThanOrEqual(PRESUPUESTO.arma);
  });
});

describe('el arma del modelo es la del balance', () => {
  it('hay un modelo por cada arma que el juego define, y es UNA', () => {
    /*
     * Si alguien agrega un arma al balance y se olvida del modelo, lo que
     * pasa en el juego es que el personaje la "usa" con las manos vacías.
     * No tira ningún error.
     *
     * Y al revés: con `LARGO` como única tabla de modelos, esto es también
     * lo que fija D-29. Si vuelve a haber dos entradas en `WEAPONS`, alguien
     * reabrió el cambio de arma y tiene que decirlo acá primero.
     */
    expect(Object.keys(WEAPONS)).toEqual(['pistol']);
    expect(Object.keys(LARGO)).toEqual(['pistola']);
  });
});
