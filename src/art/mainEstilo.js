import * as pc from 'playcanvas';
import {
  montarEscenaEstilo,
  montarMuestrario,
  datosDelMuestrario,
  medidasDeReferencia,
  rgbAHex
} from './escenaEstilo.js';
import { PRESUPUESTO, TEXTURAS, ESCALA, luminancia, tono } from './styleGuide.js';
import { COLORS, ACABADO } from '../world/palette.js';
import { montarLuzAmbiente, crearMaterialesLuz } from '../world/lighting.js';
import { montarPostProceso } from '../render/postProcess.js';
import { UNITS } from '../config/balance.js';
import { Gus } from '../characters/gus.js';
import { Pose } from '../characters/pose.js';

/**
 * ===========================================================================
 * ARRANQUE DE LA ESCENA DE ESTILO
 * ===========================================================================
 * Página aparte del juego (`estilo.html`). No comparte nada con `main.js`
 * salvo la paleta, la iluminación y la guía: la idea es exactamente ésa,
 * que lo que se vea acá sea lo mismo que se ve en el juego **porque sale
 * del mismo lugar**, no porque alguien lo copió.
 *
 * Si algún día las dos se separan, es que un color o una luz dejó de estar
 * centralizado, y eso se nota acá antes que jugando.
 */

const canvas = document.getElementById('lienzo');
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true, alpha: false }
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();
addEventListener('resize', () => app.resizeCanvas());

// --- Luz: la MISMA del juego ------------------------------------------------
const matsLuz = crearMaterialesLuz();
const sol = montarLuzAmbiente(app, true);
void matsLuz;

// --- Escena -----------------------------------------------------------------
const { mats, caja } = montarEscenaEstilo(app);
const muestrario = montarMuestrario(app, mats);
muestrario.enabled = false;

/*
 * GUS, el modelo de verdad (12.B).
 *
 * Es el mismo objeto que usa el juego, no una copia: si alguien le cambia
 * una medida, esta escena lo muestra sin que haya que tocarla.
 */
const raizGus = new pc.Entity('Gus');
raizGus.setLocalPosition(-5.4, 0, 0.3);
/*
 * De frente a la camara.
 *
 * El frente de los modelos es -Z (el convenio de todo el proyecto, ver
 * core/rumbo.js) y la camara mira desde +Z: sin este giro, la ficha del
 * personaje mostraba a Gus DE ESPALDAS. Se veia bien y era la vista
 * equivocada: lo que hay que juzgar son las solapas y la cara.
 */
raizGus.setLocalEulerAngles(0, 180, 0);
app.root.addChild(raizGus);
const gus = new Gus(raizGus, mats);

/*
 * El zombi sigue siendo provisional: lo reemplaza 12.C. Queda la capsula a
 * proposito, para poder comparar el antes y el despues en la misma escena.
 */
function figuraProvisional(nombre, x, alto, color) {
  const g = new pc.Entity(nombre);
  g.setLocalPosition(x, 0, 0.3);
  app.root.addChild(g);

  const cuerpo = new pc.Entity('Cuerpo');
  cuerpo.addComponent('render', {
    type: 'capsule',
    material: mats.get(color, ACABADO.tela),
    castShadows: true
  });
  cuerpo.setLocalScale(0.5, alto / 2, 0.5);
  cuerpo.setLocalPosition(0, alto / 2, 0);
  g.addChild(cuerpo);
  return g;
}

figuraProvisional('Zombi', -1, ESCALA.zombi, [0.42, 0.5, 0.3]);

/*
 * Gus se anima aca tambien. Una ficha de personaje con el modelo congelado
 * en pose neutral no sirve para juzgar nada: lo que hay que validar es si
 * se lee EN MOVIMIENTO, que es como lo va a ver el jugador.
 *
 * Las teclas 1..6 cambian de pose.
 */
const POSES = [Pose.QUIETO, Pose.CAMINAR, Pose.CORRER, Pose.ATACAR, Pose.RECARGAR, Pose.CURARSE];
let poseActual = 0;
let velocidadFingida = 0;

