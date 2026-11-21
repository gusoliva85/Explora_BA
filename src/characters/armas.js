import * as pc from 'playcanvas';
import { ACABADO } from '../world/palette.js';

/**
 * ===========================================================================
 * EL ARMA EN LA MANO — FASE 12.D
 * ===========================================================================
 * La pistola en la mano de Gus. **Una, y nada más.**
 *
 * Tenía además el cuchillo, la bazooka, el botiquín y la caja de munición.
 * Se fueron todos en la Fase 16 (D-29, D-32); el cuchillo, el último, en la
 * 16.4.
 *
 * ---------------------------------------------------------------------------
 * LA SILUETA ERA TODO, Y AHORA NO ES NADA
 * ---------------------------------------------------------------------------
 * Este archivo se escribió alrededor de una sola pregunta: a cuarenta
 * píxeles, un arma ocupa ocho, y a esa escala no existe el detalle, sólo el
 * contorno. Así que cada arma estaba diseñada para **no confundirse con las
 * otras dos**: el cuchillo corto y fino, la pistola en L por el
 * guardamonte, la bazooka larguísima. El largo hacía el trabajo.
 *
 * Con un arma sola la pregunta se cae, y conviene decirlo en vez de dejar
 * el razonamiento colgado: **ya no hay contra qué distinguirse**. Lo que
 * sigue valiendo del criterio es la otra mitad, la que no era comparativa:
 * el arma tiene que separarse **del fondo** —de la mano que la sostiene y
 * del asfalto— y eso sí se mide, en `armas.test.js`.
 *
 * Lo que viene después de esto no es un modelo mejor hecho a mano: en la
 * 20.8 Gus elige entre once armas renderizadas del banco y esta pistola de
 * cuatro cajas se reemplaza entera.
 */

/**
 * Colores del arma. Metal oscuro, nunca brillante.
 *
 * Eran seis y quedan dos. `filo` y `madera` eran la hoja y el mango del
 * cuchillo; `tubo` y `boca`, el caño de la bazooka, y sobrevivieron por
 * descuido a la 16.3 porque nadie vuelve a mirar una tabla de colores
 * despues de borrar quien la usaba. Es el mismo tipo de resto que
 * `objetivoAutomatico()`, al reves: codigo que quedo en el lugar correcto
 * sin que nada lo necesite.
 */
export const COLOR_ARMA = {
  /**
   * El lomo de la corredera: **lo único que se ve desde arriba**.
   *
   * Era `0,30 0,31 0,34` y el asfalto es `0,33 0,325 0,315`: **el mismo
   * gris**. Sumado a que el arma medía 3,5 cm de ancho, lo que llegaba a
   * la pantalla era una astilla oscura sobre un fondo del mismo tono — que
   * es, literalmente, la silueta de una hoja de cuchillo.
   *
   * Lo reportó Gus mirando el juego: *"sigue disparando con un cuchillo"*.
   * Y el cuchillo se había borrado en la 16.4: lo que veía era la pistola.
   *
   * Ahora es un gris claro que se separa del asfalto **y** del guante, que
   * son los dos fondos contra los que se la ve.
   */
  metalClaro: [0.58, 0.6, 0.64],
  metal: [0.3, 0.31, 0.34],
  metalOscuro: [0.14, 0.15, 0.17]
};

/**
 * Largo del arma, en metros.
 *
 * Está exagerado respecto de lo real —una pistola de 9 mm mide 19 cm, no
 * 26— por la misma razón que el pelo de Gus: a cuarenta píxeles, lo real no
 * se ve.
 *
 * Sigue siendo una tabla por el mismo motivo que `WEAPONS` en el balance:
 * lo que va a cambiar en la 20.8 es el contenido, no la forma.
 */
export const LARGO = {
  pistola: 0.42
};

/*
 * El acabado era un parametro con `ACABADO.metal` por omision, y el unico
 * que lo pasaba distinto era el mango de madera del cuchillo. Sin cuchillo
 * no hay madera, asi que es una constante y no una opcion.
 */
function pieza(mats, padre, nombre, color, escala, pos, rot = null) {
  const e = new pc.Entity(nombre);
  e.addComponent('render', {
    type: 'box',
    material: mats.get(color, ACABADO.metal),
    // Las armas NO proyectan sombra: son chicas, están en movimiento y su
    // sombra cae dentro de la del brazo. Es una llamada de dibujo por
    // pieza que no cambia nada en pantalla.
    castShadows: false
  });
  e.setLocalScale(escala[0], escala[1], escala[2]);
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  padre.addChild(e);
  return e;
}

