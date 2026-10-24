import * as pc from 'playcanvas';
import { WEAPONS } from '../config/balance.js';
import { dirDeRumbo } from '../core/rumbo.js';

/* Vectores reutilizados para dibujar: no se crean dentro del bucle. */
const _p1 = new pc.Vec3();
const _p2 = new pc.Vec3();

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

/*
 * El trazado del disparo dura MENOS que todo lo demas.
 *
 * No es para que se note poco: es porque tiene que leerse como la estela de
 * algo que ya paso, no como un laser apuntando. Con mas de dos decimas
 * parece un rayo continuo y el arma deja de sentirse como una pistola.
 *
 * ---------------------------------------------------------------------------
 * PERO NO MENOS QUE UN CUADRO
 * ---------------------------------------------------------------------------
 * Hay un piso que no se puede cruzar, y es el techo de simulacion:
 * `PERF.maxDeltaTime`, o sea 1/15 de segundo. Un efecto que dure menos que
 * eso puede nacer y morir dentro del mismo cuadro y no dibujarse NUNCA.
 *
 * Paso: el fogonazo estaba en seis centesimas, por debajo de ese techo, y
 * en el navegador de prueba —que corre con WebGL por software— no aparecia
 * jamas aunque el codigo lo encendiera. En un telefono de gama media con
 * la calle llena pasaria lo mismo.
 *
 * Por eso los dos valores estan por encima del techo, con margen. Siguen
 * siendo destellos: a 60 cuadros por segundo son seis y siete cuadros.
 */
const DURACION_TRAZADO = 0.11;
/** Cuantos trazados pueden verse a la vez. La pistola dispara rapido. */
const MAX_TRAZADOS = 4;
const DURACION_FOGONAZO = 0.09;
/** Cuanto dura el anillo de ruido del modo diagnostico. */
const DURACION_RUIDO = 0.9;

/*
 * La explosion dura MUCHO mas que los demas efectos, y es a proposito.
 *
 * Los destellos del cuchillo y la pistola son avisos: duran lo justo para
 * decir "paso esto". La explosion es la recompensa de treinta segundos de
 * espera, y tiene que dar tiempo a mirarla. Medio segundo es poco en un
 * efecto comun y mucho en uno que ocurre dos veces por partida.
 */
