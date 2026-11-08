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

// ===========================================================================
// 1. EL RECORRIDO REAL — el dato de entrada
// ===========================================================================

/**
 * Las seis ubicaciones, tal como las dio Gus el 7 de noviembre de 2026.
 * No se tocan: son el dato, no un resultado.
 */
export const UBICACIONES = [
  { clave: 'inicio', dir: 'Av. Independencia 3250', calle: 'INDEPENDENCIA', lat: -34.620511, lon: -58.411406 },
  { clave: 'agrelo', dir: 'Agrelo 3400', calle: 'AGRELO', lat: -34.618206, lon: -58.413928 },
  { clave: 'maza', dir: 'Maza 379', calle: 'MAZA', lat: -34.615399, lon: -58.415827 },
  { clave: 'boedo', dir: 'Av. Boedo 120', calle: 'BOEDO', lat: -34.612672, lon: -58.417772 },
  { clave: 'mariobravo', dir: 'Mario Bravo 90', calle: 'MARIO BRAVO', lat: -34.609881, lon: -58.417396 },
  { clave: 'fin', dir: 'Billinghurst 250', calle: 'BILLINGHURST', lat: -34.607771, lon: -58.416173 }
];

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

/**
 * El largo de una cuadra. Es el mismo numero que `UNITS.blockLength` del
 * balance, y no es casualidad: todo el kit modular de la 12R esta medido
 * contra una cuadra de 100 m.
 */
export const CUADRA = 100;

/**
 * Cuantas cuadras hay entre dos puertas. Lo pidio Gus el 8/11: siete
 * controles repartidos parejo sobre el recorrido entero.
 */
export const CUADRAS_POR_TRAMO = 2;

/**
 * ===========================================================================
 * LA ESCALERA — el recorrido real, caminado sobre la cuadricula real
 * ===========================================================================
 * Cada entrada es UNA cuadra. No es una traza inventada que copia la
 * proporcion del recorrido: es el recorrido de Gus **caminado por las calles
 * que existen**, con los nombres que existen.
 *
 * DE DONDE SALEN LOS NOMBRES. De OpenStreetMap, consultado el 8/11/2026 con
 * la API de Overpass sobre el corredor completo. Para cada calle con nombre
 * de la zona se pidio el centro de sus tramos, y la orientacion sale de
 * mirar como se reparten: si los centros comparten longitud y cambian de
 * latitud, la calle corre norte-sur. Es el metodo mas tonto que funciona, y
 * funciona porque un tramo de calle va de esquina a esquina.
 *
 * DOS COSAS QUE APARECIERON MIRANDO LOS DATOS, Y NO ESTABAN EN NINGUN LADO:
 *
 *   1. **Maza y Billinghurst son la misma calle.** Al norte de Av.
 *      Rivadavia, Maza pasa a llamarse Billinghurst: los tramos de las dos
 *      caen sobre la misma longitud, Maza siempre al sur de Rivadavia y
 *      Billinghurst siempre al norte. O sea que "Maza 379" y "Billinghurst
 *      250" estan sobre la misma linea.
 *
 *   2. **Av. Boedo y Mario Bravo tambien.** Mismo caso y misma avenida de
 *      por medio. Y Mario Bravo, que yo tenia anotada como calle este-oeste
 *      porque el numero 90 suena a eso, **corre norte-sur**: sus tramos
 *      estan todos sobre la longitud -58,4174.
 *
 * Eso explica la unica parte del recorrido real que no se entendia: por que
 * las dos ultimas patas vuelven un poco al **este** en lugar de seguir al
 * noroeste. No vuelven: el recorrido sube por la linea Boedo/Mario Bravo y
 * al final cruza una cuadra al este para caer en la linea Maza/Billinghurst,
 * que es donde vive Sergio.
 *
 * EL LARGO SALE SOLO. Caminado por las calles reales, el recorrido de Gus
 * son 4 cuadras al oeste + 1 al este + 11 al norte = **16 cuadras**. A 100 m
 * la cuadra, **1.600 m**, que es exactamente el numero que dijo Gus. No se
 * ajusto nada para que diera: se contaron las esquinas.
 *
 * `hasta` es la calle que se cruza al final de esa cuadra, o sea donde cae
 * la esquina. `punto` marca las ubicaciones que dio Gus.
 */
