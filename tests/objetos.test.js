import { describe, it, expect } from 'vitest';
import {
  BolsaDeObjetos,
  TipoObjeto,
  curaDeBotiquin,
  RADIO_RECOGIDA
} from '../src/items/itemLogic.js';
import { PLAYER, ITEMS, CHECKPOINT_DROP, WEAPONS } from '../src/config/balance.js';
import { direccionDeEntrada, rumboHacia, dirDeRumbo } from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * OBJETOS DEL PISO Y APUNTADO
 * ===========================================================================
 * Lo que se levanta caminando, cuanto cura, y la cuenta que convierte el
 * arrastre de un pulgar en una direccion del mundo.
 */

const ORIGEN = { x: 0, z: 0 };
/** Siempre sirve: para probar la recogida sin mezclarla con el "si sirve". */
const siempre = () => true;

describe('levantar objetos caminando', () => {
  it('levanta lo que pisa', () => {
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.MUNICION, 0.5, 0);
    expect(b.recoger(ORIGEN, siempre)).toHaveLength(1);
    expect(b.enElPiso).toHaveLength(0);
  });

  it('no levanta lo que esta lejos', () => {
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.MUNICION, RADIO_RECOGIDA + 1, 0);
    expect(b.recoger(ORIGEN, siempre)).toHaveLength(0);
    expect(b.enElPiso).toHaveLength(1);
  });

  it('no levanta dos veces el mismo', () => {
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.BOTIQUIN, 0, 0);
    expect(b.recoger(ORIGEN, siempre)).toHaveLength(1);
    expect(b.recoger(ORIGEN, siempre)).toHaveLength(0);
  });

  it('levanta varios de una sola pasada si estan encimados', () => {
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.MUNICION, 0.2, 0);
    b.soltar(TipoObjeto.MUNICION, 0, 0.2);
    expect(b.recoger(ORIGEN, siempre)).toHaveLength(2);
  });

  it('LO QUE NO SIRVE SE QUEDA EN EL PISO', () => {
    /*
     * La regla que evita que un botiquin pisado con la vida llena se
     * pierda para siempre sin que el jugador se entere. Es la diferencia
     * entre un recurso que se administra y uno que se desperdicia por
     * caminar distraido.
     */
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.BOTIQUIN, 0, 0);
    b.soltar(TipoObjeto.MUNICION, 0.3, 0);

    const soloMunicion = (tipo) => tipo === TipoObjeto.MUNICION;
    const tomados = b.recoger(ORIGEN, soloMunicion);

    expect(tomados).toHaveLength(1);
    expect(tomados[0].tipo).toBe(TipoObjeto.MUNICION);
    // El botiquin sigue ahi, esperando a que haga falta.
    expect(b.enElPiso).toHaveLength(1);
    expect(b.enElPiso[0].tipo).toBe(TipoObjeto.BOTIQUIN);
  });

  it('el que quedo en el piso se puede levantar despues', () => {
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.BOTIQUIN, 0, 0);
    expect(b.recoger(ORIGEN, () => false)).toHaveLength(0);
    expect(b.recoger(ORIGEN, siempre)).toHaveLength(1);
  });

  it('cuenta lo que hay en el piso por tipo', () => {
    const b = new BolsaDeObjetos();
    b.soltar(TipoObjeto.MUNICION, 5, 0);
    b.soltar(TipoObjeto.MUNICION, 6, 0);
    b.soltar(TipoObjeto.BOTIQUIN, 7, 0);
    expect(b.contar()).toEqual({ municion: 2, botiquin: 1 });
  });
});

describe('el surtido del control', () => {
  it('reparte los objetos, no los apila en un punto', () => {
    /*
     * Encimados, el jugador los pisa todos de una pasada y no llega a ver
     * que levanto. Separados, los va juntando de a uno.
     */
    const b = new BolsaDeObjetos();
    const nuevos = b.soltarGrupo(['a', 'b', 'c'], ORIGEN, 2.2);
    for (let i = 0; i < nuevos.length; i++) {
      for (let j = i + 1; j < nuevos.length; j++) {
        const d = Math.hypot(nuevos[i].x - nuevos[j].x, nuevos[i].z - nuevos[j].z);
        expect(d, 'dos objetos quedaron encimados').toBeGreaterThan(RADIO_RECOGIDA);
      }
    }
  });

  it('todos quedan al radio pedido del centro', () => {
    const b = new BolsaDeObjetos();
    for (const o of b.soltarGrupo(['a', 'b', 'c'], { x: 10, z: -4 }, 2.2)) {
      expect(Math.hypot(o.x - 10, o.z + 4)).toBeCloseTo(2.2, 4);
    }
  });

  it('el angulo inicial los corre a todos, manteniendo el reparto', () => {
    // Sirve para que dos controles seguidos no dejen el mismo dibujo.
    const a = new BolsaDeObjetos().soltarGrupo(['x', 'y'], ORIGEN, 2, 0);
    const b = new BolsaDeObjetos().soltarGrupo(['x', 'y'], ORIGEN, 2, 90);
    expect(a[0].x).not.toBeCloseTo(b[0].x, 2);
  });

  it('el control suelta dos municiones y un botiquin', () => {
    const n = {};
    for (const t of CHECKPOINT_DROP.objetos) n[t] = (n[t] ?? 0) + 1;
    expect(n).toEqual({ municion: 2, botiquin: 1 });
  });

  it('las dos cajas suman dos cargadores', () => {
    const balas = 2 * ITEMS.ammoPistol.amount;
    expect(balas).toBe(24);
    expect(balas).toBe(WEAPONS.pistol.magazineSize * 2);
  });
});

