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
     * Timeout largo: la prueba deja correr cuadros de juego de verdad, y el
     * navegador de prueba usa WebGL por software a cuatro cuadros por
     * segundo. Un segundo de juego cuesta cuatro de pared.
     */
    test.setTimeout(180000);
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
      await esperar(20);

      /*
       * El zombi se pone a mano, a tiro y a la vista.
       *
       * Antes esta prueba confiaba en los del mapa y esperaba 60 cuadros.
       * Dejo de andar en la 17.5, cuando Gus empezo a disparar solo: para
       * cuando media, **ya los habia matado**, y los que quedaban estaban a
       * treinta metros y detras de una pared.
       *
       * El fallo era correcto —el juego hacia exactamente lo que tiene que
       * hacer— pero la prueba dejaba de medir lo suyo. Poniendo el zombi,
       * mide la eleccion y no la suerte de que haya alguien cerca.
       */
      const p0 = g.player.position;
      let victima = g.zombis.enJuego.find((z) => z.vivo);
      if (!victima) return { vivos: 0 };

      /*
       * El lugar NO se elige a ojo: se busca uno con linea de vista
       * comprobada.
       *
       * La primera version lo ponia siete metros al norte y quedaba
       * **detras de una pared**: el juego lo descartaba con razon (D-36) y
       * la prueba fallaba por un motivo que no tenia nada que ver con lo
       * que queria medir. En una calle de Boedo, "siete metros para alla"
       * es adentro de un edificio la mitad de las veces.
       */
      let lugar = null;
      for (let a = 0; a < 360 && !lugar; a += 15) {
        const d = g.rumbo.dirDeRumbo(a);
        const x = p0.x + d.x * 7;
        const z = p0.z + d.z * 7;
        const hit = g.collision.raycast(p0.x, p0.z, x, z, g.arma.arma.shotHeight);
        if (hit && hit.t < 0.95) continue;
        lugar = { x, z };
      }
      if (!lugar) return { sinLugar: true };

      /*
       * El zombi se mantiene PLANTADO ahi, cuadro a cuadro, y no se lo hace
       * invencible.
       *
       * Hubo dos intentos antes y los dos fallaban por motivos opuestos.
       * Con vida normal, el combate automatico lo mata en 1,6 s y para
       * cuando la prueba mira ya no hay a quien elegir. Con vida infinita
       * —99999— deja de morir pero **camina hasta Gus y lo mata a el**:
       * doce mordidas y la partida se termina, asi que tampoco hay blanco.
       *
       * Plantarlo resuelve las dos: no se acerca, y si igual muere se pone
       * otro en su lugar. Esta prueba es sobre **elegir**; matar y morir
       * tienen las suyas.
       */
      const plantar = () => {
        if (!victima.vivo) {
          const otro = g.zombis.enJuego.find((z) => z.vivo && z !== victima);
          if (!otro) return false;
          victima = otro;
        }
        victima.entity.setPosition(lugar.x, 0, lugar.z);
        victima.ai.estado = 'IDLE';
        victima.ai.ultimoVisto = null;
        return true;
      };
      /*
       * Se espera A QUE HAYA BLANCO, no una cantidad de cuadros.
       *
       * Las dos versiones anteriores fallaron por lo mismo con dos
       * disfraces: con doce cuadros, Gus **ya lo habia matado**; con tres,
       * el zombi habia caminado dos metros y se habia metido detras de una
       * pared. Las dos veces el juego hacia exactamente lo que tiene que
       * hacer y la prueba miraba en el momento equivocado.
       *
       * Esperando por la condicion, lo que se mide es lo que la prueba
       * dice medir: que estando quieto con alguien a tiro, elige. Y si
       * nunca elige, falla, que es lo que corresponde.
       */
      /*
       * Se espera a un cuadro en el que **las dos mediciones valgan a la
       * vez**: que haya blanco y que forzar una eleccion nueva encuentre a
       * alguien.
       *
       * Antes se esperaba al blanco y despues se forzaba la eleccion, y
       * fallaba de a ratos en la corrida completa: entre un cuadro y el
       * siguiente el zombi camina, y le alcanza con meterse detras de un
       * colectivo para que el forzado no encuentre a nadie. El juego hacia
       * lo correcto; la prueba miraba dos instantes y los trataba como uno.
       */
      let elegido = null;
      let reelegido = null;
      let aqui = { x: 0, z: 0 };
      for (let i = 0; i < 150; i++) {
        /*
         * Se sostiene al jugador en su lugar, como hacen las otras pruebas
         * de combate: el zombi plantado no lo toca, pero los demas del mapa
         * lo empujan y lo muerden, y un Gus que se muere reaparece en el
         * control anterior —a cincuenta metros— con el blanco viejo todavia
         * en la mano. Ahi la eleccion forzada no encuentra a nadie, y la
         * prueba culpaba al juego de algo que habia hecho ella.
         */
        g.player.entity.setPosition(p0.x, 0, p0.z);
        g.player.health = g.balance.PLAYER.maxHealth;
        if (!plantar()) break;
        await esperar(1);

        /*
         * Y se lo vuelve a plantar DESPUES del cuadro, justo antes de
         * medir.
         *
         * Plantarlo solo antes no alcanzaba: en un cuadro camina hasta
         * 1,6 s × 2,9 m/s, y le sobraba con eso para meterse detras de un
         * auto. La medicion encontraba la linea de vista cortada en 0,44 y
         * culpaba a la eleccion.
         */
        plantar();
        elegido = g.blanco.actual;
        if (!elegido) continue;

        const pp = g.player.position;
        aqui = { x: pp.x, z: pp.z };
        g.blanco.reiniciar();
        reelegido = g.blanco.update(true, aqui, g.zombis.enJuego);
        if (reelegido) break;
      }

      const vivos = g.zombis.enJuego.filter((z) => z.vivo).length;
      const quieto = g.player.quieto;
      /*
       * La marca del blanco (17.8). Se mira **su posicion en el mundo**,
       * no sólo que este encendida: una marca prendida en el lugar
       * equivocado es peor que ninguna, porque señala a otro.
       */
      const marca = g.efectos.marca;
      const mp = marca.getPosition();
      const marcaVisible = marca.enabled;
      const marcaLejosDelBlanco = elegido
        ? Math.hypot(mp.x - elegido.posicion.x, mp.z - elegido.posicion.z)
        : null;

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
        marcaVisible,
        marcaLejosDelBlanco,
        blancoVivo: elegido ? elegido.vivo : null,
        distancia: g.blanco.distancia,
        alcance: g.arma.arma.range,
        reeligio: !!reelegido,
        masCercanoVisible
      };
    });

    test.skip(r.vivos === 0, 'no habia zombis en juego');
    test.skip(!!r.sinLugar, 'no habia ningun punto a la vista a siete metros');

    expect(r.quieto, 'sin tocar nada, el jugador tiene que quedar quieto').toBe(true);
    expect(r.hayBlanco, 'estando quieto con un zombi a tiro no eligio a nadie').toBe(true);
    expect(r.blancoVivo).toBe(true);
    expect(r.distancia).toBeLessThanOrEqual(r.alcance);
    // Y al elegir, elige al mas cercano de los que se VEN, no a uno
    // cualquiera: medido en el mismo instante, con el escenario de verdad.
    expect(r.reeligio, 'no quedo nadie a tiro al forzar una eleccion nueva').toBe(true);
    expect(r.distancia).toBeCloseTo(r.masCercanoVisible, 1);

    // Y se MARCA, en el lugar donde esta el blanco (17.8).
    expect(r.marcaVisible, 'hay blanco pero no se marca a nadie').toBe(true);
    expect(
      r.marcaLejosDelBlanco,
      `la marca esta a ${r.marcaLejosDelBlanco?.toFixed(1)} m del blanco`
    ).toBeLessThan(0.5);

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
      hayBlanco: !!globalThis.game.blanco.actual,
      marcaVisible: globalThis.game.efectos.marca.enabled
    }));
    await page.keyboard.up('KeyW');

    expect(enMovimiento.quieto).toBe(false);
    expect(enMovimiento.hayBlanco, 'siguio encarando al blanco mientras huia').toBe(false);
    // Y la marca se apaga con el: una marca huerfana señalaria a un zombi
    // al que Gus ya no le dispara, que es informacion falsa.
    expect(enMovimiento.marcaVisible, 'quedo una marca sin blanco').toBe(false);
  });

  test('sin tocar NADA, limpia un grupo de zombis uno tras otro', async ({ page }) => {
    /*
     * Timeout largo y a proposito: esta prueba deja correr el juego de
     * verdad durante cientos de cuadros, y el navegador de prueba usa
     * WebGL por software a cuatro cuadros por segundo. No es que sea
     * lenta: es que un segundo de juego cuesta cuatro de pared.
     */
    test.setTimeout(180000);
    /*
     * El criterio de salida de la Fase 17, puesto a prueba en el juego de
     * verdad: *"se puede terminar la mision sin tocar nada mas que el
     * joystick"*. Acá ni siquiera se toca el joystick.
     *
     * Lo que cruza esta prueba y ninguna unitaria puede cruzar: que
     * `quieto` salga del jugador real, que el giro llegue al cuerpo, que
     * `encarado` destrabe el gatillo, que el daño llegue al zombi del
     * gestor y que al morir uno **el siguiente se elija solo**.
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
      g.player.teleport(zona.x, zona.z + 10);
      await esperar(20);

      /*
       * Tres zombis puestos a mano, en abanico y a tiro. Se ponen a mano
       * porque los del mapa estan a treinta metros y detras de paredes: el
       * juego ya los descarta bien, y lo que hay que probar aca es el
       * combate, no el descarte.
       */
      const p = g.player.position;
      const victimas = g.zombis.enJuego.filter((z) => z.vivo).slice(0, 3);
      if (victimas.length < 3) return { pocos: victimas.length };
      victimas.forEach((z, i) => {
        z.entity.setPosition(p.x + (i - 1) * 3, 0, p.z - 8);
        z.ai.estado = 'IDLE';
      });
      await esperar(10);

      const disparos0 = g.stats.disparos;

      // Y ahora NADA. Ni una tecla, ni un toque.
      await esperar(150);

      return {
        muertas: victimas.filter((z) => !z.vivo).length,
        disparos: g.stats.disparos - disparos0,
        quieto: g.player.quieto
      };
    });

    test.skip(r.pocos !== undefined, `solo habia ${r.pocos} zombis`);

    expect(r.quieto, 'no estaba quieto: el combate automatico no corre').toBe(true);
    expect(r.disparos, 'no disparo solo ni una vez').toBeGreaterThan(0);
    expect(
      r.muertas,
      `mato ${r.muertas} de 3 sin que el jugador tocara nada`
    ).toBeGreaterThanOrEqual(2);
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
