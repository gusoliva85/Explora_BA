/**
 * ===========================================================================
 * VERIFICAR LA VERSION DE PRODUCCION
 * ===========================================================================
 * Compila, sirve el resultado y lo abre con un perfil de celular para
 * comprobar que ARRANCA Y CORRE, no solo que compila.
 *
 * No es lo mismo. Un build puede terminar sin errores y la pagina quedar en
 * negro: un import que solo existia en desarrollo, un recurso que no se
 * copio, una diferencia de minificacion. Esa clase de problema aparece
 * recien al abrirla, y si aparece en Vercel uno se entera cuando ya esta
 * publicada.
 *
 *   npm run verificar
 *
 * Devuelve codigo distinto de cero si hubo cualquier error de consola, asi
 * sirve igual dentro de un script o de un hook antes de publicar.
 */
import { spawn } from 'node:child_process';
import { chromium, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 4173;
const URL = `http://localhost:${PUERTO}/`;

/** Espera a que el servidor conteste de verdad, no un tiempo fijo. */
async function esperarServidor(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return true;
    } catch {
      /* todavia no levanto */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

console.log('[1/3] Compilando...');
await new Promise((resolve, reject) => {
  const b = spawn('npm', ['run', 'build'], { cwd: raiz, shell: true, stdio: 'inherit' });
  b.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`build fallo con codigo ${c}`))));
});

console.log('[2/3] Sirviendo la version compilada...');
const servidor = spawn('npm', ['run', 'preview'], { cwd: raiz, shell: true, stdio: 'ignore' });

let codigo = 0;
try {
  if (!await esperarServidor()) throw new Error('el servidor de vista previa no contesto');

  console.log('[3/3] Abriendo con perfil de celular...');
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const page = await browser.newPage({ ...devices['Pixel 7'] });

  const errores = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });

  await page.goto(URL);
  await page.locator('#btn-start').click();
  await page.waitForTimeout(700);

  // Caminar un poco: ejercita el bucle, las colisiones y la IA.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');

  const estado = await page.evaluate(() => ({
    estado: globalThis.game.state.current,
    zombis: globalThis.game.zombis.stats.total,
    calidad: globalThis.game.calidad,
    modo: globalThis.game.device.describe(),
    drawCalls: globalThis.game.app.stats.drawCalls.total
  }));

  mkdirSync(join(raiz, 'capturas'), { recursive: true });
  await page.screenshot({ path: join(raiz, 'capturas', 'produccion.png') });
  await browser.close();

  console.log('\n  estado      ', estado.estado);
  console.log('  perfil      ', estado.calidad, '/', estado.modo);
  console.log('  zombis      ', estado.zombis, 'puestos');
  console.log('  draw calls  ', estado.drawCalls);

  if (estado.estado !== 'PLAYING') {
    errores.push(`el juego no llego a PLAYING, quedo en ${estado.estado}`);
  }

  if (errores.length) {
    console.error('\n  FALLO. Errores encontrados:');
    for (const e of errores) console.error('   -', e);
    codigo = 1;
  } else {
    console.log('\n  OK: la version de produccion arranca y corre sin errores.');
    console.log('  Captura en capturas/produccion.png');
  }
} catch (e) {
  console.error('\n  FALLO:', e.message);
  codigo = 1;
} finally {
  servidor.kill();
}

process.exit(codigo);
