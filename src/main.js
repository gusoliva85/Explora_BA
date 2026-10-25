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
import { Gus, Pose } from './characters/gus.js';
import { ArmasEnMano } from './characters/armas.js';
import { GestorProyectiles } from './combat/projectile.js';
import { BolsaDeObjetos, TipoObjeto, curaDeBotiquin } from './items/itemLogic.js';
import { VistaObjetos } from './items/itemView.js';
import { Inventario, UsoDeObjeto, MotivoCancelacion } from './items/inventario.js';
import { alcanzadosPorExplosion } from './combat/explosion.js';
import { dibujarDiagnosticoZombis } from './enemies/zombieDebug.js';
import { montarLuzAmbiente, crearMaterialesLuz, COLOR_HORIZONTE } from './world/lighting.js';
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
  WEAPONS,
  ITEMS,
  CHECKPOINT_DROP,
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
 * Iluminacion de dia: sol con sombras y mucha luz de cielo de relleno.
 * Ver src/world/lighting.js para el porque de cada numero.
 */
const matsLuz = crearMaterialesLuz();
const sol = montarLuzAmbiente(app, calidadAlta());

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
/** Temporizador que devuelve el arma normal a la mano tras un bazookazo. */
let bazookaEnMano = null;

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

/*
 * Objetos del piso.
 *
 * La bolsa es logica pura —que hay, donde, y si sirve— y la vista solo
 * dibuja lo que la bolsa dice. Mismo reparto que los zombis y que el arma.
 */
const objetos = new BolsaDeObjetos();
const vistaObjetos = new VistaObjetos(app);

/** Lo que el jugador lleva encima. */
const inventario = new Inventario(ITEMS);

/** Lo que dura un intento, y lo que sobrevive a cerrar la pestaña (D-14). */
const stats = new Estadisticas();
const progreso = new Progreso();

/*
 * El uso de un objeto: lleva tiempo y se puede interrumpir.
 *
 * El objeto se descuenta al COMPLETAR, nunca al empezar. Si se descontara
 * al apretar, un golpe a ultimo momento costaria el botiquin ademas del
 * segundo perdido: castigar dos veces el mismo error lleva a que nadie se
 * anime a usarlo.
 */
const uso = new UsoDeObjeto({
  alCompletar: ({ clave }) => {
    if (!inventario.quitar(clave)) return;
    stats.botiquinesUsados++;
    const antes = player.health;
    player.heal(ITEMS[clave].heal);
    hud.flash(`+${Math.round(player.health - antes)} VIDA`, 1200);
    actualizarHudObjetos();
  },

  alCancelar: ({ motivo }) => {
    /*
     * Se dice POR QUE se corto. Una barra que se vacia sin explicacion se
     * lee como un error del juego; con el motivo, el jugador aprende la
     * regla en el primer intento.
     */
    if (motivo === MotivoCancelacion.GOLPE) hud.flash('TE INTERRUMPIERON', 1200);
    else if (motivo === MotivoCancelacion.MOVIMIENTO) hud.flash('TENÉS QUE FRENAR', 1200);
    hud.setUso(false);
  }
});

/** Color del anillo de ruido en el diagnostico: el mismo ambar del HUD. */
const COLOR_RUIDO = new pc.Color(1, 0.72, 0.15);

/*
 * Los cohetes de la bazooka.
 *
 * El gestor es logica pura —posiciones y choques— y lo unico que hace este
 * cableado es llevar la entidad visible a donde dice el gestor, y resolver
 * la explosion cuando avisa que detono.
 */
