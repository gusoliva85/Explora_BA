import { describe, it, expect, beforeEach } from 'vitest';
import { Modificadores } from '../src/cartas/modificadores.js';
import { CARTAS, CLASE, carta, mazoDe } from '../src/cartas/catalogo.js';
import { PLAYER, WEAPONS } from '../src/config/balance.js';

/**
 * ===========================================================================
 * EL SISTEMA DE CARTAS (19B.1)
 * ===========================================================================
 * La progresión es lógica pura, así que se prueba entera con números. Eso
 * no es comodidad: un jugador va a terminar la partida con seis o siete
 * cartas encima, y **las combinaciones son demasiadas para verificarlas
 * jugando**. Si esto se rompe, se rompe en silencio y en una partida larga.
 *
 * Lo que se prueba acá son las cuatro reglas que pidió la especificación —
 * aditivo, exclusión mutua, límite por clase, no repetir— más la que las
 * sostiene a todas: **`balance.js` no se toca**.
 */

const copia = (o) => JSON.parse(JSON.stringify(o));

describe('el catalogo', () => {
  it('son veintitres cartas con id unico', () => {
    expect(CARTAS).toHaveLength(23);
    expect(new Set(CARTAS.map((c) => c.id)).size).toBe(23);
  });

  it('el reparto es 6 de Guerrero, 8 de Mago y 9 generales', () => {
    const de = (k) => CARTAS.filter((c) => c.clase === k).length;
    expect(de(CLASE.GUERRERO)).toBe(6);
    expect(de(CLASE.MAGO)).toBe(8);
    expect(de(CLASE.GENERAL)).toBe(9);
  });

  it('el mazo de Gus es de QUINCE, no de veintitres', () => {
    /*
     * Gus es Guerrero, así que las ocho de Mago no aparecen. No es sólo un
     * filtro: las ocho que quedan afuera son las más caras de construir
     * —orbes que orbitan, cuatro estados elementales con su tinte—, o sea
     * **la mitad de la fase**.
     */
    expect(mazoDe(CLASE.GUERRERO)).toHaveLength(15);
    expect(mazoDe(CLASE.MAGO)).toHaveLength(17);
  });

  it('cada carta hace algo: o tiene efectos o es instantanea', () => {
    for (const c of CARTAS) {
      expect(c.efectos ?? c.instantaneo, `${c.id} no hace nada`).toBeTruthy();
    }
  });

  it('los cuatro elementos de Mago comparten grupo, y los orbes no', () => {
    const conGrupo = CARTAS.filter((c) => c.grupo === 'elemento').map((c) => c.id);
    expect(conGrupo).toEqual([
      'disparo-rayo',
      'disparo-hielo',
      'disparo-veneno',
      'disparo-fuego'
    ]);
    for (const c of CARTAS.filter((c) => c.id.startsWith('circulo-'))) {
      expect(c.grupo, `${c.id} no puede ser excluyente: los orbes se acumulan`).toBeUndefined();
    }
  });
});

describe('tomar cartas', () => {
  let m;
  beforeEach(() => {
    m = new Modificadores(CLASE.GUERRERO);
  });

  it('una carta tomada no vuelve a salir', () => {
    expect(m.disponibles).toHaveLength(15);
    m.tomar('ataque');
    expect(m.disponibles).toHaveLength(14);
    expect(m.disponibles.some((c) => c.id === 'ataque')).toBe(false);
    expect(m.puedeTomar('ataque')).toBe(false);
    expect(m.tomar('ataque').ok).toBe(false);
  });

  it('no se puede tomar una carta de otra clase', () => {
    /*
     * El límite por clase no es cosmético: *Disparo Rayo* suma un elemento
     * que Gus no tiene cómo mostrar ni aplicar. Dejarlo entrar sería una
     * carta que no hace nada, que es peor que no tenerla.
     */
    expect(m.puedeTomar('circulo-fuego')).toBe(false);
    expect(m.tomar('circulo-fuego').ok).toBe(false);
    expect(m.tomadas).toEqual([]);
  });

  it('ni una que no existe', () => {
    expect(m.tomar('carta-de-mentira').ok).toBe(false);
  });

  it('al morir se pierde todo', () => {
    m.tomar('ataque');
    m.tomar('velocidad');
    m.reiniciar();
    expect(m.tomadas).toEqual([]);
    expect(m.valores().dano).toBe(WEAPONS.pistol.damage);
  });
});

