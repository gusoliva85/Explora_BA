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
