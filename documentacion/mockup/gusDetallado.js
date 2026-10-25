import * as pc from 'playcanvas';
import { Materiales, ACABADO } from '../../src/world/palette.js';
import { montarLuzAmbiente } from '../../src/world/lighting.js';
import { montarPostProceso } from '../../src/render/postProcess.js';

/**
 * ===========================================================================
 * GUS DETALLADO — MOCKUP
 * ===========================================================================
 * Una sola figura, con todo el detalle que se puede sacar de geometría, al
 * lado de la foto de referencia y a la misma altura, para poder comparar.
 *
 * ---------------------------------------------------------------------------
 * HASTA DONDE LLEGA ESTO, Y DONDE ESTA EL TECHO
 * ---------------------------------------------------------------------------
 * Esto NO es un modelo realista, y conviene decirlo antes de que alguien lo
 * mire esperando uno. Realista quiere decir malla densa con texturas de
 * color, normales y rugosidad, más esqueleto: un `.glb` que se modela en
 * Blender o se compra. Eso se puede integrar al juego, pero hay que
 * **autorearlo afuera**.
 *
 * Lo que sí se puede hacer con geometría es mucho más de lo que había: acá
 * hay unas 120 piezas en vez de 24, con el pelo en mechones, la campera
 * abierta con solapas, cierre y tachas, y la cara con volumen. El estilo
 * resultante es **facetado**, parecido al de la propia ilustración de
 * referencia, que también está hecha de planos triangulares.
 *
 * ---------------------------------------------------------------------------
 * ESTO NO ES EL JUEGO
 * ---------------------------------------------------------------------------
 * Es una página de mockup: no hay presupuesto de llamadas de dibujo ni de
 * triángulos. Si esta dirección gusta, el paso siguiente es decidir cuánto
 * de este detalle sobrevive a la distancia de cámara real y qué se funde en
 * mallas únicas.
 */

const canvas = document.getElementById('lienzo');
const app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true } });
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();
addEventListener('resize', () => app.resizeCanvas());

const mats = new Materiales();
const sol = montarLuzAmbiente(app, true);

/* ========================================================================
   COLORES, sacados de mirar la referencia
   ======================================================================== */
const C = {
  cuero: [0.075, 0.075, 0.088],
  cueroLuz: [0.125, 0.127, 0.145],
  cueroSombra: [0.045, 0.045, 0.055],
  remera: [0.048, 0.048, 0.056],
  jean: [0.24, 0.33, 0.5],
  jeanLuz: [0.31, 0.41, 0.58],
  jeanSombra: [0.17, 0.24, 0.38],
  piel: [0.79, 0.61, 0.48],
  pielSombra: [0.66, 0.49, 0.38],
  barba: [0.44, 0.35, 0.3],
  pelo: [0.1, 0.075, 0.062],
  peloLuz: [0.17, 0.13, 0.1],
  ceja: [0.13, 0.095, 0.08],
  ojo: [0.1, 0.1, 0.12],
  tacha: [0.6, 0.62, 0.66],
  cierre: [0.42, 0.43, 0.46],
  bota: [0.1, 0.085, 0.075],
  suela: [0.06, 0.06, 0.065]
};

const raiz = new pc.Entity('GusDetallado');
/*
 * De frente a la camara. El frente de los modelos es -Z y la camara mira
 * desde +Z: sin este giro se ve la espalda, que es lo unico que la foto de
 * referencia NO muestra.
 */
raiz.setLocalEulerAngles(0, 180, 0);
app.root.addChild(raiz);

/** Una caja. El ladrillo de todo. */
function b(padre, color, esc, pos, rot, acabado = ACABADO.tela) {
  const e = new pc.Entity('p');
  e.addComponent('render', {
    type: 'box',
    material: mats.get(color, acabado),
    castShadows: true
  });
  e.setLocalScale(esc[0], esc[1], esc[2]);
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  padre.addChild(e);
  return e;
}

