import { describe, it, expect } from 'vitest';
import { WeaponController } from '../src/combat/weaponController.js';
import {
  dañoPorDistancia,
  alcanzadosPorExplosion,
  objetivoAutomatico
} from '../src/combat/explosion.js';
import { GestorProyectiles } from '../src/combat/projectile.js';
import { WEAPONS, ZOMBIE_STANDARD, PERF } from '../src/config/balance.js';
import { rumboHacia, dirDeRumbo } from '../src/core/rumbo.js';

/**
 * ===========================================================================
 * LA BAZOOKA
 * ===========================================================================
 * Tres piezas que se prueban por separado: el daño en area, el cohete que
 * viaja, y la barra de treinta segundos.
 *
 * Como en todo el combate, los rumbos se le piden al convenio del proyecto
 * y no se escriben como numeros. Ver src/core/rumbo.js y lo que costo la
 * primera vez.
 */

const B = WEAPONS.bazooka;
const AREA = { radio: B.blastRadius, centro: B.damage, borde: B.damageEdge };

const objetivo = (x, z, vivo = true) => ({ posicion: { x, z }, vivo });
const ORIGEN = { x: 0, z: 0 };
const FRENTE = rumboHacia(0, -1);

/** Punto a `d` metros del origen en la direccion `rumbo`. */
const adelante = (d, rumbo = FRENTE) => {
  const dir = dirDeRumbo(rumbo);
  return { x: dir.x * d, z: dir.z * d };
};
const blanco = (d, rumbo = FRENTE) => {
  const p = adelante(d, rumbo);
  return objetivo(p.x, p.z);
};

/* =========================================================================
   DAÑO EN AREA
   ========================================================================= */

describe('daño en area', () => {
  it('en el centro hace el daño directo', () => {
    expect(dañoPorDistancia(0, AREA)).toBeCloseTo(B.damage, 6);
  });

  it('fuera del radio no hace nada', () => {
    expect(dañoPorDistancia(B.blastRadius, AREA)).toBe(0);
    expect(dañoPorDistancia(B.blastRadius + 3, AREA)).toBe(0);
  });

  it('baja hacia el borde, sin saltos', () => {
    let anterior = Infinity;
    for (let d = 0; d < B.blastRadius; d += 0.25) {
      const daño = dañoPorDistancia(d, AREA);
      expect(daño).toBeLessThanOrEqual(anterior);
      anterior = daño;
    }
  });

  it('cerca del borde queda en el daño de borde declarado', () => {
    const casi = dañoPorDistancia(B.blastRadius - 0.01, AREA);
    expect(casi).toBeCloseTo(B.damageEdge, 0);
  });

  it('el centro mata a un zombi estandar y el borde NO', () => {
    /*
     * Es el criterio de salida de la fase puesto como numero, leido del
     * balance real. Si no fuera asi, la bazooka seria un boton de borrar
     * pantalla y apuntarla no seria una habilidad.
     */
    expect(dañoPorDistancia(0, AREA)).toBeGreaterThan(ZOMBIE_STANDARD.maxHealth);
    expect(dañoPorDistancia(B.blastRadius - 0.2, AREA)).toBeLessThan(
      ZOMBIE_STANDARD.maxHealth
    );
  });
});

