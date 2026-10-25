import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * CURARSE ES UNA DECISION
 * ===========================================================================
 * La prueba clave de la Fase 8, tal como la define el roadmap: *"curarse
 * mientras un zombi te muerde → la curación se cancela. Define si curarse
 * es una decisión táctica o un botón"*.
 *
 * ATENCION CON LOS TIEMPOS: este navegador corre con WebGL por software y
 * el bucle del juego avanza a unos cuatro cuadros por segundo. Nada se
 * espera por reloj de pared; todo se espera por condicion o contando
 * tiempo de JUEGO. Ver tests/objetos.spec.js.
 */

const AYUDAS = `
globalThis.__esperar = (n) => new Promise((r) => {
  let i = 0;
  const paso = () => (++i >= n ? r() : requestAnimationFrame(paso));
  requestAnimationFrame(paso);
});
globalThis.__tiempoDeJuego = async (s) => {
  let t = 0;
  while (t < s) {
    const antes = performance.now();
    await globalThis.__esperar(1);
    t += Math.min(1 / 15, (performance.now() - antes) / 1000);
  }
};
`;

async function entrar(page) {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();
  await page.evaluate(AYUDAS);
}

/** Deja al jugador con `vida`, quieto, y con `n` botiquines encima. */
async function prepararHerido(page, vida, n = 1) {
  await page.evaluate(
    async ([vida, n]) => {
      const g = globalThis.game;
      g.inventario.vaciar();
      g.inventario.agregar('medkit', n);
      g.player.health = vida;
      g.player.invulnerableFor = 0;
      g.player.velocity.x = 0;
      g.player.velocity.z = 0;
      await globalThis.__esperar(4);
    },
    [vida, n]
  );
}

test.describe('el botiquin se guarda, no se usa al pisarlo', () => {
  test('pisarlo lo guarda y hace aparecer el boton', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);
    await expect(page.locator('#btn-heal')).toBeHidden();

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const bot = g.objetos.enElPiso.find((o) => o.tipo === 'botiquin');
      if (!bot) return { sinBotiquin: true };

      g.player.health = 40;
      g.player.teleport(bot.x, bot.z);
      await globalThis.__esperar(6);
      return { encima: g.inventario.cuantos('medkit'), vida: g.player.health };
    });

    test.skip(!!r.sinBotiquin, 'no habia botiquines en el mapa');

    expect(r.encima).toBe(1);
    // Y NO curo al pisarlo: eso ahora es una decision aparte.
    expect(r.vida).toBe(40);
    await expect(page.locator('#btn-heal')).toBeVisible();
    await expect(page.locator('#heal-count')).toHaveText('1');
    expect(errores).toEqual([]);
  });

  test('el mapa arranca con objetos repartidos, no solo en los controles', async ({
    page
  }) => {
    /*
     * Las zonas de municion y curacion estaban definidas desde la Fase 3 y
     * no las usaba nadie. Son las que hacen que explorar tenga premio.
     */
    await entrar(page);
    const r = await page.evaluate(() => globalThis.game.objetos.contar());
    expect(r.municion ?? 0).toBeGreaterThan(0);
    expect(r.botiquin ?? 0).toBeGreaterThan(0);
  });
});

test.describe('curarse lleva tiempo', () => {
  test('no cura en el instante en que se aprieta', async ({ page }) => {
    await entrar(page);
    await prepararHerido(page, 30);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const vidaAntes = g.player.health;

      g.input.pressed.add('heal');
      await globalThis.__esperar(3);

      const aMitad = {
        usando: g.uso.enCurso,
        vida: g.player.health,
        barraVisible: !document.getElementById('fila-uso').classList.contains('hidden')
      };

      await globalThis.__tiempoDeJuego(1.6);
      return {
        vidaAntes,
        aMitad,
        vidaFinal: g.player.health,
        quedan: g.inventario.cuantos('medkit'),
        usando: g.uso.enCurso
      };
    });

    expect(r.aMitad.usando, 'no arranco la curacion').toBe(true);
    expect(r.aMitad.vida, 'curo al instante').toBe(r.vidaAntes);
    expect(r.aMitad.barraVisible, 'la barra de uso no se ve').toBe(true);

    // Media vida mas, y el botiquin gastado.
    expect(r.vidaFinal).toBe(80);
    expect(r.quedan).toBe(0);
    expect(r.usando).toBe(false);
  });

  test('con la vida llena no arranca ni gasta el botiquin', async ({ page }) => {
    await entrar(page);
    await prepararHerido(page, 100);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      g.input.pressed.add('heal');
      await globalThis.__esperar(4);
      return { usando: g.uso.enCurso, quedan: g.inventario.cuantos('medkit') };
    });

    expect(r.usando).toBe(false);
    expect(r.quedan, 'gasto un botiquin sin curar nada').toBe(1);
  });

  test('sin botiquines el boton no existe', async ({ page }) => {
    await entrar(page);
    await prepararHerido(page, 30, 0);
    await expect(page.locator('#btn-heal')).toBeHidden();
  });
});

