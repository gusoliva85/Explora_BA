import * as pc from 'playcanvas';
import { Materiales, ACABADO, COLORS } from '../../src/world/palette.js';
import { montarLuzAmbiente } from '../../src/world/lighting.js';
import { montarPostProceso } from '../../src/render/postProcess.js';
import { UNITS } from '../../src/config/balance.js';

/**
 * ===========================================================================
 * MOCKUPS DE PERSONAJE
 * ===========================================================================
 * Varias propuestas de Gus y del zombi, una al lado de la otra, para poder
 * ELEGIR antes de implementar.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTA PAGINA EXISTE
 * ---------------------------------------------------------------------------
 * Porque hacerlo al reves salio caro. La Fase 12 se implemento entera —Gus,
 * zombis, armas, objetos— y recien ahi se miro, y no gustaba. Mostrar una
 * imagen cuesta una fraccion de lo que cuesta implementar: cada ajuste
 * sobre el juego arrastra recompilar, medir, correr pruebas y volver a
 * capturar.
 *
 * Asi que esto NO toca el juego. Es una pagina aparte que usa el mismo
 * motor, la misma paleta y el mismo post-proceso —para que los colores y
 * la luz sean los de verdad— y nada mas.
 *
 * ---------------------------------------------------------------------------
 * COMO SE AGREGA UNA PROPUESTA
 * ---------------------------------------------------------------------------
 * Cada figura es un objeto de configuracion al final del archivo. No hay
 * que escribir geometria: se describen proporciones y que rasgos lleva.
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
   PALETA DE LOS PERSONAJES
   ========================================================================
   Sale de mirar la referencia (documentacion/personajes/Gus.jpeg): campera
   de cuero negra con tachas, remera negra, jean azul MEDIO —no azul
   marino— y pelo oscuro en puntas.
   ======================================================================== */
const C = {
  cuero: [0.085, 0.085, 0.1],
  cueroClaro: [0.15, 0.15, 0.18],
  remera: [0.055, 0.055, 0.065],
  jean: [0.26, 0.35, 0.52],
  jeanOscuro: [0.19, 0.26, 0.4],
  piel: [0.78, 0.6, 0.47],
  pelo: [0.11, 0.08, 0.07],
  bota: [0.12, 0.1, 0.09],
  tacha: [0.55, 0.57, 0.6],

  zPiel: [0.55, 0.58, 0.38],
  zPielOscura: [0.42, 0.45, 0.3],
  zRopa: [0.3, 0.33, 0.21],
  zRopaRota: [0.24, 0.26, 0.18]
};

/** Una caja. Todo se construye con esto. */
function caja(padre, color, escala, pos, rot, sombra = false, acabado = ACABADO.tela) {
  const e = new pc.Entity('p');
  e.addComponent('render', {
    type: 'box',
    material: mats.get(color, acabado),
    castShadows: sombra
  });
  e.setLocalScale(escala[0], escala[1], escala[2]);
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  padre.addChild(e);
  return e;
}

/**
 * Construye una figura a partir de su configuracion.
 *
 * La configuracion describe PROPORCIONES y RASGOS, no geometria. Asi se
 * puede proponer una variante cambiando cuatro numeros en vez de escribir
 * un modelo nuevo.
 */
