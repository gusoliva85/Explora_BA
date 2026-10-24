import * as pc from 'playcanvas';

/**
 * ===========================================================================
 * ILUMINACION — DE DIA
 * ===========================================================================
 * El juego transcurre de DIA. La version nocturna anterior se descarto por
 * un motivo simple: obligaba a esforzarse para ver. En un telefono, a
 * pleno sol y con el brillo a la mitad, una escena oscura no se juega.
 *
 * El objetivo es un low-poly claro: colores algo apagados y mates, pero con
 * mucha separacion entre superficies. La definicion no viene del detalle
 * sino del contraste entre planos, y eso se consigue con tres cosas:
 *
 *   1. Un sol fuerte y alto, CON sombras. De dia las sombras no son un
 *      problema sino la herramienta principal: una sombra nitida en el
 *      piso dice "esto esta apoyado aca" mejor que cualquier textura.
 *   2. Luz de cielo abundante y azulada. Rellena las sombras para que
 *      sigan siendo legibles en vez de ser agujeros negros, y de paso las
 *      tiñe de azul, que es lo que hace que una escena de dia parezca de
 *      dia y no un gris sucio.
 *   3. Oclusion ambiental marcada, que dibuja el contacto entre cada
 *      objeto y el piso.
 *
 * Lo que NO se usa: emisivos fuertes ni bloom pronunciado. De dia no hay
 * nada que brille mas que el cielo, y un bloom alto solo lava la imagen y
 * se come justamente la definicion que se busca.
 */

/** Color del sol: calido, casi blanco. */
export const COLOR_SOL = new pc.Color(1.0, 0.96, 0.88);

/**
 * Luz de cielo: el relleno de las sombras.
 *
 * Lleva algo de azul porque el cielo lo tiene, pero mucho menos de lo que
 * parece razonable. Con un azul franco, el asfalto gris se teñia entero y
 * la calzada se veia azul marino en vez de gris. La luz ambiente tiñe
 * TODO, asi que su saturacion se nota mucho mas que la de cualquier
 * material.
 */
export const COLOR_CIELO = new pc.Color(0.56, 0.59, 0.63);

/** Color del horizonte: fondo del cielo y bruma de distancia. */
export const COLOR_HORIZONTE = new pc.Color(0.74, 0.81, 0.87);

export const LUZ = {
  /** Relleno global. Alto a proposito: es lo que mantiene todo legible. */
  ambiente: COLOR_CIELO,
  solIntensidad: 2.7,
  /*
   * Elevacion del sol. Es el numero mas sensible de todo el archivo.
   *
   * A 58 grados, un edificio de diecisiete metros proyecta una sombra de
   * casi once, y como la calzada mide diez, la sombra la cubria entera: la
   * calle quedaba como un corredor gris oscuro. A 73 la sombra baja a unos
   * cinco metros y solo alcanza hasta la mitad, que es justo lo que se
   * quiere: una vereda al sol, la otra en sombra, y la calzada despejada.
   */
  solElevacion: 73,
  /*
   * Azimut. Se elige para que la sombra caiga sesgada respecto del eje de
   * la calle y no perpendicular: cruzada deja franjas regulares que leen
   * como rayas; sesgada acompaña la diagonal de la camara.
   */
  solAzimut: -24,
  /**
   * Hasta donde se calculan sombras. Mas alla el terreno se ve igual pero
   * sin sombra, y como la camara mira desde arriba, no se nota.
   */
  /*
   * Hasta donde se calculan sombras. Se bajo de 80 a 60 midiendo: las
   * sombras eran casi la mitad de las llamadas de dibujo, y a sesenta
   * metros el corte cae donde la bruma de distancia ya empezo a lavar
   * todo, asi que no se nota.
   */
  sombraDistancia: 60,

  /** Cada cuantos metros va un farol. De dia son props, no luces. */
  farolCada: 26,
  farolAltura: 7.2
};

/**
 * Luz general de la escena.
 *
 * @param {pc.AppBase} app
 * @param {boolean} sombrasDeCalidad perfil alto o movil
 * @returns {pc.Entity} la entidad del sol
 */
