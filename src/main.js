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
import { CombatFx } from './combat/combatFx.js';
import { Gus, Pose } from './characters/gus.js';
import { ArmasEnMano } from './characters/armas.js';
import { dibujarDiagnosticoZombis } from './enemies/zombieDebug.js';
import { montarEscena } from './visual/escena.js';
import { precargar as precargarModelos } from './visual/modelos.js';
import { HORIZONTE } from './visual/paleta.js';
import { calidadElegida, aplicarCalidad, Calidad } from './render/postProcess.js';
import { ajustes } from './core/settings.js';
import { createRng } from './core/rng.js';
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
  ZOMBIE_STANDARD,
  WORLD_SEED
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
 * Las armas cuelgan del anclaje de la mano derecha de Gus, asi que se
 * mueven solas con la animacion: el arma no sabe nada del personaje y el
 * personaje no sabe nada del arma.
 */
const armasEnMano = new ArmasEnMano(gus.anclaArma, builder.mats);

/*
 * El azar del combate: su propio generador, con su propia semilla.
 *
 * No comparte el del mundo, y eso es a proposito. Si fuera el mismo, la
 * cantidad de tiros que diste cambiaria la dispersion del proximo, pero
 * tambien cualquier otra cosa que consuma azar en el futuro —el graznido de
 * un pajaro, la variacion de una textura— correria la secuencia del
 * combate. Dos generadores separados se pueden razonar por separado.
 *
 * La semilla sale de la del mundo para que la partida siga siendo
 * reproducible entera con un solo numero (D-12).
 */
const azarCombate = createRng(WORLD_SEED ^ 0x9e3779b9);

/** Lo que dura un intento, y lo que sobrevive a cerrar la pestaña (D-14). */
const stats = new Estadisticas();
const progreso = new Progreso();

/** Color del anillo de ruido en el diagnostico: el mismo ambar del HUD. */
const COLOR_RUIDO = new pc.Color(1, 0.72, 0.15);

/*
 * El arma. Resuelve el arco y el daño; los efectos y el ruido se enganchan
 * por callbacks, para que el controlador no tenga que conocer ni la escena
 * ni el gestor de zombis.
 */
const arma = new WeaponController({
  armaInicial: 'knife',

  /*
   * El escenario y el azar entran por aca.
   *
   * El arma no conoce ni PlayCanvas ni el mundo: recibe una funcion para
   * preguntar si hay algo en el camino y otra para el azar. Es lo que
   * permite probar la balistica entera con numeros, y lo que mantiene el
   * azar atado a la semilla de la partida (D-12).
   */
  rayo: (ax, az, bx, bz, altura) => collision.raycast(ax, az, bx, bz, altura),
  azar: azarCombate,

  /*
   * El apuntado asistido se decide EN EL MOMENTO del disparo, no al
   * arrancar. El modo de control se puede cambiar desde el menu de pausa
   * sin recargar, asi que una decision tomada una vez quedaria vieja.
   */
  asistirApuntado: () => device.isTouch,

  alIniciarAtaque: ({ x, z, rumbo, conectaria, arma: id }) => {
    /*
     * El arco se muestra al APRETAR, no al conectar. Es lo que hace que el
     * golpe se sienta inmediato aunque el daño salga unas centesimas
     * despues: el jugador ve que su orden se registro.
     *
     * Solo para el cuerpo a cuerpo. Un disparo tiene su propio efecto —el
     * fogonazo y el trazado— y dibujarle encima el abanico del cuchillo
     * diria que la pistola alcanza dos metros en noventa grados, que es
     * exactamente lo contrario de lo que hace.
     */
    gus.gesto(Pose.ATACAR);
    if (id !== 'knife') return;
    efectos.mostrarArco({ x, y: 0, z }, rumbo, conectaria);
  },

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
  },

  alCambiarArma: () => actualizarHudArma(),

});

