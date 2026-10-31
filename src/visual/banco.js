import * as pc from 'playcanvas';
import { montarPostProceso } from '../render/postProcess.js';
import {
  SOL, SOL_MEDIDO, CIELO, REBOTE,
  CALLE, FACHADA, CARTEL, VERDE, VEHICULO, ABANDONO, ZOMBI, GUS, OBJETO,
  luminancia, saturacion
} from './paleta.js';
import referenciaURL from '../../documentacion/visual/REFERENCIA_VISUAL.png';

/**
 * ===========================================================================
 * BANCO VISUAL — Fase 12R, tarea 12R.0
 * ===========================================================================
 * Reemplaza a `src/art/mainEstilo.js` y `src/art/escenaEstilo.js`.
 *
 * ---------------------------------------------------------------------------
 * QUE PROBLEMA RESUELVE
 * ---------------------------------------------------------------------------
 * La paleta se saco midiendo pixeles de la referencia y descontandole la luz
 * (ver `paleta.js`). Eso es una cuenta, y una cuenta puede estar bien hecha y
 * dar un resultado feo. La unica manera de saberlo es poner el color al lado
 * del original y mirarlos juntos.
 *
 * Cada casillero de este banco esta partido al medio:
 *
 *     izquierda = la referencia, el pixel original
 *     derecha   = el color del juego, iluminado por el sol del juego
 *
 * Si la costura del medio desaparece, el color esta bien. Si se ve un escalon,
 * algo esta mal y se corrige el numero, no la impresion.
 *
 * No se comparan contra el albedo plano a proposito: el albedo plano NO tiene
 * que parecerse al pixel de la referencia, porque al pixel le sobra la luz.
 * Comparar contra el albedo seria comparar contra lo que no se ve nunca.
 *
 * ---------------------------------------------------------------------------
 * LA CAMARA ES ORTOGRAFICA, Y ESO ES EL MOTIVO DE QUE EXISTA
 * ---------------------------------------------------------------------------
 * Es lo unico que se conserva de la escena de prueba vieja, porque estaba
 * bien: en perspectiva, una puerta de 2,10 m se ve mas alta que una regla de
 * 2,10 m que esta tres metros mas atras. Una herramienta para validar escala
 * que deforma las alturas segun la profundidad no sirve.
 *
 * Y monta el MISMO post-proceso que el juego. Sin eso los claros se queman y
 * la comparacion miente.
 */

/* =========================================================================
   DE DONDE SALIO CADA COLOR
   =========================================================================
   El rectangulo de la referencia del que se midio. Vive acá y no en
   `paleta.js` porque es dato del banco: sirve para volver a mirar, no para
   pintar. [x, y, ancho, alto] en pixeles de REFERENCIA_VISUAL.png. */

const ORIGEN = {
  'CALLE.asfalto': [640, 360, 260, 90],
  'CALLE.raya': [620, 420, 320, 90],
  'CALLE.cordon': [230, 420, 160, 30],
  'CALLE.vereda': [40, 450, 220, 70],
  'CALLE.vereda_junta': [40, 450, 220, 70],
  'FACHADA.crema': [120, 10, 160, 90],
  'FACHADA.terracota': [500, 20, 130, 110],
  'FACHADA.gris': [500, 20, 130, 110],
  'FACHADA.ladrillo': [500, 20, 130, 110],
  'FACHADA.persiana': [150, 280, 180, 70],
  'FACHADA.metal_oscuro': [150, 280, 180, 70],
  'FACHADA.poste': [380, 120, 30, 330],
  'CARTEL.rojo': [70, 130, 230, 60],
  'CARTEL.toldo': [120, 220, 180, 30],
  'CARTEL.verde': [340, 185, 210, 70],
  'VERDE.claro': [980, 10, 180, 180],
  'VERDE.medio': [980, 10, 180, 180],
  'VERDE.oscuro': [980, 10, 180, 180],
  'VERDE.tronco': [1080, 120, 120, 140],
  'VEHICULO.rojo': [500, 300, 130, 70],
  'VEHICULO.vidrio': [500, 300, 130, 70],
  'VEHICULO.azul': [920, 255, 110, 80],
  'VEHICULO.claro': [920, 255, 110, 80],
  'ABANDONO.barricada': [620, 280, 220, 60],
  'ABANDONO.madera': [110, 360, 90, 70],
  'ABANDONO.bolsa': [200, 380, 100, 60],
  'ZOMBI.piel': [180, 545, 60, 50],
  'ZOMBI.camisa': [110, 600, 90, 80],
  'ZOMBI.pantalon': [110, 760, 110, 110],
  'ZOMBI.jean': [380, 760, 110, 100],
  'ZOMBI.jean_oscuro': [640, 780, 140, 110],
  'ZOMBI.camisa_azul': [660, 610, 130, 90],
  'ZOMBI.chaleco_rojo': [390, 650, 90, 80],
  'ZOMBI.chaleco_naranja': [660, 610, 130, 90],
  'ZOMBI.casco': [735, 535, 90, 40],
  'ZOMBI.calzado': [760, 925, 60, 50],
  'OBJETO.botiquin': [1180, 830, 110, 90],
  'OBJETO.blanco': [1255, 860, 50, 50],
  'OBJETO.municion': [950, 830, 110, 80],
  'OBJETO.laton': [1075, 915, 50, 60],
  'OBJETO.cartucho': [1075, 915, 50, 60],
  'OBJETO.venda': [1400, 850, 110, 90],
  'OBJETO.acero': [1220, 590, 120, 50],
  'OBJETO.metal': [1380, 575, 110, 50],
  'OBJETO.madera': [950, 720, 120, 70]
};

