import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * LAS REGLAS DE LA MISION
 * ===========================================================================
 * Que se pueda jugar de principio a fin: ganar, perder, reintentar, y que
 * el progreso sobreviva a cerrar la pestaña.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ACA SE TELETRANSPORTA EN VEZ DE CAMINAR
 * ---------------------------------------------------------------------------
 * Si la ruta es transitable ya lo prueba `recorrido.spec.js`, caminándola
 * de verdad con todos los obstáculos puestos. Repetir esa caminata acá
 * costaría minutos por prueba y mediría lo mismo dos veces.
 *
 * Lo que se prueba acá son las REGLAS: que no se pueda saltear un control,
 * que la meta no cuente sin ellos, que las estadísticas cuenten lo que
 * dicen contar, y que reiniciar deje el mundo como estaba. Para eso el
 * teletransporte es la herramienta correcta, porque permite llegar a cada
 * situación en un segundo en vez de en cinco minutos.
 */

const AYUDAS = `
globalThis.__esperar = (n) => new Promise((r) => {
  let i = 0;
  const paso = () => (++i >= n ? r() : requestAnimationFrame(paso));
  requestAnimationFrame(paso);
});
/** Lleva al jugador a un punto y deja que la mision se entere. */
globalThis.__ir = async (p) => {
  globalThis.game.player.teleport(p.x, p.z);
  await globalThis.__esperar(4);
};
/** Toma todos los controles en orden. */
globalThis.__tomarControles = async () => {
  const g = globalThis.game;
  for (const cp of g.mission.mission.checkpoints) {
    await globalThis.__ir(g.mission.mission.route[cp.atRouteIndex]);
  }
  return g.mission.nextCheckpoint;
};
/** Va a la meta. */
globalThis.__irAMeta = async () => {
  const g = globalThis.game;
  await globalThis.__ir(g.mission.mission.route[g.mission.mission.goal.atRouteIndex]);
  await globalThis.__esperar(4);
};
`;

async function entrar(page, { limpio = true } = {}) {
  await page.goto('/');

  /*
   * El guardado se limpia UNA sola vez y despues se recarga.
   *
   * La primera version usaba `addInitScript`, que corre en CADA
   * navegacion: la prueba del record recargaba la pagina para comprobar
   * que sobrevivia, y el script le borraba el record justo antes de
   * mirarlo. La prueba fallaba acusando al juego de algo que hacia ella.
   */
  if (limpio) {
    await page.evaluate(() => {
      try {
        localStorage.removeItem('explorarba.progreso');
      } catch {
        /* en una ventana privada da igual */
      }
    });
    await page.reload();
  }

  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();
  await page.evaluate(AYUDAS);
}

/** Lee el marcador de una pantalla como pares etiqueta → valor. */
async function leerMarcador(page, cual) {
  return page.evaluate((cual) => {
    const dl = document.getElementById(`marcador-${cual}`);
    const out = {};
    const hijos = [...dl.children];
    for (let i = 0; i < hijos.length; i += 2) {
      out[hijos[i].textContent] = hijos[i + 1].textContent;
    }
    return out;
  }, cual);
}

test.describe('no se puede saltear el recorrido', () => {
  test('ir directo a la meta NO completa la mision', async ({ page }) => {
    await entrar(page);

    const r = await page.evaluate(async () => {
      await globalThis.__irAMeta();
      return {
        completada: globalThis.game.mission.completed,
        controles: globalThis.game.mission.nextCheckpoint
      };
    });

    expect(r.controles, 'tomo controles sin pasar por ellos').toBe(0);
    expect(r.completada, 'completo la mision salteando los controles').toBe(false);
    await expect(page.locator('#screen-complete')).toBeHidden();
  });

  test('los controles cuentan en orden', async ({ page }) => {
    await entrar(page);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const cps = g.mission.mission.checkpoints;
      // Ir al ULTIMO control primero: no tiene que contar.
      await globalThis.__ir(g.mission.mission.route[cps[cps.length - 1].atRouteIndex]);
      const trasSaltar = g.mission.nextCheckpoint;

      // Y ahora al primero, que si.
      await globalThis.__ir(g.mission.mission.route[cps[0].atRouteIndex]);
      return { trasSaltar, trasElPrimero: g.mission.nextCheckpoint };
    });

    expect(r.trasSaltar, 'el ultimo control conto sin los anteriores').toBe(0);
    expect(r.trasElPrimero).toBe(1);
  });
});

