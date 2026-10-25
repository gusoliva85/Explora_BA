import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * OBJETOS DEL CONTROL Y APUNTADO CON EL PULGAR
 * ===========================================================================
 * Lo que las unitarias no pueden ver: que llegar a un control dispare el
 * surtido de verdad, que caminarlo lo levante, y que arrastrar el boton de
 * disparar gire al personaje.
 */

const CUADROS = `(n) => new Promise((r) => {
  let i = 0;
  const paso = () => (++i >= n ? r() : requestAnimationFrame(paso));
  requestAnimationFrame(paso);
})`;

async function entrar(page) {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();
}

/** Lleva al jugador al primer control y espera a que suelte el surtido. */
async function llegarAlControl(page) {
  return page.evaluate(async (cuadrosSrc) => {
    const esperar = eval(cuadrosSrc);
    const g = globalThis.game;
    const cp = g.mission.mission.checkpoints[0];
    const punto = g.mission.mission.route[cp.atRouteIndex];
    g.player.teleport(punto.x, punto.z);
    await esperar(20);
    return { enPiso: g.objetos.contar(), vistas: g.vistaObjetos.vistas.size };
  }, CUADROS);
}

test.describe('el surtido del control', () => {
  test('llegar a un control deja dos municiones y un botiquin en el piso', async ({
    page
  }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);

    // Antes de llegar no hay nada tirado.
    expect(await page.evaluate(() => globalThis.game.objetos.contar())).toEqual({});

    const r = await llegarAlControl(page);
    expect(r.enPiso).toEqual({ municion: 2, botiquin: 1 });
    // Y cada uno tiene su entidad en escena, no solo una entrada en una lista.
    expect(r.vistas).toBe(3);
    expect(errores).toEqual([]);
  });

  test('caminar sobre ellos los levanta: +24 balas y media vida', async ({ page }) => {
    await entrar(page);
    await llegarAlControl(page);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const maximo = g.balance.PLAYER.maxHealth;

      // Gastado: un cuarto de vida y sin reserva, para que todo sirva.
      g.player.health = maximo * 0.25;
      g.arma.cambiarA('pistol');
      g.arma.reserva.pistol = 0;
      await esperar(3);

      const vidaAntes = g.player.health;
      const posiciones = g.objetos.enElPiso.map((o) => ({ x: o.x, z: o.z }));
      for (const o of posiciones) {
        g.player.teleport(o.x, o.z);
        await esperar(4);
      }
      await esperar(3);

      return {
        maximo,
        vidaAntes,
        vidaDespues: g.player.health,
        reserva: g.arma.enReserva,
        quedan: g.objetos.contar(),
        vistas: g.vistaObjetos.vistas.size
      };
    }, CUADROS);

    // Dos cajas de doce.
    expect(r.reserva).toBe(24);

    /*
     * El ejemplo exacto que pidio Gustavo: con un cuarto de vida, el
     * botiquin deja tres cuartos. Cura la mitad del TOTAL y se suma.
     */
    expect(r.vidaAntes).toBe(r.maximo * 0.25);
    expect(r.vidaDespues).toBe(r.maximo * 0.75);

    // Y no queda nada tirado ni ninguna entidad colgada.
    expect(r.quedan).toEqual({});
    expect(r.vistas).toBe(0);
  });

  test('lo que no sirve se queda en el piso', async ({ page }) => {
    /*
     * La regla que evita que un botiquin pisado con la vida llena se
     * pierda para siempre sin que el jugador se entere.
     */
    await entrar(page);
    await llegarAlControl(page);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      // Vida llena y reserva llena: nada sirve.
      g.player.health = g.balance.PLAYER.maxHealth;
      g.arma.reserva.pistol = 9999;
      await esperar(3);

      for (const o of g.objetos.enElPiso.map((x) => ({ x: x.x, z: x.z }))) {
        g.player.teleport(o.x, o.z);
        await esperar(4);
      }
      const intactos = g.objetos.contar();

      // Ahora si hace falta: se levanta lo mismo que antes se ignoro.
      g.player.health = 30;
      g.arma.reserva.pistol = 0;
      for (const o of g.objetos.enElPiso.map((x) => ({ x: x.x, z: x.z }))) {
        g.player.teleport(o.x, o.z);
        await esperar(4);
      }
      await esperar(3);

      return { intactos, despues: g.objetos.contar(), vida: g.player.health };
    }, CUADROS);

    expect(r.intactos, 'levanto cosas que no le servian').toEqual({
      municion: 2,
      botiquin: 1
    });
    expect(r.despues).toEqual({});
    expect(r.vida).toBe(80); // 30 + la mitad de 100
  });

  test('reiniciar la mision limpia lo que habia quedado tirado', async ({ page }) => {
    await entrar(page);
    await llegarAlControl(page);

    await page.locator('#btn-pause').click();
    await page.locator('#btn-restart-pause').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const r = await page.evaluate(() => ({
      enPiso: globalThis.game.objetos.contar(),
      vistas: globalThis.game.vistaObjetos.vistas.size
    }));
    expect(r.enPiso).toEqual({});
    expect(r.vistas).toBe(0);
  });
});

