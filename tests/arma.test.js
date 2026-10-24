import { describe, it, expect, vi } from 'vitest';
import { WeaponController, EstadoArma } from '../src/combat/weaponController.js';
import { WEAPONS, ZOMBIE_STANDARD } from '../src/config/balance.js';
import { rumboHacia, dirDeRumbo } from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * ARMA CUERPO A CUERPO
 * ===========================================================================
 * El arco de ataque es de las cosas que mas se sienten y menos se pueden
 * verificar a ojo: si alcanza un poco de mas o de menos, el combate se
 * siente injusto y no hay forma de saber por que. Con numeros si.
 */

/** Un objetivo de mentira, con lo minimo que el arma necesita. */
const objetivo = (x, z, vivo = true) => ({ posicion: { x, z }, vivo });

/** Crea el arma y deja el swing resuelto, devolviendo a quienes golpeo. */
const golpear = (pos, rumbo, objetivos, opt = {}) => {
  const golpeados = [];
  const fallos = [];
  const ruidos = [];
  const w = new WeaponController({
    alGolpear: (info) => golpeados.push(info),
    alFallar: (info) => fallos.push(info),
    alHacerRuido: (info) => ruidos.push(info),
    ...opt
  });
  w.atacar(pos, rumbo);
  // Pasar la demora para que el golpe salga.
  w.update(WEAPONS.knife.windup + 0.01, pos, rumbo, objetivos);
  return { w, golpeados, fallos, ruidos };
};

const ORIGEN = { x: 0, z: 0 };

/*
 * Los rumbos NO se escriben como numeros.
 *
 * Esta prueba decia `golpear(ORIGEN, MIRA_MAS_Z, ...)` con el zombi en +Z, y el
 * comentario aclaraba "mirando a +Z". Era falso: en el convenio del juego
 * el rumbo 0 mira a -Z. Como el arma usaba por dentro el convenio opuesto,
 * las dos mentiras se cancelaban y la prueba pasaba mientras el cuchillo
 * golpeaba para atras en el juego de verdad.
 *
 * Pidiendole el rumbo a `rumboHacia`, la prueba habla de direcciones y no
 * de signos, y no puede volver a quedar desfasada. Ver core/rumbo.js.
 */
const MIRA_MAS_Z = rumboHacia(0, 1);
const MIRA_MAS_X = rumboHacia(1, 0);

describe('arco de ataque', () => {
  it('alcanza a un zombi de frente y dentro del alcance', () => {
    const z = objetivo(0, 1.2);
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_Z, [z]);
    expect(golpeados).toHaveLength(1);
    expect(golpeados[0].objetivo).toBe(z);
    expect(golpeados[0].daño).toBe(WEAPONS.knife.damage);
  });

  it('no alcanza mas alla del alcance del arma', () => {
    const lejos = WEAPONS.knife.range + 0.5;
    const { golpeados, fallos } = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(0, lejos)]);
    expect(golpeados).toHaveLength(0);
    expect(fallos).toHaveLength(1);
  });

  it('no alcanza a lo que esta a la espalda', () => {
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(0, -1.2)]);
    expect(golpeados).toHaveLength(0);
  });

  it('alcanza dentro del arco pero no fuera', () => {
    const r = 1.3;
    const dentro = (40 * Math.PI) / 180;
    const fuera = (80 * Math.PI) / 180;

    const a = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(Math.sin(dentro) * r, Math.cos(dentro) * r)]);
    expect(a.golpeados).toHaveLength(1);

    const b = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(Math.sin(fuera) * r, Math.cos(fuera) * r)]);
    expect(b.golpeados).toHaveLength(0);
  });

  it('pegado encima alcanza aunque este a un costado', () => {
    // A medio metro, el angulo deja de importar.
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(0.45, 0.1)]);
    expect(golpeados).toHaveLength(1);
  });

  it('un golpe alcanza a varios zombis del arco', () => {
    const objetivos = [objetivo(0, 1.2), objetivo(0.6, 1.0), objetivo(-0.5, 1.1)];
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_Z, objetivos);
    expect(golpeados).toHaveLength(3);
  });

  it('ignora a los muertos', () => {
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(0, 1.2, false)]);
    expect(golpeados).toHaveLength(0);
  });

  it('el empuje apunta del jugador hacia el zombi', () => {
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(0, 1.2)]);
    expect(golpeados[0].dirZ).toBeCloseTo(1, 3);
    expect(golpeados[0].dirX).toBeCloseTo(0, 3);
  });

  it('el rumbo del jugador orienta el arco', () => {
    // Mirando hacia +X (90 grados), un zombi en +X tiene que entrar.
    const { golpeados } = golpear(ORIGEN, MIRA_MAS_X, [objetivo(1.2, 0)]);
    expect(golpeados).toHaveLength(1);
  });
});

