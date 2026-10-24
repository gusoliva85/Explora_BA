import { describe, it, expect, vi } from 'vitest';
import { WeaponController, EstadoArma } from '../src/combat/weaponController.js';
import { WEAPONS, ZOMBIE_STANDARD } from '../src/config/balance.js';

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

describe('arco de ataque', () => {
  it('alcanza a un zombi de frente y dentro del alcance', () => {
    const z = objetivo(0, 1.2);
    const { golpeados } = golpear(ORIGEN, 0, [z]);
    expect(golpeados).toHaveLength(1);
    expect(golpeados[0].objetivo).toBe(z);
    expect(golpeados[0].daño).toBe(WEAPONS.knife.damage);
  });

  it('no alcanza mas alla del alcance del arma', () => {
    const lejos = WEAPONS.knife.range + 0.5;
    const { golpeados, fallos } = golpear(ORIGEN, 0, [objetivo(0, lejos)]);
    expect(golpeados).toHaveLength(0);
    expect(fallos).toHaveLength(1);
  });

  it('no alcanza a lo que esta a la espalda', () => {
    const { golpeados } = golpear(ORIGEN, 0, [objetivo(0, -1.2)]);
    expect(golpeados).toHaveLength(0);
  });

  it('alcanza dentro del arco pero no fuera', () => {
    const r = 1.3;
    const dentro = (40 * Math.PI) / 180;
    const fuera = (80 * Math.PI) / 180;

    const a = golpear(ORIGEN, 0, [objetivo(Math.sin(dentro) * r, Math.cos(dentro) * r)]);
    expect(a.golpeados).toHaveLength(1);

    const b = golpear(ORIGEN, 0, [objetivo(Math.sin(fuera) * r, Math.cos(fuera) * r)]);
    expect(b.golpeados).toHaveLength(0);
  });

  it('pegado encima alcanza aunque este a un costado', () => {
    // A medio metro, el angulo deja de importar.
    const { golpeados } = golpear(ORIGEN, 0, [objetivo(0.45, 0.1)]);
    expect(golpeados).toHaveLength(1);
  });

  it('un golpe alcanza a varios zombis del arco', () => {
    const objetivos = [objetivo(0, 1.2), objetivo(0.6, 1.0), objetivo(-0.5, 1.1)];
    const { golpeados } = golpear(ORIGEN, 0, objetivos);
    expect(golpeados).toHaveLength(3);
  });

  it('ignora a los muertos', () => {
    const { golpeados } = golpear(ORIGEN, 0, [objetivo(0, 1.2, false)]);
    expect(golpeados).toHaveLength(0);
  });

  it('el empuje apunta del jugador hacia el zombi', () => {
    const { golpeados } = golpear(ORIGEN, 0, [objetivo(0, 1.2)]);
    expect(golpeados[0].dirZ).toBeCloseTo(1, 3);
    expect(golpeados[0].dirX).toBeCloseTo(0, 3);
  });

  it('el rumbo del jugador orienta el arco', () => {
    // Mirando hacia +X (90 grados), un zombi en +X tiene que entrar.
    const { golpeados } = golpear(ORIGEN, 90, [objetivo(1.2, 0)]);
    expect(golpeados).toHaveLength(1);
  });
});

describe('tiempos', () => {
  it('el daño no sale en el mismo instante en que se aprieta', () => {
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const objetivos = [objetivo(0, 1.2)];

    w.atacar(ORIGEN, 0);
    expect(w.estado).toBe(EstadoArma.PREPARANDO);
    // Antes de que se cumpla la demora, nadie recibio nada.
    w.update(WEAPONS.knife.windup / 2, ORIGEN, 0, objetivos);
    expect(golpeados).toHaveLength(0);

    w.update(WEAPONS.knife.windup, ORIGEN, 0, objetivos);
    expect(golpeados).toHaveLength(1);
  });

  it('no se puede atacar mientras espera', () => {
    const w = new WeaponController();
    expect(w.atacar(ORIGEN, 0)).toBe(true);
    expect(w.atacar(ORIGEN, 0)).toBe(false);
  });

  it('se puede volver a atacar pasada la espera', () => {
    const w = new WeaponController();
    const objetivos = [];
    w.atacar(ORIGEN, 0);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, 0, objetivos);
    expect(w.estado).toBe(EstadoArma.ESPERANDO);

    w.update(WEAPONS.knife.cooldown + 0.01, ORIGEN, 0, objetivos);
    expect(w.estado).toBe(EstadoArma.LISTA);
    expect(w.atacar(ORIGEN, 0)).toBe(true);
  });

  it('el golpe sale desde donde esta el jugador al conectar, no al apretar', () => {
    // Si no fuera asi, girar durante el swing no serviria de nada.
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const z = objetivo(1.2, 0);

    // Apreta mirando a +Z, con el zombi a +X: no alcanzaria.
    w.atacar(ORIGEN, 0);
    // Gira a +X antes de que salga el golpe.
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, 90, [z]);
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

    w.atacar(ORIGEN, 0);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, 0, [z]);
    expect(golpeados).toHaveLength(1);

    // Forzar otra resolucion del mismo swing.
    expect(w.alcanzados(ORIGEN, 0, [z])).toHaveLength(0);
  });

  it('en el swing siguiente vuelve a poder golpearlo', () => {
    const golpeados = [];
    const w = new WeaponController({ alGolpear: (i) => golpeados.push(i) });
    const z = objetivo(0, 1.2);

    w.atacar(ORIGEN, 0);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, 0, [z]);
    w.update(WEAPONS.knife.cooldown + 0.01, ORIGEN, 0, [z]);

    w.atacar(ORIGEN, 0);
    w.update(WEAPONS.knife.windup + 0.01, ORIGEN, 0, [z]);
    expect(golpeados).toHaveLength(2);
  });
});

describe('ruido y balance', () => {
  it('el cuchillo hace ruido, pero poco', () => {
    const { ruidos } = golpear(ORIGEN, 0, [objetivo(0, 1.2)]);
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
    const { fallos, golpeados } = golpear(ORIGEN, 0, []);
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
    expect(w.alcanzados(ORIGEN, 0, [objetivo(0, 1)])).toHaveLength(0);
  });
});
