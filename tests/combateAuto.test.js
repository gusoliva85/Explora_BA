import { describe, it, expect } from 'vitest';
import { avanzarQuieto } from '../src/player/playerController.js';
import { SelectorDeBlanco } from '../src/combat/blanco.js';
import { WeaponController } from '../src/combat/weaponController.js';
import { PLAYER, WEAPONS, ZOMBIE_STANDARD } from '../src/config/balance.js';

/**
 * ===========================================================================
 * EL CICLO ENTERO DEL COMBATE AUTOMATICO
 * ===========================================================================
 * ```
 * moverse → quieto → elige blanco → lo mata → elige el siguiente
 *        → moverse (suelta) → quieto → elige otro
 * ```
 *
 * ---------------------------------------------------------------------------
 * POR QUE HACE FALTA SI CADA PIEZA YA TIENE PRUEBAS
 * ---------------------------------------------------------------------------
 * `avanzarQuieto`, `SelectorDeBlanco` y `WeaponController` estan probados
 * **por separado**, y este proyecto ya sabe lo que cuesta eso: el arco del
 * cuchillo tenia pruebas unitarias impecables y en el juego golpeaba para
 * atras, porque nadie habia probado las dos puntas juntas.
 *
 * Aca las puntas son tres, y el riesgo es el mismo: cada una contesta bien
 * y la secuencia puede estar mal.
 *
 * ---------------------------------------------------------------------------
 * EL ORDEN ES EL DE `main`, Y ESO NO ES UN DETALLE
 * ---------------------------------------------------------------------------
 * El simulador de abajo compone las piezas **en el mismo orden que el bucle
 * del juego**, incluido el cuadro de atraso del giro (ver 17.5: hay una
 * dependencia circular y alguien tiene que ir atrasado).
 *
 * Si la prueba las ordenara de otra manera, estaria probando una maquina
 * que no existe, **y pasaria igual**. Es el error mas facil de cometer en
 * una prueba de integracion escrita a mano.
 */

const ZOMBI_VIDA = ZOMBIE_STANDARD.maxHealth;
const CUADRO = 1 / 60;

/** Un zombi de mentira: posicion, vida y nada mas. */
const zombi = (x, z) => ({
  posicion: { x, z },
  vida: ZOMBI_VIDA,
  get vivo() {
    return this.vida > 0;
  }
});

/**
 * El bucle del juego, reducido a lo que importa para el combate.
 *
 * Reproduce el orden de `main.js`:
 *   1. `quieto` sale de la entrada del jugador
 *   2. el blanco se elige o se revalida con ese `quieto`
 *   3. el arma dispara si hay blanco Y Gus ya esta encarado
 *   4. el giro usa el blanco **del cuadro anterior**
 */
class Partida {
  constructor(objetivos) {
    this.objetivos = objetivos;
    this.pos = { x: 0, z: 0 };
    this.yaw = 0;
    this.quieto = false;
    this.tiempoSinEntrada = 0;
    this.rumboDelCuadroAnterior = null;

    this.selector = new SelectorDeBlanco({ alcance: WEAPONS.pistol.range });
    this.arma = new WeaponController({
      alGolpear: ({ objetivo, daño }) => {
        objetivo.vida -= daño;
        this.golpes++;
      }
    });
    this.golpes = 0;
    this.disparos = 0;
  }