const DURACION_EXPLOSION = 0.55;
/** Cuantas explosiones pueden verse a la vez. Rara vez mas de una. */
const MAX_EXPLOSIONES = 2;

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

    this.trazados = [];
    for (let i = 0; i < MAX_TRAZADOS; i++) {
      this.trazados.push({ entidad: this.#crearTrazado(i), restante: 0 });
    }

    this.fogonazo = this.#crearFogonazo();
    this.fogonazoRestante = 0;

    /*
     * El cohete en vuelo. Es la unica cosa del juego que existe entre que
     * se dispara y que impacta, asi que necesita una entidad que viva mas
     * de un cuadro, no un destello que se enciende y se apaga.
     */
    this.cohetes = new Map();
    this.plantillaCohete = this.#crearCohete();

    this.explosiones = [];
    for (let i = 0; i < MAX_EXPLOSIONES; i++) {
      this.explosiones.push({ ...this.#crearExplosion(i), restante: 0 });
    }

    /** Anillos de ruido: solo se dibujan con el diagnostico encendido. */
    this.ruidos = [];
  }

  /**
   * El arco del cuchillo: un sector de disco plano a los pies del jugador.
   *
   * Se construye a mano en vez de usar una primitiva porque ninguna tiene
   * la forma de un sector. Son pocos triangulos y se arma una sola vez.
   */
  #crearArco() {
    /*
     * El arco se mide del arma, no se copia a mano.
     *
     * Antes el semiangulo y el radio estaban escritos aca como numeros
     * sueltos, con un comentario que decia "coincide con WEAPONS.knife".
     * Un comentario no mantiene nada sincronizado: al ampliar el alcance
     * del cuchillo, el dibujo se habria quedado corto y el jugador habria
     * visto un arco mas chico que el que golpea de verdad.
     */
    const semi = WEAPONS.knife.arcDegrees;
    const radio = WEAPONS.knife.range;
    const pasos = 14;

    /*
     * La malla se construye con `dirDeRumbo`, igual que la deteccion de
     * golpe. Antes se armaba con `sin/cos` directos, que es el convenio
     * contrario: el sector apuntaba a la espalda del jugador. Ver
     * core/rumbo.js.
     */
    const positions = [0, 0, 0];
    const indices = [];
    for (let i = 0; i <= pasos; i++) {
      const d = dirDeRumbo(-semi + (semi * 2 * i) / pasos);
      positions.push(d.x * radio, 0, d.z * radio);
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

  /**
   * El trazado: una tira finita y luminosa entre el cano y el impacto.
   *
   * Es una caja estirada y no una linea de diagnostico por dos razones.
   * Una linea de `drawLine` tiene un pixel de ancho sin importar la
   * distancia, asi que desde la camara del juego casi no se ve; y no pasa
   * por el post-proceso, o sea que no florece con el bloom, que es
   * justamente lo que hace que un disparo se vea caliente.
   */
  #crearTrazado(i) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.85, 0.5);
    /*
     * Intensidad moderada, no maxima.
     *
     * Con 6 el trazado salia blanco puro: el tono calido se perdia en el
     * mapeo de tonos y lo que se veia era un palo blanco, mas parecido a
     * un laser de mira que a una estela. Con 2,5 el color sobrevive, el
     * bloom lo sigue haciendo brillar, y se lee como un disparo.
     */
    material.emissiveIntensity = 2.5;
    material.useLighting = false;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.update();

    const e = new pc.Entity('Trazado_' + i);
    e.addComponent('render', { type: 'box', material, castShadows: false });
    e.enabled = false;
    this.raiz.addChild(e);
    e.material = material;
    return e;
  }

  /** Fogonazo: una bola de luz muy corta en la boca del cano. */
  #crearFogonazo() {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.8, 0.45);
    material.emissiveIntensity = 10;
    material.useLighting = false;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.update();

    const e = new pc.Entity('Fogonazo');
    e.addComponent('render', { type: 'sphere', material, castShadows: false });
    e.enabled = false;
    this.raiz.addChild(e);
    e.material = material;
    return e;
  }

  /**
   * Muestra un disparo: fogonazo en el origen y trazado hasta el impacto.
   *
   * @param {{x:number,z:number}} desde
   * @param {{x:number,z:number}} hasta
   * @param {number} altura
   * @param {boolean} acerto
   */
  mostrarDisparo(desde, hasta, altura, acerto) {
    const dx = hasta.x - desde.x;
    const dz = hasta.z - desde.z;
    const largo = Math.hypot(dx, dz);
    if (largo < 0.01) return;

    const t = this.trazados.find((x) => x.restante <= 0) ?? this.trazados[0];
    const e = t.entidad;

    /*
     * La caja se centra en el medio del recorrido y se orienta con
     * `lookAt`, que apunta el frente -Z de la entidad al destino. De ahi
     * que se estire en Z y no en X: es el mismo frente que usa todo el
     * resto del juego, ver core/rumbo.js.
     */
    e.setPosition(desde.x + dx / 2, altura, desde.z + dz / 2);
    e.lookAt(hasta.x, altura, hasta.z);
    e.setLocalScale(0.045, 0.045, largo);

    // Un tiro que acierta se ve calido; uno que se pierde, mas frio.
    if (acerto) e.material.emissive.set(1, 0.85, 0.5);
    else e.material.emissive.set(0.8, 0.88, 1);
    e.material.update();

    e.enabled = true;
    t.restante = DURACION_TRAZADO;

    /*
     * El fogonazo va DELANTE del personaje, no encima.
     *
     * A 0,4 m quedaba dentro del cuerpo: el torso lo tapaba y desde la
     * camara cenital no se veia nada, aunque estuviera encendido. El radio
     * de colision del jugador es 0,35, asi que cualquier cosa mas cerca
     * que eso esta adentro suyo. A 0,8 m sale limpio y ademas senala hacia
     * donde esta disparando.
     */
    this.fogonazo.setPosition(desde.x + (dx / largo) * 0.8, altura, desde.z + (dz / largo) * 0.8);
    this.fogonazo.setLocalScale(0.5, 0.5, 0.5);
    this.fogonazo.enabled = true;
    this.fogonazoRestante = DURACION_FOGONAZO;
  }

  /**
   * Anillo que marca hasta donde llego un ruido (tarea 6.11).
   *
   * Solo se dibuja con el diagnostico encendido. El radio del ruido es la
   * regla principal de la fase y es completamente invisible: sin poder
   * verlo, ajustarlo seria adivinar.
   */
  marcarRuido(x, z, radio) {
    this.ruidos.push({ x, z, radio, restante: DURACION_RUIDO });
    // No se acumulan: si el jugador vacia un cargador, interesa el ultimo.
    if (this.ruidos.length > 4) this.ruidos.shift();
  }

  /**
   * Dibuja los anillos de ruido vivos.
   *
   * Lo llama el diagnostico, no el bucle normal: con el diagnostico
   * apagado esto no cuesta nada.
   */
  dibujarRuidos(app, color) {
    for (const r of this.ruidos) {
      const k = Math.max(0, r.restante / DURACION_RUIDO);
      // El anillo se expande desde el origen: se lee como una onda.
      const radio = r.radio * (1 - k);
      const pasos = 36;
      for (let i = 0; i < pasos; i++) {
        const a1 = (i / pasos) * Math.PI * 2;
        const a2 = ((i + 1) / pasos) * Math.PI * 2;
        _p1.set(r.x + Math.sin(a1) * radio, 0.3, r.z + Math.cos(a1) * radio);
        _p2.set(r.x + Math.sin(a2) * radio, 0.3, r.z + Math.cos(a2) * radio);
        app.drawLine(_p1, _p2, color, false);
      }
    }
  }

  /** La cabeza del cohete: una capsula corta y caliente. */
  #crearCohete() {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = new pc.Color(1, 0.6, 0.2);
    material.emissiveIntensity = 3;
    material.useLighting = false;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    material.update();
    this.materialCohete = material;
    return material;
  }

  /**
   * La explosion: dos esferas concentricas y un anillo en el piso.
   *
   * La bola interior es el fogonazo; la exterior, mas grande y mas tenue,
   * es el humo caliente. El anillo del piso es el que mas trabaja: es lo
   * unico que dice EXACTAMENTE hasta donde llego el daño, y desde la
   * camara cenital del juego una esfera no lo dice.
   */
  #crearExplosion(i) {
    /*
     * SOLO EL NUCLEO ES ADITIVO.
     *
     * La primera version tenia las tres partes en aditivo, y sobre una
     * calle de mediodia el resultado fue un disco rosa palido del tamaño
     * de media pantalla: sumar luz a algo que ya es claro satura a blanco
     * y se lleva el color puesto. Se veia como niebla, no como fuego.
     *
     * El nucleo si: es fuego, tiene que quemar la imagen. El humo y el
     * anillo van en mezcla normal, que respeta el color naranja y deja ver
     * lo que hay debajo —los zombis, que es lo que el jugador quiere mirar
     * justo en ese momento—.
     */
    const hacer = (nombre, color, intensidad, tipo, aditivo) => {
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = color;
      m.emissiveIntensity = intensidad;
      m.useLighting = false;
      m.blendType = aditivo ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL;
      m.depthWrite = false;
      m.update();
      const e = new pc.Entity(`${nombre}_${i}`);
      e.addComponent('render', { type: tipo, material: m, castShadows: false });
      e.enabled = false;
      this.raiz.addChild(e);
      e.material = m;
      return e;
    };

    return {
      nucleo: hacer('ExplosionNucleo', new pc.Color(1, 0.9, 0.62), 6, 'sphere', true),
      humo: hacer('ExplosionHumo', new pc.Color(0.95, 0.32, 0.06), 1, 'sphere', false),
      anillo: hacer('ExplosionAnillo', new pc.Color(1, 0.5, 0.08), 1, 'cylinder', false)
    };
  }

  /** Enciende el cohete `id` en una posicion. */
  moverCohete(id, x, z, altura, rumbo) {
    let e = this.cohetes.get(id);
    if (!e) {
      e = new pc.Entity(`Cohete_${id}`);
      e.addComponent('render', {
        type: 'capsule',
        material: this.materialCohete,
        castShadows: false
      });
      e.setLocalScale(0.18, 0.3, 0.18);
      this.raiz.addChild(e);
      this.cohetes.set(id, e);
    }
    e.setPosition(x, altura, z);
    // La capsula es vertical; se la acuesta y se la orienta al rumbo.
    e.setEulerAngles(90, rumbo, 0);
    e.enabled = true;
  }

  /** Saca de escena el cohete `id`. */
  quitarCohete(id) {
    const e = this.cohetes.get(id);
    if (!e) return;
    e.destroy();
    this.cohetes.delete(id);
  }

  /**
   * La explosion.
   *
   * @param {number} x
   * @param {number} z
   * @param {number} radio el radio REAL del daño, no uno decorativo
   */
  mostrarExplosion(x, z, radio) {
    const libre = this.explosiones.find((e) => e.restante <= 0) ?? this.explosiones[0];
    for (const parte of [libre.nucleo, libre.humo, libre.anillo]) {
      parte.setPosition(x, parte === libre.anillo ? 0.15 : 1.4, z);
      parte.enabled = true;
    }
    libre.radio = radio;
    libre.restante = DURACION_EXPLOSION;
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

    for (const t of this.trazados) {
      if (t.restante <= 0) continue;
      t.restante -= dt;
      const k = Math.min(1, Math.max(0, t.restante / DURACION_TRAZADO));
      t.entidad.material.opacity = k;
      t.entidad.material.update();
      if (t.restante <= 0) t.entidad.enabled = false;
    }

    if (this.fogonazoRestante > 0) {
      this.fogonazoRestante -= dt;
      const k = Math.min(1, Math.max(0, this.fogonazoRestante / DURACION_FOGONAZO));
      const s = 0.3 + (1 - k) * 0.45;
      this.fogonazo.setLocalScale(s, s, s);
      this.fogonazo.material.opacity = k;
      this.fogonazo.material.update();
      if (this.fogonazoRestante <= 0) this.fogonazo.enabled = false;
    }

    /*
     * Los anillos de ruido se vencen aunque el diagnostico este apagado.
     * Si no, al encenderlo apareceria de golpe un anillo de un disparo de
     * hace un minuto, que es peor que no mostrar nada.
     */
    for (let i = this.ruidos.length - 1; i >= 0; i--) {
      this.ruidos[i].restante -= dt;
      if (this.ruidos[i].restante <= 0) this.ruidos.splice(i, 1);
    }

    for (const ex of this.explosiones) {
      if (ex.restante <= 0) continue;
      ex.restante -= dt;
      const k = Math.min(1, Math.max(0, ex.restante / DURACION_EXPLOSION));
      const avance = 1 - k;

      /*
       * El anillo crece hasta el radio REAL del daño y se queda ahi.
       *
       * Es la parte honesta del efecto: si creciera mas que el radio para
       * verse mejor, el jugador aprenderia una distancia de seguridad
       * equivocada y la explosion se sentiria injusta sin que pudiera
       * explicar por que.
       */
      const anillo = Math.min(1, avance * 1.6) * ex.radio;
      ex.anillo.setLocalScale(anillo * 2, 0.02, anillo * 2);
      /*
       * El anillo es discreto a proposito: su trabajo es decir HASTA DONDE
       * llego el daño, no tapar la calle. A 6 m de radio, un disco opaco
       * cubre media pantalla y esconde justo lo que uno quiere ver, que es
       * cuales zombis quedaron en pie.
       */
      ex.anillo.material.opacity = k * 0.3;
      ex.anillo.material.update();

      // El nucleo nace grande y se apaga rapido; el humo crece y se abre.
      const nucleo = (0.5 + avance * 0.8) * ex.radio * 0.4;
      ex.nucleo.setLocalScale(nucleo, nucleo, nucleo);
      ex.nucleo.material.opacity = Math.max(0, k * 2 - 1);
      ex.nucleo.material.update();

      const humo = (0.4 + avance * 1.4) * ex.radio * 0.42;
      ex.humo.setLocalScale(humo, humo, humo);
      ex.humo.material.opacity = k * 0.55;
      ex.humo.material.update();

      if (ex.restante <= 0) {
        ex.nucleo.enabled = false;
        ex.humo.enabled = false;
        ex.anillo.enabled = false;
      }
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
