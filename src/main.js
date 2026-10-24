import * as pc from 'playcanvas';

import { EventBus, EV } from './core/events.js';
import { GameStateMachine, State } from './core/gameState.js';
import { device } from './core/device.js';
import { DebugOverlay } from './core/debugOverlay.js';
import { CollisionWorld } from './physics/collisionWorld.js';
import { InputManager } from './input/inputManager.js';
import { PlayerController } from './player/playerController.js';
import { CameraController } from './player/cameraController.js';
import { WorldBuilder } from './world/worldBuilder.js';
import { MissionManager } from './missions/missionManager.js';
import { Hud } from './ui/hud.js';
import { mission001 } from './config/mission001.js';
import { montarPostProceso } from './render/postProcess.js';
import { montarLuzAmbiente, crearMaterialesLuz } from './world/lighting.js';
import { PERF, UNITS, CAMERA } from './config/balance.js';

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
// En celular se recorta mas: un telefono a 3x renderiza 9 veces mas pixeles
// que a 1x, y es el ajuste que mas FPS devuelve por menos perdida visual.
const dprCap = device.isTouch ? Math.min(PERF.maxDevicePixelRatio, 1.75) : PERF.maxDevicePixelRatio;
app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio, dprCap);
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
 * Iluminacion nocturna. La luz ambiente es practicamente nula a proposito:
 * lo que ilumina la calle son los faroles de sodio, y de eso depende que
 * haya charcos de luz y tramos oscuros en vez de una papilla gris pareja.
 */
const matsLuz = crearMaterialesLuz();
montarLuzAmbiente(app);

/*
 * Niebla exponencial, no lineal.
 *
 * La lineal se come la escena de golpe a partir de cierta distancia y
 * produce una banda visible donde arranca. La exponencial al cuadrado se
 * acumula suave desde el primer metro, que es como se comporta el aire
 * humedo de verdad, y ademas deja ver las luces lejanas a traves de ella.
 */
app.scene.fog.type = pc.FOG_EXP2;
app.scene.fog.color = new pc.Color(0.035, 0.045, 0.065);
app.scene.fog.density = 0.0115;

