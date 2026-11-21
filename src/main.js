import * as pc from 'playcanvas';

import { EventBus, EV } from './core/events.js';
import { GameStateMachine, State } from './core/gameState.js';
import { device } from './core/device.js';
import { DebugOverlay } from './core/debugOverlay.js';
import { CollisionWorld } from './physics/collisionWorld.js';
import { InputManager } from './input/inputManager.js';
import { PlayerController } from './player/playerController.js';
import { CameraController } from './player/cameraController.js';
import { medirEncuadre } from './player/encuadre.js';
import { WorldBuilder } from './world/worldBuilder.js';
import { MissionManager } from './missions/missionManager.js';
import { Hud } from './ui/hud.js';
import { mission001 } from './config/mission001.js';
import { montarPostProceso } from './render/postProcess.js';
import { SpawnManager } from './enemies/spawnManager.js';
import { WeaponController } from './combat/weaponController.js';
import { SelectorDeBlanco } from './combat/blanco.js';
import { CombatFx } from './combat/combatFx.js';
import { Gus, Pose } from './characters/gus.js';
import { ArmasEnMano } from './characters/armas.js';
import { dibujarDiagnosticoZombis } from './enemies/zombieDebug.js';
import { montarEscena } from './visual/escena.js';
import { precargar as precargarModelos } from './visual/modelos.js';
import { HORIZONTE } from './visual/paleta.js';
import { calidadElegida, aplicarCalidad, Calidad } from './render/postProcess.js';
import { ajustes } from './core/settings.js';
import { Estadisticas, Progreso, formatearTiempo } from './core/progreso.js';
import {
  rumboHacia,
  rumboEntre,
  dirDeRumbo,
  direccionDeEntrada
} from './core/rumbo.js';

/** El perfil de calidad decide tambien la resolucion de las sombras. */
const calidadAlta = () => calidadElegida() === Calidad.ALTA;
import {
  PERF,
  UNITS,
  CAMERA,
  PLAYER,
  ZOMBIE_STANDARD
} from './config/balance.js';

/**
 * ===========================================================================
 * PUNTO DE ENTRADA
 * ===========================================================================
 * Arma la aplicacion, construye la escena y corre el bucle. El orden importa:
 * primero los sistemas que no dependen de nada (bus, estado), despues el
 * mundo, y recien al final el bucle de actualizacion.
 */

// Primero el dispositivo: marca el <body> para que el CSS sepa si dibujar
// controles tactiles o ayudas de teclado antes del primer cuadro.
device.init();

const canvas = document.getElementById('game-canvas');

const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas),
  keyboard: new pc.Keyboard(window),
  graphicsDeviceOptions: {
    antialias: false, // En movil cuesta caro; se compensa con la resolucion.
    alpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
// Tope de densidad de pixeles: un telefono a 3x renderiza 9 veces mas que a 1x.
/*
 * Tope de densidad de pixeles.
 *
 * Un telefono a 3x renderiza nueve veces mas pixeles que a 1x. Recortarlo
 * es el ajuste que mas FPS devuelve por menos perdida visual, y por eso
 * depende del perfil de calidad y no del tipo de aparato: alguien puede
 * elegir NORMAL en una computadora para que vaya mas suelto.
 */
const topeDpr = () =>
  calidadElegida() === Calidad.ALTA ? PERF.maxDevicePixelRatio : Math.min(PERF.maxDevicePixelRatio, 1.75);
app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio, topeDpr());
addEventListener('resize', () => app.resizeCanvas());

// --- Sistemas base ---------------------------------------------------------

const bus = new EventBus();
const state = new GameStateMachine(bus);
const hud = new Hud(bus, state);
const debug = new DebugOverlay(app);
const collision = new CollisionWorld(8);
const input = new InputManager(canvas);

// --- Escena ----------------------------------------------------------------

/*
 * Luz, niebla y cielo: tres luces con temperaturas distintas y una cupula
 * con degrade. El porque de cada numero esta en src/visual/escena.js.
 *
 * La niebla va adentro de eso: de dia no oscurece, aclara. Lo lejano se
 * destiñe hacia el color del horizonte, que es lo que separa un plano del
 * siguiente sin tener que oscurecer nada.
 */
const { sol, cupula } = montarEscena(app, { sombrasDeCalidad: calidadAlta() });

const cameraEntity = new pc.Entity('Camara');
cameraEntity.addComponent('camera', {
  // El color de fondo iguala al del horizonte de la cupula: donde se
  // termina la cupula no tiene que verse un escalon.
  clearColor: new pc.Color(HORIZONTE[0], HORIZONTE[1], HORIZONTE[2]),
  fov: CAMERA.fov,
  // El campo se mide a lo ancho, no a lo alto: ver la nota en balance.js.
  horizontalFov: CAMERA.fovHorizontal,
  nearClip: 0.2,
  // El clip lejano acompaña a la niebla: nada se dibuja mas alla de lo que se ve.
  farClip: 230
});
app.root.addChild(cameraEntity);