/** Un grupo, para poder rotar un conjunto entero. */
function g(padre, nombre, pos, rot) {
  const e = new pc.Entity(nombre);
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  padre.addChild(e);
  return e;
}

/* ========================================================================
   MEDIDAS
   ======================================================================== */
const M = {
  alto: 1.8,
  cadera: 0.94,
  torso: 0.56,
  cabeza: 0.22
};

/* ========================================================================
   PIERNAS
   ======================================================================== */
for (const lado of [-1, 1]) {
  const pierna = g(raiz, `Pierna${lado}`, [lado * 0.11, 0, 0]);

  // Muslo, con un leve ensanche arriba: un jean no es un cilindro.
  b(pierna, C.jean, [0.17, 0.3, 0.19], [0, 0.78, 0]);
  b(pierna, C.jeanLuz, [0.172, 0.12, 0.192], [0, 0.88, -0.004]);
  // Bolsillo trasero, apenas marcado.
  b(pierna, C.jeanSombra, [0.1, 0.11, 0.012], [lado * 0.02, 0.84, 0.098]);
  // Rodilla.
  b(pierna, C.jean, [0.155, 0.14, 0.175], [0, 0.56, -0.004]);
  b(pierna, C.jeanSombra, [0.158, 0.03, 0.178], [0, 0.6, -0.008], [6, 0, 0]);
  // Pantorrilla, afinando hacia el tobillo.
  b(pierna, C.jean, [0.145, 0.28, 0.165], [0, 0.35, 0]);
  b(pierna, C.jean, [0.135, 0.12, 0.15], [0, 0.18, 0]);
  // Dobladillo.
  b(pierna, C.jeanSombra, [0.142, 0.035, 0.158], [0, 0.125, 0]);

  // Bota: caña, empeine y suela.
  b(pierna, C.bota, [0.135, 0.09, 0.16], [0, 0.075, 0]);
  b(pierna, C.bota, [0.13, 0.065, 0.26], [0, 0.045, -0.055]);
  b(pierna, C.suela, [0.138, 0.028, 0.27], [0, 0.014, -0.055]);
}

// Cadera y cinturón.
b(raiz, C.jean, [0.33, 0.14, 0.21], [0, 0.95, 0]);
b(raiz, C.cueroSombra, [0.335, 0.045, 0.215], [0, 1.0, 0]);
b(raiz, C.tacha, [0.05, 0.04, 0.03], [0, 1.0, -0.105], null, ACABADO.metal);

/* ========================================================================
   TORSO: remera y campera ABIERTA
   ======================================================================== */
const torsoY = M.cadera + 0.1;

/*
 * La remera queda a la vista en el medio del pecho. Es la V oscura de la
 * referencia, y es lo que hace que la campera se lea como abierta en vez
 * de como un bloque.
 */
b(raiz, C.remera, [0.3, M.torso, 0.21], [0, torsoY + M.torso / 2, 0]);
b(raiz, C.remera, [0.26, 0.1, 0.215], [0, torsoY + M.torso - 0.02, -0.005], [10, 0, 0]);

