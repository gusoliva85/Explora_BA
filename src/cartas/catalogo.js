/**
 * ===========================================================================
 * LAS CARTAS — el catálogo, que es DATO y no código (19B.1)
 * ===========================================================================
 * Las veintitrés cartas que Gus entregó el 8/11, con sus números exactos.
 * El original manda y vive en
 * `documentacion/habilidades/Descripcion de las habilidades.txt`.
 *
 * ---------------------------------------------------------------------------
 * UNA CARTA NO SABE HACER NADA
 * ---------------------------------------------------------------------------
 * Una carta es una lista de **sumas sobre ejes**, y nada más. No tiene
 * código, no toca el arma, no conoce al jugador. Quien convierte esas sumas
 * en números de juego es `Modificadores`, y lo hace leyendo `balance.js`
 * **sin escribirlo**.
 *
 * Esa separación es la que permite probar la progresión entera con números
 * y sin navegador, que para un sistema donde el jugador va a acumular seis
 * o siete cartas en una partida es la diferencia entre confiar y cruzar los
 * dedos: las combinaciones son demasiadas para verificarlas jugando.
 *
 * ---------------------------------------------------------------------------
 * LOS EJES
 * ---------------------------------------------------------------------------
 * Todos los ejes son **aditivos sobre la base**, y eso lo pidió la
 * especificación con todas las letras. Importa porque no es lo mismo:
 * *Mejora de Ataque* (+15 %) y su *Premium* (+30 %) juntas dan **1,45 veces**
 * el daño base, no 1,15 × 1,30 = 1,495. Multiplicar haría que el orden en
 * que se toman las cartas cambiara el resultado, y el criterio de salida de
 * la fase dice justamente lo contrario.
 *
 *   daño            fracción sobre `ARMA.pistola.damage`
 *   velocidad       fracción sobre la cadencia: +0,25 es un 25 % más rápido
 *   carriles        proyectiles en paralelo que se suman al que ya hay
 *   repeticiones    disparos seguidos que se suman al que ya hay
 *   critProb        probabilidad de crítico, de 0 a 1
 *   critDano        cuánto más pega un crítico, como fracción extra
 *   roboVida        fracción de la vida BASE del enemigo que se recupera al matarlo
 *   rebotes         cuántas veces salta un proyectil entre enemigos
 *   rebotePared     cuántas veces rebota contra una pared
 *   muerteNova      cuántos proyectiles suelta un muerto
 *   vidaMaxima      fracción sobre `PLAYER.maxHealth`. **Sube el techo, no cura**
 *
 * ---------------------------------------------------------------------------
 * Y DOS COSAS QUE NO SON EJES
 * ---------------------------------------------------------------------------
 * `instantaneo` es lo que la carta hace **una vez, al tomarla**, y no deja
 * rastro en los ejes: *Sanar* restaura el 40 % y se acabó. Si fuera un eje,
 * cada partida posterior arrancaría curándose sola.
 *
 * `grupo` es exclusión mutua. Los cuatro elementos de Mago comparten grupo,
 * así que tomar uno **reemplaza** al anterior en vez de sumarse. Los cuatro
 * orbes no lo tienen, porque ésos sí se acumulan.
 */

/** Las tres familias. Un personaje ve la suya y las generales. */
export const CLASE = {
  GUERRERO: 'guerrero',
  MAGO: 'mago',
  GENERAL: 'general'
};

/**
 * Los ejes del sorteo (D-48, 19B.9).
 *
 * No se usan todavía —el sorteo con forma es la 19B.9— y están escritos
 * desde ahora por el mismo motivo que la fórmula de la ráfaga estaba
 * escrita antes de que existieran las cartas: **clasificar veintitrés
 * cartas después, con el sorteo ya hecho, es rehacer el sorteo.**
 */
export const EJE = {
  CONTEO: 'conteo',
  DANO: 'dano',
  RITMO: 'ritmo',
  AGUANTE: 'aguante',
  CAOS: 'caos'
};

/**
 * Las veintitrés cartas.
 *
 * El `id` es lo único que se guarda de una partida y lo único que viaja en
 * un evento: los textos y los números pueden cambiar sin romper nada, el id
 * no.
 */