test.describe('lo que corta la curacion', () => {
  test('UN GOLPE la corta, y el botiquin NO se gasta', async ({ page }) => {
    /*
     * La prueba clave de la fase. Si un golpe no cortara, curarse con un
     * zombi encima seria gratis y no habria ninguna decision que tomar.
     *
     * Y el botiquin tiene que sobrevivir: perderlo ADEMAS del segundo
     * seria castigar dos veces el mismo error, y llevaria a que nadie se
     * anime a usarlo nunca.
     */
    await entrar(page);
    await prepararHerido(page, 30);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      g.input.pressed.add('heal');
      await globalThis.__esperar(3);
      const arranco = g.uso.enCurso;

      await globalThis.__tiempoDeJuego(0.5);
      g.player.applyDamage(5, 'prueba');
      await globalThis.__esperar(3);

      return {
        arranco,
        usando: g.uso.enCurso,
        vida: g.player.health,
        quedan: g.inventario.cuantos('medkit')
      };
    });

    expect(r.arranco).toBe(true);
    expect(r.usando, 'el golpe no corto la curacion').toBe(false);
    // Recibio el daño y NO se curo.
    expect(r.vida).toBe(25);
    expect(r.quedan, 'perdio el botiquin sin curarse').toBe(1);
  });

  test('cortada a ultimo momento tampoco cura', async ({ page }) => {
    await entrar(page);
    await prepararHerido(page, 30);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      g.uso.iniciar('medkit', 1.2);
      // Casi todo el tiempo, pero no todo.
      await globalThis.__tiempoDeJuego(0.95);
      const antesDelGolpe = g.uso.enCurso;
      g.player.applyDamage(1, 'prueba');
      await globalThis.__esperar(3);
      return { antesDelGolpe, vida: g.player.health, quedan: g.inventario.cuantos('medkit') };
    });

    test.skip(!r.antesDelGolpe, 'el uso ya habia terminado: el navegador fue muy lento');
    expect(r.vida).toBe(29);
    expect(r.quedan).toBe(1);
  });

  test('MOVERSE la corta', async ({ page }) => {
    /*
     * Sin esta regla, curarse mientras se corre seria gratis: el tiempo de
     * uso no costaria nada porque se gastaria haciendo lo que uno iba a
     * hacer igual. Teniendo que frenar, el costo es terreno.
     */
    await entrar(page);
    await prepararHerido(page, 30);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      g.uso.iniciar('medkit', 1.2);
      await globalThis.__tiempoDeJuego(0.4);
      const arranco = g.uso.enCurso;

      // Salir corriendo.
      g.player.velocity.x = 3;
      await globalThis.__esperar(3);

      return {
        arranco,
        usando: g.uso.enCurso,
        vida: g.player.health,
        quedan: g.inventario.cuantos('medkit')
      };
    });

    expect(r.arranco).toBe(true);
    expect(r.usando, 'se curo corriendo').toBe(false);
    expect(r.vida).toBe(30);
    expect(r.quedan).toBe(1);
  });

  test('quieto de verdad, no se corta sola', async ({ page }) => {
    /*
     * El reverso de la prueba anterior, y el que evita que el umbral quede
     * tan bajo que la inercia de soltar el joystick cancele siempre.
     */
    await entrar(page);
    await prepararHerido(page, 30);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      g.uso.iniciar('medkit', 1.2);
      await globalThis.__tiempoDeJuego(1.5);
      return { vida: g.player.health, quedan: g.inventario.cuantos('medkit') };
    });

    expect(r.vida).toBe(80);
    expect(r.quedan).toBe(0);
  });

  test('reiniciar la mision vacia el inventario y corta el uso', async ({ page }) => {
    await entrar(page);
    await prepararHerido(page, 30, 2);
    await page.evaluate(() => globalThis.game.uso.iniciar('medkit', 1.2));

    await page.locator('#btn-pause').click();
    await page.locator('#btn-restart-pause').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const r = await page.evaluate(() => ({
      encima: globalThis.game.inventario.cuantos('medkit'),
      usando: globalThis.game.uso.enCurso
    }));
    expect(r.encima).toBe(0);
    expect(r.usando).toBe(false);
    await expect(page.locator('#btn-heal')).toBeHidden();
  });
});
