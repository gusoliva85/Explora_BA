import { describe, it, expect } from 'vitest';
import { WeaponController, EstadoArma } from '../src/combat/weaponController.js';
import { blancoDelRayo, dispersar, rumboAsistido } from '../src/combat/ballistics.js';
import { WEAPONS, ZOMBIE_STANDARD, PLAYER } from '../src/config/balance.js';
import { rumboHacia, dirDeRumbo } from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * LA PISTOLA
 * ===========================================================================
 * El disparo es la parte del combate que mas se equivoca en silencio. Un
 * tiro que atraviesa una pared, uno que le pega al zombi de atras en vez
 * del de adelante, o uno que gasta dos balas, se ven todos iguales en
 * pantalla: un fogonazo y un zombi que se cae.
 *
 * Como en el resto del combate, los rumbos NO se escriben como numeros: se
 * le piden al convenio del proyecto. Un `0` escrito a mano fue lo que dejo
 * pasar que el cuchillo golpeara para atras durante toda una fase.
 *
 * Desde la Fase 16.4 esta es **la unica arma del juego** (D-29), asi que
 * este archivo dejo de ser "las pruebas de una de las tres armas" y paso a
 * ser las del combate entero. Las comparaciones contra el cuchillo —que
 * hacia menos ruido, que esperaba mas entre golpes— se fueron con el, y
 * donde decian algo que importa quedo medido contra el zombi, que es lo que
 * sigue existiendo.
 */

const P = WEAPONS.pistol;

const objetivo = (x, z, vivo = true) => ({ posicion: { x, z }, vivo });
const ORIGEN = { x: 0, z: 0 };
/** Rumbo "hacia el norte del mapa": es la direccion de las pruebas. */
const FRENTE = rumboHacia(0, -1);
/** Punto a `d` metros del origen en la direccion `rumbo`. */
const adelante = (d, rumbo = FRENTE) => {
  const dir = dirDeRumbo(rumbo);
  return { x: dir.x * d, z: dir.z * d };
};

/** Pone a `d` metros, justo en el eje del disparo. */
const blanco = (d, rumbo = FRENTE) => {
  const p = adelante(d, rumbo);
  return objetivo(p.x, p.z);
};

/**
 * El arma lista para disparar, con los callbacks capturados.
 *
 * Habia un `armaInicial: 'pistol'` y se fue en la 16.4: con una sola arma,
 * el controlador la lee de la tabla y no hay nada que pedirle.
 */
const armar = (opt = {}) => {
  const ev = { disparos: [], golpes: [], fallos: [], ruidos: [] };
  const w = new WeaponController({
    alDisparar: (i) => ev.disparos.push(i),
    alGolpear: (i) => ev.golpes.push(i),
    alFallar: (i) => ev.fallos.push(i),
    alHacerRuido: (i) => ev.ruidos.push(i),
    ...opt
  });
  return { w, ev };
};

/** Aprieta el gatillo y deja que el disparo salga. */
const disparar = (w, objetivos = [], pos = ORIGEN, rumbo = FRENTE) => {
  const salio = w.atacar(pos, rumbo, objetivos);
  w.update(P.windup + 0.001, pos, rumbo, objetivos);
  return salio;
};

/** Deja pasar el tiempo suficiente para volver a estar listo. */
const esperarCiclo = (w, pos = ORIGEN, rumbo = FRENTE) => {
  w.update(P.cooldown + 0.01, pos, rumbo, []);
};

/* =========================================================================
   EL RAYO
   ========================================================================= */