// Pipeline de imagen: HDR, oclusion ambiental, bloom, mapeo de tonos,
// grading y viñeta. Sin esto la escena nocturna se ve plana y sucia.
const { frame: postProceso, calidad } = montarPostProceso(app, cameraEntity, sol);
console.info(`[render] perfil de calidad: ${calidad}`);

// Suelo de respaldo, por si el jugador se sale del trazado de calles.
const ground = new pc.Entity('SueloBase');
const groundMat = new pc.StandardMaterial();
groundMat.diffuse = new pc.Color(0.34, 0.35, 0.33);
groundMat.gloss = 0.1;
groundMat.metalness = 0;
groundMat.useMetalness = true;
groundMat.update();
ground.addComponent('render', { type: 'plane', material: groundMat, castShadows: false });
ground.setLocalScale(600, 1, 600);
ground.setPosition(-50, -0.2, -120);
app.root.addChild(ground);

// --- Jugador ---------------------------------------------------------------

/**
 * Gus (Fase 12.B).
 *
 * La capsula provisional con un bloque al frente se fue. El modelo cuelga
 * de la misma entidad, asi que el controlador no cambio ni una linea: el
 * personaje se mueve igual, lo que cambio es lo que se ve.
 */
const playerEntity = new pc.Entity('Gus');

/**
 * Marca de posicion en el piso: un aro fino, no un disco.
 *
 * ---------------------------------------------------------------------------
 * POR QUE DEJO DE SER UN DISCO (12R.3)
 * ---------------------------------------------------------------------------
 * Nacio como un disco ambar de 2,5 m lleno, y estaba justificado: "Gus va de
 * negro sobre asfalto NOCTURNO y mide 40 px". Las dos premisas se cayeron.
 * El juego es de dia (D-16), la camara se acerco y Gus pasa a 43 px (D-23), y
 * el asfalto nuevo tiene 0,30 de albedo contra los 0,19 del cuero: se lee
 * solo. Se comparo con y sin, y sin el disco la escena mejora.
 *
 * Pero en el medio de una horda, perder de vista al personaje propio se paga
 * caro, asi que la red de seguridad se queda: un aro fino, del ancho de los
 * hombros, con la mitad de opacidad. Marca donde esta sin taparle los pies ni
 * parecer el selector de un juego de estrategia.
 *
 * Plano y sin iluminar, para que no cambie de color al entrar en sombra: es
 * informacion, no decorado.
 */
const ringMat = new pc.StandardMaterial();
ringMat.diffuse = new pc.Color(0, 0, 0);
ringMat.emissive = new pc.Color(1.0, 0.7, 0.12);
ringMat.emissiveIntensity = 1;
ringMat.useLighting = false;
ringMat.blendType = pc.BLEND_NORMAL;
ringMat.depthWrite = false;
ringMat.opacity = 0.26;
ringMat.update();
const ring = new pc.Entity('MarcaJugador');
/*
 * Un cilindro chato y chico, no un toro: la primitiva de toro de PlayCanvas
 * tiene tan pocos segmentos que achatada se dibuja como dos manchas.
 */
ring.addComponent('render', { type: 'cylinder', material: ringMat, castShadows: false });
ring.setLocalScale(0.95, 0.01, 0.95);
ring.setLocalPosition(0, 0.025, 0);
playerEntity.addChild(ring);

app.root.addChild(playerEntity);

const player = new PlayerController(playerEntity, collision, bus);
const camera = new CameraController(cameraEntity, collision);

// --- Mundo y mision --------------------------------------------------------

/*
 * Los modelos externos se cargan ANTES de construir el mundo, porque el
 * generador es sincronico: pide un arbol y lo quiere en el momento. Son
 * 120 KB en total; si alguno falla, el generador usa geometria propia y el
 * juego arranca igual.
 */
await precargarModelos(app);

const builder = new WorldBuilder(app, collision);
const built = builder.build(mission001);
const mission = new MissionManager(mission001, bus);

/*
 * Los zombis. Se preparan una vez: las entidades se crean aca y despues
 * solo se encienden y se apagan. Ver spawnManager.js para el porque.
 */
const zombis = new SpawnManager(app, collision, builder.mats, bus);
zombis.preparar(mission001);
console.info(`[zombis] ${zombis.stats.total} puestos repartidos en el mapa`);

// --- Combate ---------------------------------------------------------------

