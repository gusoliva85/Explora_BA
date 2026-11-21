/**
 * ===========================================================================
 * EL RECORRIDO — de coordenadas GPS a una traza ortogonal de cuadras
 * ===========================================================================
 * Hace dos cosas, y conviene no confundirlas:
 *
 *   1. MIDE el recorrido real de Buenos Aires que dio Gus, de Av.
 *      Independencia 3250 a Billinghurst 250. Es el dato de referencia.
 *   2. Devuelve el TRAZADO ORTOGONAL que se construye en el juego: una
 *      escalera de cuadras de 100 m donde cada giro es de 90 grados.
 *
 * El trazado NO es el recorrido real proyectado: es una traza orientativa
 * que conserva el orden de las seis direcciones, la proporcion del
 * desplazamiento (mas norte que oeste) y el largo caminado, pero que corre
 * sobre una cuadricula. Decisiones D-26 y D-35.
 *
 * Por que existe este archivo: D-04 comprimio el recorrido original
 * justificandolo con una distancia estimada a ojo —"varios kilometros"— que
 * estaba mal. Son 1.623,9 m. Un numero medible no se estima: se calcula, y
 * el calculo queda donde se pueda volver a correr.
 *
 *   node tools/recorrido-real.mjs            # las dos cosas, comparadas
 *   node tools/recorrido-real.mjs --real     # solo la medicion del real
 *   node tools/recorrido-real.mjs --json     # para pegar en mission001.js
 *
 * Convencion de ejes, la misma que todo el juego: X = este/oeste,
 * Z = norte/sur (-Z es "al norte"), 1 unidad = 1 metro. Y los rumbos son
 * los de `core/rumbo.js`: rumbo 0 mira a -Z y crece en sentido horario.
 */

import {
  UBICACIONES
} from '../src/config/ubicaciones.js';
import {
  CUADRA,
  CUADRAS_POR_TRAMO,
  ESCALERA,
  trazadoOrtogonal,
  puertas,
  largoOrtogonal,
  girosValidos
} from '../src/config/recorrido.js';

/*
 * ---------------------------------------------------------------------------
 * LA GEOMETRIA NO VIVE ACA, Y ANTES SI
 * ---------------------------------------------------------------------------
 * `ESCALERA`, `trazadoOrtogonal()`, `puertas()` y las ubicaciones se mudaron
 * a `src/config/` en la Fase 18.3, cuando el juego empezo a construir el
 * recorrido de verdad.
 *
 * El motivo es el de siempre en este proyecto: **el dato se le pide a su
 * dueño.** Copiar el trazado dentro de la mision habria dejado dos
 * versiones del recorrido, y la que vale es la que nadie mira.
 *
 * Lo que se quedo aca es lo que necesita Node o los datos crudos de
 * OpenStreetMap: la conversion de grados a metros y la medicion del
 * recorrido real. Este script sigue siendo el que imprime la tabla, que es
 * para lo que se escribio.
 *
 * Se reexporta todo para no romper a quien ya lo importaba desde aca.
 */
export { UBICACIONES, CUADRA, CUADRAS_POR_TRAMO, ESCALERA, trazadoOrtogonal, puertas, largoOrtogonal, girosValidos };


// ===========================================================================
// 1. EL RECORRIDO REAL — el dato de entrada
// ===========================================================================


/**
 * Metros por grado de latitud y de longitud en un punto dado.
 *
 * Es la aproximacion plana local del elipsoide WGS84. Sobre 1,6 km el error
 * es de centimetros, asi que no hace falta nada mas pesado. A esta latitud
 * dan 110.933,6 m por grado de latitud y 91.707,7 por grado de longitud: un
 * grado de longitud mide un 17 % menos, y por eso el recorrido no se puede
 * convertir con un solo factor para los dos ejes.
 */
export function metrosPorGrado(lat) {
  const r = (lat * Math.PI) / 180;
  return {
    lat: 111132.92 - 559.82 * Math.cos(2 * r) + 1.175 * Math.cos(4 * r),
    lon: 111412.84 * Math.cos(r) - 93.5 * Math.cos(3 * r)
  };
}

/** Un decimal. Mas precision que eso no la ve nadie y ensucia el archivo. */
const redondear = (n) => Math.round(n * 10) / 10;

/**
 * El recorrido real medido, en metros, con el inicio en el cero.
 * Esto es la REFERENCIA: no es lo que se construye.
 */
/** Largo total del recorrido real, en metros. Se quedo aca: usa los datos de OSM. */
export const largoReal = () => redondear(recorridoReal().reduce((s, p) => s + p.tramo, 0));

