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
    chunkSizeWarningLimit: 2000,
    /*
     * Dos paginas: el juego y la escena de prueba de estilo (Fase 12.A).
     *
     * `estilo.html` se compila junto con el juego a proposito. Una guia de
     * estilo que solo funciona en desarrollo deja de abrirse en cuanto
     * alguien quiere mirarla desde el telefono, que es justo donde hay que
     * mirarla. Pesa poco: comparte todo el codigo con el juego.
     */
    rollupOptions: {
      input: {
        main: 'index.html',
        estilo: 'estilo.html'
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});
