import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // `npm run dev:lan` agrega --host para poder abrir el juego desde el celular
    // usando la IP de la PC en la misma red WiFi.
    strictPort: false
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 2000
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});