test.describe('ganar', () => {
  test('con todos los controles, la meta completa la mision', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const tomados = await globalThis.__tomarControles();
      await globalThis.__irAMeta();
      return { tomados, total: g.mission.mission.checkpoints.length };
    });

    expect(r.tomados).toBe(r.total);
    await expect(page.locator('#screen-complete')).toBeVisible();
    expect(errores).toEqual([]);
  });

  test('el marcador cuenta lo que dice contar', async ({ page }) => {
    await entrar(page);

    await page.evaluate(async () => {
      const g = globalThis.game;
      // Una partida con hechos concretos que despues se verifican.
      g.stats.zombisEliminados = 7;
      g.player.health = 42;
      g.stats.golpesRecibidos = 3;
      await globalThis.__tomarControles();
      await globalThis.__irAMeta();
    });

    await expect(page.locator('#screen-complete')).toBeVisible();
    const m = await leerMarcador(page, 'win');

    expect(m['ZOMBIS ELIMINADOS']).toBe('7');
    expect(m['VIDA RESTANTE']).toBe('42');
    expect(m['GOLPES RECIBIDOS']).toBe('3');
    expect(m['TIEMPO']).toMatch(/^\d+:\d{2}$/);

    // Sin muertes, esa fila no ocupa lugar.
    expect(m['MUERTES']).toBeUndefined();
  });

  test('hay UN solo reloj: el subtitulo no contradice al marcador', async ({ page }) => {
    /*
     * Hubo dos relojes, `mission.elapsed` y `stats.tiempo`. Avanzaban con
     * el mismo dt y por eso coincidian, asi que el problema estuvo
     * invisible hasta que la pantalla de victoria mostro uno en el
     * subtitulo y el otro en el marcador: 0:00 arriba y 11:42 abajo.
     *
     * Esta prueba fija un tiempo y exige que NINGUN otro numero de tiempo
     * aparezca en la pantalla contradiciendolo. Si alguien vuelve a
     * agregar un segundo reloj, se cae aca.
     */
    await entrar(page);

    await page.evaluate(async () => {
      await globalThis.__tomarControles();
      globalThis.game.stats.tiempo = 11 * 60 + 42;
      await globalThis.__irAMeta();
    });
    await expect(page.locator('#screen-complete')).toBeVisible();

    const m = await leerMarcador(page, 'win');
    expect(m['TIEMPO']).toBe('11:42');

    // El subtitulo no puede traer un tiempo propio.
    const subtitulo = await page.locator('#complete-detail').textContent();
    expect(subtitulo, `el subtitulo trae un reloj propio: "${subtitulo}"`).not.toMatch(
      /\d+:\d{2}/
    );
  });

  test('la primera victoria es record; una mas lenta no lo pisa', async ({ page }) => {
    await entrar(page);

    // --- Primera, rapida ---------------------------------------------------
    await page.evaluate(async () => {
      await globalThis.__tomarControles();
      globalThis.game.stats.tiempo = 60;
      await globalThis.__irAMeta();
    });
    await expect(page.locator('#screen-complete')).toBeVisible();
    await expect(page.locator('#record')).toBeVisible();

    const mejor = await page.evaluate(() => globalThis.game.progreso.mejorTiempo);
    expect(mejor).toBeCloseTo(60, 0);

    // --- Segunda, mas lenta ------------------------------------------------
    await page.locator('#btn-restart-win').click();
    await expect(page.locator('#screen-hud')).toBeVisible();
    await page.evaluate(AYUDAS);

    await page.evaluate(async () => {
      await globalThis.__tomarControles();
      globalThis.game.stats.tiempo = 200;
      await globalThis.__irAMeta();
    });
    await expect(page.locator('#screen-complete')).toBeVisible();

    // No es record, y el marcador muestra el viejo como referencia.
    await expect(page.locator('#record')).toBeHidden();
    const m = await leerMarcador(page, 'win');
    expect(m['TIEMPO']).toBe('3:20');
    expect(m['MEJOR TIEMPO'], 'el record se piso con un tiempo peor').toBe('1:00');
  });

  test('el record sobrevive a recargar la pagina', async ({ page }) => {
    await entrar(page);
    await page.evaluate(async () => {
      await globalThis.__tomarControles();
      globalThis.game.stats.tiempo = 95;
      await globalThis.__irAMeta();
    });
    await expect(page.locator('#screen-complete')).toBeVisible();

    // Recargar de verdad, sin limpiar el guardado.
    await page.reload();
    await page.locator('#btn-start').click();
    await expect(page.locator('#screen-hud')).toBeVisible();

    const mejor = await page.evaluate(() => globalThis.game.progreso.mejorTiempo);
    expect(mejor, 'el record no sobrevivio a recargar').toBeCloseTo(95, 0);
  });
});

