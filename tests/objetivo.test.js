import { describe, it, expect } from 'vitest';
import { objetivoAutomatico } from '../src/combat/objetivo.js';
import { WEAPONS } from '../src/config/balance.js';
import { rumboHacia, dirDeRumbo } from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * A QUIEN LE TIRA
 * ===========================================================================
 * Estas pruebas venian de `tests/bazooka.test.js`, donde cubrian el apuntado
 * automatico del arma. Se mudaron en la Fase 16.3, junto con la funcion, y
 * sobrevivieron al borrado de la bazooka entera.
 *
 * Ahora cubren algo mas importante que un arma: **la unica forma que tiene
 * Gus de elegir a quien dispararle** (D-28). Si esto se rompe, el combate
 * automatico le tira al zombi equivocado, o a ninguno.
 *
 * Como en todo el combate, los rumbos se le piden al convenio del proyecto
 * y no se escriben como numeros. Ver `src/core/rumbo.js` y lo que costo la
 * primera vez.
 */

/** El alcance con el que se mide: el de la pistola, que es el arma que queda. */
const ALCANCE = WEAPONS.pistol.range;
const opt = { alcance: ALCANCE };

const ORIGEN = { x: 0, z: 0 };
const FRENTE = rumboHacia(0, -1);

const objetivo = (x, z, vivo = true) => ({ posicion: { x, z }, vivo });

/** Punto a `d` metros del origen en la direccion `rumbo`. */
const adelante = (d, rumbo = FRENTE) => {
  const dir = dirDeRumbo(rumbo);
  return { x: dir.x * d, z: dir.z * d };
};
const blanco = (d, rumbo = FRENTE) => {
  const p = adelante(d, rumbo);
  return objetivo(p.x, p.z);
};

describe('elegir blanco', () => {
  it('sin nadie en rango no devuelve nada', () => {
    expect(objetivoAutomatico(ORIGEN, [], opt)).toBeNull();
    expect(objetivoAutomatico(ORIGEN, [blanco(ALCANCE + 5)], opt)).toBeNull();
  });

  it('elige al mas cercano', () => {
    const cerca = blanco(6);
    const lejos = blanco(25);
    expect(objetivoAutomatico(ORIGEN, [lejos, cerca], opt).objetivo).toBe(cerca);
  });

  it('elige al mas cercano aunque este a la espalda', () => {
    /*
     * No le importa hacia donde mira el jugador, y es correcto: con el
     * combate automatico (D-28) Gus GIRA hacia el blanco que esta funcion
     * elige. Si la eleccion mirara el rumbo actual, un zombi que se te
     * acerca por detras nunca seria elegido y te comeria la espalda.
     */
    const atras = blanco(-5);
    const adelanteLejos = blanco(20);
    expect(objetivoAutomatico(ORIGEN, [adelanteLejos, atras], opt).objetivo).toBe(atras);
  });

  it('ignora a los muertos', () => {
    const muerto = { ...blanco(3), vivo: false };
    const vivo = blanco(12);
    expect(objetivoAutomatico(ORIGEN, [muerto, vivo], opt).objetivo).toBe(vivo);
  });

  it('devuelve el rumbo hacia el blanco, no uno cualquiera', () => {
    const z = blanco(10, 40);
    expect(objetivoAutomatico(ORIGEN, [z], opt).rumbo).toBeCloseTo(40, 4);
  });

  it('devuelve tambien la distancia, que es con lo que se decide', () => {
    const r = objetivoAutomatico(ORIGEN, [blanco(7)], opt);
    expect(r.distancia).toBeCloseTo(7, 4);
  });

  it('el que esta justo en el limite del alcance entra', () => {
    // Es un borde: si se usara `>=`, el zombi del limite exacto quedaria
    // afuera y el jugador veria a Gus no dispararle a algo que tiene a tiro.
    expect(objetivoAutomatico(ORIGEN, [blanco(ALCANCE)], opt)).not.toBeNull();
  });
});

describe('la cobertura vale para los dos lados (D-36)', () => {
  it('NO elige a uno que esta detras de una pared', () => {
    /*
     * Es la mitad que hace que moverse valga la pena. Sin esto, Gus se
     * quedaria quieto vaciando el cargador contra el revoque mientras otro
     * zombi se le acerca por el costado, y el jugador no tendria forma de
     * entender por que no pasa nada.
     */
    const tapado = blanco(10);
    const r = objetivoAutomatico(ORIGEN, [tapado], {
      ...opt,
      rayo: () => ({ t: 0.4 })
    });
    expect(r).toBeNull();
  });

  it('elige al segundo mas cercano si el primero esta tapado', () => {
    const tapado = blanco(8);
    const libre = blanco(14);
    const r = objetivoAutomatico(ORIGEN, [tapado, libre], {
      ...opt,
      // Solo el de ocho metros esta tapado.
      rayo: (ax, az, bx, bz) => (Math.hypot(bx - ax, bz - az) < 10 ? { t: 0.5 } : null)
    });
    expect(r.objetivo).toBe(libre);
  });

  it('un roce al final del rayo es el cuerpo del blanco, no una pared', () => {
    // El rayo siempre termina tocando al objetivo. Si eso contara como
    // pared, nunca habria blanco valido y Gus no dispararia jamas.
    const z = blanco(10);
    const r = objetivoAutomatico(ORIGEN, [z], { ...opt, rayo: () => ({ t: 0.99 }) });
    expect(r?.objetivo).toBe(z);
  });

  it('sin rayo, no hay escenario y todos se ven', () => {
    // Es lo que permite probar la logica sin montar un mundo.
    const z = blanco(10);
    expect(objetivoAutomatico(ORIGEN, [z], opt).objetivo).toBe(z);
  });
});
