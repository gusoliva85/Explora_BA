/**
 * ===========================================================================
 * ¿POR DÓNDE SE ESCAPA DEL RECORRIDO?
 * ===========================================================================
 *   npm run dev          (en otra terminal)
 *   node tools/medir-fugas.mjs
 *
 * Desde cuarenta y ocho puntos de cada cuadra intenta caminar hacia los dos
 * costados **con el mismo `moveCircle` que mueve al jugador**, y anota hasta
 * dónde llega. Todo lo que pase de la línea municipal es una fuga.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE (19C.7)
 * ---------------------------------------------------------------------------
 * Gus lo dijo jugando: *"cuando vas caminando también tenés espacios libres
 * en los costados que parece como que podés pasar"*. Una captura no podía
 * contestarlo —un agujero de diez metros a cien metros de distancia, en
 * una cámara cenital, no se ve— y mirar el código tampoco, porque el que
 * dejaba el agujero (`#buildFacadeRow`) estaba bien: lo que faltaba era
 * otro que no existía.
 *
 * La primera corrida dio **76 fugas de hasta 40 metros**. Con los edificios
 * de esquina quedaron 3, y las tres son el cuadrante de la casa de Sergio,
 * que no se construye a propósito.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO MIDE, Y ES DELIBERADO
 * ---------------------------------------------------------------------------
 * Los diez metros de cada punta de cuadra. Ahí está el cruce, y a cuatro
 * metros de una esquina "perpendicular a esta cuadra" es **la otra calle
 * del recorrido**, que está abierta porque tiene que estarlo. Contarlas
 * daba 33 fugas falsas: una prueba de geometría tiene que saber dónde
 * termina la geometría que mide.
 */
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ ...devices['Pixel 7'] });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.locator('#btn-start').click();
await page.waitForFunction(() => globalThis.game?.builder?.cuadrasEnPie?.length > 0, null, {
  timeout: 30000
});

const r = await page.evaluate(() => {
  const g = globalThis.game;
  // Todo el mapa en pie: lo que se mide es la geometría, no la ventana.
  g.builder.construirTodo?.(g.mission.mission);
  const m = g.mission.mission;
  const col = g.collision;
  const radio = g.player.radius ?? 0.45;

  const PASO = 0.25;
  const fugas = [];

  const caminar = (desde, dx, dz, pasos) => {
    let p = { ...desde };
    for (let i = 0; i < pasos; i++) {
      const r = col.moveCircle(p, dx * PASO, dz * PASO, radio);
      if (Math.hypot(r.x - p.x, r.z - p.z) < PASO * 0.2) break;
      p = { x: r.x, z: r.z };
    }
    return p;
  };

  for (let i = 0; i < m.route.length - 1; i++) {
    const a = m.route[i];
    const b = m.route[i + 1];
    const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const ux = (b.x - a.x) / L;
    const uz = (b.z - a.z) / L;
    // Perpendicular al eje de la cuadra.
    const px = -uz;
    const pz = ux;

    for (let t = 0.02; t <= 0.98; t += 0.02) {
      /*
       * Los diez metros de cada punta NO se miden, y no es aflojar la
       * prueba: ahi esta el cruce. A cuatro metros de una esquina,
       * "perpendicular a esta cuadra" es **la otra calle del recorrido**,
       * que esta abierta a proposito. Contarla daba 33 fugas falsas.
       */
      if (t * L < 10 || (1 - t) * L < 10) continue;
      const sobre = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      for (const lado of [1, -1]) {
        const fin = caminar(sobre, px * lado, pz * lado, 160);
        // Cuánto se alejó del eje de la calle.
        const dx = fin.x - sobre.x;
        const dz = fin.z - sobre.z;
        const lateral = Math.abs(dx * px + dz * pz);
        if (lateral > 9) {
          fugas.push({
            cuadra: i,
            t: +t.toFixed(2),
            lado,
            lateral: +lateral.toFixed(1),
            desde: { x: +sobre.x.toFixed(1), z: +sobre.z.toFixed(1) },
            hasta: { x: +fin.x.toFixed(1), z: +fin.z.toFixed(1) }
          });
        }
      }
    }
  }

  // Resumen por cuadra, que es lo que se puede leer.
  const porCuadra = {};
  for (const f of fugas) {
    const k = `cuadra ${f.cuadra}`;
    porCuadra[k] = porCuadra[k] ?? { cuantas: 0, peor: 0, ejemplo: null };
    porCuadra[k].cuantas++;
    if (f.lateral > porCuadra[k].peor) {
      porCuadra[k].peor = f.lateral;
      porCuadra[k].ejemplo = f;
    }
  }
  return { totalFugas: fugas.length, porCuadra };
});

console.log(JSON.stringify(r, null, 2).slice(0, 7000));
await browser.close();
