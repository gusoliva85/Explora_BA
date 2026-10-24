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
  expect(worldStats.boxes).toBeGreaterThan(40);
  expect(worldStats.colliders).toBeGreaterThan(20);

  // Caminar hacia adelante tiene que mover al jugador.
  const before = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z };
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z };
  });
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  expect(moved).toBeGreaterThan(0.5);

  expect(errors).toEqual([]);
});

test('el jugador no atraviesa los edificios', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  // Se lo empuja con fuerza contra la fila de edificios del lado este.
  const result = await page.evaluate(async () => {
    const { player, collision } = globalThis.game;
    player.teleport(0, -40);
    for (let i = 0; i < 200; i++) {
      const p = player.position;
      const r = collision.moveCircle({ x: p.x, z: p.z }, 0.5, 0, player.radius);
      player.entity.setPosition(r.x, 0, r.z);
    }
    const p = player.position;
    // ¿Quedo dentro de alguna caja solida?
    const inside = collision.boxes.some((b) => b.contains(p.x, p.z));
    return { x: p.x, inside };
  });

  expect(result.inside).toBe(false);
  // Tiene que haberse frenado contra la fachada, no haberse ido a 100 m.
  expect(result.x).toBeLessThan(30);
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

test('en escritorio muestra ayudas de teclado y oculta los botones tactiles', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toHaveClass(/is-desktop/);
  await expect(page.locator('.desktop-only').first()).toBeVisible();
  await expect(page.locator('.touch-only').first()).toBeHidden();

  await page.locator('#btn-start').click();
  await expect(page.locator('#joystick')).toBeHidden();
  await expect(page.locator('.action-cluster')).toBeHidden();
});

test('forzar el modo tactil por URL cambia el HUD sin recargar nada mas', async ({ page }) => {
  await page.goto('/?input=touch');

  await expect(page.locator('body')).toHaveClass(/is-touch/);
  await expect(page.locator('.touch-only').first()).toBeVisible();
  await expect(page.locator('.desktop-only').first()).toBeHidden();

  await page.locator('#btn-start').click();
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#btn-attack')).toBeVisible();
});

test('el boton de la pausa alterna entre los dos esquemas de control', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await page.locator('#btn-pause').click();

  await expect(page.locator('#input-mode-label')).toHaveText('TECLADO');
  await page.locator('#btn-toggle-input').click();
  await expect(page.locator('#input-mode-label')).toHaveText('TACTIL');
  await expect(page.locator('body')).toHaveClass(/is-touch/);

  await page.locator('#btn-toggle-input').click();
  await expect(page.locator('body')).toHaveClass(/is-desktop/);
});
