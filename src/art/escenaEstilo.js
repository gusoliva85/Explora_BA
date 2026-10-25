import * as pc from 'playcanvas';
import { COLORS, ACABADO, Materiales } from '../world/palette.js';
import {
  FAMILIAS,
  ESCALONES,
  tono,
  ESCALA,
  luminancia,
  saturacion
} from './styleGuide.js';
import { UNITS } from '../config/balance.js';

/**
 * ===========================================================================
 * ESCENA DE PRUEBA DE ESTILO — TAREA 12.2
 * ===========================================================================
 * Una escena aparte, fuera del juego, donde se ven juntos una fachada, una
 * vereda, Gus, un zombi y un objeto. Se abre en `estilo.html`.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO ALCANZA CON MIRAR EL JUEGO
 * ---------------------------------------------------------------------------
 * En el juego la cámara está a veinte metros y a 57 grados. Desde ahí se ve
 * si algo se LEE, que es lo que importa jugando, pero no se ve si las
 * proporciones están bien: un Gus de dos metros y medio al lado de una
 * puerta de dos diez, desde arriba, parece correcto.
 *
 * Acá la cámara mira de frente y casi sin perspectiva, con una puerta de
 * 2,10 m parada al lado de cada personaje. Es la única vista en la que un
 * error de escala salta a la vista, y es la pregunta número 1 de la prueba
 * de la fase: *"¿Gus al lado de una puerta se ve creíble?"*.
 *
 * También están las rampas de color, para poder comprobar de un vistazo lo
 * que las pruebas comprueban con números: que los escalones se separan.
 */

/** Alto de la regla de referencia, en metros. */
const REGLA = 3;

export function montarEscenaEstilo(app) {
  const mats = new Materiales();
  const raiz = new pc.Entity('Estilo');
  app.root.addChild(raiz);

  const caja = (nombre, color, acabado, escala, pos, padre = raiz) => {
    const e = new pc.Entity(nombre);
    e.addComponent('render', {
      type: 'box',
      material: mats.get(color, acabado),
      castShadows: true
    });
    e.setLocalScale(escala[0], escala[1], escala[2]);
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    padre.addChild(e);
    return e;
  };

  // =========================================================================
  // 1. EL SUELO: asfalto, cordon y vereda, que se tocan entre si
  // =========================================================================
  /*
   * Es la regla numero uno de la paleta puesta a la vista: tres superficies
   * que se tocan y tienen que separarse SOLAS, sin una linea que las
   * divida. Si alguna vez se funden, se ve acá antes que en el juego.
   */
  caja('Asfalto', COLORS.asphalt, ACABADO.asfalto, [30, 0.1, 6], [0, -0.05, 4]);
  caja('Cordon', COLORS.curb, ACABADO.vereda, [30, UNITS.curbHeight, 0.4], [0, 0.075, 0.8]);
  caja('Vereda', COLORS.sidewalk, ACABADO.vereda, [30, UNITS.curbHeight, 4], [0, 0.075, -1.4]);

  // =========================================================================
  // 2. LA FACHADA, con la puerta que es LA referencia de escala
  // =========================================================================
  const fachada = new pc.Entity('Fachada');
  fachada.setLocalPosition(0, 0, -3.6);
  raiz.addChild(fachada);

  caja('Muro', COLORS.facade[0], ACABADO.revoque, [14, 9, 0.4], [0, 4.5, 0], fachada);
  // Zocalo: siempre mas oscuro que la fachada, para que la planta baja se
  // separe del resto aunque no haya sombra.
  caja('Zocalo', COLORS.plinth, ACABADO.revoque, [14, 1.1, 0.46], [0, 0.55, 0.03], fachada);

  // La puerta. 2,10 m exactos: todo lo demas se mide contra esto.
  caja('Puerta', COLORS.wood, ACABADO.madera, [1.1, UNITS.doorHeight, 0.1], [
    -4,
    UNITS.doorHeight / 2,
    0.24
  ], fachada);
  caja('Dintel', COLORS.plinth, ACABADO.revoque, [1.4, 0.14, 0.16], [
    -4,
    UNITS.doorHeight + 0.07,
    0.25
  ], fachada);

  // Persiana metalica: una de las dos unicas superficies con brillo.
  caja('Persiana', COLORS.shutter, ACABADO.persiana, [3.2, 2.3, 0.12], [1.2, 1.15, 0.24], fachada);

  // Ventana con balcon, para ver la escala de un piso (3 m).
  caja('Ventana', COLORS.glass, ACABADO.vidrio, [1.2, 1.5, 0.1], [-1.2, 4.4, 0.22], fachada);
  caja('Balcon', COLORS.balcony, ACABADO.metal, [1.8, 0.1, 0.7], [-1.2, 3.6, 0.5], fachada);
  caja('Baranda', COLORS.balcony, ACABADO.metal, [1.8, 0.9, 0.06], [-1.2, 4.05, 0.82], fachada);

  // Medianera de ladrillo a la vista, al costado.
  caja('Medianera', COLORS.brick, ACABADO.revoque, [0.5, 9, 3.4], [7.2, 4.5, 1.5], fachada);

  // =========================================================================
  // 3. LAS FIGURAS, cada una con su regla de 3 m al lado
  // =========================================================================
  /*
   * La regla es una barra de tres metros con una marca a la altura de la
   * puerta. Mirar una figura sola no dice nada; al lado de una medida
   * conocida, un error de diez centimetros se ve.
   */
  const regla = (x) => {
    const g = new pc.Entity('Regla');
    g.setLocalPosition(x, 0, 0.3);
    raiz.addChild(g);
    caja('Barra', COLORS.paint, ACABADO.pintura, [0.04, REGLA, 0.04], [0, REGLA / 2, 0], g);
    // Marca a la altura de la puerta.
    caja(
      'MarcaPuerta',
      COLORS.checkpoint,
      ACABADO.pintura,
      [0.3, 0.03, 0.06],
      [0.12, UNITS.doorHeight, 0],
      g
    );
    // Marcas cada metro.
    for (let m = 1; m <= REGLA; m++) {
      caja(`M${m}`, COLORS.paint, ACABADO.pintura, [0.16, 0.02, 0.05], [0.07, m, 0], g);
    }
    return g;
  };

  regla(-6);
  regla(-1.6);
  regla(2.8);

  return { raiz, mats, caja, regla };
}

