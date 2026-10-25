import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * QUE LOS CONTROLES RECIBAN LOS TOQUES
 * ===========================================================================
 * Estas pruebas existen por un error concreto: la capa de interfaz cubria
 * la pantalla entera por encima del canvas sin `pointer-events: none`, asi
 * que se tragaba cada toque. Los botones se veian perfectos y el juego no
 * respondia a nada.
 *
 * ---------------------------------------------------------------------------
 * POR QUE LAS PRUEBAS QUE HABIA NO LO VIERON
 * ---------------------------------------------------------------------------
 * Usaban `dispatchEvent`, que entrega el evento DIRECTAMENTE al elemento
 * que uno nombra, salteando la deteccion de impacto del navegador. Es
 * decir: probaban que el manejador funciona, no que el toque llegue a el.
 * El manejador andaba perfecto. Lo que estaba roto era el camino.
 *
 * De ahi la regla de estas pruebas: **nada de `dispatchEvent`**. Se
 * pregunta quien recibe de verdad un toque en cada punto, y se usan los
 * gestos de Playwright, que hacen deteccion de impacto igual que un dedo.
 */

/** Puntos de la zona de juego que tienen que llegar al canvas. */
const ZONAS_DE_JUEGO = [
  { nombre: 'mitad izquierda, abajo (joystick)', x: 0.22, y: 0.75 },
  { nombre: 'mitad derecha, arriba (camara)', x: 0.75, y: 0.35 },
  { nombre: 'centro', x: 0.5, y: 0.5 },
  { nombre: 'izquierda, altura media', x: 0.15, y: 0.5 }
];

