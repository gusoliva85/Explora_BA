import * as pc from 'playcanvas';
import { VERDE } from './paleta.js';

/**
 * ===========================================================================
 * MODELOS EXTERNOS
 * ===========================================================================
 * Fase 12R, tarea 12R.6 bis. El primer arte del juego que no es geometria
 * escrita a mano.
 *
 * ---------------------------------------------------------------------------
 * POR QUE APARECIERON RECIEN AHORA
 * ---------------------------------------------------------------------------
 * El prompt maestro nombra una sola biblioteca, threejsassets, y esa **no se
 * puede bajar sin una cuenta**: sus `.glb` devuelven la pagina de login. De
 * ahi salio la conclusion de que no habia assets y que todo habia que
 * escribirlo. **La conclusion estaba mal, por no haber mirado mas alla de la
 * biblioteca que el documento nombraba.**
 *
 * Poly Pizza sirve `.glb` por URL directa, sin cuenta, sin compresion Draco
 * —asi que no hace falta ningun decodificador— y con licencias CC0 y CC-BY.
 * Un arbol de 69 KB y 932 triangulos es mejor que cualquier cosa que se pueda
 * armar con esferas, y pesa menos que la pantalla de carga.
 *
 * Cada modelo que entra se anota en `documentacion/visual/ASSET_AUDIT.md` con
 * su fuente, su autor y su licencia. CC-BY obliga a dar credito.
 *
 * ---------------------------------------------------------------------------
 * COMO SE USA
 * ---------------------------------------------------------------------------
 * Los modelos se cargan ANTES de construir el mundo, porque el generador es
 * sincronico: pide un arbol y lo quiere en el momento.
 *
 *     await precargar(app);
 *     const arbol = instanciar('arbol-01', { alto: 6 });
 */

/** Lo que hay que tener cargado antes de empezar. */
export const CATALOGO = [
  { nombre: 'arbol-01', url: '/modelos/arbol-01.glb' },
  { nombre: 'arbol-02', url: '/modelos/arbol-02.glb' }
];

/** @type {Map<string, {asset: pc.Asset, alto: number, baseY: number}>} */
const cargados = new Map();

/**
 * Mide la caja de un modelo ya instanciado.
 *
 * Hace falta porque los modelos vienen con cualquier tamaño y con el origen
 * donde el autor lo dejo: estos dos arboles miden 1,74 y 2,46 unidades y
 * tienen el origen en el medio del tronco, no en el pie. Sin medirlos, uno
 * queda enterrado y el otro flotando.
 */
function medir(entidad) {
  const caja = new pc.BoundingBox();
  let primera = true;
  entidad.forEach((e) => {
    if (!e.render) return;
    for (const mi of e.render.meshInstances) {
      if (primera) {
        caja.copy(mi.aabb);
        primera = false;
      } else {
        caja.add(mi.aabb);
      }
    }
  });
  return {
    alto: caja.halfExtents.y * 2,
    baseY: caja.center.y - caja.halfExtents.y
  };
}

/**
 * Carga todos los modelos del catalogo.
 *
 * @param {pc.AppBase} app
 * @returns {Promise<void>}
 */
export function precargar(app) {
  return Promise.all(
    CATALOGO.map(
      ({ nombre, url }) =>
        new Promise((listo) => {
          app.assets.loadFromUrl(url, 'container', (err, asset) => {
            if (err || !asset) {
              // Un modelo que no carga no puede voltear el juego: se sigue
              // sin el y el generador usa lo que tenga a mano.
              console.warn(`[modelos] no se pudo cargar ${nombre}: ${err}`);
              listo();
              return;
            }
            const sonda = asset.resource.instantiateRenderEntity();
            armonizar(sonda);
            app.root.addChild(sonda);
            const { alto, baseY } = medir(sonda);
            sonda.destroy();
            cargados.set(nombre, { asset, alto, baseY });
            listo();
          });
        })
    )
  ).then(() => undefined);
}

/**
 * Lleva los materiales de un modelo externo a nuestra paleta.
 *
 * El prompt maestro lo pide con todas las letras: no mezclar estilos de
 * assets sin ajustar materiales y paleta. El arbol descargado trae un verde
 * mas acido que el medido de la referencia, y puesto en la calle le gana en
 * atencion a los objetos de mision.
 *
 * Se decide por el tono del material original, no por su nombre: los
 * nombres de material de un modelo ajeno no son de fiar.
 */
function armonizar(entidad) {
  const vistos = new Set();
  entidad.forEach((e) => {
    if (!e.render) return;
    for (const mi of e.render.meshInstances) {
      const m = mi.material;
      if (!m || vistos.has(m.id)) continue;
      vistos.add(m.id);
      const d = m.diffuse;
      const esVerde = d.g > d.r && d.g > d.b;
      const destino = esVerde ? VERDE.medio : VERDE.tronco;
      /*
       * Se conserva la variacion interna del modelo: en vez de pisar el
       * color, se lo lleva hacia el nuestro. Un reemplazo seco aplana las
       * dos tonalidades que el autor le puso a la copa.
       */
      m.diffuse.set(
        d.r * 0.35 + destino[0] * 0.65,
        d.g * 0.35 + destino[1] * 0.65,
        d.b * 0.35 + destino[2] * 0.65
      );
      m.gloss = 0.05;
      m.metalness = 0;
      m.useMetalness = true;
      m.update();
    }
  });
}

/** Si un modelo esta disponible. */
export const hay = (nombre) => cargados.has(nombre);

/**
 * Instancia un modelo, escalado al alto pedido y apoyado en el piso.
 *
 * @param {string} nombre
 * @param {{alto: number}} opt alto final en metros
 * @returns {pc.Entity|null}
 */
export function instanciar(nombre, { alto }) {
  const m = cargados.get(nombre);
  if (!m) return null;

  const e = m.asset.resource.instantiateRenderEntity();
  const escala = alto / m.alto;
  e.setLocalScale(escala, escala, escala);
  // El origen del modelo no esta en el pie: se compensa para poder colocarlo
  // con la coordenada del suelo, igual que cualquier prop escrito a mano.
  e.setLocalPosition(0, -m.baseY * escala, 0);

  e.forEach((h) => {
    if (h.render) h.render.castShadows = true;
  });
  return e;
}

/** Libera todo. Se llama al reconstruir el mundo. */
export function limpiar() {
  cargados.clear();
}