app.on('update', (dt) => {
  const estado = POSES[poseActual];
  if (estado === Pose.CAMINAR) velocidadFingida = 3.2;
  else if (estado === Pose.CORRER) velocidadFingida = 6;
  else velocidadFingida = 0;

  if (estado === Pose.ATACAR || estado === Pose.RECARGAR) gus.animador.pedir(estado);
  else gus.animador.pedir(estado);
  gus.animador.update(dt, velocidadFingida);
  gus.aplicar(gus.animador.pose());
});

addEventListener('keydown', (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= POSES.length) {
    poseActual = n - 1;
    e.preventDefault();
  }
});

// Un objeto del piso, para ver si se distingue del decorado.
const objeto = new pc.Entity('Botiquin');
objeto.addComponent('render', {
  type: 'box',
  material: mats.get([0.9, 0.25, 0.3], ACABADO.pintura),
  castShadows: true
});
objeto.setLocalScale(0.46, 0.36, 0.46);
objeto.setLocalPosition(2.6, 0.62, 0.3);
app.root.addChild(objeto);
caja('DiscoObjeto', COLORS.checkpoint, ACABADO.pintura, [1.7, 0.02, 1.7], [2.6, 0.25, 0.3]);

// =============================================================================
// CAMARA
// =============================================================================
/*
 * ORTOGRAFICA, no en perspectiva. Es lo contrario de la camara del juego, y
 * es el motivo de que esta pagina exista.
 *
 * Con perspectiva, dos cosas a distinta profundidad se ven de distinto
 * tamaño: la puerta de la fachada quedaba visiblemente mas alta que la
 * marca de 2,10 m de una regla parada tres metros mas adelante, aunque las
 * dos midieran exactamente lo mismo. Una herramienta para validar escala
 * que deforma las alturas segun la profundidad no sirve para nada.
 *
 * En ortografica, lo que mide dos metros se ve de dos metros este donde
 * este. Se puede apoyar una regla en cualquier lado y comparar con lo que
 * sea.
 */
const camara = new pc.Entity('Camara');
camara.addComponent('camera', {
  clearColor: new pc.Color(0.07, 0.08, 0.1),
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 6,
  farClip: 200
});
app.root.addChild(camara);

/*
 * El encuadre tiene en cuenta el panel de la derecha.
 *
 * La escena ocupa de x=-6,5 a x=3,4, pero el panel tapa la cuarta parte
 * derecha de la pantalla. Apuntando al centro geometrico, el objeto del
 * piso quedaba debajo del panel. Mirando un poco a la derecha de ese
 * centro, todo el contenido se corre hacia la mitad visible.
 */
/*
 * `alto` levanta la camara sobre el objetivo, lo que da una inclinacion
 * suave hacia abajo. Hace falta: desde una camara perfectamente horizontal
 * el piso se ve de canto y no se pueden comparar las tres superficies de la
 * calle, que es la mitad del punto de esta escena.
 *
 * La inclinacion NO rompe la medicion de alturas: en ortografica todo se
 * proyecta con el mismo factor, asi que dos cosas de la misma altura siguen
 * midiendo lo mismo en pantalla.
 */
const vista = { angulo: 0, zoom: 7.4, alto: 5.5, objetivo: new pc.Vec3(0.4, 1.9, 0) };
/* En ortografica la camara se aleja solo para no cortar nada por delante. */
const DISTANCIA_FIJA = 40;

function colocarCamara() {
  const a = (vista.angulo * Math.PI) / 180;
  camara.setPosition(
    vista.objetivo.x + Math.sin(a) * DISTANCIA_FIJA,
    vista.objetivo.y + vista.alto,
    vista.objetivo.z + Math.cos(a) * DISTANCIA_FIJA
  );
  camara.lookAt(vista.objetivo);
  // En ortografica el "acercar" es cuanto mundo entra a lo alto.
  camara.camera.orthoHeight = vista.zoom;
}
colocarCamara();

/*
 * EL MISMO POST-PROCESO QUE EL JUEGO. No es un lujo: es el punto.
 *
 * La primera version de esta pagina no lo montaba, y el resultado fue que
 * la fachada ocre de la paleta se veia AMARILLO LIMON. El juego mapea los
 * tonos con `TONEMAP_NEUTRAL` y agrega bloom, oclusion y viñeta; sin eso,
 * los claros se queman y el color que uno mira aca no es el que va a ver
 * jugando.
 *
 * Una escena de prueba de estilo que miente sobre los colores es peor que
 * no tenerla: lleva a "corregir" una paleta que estaba bien.
 */