for (const lado of [-1, 1]) {
  const panel = g(raiz, `Panel${lado}`, [lado * 0.16, torsoY + M.torso / 2, 0]);

  // Panel de cuero del frente, en diagonal hacia afuera.
  b(panel, C.cuero, [0.19, M.torso, 0.24], [0, 0, -0.01], [0, lado * 4, lado * -3]);
  // Costado, más oscuro: da vuelta el volumen.
  b(panel, C.cueroSombra, [0.06, M.torso * 0.96, 0.22], [lado * 0.1, 0, 0.01]);
  // Espalda.
  b(panel, C.cuero, [0.2, M.torso, 0.07], [0, 0, 0.1]);

  /*
   * LA SOLAPA. Es el rasgo mas fuerte de la referencia: ancha, doblada
   * hacia afuera, con el borde iluminado.
   */
  const solapa = g(panel, 'Solapa', [lado * -0.02, M.torso * 0.22, -0.125], [0, 0, lado * -30]);
  b(solapa, C.cueroLuz, [0.12, 0.26, 0.035], [0, 0, 0]);
  b(solapa, C.cuero, [0.125, 0.265, 0.02], [0, 0, 0.028]);
  // Cuello levantado.
  b(panel, C.cueroLuz, [0.1, 0.08, 0.05], [lado * -0.03, M.torso * 0.45, -0.02], [18, 0, lado * -14]);
  // Tachas de la solapa.
  for (const t of [0.08, -0.04]) {
    b(solapa, C.tacha, [0.022, 0.022, 0.022], [0, t, -0.026], null, ACABADO.metal);
  }

  // Hombrera con costura.
  b(panel, C.cuero, [0.21, 0.07, 0.25], [lado * 0.02, M.torso * 0.47, 0]);
  b(panel, C.cueroLuz, [0.215, 0.012, 0.255], [lado * 0.02, M.torso * 0.5, 0]);
}

/*
 * El cierre en diagonal, que es la firma de una campera de motociclista.
 * Son eslabones chicos siguiendo una recta inclinada.
 */
for (let i = 0; i < 9; i++) {
  const t = i / 8;
  b(
    raiz,
    C.cierre,
    [0.022, 0.035, 0.016],
    [-0.06 + t * 0.12, torsoY + 0.08 + t * 0.4, -0.115 - t * 0.008],
    [0, 0, -16],
    ACABADO.metal
  );
}

// Bolsillo del pecho, con su cierre.
b(raiz, C.cueroSombra, [0.11, 0.09, 0.012], [0.13, torsoY + 0.34, -0.125], [0, 0, -8]);
b(raiz, C.cierre, [0.115, 0.016, 0.014], [0.13, torsoY + 0.385, -0.128], [0, 0, -8], ACABADO.metal);

/* ========================================================================
   BRAZOS
   ======================================================================== */
for (const lado of [-1, 1]) {
  const hombro = g(raiz, `Brazo${lado}`, [lado * 0.245, torsoY + M.torso * 0.44, 0], [
    0,
    0,
    lado * -5
  ]);

  // Mangas: brazo, codo y antebrazo, cada uno un poco más fino.
  b(hombro, C.cuero, [0.13, 0.26, 0.145], [0, -0.13, 0]);
  b(hombro, C.cueroLuz, [0.133, 0.02, 0.148], [0, -0.025, 0]);
  b(hombro, C.cuero, [0.12, 0.09, 0.135], [0, -0.3, 0.005]);
  b(hombro, C.cuero, [0.112, 0.22, 0.125], [0, -0.45, 0.01]);
  // Puño.
  b(hombro, C.cueroSombra, [0.118, 0.055, 0.13], [0, -0.58, 0.012]);
  // Mano.
  b(hombro, C.piel, [0.095, 0.13, 0.105], [0, -0.66, 0.012]);
  b(hombro, C.pielSombra, [0.097, 0.04, 0.107], [0, -0.72, 0.012]);
}

/* ========================================================================
   CABEZA
   ======================================================================== */
const cuelloY = torsoY + M.torso;
b(raiz, C.pielSombra, [0.115, 0.08, 0.115], [0, cuelloY + 0.02, 0.005]);

const cabeza = g(raiz, 'Cabeza', [0, cuelloY + 0.07, 0], [0, 0, 0]);

// Cráneo, mandíbula y mentón: tres volúmenes, no una caja.
b(cabeza, C.piel, [0.175, 0.14, 0.185], [0, 0.09, 0]);
b(cabeza, C.piel, [0.16, 0.08, 0.17], [0, 0.0, -0.005]);
b(cabeza, C.piel, [0.12, 0.05, 0.14], [0, -0.045, -0.012], [8, 0, 0]);
// Barba de pocos días: una capa apenas más oscura en la mandíbula.
b(cabeza, C.barba, [0.163, 0.07, 0.173], [0, -0.012, -0.004]);
b(cabeza, C.barba, [0.123, 0.045, 0.142], [0, -0.05, -0.012], [8, 0, 0]);

