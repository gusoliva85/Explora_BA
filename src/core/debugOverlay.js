/**
 * Overlay de diagnostico (tecla F1, o tres dedos en pantalla).
 *
 * Es la herramienta principal para probar en el telefono: sin un numero de
 * FPS y de draw calls en pantalla, "va lento" es una opinion. Con el
 * overlay se puede medir antes y despues de cada cambio.
 */
export class DebugOverlay {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('debug-overlay');
    this.visible = false;

    this.frames = 0;
    this.accum = 0;
    this.fps = 0;
    this.worstFrameMs = 0;
    /** @type {Record<string, string|number>} */
    this.extra = {};

    addEventListener('keydown', (e) => {
      if (e.code === 'F1') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Tres dedos a la vez: el equivalente tactil de F1.
    addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) this.toggle();
    });
  }

  toggle(v = !this.visible) {
    this.visible = v;
    this.el.classList.toggle('hidden', !v);
  }

  set(key, value) {
    this.extra[key] = value;
  }

  update(dt) {
    this.frames++;
    this.accum += dt;
    this.worstFrameMs = Math.max(this.worstFrameMs, dt * 1000);

    if (this.accum < 0.25) return;
    this.fps = this.frames / this.accum;
    const worst = this.worstFrameMs;
    this.frames = 0;
    this.accum = 0;
    this.worstFrameMs = 0;

    if (!this.visible) return;

    const s = this.app.stats;
    const gd = this.app.graphicsDevice;
    const lines = [
      `FPS        ${this.fps.toFixed(0).padStart(5)}   peor frame ${worst.toFixed(1)} ms`,
      `Draw calls ${String(s.drawCalls?.total ?? 0).padStart(5)}   sombra ${s.drawCalls?.shadow ?? 0}`,
      `Primitivas ${String(s.frame?.primitives ?? 0).padStart(5)}`,
      `CPU        update ${(s.frame?.updateTime ?? 0).toFixed(1)} ms / render ${(s.frame?.renderTime ?? 0).toFixed(1)} ms`,
      `Materiales ${String(s.frame?.materials ?? 0).padStart(5)}   shaders ${s.frame?.shaders ?? 0}`,
      `Resolucion ${gd.width}x${gd.height}  dpr ${gd.maxPixelRatio?.toFixed?.(2) ?? '-'}`,
      `API        ${gd.deviceType ?? 'webgl'}`
    ];
    for (const [k, v] of Object.entries(this.extra)) {
      lines.push(`${k.padEnd(10)} ${v}`);
    }
    this.el.textContent = lines.join('\n');
  }
}
