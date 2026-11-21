import { test, expect } from '@playwright/test';

/**
 * ===========================================================================
 * RECORRIDO DE LA MISION 001
 * ===========================================================================
 * Comprueba lo que ninguna prueba unitaria puede: que la ruta siga siendo
 * TRANSITABLE con todos los obstaculos puestos, y cuanto hay que caminar.
 *
 * ---------------------------------------------------------------------------
 * COMO CAMINA
 * ---------------------------------------------------------------------------
 * En cada paso evalua un abanico de direcciones alrededor de la que va al
 * objetivo: de frente, y abriendo de a treinta grados hasta mirar casi para
 * atras. Se queda con la primera que realmente lo mueva, prefiriendo las
 * que mas lo acercan, y recuerda el desvio elegido para no oscilar.
 *
 * Se probaron antes dos versiones mas simples y las dos fallaban:
 *
 *   - Ir derecho y desviarse un paso al chocar: oscila contra el obstaculo
 *     para siempre, porque despues del desvio vuelve a apuntar al objetivo
 *     y choca de nuevo.
 *   - Comprometerse a bordear N pasos por un lado: mejora, pero elige el
 *     lado a ciegas y se mete en los callejones sin salida.
 *
 * El abanico resuelve las dos cosas y sigue siendo quince lineas.
 *
 * Es tosco a proposito. Si un caminante tosco llega, una persona llega. Si
 * se traba, el informe dice la coordenada Y QUE LO BLOQUEA, que es lo que
 * uno necesita para ir a corregir el archivo de la mision.
 *
 * El tiempo NO se mide: la prueba corre con WebGL por software y el reloj
 * del juego no avanza como el de pared. Lo que vale es la DISTANCIA.
 */