/**
 * Por que un color puede no tener parche:
 *  - los de Gus salen de Gus.jpeg, que es otra imagen (D-24);
 *  - los derivados no se midieron, se calcularon a partir de otro.
 * En los dos casos conviene que se vea, para no creer que se comparo algo
 * que no se comparo.
 */
const sinParche = (familia) => (familia === 'GUS' ? 'Gus.jpeg' : 'derivado');

const FAMILIAS = { CALLE, FACHADA, CARTEL, VERDE, VEHICULO, ABANDONO, ZOMBI, GUS, OBJETO };

const entradas = [];
for (const [familia, obj] of Object.entries(FAMILIAS)) {
  for (const [nombre, color] of Object.entries(obj)) {
    const clave = `${familia}.${nombre}`;
    entradas.push({ clave, familia, nombre, color, origen: ORIGEN[clave] ?? null });
  }
}

/* =========================================================================
   MOTOR
   ========================================================================= */

const canvas = document.getElementById('lienzo');
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true, alpha: false }
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();
addEventListener('resize', () => app.resizeCanvas());

/*
 * La luz va acá y no en un modulo porque `src/visual/escena.js` se escribe en
 * 12R.2. Cuando exista, esto se borra y el banco la importa, que es el punto:
 * el banco tiene que iluminar IGUAL que el juego o no sirve para nada.
 */
const col = (c) => new pc.Color(c[0], c[1], c[2]);

app.scene.ambientLight = col(REBOTE);
app.scene.skyboxIntensity = 1;

const sol = new pc.Entity('Sol');
sol.addComponent('light', {
  type: 'directional',
  color: col(SOL),
  intensity: 1.9,
  castShadows: true,
  shadowBias: 0.05,
  normalOffsetBias: 0.05,
  shadowDistance: 40,
  shadowResolution: 1024
});
// 73 grados de elevacion: D-16. El azimut viene de la referencia, donde la luz
// entra desde atras y a la izquierda.
sol.setEulerAngles(73, 38, 0);
app.root.addChild(sol);

const cieloLuz = new pc.Entity('Cielo');
cieloLuz.addComponent('light', {
  type: 'directional',
  color: col(CIELO),
  intensity: 0.5,
  castShadows: false
});
cieloLuz.setEulerAngles(-55, 200, 0);
app.root.addChild(cieloLuz);

/* =========================================================================
   LA GRILLA DE MUESTRAS
   =========================================================================
   Cuadrados planos mirando a la camara, en una grilla de una unidad de lado.
   Ortografica y alineada a los ejes: la proyeccion a pantalla es una regla de
   tres, y por eso los parches HTML pueden caer justo encima. */

const COLS = 7;
const PASO = 1.0;
const LADO = 0.92;
const filas = Math.ceil(entradas.length / COLS);

