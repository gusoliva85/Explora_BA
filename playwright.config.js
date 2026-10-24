import { defineConfig, devices } from '@playwright/test';

/** Argumentos de WebGL por software: el navegador sin interfaz no tiene GPU. */
const glArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    launchOptions: { args: glArgs }
  },
  projects: [
    {
      name: 'escritorio',
      testMatch: /(smoke|recorrido|zombis|combate|pistola)\.spec\.js/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      // Perfil de celular completo: pantalla, densidad, puntero grueso y
      // eventos tactiles. Es lo que hace que `device.js` lo vea como movil.
      name: 'celular',
      testMatch: /(mobile|controles)\.spec\.js/,
      use: { ...devices['Pixel 7'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000
  }
});
