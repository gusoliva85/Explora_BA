import * as pc from 'playcanvas';
import { ZOMBIE_STANDARD } from '../config/balance.js';
import { COLORS, ACABADO } from '../world/palette.js';
import { Health } from '../entities/health.js';
import { ZombieAI, EstadoZombi } from './zombieAI.js';
import { Animador } from '../characters/pose.js';
import {
  PoseZ,
  poseZombiDe,
  velocidadDeCicloZombi,
  GESTOS_Z
} from '../characters/zombiePose.js';

/**
 * ===========================================================================
 * ZOMBI
 * ===========================================================================
 * Une las tres piezas: el cuerpo que se ve, la salud y el cerebro.
 *
 * El movimiento usa el mismo controlador cinematico que Gus —circulo
 * contra rectangulos— para que un zombi no pueda hacer nada que el jugador
 * no pueda. Si atravesara una barricada que al jugador lo frena, el nivel
 * entero dejaria de tener sentido.
 *
 * ---------------------------------------------------------------------------
 * LA SILUETA
 * ---------------------------------------------------------------------------
 * El zombi tiene que distinguirse de Gus de un vistazo, desde arriba y a
 * veinte metros. No alcanza con el color: a contraluz o en sombra los dos
 * son manchas oscuras. Lo que los separa es la FORMA:
 *
 *   Gus    erguido, hombros angostos, marca ambar en el piso.
 *   Zombi  encorvado, mas ancho que alto, y los brazos extendidos hacia
 *          adelante, que es la silueta inconfundible.
 */

/**
 * Colores del zombi.
 *
 * La piel es un verde enfermizo que NO es el verde de los arboles: si
 * compartieran tono, un zombi parado contra un cantero desapareceria. La
 * separacion esta verificada en las pruebas.
 */
const PIEL = [0.55, 0.58, 0.38];

/**
 * Tres variantes de ropa sobre el mismo modelo (tarea 12.16).
 *
 * Son tres y no mas por una razon medible: cada combinacion de color crea
 * un material, y cada material rompe el agrupado de mallas. Con doce zombis
 * en pantalla, tres variantes siguen agrupando de a cuatro; con ocho
 * variantes cada zombi seria su propio lote.
 *
 * Lo que cambia es el VALOR, no el tono: una ropa clara, una media y una
 * oscura. A veinte metros eso es lo unico que se nota, y es suficiente para
 * que una horda no se lea como doce copias del mismo muñeco.
 */
/**
 * Medidas del zombi, en metros.
 *
 * Igual que con Gus, la cadera se DEDUCE de la cadena de la pierna para que
 * los pies toquen el piso. Y las proporciones son deliberadamente otras:
 * mas bajo, hombros mas angostos y brazos mas largos. Esas tres cosas son
 * las que separan su silueta de la de Gus desde la camara cenital, que es
 * el unico angulo desde el que se lo va a ver.
 */
const Z = {
  torso: 0.5,
  muslo: 0.4,
  pantorrilla: 0.36,
  brazo: 0.32,
  antebrazo: 0.3,
  /** Mucho mas angosto que los 0,52 de Gus. */
  anchoHombros: 0.38,
  offsetBrazo: 0.16
};
Z.cadera = Z.muslo + Z.pantorrilla + 0.06;
/** Alto total, hasta la coronilla. */
Z.alto = Z.cadera + Z.torso + 0.31;

const VARIANTES = [
  { ropa: [0.29, 0.33, 0.2], alt: [0.38, 0.3, 0.26] },
  { ropa: [0.21, 0.23, 0.26], alt: [0.3, 0.27, 0.22] },
  { ropa: [0.42, 0.4, 0.31], alt: [0.3, 0.33, 0.24] }
];