const camara = new pc.Entity('Camara');
camara.addComponent('camera', {
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  clearColor: new pc.Color(0.07, 0.08, 0.1),
  nearClip: 0.1,
  farClip: 100
});
app.root.addChild(camara);

const centro = {
  x: ((COLS - 1) * PASO) / 2,
  y: -((filas - 1) * PASO) / 2
};
camara.setPosition(centro.x, centro.y, 20);
camara.setEulerAngles(0, 0, 0);

/**
 * Encuadra un rectangulo de mundo en la parte del lienzo que el panel NO tapa.
 *
 * El panel de la derecha esta encima del canvas, no al lado: la camara dibuja
 * por debajo igual. Si no se descuenta, lo que caiga en esa franja queda
 * escondido, y la primera version perdia ahi la barra del cordon.
 *
 * @param {number} ancho ancho del contenido, en metros
 * @param {number} alto alto del contenido, en metros
 * @param {{x:number,y:number}} centro centro del contenido, en metros
 */
function encuadrarEn(ancho, alto, centro) {
  const panel = document.getElementById('panel');
  const tapado = panel.style.display === 'none' ? 0 : panel.getBoundingClientRect().width;
  const total = canvas.clientWidth || 1;
  const libre = Math.max(total - tapado, total * 0.3);

  const aspecto = total / (canvas.clientHeight || 1);
  // El ancho hay que agrandarlo en la proporcion que ocupa el panel.
  const anchoPedido = ancho * (total / libre);
  const medioAlto = Math.max(alto / 2, anchoPedido / (2 * aspecto));
  camara.camera.orthoHeight = medioAlto;

  // Y despues correr la camara para que el contenido quede centrado en lo libre.
  const medioAncho = medioAlto * aspecto;
  const corrimiento = (tapado / total) * medioAncho;
  camara.setPosition(centro.x + corrimiento, centro.y, 20);
}

function encuadrar() {
  encuadrarEn(COLS * PASO + 0.6, filas * PASO + 0.6, centro);
}
encuadrar();

const materiales = [];
entradas.forEach((e, i) => {
  const c = i % COLS;
  const f = Math.floor(i / COLS);
  const m = new pc.StandardMaterial();
  m.diffuse = col(e.color);
  m.gloss = 0.25;
  m.metalness = 0;
  m.useMetalness = true;
  m.update();
  materiales.push(m);

  const q = new pc.Entity(e.clave);
  q.addComponent('render', { type: 'plane', material: m, castShadows: false });
  q.setLocalScale(LADO, 1, LADO);
  // El plano de PlayCanvas nace horizontal: se para de cara a la camara.
  q.setEulerAngles(90, 0, 0);
  q.setPosition(c * PASO, -f * PASO, 0);
  app.root.addChild(q);
  e.entidad = q;
});

/* =========================================================================
   LOS PARCHES DE LA REFERENCIA, ENCIMA
   ========================================================================= */

const capa = document.getElementById('parches');

/** Pasa una posicion de mundo a pixeles de pantalla. Ortografica, es lineal. */
function aPantalla(x, y) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const mh = camara.camera.orthoHeight;
  const mw = mh * (w / h);
  const cx = camara.getPosition().x;
  const cy = camara.getPosition().y;
  return {
    x: ((x - cx) / (2 * mw) + 0.5) * w,
    y: (0.5 - (y - cy) / (2 * mh)) * h,
    escalaX: (LADO / (2 * mw)) * w,
    escalaY: (LADO / (2 * mh)) * h
  };
}

