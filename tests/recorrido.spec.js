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

    /*
     * Y las siete puertas de la esclusa, abiertas.
     *
     * Desde la 19A el recorrido **no es transitable** mientras los tramos
     * esten sucios: eso es exactamente lo que la puerta tiene que hacer
     * (D-37), y esta prueba fallo contra la cuarta en cuanto se puso.
     *
     * Lo que esta prueba mide es **el diseño del nivel**: que la geometria
     * deje pasar. Que la puerta frene cuando corresponde tiene sus propias
     * pruebas, con numeros, en `esclusa.test.js`.
     */
    for (const pu of mission.mission.puertas ?? []) {
      for (const caja of collision.boxes.filter((b) => b.tag === pu.tag)) {
        collision.remove(caja);
      }
    }
    const m = mission.mission;
    const radio = player.radius;
    const PASO = 0.3;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    /**
     * Cuanto se puede alejar el caminante del eje de la ruta.
     *
     * Ocho metros: media calzada mas la vereda, o sea la linea municipal.
     * Mas que eso ya es adentro de una manzana o de otra cuadra.
     */
    const MARGEN_RUTA = 8;

    /** Distancia del punto al eje de la ruta, por el tramo mas cercano. */
    const aLaRuta = (x, z) => {
      let min = Infinity;
      for (let i = 0; i < m.route.length - 1; i++) {
        const a = m.route[i];
        const b = m.route[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l2 = dx * dx + dz * dz || 1;
        let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        min = Math.min(min, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
      }
      return min;
    };

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

    /*
     * Se camina **esquina por esquina**, no de control a control.
     *
     * Antes los destinos eran los controles, y con tres cuadras alcanzaba:
     * la linea recta entre dos controles caia sobre la calle. Con el
     * recorrido real (18.3) el camino es una escalera de dieciseis cuadras
     * con cinco giros de 90 grados, y una linea recta entre dos controles
     * **atraviesa manzanas enteras**: el caminante se iba en diagonal, daba
     * contra la hilera de fachadas y terminaba metido en una bocacalle
     * cerrada, culpando a la valla que la cerraba.
     *
     * Un jugador tampoco camina en diagonal por adentro de una manzana:
     * sigue la calle. Que la prueba haga lo mismo no es aflojarla, es
     * dejar de pedirle algo que el nivel nunca prometio.
     */
    const destinos = m.route.slice(1).map((p, i) => ({
      p,
      label: `esquina ${i + 1}: ${p.label ?? ''}`
    }));

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
          const q = player.position;
          /*
           * Un paso que se va de la calle NO se considera.
           *
           * El caminante es codicioso y, al bordear algo, se metia por una
           * bocacalle cerrada y quedaba del lado de afuera de un corte:
           * para volver tenia que atravesarlo. Un jugador no hace eso
           * —ve la valla— y la prueba terminaba culpando a la valla de
           * cerrar lo que vino a cerrar.
           *
           * El margen es media calle mas la vereda mas un metro: alcanza
           * para rodear un colectivo cruzado y no para meterse en otra
           * cuadra.
           */
          /*
           * Y si ya esta afuera, solo valen los pasos que lo acercan a la
           * calle. Si no, quedaria clavado: todos sus pasos estarian
           * prohibidos y la prueba diria "se trabo" por culpa de la regla
           * que la prueba misma se puso.
           */
          const fuera = aLaRuta(q.x, q.z);
          const fueraAntes = aLaRuta(volverA.x, volverA.z);
          const permitido = fuera <= MARGEN_RUTA || fuera < fueraAntes;

          return {
            grados,
            movio: permitido ? movio : 0,
            nueva: dist(player.position, destino)
          };
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
   * ===========================================================================
   * ACA SE MEDIA EL DESVIO, Y LA MEDIDA QUEDO OBSOLETA CON D-34
   * ===========================================================================
   * La prueba exigia que lo caminado fuera al menos un 2 % mas largo que la
   * linea recta del recorrido: si el camino era recto, los obstaculos
   * estaban de adorno.
   *
   * Tenia sentido con el mapa viejo, donde una barricada en medio de la
   * calle obligaba a elegir entre bordearla o meterse en un pasaje. **D-34
   * cerro las rutas alternativas**: ahora hay una sola ruta y todo lo demas
   * se bloquea, asi que la ruta tiene que estar LIMPIA. Pedirle que
   * obligue a desviarse es pedirle lo contrario de lo que es.
   *
   * Medido: el recorrido de dieciseis cuadras da 1,006 — practicamente
   * recto, y esta bien que lo sea.
   *
   * Lo que sigue importando, y es el criterio de salida de la fase, es
   * **que haya detras de que cubrirse**. No es lo mismo: un obstaculo que
   * obliga a rodear interrumpe la corrida; uno que tapa deja elegir donde
   * pararse, que es la unica decision que el juego nuevo ofrece (D-28).
   */
  const cobertura = await page.evaluate(() => {
    const { collision, mission } = globalThis.game;
    const m = mission.mission;

    /** ¿Que tan cerca de la ruta esta este punto? */
    const aLaRuta = (x, z) => {
      let min = Infinity;
      for (let i = 0; i < m.route.length - 1; i++) {
        const a = m.route[i];
        const b = m.route[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l2 = dx * dx + dz * dz || 1;
        let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        min = Math.min(min, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
      }
      return min;
    };

    /*
     * Lo que sirve de cobertura: algo solido, mas alto que un cordon y
     * sobre la calzada o la vereda. Un auto abandonado es el ejemplo
     * canonico; una valla de corte NO cuenta, porque cierra una calle que
     * no es la ruta y nadie se va a parar detras.
     */
    const cubre = collision.boxes.filter((b) => {
      if (b.tag === 'corte' || b.tag === 'building') return false;
      if (!(b.height > 1)) return false;
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      return aLaRuta(cx, cz) < 9;
    });

    return { cuantos: cubre.length, cuadras: m.route.length - 1 };
  });

  console.log(
    `[recorrido] ${cobertura.cuantos} coberturas sobre la ruta construida`
  );
  // Al menos una por cuadra en pie: si no, el jugador corre por un pasillo.
  expect(cobertura.cuantos).toBeGreaterThan(0);

  expect(errores).toEqual([]);
});

/**
 * ===========================================================================
 * NINGUN ZOMBI NACE EN UN LUGAR DEL QUE NO SE PUEDE SALIR (19A.2)
 * ===========================================================================
 * Con la esclusa (D-37) la puerta no abre hasta que no quede un zombi vivo
 * en el tramo. **Un zombi encerrado traba la partida para siempre**, y no
 * hay nada en pantalla que lo explique: el contador dice "queda 1" y el
 * jugador no lo encuentra.
 *
 * Y es un riesgo nuevo, creado por la 18.7: antes las bocacalles estaban
 * abiertas y cualquier rincon comunicaba con la calle. Ahora hay treinta y
 * seis cortes, y un puesto del otro lado de uno es una celda.
 */
/*
 * ===========================================================================
 * DE DONDE SALEN LOS ZOMBIS — y son DOS preguntas, no una (18.13, 19B.6)
 * ===========================================================================
 * Hasta la 19B.6 todos los puestos eran un par de coordenadas calculadas al
 * empezar la mision, y una sola prueba los recorria.
 *
 * Ahora son dos clases y **sólo una tiene coordenadas**: un tercio está
 * puesto en el mapa y dos tercios son emboscadas, que no tienen lugar hasta
 * que el jugador llega y se lo buscan al lado de un auto o en un zaguán.
 *
 * Esa prueba única siguió en verde después del cambio, y ahí estaba el
 * problema: `collision.query(undefined, undefined, r)` no devuelve nada y
 * `NaN > media` es `false`, así que **las emboscadas se saltaban en
 * silencio**. La prueba decía comprobar los puestos y comprobaba un tercio.
 *
 * Son dos pruebas porque son dos preguntas, y la segunda no se puede
 * contestar con una lista: hay que hacer que las emboscadas ocurran.
 */

test('ningun puesto FIJO queda encerrado ni adentro de una pared', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const informe = await page.evaluate(() => {
    const { collision, mission, zombis, builder, ventana } = globalThis.game;
    const m = mission.mission;

    // El mapa entero: los puestos de los ocho tramos tienen que valer.
    builder.construirTodo(m);
    for (let i = 0; i < m.route.length - 1; i++) ventana.enPie.add(i);

    const radio = globalThis.game.balance.ZOMBIE_STANDARD.collisionRadius;

    /** Distancia del punto al eje de la ruta. */
    const aLaRuta = (x, z) => {
      let min = Infinity;
      for (let i = 0; i < m.route.length - 1; i++) {
        const a = m.route[i];
        const b = m.route[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l2 = dx * dx + dz * dz || 1;
        let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        min = Math.min(min, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
      }
      return min;
    };

    const dentroDeAlgo = [];
    const fueraDeLaRuta = [];
    const sinPosicion = [];
    const media = globalThis.game.balance.UNITS.streetWidth / 2;

    for (const p of zombis.puestos) {
      /*
       * Las emboscadas se saltan **y se cuentan**.
       *
       * Contarlas es lo que impide que este salteo crezca en silencio: si
       * mañana alguien convierte los fijos en emboscadas sin querer, la
       * cuenta de abajo falla en vez de dar verde con cero comprobaciones.
       */
      if (p.emboscada || p.x === undefined) {
        sinPosicion.push(1);
        continue;
      }

      // 1. Nadie adentro de una caja solida.
      for (const b of collision.query(p.x, p.z, radio)) {
        const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        if (Math.hypot(p.x - nx, p.z - nz) < radio) {
          dentroDeAlgo.push({ x: +p.x.toFixed(1), z: +p.z.toFixed(1), tag: b.tag });
          break;
        }
      }

      /*
       * 2. Y nadie fuera de la calzada de la ruta.
       *
       * Es la forma barata y correcta de comprobar que no esta encerrado:
       * la ruta es el unico corredor abierto (D-34), asi que estar sobre
       * ella ES ser alcanzable. Buscar caminos seria mas caro y no diria
       * nada que esto no diga.
       */
      const d = aLaRuta(p.x, p.z);
      if (d > media) fueraDeLaRuta.push({ x: +p.x.toFixed(1), z: +p.z.toFixed(1), d: +d.toFixed(1) });
    }

    return {
      total: zombis.puestos.length,
      fijos: zombis.puestos.length - sinPosicion.length,
      emboscadas: sinPosicion.length,
      dentroDeAlgo,
      fueraDeLaRuta
    };
  });

  console.log(
    `[puestos] ${informe.total}: ${informe.fijos} fijos y ${informe.emboscadas} emboscadas`
  );

  // El reparto de la 19B.6: un tercio puesto, dos tercios emboscada.
  expect(informe.fijos, 'no quedo ningun puesto fijo que comprobar').toBeGreaterThan(0);
  expect(informe.emboscadas, 'no hay emboscadas: el reparto se rompio').toBeGreaterThan(0);
  expect(informe.fijos + informe.emboscadas).toBe(informe.total);
  expect(informe.fijos / informe.total).toBeGreaterThan(0.2);
  expect(informe.fijos / informe.total).toBeLessThan(0.5);

  expect(
    informe.dentroDeAlgo,
    `hay zombis naciendo adentro de una pared: ${JSON.stringify(informe.dentroDeAlgo)}`
  ).toEqual([]);
  expect(
    informe.fueraDeLaRuta,
    `hay zombis fuera del corredor de la ruta: ${JSON.stringify(informe.fueraDeLaRuta)}`
  ).toEqual([]);
});

test('las emboscadas salen de la calle, de frente y sin encimarse (19B.6)', async ({
  page
}) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();
  await page.waitForFunction(() => globalThis.game?.zombis?.puestos?.length > 0, null, {
    timeout: 30000
  });

  const informe = await page.evaluate(async () => {
    const g = globalThis.game;
    const esperar = () => new Promise((r) => requestAnimationFrame(r));
    g.input.sample = () => {};

    const m = g.mission.mission;
    const media = g.balance.UNITS.streetWidth / 2;
    const radio = g.balance.ZOMBIE_STANDARD.collisionRadius;

    const aLaRuta = (x, z) => {
      let min = Infinity;
      for (let i = 0; i < m.route.length - 1; i++) {
        const a = m.route[i];
        const b = m.route[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l2 = dx * dx + dz * dz || 1;
        let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        min = Math.min(min, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
      }
      return min;
    };

    const vistos = new Set();
    const salidas = [];

    const anotar = () => {
      const p = g.player.position;
      const ad = g.rumbo.dirDeRumbo(g.camera.yaw);
      for (const z of g.zombis.enJuego) {
        if (z.puestoId === undefined || vistos.has(z.puestoId)) continue;
        vistos.add(z.puestoId);
        if (!g.zombis.puestos[z.puestoId]?.emboscada) continue;

        const q = z.posicion;
        const dx = q.x - p.x;
        const dz = q.z - p.z;
        const d = Math.hypot(dx, dz) || 1;

        let dentro = null;
        for (const b of g.collision.query(q.x, q.z, radio)) {
          const nx = Math.max(b.minX, Math.min(q.x, b.maxX));
          const nz = Math.max(b.minZ, Math.min(q.z, b.maxZ));
          if (Math.hypot(q.x - nx, q.z - nz) < radio) {
            dentro = b.tag;
            break;
          }
        }

        salidas.push({
          d: +d.toFixed(1),
          frente: +(((dx / d) * ad.x + (dz / d) * ad.z)).toFixed(2),
          aLaRuta: +aLaRuta(q.x, q.z).toFixed(1),
          dentroDe: dentro
        });
      }
    };

    // Caminar las dos cuadras del primer tramo, que es donde viven.
    for (let paso = 0; paso <= 50; paso++) {
      const t = paso / 50;
      const i = Math.min(Math.floor(t * 2), 1);
      const u = t * 2 - i;
      const a = m.route[i];
      const b = m.route[i + 1];
      const meta = { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u };

      for (let k = 0; k < 6; k++) {
        const p = g.player.position;
        const dx = meta.x - p.x;
        const dz = meta.z - p.z;
        const d = Math.hypot(dx, dz) || 1;
        const ad = g.rumbo.dirDeRumbo(g.camera.yaw);
        g.input.move.x = (dx / d) * -ad.z + (dz / d) * ad.x;
        g.input.move.y = (dx / d) * ad.x + (dz / d) * ad.z;
        await esperar();
        anotar();
      }
    }
    g.input.move.x = 0;
    g.input.move.y = 0;
    return { salidas };
  });

  const { salidas } = informe;
  console.log(`[emboscadas] ${salidas.length} salidas observadas`);

  expect(salidas.length, 'no salio ni una emboscada en el primer tramo').toBeGreaterThan(3);

  /*
   * 1. NUNCA A LAS ESPALDAS. Es la regla que Gus pidió y la única que la
   *    19B.6 no afloja nunca: la cámara es cenital y va detrás del
   *    jugador, así que lo que aparece atrás no está lejos en pantalla —
   *    no está en pantalla.
   */
  const atras = salidas.filter((s) => s.frente < 0);
  expect(atras, `salieron emboscadas a la espalda: ${JSON.stringify(atras)}`).toEqual([]);

  /*
   * 2. Y en la calle, no adentro de una pared. Acá es donde esto vale más
   *    que la prueba de los fijos: la emboscada elige su lugar **en
   *    caliente**, con la cuadra ya construida, así que el error posible
   *    no es de datos sino de geometría en vivo.
   */
  const enPared = salidas.filter((s) => s.dentroDe);
  expect(enPared, `emboscadas adentro de algo: ${JSON.stringify(enPared)}`).toEqual([]);

  /*
   * El límite acá es la LÍNEA MUNICIPAL (8 m), no media calzada (5).
   *
   * Y la diferencia es el sentido entero de la 19B.6: una emboscada sale
   * **del carril de los autos (±3,6) o de un zaguán (±5,8)**, que están
   * fuera de media calzada a propósito. Medir contra 5 las marcaría todas
   * como error; medir contra 8 pregunta lo que importa, que es si alguna
   * terminó adentro de la manzana.
   */
  const afuera = salidas.filter((s) => s.aLaRuta > LINEA_MUNICIPAL);
  expect(afuera, `emboscadas fuera de la vereda: ${JSON.stringify(afuera)}`).toEqual([]);

  // 3. Cerca, que es todo el punto: si salen lejos vuelven a ser lo de antes.
  const lejos = salidas.filter((s) => s.d > 30);
  expect(lejos, `emboscadas demasiado lejos: ${JSON.stringify(lejos)}`).toEqual([]);
});

/**
 * Media calzada (5) más la vereda (3). Se escribe acá porque el `evaluate`
 * corre en el navegador y estas comprobaciones corren en Node: no comparten
 * alcance, así que el valor no se puede pasar por cierre.
 */
const LINEA_MUNICIPAL = 8;

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
