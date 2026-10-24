import { test, expect, devices } from '@playwright/test';

/**
 * ===========================================================================
 * PRUEBA DE HUMO
 * ===========================================================================
 * Abre el juego en un navegador real, empieza la mision, camina y comprueba
 * que no hubo un solo error en consola. Es la red de seguridad que avisa si
 * un cambio rompio el arranque, y corre en segundos con `npm run test:e2e`.
 *
 * No reemplaza probar a mano en el telefono: mide que el juego FUNCIONE, no
 * que se SIENTA bien. Eso ultimo solo se sabe jugando.
 */

/** Recolecta errores de consola y excepciones no capturadas. */
function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test('el juego arranca, se juega y no tira errores', async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto('/');
  await expect(page.locator('#btn-start')).toBeVisible();

  await page.locator('#btn-start').click();

  // El HUD aparece y la pantalla de arranque se va.
  await expect(page.locator('#screen-hud')).toBeVisible();
  await expect(page.locator('#screen-boot')).toBeHidden();
  await expect(page.locator('#health-text')).toHaveText('100');

  // El mundo se construyo con una cantidad razonable de geometria.
  const worldStats = await page.evaluate(() => globalThis.game.builder.stats);
  expect(worldStats.piezas).toBeGreaterThan(200);
  expect(worldStats.props).toBeGreaterThan(50);
  expect(worldStats.colliders).toBeGreaterThan(60);

  /*
   * Caminar hacia adelante tiene que mover al jugador.
   *
   * Se espera a que se haya movido, en vez de medir cuanto se movio en un
   * tiempo fijo. El motivo: esta prueba corre con WebGL por software, y
   * como el bucle acota el dt a 1/15 de segundo (ver PERF.maxDeltaTime),
   * cuando la escena pesa el reloj del juego avanza bastante mas lento que
   * el de pared. Medir metros por segundo de reloj real daria un numero
   * que depende de lo cargada que este la maquina de pruebas, no del
   * juego.
   */
  const before = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z };
  });
  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    (inicio) => {
      const p = globalThis.game.player.position;
      return Math.hypot(p.x - inicio.x, p.z - inicio.z) > 1.5;
    },
    before,
    { timeout: 15000 }
  );
  await page.keyboard.up('KeyW');

  // Y la direccion tiene que ser la correcta: al arrancar, calle abajo.
  const after = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z };
  });
  expect(after.z).toBeLessThan(before.z);

  expect(errors).toEqual([]);
});

test('el jugador no atraviesa los edificios', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  /*
   * La pared contra la que se empuja se BUSCA en el mundo, no se asume.
   *
   * Antes la prueba empujaba al jugador desde una coordenada fija hacia la
   * derecha, dando por sentado que ahi habia una fachada. Al abrir las
   * bocas de los pasajes, esa fachada dejo de existir y la prueba empezo a
   * fallar sin que nada estuviera roto. Buscando una pared de verdad, la
   * prueba sigue valiendo aunque el mapa cambie.
   */
  const result = await page.evaluate(() => {
    const { player, collision } = globalThis.game;

    // Una fachada del lado derecho del primer tramo, lejos de los pasajes.
    const pared = collision.boxes
      .filter(
        (b) =>
          b.tag === 'building' &&
          b.minX > 6 &&
          b.minX < 26 &&
          b.minZ < -14 &&
          b.maxZ > -34
      )
      .sort((a, b) => a.minX - b.minX)[0];

    if (!pared) return { sinPared: true };

    // Arrancar enfrente de esa pared, en el medio de la calzada.
    const z = Math.max(pared.minZ, -32);
    player.teleport(0, z);

    for (let i = 0; i < 200; i++) {
      const p = player.position;
      const r = collision.moveCircle({ x: p.x, z: p.z }, 0.5, 0, player.radius);
      player.entity.setPosition(r.x, 0, r.z);
    }

    const p = player.position;
    return {
      x: p.x,
      z: p.z,
      limite: pared.minX,
      dentro: collision.boxes.some((b) => b.contains(p.x, p.z))
    };
  });

  expect(result.sinPared, 'no se encontro ninguna fachada contra la que probar').toBeFalsy();
  // Nunca puede quedar dentro de una caja solida.
  expect(result.dentro).toBe(false);
  // Y tiene que haberse frenado contra la pared, no haberla atravesado.
  expect(result.x).toBeLessThan(result.limite + 0.5);
});