let proximoCohete = 0;
const cohetes = new GestorProyectiles({
  rayo: (ax, az, bx, bz, altura) => collision.raycast(ax, az, bx, bz, altura),

  alDetonar: ({ x, z, proyectil }) => {
    const arma = WEAPONS.bazooka;
    efectos.quitarCohete(proyectil.id);
    efectos.mostrarExplosion(x, z, arma.blastRadius);

    const alcanzados = alcanzadosPorExplosion({ x, z }, zombis.enJuego, {
      radio: arma.blastRadius,
      centro: arma.damage,
      borde: arma.damageEdge
    });

    for (const a of alcanzados) {
      const vivoAntes = a.objetivo.vivo;
      a.objetivo.recibirDaño(a.daño, {
        dirX: a.dirX,
        dirZ: a.dirZ,
        fuerza: arma.blastPush,
        fuente: 'explosion'
      });
      if (vivoAntes && !a.objetivo.vivo) stats.zombisEliminados++;
    }

    /*
     * El sacudon escala con la CERCANIA, no con el daño.
     *
     * Una explosion a treinta metros tiene que sentirse lejana aunque haya
     * matado a seis zombis. Lo que sacude la camara es la onda, y la onda
     * depende de donde estaba el jugador.
     */
    const p = player.position;
    const d = Math.hypot(x - p.x, z - p.z);
    const cercania = Math.max(0, 1 - d / 30);
    camera.sacudir(0.25 + cercania * 0.9, 0.35 + cercania * 0.3);

    // La explosion hace su propio ruido, aparte del disparo.
    const radioRuido = arma.noiseRadius;
    const alertados = zombis.propagarRuido(x, z, radioRuido);
    efectos.marcarRuido(x, z, radioRuido);
    if (alertados > 0) hud.flash(`${alertados} TE ESCUCHARON`, 1600);
  }
});

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

  alClicVacio: () => {
    hud.avisarSinMunicion();
  },

  alRecargar: () => {
    gus.gesto(Pose.RECARGAR);
    hud.flash('RECARGANDO', 900);
  },

  alCambiarMunicion: () => actualizarHudArma(),

  lanzarProyectil: (opt) => {
    const p = cohetes.lanzar(opt);
    p.id = ++proximoCohete;
    efectos.moverCohete(p.id, p.x, p.z, p.altura, p.rumbo);
  },

  alDispararEspecial: () => {
    stats.bazookasUsadas++;
    gus.gesto(Pose.DISPARAR);
    /*
     * La bazooka aparece en la mano solo mientras dura el disparo.
     *
     * No se "equipa": es un boton aparte (ver Fase 7). Pero disparar un
     * cohete sin que se vea de donde sale es de las cosas que hacen que un
     * juego se sienta hecho de piezas sueltas. Un segundo y medio alcanza
     * para que se vea el tubo al hombro.
     */
    armasEnMano.equipar('bazooka');
    clearTimeout(bazookaEnMano);
    bazookaEnMano = setTimeout(() => armasEnMano.equipar(arma.equipada), 1500);
    hud.flash('BAZOOKA', 1000);
    camera.sacudir(0.3, 0.18);
  },

  alEspecialSinBlanco: () => {
    /*
     * No se gasta la carga, pero hay que DECIRLO. Un boton que no hace
     * nada se lee como un boton roto; uno que explica por que no hizo nada
     * enseña cuando sirve.
     */
    hud.flash('SIN BLANCO A LA VISTA', 1200);
  },

  alCargarEspecial: () => {
    hud.flash('BAZOOKA LISTA', 1400);
  }
});

/**
 * Pasa el estado del arma al HUD.
 *
 * Se llama desde los avisos del arma y al cambiar de arma, no en cada
 * cuadro: escribir en el DOM sesenta veces por segundo para un numero que
 * cambia una vez por disparo es tirar cuadros a la basura en un telefono.
 * Lo unico que SI se actualiza por cuadro es la barra de recarga, porque es
 * una animacion.
 */
function actualizarHudArma() {
  // Lo que esta en la mano no puede estar tambien en el cinto.
  gus.mostrarPistolaAlCinto(arma.equipada !== 'pistol');
  armasEnMano.equipar(arma.equipada);
  hud.setArma({
    nombre: arma.arma.name,
    cargador: arma.enCargador,
    reserva: arma.enReserva,
    capacidad: arma.arma.magazineSize ?? 0,
    gastaMunicion: !!arma.tipoMunicion
  });
}

/**
 * Decide si un objeto le sirve al jugador AHORA.
 *
 * Es lo que impide que un botiquin pisado con la vida llena se pierda para
 * siempre sin que el jugador se entere. Lo que no sirve se queda en el
 * piso esperando a que haga falta.
 */