test.describe('perder y reintentar', () => {
  test('morir muestra desde donde se vuelve, y el marcador', async ({ page }) => {
    await entrar(page);

    await page.evaluate(async () => {
      const g = globalThis.game;
      const cps = g.mission.mission.checkpoints;
      await globalThis.__ir(g.mission.mission.route[cps[0].atRouteIndex]);
      g.stats.zombisEliminados = 2;
      g.player.applyDamage(999, 'prueba');
      await globalThis.__esperar(4);
    });

    await expect(page.locator('#screen-gameover')).toBeVisible();
    await expect(page.locator('#gameover-detail')).toContainText('control 1');

    const m = await leerMarcador(page, 'lose');
    expect(m['ZOMBIS ELIMINADOS']).toBe('2');
    expect(m['CONTROLES']).toMatch(/^1 de \d+$/);
    expect(m['DISTANCIA AL OBJETIVO']).toMatch(/^\d+ m$/);
  });

  test('el reloj NO se reinicia al morir, y la muerte queda contada', async ({ page }) => {
    /*
     * Volver desde un control continua el MISMO intento. Es lo que hace
     * que el mejor tiempo signifique algo —morir cuesta— sin castigar con
     * nada mas. Un reloj que se pone en cero convertiria morir en una
     * forma barata de volver a empezar el cronometro.
     */
    await entrar(page);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      const cps = g.mission.mission.checkpoints;
      await globalThis.__ir(g.mission.mission.route[cps[0].atRouteIndex]);

      g.stats.tiempo = 120;
      g.player.applyDamage(999, 'prueba');
      await globalThis.__esperar(4);
      const alMorir = g.stats.tiempo;

      document.getElementById('btn-restart-lose').click();
      await globalThis.__esperar(6);

      return {
        alMorir,
        trasReaparecer: g.stats.tiempo,
        muertes: g.stats.muertes,
        vida: g.player.health,
        controles: g.mission.nextCheckpoint
      };
    });

    expect(r.alMorir).toBeCloseTo(120, 0);
    expect(r.trasReaparecer, 'el reloj se reinicio al morir').toBeGreaterThanOrEqual(120);
    expect(r.muertes).toBe(1);
    // Reaparece entero y conservando los controles ya tomados.
    expect(r.vida).toBe(100);
    expect(r.controles).toBe(1);
  });

  test('empezar de nuevo SI pone el reloj en cero', async ({ page }) => {
    await entrar(page);

    const r = await page.evaluate(async () => {
      const g = globalThis.game;
      await globalThis.__tomarControles();
      g.stats.tiempo = 300;
      g.stats.zombisEliminados = 9;

      // Reiniciar desde la pausa: eso si es un intento nuevo.
      document.getElementById('btn-pause').click();
      await globalThis.__esperar(3);
      document.getElementById('btn-restart-pause').click();
      await globalThis.__esperar(6);

      return {
        tiempo: g.stats.tiempo,
        zombis: g.stats.zombisEliminados,
        muertes: g.stats.muertes,
        controles: g.mission.nextCheckpoint
      };
    });

    expect(r.tiempo).toBeLessThan(5);
    expect(r.zombis).toBe(0);
    expect(r.muertes).toBe(0);
    expect(r.controles).toBe(0);
  });
});