export class Zombie {
  /**
   * @param {pc.Application} app
   * @param {import('../physics/collisionWorld.js').CollisionWorld} world
   * @param {import('../world/palette.js').Materiales} mats
   */
  constructor(app, world, mats, grupoLote = -1, variante = 0) {
    this.app = app;
    this.world = world;
    this.cfg = ZOMBIE_STANDARD;
    this.variante = variante;

    /*
     * Grupo de agrupado DINAMICO.
     *
     * Los zombis se mueven, asi que no pueden entrar en el agrupado
     * estatico del mundo. El dinamico funde igual las mallas que comparten
     * material y vuelve a armar los buffers cada cuadro: se paga en CPU lo
     * que se ahorra en llamadas de dibujo. Con diez zombis de ocho piezas
     * cada uno, el cambio compensa.
     */
    this.grupoLote = grupoLote;
    this.entity = this.#construirCuerpo(mats, grupoLote, variante);
    this.app.root.addChild(this.entity);

    this.health = new Health(this.cfg.maxHealth);
    this.ai = null;

    this.radio = this.cfg.collisionRadius;
    this.activo = false;
    /** Segundos que queda el cuerpo antes de reciclarse. */
    this.restanteCadaver = 0;
    this.rumboVisual = 0;
    /** Segundos de parpadeo blanco tras un golpe. */
    this.restanteDestello = 0;

    /*
     * Material propio para el destello.
     *
     * Los zombis comparten materiales para poder agruparse, asi que no se
     * puede tocar el color de uno sin afectar a todos. La solucion es una
     * capa aparte: una copia del torso, mas grande y emisiva, que se
     * enciende solo cuando este zombi recibe un golpe.
     */
    this.destello = this.#crearDestello();

    /*
     * Animador propio, con las poses del zombi.
     *
     * Reusa la maquina de estados de `pose.js` —mezclas, gestos, ciclos—
     * pero con otro repertorio. Lo que comparten es el mecanismo; lo que
     * los separa es como se mueven, que es justamente lo que tiene que
     * distinguirlos.
     */
    this.animador = new Animador(PoseZ.QUIETO, {
      poseDe: poseZombiDe,
      gestos: GESTOS_Z,
      velocidadDeCiclo: velocidadDeCicloZombi,
      reposo: PoseZ.QUIETO,
      muerte: PoseZ.MUERTO
    });

    this.entity.enabled = false;
  }

  /**
   * Cuerpo articulado, encorvado y asimetrico.
   *
   * Mismo esquema que Gus —cada parte cuelga de su padre y gira sobre su
   * pivote— pero con otras proporciones. Ver `src/characters/pose.js` para
   * el porque de no usar esqueleto ni Mixamo.
   *
   * Solo el torso y los muslos proyectan sombra. Se midio en su momento:
   * con las ocho piezas proyectando, diez zombis sumaban mas de doscientas
   * llamadas de dibujo, la mayoria del mapa de sombras. A la distancia de
   * camara la sombra de un brazo cae dentro de la del cuerpo.
   */
  #construirCuerpo(mats, grupoLote, variante) {
    const v = VARIANTES[variante % VARIANTES.length];
    const raiz = new pc.Entity('Zombi');

    const pieza = (padre, nombre, tipo, color, escala, pos, rot, sombra = false) => {
      const e = new pc.Entity(nombre);
      e.addComponent('render', {
        type: tipo,
        material: mats.get(color, ACABADO.revoque),
        castShadows: sombra,
        batchGroupId: grupoLote
      });
      e.setLocalScale(escala[0], escala[1], escala[2]);
      e.setLocalPosition(pos[0], pos[1], pos[2]);
      if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
      padre.addChild(e);
      return e;
    };

    /** Un miembro que cuelga: pivote arriba, malla hacia abajo. */
    const miembro = (padre, nombre, x, largo, grosor, color, sombra = false) => {
      const pivote = new pc.Entity(nombre);
      pivote.setLocalPosition(x, 0, 0);
      padre.addChild(pivote);
      pieza(pivote, `${nombre}_m`, 'capsule', color, [grosor, largo / 2, grosor], [0, -largo / 2, 0], null, sombra);
      return pivote;
    };

