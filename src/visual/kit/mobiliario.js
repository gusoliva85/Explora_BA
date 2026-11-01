import { FACHADA, CALLE, VEHICULO, OBJETO, CARTEL, ZOMBI } from '../paleta.js';

/**
 * ===========================================================================
 * MOBILIARIO URBANO
 * ===========================================================================
 * Fase 12R, tarea 12R.7. Lo que queda de pie en la vereda.
 *
 * Reemplaza a los props de mobiliario de `src/world/props.js` y al farol de
 * `src/world/lighting.js`, que con esto se borra: era lo ultimo que quedaba
 * de la iluminacion vieja.
 *
 * ---------------------------------------------------------------------------
 * LOS CABLES SON LA PIEZA QUE FALTABA
 * ---------------------------------------------------------------------------
 * En la referencia cruzan la calle de lado a lado, y son lo unico que pasa
 * por encima de la calzada. Cuestan tres cajas cada uno y hacen dos cosas que
 * ninguna otra pieza hace: le ponen un techo a la cuadra, y dan una
 * referencia de profundidad —al caminar, uno pasa por debajo de uno, después
 * de otro— que el piso solo no da.
 *
 * El resto del mobiliario ya existia y estaba bien resuelto de forma; lo que
 * tenia mal eran los COLORES, que seguian saliendo de la paleta vieja
 * elegida a ojo. Acá se rehace con la paleta medida.
 */

export const ACABADO = {
  metal: { gloss: 0.34, metalness: 0.55 },
  chapa: { gloss: 0.42, metalness: 0.45 },
  pintura: { gloss: 0.1, metalness: 0 },
  madera: { gloss: 0.1, metalness: 0 },
  vidrio: { gloss: 0.3, metalness: 0.1 },
  mate: { gloss: 0.06, metalness: 0 }
};

export const MEDIDAS = {
  farolAlto: 7.2,
  farolBrazo: 1.9,
  /** Altura a la que cruzan los cables. Por encima de cualquier colectivo. */
  cableAlto: 7.4,
  /** Cuanto cuelga el cable en el medio del vano. */
  cableFlecha: 0.55
};

/* =========================================================================
   LUMINARIA
   ========================================================================= */

/**
 * Farol: poste, brazo y lampara.
 *
 * De dia no emite luz, es mobiliario. Se conserva porque la repeticion de
 * faroles a lo largo de la vereda es parte de como se lee una calle, y
 * porque cuando aparezca una mision de noche ya va a estar puesto.
 */
export function farol(a) {
  const alto = MEDIDAS.farolAlto;
  const brazo = MEDIDAS.farolBrazo;

  a.add('cylinder', [0, 0, 0], [0.18, 0.35, 0.18], CALLE.hormigon, { acabado: ACABADO.mate });
  a.add('cylinder', [0, 0.3, 0], [0.15, alto, 0.15], FACHADA.poste, {
    acabado: ACABADO.metal,
    sombra: true
  });
  a.add('cylinder', [0, alto + 0.2, -brazo / 2], [0.1, brazo, 0.1], FACHADA.poste, {
    acabado: ACABADO.metal,
    rot: [90, 0, 0],
    sombra: true
  });
  a.add('sphere', [0, alto + 0.08, -brazo], [0.52, 0.26, 0.5], OBJETO.venda, {
    acabado: ACABADO.chapa
  });
}

/* =========================================================================
   SEMAFORO
   ========================================================================= */

/**
 * Semaforo. Las tres luces son de los pocos colores puros de la escena, y
 * por eso marcan la esquina desde lejos.
 */
export function semaforo(a) {
  a.add('cylinder', [0, 0, 0], [0.2, 0.3, 0.2], CALLE.hormigon, { acabado: ACABADO.mate });
  a.add('cylinder', [0, 0.25, 0], [0.15, 3.5, 0.15], FACHADA.metal_oscuro, {
    acabado: ACABADO.metal,
    sombra: true
  });
  a.add('box', [0, 3.3, -0.14], [0.44, 1.2, 0.38], FACHADA.metal_oscuro, {
    acabado: ACABADO.metal,
    sombra: true
  });
  // Visera: lo que hace que se lea como semaforo y no como una caja.
  a.add('box', [0, 4.44, -0.3], [0.48, 0.06, 0.28], FACHADA.metal_oscuro, {
    acabado: ACABADO.metal,
    sombra: false
  });

  const luces = [
    [4.08, [0.78, 0.16, 0.12]],
    [3.72, CARTEL.toldo],
    [3.36, [0.2, 0.62, 0.3]]
  ];
  for (const [y, color] of luces) {
    a.add('cylinder', [0, y, -0.33], [0.24, 0.06, 0.24], color, {
      acabado: ACABADO.pintura,
      rot: [90, 0, 0],
      sombra: false
    });
  }
}

/* =========================================================================
   LA VEREDA
   ========================================================================= */

