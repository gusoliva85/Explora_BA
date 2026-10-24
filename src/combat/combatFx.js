import * as pc from 'playcanvas';

/**
 * ===========================================================================
 * EFECTOS DE COMBATE
 * ===========================================================================
 * El arco del golpe, el destello del impacto y el parpadeo del zombi
 * herido.
 *
 * Esto NO es decoracion. El criterio de salida de la fase es que el jugador
 * entienda sin dudar cuando acerto y cuando fallo, y eso no se consigue con
 * numeros: se consigue mostrando el arco que barrio el cuchillo y marcando
 * al que recibio.
 *
 * ---------------------------------------------------------------------------
 * POR QUE SE REUTILIZA TODO
 * ---------------------------------------------------------------------------
 * Los efectos se crean una vez al arrancar y despues se encienden y se
 * apagan, igual que los zombis. Crear una malla cada vez que el jugador
 * aprieta el boton —varias veces por segundo— es la forma mas rapida de
 * provocar tirones por recoleccion de basura en un telefono.
 */

/** Cuanto dura el arco en pantalla. Corto: es un destello, no un dibujo. */
const DURACION_ARCO = 0.18;
const DURACION_IMPACTO = 0.25;
/** Cuantos impactos pueden verse a la vez. */
const MAX_IMPACTOS = 6;

export class CombatFx {
  /**
   * @param {pc.AppBase} app
   * @param {import('../world/palette.js').Materiales} mats
   */
  constructor(app, mats) {
    this.app = app;
    this.raiz = new pc.Entity('EfectosCombate');
    this.app.root.addChild(this.raiz);

    this.arco = this.#crearArco();
    this.arcoRestante = 0;

    this.impactos = [];
    for (let i = 0; i < MAX_IMPACTOS; i++) {
      this.impactos.push({ entidad: this.#crearImpacto(i), restante: 0 });
    }
  }

  /**
   * El arco del cuchillo: un sector de disco plano a los pies del jugador.
   *
   * Se construye a mano en vez de usar una primitiva porque ninguna tiene
   * la forma de un sector. Son pocos triangulos y se arma una sola vez.
   */
  #crearArco() {
    const semi = 55; // coincide con WEAPONS.knife.arcDegrees
    const radio = 1.7;
    const pasos = 14;

    const positions = [0, 0, 0];
    const indices = [];
    for (let i = 0; i <= pasos; i++) {
      const a = ((-semi + (semi * 2 * i) / pasos) * Math.PI) / 180;
      positions.push(Math.sin(a) * radio, 0, Math.cos(a) * radio);
      if (i > 0) indices.push(0, i, i + 1);
    }

    const mesh = new pc.Mesh(this.app.graphicsDevice);
    mesh.setPositions(positions);
    mesh.setIndices(indices);
    mesh.update(pc.PRIMITIVE_TRIANGLES);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.95, 0.85);
    material.useLighting = false;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE;
    material.update();

    const e = new pc.Entity('ArcoGolpe');
    e.addComponent('render', {
      meshInstances: [new pc.MeshInstance(mesh, material)],
      castShadows: false
    });
    e.enabled = false;
    this.raiz.addChild(e);

    this.materialArco = material;
    return e;
  }

  /** Destello de impacto: una esfera chica y brillante. */
  #crearImpacto(i) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.6, 0.45);
    material.emissiveIntensity = 4;
    material.useLighting = false;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.update();

    const e = new pc.Entity(`Impacto_${i}`);
    e.addComponent('render', { type: 'sphere', material, castShadows: false });
    e.enabled = false;
    this.raiz.addChild(e);
    e.material = material;
    return e;
  }

  /**
   * Muestra el arco del golpe.
   *
   * @param {{x:number,y:number,z:number}} pos
   * @param {number} rumboGrados
   * @param {boolean} conecto si el golpe alcanzo a alguien
   */
  mostrarArco(pos, rumboGrados, conecto) {
    this.arco.setPosition(pos.x, 0.12, pos.z);
    this.arco.setEulerAngles(0, rumboGrados, 0);
    this.arco.enabled = true;
    this.arcoRestante = DURACION_ARCO;

    /*
     * El color dice el resultado. Un golpe que conecta se ve calido y
     * fuerte; uno al aire, apenas un trazo frio. Es la diferencia entre
     * "fallaste" y "el arma no hizo nada", que son dos cosas muy distintas
     * para quien esta jugando.
     */
    if (conecto) {
      this.materialArco.emissive.set(1, 0.92, 0.8);
      this.arcoIntensidad = 0.55;
    } else {
      this.materialArco.emissive.set(0.55, 0.65, 0.8);
      this.arcoIntensidad = 0.22;
    }
    this.materialArco.update();
  }

  /** Destello en el punto donde pego. */
  mostrarImpacto(x, z) {
    const libre = this.impactos.find((i) => i.restante <= 0) ?? this.impactos[0];
    libre.entidad.setPosition(x, 1.1, z);
    libre.entidad.setLocalScale(0.5, 0.5, 0.5);
    libre.entidad.enabled = true;
    libre.restante = DURACION_IMPACTO;
  }

  update(dt) {
    if (this.arcoRestante > 0) {
      this.arcoRestante -= dt;
      // Acotado a [0,1]: un dt enorme —o una herramienta de captura que
      // congela el efecto— dejaria la escala negativa y el arco se daria
      // vuelta hasta desaparecer.
      const k = Math.min(1, Math.max(0, this.arcoRestante / DURACION_ARCO));
      // Se desvanece y se agranda un poco: lee como un barrido.
      this.materialArco.opacity = k * this.arcoIntensidad;
      this.materialArco.update();
      const escala = 1 + (1 - k) * 0.15;
      this.arco.setLocalScale(escala, 1, escala);
      if (this.arcoRestante <= 0) this.arco.enabled = false;
    }

    for (const imp of this.impactos) {
      if (imp.restante <= 0) continue;
      imp.restante -= dt;
      const k = Math.min(1, Math.max(0, imp.restante / DURACION_IMPACTO));
      // Crece y se apaga.
      const s = 0.35 + (1 - k) * 0.65;
      imp.entidad.setLocalScale(s, s, s);
      imp.entidad.material.opacity = k;
      imp.entidad.material.update();
      if (imp.restante <= 0) imp.entidad.enabled = false;
    }
  }

  destruir() {
    this.raiz.destroy();
  }
}
