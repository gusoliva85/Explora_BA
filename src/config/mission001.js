import { trazadoOrtogonal, puertas, CUADRA, CUADRAS_POR_TRAMO } from './recorrido.js';
import { UNITS } from './balance.js';

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

/**
 * La curva de dificultad, por tramo.
 *
 * El primero flojo —hay que dejar aprender a moverse, y con el combate
 * automático lo que se aprende es *cuándo frenar*, que es más sutil que
 * apretar un botón— y el último aflojando: llegar a lo de Sergio tiene que
 * sentirse como llegar, no como una pared. El más duro es el anteúltimo.
 */
const CURVA = [0.25, 0.45, 0.6, 0.7, 0.8, 0.88, 0.95, 0.75];

/**
 * ===========================================================================
 * LAS ZONAS DE ZOMBIS — una por cuadra, y cada una declara su tramo
 * ===========================================================================
 * (18.9, 19A.1)
 *
 * ---------------------------------------------------------------------------
 * ERAN UNA POR TRAMO, Y ESTABA MAL
 * ---------------------------------------------------------------------------
 * El error es bonito porque parecía correcto: **un tramo son dos cuadras, y
 * dos cuadras pueden doblar una esquina.** La zona iba derecha del principio
 * al final del tramo, así que en los cinco tramos con giro **cortaba camino
 * por adentro de la manzana** y los zombis nacían dentro de los edificios.
 *
 * Lo encontró una prueba, no el ojo: un zombi dentro de una pared no se ve,
 * y con la esclusa (D-37) **traba la partida para siempre** — el contador
 * dice "queda 1" y el jugador no lo encuentra.
 *
 * Una cuadra, en cambio, es recta por definición. Y el tramo sigue
 * existiendo como dato: cada zona lo declara, que es lo que la esclusa
 * necesita para contar.
 */
