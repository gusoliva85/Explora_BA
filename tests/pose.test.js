import { describe, it, expect } from 'vitest';
import {
  Pose,
  poseNeutral,
  poseDe,
  mezclarPoses,
  velocidadDeCiclo,
  esGesto,
  GESTOS,
  MEZCLA,
  Animador
} from '../src/characters/pose.js';

/**
 * ===========================================================================
 * POSES Y ANIMACION
 * ===========================================================================
 * Una animación mal hecha se ve rara pero no se puede describir, así que es
 * de las cosas que se "arreglan" moviendo números al azar. Acá están las
 * propiedades que hacen que un caminar se lea como un caminar, escritas
 * como condiciones que se cumplen o no.
 */

const CLAVES = Object.keys(poseNeutral());

describe('la pose neutral', () => {
  it('es todo cero: las demas son variaciones de esta', () => {
    for (const [k, v] of Object.entries(poseNeutral())) {
      expect(v, k).toBe(0);
    }
  });

  it('toda pose devuelve exactamente las mismas articulaciones', () => {
    /*
     * Si un estado se olvidara de una articulación, al mezclar con otro
     * aparecería un `NaN` y el personaje se desarmaría sin que nada tire
     * un error. Es el tipo de bug que se ve en pantalla y no en la consola.
     */
    for (const estado of Object.values(Pose)) {
      const p = poseDe(estado, 0.3);
      expect(Object.keys(p).sort(), estado).toEqual(CLAVES.sort());
      for (const k of CLAVES) {
        expect(Number.isFinite(p[k]), `${estado}.${k}`).toBe(true);
      }
    }
  });
});