  /** Un cuadro. `inputMag` es cuanto esta tirado el joystick. */
  cuadro(inputMag, dt = CUADRO) {
    // 1. Quieto sale de la ENTRADA, no de la velocidad. Ver 17.2.
    const q = avanzarQuieto(this.tiempoSinEntrada, dt, inputMag);
    this.tiempoSinEntrada = q.tiempoSinEntrada;
    this.quieto = q.quieto;

    /*
     * 2. El giro usa el blanco del cuadro ANTERIOR (17.5). Aca se simula
     * instantaneo: lo que la prueba cuida es el orden, no la curva del
     * giro, que es cosa de `approachAngle` y ya tiene sus pruebas.
     */
    if (this.rumboDelCuadroAnterior !== null) this.yaw = this.rumboDelCuadroAnterior;

    // 3. Elegir o revalidar el blanco.
    this.selector.update(this.quieto, this.pos, this.objetivos);

    // 4. Disparar, solo si ya esta encarado.
    if (this.selector.encarado(this.yaw, PLAYER.toleranciaEncarado)) {
      if (this.arma.atacar()) this.disparos++;
    }
    const rumboDeTiro = this.selector.actual ? this.selector.rumbo : this.yaw;
    this.arma.update(dt, this.pos, rumboDeTiro, this.objetivos);

    this.rumboDelCuadroAnterior = this.selector.actual ? this.selector.rumbo : null;
  }

  correr(cuadros, inputMag) {
    for (let i = 0; i < cuadros; i++) this.cuadro(inputMag);
  }
}

describe('el ciclo entero, en orden', () => {
  it('moverse → quieto → blanco → muerto → siguiente → moverse → otro blanco', () => {
    const cerca = zombi(0, 6);
    const lejos = zombi(0, 12);
    const p = new Partida([cerca, lejos]);

    // --- 1. MOVIENDOSE: no hay quieto, no hay blanco, no hay tiros ------
    p.correr(30, 1);
    expect(p.quieto, 'moviendose no puede estar quieto').toBe(false);
    expect(p.selector.actual, 'moviendose no puede haber blanco').toBe(null);
    expect(p.disparos, 'moviendose no puede disparar').toBe(0);

    // --- 2. SOLTAR: tarda el retardo en contar como quieto ---------------
    p.correr(5, 0); // ~0,083 s: todavia no
    expect(p.quieto).toBe(false);
    p.correr(10, 0); // pasado el retardo
    expect(p.quieto).toBe(true);

    // --- 3. ELIGE AL MAS CERCANO ----------------------------------------
    expect(p.selector.actual).toBe(cerca);

    // --- 4. LO MATA, con los cuatro tiros de D-31 ------------------------
    /*
     * Cuadro a cuadro hasta que muere, y ni uno mas.
     *
     * La primera version corria 200 cuadros de una y despues preguntaba a
     * quien habia elegido. Para entonces **ya habia matado a los dos**, y
     * la respuesta correcta era `null`. El combate automatico no espera a
     * que la prueba mire.
     */
    let n = 0;
    while (cerca.vivo && n++ < 400) p.cuadro(0);
    expect(cerca.vivo, 'no lo mato quedandose quieto').toBe(false);

    // --- 5. Y PASA AL SIGUIENTE SIN QUE EL JUGADOR TOQUE NADA ------------
    p.cuadro(0);
    expect(
      p.selector.actual,
      'al morir el blanco no eligio al siguiente'
    ).toBe(lejos);

    // --- 6. MOVERSE LO SUELTA, Y VOLVER A FRENAR VUELVE A ELEGIR --------
    p.cuadro(1);
    expect(p.selector.actual).toBe(null);

    p.correr(15, 0);
    expect(p.quieto).toBe(true);
    expect(p.selector.actual, 'al volver a frenar no eligio a nadie').toBe(lejos);
    expect(lejos.vivo, 'el segundo ya estaba muerto: la prueba corrio de mas').toBe(true);
  });
});

