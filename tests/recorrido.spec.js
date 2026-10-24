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
    const { player, mission, collision } = globalThis.game;
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

    // Abanico de desvios, en grados. Alternando lados para no sesgar.
    const DESVIOS = [0, 30, -30, 60, -60, 90, -90, 125, -125];

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

        let avance = 0;
        for (const grados of orden) {
          const a = base + (grados * Math.PI) / 180;
          avance = mover(Math.sin(a), Math.cos(a));
          if (avance > PASO * 0.4) {
            ultimoDesvio = grados;
            break;
          }
        }

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
  expect(desvio).toBeGreaterThan(1.02);
  expect(desvio).toBeLessThan(2.5);

  expect(errores).toEqual([]);
});

/**
 * Los pasajes tienen que ser transitables de punta a punta.
 *
 * Un pasaje tapiado es peor que no tenerlo: el jugador ve la boca, se mete,
 * pierde tiempo y sale por donde entro. Y como las bocas dependen de que el
 * generador deje un hueco en la hilera de fachadas, es justo el tipo de
 * cosa que se rompe sola cuando se toca la semilla o el ancho de la calle.
 */
test('cada pasaje se puede recorrer de punta a punta', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-start').click();
  await expect(page.locator('#screen-hud')).toBeVisible();

  const informe = await page.evaluate(async () => {
    const { player, mission, collision } = globalThis.game;
    const m = mission.mission;
    const radio = player.radius;
    const PASO = 0.3;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    const mover = (dx, dz) => {
      const p = player.position;
      const d = Math.hypot(dx, dz) || 1;
      const r = collision.moveCircle({ x: p.x, z: p.z }, (dx / d) * PASO, (dz / d) * PASO, radio);
      player.entity.setPosition(r.x, 0, r.z);
      return Math.hypot(r.x - p.x, r.z - p.z);
    };

    // Dentro de un pasaje de cinco metros no hay lugar para rodear nada,
    // asi que el abanico es mas cerrado que el del recorrido principal.
    const DESVIOS = [0, 25, -25, 50, -50, 80, -80];

    const resultados = [];

    for (const d of m.desvios ?? []) {
      // Se entra desde la calle, no desde adentro: asi tambien se verifica
      // que la boca este abierta.
      const boca = d.puntos[0];
      const haciaAdentro = d.puntos[1];
      const dx = boca.x - haciaAdentro.x;
      const dz = boca.z - haciaAdentro.z;
      const len = Math.hypot(dx, dz) || 1;
      player.teleport(boca.x + (dx / len) * 4, boca.z + (dz / len) * 4, 0);

      let ok = true;
      let traba = null;
      let recorrido = 0;

      for (const destino of d.puntos) {
        let ultimo = 0;
        let mejor = dist(player.position, destino);
        let sinMejorar = 0;

        for (let i = 0; i < 2500; i++) {
          const p = player.position;
          const actual = dist(p, destino);
          if (actual < 2) break;

          const base = Math.atan2(destino.x - p.x, destino.z - p.z);
          const orden = [ultimo, ...DESVIOS.filter((g) => g !== ultimo)];

          let avance = 0;
          for (const grados of orden) {
            const a = base + (grados * Math.PI) / 180;
            avance = mover(Math.sin(a), Math.cos(a));
            if (avance > PASO * 0.4) {
              ultimo = grados;
              break;
            }
          }

          if (avance <= PASO * 0.4 || ++sinMejorar > 700) {
            if (actual < mejor - 0.3) {
              mejor = actual;
              sinMejorar = 0;
              continue;
            }
            ok = false;
            traba = { x: +p.x.toFixed(1), z: +p.z.toFixed(1), hacia: destino };
            break;
          }
          if (actual < mejor - 0.3) {
            mejor = actual;
            sinMejorar = 0;
          }
          recorrido += avance;
        }
        if (!ok) break;
      }

      const fin = player.position;
      const salida = d.puntos[d.puntos.length - 1];
      resultados.push({
        nombre: d.nombre,
        atraveso: ok && dist(fin, salida) < 4,
        metros: Math.round(recorrido),
        traba
      });
    }

    return resultados;
  });

  console.log('[pasajes]', JSON.stringify(informe, null, 2));

  expect(informe.length).toBeGreaterThan(0);
  for (const r of informe) {
    expect(r.atraveso, `${r.nombre} no se pudo atravesar: ${JSON.stringify(r.traba)}`).toBe(true);
    // Un pasaje que mide menos que la calle que evita no es un desvio.
    expect(r.metros, `${r.nombre} es sospechosamente corto`).toBeGreaterThan(25);
  }
});