/**
 * Las rampas de color, como muestrario.
 *
 * Una fila por familia, un cubo por escalón. Es lo mismo que comprueban las
 * pruebas con números, pero mirable: si dos escalones vecinos se funden, se
 * ve acá.
 */
export function montarMuestrario(app, mats) {
  const raiz = new pc.Entity('Muestrario');
  raiz.setLocalPosition(0, 0, 9);
  app.root.addChild(raiz);

  const familias = Object.keys(FAMILIAS);
  const ancho = 0.55;
  const alto = 0.55;

  familias.forEach((familia, fila) => {
    ESCALONES.forEach((escalon, col) => {
      const e = new pc.Entity(`${familia}_${escalon}`);
      e.addComponent('render', {
        type: 'box',
        material: mats.get(tono(familia, escalon), ACABADO.revoque),
        castShadows: false
      });
      e.setLocalScale(ancho * 0.92, 0.1, alto * 0.92);
      e.setLocalPosition(
        (col - (ESCALONES.length - 1) / 2) * ancho,
        0.05,
        (fila - (familias.length - 1) / 2) * alto
      );
      raiz.addChild(e);
    });
  });

  return raiz;
}

/**
 * Los datos que la página muestra como texto al costado.
 *
 * Se calculan acá y no en el HTML para que sean los MISMOS números que usan
 * las pruebas: una guía de estilo que se describe a sí misma con valores
 * escritos a mano deja de describir el juego en cuanto alguien cambia algo.
 */
export function datosDelMuestrario() {
  return Object.keys(FAMILIAS).map((familia) => ({
    familia,
    escalones: ESCALONES.map((escalon) => {
      const rgb = tono(familia, escalon);
      return {
        escalon,
        hex: rgbAHex(rgb),
        luz: luminancia(rgb).toFixed(2),
        sat: saturacion(rgb).toFixed(2)
      };
    })
  }));
}

export function rgbAHex(rgb) {
  return (
    '#' +
    rgb
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, c)) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/** Las medidas de referencia, para listarlas al costado de la escena. */
export function medidasDeReferencia() {
  return Object.entries(ESCALA).map(([que, metros]) => ({ que, metros }));
}