const zonas = TRAZADO.slice(1).map((hasta, i) => {
  const desde = TRAZADO[i];
  const tramo = Math.floor(i / CUADRAS_POR_TRAMO);
  const peso = CURVA[tramo] ?? 0.8;

  return {
    tipo: 'zombis',
    tramo,
    cuadra: i,
    // El centro, para el diagnóstico y para lo que quiera un punto solo.
    x: (desde.x + hasta.x) / 2,
    z: (desde.z + hasta.z) / 2,
    a: { x: desde.x, z: desde.z },
    b: { x: hasta.x, z: hasta.z },

    /**
     * El ancho del corredor: **sólo el carril del medio**.
     *
     * No es media calle. Los autos abandonados se generan contra el cordón
     * —a 3,6 m del eje, ocupando de 2,4 a 4,8— así que un corredor de ±2 m
     * deja a los zombis donde no hay autos.
     *
     * Es por construcción y no por comprobación, y eso importa: los puestos
     * se calculan **al empezar la misión**, cuando las cuadras lejanas
     * todavía no están construidas y no tienen una sola caja de colisión
     * contra la cual verificar nada. Lo que no se puede comprobar hay que
     * garantizarlo con la geometría.
     */
    ancho: 4,

    peso,
    /**
     * Cuántos pone esta cuadra: la mitad de lo que pide el tramo, porque un
     * tramo son dos cuadras.
     *
     * ---------------------------------------------------------------------
     * ERAN DE 4 A 10 POR TRAMO, Y AHORA SON DE 16 A 22
     * ---------------------------------------------------------------------
     * **Es la perilla principal del juego** (19A.11), y la movió Gus
     * jugándolo: con cinco por tramo se podía cruzar el barrio parado.
     * Gus pidió quince o veinte como piso, y la razón que dio es de
     * diseño y no de dificultad: *"te tienen que obligar a moverte, no
     * tenés que estar parado todo el tiempo"*.
     *
     * Con el combate automático (D-28) disparar es quedarse quieto, así
     * que el único contrapeso posible es **que quedarse quieto cueste**.
     * Cinco zombis lentos no cuestan nada; dieciséis que aceleran al
     * verte convierten cada parada en una decisión de cuántos segundos.
     *
     *   14 + peso·8, con la curva de 0,25 a 0,95 → de 16 a 22 por tramo.
     *
     * El piso es alto a propósito: el tramo flojo del principio lo sigue
     * siendo por la **curva de llegada** —en el primero los zombis están
     * repartidos en doscientos metros y se los encuentra de a dos—, no
     * por el total. Un tramo con cuatro zombis no enseña a moverse: se
     * cruza caminando y después el segundo sorprende.
     *
     * Lo que esto cuesta en memoria es casi nada, y conviene saber por
     * qué: un puesto son **dos números y un tramo**, no un zombi. Las
     * entidades son `PERF.maxActiveZombies + 6` y no cambian con este
     * número. Pasar de 58 puestos a 156 son 98 objetos de tres campos.
     */
    cantidad: Math.round((14 + peso * 8) / CUADRAS_POR_TRAMO),
    nota: `Tramo ${tramo + 1} de ${TRAMOS}, cuadra ${i + 1}: ${hasta.calle ?? ''}`
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

/**
 * ===========================================================================
 * LOS CARTELES DE DIRECCION (18.10, D-40)
 * ===========================================================================
 * **No orientan: dan lugar.** De orientar se encarga la brújula (D-38), que
 * es lo único que se mira de reojo mientras se corre.
 *
 * Lo que estos hacen es convertir una cuadra genérica en *Maza 379*. Son
 * trece en 1.600 metros —uno cada 120, y nunca dos seguidos— así que el que
 * aparece vale algo.
 *
 * ---------------------------------------------------------------------------
 * CUÁLES, Y POR QUÉ ESOS
 * ---------------------------------------------------------------------------
 * | Dónde | Qué dice | Por qué |
 * |---|---|---|
 * | El arranque | `Av. Independencia 3250` | De dónde sale Gus. Es la primera cosa que el jugador lee |
 * | Las cuatro de Gus | `Agrelo 3400`, `Maza 379`… | Las dio él, y caen en medio de un tramo: son carteles de paso |
 * | Las siete puertas | el nombre de la esquina | Ahí el jugador se para a pelear; es cuando tiene tiempo de leer |
 * | El final | `Billinghurst 250` | La casa de Sergio (D-41) |
 *
 * ---------------------------------------------------------------------------
 * DE QUÉ LADO DE LA CALLE
 * ---------------------------------------------------------------------------
 * Siempre a la **derecha según el sentido de avance**. No es indistinto: un
 * cartel que a veces está a un lado y a veces al otro obliga a barrer la
 * pantalla con la mirada, y lo que se busca es exactamente lo contrario —
 * que el ojo ya sepa dónde mirar.
 */
const carteles = TRAZADO.filter((p, i) => p.real || p.puerta > 0 || i === 0).map((p, i) => {
  const idx = TRAZADO.indexOf(p);
  // El sentido de avance en ese punto: el tramo que sale de él, o el que
  // llega si es el final.
  /*
   * ⚠️ Ojo con el `||` acá: **un tramo recto tiene una componente en cero**.
   *
   * La primera versión decía `(sig.x - p.x) || (p.x - ant.x)`, que para un
   * tramo que corre en Z da `0 || algo` y se queda con `algo`: mezclaba la
   * dirección del tramo de salida con la del de entrada y el cartel salía
   * **en diagonal**, a veinte metros de la vereda. Se vio midiendo, no
   * mirando: en la captura parecía que simplemente no estaba.
   *
   * En una cuadrícula ortogonal, cero no es "falta el dato": es el dato.
   */
  const sig = TRAZADO[idx + 1];
  const ant = TRAZADO[idx - 1];
  const dx = sig ? sig.x - p.x : p.x - (ant ?? p).x;
  const dz = sig ? sig.z - p.z : p.z - (ant ?? p).z;

  /*
   * Corrido hacia adelante media cuadra cuando es una puerta: en la esquina
   * misma ya hay semáforo, chapa de calle y el control. Un cartel más ahí
   * es ruido; cincuenta metros antes se lee solo.
   */
  /*
   * Todos se retiran de la bocacalle, y los de las puertas más.
   *
   * El mínimo de diez metros no es estética: en una esquina las dos calles
   * **comparten el cruce**, así que la vereda de la calle por la que venís
   * es, a dos metros del cordón, la calzada de la que sigue. El cartel de
   * "Av. Boedo 120" caía exactamente ahí —a cero metros del eje de la
   * calle siguiente— y lo encontró la prueba, no el ojo.
   *
   * Los de las puertas se van treinta y cinco metros porque además compiten:
   * en la esquina ya hay semáforo, chapa de calle y el control.
   */
  const adelanto = p.puerta > 0 ? CUADRA * 0.35 : (ant ? 10 : 0);
  const RETIRO_CARTEL = 7.2;

  /*
   * El retroceso va por la calle **por la que se viene**, no por la que
   * sigue.
   *
   * En una esquina con giro son calles distintas, y usar la de salida
   * ponía el cartel treinta y cinco metros adentro de la cuadra siguiente
   * —o sea, del otro lado de la puerta que anuncia—. Se vio midiendo: el
   * cartel de "Virrey Liniers" estaba en (-193, 35), que no es ninguna
   * vereda.
   */
  const ex = ant ? p.x - ant.x : dx;
  const ez = ant ? p.z - ant.z : dz;
  const lEnt = Math.hypot(ex, ez) || 1;
  const entrada = { x: ex / lEnt, z: ez / lEnt };

  /*
   * Y la vereda también se mide sobre la calle por la que se viene.
   *
   * Es la misma trampa y la encontré igual: sacando la derecha del tramo
   * de SALIDA, en una esquina con giro el cartel quedaba **en el medio de
   * la calzada** de la calle anterior. La derecha de una calle sólo
   * significa algo respecto de esa calle.
   */
  const der = { x: -entrada.z, z: entrada.x };

  return {
    tipo: 'carteDireccion',
    x: p.x + der.x * RETIRO_CARTEL - entrada.x * adelanto,
    z: p.z + der.z * RETIRO_CARTEL - entrada.z * adelanto,
    // La chapa mira a la calle: perpendicular a la vereda donde está.
    rot: Math.abs(der.x) > Math.abs(der.z) ? 90 : 0,
    tag: 'cartel',
    args: {
      ancho: 3.4,
      texto: p.real || idx === 0 || idx === TRAZADO.length - 1 ? p.dir : p.hasta
    },
    collide: { w: 0.5, d: 0.5, h: 2.3 }
  };
});

/**
 * ===========================================================================
 * LA CASA DE SERGIO — Billinghurst 250 (D-41, 18.11)
 * ===========================================================================
 * El final de los 1.600 m, y el motivo del juego entero: Gus no va a un
 * refugio, va a buscar a un amigo.
 *
 * ---------------------------------------------------------------------------
 * DÓNDE VA, Y POR QUÉ NO EN EL VÉRTICE
 * ---------------------------------------------------------------------------
 * La meta del recorrido es el último vértice del trazado, que es una
 * **esquina**. Una casa no está en la esquina: está sobre la línea de
 * fachadas, a un costado de la calle. Así que se la planta sobre la vereda
 * del último tramo, del mismo lado que su cartel.
 *
 * El marcador de meta —el anillo en el piso— se queda en el vértice, que es
 * donde el jugador tiene que llegar. La casa es **lo que ve**; el vértice es
 * dónde termina.
 */
const FINAL = TRAZADO[TRAZADO.length - 1];
const PREVIO = TRAZADO[TRAZADO.length - 2];
const casa = (() => {
  const dx = FINAL.x - PREVIO.x;
  const dz = FINAL.z - PREVIO.z;
  const largo = Math.hypot(dx, dz) || 1;
  const eje = { x: dx / largo, z: dz / largo };
  // Misma vereda que el cartel: a la derecha del sentido de avance.
  const der = { x: -eje.z, z: eje.x };
  /*
   * El frente de la casa cae EXACTO sobre la línea municipal.
   *
   * Media calzada (5) + vereda (3) = 8 m del eje, que es donde arranca la
   * hilera de fachadas. Más el medio fondo de la casa (5) para pasar del
   * frente al centro. La primera versión usaba 18 y dejaba a la casa cinco
   * metros adentro de la manzana: un diente en la cuadra que se lee como un
   * error de construcción, no como un zaguán.
   */
  const LINEA = UNITS.streetWidth / 2 + UNITS.sidewalkWidth + 5;

  return {
    tipo: 'casaDeSergio',
    x: FINAL.x + der.x * LINEA - eje.x * 6,
    z: FINAL.z + der.z * LINEA - eje.z * 6,
    /*
     * La casa mira a la calle. El modelo tiene el frente en −Z, igual que
     * todo en el proyecto (ver `core/rumbo.js`), así que se la gira para
     * que ese frente apunte hacia el eje de la calzada.
     */
    rot: Math.abs(der.x) > Math.abs(der.z) ? (der.x > 0 ? 90 : 270) : der.z > 0 ? 180 : 0,
    tag: 'building',
    collide: { w: 9, d: 10, h: 6.4 },
    /*
     * Se queda con su pedazo de hilera: el generador no levanta fachada
     * acá. Sin esto quedan dos paredes en el mismo lugar —la casa adentro
     * de un edificio de veinte metros— y no se ve: desde la cámara cenital
     * se lee como una fachada más, y el final del recorrido deja de
     * reconocerse.
     *
     * El hueco es más ancho que la casa para que tampoco quede pegada a
     * sus vecinas: una casa baja con medianeras de veinte metros a los dos
     * lados se lee como un pozo, no como una casa.
     */
    hueco: { w: 16, d: 16 }
  };
})();

/**
 * ===========================================================================
 * LAS SIETE PUERTAS DE LA ESCLUSA (19A.3, D-37 y D-46)
 * ===========================================================================
 * Una por control, cada dos cuadras. **No abren hasta que no quede un zombi
 * vivo en el tramo**, y se cierran a tus espaldas.
 *
 * ---------------------------------------------------------------------------
 * NO VAN EN LA ESQUINA: VAN ANTES
 * ---------------------------------------------------------------------------
 * Dos de las siete caen en esquinas con giro, y una puerta atravesada en un
 * cruce es un problema: cierra cuatro calles en vez de una, y el jugador no
 * entiende cuál de las cuatro es la que le importa.
 *
 * Así que se plantan **diez metros antes del cruce, sobre la calle por la
 * que venís**. Ahí cierran exactamente un corredor —el que el jugador está
 * recorriendo— y se leen sin ambigüedad.
 *
 * Es la misma corrección que necesitaron los carteles, y por el mismo
 * motivo: **en una esquina, las dos calles comparten el cruce.**
 */
const esclusas = PUERTAS.map((p) => {
  /*
   * Se busca por número de cuadra y no con `indexOf`.
   *
   * `puertas()` llama a `trazadoOrtogonal()` por su cuenta, así que
   * devuelve **otros objetos** con los mismos valores: `indexOf` da −1 y
   * todo lo que venga después lee `undefined`. Es la trampa clásica de
   * comparar por identidad lo que viene de dos llamadas distintas.
   */
  const idx = TRAZADO.findIndex((t) => t.cuadra === p.cuadra);
  const ant = TRAZADO[idx - 1];
  const ex = p.x - ant.x;
  const ez = p.z - ant.z;
  const largo = Math.hypot(ex, ez) || 1;
  const entrada = { x: ex / largo, z: ez / largo };

  const RETIRO_PUERTA = 10;
  const ANCHO_PUERTA = 16;
  const alongX = Math.abs(entrada.x) > Math.abs(entrada.z);

  return {
    tipo: 'puertaEsclusa',
    tramo: p.puerta - 1,
    control: p.puerta,
    x: p.x - entrada.x * RETIRO_PUERTA,
    z: p.z - entrada.z * RETIRO_PUERTA,
    /*
     * La hoja corre a lo largo de su eje X local, así que la puerta se gira
     * para quedar ATRAVESADA en la calle por la que viene el jugador.
     */
    rot: alongX ? 90 : 0,
    tag: `puerta${p.puerta - 1}`,
    args: { ancho: ANCHO_PUERTA },
    collide: alongX
      ? { w: 0.6, d: ANCHO_PUERTA, h: 3.5 }
      : { w: ANCHO_PUERTA, d: 0.6, h: 3.5 }
  };
});

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
  props: [...cortes, ...carteles, casa, ...esclusas],

  /*
   * Las puertas, aparte, para que la esclusa las encuentre sin tener que
   * filtrar `props` por tipo. Son los mismos objetos: la lista es un
   * índice, no una copia.
   */
  puertas: esclusas
};
