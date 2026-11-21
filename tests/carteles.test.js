import { describe, it, expect } from 'vitest';
import { mission001 } from '../src/config/mission001.js';
import { trazadoOrtogonal, puertas } from '../src/config/recorrido.js';
import { UNITS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * LOS CARTELES DE DIRECCION — donde caen (18.10, D-40)
 * ===========================================================================
 * **No orientan: dan lugar.** De orientar se encarga la brujula (D-38). Lo
 * que estos hacen es convertir una cuadra generica en *Maza 379*.
 *
 * Se prueban con numeros porque los dos errores que tuvieron fueron de
 * geometria y **ninguno se veia en una captura**: en la pantalla el cartel
 * simplemente no aparecia, y tardé en darme cuenta de que estaba a veinte
 * metros de la vereda o en el medio de la calzada.
 */

const TRAZADO = trazadoOrtogonal();
const CARTELES = mission001.props.filter((p) => p.tipo === 'carteDireccion');

/** La distancia de un punto al eje de la calle mas cercana del recorrido. */
function alEjeDeLaCalle(x, z) {
  let min = Infinity;
  for (let i = 0; i < TRAZADO.length - 1; i++) {
    const a = TRAZADO[i];
    const b = TRAZADO[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    min = Math.min(min, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  return min;
}

describe('cuales y cuantos', () => {
  it('hay uno por cada lugar que vale: inicio, los de Gus, las puertas y la meta', () => {
    const deGus = TRAZADO.filter((p) => p.real).length;
    expect(CARTELES).toHaveLength(1 + deGus + puertas().length - 1);
  });

  it('el primero dice de donde sale Gus', () => {
    expect(CARTELES[0].args.texto).toBe('Av. Independencia 3250');
  });

  it('el ultimo dice la casa de Sergio (D-41)', () => {
    expect(CARTELES.at(-1).args.texto).toBe('Billinghurst 250');
  });

  it('ninguno repite texto: trece carteles iguales no dicen nada', () => {
    const textos = CARTELES.map((c) => c.args.texto);
    expect(new Set(textos).size).toBe(textos.length);
  });
});

describe('donde caen', () => {
  it('TODOS estan sobre una vereda, nunca en medio de la calzada', () => {
    /*
     * El segundo error que tuvieron, y el mas feo: la vereda se calculaba
     * con la direccion del tramo de SALIDA, asi que en una esquina con
     * giro el cartel quedaba en el medio de la calle anterior.
     *
     * La derecha de una calle solo significa algo respecto de esa calle.
     */
    const borde = UNITS.streetWidth / 2;
    const linea = borde + UNITS.sidewalkWidth;
    for (const c of CARTELES) {
      const d = alEjeDeLaCalle(c.x, c.z);
      expect(d, `${c.args.texto} a ${d.toFixed(1)} m del eje`).toBeGreaterThan(borde);
      expect(d, `${c.args.texto} atravesando la fachada`).toBeLessThan(linea);
    }
  });

  it('ninguno queda flotando lejos de la ruta', () => {
    /*
     * El primer error: un `||` que trataba el cero como "falta el dato".
     * En un tramo que corre en Z, `sig.x - p.x` da cero, asi que mezclaba
     * la direccion de entrada con la de salida y el cartel salia **en
     * diagonal**, a veinte metros de la vereda.
     *
     * En una cuadricula ortogonal, cero no es "falta el dato": es el dato.
     */
    for (const c of CARTELES) {
      expect(alEjeDeLaCalle(c.x, c.z), c.args.texto).toBeLessThan(12);
    }
  });

  it('los de las puertas se adelantan: en la esquina ya hay demasiado', () => {
    /*
     * En la esquina misma hay semaforo, chapa de calle y el control. Un
     * cartel mas ahi es ruido. Treinta y cinco metros antes se lee solo.
     */
    const enPuerta = puertas();
    for (const p of enPuerta) {
      const cartel = CARTELES.find((c) => c.args.texto === p.hasta);
      if (!cartel) continue;
      const d = Math.hypot(cartel.x - p.x, cartel.z - p.z);
      expect(d, `${p.hasta} a ${d.toFixed(0)} m de su esquina`).toBeGreaterThan(20);
      expect(d).toBeLessThan(45);
    }
  });

  it('cada uno bloquea el paso: son fierro, no una calcomania', () => {
    for (const c of CARTELES) {
      expect(c.collide, c.args.texto).toBeTruthy();
      expect(c.collide.h).toBeGreaterThan(1.5);
    }
  });
});