const efectos = new CombatFx(app, builder.mats);

/*
 * El modelo de Gus se construye DESPUES del constructor de materiales del
 * mundo, para compartir su cache. Cada material nuevo rompe el agrupado de
 * mallas, y Gus usa varios tonos oscuros que el mundo ya tiene.
 */
const gus = new Gus(playerEntity, builder.mats);

/*
 * El arma cuelga del anclaje de la mano derecha de Gus, asi que se mueve
 * sola con la animacion: el arma no sabe nada del personaje y el personaje
 * no sabe nada del arma.
 *
 * No se guarda en una variable, y antes si: era `armasEnMano` y el `main`
 * le pedia `equipar()` en cada cambio de arma. Sin cambio de arma, lo unico
 * que hace es colgarse del anclaje al arrancar y quedarse ahi.
 */
new ArmasEnMano(gus.anclaArma, builder.mats);

/*
 * ---------------------------------------------------------------------------
 * ACA HABIA UN GENERADOR DE AZAR PROPIO DEL COMBATE, Y SE FUE EN LA 17.3 bis
 * ---------------------------------------------------------------------------
 * `createRng(WORLD_SEED ^ 0x9e3779b9)`. Lo consumia una sola cosa: la
 * dispersion del tiro. Sin dispersion (D-36), **el combate no tiene una
 * sola decision al azar**.
 *
 * Y aca estaba la trampa de la tarea, que valia la pena verificar ANTES de
 * borrar: si el combate hubiera compartido el generador del mundo, sacarle
 * un consumidor **habria corrido la secuencia** y cambiado el mapa entero
 * sin que nadie lo pidiera.
 *
 * No paso, y no por suerte: el combate tenia su propia semilla justamente
 * por eso, y el gestor de zombis tiene la suya (`mission.seed ^ 0x5a5a`).
 * La separacion que parecia prolijidad resulto ser lo que permitio
 * borrar esto sin tocar nada mas. **Dos generadores separados se pueden
 * razonar por separado, y tambien borrar por separado.**
 */

/** Lo que dura un intento, y lo que sobrevive a cerrar la pestaña (D-14). */
const stats = new Estadisticas();
const progreso = new Progreso();

/** Color del anillo de ruido en el diagnostico: el mismo ambar del HUD. */
const COLOR_RUIDO = new pc.Color(1, 0.72, 0.15);

/*
 * El arma. Resuelve el rayo y el daño; los efectos y el ruido se enganchan
 * por callbacks, para que el controlador no tenga que conocer ni la escena
 * ni el gestor de zombis.
 */
const arma = new WeaponController({
  /*
   * El escenario y el azar entran por aca.
   *
   * El arma no conoce ni PlayCanvas ni el mundo: recibe una funcion para
   * preguntar si hay algo en el camino y otra para el azar. Es lo que
   * permite probar la balistica entera con numeros, y lo que mantiene el
   * azar atado a la semilla de la partida (D-12).
   */
  rayo: (ax, az, bx, bz, altura) => collision.raycast(ax, az, bx, bz, altura),

  alGolpear: ({ objetivo, daño, dirX, dirZ }) => {
    const vivoAntes = objetivo.vivo;
    objetivo.recibirDaño(daño, { dirX, dirZ, fuente: 'jugador' });
    // La baja se cuenta en el cruce, mirando si estaba vivo antes: el
    // zombi no avisa cuando muere, y agregarle un aviso solo para esto
    // seria cablear dos sistemas que no se necesitan.
    if (vivoAntes && !objetivo.vivo) stats.zombisEliminados++;
    const q = objetivo.posicion;
    efectos.mostrarImpacto(q.x, q.z);
    // Sacudon corto: marca el impacto sin estorbar la lectura.
    camera.sacudir(0.12, 0.14);
  },

  alFallar: () => {
    // Nada de sacudon: fallar tiene que sentirse distinto a acertar.
  },

  alHacerRuido: ({ x, z, radio }) => {
    const alertados = zombis.propagarRuido(x, z, radio);
    // El anillo se marca siempre; el diagnostico decide si se dibuja.
    efectos.marcarRuido(x, z, radio);
    if (alertados > 0) {
      /*
       * Avisar que el ruido junto gente NO es un adorno.
       *
       * El criterio de salida de la fase es que el jugador dude antes de
       * disparar, y para dudar tiene que haber aprendido que el tiro
       * trae zombis. Eso pasa cuando los ve venir, pero un zombi que se
       * acerca desde treinta metros tarda diez segundos en ser visible, y
       * para entonces ya nadie conecta una cosa con la otra. El aviso
       * cierra la relacion causa-efecto en el momento.
       */
      hud.flash(alertados === 1 ? 'ALGO TE ESCUCHÓ' : `${alertados} TE ESCUCHARON`, 1500);
    }
  },

  alDisparar: ({ desde, hasta, altura, acerto }) => {
    stats.disparos++;
    gus.gesto(Pose.DISPARAR);
    efectos.mostrarDisparo(desde, hasta, altura, acerto);
    /*
     * Retroceso de camara, mas corto y mas seco que el del cuerpo a
     * cuerpo. Un sacudon largo en un arma que dispara dos veces por
     * segundo se acumularia hasta marear.
     */
    camera.sacudir(0.1, 0.08);
  }
});

