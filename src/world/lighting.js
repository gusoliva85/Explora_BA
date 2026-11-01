import * as pc from 'playcanvas';

/**
 * ===========================================================================
 * MOBILIARIO HEREDADO DE LA ILUMINACION
 * ===========================================================================
 * Lo que queda de la iluminacion vieja despues de 12R.2: el farol y unos
 * materiales compartidos. La luz, el cielo y la niebla viven ahora en
 * `src/visual/escena.js`.
 *
 * Esto es arte viejo y se borra en 12R.7, cuando se rehaga el mobiliario
 * urbano. Esta separado para que el reemplazo de la luz no tuviera que
 * esperar al reemplazo de los postes.
 */

/**
 * Cada cuantos metros va un farol, y cuanto mide.
 *
 * De dia son props, no luces: lo unico que queda de este archivo que
 * todavia usa el mundo. Se va entero en 12R.7, cuando el mobiliario
 * urbano se rehaga.
 */
export const LUZ = {
  farolCada: 26,
  farolAltura: 7.2
};

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
