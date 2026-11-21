import { trazadoOrtogonal, puertas, CUADRA, CUADRAS_POR_TRAMO } from './recorrido.js';

/**
 * ===========================================================================
 * MISION 001 — "Ir a buscar a Sergio"
 * ===========================================================================
 * De **Av. Independencia 3250 a Billinghurst 250**: el recorrido real de
 * Gus, caminado por las calles que existen, **entero** (D-46).
 *
 * Dieciséis cuadras de cien metros, 1.600 m, diecisiete esquinas y siete
 * puertas repartidas una cada dos cuadras. No es una evocación ni una
 * compresión: es el recorrido, con los nombres que figuran en
 * OpenStreetMap.
 *
 * ---------------------------------------------------------------------------
 * EL TRAZADO NO ESTÁ ESCRITO ACÁ: SE IMPORTA
 * ---------------------------------------------------------------------------
 * `route` sale de `trazadoOrtogonal()` y los controles de `puertas()`. No
 * hay una lista de diecisiete esquinas copiada a mano, y es deliberado:
 * **copiarla dejaría dos versiones del recorrido, y la que vale sería la que
 * nadie mira.** El día que se corrija una esquina en `recorrido.js`, el
 * juego construye la corregida sin que nadie tenga que acordarse.
 *
 * Es el mismo criterio que el proyecto ya aplicó con los ángulos, con los
 * números del balance y con el alcance del blanco: **el dato se le pide a su
 * dueño.**
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE FUE AL PASAR DE TRES CUADRAS A DIECISÉIS
 * ---------------------------------------------------------------------------
 * - **Los dos pasajes.** D-34 cerró las rutas alternativas: hay una sola
 *   ruta y todo lo demás se bloquea. Un pasaje es una decisión de "por
 *   dónde", y el juego nuevo decide *dónde pararse*, no por dónde ir.
 * - **El diseño a mano del mapa viejo.** Cada barricada, cada colectivo
 *   cruzado y cada zona estaban puestos sobre un trazado que ya no existe:
 *   el recorrido salía al sur y ahora sale al oeste. Vuelven en la 18.7,
 *   sobre las esquinas de verdad y con el criterio de D-43 —son el mismo
 *   operativo de contención que puso las puertas, visto de costado—.
 *
 * Convención de ejes: X = este/oeste, Z = norte/sur (−Z es "al norte"),
 * Y = arriba. 1 unidad = 1 metro.
 */

const TRAZADO = trazadoOrtogonal();
const PUERTAS = puertas();

/**
 * Las esquinas, tal como las construye el generador.
 *
 * `calle` es el nombre que va en la chapa (12R.7) y sale del trazado, que
 * lo sacó de OpenStreetMap. Se pasa a mayúsculas acá porque es cosa del
 * cartel, no del dato.
 */
const route = TRAZADO.map((p) => ({
  x: p.x,
  z: p.z,
  label: p.dir,
  calle: (p.calle ?? 'CALLE').toUpperCase(),
  cuadra: p.cuadra,
  giro: p.giro,
  puerta: p.puerta
}));

/**
 * Los siete controles: uno por puerta, cada dos cuadras (D-46).
 *
 * Eran dos y ahora son siete, y la diferencia no es de cantidad: cada uno
 * es **una esclusa** que no abre hasta que no quede un zombi vivo en el
 * tramo (D-37), y que se cierra a tus espaldas. La 19A les pone la puerta;
 * acá son todavía el punto de guardado de siempre.
 */
const checkpoints = PUERTAS.map((p) => ({
  atRouteIndex: p.cuadra,
  radius: 5,
  label: `Control ${p.puerta}: ${p.dir}`,
  puerta: p.puerta
}));

/**
 * Los textos de objetivo, uno por tramo, en voseo (18.5).
 *
 * Se arman del trazado en vez de escribirse a mano por el mismo motivo que
 * la ruta: si una esquina cambia, el texto cambia con ella. Lo que sí está
 * escrito a mano es **la última**, porque no es una esquina más: es la casa
 * de Sergio, y el juego entero es ir a buscarlo (D-41).
 */
