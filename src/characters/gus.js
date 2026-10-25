import * as pc from 'playcanvas';
import { ACABADO } from '../world/palette.js';
import { ESCALA } from '../art/styleGuide.js';
import { Animador, Pose } from './pose.js';

/**
 * ===========================================================================
 * GUS — FASE 12.B
 * ===========================================================================
 * El protagonista, construido con primitivas encastradas en una jerarquía
 * que se puede animar. Reemplaza a la cápsula provisional.
 *
 * ---------------------------------------------------------------------------
 * LA FICHA, CERRADA
 * ---------------------------------------------------------------------------
 * El documento 02 marcaba en 🔴 que faltaban vistas de frente, espalda,
 * perfil y cuerpo entero para poder modelarlo. Siguen faltando como
 * dibujos, y eso bloquea un modelo *realista*. No bloquea éste, y vale la
 * pena explicar la diferencia.
 *
 * A veinte metros de cámara Gus mide unos cuarenta píxeles de alto. A esa
 * escala no existen la barba de pocos días, el cierre en diagonal ni la
 * costura del bolsillo: lo único que llega al jugador es la **silueta** y
 * el **valor**. Así que lo que hubo que decidir no fue cómo es la espalda
 * de la campera, sino **qué dos rasgos se exageran** para que Gus sea
 * reconocible de un vistazo. El propio documento 02 ya los nombraba:
 *
 *   1. **El pelo con volumen**, que le da una cabeza más ancha y alta de lo
 *      natural y hace una silueta que ningún zombi tiene.
 *   2. **Las solapas de la campera**, que ensanchan los hombros y crean un
 *      trapecio: hombros anchos, cintura angosta.
 *
 * Las otras decisiones que el 02 dejaba abiertas (🟡), resueltas:
 *
 * | Pregunta | Decisión | Por qué |
 * |---|---|---|
 * | ¿Mochila? | **No** | Redondea la espalda y mata el trapecio de los hombros, que es el rasgo que lo identifica desde arriba |
 * | ¿Guantes? | **Sí, oscuros** | Las manos son lo único de piel que se mueve rápido; con guantes la silueta del brazo queda limpia |
 * | ¿Dónde van las armas? | **Pistola al cinto, cuchillo en la bota** | Se ven, suman silueta y cuentan que está preparado |
 * | ¿La bazooka a la espalda? | **No** | Cambiaría la silueta por completo y la bazooka aparece dos veces por partida |
 * | ¿Detalle facial? | **Ninguno** | A esa distancia la cara son tres píxeles. El pelo hace todo el trabajo |
 *
 * ---------------------------------------------------------------------------
 * LA JERARQUIA
 * ---------------------------------------------------------------------------
 * Cada parte cuelga de su padre y gira sobre su propio pivote, como un
 * muñeco articulado:
 *
 *     raiz
 *      └ cadera
 *         ├ torso ── hombros ─┬ brazoI ─ antebrazoI ─ manoI
 *         │                   └ brazoD ─ antebrazoD ─ manoD ─ [arma]
 *         │          cuello ── cabeza ── pelo
 *         ├ piernaI ─ pantorrillaI ─ pieI
 *         └ piernaD ─ pantorrillaD ─ pieD
 *
 * El truco de siempre con los pivotes: una pieza gira alrededor de su
 * origen, así que el muslo tiene que colgar de la cadera con su origen
 * ARRIBA, no en el centro. Por eso cada miembro es un contenedor vacío que
 * gira, con la malla desplazada hacia abajo dentro de él.
 */

/** Colores de Gus. Oscuros, pero nunca negro puro. */
const COLOR = {
  /*
   * La campera.
   *
   * La referencia dice cuero negro, pero un negro puro sobre asfalto gris
   * desaparece: a la distancia de cámara las dos cosas son una sola mancha
   * oscura. Un gris muy oscuro y azulado lee como negro y al mismo tiempo
   * se recorta contra la calzada.
   */
  campera: [0.1, 0.105, 0.125],
  camperaClara: [0.16, 0.17, 0.2],
  remera: [0.07, 0.07, 0.08],
  jean: [0.19, 0.24, 0.34],
  piel: [0.72, 0.56, 0.44],
  pelo: [0.1, 0.09, 0.09],
  bota: [0.13, 0.11, 0.1],
  guante: [0.12, 0.12, 0.14],
  metal: [0.3, 0.31, 0.33]
};

