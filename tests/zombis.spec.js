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

test('se puede escapar de un zombi', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  /*
   * Es la regla de diseño mas importante del combate: **el zombi
   * persiguiendo es mas lento que Gus.** Si alguna vez deja de serlo, el
   * juego pasa de "decidir si pelear" a "pelear siempre".
   *
   * La prueba comparaba contra las dos velocidades del jugador, y la
   * interesante era la lenta: el margen mas chico, el que se rompe
   * primero. Caminar se fue en la 16.5 (D-30), asi que ahora hay un solo
   * margen y conviene mirarlo con numero: 6,0 contra 2,9 es mas del doble.
   *
   * **Y eso es mucho, no poco, y hay que tenerlo a la vista.** Escapar
   * dejo de costar: antes, huir caminando dejaba al zombi a medio metro
   * por segundo de distancia y correr era la decision. Hoy cualquier
   * movimiento basta. Es coherente con el juego nuevo —la decision es
   * donde pararse, no como moverse— pero si en la 19A los tramos se
   * sienten faciles de atravesar sin pelear, el numero a mirar es este.
   */
  const info = await page.evaluate(() => {
    const { PLAYER, ZOMBIE_STANDARD } = globalThis.game.balance;
    return { jugador: PLAYER.speed, perseguir: ZOMBIE_STANDARD.chaseSpeed };
  });

  expect(info.perseguir).toBeLessThan(info.jugador);
  // El margen, escrito: hoy el jugador va al doble que el que lo persigue.
  expect(info.jugador / info.perseguir).toBeGreaterThan(1.5);
});

/* =========================================================================
   COMBATE

   Aca habia una prueba mas, "dos cuchillazos matan a un zombi": teletransportar
   al jugador al alcance del arco, apuntarlo de verdad —porque el rumbo del
   jugador era lo que orientaba el arco— y exigir que el zombi muriera en no
   mas de cuatro golpes. Se fue con el cuchillo en la Fase 16.4 (D-29).

   Lo que probaba —que el jugador pueda matar a un zombi en el juego de
   verdad, con el cableado completo y sin un error en consola— no se perdio:
   lo cubre `pistola.spec.js`, con cuatro tiros a diez metros. Lo que si dejo
   escrito, y vale para cualquier reemplazo, es el metodo: **el rumbo se le
   pide al convenio del juego, nunca se escribe a mano.** Aca decia
   `player.yaw = 180` con un comentario que afirmaba "mirando hacia -Z", y
   era falso; funcionaba de casualidad porque el arma usaba el convenio
   invertido. Ver src/core/rumbo.js.
   ========================================================================= */

test('cada tiro se resuelve una sola vez, y nada revienta', async ({ page }) => {
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

    /*
     * Lo que se cuenta cambio en la 17.5, y conviene decir por que.
     *
     * Antes esta prueba contaba SOLO los fallos y exigia que hubiera al
     * menos uno: alcanzaba, porque `(0, -20)` estaba lejos de todo y nadie
     * disparaba sin que se lo pidieran.
     *
     * Con el combate automatico (D-28) ninguna de las dos cosas sigue
     * siendo cierta: Gus dispara solo, el ruido atrae zombis, y para
     * cuando la prueba corre puede haber alguien a tiro. Pedir un fallo
     * paso a ser pedir que **no** haya nadie cerca, que es suerte, no una
     * regla.
     *
     * Lo que se mide ahora es mas fuerte y no depende de donde esten los
     * zombis: **cada disparo se resuelve exactamente una vez**, como
     * acierto o como fallo. Ni dos avisos por tiro, ni ninguno.
     */
    let fallos = 0;
    let golpes = 0;
    const alFallar = g.arma.alFallar;
    const alGolpear = g.arma.alGolpear;
    g.arma.alFallar = (i) => {
      fallos++;
      alFallar?.(i);
    };
    g.arma.alGolpear = (i) => {
      golpes++;
      alGolpear?.(i);
    };
    const disparos0 = g.stats.disparos;

    /*
     * Pocos cuadros: esta prueba corre con WebGL por software y cada
     * cuadro cuesta. Con la espera del arma en cuatro decimas, cuarenta
     * cuadros alcanzan para varios tiros.
     */
    for (let i = 0; i < 40; i++) {
      if (g.arma.puedeAtacar) g.arma.atacar();
      await esperar(1);
    }
    g.arma.alFallar = alFallar;
    g.arma.alGolpear = alGolpear;

    return {
      fallos,
      golpes,
      disparos: g.stats.disparos - disparos0,
      vivos: g.zombis.stats.vivos
    };
  });

  expect(info.disparos, 'no salio ni un tiro').toBeGreaterThan(0);
  expect(
    info.fallos + info.golpes,
    `${info.disparos} tiros produjeron ${info.golpes} golpes y ${info.fallos} fallos`
  ).toBe(info.disparos);
  expect(errores).toEqual([]);
});
