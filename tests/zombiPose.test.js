import { describe, it, expect } from 'vitest';
import {
  PoseZ,
  posturaDeZombi,
  poseZombiDe,
  velocidadDeCicloZombi,
  GESTOS_Z,
  esGestoZombi,
  DESFASE
} from '../src/characters/zombiePose.js';
import {
  Pose,
  poseDe,
  poseNeutral,
  Animador,
  apuntaAdelante,
  direccionDelMiembro
} from '../src/characters/pose.js';
import { MEDIDAS as GUS } from '../src/characters/gus.js';
import { ESCALA, separacion, saturacion } from '../src/art/styleGuide.js';
import { COLORS } from '../src/world/palette.js';

/**
 * ===========================================================================
 * EL ZOMBI SE DISTINGUE DE GUS
 * ===========================================================================
 * Es el criterio de salida de la fase: *"¿se distingue a Gus de los zombis
 * de un vistazo, a distancia de cámara?"*.
 *
 * A veinte metros no se ven ni la cara ni la ropa: lo que llega es la
 * silueta y el movimiento. Así que eso es lo que se prueba, con números.
 */

const CLAVES = Object.keys(poseNeutral());

describe('la postura base ya los separa', () => {
  it('el zombi NUNCA esta erguido', () => {
    /*
     * Todas sus poses parten de una postura encorvada en vez de la neutral
     * humana. Si alguna lo devolviera a la vertical, aunque sea por un
     * instante, en ese instante sería indistinguible de una persona.
     */
    for (const estado of Object.values(PoseZ)) {
      for (const f of [0, 0.25, 0.5, 0.75]) {
        const p = poseZombiDe(estado, f);
        expect(p.torso, `${estado} en fase ${f}`).toBeGreaterThan(10);
      }
    }
  });

  it('lleva los brazos ADELANTE, no colgando', () => {
    // Es el rasgo que lo identifica desde la cámara cenital, que es el
    // único ángulo desde el que se lo va a ver.
    const p = posturaDeZombi();
    // Se mide la DIRECCION, no el signo: medir el signo fue lo que dejo a
    // los zombis corriendo con los brazos a la espalda.
    expect(apuntaAdelante(p.brazoI), `brazoI en ${p.brazoI}`).toBe(true);
    expect(apuntaAdelante(p.brazoD), `brazoD en ${p.brazoD}`).toBe(true);
    expect(Math.abs(direccionDelMiembro(p.brazoI).z)).toBeGreaterThan(0.8);
  });

  it('Gus NO lleva los brazos adelante estando quieto', () => {
    // El contraste es el punto: si los dos hicieran lo mismo, no habría
    // nada que distinguir.
    const g = poseDe(Pose.QUIETO, 0.3);
    expect(Math.abs(g.brazoI)).toBeLessThan(20);
    expect(Math.abs(g.brazoD)).toBeLessThan(20);
  });

  it('la cabeza va caida hacia un lado', () => {
    const p = posturaDeZombi();
    expect(p.cabeza).toBeLessThan(-5);
    expect(Math.abs(p.cabezaGiro)).toBeGreaterThan(5);
  });

  it('toda pose de zombi devuelve las mismas articulaciones', () => {
    for (const estado of Object.values(PoseZ)) {
      const p = poseZombiDe(estado, 0.4);
      expect(Object.keys(p).sort(), estado).toEqual(CLAVES.sort());
      for (const k of CLAVES) expect(Number.isFinite(p[k]), `${estado}.${k}`).toBe(true);
    }
  });
});