function figura(cfg) {
  const raiz = new pc.Entity(cfg.nombre);

  const m = cfg.medidas;
  const col = cfg.colores;
  const caderaY = m.muslo + m.pantorrilla + 0.1;

  // --- Piernas -------------------------------------------------------------
  for (const lado of [-1, 1]) {
    const x = lado * m.anchoCadera * 0.33;
    caja(raiz, col.pierna, [m.grosorPierna, m.muslo + m.pantorrilla, m.grosorPierna],
      [x, caderaY - (m.muslo + m.pantorrilla) / 2, 0], null, true);
    // Bota
    caja(raiz, col.bota, [m.grosorPierna * 1.1, 0.11, m.grosorPierna * 1.9],
      [x, 0.055, -0.03]);
  }

  /*
   * Cadera, antes del torso.
   *
   * Sin una pieza que una las piernas con el torso, el torso parece
   * apoyado encima de dos palos: se ve una caja flotando. Es chica y no se
   * nota, pero su ausencia si.
   */
  caja(raiz, col.pierna, [m.anchoCadera, 0.18, m.fondoTorso * 0.78],
    [0, caderaY - 0.04, 0], null, true);

  // --- Torso ---------------------------------------------------------------
  const torsoY = caderaY + m.torso / 2;

  if (cfg.camperaAbierta) {
    /*
     * CAMPERA ABIERTA, como en la referencia.
     *
     * Es el rasgo que mas cambia la silueta de frente: dos paneles de
     * cuero a los costados y una V de remera negra en el medio. Cerrada,
     * el torso es un bloque liso y Gus se vuelve una mancha.
     */
    caja(raiz, col.remera, [m.anchoTorso * 0.62, m.torso, m.fondoTorso * 0.8],
      [0, torsoY, 0], null, true);
    for (const lado of [-1, 1]) {
      // Panel de cuero, un poco separado del cuerpo.
      caja(raiz, col.cuero, [m.anchoTorso * 0.34, m.torso, m.fondoTorso],
        [lado * m.anchoTorso * 0.33, torsoY, 0], null, true);
      // Solapa doblada hacia afuera, en diagonal.
      caja(raiz, col.cueroClaro, [m.anchoTorso * 0.2, m.torso * 0.55, m.fondoTorso * 0.3],
        [lado * m.anchoTorso * 0.22, torsoY + m.torso * 0.2, -m.fondoTorso * 0.42],
        [0, 0, lado * -26]);
      // Tachas del hombro.
      if (cfg.tachas) {
        caja(raiz, col.tacha, [0.035, 0.035, 0.035],
          [lado * m.anchoTorso * 0.3, torsoY + m.torso * 0.44, -m.fondoTorso * 0.3]);
      }
    }
  } else {
    caja(raiz, col.cuero, [m.anchoTorso, m.torso, m.fondoTorso], [0, torsoY, 0], null, true);
  }

  // --- Hombros -------------------------------------------------------------
  const hombroY = caderaY + m.torso * 0.92;
  caja(raiz, col.cuero, [m.anchoHombros, 0.13, m.fondoTorso], [0, hombroY, 0], null, true);

  // --- Brazos --------------------------------------------------------------
  for (const lado of [-1, 1]) {
    /*
     * El brazo va por FUERA del torso, no encima.
     *
     * La primera version lo ponia a `anchoHombros/2 - grosor*0.4`, que con
     * los paneles de la campera abierta lo dejaba enterrado adentro: las
     * figuras se veian sin brazos.
     */
    const x = lado * (m.anchoHombros / 2 + m.grosorBrazo * 0.12);
    const largo = m.brazo + m.antebrazo;
    caja(raiz, col.cuero, [m.grosorBrazo, largo, m.grosorBrazo],
      [x, hombroY - largo / 2, cfg.brazosAdelante ? -0.1 : 0],
      cfg.brazosAdelante ? [cfg.brazosAdelante, 0, 0] : [0, 0, lado * -3], true);
  }

  // --- Cabeza --------------------------------------------------------------
  const cabezaY = hombroY + 0.06 + m.cabeza / 2;
  caja(raiz, col.piel, [m.cabeza * 0.86, m.cabeza, m.cabeza * 0.9],
    [0, cabezaY, 0], cfg.cabezaInclinada ? [cfg.cabezaInclinada, 0, 12] : null, true);

  // --- Pelo ----------------------------------------------------------------
  if (cfg.pelo === 'puntas') {
    /*
     * PELO EN PUNTAS, como en la referencia.
     *
     * Son cuatro cuñas inclinadas hacia arriba y adelante en vez de un
     * bloque. A la distancia de camara no se distinguen las puntas una por
     * una: lo que se ve es un contorno dentado que ningun zombi tiene, y
     * eso es exactamente lo que tiene que hacer.
     */
    const baseY = cabezaY + m.cabeza * 0.44;
    caja(raiz, col.pelo, [m.cabeza * 0.9, m.cabeza * 0.26, m.cabeza * 0.94], [0, baseY, 0]);
    const puntas = [
      [-0.055, 0.055, -0.02, 22, -14],
      [0.0, 0.075, -0.03, 30, 0],
      [0.055, 0.06, -0.01, 24, 13],
      [-0.015, 0.05, 0.045, -16, 6]
    ];
    for (const [px, py, pz, rx, rz] of puntas) {
      caja(raiz, col.pelo, [m.cabeza * 0.3, m.cabeza * 0.42, m.cabeza * 0.26],
        [px * (m.cabeza / 0.21), baseY + py * (m.cabeza / 0.21), pz * (m.cabeza / 0.21)],
        [rx, 0, rz]);
    }
  } else if (cfg.pelo === 'bloque') {
    caja(raiz, col.pelo, [m.cabeza * 1.1, m.cabeza * 0.6, m.cabeza * 1.1],
      [0, cabezaY + m.cabeza * 0.5, 0]);
  } else if (cfg.pelo === 'rala') {
    // Zombi: mechones sueltos, cuero cabelludo a la vista.
    for (const [px, pz] of [[-0.05, -0.02], [0.04, 0.03], [0.0, -0.06]]) {
      caja(raiz, col.pelo, [0.07, 0.09, 0.07], [px, cabezaY + m.cabeza * 0.5, pz], [12, 0, 18]);
    }
  }

  return raiz;
}