// Frente, ceja y nariz.
b(cabeza, C.piel, [0.17, 0.045, 0.03], [0, 0.085, -0.088]);
for (const lado of [-1, 1]) {
  b(cabeza, C.ceja, [0.055, 0.016, 0.02], [lado * 0.042, 0.063, -0.092], [0, 0, lado * 6]);
  b(cabeza, C.ojo, [0.028, 0.016, 0.016], [lado * 0.042, 0.04, -0.09]);
  // Oreja.
  b(cabeza, C.piel, [0.022, 0.055, 0.045], [lado * 0.093, 0.035, 0.005]);
}
b(cabeza, C.piel, [0.038, 0.06, 0.045], [0, 0.028, -0.1]);
b(cabeza, C.pielSombra, [0.042, 0.016, 0.02], [0, -0.004, -0.098]);
// Boca.
b(cabeza, C.pielSombra, [0.055, 0.012, 0.015], [0, -0.03, -0.09]);

/* ========================================================================
   PELO: el rasgo que más identifica, en mechones
   ======================================================================== */
// Costados rapados: una capa fina y oscura pegada al cráneo.
for (const lado of [-1, 1]) {
  b(cabeza, C.pelo, [0.02, 0.1, 0.17], [lado * 0.087, 0.095, 0.005]);
  // Patilla.
  b(cabeza, C.pelo, [0.018, 0.05, 0.03], [lado * 0.085, 0.035, -0.045]);
}
// Base del pelo.
b(cabeza, C.pelo, [0.168, 0.07, 0.18], [0, 0.175, 0.005]);
b(cabeza, C.pelo, [0.172, 0.05, 0.05], [0, 0.145, 0.08]);

/*
 * Los mechones. Son catorce cuñas chicas, inclinadas hacia arriba y hacia
 * adelante, de alturas distintas. A la distancia de cámara no se cuentan
 * una por una: lo que se ve es un contorno dentado, que es exactamente lo
 * que la referencia tiene y lo que un bloque de pelo no da.
 */
const MECHONES = [
  [-0.062, 0.04, -0.045, 34, -22, 0.9],
  [-0.038, 0.062, -0.055, 42, -12, 1.15],
  [-0.012, 0.072, -0.058, 46, -4, 1.25],
  [0.014, 0.068, -0.055, 44, 5, 1.2],
  [0.04, 0.055, -0.045, 38, 14, 1.0],
  [0.064, 0.036, -0.03, 30, 24, 0.85],
  [-0.055, 0.05, 0.0, 22, -18, 0.95],
  [-0.025, 0.062, -0.005, 26, -7, 1.05],
  [0.005, 0.066, -0.008, 28, 2, 1.1],
  [0.033, 0.058, -0.002, 25, 11, 1.0],
  [0.058, 0.042, 0.012, 20, 20, 0.85],
  [-0.03, 0.04, 0.05, 12, -10, 0.8],
  [0.005, 0.044, 0.055, 10, 0, 0.85],
  [0.034, 0.038, 0.048, 9, 9, 0.78]
];
for (const [x, y, z, rx, rz, k] of MECHONES) {
  const color = y > 0.055 ? C.peloLuz : C.pelo;
  b(cabeza, color, [0.036 * k, 0.1 * k, 0.03 * k], [x, 0.2 + y, z], [-rx, 0, rz]);
}

/* ========================================================================
   LA FOTO DE REFERENCIA, AL LADO Y A LA MISMA ALTURA
   ======================================================================== */
/*
 * Poner la referencia DENTRO de la escena, con la misma luz y el mismo
 * post-proceso, es la unica forma honesta de comparar: cualquier otra
 * comparacion se hace de memoria entre dos pantallas distintas.
 */
