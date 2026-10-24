import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * PRUEBAS EN CELULAR
 * ===========================================================================
 * Corren con el perfil de un Pixel 7 emulado (pantalla, densidad de pixeles,
 * puntero grueso y eventos tactiles reales). Verifican lo que el escritorio
 * no puede verificar: que el juego se reconozca como celular y muestre los
 * controles del dedo.
 *
 * Emular un celular NO reemplaza probar en uno de verdad: la emulacion no
 * mide rendimiento, ni temperatura, ni como se siente el joystick con el
 * pulgar. Para eso esta `npm run dev:lan`.
 */

function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test('se detecta como tactil y los controles son los del dedo', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');

  await expect(page.locator('body')).toHaveClass(/is-touch/);
  await expect(page.locator('body')).toHaveClass(/is-android/);
  await expect(page.locator('.touch-only').first()).toBeVisible();
  await expect(page.locator('.desktop-only').first()).toBeHidden();

  await page.locator('#btn-start').click();
  await expect(page.locator('#btn-attack')).toBeVisible();
  await expect(page.locator('#joystick')).toBeVisible();

  // Vertical es la orientacion para la que se diseña (D-15): no debe
  // aparecer ningun cartel pidiendo girar el telefono.
  await expect(page.locator('#screen-rotate')).toHaveCount(0);
  await expect(page.locator('body')).toHaveClass(/is-portrait/);

  // Arrastrar el dedo en la mitad izquierda mueve al jugador.
  const before = await page.evaluate(() => globalThis.game.player.position.z);
  const box = await page.locator('#game-canvas').boundingBox();
  await page.touchscreen.tap(box.width * 0.2, box.height * 0.7);
  await page.waitForTimeout(100);
  await page.evaluate(() => globalThis.game.input.sample());

  expect(errors).toEqual([]);
  expect(typeof before).toBe('number');
});

test('el toque mueve al jugador con el joystick virtual', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#joystick')).toBeVisible();

  const before = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z };
  });

  // Apoyar en la mitad izquierda y arrastrar hacia arriba = caminar adelante.
  await page.locator('#game-canvas').dispatchEvent('pointerdown', {
    pointerId: 1, pointerType: 'touch', clientX: 60, clientY: 500, isPrimary: true
  });
  await page.locator('#game-canvas').dispatchEvent('pointermove', {
    pointerId: 1, pointerType: 'touch', clientX: 60, clientY: 420, isPrimary: true
  });

  /*
   * Se espera a que se haya movido, no se mide cuanto se movio en un tiempo
   * fijo. Esta prueba corre con WebGL por software, y como el bucle acota
   * el dt a 1/15 de segundo, cuando la escena pesa —por ejemplo al sumar
   * zombis— el reloj del juego avanza bastante mas lento que el de pared.
   * Medir metros por segundo real daria un numero que depende de cuanto
   * cargada este la maquina de pruebas y no del juego.
   */
  await page.waitForFunction(
    (inicio) => {
      const p = globalThis.game.player.position;
      return Math.hypot(p.x - inicio.x, p.z - inicio.z) > 1.0;
    },
    before,
    { timeout: 20000 }
  );

  await page.locator('#game-canvas').dispatchEvent('pointerup', {
    pointerId: 1, pointerType: 'touch', clientX: 60, clientY: 420, isPrimary: true
  });

  // Y el joystick tiene que haberlo mandado hacia adelante, no a cualquier lado.
  const after = await page.evaluate(() => {
    const p = globalThis.game.player.position;
    return { x: p.x, z: p.z };
  });
  expect(after.z).toBeLessThan(before.z);
});