describe('a quienes alcanza la explosion', () => {
  it('alcanza a todo un grupo apretado', () => {
    const grupo = [blanco(0.5), blanco(1.2), blanco(2)];
    expect(alcanzadosPorExplosion(ORIGEN, grupo, AREA)).toHaveLength(3);
  });

  it('no alcanza al que esta fuera del radio', () => {
    const r = alcanzadosPorExplosion(ORIGEN, [blanco(B.blastRadius + 1)], AREA);
    expect(r).toHaveLength(0);
  });

  it('ignora a los muertos', () => {
    const muerto = { ...blanco(1), vivo: false };
    expect(alcanzadosPorExplosion(ORIGEN, [muerto], AREA)).toHaveLength(0);
  });

  it('el de afuera del grupo recibe menos que el del centro', () => {
    const cerca = blanco(0.4);
    const lejos = blanco(B.blastRadius - 0.5);
    const r = alcanzadosPorExplosion(ORIGEN, [cerca, lejos], AREA);
    const dCerca = r.find((x) => x.objetivo === cerca).daño;
    const dLejos = r.find((x) => x.objetivo === lejos).daño;
    expect(dCerca).toBeGreaterThan(dLejos * 2);
  });

  it('el empujon sale del centro hacia afuera', () => {
    const dir = dirDeRumbo(FRENTE);
    const [r] = alcanzadosPorExplosion(ORIGEN, [blanco(3)], AREA);
    expect(r.dirX).toBeCloseTo(dir.x, 3);
    expect(r.dirZ).toBeCloseTo(dir.z, 3);
  });

  it('un impacto directo tambien empuja, sin dividir por cero', () => {
    const [r] = alcanzadosPorExplosion(ORIGEN, [objetivo(0, 0)], AREA);
    expect(Number.isFinite(r.dirX)).toBe(true);
    expect(Number.isFinite(r.dirZ)).toBe(true);
    expect(Math.hypot(r.dirX, r.dirZ)).toBeCloseTo(1, 6);
  });
});

/* =========================================================================
   APUNTADO AUTOMATICO
   ========================================================================= */

describe('apuntado automatico', () => {
  const opt = { alcance: B.range };

  it('sin nadie en rango no devuelve nada', () => {
    expect(objetivoAutomatico(ORIGEN, [], opt)).toBeNull();
    expect(objetivoAutomatico(ORIGEN, [blanco(B.range + 5)], opt)).toBeNull();
  });

  it('elige al mas cercano', () => {
    const cerca = blanco(6);
    const lejos = blanco(30);
    expect(objetivoAutomatico(ORIGEN, [lejos, cerca], opt).objetivo).toBe(cerca);
  });

  it('elige al mas cercano aunque este a la espalda', () => {
    // La bazooka apunta sola: no le importa hacia donde mira el jugador.
    const atras = blanco(-5);
    const adelanteLejos = blanco(20);
    expect(objetivoAutomatico(ORIGEN, [adelanteLejos, atras], opt).objetivo).toBe(atras);
  });

  it('ignora a los muertos', () => {
    const muerto = { ...blanco(3), vivo: false };
    const vivo = blanco(12);
    expect(objetivoAutomatico(ORIGEN, [muerto, vivo], opt).objetivo).toBe(vivo);
  });

  it('devuelve el rumbo hacia el blanco, no uno cualquiera', () => {
    const z = blanco(10, 40);
    expect(objetivoAutomatico(ORIGEN, [z], opt).rumbo).toBeCloseTo(40, 4);
  });

  it('NO elige a uno que esta detras de una pared', () => {
    /*
     * No esta en el documento 02: se agrega a proposito. Sin esto, el arma
     * elegiria un zombi del otro lado de una persiana, el cohete
     * reventaria contra la pared a dos metros del jugador, y la explosion
     * de seis metros se lo llevaria puesto sin que entendiera por que.
     */
    const tapado = blanco(10);
    const r = objetivoAutomatico(ORIGEN, [tapado], {
      ...opt,
      rayo: () => ({ t: 0.4 })
    });
    expect(r).toBeNull();
  });

  it('elige al segundo mas cercano si el primero esta tapado', () => {
    const tapado = blanco(8);
    const libre = blanco(14);
    const r = objetivoAutomatico(ORIGEN, [tapado, libre], {
      ...opt,
      // Solo el de ocho metros esta tapado.
      rayo: (ax, az, bx, bz) =>
        Math.hypot(bx - ax, bz - az) < 10 ? { t: 0.5 } : null
    });
    expect(r.objetivo).toBe(libre);
  });
});

/* =========================================================================
   EL COHETE
   ========================================================================= */