/**
 * Medidas, en metros.
 *
 * ---------------------------------------------------------------------------
 * LA CADERA NO ES UN NUMERO: SE DEDUCE DE LA PIERNA
 * ---------------------------------------------------------------------------
 * Primero estaba escrita a mano, y el resultado fue el error clasico de
 * armar un personaje por partes: al bajar la cadera para corregir la
 * altura, lo que pasa NO es que el personaje se achique, sino que se hunde
 * en el piso. La altura total es la misma y los pies quedan enterrados.
 *
 * La cadera tiene que estar exactamente a la altura que necesita la cadena
 * de la pierna para que la suela toque el suelo. Es una invariante, no una
 * preferencia, y se calcula.
 *
 * Lo que queda para elegir son las proporciones. Estan ajustadas para que
 * el total de `ESCALA.gus`, y hay una prueba que lo verifica: si alguien
 * alarga una pierna, la prueba avisa que Gus dejo de medir 1,80.
 */
const PIE_BAJO = 0.1;

const M = {
  torso: 0.54,
  cuello: 0.08,
  cabeza: 0.21,
  muslo: 0.44,
  pantorrilla: 0.4,
  brazo: 0.3,
  antebrazo: 0.28,
  anchoHombros: 0.52,
  anchoCadera: 0.32,

  /** Cuanto sobresale el pelo por encima del craneo. */
  pelo: 0.075,

  /*
   * A que distancia del eje cuelga cada brazo.
   *
   * Antes salia de `anchoHombros * 0.42`, que daba 0,218: con la campera
   * de 0,44 de ancho —0,22 de medio ancho— y brazos de 0,12 de grosor, la
   * mitad del brazo quedaba FUERA del torso y los brazos se veian pegados
   * al aire, como una pose en T mal resuelta.
   *
   * Con 0,195 el brazo apoya contra el costado de la campera y la silueta
   * se cierra.
   */
  offsetBrazo: 0.195
};

/** Altura de la cadera: la que deja la suela apoyada en el piso. */
M.cadera = M.muslo + M.pantorrilla + PIE_BAJO;

/** Alto total, de la suela a la punta del pelo. */
M.alto = M.cadera + (M.torso + M.cuello * 0.4) + (M.cabeza + 0.03 + M.pelo * 0.6);

export class Gus {
  /**
   * @param {pc.Entity} raiz entidad que ya mueve el controlador
   * @param {import('../world/palette.js').Materiales} mats
   */
  constructor(raiz, mats) {
    this.raiz = raiz;
    this.mats = mats;
    this.animador = new Animador(Pose.QUIETO);

    const mat = (c, acabado = ACABADO.tela) => mats.get(c, acabado);

    /** Contenedor que gira al desplomarse, sin tocar la raíz del jugador. */
    this.cuerpo = new pc.Entity('GusCuerpo');
    raiz.addChild(this.cuerpo);

    // --- Cadera -------------------------------------------------------------
    this.cadera = new pc.Entity('Cadera');
    this.cadera.setLocalPosition(0, M.cadera, 0);
    this.cuerpo.addChild(this.cadera);

    this.#pieza(this.cadera, 'Pelvis', 'box', COLOR.jean, [M.anchoCadera, 0.22, 0.26], [0, -0.06, 0]);

    // --- Torso --------------------------------------------------------------
    this.torso = new pc.Entity('Torso');
    this.cadera.addChild(this.torso);

    this.#pieza(this.torso, 'Remera', 'box', COLOR.remera, [0.38, M.torso, 0.24], [0, M.torso / 2, 0]);
    /*
     * La campera va POR ENCIMA de la remera y un poco más ancha, en vez de
     * ser una sola caja. Dos volúmenes apenas separados dan un borde que a
     * contraluz se lee como "lleva algo puesto"; una caja sola se lee como
     * un torso pintado.
     */
    this.#pieza(
      this.torso,
      'Campera',
      'box',
      COLOR.campera,
      [0.44, M.torso * 0.86, 0.3],
      [0, M.torso * 0.52, 0],
      null,
      ACABADO.tela,
      true
    );

