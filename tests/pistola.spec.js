import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * EL ARMA EN EL JUEGO DE VERDAD
 * ===========================================================================
 * Las pruebas unitarias cubren la balistica con numeros. Lo que no pueden
 * cubrir es el cableado: que el rayo use el escenario de verdad y que el
 * ruido llegue a los zombis de verdad.
 *
 * Esa separacion ya costo una fase: el arco del cuchillo tenia pruebas
 * unitarias impecables y en el juego golpeaba para atras, porque nadie
 * habia probado las dos puntas juntas.
 *
 * Desde la 16.4 hay **un arma sola** (D-29), asi que ya no hace falta
 * equiparla: viene puesta.
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

    /*
     * Se espera a que el arma ESTE LISTA y a que el tiro se resuelva.
     *
     * Antes era `atacar()` y seis cuadros. Dejo de alcanzar en la 17.5:
     * con el combate automatico el arma puede estar en `ESPERANDO` cuando
     * la prueba aprieta el gatillo, y `atacar()` devuelve `false` sin
     * hacer nada. La prueba media el daño de un tiro que nunca salio.
     */
    const disparos0 = g.stats.disparos;
    for (let i = 0; i < 60 && g.stats.disparos === disparos0; i++) {
      // Mantener la pose: el zombi empuja y la IA mueve al jugador.
      g.player.entity.setPosition(parado.x, 0, parado.z);
      g.player.yaw = rumbo;
      if (g.arma.puedeAtacar) g.arma.atacar();
      await esperar(1);
    }
    for (let i = 0; i < 4; i++) {
      g.player.entity.setPosition(parado.x, 0, parado.z);
      g.player.yaw = rumbo;
      await esperar(1);
    }

    return {
      vidaAntes: antes,
      vidaDespues: victima.health.actual,
      distancia: Math.hypot(victima.posicion.x - parado.x, victima.posicion.z - parado.z)
    };
  }, CUADROS);
}

test.describe('disparar', () => {
  test('a diez metros acierta, y cuatro tiros matan', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);
    const prep = await prepararTiro(page, 10);
    expect(prep.sinZombis, 'no habia ningun zombi').toBeFalsy();

    const uno = await tirar(page);
    expect(uno.vidaDespues, 'el primer tiro no hizo daño').toBeLessThan(uno.vidaAntes);

    // El cuarto lo tiene que matar: es el balance declarado (D-31). Eran
    // dos hasta la Fase 17.1. El bucle no cuenta tiros —cuenta hasta que
    // muere— asi que el numero vive en la unitaria y aca se prueba el
    // cableado: que el daño llegue de verdad al zombi del juego.
    const muerto = await page.evaluate(async (cuadrosSrc) => {
      const esperar = eval(cuadrosSrc);
      const g = globalThis.game;
      const { parado, rumbo, victima } = globalThis.__tiro;

      for (let i = 0; i < 300 && victima.health.vivo; i++) {
        g.player.entity.setPosition(parado.x, 0, parado.z);
        g.player.yaw = rumbo;
        if (g.arma.puedeAtacar) g.arma.atacar();
        await esperar(1);
      }
      return { vivo: victima.health.vivo };
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

      const antes = victima.health.actual;
      g.arma.atacar();
      for (let i = 0; i < 6; i++) {
        g.player.entity.setPosition(encontrado.x, 0, encontrado.z);
        g.player.yaw = rumbo;
        await esperar(1);
      }
      return { antes, despues: victima.health.actual };
    }, CUADROS);

    test.skip(!!r.sinZombis || !!r.sinPared, 'no se encontro un tiro tapado por el escenario');
    expect(r.despues, 'la bala atraveso una pared').toBe(r.antes);
  });
});

/*
 * ---------------------------------------------------------------------------
 * ACA HABIA UN BLOQUE ENTERO SOBRE EL HUD, Y SE FUE EN TRES PASOS
 * ---------------------------------------------------------------------------
 * Empezo con tres pruebas: que vaciar el cargador arrancara la recarga
 * sola, que el HUD mostrara el contador de balas, y que el boton grande
 * dijera lo que hacia. Las dos primeras se fueron en la 16.2 con la
 * municion; la tercera, en la 16.4 con el cambio de arma.
 *
 * La tercera es la que vale la pena contar, porque **fue la prueba que
 * agarro un error de verdad**: al sacar la municion, el nombre del arma
 * dejo de actualizarse cuando el cambio no venia del boton, y lo agarro
 * esto, no la consola. De ahi salio el criterio que quedo escrito en el
 * controlador: un aviso que viaja colgado de otro desaparece cuando el otro
 * se borra.
 *
 * Hoy el boton dice DISPARAR en el HTML y no hay nada que actualizar.
 */

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

      /*
       * El disparo, por la via normal del arma. Se espera a que el arma
       * ESTE LISTA y a que el tiro se resuelva de verdad.
       *
       * Antes era `atacar()` y ocho cuadros. Dejo de andar en la 17.5:
       * con el combate automatico, el arma puede estar en `ESPERANDO`
       * cuando la prueba aprieta el gatillo, y entonces `atacar()`
       * devuelve `false` sin hacer nada. La prueba medira el ruido de un
       * disparo que nunca salio.
       */
      const rumbo = g.rumbo.rumboHacia(0, 1);
      g.player.yaw = rumbo;
      const disparos0 = g.stats.disparos;
      for (let i = 0; i < 60 && g.stats.disparos === disparos0; i++) {
        g.player.entity.setPosition(pos.x, 0, pos.z);
        if (g.arma.puedeAtacar) g.arma.atacar();
        await esperar(1);
      }
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

  /*
   * -------------------------------------------------------------------------
   * ACA ESTABA LA OTRA MITAD DE LA REGLA, Y SE FUE CON EL CUCHILLO
   * -------------------------------------------------------------------------
   * "Matar con el cuchillo al lado de otros NO los despierta": tres zombis
   * en IDLE a diecinueve metros, un cuchillazo, y los tres seguian
   * durmiendo. Era la prueba que le daba sentido al cuchillo —si el cuerpo
   * a cuerpo hiciera el mismo ruido que el disparo, la pistola seria
   * siempre mejor y no habria ninguna decision que tomar— y se fue con el
   * arma en la 16.4 (D-29).
   *
   * **Y con ella se fue la decision que probaba.** Conviene decirlo
   * derecho, porque es el costo real de la poda y no un detalle de
   * pruebas: hoy no hay forma silenciosa de matar. La unica eleccion que le
   * queda al jugador es *donde pararse y cuanto tiempo*, y lo que la hace
   * una eleccion es que el tiro siempre suena.
   *
   * Lo que sostiene esa mecanica ahora es la prueba de arriba —el disparo
   * trae a los que no te vieron— y la unitaria que fija que el estruendo
   * llegue mas lejos que la vista del zombi.
   */
});