function leSirve(tipo) {
  /*
   * El botiquin ahora se GUARDA, no se usa al pisarlo. Asi que lo que
   * decide si sirve ya no es la vida sino el lugar en el inventario: con
   * la vida llena igual conviene levantarlo y llevarlo.
   */
  if (tipo === TipoObjeto.BOTIQUIN) return !inventario.lleno('medkit');
  if (tipo === TipoObjeto.MUNICION) {
    // Hay tope de reserva: con la reserva llena, la caja se queda.
    return arma.reserva.pistol < ITEMS.ammoPistol.maxCarried;
  }
  return true;
}

/** Pasa el inventario al HUD. */
function actualizarHudObjetos() {
  hud.setCuraciones(inventario.cuantos('medkit'), player.health < PLAYER.maxHealth);
}

/**
 * Intenta empezar a curarse.
 *
 * Con la vida llena no arranca: gastar un botiquin para no curar nada es
 * el tipo de error que el juego tiene que impedir, no permitir y lamentar.
 */
function intentarCurarse() {
  if (uso.enCurso) {
    uso.cancelar(MotivoCancelacion.MANUAL);
    return;
  }
  if (inventario.cuantos('medkit') <= 0) return;
  if (player.health >= PLAYER.maxHealth) {
    hud.flash('YA ESTÁS ENTERO', 900);
    return;
  }
  uso.iniciar('medkit', ITEMS.medkit.useTime);
}

/** Levanta lo que el jugador este pisando y le sirva. */
function recogerObjetos(pos) {
  const tomados = objetos.recoger(pos, leSirve);
  for (const o of tomados) {
    vistaObjetos.quitar(o.id);

    if (o.tipo === TipoObjeto.BOTIQUIN) {
      inventario.agregar('medkit', 1);
      actualizarHudObjetos();
      hud.flash(`BOTIQUÍN (${inventario.cuantos('medkit')})`, 1200);
    } else if (o.tipo === TipoObjeto.MUNICION) {
      arma.sumarMunicion('pistol', ITEMS.ammoPistol.amount);
      hud.flash(`+${ITEMS.ammoPistol.amount} BALAS`, 1200);
    }
  }
}

/**
 * Reparte los objetos que el plano de la mision ya tenia marcados.
 *
 * Las zonas de `municion` y `curacion` estan definidas desde la Fase 3 y
 * hasta ahora no las usaba nadie. Son las que hacen que los recursos
 * existan FUERA de los controles: si solo aparecieran al llegar a un
 * control, explorar no tendria premio y el recorrido seria una linea recta.
 */
function soltarObjetosDelMapa() {
  const zonas = mission001.zonas.filter(
    (z) => z.tipo === 'municion' || z.tipo === 'curacion'
  );
  for (const z of zonas) {
    const tipo = z.tipo === 'municion' ? TipoObjeto.MUNICION : TipoObjeto.BOTIQUIN;
    /*
     * Dentro de la zona, no en su centro exacto. El desvio sale del
     * generador con semilla (D-12): la misma semilla deja los objetos
     * siempre en el mismo lugar, asi que dos partidas son comparables.
     */
    const a = azarCombate() * Math.PI * 2;
    const r = azarCombate() * (z.radio ?? 2) * 0.6;
    const o = objetos.soltar(tipo, z.x + Math.sin(a) * r, z.z + Math.cos(a) * r);
    vistaObjetos.mostrar(o);
  }
}

/**
 * Suelta el surtido del control en el piso, alrededor del punto.
 *
 * El angulo de arranque sale del generador con semilla para que dos
 * partidas con la misma semilla dejen las cajas en el mismo lugar (D-12).
 */
