/**
 * ===========================================================================
 * MEDIR EN QUE SE GASTA LA ESCENA
 * ===========================================================================
 * Abre el juego corriendo y cuenta: entidades, mallas dibujables, llamadas de
 * dibujo y memoria de video, SEPARADAS POR QUIEN LAS PUSO. La pregunta que
 * contesta es siempre la misma: *si hubiera que liberar algo, que conviene
 * liberar*.
 *
 *   npm run dev          (en otra terminal)
 *   node tools/medir-memoria.mjs
 *
 * Existe porque la Fase 13 empieza con "medir el estado actual y anotar los
 * numeros de partida" (13.1), y porque la primera idea de optimizacion de
 * cualquiera —la mia incluida— suele apuntar a lo que se ve, no a lo que
 * pesa. La unica forma de no equivocarse es contar.
 *
 * NO mide rendimiento percibido ni temperatura: para eso hay que jugarlo en
 * un telefono de verdad.
 */

import { chromium, devices } from '@playwright/test';

const URL = process.argv[2] || 'http://localhost:5173/';
const comoJson = process.argv.includes('--json');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ ...devices['Pixel 7'] });

const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text());
});

await page.goto(URL, { waitUntil: 'load' });

// Entrar a la partida: el mundo no existe hasta que se toca "empezar".
await page.waitForSelector('#btn-start', { state: 'visible', timeout: 20000 });
await page.click('#btn-start');
await page.waitForFunction(() => globalThis.game?.builder != null, null, { timeout: 30000 });
// Unos cuantos frames, para que las estadisticas de dibujo sean de un frame
// ya estabilizado y no del primero.
await page.waitForTimeout(2500);

const medicion = await page.evaluate(() => {
  const g = globalThis.game;
  const app = g.app;

  /** Recorre un subarbol y cuenta entidades y mallas dibujables. */
  const contar = (entidad) => {
    let entidades = 0;
    let conRender = 0;
    let mallas = 0;
    const pila = [entidad];
    while (pila.length) {
      const e = pila.pop();
      entidades++;
      const r = e.render;
      if (r) {
        conRender++;
        mallas += r.meshInstances?.length ?? 0;
      }
      for (const h of e.children ?? []) pila.push(h);
    }
    return { entidades, conRender, mallas };
  };

  // Los hijos directos de la raiz: cada uno es "quien puso esto".
  const porRama = {};
  for (const hijo of app.root.children) {
    const c = contar(hijo);
    const nombre = hijo.name || '(sin nombre)';
    if (porRama[nombre]) {
      porRama[nombre].entidades += c.entidades;
      porRama[nombre].conRender += c.conRender;
      porRama[nombre].mallas += c.mallas;
      porRama[nombre].cuantos++;
    } else {
      porRama[nombre] = { ...c, cuantos: 1 };
    }
  }

  const z = g.zombis;
  // El zombi guarda su entidad con distintos nombres segun la version; se
  // prueba por propiedad y, si no aparece, se deduce de la rama "Zombi".
  const z0 = z?.reserva?.[0];
  const raizZombi =
    z0 && [z0.raiz, z0.entidad, z0.entity, z0.root, z0.cuerpo?.parent].find((e) => e?.children);
  const unZombi = raizZombi ? contar(raizZombi) : null;

  return {
    total: contar(app.root),
    porRama,
    zombis: {
      puestos: z?.puestos?.length ?? null,
      reserva: z?.reserva?.length ?? null,
      enJuego: z?.enJuego?.length ?? null,
      stats: z?.stats ?? null,
      unZombi
    },
    stats: {
      // Las llamadas de dibujo viven en stats.drawCalls, no en stats.frame:
      // es el mismo lugar del que las lee el panel de F1.
      drawCalls: app.stats?.drawCalls?.total ?? null,
      drawCallsSombra: app.stats?.drawCalls?.shadow ?? null,
      triangulos: app.stats?.frame?.primitives ?? null,
      materiales: app.stats?.frame?.materials ?? null,
      shaders: app.stats?.frame?.shaders ?? null,
      vramTexturas: app.stats?.vram?.tex ?? null,
      vramVertices: app.stats?.vram?.vb ?? null,
      vramIndices: app.stats?.vram?.ib ?? null
    },
    heap: performance.memory
      ? {
          usado: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        }
      : null,
    mision: {
      vertices: g.mission?.mision?.route?.length ?? g.mission?.config?.route?.length ?? null,
      props: g.mission?.mision?.props?.length ?? g.mission?.config?.props?.length ?? null
    }
  };
});

