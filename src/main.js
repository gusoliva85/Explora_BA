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
import { SpawnManager } from './enemies/spawnManager.js';
import { WeaponController } from './combat/weaponController.js';
import { CombatFx } from './combat/combatFx.js';
import { dibujarDiagnosticoZombis } from './enemies/zombieDebug.js';
import { montarLuzAmbiente, crearMaterialesLuz, COLOR_HORIZONTE } from './world/lighting.js';
import { calidadElegida, Calidad } from './render/postProcess.js';

/** El perfil de calidad decide tambien la resolucion de las sombras. */
const calidadAlta = () => calidadElegida() === Calidad.ALTA;
import { PERF, UNITS, CAMERA, PLAYER, ZOMBIE_STANDARD } from './config/balance.js';

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
 * Iluminacion de dia: sol con sombras y mucha luz de cielo de relleno.
 * Ver src/world/lighting.js para el porque de cada numero.
 */
const matsLuz = crearMaterialesLuz();
montarLuzAmbiente(app, calidadAlta());

/*
 * Bruma de distancia, muy suave y del color del horizonte.
 *
 * De dia la niebla no oscurece: aclara. Lo lejano se va destiñendo hacia
 * el celeste del cielo, que es lo que separa un plano del siguiente y da
 * profundidad sin tener que oscurecer nada. La densidad es baja a
 * proposito: lo justo para que el fondo de la cuadra se despegue, no para
 * tapar.
 */
app.scene.fog.type = pc.FOG_EXP2;
app.scene.fog.color = COLOR_HORIZONTE;
app.scene.fog.density = 0.0055;

const cameraEntity = new pc.Entity('Camara');
cameraEntity.addComponent('camera', {
  clearColor: COLOR_HORIZONTE,
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
 * Gus provisional: una capsula con un bloque al frente que marca hacia donde
 * mira. Se reemplaza por el modelo en la Fase 11; el controlador no cambia.
 */
const playerEntity = new pc.Entity('Gus');
/*
 * La campera de cuero de la referencia es negra, pero un negro puro sobre
 * asfalto gris desaparece. Se usa un gris muy oscuro y azulado: a la
 * distancia de camara lee como negro, y al mismo tiempo se recorta contra
 * la calzada. Mate, para no verse de plastico.
 */
const bodyMat = new pc.StandardMaterial();
bodyMat.diffuse = new pc.Color(0.1, 0.105, 0.125);
bodyMat.metalness = 0;
bodyMat.gloss = 0.22;
bodyMat.useMetalness = true;
bodyMat.update();
const body = new pc.Entity('Cuerpo');
body.addComponent('render', { type: 'capsule', material: bodyMat, castShadows: true });
body.setLocalScale(UNITS.playerRadius * 2, UNITS.playerHeight / 2, UNITS.playerRadius * 2);
body.setLocalPosition(0, UNITS.playerHeight / 2, 0);
playerEntity.addChild(body);

const noseMat = new pc.StandardMaterial();
noseMat.diffuse = new pc.Color(0.95, 0.72, 0.18);
noseMat.gloss = 0.2;
noseMat.metalness = 0;
noseMat.useMetalness = true;
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
 * De noche alcanzaba con un resplandor aditivo. De dia eso no se ve: sobre
 * una calzada clara, sumar luz no cambia casi nada. Hace falta un disco
 * de color solido y semitransparente, como el selector de un juego de
 * estrategia. Plano, sin iluminar, para que mantenga el mismo color este
 * al sol o en sombra.
 */
const ringMat = new pc.StandardMaterial();
ringMat.diffuse = new pc.Color(0, 0, 0);
ringMat.emissive = new pc.Color(1.0, 0.7, 0.12);
ringMat.emissiveIntensity = 1;
ringMat.useLighting = false;
ringMat.blendType = pc.BLEND_NORMAL;
ringMat.depthWrite = false;
ringMat.opacity = 0.55;
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
 * El arma. Resuelve el arco y el daño; los efectos y el ruido se enganchan
 * por callbacks, para que el controlador no tenga que conocer ni la escena
 * ni el gestor de zombis.
 */
const arma = new WeaponController({
  armaInicial: 'knife',

  alIniciarAtaque: ({ x, z, rumbo, conectaria }) => {
    /*
     * El arco se muestra al APRETAR, no al conectar. Es lo que hace que el
     * golpe se sienta inmediato aunque el daño salga unas centesimas
     * despues: el jugador ve que su orden se registro.
     */
    efectos.mostrarArco({ x, y: 0, z }, rumbo, conectaria);
  },

  alGolpear: ({ objetivo, daño, dirX, dirZ }) => {
    objetivo.recibirDaño(daño, { dirX, dirZ, fuente: 'jugador' });
    const q = objetivo.posicion;
    efectos.mostrarImpacto(q.x, q.z);
    // Sacudon corto: marca el impacto sin estorbar la lectura.
    camera.sacudir(0.12, 0.14);
  },

  alFallar: () => {
    // Nada de sacudon: fallar tiene que sentirse distinto a acertar.
  },

  alHacerRuido: ({ x, z, radio }) => {
    zombis.propagarRuido(x, z, radio);
  }
});

console.info(
  `[mundo] ${built.stats.boxes} cajas, ${built.stats.colliders} colisionadores, ` +
    `${built.markers.length} marcadores`
);

// --- Reglas de partida -----------------------------------------------------

function startMission({ fromCheckpoint = false } = {}) {
  if (!fromCheckpoint) mission.reset();
  const sp = fromCheckpoint ? mission.respawn : mission001.spawn;

  player.reset(sp.x, sp.z, sp.yaw ?? 0);
  zombis.reiniciar();
  arma.equipar('knife');
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

  // Mismo convenio que la camara: rumbo cero es mirar hacia -Z.
  const rumboDestino = Math.atan2(-dx, -dz) * pc.math.RAD_TO_DEG;
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
    actualizarBrujula();

    // --- Ataque del jugador ------------------------------------------------
    const pos2d = { x: player.position.x, z: player.position.z };
    if (input.wasPressed('attack')) {
      arma.atacar(pos2d, player.yaw, zombis.enJuego);
    }
    arma.update(dt, pos2d, player.yaw, zombis.enJuego);
    efectos.update(dt);

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
  hud.updateJoystick(input.getJoystickVisual());

  debug.set('estado', state.current);
  debug.set('pos', `${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`);
  debug.set('vida', player.health.toFixed(0));
  debug.set('control', `${mission.nextCheckpoint}/${mission001.checkpoints.length}`);
  debug.set('zombis', `${zombis.stats.vivos} vivos / ${zombis.stats.pensando} pensando / ${zombis.stats.total} puestos`);
  debug.set('arma', `${arma.equipada} ${arma.estado}`);
  debug.set('cam', `yaw ${camera.yaw.toFixed(0)} pitch ${camera.pitch.toFixed(0)}`);
  debug.set('equipo', device.describe());

  // Conos de vision y estado de cada zombi. Solo con el diagnostico
  // encendido: dibujarlo siempre costaria lineas por zombi por cuadro.
  if (debug.visible) {
    const pj = player.position;
    dibujarDiagnosticoZombis(app, zombis, { x: pj.x, z: pj.z });
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
  postProceso, calidad, zombis, arma, efectos,
  // Los numeros de balance, para poder verificarlos desde una prueba.
  balance: { PLAYER, CAMERA, UNITS, PERF, ZOMBIE_STANDARD }
};
