/**
 * Saca una captura del juego corriendo, con el perfil de un celular.
 *
 *   npm run dev          (en otra terminal)
 *   node tools/captura.mjs [nombre]
 *
 * Sirve para mirar un cambio sin levantar el telefono. NO reemplaza probar
 * en uno de verdad: no mide rendimiento ni como se siente el joystick.
 */
import { chromium, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'capturas');
mkdirSync(outDir, { recursive: true });

const nombre = process.argv[2] || 'juego';
const segundos = Number(process.argv[3] || 1.2);

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ ...devices['Pixel 7'] });

page.on('pageerror', (e) => console.error('error de pagina:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('error de consola:', m.text());
});

await page.goto('http://localhost:5173/');
await page.locator('#btn-start').click();
await page.waitForTimeout(400);

// Caminar un poco hacia adelante, para que no quede quieto en el spawn.
await page.keyboard.down('KeyW');
await page.waitForTimeout(segundos * 1000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(250);

const estado = await page.evaluate(() => ({
  pos: `${globalThis.game.player.position.x.toFixed(1)}, ${globalThis.game.player.position.z.toFixed(1)}`,
  camYaw: globalThis.game.camera.yaw.toFixed(1),
  camObjetivo: globalThis.game.camera.targetYaw.toFixed(1),
  camPitch: globalThis.game.camera.pitch.toFixed(1),
  modo: globalThis.game.device.describe(),
  cajas: globalThis.game.builder.stats.boxes,
  drawCalls: globalThis.game.app.stats.drawCalls.total
}));
console.log(estado);

const salida = join(outDir, `${nombre}.png`);
await page.screenshot({ path: salida });
console.log('escrito', salida);

await browser.close();
