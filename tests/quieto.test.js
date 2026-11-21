import { describe, it, expect } from 'vitest';
import { avanzarQuieto } from '../src/player/playerController.js';
import { PLAYER } from '../src/config/balance.js';

/**
 * ===========================================================================
 * QUIETO: LA ENTRADA DE TODO EL COMBATE AUTOMATICO
 * ===========================================================================
 * Desde la Fase 17, Gus pelea solo mientras esta quieto (D-28). O sea que
 * **este booleano decide cuando el juego dispara**, y es la unica cosa que
 * el jugador controla a proposito.
 *
 * Se prueba con numeros y sin navegador porque la regla es aritmetica: un
 * contador, un umbral y un reinicio. Lo unico que hace falta mirar en el
 * telefono es si los 0,15 s **se sienten** bien, y eso ninguna prueba lo
 * puede decir.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO SE PRUEBA ACA, Y ES A PROPOSITO
 * ---------------------------------------------------------------------------
 * Que quieto mire la ENTRADA y no la velocidad. Eso no es una propiedad de
 * esta funcion: es que a esta funcion se le pasa `inputMag` y no la
 * velocidad del cuerpo. La decision vive en quien la llama, y el porque
 * esta escrito en `PLAYER.quietoDelay`.
 */

const RETARDO = PLAYER.quietoDelay;
/** Un cuadro a 60 fps. */
const CUADRO = 1 / 60;

/** Corre `n` cuadros con la misma entrada, desde un estado dado. */
const correr = (t, cuadros, inputMag, dt = CUADRO) => {
  let estado = { tiempoSinEntrada: t, quieto: false };
  for (let i = 0; i < cuadros; i++) {
    estado = avanzarQuieto(estado.tiempoSinEntrada, dt, inputMag);
  }
  return estado;
};

describe('soltar el joystick', () => {
  it('no cuenta como quieto en el mismo instante en que se suelta', () => {
    /*
     * Es la mitad del motivo por el que hay retardo: el jugador tiene que
     * VER a Gus frenar y encarar antes de que salga la bala. Sin esto, el
     * primer tiro aparece de la nada.
     */
    const r = avanzarQuieto(0, CUADRO, 0);
    expect(r.quieto).toBe(false);
  });

  it('cuenta como quieto recien pasado el retardo', () => {
    const justoAntes = avanzarQuieto(RETARDO - 0.001, 0, 0);
    expect(justoAntes.quieto).toBe(false);

    const justoDespues = avanzarQuieto(RETARDO - 0.001, 0.002, 0);
    expect(justoDespues.quieto).toBe(true);
  });

  it('el retardo es corto: a 60 cuadros por segundo son nueve', () => {
    /*
     * El numero escrito, porque es el que se va a tocar jugando. Si se
     * siente lento, lo que baja es el retardo; la regla —quieto es el
     * joystick en cero— no se toca.
     */
    const cuadros = Math.ceil(RETARDO / CUADRO);
    expect(cuadros).toBe(9);
    expect(correr(0, cuadros, 0).quieto).toBe(true);
    expect(correr(0, cuadros - 1, 0).quieto).toBe(false);
  });

  it('una vez quieto, se queda quieto mientras no toque nada', () => {
    const r = correr(0, 120, 0);
    expect(r.quieto).toBe(true);
    expect(r.tiempoSinEntrada).toBeGreaterThan(RETARDO);
  });
});

describe('tocar el joystick', () => {
  it('cualquier entrada apaga quieto en el acto, sin retardo', () => {
    /*
     * La asimetria es la regla, y es a favor del jugador: ponerse a pelear
     * tarda 0,15 s, dejar de pelear es instantaneo. Si moverse tuviera su
     * propio retardo, Gus seguiria disparando —y por lo tanto encarando al
     * blanco— durante el primer paso de la huida.
     */
    const quieto = correr(0, 30, 0);
    expect(quieto.quieto).toBe(true);

    const alTocar = avanzarQuieto(quieto.tiempoSinEntrada, CUADRO, 1);
    expect(alTocar.quieto).toBe(false);
    expect(alTocar.tiempoSinEntrada).toBe(0);
  });

  it('un empujon minimo del pulgar tambien lo apaga', () => {
    /*
     * El umbral es `> 0`, el MISMO que usa el movimiento. Con un umbral
     * propio y mas alto quedaria una franja del joystick donde Gus camina
     * despacio y dispara a la vez, que es D-28 roto en un rincon donde
     * nadie lo busca.
     */
    const r = avanzarQuieto(1, CUADRO, 0.01);
    expect(r.quieto).toBe(false);
    expect(r.tiempoSinEntrada).toBe(0);
  });
});

describe('el contador se reinicia, no se pausa', () => {
  it('soltar, tocar y volver a soltar no acumula quietud vieja', () => {
    /*
     * ESTA es la prueba que justifica el diseño.
     *
     * Con un contador que se pausara en vez de reiniciarse, un pulgar que
     * se mueve a tirones —tocar, soltar, tocar, soltar— iria sumando
     * decimas sueltas hasta cruzar el umbral, y Gus se pondria a disparar
     * **en medio de una corrida**. El jugador no tendria forma de saber por
     * que: nunca se quedo quieto.
     */
    let e = correr(0, 5, 0); // ~0,083 s quieto: todavia no alcanza
    expect(e.quieto).toBe(false);

    e = avanzarQuieto(e.tiempoSinEntrada, CUADRO, 1); // un toque
    expect(e.tiempoSinEntrada).toBe(0);

    e = correr(e.tiempoSinEntrada, 5, 0); // otros ~0,083 s
    // Sumados darian 0,166 y cruzarian el umbral. Por separado, no.
    expect(e.quieto).toBe(false);
  });

  it('despues de un toque hace falta el retardo COMPLETO de nuevo', () => {
    let e = correr(0, 30, 0);
    expect(e.quieto).toBe(true);

    e = avanzarQuieto(e.tiempoSinEntrada, CUADRO, 1);
    const cuadros = Math.ceil(RETARDO / CUADRO);
    expect(correr(e.tiempoSinEntrada, cuadros - 1, 0).quieto).toBe(false);
    expect(correr(e.tiempoSinEntrada, cuadros, 0).quieto).toBe(true);
  });
});

describe('cuadros largos', () => {
  it('un cuadro enorme no se saltea el retardo ni lo rompe', () => {
    /*
     * Pasa de verdad: tras un alt-tab o una pausa larga llega un `dt`
     * grande. El juego lo acota con `PERF.maxDeltaTime` (1/15 s), pero la
     * funcion no depende de eso y conviene que aguante igual.
     *
     * Lo correcto es que un cuadro largo SI lo deje quieto: el jugador
     * efectivamente no toco nada en todo ese rato.
     */
    const r = avanzarQuieto(0, 2, 0);
    expect(r.quieto).toBe(true);
    expect(r.tiempoSinEntrada).toBe(2);
  });

  it('con dt cero no pasa nada, ni para un lado ni para el otro', () => {
    const r = avanzarQuieto(0.05, 0, 0);
    expect(r.quieto).toBe(false);
    expect(r.tiempoSinEntrada).toBe(0.05);
  });
});
