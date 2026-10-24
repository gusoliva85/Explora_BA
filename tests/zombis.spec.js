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
