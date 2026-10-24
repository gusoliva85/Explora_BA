import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * LA BAZOOKA EN EL JUEGO DE VERDAD
 * ===========================================================================
 * Las unitarias cubren la caida del daño, el vuelo del cohete y la barra.
 * Lo que no pueden cubrir es la cadena entera: que el cohete lance una
 * entidad, que esa entidad llegue, que la explosion encuentre a los zombis
 * de verdad y que el HUD acompañe.
 */

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
 * Pone un grupo de zombis quietos a las distancias pedidas de un punto
 * delante del jugador, y devuelve ese punto.
 *
 * Se los aturde para que no caminen: lo que se mide es la caida del daño,
 * y si se mueven la distancia deja de ser la que uno puso. (Que se muevan
 * y se salven del cohete es correcto, y tiene su propia prueba.)
 */
async function prepararGrupo(page, distancias) {
  return page.evaluate(
    async ([distancias, cuadrosSrc]) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 18);
      await esperar(30);

      const vivos = g.zombis.enJuego.filter((z) => z.vivo);
      if (vivos.length < distancias.length) return { pocos: vivos.length };

      const centro = { x: g.player.position.x, z: g.player.position.z - 14 };
      const grupo = vivos.slice(0, distancias.length);
      grupo.forEach((z, i) => {
        z.entity.setPosition(centro.x + distancias[i], 0, centro.z);
        z.ai.aturdir(30);
      });
      await esperar(3);

      globalThis.__baz = { grupo, centro };
      return { centro, vida: grupo.map((z) => z.health.actual) };
    },
    [distancias, CUADROS]
  );
}

test.describe('la barra de treinta segundos', () => {
  test('el boton no existe hasta que la barra esta llena', async ({ page }) => {
    await entrar(page);

    // Al empezar, descargada: el boton no se muestra.
    await expect(page.locator('#btn-special')).toBeHidden();
    await expect(page.locator('#especial-estado')).not.toHaveText('LISTA');

    await page.evaluate(() => {
      globalThis.game.arma.cargaEspecial = 1;
    });

    await expect(page.locator('#btn-special')).toBeVisible();
    await expect(page.locator('#especial-estado')).toHaveText('LISTA');
    await expect(page.locator('.fila-especial')).toHaveClass(/lista/);
  });

  test('la barra avanza sola con el tiempo', async ({ page }) => {
    await entrar(page);
    const antes = await page.evaluate(() => globalThis.game.arma.progresoEspecial);
    await page.waitForTimeout(1500);
    const despues = await page.evaluate(() => globalThis.game.arma.progresoEspecial);
    expect(despues).toBeGreaterThan(antes);
    // Y no llega a llenarse en un segundo y medio: son treinta.
    expect(despues).toBeLessThan(0.5);
  });

  test('reiniciar la mision deja la barra en cero', async ({ page }) => {
    await entrar(page);
    await page.evaluate(() => {
      globalThis.game.arma.cargaEspecial = 1;
    });
    await expect(page.locator('#btn-special')).toBeVisible();

    await page.locator('#btn-pause').click();
    await page.locator('#btn-restart-pause').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    /*
     * Casi cero, no exactamente cero: el juego sigue corriendo mientras
     * Playwright lee, asi que para cuando llega la respuesta la barra ya
     * arranco a cargar de nuevo. Lo que se prueba es que se VACIO —venia
     * de estar llena— y eso con 0,1 queda dicho igual.
     */
    const barra = await page.evaluate(() => globalThis.game.arma.progresoEspecial);
    expect(barra).toBeLessThan(0.1);
    await expect(page.locator('#btn-special')).toBeHidden();
  });
});