describe('a quien le pega el rayo', () => {
  it('le pega a un zombi de frente y dentro del alcance', () => {
    const z = blanco(10);
    const r = blancoDelRayo(ORIGEN, FRENTE, [z], { alcance: P.range });
    expect(r.objetivo).toBe(z);
    expect(r.distancia).toBeCloseTo(10, 3);
  });

  it('no llega mas alla de su alcance', () => {
    const r = blancoDelRayo(ORIGEN, FRENTE, [blanco(P.range + 2)], { alcance: P.range });
    expect(r.objetivo).toBeNull();
  });

  it('no le pega a lo que esta a la espalda', () => {
    const r = blancoDelRayo(ORIGEN, FRENTE, [blanco(-8)], { alcance: P.range });
    expect(r.objetivo).toBeNull();
  });

  it('le pega al mas cercano, no al mas lejano', () => {
    /*
     * El error clasico seria quedarse con el ultimo que cumple la
     * condicion. Se ve igual en pantalla —un zombi se cae— pero rompe la
     * unica ventaja de un pasillo angosto.
     */
    const cerca = blanco(4);
    const lejos = blanco(14);
    const r = blancoDelRayo(ORIGEN, FRENTE, [lejos, cerca], { alcance: P.range });
    expect(r.objetivo).toBe(cerca);
  });

  it('un zombi tapa al que viene detras', () => {
    const primero = blanco(5);
    const segundo = blanco(6);
    const r = blancoDelRayo(ORIGEN, FRENTE, [primero, segundo], { alcance: P.range });
    expect(r.objetivo).toBe(primero);
  });

  it('ignora a los muertos, y le pega al vivo de atras', () => {
    const muerto = { ...blanco(5), vivo: false };
    const vivo = blanco(9);
    const r = blancoDelRayo(ORIGEN, FRENTE, [muerto, vivo], { alcance: P.range });
    expect(r.objetivo).toBe(vivo);
  });

  it('le pasa al lado a lo que no esta en el eje del tiro', () => {
    const dir = dirDeRumbo(FRENTE);
    // Diez metros adelante, pero dos metros al costado.
    const costado = { x: -dir.z * 2 + dir.x * 10, z: dir.x * 2 + dir.z * 10 };
    const r = blancoDelRayo(ORIGEN, FRENTE, [objetivo(costado.x, costado.z)], {
      alcance: P.range,
      radioBlanco: P.targetRadius
    });
    expect(r.objetivo).toBeNull();
  });

  it('el margen del cuerpo deja acertar un tiro apenas desviado', () => {
    const dir = dirDeRumbo(FRENTE);
    const roce = P.targetRadius * 0.8;
    const casi = { x: -dir.z * roce + dir.x * 10, z: dir.x * roce + dir.z * 10 };
    const r = blancoDelRayo(ORIGEN, FRENTE, [objetivo(casi.x, casi.z)], {
      alcance: P.range,
      radioBlanco: P.targetRadius
    });
    expect(r.objetivo).not.toBeNull();
  });
});

describe('las paredes paran la bala', () => {
  /** Pared a `d` metros: devuelve un impacto con la t que corresponde. */
  const paredA = (d, alcance = P.range) => () => ({ t: d / alcance });

  it('no le pega a un zombi que esta detras de una pared', () => {
    const r = blancoDelRayo(ORIGEN, FRENTE, [blanco(10)], {
      alcance: P.range,
      rayo: paredA(6)
    });
    expect(r.objetivo).toBeNull();
    expect(r.pared).toBe(true);
  });

  it('si el zombi esta de este lado, la pared no lo salva', () => {
    const z = blanco(4);
    const r = blancoDelRayo(ORIGEN, FRENTE, [z], { alcance: P.range, rayo: paredA(9) });
    expect(r.objetivo).toBe(z);
  });

  it('la bala termina EN la pared, para poder dibujar el trazado', () => {
    const r = blancoDelRayo(ORIGEN, FRENTE, [], { alcance: P.range, rayo: paredA(7) });
    expect(r.distancia).toBeCloseTo(7, 3);
    const esperado = adelante(7);
    expect(r.x).toBeCloseTo(esperado.x, 3);
    expect(r.z).toBeCloseTo(esperado.z, 3);
  });

  it('el rayo se lanza a la altura del tiro, no por el piso', () => {
    /*
     * Es lo que decide QUE lo detiene: un auto de uno setenta si, un
     * cordon de quince centimetros no. Sin esto, o los tiros pasan por
     * encima de todo o los frena cualquier baldosa.
     */
    let alturaRecibida = null;
    blancoDelRayo(ORIGEN, FRENTE, [], {
      alcance: P.range,
      alturaTiro: P.shotHeight,
      rayo: (ax, az, bx, bz, altura) => {
        alturaRecibida = altura;
        return null;
      }
    });
    expect(alturaRecibida).toBe(P.shotHeight);
    expect(P.shotHeight).toBeGreaterThan(0.5);
  });

  it('sin pared de por medio, el tiro llega igual que sin escenario', () => {
    const z = blanco(12);
    const conMundo = blancoDelRayo(ORIGEN, FRENTE, [z], { alcance: P.range, rayo: () => null });
    expect(conMundo.objetivo).toBe(z);
  });
});

/* =========================================================================
   DISPERSION
   ========================================================================= */

