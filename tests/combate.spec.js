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

  test('quedarse quieto elige un blanco, y moverse lo suelta', async ({ page }) => {
    /*
     * El cableado de la 17.3, de punta a punta.
     *
     * Las unitarias cubren la maquina de estados con numeros y
     * `objetivo.test.js` cubre la eleccion. Lo que ninguna de las dos puede
     * cubrir es el cruce: que `quieto` lo produzca el jugador de verdad a
     * partir del joystick de verdad, que la lista de zombis sea la del
     * gestor y que el escenario que tapa la vista sea el mundo construido.
     *
     * Es el mismo motivo por el que esta prueba existe en este archivo:
     * las unitarias del arma eran impecables mientras el cuchillo golpeaba
     * para atras en el juego.
     */
    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const esperar = (n) =>
        new Promise((res) => {
          let i = 0;
          const paso = () => (++i >= n ? res() : requestAnimationFrame(paso));
          requestAnimationFrame(paso);
        });

      const zona = g.mission.mission.zonas.find((z) => z.tipo === 'zombis');
      g.player.teleport(zona.x, zona.z + 8);
      // Sin tocar nada: el retardo de quieto corre solo.
      await esperar(60);

      const vivos = g.zombis.enJuego.filter((z) => z.vivo).length;
      const quieto = g.player.quieto;
      const elegido = g.blanco.actual;

      /*
       * Y ahora, la regla: que el elegido sea el mas cercano VISIBLE.
       *
       * Se fuerza una eleccion nueva y se mide en el MISMO instante, sin
       * dejar pasar un cuadro. La primera version de esta prueba comparaba
       * `blanco.distancia` —que es la distancia del momento en que
       * eligio— contra las posiciones de ahora, y fallaba por tres metros:
       * los zombis caminan.
       *
       * Fallaba con razon, y lo que marcaba no era un error del juego sino
       * de la prueba: **el blanco es una foto del momento en que el jugador
       * freno**, y esa es justamente la regla que la 17.3 implementa. Medir
       * una foto contra el presente no prueba nada.
       */
      const p = g.player.position;
      const aqui = { x: p.x, z: p.z };
      g.blanco.reiniciar();
      const reelegido = g.blanco.update(true, aqui, g.zombis.enJuego);

      let masCercanoVisible = Infinity;
      for (const z of g.zombis.enJuego) {
        if (!z.vivo) continue;
        const d = Math.hypot(z.posicion.x - aqui.x, z.posicion.z - aqui.z);
        const tapado = g.collision.raycast(
          aqui.x,
          aqui.z,
          z.posicion.x,
          z.posicion.z,
          g.arma.arma.shotHeight
        );
        if (tapado && tapado.t < 0.95) continue;
        masCercanoVisible = Math.min(masCercanoVisible, d);
      }

      return {
        vivos,
        quieto,
        hayBlanco: !!elegido,
        blancoVivo: elegido ? elegido.vivo : null,
        distancia: g.blanco.distancia,
        alcance: g.arma.arma.range,
        reeligio: !!reelegido,
        masCercanoVisible
      };
    });

    test.skip(r.vivos === 0, 'no habia zombis en juego');

    expect(r.quieto, 'sin tocar nada, el jugador tiene que quedar quieto').toBe(true);
    expect(r.hayBlanco, 'estando quieto con zombis cerca no eligio a nadie').toBe(true);
    expect(r.blancoVivo).toBe(true);
    expect(r.distancia).toBeLessThanOrEqual(r.alcance);
    // Y al elegir, elige al mas cercano de los que se VEN, no a uno
    // cualquiera: medido en el mismo instante, con el escenario de verdad.
    expect(r.reeligio).toBe(true);
    expect(r.distancia).toBeCloseTo(r.masCercanoVisible, 1);

    /*
     * Y moverse lo suelta. Se mueve con el teclado, que es la via normal
     * del juego: si se tocara `player.quieto` a mano, la prueba no estaria
     * probando el cruce que vino a probar.
     */
    await page.keyboard.down('KeyW');

    /*
     * Se espera POR CONDICION, no por tiempo.
     *
     * La primera version esperaba 300 ms y fallaba de manera intermitente:
     * pasaba sola y fallaba en la corrida completa. El motivo es el de
     * siempre en este proyecto —el navegador de prueba corre con WebGL por
     * software, a veces a cuatro cuadros por segundo— asi que 300 ms de
     * pared pueden ser un solo cuadro de juego, y a veces ninguno.
     *
     * Es el mismo error que varias pruebas de este repo ya tenian anotado
     * en un comentario. Lo escribi igual.
     */
    await page.waitForFunction(() => !globalThis.game.player.quieto, null, {
      timeout: 20000
    });
    const enMovimiento = await page.evaluate(() => ({
      quieto: globalThis.game.player.quieto,
      hayBlanco: !!globalThis.game.blanco.actual
    }));
    await page.keyboard.up('KeyW');

    expect(enMovimiento.quieto).toBe(false);
    expect(enMovimiento.hayBlanco, 'siguio encarando al blanco mientras huia').toBe(false);
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
