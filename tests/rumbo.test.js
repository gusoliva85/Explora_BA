import { describe, it, expect } from 'vitest';
import * as pc from 'playcanvas';
import {
  rumboHacia,
  rumboEntre,
  dirDeRumbo,
  difRumbos,
  normalizarRumbo
} from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * EL CONVENIO DE RUMBOS
 * ===========================================================================
 * Un solo convenio de angulos para todo el juego. Se prueba aparte porque
 * un error de signo aca no se ve como un error de signo: se ve como que el
 * cuchillo golpea para atras, o como que el zombi camina de espaldas.
 *
 * Eso paso. Durante varias fases convivieron dos convenios opuestos, cada
 * uno coherente consigo mismo, y ninguna prueba los enfrento nunca.
 */

/** Tolerancia: se compara contra math de punto flotante del motor. */
const CERCA = 5;

describe('el convenio esta atado al motor, no elegido', () => {
  /*
   * La prueba mas importante del archivo.
   *
   * `dirDeRumbo` no es una convencion arbitraria que podamos cambiar de
   * gusto: tiene que coincidir con lo que PlayCanvas le hace de verdad a
   * una entidad rotada en Y. Todos los modelos del juego estan armados
   * mirando a -Z, asi que "adelante" es -Z rotado por el yaw.
   *
   * Si alguien cambia el signo en rumbo.js para "arreglar" otra cosa, esta
   * prueba se queja antes de que el juego entero quede al reves.
   */
  it.each([0, 30, 45, 90, 135, 180, 270, -60])(
    'rumbo %i coincide con rotar el frente -Z de la entidad',
    (grados) => {
      const q = new pc.Quat().setFromEulerAngles(0, grados, 0);
      const frenteLocal = new pc.Vec3(0, 0, -1);
      const esperado = q.transformVector(frenteLocal, new pc.Vec3());

      const obtenido = dirDeRumbo(grados);
      expect(obtenido.x).toBeCloseTo(esperado.x, CERCA);
      expect(obtenido.z).toBeCloseTo(esperado.z, CERCA);
    }
  );
});

describe('rumboHacia y dirDeRumbo son inversas', () => {
  const DIRECCIONES = [
    { x: 0, z: -1 },
    { x: 0, z: 1 },
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0.6, z: -0.8 },
    { x: -0.6, z: 0.8 }
  ];

  it.each(DIRECCIONES)('ida y vuelta por (%o) devuelve la misma direccion', (d) => {
    const vuelta = dirDeRumbo(rumboHacia(d.x, d.z));
    expect(vuelta.x).toBeCloseTo(d.x, CERCA);
    expect(vuelta.z).toBeCloseTo(d.z, CERCA);
  });

  it('rumbo 0 es mirar hacia -Z', () => {
    expect(normalizarRumbo(rumboHacia(0, -1))).toBeCloseTo(0, CERCA);
    const d = dirDeRumbo(0);
    expect(d.z).toBeCloseTo(-1, CERCA);
    expect(d.x).toBeCloseTo(0, CERCA);
  });

  it('mirar a +Z es media vuelta', () => {
    expect(normalizarRumbo(rumboHacia(0, 1))).toBeCloseTo(180, CERCA);
  });
});

describe('rumboEntre', () => {
  it('apunta del origen al objetivo, no al revés', () => {
    // El sentido importa: invertido, la camara se pone delante del jugador.
    const r = rumboEntre({ x: 0, z: 0 }, { x: 0, z: -5 });
    expect(normalizarRumbo(r)).toBeCloseTo(0, CERCA);

    const opuesto = rumboEntre({ x: 0, z: -5 }, { x: 0, z: 0 });
    expect(normalizarRumbo(opuesto)).toBeCloseTo(180, CERCA);
  });

  it('no le importa la distancia, solo la direccion', () => {
    const cerca = rumboEntre({ x: 0, z: 0 }, { x: 3, z: 3 });
    const lejos = rumboEntre({ x: 0, z: 0 }, { x: 30, z: 30 });
    expect(cerca).toBeCloseTo(lejos, CERCA);
  });
});

describe('difRumbos', () => {
  it('nunca pasa de 180', () => {
    for (let a = -720; a <= 720; a += 37) {
      for (let b = -720; b <= 720; b += 53) {
        const d = difRumbos(a, b);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(180);
      }
    }
  });

  it('cruza bien el salto de los 360 grados', () => {
    // Es el otro error clasico con angulos: 350 y 10 estan a 20 grados.
    expect(difRumbos(350, 10)).toBeCloseTo(20, CERCA);
    expect(difRumbos(10, 350)).toBeCloseTo(20, CERCA);
    expect(difRumbos(-170, 170)).toBeCloseTo(20, CERCA);
  });

  it('es simetrica', () => {
    expect(difRumbos(42, 117)).toBeCloseTo(difRumbos(117, 42), CERCA);
  });
});
