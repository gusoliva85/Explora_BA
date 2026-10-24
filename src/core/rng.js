/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 *
 * Todo lo aleatorio del juego pasa por aca. Con la misma semilla, el mapa,
 * la distribucion de objetos y el spawn de zombis salen identicos: eso hace
 * que un bug se pueda reproducir y que dos partidas sean comparables al
 * balancear. `Math.random()` queda prohibido en codigo de juego.
 */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** Flotante en [min, max). */
  rng.range = (min, max) => min + rng() * (max - min);
  /** Entero en [min, max] inclusive. */
  rng.int = (min, max) => Math.floor(min + rng() * (max - min + 1));
  /** Elemento al azar de un array. */
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  /** true con probabilidad `p`. */
  rng.chance = (p) => rng() < p;

  return rng;
}