describe('caminar se lee como caminar', () => {
  it('las piernas van en oposicion', () => {
    // Las dos piernas adelante a la vez es un salto, no un paso.
    for (const f of [0.1, 0.3, 0.6, 0.85]) {
      const p = poseDe(Pose.CAMINAR, f);
      expect(Math.sign(p.piernaI), `fase ${f}`).toBe(-Math.sign(p.piernaD));
    }
  });

  it('los brazos van al reves que las piernas del mismo lado', () => {
    // Es lo que separa un caminar de un muñeco arrastrado.
    for (const f of [0.1, 0.35, 0.7]) {
      const p = poseDe(Pose.CAMINAR, f);
      expect(Math.sign(p.brazoI), `fase ${f}`).toBe(-Math.sign(p.piernaI));
    }
  });

  it('las rodillas NUNCA doblan para el lado contrario', () => {
    /*
     * Una rodilla que dobla en los dos sentidos se ve como una pata de
     * saltamontes. Es el error más fácil de cometer y el más difícil de
     * nombrar mirando la pantalla.
     */
    for (const estado of [Pose.CAMINAR, Pose.CORRER]) {
      for (let f = 0; f < 1; f += 0.02) {
        const p = poseDe(estado, f);
        expect(p.rodillaI, `${estado} fase ${f.toFixed(2)}`).toBeGreaterThanOrEqual(0);
        expect(p.rodillaD, `${estado} fase ${f.toFixed(2)}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('el ciclo cierra: la fase 0 y la 1 son la misma pose', () => {
    // Si no, hay un salto visible una vez por paso.
    const a = poseDe(Pose.CAMINAR, 0);
    const b = poseDe(Pose.CAMINAR, 1);
    for (const k of CLAVES) expect(b[k], k).toBeCloseTo(a[k], 6);
  });

  it('la cadera rebota dos veces por ciclo, una por paso', () => {
    const alturas = [];
    for (let f = 0; f < 1; f += 0.05) alturas.push(poseDe(Pose.CAMINAR, f).cadera);
    // Dos mínimos en el ciclo: la cadera baja en cada apoyo.
    let minimos = 0;
    for (let i = 1; i < alturas.length - 1; i++) {
      if (alturas[i] < alturas[i - 1] && alturas[i] < alturas[i + 1]) minimos++;
    }
    expect(minimos).toBeGreaterThanOrEqual(1);
    // Y nunca sube por encima de la neutral: el rebote es hacia abajo.
    expect(Math.max(...alturas)).toBeLessThanOrEqual(0.0001);
  });
});

describe('correr no es caminar mas rapido', () => {
  /*
   * Es otra postura. Si sólo se acelerara el ciclo, el personaje se vería
   * como alguien caminando en cámara rápida, que es el efecto más barato y
   * más obvio de un juego sin presupuesto de animación.
   */
  it('la zancada es mas larga', () => {
    const caminar = poseDe(Pose.CAMINAR, 0.25);
    const correr = poseDe(Pose.CORRER, 0.25);
    expect(Math.abs(correr.piernaI)).toBeGreaterThan(Math.abs(caminar.piernaI) * 1.4);
  });

  it('el torso va mas volcado hacia adelante', () => {
    expect(poseDe(Pose.CORRER, 0.5).torso).toBeGreaterThan(poseDe(Pose.CAMINAR, 0.5).torso);
  });

  it('los brazos suben mas', () => {
    const caminar = poseDe(Pose.CAMINAR, 0.25);
    const correr = poseDe(Pose.CORRER, 0.25);
    expect(Math.abs(correr.brazoD)).toBeGreaterThan(Math.abs(caminar.brazoD));
  });
});

describe('los pasos no patinan', () => {
  it('el ciclo se acelera con la velocidad', () => {
    /*
     * Un ciclo fijo hace que el personaje parezca arrastrado por el piso
     * en vez de empujarse contra él. Es lo mismo que pasa en un juego
     * cuando alguien olvida atar la animación a la velocidad.
     */
    const lento = velocidadDeCiclo(Pose.CAMINAR, 1.5);
    const rapido = velocidadDeCiclo(Pose.CORRER, 6);
    expect(rapido).toBeGreaterThan(lento);
  });

  it('nunca se queda en cero, aunque la velocidad sea cero', () => {
    // Un ciclo detenido en mitad del paso deja la pierna clavada en el aire.
    expect(velocidadDeCiclo(Pose.CAMINAR, 0)).toBeGreaterThan(0);
  });

  it('quieto tiene su propio ritmo, lento', () => {
    expect(velocidadDeCiclo(Pose.QUIETO)).toBeLessThan(1);
    expect(velocidadDeCiclo(Pose.QUIETO)).toBeGreaterThan(0);
  });
});

describe('quieto no es inmovil', () => {
  it('se mueve, aunque poco', () => {
    // Un personaje perfectamente congelado se lee como un error del juego.
    const a = poseDe(Pose.QUIETO, 0);
    const b = poseDe(Pose.QUIETO, 0.5);
    const cambio = CLAVES.reduce((n, k) => n + Math.abs(b[k] - a[k]), 0);
    expect(cambio).toBeGreaterThan(0);
  });

  it('pero MUY poco: son grados, no decenas', () => {
    for (let f = 0; f < 1; f += 0.05) {
      const p = poseDe(Pose.QUIETO, f);
      expect(Math.abs(p.torso), `fase ${f.toFixed(2)}`).toBeLessThan(8);
      expect(Math.abs(p.piernaI)).toBeLessThan(2);
    }
  });
});

describe('el cuchillazo es un golpe, no un saludo', () => {
  it('sale rapido y vuelve despacio', () => {
    /*
     * La asimetría ES el gesto. Un ida y vuelta simétrico se ve como
     * saludar.
     */
    const salida = poseDe(Pose.ATACAR, 0.25);
    const mitadVuelta = poseDe(Pose.ATACAR, 0.6);
    // En la primera cuarta parte ya llegó al extremo.
    expect(Math.abs(salida.brazoD)).toBeGreaterThan(Math.abs(mitadVuelta.brazoD));
  });

  it('el brazo derecho llega mucho mas lejos que en reposo', () => {
    const quieto = poseDe(Pose.QUIETO, 0);
    const golpe = poseDe(Pose.ATACAR, 0.25);
    expect(Math.abs(golpe.brazoD)).toBeGreaterThan(Math.abs(quieto.brazoD) * 10);
  });

  it('el torso acompaña: no es solo un brazo suelto', () => {
    expect(Math.abs(poseDe(Pose.ATACAR, 0.25).torsoGiro)).toBeGreaterThan(10);
  });
});

describe('disparar tiene retroceso', () => {
  it('el brazo retrocede al principio y se estabiliza', () => {
    const alSalir = poseDe(Pose.DISPARAR, 0);
    const despues = poseDe(Pose.DISPARAR, 0.5);
    expect(alSalir.brazoD).not.toBeCloseTo(despues.brazoD, 1);
  });

  it('el brazo queda extendido al frente, no colgando', () => {
    // Noventa grados aproximadamente: apuntando.
    expect(poseDe(Pose.DISPARAR, 0.5).brazoD).toBeLessThan(-70);
  });
});

describe('curarse se ve vulnerable', () => {
  it('encorvado y con la cabeza baja', () => {
    // Tiene que LEERSE que no está mirando lo que pasa alrededor.
    const p = poseDe(Pose.CURARSE, 0.5);
    expect(p.torso).toBeGreaterThan(15);
    expect(p.cabeza).toBeLessThan(-10);
  });

  it('las dos manos ocupadas', () => {
    const p = poseDe(Pose.CURARSE, 0.5);
    expect(Math.abs(p.codoI)).toBeGreaterThan(50);
    expect(Math.abs(p.codoD)).toBeGreaterThan(50);
  });
});

describe('morirse pasa una sola vez', () => {
  it('el desplome avanza y se queda', () => {
    /*
     * Un muerto que repite su caída en bucle es lo primero que delata que
     * un juego está hecho de ciclos.
     */
    const aMitad = poseDe(Pose.MUERTO, 0.5);
    const alFinal = poseDe(Pose.MUERTO, 1);
    const masTarde = poseDe(Pose.MUERTO, 3);
    expect(alFinal.desplome).toBeGreaterThan(aMitad.desplome);
    expect(masTarde.desplome).toBe(alFinal.desplome);
  });

  it('termina tumbado, no parado', () => {
    expect(poseDe(Pose.MUERTO, 1).desplome).toBeGreaterThan(80);
  });
});

describe('mezclar poses', () => {
  it('a y b en los extremos', () => {
    /*
     * Se compara con tolerancia y no con igualdad exacta: `a + (b - a) * 1`
     * no es bit a bit `b` en punto flotante. Exigir igualdad exacta aca
     * seria probar la aritmetica de JavaScript, no la mezcla.
     */
    const a = poseDe(Pose.QUIETO, 0);
    const b = poseDe(Pose.CORRER, 0.5);
    const enCero = mezclarPoses(a, b, 0);
    const enUno = mezclarPoses(a, b, 1);
    for (const k of CLAVES) {
      expect(enCero[k], k).toBeCloseTo(a[k], 9);
      expect(enUno[k], k).toBeCloseTo(b[k], 9);
    }
  });

  it('en el medio queda en el medio', () => {
    const a = poseNeutral();
    const b = { ...poseNeutral(), torso: 40 };
    expect(mezclarPoses(a, b, 0.5).torso).toBeCloseTo(20, 6);
  });

  it('un factor fuera de rango se acota', () => {
    const a = poseNeutral();
    const b = { ...poseNeutral(), torso: 40 };
    expect(mezclarPoses(a, b, 5).torso).toBe(40);
    expect(mezclarPoses(a, b, -3).torso).toBe(0);
  });
});

describe('el animador', () => {
  it('arranca quieto', () => {
    expect(new Animador().estado).toBe(Pose.QUIETO);
  });

  it('un ciclo cambia enseguida', () => {
    const a = new Animador();
    expect(a.pedir(Pose.CORRER)).toBe(true);
    expect(a.estado).toBe(Pose.CORRER);
  });

  it('pedir el mismo ciclo dos veces no reinicia nada', () => {
    const a = new Animador();
    a.pedir(Pose.CAMINAR);
    a.update(0.3, 3);
    const faseAntes = a.fase;
    expect(a.pedir(Pose.CAMINAR)).toBe(false);
    expect(a.fase).toBe(faseAntes);
  });

  it('un gesto se reproduce entero y despues vuelve', () => {
    const a = new Animador();
    a.pedir(Pose.CORRER);
    a.pedir(Pose.ATACAR);
    expect(a.estado).toBe(Pose.ATACAR);

    // A mitad del gesto, sigue siendo el gesto aunque se pida otra cosa.
    a.update(GESTOS[Pose.ATACAR] / 2);
    a.pedir(Pose.QUIETO);
    expect(a.estado, 'un ciclo interrumpio el cuchillazo').toBe(Pose.ATACAR);

    a.update(GESTOS[Pose.ATACAR]);
    expect(a.estado).toBe(Pose.QUIETO);
  });

  it('dos ataques seguidos son dos golpes, no uno largo', () => {
    const a = new Animador();
    a.pedir(Pose.ATACAR);
    a.update(GESTOS[Pose.ATACAR] * 0.6);
    expect(a.fase).toBeGreaterThan(0.4);
    a.pedir(Pose.ATACAR);
    expect(a.fase).toBe(0);
  });

  it('la muerte no vuelve a empezar', () => {
    const a = new Animador();
    a.pedir(Pose.MUERTO);
    for (let i = 0; i < 100; i++) a.update(0.1);
    expect(a.fase).toBe(1);
    expect(a.pose().desplome).toBeGreaterThan(80);
  });

  it('mezcla el cambio en vez de saltar', () => {
    /*
     * Sin mezcla, pasar de caminar a quieto clava las piernas en mitad del
     * paso. Se comprueba que a mitad de la mezcla la pose NO sea todavía
     * la nueva.
     */
    const a = new Animador();
    a.pedir(Pose.CORRER);
    a.update(0.25, 6);
    const corriendo = a.pose();

    a.pedir(Pose.QUIETO);
    a.update(MEZCLA / 2);
    const enMedio = a.pose();
    const quietoPuro = poseDe(Pose.QUIETO, a.fase);

    const dCorriendo = Math.abs(enMedio.piernaI - corriendo.piernaI);
    const dQuieto = Math.abs(enMedio.piernaI - quietoPuro.piernaI);
    expect(dCorriendo, 'salto directo a la pose nueva').toBeGreaterThan(0);
    expect(dQuieto, 'no se movio nada hacia la pose nueva').toBeGreaterThan(0);
  });

  it('la mezcla termina', () => {
    const a = new Animador();
    a.pedir(Pose.CORRER);
    a.update(MEZCLA * 2, 6);
    expect(a.mezclando).toBe(0);
  });

  it('los gestos declarados duran algo razonable', () => {
    for (const [gesto, dura] of Object.entries(GESTOS)) {
      expect(esGesto(gesto), gesto).toBe(true);
      expect(dura, gesto).toBeGreaterThan(0.1);
      expect(dura, gesto).toBeLessThan(3);
    }
  });

  it('los ciclos NO son gestos', () => {
    for (const ciclo of [Pose.QUIETO, Pose.CAMINAR, Pose.CORRER, Pose.MUERTO]) {
      expect(esGesto(ciclo), ciclo).toBe(false);
    }
  });
});