const objectives = PUERTAS.map((p, i) =>
  /*
   * Cortos, y sin repetir la calle.
   *
   * Decían "Avanzá por la avenida Independencia hasta Virrey Liniers" y en
   * el teléfono se leía "Avanzá por la avenida Ind…": el nombre por el que
   * vas ocupaba toda la línea y tapaba el único dato nuevo, que es **hasta
   * dónde**.
   *
   * Por dónde vas ya lo dice la brújula, grande y de reojo (D-38, D-40).
   * Acá va lo que la brújula no puede decir: el nombre de la esquina donde
   * está el próximo control.
   */
  i === 0 ? `Avanzá hasta ${p.hasta}.` : `Seguí hasta ${p.hasta}.`
).concat('Llegá a lo de Sergio: Billinghurst 250.');

/**
 * El aspecto de cada cuadra. Una entrada por cuadra, dieciséis.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VARÍA, Y POR QUÉ NO AL AZAR
 * ---------------------------------------------------------------------------
 * Dieciséis cuadras iguales son un pasillo. Pero el barrio tampoco es
 * aleatorio: Boedo cambia de carácter a medida que uno sube, y el recorrido
 * lo atraviesa de sur a norte cruzando tres avenidas —Rivadavia, Hipólito
 * Yrigoyen, Díaz Vélez—.
 *
 * Así que la altura y la densidad siguen el recorrido: arranca bajo y
 * residencial, se levanta al cruzar las avenidas, y vuelve a bajar en
 * Billinghurst, que es residencial otra vez. **La forma de la calle cuenta
 * dónde está parado el jugador** sin que haga falta un cartel.
 */
const blocks = TRAZADO.slice(1).map((p) => {
  const esAvenida = (p.calle ?? '').startsWith('Av.');
  return esAvenida
    ? { buildingHeight: [11, 22], density: 0.92, mood: 'comercial' }
    : { buildingHeight: [7, 14], density: 0.84, mood: 'residencial' };
});

/**
 * Las zonas de zombis: **una por tramo**, ocho en total (18.9, D-46).
 *
 * ---------------------------------------------------------------------------
 * CADA ZONA DECLARA SU TRAMO, Y ESO ES NUEVO
 * ---------------------------------------------------------------------------
 * Antes las zonas eran lugares sueltos del mapa. Ahora cada una pertenece a
 * un tramo, porque **la esclusa cuenta por tramo** (19A.1): la puerta no
 * abre hasta que no quede un zombi vivo *en ese tramo*, así que el sistema
 * tiene que poder preguntar "¿cuántos quedan acá?".
 *
 * `peso` es cuánta presión pone la zona, de 0 a 1, y es **la perilla que
 * decide cuánto dura cada cuadra** (19A.11). Arranca flojo a propósito: hay
 * que dejar aprender a moverse antes de exigir nada, y con el combate
 * automático lo que se aprende es *cuándo frenar*, que es más sutil que
 * apretar un botón.
 */