/*
 * ---------------------------------------------------------------------------
 * ACA HABIA UN `actualizarHudArma()`, Y SE FUE ENTERO EN LA 16.4
 * ---------------------------------------------------------------------------
 * Hacia tres cosas cada vez que el arma cambiaba: esconder la pistola del
 * cinto, encender el modelo de la equipada y escribir el nombre en el HUD.
 * Se llamaba desde `alCambiarArma`, desde el boton de cambiar y desde el
 * arranque de cada mision.
 *
 * Con un arma sola las tres se cayeron solas —no hay cinto, no hay
 * eleccion y el HUD no muestra el nombre— y lo que importa es que **se
 * cayeron en cadena**: el metodo del cinto, el `equipar()` de
 * `ArmasEnMano`, el `setArma()` del HUD y el aviso `alCambiarArma` no
 * tenian nada de malo cada uno por su lado; estaban todos sostenidos por
 * esta funcion. Dejarla como una funcion vacia habria mantenido los cuatro
 * vivos y sin usar.
 */

console.info(
  `[mundo] ${built.stats.boxes} cajas, ${built.stats.colliders} colisionadores, ` +
    `${built.markers.length} marcadores`
);

// --- Reglas de partida -----------------------------------------------------

/*
 * A quien le dispara Gus al quedarse quieto (D-28).
 *
 * Usa el alcance y la altura de tiro del arma, no numeros propios: lo que
 * se puede elegir como blanco tiene que ser exactamente lo que se puede
 * alcanzar de un tiro. Si el selector buscara mas lejos que el arma, Gus se
 * quedaria encarando a alguien al que no le llega.
 */
const blanco = new SelectorDeBlanco({
  alcance: arma.arma.range,
  altura: arma.arma.shotHeight,
  rayo: (ax, az, bx, bz, altura) => collision.raycast(ax, az, bx, bz, altura)
});

function startMission({ fromCheckpoint = false } = {}) {
  if (!fromCheckpoint) mission.reset();

  /*
   * EL RELOJ NO SE REINICIA AL MORIR.
   *
   * Volver desde un control continua el MISMO intento: el tiempo sigue
   * corriendo y la muerte queda contada. Es lo que hace que el mejor
   * tiempo signifique algo —morir cuesta— sin necesidad de castigar con
   * nada mas. Un reloj que se pone en cero convertiria morir en una forma
   * barata de volver a empezar el cronometro.
   *
   * Solo un arranque limpio borra la cuenta.
   */
  if (fromCheckpoint) {
    stats.muertes++;
  } else {
    stats.reiniciar();
    progreso.contarPartida();
  }
  hud.setRecord(false);
  const sp = fromCheckpoint ? mission.respawn : mission001.spawn;

  player.reset(sp.x, sp.z, sp.yaw ?? 0);
  zombis.reiniciar();
  arma.reiniciar();
  blanco.reiniciar();
  input.reset();

  // La camara arranca ya puesta en la diagonal de la calle, sin que se vea
  // girar sola en los primeros segundos de partida.
  camera.reset(sp.yaw ?? 0);
  camera.setStreetHeading(mission.streetHeading(sp));
  camera.snapToStreet();

  hud.setHealth(player.health);
  hud.setObjective(mission.objectiveText);

  state.set(State.LOADING);
  state.set(State.PLAYING);
  input.setEnabled(true);
}

/*
 * Llegar a un control.
 *
 * Por ahora SOLO guarda el progreso. Hasta la Fase 16 dejaba tres cajas en
 * el piso —dos de municion y un botiquin— y eso se fue con los objetos.
 *
 * Lo que va a ir aca es la esclusa de D-37: la puerta que no abre hasta que
 * no quede un zombi vivo en el tramo, y las tres cartas de mejora de D-32.
 * Mientras tanto el control es mas pobre que antes, y esta bien que lo sea:
 * es una etapa, no el resultado. Lo construye la Fase 19A.
 */
