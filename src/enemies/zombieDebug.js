import * as pc from 'playcanvas';
import { EstadoZombi } from './zombieAI.js';

/**
 * ===========================================================================
 * DIAGNOSTICO DE ZOMBIS
 * ===========================================================================
 * Dibuja encima de la escena lo que la IA esta pensando: el cono de vision,
 * el estado y hacia donde va cada zombi.
 *
 * Esto no es un adorno de desarrollo, es la herramienta con la que se
 * ajusta el comportamiento. Sin verlo, "el zombi se traba" o "me vio desde
 * muy lejos" son impresiones que no se pueden corregir. Con el cono
 * dibujado se ve en un segundo si el problema es el alcance, el angulo o
 * la linea de vista.
 *
 * Se dibuja con lineas inmediatas del motor: no crea entidades, no ensucia
 * la escena y no cuesta nada cuando esta apagado.
 *
 * Se enciende con el mismo F1 que el resto del diagnostico.
 */

/** Un color por estado. El codigo es el de un semaforo, a proposito. */
const COLOR_ESTADO = {
  [EstadoZombi.IDLE]: new pc.Color(0.5, 0.5, 0.55),
  [EstadoZombi.ALERT]: new pc.Color(1, 0.75, 0.1),
  [EstadoZombi.CHASE]: new pc.Color(1, 0.25, 0.15),
  [EstadoZombi.SEARCH]: new pc.Color(1, 0.5, 0.1),
  [EstadoZombi.ATTACK]: new pc.Color(1, 0.1, 0.6),
  [EstadoZombi.STUNNED]: new pc.Color(0.4, 0.7, 1),
  [EstadoZombi.DEAD]: new pc.Color(0.25, 0.25, 0.25)
};

const _a = new pc.Vec3();
const _b = new pc.Vec3();

/**
 * @param {pc.AppBase} app
 * @param {import('./spawnManager.js').SpawnManager} spawn
 * @param {{x:number,z:number}} jugador
 */
export function dibujarDiagnosticoZombis(app, spawn, jugador) {
  for (const z of spawn.enJuego) {
    if (!z.activo || !z.ai) continue;

    const p = z.posicion;
    const estado = z.ai.estado;
    const color = COLOR_ESTADO[estado] ?? pc.Color.WHITE;

    // --- Poste de estado ----------------------------------------------------
    // Una barra vertical del color del estado. Se ve desde la camara
    // cenital aunque el zombi este detras de un auto.
    _a.set(p.x, 0.1, p.z);
    _b.set(p.x, 2.6, p.z);
    app.drawLine(_a, _b, color, false);

    if (estado === EstadoZombi.DEAD) continue;

    // --- Cono de vision -----------------------------------------------------
    const cfg = z.cfg;
    const semi = (cfg.sightAngle / 2) * (Math.PI / 180);
    const rumbo = z.ai.rumbo * (Math.PI / 180);
    const alcance = cfg.sightRange;

    for (const signo of [-1, 1]) {
      const a = rumbo + semi * signo;
      _a.set(p.x, 1.5, p.z);
      _b.set(p.x + Math.sin(a) * alcance, 1.5, p.z + Math.cos(a) * alcance);
      app.drawLine(_a, _b, color, false);
    }
    // Arco de cierre, para que el cono se lea como un area y no como dos
    // rayas sueltas.
    const pasos = 7;
    for (let i = 0; i < pasos; i++) {
      const a1 = rumbo - semi + (semi * 2 * i) / pasos;
      const a2 = rumbo - semi + (semi * 2 * (i + 1)) / pasos;
      _a.set(p.x + Math.sin(a1) * alcance, 1.5, p.z + Math.cos(a1) * alcance);
      _b.set(p.x + Math.sin(a2) * alcance, 1.5, p.z + Math.cos(a2) * alcance);
      app.drawLine(_a, _b, color, false);
    }

    // --- Alcance de oido ----------------------------------------------------
    // Circulo chico: es la deteccion que no depende de mirar.
    const oido = cfg.hearRange;
    for (let i = 0; i < 12; i++) {
      const a1 = (i / 12) * Math.PI * 2;
      const a2 = ((i + 1) / 12) * Math.PI * 2;
      _a.set(p.x + Math.sin(a1) * oido, 0.2, p.z + Math.cos(a1) * oido);
      _b.set(p.x + Math.sin(a2) * oido, 0.2, p.z + Math.cos(a2) * oido);
      app.drawLine(_a, _b, color, false);
    }

    // --- A donde va ---------------------------------------------------------
    // Si esta persiguiendo, una linea al jugador. Si esta buscando, al
    // ultimo lugar donde lo vio. Es lo que delata un zombi trabado: la
    // linea apunta a algo que no puede alcanzar.
    const destino =
      estado === EstadoZombi.CHASE || estado === EstadoZombi.ATTACK
        ? jugador
        : z.ai.ultimoVisto;
    if (destino) {
      _a.set(p.x, 1.7, p.z);
      _b.set(destino.x, 1.2, destino.z);
      app.drawLine(_a, _b, color, false);
    }
  }
}