describe('el cohete viaja, no llega', () => {
  const lanzar = (opt = {}) => {
    const detonaciones = [];
    const g = new GestorProyectiles({
      alDetonar: (i) => detonaciones.push(i),
      ...opt
    });
    g.lanzar({
      origen: ORIGEN,
      rumbo: FRENTE,
      velocidad: B.projectileSpeed,
      alcance: B.range,
      ...(opt.proyectil ?? {})
    });
    return { g, detonaciones };
  };

  it('tarda tiempo real en cruzar la distancia', () => {
    /*
     * La demora ES el arma: es el tiempo en el que la horda sigue
     * avanzando hacia donde ya no va a estar la explosion. Un cohete
     * instantaneo seria una pistola que hace mas daño.
     */
    const { g, detonaciones } = lanzar();
    g.update(0.1, []);
    expect(detonaciones).toHaveLength(0);
    expect(g.vivos[0].recorrido).toBeCloseTo(B.projectileSpeed * 0.1, 4);
    // Y cruzar cuarenta metros le lleva mas de un segundo.
    expect(B.range / B.projectileSpeed).toBeGreaterThan(1);
  });

  it('detona al chocar contra un cuerpo', () => {
    const z = blanco(5);
    const { g, detonaciones } = lanzar();
    for (let i = 0; i < 30 && g.vivos.length; i++) g.update(1 / 60, [z]);

    expect(detonaciones).toHaveLength(1);
    expect(detonaciones[0].contra).toBe('cuerpo');
    expect(detonaciones[0].objetivo).toBe(z);

    /*
     * Detona en la SUPERFICIE del cuerpo, no en su centro: el zombi esta a
     * 5 m y el radio de impacto es 0,7, asi que el cohete lo toca a 4,3.
     *
     * Vale la pena fijarlo con esta precision. La primera version de esta
     * prueba esperaba 5 con una decima de tolerancia y pasaba con el
     * codigo viejo, que detonaba en cualquier punto entre 4,3 y 5 segun
     * donde cayera el cuadro: el destello aparecia visiblemente corto y de
     * forma inconsistente.
     */
    const radio = 0.7;
    expect(Math.hypot(detonaciones[0].x, detonaciones[0].z)).toBeCloseTo(5 - radio, 3);
  });

  it('detona contra una pared antes de llegar al zombi', () => {
    const z = blanco(20);
    const { g, detonaciones } = lanzar({ rayo: () => ({ t: 0.5, x: 0, z: 0 }) });
    g.update(1 / 60, [z]);
    expect(detonaciones).toHaveLength(1);
    expect(detonaciones[0].contra).toBe('pared');
  });

  it('detona sola al agotar el alcance', () => {
    const { g, detonaciones } = lanzar({ proyectil: { alcance: 10 } });
    for (let i = 0; i < 200 && g.vivos.length; i++) g.update(1 / 60, []);
    expect(detonaciones).toHaveLength(1);
    expect(detonaciones[0].contra).toBe('alcance');
    // Nunca se queda volando.
    expect(g.vivos).toHaveLength(0);
  });

  it('NO atraviesa un zombi aunque avance mas que su radio en un cuadro', () => {
    /*
     * Es el error de tunel, el mismo que tuvo el jugador contra las
     * paredes. Con el techo de dt el cohete avanza 1,6 m por cuadro, mas
     * del doble de su radio de impacto: mirando solo donde termina el
     * cuadro, aparece del otro lado sin haber chocado.
     */
    const z = blanco(1.0);
    const { g, detonaciones } = lanzar();
    // Un solo cuadro, del largo maximo que el juego permite.
    g.update(PERF.maxDeltaTime, [z]);

    expect(B.projectileSpeed * PERF.maxDeltaTime).toBeGreaterThan(
      g.vivos[0]?.radioImpacto ?? 0.7
    );
    expect(detonaciones, 'el cohete atraveso al zombi').toHaveLength(1);
    expect(detonaciones[0].objetivo).toBe(z);
  });

  it('no detona contra algo que tiene a la espalda', () => {
    const atras = blanco(-3);
    const { g, detonaciones } = lanzar();
    g.update(1 / 60, [atras]);
    expect(detonaciones).toHaveLength(0);
  });

  it('no detona contra algo que le pasa lejos por el costado', () => {
    const dir = dirDeRumbo(FRENTE);
    const costado = objetivo(-dir.z * 4 + dir.x * 5, dir.x * 4 + dir.z * 5);
    const { g, detonaciones } = lanzar();
    for (let i = 0; i < 20 && g.vivos.length; i++) g.update(1 / 60, [costado]);
    expect(detonaciones[0]?.contra).not.toBe('cuerpo');
  });

  it('no persigue: vuela derecho aunque el blanco se mueva', () => {
    /*
     * Si persiguiera, la demora no costaria nada y el arma volveria a ser
     * "apretar para matar". Volando derecho, un zombi que cambia de
     * direccion se salva, y el radio de seis metros es lo que perdona el
     * error. Esa es toda la tension del arma.
     */
    const z = blanco(12);
    const { g } = lanzar();
    g.update(0.2, [z]);
    const rumboAntes = g.vivos[0].rumbo;

    // El zombi se corre bruscamente.
    z.posicion.x += 15;
    g.update(0.2, [z]);
    expect(g.vivos[0].rumbo).toBeCloseTo(rumboAntes, 6);
  });

  it('varios cohetes a la vez no se pisan', () => {
    const detonaciones = [];
    const g = new GestorProyectiles({ alDetonar: (i) => detonaciones.push(i) });
    g.lanzar({ origen: ORIGEN, rumbo: FRENTE, velocidad: 24, alcance: 5 });
    g.lanzar({ origen: ORIGEN, rumbo: FRENTE, velocidad: 24, alcance: 20 });
    for (let i = 0; i < 200 && g.vivos.length; i++) g.update(1 / 60, []);
    expect(detonaciones).toHaveLength(2);
  });
});