bus.on(EV.CHECKPOINT_REACHED, ({ index }) => {
  stats.controles = index;
  // Hasta donde se llego alguna vez, no donde termino este intento (D-14).
  progreso.registrarControl(index);
});

bus.on(EV.PLAYER_DAMAGED, ({ amount }) => {
  gus.gesto(Pose.GOLPEADO);
  stats.golpesRecibidos++;
  stats.dañoRecibido += amount;
});

/**
 * Arma las filas del marcador de fin de partida.
 *
 * El tiempo va primero y marcado como principal: es el dato que compara
 * un intento con otro. El resto cuenta COMO se jugo, que es lo que invita
 * a probar distinto la proxima.
 */
function filasDelMarcador(resumen) {
  const filas = [
    { etiqueta: 'TIEMPO', valor: formatearTiempo(resumen.tiempo), principal: true },
    { etiqueta: 'ZOMBIS ELIMINADOS', valor: String(resumen.zombis) },
    { etiqueta: 'VIDA RESTANTE', valor: `${resumen.vida}` },
    { etiqueta: 'GOLPES RECIBIDOS', valor: String(resumen.golpes) }
  ];

  // Las muertes solo se muestran si hubo: un "0 muertes" ocupa una linea
  // para no decir nada, y en una pantalla de telefono las lineas valen.
  if (resumen.muertes > 0) {
    filas.push({ etiqueta: 'MUERTES', valor: String(resumen.muertes) });
  }

  if (progreso.mejorTiempo !== null) {
    filas.push({ etiqueta: 'MEJOR TIEMPO', valor: formatearTiempo(progreso.mejorTiempo) });
  }
  return filas;
}

bus.on(EV.MISSION_COMPLETE, () => {
  const resumen = stats.resumen(player.health);

  /*
   * El orden importa: primero se arma la tabla con el record VIEJO, y
   * recien despues se guarda el nuevo.
   *
   * Al reves, el "mejor tiempo" que se muestra seria el de esta misma
   * partida y la fila no diria nada: siempre coincidiria con el tiempo de
   * arriba.
   */
  const filas = filasDelMarcador(resumen);
  const esRecord = progreso.registrarVictoria(resumen.tiempo);

  hud.setMarcador('win', filas);
  hud.setRecord(esRecord);
});

bus.on(EV.PLAYER_DIED, () => {
  input.setEnabled(false);

  /*
   * La pantalla de derrota dice DOS cosas, y las dos importan: desde donde
   * se vuelve, y cuanto se habia avanzado. Un "perdiste" sin contexto se
   * lee como un castigo; con el marcador, el intento fallido igual dejo
   * algo medido, y eso es lo que invita a reintentar.
   */
  hud.setGameOverReason(
    mission.nextCheckpoint > 0
      ? `Volvés al control ${mission.nextCheckpoint}. El reloj sigue corriendo.`
      : 'Volvés al punto de partida.'
  );

  // La muerte de este intento todavia no esta contada: se suma al reaparecer.
  const resumen = stats.resumen(0);
  hud.setMarcador('lose', [
    { etiqueta: 'TIEMPO', valor: formatearTiempo(resumen.tiempo), principal: true },
    { etiqueta: 'CONTROLES', valor: `${stats.controles} de ${mission001.checkpoints.length}` },
    { etiqueta: 'ZOMBIS ELIMINADOS', valor: String(resumen.zombis) },
    { etiqueta: 'DISTANCIA AL OBJETIVO', valor: `${Math.round(distanciaAlObjetivo())} m` }
  ]);

  state.set(State.GAME_OVER);
});

bus.on(EV.MISSION_COMPLETE, () => {
  input.setEnabled(false);
  state.set(State.MISSION_COMPLETE);
});

/** Cuanto falta hasta el proximo objetivo, en metros. */
function distanciaAlObjetivo() {
  const destino = mission.objetivoActual();
  if (!destino) return 0;
  const p = player.position;
  return Math.hypot(destino.x - p.x, destino.z - p.z);
}

/**
 * Actualiza la flecha que apunta al proximo objetivo.
 *
 * El angulo es RELATIVO a la camara, no absoluto: al jugador le sirve
 * saber que el objetivo queda a su izquierda, no que queda al noroeste.
 * Se calcula el rumbo hacia el destino y se le resta el de la camara; lo
 * que queda es cuanto girar la flecha en pantalla.
 *
 * Con la calle poblada de autos, arboles y barricadas, el marcador del
 * piso deja de verse desde lejos. Esta flecha es lo que reemplaza eso.
 */
