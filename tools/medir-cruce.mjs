/**
 * ===========================================================================
 * ¿QUÉ PASA AL CRUZAR UN CONTROL?
 * ===========================================================================
 *   npm run dev          (en otra terminal)
 *   node tools/medir-cruce.mjs
 *
 * Camina los últimos treinta metros antes de cada una de las siete esclusas
 * y treinta más del otro lado, **con el joystick**, y anota tres cosas:
 *
 *   - el cuadro más caro, comparado con la base de ese mismo tramo;
 *   - el salto más grande: cuánto se movió el jugador en un cuadro;
 *   - si se quedó clavado con el joystick a fondo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE (19B.4)
 * ---------------------------------------------------------------------------
 * Gus: *"cuando las pasás, que terminás de hacer el checkpoint, se traba
 * todo el juego. El personaje como que tiene un salto a algo al costado."*
 *
 * Son dos síntomas distintos y hacía falta separarlos: un tirón de cuadro
 * y un desplazamiento que el jugador no pidió no se arreglan en el mismo
 * lugar. Por eso esto mide los dos por separado.
 *
 * ---------------------------------------------------------------------------
 * LOS MILISEGUNDOS SE LEEN EN RELACIÓN, NUNCA EN ABSOLUTO
 * ---------------------------------------------------------------------------
 * El navegador de las pruebas renderiza por software y un cuadro normal le
 * cuesta cientos de milisegundos. Lo que vale es **cuántas veces la base**
 * cuesta el peor cuadro: construir una cuadra son 60 ms de JavaScript, y
 * todo lo demás que se ve acá es subida de buffers, que en un teléfono de
 * verdad es otra cosa.
 */
import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ ...devices['Pixel 7'] });
const errores = [];
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errores.push('console: ' + m.text()));

await page.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'load' });
await page.locator('#btn-start').click();
await page.waitForFunction(() => globalThis.game?.mission, null, { timeout: 30000 });

