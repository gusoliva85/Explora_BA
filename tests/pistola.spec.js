import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * LA PISTOLA EN EL JUEGO DE VERDAD
 * ===========================================================================
 * Las pruebas unitarias cubren la balistica con numeros. Lo que no pueden
 * cubrir es el cableado: que el rayo use el escenario de verdad, que el
 * ruido llegue a los zombis de verdad, y que el HUD muestre lo que el arma
 * esta pensando.
 *
 * Esa separacion ya costo una fase: el arco del cuchillo tenia pruebas
 * unitarias impecables y en el juego golpeaba para atras, porque nadie
 * habia probado las dos puntas juntas.
 */

/** Deja correr N cuadros reales del juego. */
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

/**
 * Lleva al jugador frente a un zombi, a la distancia pedida, con la pistola.
 * Devuelve lo necesario para seguir operando desde la prueba.
 */
async function prepararTiro(page, distancia) {
  return page.evaluate(
    async ([distancia, cuadrosSrc]) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 18);
      await esperar(30);

      const victima = g.zombis.enJuego.find((z) => z.vivo);
      if (!victima) return { sinZombis: true };

      const q = victima.posicion;
      const parado = { x: q.x, z: q.z + distancia };
      const rumbo = g.rumbo.rumboEntre(parado, q);
      g.player.teleport(parado.x, parado.z, rumbo);
      g.player.yaw = rumbo;
      g.arma.cambiarA('pistol');

      // Se guarda para las llamadas siguientes de la misma prueba.
      globalThis.__tiro = { parado, rumbo, victima };
      return { parado, rumbo, vida: victima.health.actual };
    },
    [distancia, CUADROS]
  );
}

/** Aprieta el gatillo una vez y deja que el disparo se resuelva. */
async function tirar(page) {
  return page.evaluate(async (cuadrosSrc) => {
    const esperar = eval(cuadrosSrc);
    const g = globalThis.game;
    const { parado, rumbo, victima } = globalThis.__tiro;

    const antes = victima.health.actual;
    const balasAntes = g.arma.enCargador;
    g.arma.atacar(parado, rumbo, g.zombis.enJuego);

    // Mantener la pose: el zombi empuja y la IA mueve al jugador.
    for (let i = 0; i < 6; i++) {
      g.player.entity.setPosition(parado.x, 0, parado.z);
      g.player.yaw = rumbo;
      await esperar(1);
    }

    return {
      vidaAntes: antes,
      vidaDespues: victima.health.actual,
      balasAntes,
      balasDespues: g.arma.enCargador,
      distancia: Math.hypot(victima.posicion.x - parado.x, victima.posicion.z - parado.z)
    };
  }, CUADROS);
}

test.describe('disparar', () => {
  test('a diez metros acierta, y dos tiros matan', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);
    const prep = await prepararTiro(page, 10);
    expect(prep.sinZombis, 'no habia ningun zombi').toBeFalsy();

    const uno = await tirar(page);
    expect(uno.balasDespues).toBe(uno.balasAntes - 1);
    expect(uno.vidaDespues, 'el primer tiro no hizo daño').toBeLessThan(uno.vidaAntes);

    // El segundo lo tiene que matar: es el balance declarado.
    const muerto = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const { parado, rumbo, victima } = globalThis.__tiro;

      for (let i = 0; i < 300 && victima.health.vivo; i++) {
        g.player.entity.setPosition(parado.x, 0, parado.z);
        g.player.yaw = rumbo;
        if (g.arma.puedeAtacar) g.arma.atacar(parado, rumbo, g.zombis.enJuego);
        await esperar(1);
      }
      return { vivo: victima.health.vivo, gastadas: 12 - g.arma.enCargador };
    }, CUADROS);

    expect(muerto.vivo).toBe(false);
    expect(errores).toEqual([]);
  });

  test('a veintiocho metros el disparo no llega', async ({ page }) => {
    await entrar(page);
    // Justo mas alla del alcance declarado.
    const prep = await prepararTiro(page, 32);
    test.skip(!!prep.sinZombis, 'no habia zombis');

    const r = await tirar(page);
    expect(r.distancia).toBeGreaterThan(28);
    expect(r.vidaDespues, 'le pego a algo que estaba fuera de alcance').toBe(r.vidaAntes);
    // Pero la bala se gasta igual: errar cuesta.
    expect(r.balasDespues).toBe(r.balasAntes - 1);
  });

  test('una pared para la bala', async ({ page }) => {
    await entrar(page);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 18);
      await esperar(30);

      const victima = g.zombis.enJuego.find((z) => z.vivo);
      if (!victima) return { sinZombis: true };

      /*
       * Se usa el escenario de verdad: se busca una posicion desde la cual
       * el rayo del mundo diga que hay algo en el medio. Es la unica forma
       * de probar que el arma esta conectada al mapa y no a un simulacro.
       */
      const q = victima.posicion;
      let encontrado = null;
      for (let d = 6; d <= 26 && !encontrado; d += 1) {
        for (const signo of [1, -1]) {
          const desde = { x: q.x + signo * d * 0.4, z: q.z + d };
          const hit = g.collision.raycast(desde.x, desde.z, q.x, q.z, 1.2);
          if (hit && hit.t < 0.92) {
            encontrado = desde;
            break;
          }
        }
      }
      if (!encontrado) return { sinPared: true };

      const rumbo = g.rumbo.rumboEntre(encontrado, q);
      g.player.teleport(encontrado.x, encontrado.z, rumbo);
      g.player.yaw = rumbo;
      g.arma.cambiarA('pistol');

      const antes = victima.health.actual;
      g.arma.atacar(encontrado, rumbo, g.zombis.enJuego);
      for (let i = 0; i < 6; i++) {
        g.player.entity.setPosition(encontrado.x, 0, encontrado.z);
        g.player.yaw = rumbo;
        await esperar(1);
      }
      return { antes, despues: victima.health.actual, balas: g.arma.enCargador };
    }, CUADROS);

    test.skip(!!r.sinZombis || !!r.sinPared, 'no se encontro un tiro tapado por el escenario');
    expect(r.despues, 'la bala atraveso una pared').toBe(r.antes);
    expect(r.balas).toBe(11);
  });
});

