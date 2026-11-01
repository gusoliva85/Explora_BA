import * as pc from 'playcanvas';
import { CARTEL, FACHADA, CALLE } from './paleta.js';

/**
 * ===========================================================================
 * CARTELERIA — las letras
 * ===========================================================================
 * Fase 12R, tarea 12R.5.
 *
 * ---------------------------------------------------------------------------
 * LA UNICA TEXTURA DEL JUEGO, Y POR QUE VALE LA PENA
 * ---------------------------------------------------------------------------
 * La decision de no usar texturas (12.A) sigue en pie para todo lo demas: el
 * juego se abre desde un enlace en el celular y cada kilobyte es tiempo antes
 * de poder jugar.
 *
 * Los carteles son la excepcion, por dos motivos:
 *
 *  1. **No se descarga nada.** Las texturas se dibujan en un canvas en el
 *     navegador, al arrancar. Pesan cero en la red.
 *  2. **Un cartel sin letras no es un cartel**, es un rectangulo de color. Y
 *     la mitad de lo que hace que una calle se lea como porteña son las
 *     letras: "FARMACIA", "LA ESQUINA", el nombre de la calle en la esquina.
 *
 * ---------------------------------------------------------------------------
 * EL TAMAÑO LO DECIDE LA LEGIBILIDAD, NO EL GUSTO
 * ---------------------------------------------------------------------------
 * A la distancia a la que se ve un cartel, con la camara del juego, un cartel
 * de 0,58 m de alto ocupa unos **8 pixeles** en pantalla a 25 m y unos 16 a
 * 10 m. El texto adentro seria la mitad: ilegible.
 *
 * Por eso la banda del cartel se agranda a 0,95 m y el texto ocupa casi todo
 * el alto. Es mas grande de lo que seria en la calle real, y es a proposito:
 * un cartel que no se puede leer no cumple ninguna funcion.
 */

/** Comercios de barrio. Ficticios, sin ninguna marca real. */
export const COMERCIOS = [
  { texto: 'LA ESQUINA', fondo: CARTEL.rojo },
  { texto: 'FARMACIA', fondo: CARTEL.verde },
  { texto: 'KIOSCO', fondo: CARTEL.rojo },
  { texto: 'PANADERIA', fondo: CARTEL.toldo },
  { texto: 'VERDULERIA', fondo: CARTEL.verde },
  { texto: 'FERRETERIA', fondo: FACHADA.metal_oscuro },
  { texto: 'ALMACEN', fondo: CARTEL.rojo },
  { texto: 'CARNICERIA', fondo: CARTEL.rojo },
  { texto: 'PIZZERIA', fondo: CARTEL.verde },
  { texto: 'LAVADERO', fondo: FACHADA.metal_oscuro },
  { texto: 'ZAPATERIA', fondo: CARTEL.toldo },
  { texto: 'LOCUTORIO', fondo: CARTEL.verde },
  { texto: 'PARRILLA', fondo: CARTEL.rojo },
  { texto: 'MERCERIA', fondo: FACHADA.metal_oscuro }
];

const hex = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;

/** Cache de materiales: el mismo cartel no se genera dos veces. */
const cache = new Map();

/**
 * Textura con texto, dibujada en un canvas.
 *
 * @param {pc.AppBase} app
 * @param {object} o
 * @param {string} o.texto
 * @param {number[]} o.fondo
 * @param {number[]} o.tinta
 * @param {number} o.relacion ancho / alto del cartel, para que no se estire
 */
export function texturaDeTexto(app, { texto, fondo, tinta, relacion = 8 }) {
  const alto = 64;
  const ancho = Math.round(alto * relacion);

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');

  ctx.fillStyle = hex(fondo);
  ctx.fillRect(0, 0, ancho, alto);

  /*
   * Un filete claro arriba y abajo. Es lo que tienen los carteles de chapa de
   * verdad, y ademas le pone un borde a la banda para que no se funda con la
   * fachada cuando el color es parecido.
   */
  ctx.fillStyle = hex(tinta);
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 2, ancho, 1.5);
  ctx.fillRect(0, alto - 3.5, ancho, 1.5);
  ctx.globalAlpha = 1;

  /*
   * El texto ocupa el 62 % del alto. Mas grande se come el filete; mas chico
   * deja de leerse en el telefono, que es el unico lugar donde esto importa.
   */
  ctx.font = `700 ${Math.round(alto * 0.62)}px "Arial Narrow", Impact, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Una sombra corta: despega la letra del fondo sin dibujar un contorno.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText(texto, ancho / 2 + 1.5, alto / 2 + 2);
  ctx.fillStyle = hex(tinta);
  ctx.fillText(texto, ancho / 2, alto / 2);

  const textura = new pc.Texture(app.graphicsDevice, {
    width: ancho,
    height: alto,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: true,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    anisotropy: 8
  });
  textura.setSource(lienzo);
  return textura;
}

/**
 * Material de cartel, con su texto.
 *
 * Es mate y recibe luz como cualquier otra superficie: un cartel pintado no
 * brilla solo. Lo unico que lo distingue es que su color viene de la textura.
 */
export function materialDeCartel(app, { texto, fondo, tinta = CARTEL.letra, relacion = 8 }) {
  const clave = `${texto}|${fondo.join(',')}|${relacion.toFixed(1)}`;
  let m = cache.get(clave);
  if (m) return m;

  m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(1, 1, 1);
  m.diffuseMap = texturaDeTexto(app, { texto, fondo, tinta, relacion });
  m.gloss = 0.12;
  m.metalness = 0;
  m.useMetalness = true;
  m.update();
  cache.set(clave, m);
  return m;
}

/** Material para la chapa de nombre de calle: fondo azul y letra blanca. */
export function materialDeCalle(app, nombre) {
  return materialDeCartel(app, {
    texto: nombre.toUpperCase(),
    fondo: [0.12, 0.2, 0.42],
    tinta: [0.95, 0.95, 0.93],
    relacion: 5
  });
}

/** Se vacia al reconstruir el mundo, como la cache de materiales. */
export function limpiarCache() {
  for (const m of cache.values()) {
    if (m.diffuseMap) m.diffuseMap.destroy();
    m.destroy();
  }
  cache.clear();
}

/** El alto de la banda del cartel. Ver la nota de legibilidad de arriba. */
export const ALTO_CARTEL = 0.95;

/** Colores de la chapa de calle, expuestos para las pruebas. */
export const CHAPA_CALLE = { fondo: [0.12, 0.2, 0.42], tinta: [0.95, 0.95, 0.93] };

/** Para que el kit pueda pedir el color del hormigon sin importar la paleta. */
export const POSTE = CALLE.hormigon;
