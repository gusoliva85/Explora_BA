/**
 * Genera un PNG de cada mockup, para poder mirarlos sin abrir el navegador
 * y para pegarlos en una presentacion.
 *
 *   node tools/render-mockups.mjs
 *
 * Los PNG van a `documentacion/mockup/png/`.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const mockupDir = join(here, '..', 'documentacion', 'mockup');
const outDir = join(mockupDir, 'png');
mkdirSync(outDir, { recursive: true });

const files = readdirSync(mockupDir)
  .filter((f) => /^\d\d_.*\.html$/.test(f))
  .sort();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 760, height: 1300 }, deviceScaleFactor: 2 });

let problems = 0;
page.on('pageerror', (e) => {
  problems++;
  console.error('  error de pagina:', e.message);
});
page.on('console', (m) => {
  if (m.type() === 'error') {
    problems++;
    console.error('  error de consola:', m.text());
  }
});

for (const file of files) {
  await page.goto('file:///' + join(mockupDir, file).replace(/\\/g, '/'));
  // El canvas se dibuja de una sola pasada al cargar; un respiro alcanza.
  await page.waitForTimeout(500);
  const out = join(outDir, file.replace('.html', '.png'));
  await page.locator('.phone').first().screenshot({ path: out });
  console.log('escrito', out);
}

await browser.close();
process.exit(problems > 0 ? 1 : 0);