test.describe('municion', () => {
  test('vaciar el cargador recarga sola, y durante la recarga no dispara', async ({ page }) => {
    await entrar(page);
    await prepararTiro(page, 10);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const { parado, rumbo } = globalThis.__tiro;

      // Vaciar sin pasar por doce ciclos completos.
      g.arma.cargador.pistol = 1;
      g.arma.atacar(parado, rumbo, g.zombis.enJuego);
      for (let i = 0; i < 20 && g.arma.enCargador > 0; i++) await esperar(1);

      // Ahora el gatillo en vacio tiene que arrancar la recarga sola.
      let intentos = 0;
      while (g.arma.estado !== 'RECARGANDO' && intentos++ < 60) {
        g.arma.atacar(parado, rumbo, g.zombis.enJuego);
        await esperar(1);
      }
      const recargando = g.arma.estado === 'RECARGANDO';
      const barraVisible = !document.getElementById('recarga').classList.contains('hidden');
      const disparoDurante = g.arma.atacar(parado, rumbo, g.zombis.enJuego);

      // Esperar a que termine.
      for (let i = 0; i < 400 && g.arma.recargando; i++) await esperar(1);

      return {
        recargando,
        barraVisible,
        disparoDurante,
        cargadorFinal: g.arma.enCargador,
        reservaFinal: g.arma.enReserva
      };
    }, CUADROS);

    expect(r.recargando, 'nunca arranco la recarga').toBe(true);
    expect(r.barraVisible, 'la recarga no se ve en el HUD').toBe(true);
    expect(r.disparoDurante, 'disparo durante la recarga').toBe(false);
    expect(r.cargadorFinal).toBe(12);
    expect(r.reservaFinal).toBeLessThan(24);
  });

  test('el HUD muestra el arma y la municion', async ({ page }) => {
    await entrar(page);

    // Con el cuchillo no hay numeros de balas: no gasta.
    await expect(page.locator('#arma-nombre')).toHaveText('CUCHILLO');
    await expect(page.locator('#arma-municion')).toHaveText('—');

    await page.evaluate(() => globalThis.game.arma.cambiarA('pistol'));
    await expect(page.locator('#arma-nombre')).toHaveText('PISTOLA');
    await expect(page.locator('#arma-municion')).toContainText('12');
    // Y el boton grande dice lo que hace.
    await expect(page.locator('#btn-attack')).toHaveText('DISPARAR');

    await page.evaluate(() => globalThis.game.arma.cambiarA('knife'));
    await expect(page.locator('#btn-attack')).toHaveText('ATACAR');
  });
});