describe('las cuentas de D-31 se cumplen en el ciclo, no sólo en la tabla', () => {
  it('cuatro tiros y ni uno mas para matar a un zombi', () => {
    /*
     * La tabla de balance dice 25 × 4 = 100, y hay una prueba que lo fija.
     * Esto es otra cosa: que **el ciclo completo** gaste exactamente cuatro
     * disparos, sin desperdiciar uno en un cadaver ni perder uno por
     * disparar antes de estar encarado.
     */
    const z = zombi(0, 6);
    const p = new Partida([z]);
    p.correr(15, 0);
    expect(p.quieto).toBe(true);

    // Justo hasta que muere, ni un cuadro mas.
    let cuadros = 0;
    while (z.vivo && cuadros < 1000) {
      p.cuadro(0);
      cuadros++;
    }
    expect(z.vivo).toBe(false);
    expect(p.golpes, 'hicieron falta mas o menos de cuatro impactos').toBe(4);
  });

  it('matar lleva lo que dice el balance: cuatro tiros por la cadencia', () => {
    /*
     * El numero que la 17.9 va a mover en el telefono. Si alguien toca la
     * cadencia, esto cambia y hay que decidirlo mirando, no de rebote.
     */
    const tiros = ZOMBIE_STANDARD.maxHealth / WEAPONS.pistol.damage;
    expect(tiros * WEAPONS.pistol.cooldown).toBeCloseTo(1.6, 2);
  });
});

describe('lo que NO puede pasar nunca', () => {
  it('no dispara antes de estar encarado', () => {
    /*
     * Con cuatro tiros por zombi, un primer tiro que sale hacia donde Gus
     * miraba antes es **un cuarto del daño tirado** en cada cambio de
     * objetivo. Es la decision que la 17.5 cerro.
     *
     * Se simula un blanco al costado: en el primer cuadro en que hay
     * blanco, Gus todavia mira para el frente.
     */
    const alCostado = zombi(10, 0);
    const p = new Partida([alCostado]);

    // Se para y espera el retardo, cuadro a cuadro, mirando cuando dispara.
    /*
     * El desvio se mide con el yaw **del momento del disparo**, o sea
     * despues del cuadro.
     *
     * La primera version lo media con el yaw de ANTES del cuadro y daba un
     * falso positivo: el giro pasa al principio del cuadro y el disparo
     * despues, asi que el yaw de antes es siempre el viejo. Estaba
     * midiendo el instante equivocado, que es exactamente el error que
     * esta prueba vino a detectar — en la prueba, no en el juego.
     */
    let disparoAntesDeEncarar = false;
    for (let i = 0; i < 20; i++) {
      const disparosAntes = p.disparos;
      p.cuadro(0);
      if (p.disparos > disparosAntes && p.selector.actual) {
        const desvio = Math.abs(((p.yaw - p.selector.rumbo + 540) % 360) - 180);
        if (desvio > PLAYER.toleranciaEncarado) disparoAntesDeEncarar = true;
      }
    }
    expect(disparoAntesDeEncarar).toBe(false);
    // Y disparo en algun momento: si no, la prueba no probo nada.
    expect(p.disparos).toBeGreaterThan(0);
  });

  it('no le dispara a un muerto', () => {
    const z = zombi(0, 6);
    const p = new Partida([z]);
    p.correr(400, 0);
    expect(z.vivo).toBe(false);
    // Toda la vida que perdio es exactamente la que tenia: ni un tiro de mas.
    expect(z.vida).toBe(ZOMBI_VIDA - WEAPONS.pistol.damage * 4);
  });

  it('sin nadie a tiro no dispara, por mucho que espere', () => {
    const lejisimos = zombi(0, WEAPONS.pistol.range + 5);
    const p = new Partida([lejisimos]);
    p.correr(300, 0);
    expect(p.quieto).toBe(true);
    expect(p.selector.actual).toBe(null);
    expect(p.disparos).toBe(0);
  });

  it('moverse corta el combate aunque el blanco siga vivo y cerca', () => {
    const z = zombi(0, 4);
    const p = new Partida([z]);
    p.correr(20, 0);
    expect(p.selector.actual).toBe(z);

    const disparosAlCortar = p.disparos;
    p.correr(120, 1); // huyendo
    expect(p.selector.actual).toBe(null);
    expect(p.disparos, 'siguio disparando mientras huia').toBe(disparosAlCortar);
    expect(z.vivo).toBe(true);
  });
});