const TRAMOS = PUERTAS.length + 1;
const zonas = Array.from({ length: TRAMOS }, (_, t) => {
  /*
   * La zona es **el corredor de calle del tramo**, no un círculo.
   *
   * Un tramo son doscientos metros; un círculo que los cubra tiene cien de
   * radio y abarca 31.400 m², de los cuales la calle son 3.200. El resto es
   * adentro de los edificios. Con `a` y `b` la zona sigue la calle, que es
   * donde el jugador va a estar.
   */
  const desde = TRAZADO[Math.min(t * CUADRAS_POR_TRAMO, TRAZADO.length - 1)];
  const hasta = TRAZADO[Math.min((t + 1) * CUADRAS_POR_TRAMO, TRAZADO.length - 1)];
  const i = Math.min(t * CUADRAS_POR_TRAMO + 1, TRAZADO.length - 1);
  const p = TRAZADO[i];

  /*
   * La curva de dificultad. El primero flojo, y de ahí para arriba sin
   * saltos: cada tramo pide un poco más que el anterior. El último no es el
   * más duro —llegar a lo de Sergio tiene que sentirse como llegar, no como
   * una pared— sino el anteúltimo.
   */
  const curva = [0.25, 0.45, 0.6, 0.7, 0.8, 0.88, 0.95, 0.75];

  return {
    tipo: 'zombis',
    tramo: t,
    x: p.x,
    z: p.z,
    a: { x: desde.x, z: desde.z },
    b: { x: hasta.x, z: hasta.z },
    /** Ancho del corredor: la calzada, sin subirse a la vereda. */
    ancho: 8,
    /*
     * El radio cubre **el tramo entero**, no un pedacito del medio.
     *
     * Con `CUADRA * 0.42` la zona del primer tramo quedaba centrada a cien
     * metros del arranque con cuarenta y dos de radio: los zombis mas
     * cercanos nacian a cincuenta y ocho metros, fuera del corte de
     * activacion, y el jugador caminaba media cuadra sin ver a nadie.
     *
     * Un tramo son dos cuadras, asi que el radio es una cuadra: la zona va
     * de punta a punta del tramo. Es coherente con lo que la esclusa
     * necesita (19A.1), que es poder contar **los zombis de este tramo**.
     */
    radio: CUADRA,
    peso: curva[t] ?? 0.8,

    /*
     * Cuántos zombis pone el tramo. **Es la perilla principal del juego**
     * (19A.11): con la esclusa, la puerta no abre hasta que no quede uno
     * vivo, así que esto por 1,6 s —lo que cuesta matar uno (D-31)— es el
     * piso del tiempo que el jugador pasa en el tramo.
     *
     * Van de 3 a 10, o sea de unos 5 s a unos 16 s de combate puro por
     * tramo, sin contar moverse ni esperar a estar encarado. Se ajusta
     * jugando en el teléfono, igual que la cadencia.
     */
    cantidad: Math.max(3, Math.round((curva[t] ?? 0.8) * 11)),
    nota: `Tramo ${t + 1} de ${TRAMOS}: ${p.calle ?? ''}`
  };
});

/**
 * ===========================================================================
 * LOS CORTES — lo que cierra cada bocacalle que no es la ruta (18.7, D-34)
 * ===========================================================================
 * En cada esquina se cruzan cuatro calles. Dos son el recorrido —de dónde
 * venís y a dónde vas— y **las otras dos se cierran**.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ CON VALLA Y NO CON UN AUTO CRUZADO
 * ---------------------------------------------------------------------------
 * Un auto atravesado se lee como un accidente: algo que pasó ahí. Una valla
 * de obra se lee como **alguien que cerró eso a propósito**, y eso es
 * exactamente lo que D-43 quiere que el jugador entienda: la ciudad se está
 * sellando, y las puertas de los controles son del mismo operativo.
 *
 * La diferencia importa porque el jugador va a ver treinta y pico de estos.
 * Treinta accidentes son un chiste; treinta vallas son una política.
 *
 * ---------------------------------------------------------------------------
 * TIENE QUE LEERSE CERRADO DESDE LEJOS
 * ---------------------------------------------------------------------------
 * Lo dejó escrito la prueba de los pasajes antes de borrarse: **una entrada
 * que se ve y no lleva a ningún lado es peor que una pared.** El jugador se
 * mete, pierde tiempo, y sale por donde entró.
 *
 * Por eso el corte tapa el ancho completo —calzada más las dos veredas— y
 * no sólo la calzada. Una valla que deja la vereda libre no es un corte: es
 * un embudo.
 */
const ANCHO_CALLE = 10; // UNITS.streetWidth
const ANCHO_VEREDA = 3; // UNITS.sidewalkWidth
const ANCHO_CORTE = ANCHO_CALLE + ANCHO_VEREDA * 2;
/** A qué distancia de la esquina se planta el corte: justo pasando la vereda. */
const RETIRO = ANCHO_CALLE / 2 + ANCHO_VEREDA;

const CARDINALES = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 }
];