    const segmento = (padre, nombre, largoPadre, largo, grosor, color) => {
      const pivote = new pc.Entity(nombre);
      pivote.setLocalPosition(0, -largoPadre, 0);
      padre.addChild(pivote);
      pieza(pivote, `${nombre}_m`, 'capsule', color, [grosor, largo / 2, grosor], [0, -largo / 2, 0]);
      return pivote;
    };

    // --- Cuerpo que se desploma ---------------------------------------------
    this.cuerpo = new pc.Entity('ZCuerpo');
    raiz.addChild(this.cuerpo);

    this.cadera = new pc.Entity('ZCadera');
    this.cadera.setLocalPosition(0, Z.cadera, 0);
    this.cuerpo.addChild(this.cadera);
    pieza(this.cadera, 'Pelvis', 'box', v.ropa, [0.28, 0.2, 0.24], [0, -0.05, 0]);

    // --- Torso ---------------------------------------------------------------
    this.torso = new pc.Entity('ZTorso');
    this.cadera.addChild(this.torso);
    pieza(this.torso, 'Torso', 'capsule', v.ropa, [0.42, Z.torso / 2, 0.32], [0, Z.torso / 2, 0], null, true);
    /*
     * Hombros ESTRECHOS, al reves que Gus.
     *
     * Gus tiene un trapecio ancho; el zombi, hombros caidos y angostos. A
     * la distancia de camara esa diferencia de ancho es lo primero que
     * separa las dos siluetas, antes que el color.
     */
    this.hombros = new pc.Entity('ZHombros');
    this.hombros.setLocalPosition(0, Z.torso * 0.9, 0);
    this.torso.addChild(this.hombros);
    pieza(this.hombros, 'Hombro', 'box', v.alt, [Z.anchoHombros, 0.13, 0.26], [0, 0, 0]);

    // --- Cabeza --------------------------------------------------------------
    this.cabeza = new pc.Entity('ZCabeza');
    this.cabeza.setLocalPosition(0, Z.torso + 0.03, 0);
    this.torso.addChild(this.cabeza);
    pieza(this.cabeza, 'Craneo', 'sphere', PIEL, [0.3, 0.32, 0.3], [0.02, 0.15, 0]);

    // --- Brazos --------------------------------------------------------------
    this.brazoI = miembro(this.hombros, 'ZBrazoI', -Z.offsetBrazo, Z.brazo, 0.15, PIEL);
    this.brazoD = miembro(this.hombros, 'ZBrazoD', Z.offsetBrazo, Z.brazo, 0.15, PIEL);
    this.codoI = segmento(this.brazoI, 'ZAntebrazoI', Z.brazo, Z.antebrazo, 0.13, PIEL);
    this.codoD = segmento(this.brazoD, 'ZAntebrazoD', Z.brazo, Z.antebrazo, 0.13, PIEL);

    // --- Piernas -------------------------------------------------------------
    this.piernaI = miembro(this.cadera, 'ZPiernaI', -0.1, Z.muslo, 0.18, v.ropa, true);
    this.piernaD = miembro(this.cadera, 'ZPiernaD', 0.1, Z.muslo, 0.18, v.ropa, true);
    this.rodillaI = segmento(this.piernaI, 'ZPantorrillaI', Z.muslo, Z.pantorrilla, 0.16, v.ropa);
    this.rodillaD = segmento(this.piernaD, 'ZPantorrillaD', Z.muslo, Z.pantorrilla, 0.16, v.ropa);

