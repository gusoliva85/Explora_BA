import { poseNeutral, mezclarPoses } from './pose.js';

/**
 * ===========================================================================
 * POSES DEL ZOMBI — FASE 12.C
 * ===========================================================================
 * Las mismas articulaciones que Gus, con otro cuerpo encima.
 *
 * ---------------------------------------------------------------------------
 * LO QUE HACE QUE UN ZOMBI SE LEA COMO ZOMBI
 * ---------------------------------------------------------------------------
 * No es la sangre ni la cara: a veinte metros nada de eso existe. Son tres
 * cosas, y las tres son de movimiento:
 *
 *   1. **Asimetría.** Un humano camina parejo. Un zombi arrastra una
 *      pierna y lleva un brazo más caído que el otro. Es lo primero que el
 *      ojo marca como "algo anda mal" sin poder decir qué.
 *   2. **Los brazos adelante y arriba**, no colgando a los costados. Es la
 *      silueta que lo separa de Gus desde la cámara cenital, que es el
 *      único ángulo desde el que se lo va a ver.
 *   3. **El torso volcado**, con la cabeza caída hacia un lado. Lo hace más
 *      bajo y más ancho que Gus, aunque midan parecido.
 *
 * Las tres están escritas como números acá, y hay pruebas que las fijan.
 * Si alguien "arregla" la asimetría porque le parece un error, se entera.
 */

export const PoseZ = {
  QUIETO: 'z_quieto',
  CAMINAR: 'z_caminar',
  CORRER: 'z_correr',
  ATACAR: 'z_atacar',
  GOLPEADO: 'z_golpeado',
  MUERTO: 'z_muerto'
};

/**
 * La postura base de cualquier zombi: encorvado, brazos al frente.
 *
 * Todas las poses parten de acá en vez de la neutral humana. Es lo que
 * garantiza que ningún estado lo devuelva accidentalmente a una postura
 * erguida, que lo haría indistinguible de Gus por un instante.
 */
export function posturaDeZombi() {
  const p = poseNeutral();
  p.torso = 26;
  p.cabeza = -14;
  p.cabezaGiro = 11;
  // Los brazos adelante y arriba: el rasgo de silueta.
  p.brazoI = -74;
  p.brazoD = -68;
  p.codoI = 24;
  p.codoD = 30;
  p.cadera = -0.04;
  return p;
}

/**
 * Cuánto se desfasa un lado del otro, en fracción de ciclo.
 *
 * Es LA asimetría. Un humano tiene los dos lados a media fase exacta
 * (0,5); el zombi arrastra uno, así que un lado llega tarde.
 *
 * No es mucho: con más de 0,2 deja de parecer que cojea y parece que se
 * rompió.
 */
export const DESFASE = 0.12;

function cicloZombi(fase, { amplitud, amplitudBrazo, rebote, arrastre }) {
  const p = posturaDeZombi();
  const a = fase * Math.PI * 2;
  // El lado derecho va atrasado: la pierna que arrastra.
  const b = (fase + DESFASE) * Math.PI * 2;

  const senI = Math.sin(a);
  const senD = Math.sin(b);

  p.piernaI = senI * amplitud;
  // La pierna que arrastra levanta MENOS: de ahí el `arrastre`.
  p.piernaD = -senD * amplitud * arrastre;

  p.rodillaI = Math.max(0, -senI) * amplitud * 1.1;
  p.rodillaD = Math.max(0, senD) * amplitud * 0.6;

  /*
   * Los brazos se balancean MUY poco y no se cruzan con las piernas.
   *
   * Un humano contrapesa: brazo izquierdo con pierna derecha. El zombi no
   * contrapesa nada, lleva los brazos tiesos adelante y apenas oscilan.
   * Es la mitad de por qué se ve mal aunque uno no sepa explicarlo.
   */
  p.brazoI += senI * amplitudBrazo;
  p.brazoD += senD * amplitudBrazo * 0.6;

  p.cadera -= Math.abs(Math.cos(a)) * rebote;
  // El torso se bambolea de lado: el peso mal repartido.
  p.torsoGiro = senI * 7;
  return p;
}

/**
 * @param {string} estado
 * @param {number} fase
 */
