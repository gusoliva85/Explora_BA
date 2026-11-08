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
  CUADRAS_POR_TRAMO,
  ESCALERA,
  puertas,
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

  it('tiene diecisiete vertices: el inicio y una esquina por cuadra', () => {
    expect(t).toHaveLength(17);
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

  it('camina 1.600 m: el recorrido real por las calles reales', () => {
    /*
     * El numero no se eligio: se conto. El recorrido de Gus caminado sobre
     * la cuadricula que existe son 4 cuadras al oeste, 1 al este y 11 al
     * norte. Si alguien cambia la escalera y esto deja de dar 16, cambio el
     * recorrido, no la prueba.
     */
    expect(ESCALERA).toHaveLength(16);
    expect(largoOrtogonal()).toBe(1600);

    const cuenta = (d) => ESCALERA.filter((e) => e.dir === d).length;
    expect(cuenta('O')).toBe(4);
    expect(cuenta('E')).toBe(1);
    expect(cuenta('N')).toBe(11);
    expect(cuenta('S')).toBe(0); // al sur no se vuelve nunca (D-42)
  });

  it('siete puertas, una cada dos cuadras, a distancia pareja', () => {
    // Lo que pidio Gus el 8/11: siete controles repartidos parejo. Que sean
    // parejos no es estetico: la esclusa de la 19A declara su poblacion de
    // zombis por tramo, y un tramo mas largo que otro es una dificultad
    // distinta sin que nadie lo haya decidido.
    const ps = puertas();
    expect(ps).toHaveLength(7);
    expect(ps.map((q) => q.puerta)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    const hitos = [0, ...ps.map((q) => q.cuadra), ESCALERA.length];
    const tramos = hitos.slice(1).map((c, i) => c - hitos[i]);
    expect(new Set(tramos)).toEqual(new Set([CUADRAS_POR_TRAMO]));
  });

  it('ninguna puerta cae sobre la casa de Sergio', () => {
    // El final no es un control: es la meta. Si se le pone una puerta, el
    // jugador termina la partida mirando una chapa.
    expect(t.at(-1).puerta).toBe(0);
    expect(t.at(-1).fin).toBe(true);
  });

  it('toda esquina tiene nombre de calle real, no un hueco', () => {
    // D-40 dice que los nombres son decorado, pero decorado inventado lo
    // nota cualquier porteño. Salen de OpenStreetMap o no salen.
    for (const e of ESCALERA) {
      expect(e.calle).toBeTruthy();
      expect(e.hasta).toBeTruthy();
    }
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

  it('las cinco ubicaciones de Gus caen sobre el recorrido', () => {
    // Ninguna se perdio al pasar de siete cuadras a dieciseis. Cuatro caen
    // en el medio de un tramo y ahi son un cartel, no un control: lo que
    // Gus dio es el RECORRIDO, y los controles los reparte la cuadricula.
    const claves = t.filter((p) => p.real).map((p) => p.clave);
    expect(claves).toEqual(['agrelo', 'maza', 'boedo', 'mariobravo', 'fin']);
  });

  it('va mucho mas al norte que al oeste, como el real', () => {
    // El real es 1 a 3,2. El trazado, 1 a 3,7. Lo que no puede pasar es que
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
