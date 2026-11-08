/**
 * ===========================================================================
 * EL RECORRIDO REAL — de coordenadas GPS a coordenadas de juego
 * ===========================================================================
 * Convierte las seis ubicaciones reales de la mision 001 a las coordenadas
 * del juego, aplicando el factor de compresion de la decision D-26.
 *
 * Por que existe este archivo y no una tabla escrita a mano: D-04 comprimio
 * el recorrido original justificandolo con una distancia estimada a ojo
 * —"varios kilometros"— que estaba mal. El recorrido mide 1.624 m. Un numero
 * medible no se estima: se calcula, y el calculo queda donde se pueda volver
 * a correr.
 *
 *   node tools/recorrido-real.mjs          # el trazado comprimido (40 %)
 *   node tools/recorrido-real.mjs 1        # a escala real, sin comprimir
 *   node tools/recorrido-real.mjs 0.4 json # para pegar en mission001.js
 *
 * Convencion de ejes, la misma que todo el juego: X = este/oeste,
 * Z = norte/sur (-Z es "al norte"), 1 unidad = 1 metro.
 */

/**
 * Las seis ubicaciones, tal como las dio Gus el 7 de noviembre de 2026.
 * No se tocan: son el dato de entrada, no un resultado.
 */
export const UBICACIONES = [
  { clave: 'inicio', dir: 'Av. Independencia 3250', calle: 'INDEPENDENCIA', lat: -34.620511, lon: -58.411406 },
  { clave: 'cp1', dir: 'Agrelo 3400', calle: 'AGRELO', lat: -34.618206, lon: -58.413928 },
  { clave: 'cp2', dir: 'Maza 379', calle: 'MAZA', lat: -34.615399, lon: -58.415827 },
  { clave: 'cp3', dir: 'Av. Boedo 120', calle: 'BOEDO', lat: -34.612672, lon: -58.417772 },
  { clave: 'cp4', dir: 'Mario Bravo 90', calle: 'MARIO BRAVO', lat: -34.609881, lon: -58.417396 },
  { clave: 'fin', dir: 'Billinghurst 250', calle: 'BILLINGHURST', lat: -34.607771, lon: -58.416173 }
];

/**
 * Cuanto se comprime la geometria. Decision D-26.
 *
 * Los 1.624 m reales no son el problema que decia D-04 —no son "varios
 * kilometros"— pero siguen siendo mucho mapa para una demo que tiene que
 * cargar en 8 segundos con datos. A 0,40 quedan 650 m: 108 segundos de
 * carrera pura, entre tres y cinco minutos con zombis en el camino.
 *
 * Lo que NO se comprime son los anchos: calzada, vereda y cordon se quedan
 * en sus medidas reales, porque son lo que hace que un cuerpo de 1,80 m
 * quepa en la escena. Comprimir el largo cambia cuanto se camina; comprimir
 * el ancho cambia si se puede caminar.
 */
export const COMPRESION = 0.4;

/**
 * Metros por grado de latitud y de longitud en un punto dado.
 *
 * Es la aproximacion plana local del elipsoide WGS84. Sobre 1,6 km el error
 * es de centimetros, asi que no hace falta nada mas pesado. A esta latitud
 * dan 110.934,5 m por grado de latitud y 91.707,7 por grado de longitud: un
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

/**
 * El trazado completo. Devuelve cada punto con sus coordenadas de juego, la
 * longitud del tramo que llega hasta el, y su rumbo en el convenio de
 * `core/rumbo.js`: rumbo 0 mira a -Z, y crece en sentido horario.
 */
export function trazado(compresion = COMPRESION) {
  const origen = UBICACIONES[0];
  const m = metrosPorGrado(origen.lat);
  let anterior = null;

  return UBICACIONES.map((u) => {
    const x = (u.lon - origen.lon) * m.lon * compresion;
    const z = -(u.lat - origen.lat) * m.lat * compresion;

    let tramo = 0;
    let rumbo = 0;
    if (anterior) {
      const dx = x - anterior.x;
      const dz = z - anterior.z;
      tramo = Math.hypot(dx, dz);
      rumbo = (Math.atan2(dx, -dz) * 180) / Math.PI;
    }
    anterior = { x, z };

    return {
      ...u,
      x: redondear(x),
      z: redondear(z),
      tramo: redondear(tramo),
      rumbo: redondear(rumbo)
    };
  });
}

/** Un decimal. Mas precision que eso no la ve nadie y ensucia el archivo. */
const redondear = (n) => Math.round(n * 10) / 10;

/** Largo total del recorrido, en metros. */
export function largoTotal(compresion = COMPRESION) {
  return redondear(trazado(compresion).reduce((suma, p) => suma + p.tramo, 0));
}

// --- Cuando se corre a mano ------------------------------------------------

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/recorrido-real.mjs');

if (esPrincipal) {
  const compresion = Number(process.argv[2] ?? COMPRESION);
  const formato = process.argv[3] ?? 'tabla';
  const puntos = trazado(compresion);

  if (formato === 'json') {
    console.log(JSON.stringify(puntos.map(({ x, z, dir, calle }) => ({ x, z, label: dir, calle })), null, 2));
  } else {
    const m = metrosPorGrado(UBICACIONES[0].lat);
    console.log(`\nRecorrido de la mision 001 — compresion ${compresion}`);
    console.log(`Metros por grado a esta latitud: lat ${m.lat.toFixed(1)}  lon ${m.lon.toFixed(1)}\n`);
    console.log('  clave    direccion                      x        z      tramo    rumbo');
    console.log('  ' + '-'.repeat(72));
    for (const p of puntos) {
      console.log(
        '  ' +
          p.clave.padEnd(9) +
          p.dir.padEnd(26) +
          String(p.x).padStart(8) +
          String(p.z).padStart(9) +
          (p.tramo ? String(p.tramo).padStart(9) + ' m' : '         —') +
          (p.tramo ? String(p.rumbo).padStart(8) + '°' : '')
      );
    }
    const total = largoTotal(compresion);
    console.log('  ' + '-'.repeat(72));
    console.log(`  TOTAL ${total} m   (real ${largoTotal(1)} m)`);
    console.log(`  A 6 m/s: ${Math.round(total / 6)} s de carrera pura\n`);
  }
}