test('la mision se completa al recorrer los controles y llegar a la meta', async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  await page.evaluate(async () => {
    const { player, mission } = globalThis.game;
    const m = mission.mission;
    const visit = (p) =>
      new Promise((resolve) => {
        player.teleport(p.x, p.z);
        // Dos frames: uno para mover, otro para que el MissionManager lo lea.
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

    for (const cp of m.checkpoints) await visit(m.route[cp.atRouteIndex]);
    await visit(m.route[m.goal.atRouteIndex]);
  });

  await expect(page.locator('#screen-complete')).toBeVisible();
  await expect(page.locator('#complete-detail')).toContainText(':');
  expect(errors).toEqual([]);
});

test('morir lleva a la pantalla de derrota y se reanuda en el ultimo control', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  // Tomar el primer control, despues morir.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const { player, mission } = globalThis.game;
        const cp = mission.mission.route[mission.mission.checkpoints[0].atRouteIndex];
        player.teleport(cp.x, cp.z);
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      })
  );
  await page.evaluate(() => globalThis.game.player.applyDamage(999, 'test'));

  await expect(page.locator('#screen-gameover')).toBeVisible();
  await expect(page.locator('#gameover-detail')).toContainText('control 1');

  await page.locator('#btn-restart-lose').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const pos = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z, health: globalThis.game.player.health };
  });
  // Reaparece en el control, no en el origen.
  expect(pos.z).toBeLessThan(-50);
  expect(pos.health).toBe(100);
});

test('la pausa congela la simulacion', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  await page.locator('#btn-pause').click();
  await expect(page.locator('#screen-paused')).toBeVisible();

  const before = await page.evaluate(() => globalThis.game.player.position.z);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => globalThis.game.player.position.z);
  expect(after).toBeCloseTo(before, 3);

  await page.locator('#btn-resume').click();
  await expect(page.locator('#screen-paused')).toBeHidden();
});

/* =========================================================================
   Deteccion de dispositivo: celular vs escritorio
   ========================================================================= */

test('arranca en modo tactil, aunque sea una computadora', async ({ page }) => {
  /*
   * Es la decision deliberada: el juego se diseña para el celular y
   * arranca en tactil siempre. En la computadora el teclado sigue
   * funcionando igual; lo unico que cambia es que se dibujan los botones.
   */
  await page.goto('/');

  await expect(page.locator('body')).toHaveClass(/is-touch/);
  await expect(page.locator('.touch-only').first()).toBeVisible();
  await expect(page.locator('.desktop-only').first()).toBeHidden();

  await page.locator('#btn-start').click();
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('.action-cluster')).toBeVisible();
});

test('forzar el modo teclado por URL cambia el HUD', async ({ page }) => {
  await page.goto('/?input=desktop');

  await expect(page.locator('body')).toHaveClass(/is-desktop/);
  await expect(page.locator('.desktop-only').first()).toBeVisible();
  await expect(page.locator('.touch-only').first()).toBeHidden();

  await page.locator('#btn-start').click();
  await expect(page.locator('#joystick')).toBeHidden();
});

test('el boton de la pausa alterna entre los dos esquemas de control', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await page.locator('#btn-pause').click();

  await expect(page.locator('#input-mode-label')).toHaveText('TACTIL');
  await page.locator('#btn-toggle-input').click();
  await expect(page.locator('#input-mode-label')).toHaveText('TECLADO');
  await expect(page.locator('body')).toHaveClass(/is-desktop/);

  await page.locator('#btn-toggle-input').click();
  await expect(page.locator('body')).toHaveClass(/is-touch/);
});

test('los ajustes se guardan y sobreviven a recargar', async ({ page }) => {
  /*
   * Es lo que importa al probar en el celular: elegir una vez y que quede.
   * Sin esto, cada vez que se recarga hay que volver a tocar el boton.
   */
  await page.goto('/');
  await page.locator('#btn-start').click();
  await page.locator('#btn-pause').click();

  await expect(page.locator('#calidad-label')).toHaveText('NORMAL');
  await page.locator('#btn-toggle-calidad').click();
  await expect(page.locator('#calidad-label')).toHaveText('ALTA');

  await page.locator('#btn-toggle-input').click();
  await expect(page.locator('#input-mode-label')).toHaveText('TECLADO');

  // Recargar: la eleccion tiene que seguir ahi.
  await page.reload();
  await page.locator('#btn-start').click();
  await page.locator('#btn-pause').click();

  await expect(page.locator('#calidad-label')).toHaveText('ALTA');
  await expect(page.locator('#input-mode-label')).toHaveText('TECLADO');
  await expect(page.locator('body')).toHaveClass(/is-desktop/);
});

test('cambiar la calidad se aplica en vivo, sin recargar', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();

  const antes = await page.evaluate(() => ({
    taa: globalThis.game.postProceso.taa.enabled,
    escala: globalThis.game.postProceso.rendering.renderTargetScale
  }));

  await page.locator('#btn-pause').click();
  await page.locator('#btn-toggle-calidad').click();
  await page.locator('#btn-resume').click();
  await page.waitForTimeout(300);

  const despues = await page.evaluate(() => ({
    taa: globalThis.game.postProceso.taa.enabled,
    escala: globalThis.game.postProceso.rendering.renderTargetScale
  }));

  // NORMAL renderiza por debajo de la nativa y sin suavizado temporal;
  // ALTA hace las dos cosas al reves.
  expect(antes.taa).toBe(false);
  expect(antes.escala).toBeLessThan(1);
  expect(despues.taa).toBe(true);
  expect(despues.escala).toBe(1);
});