const cameraEntity = new pc.Entity('Camara');
cameraEntity.addComponent('camera', {
  clearColor: new pc.Color(0.025, 0.033, 0.05),
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
const { frame: postProceso, calidad } = montarPostProceso(app, cameraEntity);
console.info(`[render] perfil de calidad: ${calidad}`);

// Suelo de respaldo, por si el jugador se sale del trazado de calles.
const ground = new pc.Entity('SueloBase');
const groundMat = new pc.StandardMaterial();
groundMat.diffuse = new pc.Color(0.045, 0.05, 0.058);
groundMat.gloss = 0.35;
groundMat.metalness = 0;
groundMat.useMetalness = true;
groundMat.update();
ground.addComponent('render', { type: 'plane', material: groundMat, castShadows: false });
ground.setLocalScale(600, 1, 600);
ground.setPosition(-50, -0.2, -120);
app.root.addChild(ground);

// --- Jugador ---------------------------------------------------------------

/**
 * Gus provisional: una capsula con un bloque al frente que marca hacia donde
 * mira. Se reemplaza por el modelo en la Fase 11; el controlador no cambia.
 */
const playerEntity = new pc.Entity('Gus');
// Cuero: oscuro pero con brillo especular alto. Es lo que hace que la
// silueta se recorte contra el asfalto cuando pasa por un farol, en vez de
// desaparecer como una mancha negra.
const bodyMat = new pc.StandardMaterial();
bodyMat.diffuse = new pc.Color(0.055, 0.06, 0.075);
bodyMat.metalness = 0.1;
bodyMat.gloss = 0.72;
bodyMat.useMetalness = true;
bodyMat.update();
const body = new pc.Entity('Cuerpo');
body.addComponent('render', { type: 'capsule', material: bodyMat, castShadows: true });
body.setLocalScale(UNITS.playerRadius * 2, UNITS.playerHeight / 2, UNITS.playerRadius * 2);
body.setLocalPosition(0, UNITS.playerHeight / 2, 0);
playerEntity.addChild(body);

const noseMat = new pc.StandardMaterial();
noseMat.diffuse = new pc.Color(0, 0, 0);
noseMat.emissive = new pc.Color(1.0, 0.75, 0.28);
noseMat.emissiveIntensity = 6;
noseMat.useLighting = false;
noseMat.update();
const nose = new pc.Entity('Frente');
nose.addComponent('render', { type: 'box', material: noseMat, castShadows: false });
nose.setLocalScale(0.18, 0.18, 0.45);
nose.setLocalPosition(0, 1.5, -0.42);
playerEntity.addChild(nose);

/**
 * Anillo ambar en el piso.
 *
 * No es decoracion. Gus va vestido de negro sobre asfalto nocturno y, a la
 * distancia de camara elegida, mide unos 40 px: sin una marca permanente el
 * jugador pierde de vista su propio personaje entre los zombis y los autos.
 * Salio de mirar los mockups, y vale para cualquier angulo.
 */
/*
 * Marca de posicion en el piso.
 *
 * Gus va de negro sobre asfalto nocturno: sin una marca permanente el
 * jugador pierde de vista su propio personaje. Ahora que hay bloom, en vez
 * de un disco opaco alcanza con un emisivo suave: el pipeline lo convierte
 * solo en un resplandor con halo.
 */
const ringMat = new pc.StandardMaterial();
ringMat.diffuse = new pc.Color(0, 0, 0);
ringMat.emissive = new pc.Color(1.0, 0.72, 0.28);
ringMat.emissiveIntensity = 1.6;
ringMat.useLighting = false;
ringMat.blendType = pc.BLEND_ADDITIVE;
ringMat.depthWrite = false;
ringMat.opacity = 0.5;
ringMat.update();
const ring = new pc.Entity('MarcaJugador');
ring.addComponent('render', { type: 'cylinder', material: ringMat, castShadows: false });
ring.setLocalScale(1.25, 0.01, 1.25);
ring.setLocalPosition(0, 0.025, 0);
playerEntity.addChild(ring);

app.root.addChild(playerEntity);

const player = new PlayerController(playerEntity, collision, bus);
const camera = new CameraController(cameraEntity, collision);

// --- Mundo y mision --------------------------------------------------------

const builder = new WorldBuilder(app, collision, matsLuz);
const built = builder.build(mission001);
const mission = new MissionManager(mission001, bus);

console.info(
  `[mundo] ${built.stats.boxes} cajas, ${built.stats.colliders} colisionadores, ` +
    `${built.markers.length} marcadores`
);

// --- Reglas de partida -----------------------------------------------------

function startMission({ fromCheckpoint = false } = {}) {
  if (!fromCheckpoint) mission.reset();
  const sp = fromCheckpoint ? mission.respawn : mission001.spawn;

  player.reset(sp.x, sp.z, sp.yaw ?? 0);
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

bus.on(EV.PLAYER_DIED, () => {
  input.setEnabled(false);
  hud.setGameOverReason(
    mission.nextCheckpoint > 0
      ? `Volvés al control ${mission.nextCheckpoint}.`
      : 'Volvés al punto de partida.'
  );
  state.set(State.GAME_OVER);
});

bus.on(EV.MISSION_COMPLETE, () => {
  input.setEnabled(false);
  state.set(State.MISSION_COMPLETE);
});

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

input.bindHudButton(byId('btn-run'), 'run');
input.bindHudButton(byId('btn-attack'), 'attack');
input.bindHudButton(byId('btn-interact'), 'interact');

// Conmutador de modo de entrada: deja revisar el HUD de celular desde la PC.
function refreshDeviceUi() {
  byId('input-mode-label').textContent = device.isTouch ? 'TACTIL' : 'TECLADO';
  byId('device-info').textContent = device.describe();
}
byId('btn-toggle-input').addEventListener('click', () => {
  device.toggleForcedMode();
  refreshDeviceUi();
});
device.onChange(refreshDeviceUi);
refreshDeviceUi();

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
    player.update(dt, input.move, input.buttons.run, camera.yaw);
    mission.update(dt, player.position);
    // La calle manda: la camara se realinea al tramo que el jugador pisa.
    camera.setStreetHeading(mission.streetHeading(player.position));
  }

  // La camara se actualiza siempre: en pausa y en los resultados la escena
  // sigue viva, solo que la simulacion esta congelada.
  camera.update(dt, player.position, input.look, input.hasTouch);
  hud.updateJoystick(input.getJoystickVisual());

  debug.set('estado', state.current);
  debug.set('pos', `${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`);
  debug.set('vida', player.health.toFixed(0));
  debug.set('control', `${mission.nextCheckpoint}/${mission001.checkpoints.length}`);
  debug.set('cam', `yaw ${camera.yaw.toFixed(0)} pitch ${camera.pitch.toFixed(0)}`);
  debug.set('equipo', device.describe());
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
  postProceso, calidad
};
