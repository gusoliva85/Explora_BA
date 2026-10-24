/**
 * ===========================================================================
 * MISION 001 - "Llegar al refugio"
 * ===========================================================================
 * Boedo -> comisaria. El recorrido real (Av. Independencia 3250 a
 * Billinghurst 240) son varios kilometros; aca esta COMPRIMIDO a un pasillo
 * jugable de ~350 m en tres tramos, uno por checkpoint. No es un mapa a
 * escala 1:1 de Buenos Aires, es una ruta legible que evoca el recorrido.
 * Ver doc 02, decision D-04.
 *
 * El trazado es una polilinea de esquinas. Cada par de puntos consecutivos
 * genera una cuadra con calzada, veredas y una hilera de edificios a cada
 * lado. Para agregar o acortar el recorrido alcanza con tocar `route`.
 *
 * Convencion de ejes: X = este/oeste, Z = norte/sur (−Z es "al norte"),
 * Y = arriba. 1 unidad = 1 metro.
 */

export const mission001 = {
  id: 'mission001',
  title: 'Llegar al refugio',
  summary:
    'Gus tiene que cruzar Boedo hasta la comisaria. Dos controles en el camino ' +
    'sirven de punto de guardado.',

  seed: 20261024,

  /** Punto de aparicion del jugador y hacia donde mira al empezar. */
  spawn: { x: 0, z: 0, yaw: 0 },

  /**
   * Esquinas del recorrido. El primer punto es el spawn.
   * Cada tramo es recto y alineado a un eje (asi lo exige el generador).
   */
  route: [
    { x: 0, z: 0, label: 'Independencia al 3250' },
    { x: 0, z: -110, label: 'Esquina de Carlos Calvo' },
    { x: -90, z: -110, label: 'Av. Boedo al 900' },
    { x: -90, z: -230, label: 'Comisaria de Carlos Calvo' }
  ],

  /**
   * Controles intermedios. `atRouteIndex` apunta a un vertice de `route`.
   * Al tocarlos se guarda el progreso y se reaparece ahi al reintentar.
   */
  checkpoints: [
    { atRouteIndex: 1, radius: 5, label: 'Control 1: la esquina despejada' },
    { atRouteIndex: 2, radius: 5, label: 'Control 2: kiosco de Boedo' }
  ],

  /** Destino final. Completa la mision al entrar en el radio. */
  goal: {
    atRouteIndex: 3,
    radius: 6,
    label: 'Comisaria - punto de extraccion'
  },

  /*
   * NOTA SOBRE LAS CALLES (decision D-04)
   *
   * El documento 01 propone ir de Av. Independencia 3250 a Billinghurst
   * 240. Son varios kilometros y Billinghurst no queda en Boedo sino del
   * lado de Almagro, asi que el cartel diria una cosa y el barrio seria
   * otra. El destino pasa a ser una comisaria sobre Carlos Calvo, que si
   * cae dentro del recorrido y mantiene la idea original: llegar a un
   * lugar seguro que cierra el nivel.
   *
   * Las direcciones siguen siendo evocativas, no cartograficas: el
   * recorrido real esta comprimido a unos 350 m jugables.
   */

  /** Texto de objetivo que muestra el HUD en cada etapa. */
  objectives: [
    'Avanzá por Independencia hasta Carlos Calvo.',
    'Seguí por Boedo hasta el kiosco de la esquina.',
    'Llegá a la comisaria.'
  ],

  /** Aspecto del tramo. Pensado para que cada cuadra se distinga de la anterior. */
  blocks: [
    { buildingHeight: [7, 13], density: 0.82, mood: 'residencial' },
    { buildingHeight: [10, 20], density: 0.9, mood: 'comercial' },
    { buildingHeight: [8, 16], density: 0.86, mood: 'mixto' }
  ],

  /*
   * =========================================================================
   * RUTAS ALTERNATIVAS
   * =========================================================================
   * Cada desvio es un pasaje: una calle angosta que se mete entre dos
   * edificios, corre por el fondo de la manzana y vuelve a salir mas
   * adelante. El generador abre un hueco en la hilera de fachadas donde el
   * pasaje toca la calle, asi que las bocas se ven como entradas.
   *
   * Los dos estan puestos para rodear un corte, y cada uno crea la misma
   * decision, que es el pilar de "decisiones rapidas" del documento 01:
   *
   *   POR LA CALLE   es mas corto, pero hay que pasar por el hueco de la
   *                  barricada, que es donde va a estar el peligro.
   *   POR EL PASAJE  es mas largo y mas angosto —no se puede esquivar a
   *                  nadie ahi adentro— pero se evita el corte.
   *
   * El primer punto y el ultimo tienen que caer sobre la linea de fachada
   * de la calle principal: ahi es donde se abre la boca. En el tramo 1 esa
   * linea esta en x = +8; en el tramo 2, en z = -118.
   */
  desvios: [
    {
      // TRAMO 1: rodea la barricada de Independencia por el fondo de la
      // manzana de la derecha. Entra antes del corte y sale despues.
      nombre: 'Pasaje Independencia',
      ancho: 5,
      puntos: [
        { x: 8, z: -50 },
        { x: 17, z: -50 },
        { x: 17, z: -76 },
        { x: 8, z: -76 }
      ]
    },
    {
      // TRAMO 2: rodea el corte de Av. Boedo por el lado de abajo.
      nombre: 'Pasaje Boedo',
      ancho: 5,
      puntos: [
        { x: -56, z: -118 },
        { x: -56, z: -129 },
        { x: -73, z: -129 },
        { x: -73, z: -118 }
      ]
    }
  ],

  /*
   * =========================================================================
   * ZONAS DE JUEGO
   * =========================================================================
   * Donde van a aparecer zombis y objetos. Todavia no hay ni unos ni otros
   * —eso es la Fase 4 y la Fase 8— pero las zonas se definen ahora, con el
   * mapa fresco, porque son decisiones de diseño de nivel y no de
   * implementacion.
   *
   * La logica que las ordena:
   *
   *   - Los zombis se concentran en los cuellos de botella y en la boca de
   *     los pasajes. Son los lugares donde el jugador tiene que frenar, y
   *     un zombi solo da miedo si aparece donde uno no puede correr.
   *   - Los objetos se ponen en el camino LARGO. Asi el desvio paga: es
   *     mas seguro y ademas rinde. Si el camino corto tuviera lo mismo,
   *     nadie elegiria el otro.
   *   - El primer tramo arranca flojo: hay que dejar que el jugador
   *     aprenda a moverse antes de exigirle nada.
   *
   * `peso` es cuanta presion pone la zona, de 0 a 1. Lo usara el
   * SpawnManager de la Fase 4 para repartir la cantidad de zombis.
   */
  zonas: [
    // --- Zombis -------------------------------------------------------------
    { tipo: 'zombis', x: 0, z: -36, radio: 9, peso: 0.25,
      nota: 'Primer encuentro. Suave y en campo abierto: hay lugar para correr.' },
    { tipo: 'zombis', x: 0, z: -62, radio: 11, peso: 0.9,
      nota: 'El corte de Independencia. Es el que empuja hacia el pasaje.' },
    { tipo: 'zombis', x: 17, z: -63, radio: 7, peso: 0.5,
      nota: 'Dentro del pasaje. Menos, pero sin lugar para esquivar.' },
    { tipo: 'zombis', x: 0.5, z: -92, radio: 9, peso: 0.6,
      nota: 'Detras del colectivo, fuera de la vista hasta que lo rodeas.' },
    { tipo: 'zombis', x: -46, z: -110, radio: 10, peso: 0.7,
      nota: 'Mitad de la avenida, entre vehiculos abandonados.' },
    { tipo: 'zombis', x: -64, z: -112, radio: 11, peso: 0.95,
      nota: 'El corte de Boedo. El mas duro del recorrido.' },
    { tipo: 'zombis', x: -90, z: -190, radio: 12, peso: 0.8,
      nota: 'Ultimo tramo. Presion sostenida hasta la comisaria.' },

    // --- Objetos ------------------------------------------------------------
    { tipo: 'municion', x: 17, z: -52, radio: 3, peso: 1,
      nota: 'Entrada del pasaje: premia haber elegido el camino largo.' },
    { tipo: 'curacion', x: 17, z: -74, radio: 3, peso: 1,
      nota: 'Salida del pasaje, antes de volver a la calle.' },
    { tipo: 'municion', x: -8, z: -104, radio: 3, peso: 1,
      nota: 'Junto a la parada de colectivo, antes del control 1.' },
    { tipo: 'curacion', x: -65, z: -129, radio: 3, peso: 1,
      nota: 'Fondo del pasaje de Boedo.' },
    { tipo: 'municion', x: -84, z: -160, radio: 3, peso: 1,
      nota: 'Tramo final, para llegar con algo con que defenderse.' }
  ],

  /*
   * =========================================================================
   * DISEÑO DE NIVEL — colocado a mano
   * =========================================================================
   * Todo lo que esta aca cambia como se JUEGA el tramo, no solo como se ve.
   * Por eso vive en el archivo de la mision y no en el generador: el
   * generador puede variar lo que quiera entre semillas, pero una
   * barricada que obliga a desviarse tiene que estar siempre en el mismo
   * lugar.
   *
   * Cada entrada lleva `collide` cuando bloquea el paso. Sin eso es
   * decorado, y el jugador aprende enseguida a ignorarlo.
   *
   * El eje de la calle es X = 0 en el primer tramo y Z = -110 en el
   * segundo. La calzada va de -5 a +5 respecto del eje.
   */
  props: [
    // --- TRAMO 1: Independencia ---------------------------------------------

    // Choque de dos autos cruzados, a mitad de cuadra. No bloquea del
    // todo: deja pasar por la izquierda, pero obliga a frenar y a elegir.
    { tipo: 'auto', x: 1.6, z: -34, rot: 108, tag: 'vehicle',
      collide: { w: 4.4, d: 4.4, h: 1.7 }, args: { esTaxi: true } },
    { tipo: 'auto', x: -2.2, z: -37, rot: 72, tag: 'vehicle',
      collide: { w: 4.4, d: 4.4, h: 1.7 } },
    { tipo: 'escombros', x: -0.4, z: -35.5, rot: 20 },

    /*
     * EL CUELLO DE BOTELLA.
     *
     * Barricada que cruza la calzada entera a la altura del 3100. Es el
     * punto donde el tramo 1 se decide: o se pasa por la vereda de la
     * izquierda, que es angosta y tiene un contenedor en el medio, o se
     * rodea por el baldio de la derecha, que es mas largo.
     *
     * Dos barricadas en vez de una sola larga: asi queda un hueco en el
     * centro por el que se ve lo que hay del otro lado, que es lo que
     * hace que el jugador decida en vez de simplemente chocar.
     */
    { tipo: 'barricada', x: -2.6, z: -62, rot: 90,
      collide: { w: 1.2, d: 4.2, h: 1.1 } },
    { tipo: 'barricada', x: 2.6, z: -62, rot: 90,
      collide: { w: 1.2, d: 4.2, h: 1.1 } },
    { tipo: 'valla', x: 0, z: -62, rot: 90, args: 2.4,
      collide: { w: 0.4, d: 2.4, h: 1.9 } },
    { tipo: 'contenedor', x: -6.4, z: -58, rot: 90,
      collide: { w: 1.2, d: 2.1, h: 1.4 } },
    { tipo: 'bolsas', x: -6.8, z: -66, rot: 0 },

    // Colectivo atravesado cerca de la esquina: tapa la vista de lo que
    // viene y obliga a bordearlo.
    // Corrido hacia la derecha: deja un paso de casi tres metros contra el
    // cordon izquierdo. Mas angosto que esto y el jugador se traba, porque
    // ademas tiene que entrar en diagonal.
    { tipo: 'colectivo', x: 1.8, z: -92, rot: 24, tag: 'vehicle',
      collide: { w: 6.6, d: 9, h: 3.2 } },

    // --- ESQUINA: Independencia y Carlos Calvo ------------------------------

    // El kiosco de la esquina, que es la referencia visual del control 1.
    { tipo: 'kiosco', x: 8.2, z: -118.5, rot: 180,
      collide: { w: 3.4, d: 2.6, h: 2.8 } },
    { tipo: 'paradaColectivo', x: -8.5, z: -120, rot: 90,
      collide: { w: 1.6, d: 3.8, h: 2.7 } },
    { tipo: 'banco', x: 8.4, z: -104, rot: 180 },

    // --- TRAMO 2: Av. Boedo --------------------------------------------------

    // Avenida: mas transito abandonado y mas obstaculos sueltos.
    { tipo: 'auto', x: -24, z: -106.5, rot: 0, tag: 'vehicle',
      collide: { w: 4.4, d: 2, h: 1.7 } },
    { tipo: 'auto', x: -31, z: -113.5, rot: 180, tag: 'vehicle',
      collide: { w: 4.4, d: 2, h: 1.7 }, args: { esTaxi: true } },
    { tipo: 'colectivo', x: -46, z: -107, rot: 0, tag: 'vehicle',
      collide: { w: 11, d: 2.6, h: 3.2 } },

    // Segundo cuello de botella, con un hueco distinto: aca el paso libre
    // esta contra la vereda de arriba, no en el centro.
    { tipo: 'barricada', x: -62, z: -112.6, rot: 0,
      collide: { w: 4.2, d: 1.2, h: 1.1 } },
    { tipo: 'barricada', x: -66.5, z: -112.6, rot: 0,
      collide: { w: 4.2, d: 1.2, h: 1.1 } },
    { tipo: 'escombros', x: -64, z: -111, rot: 50 },
    { tipo: 'contenedor', x: -70, z: -113.8, rot: 0,
      collide: { w: 2.1, d: 1.2, h: 1.4 } },

    // --- ESQUINA: Boedo y la comisaria --------------------------------------

    { tipo: 'cesto', x: -82, z: -118, rot: 0 },
    { tipo: 'paradaColectivo', x: -78, z: -104, rot: 180,
      collide: { w: 3.8, d: 1.6, h: 2.7 } },

    // --- TRAMO 3: hasta la comisaria ----------------------------------------

    { tipo: 'auto', x: -86, z: -150, rot: 0, tag: 'vehicle',
      collide: { w: 2, d: 4.4, h: 1.7 } },
    { tipo: 'escombros', x: -92, z: -168, rot: 10 },
    { tipo: 'auto', x: -93.5, z: -186, rot: 194, tag: 'vehicle',
      collide: { w: 2, d: 4.4, h: 1.7 } },

    // Ultimo obstaculo antes de la meta: dos vallas que dejan un paso
    // justo, para que llegar se sienta como pasar por el ojo de una aguja.
    { tipo: 'valla', x: -94.5, z: -206, rot: 0, args: 5,
      collide: { w: 5, d: 0.4, h: 1.9 } },
    { tipo: 'valla', x: -85.5, z: -206, rot: 0, args: 5,
      collide: { w: 5, d: 0.4, h: 1.9 } },

    /*
     * La comisaria. Es el unico edificio colocado a mano de toda la
     * mision, y esta corrido del eje para que el jugador la vea de frente
     * al llegar, no de costado.
     */
    { tipo: 'comisaria', x: -90, z: -241, rot: 0,
      collide: { w: 12, d: 10, h: 7 }, tag: 'building' }
  ]
};