export function recorridoReal() {
  const origen = UBICACIONES[0];
  const m = metrosPorGrado(origen.lat);
  let anterior = null;

  return UBICACIONES.map((u) => {
    const x = (u.lon - origen.lon) * m.lon;
    const z = -(u.lat - origen.lat) * m.lat;

    let tramo = 0;
    let rumbo = 0;
    if (anterior) {
      tramo = Math.hypot(x - anterior.x, z - anterior.z);
      rumbo = (Math.atan2(x - anterior.x, -(z - anterior.z)) * 180) / Math.PI;
    }
    anterior = { x, z };

    return { ...u, x: redondear(x), z: redondear(z), tramo: redondear(tramo), rumbo: redondear(rumbo) };
  });
}

// ===========================================================================
// 2. EL TRAZADO ORTOGONAL — lo que se construye
// ===========================================================================

// --- Cuando se corre a mano ------------------------------------------------

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/recorrido-real.mjs');

if (esPrincipal) {
  const soloReal = process.argv.includes('--real');
  const comoJson = process.argv.includes('--json');

  if (comoJson) {
    console.log(
      JSON.stringify(
        trazadoOrtogonal().map(({ x, z, dir, calle }) => ({ x, z, label: dir, calle })),
        null,
        2
      )
    );
  } else {
    const m = metrosPorGrado(UBICACIONES[0].lat);

    console.log('\n' + '='.repeat(76));
    console.log('1. EL RECORRIDO REAL — la referencia');
    console.log('='.repeat(76));
    console.log(`   Metros por grado a esta latitud: lat ${m.lat.toFixed(1)}  lon ${m.lon.toFixed(1)}\n`);
    console.log('   direccion                        x         z      tramo    rumbo');
    console.log('   ' + '-'.repeat(68));
    for (const p of recorridoReal()) {
      console.log(
        '   ' +
          p.dir.padEnd(26) +
          String(p.x).padStart(8) +
          String(p.z).padStart(10) +
          (p.tramo ? String(p.tramo).padStart(9) + ' m' + String(p.rumbo).padStart(9) + '°' : '          —')
      );
    }
    console.log('   ' + '-'.repeat(68));
    console.log(`   TOTAL ${largoReal()} m   —   a 6 m/s, ${Math.round(largoReal() / 6)} s de carrera pura`);
    console.log('   Ningun tramo esta alineado a un eje: por eso NO se construye asi.');

    if (!soloReal) {
      const t = trazadoOrtogonal();
      const nombreGiro = (g) => (g === 0 ? 'derecho' : g === 90 ? '90° der' : g === -90 ? '90° izq' : '⚠ ' + g);
      const total = largoOrtogonal();

      console.log('\n' + '='.repeat(76));
      console.log('2. EL TRAZADO ORTOGONAL — lo que se construye (D-26, D-35)');
      console.log('='.repeat(76) + '\n');
      console.log('   #   esquina                                   x       z   rumbo   giro      puerta');
      console.log('   ' + '-'.repeat(70));
      for (const [i, p] of t.entries()) {
        console.log(
          '   ' +
            String(i).padEnd(4) +
            (p.dir + (p.real ? ' ◆' : '')).padEnd(42) +
            String(p.x).padStart(6) +
            String(p.z).padStart(8) +
            String(p.rumbo).padStart(7) + '°' +
            (i ? '  ' + nombreGiro(p.giro).padEnd(9) : ''.padEnd(11)) +
            (p.fin ? '  LA CASA DE SERGIO' : p.puerta ? '  PUERTA ' + p.puerta : '')
        );
      }
      console.log('   ' + '-'.repeat(70));
      console.log(`   TOTAL ${total} m en ${ESCALERA.length} cuadras de ${CUADRA} m   —   a 6 m/s, ${Math.round(total / 6)} s`);
      console.log(`   ${puertas().length} puertas, una cada ${CUADRAS_POR_TRAMO} cuadras (${CUADRAS_POR_TRAMO * CUADRA} m): tramos parejos de punta a punta`);
      const neto = t.at(-1);
      console.log(`   Desplazamiento neto: ${Math.abs(neto.x)} m al oeste, ${Math.abs(neto.z)} m al norte  (1 a ${(Math.abs(neto.z) / Math.abs(neto.x)).toFixed(1)})`);
      const r = recorridoReal().at(-1);
      console.log(`   El real:             ${Math.abs(r.x).toFixed(0)} m al oeste, ${Math.abs(r.z).toFixed(0)} m al norte  (1 a ${(Math.abs(r.z) / Math.abs(r.x)).toFixed(1)})`);
      console.log(`\n   Todos los giros son de 90° o derecho: ${girosValidos() ? 'SI ✓' : 'NO ✗'}`);
      console.log('   (◆) una de las ubicaciones que dio Gus. El resto sale de OpenStreetMap.\n');
    } else {
      console.log();
    }
  }
}
