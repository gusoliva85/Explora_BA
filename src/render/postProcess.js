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
  // El bloom necesita coma flotante: con 8 bits por canal no existe el
  // concepto de "mas brillante que el blanco" y no hay nada que derramar.
  // Se piden formatos de mas a menos calidad; el motor toma el primero que
  // la placa soporte.
  frame.rendering.renderFormats = [pc.PIXELFORMAT_111110F, pc.PIXELFORMAT_RGBA16F];

  // Renderizar por debajo de la resolucion nativa y reenfocar al final es,
  // lejos, el ajuste que mas FPS devuelve en movil por menos perdida visual.
  frame.rendering.renderTargetScale = alta ? 1.0 : 0.82;
  frame.rendering.sharpness = alta ? 0.35 : 0.6;

  // Suavizado por multimuestreo. Con TAA encendido no hace falta y seria
  // pagar dos veces por lo mismo.
  frame.rendering.samples = alta ? 1 : 2;

  /*
   * Mapeo de tonos NEUTRAL.
   *
   * Es lo que convierte el rango alto en algo mostrable. Se eligio NEUTRAL
   * sobre ACES porque ACES tiñe las luces calidas hacia el naranja y
   * desatura las sombras: en una calle iluminada con sodio eso termina
   * volviendo todo sepia. NEUTRAL conserva el color de la lampara y deja
   * que el azul de la noche siga siendo azul.
   */
  frame.rendering.toneMapping = pc.TONEMAP_NEUTRAL;

  // --- Oclusion ambiental ---------------------------------------------------
  // Oscurece los rincones: donde la pared toca la vereda, debajo de los
  // autos, en los huecos entre edificios. Es el efecto que mas hace por que
  // los objetos parezcan apoyados en el piso y no pegados encima.
  // Encendida tambien en movil: ahora que ninguna luz proyecta sombras, la
  // oclusion ambiental es lo unico que apoya los objetos en el piso. Es
  // cara, pero sin ella todo flota.
  frame.ssao.type = pc.SSAOTYPE_LIGHTING;
  frame.ssao.blurEnabled = true;
  frame.ssao.intensity = 0.7;
  frame.ssao.radius = 6;
  frame.ssao.samples = alta ? 12 : 6;
  frame.ssao.power = 4;

  // --- Bloom ----------------------------------------------------------------
  // El alma de la escena nocturna: hace que los faroles, las ventanas
  // encendidas y el anillo del jugador derramen luz.
  frame.bloom.intensity = 0.04;
  frame.bloom.blurLevel = alta ? 16 : 10;
  // Umbral bajo: queremos que derrame casi todo lo que emite, no solo lo
  // que quema. Con un umbral alto solo brillarian las lamparas.
  frame.bloom.threshold = 0.75;

  // --- Grading --------------------------------------------------------------
  // Un leve empuje de contraste y saturacion, y un tinte frio que fija la
  // hora: noche cerrada, no atardecer.
  frame.grading.enabled = true;
  frame.grading.brightness = 1.0;
  frame.grading.contrast = 1.12;
  frame.grading.saturation = 1.18;
  frame.grading.tint = new pc.Color(0.92, 0.96, 1.08);

  // Realce selectivo: levanta las sombras lo justo para que no sean un
  // agujero negro, baja un poco las luces para que no se quemen, y sube la
  // vibracion de los colores apagados sin tocar los que ya son intensos.
  frame.colorEnhance.enabled = true;
  frame.colorEnhance.shadows = 0.3;
  frame.colorEnhance.highlights = -0.1;
  frame.colorEnhance.vibrance = 0.3;
  frame.colorEnhance.midtones = 0.04;

  // --- Viñeta ---------------------------------------------------------------
  // Cierra los bordes y empuja la mirada al centro, donde esta Gus. En una
  // pantalla de telefono, sostenida cerca de la cara, esto ayuda bastante.
  frame.vignette.intensity = 0.7;
  frame.vignette.inner = 0.6;
  frame.vignette.outer = 1.7;
  frame.vignette.curvature = 0.6;
  frame.vignette.color = new pc.Color(0.02, 0.03, 0.05);

  // --- Suavizado temporal ---------------------------------------------------
  // Limpia los bordes escalonados acumulando varios cuadros. En movil
  // produce estelas cuando la camara se mueve rapido y no compensa.
  frame.taa.enabled = alta;
  frame.taa.jitter = 0.5;

  // --- Aberracion cromatica -------------------------------------------------
  // Muy sutil, solo en los bordes. Saca el aspecto de render limpio de
  // motor y acerca la imagen a algo filmado.
  frame.fringing.enabled = true;
  frame.fringing.intensity = alta ? 4 : 2;

  frame.update();
  return { frame, calidad };
}
