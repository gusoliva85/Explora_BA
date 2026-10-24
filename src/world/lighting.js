import * as pc from 'playcanvas';

/**
 * ===========================================================================
 * ILUMINACION NOCTURNA
 * ===========================================================================
 * Antes habia una sola luz direccional y una luz ambiente alta para que no
 * quedara todo negro. Eso es lo que hacia que la calle se viera plana y
 * gris: sin fuentes de luz puntuales no hay charcos de luz, no hay sombras
 * que se alarguen, y no hay nada para que el bloom muerda.
 *
 * El esquema que se usa aca es el de una calle real de noche:
 *
 *   1. Luz ambiente MUY baja y azulada. Es el cielo, nada mas.
 *   2. Una direccional fria y debil, con sombras: la luna. Define las
 *      siluetas y da direccion, pero casi no ilumina.
 *   3. Los faroles de sodio. Son los que de verdad iluminan, y son luces
 *      puntuales con alcance corto. Cada charco de luz es un refugio y
 *      cada tramo oscuro entre dos faroles es tension.
 *   4. Ventanas encendidas. No iluminan nada, pero rompen la masa negra de
 *      las fachadas y el bloom las convierte en puntos vivos.
 *
 * La regla de rendimiento: UNA sola luz proyecta sombras. Cada luz con
 * sombra cuesta una pasada de render entera, y en un telefono eso se nota
 * enseguida.
 */

/** Color de una lampara de sodio: naranja fuerte, nada de blanco. */
export const COLOR_SODIO = new pc.Color(1.0, 0.62, 0.26);

/** Color de la luna: azul frio, muy desaturado. */
export const COLOR_LUNA = new pc.Color(0.55, 0.68, 1.0);

export const LUZ = {
  /** Lo unico que ilumina las caras que no ven ningun farol. */
  ambiente: new pc.Color(0.14, 0.185, 0.29),
  /** Intensidad de la luna. Baja a proposito: define, no ilumina. */
  lunaIntensidad: 2.4,
  /** Alcance de un farol, en metros. Mas que esto y la calle se aplana. */
  farolAlcance: 24,
  /*
   * Ojo con este numero. Las unidades del motor NO son fisicas salvo que
   * se active `scene.physicalUnits`, y la caida es inversa al cuadrado:
   * a siete metros de la lampara, que es la altura del brazo, lo que llega
   * al piso es una fraccion chica de la intensidad nominal. Con 11 la
   * calle quedaba literalmente negra.
   */
  farolIntensidad: 20,
  /** Altura del brazo del farol. */
  farolAltura: 7.2,
  /** Cada cuantos metros va un farol. Se alternan de vereda. */
  farolCada: 24
};

/**
 * Luz general de la escena: ambiente y luna.
 * @param {pc.AppBase} app
 * @returns {pc.Entity} la entidad de la luna, por si hay que animarla
 */
export function montarLuzAmbiente(app) {
  app.scene.ambientLight = LUZ.ambiente;
  // Con el pipeline HDR la exposicion pasa a importar: es el diafragma.
  app.scene.exposure = 1.0;
  app.scene.skyboxIntensity = 0;

  /*
   * La luna NO proyecta sombras, y es una decision medida, no una omision.
   *
   * Se probo con sombras y el resultado era una calle negra: los edificios
   * tienen entre nueve y diecisiete metros a los dos lados de una calzada
   * de diez, asi que cualquier luz direccional elevada deja el asfalto
   * entero en sombra. Subir el bias no cambia nada porque no es acne: es
   * oclusion de verdad.
   *
   * Ademas, en la realidad la luz de luna es tan debil que sus sombras no
   * se distinguen al lado de un farol de sodio. Y cada luz con sombra
   * cuesta una pasada de render completa, que es lo mas caro que hay en un
   * telefono.
   *
   * La sensacion de apoyo y de volumen la dan la oclusion ambiental del
   * pipeline y el contraste entre los charcos de luz y la oscuridad.
   */
  const luna = new pc.Entity('Luna');
  luna.addComponent('light', {
    type: 'directional',
    color: COLOR_LUNA,
    intensity: LUZ.lunaIntensidad,
    castShadows: false
  });
  // Rasante: realza las caras que miran al noroeste y deja el resto en
  // penumbra, que es lo que separa un edificio del de al lado.
  luna.setEulerAngles(38, -52, 0);
  app.root.addChild(luna);
  return luna;
}

/**
 * Un farol de sodio: poste, brazo, lampara emisiva y la luz puntual.
 *
 * La lampara es una esfera con material emisivo fuerte. No ilumina nada por
 * si misma (de eso se encarga la luz puntual), pero el bloom la convierte
 * en un punto que derrama, y eso es la mitad del efecto.
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
  lampara.addComponent('render', { type: 'sphere', material: mats.lampara, castShadows: false });
  lampara.setLocalScale(0.5, 0.26, 0.5);
  lampara.setLocalPosition(0, alto - 0.22, -largoBrazo);
  raiz.addChild(lampara);

  const luz = new pc.Entity('LuzFarol');
  luz.addComponent('light', {
    type: 'omni',
    color: COLOR_SODIO,
    intensity: LUZ.farolIntensidad,
    range: LUZ.farolAlcance,
    // Ninguna luz puntual proyecta sombras: con quince faroles seria
    // imposible de sostener en un telefono.
    castShadows: false,
    // Caida suave: el charco de luz no tiene borde recortado.
    falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED
  });
  luz.setLocalPosition(0, alto - 0.35, -largoBrazo);
  raiz.addChild(luz);

  app.root.addChild(raiz);
  return raiz;
}

/**
 * Materiales de iluminacion compartidos.
 *
 * Se crean una sola vez y se reparten: menos materiales distintos es menos
 * cambios de estado y menos draw calls.
 */
export function crearMaterialesLuz() {
  const metal = new pc.StandardMaterial();
  metal.diffuse = new pc.Color(0.16, 0.17, 0.19);
  metal.metalness = 0.85;
  metal.gloss = 0.45;
  metal.useMetalness = true;
  metal.update();

  // Emisivo por encima de 1: eso es lo que hace que el bloom lo tome.
  const lampara = new pc.StandardMaterial();
  lampara.diffuse = new pc.Color(0, 0, 0);
  lampara.emissive = new pc.Color(1.0, 0.68, 0.34);
  lampara.emissiveIntensity = 7;
  lampara.useLighting = false;
  lampara.update();

  // Ventana encendida. Varias intensidades para que no parezcan todas la
  // misma lampara.
  const ventana = new pc.StandardMaterial();
  ventana.diffuse = new pc.Color(0, 0, 0);
  ventana.emissive = new pc.Color(1.0, 0.82, 0.55);
  ventana.emissiveIntensity = 2.0;
  ventana.useLighting = false;
  ventana.update();

  const ventanaFria = new pc.StandardMaterial();
  ventanaFria.diffuse = new pc.Color(0, 0, 0);
  ventanaFria.emissive = new pc.Color(0.62, 0.78, 1.0);
  ventanaFria.emissiveIntensity = 1.6;
  ventanaFria.useLighting = false;
  ventanaFria.update();

  return { metal, lampara, ventana, ventanaFria };
}