export const CARTAS = [
  // ========================================================================
  // GUERRERO — 6. Sólo para personajes de proyectil físico. Se acumulan.
  // ========================================================================
  {
    id: 'disparo-multiple',
    nombre: 'Disparo múltiple',
    clase: CLASE.GUERRERO,
    eje: EJE.CONTEO,
    texto: 'Dispara un proyectil más cada vez',
    /*
     * La única carta con costo, y el costo es doble: pega menos y más
     * lento. Es la que mejor explica para qué sirve la fórmula de D-44 —
     * `repeticiones` multiplica a `carriles`— y por qué esto tiene que ser
     * aditivo: con tres de daño encima, el −10 % se nota pero no asfixia.
     */
    efectos: { repeticiones: 1, dano: -0.1, velocidad: -0.15 }
  },
  {
    id: 'tiro-doble',
    nombre: 'Tiro doble',
    clase: CLASE.GUERRERO,
    eje: EJE.CONTEO,
    texto: 'Proyectil hacia adelante +1',
    efectos: { carriles: 1, dano: -0.25 }
  },
  {
    id: 'disparos-diagonales',
    nombre: 'Disparos diagonales',
    clase: CLASE.GUERRERO,
    eje: EJE.CONTEO,
    texto: 'Proyectiles diagonales +1',
    // Dos carriles, uno a cada lado, y sin costo. Es la carta de conteo
    // más barata del mazo a propósito: ver D-44.
    efectos: { carriles: 2 }
  },
  {
    id: 'critico-premium',
    nombre: 'Ataque crítico (Premium)',
    clase: CLASE.GUERRERO,
    eje: EJE.DANO,
    texto: '¡Aumentó la posibilidad de critar y el daño de los críticos!',
    efectos: { critProb: 0.1, critDano: 0.4 }
  },
  {
    id: 'critico',
    nombre: 'Ataque crítico',
    clase: CLASE.GUERRERO,
    eje: EJE.DANO,
    texto: 'Aumenta la probabilidad de crit y el daño de los críticos',
    efectos: { critProb: 0.05, critDano: 0.2 }
  },
  {
    id: 'sed-de-sangre',
    nombre: 'Sed de sangre',
    clase: CLASE.GUERRERO,
    eje: EJE.AGUANTE,
    texto: 'Absorbés HP cuando matás al enemigo',
    /*
     * 1,5 % de la vida BASE del enemigo, no de la suya actual ni del daño
     * hecho. Con zombis de 100 son 1,5 por muerte: una cuadra de ocho
     * devuelve 12 sobre 120. El número hay que mirarlo jugando (19B.13).
     */
    efectos: { roboVida: 0.015 }
  },

  // ========================================================================
  // MAGO — 8. Los cuatro elementos son EXCLUYENTES; los cuatro orbes no.
  // ========================================================================
  {
    id: 'disparo-rayo',
    nombre: 'Disparo Rayo',
    clase: CLASE.MAGO,
    eje: EJE.DANO,
    grupo: 'elemento',
    texto: 'Tus ataques causan efecto Rayo',
    efectos: { dano: 0.25, elemento: 'rayo' }
  },
  {
    id: 'disparo-hielo',
    nombre: 'Disparo Hielo',
    clase: CLASE.MAGO,
    eje: EJE.CAOS,
    grupo: 'elemento',
    texto: 'Ralentiza a los enemigos',
    efectos: { dano: 0.1, elemento: 'hielo' }
  },
  {
    id: 'disparo-veneno',
    nombre: 'Disparo Veneno',
    clase: CLASE.MAGO,
    eje: EJE.DANO,
    grupo: 'elemento',
    texto: 'Tus ataques causan efecto veneno',
    efectos: { elemento: 'veneno' }
  },
  {
    id: 'disparo-fuego',
    nombre: 'Disparo Fuego',
    clase: CLASE.MAGO,
    eje: EJE.DANO,
    grupo: 'elemento',
    texto: 'Tus ataques provocan un efecto fuego',
    efectos: { elemento: 'fuego' }
  },
  {
    id: 'circulo-fuego',
    nombre: 'Círculo de Fuego',
    clase: CLASE.MAGO,
    eje: EJE.CAOS,
    texto: 'Dos orbes de llama rodean a tu alrededor',
    efectos: { orbes: 2, orbeElemento: 'fuego' }
  },
  {
    id: 'circulo-hielo',
    nombre: 'Círculo de Hielo',
    clase: CLASE.MAGO,
    eje: EJE.CAOS,
    texto: 'Dos orbes de hielo rodean a tu alrededor',
    efectos: { orbes: 2, orbeElemento: 'hielo' }
  },
  {
    id: 'circulo-veneno',
    nombre: 'Círculo de Veneno',
    clase: CLASE.MAGO,
    eje: EJE.CAOS,
    texto: 'Dos orbes venenosos rodean a tu alrededor',
    efectos: { orbes: 2, orbeElemento: 'veneno' }
  },
  {
    id: 'circulo-rayo',
    nombre: 'Círculo de Rayo',
    clase: CLASE.MAGO,
    eje: EJE.CAOS,
    texto: 'Dos orbes de rayos circulan a tu alrededor',
    efectos: { orbes: 2, orbeElemento: 'rayo' }
  },

  // ========================================================================
  // GENERALES — 9. Las ven las dos clases. Se acumulan.
  // ========================================================================
  {
    id: 'rebote',
    nombre: 'Rebote',
    clase: CLASE.GENERAL,
    eje: EJE.CAOS,
    texto: 'Tus ataques rebotan entre los zombis',
    efectos: { rebotes: 3, rebotePerdida: 0.3 }
  },
  {
    id: 'rebote-pared',
    nombre: 'Rebote pared',
    clase: CLASE.GENERAL,
    eje: EJE.CAOS,
    texto: 'Los proyectiles rebotan contra las paredes',
    efectos: { rebotePared: 1, reboteParedPerdida: 0.5 }
  },
  {
    id: 'muerte-nova',
    nombre: 'Muerte Nova',
    clase: CLASE.GENERAL,
    eje: EJE.CAOS,
    texto: 'Los enemigos explotan en rayos tras la muerte',
    efectos: { muerteNova: 8, muerteNovaDano: 0.3 }
  },
  {
    id: 'ataque-premium',
    nombre: 'Mejora de Ataque (Premium)',
    clase: CLASE.GENERAL,
    eje: EJE.DANO,
    texto: '¡Ahora podés hacer un daño más alto!',
    efectos: { dano: 0.3 }
  },
  {
    id: 'ataque',
    nombre: 'Mejora de Ataque',
    clase: CLASE.GENERAL,
    eje: EJE.DANO,
    texto: 'Aumenta ligeramente tu ataque',
    efectos: { dano: 0.15 }
  },
  {
    id: 'velocidad-premium',
    nombre: 'Velocidad de Ataque (Premium)',
    clase: CLASE.GENERAL,
    eje: EJE.RITMO,
    texto: '¡Ahora podés atacar más rápido!',
    efectos: { velocidad: 0.25 }
  },
  {
    id: 'velocidad',
    nombre: 'Velocidad de Ataque',
    clase: CLASE.GENERAL,
    eje: EJE.RITMO,
    texto: 'Aumenta ligeramente la velocidad de ataque',
    efectos: { velocidad: 0.125 }
  },
  {
    id: 'aumentar-hp',
    nombre: 'Aumentar HP',
    clase: CLASE.GENERAL,
    eje: EJE.AGUANTE,
    /*
     * El nombre lo cambió Gus el 8/11: era "HP Boost" y "Boost" no dice
     * qué sube. El problema era real y es el que el texto tiene que
     * resolver: **sube el techo y no cura nada.** Con 120 de base lleva el
     * máximo a 144, así que tomarla con 30 de vida deja 30 de 144 y se
     * siente como una carta que no hizo nada.
     */
    texto: '¡Máx. HP aumentado! No cura: sube el techo',
    efectos: { vidaMaxima: 0.2 }
  },
  {
    id: 'sanar',
    nombre: 'Sanar',
    clase: CLASE.GENERAL,
    eje: EJE.AGUANTE,
    texto: 'Restaura parcialmente HP',
    /*
     * La curación que D-29 borró, y vuelve cambiada: no es un recurso que
     * se administra —eso era el botón, y se fue en la 16.1— sino **un
     * premio de una sola vez**. No contradice D-31: el daño sigue sin
     * regenerarse solo.
     *
     * Y por eso es `instantaneo` y no un eje. Un eje se aplicaría en cada
     * cálculo y el jugador arrancaría cada partida curándose solo.
     */
    instantaneo: { curar: 0.4 }
  }
];

/** Índice por id, para no recorrer la lista en cada consulta. */
const PORid = new Map(CARTAS.map((c) => [c.id, c]));

/** @returns {object|undefined} la carta con ese id */
export function carta(id) {
  return PORid.get(id);
}

/**
 * El mazo de una clase: las suyas más las generales.
 *
 * **Para la demo son quince y no veintitrés**: Gus es Guerrero, así que las
 * ocho de Mago no aparecen. Y las ocho que quedan afuera son justo las más
 * caras de construir —orbes que orbitan, cuatro estados elementales con su
 * tinte—, así que esto no es sólo un filtro: es la mitad de la fase.
 */
export function mazoDe(clase) {
  return CARTAS.filter((c) => c.clase === clase || c.clase === CLASE.GENERAL);
}