function actualizarBrujula() {
  const destino = mission.objetivoActual();
  if (!destino) {
    hud.mostrarBrujula(false);
    return;
  }

  const p = player.position;
  const dx = destino.x - p.x;
  const dz = destino.z - p.z;
  const distancia = Math.hypot(dx, dz);

  const rumboDestino = rumboHacia(dx, dz);
  // El glifo de la flecha apunta a la derecha, de ahi el -90.
  const relativo = rumboDestino - camera.yaw - 90;

  hud.mostrarBrujula(true);
  hud.setBrujula(relativo, distancia);
}

function pause() {
  if (state.current !== State.PLAYING) return;
  state.set(State.PAUSED);
  input.setEnabled(false);
}

function resume() {
  if (state.current !== State.PAUSED) return;
  state.set(State.PLAYING);
  input.setEnabled(true);
}

// --- Conexion de la interfaz ----------------------------------------------

const byId = (id) => document.getElementById(id);

byId('btn-start').addEventListener('click', () => {
  // El toque de "empezar" es el unico momento en que el navegador permite
  // pedir pantalla completa y habilitar el audio. En iOS la pantalla
  // completa no existe para elementos y falla en silencio, a proposito.
  device.requestFullscreen();
  startMission();
});
byId('btn-pause').addEventListener('click', pause);
byId('btn-resume').addEventListener('click', resume);
byId('btn-restart-pause').addEventListener('click', () => startMission());
byId('btn-restart-win').addEventListener('click', () => startMission());
// Al morir se reanuda desde el ultimo control, no desde cero.
byId('btn-restart-lose').addEventListener('click', () => startMission({ fromCheckpoint: true }));

/*
 * El de atacar no es un boton comun: ver `bindAimButton`. Un toque dispara
 * hacia adelante; mantenerlo y arrastrar lo convierte en joystick de
 * apuntado.
 */
input.bindAimButton(byId('btn-attack'), 'attack');

/*
 * Ajustes del menu de pausa.
 *
 * Los dos se guardan y los dos se aplican EN VIVO. El de calidad sobre
 * todo: si hubiera que recargar para verlo, nadie compararia nunca los dos
 * perfiles y el ajuste seria decorativo.
 */
function refreshAjustesUi() {
  byId('input-mode-label').textContent = device.isTouch ? 'TACTIL' : 'TECLADO';
  byId('calidad-label').textContent =
    ajustes.get('calidad') === Calidad.ALTA ? 'ALTA' : 'NORMAL';
  byId('device-info').textContent = `${device.describe()} · ${calidadElegida()}`;
}

byId('btn-toggle-input').addEventListener('click', () => {
  device.toggleForcedMode();
  refreshAjustesUi();
});

byId('btn-toggle-calidad').addEventListener('click', () => {
  const nueva = ajustes.alternar('calidad');
  aplicarCalidad(postProceso, nueva, sol);
  // El tope de densidad de pixeles tambien depende del perfil.
  app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio, topeDpr());
  refreshAjustesUi();
});

device.onChange(refreshAjustesUi);
refreshAjustesUi();

addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (state.current === State.PLAYING) pause();
  else if (state.current === State.PAUSED) resume();
});

// Pausa automatica al cambiar de pestaña o al atender una llamada: evita
// volver y encontrarse muerto sin haber tocado nada.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// --- Bucle -----------------------------------------------------------------