describe('cuanto cura un botiquin', () => {
  it('cura la mitad de la vida TOTAL', () => {
    expect(curaDeBotiquin(PLAYER.maxHealth)).toBe(PLAYER.maxHealth / 2);
    expect(ITEMS.medkit.heal).toBe(PLAYER.maxHealth / 2);
  });

  it('se SUMA a lo que haya: con un cuarto deja tres cuartos', () => {
    /*
     * El ejemplo exacto que pidio Gustavo. Es la mitad del TOTAL, no la
     * mitad de lo que falta: la segunda cura mucho cuando estas por morir
     * y casi nada cuando estas bien, o sea que premia llegar hecho
     * pedazos.
     */
    const maximo = PLAYER.maxHealth;
    const unCuarto = maximo * 0.25;
    const despues = Math.min(maximo, unCuarto + curaDeBotiquin(maximo));
    expect(despues).toBe(maximo * 0.75);
  });

  it('no pasa del maximo', () => {
    const maximo = PLAYER.maxHealth;
    const casiLleno = maximo - 5;
    expect(Math.min(maximo, casiLleno + curaDeBotiquin(maximo))).toBe(maximo);
  });

  it('sale del maximo real, no de un numero escrito a mano', () => {
    // Si alguna vez la vida maxima cambia, la cura la acompaña sola.
    expect(curaDeBotiquin(200)).toBe(100);
    expect(curaDeBotiquin(80)).toBe(40);
  });
});

describe('apuntar con el pulgar', () => {
  /*
   * `direccionDeEntrada` es la cuenta que convierte "el dedo fue hacia
   * arriba" en "el personaje apunta calle arriba". La usan el joystick de
   * movimiento Y el de apuntado: si no fuera la misma, el personaje
   * caminaria hacia un lado y dispararia hacia otro.
   */
  it('con la camara en cero, arriba de la pantalla es -Z', () => {
    const d = direccionDeEntrada(0, 1, 0);
    expect(d.x).toBeCloseTo(0, 6);
    expect(d.z).toBeCloseTo(-1, 6);
  });

  it('con la camara en cero, la derecha de la pantalla es +X', () => {
    const d = direccionDeEntrada(1, 0, 0);
    expect(d.x).toBeCloseTo(1, 6);
    expect(d.z).toBeCloseTo(0, 6);
  });

  it('girar la camara gira el apuntado con ella', () => {
    // Arrastrar "hacia arriba" siempre significa alejarse de la camara,
    // mire para donde mire. Es lo que hace que la calle en diagonal no
    // obligue a pensar en coordenadas del mapa.
    for (const yaw of [0, 45, 90, 180, -60]) {
      const d = direccionDeEntrada(0, 1, yaw);
      expect(rumboHacia(d.x, d.z)).toBeCloseTo(yaw > 180 ? yaw - 360 : yaw, 4);
    }
  });

  it('conserva la intensidad del arrastre', () => {
    // Un arrastre corto no tiene por que apuntar con menos fuerza, pero la
    // intensidad tiene que llegar intacta por si alguna vez se usa.
    const flojo = direccionDeEntrada(0, 0.5, 30);
    const fuerte = direccionDeEntrada(0, 1, 30);
    expect(Math.hypot(flojo.x, flojo.z)).toBeCloseTo(0.5, 6);
    expect(Math.hypot(fuerte.x, fuerte.z)).toBeCloseTo(1, 6);
  });

  it('da exactamente lo mismo que la cuenta que tenia el jugador antes', () => {
    /*
     * Esta cuenta vivia escrita a mano adentro de `playerController`, y se
     * saco de ahi para que el apuntado pudiera usar LA MISMA. Mover
     * trigonometria de lugar es justo donde se cuela un signo cambiado, y
     * el sintoma seria que el personaje camina para un lado distinto del
     * que lo manda el dedo.
     *
     * Asi que aca esta la version vieja, copiada tal cual, comparada
     * contra la nueva. Si alguna vez dejan de coincidir, fue a proposito o
     * fue un error, pero nadie se va a enterar por casualidad.
     */
    const comoEraAntes = (ejeX, ejeY, yaw) => {
      const rad = (yaw * Math.PI) / 180;
      const sin = Math.sin(rad);
      const cos = Math.cos(rad);
      const forwardX = -sin;
      const forwardZ = -cos;
      const rightX = cos;
      const rightZ = -sin;
      return {
        x: ejeX * rightX + ejeY * forwardX,
        z: ejeX * rightZ + ejeY * forwardZ
      };
    };

    for (const yaw of [0, 37, 90, 128, 180, 270, -95, -16]) {
      for (const [ex, ey] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
        [-0.7, 0.7],
        [0.3, -0.9]
      ]) {
        const viejo = comoEraAntes(ex, ey, yaw);
        const nuevo = direccionDeEntrada(ex, ey, yaw);
        expect(nuevo.x, `yaw ${yaw}, entrada ${ex},${ey}`).toBeCloseTo(viejo.x, 9);
        expect(nuevo.z, `yaw ${yaw}, entrada ${ex},${ey}`).toBeCloseTo(viejo.z, 9);
      }
    }
  });

  it('la direccion apuntada y su rumbo son consistentes', () => {
    // Cierra el circulo con el convenio: la direccion que sale de un
    // arrastre, pasada a rumbo y de vuelta a direccion, no cambia.
    for (const yaw of [0, 73, -140]) {
      const d = direccionDeEntrada(0.6, 0.8, yaw);
      const largo = Math.hypot(d.x, d.z);
      const vuelta = dirDeRumbo(rumboHacia(d.x, d.z));
      expect(vuelta.x).toBeCloseTo(d.x / largo, 6);
      expect(vuelta.z).toBeCloseTo(d.z / largo, 6);
    }
  });
});