const marco = new pc.Entity('Referencia');
marco.setLocalPosition(-0.95, M.alto / 2 + 0.02, 0.1);
app.root.addChild(marco);

const texto = new pc.Texture(app.graphicsDevice, { name: 'Gus', mipmaps: true });
const img = new Image();
img.onload = () => {
  texto.setSource(img);
  const matFoto = new pc.StandardMaterial();
  matFoto.diffuse = new pc.Color(0, 0, 0);
  matFoto.emissiveMap = texto;
  matFoto.emissive = new pc.Color(1, 1, 1);
  matFoto.useLighting = false;
  /*
   * Sin descarte de cara trasera.
   *
   * El plano de PlayCanvas nace horizontal con la normal hacia +Y.
   * Pararlo con (90, 180, 0) lo dejaba mirando hacia -Z, o sea de espaldas
   * a la camara, y el motor lo descartaba por cara trasera: la foto
   * estaba ahi, en el lugar correcto y con la textura cargada, y no se
   * veia nada. Dibujar las dos caras saca el problema de raiz.
   */
  matFoto.cull = pc.CULLFACE_NONE;
  matFoto.update();

  const alto = M.alto;
  const ancho = (alto * img.width) / img.height;
  const plano = new pc.Entity('Foto');
  plano.addComponent('render', { type: 'plane', material: matFoto, castShadows: false });
  plano.setLocalScale(ancho, 1, alto);
  // El plano nace horizontal: se para de cara a la camara.
  plano.setLocalEulerAngles(90, 0, 0);
  marco.addChild(plano);
};
img.src = '../personajes/Gus.jpeg';

// Piso, para que las dos cosas apoyen en el mismo lugar.
b(app.root, [0.5, 0.49, 0.47], [8, 0.1, 4], [0, -0.05, 0], null, ACABADO.vereda);

/* ========================================================================
   CAMARA
   ======================================================================== */
const camara = new pc.Entity('Camara');
camara.addComponent('camera', {
  clearColor: new pc.Color(0.07, 0.08, 0.1),
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 1.05,
  farClip: 100
});
app.root.addChild(camara);
montarPostProceso(app, camara, sol);
sol.light.numCascades = 1;

/*
 * El encuadre tiene que entrar la foto Y el modelo.
 *
 * La foto esta en x=-0,95 y mide 1,2 de ancho; el modelo esta en 0. O sea
 * que lo que hay que mostrar va de -1,55 a 0,35: centro en -0,6 y casi dos
 * metros de ancho.
 */
const vista = { giro: 0, pitch: 6, zoom: 1.35, alto: 0.95, objetivoX: -0.6 };
function colocarCamara() {
  const yaw = (vista.giro * Math.PI) / 180;
  const pitch = (vista.pitch * Math.PI) / 180;
  const d = 20;
  camara.setPosition(
    vista.objetivoX + Math.sin(yaw) * Math.cos(pitch) * d,
    vista.alto + Math.sin(pitch) * d,
    Math.cos(yaw) * Math.cos(pitch) * d
  );
  camara.lookAt(new pc.Vec3(vista.objetivoX, vista.alto, 0));
  camara.camera.orthoHeight = vista.zoom;
}
colocarCamara();

addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') vista.giro -= 12;
  else if (e.code === 'ArrowRight') vista.giro += 12;
  else if (e.code === 'ArrowUp') vista.zoom = Math.max(0.25, vista.zoom - 0.12);
  else if (e.code === 'ArrowDown') vista.zoom = Math.min(3, vista.zoom + 0.12);
  else if (e.code === 'KeyC') {
    // La vista que importa: la cámara del juego.
    const deJuego = vista.pitch < 30;
    vista.pitch = deJuego ? 57 : 6;
    vista.zoom = deJuego ? 1.4 : 1.35;
    vista.objetivoX = deJuego ? 0 : -0.6;
  } else return;
  colocarCamara();
  e.preventDefault();
});

globalThis.mockup = { app, vista, colocarCamara, raiz };
