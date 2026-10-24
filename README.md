# Explorar BA

Juego de supervivencia zombi en 3D para **navegador móvil**, ambientado en
Buenos Aires. Corre en el navegador, sin instalar nada.

Gus tiene que cruzar unas cuadras de Boedo hasta llegar a una comisaría.
En el camino elige entre avanzar por la calle, que es más corto pero pasa
por donde están los zombis, o meterse por un pasaje, que es más largo y más
angosto pero lo esquiva.

> **Estado: en desarrollo.** Hay mapa, cámara, movimiento, controles
> táctiles y zombis que te persiguen. **Todavía no se puede atacar.**
> Todo el arte es provisional: formas armadas con primitivas del motor,
> sin un solo modelo ni textura. Eso se reemplaza en la Fase 12.

---

## Cómo correrlo

Hace falta [Node.js](https://nodejs.org/) 20 o más nuevo.

```bash
npm install     # solo la primera vez
npm run dev     # abre http://localhost:5173
```

En Windows también sirve hacer doble clic en **`iniciar.bat`**, que libera
los puertos, levanta el servidor y abre el navegador. Con `iniciar.bat lan`
además muestra la dirección para abrirlo desde el celular.

### Controles

| | Teclado y mouse | Táctil |
|---|---|---|
| Mover | `WASD` o flechas | Dedo en la mitad izquierda |
| Cámara | Arrastrar / rueda para acercar | Dedo en la mitad derecha |
| Correr | `Shift` | Botón |
| Atacar / disparar | Click o `Espacio` | Botón grande |
| Cambiar de arma | `Q` | Botón `⇄` |
| Recargar | `R` | Botón `R` |
| Bazooka | `F` | Botón naranja (sólo cuando está lista) |
| Pausa | `Esc` | Botón |
| Diagnóstico | `F1` | Tres dedos |

El juego **arranca siempre en modo táctil**, también en la computadora.
Está diseñado para el celular (D-15), y ahí es lo correcto; en la
computadora no estorba, porque el teclado y el mouse siguen funcionando
igual. Lo único que cambia es que se dibujan los botones en pantalla.

### Ajustes

En el **menú de pausa** hay dos, y los dos se guardan:

| Ajuste | Opciones | |
|---|---|---|
| Controles | Táctil / Teclado | Cambia qué se dibuja en pantalla |
| Calidad | Normal / Alta | Se aplica **en vivo**, sin recargar |

**Normal** renderiza al 85 % de la resolución y la reenfoca, sin suavizado
temporal. **Alta** va a resolución completa, con suavizado temporal, más
muestras de oclusión ambiental y sombras de más resolución.

Lo que no se saca en Normal es la oclusión ambiental: cuesta, pero de día
es lo único que apoya los objetos en el piso.

También se pueden forzar por URL, que gana sobre lo guardado:
`?input=desktop`, `?calidad=alta`.

El diagnóstico muestra FPS, llamadas de dibujo y, con zombis en pantalla,
su cono de visión y su estado.

---

## Cómo está organizado

```
documentacion/     el proyecto entero explicado, empezar por acá
  01_documento_inicial.md    visión y alcance
  02_documento_mejorado.md   decisiones técnicas numeradas (D-01…D-16)
  03_roadmap.md              qué está hecho y qué sigue
  mockup/                    las tres cámaras que se evaluaron

src/
  core/        bucle, estados, eventos, aleatoriedad con semilla
  config/      todos los números de balance, en un solo lugar
  physics/     colisiones 2D, sin motor de física
  player/      movimiento y cámara
  enemies/     zombis: cerebro, cuerpo y aparición
  world/       generador de la calle, props y paleta
  render/      pipeline de imagen
  ui/          interfaz
  missions/    progreso de la misión

tests/         pruebas unitarias y de navegador
tools/         utilidades de desarrollo
```

**Si vas a tocar algo, leé antes `documentacion/02_documento_mejorado.md`.**
Ahí están las decisiones técnicas con el porqué de cada una, y varias son
contraintuitivas a propósito.

---

## Pruebas

```bash
npm test          # unitarias, sin navegador, menos de un segundo
npm run test:e2e  # en navegador real, incluye perfil de celular
npm run test:all  # todo
npm run verificar # compila y comprueba que la version de produccion CORRA
```

`npm run verificar` no es lo mismo que `npm run build`. Un build puede
terminar sin errores y la pagina quedar en negro: un import que solo
existia en desarrollo, un recurso que no se copio, una diferencia de
minificacion. El verificador compila, sirve el resultado y lo abre con
perfil de celular para comprobar que arranca y se juega. Conviene correrlo
antes de publicar.

Las de navegador hacen cosas que ninguna unitaria puede: caminan el
recorrido entero de la misión verificando que siga siendo transitable con
todos los obstáculos puestos, atraviesan los pasajes de punta a punta, y
comprueban que un zombi detecte, persiga y muerda.

Ya encontraron varios errores reales: un pasaje que se tapiaba solo en sus
esquinas, un colectivo que el tráfico generado terminaba de bloquear, y un
jugador que atravesaba paredes con pasos grandes.

### Una prueba que no se vio fallar no prueba nada

Es la regla más útil que dejó este proyecto, y salió de un error concreto:
la capa de interfaz se tragaba todos los toques y el juego no respondía a
nada en el teléfono, mientras la prueba del joystick **seguía pasando**.
Usaba `dispatchEvent`, que entrega el evento directamente al elemento que
uno nombra, salteando la detección de impacto del navegador: probaba que el
manejador funciona, no que el toque llegue a él.

Lo mismo con el arco del cuchillo, que apuntaba al revés con pruebas
unitarias impecables: todas fijaban un rumbo y medían alrededor de **ese**
rumbo, así que un convenio invertido pasaba entero.

Por eso, cada vez que se arregla algo así, el error se **reintroduce a
propósito** para comprobar que la prueba nueva falla. Ya salvó dos veces:
una prueba del arco comparaba la rotación de la entidad —que no sabe nada
de los vértices— y pasaba con la malla dada vuelta; hubo que reescribirla
para medir la geometría.

---

## El ruido, que es la mecánica central

Hay tres armas y la elección entre ellas no es "mejor o peor": es **callado
o rápido**.

| | Alcance | Se escucha a |
|---|---|---|
| Cuchillo | 2,1 m | **2 m** |
| Pistola | 28 m | **22 m** |
| Bazooka | 40 m | **45 m**, dos veces |

Todo zombi vivo dentro del radio del ruido pasa a `ALERT` y va a investigar
el lugar donde sonó. No va directo a perseguirte: **va al punto del ruido**,
porque un zombi que corre derecho hacia vos después de escuchar un disparo
a veinte metros sabe demasiado.

Con `F1` se ve el anillo del ruido expandiéndose desde el origen. Conviene
mirarlo antes de tocar los números: el radio es la regla principal del
juego y es completamente invisible.

Las perillas están en `src/config/balance.js`: `noiseRadius` por arma, y
`NOISE.rangeMultiplier` para subir la tensión de todo el juego de una vez.

### La bazooka

No se equipa: tiene botón propio, que **aparece** cuando la barra de 30 s
se llena y desaparece al gastarla. La barra carga siempre, tengas el arma
que tengas, porque la única decisión que importa es *cuándo* usarla.

Apunta sola al zombi más cercano **que se pueda ver** —si está detrás de
una persiana no cuenta, o el cohete reventaría contra la pared a dos metros
tuyo—. Y una vez que sale, **no persigue**: vuela derecho hacia donde
estaba el blanco, tarda más de un segundo en cruzar cuarenta metros, y un
zombi que cambia de dirección se salva. El radio de 6 m es lo que perdona
el error.

El daño cae hacia el borde: 250 en el centro y 35 justo en el límite. El
radio letal real es de unos 4,6 m, así que **el que queda en el borde
sobrevive herido**. Esa diferencia es lo único que hace que apuntarla sea
una habilidad en vez de un botón de borrar pantalla.

---

## Decisiones que conviene conocer

Están todas en el documento 02. Las que más sorprenden:

- **No se usa el editor de PlayCanvas** (D-01). El motor se usa como
  biblioteca: todo es texto, versionable y corre sin internet.
- **Un solo convenio de ángulos, y vive en un solo archivo**
  (`src/core/rumbo.js`): rumbo 0 mira hacia `-Z`. La regla es *ningún
  `atan2` de rumbos fuera de ese archivo*. Convivieron dos convenios
  opuestos durante varias fases, cada uno coherente consigo mismo, y el
  resultado fue que el cuchillo golpeaba para atrás y los zombis
  perseguían caminando de espaldas.
- **No hay motor de física** (D-09). El escenario son paredes verticales
  sobre suelo plano; eso se resuelve con círculos contra rectángulos, sin
  descargar WebAssembly ni perder determinismo.
- **El teléfono se detecta por capacidades, nunca por user agent** (D-08).
- **Vertical es la orientación de diseño** (D-15); horizontal se adapta.
- **El juego es de día** (D-16). La versión nocturna se veía bien en
  captura y era injugable con el brillo a la mitad.
- **Ninguna luz proyecta sombras salvo el sol.** Cada luz con sombra cuesta
  una pasada de render completa.

---

## Herramientas

- [PlayCanvas](https://playcanvas.com/) como motor, vía npm
- [Vite](https://vite.dev/) como servidor de desarrollo
- [Vitest](https://vitest.dev/) y [Playwright](https://playwright.dev/)
  para las pruebas
- Blender, para los modelos, a partir de la Fase 12

---

## Despliegue

Cada push a `main` publica solo en Vercel. La configuracion es la que trae
el preset de Vite:

| | |
|---|---|
| Framework | Vite |
| Root Directory | `./` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node | 20.19 o mas nuevo (fijado en `engines`) |

No hace falta ninguna variable de entorno: el juego corre entero en el
navegador y no habla con ningun servicio.

## Licencias

Todavía no se definió una licencia para el proyecto.

El registro de recursos externos —modelos, texturas, sonidos, fuentes— con
su origen y sus condiciones de uso se lleva en `documentacion/`. Hoy no hay
ninguno: todo lo que se ve está generado por código.

La referencia del protagonista (`documentacion/personajes/Gus.jpeg`) es
material de trabajo, no un recurso del juego.