test.describe('apuntar arrastrando el boton de disparar', () => {
  /*
   * ATENCION CON LOS TIEMPOS.
   *
   * Este navegador corre con WebGL por software y el bucle del juego
   * avanza a unos CUATRO cuadros por segundo. Un `waitForTimeout(300)`
   * puede no incluir ni un solo cuadro, asi que leer "lo que dibujo el
   * juego" despues de un tiempo fijo da resultados al azar: la primera
   * version de estas pruebas fallaba por eso y el juego estaba bien.
   *
   * Por eso todo lo que dependa del bucle se espera POR CONDICION. En un
   * telefono de verdad, a 60 cuadros, nada de esto se nota.
   */

  /** Espera a que el bucle del juego corra al menos `n` cuadros. */
  async function correrCuadros(page, n = 2) {
    await page.evaluate(() => {
      if (globalThis.__cuadros === undefined) {
        globalThis.__cuadros = 0;
        globalThis.game.app.on('update', () => {
          globalThis.__cuadros++;
        });
      }
      globalThis.__desde = globalThis.__cuadros;
    });
    await page.waitForFunction(
      (n) => globalThis.__cuadros - globalThis.__desde >= n,
      n,
      { timeout: 20000 }
    );
  }

  /** Arrastra el boton de atacar y deja el dedo apoyado. */
  async function arrastrar(page, dx, dy) {
    const caja = await page.locator('#btn-attack').boundingBox();
    const cx = caja.x + caja.width / 2;
    const cy = caja.y + caja.height / 2;
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx, y: cy }]
    });
    // En varios pasos, como un pulgar de verdad.
    for (const k of [0.4, 0.7, 1]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx + dx * k, y: cy + dy * k }]
      });
    }
    // El manejador del dedo es inmediato; lo que tarda es el bucle.
    await page.waitForFunction(() => globalThis.game.input.apuntando, null, {
      timeout: 10000
    });
    await correrCuadros(page, 2);
    return cdp;
  }

  /** Suelta el dedo y espera a que el juego se entere. */
  async function soltar(page, cdp) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => !globalThis.game.input.apuntando, null, {
      timeout: 10000
    });
    await correrCuadros(page, 2);
  }

  test('un arrastre gira al personaje y enciende la mira', async ({ page }) => {
    await entrar(page);

    // Sin balas: lo que se mide es el apuntado, no el disparo.
    await page.evaluate(() => {
      const g = globalThis.game;
      g.arma.cambiarA('pistol');
      g.arma.cargador.pistol = 0;
      g.arma.reserva.pistol = 0;
    });

    const antes = await page.evaluate(() => ({
      yaw: globalThis.game.player.yaw,
      mira: globalThis.game.efectos.mira.enabled,
      apuntando: globalThis.game.input.apuntando
    }));
    expect(antes.mira).toBe(false);
    expect(antes.apuntando).toBe(false);

    const cdp = await arrastrar(page, -40, -80);

    const durante = await page.evaluate(() => {
      const g = globalThis.game;
      const m = g.efectos.mira;
      return {
        apuntando: g.input.apuntando,
        mira: m.enabled,
        alturaMira: +m.getPosition().y.toFixed(2),
        largoMira: +m.getLocalScale().z.toFixed(1),
        alcance: g.arma.arma.range,
        yaw: g.player.yaw
      };
    });

    expect(durante.apuntando, 'el arrastre no se leyo como apuntado').toBe(true);
    expect(durante.mira).toBe(true);
    expect(durante.yaw).not.toBeCloseTo(antes.yaw, 1);

    /*
     * La mira mide el alcance REAL del arma, no un largo decorativo: es lo
     * que hace entender sin leer nada la diferencia entre el cuchillo y la
     * pistola.
     */
    expect(durante.largoMira).toBeGreaterThan(durante.alcance - 1.5);

    /*
     * Y va por encima del cordon. El mundo es plano en y=0 con las veredas
     * como cajas de 15 cm: dibujada mas abajo, la mira desaparecia al
     * subir a la vereda, que es justo donde uno se para a cubrirse.
     */
    expect(durante.alturaMira).toBeGreaterThan(0.15);

    await soltar(page, cdp);

    const despues = await page.evaluate(() => ({
      apuntando: globalThis.game.input.apuntando,
      mira: globalThis.game.efectos.mira.enabled
    }));
    expect(despues.apuntando).toBe(false);
    expect(despues.mira, 'la mira quedo encendida al soltar').toBe(false);
  });

  test('arrastres opuestos apuntan a rumbos opuestos', async ({ page }) => {
    await entrar(page);
    await page.evaluate(() => {
      const g = globalThis.game;
      g.arma.cambiarA('pistol');
      g.arma.cargador.pistol = 0;
      g.arma.reserva.pistol = 0;
    });

    const medir = async (dx, dy) => {
      const cdp = await arrastrar(page, dx, dy);
      const yaw = await page.evaluate(() => globalThis.game.player.yaw);
      await soltar(page, cdp);
      return yaw;
    };

    const arriba = await medir(0, -80);
    const abajo = await medir(0, 80);

    // Media vuelta de diferencia, cruzando bien el salto de los 360.
    const dif = Math.abs(((arriba - abajo + 540) % 360) - 180);
    expect(dif, `arriba ${arriba}, abajo ${abajo}`).toBeGreaterThan(170);
  });

  test('un toque corto NO se lee como apuntado', async ({ page }) => {
    /*
     * Un pulgar nunca toca un punto exacto: al apoyarlo y levantarlo se
     * mueve unos pixeles solo. Sin umbral, cada disparo simple saldria
     * apuntado a un lado al azar, que es peor que no tener apuntado.
     */
    await entrar(page);

    const caja = await page.locator('#btn-attack').boundingBox();
    const cx = caja.x + caja.width / 2;
    const cy = caja.y + caja.height / 2;
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx, y: cy }]
    });
    // Un temblor de 6 px: menos que el umbral.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cx + 4, y: cy - 4 }]
    });
    await correrCuadros(page, 2);

    const r = await page.evaluate(() => ({
      apuntando: globalThis.game.input.apuntando,
      atacando: globalThis.game.input.buttons.attack
    }));

    expect(r.atacando, 'el boton no se apreto').toBe(true);
    expect(r.apuntando, 'un temblor de pulgar se leyo como apuntado').toBe(false);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  });
});