describe('dispersion', () => {
  it('con el azar en el centro no desvia nada', () => {
    // Es lo que hace repetibles a las demas pruebas.
    expect(dispersar(FRENTE, P.spreadDegrees, () => 0.5)).toBeCloseTo(FRENTE, 6);
  });

  it('nunca desvia mas de lo declarado', () => {
    for (const v of [0, 0.01, 0.25, 0.5, 0.75, 0.99, 1]) {
      const d = Math.abs(dispersar(FRENTE, P.spreadDegrees, () => v) - FRENTE);
      expect(d).toBeLessThanOrEqual(P.spreadDegrees + 1e-9);
    }
  });

  it('desvia a los dos lados, no siempre al mismo', () => {
    expect(dispersar(FRENTE, P.spreadDegrees, () => 0)).toBeLessThan(FRENTE);
    expect(dispersar(FRENTE, P.spreadDegrees, () => 1)).toBeGreaterThan(FRENTE);
  });

  it('castiga el tiro largo y perdona el corto', () => {
    /*
     * Esta es la razon de existir de la dispersion, expresada en metros.
     * El mismo desvio angular que a tres metros es un roce, a veinticinco
     * es un tiro perdido.
     */
    const rad = (P.spreadDegrees * Math.PI) / 180;
    const desvioCerca = Math.tan(rad) * 3;
    const desvioLejos = Math.tan(rad) * 25;
    expect(desvioCerca).toBeLessThan(P.targetRadius);
    expect(desvioLejos).toBeGreaterThan(P.targetRadius);
  });
});

/* =========================================================================
   APUNTADO ASISTIDO
   ========================================================================= */

describe('apuntado asistido', () => {
  const opt = { alcance: P.range, cono: P.aimAssist.cono, maxima: P.aimAssist.maxima };

  it('sin nadie cerca del centro, no toca el rumbo', () => {
    expect(rumboAsistido(ORIGEN, FRENTE, [], opt)).toBeCloseTo(FRENTE, 6);
  });

  it('corrige hacia un zombi apenas desviado', () => {
    // Un zombi a 4 grados del centro: dentro del cono.
    const z = blanco(10, FRENTE + 4);
    const corregido = rumboAsistido(ORIGEN, FRENTE, [z], opt);
    const r = blancoDelRayo(ORIGEN, corregido, [z], {
      alcance: P.range,
      radioBlanco: P.targetRadius
    });
    expect(r.objetivo).toBe(z);
  });

  it('NO corrige hacia un zombi que esta fuera del cono', () => {
    const z = blanco(10, FRENTE + P.aimAssist.cono + 10);
    expect(rumboAsistido(ORIGEN, FRENTE, [z], opt)).toBeCloseTo(FRENTE, 6);
  });

  it('nunca corrige mas de lo declarado', () => {
    /*
     * El tope es lo que separa "ayudar" de "apuntar solo". Un zombi en el
     * borde del cono esta a 14 grados y la correccion maxima es 5: queda
     * fuera de tiro igual, y eso esta bien.
     */
    const z = blanco(10, FRENTE + P.aimAssist.cono - 0.5);
    const corregido = rumboAsistido(ORIGEN, FRENTE, [z], opt);
    expect(Math.abs(corregido - FRENTE)).toBeLessThanOrEqual(P.aimAssist.maxima + 1e-9);
  });

  it('elige el mas cercano al centro, no el mas cercano en distancia', () => {
    // El que esta justo adelante a 20 m gana contra uno a 3 m y 12 grados.
    const centrado = blanco(20, FRENTE + 1);
    const cercaDeCostado = blanco(3, FRENTE + 12);
    const corregido = rumboAsistido(ORIGEN, FRENTE, [cercaDeCostado, centrado], opt);
    // Tiene que haberse movido hacia el centrado, o sea casi nada.
    expect(Math.abs(corregido - FRENTE)).toBeLessThan(2);
  });

  it('ignora a los muertos', () => {
    const z = { ...blanco(10, FRENTE + 4), vivo: false };
    expect(rumboAsistido(ORIGEN, FRENTE, [z], opt)).toBeCloseTo(FRENTE, 6);
  });

  it('corrige para los dos lados', () => {
    const izq = rumboAsistido(ORIGEN, FRENTE, [blanco(10, FRENTE - 6)], opt);
    const der = rumboAsistido(ORIGEN, FRENTE, [blanco(10, FRENTE + 6)], opt);
    expect(izq).toBeLessThan(FRENTE);
    expect(der).toBeGreaterThan(FRENTE);
  });

  it('la asistencia es mas chica que el cono: el jugador sigue eligiendo', () => {
    expect(P.aimAssist.maxima).toBeLessThan(P.aimAssist.cono);
  });
});