await browser.close();

if (comoJson) {
  console.log(JSON.stringify({ medicion, errores }, null, 2));
} else {
  const kb = (b) => (b == null ? '—' : (b / 1024).toFixed(0) + ' KB');
  const mb = (b) => (b == null ? '—' : (b / 1048576).toFixed(2) + ' MB');
  const n = (v) => (v == null ? '—' : v.toLocaleString('es-AR'));

  console.log('\n' + '='.repeat(72));
  console.log('EN QUE SE GASTA LA ESCENA');
  console.log('='.repeat(72));

  console.log('\nTOTAL DE LA ESCENA');
  console.log(`  entidades            ${n(medicion.total.entidades)}`);
  console.log(`  con malla            ${n(medicion.total.conRender)}`);
  console.log(`  mallas dibujables    ${n(medicion.total.mallas)}`);

  console.log('\nPOR RAMA — quien puso que');
  const ramas = Object.entries(medicion.porRama).sort((a, b) => b[1].mallas - a[1].mallas);
  console.log('  rama                            ents   c/malla   mallas    %');
  console.log('  ' + '-'.repeat(62));
  for (const [nombre, c] of ramas) {
    if (c.entidades < 2 && c.mallas === 0) continue;
    const pct = medicion.total.mallas ? ((c.mallas / medicion.total.mallas) * 100).toFixed(0) : '0';
    console.log(
      '  ' +
        (nombre + (c.cuantos > 1 ? ` x${c.cuantos}` : '')).padEnd(30) +
        String(c.entidades).padStart(6) +
        String(c.conRender).padStart(10) +
        String(c.mallas).padStart(9) +
        (pct + ' %').padStart(6)
    );
  }

  console.log('\nZOMBIS');
  const z = medicion.zombis;
  console.log(`  puestos en el mapa   ${n(z.puestos)}  (sólo coordenadas, no entidades)`);
  console.log(`  reserva de entidades ${n(z.reserva)}`);
  console.log(`  en juego ahora       ${n(z.enJuego)}`);
  // Si no se pudo introspeccionar un zombi, se deduce de la rama "Zombi",
  // que es exactamente la reserva entera.
  const rama = medicion.porRama['Zombi'];
  if (rama && z.reserva) {
    console.log(`  la reserva entera    ${n(rama.entidades)} entidades, ${n(rama.mallas)} mallas`);
    console.log(`  un zombi             ${n(Math.round(rama.entidades / z.reserva))} entidades, ${n(Math.round(rama.mallas / z.reserva))} mallas`);
    console.log(`  → la reserva NO crece con el mapa: son ${n(z.reserva)} siempre`);
  }

  console.log('\nDIBUJO Y MEMORIA DE VIDEO');
  console.log(`  llamadas de dibujo   ${n(medicion.stats.drawCalls)}   (de sombra: ${n(medicion.stats.drawCallsSombra)})`);
  console.log(`  triángulos           ${n(medicion.stats.triangulos)}`);
  console.log(`  materiales / shaders ${n(medicion.stats.materiales)} / ${n(medicion.stats.shaders)}`);
  console.log(`  texturas en VRAM     ${mb(medicion.stats.vramTexturas)}`);
  console.log(`  vértices en VRAM     ${kb(medicion.stats.vramVertices)}`);
  console.log(`  índices en VRAM      ${kb(medicion.stats.vramIndices)}`);
  if (medicion.heap) console.log(`  heap de JS usado     ${mb(medicion.heap.usado)}`);

  if (errores.length) {
    console.log('\n⚠️  ERRORES EN CONSOLA');
    for (const e of errores.slice(0, 8)) console.log('  ' + e);
  }
  console.log();
}
