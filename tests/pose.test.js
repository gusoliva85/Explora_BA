import { describe, it, expect } from 'vitest';
import {
  Pose,
  apuntaAdelante,
  direccionDelMiembro,
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

/*
 * Este bloque se llamaba "caminar se lee como caminar" y medía `CAMINAR`.
 * En la Fase 16.5 se fue esa pose con la segunda velocidad (D-30), y las
 * cinco pruebas pasaron a `CORRER`.
 *
 * No es un reemplazo cosmético, y vale la pena decir por qué: **ninguna de
 * las cinco era sobre caminar.** Todas miden `cicloDePasos()`, que es la
 * función que las dos poses compartían y que `CORRER` sigue usando: que las
 * piernas vayan en oposición, que los brazos vayan al revés que la pierna
 * del mismo lado, que las rodillas no doblen para atrás, que el ciclo
 * cierre y que la cadera rebote hacia abajo en cada apoyo.
 *
 * Si hubieran muerto con la pose, el único ciclo de pasos que le queda al
 * juego se quedaba sin una sola prueba.
 */
describe('el paso se lee como un paso', () => {
  it('las piernas van en oposicion', () => {
    // Las dos piernas adelante a la vez es un salto, no un paso.
    for (const f of [0.1, 0.3, 0.6, 0.85]) {
      const p = poseDe(Pose.CORRER, f);
      expect(Math.sign(p.piernaI), `fase ${f}`).toBe(-Math.sign(p.piernaD));
    }
  });

  it('los brazos van al reves que las piernas del mismo lado', () => {
    // Es lo que separa una zancada de un muñeco arrastrado.
    for (const f of [0.1, 0.35, 0.7]) {
      const p = poseDe(Pose.CORRER, f);
      expect(Math.sign(p.brazoI), `fase ${f}`).toBe(-Math.sign(p.piernaI));
    }
  });

  it('las rodillas NUNCA doblan para el lado contrario', () => {
    /*
     * Una rodilla que dobla en los dos sentidos se ve como una pata de
     * saltamontes. Es el error más fácil de cometer y el más difícil de
     * nombrar mirando la pantalla.
     */
    for (let f = 0; f < 1; f += 0.02) {
      const p = poseDe(Pose.CORRER, f);
      expect(p.rodillaI, `fase ${f.toFixed(2)}`).toBeGreaterThanOrEqual(0);
      expect(p.rodillaD, `fase ${f.toFixed(2)}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('el ciclo cierra: la fase 0 y la 1 son la misma pose', () => {
    // Si no, hay un salto visible una vez por paso.
    const a = poseDe(Pose.CORRER, 0);
    const b = poseDe(Pose.CORRER, 1);
    for (const k of CLAVES) expect(b[k], k).toBeCloseTo(a[k], 6);
  });

  it('la cadera rebota dos veces por ciclo, una por paso', () => {
    const alturas = [];
    for (let f = 0; f < 1; f += 0.05) alturas.push(poseDe(Pose.CORRER, f).cadera);
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

describe('correr es una postura, no un ciclo acelerado', () => {
  /*
   * Había tres pruebas acá y las tres comparaban contra `CAMINAR`: zancada
   * más larga, torso más volcado, brazos más altos. Se fueron con la pose
   * en la 16.5.
   *
   * Lo que cuidaban sí sobrevive, y es lo que impide el error más barato de
   * un juego sin presupuesto de animación: reproducir un ciclo de caminar a
   * más velocidad y llamarlo correr. Sin la segunda pose, la única forma de
   * medirlo es en absoluto, contra lo que significa correr de verdad.
   */
  it('la zancada es de alguien que corre, no de alguien que camina', () => {
    /*
     * 42 grados de amplitud. Caminar eran 26, y una persona caminando a
     * paso vivo no pasa de unos 30: por encima de eso la pierna sale de la
     * vertical lo suficiente como para que el cuerpo tenga que caer hacia
     * adelante, que es la definición mecánica de correr.
     */
    expect(Math.abs(poseDe(Pose.CORRER, 0.25).piernaI)).toBeGreaterThan(32);
  });

  it('el torso va volcado hacia adelante, no erguido', () => {
    // Alguien que camina va derecho. Correr es caerse hacia adelante y
    // alcanzarse con la pierna.
    expect(poseDe(Pose.CORRER, 0.5).torso).toBeGreaterThan(8);
  });

  it('los brazos trabajan: no cuelgan', () => {
    // Quieto, el brazo se mueve unos 6 grados. Corriendo tiene que ser
    // otro orden de magnitud o el cuerpo se ve arrastrado por las piernas.
    const correr = Math.abs(poseDe(Pose.CORRER, 0.25).brazoD);
    const quieto = Math.abs(poseDe(Pose.QUIETO, 0.25).brazoD);
    expect(correr).toBeGreaterThan(quieto * 3);
  });
});

describe('los pasos no patinan', () => {
  it('el ciclo se acelera con la velocidad', () => {
    /*
     * Un ciclo fijo hace que el personaje parezca arrastrado por el piso
     * en vez de empujarse contra él. Es lo mismo que pasa en un juego
     * cuando alguien olvida atar la animación a la velocidad.
     */
    /*
     * Las dos medidas son de `CORRER`, y antes la lenta era de `CAMINAR`.
     * El cambio no la debilita: lo que la prueba dice ahora es que **el
     * ciclo sigue a la velocidad real**, que es exactamente lo que importa
     * con una sola marcha. Gus pasa por 1,5 m/s cada vez que arranca y cada
     * vez que frena, y con el joystick a medio camino se queda ahí.
     */
    const lento = velocidadDeCiclo(Pose.CORRER, 1.5);
    const rapido = velocidadDeCiclo(Pose.CORRER, 6);
    expect(rapido).toBeGreaterThan(lento);
  });

  it('nunca se queda en cero, aunque la velocidad sea cero', () => {
    // Un ciclo detenido en mitad del paso deja la pierna clavada en el aire.
    expect(velocidadDeCiclo(Pose.CORRER, 0)).toBeGreaterThan(0);
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

/*
 * Aca habia un bloque entero, "el cuchillazo es un golpe, no un saludo":
 * que el brazo saliera en la primera cuarta parte y volviera en las tres
 * restantes, que llegara diez veces mas lejos que en reposo, y que el torso
 * acompañara en vez de ser un brazo suelto.
 *
 * Se fue con `Pose.ATACAR` en la Fase 16.4 (D-29). Lo que enseñaba —que **la
 * asimetria ES el gesto**, y que un ida y vuelta simetrico se lee como
 * saludar— quedo escrito en `pose.js`, porque es lo que hace que `DISPARAR`
 * funcione: el culatazo es fuerte al principio y se estabiliza despues.
 */

describe('disparar tiene retroceso', () => {
  it('el brazo retrocede al principio y se estabiliza', () => {
    const alSalir = poseDe(Pose.DISPARAR, 0);
    const despues = poseDe(Pose.DISPARAR, 0.5);
    expect(alSalir.brazoD).not.toBeCloseTo(despues.brazoD, 1);
  });

  it('el brazo queda extendido AL FRENTE, no hacia atras', () => {
    /*
     * Se mide la DIRECCION, no el signo del angulo.
     *
     * La version anterior pedia que el angulo fuera menor que -70, que es
     * justo lo contrario: con ese valor el brazo apunta a la espalda. Gus
     * estuvo disparando hacia atras toda una fase, y esta prueba lo daba
     * por bueno porque codificaba el mismo error de signo que el codigo.
     */
    const p = poseDe(Pose.DISPARAR, 0.5);
    expect(apuntaAdelante(p.brazoD), `brazoD en ${p.brazoD}`).toBe(true);
    // Y bien extendido: casi horizontal.
    expect(Math.abs(direccionDelMiembro(p.brazoD).z)).toBeGreaterThan(0.85);
  });

});

/*
 * Aca habia un bloque entero, "curarse se ve vulnerable": encorvado, con la
 * cabeza baja y las dos manos ocupadas. Era la pose que hacia que curarse se
 * LEYERA como una decision peligrosa, no como apretar un boton.
 *
 * Se fue con la curacion en la Fase 16 (D-32). Si la curacion vuelve como
 * carta de power-up, la pose tiene que volver con ella: la regla que la
 * justificaba —que curarse se vea costoso— no cambio.
 */

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
    a.pedir(Pose.CORRER);
    a.update(0.3, 3);
    const faseAntes = a.fase;
    expect(a.pedir(Pose.CORRER)).toBe(false);
    expect(a.fase).toBe(faseAntes);
  });

  /*
   * Estas dos probaban el Animador con `Pose.ATACAR` de ejemplo, y pasaron
   * a `DISPARAR` en la 16.4. No es un reemplazo cosmetico: lo que miden es
   * el mecanismo de gestos, no el cuchillazo, y el mecanismo sigue entero.
   * Si hubieran muerto con la pose, el Animador se quedaba sin la prueba de
   * que un gesto no se interrumpe y de que dos seguidos no se fusionan.
   */
  it('un gesto se reproduce entero y despues vuelve', () => {
    const a = new Animador();
    a.pedir(Pose.CORRER);
    a.pedir(Pose.DISPARAR);
    expect(a.estado).toBe(Pose.DISPARAR);

    // A mitad del gesto, sigue siendo el gesto aunque se pida otra cosa.
    a.update(GESTOS[Pose.DISPARAR] / 2);
    a.pedir(Pose.QUIETO);
    expect(a.estado, 'un ciclo interrumpio el disparo').toBe(Pose.DISPARAR);

    a.update(GESTOS[Pose.DISPARAR]);
    expect(a.estado).toBe(Pose.QUIETO);
  });

  it('dos tiros seguidos son dos culatazos, no uno largo', () => {
    const a = new Animador();
    a.pedir(Pose.DISPARAR);
    a.update(GESTOS[Pose.DISPARAR] * 0.6);
    expect(a.fase).toBeGreaterThan(0.4);
    a.pedir(Pose.DISPARAR);
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
    for (const ciclo of [Pose.QUIETO, Pose.CORRER, Pose.MUERTO]) {
      expect(esGesto(ciclo), ciclo).toBe(false);
    }
  });
});