export function poseZombiDe(estado, fase) {
  const f = ((fase % 1) + 1) % 1;

  switch (estado) {
    case PoseZ.CAMINAR:
      return cicloZombi(f, {
        amplitud: 19,
        amplitudBrazo: 7,
        rebote: 0.03,
        arrastre: 0.45
      });

    case PoseZ.CORRER:
      /*
       * Un zombi corriendo no corre: se tira hacia adelante. Zancada más
       * larga y torso mucho más volcado, como si estuviera siempre a punto
       * de caerse. Eso es lo que lo hace amenazante y no atlético.
       */
      return {
        ...cicloZombi(f, {
          amplitud: 33,
          amplitudBrazo: 13,
          rebote: 0.055,
          arrastre: 0.7
        }),
        torso: 38,
        cabeza: -8
      };

    case PoseZ.ATACAR: {
      /*
       * El mordisco: se tira hacia adelante con los dos brazos.
       *
       * Los dos a la vez, al revés que el cuchillazo de Gus, que usa uno.
       * Es otra manera de separarlos: Gus golpea, el zombi se abalanza.
       */
      const p = posturaDeZombi();
      const salto = f < 0.3 ? f / 0.3 : 1 - (f - 0.3) / 0.7;
      p.torso = 26 + salto * 24;
      p.cabeza = -14 - salto * 16;
      p.brazoI = -74 - salto * 42;
      p.brazoD = -68 - salto * 48;
      p.codoI = 24 - salto * 20;
      p.codoD = 30 - salto * 24;
      p.cadera = -0.04 + salto * 0.06;
      return p;
    }

    case PoseZ.GOLPEADO: {
      /*
       * El latigazo hacia atras NO llega a enderezarlo.
       *
       * La primera version restaba 34 grados y lo dejaba en -8: por un
       * instante el zombi quedaba parado derecho, incluso inclinado hacia
       * atras, y en ese instante su silueta era la de una persona. Dura
       * dos decimas y es justo el momento en que el jugador lo esta
       * mirando, porque le acaba de pegar.
       *
       * Lo encontro la prueba que exige que NUNCA este erguido.
       */
      const p = posturaDeZombi();
      const k = Math.max(0, 1 - f * 2.2);
      p.torso = 26 - 14 * k;
      p.cabeza = -14 - 14 * k;
      p.brazoI = -74 + 40 * k;
      p.brazoD = -68 + 46 * k;
      p.torsoGiro = 18 * k;
      return p;
    }

    case PoseZ.MUERTO: {
      /*
       * Se desarma hacia adelante. Más desordenado que la caída de Gus: un
       * zombi que cae prolijo no se lee como un zombi que cae.
       */
      const p = posturaDeZombi();
      const caida = Math.min(1, fase);
      p.desplome = caida * 88;
      p.cadera = -0.04 - caida * 0.22;
      p.torso = 26 + caida * 16;
      p.torsoGiro = caida * 22;
      p.brazoI = -74 + caida * 96;
      p.brazoD = -68 + caida * 72;
      p.piernaI = caida * 26;
      p.piernaD = -caida * 9;
      p.cabeza = -14 - caida * 18;
      return p;
    }

    case PoseZ.QUIETO:
    default: {
      /*
       * Quieto, se balancea. Más que Gus, y más despacio: parado se nota
       * que no está del todo en equilibrio.
       */
      const p = posturaDeZombi();
      const r = Math.sin(f * Math.PI * 2);
      p.torso += r * 3;
      p.torsoGiro = r * 5;
      p.cabezaGiro += r * 4;
      p.cadera -= Math.abs(r) * 0.015;
      p.brazoI += r * 3;
      p.brazoD -= r * 2;
      return p;
    }
  }
}

/** Ciclos por segundo. */
export function velocidadDeCicloZombi(estado, velocidad = 0) {
  switch (estado) {
    case PoseZ.CAMINAR:
    case PoseZ.CORRER:
      // Zancada más corta que la de Gus: más pasos por metro.
      return Math.max(0.25, velocidad / 1.25);
    case PoseZ.QUIETO:
      return 0.22;
    default:
      return 1;
  }
}

export const GESTOS_Z = {
  [PoseZ.ATACAR]: 0.55,
  [PoseZ.GOLPEADO]: 0.4
};

export function esGestoZombi(estado) {
  return Object.prototype.hasOwnProperty.call(GESTOS_Z, estado);
}

export { mezclarPoses };