test.describe('reinicio limpio', () => {
  test('reiniciar cinco veces deja el mundo igual cada vez', async ({ page }) => {
    /*
     * La tarea 9.7: "ni un zombi duplicado, ni un objeto recogido que
     * vuelve a estar recogido, ni un temporizador que quedo corriendo".
     *
     * Se compara el estado completo contra el de la primera vez. Con la
     * semilla fija, dos arranques tienen que dar EXACTAMENTE lo mismo: si
     * algo se acumula, el numero crece y la comparacion lo muestra.
     */
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await entrar(page);

    /*
     * La foto NO incluye `zombis.stats.vivos`.
     *
     * Ese numero depende de cuantos zombis se encendieron cerca del
     * jugador en ese cuadro exacto, asi que cambia entre dos arranques
     * identicos sin que nada este mal. Incluirlo hacia fallar la prueba
     * por un motivo que no tiene nada que ver con lo que mide.
     *
     * Lo que SI detecta una duplicacion es `zombisTotal` —los puestos del
     * mapa— y, sobre todo, el total de entidades de la escena: si algo se
     * acumula al reiniciar (zombis, objetos, cohetes), ese numero crece y
     * no vuelve a bajar.
     */
    const foto = () =>
      page.evaluate(() => {
        const g = globalThis.game;
        let entidades = 0;
        const contar = (e) => {
          entidades++;
          for (const h of e.children) contar(h);
        };
        contar(g.app.root);

        return {
          entidadesEnEscena: entidades,
          zombisTotal: g.zombis.stats.total,
          objetos: JSON.stringify(g.objetos.contar()),
          entidadesObjeto: g.vistaObjetos.vistas.size,
          cohetes: g.cohetes.vivos.length,
          botiquines: g.inventario.cuantos('medkit'),
          cargador: g.arma.enCargador,
          reserva: g.arma.enReserva,
          bazooka: Math.round(g.arma.progresoEspecial * 10),
          controles: g.mission.nextCheckpoint,
          usando: g.uso.enCurso
        };
      });

    const primera = await foto();

    for (let i = 0; i < 5; i++) {
      // Ensuciar el estado antes de reiniciar: juntar cosas, gastar balas,
      // avanzar controles, dejar un uso a medias.
      await page.evaluate(async () => {
        const g = globalThis.game;
        g.arma.cargador.pistol = 2;
        g.inventario.agregar('medkit', 1);
        g.uso.iniciar('medkit', 5);
        await globalThis.__ir(
          g.mission.mission.route[g.mission.mission.checkpoints[0].atRouteIndex]
        );
      });

      await page.locator('#btn-pause').click();
      await page.locator('#btn-restart-pause').click();
      await expect(page.locator('#screen-hud')).toBeVisible();
      await page.evaluate(AYUDAS);

      const ahora = await foto();
      expect(ahora, `el mundo cambio tras el reinicio numero ${i + 1}`).toEqual(primera);
    }

    expect(errores).toEqual([]);
  });
});