/* ========================================================================
   LAS PROPUESTAS
   ======================================================================== */

const MEDIDAS_BASE = {
  torso: 0.54, cabeza: 0.21, muslo: 0.44, pantorrilla: 0.4,
  brazo: 0.3, antebrazo: 0.28, anchoHombros: 0.52, anchoTorso: 0.44,
  fondoTorso: 0.3, grosorBrazo: 0.12, grosorPierna: 0.14, anchoCadera: 0.32
};

const COLORES_GUS = {
  cuero: C.cuero, cueroClaro: C.cueroClaro, remera: C.remera,
  pierna: C.jean, bota: C.bota, piel: C.piel, pelo: C.pelo, tacha: C.tacha
};

const GUS = [
  {
    nombre: 'A — lo que hay hoy',
    detalle: 'Campera cerrada, pelo en bloque, jean azul oscuro.',
    medidas: MEDIDAS_BASE,
    colores: { ...COLORES_GUS, pierna: [0.19, 0.24, 0.34] },
    camperaAbierta: false,
    pelo: 'bloque'
  },
  {
    nombre: 'B — fiel a la foto',
    detalle: 'Campera ABIERTA con solapas y tachas, pelo en puntas, jean azul medio.',
    medidas: MEDIDAS_BASE,
    colores: COLORES_GUS,
    camperaAbierta: true,
    tachas: true,
    pelo: 'puntas'
  },
  {
    nombre: 'C — silueta exagerada',
    detalle: 'Hombros más anchos y pelo más alto. Se lee de más lejos, menos fiel de cerca.',
    medidas: { ...MEDIDAS_BASE, anchoHombros: 0.64, anchoTorso: 0.5, cabeza: 0.23 },
    colores: COLORES_GUS,
    camperaAbierta: true,
    tachas: true,
    pelo: 'puntas'
  },
  {
    nombre: 'D — cabezón',
    detalle: 'Cabeza grande y cuerpo corto, como los juegos móviles cenitales.',
    medidas: {
      ...MEDIDAS_BASE,
      cabeza: 0.34, torso: 0.46, muslo: 0.34, pantorrilla: 0.3,
      brazo: 0.24, antebrazo: 0.22, anchoHombros: 0.46, anchoTorso: 0.4
    },
    colores: COLORES_GUS,
    camperaAbierta: true,
    pelo: 'puntas'
  }
];

