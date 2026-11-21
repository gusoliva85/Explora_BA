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
  metal: [0.3, 0.31, 0.34],
  metalOscuro: [0.17, 0.18, 0.2]
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
  pistola: 0.26
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
  pieza(mats, raiz, 'Corredera', COLOR_ARMA.metal, [0.035, 0.05, 0.2], [0, 0.01, -0.06]);
  pieza(mats, raiz, 'Cañon', COLOR_ARMA.metalOscuro, [0.022, 0.022, 0.06], [0, 0.01, -0.18]);
  // La culata hacia abajo y atrás: el palo corto de la L.
  pieza(mats, raiz, 'Culata', COLOR_ARMA.metalOscuro, [0.032, 0.11, 0.05], [0, -0.07, 0.02], [12, 0, 0]);
  pieza(mats, raiz, 'Guardamonte', COLOR_ARMA.metal, [0.02, 0.04, 0.02], [0, -0.025, -0.04]);
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