export const ESCALERA = [
  { dir: 'O', calle: 'Av. Independencia', hasta: 'Sánchez de Loria' },
  { dir: 'O', calle: 'Av. Independencia', hasta: 'Virrey Liniers' },
  { dir: 'N', calle: 'Virrey Liniers', hasta: 'México' },
  { dir: 'N', calle: 'Virrey Liniers', hasta: 'Agrelo', punto: 'agrelo' },
  { dir: 'O', calle: 'Agrelo', hasta: 'Maza' },
  { dir: 'N', calle: 'Maza', hasta: 'Venezuela' },
  { dir: 'N', calle: 'Maza', hasta: 'Av. Belgrano', punto: 'maza' },
  { dir: 'N', calle: 'Maza', hasta: 'Moreno' },
  { dir: 'N', calle: 'Maza', hasta: 'Av. Hipólito Yrigoyen' },
  { dir: 'N', calle: 'Maza', hasta: 'Don Bosco' },
  { dir: 'O', calle: 'Don Bosco', hasta: 'Av. Boedo', punto: 'boedo' },
  { dir: 'N', calle: 'Av. Boedo', hasta: 'Av. Rivadavia' },
  { dir: 'N', calle: 'Mario Bravo', hasta: 'Bartolomé Mitre', punto: 'mariobravo' },
  { dir: 'N', calle: 'Mario Bravo', hasta: 'Av. Díaz Vélez' },
  { dir: 'E', calle: 'Av. Díaz Vélez', hasta: 'Billinghurst' },
  { dir: 'N', calle: 'Billinghurst', hasta: 'Billinghurst 250', punto: 'fin' }
];

/** Cuanto mueve cada letra, en cuadras. */
const PASO = {
  N: { x: 0, z: -1 },
  S: { x: 0, z: 1 },
  E: { x: 1, z: 0 },
  O: { x: -1, z: 0 }
};

/** El rumbo de cada letra, en el convenio de `core/rumbo.js`. */
const RUMBO = { N: 0, E: 90, S: 180, O: 270 };

/**
 * El trazado que se construye: una esquina por cuadra, diecisiete vertices.
 *
 * Cada vertice lleva el giro que hay que hacer ahi —para que la 18.6 sepa
 * donde poner una flecha y la 18.7 sepa que bocacalle tapar— y si ahi va una
 * **puerta** de la esclusa (D-37), que es cada `CUADRAS_POR_TRAMO` cuadras.
 */
export function trazadoOrtogonal(cuadra = CUADRA) {
  const inicio = UBICACIONES[0];
  const puntos = [
    {
      clave: 'inicio',
      dir: inicio.dir,
      calle: inicio.calle,
      x: 0,
      z: 0,
      cuadra: 0,
      tramo: 0,
      rumbo: RUMBO[ESCALERA[0].dir],
      giro: 0,
      puerta: 0
    }
  ];

  let x = 0;
  let z = 0;
  let rumboAnterior = RUMBO[ESCALERA[0].dir];
  let puertas = 0;

  for (const [i, paso] of ESCALERA.entries()) {
    x += PASO[paso.dir].x * cuadra;
    z += PASO[paso.dir].z * cuadra;
    const rumbo = RUMBO[paso.dir];

    // El giro, normalizado a (-180, 180]. Siempre va a dar 0, 90 o -90:
    // si alguna vez da otra cosa, la escalera esta mal escrita y el
    // generador —que exige tramos alineados a un eje— no va a poder
    // construirla.
    let giro = rumbo - rumboAnterior;
    while (giro > 180) giro -= 360;
    while (giro <= -180) giro += 360;

    const nCuadra = i + 1;
    const esFinal = nCuadra === ESCALERA.length;
    const hayPuerta = !esFinal && nCuadra % CUADRAS_POR_TRAMO === 0;
    if (hayPuerta) puertas += 1;

    const original = paso.punto ? UBICACIONES.find((u) => u.clave === paso.punto) : null;
    puntos.push({
      clave: paso.punto ?? `esquina-${nCuadra}`,
      dir: original?.dir ?? `${paso.calle} y ${paso.hasta}`,
      calle: paso.calle,
      hasta: paso.hasta,
      real: Boolean(original),
      x,
      z,
      cuadra: nCuadra,
      tramo: cuadra,
      rumbo,
      giro,
      // 0 = no hay puerta aca; 1..7 = el numero de control
      puerta: hayPuerta ? puertas : 0,
      fin: esFinal
    });
    rumboAnterior = rumbo;
  }

  return puntos;
}

/** Solo los vertices donde hay una puerta de la esclusa. */
export const puertas = (cuadra = CUADRA) => trazadoOrtogonal(cuadra).filter((p) => p.puerta > 0);

/** Largo total caminado, en metros. */
export const largoOrtogonal = (cuadra = CUADRA) => ESCALERA.length * cuadra;

/** Largo total del recorrido real, en metros. */
export const largoReal = () => redondear(recorridoReal().reduce((s, p) => s + p.tramo, 0));

/**
 * Comprobacion que tiene que valer siempre: todos los giros son de 90
 * grados o derecho. Si esto falla, el generador no puede construir la
 * traza. Lo verifica una prueba, no solo este archivo.
 */
export function girosValidos(cuadra = CUADRA) {
  return trazadoOrtogonal(cuadra).every((p) => [0, 90, -90].includes(p.giro));
}

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