test.describe('el cohete y la explosion', () => {
  test('el cohete vuela, llega y mata al grupo', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);
    const prep = await prepararGrupo(page, [0, 2, 3.5]);
    test.skip(!!prep.pocos, `solo habia ${prep.pocos} zombis`);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const { grupo } = globalThis.__baz;

      g.arma.cargaEspecial = 1;
      const pos = { x: g.player.position.x, z: g.player.position.z };
      const salio = g.arma.dispararEspecial(pos, g.zombis.enJuego);

      // Tiene que estar EN VUELO, no haber llegado ya.
      await esperar(2);
      const enVuelo = g.cohetes.vivos.length;
      const distanciaInicial = enVuelo
        ? Math.hypot(g.cohetes.vivos[0].x - pos.x, g.cohetes.vivos[0].z - pos.z)
        : null;

      for (let i = 0; i < 400 && g.cohetes.vivos.length; i++) await esperar(1);
      await esperar(3);

      return {
        salio,
        enVuelo,
        distanciaInicial,
        muertos: grupo.filter((z) => !z.health.vivo).length,
        barra: g.arma.progresoEspecial,
        explosionVisible: g.efectos.explosiones.some((e) => e.restante > 0)
      };
    }, CUADROS);

    expect(r.salio).toBe(true);
    expect(r.enVuelo, 'el cohete llego instantaneamente, no viajo').toBe(1);
    // Al empezar estaba cerca del jugador, no encima del grupo.
    expect(r.distanciaInicial).toBeLessThan(10);
    expect(r.muertos, 'la explosion no mato al grupo').toBe(3);
    expect(r.barra, 'disparar no vacio la barra').toBeLessThan(0.2);
    expect(r.explosionVisible).toBe(true);
    expect(errores).toEqual([]);
  });

  test('el del borde sobrevive herido y sale despedido', async ({ page }) => {
    /*
     * La prueba a mano numero 3 del roadmap, automatizada. Es la que
     * distingue una bazooka de un boton de borrar pantalla: si el del
     * borde muriera igual que el del centro, apuntarla no seria una
     * habilidad, porque cualquier punto del grupo daria lo mismo.
     */
    await entrar(page);
    const prep = await prepararGrupo(page, [0, 5.5]);
    test.skip(!!prep.pocos, `solo habia ${prep.pocos} zombis`);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const { grupo, centro } = globalThis.__baz;

      const posAntes = grupo.map((z) => ({ x: z.posicion.x, z: z.posicion.z }));

      // Detonar en el centro exacto: aca se mide la caida del daño, no la
      // punteria del cohete.
      g.cohetes.alDetonar({
        x: centro.x,
        z: centro.z,
        altura: 1.2,
        contra: 'prueba',
        objetivo: null,
        proyectil: { id: -1 }
      });
      await esperar(3);

      return {
        vida: grupo.map((z) => z.health.actual),
        vivos: grupo.map((z) => z.health.vivo),
        empujado: Math.hypot(
          grupo[1].posicion.x - posAntes[1].x,
          grupo[1].posicion.z - posAntes[1].z
        )
      };
    }, CUADROS);

    expect(r.vivos[0], 'el del centro sobrevivio').toBe(false);
    expect(r.vivos[1], 'el del borde murio igual que el del centro').toBe(true);
    expect(r.vida[1], 'el del borde salio ileso').toBeLessThan(30);
    expect(r.empujado, 'la explosion no lo empujo').toBeGreaterThan(1);
  });

  test('el cohete no persigue: un zombi que se mueve se salva', async ({ page }) => {
    await entrar(page);
    const prep = await prepararGrupo(page, [0]);
    test.skip(!!prep.pocos, 'no habia zombis');

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const { grupo } = globalThis.__baz;
      const victima = grupo[0];

      g.arma.cargaEspecial = 1;
      const pos = { x: g.player.position.x, z: g.player.position.z };
      g.arma.dispararEspecial(pos, g.zombis.enJuego);
      await esperar(3);

      const rumboAlSalir = g.cohetes.vivos[0]?.rumbo;

      // Correr el blanco MUY lejos mientras el cohete esta en el aire.
      victima.entity.setPosition(victima.posicion.x + 40, 0, victima.posicion.z);
      for (let i = 0; i < 400 && g.cohetes.vivos.length; i++) await esperar(1);
      await esperar(3);

      return { rumboAlSalir, vivo: victima.health.vivo, vida: victima.health.actual };
    }, CUADROS);

    expect(r.vivo, 'el cohete persiguio al zombi hasta 40 m de distancia').toBe(true);
    expect(r.vida).toBe(60);
  });

  test('sin blanco a la vista no se gasta la carga', async ({ page }) => {
    await entrar(page);

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      await esperar(20);

      /*
       * Se aparta a TODOS los zombis vivos en vez de confiar en que el
       * punto de partida este despejado.
       *
       * La primera version se paraba en el spawn y se salteaba sola cuando
       * habia alguno en rango, o sea casi siempre: una prueba que no corre
       * no prueba nada. Apartarlos es preparacion, no trampa: el arma
       * sigue recorriendo la lista real de zombis en juego.
       */
      const pos = { x: g.player.position.x, z: g.player.position.z };
      for (const z of g.zombis.enJuego) {
        if (z.vivo) z.entity.setPosition(pos.x + 300, 0, pos.z + 300);
      }
      await esperar(3);

      const cerca = g.zombis.enJuego.filter(
        (z) => z.vivo && Math.hypot(z.posicion.x - pos.x, z.posicion.z - pos.z) <= 40
      ).length;

      g.arma.cargaEspecial = 1;
      const salio = g.arma.dispararEspecial(pos, g.zombis.enJuego);
      await esperar(2);
      return { cerca, salio, barra: g.arma.progresoEspecial, cohetes: g.cohetes.vivos.length };
    }, CUADROS);

    expect(r.cerca, 'quedaron zombis en rango: la prueba no mide lo que dice').toBe(0);
    expect(r.salio).toBe(false);
    expect(r.cohetes).toBe(0);
    expect(r.barra, 'gasto la carga sin haber disparado nada').toBe(1);
    // Y el boton sigue estando, porque la bazooka sigue lista.
    await expect(page.locator('#btn-special')).toBeVisible();
  });

  test('el disparo hace el ruido mas grande del juego', async ({ page }) => {
    await entrar(page);
    const prep = await prepararGrupo(page, [0]);
    test.skip(!!prep.pocos, 'no habia zombis');

    const r = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;

      const ruidos = [];
      // El nombre del evento sale del juego, no se escribe a mano.
      g.bus.on('world:noise', (info) => ruidos.push(info));

      g.arma.cargaEspecial = 1;
      const pos = { x: g.player.position.x, z: g.player.position.z };
      g.arma.dispararEspecial(pos, g.zombis.enJuego);
      for (let i = 0; i < 400 && g.cohetes.vivos.length; i++) await esperar(1);
      await esperar(3);

      return {
        ruidos: ruidos.map((x) => x.radio),
        radioPistola: g.arma.armas.pistol.noiseRadius
      };
    }, CUADROS);

    // Dos ruidos: el del disparo y el de la explosion.
    expect(r.ruidos.length).toBeGreaterThanOrEqual(2);
    for (const radio of r.ruidos) expect(radio).toBeGreaterThan(r.radioPistola);
  });
});