function construirParches() {
  capa.innerHTML = '';
  for (const e of entradas) {
    const p = e.entidad.getPosition();
    const s = aPantalla(p.x, p.y);
    const caja = document.createElement('div');
    caja.className = 'muestra';
    caja.style.left = `${s.x - s.escalaX / 2}px`;
    caja.style.top = `${s.y - s.escalaY / 2}px`;
    caja.style.width = `${s.escalaX}px`;
    caja.style.height = `${s.escalaY}px`;

    if (e.origen) {
      const [ox, oy, ow, oh] = e.origen;
      const parche = document.createElement('div');
      parche.className = 'parche';
      /*
       * El recorte se CENTRA en la zona que se midio. Sin esto se ve la
       * esquina de arriba a la izquierda del rectangulo, que muchas veces
       * cae sobre otra cosa: el primer intento mostraba un auto en el
       * casillero del asfalto.
       */
      const anchoCaja = s.escalaX / 2;
      const escala = Math.max(anchoCaja / ow, s.escalaY / oh, 1);
      const cx = (ox + ow / 2) * escala - anchoCaja / 2;
      const cy = (oy + oh / 2) * escala - s.escalaY / 2;
      parche.style.backgroundImage = `url(${referenciaURL})`;
      parche.style.backgroundSize = `${1536 * escala}px ${1024 * escala}px`;
      parche.style.backgroundPosition = `${-cx}px ${-cy}px`;
      caja.appendChild(parche);
    } else {
      const falta = document.createElement('div');
      falta.className = 'parche sin-parche';
      falta.textContent = sinParche(e.familia);
      caja.appendChild(falta);
    }

    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta';
    etiqueta.textContent = e.nombre;
    caja.appendChild(etiqueta);
    capa.appendChild(caja);
  }
}

/* =========================================================================
   LA TABLA DE LA DERECHA
   ========================================================================= */

const hex = (c) => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

function construirTabla() {
  const cont = document.getElementById('tabla');
  let familiaActual = '';
  let html = '';
  for (const e of entradas) {
    if (e.familia !== familiaActual) {
      familiaActual = e.familia;
      html += `<h2>${familiaActual}</h2>`;
    }
    const l = luminancia(e.color);
    const s = saturacion(e.color);
    html += `<div class="fila">
      <i style="background:${hex(e.color)}"></i>
      <b>${e.nombre}</b>
      <code>${hex(e.color)}</code>
      <em>lum ${l.toFixed(2)} · sat ${s.toFixed(2)}</em>
    </div>`;
  }
  cont.innerHTML = html;
}

/* =========================================================================
   MODO ESCALA
   =========================================================================
   Lo otro que hacia la escena vieja y hay que seguir teniendo: una puerta de
   2,10 al lado de las alturas del juego. Sin esto, un Gus de dos metros y
   medio visto desde arriba parece correcto. */

const escala = new pc.Entity('Escala');
app.root.addChild(escala);
escala.enabled = false;

/** Las alturas que el juego tiene que respetar. Si una no cierra, se ve aca. */
const ALTURAS = [
  { nombre: 'puerta', alto: 2.1, color: FACHADA.ladrillo },
  { nombre: 'Gus', alto: 1.8, color: GUS.cuero },
  { nombre: 'zombi', alto: 1.72, color: ZOMBI.camisa },
  { nombre: 'auto', alto: 1.45, color: VEHICULO.rojo },
  { nombre: 'cordon', alto: 0.15, color: CALLE.cordon }
];

const SEPARACION_BARRAS = 1.3;
const ALTO_REGLA = 2.6;
const ANCHO_REGLA = ALTURAS.length * SEPARACION_BARRAS + 1.4;

/*
 * Un fondo con una raya cada medio metro, y las de metro entero marcadas.
 *
 * Sin la regla esta vista no mide nada: cuatro barras sueltas en el aire se
 * ven "mas o menos bien" siempre. Con la regla puesta, que el auto llegue a
 * 1,45 y no a 1,60 es algo que SE VE, que es para lo que existe el banco.
 */
const fondo = new pc.Entity('Fondo');
const matFondo = new pc.StandardMaterial();
matFondo.diffuse = col(CALLE.asfalto);
matFondo.update();
fondo.addComponent('render', { type: 'plane', material: matFondo });
fondo.setLocalScale(ANCHO_REGLA, 1, ALTO_REGLA + 0.4);
fondo.setEulerAngles(90, 0, 0);
fondo.setPosition(0, (ALTO_REGLA + 0.4) / 2 - 0.2, -0.4);
escala.addChild(fondo);

const matRaya = new pc.StandardMaterial();
matRaya.diffuse = col(CALLE.vereda);
matRaya.update();
const matMetro = new pc.StandardMaterial();
matMetro.diffuse = col(CARTEL.toldo);
matMetro.update();