/* =========================================================================
   RUIDO
   ========================================================================= */

describe('ruido', () => {
  it('el disparo se escucha mas lejos de lo que el zombi puede ver', () => {
    /*
     * Esto decia "el disparo hace mucho mas ruido que el cuchillo", y se
     * medía contra `WEAPONS.knife.noiseRadius`. Con el cuchillo borrado en
     * la 16.4 la comparacion se quedo sin la mitad, y la tentacion era
     * borrarla: es la unica arma, contra quien va a hacer mas ruido.
     *
     * Pero lo que la prueba cuidaba no era el cuchillo: era que **disparar
     * tenga costo** (D-05). Y ese costo tiene una medida propia y mejor:
     * el estruendo llega mas lejos que la vista del zombi. Mientras eso sea
     * cierto, un tiro puede traerte a alguien que no te habia visto, que es
     * exactamente la decision que el juego quiere que el jugador tome.
     */
    expect(P.noiseRadius).toBeGreaterThan(ZOMBIE_STANDARD.sightRange);
    // Y mucho mas lejos de lo que te escucha caminando.
    expect(P.noiseRadius).toBeGreaterThan(ZOMBIE_STANDARD.hearRange * 4);
  });

  it('un disparo que falla hace el mismo ruido que uno que acierta', () => {
    /*
     * Es la regla de la fase. Lo que atrae a los zombis es el estruendo,
     * no el acierto. Si fallar fuera silencioso, errar no tendria costo y
     * disparar dejaria de ser una decision.
     */
    const a = armar();
    disparar(a.w, [blanco(8)]);
    const b = armar();
    disparar(b.w, []);

    expect(a.ev.golpes).toHaveLength(1);
    expect(b.ev.fallos).toHaveLength(1);
    expect(a.ev.ruidos).toHaveLength(1);
    expect(b.ev.ruidos).toHaveLength(1);
    expect(b.ev.ruidos[0].radio).toBe(a.ev.ruidos[0].radio);
  });

  it('el ruido sale desde el tirador, no desde el impacto', () => {
    // El estruendo lo hace el arma, no la bala al llegar.
    const pos = { x: 7, z: -3 };
    const { w, ev } = armar();
    disparar(w, [blanco(8)], pos);
    expect(ev.ruidos[0].x).toBeCloseTo(pos.x, 6);
    expect(ev.ruidos[0].z).toBeCloseTo(pos.z, 6);
  });

  /*
   * Habia una prueba mas: "el clic en vacio no hace ruido de disparo".
   * Se fue con la municion en la Fase 16.2 (D-29): ya no hay clic en
   * vacio porque la pistola no se queda sin balas.
   */
});

/* =========================================================================
   DAÑO Y EL ARMA COMPLETA
   ========================================================================= */