app.on('update', (rawDt) => {
  // Techo de dt: tras un alt-tab o un garbage collect largo, un dt enorme
  // teletransportaria al jugador a traves de las paredes.
  const dt = Math.min(rawDt, PERF.maxDeltaTime);

  input.sample();

  if (state.isSimulating) {
    /*
     * El reloj avanza aca y no en el bucle de afuera: en pausa y en las
     * pantallas de resultado la simulacion esta congelada, y un cronometro
     * que corre durante la pausa convertiria el mejor tiempo en una medida
     * de cuanto tardaste en leer la pantalla.
     */
    stats.update(dt);

    /*
     * El rumbo apuntado se calcula ANTES de mover al jugador, para que el
     * personaje ya mire hacia alla en el mismo cuadro en que se dispara.
     * Si se hiciera despues, el primer tiro de cada rafaga saldria hacia
     * donde el personaje estaba mirando antes.
     */
    const rumboApuntado = input.apuntando
      ? (() => {
          const d = direccionDeEntrada(input.aim.x, input.aim.y, camera.yaw);
          return rumboHacia(d.x, d.z);
        })()
      : null;

    /*
     * EL RUMBO DEL BLANCO MANDA SOBRE EL MOVIMIENTO (17.5)
     * ------------------------------------------------------------------
     * Quieto y con blanco, Gus encara al zombi. El rumbo sale de
     * `blanco.rumbo`, que la revalidacion refresca en cada cuadro: el
     * zombi camina, y encarar a donde estaba hace dos segundos es no
     * encarar.
     *
     * **Se usa el blanco del cuadro ANTERIOR, y es a proposito.** Hay un
     * circulo: `quieto` lo calcula `player.update`, el blanco necesita
     * `quieto`, y el giro necesita el blanco. Alguien tiene que ir un
     * cuadro atrasado.
     *
     * Que sea el giro es la opcion barata: son 16 ms sobre un giro que de
     * por si es gradual —`turnSpeed` tarda un cuarto de segundo en media
     * vuelta— asi que el atraso es invisible. Al reves, un `quieto`
     * atrasado un cuadro haria que el combate arranque tarde, y eso se
     * suma a los 0,15 s del retardo, que ya es lo mas caro del sistema.
     *
     * El pulgar sigue teniendo prioridad mientras exista el boton: si el
     * jugador esta apuntando a mano, manda el.
     */
    const giroPorBlanco = rumboApuntado === null && blanco.actual !== null;
    const rumboDeMira = giroPorBlanco ? blanco.rumbo : rumboApuntado;

    player.update(dt, input.move, camera.yaw, rumboDeMira, !giroPorBlanco);
    mission.update(dt, player.position);
    // La calle manda: la camara se realinea al tramo que el jugador pisa.
    camera.setStreetHeading(mission.streetHeading(player.position));
    actualizarBrujula();

    // --- Ataque del jugador ------------------------------------------------
    const pos2d = { x: player.position.x, z: player.position.z };

    /*
     * A quien le dispara al estar quieto (17.3 y 17.4).
     *
     * Va DESPUES de `player.update`, que es quien calcula `quieto`, y antes
     * de disparar: la eleccion tiene que ser del mismo cuadro que la
     * posicion con la que se eligio.
     */
    blanco.update(player.quieto, pos2d, zombis.enJuego);

    /*
     * DISPARAR SOLO (D-28, 17.5)
     * ------------------------------------------------------------------
     * Tres condiciones, y las tres tienen que valer: quieto, con blanco, y
     * **ya encarado**.
     *
     * La tercera cierra una decision que estaba abierta desde el 7/11:
     * *¿dispara mientras gira, o espera?*. **Espera.** Con cuatro tiros por
     * zombi (D-31), un primer tiro que sale hacia donde Gus miraba antes es
     * un cuarto del daño tirado en cada cambio de objetivo.
     *
     * El boton sigue andando y tiene prioridad mientras exista: se va en
     * cuanto esto se pruebe en el telefono. No se borra en la misma tarea
     * que lo reemplaza, para poder comparar las dos cosas jugando.
     */
    const dispararSolo = blanco.encarado(player.yaw, PLAYER.toleranciaEncarado);
    if (
      input.wasPressed('attack') ||
      (input.buttons.attack && input.apuntando) ||
      dispararSolo
    ) {
      arma.atacar();
    }

    /*
     * El tiro sale hacia el BLANCO, no hacia donde mira el cuerpo.
     *
     * Son casi lo mismo —por eso se espera a estar encarado— pero casi no
     * alcanza: la tolerancia son tres grados, y a veintiocho metros tres
     * grados son metro y medio, mas que un cuerpo de zombi. El tiro
     * apuntado no falla (D-36), asi que tiene que salir exacto.
     */
    const rumboDeTiro = blanco.actual ? blanco.rumbo : player.yaw;
    arma.update(dt, pos2d, rumboDeTiro, zombis.enJuego);

    /*
     * La mira muestra el alcance REAL del arma, no un largo decorativo:
     * veintiocho metros. Antes servia para que se entendiera la diferencia
     * entre las dos armas sin leer nada; ahora lo que dice es hasta donde
     * llega el tiro, que sigue siendo informacion que no esta en ningun
     * otro lado.
     */
    if (rumboApuntado !== null) {
      efectos.mostrarMira(pos2d, rumboApuntado, arma.arma.range);
    } else {
      efectos.ocultarMira();
    }

    efectos.update(dt);

    /*
     * Gus se anima a partir de lo que YA paso en este cuadro: su velocidad
     * real y si esta vivo. No hay
     * una maquina de estados aparte que haya que mantener sincronizada con
     * la del juego; la animacion es una lectura del estado, no una copia.
     */
    gus.update(dt, {
      velocidad: player.velocidadActual,
      vivo: player.health > 0
    });

    const p = player.position;
    zombis.update(dt, { x: p.x, z: p.z }, player.health > 0, (daño, zombi) => {
      const golpeo = player.applyDamage(daño, 'zombi');
      if (golpeo) {
        // El sacudon escala con el daño: una mordida de doce no puede
        // sentirse igual que un golpe de cuarenta.
        camera.sacudir(0.18 + (daño / 100) * 0.5, 0.32);
      }
    });
  }

  // La camara se actualiza siempre: en pausa y en los resultados la escena
  // sigue viva, solo que la simulacion esta congelada.
  camera.update(dt, player.position, input.look, input.hasTouch);

  /*
   * La cupula del cielo viaja con la camara. Si se quedara quieta, al
   * caminar se llegaria al borde y se veria el filo de la esfera.
   */
  if (cupula) cupula.setPosition(cameraEntity.getPosition());

  hud.updateJoystick(input.getJoystickVisual());

  debug.set('estado', state.current);
  debug.set('pos', `${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`);
  debug.set('vida', player.health.toFixed(0));
  debug.set('control', `${mission.nextCheckpoint}/${mission001.checkpoints.length}`);
  debug.set('zombis', `${zombis.stats.vivos} vivos / ${zombis.stats.pensando} pensando / ${zombis.stats.total} puestos`);
  debug.set('arma', arma.estado);
  /*
   * Quieto va al diagnostico porque es la entrada del combate automatico y
   * **no se puede ver de otra manera**: no mueve nada en pantalla todavia.
   * Se mira en el telefono, soltando el joystick, que es donde el pulgar
   * tiembla de verdad.
   */
  debug.set(
    'quieto',
    player.quieto ? 'SI' : `no (${player.tiempoSinEntrada.toFixed(2)} s)`
  );
  /*
   * El blanco, en el diagnostico, porque la marca en pantalla recien llega
   * en la 17.8 y hasta entonces no hay otra forma de ver a quien eligio.
   */
  debug.set(
    'blanco',
    blanco.actual
      ? `${blanco.distancia.toFixed(1)} m, rumbo ${blanco.rumbo.toFixed(0)}`
      : '—'
  );
  debug.set('cam', `yaw ${camera.yaw.toFixed(0)} pitch ${camera.pitch.toFixed(0)}`);

  /*
   * Las dos medidas que deciden si la camara sirve (D-23). Van en el
   * diagnostico y no en un comentario porque se miran EN EL TELEFONO, que es
   * donde la pantalla es angosta y donde la decision se toma.
   */
  const enc = medirEncuadre(
    { ...CAMERA, pitchDegrees: camera.pitch, distance: camera.distance },
    app.graphicsDevice.width,
    app.graphicsDevice.height,
    UNITS.playerHeight
  );
  debug.set(
    'encuadre',
    `Gus ${enc.pixelesGus.toFixed(0)} px   calle adelante ` +
      `${enc.metrosAdelante === Infinity ? 'horizonte' : `${enc.metrosAdelante.toFixed(0)} m`}`
  );

  debug.set('equipo', device.describe());

  // Conos de vision y estado de cada zombi. Solo con el diagnostico
  // encendido: dibujarlo siempre costaria lineas por zombi por cuadro.
  if (debug.visible) {
    const pj = player.position;
    dibujarDiagnosticoZombis(app, zombis, { x: pj.x, z: pj.z });
    // Hasta donde llego cada ruido. El radio es la regla principal de la
    // Fase 6 y es invisible: sin verlo, ajustarlo seria adivinar.
    efectos.dibujarRuidos(app, COLOR_RUIDO);
  }
  debug.update(rawDt);

  input.endFrame();
});