    return raiz;
  }

  /** Avanza el animador y aplica el resultado. */
  #animar(dt, velocidad) {
    this.animador.update(dt, velocidad);
    this.aplicarPose(this.animador.pose());
  }

  /** Lleva una pose a la jerarquia. */
  aplicarPose(p) {
    this.cuerpo.setLocalEulerAngles(-p.desplome, 0, 0);
    this.cadera.setLocalPosition(0, Z.cadera + p.cadera, 0);
    this.torso.setLocalEulerAngles(p.torso, p.torsoGiro, 0);
    this.cabeza.setLocalEulerAngles(p.cabeza, p.cabezaGiro, 14);
    this.brazoI.setLocalEulerAngles(p.brazoI, 0, -9);
    this.brazoD.setLocalEulerAngles(p.brazoD, 0, 9);
    this.codoI.setLocalEulerAngles(-p.codoI, 0, 0);
    this.codoD.setLocalEulerAngles(-p.codoD, 0, 0);
    this.piernaI.setLocalEulerAngles(p.piernaI, 0, 5);
    this.piernaD.setLocalEulerAngles(p.piernaD, 0, -7);
    this.rodillaI.setLocalEulerAngles(-p.rodillaI, 0, 0);
    this.rodillaD.setLocalEulerAngles(-p.rodillaD, 0, 0);
  }

  /** Capa blanca que se enciende al recibir un golpe. */
  #crearDestello() {
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0, 0, 0);
    mat.emissive = new pc.Color(1, 0.9, 0.85);
    mat.useLighting = false;
    mat.blendType = pc.BLEND_ADDITIVE;
    mat.depthWrite = false;
    mat.opacity = 0;
    mat.update();

    const e = new pc.Entity('Destello');
    e.addComponent('render', { type: 'capsule', material: mat, castShadows: false });
    e.setLocalScale(0.5, Z.torso / 2 + 0.06, 0.4);
    /*
     * Cuelga del TORSO, no de la raiz.
     *
     * Antes estaba colgado de la raiz con una posicion fija calculada
     * contra el cuerpo viejo, que no se movia. Ahora el torso se inclina y
     * se bambolea: un destello clavado en el aire se veria despegado del
     * zombi justo en el momento en que uno lo esta mirando.
     */
    e.setLocalPosition(0, Z.torso / 2, 0);
    e.enabled = false;
    this.torso.addChild(e);
    e.material = mat;
    return e;
  }

  // =========================================================================
  // CICLO DE VIDA
  // =========================================================================

  /**
   * Lo pone en juego. Se reutiliza la misma entidad siempre: crear y
   * destruir objetos en pleno juego produce tirones por recoleccion de
   * basura, que en un telefono se notan muchisimo.
   */
  activar(x, z, azar) {
    this.restanteDestello = 0;
    this.destello.enabled = false;
    this.entity.setPosition(x, 0, z);
    this.entity.enabled = true;
    this.activo = true;
    this.restanteCadaver = 0;

    this.health.reiniciar(this.cfg.maxHealth);
    this.ai = new ZombieAI({
      world: this.world,
      cfg: this.cfg,
      origen: { x, z },
      azar
    });
    this.ai.rumbo = azar() * 360;
    this.rumboVisual = this.ai.rumbo;
    this.entity.setEulerAngles(0, this.rumboVisual, 0);

    // Un zombi reciclado tiene que volver a estar de pie.
    this.animador.estado = PoseZ.QUIETO;
    this.animador.anterior = PoseZ.QUIETO;
    this.animador.gesto = null;
    this.animador.mezclando = 0;
    // La fase arranca distinta en cada uno: una horda sincronizada se lee
    // como una sola cosa repetida doce veces.
    this.animador.fase = azar();
    this.aplicarPose(poseZombiDe(PoseZ.QUIETO, this.animador.fase));
  }

  desactivar() {
    this.activo = false;
    this.entity.enabled = false;
  }

  get vivo() {
    return this.activo && this.health.vivo;
  }

  get posicion() {
    return this.entity.getPosition();
  }

  /**
   * Recibe daño. Un golpe lo interrumpe aunque no lo mate: sin eso, un
   * zombi que ya empezo a atacar te pega igual por mas que le des primero,
   * y el combate se siente injusto.
   */
  recibirDaño(cantidad, info = {}) {
    if (!this.vivo) return false;
    const aplicado = this.health.recibirDaño(cantidad, info);
    if (!aplicado) return false;

    if (this.health.vivo) {
      this.animador.pedir(PoseZ.GOLPEADO);
      this.ai.aturdir(0.25);
      this.restanteDestello = 0.14;
      this.destello.enabled = true;
      /*
       * Empujon hacia atras, en metros.
       *
       * La distancia la decide quien golpea, no el zombi. Era un 0,35 fijo
       * escrito aca, asi que una explosion empujaba exactamente igual que
       * un cuchillazo: los zombis se quedaban parados en medio del humo.
       * Que SALGAN DESPEDIDOS es la mitad de la razon por la que esperar
       * treinta segundos vale la pena; la otra mitad es que mueran.
       *
       * Se mueve con `moveCircle` y no de un salto: un empujon que
       * atraviesa paredes es peor que no tener empujon.
       */
      if (info.dirX !== undefined) {
        const fuerza = info.fuerza ?? 0.35;
        const p = this.posicion;
        const r = this.world.moveCircle(
          { x: p.x, z: p.z },
          info.dirX * fuerza,
          info.dirZ * fuerza,
          this.radio
        );
        this.entity.setPosition(r.x, 0, r.z);
      }
    } else {
      this.#morir();
    }
    return true;
  }

  #morir() {
    this.ai.morir();
    this.restanteCadaver = 6;
    /*
     * El desplome ahora es una POSE, no un giro de la entidad entera.
     *
     * Antes se rotaba la raiz 80 grados, lo que tumbaba tambien el eje
     * sobre el que gira el cuerpo: el zombi quedaba acostado pero seguia
     * "mirando" hacia donde caminaba, y al reciclarse habia que acordarse
     * de enderezarlo. Con la pose, la raiz nunca se inclina y el cadaver
     * se desarma hacia adelante como corresponde.
     */
    this.animador.pedir(PoseZ.MUERTO);
  }

  // =========================================================================
  // ACTUALIZACION
  // =========================================================================

  /**
   * @param {number} dt
   * @param {{x:number,z:number}} jugador
   * @param {boolean} jugadorVivo
   * @param {{x:number,z:number}[]} vecinos
   * @returns {boolean} true si ataco en este cuadro
   */
  update(dt, jugador, jugadorVivo, vecinos) {
    if (!this.activo) return false;

    this.health.update(dt);

    if (this.restanteDestello > 0) {
      this.restanteDestello -= dt;
      this.destello.material.opacity = Math.max(0, this.restanteDestello / 0.14) * 0.75;
      this.destello.material.update();
      if (this.restanteDestello <= 0) this.destello.enabled = false;
    }

    if (!this.health.vivo) {
      this.restanteCadaver -= dt;
      if (this.restanteCadaver <= 0) this.desactivar();
      return false;
    }

    const p = this.posicion;
    const pos = { x: p.x, z: p.z };
    const decision = this.ai.update(dt, { pos, jugador, jugadorVivo, vecinos });

    if (decision.velocidad > 0) {
      const r = this.world.moveCircle(
        pos,
        decision.dirX * decision.velocidad * dt,
        decision.dirZ * decision.velocidad * dt,
        this.radio
      );
      this.entity.setPosition(r.x, 0, r.z);
    }

    // El giro visual va atras del rumbo de la IA: un zombi que se orienta
    // instantaneamente se ve mecanico.
    const diff = ((this.ai.rumbo - this.rumboVisual + 540) % 360) - 180;
    this.rumboVisual += diff * Math.min(1, dt * 6);
    this.entity.setEulerAngles(0, this.rumboVisual, 0);

    /*
     * La pose se elige a partir de lo que YA paso en este cuadro: la
     * velocidad que decidio la IA. No hay una maquina de estados de
     * animacion aparte que haya que mantener sincronizada con la de la IA.
     */
    if (decision.atacar) this.animador.pedir(PoseZ.ATACAR);
    else if (decision.velocidad > this.cfg.walkSpeed * 1.4) {
      this.animador.pedir(PoseZ.CORRER);
    } else if (decision.velocidad > 0.2) this.animador.pedir(PoseZ.CAMINAR);
    else this.animador.pedir(PoseZ.QUIETO);

    this.#animar(dt, decision.velocidad);
    return decision.atacar;
  }

  destruir() {
    this.entity.destroy();
  }
}

export { EstadoZombi };
