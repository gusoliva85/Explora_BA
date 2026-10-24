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

app.scene.ambientLight = new pc.Color(0.18, 0.19, 0.24);
app.scene.exposure = 1.0;

// Niebla lineal: ademas del clima opresivo, esconde el borde del mapa y deja
// recortar el clip lejano, que es el ahorro de relleno mas barato en movil.
// En el motor 2.x la niebla se configura por FogParams, no por scene.fog*.
app.scene.fog.type = pc.FOG_LINEAR;
app.scene.fog.color = new pc.Color(0.07, 0.08, 0.1);
app.scene.fog.start = 45;
app.scene.fog.end = 130;

const cameraEntity = new pc.Entity('Camara');
cameraEntity.addComponent('camera', {
  clearColor: new pc.Color(0.07, 0.08, 0.1),
  fov: CAMERA.fov,
  nearClip: 0.2,
  // El clip lejano acompaña a la niebla: nada se dibuja mas alla de lo que se ve.
  farClip: 160
});
app.root.addChild(cameraEntity);

// Una sola luz direccional con sombras. Mas luces con sombra es lo primero
// que hunde el framerate en movil.
const sun = new pc.Entity('Sol');
sun.addComponent('light', {
  type: 'directional',
  color: new pc.Color(0.75, 0.78, 0.9),
  intensity: 0.85,
  castShadows: true,
  shadowDistance: 45,
  shadowResolution: 1024,
  shadowBias: 0.2,
  normalOffsetBias: 0.05
});
sun.setEulerAngles(55, -35, 0);
app.root.addChild(sun);

// Suelo de respaldo, por si el jugador se sale del trazado de calles.
const ground = new pc.Entity('SueloBase');
const groundMat = new pc.StandardMaterial();
groundMat.diffuse = new pc.Color(0.1, 0.1, 0.11);
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
const bodyMat = new pc.StandardMaterial();
bodyMat.diffuse = new pc.Color(0.16, 0.17, 0.2); // campera negra de la referencia
bodyMat.update();
const body = new pc.Entity('Cuerpo');
body.addComponent('render', { type: 'capsule', material: bodyMat, castShadows: true });
body.setLocalScale(UNITS.playerRadius * 2, UNITS.playerHeight / 2, UNITS.playerRadius * 2);
body.setLocalPosition(0, UNITS.playerHeight / 2, 0);
playerEntity.addChild(body);

const noseMat = new pc.StandardMaterial();
noseMat.diffuse = new pc.Color(0.85, 0.7, 0.3);
noseMat.update();
const nose = new pc.Entity('Frente');
nose.addComponent('render', { type: 'box', material: noseMat, castShadows: false });
nose.setLocalScale(0.18, 0.18, 0.45);
nose.setLocalPosition(0, 1.5, -0.42);
playerEntity.addChild(nose);
app.root.addChild(playerEntity);

const player = new PlayerController(playerEntity, collision, bus);
const camera = new CameraController(cameraEntity, collision);

// --- Mundo y mision --------------------------------------------------------

const builder = new WorldBuilder(app, collision);
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
  camera.reset(sp.yaw ?? 0);
  input.reset();

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
globalThis.game = { app, bus, state, player, camera, mission, collision, builder, input, debug, device };