/** Cesto de basura: poste y canasto. */
export function cesto(a) {
  a.add('cylinder', [0, 0, 0], [0.1, 0.95, 0.1], FACHADA.poste, { acabado: ACABADO.metal });
  a.add('cylinder', [0, 0.9, 0], [0.58, 0.58, 0.58], FACHADA.metal_oscuro, {
    acabado: ACABADO.metal
  });
  // El aro de la boca: un borde claro que lo despega del fondo.
  a.add('cylinder', [0, 1.45, 0], [0.62, 0.05, 0.62], FACHADA.poste, {
    acabado: ACABADO.metal,
    sombra: false
  });
}

/** Banco: asiento de tablas, respaldo inclinado y patas de fundicion. */
export function banco(a) {
  for (const dz of [-0.16, 0.02, 0.2]) {
    a.add('box', [0, 0.44, dz], [1.9, 0.07, 0.15], OBJETO.madera, {
      acabado: ACABADO.madera
    });
  }
  for (const dy of [0, 0.22]) {
    a.add('box', [0, 0.56 + dy, 0.3], [1.9, 0.14, 0.07], OBJETO.madera, {
      acabado: ACABADO.madera,
      rot: [-12, 0, 0]
    });
  }
  for (const dx of [-0.82, 0.82]) {
    a.add('box', [dx, 0, 0], [0.09, 0.44, 0.52], FACHADA.metal_oscuro, {
      acabado: ACABADO.metal
    });
  }
}

/**
 * Parada de colectivo: dos postes, techo volado, panel y banco.
 *
 * El techo volado es la silueta que la identifica desde arriba, que es el
 * unico angulo desde el que el jugador la va a ver.
 */
export function parada(a) {
  for (const dx of [-1.6, 1.6]) {
    a.add('cylinder', [dx, 0, 0.5], [0.11, 2.6, 0.11], FACHADA.poste, {
      acabado: ACABADO.metal,
      sombra: true
    });
  }
  a.add('box', [0, 2.6, 0.2], [3.9, 0.12, 1.6], VEHICULO.azul, {
    acabado: ACABADO.chapa,
    sombra: true
  });
  // El alero del frente, que es lo que le da el borde a la silueta.
  a.add('box', [0, 2.44, -0.56], [3.9, 0.18, 0.1], VEHICULO.azul, {
    acabado: ACABADO.chapa
  });
  a.add('box', [0, 0.4, 0.95], [3.4, 1.9, 0.07], FACHADA.vidrio, { acabado: ACABADO.vidrio });
  a.add('box', [0, 0.46, 0.62], [3.0, 0.1, 0.44], OBJETO.madera, { acabado: ACABADO.madera });
  for (const dx of [-1.2, 1.2]) {
    a.add('box', [dx, 0, 0.62], [0.09, 0.46, 0.4], FACHADA.metal_oscuro, {
      acabado: ACABADO.metal
    });
  }
}

/* =========================================================================
   CABLES
   ========================================================================= */

/**
 * Un cruce de cables de vereda a vereda.
 *
 * Son tres tramos rectos encadenados, no una curva: a la distancia de camara
 * la catenaria de verdad y tres rectas con la misma flecha se ven igual, y
 * tres cajas cuestan nada.
 *
 * @param {object} a el Armador
 * @param {number} luz ancho que tiene que cruzar, de cordon a cordon
 */
export function cables(a, luz) {
  const f = MEDIDAS.cableFlecha;
  const h = MEDIDAS.cableAlto;
  const tramos = [
    { x: -luz / 3, y: h - f * 0.55, largo: luz / 3 + 0.4, inc: 14 },
    { x: 0, y: h - f, largo: luz / 3 + 0.4, inc: 0 },
    { x: luz / 3, y: h - f * 0.55, largo: luz / 3 + 0.4, inc: -14 }
  ];
  for (const [i, t] of tramos.entries()) {
    a.add('box', [t.x, t.y, 0], [t.largo, 0.03, 0.03], FACHADA.metal_oscuro, {
      acabado: ACABADO.mate,
      rot: [0, 0, t.inc],
      sombra: false
    });
    // Un segundo cable, apenas mas abajo: los tendidos nunca son uno.
    a.add('box', [t.x, t.y - 0.3, 0.3], [t.largo, 0.025, 0.025], FACHADA.metal_oscuro, {
      acabado: ACABADO.mate,
      rot: [0, 0, t.inc],
      sombra: false
    });
    void i;
  }
}

/* =========================================================================
   CHAPA DE CALLE
   ========================================================================= */

/**
 * Cartel con el nombre de la calle.
 *
 * El material con el texto lo arma el generador y lo pasa en `material`: el
 * kit no sabe de texturas, igual que con los carteles de comercio.
 */
export function chapaDeCalle(a, { material }) {
  a.add('cylinder', [0, 0, 0], [0.09, 2.9, 0.09], FACHADA.poste, {
    acabado: ACABADO.metal,
    sombra: true
  });
  a.add('box', [0.42, 2.5, 0], [1.05, 0.3, 0.05], ZOMBI.camisa_azul, {
    acabado: ACABADO.pintura,
    material,
    sombra: false
  });
}