const COLORES_Z = {
  cuero: C.zRopa, cueroClaro: C.zRopaRota, remera: C.zRopaRota,
  pierna: C.zRopa, bota: [0.16, 0.15, 0.12], piel: C.zPiel, pelo: C.zPielOscura,
  tacha: C.tacha
};

const ZOMBIS = [
  {
    nombre: 'A — lo que hay hoy',
    detalle: 'Mismo cuerpo que Gus, encorvado, en verde.',
    medidas: { ...MEDIDAS_BASE, anchoHombros: 0.38, torso: 0.5 },
    colores: COLORES_Z,
    camperaAbierta: false,
    pelo: 'bloque',
    brazosAdelante: 74,
    cabezaInclinada: -16
  },
  {
    nombre: 'B — más roto',
    detalle: 'Hombros caídos, brazos largos, ropa desgarrada, pelo ralo.',
    medidas: {
      ...MEDIDAS_BASE,
      anchoHombros: 0.34, anchoTorso: 0.36, torso: 0.48,
      brazo: 0.36, antebrazo: 0.34, grosorBrazo: 0.1,
      muslo: 0.4, pantorrilla: 0.36
    },
    colores: COLORES_Z,
    camperaAbierta: true,
    pelo: 'rala',
    brazosAdelante: 82,
    cabezaInclinada: -24
  },
  {
    nombre: 'C — flaco y alto',
    detalle: 'Más alto que Gus pero mucho más angosto. Amenaza por tamaño.',
    medidas: {
      ...MEDIDAS_BASE,
      anchoHombros: 0.3, anchoTorso: 0.3, fondoTorso: 0.24,
      torso: 0.58, muslo: 0.5, pantorrilla: 0.46,
      brazo: 0.38, antebrazo: 0.36, grosorBrazo: 0.09, grosorPierna: 0.11,
      cabeza: 0.19
    },
    colores: COLORES_Z,
    camperaAbierta: false,
    pelo: 'rala',
    brazosAdelante: 78,
    cabezaInclinada: -20
  }
];

/* ========================================================================
   ESCENA
   ======================================================================== */

const SEPARACION = 1.5;
const grupoGus = new pc.Entity('Gus');
const grupoZombis = new pc.Entity('Zombis');
app.root.addChild(grupoGus);
app.root.addChild(grupoZombis);
grupoZombis.enabled = false;

function montar(lista, grupo) {
  lista.forEach((cfg, i) => {
    const f = figura(cfg);
    f.setLocalPosition((i - (lista.length - 1) / 2) * SEPARACION, 0, 0);
    // De frente a la camara: el frente de los modelos es -Z.
    f.setLocalEulerAngles(0, 180, 0);
    grupo.addChild(f);
  });
}
montar(GUS, grupoGus);
montar(ZOMBIS, grupoZombis);

// Piso.
caja(app.root, COLORS.sidewalk, [26, 0.12, 7], [0, -0.06, 0], null, false, ACABADO.vereda);

/*
 * La referencia de escala es un MARCO de puerta, no una pared.
 *
 * La primera version ponia una fachada entera al costado: ocupaba un
 * cuarto de la imagen y el ojo se iba ahi en vez de a las figuras, que es
 * lo unico que hay que mirar. Un marco de 2,10 m dice lo mismo y no
 * compite.
 */
const refX = -(GUS.length / 2) * SEPARACION - 0.75;
for (const lado of [-1, 1]) {
  caja(app.root, COLORS.wood, [0.07, UNITS.doorHeight, 0.1],
    [refX + lado * 0.45, UNITS.doorHeight / 2, 0.5], null, false, ACABADO.madera);
}
caja(app.root, COLORS.wood, [0.97, 0.09, 0.1],
  [refX, UNITS.doorHeight + 0.045, 0.5], null, false, ACABADO.madera);