app.start();
state.set(State.MENU);
hud.setHealth(100);
hud.setObjective(mission.objectiveText);

// Util para depurar desde la consola del navegador: game.player.teleport(...)
// Util para depurar desde la consola: game.postProceso.bloom.intensity = 0.2
globalThis.game = {
  app, bus, state, player, camera, mission, collision, builder, input, debug, device,
  postProceso, calidad, zombis, arma, blanco, efectos, gus,
  stats, progreso,
  // El motor, para que una prueba pueda hacer cuentas con Vec3 y Mat4 sin
  // tener que importar playcanvas por su cuenta dentro del navegador.
  pc,
  /*
   * El convenio de rumbos.
   *
   * Esta expuesto porque las pruebas del navegador escribian angulos a
   * mano, y una de ellas tenia `player.yaw = 180` con el comentario "o sea
   * mirando hacia -Z", que era falso. Pasaba igual, porque el arma usaba
   * el convenio invertido y los dos errores se cancelaban. Una prueba que
   * afirma un angulo tiene que pedirselo al juego, no adivinarlo.
   */
  rumbo: { rumboHacia, rumboEntre, dirDeRumbo, direccionDeEntrada },
  // Los numeros de balance, para poder verificarlos desde una prueba.
  balance: { PLAYER, CAMERA, UNITS, PERF, ZOMBIE_STANDARD }
};