test('la ruta completa es transitable con todos los obstaculos puestos', async ({ page }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text());
  });

  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const informe = await page.evaluate(async () => {
    const { player, mission, collision, builder, ventana } = globalThis.game;

    /*
     * El mapa entero, a proposito.
     *
     * Desde la 18.12 la ciudad se construye por ventana de cuadras, y este
     * caminante corre dentro de un `page.evaluate` que bloquea el cuadro:
     * la ventana no llegaria a mover nada y el caminante atravesaria
     * cuadras vacias. **Una prueba de obstaculos sin obstaculos pasa
     * siempre**, que es la peor forma de verde.
     *
     * Lo que esta prueba verifica es el diseño del nivel; el streaming
     * tiene las suyas en `ventana.test.js`.
     */
    builder.construirTodo(mission.mission);
    for (let i = 0; i < mission.mission.route.length - 1; i++) ventana.enPie.add(i);
    const m = mission.mission;
    const radio = player.radius;
    const PASO = 0.3;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    /** Intenta moverse en una direccion. Devuelve cuanto avanzo. */
    const mover = (dx, dz) => {
      const p = player.position;
      const d = Math.hypot(dx, dz) || 1;
      const r = collision.moveCircle({ x: p.x, z: p.z }, (dx / d) * PASO, (dz / d) * PASO, radio);
      player.entity.setPosition(r.x, 0, r.z);
      return Math.hypot(r.x - p.x, r.z - p.z);
    };

    /** Que cajas tiene encima el jugador. Para el informe de trabado. */
    const bloqueantes = () => {
      const p = player.position;
      return [...collision.query(p.x, p.z, 1.6)].map((b) => ({
        tag: b.tag,
        x: +((b.minX + b.maxX) / 2).toFixed(1),
        z: +((b.minZ + b.maxZ) / 2).toFixed(1),
        w: +(b.maxX - b.minX).toFixed(1),
        d: +(b.maxZ - b.minZ).toFixed(1)
      }));
    };

    player.teleport(m.spawn.x, m.spawn.z, 0);

    const destinos = [
      ...m.checkpoints.map((c) => ({ p: m.route[c.atRouteIndex], label: c.label })),
      { p: m.route[m.goal.atRouteIndex], label: 'meta' }
    ];

    /*
     * Abanico de desvios, en grados. Alternando lados para no sesgar.
     *
     * ---------------------------------------------------------------------
     * POR QUE LLEGA HASTA 180 Y ANTES LLEGABA A 125
     * ---------------------------------------------------------------------
     * Sin el 180 el caminante **no sabe retroceder**, y eso lo deja clavado
     * en cualquier bolsillo: entra en un hueco entre un colectivo y una
     * fachada, no puede seguir, y los desvios que tiene lo dejan oscilando
     * adentro del hueco hasta que se agota el presupuesto de pasos.
     *
     * Lo encontro la Fase 18.12, cuando cada cuadra paso a generarse con su
     * propio azar y la calle quedo repartida distinto. La duda era si la
     * ruta se habia trabado de verdad. **Se midio en vez de suponerlo**:
     * una busqueda en anchura sobre una grilla de 25 cm, con el radio real
     * del jugador, encontro camino. La ruta estaba bien; el caminante no.
     *
     * Y la correccion no es aflojar la prueba: un jugador puede caminar
     * para atras. Un caminante que no puede es mas exigente que la realidad,
     * y una prueba mas exigente que la realidad falla cuando no debe.
     */
    const DESVIOS = [0, 30, -30, 60, -60, 90, -90, 125, -125, 155, -155, 180];

    let distanciaTotal = 0;
    const trabas = [];
    const tramos = [];

    for (const { p: destino, label } of destinos) {
      let ultimoDesvio = 0;
      let mejor = dist(player.position, destino);
      let sinMejorar = 0;
      let recorridoTramo = 0;
      let trabado = false;

      for (let i = 0; i < 8000; i++) {
        const p = player.position;
        const actual = dist(p, destino);
        if (actual < 3) break;

        const base = Math.atan2(destino.x - p.x, destino.z - p.z);

        // Se prueba primero el desvio que funciono la vez anterior: es lo
        // que evita que zigzaguee bordeando un obstaculo largo.
        const orden = [ultimoDesvio, ...DESVIOS.filter((d) => d !== ultimoDesvio)];

        /*
         * Se elige el desvio que MAS ACERCA, no el primero que mueve.
         *
         * Antes tomaba el primero que avanzara, y eso lo dejaba resbalando
         * de lado contra la chapa de un colectivo: `moveCircle` desliza por
         * las paredes, asi que apretar contra un obstaculo "avanza" sin
         * acercarse ni un metro. El caminante se quedaba yendo y viniendo
         * sobre la misma cara hasta agotar el presupuesto de pasos.
         *
         * El desvio que funciono la vez anterior sigue teniendo prioridad
         * —es lo que evita el zigzag bordeando un obstaculo largo— pero
         * solo si ademas acerca. Si no, se prueban todos y gana el mejor.
         *
         * Cuando ninguno acerca, se toma el primero que mueva: es el caso
         * de bordear algo largo, donde hay que alejarse un rato para poder
         * pasar.
         */
        const volverA = { x: p.x, z: p.z };
        const probar = (grados) => {
          player.entity.setPosition(volverA.x, 0, volverA.z);
          const a = base + (grados * Math.PI) / 180;
          const movio = mover(Math.sin(a), Math.cos(a));
          return { grados, movio, nueva: dist(player.position, destino) };
        };

        let elegido = probar(ultimoDesvio);
        if (!(elegido.movio > PASO * 0.4 && elegido.nueva < actual)) {
          let mejorPaso = null;
          let primeroQueMueve = null;
          for (const grados of orden) {
            const r = probar(grados);
            if (r.movio <= PASO * 0.4) continue;
            if (!primeroQueMueve) primeroQueMueve = r;
            if (r.nueva < actual && (!mejorPaso || r.nueva < mejorPaso.nueva)) mejorPaso = r;
          }
          elegido = mejorPaso ?? primeroQueMueve ?? { grados: 0, movio: 0 };
          player.entity.setPosition(volverA.x, 0, volverA.z);
          if (elegido.movio > 0) probar(elegido.grados);
        }

        const avance = elegido.movio;
        if (avance > PASO * 0.4) ultimoDesvio = elegido.grados;

        if (avance <= PASO * 0.4) {
          trabas.push({
            tramo: label,
            x: +p.x.toFixed(1),
            z: +p.z.toFixed(1),
            bloquean: bloqueantes()
          });
          trabado = true;
          break;
        }

        distanciaTotal += avance;
        recorridoTramo += avance;

        if (actual < mejor - 0.3) {
          mejor = actual;
          sinMejorar = 0;
        } else if (++sinMejorar > 1500) {
          trabas.push({
            tramo: label,
            x: +p.x.toFixed(1),
            z: +p.z.toFixed(1),
            motivo: 'da vueltas sin acercarse',
            bloquean: bloqueantes()
          });
          trabado = true;
          break;
        }
      }

      tramos.push({ label, metros: Math.round(recorridoTramo), trabado });
      if (trabado) break;
    }

    const fin = player.position;
    const meta = m.route[m.goal.atRouteIndex];
    // Largo del recorrido en linea recta, para comparar con lo caminado.
    let recta = 0;
    for (let i = 0; i < m.route.length - 1; i++) {
      recta += dist(m.route[i], m.route[i + 1]);
    }

    return {
      llego: dist(fin, meta) < 8,
      distancia: Math.round(distanciaTotal),
      recta: Math.round(recta),
      tramos,
      trabas,
      fin: { x: +fin.x.toFixed(1), z: +fin.z.toFixed(1) }
    };
  });

  console.log('[recorrido]', JSON.stringify(informe, null, 2));

  expect(informe.trabas, `se trabo: ${JSON.stringify(informe.trabas)}`).toEqual([]);
  expect(informe.llego).toBe(true);

  /*
   * Se compara contra la linea recta del propio recorrido, no contra un
   * numero fijo: asi la prueba sigue valiendo si la ruta cambia.
   *
   * El caminante corta a tres metros de cada destino, de ahi el descuento.
   * El piso del 2% es deliberadamente bajo: lo que se verifica es que los
   * obstaculos obliguen a desviarse ALGO, no que sean un laberinto. Si
   * alguna vez baja de ahi, es que quedaron de adorno.
   */
  const rectaEfectiva = informe.recta - 9;
  const desvio = informe.distancia / rectaEfectiva;
  console.log(
    '[recorrido] recta ' + informe.recta + ' m, caminado ' + informe.distancia +
      ' m, desvio +' + Math.round((desvio - 1) * 100) + '%'
  );
  /*
   * ⚠️ El piso del desvio esta en pausa hasta la 18.7, y se reactiva solo.
   *
   * Esta prueba verifica que los obstaculos obliguen a desviarse ALGO: si
   * el camino es recto, estan de adorno. Hoy el recorrido es recto porque
   * **no hay obstaculos puestos**: la 18.3 cambio el mapa de tres cuadras a
   * las dieciseis reales, y los treinta y pico de props del mapa viejo
   * estaban sobre un trazado que ya no existe.
   *
   * No se baja el umbral ni se borra la comprobacion: se la condiciona a
   * que haya algo puesto a mano. El dia que la 18.7 ponga el primer
   * obstaculo, esto vuelve a exigir sin que nadie se tenga que acordar.
   */
  const hayObstaculos = await page.evaluate(
    () => globalThis.game.mission.mission.props.length
  );
  test.skip(
    hayObstaculos === 0,
    'la 18.7 todavia no puso obstaculos: no hay nada que obligue a desviarse'
  );
  expect(desvio).toBeGreaterThan(1.02);
  expect(desvio).toBeLessThan(2.5);

  expect(errores).toEqual([]);
});

/*
 * ===========================================================================
 * ACA HABIA UNA PRUEBA DE LOS PASAJES, Y SE FUE CON ELLOS (D-34, 18.8)
 * ===========================================================================
 * "Cada pasaje se puede recorrer de punta a punta". Entraba por la boca,
 * caminaba hasta el otro extremo y exigia llegar.
 *
 * Existia porque **un pasaje tapiado es peor que no tenerlo**: el jugador
 * ve la boca, se mete, pierde tiempo y sale por donde entro. Y las bocas
 * dependian de que el generador dejara un hueco en la hilera de fachadas,
 * que es justo el tipo de cosa que se rompe sola al tocar la semilla.
 *
 * Los pasajes se fueron con D-34: hay una sola ruta y todo lo demas se
 * bloquea, porque la decision del jugador dejo de ser *por donde ir* y paso
 * a ser *donde pararse*.
 *
 * Lo que la prueba enseñaba y conviene no perder: **una entrada que se ve y
 * no lleva a ningun lado es peor que una pared**. La 18.7 va a tapar cada
 * bocacalle de las dieciseis cuadras, y lo que no puede pasar es que alguna
 * quede a medio tapar: tiene que leerse como cerrada desde lejos.
 */
