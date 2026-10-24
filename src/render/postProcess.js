import * as pc from 'playcanvas';
import { device } from '../core/device.js';

/**
 * ===========================================================================
 * PIPELINE DE IMAGEN
 * ===========================================================================
 * Hasta ahora el juego dibujaba directo a pantalla en 8 bits por canal, sin
 * ningun tratamiento. Eso es lo que hacia que una escena nocturna se viera
 * sucia y plana: sin rango dinamico alto no hay luces que "quemen", sin
 * mapeo de tonos los oscuros se empastan, y sin bloom una lampara de sodio
 * es apenas un circulo naranja.
 *
 * Aca se arma el pipeline completo con `pc.CameraFrame`, que es el
 * compositor del motor. El orden en que trabaja importa y es este:
 *
 *   escena en HDR -> SSAO -> bloom -> mapeo de tonos -> grading
 *   -> realce de color -> aberracion -> viñeta -> pantalla
 *
 * Todo se renderiza en coma flotante y recien al final se baja a 8 bits.
 * Es la diferencia entre "unos poligonos grises" y una imagen.
 *
 * ---------------------------------------------------------------------------
 * COSTO
 * ---------------------------------------------------------------------------
 * Nada de esto es gratis, y el objetivo sigue siendo 30 FPS en un telefono
 * modesto. Por eso hay dos perfiles, y los dos conservan lo que de verdad
 * define la imagen:
 *
 *   NORMAL  la escena se renderiza al 85% de la resolucion y se reenfoca
 *           al final, sin suavizado temporal y con menos muestras de
 *           oclusion ambiental. Es el perfil por omision.
 *
 *   ALTA    resolucion completa, suavizado temporal, mas muestras de
 *           oclusion y sombras de mas resolucion con una cascada extra.
 *
 * Lo que NO se saca en NORMAL es la oclusion ambiental. Cuesta, pero de dia
 * es la unica herramienta que apoya los objetos en el piso: sin ella, un
 * low-poly claro se ve como recortes de papel pegados unos sobre otros.
 *
 * El perfil se elige desde el menu de pausa y se aplica EN VIVO, o se
 * fuerza con `?calidad=alta` o `?calidad=normal`.
 */

import { ajustes, Calidad } from '../core/settings.js';

export { Calidad };

/** El perfil efectivo: lo que diga la URL, y si no, lo elegido o el defecto. */
export function calidadElegida() {
  return ajustes.get('calidad');
}

/**
 * Aplica un perfil de calidad a un pipeline ya montado.
 *
 * Esta separado de `montarPostProceso` para que se pueda cambiar la
 * calidad EN VIVO, sin recargar: el jugador toca el boton y ve la
 * diferencia en el acto. Si hubiera que recargar, nadie compararia nunca
 * los dos perfiles y el ajuste seria decorativo.
 *
 * @param {pc.CameraFrame} frame
 * @param {string} calidad
 * @param {pc.Entity} [sol] para ajustar tambien la resolucion de sombras
 */
export function aplicarCalidad(frame, calidad, sol) {
  const alta = calidad === Calidad.ALTA;

  // --- Formato del buffer ---------------------------------------------------
  // Coma flotante siempre: el sol y el cielo juntos exceden el rango de 8
  // bits y sin HDR los claros se recortan en bloques planos.
  frame.rendering.renderFormats = [pc.PIXELFORMAT_111110F, pc.PIXELFORMAT_RGBA16F];

  // Renderizar por debajo de la resolucion nativa y reenfocar al final es,
  // lejos, el ajuste que mas FPS devuelve por menos perdida visual.
  frame.rendering.renderTargetScale = alta ? 1.0 : 0.85;
  // Enfoque alto: le devuelve el filo a los bordes, y en un low-poly el
  // filo del borde ES el detalle.
  frame.rendering.sharpness = alta ? 0.5 : 0.75;
  frame.rendering.samples = alta ? 1 : 2;

  /*
   * Mapeo de tonos NEUTRAL.
   *
   * Se eligio sobre ACES porque ACES comprime mucho los claros y desatura:
   * en una escena de dia eso apaga justamente los colores que se quieren
   * ver. NEUTRAL mantiene los medios donde estan y solo dobla los altos.
   */
  frame.rendering.toneMapping = pc.TONEMAP_NEUTRAL;

  // --- Oclusion ambiental ---------------------------------------------------
  /*
   * De dia esta es LA herramienta de definicion. Oscurece el encuentro
   * entre la pared y la vereda, el hueco bajo los autos, el borde del
   * cordon. Sin ella un low-poly claro se ve como recortes de papel
   * pegados unos sobre otros.
   *
   * Encendida tambien en el perfil normal: cuesta, pero es lo que mas
   * aporta por milisegundo gastado.
   */
  frame.ssao.type = pc.SSAOTYPE_LIGHTING;
  frame.ssao.blurEnabled = true;
  frame.ssao.intensity = 0.75;
  frame.ssao.radius = 4;
  frame.ssao.samples = alta ? 12 : 7;
  frame.ssao.power = 5;

  // --- Bloom ----------------------------------------------------------------
  // Casi apagado: de dia no hay nada que brille mas que el cielo, y un
  // bloom alto solo lava la imagen y se come la definicion.
  frame.bloom.intensity = 0.012;
  frame.bloom.blurLevel = alta ? 12 : 8;
  frame.bloom.threshold = 1.1;

  // --- Grading --------------------------------------------------------------
  frame.grading.enabled = true;
  frame.grading.brightness = 1.02;
  frame.grading.contrast = 1.08;
  frame.grading.saturation = 1.1;
  frame.grading.tint = new pc.Color(1, 1, 1);

  // Lo importante es `shadows`: levanta las zonas en sombra sin tocar el
  // resto, que es lo que hace falta para que la vereda sombreada se lea.
  frame.colorEnhance.enabled = true;
  frame.colorEnhance.shadows = 0.22;
  frame.colorEnhance.highlights = -0.12;
  frame.colorEnhance.vibrance = 0.14;
  frame.colorEnhance.midtones = 0.02;

  // --- Viñeta ---------------------------------------------------------------
  // Apenas perceptible. Enmarca sin oscurecer.
  frame.vignette.intensity = 0.3;
  frame.vignette.inner = 0.85;
  frame.vignette.outer = 2.1;
  frame.vignette.curvature = 0.5;
  frame.vignette.color = new pc.Color(0.18, 0.2, 0.24);

  // --- Suavizado temporal ---------------------------------------------------
  // Limpia los bordes escalonados acumulando cuadros. En el perfil normal
  // produce estelas cuando la camara se mueve rapido y no compensa.
  frame.taa.enabled = alta;
  frame.taa.jitter = 0.5;

  // Aberracion cromatica apagada: en una imagen clara y de bordes netos se
  // ve como un defecto, no como estilo.
  frame.fringing.enabled = false;

  // Sombras: mas resolucion y una cascada mas en alta.
  if (sol?.light) {
    sol.light.shadowResolution = alta ? 2048 : 1024;
    sol.light.numCascades = alta ? 3 : 2;
  }

  frame.update();
  return calidad;
}

/**
 * Monta el pipeline sobre una camara.
 *
 * @param {pc.AppBase} app
 * @param {pc.Entity} cameraEntity
 * @param {pc.Entity} [sol]
 * @returns {{frame: pc.CameraFrame, calidad: string}}
 */
export function montarPostProceso(app, cameraEntity, sol) {
  const frame = new pc.CameraFrame(app, cameraEntity.camera);
  const calidad = aplicarCalidad(frame, calidadElegida(), sol);
  return { frame, calidad };
}