/**
 * La pistola: una L.
 *
 * El guardamonte y la culata hacia abajo eran lo que la separaba del
 * cuchillo en silueta. Hoy no la separan de nada, pero son lo que hace que
 * se lea como una pistola y no como un palito corto, que es el otro motivo
 * por el que estaban.
 *
 * Apunta hacia adelante (`-Z`), que es el frente de todos los modelos del
 * proyecto. Ver `core/rumbo.js`.
 */
export function construirPistola(mats) {
  const raiz = new pc.Entity('Pistola');

  /*
   * El arma se diseña **para la vista cenital**, que es la única que existe.
   *
   * La versión anterior era correcta de perfil y no se leía desde arriba:
   * 3,5 cm de ancho por 26 de largo son una astilla, y encima del color del
   * asfalto. La guarda y la culata —lo que la hacía una L— quedan **debajo
   * de la mano** y desde la cámara no se ven nunca.
   *
   * Así que lo que tiene que trabajar es **la planta**: el contorno visto
   * desde arriba. Y para eso hacen falta dos cosas, ancho y contraste.
   */
  pieza(mats, raiz, 'Corredera', COLOR_ARMA.metalClaro, [0.075, 0.07, 0.3], [0, 0.015, -0.1]);

  /*
   * El caño sobresale y es OSCURO. Es lo que convierte un rectángulo en un
   * arma: un bloque claro con una punta negra apuntando a algún lado se lee
   * como "esto dispara" sin que haga falta ver el gatillo.
   */
  pieza(mats, raiz, 'Cano', COLOR_ARMA.metalOscuro, [0.04, 0.04, 0.12], [0, 0.015, -0.3]);

  // La culata hacia abajo y atrás: el palo corto de la L. Se ve de costado,
  // que es lo que queda de perfil con la cámara a 48 grados.
  pieza(mats, raiz, 'Culata', COLOR_ARMA.metalOscuro, [0.06, 0.15, 0.08], [0, -0.09, 0.05], [14, 0, 0]);
  pieza(mats, raiz, 'Guardamonte', COLOR_ARMA.metalOscuro, [0.035, 0.06, 0.03], [0, -0.03, -0.04]);

  /*
   * Y una mira: dos tacos claros sobre el lomo. No es detalle por detalle —
   * a esta escala no existe el detalle— sino **una línea a lo largo**, que
   * es lo que le da dirección a la planta y hace que el ojo lea para dónde
   * apunta.
   */
  for (const z of [-0.22, 0.0]) {
    pieza(mats, raiz, 'Mira', COLOR_ARMA.metalClaro, [0.02, 0.025, 0.02], [0, 0.055, z]);
  }

  return raiz;
}

/**
 * Cuelga el arma del anclaje de la mano.
 *
 * ---------------------------------------------------------------------------
 * POR QUE YA NO HAY `equipar()`
 * ---------------------------------------------------------------------------
 * Esta clase existía para tener las tres armas construidas y encender sólo
 * la equipada: crear y destruir mallas en pleno combate produce tirones por
 * recolección de basura, y cambiar de arma era justo algo que se hacía con
 * zombis encima.
 *
 * Con una sola arma, ese `equipar()` quedaba **eligiendo entre un elemento**
 * —se encendía siempre el mismo y se apagaban cero—, y el `main` tenía que
 * llamarlo igual para que la pistola apareciera. Era una ceremonia que no
 * decidía nada. Ahora el arma se construye, se cuelga y se ve.
 *
 * Lo que la clase sigue haciendo, y es la razón de que no sea una función
 * suelta, es sostener **el agarre**: dónde y con qué inclinación esta mano
 * en particular toma el arma. El modelo describe el arma; el anclaje
 * describe cómo se la agarra.
 */
export class ArmasEnMano {
  /**
   * @param {pc.Entity} ancla
   * @param {import('../world/palette.js').Materiales} mats
   */
  constructor(ancla, mats) {
    this.modelo = construirPistola(mats);
    this.modelo.setLocalPosition(0, -0.02, -0.06);
    this.modelo.setLocalEulerAngles(-8, 0, 0);
    ancla.addChild(this.modelo);
  }
}
