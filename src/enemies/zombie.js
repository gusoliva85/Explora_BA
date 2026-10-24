import * as pc from 'playcanvas';
import { ZOMBIE_STANDARD } from '../config/balance.js';
import { COLORS, ACABADO } from '../world/palette.js';
import { Health } from '../entities/health.js';
import { ZombieAI, EstadoZombi } from './zombieAI.js';

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

/** Colores del zombi. Verde enfermizo, nunca el verde de los arboles. */
const PIEL = [0.55, 0.58, 0.38];
const ROPA = [0.29, 0.33, 0.2];
const ROPA_ALT = [0.38, 0.3, 0.26];

export class Zombie {
  /**
   * @param {pc.Application} app
   * @param {import('../physics/collisionWorld.js').CollisionWorld} world
   * @param {import('../world/palette.js').Materiales} mats
   */
  constructor(app, world, mats, grupoLote = -1) {
    this.app = app;
    this.world = world;
    this.cfg = ZOMBIE_STANDARD;

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
    this.entity = this.#construirCuerpo(mats, grupoLote);
    this.app.root.addChild(this.entity);

    this.health = new Health(this.cfg.maxHealth);
    this.ai = null;

    this.radio = this.cfg.collisionRadius;
    this.activo = false;
    /** Segundos que queda el cuerpo antes de reciclarse. */
    this.restanteCadaver = 0;
    this.rumboVisual = 0;

    this.entity.enabled = false;
  }

  /** Cuerpo encorvado con los brazos hacia adelante. */
  #construirCuerpo(mats, grupoLote) {
    const raiz = new pc.Entity('Zombi');

    /*
     * Solo el torso proyecta sombra.
     *
     * Se midio: con las ocho piezas proyectando, diez zombis sumaban mas
     * de doscientas llamadas de dibujo, la mayoria del mapa de sombras.
     * A la distancia de camara del juego, la sombra del torso ya apoya la
     * figura en el piso; las de los brazos y la cabeza caen dentro de esa
     * misma mancha y no se distinguen.
     */
    const pieza = (nombre, tipo, color, escala, pos, rot, sombra = false) => {
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
      raiz.addChild(e);
      return e;
    };

    // Piernas separadas y algo torcidas: camina mal, y se nota.
    pieza('PiernaI', 'capsule', ROPA, [0.2, 0.42, 0.2], [-0.16, 0.42, 0], [0, 0, 6]);
    pieza('PiernaD', 'capsule', ROPA, [0.2, 0.42, 0.2], [0.16, 0.42, 0], [0, 0, -9]);

    // Torso inclinado hacia adelante. Es lo que lo encorva.
    pieza('Torso', 'capsule', ROPA, [0.46, 0.34, 0.34], [0, 1.05, -0.08], [16, 0, 0], true);
    pieza('Hombro', 'box', ROPA_ALT, [0.62, 0.16, 0.3], [0, 1.3, -0.12], [12, 0, 0]);

    // Brazos extendidos hacia adelante: la silueta que lo identifica desde
    // arriba, que es el unico angulo desde el que se lo va a ver.
    pieza('BrazoI', 'capsule', PIEL, [0.15, 0.36, 0.15], [-0.34, 1.12, -0.42], [78, 0, 10]);
    pieza('BrazoD', 'capsule', PIEL, [0.15, 0.36, 0.15], [0.34, 1.12, -0.42], [78, 0, -10]);

    // Cabeza caida hacia un lado.
    pieza('Cabeza', 'sphere', PIEL, [0.32, 0.34, 0.32], [0.05, 1.45, -0.14], [0, 0, 14]);

    return raiz;
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
      this.ai.aturdir(0.25);
      // Empujon hacia atras, para que se note el impacto.
      if (info.dirX !== undefined) {
        const p = this.posicion;
        const r = this.world.moveCircle(
          { x: p.x, z: p.z },
          info.dirX * 0.35,
          info.dirZ * 0.35,
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
    // Se desploma. Girarlo es mas barato que una animacion y comunica lo
    // mismo: ya no es una amenaza.
    this.entity.setEulerAngles(80, this.rumboVisual, 0);
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

    return decision.atacar;
  }

  destruir() {
    this.entity.destroy();
  }
}

export { EstadoZombi };
