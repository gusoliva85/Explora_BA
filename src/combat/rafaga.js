/**
 * ===========================================================================
 * LA RAFAGA — cuantos proyectiles salen de un disparo, y hacia donde
 * ===========================================================================
 * Hoy sale **uno**. Esta escrito como ráfaga igual, y esa es toda la razón
 * de que este archivo exista.
 *
 * ---------------------------------------------------------------------------
 * POR QUE SE ESCRIBE AHORA SI TODAVIA NO SIRVE PARA NADA
 * ---------------------------------------------------------------------------
 * Porque es gratis hoy y carísimo después. D-44 dice que **la multiplicación
 * de proyectiles es el eje principal de progresión de toda la partida**: al
 * final hay seis o siete cartas acumuladas y el personaje dispara para todos
 * lados. Eso no es un adorno del final: es el juego.
 *
 * Si la Fase 17 escribiera *"un tiro"* en vez de *"una ráfaga de uno"*, la
 * 19B no enchufaría las cartas: **reharía el disparo entero**, y lo haría
 * cuando ya haya números de combate ajustados encima. Escribir la fórmula
 * con todos los multiplicadores en 1 cuesta un archivo y una prueba.
 *
 * ---------------------------------------------------------------------------
 * LA FORMULA (D-44)
 * ---------------------------------------------------------------------------
 * ```
 * proyectiles = (1 + tiro_doble + 2 × diagonales) × (1 + disparo_múltiple)
 *                └──────────── carriles ───────┘   └─── repeticiones ───┘
 * ```
 *
 * **Los dos ejes se multiplican, no se suman.** Dos carriles por dos
 * repeticiones son cuatro proyectiles, no tres. Es literal de lo que pidió
 * Gus: *"en cada tiro que antes era uno solo, ahora dispara 4 tiros de una
 * sola vez"*. Esa multiplicación **es** la escalada de la partida.
 *
 * Acá sólo vive el producto. Quién suma a `carriles` y quién a
 * `repeticiones` lo decide cada carta, y eso llega en la 19B.
 *
 * ---------------------------------------------------------------------------
 * EL PRIMERO NO FALLA; LOS DEMAS SI
 * ---------------------------------------------------------------------------
 * El proyectil **0** es el tiro apuntado: va al blanco elegido y no falla,
 * salvo que haya una barrera física (D-36). Es la promesa del juego —
 * quedarse quieto **sirve**— y no puede depender de la suerte.
 *
 * Los demás —el segundo carril, las diagonales, los rebotes— **vuelan y
 * pueden errar**. Si todos fueran infalibles, acumular cartas sería sumar
 * daño garantizado y el final de la partida sería una planilla; lo que Gus
 * describe es un **lío** de proyectiles, y un lío necesita que algunos se
 * pierdan.
 *
 * Por eso cada proyectil se describe con un `tipo`, aunque hoy sólo exista
 * el primero.
 */

/**
 * Cuántos proyectiles salen de un disparo.
 *
 * @param {{carriles:number, repeticiones:number}} arma
 * @returns {number}
 */
export function cuantosProyectiles(arma) {
  return arma.carriles * arma.repeticiones;
}

/**
 * Los proyectiles de una ráfaga, en orden, con su desvío respecto del rumbo
 * apuntado.
 *
 * Es logica pura y devuelve descripciones, no efectos: quien dispara decide
 * qué hacer con cada una. Eso permite probar la fórmula entera con números
 * sin que exista todavía un proyectil que vuele.
 *
 * ---------------------------------------------------------------------------
 * COMO SE REPARTEN LOS CARRILES
 * ---------------------------------------------------------------------------
 * El carril 0 va derecho al blanco. Los demás se abren en abanico **a los
 * dos lados**, alternando, con `arma.carrilDegrees` de separación.
 *
 * Alternar importa: si los carriles extra se fueran todos para el mismo
 * lado, el arma apuntaría torcido al tomar una carta, y el jugador lo
 * leería como un error. Abriéndose parejo, el tiro apuntado sigue siendo el
 * centro del abanico.
 *
 * Las **repeticiones** no desvían nada: son el mismo abanico disparado otra
 * vez. Lo que las separa es el tiempo, no el ángulo, y eso lo resuelve
 * quien dispara.
 *
 * @param {object} arma entrada de WEAPONS
 * @returns {Array<{indice:number, tipo:'rayo'|'proyectil', desvio:number, repeticion:number}>}
 */
export function proyectilesDeRafaga(arma) {
  const salida = [];
  let indice = 0;

  for (let rep = 0; rep < arma.repeticiones; rep++) {
    for (let carril = 0; carril < arma.carriles; carril++) {
      salida.push({
        indice,
        // Sólo el primero de todos es el tiro apuntado que no falla.
        tipo: indice === 0 ? 'rayo' : 'proyectil',
        desvio: desvioDeCarril(carril, arma.carrilDegrees),
        repeticion: rep
      });
      indice++;
    }
  }

  return salida;
}

/**
 * El desvío del carril `i`: 0, +sep, −sep, +2·sep, −2·sep…
 *
 * @param {number} carril
 * @param {number} separacion grados entre carriles
 */
export function desvioDeCarril(carril, separacion) {
  if (carril === 0) return 0;
  const paso = Math.ceil(carril / 2);
  const signo = carril % 2 === 1 ? 1 : -1;
  return signo * paso * separacion;
}