montarPostProceso(app, camara, sol);

/*
 * Una sola cascada de sombra.
 *
 * Las sombras en cascada dividen el frustum por profundidad para dar mas
 * resolucion cerca, y eso solo tiene sentido con perspectiva: en
 * ortografica no hay "cerca" ni "lejos" en terminos de tamaño, y PlayCanvas
 * avisa que el resultado va a ser incorrecto.
 *
 * El juego usa tres cascadas y esta bien que asi sea; es esta pagina la que
 * tiene la camara rara.
 */
sol.light.numCascades = 1;

addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') vista.angulo -= 6;
  else if (e.code === 'ArrowRight') vista.angulo += 6;
  else if (e.code === 'ArrowUp') vista.zoom = Math.max(1.5, vista.zoom - 0.8);
  else if (e.code === 'ArrowDown') vista.zoom = Math.min(16, vista.zoom + 0.8);
  else if (e.code === 'KeyM') {
    // El muestrario se mira desde arriba: son cubos en el piso.
    muestrario.enabled = !muestrario.enabled;
    vista.objetivo = muestrario.enabled ? new pc.Vec3(0, 0, 9) : new pc.Vec3(0.4, 1.9, 0);
    vista.alto = muestrario.enabled ? 30 : 5.5;
    vista.zoom = muestrario.enabled ? 4.2 : 7.4;
  } else return;
  colocarCamara();
  e.preventDefault();
});

// =============================================================================
// EL PANEL: los MISMOS numeros que usan las pruebas
// =============================================================================
const contenedorFamilias = document.getElementById('familias');
for (const f of datosDelMuestrario()) {
  const bloque = document.createElement('div');
  bloque.className = 'familia';

  const nombre = document.createElement('div');
  nombre.className = 'nombre';
  nombre.textContent = f.familia;
  bloque.append(nombre);

  const rampa = document.createElement('div');
  rampa.className = 'rampa';
  for (const e of f.escalones) {
    const m = document.createElement('div');
    m.className = 'muestra';
    m.style.background = e.hex;
    // La etiqueta se aclara sobre los escalones oscuros para poder leerla.
    if (Number(e.luz) < 0.4) m.classList.add('oscura');
    m.textContent = e.escalon.slice(0, 3);
    m.title = `${f.familia} / ${e.escalon} · ${e.hex} · luz ${e.luz} · sat ${e.sat}`;
    rampa.append(m);
  }
  bloque.append(rampa);
  contenedorFamilias.append(bloque);
}

const tablaEscala = document.getElementById('escala');
for (const { que, metros } of medidasDeReferencia()) {
  const tr = document.createElement('tr');
  const a = document.createElement('td');
  a.textContent = que;
  const b = document.createElement('td');
  b.textContent = `${metros} m`;
  tr.append(a, b);
  tablaEscala.append(tr);
}

const tablaPresupuesto = document.getElementById('presupuesto');
for (const [que, triangulos] of Object.entries(PRESUPUESTO)) {
  const tr = document.createElement('tr');
  const a = document.createElement('td');
  a.textContent = que;
  const b = document.createElement('td');
  b.textContent = `${triangulos} △`;
  tr.append(a, b);
  tablaPresupuesto.append(tr);
}

document.getElementById('nota-texturas').textContent = TEXTURAS.usar
  ? `Texturas: atlas único de ${TEXTURAS.atlasMaximo} px.`
  : `Sin texturas, a propósito: ${TEXTURAS.motivo}. Lo que reemplaza a la ` +
    'textura es geometría — un balcón de verdad en vez de un balcón pintado.';

/*
 * Se expone para poder inspeccionar la escena desde una prueba, igual que
 * hace el juego. Sin esto, comprobar la escala desde fuera obligaría a
 * medir píxeles en una captura.
 */
globalThis.estilo = {
  app,
  mats,
  vista,
  colocarCamara,
  muestrario,
  guia: { PRESUPUESTO, TEXTURAS, ESCALA, luminancia, tono, rgbAHex },
  gus,
  unidades: UNITS
};