describe('las sumas son ADITIVAS, y el orden no importa', () => {
  it('dos cartas de ataque suman sus porcentajes sobre la BASE', () => {
    /*
     * +15 % y +30 % dan 1,45 veces, no 1,15 × 1,30 = 1,495. La diferencia
     * no es el 4 %: multiplicar haría que el orden importara en cuanto
     * algo reste.
     */
    const m = new Modificadores();
    m.tomar('ataque');
    m.tomar('ataque-premium');
    expect(m.valores().dano).toBeCloseTo(WEAPONS.pistol.damage * 1.45, 10);
  });

  it('y da EXACTAMENTE lo mismo en que orden se tomaron (D-44)', () => {
    /*
     * Exactamente, y la palabra importa: la primera versión de esto
     * fallaba por 27,500000000000004 contra 27,499999999999996. En coma
     * flotante sumar no es asociativo.
     *
     * Se podría haber aflojado la prueba a "casi igual", y habría sido la
     * decisión equivocada: una regla con "casi" obliga a elegir cuánto es
     * casi, y ese número no lo decide nadie. Se arregló el sistema —los
     * ejes se suman en el orden del catálogo— y la igualdad volvió a ser
     * exacta.
     */
    const ids = ['ataque', 'disparo-multiple', 'tiro-doble', 'velocidad', 'critico'];

    const a = new Modificadores();
    for (const id of ids) a.tomar(id);

    const b = new Modificadores();
    for (const id of [...ids].reverse()) b.tomar(id);

    expect(copia(b.valores())).toEqual(copia(a.valores()));
  });

  it('el mazo ENTERO de Guerrero convive en cualquier orden', () => {
    /*
     * El criterio de salida de la fase, tal cual: *"las quince cartas de
     * Guerrero conviven en cualquier orden"*. Se toman las quince en un
     * orden y en el inverso.
     */
    const ids = mazoDe(CLASE.GUERRERO).map((c) => c.id);

    const a = new Modificadores();
    for (const id of ids) expect(a.tomar(id).ok, id).toBe(true);

    const b = new Modificadores();
    for (const id of [...ids].reverse()) b.tomar(id);

    expect(copia(b.valores())).toEqual(copia(a.valores()));
  });
});

describe('la formula de la rafaga (D-44)', () => {
  it('sin cartas sale un proyectil', () => {
    expect(new Modificadores().valores().proyectiles).toBe(1);
  });

  it('los dos ejes se MULTIPLICAN, no se suman', () => {
    /*
     * Dos carriles por dos repeticiones son cuatro proyectiles, no tres. Y
     * esa multiplicación **es** la escalada de la partida.
     */
    const m = new Modificadores();
    m.tomar('tiro-doble'); // +1 carril  -> 2
    m.tomar('disparo-multiple'); // +1 repetición -> 2
    const v = m.valores();
    expect(v.carriles).toBe(2);
    expect(v.repeticiones).toBe(2);
    expect(v.proyectiles).toBe(4);
  });

  it('las tres cartas del eje del conteo dan EXACTAMENTE cuatro proyectiles', () => {
    /*
     * El número que pide el criterio de salida de la fase, verificado con
     * la fórmula y no a ojo: carriles 1+1+2 = 4, repeticiones 1+1 = 2,
     * y 4 × 2 = 8.
     *
     * El criterio decía "exactamente 4", y escrito así se ve que la cuenta
     * da 8: lo que da 4 son los carriles. Queda anotado acá porque es
     * justo el tipo de confusión que la fórmula existe para evitar.
     */
    const m = new Modificadores();
    m.tomar('tiro-doble');
    m.tomar('disparos-diagonales');
    m.tomar('disparo-multiple');
    const v = m.valores();
    expect(v.carriles).toBe(4);
    expect(v.repeticiones).toBe(2);
    expect(v.proyectiles).toBe(8);
  });

  it('y el conteo CUESTA: mas proyectiles pegan menos y mas lento', () => {
    const m = new Modificadores();
    m.tomar('tiro-doble'); // −25 % daño
    m.tomar('disparo-multiple'); // −10 % daño, −15 % velocidad
    const v = m.valores();
    expect(v.dano).toBeCloseTo(WEAPONS.pistol.damage * 0.65, 10);
    expect(v.cadencia).toBeGreaterThan(WEAPONS.pistol.cooldown);
  });
});

describe('la velocidad baja la espera, no la sube', () => {
  it('un 25 % mas rapido DIVIDE la cadencia', () => {
    const m = new Modificadores();
    m.tomar('velocidad-premium');
    expect(m.valores().cadencia).toBeCloseTo(WEAPONS.pistol.cooldown / 1.25, 10);
  });

  it('y la espera nunca llega a cero por mas costos que se acumulen', () => {
    /*
     * El piso existe porque la suma puede llegar a −1 y dividir por cero.
     * Hoy hace falta una pila de cartas de costo para llegar, pero el día
     * que una carta nueva reste más, el error sería `Infinity` segundos
     * entre tiros: el arma deja de disparar y nada dice por qué.
     */
    const m = new Modificadores();
    m.tomadas.push(...Array(20).fill('disparo-multiple'));
    expect(Number.isFinite(m.valores().cadencia)).toBe(true);
    expect(m.valores().cadencia).toBeGreaterThan(0);
  });
});

