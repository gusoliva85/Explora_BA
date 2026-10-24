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
| Atacar | Click o `Espacio` | Botón |
| Pausa | `Esc` | Botón |
| Diagnóstico | `F1` | Tres dedos |

El juego **detecta solo** si está en un celular y muestra los controles que
correspondan. Para ver la interfaz táctil desde la computadora:
`http://localhost:5173/?input=touch`.

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

---

## Decisiones que conviene conocer

Están todas en el documento 02. Las que más sorprenden:

- **No se usa el editor de PlayCanvas** (D-01). El motor se usa como
  biblioteca: todo es texto, versionable y corre sin internet.
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