export function montarLuzAmbiente(app, sombrasDeCalidad = true) {
  app.scene.ambientLight = LUZ.ambiente;
  app.scene.exposure = 1.0;
  app.scene.skyboxIntensity = 0;

  const sol = new pc.Entity('Sol');
  sol.addComponent('light', {
    type: 'directional',
    color: COLOR_SOL,
    intensity: LUZ.solIntensidad,
    castShadows: true,
    /*
     * Cascadas: la camara abarca mucha calle de golpe, asi que una sola
     * resolucion de sombra o queda pixelada cerca o se desperdicia lejos.
     * Varias cascadas con distribucion corta concentran la resolucion
     * donde esta el jugador, que es donde se mira.
     */
    numCascades: sombrasDeCalidad ? 3 : 2,
    cascadeDistribution: 0.45,
    shadowDistance: LUZ.sombraDistancia,
    shadowResolution: sombrasDeCalidad ? 2048 : 1024,
    shadowType: pc.SHADOW_PCF3_32F,
    shadowBias: 0.04,
    normalOffsetBias: 0.04,
    /*
     * La sombra no llega a negro. Es la decision que mantiene legible la
     * vereda del lado en sombra: en la realidad el cielo la rellena, y aca
     * se imita bajando cuanto oscurece la sombra.
     */
    shadowIntensity: 0.52
  });
  sol.setEulerAngles(LUZ.solElevacion, LUZ.solAzimut, 0);
  app.root.addChild(sol);
  return sol;
}

/**
 * Un farol: poste, brazo y lampara.
 *
 * De dia no emite luz: es mobiliario urbano. Se conserva porque la
 * repeticion de faroles a lo largo de la vereda es parte de como se lee
 * una calle, y porque cuando aparezca una mision de noche ya va a estar
 * puesto y solo habra que encenderlo.
 *
 * @param {pc.AppBase} app
 * @param {{x:number,z:number}} pos base del poste
 * @param {number} anguloGrados hacia donde apunta el brazo
 * @param {object} mats materiales compartidos
 * @returns {pc.Entity}
 */
export function crearFarol(app, pos, anguloGrados, mats) {
  const raiz = new pc.Entity('Farol');
  raiz.setPosition(pos.x, 0, pos.z);
  raiz.setEulerAngles(0, anguloGrados, 0);

  const alto = LUZ.farolAltura;
  const largoBrazo = 1.9;

  const poste = new pc.Entity('Poste');
  poste.addComponent('render', { type: 'cylinder', material: mats.metal, castShadows: true });
  poste.setLocalScale(0.16, alto, 0.16);
  poste.setLocalPosition(0, alto / 2, 0);
  raiz.addChild(poste);

  const brazo = new pc.Entity('Brazo');
  brazo.addComponent('render', { type: 'cylinder', material: mats.metal, castShadows: true });
  brazo.setLocalScale(0.1, largoBrazo, 0.1);
  brazo.setLocalPosition(0, alto - 0.1, -largoBrazo / 2);
  brazo.setLocalEulerAngles(90, 0, 0);
  raiz.addChild(brazo);

  const lampara = new pc.Entity('Lampara');
  lampara.addComponent('render', { type: 'sphere', material: mats.lampara, castShadows: true });
  lampara.setLocalScale(0.5, 0.26, 0.5);
  lampara.setLocalPosition(0, alto - 0.22, -largoBrazo);
  raiz.addChild(lampara);

  app.root.addChild(raiz);
  return raiz;
}

/**
 * Materiales compartidos.
 *
 * Todos son mates: `gloss` bajo y `metalness` en cero salvo donde de
 * verdad hay metal. Un especular fuerte es lo que hace que un low-poly se
 * vea de plastico, y ademas compite con la lectura de las formas.
 */
export function crearMaterialesLuz() {
  const metal = new pc.StandardMaterial();
  metal.diffuse = new pc.Color(0.3, 0.32, 0.34);
  metal.metalness = 0.55;
  metal.gloss = 0.3;
  metal.useMetalness = true;
  metal.update();

  const lampara = new pc.StandardMaterial();
  lampara.diffuse = new pc.Color(0.76, 0.74, 0.68);
  lampara.gloss = 0.25;
  lampara.metalness = 0;
  lampara.useMetalness = true;
  lampara.update();

  /*
   * Ventanas. De dia un vidrio no brilla: refleja el cielo. Se resuelve
   * con un azul oscuro y algo de brillo, que es mucho mas barato que un
   * reflejo de verdad y a esta distancia de camara se lee igual.
   */
  const ventana = new pc.StandardMaterial();
  ventana.diffuse = new pc.Color(0.19, 0.25, 0.32);
  ventana.gloss = 0.55;
  ventana.metalness = 0.1;
  ventana.useMetalness = true;
  ventana.update();

  // Alguna con la cortina corrida o la persiana a media asta: rompe la
  // repeticion sin costar nada.
  const ventanaFria = new pc.StandardMaterial();
  ventanaFria.diffuse = new pc.Color(0.46, 0.44, 0.4);
  ventanaFria.gloss = 0.15;
  ventanaFria.metalness = 0;
  ventanaFria.useMetalness = true;
  ventanaFria.update();

  return { metal, lampara, ventana, ventanaFria };
}