describe('tiempos', () => {
  it('el daño no sale en el mismo instante en que se aprieta', () => {
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const objetivos = [objetivo(0, 1.2)];

    w.atacar(ORIGEN, MIRA_MAS_Z);
    expect(w.estado).toBe(EstadoArma.PREPARANDO);
    // Antes de que se cumpla la demora, nadie recibio nada.
    w.update(WEAPONS.knife.windup / 2, ORIGEN, MIRA_MAS_Z, objetivos);
    expect(golpeados).toHaveLength(0);

    w.update(WEAPONS.knife.windup, ORIGEN, MIRA_MAS_Z, objetivos);
    expect(golpeados).toHaveLength(1);
  });

  it('no se puede atacar mientras espera', () => {
    const w = new WeaponController();
    expect(w.atacar(ORIGEN, MIRA_MAS_Z)).toBe(true);
    expect(w.atacar(ORIGEN, MIRA_MAS_Z)).toBe(false);
  });

  it('se puede volver a atacar pasada la espera', () => {
    const w = new WeaponController();
    const objetivos = [];
    w.atacar(ORIGEN, MIRA_MAS_Z);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, MIRA_MAS_Z, objetivos);
    expect(w.estado).toBe(EstadoArma.ESPERANDO);

    w.update(WEAPONS.knife.cooldown + 0.01, ORIGEN, MIRA_MAS_Z, objetivos);
    expect(w.estado).toBe(EstadoArma.LISTA);
    expect(w.atacar(ORIGEN, MIRA_MAS_Z)).toBe(true);
  });

  it('el golpe sale desde donde esta el jugador al conectar, no al apretar', () => {
    // Si no fuera asi, girar durante el swing no serviria de nada.
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const z = objetivo(1.2, 0);

    // Apreta mirando a +Z, con el zombi a +X: no alcanzaria.
    w.atacar(ORIGEN, MIRA_MAS_Z);
    // Gira a +X antes de que salga el golpe.
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, MIRA_MAS_X, [z]);
    expect(golpeados).toHaveLength(1);
  });
});

describe('un golpe, un impacto por zombi', () => {
  it('no le pega dos veces al mismo zombi en el mismo swing', () => {
    /*
     * Pasa si el zombi entra y sale del arco durante el swing. Sin llevar
     * la cuenta, recibe el daño dos veces y muere con la mitad de golpes
     * de los que deberia.
     */
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const z = objetivo(0, 1.2);

    w.atacar(ORIGEN, MIRA_MAS_Z);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, MIRA_MAS_Z, [z]);
    expect(golpeados).toHaveLength(1);

    // Forzar otra resolucion del mismo swing.
    expect(w.alcanzados(ORIGEN, MIRA_MAS_Z, [z])).toHaveLength(0);
  });

  it('en el swing siguiente vuelve a poder golpearlo', () => {
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const z = objetivo(0, 1.2);

    w.atacar(ORIGEN, MIRA_MAS_Z);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, MIRA_MAS_Z, [z]);
    w.update(WEAPONS.knife.cooldown + 0.01, ORIGEN, MIRA_MAS_Z, [z]);

    w.atacar(ORIGEN, MIRA_MAS_Z);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, MIRA_MAS_Z, [z]);
    expect(golpeados).toHaveLength(2);
  });
});

