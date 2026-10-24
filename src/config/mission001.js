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
    { x: 0, z: -110, label: 'Esquina con Carlos Calvo' },
    { x: -90, z: -110, label: 'Boedo al 900' },
    { x: -90, z: -230, label: 'Billinghurst al 240' }
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

  /** Texto de objetivo que muestra el HUD en cada etapa. */
  objectives: [
    'Avanzá hasta la esquina de Carlos Calvo.',
    'Seguí por Boedo hasta el kiosco.',
    'Llegá a la comisaria.'
  ],

  /** Aspecto del tramo. Pensado para que cada cuadra se distinga de la anterior. */
  blocks: [
    { buildingHeight: [7, 13], density: 0.82, mood: 'residencial' },
    { buildingHeight: [10, 20], density: 0.9, mood: 'comercial' },
    { buildingHeight: [8, 16], density: 0.86, mood: 'mixto' }
  ]
};
