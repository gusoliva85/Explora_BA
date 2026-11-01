import * as pc from 'playcanvas';
import { SOL, CIELO, HORIZONTE, REBOTE } from './paleta.js';
import { anguloDeElevacion } from './angulos.js';

/**
 * ===========================================================================
 * ESCENA — LUZ, CIELO Y AIRE
 * ===========================================================================
 * Fase 12R, tarea 12R.2. Reemplaza la parte de luz de `src/world/lighting.js`.
 *
 * ---------------------------------------------------------------------------
 * QUE PROBLEMA RESUELVE
 * ---------------------------------------------------------------------------
 * El banco visual de 12R.0 dejo algo a la vista: puesto al lado de la
 * referencia, **todo el lado del juego se veia mas rosado**. No era la paleta,
 * que esta medida: era la luz.
 *
 * Habia un sol calido y un relleno ambiente parejo, y nada mas. Con eso, una
 * cara que mira a la camara recibe sol calido mas relleno calido, y queda
 * rosa. En la referencia esa misma cara recibe **dos luces de temperaturas
 * opuestas**: el sol, calido, y el cielo, frio. Esa diferencia es la que hace
 * que un volumen se lea como volumen y no como una silueta pintada.
 *
 * Asi que acá hay tres luces, y cada una tiene un trabajo:
 *
 *   1. **El sol.** Calido, alto, con sombras. Es el que dibuja.
 *   2. **El cielo.** Frio, desde arriba y del lado contrario al sol, sin
 *      sombras. Es el que rellena y el que enfria las caras que el sol no
 *      toca. Sin esta luz no hay separacion entre el frente y el costado.
 *   3. **El rebote.** Calido y muy debil, desde abajo. Es la vereda
 *      devolviendo luz. Evita que los bajos queden negros.
 *
 * El relleno ambiente se baja a la mitad para hacerles lugar: si queda alto,
 * aplana todo y las tres luces no se notan.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO SE TOCA, Y POR QUE
 * ---------------------------------------------------------------------------
 * **La elevacion del sol: 73 grados.** Viene de D-16 y esta medida: a 58
 * grados un edificio de 17 m tira 11 m de sombra y la calzada mide 10, asi
 * que quedaba tapada entera. La referencia es de tarde dorada y seria mas
 * linda, pero la calle despejada es jugabilidad. D-25 lo cierra: del sol de
 * la referencia se toma el COLOR, no la altura.
 *
 * **El azimut: -24 grados.** Sesgado respecto del eje de la calle y no
 * perpendicular. Cruzado deja franjas regulares que se leen como rayas.
 */

const col = (c) => new pc.Color(c[0], c[1], c[2]);


export const LUZ = {
  /** Ver arriba: esta medido en D-16 y no se discute sin volver a medir. */
  solElevacion: 73,
  solAzimut: -24,
  solIntensidad: 1.7,

  /**
   * El cielo viene de arriba y del lado contrario al sol.
   *
   * No apunta hacia abajo del todo a proposito: si lo hiciera, solo
   * iluminaria las caras horizontales y las paredes seguirian planas.
   */
  cieloElevacion: 55,
  cieloAzimut: 156,
  cieloIntensidad: 0.8,

  /** El rebote del piso: de abajo hacia arriba, flojo. */
  reboteElevacion: -35,
  reboteAzimut: -24,
  reboteIntensidad: 0.18,

  /**
   * Relleno parejo. A la mitad de lo que era: las dos luces nuevas hacen el
   * trabajo que antes hacia esto, y mucho mejor, porque tienen direccion.
   */
  ambienteIntensidad: 0.5,

  /** Hasta donde se calculan sombras. Medido en la Fase 12: mas alla no se nota. */
  sombraDistancia: 60,

  /** Niebla de distancia. Es lo que funde la calle lejana con el cielo. */
  nieblaDensidad: 0.0055
};

/**
 * Cupula de cielo con degrade.
 *
 * Antes el cielo era un color plano, el mismo del horizonte. Un cielo plano
 * se lee como una pared de fondo y le saca profundidad a la calle.
 *
 * El degrade se arma con una textura de 2 x 64 generada acá mismo: no se
 * descarga nada, pesa nada, y es la unica forma barata de tener un cielo que
 * cambie de arriba a abajo sin escribir un shader.
 */
/**
 * @param {number} radio tiene que ser MENOR que el `farClip` de la camara,
 *   o la cupula queda entera detras del plano lejano y no se dibuja nunca.
 *   Paso en el primer intento: 260 contra un farClip de 230.
 */
