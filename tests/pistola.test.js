import { describe, it, expect } from 'vitest';
import { WeaponController, EstadoArma } from '../src/combat/weaponController.js';
import { blancoDelRayo, dispersar, rumboAsistido } from '../src/combat/ballistics.js';
import { WEAPONS, ZOMBIE_STANDARD } from '../src/config/balance.js';
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

/** Pistola lista para disparar, con los callbacks capturados. */
const armar = (opt = {}) => {
  const ev = { disparos: [], golpes: [], fallos: [], ruidos: [], vacios: [], recargas: [] };
  const w = new WeaponController({
    armaInicial: 'pistol',
    alDisparar: (i) => ev.disparos.push(i),
    alGolpear: (i) => ev.golpes.push(i),
    alFallar: (i) => ev.fallos.push(i),
    alHacerRuido: (i) => ev.ruidos.push(i),
    alClicVacio: (i) => ev.vacios.push(i),
    alRecargar: (i) => ev.recargas.push(i),
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
  w.update(P.cooldown + P.reloadTime + 0.01, pos, rumbo, []);
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
   CARGADOR Y RECARGA
   ========================================================================= */

describe('cargador y recarga', () => {
  it('arranca con el cargador lleno y la reserva declarada', () => {
    const { w } = armar();
    expect(w.enCargador).toBe(P.magazineSize);
    expect(w.enReserva).toBe(P.startingReserve);
  });

  it('cada disparo gasta una bala, no dos', () => {
    const { w } = armar();
    disparar(w, [blanco(8)]);
    expect(w.enCargador).toBe(P.magazineSize - 1);
  });

  it('un tiro que falla gasta bala igual', () => {
    const { w, ev } = armar();
    disparar(w, []);
    expect(ev.fallos).toHaveLength(1);
    expect(w.enCargador).toBe(P.magazineSize - 1);
  });

  it('vaciar el cargador y seguir apretando da clic en vacio', () => {
    const { w, ev } = armar();
    for (let i = 0; i < P.magazineSize; i++) {
      disparar(w);
      w.update(P.cooldown + 0.01, ORIGEN, FRENTE, []);
    }
    expect(w.enCargador).toBe(0);

    expect(disparar(w)).toBe(false);
    expect(ev.vacios).toHaveLength(1);
    expect(ev.disparos).toHaveLength(P.magazineSize);
  });

  it('el clic en vacio arranca la recarga solo', () => {
    const { w, ev } = armar();
    for (let i = 0; i < P.magazineSize; i++) {
      disparar(w);
      w.update(P.cooldown + 0.01, ORIGEN, FRENTE, []);
    }
    w.atacar(ORIGEN, FRENTE, []);
    expect(w.estado).toBe(EstadoArma.RECARGANDO);
    expect(ev.recargas).toHaveLength(1);
  });

  it('durante la recarga no se puede disparar', () => {
    const { w, ev } = armar();
    disparar(w);
    w.update(P.cooldown + 0.01, ORIGEN, FRENTE, []);
    expect(w.recargar()).toBe(true);

    // A mitad de la recarga, el gatillo no hace nada.
    w.update(P.reloadTime / 2, ORIGEN, FRENTE, []);
    expect(w.atacar(ORIGEN, FRENTE, [])).toBe(false);
    expect(ev.disparos).toHaveLength(1);

    // Terminada, si.
    w.update(P.reloadTime, ORIGEN, FRENTE, []);
    expect(w.estado).toBe(EstadoArma.LISTA);
    expect(disparar(w)).toBe(true);
  });

  it('la recarga llena el cargador y descuenta de la reserva', () => {
    const { w } = armar();
    disparar(w);
    disparar(w); // no sale: esta en espera
    w.update(P.cooldown + 0.01, ORIGEN, FRENTE, []);

    const gastadas = P.magazineSize - w.enCargador;
    const reservaAntes = w.enReserva;
    w.recargar();
    w.update(P.reloadTime + 0.01, ORIGEN, FRENTE, []);

    expect(w.enCargador).toBe(P.magazineSize);
    expect(w.enReserva).toBe(reservaAntes - gastadas);
  });

  it('un cargador lleno no se recarga: seria tirar balas', () => {
    const { w } = armar();
    expect(w.recargar()).toBe(false);
    expect(w.enReserva).toBe(P.startingReserve);
  });

  it('sin reserva no hay recarga, y el clic queda en vacio', () => {
    const { w, ev } = armar();
    w.reserva.pistol = 0;
    w.cargador.pistol = 0;

    expect(w.recargar()).toBe(false);
    expect(w.atacar(ORIGEN, FRENTE, [])).toBe(false);
    expect(ev.vacios).toHaveLength(1);
    expect(w.estado).toBe(EstadoArma.LISTA);
  });

  it('la recarga parcial pasa solo lo que hay', () => {
    const { w } = armar();
    w.cargador.pistol = 2;
    w.reserva.pistol = 3;
    w.recargar();
    w.update(P.reloadTime + 0.01, ORIGEN, FRENTE, []);
    expect(w.enCargador).toBe(5);
    expect(w.enReserva).toBe(0);
  });

  it('cambiar de arma cancela la recarga', () => {
    /*
     * Si no la cancelara, se podria empezar a recargar, pasar al cuchillo,
     * pelear, y volver a la pistola ya cargada: la recarga dejaria de
     * costar nada, y su costo es justamente el punto.
     */
    const { w } = armar();
    w.cargador.pistol = 1;
    w.recargar();
    expect(w.recargando).toBe(true);

    w.cambiarA('knife');
    w.update(P.reloadTime + 0.01, ORIGEN, FRENTE, []);
    w.cambiarA('pistol');
    expect(w.enCargador).toBe(1);
  });

  it('el cuchillo no gasta municion ni se recarga', () => {
    const { w } = armar({ armaInicial: 'knife' });
    expect(w.enCargador).toBe(Infinity);
    expect(w.recargar()).toBe(false);
    expect(w.atacar(ORIGEN, FRENTE, [])).toBe(true);
  });

  it('la municion se comparte por tipo, no por arma', () => {
    const { w } = armar();
    const antes = w.enReserva;
    w.sumarMunicion('pistol', 12);
    expect(w.enReserva).toBe(antes + 12);
  });
});

/* =========================================================================
   RUIDO: EL CORAZON DE LA FASE
   ========================================================================= */

describe('ruido', () => {
  it('el disparo hace mucho mas ruido que el cuchillo', () => {
    expect(P.noiseRadius).toBeGreaterThan(WEAPONS.knife.noiseRadius * 5);
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

  it('el clic en vacio no hace ruido de disparo', () => {
    const { w, ev } = armar();
    w.cargador.pistol = 0;
    w.reserva.pistol = 0;
    w.atacar(ORIGEN, FRENTE, []);
    expect(ev.ruidos).toHaveLength(0);
  });
});

/* =========================================================================
   DAÑO Y EL ARMA COMPLETA
   ========================================================================= */

describe('la pistola de punta a punta', () => {
  it('dos tiros matan a un zombi estandar, y uno no', () => {
    // Igual que el cuchillo: leido del balance real, no copiado.
    expect(P.damage * 2).toBeGreaterThanOrEqual(ZOMBIE_STANDARD.maxHealth);
    expect(P.damage).toBeLessThan(ZOMBIE_STANDARD.maxHealth);
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

  it('el arco del cuchillo no existe para la pistola', () => {
    const { w } = armar();
    expect(w.alcanzados(ORIGEN, FRENTE, [blanco(1)])).toHaveLength(0);
  });

  it('el disparo es mas lento de repetir que el cuchillo pero no mucho', () => {
    expect(P.cooldown).toBeLessThan(WEAPONS.knife.cooldown);
    expect(P.windup).toBeLessThan(WEAPONS.knife.windup);
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
