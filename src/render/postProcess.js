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
 * modesto. Por eso hay dos perfiles:
 *
 *   ALTO (escritorio): todo encendido, incluido SSAO y suavizado temporal.
 *   MOVIL:             bloom, mapeo de tonos, grading y viñeta. SSAO y TAA
 *                      apagados, que son los dos que mas cuestan, y la
 *                      escena se renderiza a una fraccion de la resolucion
 *                      con reenfoque al final.
 *
 * El perfil se puede forzar con `?calidad=alta` o `?calidad=movil` para
 * poder comparar los dos en el mismo equipo.
 */

export const Calidad = {
  ALTA: 'alta',
  MOVIL: 'movil'
};

/** Elige el perfil: lo que diga la URL, y si no, el tipo de dispositivo. */
export function calidadElegida() {
  const pedida = new URLSearchParams(location.search).get('calidad');
  if (pedida === Calidad.ALTA || pedida === Calidad.MOVIL) return pedida;
  return device.isTouch ? Calidad.MOVIL : Calidad.ALTA;
}

/**
 * Monta el pipeline sobre una camara.
 *
 * @param {pc.AppBase} app
 * @param {pc.Entity} cameraEntity
 * @param {string} [calidad]
 * @returns {{frame: pc.CameraFrame, calidad: string}}
 */
export function montarPostProceso(app, cameraEntity, calidad = calidadElegida()) {
  const alta = calidad === Calidad.ALTA;
  const frame = new pc.CameraFrame(app, cameraEntity.camera);

  // --- Formato del buffer ---------------------------------------------------
  // Coma flotante igual que de noche: no por el bloom, sino porque el sol
  // y el cielo juntos exceden el rango de 8 bits y sin HDR los claros se
  // recortan en bloques planos.
  frame.rendering.renderFormats = [pc.PIXELFORMAT_111110F, pc.PIXELFORMAT_RGBA16F];

  // Renderizar por debajo de la resolucion nativa y reenfocar al final es,
  // lejos, el ajuste que mas FPS devuelve en movil por menos perdida visual.
  frame.rendering.renderTargetScale = alta ? 1.0 : 0.85;
  // Enfoque alto: es lo que le devuelve el filo a los bordes despues de
  // renderizar por debajo de la resolucion nativa, y en un low-poly el
  // filo del borde ES el detalle.
  frame.rendering.sharpness = alta ? 0.5 : 0.75;

  // Suavizado por multimuestreo. Con TAA encendido no hace falta y seria
  // pagar dos veces por lo mismo.
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
   * Encendida tambien en movil: cuesta, pero es lo que mas aporta por
   * milisegundo gastado.
   */
  frame.ssao.type = pc.SSAOTYPE_LIGHTING;
  frame.ssao.blurEnabled = true;
  frame.ssao.intensity = 0.75;
  frame.ssao.radius = 4;
  frame.ssao.samples = alta ? 12 : 7;
  frame.ssao.power = 5;

  // --- Bloom ----------------------------------------------------------------
  /*
   * Casi apagado, y a proposito. De dia no hay nada que brille mas que el
   * cielo; un bloom alto solo lava la imagen y se come la definicion. Lo
   * poco que queda sirve para que el borde de una pared al sol no corte
   * de forma dura contra la sombra.
   */
  frame.bloom.intensity = 0.012;
  frame.bloom.blurLevel = alta ? 12 : 8;
  frame.bloom.threshold = 1.1;

  // --- Grading --------------------------------------------------------------
  /*
   * Un empujon chico de contraste y saturacion. Nada de tinte: cualquier
   * desvio de color se nota enseguida en una escena clara, y el pedido es
   * que los colores sean los que son, algo apagados pero francos.
   */
  frame.grading.enabled = true;
  frame.grading.brightness = 1.02;
  frame.grading.contrast = 1.08;
  frame.grading.saturation = 1.1;
  frame.grading.tint = new pc.Color(1, 1, 1);

  /*
   * Realce selectivo. Lo importante aca es `shadows`: levanta las zonas en
   * sombra sin tocar el resto, que es exactamente lo que hace falta para
   * que la vereda del lado sombreado se siga leyendo.
   */
  frame.colorEnhance.enabled = true;
  frame.colorEnhance.shadows = 0.22;
  frame.colorEnhance.highlights = -0.12;
  frame.colorEnhance.vibrance = 0.14;
  frame.colorEnhance.midtones = 0.02;

  // --- Viñeta ---------------------------------------------------------------
  // Apenas perceptible. Enmarca sin oscurecer: cerrar los bordes de dia es
  // justo lo contrario de lo que se busca.
  frame.vignette.intensity = 0.3;
  frame.vignette.inner = 0.85;
  frame.vignette.outer = 2.1;
  frame.vignette.curvature = 0.5;
  frame.vignette.color = new pc.Color(0.18, 0.2, 0.24);

  // --- Suavizado temporal ---------------------------------------------------
  // Limpia los bordes escalonados acumulando varios cuadros. En movil
  // produce estelas cuando la camara se mueve rapido y no compensa.
  frame.taa.enabled = alta;
  frame.taa.jitter = 0.5;

  // --- Aberracion cromatica -------------------------------------------------
  // Apagada. En una imagen clara y de bordes netos se ve como un defecto,
  // no como estilo.
  frame.fringing.enabled = false;

  frame.update();
  return { frame, calidad };
}