export function crearCupula(app, radio = 180) {
  const alto = 64;
  const lienzo = document.createElement('canvas');
  lienzo.width = 2;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, alto);
  const hex = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;
  g.addColorStop(0, hex(CIELO));
  // El punto medio va mas cerca del horizonte que del cenit: el cielo real
  // se aclara de golpe en los ultimos grados, no linealmente.
  g.addColorStop(0.72, hex(CIELO.map((v, i) => v + (HORIZONTE[i] - v) * 0.45)));
  g.addColorStop(1, hex(HORIZONTE));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, alto);

  const textura = new pc.Texture(app.graphicsDevice, {
    width: 2,
    height: alto,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: false,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  textura.setSource(lienzo);

  const material = new pc.StandardMaterial();
  /*
   * Sin iluminar: el cielo no recibe luz, ES la luz. La forma de decir eso
   * en PlayCanvas es difuso en negro y el degrade en el canal emisivo.
   *
   * Lo que NO hay que hacer es `useLighting = false`, que fue el primer
   * intento: ademas de la luz apaga el emisivo, y la cupula sale negra.
   */
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissiveMap = textura;
  material.emissive = new pc.Color(1, 1, 1);
  material.cull = pc.CULLFACE_FRONT; // se ve desde adentro
  material.depthWrite = false;
  material.update();

  const cupula = new pc.Entity('Cupula');
  cupula.addComponent('render', {
    type: 'sphere',
    material,
    castShadows: false,
    receiveShadows: false
  });
  cupula.setLocalScale(radio, radio, radio);
  app.root.addChild(cupula);
  return cupula;
}

/**
 * Monta la luz, la niebla y el cielo.
 *
 * @param {pc.AppBase} app
 * @param {object} [opt]
 * @param {boolean} [opt.sombrasDeCalidad] perfil alto o movil
 * @param {boolean} [opt.conCupula] **apagada por defecto, y esta medido.**
 *   Con la camara del juego el borde de ARRIBA de la pantalla todavia mira
 *   10 grados hacia abajo: el cielo no se ve nunca. Solo asomaria 1,4
 *   grados si el jugador inclina la camara hasta el tope, y ahi lo que se
 *   ve es el color del horizonte, que es exactamente el que ya tiene el
 *   fondo. Queda escrita para cuando haga falta (una camara mas baja, una
 *   plaza, una azotea), pero no se paga un dibujado por algo invisible.
 * @returns {{sol: pc.Entity, cielo: pc.Entity, rebote: pc.Entity, cupula: pc.Entity|null}}
 */
export function montarEscena(app, { sombrasDeCalidad = true, conCupula = false } = {}) {
  app.scene.ambientLight = col(CIELO.map((v) => v * LUZ.ambienteIntensidad));
  app.scene.exposure = 1.0;
  app.scene.skyboxIntensity = 0;

  app.scene.fog.type = pc.FOG_EXP2;
  app.scene.fog.color = col(HORIZONTE);
  app.scene.fog.density = LUZ.nieblaDensidad;

  const sol = new pc.Entity('Sol');
  sol.addComponent('light', {
    type: 'directional',
    color: col(SOL),
    intensity: LUZ.solIntensidad,
    castShadows: true,
    /*
     * Cascadas: la camara abarca mucha calle de golpe, asi que una sola
     * resolucion o queda pixelada cerca o se desperdicia lejos.
     */
    numCascades: sombrasDeCalidad ? 3 : 2,
    cascadeDistribution: 0.45,
    shadowDistance: LUZ.sombraDistancia,
    shadowResolution: sombrasDeCalidad ? 2048 : 1024,
    shadowType: pc.SHADOW_PCF3_32F,
    shadowBias: 0.04,
    normalOffsetBias: 0.04,
    /*
     * La sombra no llega a negro: en la realidad el cielo la rellena. Ahora
     * ademas hay una luz de cielo de verdad, asi que esto puede ser un poco
     * mas fuerte que antes sin que la vereda en sombra se vuelva un agujero.
     */
    shadowIntensity: 0.58
  });
  sol.setEulerAngles(anguloDeElevacion(LUZ.solElevacion), LUZ.solAzimut, 0);
  app.root.addChild(sol);

  const cielo = new pc.Entity('Cielo');
  cielo.addComponent('light', {
    type: 'directional',
    color: col(CIELO),
    intensity: LUZ.cieloIntensidad,
    castShadows: false
  });
  cielo.setEulerAngles(anguloDeElevacion(LUZ.cieloElevacion), LUZ.cieloAzimut, 0);
  app.root.addChild(cielo);

  const rebote = new pc.Entity('Rebote');
  rebote.addComponent('light', {
    type: 'directional',
    color: col(REBOTE),
    intensity: LUZ.reboteIntensidad,
    castShadows: false
  });
  rebote.setEulerAngles(anguloDeElevacion(LUZ.reboteElevacion), LUZ.reboteAzimut, 0);
  app.root.addChild(rebote);

  const cupula = conCupula ? crearCupula(app) : null;

  return { sol, cielo, rebote, cupula };
}