describe('la pistola de punta a punta', () => {
  it('cuatro tiros matan a un zombi estandar, y tres no', () => {
    /*
     * Decía "dos tiros" hasta la Fase 17.1, cuando entraron los números de
     * D-31: el arma pasó de 34 a 25 de daño y el zombi de 60 a 100 de
     * vida. **La prueba no murió, cambió el número**, porque lo que fija
     * sigue siendo lo mismo: cuántas veces hay que apretar para matar, que
     * es la unidad de tiempo del combate entero.
     *
     * Y ahora es más estricta que antes. La versión vieja pedía
     * "alcanza o sobra" (`toBeGreaterThanOrEqual`); ésta pide que **dé
     * exacto**: 25 × 4 = 100, ni uno de más. Con un tiro que sobrara, el
     * cuarto desperdiciaría daño y la quinta carta de ataque de la 19B
     * valdría menos de lo que dice su texto.
     */
    expect(P.damage * 4).toBe(ZOMBIE_STANDARD.maxHealth);
    // Y tres no alcanzan: si alcanzaran, el combate duraría 25% menos sin
    // que nadie lo hubiera decidido.
    expect(P.damage * 3).toBeLessThan(ZOMBIE_STANDARD.maxHealth);
  });

  it('doce mordidas matan a Gus, y once no', () => {
    /*
     * La otra mitad de D-31, que no estaba medida en ningún lado. Es el
     * número que decide cuánto se puede equivocar el jugador al elegir
     * dónde pararse, y con el combate automático esa es **la única
     * decisión que toma**.
     */
    expect(ZOMBIE_STANDARD.attackDamage * 12).toBe(PLAYER.maxHealth);
    expect(ZOMBIE_STANDARD.attackDamage * 11).toBeLessThan(PLAYER.maxHealth);
  });

  it('el tiempo expuesto por zombi es el triple que antes, y esta a la vista', () => {
    /*
     * No es una prueba de regresión: es un número que conviene tener
     * escrito donde se lee, porque es el que define el ritmo del juego.
     *
     * Antes: 2 tiros × 0,4 s = 0,8 s quieto al lado de un zombi.
     * Ahora:  4 tiros × 0,4 s = 1,6 s.
     *
     * Si en la 17.9 la cadencia se toca, este número se mueve con ella, y
     * es el que hay que mirar jugando: cuánto dura estar expuesto.
     */
    const tiros = ZOMBIE_STANDARD.maxHealth / P.damage;
    expect(tiros * P.cooldown).toBeCloseTo(1.6, 2);
  });

  it('avisa el trazado acierte o falle', () => {
    const a = armar();
    disparar(a.w, [blanco(8)]);
    expect(a.ev.disparos[0].acerto).toBe(true);

    const b = armar();
    disparar(b.w, []);
    expect(b.ev.disparos[0].acerto).toBe(false);
    // Y aun fallando dice por donde paso la bala, que es lo que permite
    // corregir el proximo tiro.
    expect(b.ev.disparos[0].hasta).toBeTruthy();
  });

  it('el empuje del tiro apunta del tirador al zombi', () => {
    const { w, ev } = armar();
    const dir = dirDeRumbo(FRENTE);
    disparar(w, [blanco(8)]);
    expect(ev.golpes[0].dirX).toBeCloseTo(dir.x, 3);
    expect(ev.golpes[0].dirZ).toBeCloseTo(dir.z, 3);
  });

  /*
   * Aca habia dos pruebas mas, y las dos eran comparaciones con el
   * cuchillo: que `alcanzados()` —el arco— devolviera vacio para la
   * pistola, y que el disparo fuera mas rapido de repetir que el
   * cuchillazo. Se fueron en la 16.4: `alcanzados()` ya no existe, y no
   * queda segunda arma con la que comparar cadencias.
   *
   * Lo que si queda medido es la cadencia en absoluto, abajo.
   */

  it('la demora del tiro es corta, pero no cero', () => {
    /*
     * Reemplaza a la comparacion con el cuchillo. Los dos extremos
     * importan: en cero, el zombi muere en el mismo cuadro en que empieza
     * la animacion y el tiro se despega del personaje; pasado un decimo, el
     * arma se siente con retardo, y esta es un arma que se dispara parado y
     * con zombis encima.
     */
    expect(P.windup).toBeGreaterThan(0);
    expect(P.windup).toBeLessThan(0.1);
    // Y la espera entre tiros, por debajo del medio segundo: la cadencia
    // real se ajusta jugando, en la 17.9.
    expect(P.cooldown).toBeLessThan(0.5);
  });

  it('un ciclo completo vuelve a dejar el arma lista', () => {
    const { w } = armar();
    disparar(w, []);
    expect(w.estado).toBe(EstadoArma.ESPERANDO);
    esperarCiclo(w);
    expect(w.estado).toBe(EstadoArma.LISTA);
    expect(w.puedeAtacar).toBe(true);
  });
});

/* =========================================================================
   EL TIRO SALE PARA ADELANTE
   ========================================================================= */

describe('el tiro sale para adelante', () => {
  /*
   * La misma prueba que se le hizo al cuchillo, por el mismo motivo: todo
   * lo de arriba fija un rumbo y mide alrededor de ese rumbo, asi que un
   * convenio invertido pasaria entero. Aca se le pregunta al convenio del
   * proyecto donde queda "adelante" y se exige que ahi sea donde pega.
   */
  const RUMBOS = [0, 45, 90, 135, 180, -45, -90, -135];

  it.each(RUMBOS)('al rumbo %i, le pega a lo que tiene adelante', (rumbo) => {
    const { w, ev } = armar();
    const z = blanco(10, rumbo);
    disparar(w, [z], ORIGEN, rumbo);
    expect(ev.golpes).toHaveLength(1);
    expect(ev.golpes[0].objetivo).toBe(z);
  });

  it.each(RUMBOS)('al rumbo %i, NO le pega a lo que tiene atras', (rumbo) => {
    const { w, ev } = armar();
    disparar(w, [blanco(-10, rumbo)], ORIGEN, rumbo);
    expect(ev.golpes).toHaveLength(0);
    expect(ev.fallos).toHaveLength(1);
  });
});