    /*
     * LAS SOLAPAS: uno de los dos rasgos que hacen a Gus reconocible.
     *
     * Son dos cuñas giradas hacia afuera en el pecho. Exageradas a
     * propósito: desde arriba convierten los hombros en un trapecio ancho
     * que ningún zombi tiene.
     */
    for (const lado of [-1, 1]) {
      this.#pieza(
        this.torso,
        `Solapa${lado < 0 ? 'I' : 'D'}`,
        'box',
        COLOR.camperaClara,
        [0.17, 0.3, 0.1],
        [lado * 0.14, M.torso * 0.74, -0.15],
        [0, 0, lado * -22]
      );
    }

    // Hombros: la barra de la que cuelgan los brazos.
    this.hombros = new pc.Entity('Hombros');
    this.hombros.setLocalPosition(0, M.torso * 0.92, 0);
    this.torso.addChild(this.hombros);
    this.#pieza(
      this.hombros,
      'Hombreras',
      'box',
      COLOR.campera,
      [M.anchoHombros, 0.14, 0.28],
      [0, 0, 0]
    );

    // --- Cabeza -------------------------------------------------------------
    this.cuello = new pc.Entity('Cuello');
    this.cuello.setLocalPosition(0, M.torso + M.cuello * 0.4, 0);
    this.torso.addChild(this.cuello);

    this.cabeza = new pc.Entity('Cabeza');
    this.cuello.addChild(this.cabeza);
    this.#pieza(
      this.cabeza,
      'Craneo',
      'box',
      COLOR.piel,
      [0.19, M.cabeza, 0.2],
      [0, M.cabeza / 2, 0],
      null,
      ACABADO.tela,
      true
    );

    /*
     * EL PELO: el otro rasgo. Es una caja más ancha y más alta que el
     * cráneo, desplazada hacia atrás, con dos mechones hacia arriba.
     *
     * Está deliberadamente fuera de proporción. A cuarenta píxeles de alto,
     * un pelo "realista" es un borde de un píxel y no existe; este volumen
     * es lo que hace que la cabeza de Gus tenga una forma propia desde
     * cualquier ángulo.
     */
    this.#pieza(this.cabeza, 'Pelo', 'box', COLOR.pelo, [0.23, 0.13, 0.23], [0, M.cabeza * 0.86, 0.01]);
    this.#pieza(this.cabeza, 'Mechon1', 'box', COLOR.pelo, [0.09, 0.09, 0.1], [-0.04, M.cabeza + 0.03, 0.03], [0, 0, 16]);
    this.#pieza(this.cabeza, 'Mechon2', 'box', COLOR.pelo, [0.07, 0.07, 0.09], [0.05, M.cabeza + 0.02, 0.0], [0, 0, -12]);

    // --- Brazos -------------------------------------------------------------
    this.brazoI = this.#miembro(this.hombros, 'BrazoI', -1, M.brazo, 0.12, COLOR.campera, M.offsetBrazo);
    this.brazoD = this.#miembro(this.hombros, 'BrazoD', 1, M.brazo, 0.12, COLOR.campera, M.offsetBrazo);

    this.codoI = this.#segmento(this.brazoI, 'AntebrazoI', M.brazo, M.antebrazo, 0.1, COLOR.campera);
    this.codoD = this.#segmento(this.brazoD, 'AntebrazoD', M.brazo, M.antebrazo, 0.1, COLOR.campera);

    // Guantes. Oscuros, para que el brazo termine en una silueta limpia.
    this.manoI = this.#punta(this.codoI, 'ManoI', M.antebrazo, 0.1, COLOR.guante);
    this.manoD = this.#punta(this.codoD, 'ManoD', M.antebrazo, 0.1, COLOR.guante);

    /**
     * Anclaje del arma, en la mano derecha (tarea 12.12).
     *
     * Es un contenedor vacío. Quien equipe un arma la cuelga acá y se mueve
     * sola con la animación, sin que el arma tenga que saber nada del
     * personaje.
     */
    this.anclaArma = new pc.Entity('AnclaArma');
    this.anclaArma.setLocalPosition(0, -0.06, -0.04);
    this.manoD.addChild(this.anclaArma);

    // --- Piernas ------------------------------------------------------------
    // Los muslos SI proyectan: son los que separan las piernas en la sombra
    // y los que hacen que un caminar se lea desde arriba.
    this.piernaI = this.#miembro(this.cadera, 'PiernaI', -1, M.muslo, 0.14, COLOR.jean, 0.09, true);
    this.piernaD = this.#miembro(this.cadera, 'PiernaD', 1, M.muslo, 0.14, COLOR.jean, 0.09, true);

    this.rodillaI = this.#segmento(this.piernaI, 'PantorrillaI', M.muslo, M.pantorrilla, 0.12, COLOR.jean);
    this.rodillaD = this.#segmento(this.piernaD, 'PantorrillaD', M.muslo, M.pantorrilla, 0.12, COLOR.jean);

    this.#pie(this.rodillaI, 'PieI', M.pantorrilla);
    this.#pie(this.rodillaD, 'PieD', M.pantorrilla);

    // --- Armas guardadas, que suman silueta ---------------------------------
    /*
     * La pistola al cinto y el cuchillo en la bota.
     *
     * No son interactivos: son dos volúmenes que cuentan que el personaje
     * está preparado, y que rompen la línea recta de la cadera y la pierna.
     * Cuestan ocho triángulos cada uno.
     */
    this.pistolaAlCinto = this.#pieza(
      this.cadera,
      'PistolaCinto',
      'box',
      COLOR.metal,
      [0.07, 0.14, 0.1],
      [0.19, -0.06, 0.02],
      [0, 0, 8]
    );
    this.#pieza(this.rodillaI, 'CuchilloBota', 'box', COLOR.metal, [0.04, 0.16, 0.05], [
      -0.09,
      -M.pantorrilla * 0.55,
      0.02
    ]);
  }

  // =========================================================================
  // CONSTRUCCION
  // =========================================================================

  /**
   * @param {boolean} [sombra] si la pieza proyecta sombra
   *
   * Casi ninguna lo hace, y es deliberado. Cada pieza que proyecta cuesta
   * una llamada de dibujo EXTRA en el mapa de sombras: con veinticuatro
   * piezas, Gus solo costaba cuarenta y ocho. A veinte metros de camara la
   * sombra de un mechon de pelo cae dentro de la sombra del cuerpo y no se
   * distingue; lo unico que hace falta para que la figura se apoye en el
   * piso son los volumenes grandes.
   *
   * Es la misma medida que ya se habia tomado con los zombis.
   */
  #pieza(padre, nombre, tipo, color, escala, pos, rot = null, acabado = ACABADO.tela, sombra = false) {
    const e = new pc.Entity(nombre);
    e.addComponent('render', {
      type: tipo,
      material: this.mats.get(color, acabado),
      castShadows: sombra
    });
    e.setLocalScale(escala[0], escala[1], escala[2]);
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
    padre.addChild(e);
    return e;
  }

  /**
   * Un miembro que cuelga: pivote arriba, malla hacia abajo.
   *
   * Es el detalle que hace que todo funcione. Una caja gira alrededor de su
   * origen; si la malla estuviera centrada en el pivote, el muslo rotaría
   * alrededor de su propio medio y la pierna se partiría.
   */
  #miembro(padre, nombre, lado, largo, grosor, color, offsetX = 0, sombra = false) {
    const pivote = new pc.Entity(nombre);
    const x = lado * (offsetX || M.anchoHombros * 0.42);
    pivote.setLocalPosition(x, 0, 0);
    padre.addChild(pivote);
    this.#pieza(
      pivote,
      `${nombre}_m`,
      'box',
      color,
      [grosor, largo, grosor],
      [0, -largo / 2, 0],
      null,
      ACABADO.tela,
      sombra
    );
    return pivote;
  }

  /** El segmento siguiente: cuelga del extremo de su padre. */
  #segmento(padre, nombre, largoPadre, largo, grosor, color) {
    const pivote = new pc.Entity(nombre);
    pivote.setLocalPosition(0, -largoPadre, 0);
    padre.addChild(pivote);
    this.#pieza(pivote, `${nombre}_m`, 'box', color, [grosor, largo, grosor], [0, -largo / 2, 0]);
    return pivote;
  }

  /** La punta del miembro: mano o similar. */
  #punta(padre, nombre, largoPadre, tam, color) {
    const pivote = new pc.Entity(nombre);
    pivote.setLocalPosition(0, -largoPadre, 0);
    padre.addChild(pivote);
    this.#pieza(pivote, `${nombre}_m`, 'box', color, [tam, tam, tam], [0, -tam / 2, 0]);
    return pivote;
  }

  #pie(padre, nombre, largoPadre) {
    const pivote = new pc.Entity(nombre);
    pivote.setLocalPosition(0, -largoPadre, 0);
    padre.addChild(pivote);
    // El pie sale hacia adelante (-Z), que es el frente del modelo.
    this.#pieza(pivote, `${nombre}_m`, 'box', COLOR.bota, [0.13, 0.1, 0.26], [0, -0.05, -0.05]);
    return pivote;
  }

  // =========================================================================
  // ANIMACION
  // =========================================================================

  /**
   * @param {number} dt
   * @param {object} situacion
   * @param {number} situacion.velocidad m/s
   * @param {boolean} situacion.corriendo
   * @param {boolean} situacion.vivo
   * @param {boolean} [situacion.curandose]
   */
  update(dt, situacion) {
    const { velocidad = 0, corriendo = false, vivo = true, curandose = false } = situacion;

    if (!vivo) this.animador.pedir(Pose.MUERTO);
    else if (curandose) this.animador.pedir(Pose.CURARSE);
    else if (velocidad > 0.35) this.animador.pedir(corriendo ? Pose.CORRER : Pose.CAMINAR);
    else this.animador.pedir(Pose.QUIETO);

    this.animador.update(dt, velocidad);
    this.aplicar(this.animador.pose());
  }

  /** Pide un gesto de una sola vez. */
  gesto(cual) {
    this.animador.pedir(cual);
  }

  /** Lleva los números de una pose a la jerarquía. */
  aplicar(p) {
    this.cuerpo.setLocalEulerAngles(-p.desplome, 0, 0);
    this.cadera.setLocalPosition(0, M.cadera + p.cadera, 0);

    this.torso.setLocalEulerAngles(p.torso, p.torsoGiro, 0);
    this.cabeza.setLocalEulerAngles(p.cabeza, p.cabezaGiro, 0);

    // Tres grados de apertura, no seis: lo justo para que los brazos no
    // queden paralelos como palos, sin que se despeguen del torso.
    this.brazoI.setLocalEulerAngles(p.brazoI, 0, -3);
    this.brazoD.setLocalEulerAngles(p.brazoD, 0, 3);
    this.codoI.setLocalEulerAngles(-p.codoI, 0, 0);
    this.codoD.setLocalEulerAngles(-p.codoD, 0, 0);

    this.piernaI.setLocalEulerAngles(p.piernaI, 0, 0);
    this.piernaD.setLocalEulerAngles(p.piernaD, 0, 0);
    this.rodillaI.setLocalEulerAngles(-p.rodillaI, 0, 0);
    this.rodillaD.setLocalEulerAngles(-p.rodillaD, 0, 0);
  }

  /** La pistola al cinto se esconde cuando está en la mano. */
  mostrarPistolaAlCinto(visible) {
    this.pistolaAlCinto.enabled = visible;
  }

  /** Alto del modelo, de la suela a la punta del pelo. */
  get altura() {
    return M.alto;
  }

  /**
   * A que altura queda la suela. Tiene que ser cero.
   *
   * Existe para poder PROBARLO: un personaje medio enterrado en el asfalto
   * se ve mal y no tira ningun error.
   */
  get alturaDeLaSuela() {
    return M.cadera - (M.muslo + M.pantorrilla + PIE_BAJO);
  }
}

export { Pose };
export const MEDIDAS = M;
export const COLORES_GUS = COLOR;
