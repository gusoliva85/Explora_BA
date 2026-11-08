/**
 * ===========================================================================
 * EL TRAZADO DEL RECORRIDO
 * ===========================================================================
 * Lo que estas pruebas protegen no es un numero lindo: es que el generador
 * pueda construir la traza. `worldBuilder` exige tramos alineados a un eje
 * (ver el comentario de `mission001.js`), y la decision D-35 dice que todos
 * los giros son de 90 grados. Si alguien agrega un tramo en diagonal, el
 * mundo se arma mal y el sintoma aparece lejos de la causa: veredas que no
 * empalman, ochavas torcidas, colisiones corridas.
 *
 * Y protegen tambien la medicion que corrige D-04: el recorrido real mide
 * 1.623,9 m, no "varios kilometros". Si ese numero cambia, es porque alguien
 * toco una coordenada, y eso tiene que avisar.
 */

import { describe, it, expect } from 'vitest';
import {
  UBICACIONES,
  CUADRA,
  ESCALERA,
  recorridoReal,
  trazadoOrtogonal,
  largoOrtogonal,
  largoReal,
  girosValidos,
  metrosPorGrado
} from '../tools/recorrido-real.mjs';

describe('el recorrido real — la referencia que corrige D-04', () => {
  it('son las seis ubicaciones que dio Gus, en orden', () => {
    expect(UBICACIONES.map((u) => u.dir)).toEqual([
      'Av. Independencia 3250',
      'Agrelo 3400',
      'Maza 379',
      'Av. Boedo 120',
      'Mario Bravo 90',
      'Billinghurst 250'
    ]);
  });

  it('mide 1.623,9 m, no "varios kilometros"', () => {
    // El numero exacto importa: es la evidencia de que D-04 se justifico
    // con una estimacion a ojo que estaba mal.
    expect(largoReal()).toBeCloseTo(1623.9, 1);
  });

  it('los cinco tramos son parejos, entre 250 y 360 m', () => {
    const tramos = recorridoReal().slice(1).map((p) => p.tramo);
    expect(tramos).toHaveLength(5);
    for (const t of tramos) {
      expect(t).toBeGreaterThan(250);
      expect(t).toBeLessThan(360);
    }
  });

  it('ningun tramo real esta alineado a un eje, y por eso no se construye asi', () => {
    for (const p of recorridoReal().slice(1)) {
      const alineado = [0, 90, 180, 270, -90, -180].some((r) => Math.abs(p.rumbo - r) < 5);
      expect(alineado).toBe(false);
    }
  });

  it('un grado de longitud mide menos que uno de latitud a esta latitud', () => {
    // Si alguna vez se convierte con un solo factor para los dos ejes, el
    // recorrido sale estirado un 17 % en el eje equivocado.
    const m = metrosPorGrado(UBICACIONES[0].lat);
    expect(m.lon).toBeLessThan(m.lat);
    expect(m.lat / m.lon).toBeCloseTo(1.21, 1);
  });
});

describe('el trazado ortogonal — lo que se construye (D-26, D-35)', () => {
  const t = trazadoOrtogonal();

  it('tiene ocho vertices: inicio, seis controles y la meta', () => {
    expect(t).toHaveLength(8);
    expect(t[0].clave).toBe('inicio');
    expect(t.at(-1).clave).toBe('fin');
  });

  it('TODOS los giros son de 90 grados o derecho', () => {
    // Es la invariante que hace que el generador pueda construirlo. Si esta
    // prueba se pone roja, no se arregla la prueba: se arregla la escalera.
    expect(girosValidos()).toBe(true);
    for (const p of t) {
      expect([0, 90, -90]).toContain(p.giro);
    }
  });

  it('cada tramo mide una cuadra, y todos miden lo mismo', () => {
    // Lo pidio Gus: los controles a distancia pareja.
    for (const p of t.slice(1)) expect(p.tramo).toBe(CUADRA);
  });

  it('cada tramo corre sobre un eje, nunca en diagonal', () => {
    for (let i = 1; i < t.length; i++) {
      const dx = Math.abs(t[i].x - t[i - 1].x);
      const dz = Math.abs(t[i].z - t[i - 1].z);
      // Uno de los dos tiene que ser cero: eso es estar alineado a un eje.
      expect(Math.min(dx, dz)).toBe(0);
      expect(Math.max(dx, dz)).toBe(CUADRA);
    }
  });

  it('camina 700 m, que es lo que se acordo mantener', () => {
    expect(largoOrtogonal()).toBe(700);
    expect(ESCALERA).toHaveLength(7);
  });

  it('conserva las seis direcciones reales que dio Gus, en orden', () => {
    // Inicio y meta mas los cuatro controles originales. Los dos controles
    // nuevos son los unicos sin direccion asignada (tarea 18.10).
    const conDireccionReal = [t[0].dir, ...t.filter((p) => p.real).map((p) => p.dir)];
    expect(conDireccionReal).toEqual([
      'Av. Independencia 3250',
      'Agrelo 3400',
      'Maza 379',
      'Av. Boedo 120',
      'Mario Bravo 90',
      'Billinghurst 250'
    ]);
  });

  it('exactamente dos controles esperan direccion, los que agrego Gus', () => {
    expect(t.slice(1).filter((p) => !p.real)).toHaveLength(2);
  });

  it('va mucho mas al norte que al oeste, como el real', () => {
    // El real es 1 a 3,2. El trazado, 1 a 4. Lo que no puede pasar es que
    // la escalera quede mas diagonal que el recorrido que imita.
    const fin = t.at(-1);
    const proporcion = Math.abs(fin.z) / Math.abs(fin.x);
    expect(proporcion).toBeGreaterThanOrEqual(3);
  });

  it('no repite dos vertices en el mismo lugar', () => {
    const vistos = new Set(t.map((p) => `${p.x},${p.z}`));
    expect(vistos.size).toBe(t.length);
  });

  it('nunca vuelve sobre sus pasos: no hay giro de 180 grados', () => {
    // Un giro de 180 seria caminar la misma cuadra de vuelta, y con las
    // bocacalles tapadas (D-34) eso es un callejon sin salida.
    for (const p of t) expect(Math.abs(p.giro)).not.toBe(180);
  });
});