// El perfil de celular lo aplica el proyecto `celular` de la
// configuracion: aca no se puede, porque obligaria a abrir otro worker.
test.describe('el toque llega a donde tiene que llegar', () => {
  test('la zona de juego recibe los toques, no la capa de interfaz', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const resultados = await page.evaluate((zonas) => {
      return zonas.map((z) => {
        const x = Math.round(innerWidth * z.x);
        const y = Math.round(innerHeight * z.y);
        const el = document.elementFromPoint(x, y);
        return { nombre: z.nombre, recibe: el?.id || el?.tagName || 'nada' };
      });
    }, ZONAS_DE_JUEGO);

    for (const r of resultados) {
      expect(r.recibe, `un toque en "${r.nombre}" lo recibe ${r.recibe}`).toBe('game-canvas');
    }
  });

  test('los botones de accion reciben los toques', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    // El centro de cada boton tiene que devolver ese boton, no otra cosa.
    for (const id of ['btn-attack', 'btn-run', 'btn-pause']) {
      const quien = await page.evaluate((idBoton) => {
        const b = document.getElementById(idBoton);
        const r = b.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el?.id || el?.tagName;
      }, id);
      expect(quien, `el boton ${id} esta tapado por ${quien}`).toBe(id);
    }
  });

  test('el joystick aparece al apoyar el dedo y mueve al jugador', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const antes = await page.evaluate(() => {
      const p = globalThis.game.player.position;
      return { x: p.x, z: p.z };
    });

    /*
     * Gesto tactil de verdad, con deteccion de impacto: si algo tapara el
     * canvas, estos eventos no llegarian al manejador y el jugador no se
     * moveria. Es exactamente el caso que se escapo antes.
     */
    const caja = await page.locator('#game-canvas').boundingBox();
    const x = caja.x + caja.width * 0.22;
    const abajo = caja.y + caja.height * 0.78;
    const arriba = caja.y + caja.height * 0.58;

    const cdp = await page.context().newCDPSession(page);
    const toque = (tipo, py) =>
      cdp.send('Input.dispatchTouchEvent', {
        type: tipo,
        touchPoints: tipo === 'touchEnd' ? [] : [{ x, y: py }]
      });

    await toque('touchStart', abajo);
    await toque('touchMove', arriba);

    await expect(page.locator('#joystick')).toBeVisible();

    await page.waitForFunction(
      (inicio) => {
        const p = globalThis.game.player.position;
        return Math.hypot(p.x - inicio.x, p.z - inicio.z) > 1.0;
      },
      antes,
      { timeout: 20000 }
    );

    await toque('touchEnd', arriba);

    // Y al soltar tiene que frenar.
    const alSoltar = await page.evaluate(() => {
      const p = globalThis.game.player.position;
      return { x: p.x, z: p.z };
    });
    await page.waitForTimeout(600);
    const despues = await page.evaluate(() => {
      const p = globalThis.game.player.position;
      return { x: p.x, z: p.z };
    });
    expect(Math.hypot(despues.x - alSoltar.x, despues.z - alSoltar.z)).toBeLessThan(2);
  });

  test('el joystick NO se come el toque: se puede volver a apoyar donde esta', async ({
    page
  }) => {
    /*
     * El error que reporto Gustavo jugando, y que es dificil de imaginar
     * leyendo el codigo:
     *
     *   1. Apoyas el dedo en la zona de movimiento -> no pasa nada.
     *   2. Apoyas en otro lado -> anda, y el joystick se MUEVE ahi.
     *   3. Volves a apoyar en ese mismo lugar -> deja de andar.
     *
     * O sea que el joystick se escapaba del dedo. La causa era
     * `pointer-events: auto` sobre el dibujo del joystick: se convertia en
     * una tapa justo encima del lugar donde el jugador acaba de tocar.
     *
     * La prueba hace exactamente esa secuencia: toca, suelta, y vuelve a
     * tocar EL MISMO PUNTO. Lo que importa es el segundo toque.
     */
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const caja = await page.locator('#game-canvas').boundingBox();
    const x = caja.x + caja.width * 0.25;
    const abajo = caja.y + caja.height * 0.76;
    const arriba = caja.y + caja.height * 0.56;

    const cdp = await page.context().newCDPSession(page);
    const toque = (tipo, py) =>
      cdp.send('Input.dispatchTouchEvent', {
        type: tipo,
        touchPoints: tipo === 'touchEnd' ? [] : [{ x, y: py }]
      });

    const posicion = () =>
      page.evaluate(() => {
        const p = globalThis.game.player.position;
        return { x: p.x, z: p.z };
      });

    // --- Primer toque: deja el joystick dibujado en este punto ------------
    const antes1 = await posicion();
    await toque('touchStart', abajo);
    await toque('touchMove', arriba);
    await page.waitForFunction(
      (ini) => {
        const p = globalThis.game.player.position;
        return Math.hypot(p.x - ini.x, p.z - ini.z) > 1.0;
      },
      antes1,
      { timeout: 20000 }
    );
    await toque('touchEnd', arriba);
    await page.waitForTimeout(500);

    // El joystick quedo donde se apoyo el dedo. Se comprueba, porque si no
    // quedara ahi la segunda parte de la prueba no probaria nada.
    const tapando = await page.evaluate(
      ([px, py]) => {
        const el = document.elementFromPoint(px, py);
        return el?.id || el?.className || el?.tagName;
      },
      [x, abajo]
    );
    expect(tapando, `un toque donde esta el joystick lo recibe ${tapando}`).toBe(
      'game-canvas'
    );

    // --- Segundo toque, EXACTAMENTE en el mismo lugar ---------------------
    const antes2 = await posicion();
    await toque('touchStart', abajo);
    await toque('touchMove', arriba);
    await page.waitForFunction(
      (ini) => {
        const p = globalThis.game.player.position;
        return Math.hypot(p.x - ini.x, p.z - ini.z) > 1.0;
      },
      antes2,
      { timeout: 20000 }
    );
    await toque('touchEnd', arriba);
  });

  test('tocar ATACAR dispara el ataque', async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const caja = await page.locator('#btn-attack').boundingBox();
    const cx = caja.x + caja.width / 2;
    const cy = caja.y + caja.height / 2;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: cx, y: cy }]
    });

    // El arma tiene que haber salido de LISTA.
    await page.waitForFunction(() => globalThis.game.arma.estado !== 'LISTA', null, {
      timeout: 10000
    });

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  });

  test('el boton de empezar responde a un toque real', async ({ page }) => {
    await page.goto('/');

    /*
     * `click()` de Playwright comprueba que el elemento RECIBA eventos de
     * puntero antes de tocarlo: si algo lo tapara, falla con un mensaje
     * explicito en vez de pasar en silencio.
     */
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();
    await expect(page.locator('#screen-boot')).toBeHidden();
  });
});