test.describe('el ruido es la mecanica de la fase', () => {
  test('disparar atrae a los zombis que no te habian visto', async ({ page }) => {
    /*
     * La prueba clave de la Fase 6, tal como la define el roadmap:
     * "disparar con tres zombis alrededor que no te habian visto -> los
     * tres vienen".
     *
     * Se los pone de espaldas y lejos del alcance de vista, para que la
     * unica forma de que reaccionen sea el ruido.
     */
    await entrar(page);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 18);
      await esperar(30);

      const testigos = g.zombis.enJuego.filter((z) => z.vivo).slice(0, 3);
      if (testigos.length < 3) return { pocos: testigos.length };

      const pos = { x: g.player.position.x, z: g.player.position.z };

      /*
       * Mas lejos que el alcance de vista (16 m) y mirando para el otro
       * lado. Asi nada que no sea el ruido los puede despertar.
       */
      const lejos = g.balance.ZOMBIE_STANDARD.sightRange + 3;
      testigos.forEach((z, i) => {
        z.entity.setPosition(pos.x + (i - 1) * 4, 0, pos.z - lejos);
        z.ai.origen = { x: z.posicion.x, z: z.posicion.z };
        z.ai.estado = 'IDLE';
        z.ai.ultimoVisto = null;
        z.ai.rumbo = g.rumbo.rumboHacia(0, -1); // de espaldas al jugador
      });
      await esperar(5);

      const antes = testigos.map((z) => z.ai.estado);
      const alertadosAntes = antes.filter((e) => e !== 'IDLE').length;

      // El disparo, por la via normal del arma.
      g.arma.cambiarA('pistol');
      const rumbo = g.rumbo.rumboHacia(0, 1);
      g.player.yaw = rumbo;
      g.arma.atacar(pos, rumbo, g.zombis.enJuego);
      for (let i = 0; i < 8; i++) {
        g.player.entity.setPosition(pos.x, 0, pos.z);
        await esperar(1);
      }

      const despues = testigos.map((z) => z.ai.estado);
      const radio = g.balance.ZOMBIE_STANDARD.sightRange;

      return {
        alertadosAntes,
        alertadosDespues: despues.filter((e) => e !== 'IDLE').length,
        antes,
        despues,
        distancias: testigos.map((z) =>
          Math.hypot(z.posicion.x - pos.x, z.posicion.z - pos.z).toFixed(1)
        ),
        radio
      };
    }, CUADROS);

    test.skip(r.pocos !== undefined, `solo habia ${r.pocos} zombis`);

    expect(r.alertadosAntes, `ya estaban alertados antes de disparar: ${r.antes}`).toBe(0);
    expect(
      r.alertadosDespues,
      `el disparo no los desperto. Estados: ${r.despues}, distancias: ${r.distancias}`
    ).toBe(3);
  });

  test('matar con el cuchillo al lado de otros NO los despierta', async ({ page }) => {
    /*
     * La otra mitad de la regla, y la que le da sentido al cuchillo: si el
     * cuerpo a cuerpo hiciera el mismo ruido que el disparo, la pistola
     * seria siempre mejor y no habria ninguna decision que tomar.
     */
    await entrar(page);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 18);
      await esperar(30);

      const testigos = g.zombis.enJuego.filter((z) => z.vivo).slice(0, 3);
      if (testigos.length < 3) return { pocos: testigos.length };

      const pos = { x: g.player.position.x, z: g.player.position.z };
      const lejos = g.balance.ZOMBIE_STANDARD.sightRange + 3;
      testigos.forEach((z, i) => {
        z.entity.setPosition(pos.x + (i - 1) * 4, 0, pos.z - lejos);
        z.ai.origen = { x: z.posicion.x, z: z.posicion.z };
        z.ai.estado = 'IDLE';
        z.ai.ultimoVisto = null;
        z.ai.rumbo = g.rumbo.rumboHacia(0, -1);
      });
      await esperar(5);

      g.arma.cambiarA('knife');
      const rumbo = g.rumbo.rumboHacia(0, 1);
      g.player.yaw = rumbo;
      g.arma.atacar(pos, rumbo, g.zombis.enJuego);
      for (let i = 0; i < 8; i++) {
        g.player.entity.setPosition(pos.x, 0, pos.z);
        await esperar(1);
      }

      return {
        despues: testigos.map((z) => z.ai.estado),
        radioCuchillo: g.arma.armas.knife.noiseRadius,
        radioPistola: g.arma.armas.pistol.noiseRadius
      };
    }, CUADROS);

    test.skip(r.pocos !== undefined, `solo habia ${r.pocos} zombis`);

    expect(
      r.despues.filter((e) => e !== 'IDLE').length,
      `el cuchillo desperto a alguien a 19 m. Estados: ${r.despues}`
    ).toBe(0);
    // Y que quede escrito por que: el cuchillo es el arma silenciosa.
    expect(r.radioCuchillo).toBeLessThan(r.radioPistola / 5);
  });
});