const informe = await page.evaluate(async () => {
  const g = globalThis.game;
  const esperar = () => new Promise((r) => requestAnimationFrame(r));
  // El joystick se escribe a mano: `sample()` lo reescribe cada cuadro.
  g.input.sample = () => {};

  const ruta = g.mission.mission.route;
  const cps = g.mission.mission.checkpoints;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  /** La puerta no se mide acá: que frene tiene sus propias pruebas. */
  const abrirTodo = () => {
    for (const pu of g.mission.mission.puertas ?? []) {
      for (const caja of g.collision.boxes.filter((b) => b.tag === pu.tag)) {
        g.collision.remove(caja);
      }
    }
  };

  const filas = [];

  for (let c = 0; c < cps.length; c++) {
    const plano = cps[c].plano;
    const dir = { x: plano.dirX, z: plano.dirZ };
    g.player.teleport(plano.x - dir.x * 30, plano.z - dir.z * 30);
    await esperar();
    abrirTodo();

    /*
     * EL CAMINO SIGUE LA CALLE, EN DOS TRAMOS.
     *
     * Primero hasta la esquina por la calle de entrada, y recién ahí se
     * doble hacia el vértice siguiente. Dos versiones anteriores de esto
     * se equivocaron, y las dos de la misma manera —creyendo que un punto
     * de destino alcanza para describir un camino—:
     *
     *  1. Treinta metros DERECHO pasando el control. En cuatro de los
     *     siete la ruta dobla ahí, así que el destino caía detrás de la
     *     valla que cierra la calle de enfrente. El informe decía
     *     "clavado 467 cuadros" y era la sonda caminando contra una pared
     *     bien puesta.
     *  2. Derecho hacia el vértice siguiente. Eso es **la diagonal de la
     *     manzana**: la sonda se metía adentro de un edificio.
     *
     * La lección vale más allá de esta herramienta: **una sonda que no
     * conoce el trazado no distingue un error de un acierto.**
     */
    const esquina = ruta[cps[c].atRouteIndex];
    const siguiente = ruta[Math.min(cps[c].atRouteIndex + 1, ruta.length - 1)];
    const sx = siguiente.x - esquina.x;
    const sz = siguiente.z - esquina.z;
    const sl = Math.hypot(sx, sz) || 1;
    const camino = [
      { x: esquina.x, z: esquina.z },
      { x: esquina.x + (sx / sl) * 20, z: esquina.z + (sz / sl) * 20 }
    ];
    let etapa = 0;

    let anterior = { ...g.player.position };
    const ms = [];
    let peorSalto = 0;
    let saltoEn = null;
    let clavado = 0;
    let peorClavado = 0;
    let clavadoEn = null;
    let msAlCruzar = 0;
    const antes = g.mission.nextCheckpoint;

    for (let f = 0; f < 600; f++) {
      abrirTodo();
      /*
       * Gus no muere acá, y es necesario decirlo.
       *
       * La primera versión no lo hacía y la medición salió inútil: cruzaba
       * el primer control, lo mataban, y los seis siguientes daban "no se
       * movió" con cero saltos. **Seis filas verdes de un muerto.** Lo que
       * se mide acá es el cruce, no si se sobrevive a dieciséis zombis;
       * eso es trabajo del teléfono.
       *
       * Los zombis se dejan vivos a propósito: tienen que seguir costando
       * lo que cuestan, porque el tirón que esto busca es el de un cuadro
       * con la cuadra construyéndose Y la horda encima.
       */
      g.player.invulnerableFor = 1e9;
      const p = g.player.position;
      if (etapa < camino.length - 1 && dist(p, camino[etapa]) < 3) etapa++;
      const destino = camino[etapa];
      const dx = destino.x - p.x;
      const dz = destino.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const ad = g.rumbo.dirDeRumbo(g.camera.yaw);
      g.input.move.x = (dx / d) * -ad.z + (dz / d) * ad.x;
      g.input.move.y = (dx / d) * ad.x + (dz / d) * ad.z;

      const cpAntes = g.mission.nextCheckpoint;
      const t0 = performance.now();
      await esperar();
      const costo = performance.now() - t0;
      ms.push(costo);
      if (g.mission.nextCheckpoint !== cpAntes) msAlCruzar = costo;

      const q = g.player.position;
      const avance = dist(q, anterior);
      if (avance > peorSalto) {
        peorSalto = avance;
        saltoEn = { x: +q.x.toFixed(1), z: +q.z.toFixed(1) };
      }
      if (avance < 0.02) {
        clavado++;
        if (clavado > peorClavado) {
          peorClavado = clavado;
          clavadoEn = {
            x: +q.x.toFixed(1),
            z: +q.z.toFixed(1),
            // A que distancia del plano del control, y de que lado.
            delPlano: +((q.x - plano.x) * dir.x + (q.z - plano.z) * dir.z).toFixed(1),
            // `query` devuelve un Set, no un array.
            cajasCerca: [...new Set([...g.collision.query(q.x, q.z, 2.5)].map((b) => b.tag))].join('|')
          };
        }
      } else {
        clavado = 0;
      }
      anterior = { ...q };
      if (etapa === camino.length - 1 && d < 2) break;
    }
    g.input.move.x = 0;
    g.input.move.y = 0;

    const orden = [...ms].sort((a, b) => a - b);
    const mediana = orden[Math.floor(orden.length / 2)] || 1;
    const peor = orden[orden.length - 1] || 0;

    filas.push({
      control: c + 1,
      cruzo: g.mission.nextCheckpoint > antes,
      // Si la ruta dobla en esa esquina. Sale del trazado, que es quien sabe.
      esQuina: Math.abs(ruta[cps[c].atRouteIndex].giro ?? 0) > 1,
      peorCuadroXbase: +(peor / mediana).toFixed(1),
      alCruzarXbase: +(msAlCruzar / mediana).toFixed(1),
      peorSalto: +peorSalto.toFixed(2),
      saltoEn,
      cuadrosClavado: peorClavado,
      clavadoEn
    });
  }

  return filas;
});

console.log(JSON.stringify(informe, null, 1));
if (errores.length) console.log('ERRORES:', errores.slice(0, 5));
await browser.close();