for (let i = 0; i <= ALTO_REGLA * 2; i++) {
  const y = i * 0.5;
  const entero = i % 2 === 0;
  const r = new pc.Entity(`Regla_${y}`);
  r.addComponent('render', { type: 'plane', material: entero ? matMetro : matRaya });
  r.setLocalScale(ANCHO_REGLA, 1, entero ? 0.022 : 0.01);
  r.setEulerAngles(90, 0, 0);
  r.setPosition(0, y, -0.35);
  escala.addChild(r);
}

const inicioBarras = -((ALTURAS.length - 1) * SEPARACION_BARRAS) / 2;
ALTURAS.forEach((a, i) => {
  const e = new pc.Entity(a.nombre);
  const m = new pc.StandardMaterial();
  m.diffuse = col(a.color);
  m.gloss = 0.25;
  m.metalness = 0;
  m.useMetalness = true;
  m.update();
  /*
   * Sin sombras: en una vista de medir, una sombra proyectada sobre la
   * regla tapa justo las rayas que hay que leer.
   */
  e.addComponent('render', { type: 'box', material: m, castShadows: false });
  e.setLocalScale(0.46, a.alto, 0.46);
  e.setPosition(inicioBarras + i * SEPARACION_BARRAS, a.alto / 2, 0);
  escala.addChild(e);
  a.entidad = e;
});

/** Las cotas van en HTML: el motor no dibuja texto y no vale la pena montarlo. */
function construirCotas() {
  capa.innerHTML = '';
  for (const a of ALTURAS) {
    const p = a.entidad.getPosition();
    const s = aPantalla(p.x, a.alto + 0.2);
    const d = document.createElement('div');
    d.className = 'cota';
    d.style.left = `${s.x}px`;
    d.style.top = `${s.y}px`;
    d.innerHTML = `<b>${a.nombre}</b><span>${a.alto.toFixed(2).replace('.', ',')} m</span>`;
    capa.appendChild(d);
  }
}

/* =========================================================================
   MODOS Y TECLAS
   ========================================================================= */

let modo = 'muestras';
let solMedido = false;

function aplicarModo() {
  const esMuestras = modo === 'muestras';
  for (const e of entradas) e.entidad.enabled = esMuestras;
  escala.enabled = !esMuestras;
  capa.style.display = esMuestras ? 'block' : 'none';

  if (esMuestras) {
    encuadrar();
    construirParches();
  } else {
    // Tiene que entrar de alto Y de ancho: la primera version solo miraba el
    // alto y las barras de los costados quedaban afuera.
    encuadrarEn(ANCHO_REGLA + 0.4, ALTO_REGLA + 0.5, { x: 0, y: (ALTO_REGLA + 0.3) / 2 });
    // Las cotas tambien van en la capa de arriba, asi que se vuelve a mostrar.
    capa.style.display = 'block';
    construirCotas();
  }
  document.getElementById('modo').textContent =
    esMuestras ? 'muestras contra la referencia' : 'escala';
}

function aplicarSol() {
  sol.light.color = col(solMedido ? SOL_MEDIDO : SOL);
  document.getElementById('sol').textContent = solMedido
    ? 'el medido en la referencia (tarde dorada)'
    : 'el del juego (D-25: alto y calido)';
}

addEventListener('keydown', (ev) => {
  const k = ev.key.toLowerCase();
  if (k === 'e') { modo = modo === 'muestras' ? 'escala' : 'muestras'; aplicarModo(); }
  if (k === 'm') { solMedido = !solMedido; aplicarSol(); }
  if (k === 'h') {
    const p = document.getElementById('panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
    // Cambio el espacio libre, asi que hay que volver a encuadrar.
    aplicarModo();
  }
});

addEventListener('resize', () => {
  if (modo === 'muestras') {
    encuadrar();
    construirParches();
  } else {
    construirCotas();
  }
});

montarPostProceso(app, camara, sol);

/*
 * Una sola cascada, y DESPUES del post-proceso.
 *
 * Las cascadas parten el frustum por profundidad para dar mas resolucion
 * cerca, y eso solo tiene sentido con perspectiva: con una camara
 * ortografica el motor avisa por consola que el resultado va a estar mal.
 * Va despues porque `aplicarCalidad` las vuelve a poner en 2 o 3.
 */
sol.light.numCascades = 1;

construirTabla();
aplicarModo();
aplicarSol();
