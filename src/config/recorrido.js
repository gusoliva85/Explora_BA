/**
 * ===========================================================================
 * EL RECORRIDO — la geometria de las dieciseis cuadras (D-46)
 * ===========================================================================
 * **Esta es la fuente de verdad del trazado, y vive en `src/` a proposito.**
 *
 * Hasta la Fase 18.3 esto vivia en `tools/recorrido-real.mjs`, que es el
 * script que imprime la tabla. Estaba bien mientras el trazado fuera algo
 * que se mira; dejo de estarlo cuando el juego lo construye.
 *
 * La tentacion era copiar el resultado del script dentro de la mision. Eso
 * deja **dos versiones del recorrido**, y la que vale es la que nadie mira:
 * el dia que alguien corrige una esquina en el script, el juego sigue
 * construyendo la vieja y nada se queja.
 *
 * Asi que el dato se mudo acá y el script lo importa. Es el mismo criterio
 * que el proyecto ya aplico tres veces —los angulos se le piden al convenio
 * de rumbos, los numeros del balance al balance, el alcance del blanco al
 * arma—: **el dato se le pide a su dueño.**
 *
 * Lo que NO se mudo es la parte que necesita Node o datos de
 * OpenStreetMap: eso sigue en el script, que es donde corresponde.
 */
import { UBICACIONES } from './ubicaciones.js';

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

/*
 * `largoReal()` se quedo en el script: mide el recorrido REAL sobre las
 * coordenadas de OpenStreetMap, y eso es trabajo de consola, no del juego.
 * Lo que el juego construye es el trazado ortogonal de aca abajo.
 */

/**
 * Comprobacion que tiene que valer siempre: todos los giros son de 90
 * grados o derecho. Si esto falla, el generador no puede construir la
 * traza. Lo verifica una prueba, no solo este archivo.
 */
export function girosValidos(cuadra = CUADRA) {
  return trazadoOrtogonal(cuadra).every((p) => [0, 90, -90].includes(p.giro));
}

