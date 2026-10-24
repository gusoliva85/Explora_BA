import { dirDeRumbo } from '../core/rumbo.js';

/**
 * ===========================================================================
 * PROYECTILES
 * ===========================================================================
 * El cohete de la bazooka: lo unico del juego que viaja en vez de llegar.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTE SI ES UN PROYECTIL Y LA BALA NO
 * ---------------------------------------------------------------------------
 * La pistola es un rayo instantaneo porque una bala de 9 mm cruza sus 28 m
 * de alcance en ocho centesimas: simularla como objeto agrega trabajo por
 * cuadro y una demora que nadie puede aprovechar.
 *
 * El cohete es lo contrario. A 24 m/s tarda mas de un segundo y medio en
 * cruzar cuarenta metros, y **esa demora es el arma**. Es el tiempo en el
 * que la horda sigue avanzando hacia donde ya no va a estar la explosion,
 * y por el que la bazooka se dispara ANTES de que te rodeen y no cuando ya
 * te rodearon. Un cohete instantaneo seria una pistola que hace mas daño.
 *
 * ---------------------------------------------------------------------------
 * NO PERSIGUE
 * ---------------------------------------------------------------------------
 * El apuntado es automatico (D-03), pero una vez que sale, el cohete vuela
 * derecho hacia donde estaba el objetivo al disparar. No lo sigue.
 *
 * Es deliberado: si persiguiera, la demora no costaria nada y el arma
 * volveria a ser "apretar para matar". Volando derecho, un zombi que
 * cambia de direccion se salva, y el radio de seis metros es lo que
 * perdona el error. Esa es toda la tension del arma.
 */

export class Proyectil {
  /**
   * @param {object} opt
   * @param {{x:number,z:number}} opt.origen
   * @param {number} opt.rumbo grados
   * @param {number} opt.velocidad m/s
   * @param {number} opt.alcance metros antes de detonar sola
   * @param {number} [opt.radioImpacto] a que distancia de un cuerpo detona
   * @param {number} [opt.altura] a que altura vuela
   */
  constructor(opt) {
    this.x = opt.origen.x;
    this.z = opt.origen.z;
    const dir = dirDeRumbo(opt.rumbo);
    this.dirX = dir.x;
    this.dirZ = dir.z;
    this.rumbo = opt.rumbo;
    this.velocidad = opt.velocidad;
    this.alcance = opt.alcance;
    this.radioImpacto = opt.radioImpacto ?? 0.7;
    this.altura = opt.altura ?? 1.2;
    this.recorrido = 0;
    this.vivo = true;
  }
}

export class GestorProyectiles {
  /**
   * @param {object} opt
   * @param {Function} [opt.rayo] prueba del escenario
   * @param {(info:object) => void} [opt.alDetonar]
   */
  constructor(opt = {}) {
    this.rayo = opt.rayo;
    this.alDetonar = opt.alDetonar;
    /** @type {Proyectil[]} */
    this.vivos = [];
  }

  lanzar(opt) {
    const p = new Proyectil(opt);
    this.vivos.push(p);
    return p;
  }

  /**
   * Avanza todos los proyectiles y detona los que corresponda.
   *
   * @param {number} dt
   * @param {Array<{posicion:{x:number,z:number}, vivo:boolean}>} objetivos
   */
  update(dt, objetivos = []) {
    for (let i = this.vivos.length - 1; i >= 0; i--) {
      const p = this.vivos[i];
      const paso = p.velocidad * dt;

      /*
       * El tramo de este cuadro se prueba COMPLETO, no solo el punto de
       * llegada.
       *
       * A 24 m/s con el techo de dt (1/15 s) el cohete avanza 1,6 m por
       * cuadro, mas del doble de su radio de impacto. Mirando solo donde
       * termina, puede aparecer del otro lado de un zombi —o de una
       * pared— sin haber chocado con nada. Es el mismo error de
       * atravesar paredes que ya hubo con el jugador, y se arregla igual:
       * probando el segmento.
       */
      const haciaX = p.x + p.dirX * paso;
      const haciaZ = p.z + p.dirZ * paso;

      const impacto = this.#buscarImpacto(p, haciaX, haciaZ, paso, objetivos);

      if (impacto) {
        p.x = impacto.x;
        p.z = impacto.z;
        p.vivo = false;
        this.vivos.splice(i, 1);
        this.alDetonar?.({
          x: p.x,
          z: p.z,
          altura: p.altura,
          contra: impacto.contra,
          objetivo: impacto.objetivo ?? null,
          proyectil: p
        });
        continue;
      }

      p.x = haciaX;
      p.z = haciaZ;
      p.recorrido += paso;

      // Agotado el alcance, detona en el aire. Nunca se queda volando.
      if (p.recorrido >= p.alcance) {
        p.vivo = false;
        this.vivos.splice(i, 1);
        this.alDetonar?.({
          x: p.x,
          z: p.z,
          altura: p.altura,
          contra: 'alcance',
          objetivo: null,
          proyectil: p
        });
      }
    }
  }

  /** Primer impacto del tramo: pared o cuerpo, el que llegue antes. */
  #buscarImpacto(p, haciaX, haciaZ, paso, objetivos) {
    let mejor = null;

    if (this.rayo && paso > 0) {
      const hit = this.rayo(p.x, p.z, haciaX, haciaZ, p.altura);
      if (hit) {
        mejor = { avance: hit.t * paso, x: hit.x, z: hit.z, contra: 'pared' };
      }
    }

    for (const objetivo of objetivos) {
      if (!objetivo.vivo) continue;
      const q = objetivo.posicion;
      const dx = q.x - p.x;
      const dz = q.z - p.z;

      // Proyeccion sobre el tramo, acotada a el: asi un zombi que quedo
      // atras o mucho mas adelante no cuenta.
      const sobre = dx * p.dirX + dz * p.dirZ;
      if (sobre < -p.radioImpacto || sobre > paso + p.radioImpacto) continue;

      const costado = Math.abs(dx * -p.dirZ + dz * p.dirX);
      if (costado > p.radioImpacto) continue;

      /*
       * Donde ENTRA al cuerpo, no donde queda mas cerca de el.
       *
       * Usando `sobre` directamente, el cohete detonaba hasta un radio
       * antes del zombi: la prueba lo vio detonar a 4,4 m de un blanco
       * que estaba a 5. Con una explosion de seis metros no cambia a
       * quien mata, pero el destello aparecia visiblemente corto, y el
       * dia que la explosion sea mas chica empezaria a fallar de verdad.
       *
       * El punto de entrada sale del triangulo: a `costado` metros del
       * eje, la esfera de radio `radioImpacto` empieza
       * `sqrt(radio^2 - costado^2)` antes del centro.
       */
      const mitadCuerda = Math.sqrt(
        Math.max(0, p.radioImpacto * p.radioImpacto - costado * costado)
      );
      const avance = Math.max(0, Math.min(paso, sobre - mitadCuerda));
      if (!mejor || avance < mejor.avance) {
        mejor = {
          avance,
          x: p.x + p.dirX * avance,
          z: p.z + p.dirZ * avance,
          contra: 'cuerpo',
          objetivo
        };
      }
    }

    return mejor;
  }

  limpiar() {
    this.vivos.length = 0;
  }
}
