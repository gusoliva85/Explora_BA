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
  /*
   * La vida se LEE del balance, no se escribe a mano.
   *
   * Decia `'100'`, y la Fase 17.1 la subio a 120 (D-31): tres pruebas
   * distintas se rompieron a la vez por el mismo motivo, en tres archivos.
   * Ninguna estaba midiendo el numero 100: las tres median que el HUD
   * arranque con la vida llena, que el reaparecer cure del todo, y que el
   * checkpoint devuelva entero.
   */
  const vidaLlena = await page.evaluate(() => globalThis.game.balance.PLAYER.maxHealth);
  await expect(page.locator('#health-text')).toHaveText(String(vidaLlena));

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
   * No se empuja hacia "la derecha": se empuja **de costado a la calle**.
   *
   * Esta prueba ya habia aprendido una vez a no suponer donde estaba la
   * pared —buscaba una fachada en vez de usar una coordenada fija— y se
   * volvio a romper en la 18.3, cuando el recorrido paso de salir al sur a
   * salir al oeste: el filtro miraba `minX` y `minZ` como si la calle
   * corriera siempre en Z.
   *
   * La leccion, otra vez y mas fuerte: **lo que no se puede suponer no es
   * la coordenada, es la direccion**. Ahora la prueba le pregunta a la ruta
   * hacia donde va el primer tramo, empuja perpendicular a eso, y exige que
   * el jugador frene antes del ancho de la calle. Da igual hacia donde
   * salga el recorrido.
   */
  const result = await page.evaluate(() => {
    const { player, collision, mission, balance } = globalThis.game;
    const r = mission.mission.route;

    // Direccion del primer tramo, y su perpendicular.
    const dx = r[1].x - r[0].x;
    const dz = r[1].z - r[0].z;
    const largo = Math.hypot(dx, dz);
    const perp = { x: -dz / largo, z: dx / largo };

    // En el medio del primer tramo, en el eje de la calzada.
    const medio = { x: (r[0].x + r[1].x) / 2, z: (r[0].z + r[1].z) / 2 };
    player.teleport(medio.x, medio.z);

    for (let i = 0; i < 200; i++) {
      const p = player.position;
      const paso = collision.moveCircle(
        { x: p.x, z: p.z },
        perp.x * 0.5,
        perp.z * 0.5,
        player.radius
      );
      player.entity.setPosition(paso.x, 0, paso.z);
    }

    const p = player.position;
    /*
     * Cuanto se corrio de costado. El tope es media calzada mas la vereda:
     * mas que eso significa que atraveso la fachada.
     */
    const corrimiento =
      (p.x - medio.x) * perp.x + (p.z - medio.z) * perp.z;
    const tope = balance.UNITS.streetWidth / 2 + balance.UNITS.sidewalkWidth;

    return {
      corrimiento,
      tope,
      x: p.x,
      z: p.z,
      dentro: collision.boxes.some((b) => b.contains(p.x, p.z))
    };
  });

  // Nunca puede quedar dentro de una caja solida.
  expect(result.dentro).toBe(false);
  /*
   * Y tiene que haberse frenado contra la fachada, no haberla atravesado.
   * Cien metros de empuje lateral contra un tope de ocho: si lo pasa, no
   * es que resbalo, es que la pared no estaba.
   */
  expect(
    Math.abs(result.corrimiento),
    `se corrio ${result.corrimiento.toFixed(1)} m de costado, tope ${result.tope}`
  ).toBeLessThan(result.tope + 0.5);
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

  /*
   * El tiempo se busca en el MARCADOR, no en el subtitulo.
   *
   * Antes esta prueba pedia que el subtitulo tuviera dos puntos, como
   * manera barata de comprobar que mostraba un reloj. Ese reloj se saco a
   * proposito: habia dos relojes en el juego y la pantalla de victoria
   * mostraba uno arriba y otro abajo, con numeros distintos. Ahora el
   * tiempo vive en un solo lugar, y aca se lo comprueba ahi.
   */
  await expect(page.locator('#marcador-win')).toContainText('TIEMPO');
  await expect(page.locator('#marcador-win')).toContainText(/\d+:\d{2}/);
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
    return {
      x: p.x,
      z: p.z,
      health: globalThis.game.player.health,
      vidaLlena: globalThis.game.balance.PLAYER.maxHealth,
      control: (() => {
        const m = globalThis.game.mission.mission;
        const cp = m.checkpoints[0];
        const q = m.route[cp.atRouteIndex];
        return { x: q.x, z: q.z, radius: cp.radius };
      })()
    };
  });
  /*
   * Reaparece EN EL CONTROL, no en el origen.
   *
   * El numero se le pide a la mision. Decia `z < -50`, que era cierto
   * mientras el primer control cayera al sur; desde la 18.3 el recorrido
   * sale al oeste y el primer control esta en (-200, 0).
   */
  expect(Math.hypot(pos.x - pos.control.x, pos.z - pos.control.z)).toBeLessThan(
    pos.control.radius + 2
  );
  // Y entero: lo que se prueba es que cure del todo, no que cure a 120.
  expect(pos.health).toBe(pos.vidaLlena);
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
  // Era `.action-cluster`, el contenedor de los seis botones. Se fue en la
  // 16.8 junto con el penultimo boton: ahora se mira el boton directo.
  await expect(page.locator('#btn-attack')).toBeVisible();
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