/** Los dos brazos de la esquina `i` que NO son el recorrido. */
function brazosCerrados(i) {
  const aqui = TRAZADO[i];
  const abiertos = [];
  for (const vecino of [TRAZADO[i - 1], TRAZADO[i + 1]]) {
    if (!vecino) continue;
    const dx = vecino.x - aqui.x;
    const dz = vecino.z - aqui.z;
    const largo = Math.hypot(dx, dz) || 1;
    abiertos.push({ x: Math.round(dx / largo), z: Math.round(dz / largo) });
  }
  return CARDINALES.filter((c) => !abiertos.some((o) => o.x === c.x && o.z === c.z));
}

const cortes = TRAZADO.flatMap((esquina, i) =>
  brazosCerrados(i).map((c) => {
    const alongX = c.x !== 0;
    return {
      tipo: 'valla',
      x: esquina.x + c.x * RETIRO,
      z: esquina.z + c.z * RETIRO,
      /*
       * La valla corre a lo largo de su eje X local, así que se la gira
       * para que quede ATRAVESADA en la boca de la calle que cierra.
       */
      rot: alongX ? 90 : 0,
      tag: 'corte',
      args: ANCHO_CORTE,
      collide: alongX
        ? { w: 1.2, d: ANCHO_CORTE, h: 1.9 }
        : { w: ANCHO_CORTE, d: 1.2, h: 1.9 }
    };
  })
);

export const mission001 = {
  id: 'mission001',
  title: 'Ir a buscar a Sergio',
  summary:
    'Gus cruza dieciséis cuadras de Boedo hasta Billinghurst 250, la casa de ' +
    'Sergio. Siete controles en el camino: ninguno abre hasta que el tramo ' +
    'esté limpio.',

  seed: 20261024,

  /** Punto de aparicion del jugador y hacia donde mira al empezar. */
  spawn: { x: 0, z: 0, yaw: route[1] ? (route[1].x < 0 ? 270 : 90) : 0 },

  route,
  checkpoints,

  /** Destino final: la casa de Sergio (D-41). */
  goal: {
    atRouteIndex: route.length - 1,
    radius: 6,
    label: 'Billinghurst 250 — la casa de Sergio'
  },

  objectives,
  blocks,

  /*
   * =========================================================================
   * RUTAS ALTERNATIVAS: NO HAY (D-34)
   * =========================================================================
   * Había dos pasajes —calles angostas que se metían entre dos edificios,
   * corrían por el fondo de la manzana y volvían a salir— y cada uno creaba
   * la decisión de "por la calle o por el pasaje".
   *
   * Se fueron con D-34. El juego nuevo tiene **una sola ruta** y todo lo
   * demás bloqueado, porque la decisión del jugador dejó de ser *por dónde
   * ir* y pasó a ser *dónde pararse y cuánto tiempo*. Dos decisiones de
   * navegación compitiendo con la de combate hacen que ninguna de las dos
   * se sienta.
   *
   * Lo que sí sobrevive de esa idea es la cobertura: un auto detrás del cual
   * pararse es la misma elección en chico, y esa la trae la 18.7.
   */
  desvios: [],

  zonas,

  /*
   * =========================================================================
   * DISEÑO DE NIVEL — colocado a mano
   * =========================================================================
   * Lo que cierra todo lo que no es la ruta (18.7, D-34 y D-43).
   *
   * No son obstáculos sueltos: son **el mismo operativo de contención que
   * puso las puertas, visto de costado** (D-43). La misma valla de chapa, la
   * misma idea — la ciudad se está sellando cuadra por cuadra, y el jugador
   * avanza por el único corredor que quedó abierto.
   *
   * Se generan del trazado y no se escriben a mano. Son dos por esquina y
   * hay diecisiete esquinas: escribirlos uno por uno sería copiar la ruta
   * por tercera vez, y la copia que nadie mira es la que se desactualiza.
   *
   * El mapa viejo tenía treinta y pico de props puestos uno por uno:
   * barricadas, colectivos cruzados, contenedores, vallas. Estaban sobre un
   * trazado que ya no existe —el recorrido salía al sur y ahora sale al
   * oeste— así que ninguno caía donde tiene que caer.
   *
   * Lo que **todavía falta** es el diseño fino: la 18.7 tapa, pero no
   * decide dónde conviene cubrirse. Los autos abandonados que el generador
   * reparte sirven de cobertura y por ahora alcanzan.
   */
  props: cortes
};