function soltarEnControl(punto) {
  const nuevos = objetos.soltarGrupo(
    CHECKPOINT_DROP.objetos,
    punto,
    CHECKPOINT_DROP.radio,
    azarCombate() * 360
  );
  for (const o of nuevos) vistaObjetos.mostrar(o);
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
  clearTimeout(bazookaEnMano);
  actualizarHudArma();
  hud.setRecarga(false);
  hud.setEspecial(0, false);
  // Los cohetes en vuelo no sobreviven a un reinicio: explotarian en un
  // mapa que ya se reinicio, sobre zombis que ya no son los mismos.
  for (const c of cohetes.vivos) efectos.quitarCohete(c.id);
  cohetes.limpiar();
  objetos.limpiar();
  vistaObjetos.limpiar();
  inventario.vaciar();
  uso.cancelar(MotivoCancelacion.MANUAL);
  hud.setUso(false);
  actualizarHudObjetos();
  // Los objetos repartidos por el mapa vuelven a estar donde el plano dice.
  soltarObjetosDelMapa();
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
 * Llegar a un control deja un surtido en el piso.
 *
 * No rellena nada solo. La diferencia importa: un relleno automatico es un
 * premio que no se siente, y ademas no da ninguna decision. Tres cajas
 * tiradas que hay que ir a pisar —con lo que eso implica si hay zombis
 * cerca— son un respiro que el jugador se gana caminando.
 */
bus.on(EV.CHECKPOINT_REACHED, ({ x, z, index }) => {
  soltarEnControl({ x, z });
  stats.controles = index;
  // Hasta donde se llego alguna vez, no donde termino este intento (D-14).
  progreso.registrarControl(index);
});

/*
 * Un golpe corta la curacion.
 *
 * Es la regla que la convierte en una decision: curarse con un zombi
 * encima no funciona, hay que despegarse primero. Se engancha al evento de
 * daño y no al bucle para que valga para CUALQUIER fuente de daño, incluida
 * la explosion de la propia bazooka.
 */
bus.on(EV.PLAYER_DAMAGED, ({ amount }) => {
  gus.gesto(Pose.GOLPEADO);
  uso.cancelar(MotivoCancelacion.GOLPE);
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
input.bindHudButton(byId('btn-reload'), 'reload');
input.bindHudButton(byId('btn-special'), 'special');
input.bindHudButton(byId('btn-heal'), 'heal');

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
    if (input.wasPressed('reload')) arma.recargar();
    if (input.wasPressed('heal')) intentarCurarse();

    /*
     * El uso se resuelve ANTES del movimiento, con la velocidad del cuadro
     * anterior: si se hiciera despues, apretar y soltar el joystick en el
     * mismo cuadro cancelaria sin que el jugador vea que se movio.
     */
    if (uso.enCurso) {
      uso.update(dt, { moviendose: player.velocidadActual > 0.4 });
      hud.setUso(uso.enCurso, uso.progreso);
    }
    if (input.wasPressed('special')) arma.dispararEspecial(pos2d, zombis.enJuego);

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

    hud.setRecarga(arma.recargando, arma.progresoRecarga);
    hud.setEspecial(arma.progresoEspecial, arma.especialLista);

    // Los cohetes se mueven DESPUES del arma, para que uno lanzado en este
    // mismo cuadro ya avance y no se quede un cuadro clavado en el caño.
    cohetes.update(dt, zombis.enJuego);
    for (const c of cohetes.vivos) {
      efectos.moverCohete(c.id, c.x, c.z, c.altura, c.rumbo);
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
      vivo: player.health > 0,
      curandose: uso.enCurso
    });

    recogerObjetos(pos2d);
    vistaObjetos.update(dt);
    actualizarHudObjetos();

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
  debug.set(
    'objetos',
    `piso ${JSON.stringify(objetos.contar())} · encima ${inventario.cuantos('medkit')}` +
      `${uso.enCurso ? ` · usando ${(uso.progreso * 100).toFixed(0)}%` : ''}`
  );
  debug.set(
    'bazooka',
    `${(arma.progresoEspecial * 100).toFixed(0)}%${arma.especialLista ? ' LISTA' : ''} ` +
      `${cohetes.vivos.length} en vuelo`
  );
  debug.set(
    'arma',
    `${arma.equipada} ${arma.estado} ${arma.tipoMunicion ? `${arma.enCargador}/${arma.enReserva}` : ''}`
  );
  debug.set('cam', `yaw ${camera.yaw.toFixed(0)} pitch ${camera.pitch.toFixed(0)}`);
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
  postProceso, calidad, zombis, arma, efectos, cohetes, objetos, vistaObjetos, gus,
  inventario, uso,
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