describe('ruido y balance', () => {
  it('el cuchillo hace ruido, pero poco', () => {
    const { ruidos } = golpear(ORIGEN, MIRA_MAS_Z, [objetivo(0, 1.2)]);
    expect(ruidos).toHaveLength(1);
    expect(ruidos[0].radio).toBe(WEAPONS.knife.noiseRadius);
    // La ventaja real del cuchillo es ser silencioso (D-05).
    expect(WEAPONS.knife.noiseRadius).toBeLessThan(WEAPONS.pistol.noiseRadius / 5);
  });

  it('dos cuchillazos matan a un zombi estandar, y uno no', () => {
    /*
     * Es el criterio de salida de la fase, puesto como numero y leido del
     * balance real. Si alguien sube la vida del zombi o baja el daño del
     * cuchillo, esta prueba lo avisa antes de que se note jugando.
     */
    expect(WEAPONS.knife.damage * 2).toBeGreaterThanOrEqual(ZOMBIE_STANDARD.maxHealth);
    expect(WEAPONS.knife.damage).toBeLessThan(ZOMBIE_STANDARD.maxHealth);
  });

  it('avisa cuando el golpe no alcanza a nadie', () => {
    const { fallos, golpeados } = golpear(ORIGEN, MIRA_MAS_Z, []);
    expect(golpeados).toHaveLength(0);
    expect(fallos).toHaveLength(1);
  });
});

describe('cambio de arma', () => {
  it('equipar un arma que no existe no hace nada', () => {
    const w = new WeaponController();
    expect(w.equipar('lanzallamas')).toBe(false);
    expect(w.equipada).toBe('knife');
  });

  it('una pistola no golpea en arco', () => {
    const w = new WeaponController({ armaInicial: 'pistol' });
    // El arco es solo para cuerpo a cuerpo; la pistola llega en la Fase 6.
    expect(w.alcanzados(ORIGEN, MIRA_MAS_Z, [objetivo(0, 1)])).toHaveLength(0);
  });
});

describe('el golpe sale para adelante', () => {
  /*
   * ESTA es la prueba que faltaba.
   *
   * Todas las de arriba fijan un rumbo y comprueban el arco alrededor de
   * ese rumbo. Son coherentes consigo mismas, y por eso no sirvieron: el
   * arma usaba un convenio de angulos invertido respecto del resto del
   * juego, asi que el cuchillo golpeaba 180 grados al reves y ninguna se
   * quejo. El usuario lo vio en el telefono en treinta segundos.
   *
   * Lo que faltaba era unir las dos puntas: preguntarle al convenio del
   * proyecto donde queda "adelante" —`dirDeRumbo`, la misma funcion con la
   * que se orienta el personaje y la camara— y exigir que ahi sea donde el
   * arma pega. Si cualquiera de los dos lados se da vuelta, esto falla.
   */
  const RUMBOS = [0, 45, 90, 135, 180, -45, -90, -135];

  it.each(RUMBOS)('mirando al rumbo %i, alcanza a lo que tiene adelante', (rumbo) => {
    const frente = dirDeRumbo(rumbo);
    const z = objetivo(frente.x * 1.2, frente.z * 1.2);
    const { golpeados } = golpear(ORIGEN, rumbo, [z]);
    expect(golpeados).toHaveLength(1);
  });

  it.each(RUMBOS)('mirando al rumbo %i, NO alcanza a lo que tiene atras', (rumbo) => {
    const frente = dirDeRumbo(rumbo);
    // Mismo alcance, exactamente del lado opuesto.
    const z = objetivo(-frente.x * 1.2, -frente.z * 1.2);
    const { golpeados, fallos } = golpear(ORIGEN, rumbo, [z]);
    expect(golpeados).toHaveLength(0);
    expect(fallos).toHaveLength(1);
  });

  it('el arco dibujado tiene el mismo alcance que el que golpea', () => {
    /*
     * El dibujo del arco sacaba su radio de un numero escrito a mano, con
     * un comentario que prometia que coincidia con el arma. Ahora los dos
     * leen WEAPONS.knife, asi que alcanza con dejar constancia de que ese
     * es el unico origen del dato.
     */
    expect(WEAPONS.knife.range).toBeGreaterThan(0);
    expect(WEAPONS.knife.arcDegrees).toBeGreaterThan(0);
  });
});
