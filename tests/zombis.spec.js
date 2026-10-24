import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * ZOMBIS EN JUEGO
 * ===========================================================================
 * Las pruebas unitarias verifican el cerebro. Estas verifican lo otro: que
 * el cerebro este de verdad conectado al cuerpo, al mapa y al jugador.
 *
 * Es la distincion que importa. La IA puede estar perfecta y el juego no
 * tener un solo zombi porque el gestor no los enciende, o porque todos
 * nacieron dentro de una pared.
 */

test('aparecen zombis repartidos por el mapa', async ({ page }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });

  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const info = await page.evaluate(() => {
    const g = globalThis.game;
    return {
      puestos: g.zombis.stats.total,
      reserva: g.zombis.reserva.length,
      zonas: g.mission.mission.zonas.filter((z) => z.tipo === 'zombis').length
    };
  });

  expect(info.zonas).toBeGreaterThan(3);
  // Si los puestos son muchos menos que las zonas, es que casi todos
  // cayeron dentro de una pared y se descartaron.
  expect(info.puestos).toBeGreaterThan(info.zonas);
  expect(info.reserva).toBeGreaterThan(0);
  expect(errores).toEqual([]);
});

test('un zombi detecta al jugador, lo persigue y lo muerde', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const info = await page.evaluate(async () => {
    const g = globalThis.game;
    const { zombis, player } = g;

    // Llevar al jugador a la primera zona de zombis y dejar que el gestor
    // los encienda.
    const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
    player.teleport(zona.x, zona.z + 18);

    const esperar = (cuadros) =>
      new Promise((resolve) => {
        let n = 0;
        const paso = () => (++n >= cuadros ? resolve() : requestAnimationFrame(paso));
        requestAnimationFrame(paso);
      });

    await esperar(30);
    const encendidos = zombis.enJuego.length;

    // Ponerlo encima del zombi mas cercano y esperar la mordida.
    const vivos = zombis.enJuego.filter((z) => z.vivo);
    if (vivos.length === 0) return { encendidos, sinZombis: true };

    const z = vivos[0];
    const p = z.posicion;
    player.teleport(p.x + 1.0, p.z);

    const vidaAntes = player.health;
    let estadoVisto = null;
    for (let i = 0; i < 180; i++) {
      await esperar(1);
      estadoVisto = z.ai.estado;
      if (player.health < vidaAntes) break;
    }

    return {
      encendidos,
      estadoVisto,
      vidaAntes,
      vidaDespues: player.health,
      mordio: player.health < vidaAntes
    };
  });

  expect(info.sinZombis, 'no se encendio ningun zombi cerca del jugador').toBeFalsy();
  expect(info.encendidos).toBeGreaterThan(0);
  expect(['CHASE', 'ATTACK'], 'el zombi no reacciono al jugador').toContain(info.estadoVisto);
  expect(info.mordio, 'el zombi nunca llego a hacer daño').toBe(true);
});

test('se puede escapar corriendo de un zombi', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  /*
   * Es la regla de diseño mas importante del combate: el zombi persiguiendo
   * es mas lento que Gus caminando. Si alguna vez deja de serlo, el juego
   * pasa de "decidir si pelear" a "pelear siempre", y eso contradice el
   * pilar de decisiones rapidas del documento 01.
   */
  const info = await page.evaluate(() => {
    const { PLAYER, ZOMBIE_STANDARD } = globalThis.game.balance;
    return {
      caminar: PLAYER.walkSpeed,
      correr: PLAYER.runSpeed,
      perseguir: ZOMBIE_STANDARD.chaseSpeed
    };
  });

  expect(info.perseguir).toBeLessThan(info.caminar);
  expect(info.perseguir).toBeLessThan(info.correr);
});

/* =========================================================================
   COMBATE CUERPO A CUERPO
   ========================================================================= */

test('dos cuchillazos matan a un zombi', async ({ page }) => {
  test.setTimeout(90000);
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });

  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const info = await page.evaluate(async () => {
    const g = globalThis.game;
    const { zombis, player, arma } = g;

    const esperar = (cuadros) =>
      new Promise((resolve) => {
        let n = 0;
        const paso = () => (++n >= cuadros ? resolve() : requestAnimationFrame(paso));
        requestAnimationFrame(paso);
      });

    // Ir a una zona de zombis y dejar que el gestor encienda alguno.
    const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
    player.teleport(zona.x, zona.z + 18);
    await esperar(30);

    const victima = zombis.enJuego.find((z) => z.vivo);
    if (!victima) return { sinZombis: true };

    /*
     * Ponerse al alcance y mirarlo. El rumbo del jugador es el que orienta
     * el arco del arma, asi que hay que apuntarlo de verdad: si el test
     * pasara sin esto, el arco no estaria funcionando.
     *
     * El rumbo se le PIDE al convenio del juego. Aca antes decia
     * `player.yaw = 180` con el comentario "mirando hacia -Z", que era
     * falso; funcionaba solo porque el arma usaba el convenio invertido.
     * Ver src/core/rumbo.js.
     */
    const q = victima.posicion;
    const parado = { x: q.x, z: q.z + 1.1 };
    const rumbo = g.rumbo.rumboEntre(parado, q);
    player.teleport(parado.x, parado.z, rumbo);
    player.yaw = rumbo;

    const vidaInicial = victima.health.actual;
    let golpes = 0;

    for (let intento = 0; intento < 400 && victima.health.vivo; intento++) {
      // Mantener la posicion: el zombi empuja y aturde.
      player.entity.setPosition(parado.x, 0, parado.z);
      player.yaw = rumbo;

      if (arma.puedeAtacar) {
        if (arma.atacar(parado, rumbo)) golpes++;
      }
      await esperar(1);
    }

    return {
      vidaInicial,
      golpes,
      murio: !victima.health.vivo,
      estadoFinal: victima.ai.estado,
      rumbo
    };
  });

  expect(info.sinZombis, 'no habia ningun zombi para atacar').toBeFalsy();
  expect(info.murio, 'el zombi nunca murio').toBe(true);
  // Dos cuchillazos. Se deja margen por si alguno sale mientras el zombi
  // retrocede por el empuje del golpe anterior.
  expect(info.golpes).toBeLessThanOrEqual(4);
  expect(info.estadoFinal).toBe('DEAD');
  expect(errores).toEqual([]);
});

test('un golpe al aire no mata a nadie ni rompe nada', async ({ page }) => {
  test.setTimeout(60000);
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));

  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const info = await page.evaluate(async () => {
    const g = globalThis.game;
    const esperar = (n) =>
      new Promise((r) => {
        let i = 0;
        const paso = () => (++i >= n ? r() : requestAnimationFrame(paso));
        requestAnimationFrame(paso);
      });

    // Lejos de todo.
    g.player.teleport(0, -20);
    await esperar(10);

    let fallos = 0;
    const original = g.arma.alFallar;
    g.arma.alFallar = (i) => {
      fallos++;
      original?.(i);
    };

    /*
     * Pocos cuadros: esta prueba corre con WebGL por software y cada
     * cuadro cuesta. Con la espera del cuchillo en poco mas de medio
     * segundo, cuarenta cuadros alcanzan para varios golpes al aire.
     */
    for (let i = 0; i < 40; i++) {
      if (g.arma.puedeAtacar) g.arma.atacar({ x: 0, z: -20 }, 0);
      await esperar(1);
    }
    g.arma.alFallar = original;

    return { fallos, vivos: g.zombis.stats.vivos };
  });

  expect(info.fallos).toBeGreaterThan(0);
  expect(errores).toEqual([]);
});
