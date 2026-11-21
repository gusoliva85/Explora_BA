import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * TODO APUNTA PARA ADELANTE, EN EL JUEGO DE VERDAD
 * ===========================================================================
 * Las pruebas unitarias se quedan cortas por construccion: le pasan un
 * rumbo a mano y miden alrededor de ese rumbo. En el juego el rumbo no se
 * escribe, lo produce el jugador al caminar, y era justo ese cruce el que
 * estaba invertido.
 *
 * Por eso estas pruebas viven en el navegador. Son las unicas que ven a la
 * vez el `yaw` real, las transformaciones ya aplicadas y el frente del
 * modelo que mira el usuario.
 *
 * ---------------------------------------------------------------------------
 * ACA HABIA CUATRO PRUEBAS MAS, Y ERAN LAS QUE LE DABAN NOMBRE AL ARCHIVO
 * ---------------------------------------------------------------------------
 * Una por tecla —W, S, A, D— caminando en esa direccion y midiendo que el
 * arco del cuchillo barriera hacia donde el personaje miraba. Se fueron con
 * el arco en la Fase 16.4 (D-29).
 *
 * Lo que enseñaron queda, porque es metodo y no cuchillo:
 *
 * - Se medía **la geometria de la malla**, no la rotacion de la entidad. La
 *   primera version comparaba `arco.forward`, y se comprobo dandole vuelta
 *   a la malla a proposito: la prueba seguia pasando. Un sector dibujado
 *   hacia atras dentro de una entidad bien rotada se ve igual de mal.
 * - Se atacaba **por la via normal del juego**, no tocando el efecto a
 *   mano.
 * - Eran **las cuatro teclas**, porque un error de signo puede acertar por
 *   casualidad en un eje y fallar en el otro.
 *
 * Lo que sigue midiendo el mismo cruce, y por eso el archivo no murio, son
 * las dos pruebas de abajo: los brazos y la caminata del zombi.
 */

test.describe('direccion de lo que se ve en pantalla', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();
  });

  test('los brazos apuntan hacia ADELANTE, no a la espalda', async ({ page }) => {
    /*
     * Lo reporto Gustavo mirando el juego: "los zombies caminan al reves".
     *
     * El cuerpo iba bien; lo que iba al reves eran los BRAZOS. Las poses
     * usaban angulos negativos con comentarios que decian "adelante",
     * cuando en este convenio positivo es adelante. Medido en pantalla, el
     * producto escalar entre el frente del zombi y la direccion de su mano
     * daba -0,89: los brazos estirados hacia la espalda.
     *
     * Ninguna prueba unitaria lo vio porque las unitarias comprobaban el
     * SIGNO del angulo, codificando el mismo error que el codigo. Esto se
     * mide en el mundo, con las transformaciones ya aplicadas.
     */
    await page.goto('/');
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const esperar = (n) =>
        new Promise((res) => {
          let i = 0;
          const paso = () => (++i >= n ? res() : requestAnimationFrame(paso));
          requestAnimationFrame(paso);
        });

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 14);
      await esperar(40);

      /** Cuanto apunta una mano hacia el frente de su cuerpo. */
      const haciaAdelante = (cuerpo, mano) => {
        const f = cuerpo.forward;
        const c = cuerpo.getPosition();
        const m = mano.getPosition();
        const d = { x: m.x - c.x, z: m.z - c.z };
        const largo = Math.hypot(d.x, d.z) || 1;
        return (f.x * d.x + f.z * d.z) / largo;
      };

      g.gus.gesto('disparar');
      await esperar(3);
      const gus = haciaAdelante(g.player.entity, g.gus.manoD);

      const z = g.zombis.enJuego.find((x) => x.vivo);
      const zombi = z ? haciaAdelante(z.entity, z.codoD) : null;
      return { gus, zombi };
    });

    expect(
      r.gus,
      `Gus dispara con el brazo hacia atras (escalar ${r.gus.toFixed(2)})`
    ).toBeGreaterThan(0.4);

    test.skip(r.zombi === null, 'no habia zombis en juego');
    expect(
      r.zombi,
      `el zombi lleva los brazos a la espalda (escalar ${r.zombi.toFixed(2)})`
    ).toBeGreaterThan(0);
  });

  test('el zombi que persigue camina de frente, no de espaldas', async ({ page }) => {
    /*
     * El mismo error de convenio afectaba al zombi: su cuerpo se orientaba
     * al revés de su rumbo, asi que perseguia al jugador caminando para
     * atras, con los brazos apuntando al lado opuesto. Desde veinte metros
     * de camara cenital casi no se nota, y por eso conviene medirlo.
     *
     * ---------------------------------------------------------------------
     * POR QUE SE MIDE CONTRA EL DESPLAZAMIENTO
     * ---------------------------------------------------------------------
     * La primera version comparaba el frente del modelo con `ai.rumbo` en
     * el mismo instante, y salia inestable: el giro visual persigue al
     * rumbo con suavizado, asi que en un cuadro cualquiera van distinto, y
     * cuanto mas lento corre el navegador —aca, WebGL por software— mas se
     * separan.
     *
     * Contra el desplazamiento real no hay carrera que perder. Se espera a
     * que el zombi se haya movido de verdad y se compara con hacia donde
     * se movio. El margen es amplio a proposito: un modelo al revés da
     * -1, no 0,4. Lo que se prueba es el sentido, no la precision del
     * suavizado, que ya tiene su prueba unitaria.
     */
    const partida = await page.evaluate(() => {
      const g = globalThis.game;
      const z = g.zombis.enJuego[0];
      if (!z) return { sinZombis: true };

      /*
       * El ruido se pone donde esta el JUGADOR, no donde esta el zombi: lo
       * que se mide es si camina de frente hacia algo, y un ruido en sus
       * propios pies no le da ninguna direccion.
       */
      const p = g.player.position;
      z.ai.oirRuido(p.x, p.z, 1000);
      return { x: z.posicion.x, z: z.posicion.z };
    });

    test.skip(!!partida.sinZombis, 'no habia zombis en juego');

    // Esperar a que se haya movido lo suficiente para que la direccion de
    // desplazamiento sea significativa y no ruido numerico.
    await page.waitForFunction(
      (ini) => {
        const z = globalThis.game.zombis.enJuego[0];
        return Math.hypot(z.posicion.x - ini.x, z.posicion.z - ini.z) > 0.8;
      },
      partida,
      { timeout: 20000 }
    );

    const r = await page.evaluate((ini) => {
      const z = globalThis.game.zombis.enJuego[0];
      const frente = z.entity.forward;
      return {
        frente: { x: frente.x, z: frente.z },
        avance: { x: z.posicion.x - ini.x, z: z.posicion.z - ini.z }
      };
    }, partida);

    const largo = Math.hypot(r.avance.x, r.avance.z);
    const escalar = (r.frente.x * r.avance.x + r.frente.z * r.avance.z) / largo;
    expect(
      escalar,
      `el zombi camina de espaldas (escalar ${escalar.toFixed(2)})`
    ).toBeGreaterThan(0.5);
  });
});