/* =========================================================================
   LA BARRA
   ========================================================================= */

describe('la barra de treinta segundos', () => {
  const armar = (opt = {}) => {
    const ev = { lanzados: [], disparos: [], sinBlanco: [], listos: [], ruidos: [] };
    const w = new WeaponController({
      lanzarProyectil: (i) => ev.lanzados.push(i),
      alDispararEspecial: (i) => ev.disparos.push(i),
      alEspecialSinBlanco: (i) => ev.sinBlanco.push(i),
      alCargarEspecial: (i) => ev.listos.push(i),
      alHacerRuido: (i) => ev.ruidos.push(i),
      ...opt
    });
    return { w, ev };
  };

  /** Deja pasar `s` segundos de juego, en cuadros. */
  const correr = (w, s, objetivos = []) => {
    const paso = 1 / 30;
    for (let t = 0; t < s; t += paso) w.update(paso, ORIGEN, FRENTE, objetivos);
  };

  it('arranca descargada', () => {
    const { w } = armar();
    expect(w.progresoEspecial).toBe(0);
    expect(w.especialLista).toBe(false);
  });

  it('no dispara con la barra a medias', () => {
    const { w, ev } = armar();
    correr(w, B.cooldown / 2);
    expect(w.especialLista).toBe(false);
    expect(w.dispararEspecial(ORIGEN, [blanco(8)])).toBe(false);
    expect(ev.lanzados).toHaveLength(0);
  });

  it('a los treinta segundos esta lista, y avisa', () => {
    const { w, ev } = armar();
    correr(w, B.cooldown + 0.5);
    expect(w.especialLista).toBe(true);
    expect(ev.listos, 'no aviso que se habia llenado').toHaveLength(1);
  });

  it('la barra carga con cualquier arma en la mano', () => {
    /*
     * Si cargara solo con la bazooka equipada, lo racional seria andar con
     * ella puesta sin usarla, y el jugador tendria que elegir entre pelear
     * y esperar. Cargando sola, la unica decision es CUANDO gastarla.
     */
    const { w } = armar({ armaInicial: 'knife' });
    correr(w, B.cooldown + 0.5);
    expect(w.equipada).toBe('knife');
    expect(w.especialLista).toBe(true);
  });

  it('disparar la vacia, y vuelve a cargar desde cero', () => {
    const { w, ev } = armar();
    correr(w, B.cooldown + 0.5);
    expect(w.dispararEspecial(ORIGEN, [blanco(8)])).toBe(true);
    expect(w.progresoEspecial).toBe(0);
    expect(ev.lanzados).toHaveLength(1);

    correr(w, B.cooldown + 0.5);
    expect(w.especialLista).toBe(true);
  });

  it('la barra no pasa de llena por mucho que espere', () => {
    const { w, ev } = armar();
    correr(w, B.cooldown * 3);
    expect(w.progresoEspecial).toBe(1);
    // Y avisa una sola vez, no una por cuadro.
    expect(ev.listos).toHaveLength(1);
  });

  it('sin blanco NO gasta la carga', () => {
    /*
     * Al reves que la pistola, donde errar cuesta una bala a proposito. La
     * diferencia es el precio: una bala son unos segundos, la barra son
     * treinta. Castigar un dedo con treinta segundos no es balance.
     */
    const { w, ev } = armar();
    correr(w, B.cooldown + 0.5);

    expect(w.dispararEspecial(ORIGEN, [blanco(B.range + 10)])).toBe(false);
    expect(w.progresoEspecial).toBe(1);
    expect(w.especialLista).toBe(true);
    expect(ev.sinBlanco).toHaveLength(1);
    expect(ev.lanzados).toHaveLength(0);
  });

  it('el cohete sale hacia el blanco elegido', () => {
    const { w, ev } = armar();
    correr(w, B.cooldown + 0.5);
    const z = blanco(10, 65);
    w.dispararEspecial(ORIGEN, [z]);
    expect(ev.lanzados[0].rumbo).toBeCloseTo(65, 4);
    expect(ev.lanzados[0].velocidad).toBe(B.projectileSpeed);
  });

  it('el cohete no vuela mas alla del blanco', () => {
    // Si el zombi se corre, detona donde estaba; no sigue hasta los 40 m.
    const { w, ev } = armar();
    correr(w, B.cooldown + 0.5);
    w.dispararEspecial(ORIGEN, [blanco(9)]);
    expect(ev.lanzados[0].alcance).toBeLessThan(B.range);
    expect(ev.lanzados[0].alcance).toBeCloseTo(9 + B.blastRadius, 4);
  });

  it('el disparo hace el ruido mas grande del juego', () => {
    const { w, ev } = armar();
    correr(w, B.cooldown + 0.5);
    w.dispararEspecial(ORIGEN, [blanco(8)]);
    expect(ev.ruidos).toHaveLength(1);
    expect(ev.ruidos[0].radio).toBe(B.noiseRadius);
    expect(B.noiseRadius).toBeGreaterThan(WEAPONS.pistol.noiseRadius);
  });

  it('reiniciar la mision deja la barra en cero', () => {
    /*
     * Empezar cargado convertiria el principio de cada intento en "gasto
     * la bazooka en el primer grupo". Y al morir, reaparecer con la barra
     * llena premiaria morirse.
     */
    const { w } = armar();
    correr(w, B.cooldown + 1);
    expect(w.especialLista).toBe(true);
    w.reiniciar('knife');
    expect(w.progresoEspecial).toBe(0);
  });

  it('usar las otras armas no interfiere con la barra', () => {
    const { w } = armar({ armaInicial: 'pistol' });
    correr(w, B.cooldown + 0.5);
    w.atacar(ORIGEN, FRENTE, []);
    correr(w, 1);
    expect(w.especialLista).toBe(true);
  });
});