describe('el caminar es asimetrico: arrastra una pierna', () => {
  it('los dos lados NO estan a media fase exacta', () => {
    /*
     * LA asimetría. Un humano tiene los dos lados a 0,5 de fase; el zombi
     * arrastra uno, así que un lado llega tarde. Es lo primero que el ojo
     * marca como "algo anda mal" sin poder decir qué.
     *
     * Si alguien "arregla" esto porque le parece un error, esta prueba se
     * lo dice.
     */
    expect(DESFASE).toBeGreaterThan(0.05);
    expect(DESFASE, 'tanto desfase ya no parece que cojea, parece roto').toBeLessThan(0.2);
  });

  it('una pierna se levanta menos que la otra', () => {
    let maxI = 0;
    let maxD = 0;
    for (let f = 0; f < 1; f += 0.02) {
      const p = poseZombiDe(PoseZ.CAMINAR, f);
      maxI = Math.max(maxI, Math.abs(p.piernaI));
      maxD = Math.max(maxD, Math.abs(p.piernaD));
    }
    expect(maxD, 'las dos piernas se mueven igual: camina como una persona').toBeLessThan(
      maxI * 0.85
    );
  });

  it('las rodillas nunca doblan para el lado contrario', () => {
    for (const estado of [PoseZ.CAMINAR, PoseZ.CORRER]) {
      for (let f = 0; f < 1; f += 0.02) {
        const p = poseZombiDe(estado, f);
        expect(p.rodillaI, `${estado} ${f.toFixed(2)}`).toBeGreaterThanOrEqual(0);
        expect(p.rodillaD, `${estado} ${f.toFixed(2)}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('los brazos NO contrapesan las piernas', () => {
    /*
     * Un humano contrapesa: brazo izquierdo con pierna derecha. El zombi
     * no contrapesa nada, lleva los brazos tiesos adelante. Es la mitad de
     * por qué se ve mal aunque uno no sepa explicarlo.
     *
     * Se mide como amplitud: la del brazo tiene que ser mucho menor que la
     * de la pierna, al revés que en Gus donde son comparables.
     */
    const amplitud = (estado, clave, poseFn) => {
      let min = Infinity;
      let max = -Infinity;
      for (let f = 0; f < 1; f += 0.02) {
        const v = poseFn(estado, f)[clave];
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      return max - min;
    };

    const zBrazo = amplitud(PoseZ.CAMINAR, 'brazoI', poseZombiDe);
    const zPierna = amplitud(PoseZ.CAMINAR, 'piernaI', poseZombiDe);
    expect(zBrazo / zPierna, 'el zombi contrapesa como una persona').toBeLessThan(0.55);

    const gBrazo = amplitud(Pose.CAMINAR, 'brazoI', poseDe);
    const gPierna = amplitud(Pose.CAMINAR, 'piernaI', poseDe);
    expect(gBrazo / gPierna, 'Gus deberia contrapesar bastante').toBeGreaterThan(0.6);
  });
});

describe('correr: se tira hacia adelante', () => {
  it('el torso va mucho mas volcado que caminando', () => {
    // Como si estuviera siempre a punto de caerse. Eso es lo que lo hace
    // amenazante y no atlético.
    const caminar = poseZombiDe(PoseZ.CAMINAR, 0.4).torso;
    const correr = poseZombiDe(PoseZ.CORRER, 0.4).torso;
    expect(correr).toBeGreaterThan(caminar + 8);
  });

  it('se vuelca mas que Gus corriendo', () => {
    expect(poseZombiDe(PoseZ.CORRER, 0.4).torso).toBeGreaterThan(
      poseDe(Pose.CORRER, 0.4).torso
    );
  });
});

describe('atacar: se abalanza con los dos brazos', () => {
  it('usa LOS DOS brazos, al reves que el cuchillazo de Gus', () => {
    // Gus golpea con uno; el zombi se tira encima. Es otra manera de
    // separarlos.
    const z = poseZombiDe(PoseZ.ATACAR, 0.3);
    expect(apuntaAdelante(z.brazoI)).toBe(true);
    expect(apuntaAdelante(z.brazoD)).toBe(true);
    // Los dos pasan de la horizontal: se tira encima.
    expect(z.brazoI).toBeGreaterThan(100);
    expect(z.brazoD).toBeGreaterThan(100);

    const g = poseDe(Pose.ATACAR, 0.25);
    // En Gus, un brazo va muy lejos y el otro no.
    expect(Math.abs(g.brazoD)).toBeGreaterThan(Math.abs(g.brazoI) * 3);
  });

  it('el cuerpo entero acompaña', () => {
    const quieto = poseZombiDe(PoseZ.QUIETO, 0);
    const ataque = poseZombiDe(PoseZ.ATACAR, 0.3);
    expect(ataque.torso).toBeGreaterThan(quieto.torso + 15);
  });
});

describe('morirse', () => {
  it('se desarma una sola vez y se queda', () => {
    const aMitad = poseZombiDe(PoseZ.MUERTO, 0.5);
    const final = poseZombiDe(PoseZ.MUERTO, 1);
    const despues = poseZombiDe(PoseZ.MUERTO, 4);
    expect(final.desplome).toBeGreaterThan(aMitad.desplome);
    expect(despues.desplome).toBe(final.desplome);
  });

  it('cae mas desordenado que Gus', () => {
    // Un zombi que cae prolijo no se lee como un zombi que cae.
    expect(Math.abs(poseZombiDe(PoseZ.MUERTO, 1).torsoGiro)).toBeGreaterThan(
      Math.abs(poseDe(Pose.MUERTO, 1).torsoGiro)
    );
  });
});

describe('el ritmo', () => {
  it('da mas pasos por metro que Gus: zancada mas corta', () => {
    expect(velocidadDeCicloZombi(PoseZ.CAMINAR, 3)).toBeGreaterThan(0);
    // A la misma velocidad, el zombi cicla más rápido.
    const zombi = velocidadDeCicloZombi(PoseZ.CAMINAR, 3);
    expect(zombi).toBeGreaterThan(3 / 1.7);
  });

  it('quieto, se balancea mas lento que Gus', () => {
    expect(velocidadDeCicloZombi(PoseZ.QUIETO)).toBeLessThan(0.35);
  });
});

describe('el animador funciona con el repertorio del zombi', () => {
  const crear = () =>
    new Animador(PoseZ.QUIETO, {
      poseDe: poseZombiDe,
      gestos: GESTOS_Z,
      velocidadDeCiclo: velocidadDeCicloZombi,
      reposo: PoseZ.QUIETO,
      muerte: PoseZ.MUERTO
    });

  it('usa las poses del zombi, no las de Gus', () => {
    const a = crear();
    expect(a.pose().torso).toBeGreaterThan(10);
  });

  it('al terminar un gesto vuelve al reposo DEL ZOMBI', () => {
    /*
     * Sin el repertorio, al terminar un mordisco volvía al QUIETO de Gus,
     * que no existe en su tabla: se quedaba en pose neutral humana, parado
     * derecho e indistinguible de una persona.
     */
    const a = crear();
    a.pedir(PoseZ.ATACAR);
    a.update(GESTOS_Z[PoseZ.ATACAR] + 0.01);
    expect(a.estado).toBe(PoseZ.QUIETO);
    expect(a.pose().torso).toBeGreaterThan(10);
  });

  it('la muerte no vuelve a empezar', () => {
    const a = crear();
    a.pedir(PoseZ.MUERTO);
    for (let i = 0; i < 60; i++) a.update(0.1);
    expect(a.fase).toBe(1);
  });

  it('reconoce sus propios gestos y no los de Gus', () => {
    const a = crear();
    expect(a.esGesto(PoseZ.ATACAR)).toBe(true);
    expect(a.esGesto(PoseZ.CAMINAR)).toBe(false);
    expect(esGestoZombi(PoseZ.GOLPEADO)).toBe(true);
  });
});

describe('la silueta: medidas contra las de Gus', () => {
  it('el zombi es mas bajo', () => {
    expect(ESCALA.zombi).toBeLessThan(GUS.alto);
  });

  it('tiene los hombros MUCHO mas angostos', () => {
    /*
     * Gus tiene un trapecio ancho; el zombi, hombros caídos. A la
     * distancia de cámara esa diferencia de ancho es lo primero que separa
     * las dos siluetas, antes que el color.
     */
    const ANCHO_HOMBROS_ZOMBI = 0.38;
    expect(ANCHO_HOMBROS_ZOMBI).toBeLessThan(GUS.anchoHombros * 0.8);
  });
});

describe('los colores del zombi', () => {
  const PIEL_ZOMBI = [0.55, 0.58, 0.38];

  it('el verde enfermizo NO es el verde de los arboles', () => {
    /*
     * Si compartieran tono, un zombi parado contra un cantero
     * desaparecería. Es la misma regla de siempre: dos cosas que se tocan
     * no pueden compartir valor.
     */
    for (const hoja of COLORS.leaves) {
      expect(separacion(PIEL_ZOMBI, hoja), `contra ${hoja}`).toBeGreaterThan(0.08);
    }
  });

  it('se separa del asfalto', () => {
    expect(separacion(PIEL_ZOMBI, COLORS.asphalt)).toBeGreaterThan(0.1);
  });

  it('no compite con lo de mision', () => {
    expect(saturacion(PIEL_ZOMBI)).toBeLessThan(saturacion(COLORS.checkpoint));
  });
});