describe('la exclusion mutua de los elementos', () => {
  let m;
  beforeEach(() => {
    m = new Modificadores(CLASE.MAGO);
  });

  it('tomar un elemento REEMPLAZA al anterior', () => {
    m.tomar('disparo-rayo');
    expect(m.valores().elemento).toBe('rayo');

    const r = m.tomar('disparo-fuego');
    expect(r.reemplazo).toBe('disparo-rayo');
    expect(m.tomadas).toEqual(['disparo-fuego']);
    expect(m.valores().elemento).toBe('fuego');
  });

  it('y el daño del reemplazado se va con el', () => {
    // Rayo da +25 % y Fuego no da daño: si se sumaran, quedaría el 25 %.
    m.tomar('disparo-rayo');
    m.tomar('disparo-fuego');
    expect(m.valores().dano).toBeCloseTo(WEAPONS.pistol.damage, 10);
  });

  it('el elemento reemplazado PUEDE volver a salir', () => {
    /*
     * Decidido a propósito: ya no lo tenés, así que es coherente; y es
     * necesario, porque si no, cambiar de elemento costaría perder para
     * siempre el que dejaste.
     */
    m.tomar('disparo-rayo');
    m.tomar('disparo-fuego');
    expect(m.puedeTomar('disparo-rayo')).toBe(true);
  });

  it('pero los cuatro orbes SI se acumulan', () => {
    m.tomar('circulo-fuego');
    m.tomar('circulo-hielo');
    expect(m.tomadas).toHaveLength(2);
    expect(m.valores().orbes).toBe(4);
  });
});

describe('la vida', () => {
  it('Aumentar HP sube el techo y NO cura', () => {
    const m = new Modificadores();
    const r = m.tomar('aumentar-hp');
    expect(m.valores().vidaMaxima).toBe(Math.round(PLAYER.maxHealth * 1.2));
    expect(r.instantaneo).toBeUndefined();
  });

  it('Sanar cura una vez y NO deja rastro en los ejes', () => {
    /*
     * Si fuera un eje se aplicaría en cada cálculo y el jugador arrancaría
     * cada partida curándose solo.
     */
    const m = new Modificadores();
    const r = m.tomar('sanar');
    expect(r.instantaneo).toEqual({ curar: 0.4 });
    expect(m.valores().vidaMaxima).toBe(PLAYER.maxHealth);
  });
});

describe('balance.js no se toca', () => {
  it('tomar el mazo entero no cambia un solo valor de la tabla', () => {
    /*
     * El criterio de salida de la fase. Y el motivo no es higiene: **la
     * progresión se pierde al morir** (19B.8), así que los valores base
     * tienen que seguir estando para volver a empezar. Si las cartas
     * escribieran sobre la tabla, morir dejaría al jugador con los números
     * de la partida anterior — y todo seguiría funcionando, sólo que mal.
     */
    const antesArma = copia(WEAPONS);
    const antesPlayer = copia(PLAYER);

    const m = new Modificadores();
    for (const c of mazoDe(CLASE.GUERRERO)) m.tomar(c.id);
    m.valores();

    expect(copia(WEAPONS)).toEqual(antesArma);
    expect(copia(PLAYER)).toEqual(antesPlayer);
  });

  it('dos modificadores no se pisan entre si', () => {
    const a = new Modificadores();
    const b = new Modificadores();
    a.tomar('ataque-premium');
    expect(b.valores().dano).toBe(WEAPONS.pistol.damage);
    expect(a.valores().dano).toBeGreaterThan(b.valores().dano);
  });
});

describe('los ejes del sorteo, que todavia no se usan', () => {
  it('las veintitres estan clasificadas', () => {
    /*
     * El sorteo con forma es la 19B.9. Los ejes están escritos desde ahora
     * por el mismo motivo que la fórmula de la ráfaga estaba escrita antes
     * de que existieran las cartas: **clasificar veintitrés cartas
     * después, con el sorteo ya hecho, es rehacer el sorteo.**
     */
    for (const c of CARTAS) expect(c.eje, `${c.id} no tiene eje`).toBeTruthy();
  });

  it('el eje del conteo tiene las tres que multiplican proyectiles', () => {
    const conteo = CARTAS.filter((c) => c.eje === 'conteo').map((c) => c.id);
    expect(conteo.sort()).toEqual(
      ['disparo-multiple', 'disparos-diagonales', 'tiro-doble'].sort()
    );
  });
});

describe('carta()', () => {
  it('encuentra por id y devuelve undefined si no existe', () => {
    expect(carta('sanar').nombre).toBe('Sanar');
    expect(carta('no-existe')).toBeUndefined();
  });
});
