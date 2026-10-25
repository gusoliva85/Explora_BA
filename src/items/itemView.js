import * as pc from 'playcanvas';
import { TipoObjeto } from './itemLogic.js';
import { UNITS } from '../config/balance.js';

/**
 * ===========================================================================
 * COMO SE VEN LOS OBJETOS EN EL PISO
 * ===========================================================================
 * Cajas chicas que flotan y giran despacio, con un disco de color debajo.
 *
 * ---------------------------------------------------------------------------
 * POR QUE FLOTAN Y GIRAN
 * ---------------------------------------------------------------------------
 * Porque desde la camara del juego —veinte metros, 57 grados— una caja
 * apoyada en el asfalto es indistinguible de un cascote. La calle ya esta
 * llena de objetos chicos: escombros, bolsas, cordones.
 *
 * Lo que separa "esto se levanta" de "esto es decorado" no es el detalle:
 * es el MOVIMIENTO. Nada mas en la escena flota ni gira, asi que cualquier
 * cosa que lo haga se lee como interactiva sin necesidad de explicarlo.
 *
 * El disco de abajo hace el otro trabajo: dice donde hay que pisar. Es el
 * mismo recurso que la marca del jugador.
 */

/** Altura a la que flota el centro del objeto. */
const ALTURA = 0.62;
/** Cuanto sube y baja, en metros. */
const FLOTE = 0.12;

/**
 * Altura del disco del piso.
 *
 * Tiene que estar POR ENCIMA del cordon. El mundo es plano en y=0 y las
 * veredas son cajas de `UNITS.curbHeight` apoyadas arriba: un disco a 3 cm
 * queda adentro de la vereda y no se ve. Los objetos del control caen
 * justo ahi, al costado de la calle, asi que no era un caso raro.
 */
const ALTURA_DISCO = UNITS.curbHeight + 0.08;

const COLORES = {
  [TipoObjeto.MUNICION]: { caja: new pc.Color(0.95, 0.72, 0.18), disco: new pc.Color(1, 0.75, 0.2) },
  [TipoObjeto.BOTIQUIN]: { caja: new pc.Color(0.9, 0.25, 0.3), disco: new pc.Color(1, 0.35, 0.35) }
};

export class VistaObjetos {
  /**
   * @param {pc.AppBase} app
   */
  constructor(app) {
    this.app = app;
    this.raiz = new pc.Entity('Objetos');
    this.app.root.addChild(this.raiz);

    /** @type {Map<number, {raiz:pc.Entity, caja:pc.Entity}>} */
    this.vistas = new Map();
    this.materiales = new Map();
    this.tiempo = 0;
  }

  #material(color, emisivo) {
    const clave = `${color.r},${color.g},${color.b},${emisivo}`;
    let m = this.materiales.get(clave);
    if (m) return m;

    m = new pc.StandardMaterial();
    if (emisivo) {
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = color;
      m.useLighting = false;
      m.blendType = pc.BLEND_NORMAL;
      m.depthWrite = false;
      m.opacity = 0.75;
    } else {
      m.diffuse = color;
      m.emissive = color;
      // Un poco de emision propia: de dia, a la sombra de un arbol, un
      // objeto solo iluminado se pierde contra el asfalto.
      m.emissiveIntensity = 0.35;
      m.gloss = 0.3;
      m.metalness = 0;
    }
    m.update();
    this.materiales.set(clave, m);
    return m;
  }

  /** Crea la entidad de un objeto recien soltado. */
  mostrar(objeto) {
    if (this.vistas.has(objeto.id)) return;
    const color = COLORES[objeto.tipo] ?? COLORES[TipoObjeto.MUNICION];

    const raiz = new pc.Entity(`Objeto_${objeto.id}`);
    raiz.setPosition(objeto.x, 0, objeto.z);

    const caja = new pc.Entity('Caja');
    caja.addComponent('render', {
      type: 'box',
      material: this.#material(color.caja, false),
      castShadows: true
    });
    /*
     * Mas grande de lo que un botiquin "deberia" ser.
     *
     * A veinte metros de camara, una caja de treinta centimetros son unos
     * pocos pixeles y se confunde con los escombros que ya hay en la
     * calle. Lo que tiene que leerse no es el tamaño real del objeto, es
     * que ESO SE LEVANTA.
     */
    caja.setLocalScale(0.46, 0.36, 0.46);
    caja.setLocalPosition(0, ALTURA, 0);
    raiz.addChild(caja);

    // Disco en el piso: dice donde pisar.
    const disco = new pc.Entity('Disco');
    disco.addComponent('render', {
      type: 'cylinder',
      material: this.#material(color.disco, true),
      castShadows: false
    });
    disco.setLocalScale(1.7, 0.01, 1.7);
    disco.setLocalPosition(0, ALTURA_DISCO, 0);
    raiz.addChild(disco);

    this.raiz.addChild(raiz);
    this.vistas.set(objeto.id, { raiz, caja });
  }

  /** Saca de escena un objeto levantado. */
  quitar(id) {
    const v = this.vistas.get(id);
    if (!v) return;
    v.raiz.destroy();
    this.vistas.delete(id);
  }

  update(dt) {
    this.tiempo += dt;
    /*
     * Todos flotan en fase distinta segun su posicion, no al mismo tiempo.
     * Sincronizados se leen como una sola cosa parpadeando; desfasados se
     * leen como varios objetos sueltos, que es lo que son.
     */
    for (const [, v] of this.vistas) {
      const p = v.raiz.getPosition();
      const fase = p.x * 0.7 + p.z * 0.5;
      v.caja.setLocalPosition(0, ALTURA + Math.sin(this.tiempo * 2.2 + fase) * FLOTE, 0);
      v.caja.setLocalEulerAngles(0, this.tiempo * 55 + fase * 20, 0);
    }
  }

  limpiar() {
    for (const [, v] of this.vistas) v.raiz.destroy();
    this.vistas.clear();
  }
}