// --- Cámara ---------------------------------------------------------------
const camara = new pc.Entity('Camara');
camara.addComponent('camera', {
  clearColor: new pc.Color(0.06, 0.07, 0.09),
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 1.6,
  farClip: 200
});
app.root.addChild(camara);
montarPostProceso(app, camara, sol);
// Una sola cascada: las cascadas no funcionan con cámara ortográfica.
sol.light.numCascades = 1;

/*
 * Dos vistas, y las dos hacen falta.
 *
 * La de FICHA es casi de frente: sirve para juzgar la forma, los colores y
 * la escala contra la puerta.
 *
 * La de CAMARA DEL JUEGO está a 57 grados, que es desde donde se lo va a
 * ver de verdad. Una figura puede verse preciosa de frente y ser una
 * mancha desde arriba: esa es la vista que decide.
 */
const VISTAS = {
  // `zoom` es cuanto mundo entra a lo alto. Tiene que entrar la figura
  // entera MAS la puerta de referencia, que mide 2,10.
  ficha: { pitch: 12, zoom: 2.4, alto: 1.15 },
  juego: { pitch: 57, zoom: 2.9, alto: 1.0 }
};
const vista = { nombre: 'ficha', giro: 0 };

function colocarCamara() {
  const v = VISTAS[vista.nombre];
  const yaw = (vista.giro * Math.PI) / 180;
  const pitch = (v.pitch * Math.PI) / 180;
  const d = 30;
  const objetivo = new pc.Vec3(0, v.alto, 0);
  camara.setPosition(
    objetivo.x + Math.sin(yaw) * Math.cos(pitch) * d,
    objetivo.y + Math.sin(pitch) * d,
    objetivo.z + Math.cos(yaw) * Math.cos(pitch) * d
  );
  camara.lookAt(objetivo);
  camara.camera.orthoHeight = v.zoom;
}
colocarCamara();

// --- Etiquetas -------------------------------------------------------------
const etiquetas = document.getElementById('etiquetas');
function pintarEtiquetas(lista) {
  etiquetas.replaceChildren();
  for (const cfg of lista) {
    const d = document.createElement('div');
    d.className = 'etiqueta';
    const b = document.createElement('b');
    b.textContent = cfg.nombre;
    const s = document.createElement('span');
    s.textContent = cfg.detalle;
    d.append(b, s);
    etiquetas.append(d);
  }
}
pintarEtiquetas(GUS);

const subtitulo = document.getElementById('subtitulo');
function refrescarSubtitulo() {
  const quien = grupoZombis.enabled ? 'Zombis' : 'Gus';
  const comoSeVe = vista.nombre === 'juego' ? 'cámara del juego, 57°' : 'vista de ficha';
  subtitulo.textContent = `${quien} · ${comoSeVe} · la puerta mide 2,10 m`;
}
refrescarSubtitulo();

addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') vista.giro -= 10;
  else if (e.code === 'ArrowRight') vista.giro += 10;
  else if (e.code === 'ArrowUp') VISTAS[vista.nombre].zoom = Math.max(0.6, VISTAS[vista.nombre].zoom - 0.2);
  else if (e.code === 'ArrowDown') VISTAS[vista.nombre].zoom = Math.min(5, VISTAS[vista.nombre].zoom + 0.2);
  else if (e.code === 'KeyZ') {
    const zombis = !grupoZombis.enabled;
    grupoZombis.enabled = zombis;
    grupoGus.enabled = !zombis;
    pintarEtiquetas(zombis ? ZOMBIS : GUS);
  } else if (e.code === 'KeyC') {
    vista.nombre = vista.nombre === 'ficha' ? 'juego' : 'ficha';
  } else return;
  colocarCamara();
  refrescarSubtitulo();
  e.preventDefault();
});

globalThis.mockup = { app, vista, colocarCamara, grupoGus, grupoZombis, pintarEtiquetas, GUS, ZOMBIS };