/**
 * Pasa el estado del arma al HUD.
 *
 * Se llama al cambiar de arma, no en cada cuadro: escribir en el DOM
 * sesenta veces por segundo para algo que cambia una vez cada tanto es
 * tirar cuadros a la basura en un telefono.
 */
function actualizarHudArma() {
  // Lo que esta en la mano no puede estar tambien en el cinto.
  gus.mostrarPistolaAlCinto(arma.equipada !== 'pistol');
  armasEnMano.equipar(arma.equipada);
  hud.setArma({
    nombre: arma.arma.name,
    gastaMunicion: arma.arma.type !== 'melee'
  });
}

console.info(
  `[mundo] ${built.stats.boxes} cajas, ${built.stats.colliders} colisionadores, ` +
    `${built.markers.length} marcadores`
);

// --- Reglas de partida -----------------------------------------------------

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
  arma.reiniciar('knife');
  actualizarHudArma();
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

input.bindHudButton(byId('btn-run'), 'run');
/*
 * El de atacar no es un boton comun: ver `bindAimButton`. Un toque dispara
 * hacia adelante; mantenerlo y arrastrar lo convierte en joystick de
 * apuntado.
 */
input.bindAimButton(byId('btn-attack'), 'attack');
input.bindHudButton(byId('btn-interact'), 'interact');
input.bindHudButton(byId('btn-swap'), 'swap');

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

    player.update(dt, input.move, input.buttons.run, camera.yaw, rumboApuntado);
    mission.update(dt, player.position);
    // La calle manda: la camara se realinea al tramo que el jugador pisa.
    camera.setStreetHeading(mission.streetHeading(player.position));
    actualizarBrujula();

    // --- Ataque del jugador ------------------------------------------------
    const pos2d = { x: player.position.x, z: player.position.z };

    // Cambio de arma. Con dos armas alternar alcanza; cuando haya tres
    // habra que elegir, pero inventar un selector ahora seria de mas.
    if (input.wasPressed('swap')) {
      arma.cambiarA(arma.equipada === 'knife' ? 'pistol' : 'knife');
      actualizarHudArma();
      hud.flash(arma.arma.name.toUpperCase(), 900);
    }


    /*
     * Disparar.
     *
     * Con el pulgar quieto, un toque = un ataque hacia donde mira el
     * personaje. Con el pulgar arrastrado, el arma dispara SEGUIDO hacia
     * donde apunta, respetando su propia cadencia.
     *
     * Que apuntar implique disparar es deliberado y tiene costo: la
     * pistola hace ruido, asi que mantener apretado para "mirar" sale
     * caro. Apuntar sin tirar es para lo que estan el cuchillo y las
     * piernas.
     */
    if (input.wasPressed('attack') || (input.buttons.attack && input.apuntando)) {
      arma.atacar(pos2d, player.yaw, zombis.enJuego);
    }
    arma.update(dt, pos2d, player.yaw, zombis.enJuego);

    /*
     * La mira muestra el alcance REAL del arma equipada, no un largo
     * decorativo: con el cuchillo son dos metros y con la pistola
     * veintiocho. Es la forma mas barata de que el jugador entienda la
     * diferencia entre las dos armas sin leer nada.
     */
    if (rumboApuntado !== null) {
      efectos.mostrarMira(pos2d, rumboApuntado, arma.arma.range);
    } else {
      efectos.ocultarMira();
    }

    efectos.update(dt);

    /*
     * Gus se anima a partir de lo que YA paso en este cuadro: su velocidad
     * real, si esta corriendo, si esta vivo y si se esta curando. No hay
     * una maquina de estados aparte que haya que mantener sincronizada con
     * la del juego; la animacion es una lectura del estado, no una copia.
     */
    gus.update(dt, {
      velocidad: player.velocidadActual,
      corriendo: player.isRunning,
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
  debug.set(
    'arma',
    `${arma.equipada} ${arma.estado}`
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
  postProceso, calidad, zombis, arma, efectos, gus,
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
