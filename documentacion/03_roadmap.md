# Documento 03 — Hoja de ruta de implementación

**Proyecto:** Explorar BA — supervivencia zombi en Buenos Aires para navegador móvil
**Versión:** 1.0 — 24 de octubre de 2026
**Depende de:** `01_documento_inicial.md` y `02_documento_mejorado.md`

---

## 📍 Dónde estamos — 24 de octubre de 2026

> **Fases cerradas:** 0, 1, 2, 2B y **3**.
> **Fase siguiente:** **Fase 4 — El primer zombi.** No empezada.
>
> La última sesión cerró la Fase 2 (cámara a 57° con la calle en diagonal y
> HUD vertical) y una Fase 2B que **no estaba planificada**: la reforma del
> render y la dirección visual. Se agregó al roadmap para que quede
> registrada, no se hizo "de más" en silencio.
>
> **Lo que está jugable hoy:** Gus camina por tres cuadras de Boedo
> pobladas —árboles, autos, taxis, colectivos, barricadas, contenedores,
> kiosco, semáforos, comisaría—, de día, con cámara en diagonal, pintura
> vial, brújula al objetivo, controles intermedios, victoria y derrota.
> Hay **dos rutas alternativas** reales: pasajes que rodean los cortes de
> la calle. Dos pruebas automatizadas caminan la ruta principal y los dos
> pasajes, y verifican que todo siga siendo transitable.
>
> **Lo que no existe todavía:** zombis, combate, armas, objetos, audio y
> cualquier arte que no sean cajas de colores.

---

## Cómo se usa este documento

Este es el plan de trabajo. Todo lo que hay que hacer está acá, dividido en
**15 fases** y, dentro de cada fase, en **tareas chicas**.

### Las reglas

1. **Se hace una tarea por vez.** No se empieza la siguiente hasta que la
   anterior se probó.
2. **Cada fase termina con una prueba manual.** Está escrita en la fase, paso
   por paso. Si la prueba no pasa, no se avanza.
3. **Ninguna fase arranca sin que la anterior haya pasado su criterio de
   salida.** Esto es lo que impide terminar con seis sistemas a medio hacer.
4. **El roadmap se corrige.** Si al probar algo descubrimos que una tarea
   estaba mal pensada, se reescribe la fase. Eso es señal de que el plan se
   está usando.
5. **De la Fase 4 en adelante, cada fase se prueba también en el teléfono.**
   Antes de eso no hay nada que valga la pena medir ahí.

### Estado

| Marca | Significado |
|---|---|
| ⬜ | Pendiente |
| 🔄 | En curso |
| ✅ | Hecho y probado |
| ⏸️ | Pausado o postergado |

### Dónde está el esfuerzo

```
Fases 0-2   Base técnica, moverse por el mapa        ████
Fases 3-5   Zombis y combate (el corazón del juego)  ████████
Fases 6-8   Recursos y misión completa               ██████
Fases 9-10  Interfaz y audio                         ████
Fase 11     Arte original                            ████████
Fases 12-14 Optimizar, publicar, ampliar             ██████
```

Las fases 3 a 8 son las que deciden si el juego es divertido. Las fases 0 a 2
son andamiaje y la 11 es la más larga, pero ninguna de las dos define si el
juego funciona.

---

## Panorama general

| Fase | Nombre | Qué entrega | Estado |
|---|---|---|---|
| 0 | Fundaciones | El proyecto corre en local y se versiona | ✅ |
| 1 | Escena y bucle | Una calle gris, cámara, estados de partida | ✅ |
| 2 | Movimiento y cámara | Gus camina por una calle en diagonal a 57° | ✅ |
| 2B | Render y dirección visual | Pipeline HDR, luz de día, interfaz rehecha | ✅ |
| 3 | El mapa de la Misión 001 | Los tres tramos completos y recorribles | ✅ |
| 4 | El primer zombi | Te detecta, te persigue, te muerde | 🔄 **siguiente** |
| 5 | Combate cuerpo a cuerpo | El cuchillo mata zombis | ⬜ |
| 6 | Pistola y ruido | Arma a distancia con consecuencias | ⬜ |
| 7 | Bazooka | El especial con barra de espera | ⬜ |
| 8 | Objetos e inventario | Munición y curación que se recogen y se usan | ⬜ |
| 9 | Misión completa | Controles, victoria, derrota, reinicio, guardado | ⬜ |
| 10 | Interfaz completa | Menú, pausa, ajustes, resultados | ⬜ |
| 11 | Audio | Pasos, gruñidos, disparos, audio posicional | ⬜ |
| 12 | Arte original | Gus, zombis, armas y la Buenos Aires porteña | ⬜ |
| 13 | Optimización | Que ande bien en el teléfono de referencia | ⬜ |
| 14 | Publicación | La demo en una URL | ⬜ |
| 15 | Ampliación | Solo después de validar todo lo anterior | ⏸️ |

---

# FASE 0 — Fundaciones ✅

**Objetivo:** que exista un proyecto que se pueda abrir, correr y versionar.

> **Nota:** esta fase ya está hecha. Se adelantó al preparar estos documentos,
> porque sin un proyecto que corra no había forma de verificar que las
> decisiones técnicas del documento 02 fueran ciertas y no suposiciones. Si
> preferís rehacerla paso a paso, se puede borrar todo lo que no sea
> `documentacion/` y arrancar de cero.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 0.1 | Crear el proyecto con Vite y agregar el motor PlayCanvas (D-01) | ✅ |
| 0.2 | Estructura de carpetas: `src/core`, `src/player`, `src/world`, `src/physics`, `src/input`, `src/ui`, `src/missions`, `src/config` | ✅ |
| 0.3 | `.gitignore` y `.gitattributes` (binarios de arte marcados) | ✅ |
| 0.4 | Archivo único de balance con todos los números (D-12) | ✅ |
| 0.5 | Bus de eventos para que los sistemas no se conozcan entre sí | ✅ |
| 0.6 | Generador aleatorio con semilla (D-12) | ✅ |
| 0.7 | Pruebas unitarias con Vitest | ✅ |
| 0.8 | Prueba de humo en navegador real con Playwright | ✅ |
| 0.9 | `npm run dev:lan` para abrir desde el teléfono | ✅ |
| 0.10 | `git init` y primer commit | ✅ |

### Cómo se prueba

```bash
npm install     # una sola vez
npm run dev     # abre http://localhost:5173
npm test        # 25 pruebas unitarias
npm run test:e2e  # 5 pruebas en navegador real
```

### Criterio de salida

- [x] `npm run dev` levanta y la página carga sin errores en consola
- [x] `npm test` pasa entero
- [x] `npm run test:e2e` pasa entero
- [x] El repositorio Git existe y tiene el primer commit

---

# FASE 1 — Escena y bucle de juego ✅

**Objetivo:** una escena 3D con iluminación y una máquina de estados que
distinga menú, juego, pausa, victoria y derrota.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 1.1 | Canvas a pantalla completa, con tope de densidad de píxeles | ✅ |
| 1.2 | Cámara, luz direccional única con sombras, luz ambiente | ✅ |
| 1.3 | Niebla lineal (clima + esconde el borde del mapa + permite recortar el clip lejano) | ✅ |
| 1.4 | Máquina de estados con transiciones válidas (D-11) | ✅ |
| 1.5 | Bucle con `dt`, techo de 1/15 s, pausa al perder foco | ✅ |
| 1.6 | Overlay de diagnóstico con F1 / tres dedos | ✅ |
| 1.7 | Pantalla de arranque que habilita el audio del navegador | ✅ |
| 1.8 | Esqueleto del HUD en HTML/CSS con safe-area (D-13) | ✅ |

### Cómo se prueba

1. Abrir el juego → aparece "TOCAR PARA EMPEZAR".
2. Tocar → aparece el HUD y la escena 3D.
3. F1 → aparece el overlay con FPS y draw calls.
4. Esc → pausa; Esc otra vez → continúa.
5. Cambiar de pestaña y volver → el juego quedó en pausa, no pasó nada raro.

### Criterio de salida

- [x] Se ve una escena 3D iluminada
- [x] Los estados cambian correctamente y las transiciones inválidas se rechazan
- [x] El overlay muestra métricas reales

---

# FASE 2 — Movimiento y cámara ✅

**Objetivo:** mover a Gus por el mundo, con cámara y colisiones que funcionen.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 2.1 | Capa de entrada abstracta: teclado, mouse y táctil (D-08) | ✅ |
| 2.2 | Joystick virtual que aparece donde apoyás el dedo | ✅ |
| 2.3 | Mundo de colisiones 2D con grilla espacial (D-09) | ✅ |
| 2.4 | Controlador cinemático con aceleración y deslizamiento por la pared | ✅ |
| 2.5 | Subdivisión del movimiento para evitar atravesar paredes | ✅ |
| 2.6 | Cámara en tercera persona con colisión (D-02) | ✅ |
| 2.7 | Movimiento relativo a la cámara | ✅ |
| 2.8 | Gus provisional: cápsula con un bloque que marca hacia dónde mira | ✅ |
| 2.9 | Detección de celular por capacidades, no por user agent (D-08) | ✅ |
| 2.10 | HUD que cambia solo entre táctil y teclado, sin recargar | ✅ |
| 2.11 | `?input=touch` y botón en la pausa para probar el HUD de celular desde la PC | ✅ |
| 2.12 | Vertical como orientación de diseño; se sacó el aviso de rotación (D-15) | ✅ |
| 2.13 | Mockups de las tres cámaras candidatas en `documentacion/mockup/` | ✅ |
| 2.14 | Cámara a 57° con la calle en diagonal, alineada sola al tramo (D-02 cerrada) | ✅ |
| 2.15 | HUD en layout vertical, con las acciones en dos filas | ✅ |
| 2.16 | Anillo ámbar en el piso para no perder de vista a Gus | ✅ |
| 2.17 | Prólogo de 26 m de calle por detrás del spawn, para que no se vea el borde del mapa | ✅ |
| 2.18 | `tools/captura.mjs`: captura del juego con perfil de celular | ✅ |

### Cómo se prueba

1. WASD → Gus se mueve en la dirección correcta respecto a la cámara.
2. Arrastrar el mouse → la cámara gira y el movimiento acompaña.
3. Shift → corre, se nota la diferencia.
4. Caminar en diagonal contra una pared → desliza, no se clava.
5. Correr de frente contra un edificio → se frena, no lo atraviesa.
6. Poner la cámara contra un edificio → se acerca sola para no meterse adentro.
7. Rueda del mouse → acerca y aleja.

### Criterio de salida

- [x] Gus no atraviesa paredes en ninguna circunstancia (hay prueba automática)
- [x] El movimiento es relativo a la cámara
- [x] La cámara no se mete dentro de los edificios

### ⚠️ Lo que quedó provisional en esta fase

Son cosas que **se arreglan en fases siguientes**, no olvidos:

- **La luz ambiente está más alta de lo que va a ser.** Sin eso el grey-box
  queda negro y no se puede evaluar nada. Los faroles de sodio llegan en la
  Fase 3 y entonces hay que volver a bajarla.
- **El anillo del piso es un disco plano.** Cumple, pero se lee como una
  mancha. Con una textura de resplandor en la Fase 12 queda bien.
- **La calle está vacía.** Hay pocos autos y ningún farol. Eso es la Fase 3.

### 🔍 Pendiente de tu validación

Lo que sigue es lo primero que hay que decidir **jugando**, no leyendo:

- ¿La velocidad al caminar se siente bien o es lenta?
- ¿El ángulo de cámara deja ver lo suficiente? (probá con la rueda del mouse)
- ¿La distancia de 9,5 m es la correcta?
- ¿Los botones táctiles caen donde los encuentra el pulgar? (probá con
  `?input=touch`, o desde el teléfono con `npm run dev:lan`)

Y antes de seguir, mirá los mockups: **`documentacion/mockup/index.html`**. Ahí
están las tres cámaras candidatas sobre la misma cuadra. No hace falta elegir
todavía —eso se cierra en la Fase 4—, pero sí descartar alguna si te convence
poco.

---

# FASE 2B — Render y dirección visual ✅

**Objetivo:** que el juego se vea bien y, sobre todo, que se vea **claro**.

> **Esta fase no estaba en el plan original.** Se agregó después de mirar el
> prototipo y comprobar que el problema no era el contenido sino el render:
> el juego dibujaba a 8 bits por canal, con una sola luz y sin ningún
> tratamiento de imagen. Queda anotada acá para que el roadmap refleje lo
> que pasó de verdad.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 2B.1 | Pipeline HDR con `pc.CameraFrame`: oclusión ambiental, bloom, mapeo de tonos, grading, realce de color y viñeta | ✅ |
| 2B.2 | Dos perfiles de calidad, alto y móvil, forzables con `?calidad=alta\|movil` | ✅ |
| 2B.3 | **Pasar de noche a día** (decisión D-16) | ✅ |
| 2B.4 | Sol con sombras en cascada, luz de cielo de relleno y bruma de distancia | ✅ |
| 2B.5 | Paleta diurna low-poly: colores claros, mates y con contraste entre superficies vecinas | ✅ |
| 2B.6 | Identidad porteña barata: toldos de color, taxi negro y amarillo, colectivo con franja | ✅ |
| 2B.7 | Faroles como mobiliario urbano, listos para encenderse si hay misión nocturna | ✅ |
| 2B.8 | Interfaz rehecha en hoja aparte: barra de vida con marcas, estado crítico, objetivo animado, botones más grandes | ✅ |
| 2B.9 | Destello rojo al recibir daño y transiciones de entrada en los paneles | ✅ |
| 2B.10 | `tools/captura.mjs` para revisar cambios con perfil de celular | ✅ |
| 2B.11 | `iniciar.bat`: libera puertos, levanta el servidor, espera y abre el navegador | ✅ |

### Cómo se prueba

1. Abrir el juego → la calle se ve de día, clara, sin esfuerzo.
2. Comparar `?calidad=alta` contra `?calidad=movil` → la segunda es más
   blanda pero legible igual.
3. Bajarse la vida desde la consola (`game.player.applyDamage(75)`) → la
   barra late en rojo y hay destello.
4. **En el teléfono, a la luz del día y con el brillo a la mitad.** Es la
   prueba que importa: si ahí no se ve, no sirve.

### Criterio de salida

- [x] La escena se lee sin esfuerzo en una pantalla de celular
- [x] Los planos se separan entre sí sin necesidad de textura
- [x] La interfaz es legible en movimiento
- [ ] **Pendiente tuyo:** confirmarlo en un teléfono real

### ⚠️ Lo que quedó provisional

- **La calle está vacía.** Pocos autos, ningún árbol, ninguna barricada a
  mano. Eso es la Fase 3 y es justamente lo que sigue.
- **Todo sigue siendo cajas.** Los modelos son la Fase 12.
- **No hay partículas ni transiciones entre estados de juego**, solo en los
  paneles.

---

# FASE 3 — El mapa de la Misión 001 ✅

**Objetivo:** que los tres tramos del recorrido existan completos y se sienta
una calle de Buenos Aires, todavía en cajas de colores.

> Hoy el generador ya arma los tres tramos con calzada, veredas, edificios de
> altura variable y autos abandonados. Esta fase es sobre convertir eso en un
> **nivel diseñado**, no en geometría generada.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 3.1 | Plano del recorrido: cuellos de botella, rutas y recursos | ✅ documentado en `mission001.js` |
| 3.2 | Marcar los dos controles y la comisaría | ✅ |
| 3.3 | **Dos rutas alternativas reales** | ✅ dos pasajes, uno por tramo cortado |
| 3.4 | Pasajes transitables | ✅ los patios internos quedan para más adelante |
| 3.5 | Barricadas colocadas a mano en los puntos que el diseño pide | ✅ |
| 3.6 | Marcar las zonas de zombis y objetos | ✅ doce zonas con peso y nota de diseño |
| 3.7 | Diferenciar visualmente los tres tramos | 🔄 parcial: varían altura y densidad, falta carácter propio |
| 3.8 | Brújula con dirección y distancia al objetivo | ✅ |
| 3.9 | Revisar las direcciones reales y corregir los textos | ✅ el destino pasó a ser una comisaría sobre Carlos Calvo |
| 3.10 | Medir el recorrido | ✅ 320 m en línea recta, 329 caminados: +6 % de desvío |
| 3.11 | Árboles de vereda con cantero, tronco y copa | ✅ |
| 3.12 | Props: contenedores, bolsas, cestos, bancos, paradas, kiosco, semáforos, carteles | ✅ |
| 3.13 | Pintura vial: eje, líneas de borde y sendas peatonales | ✅ |
| 3.14 | Variar alturas y retiros de los edificios | ✅ más balcones, medianeras y tanques |
| 3.15 | Revisar el presupuesto de draw calls | 🔄 de 246 a **171**; el objetivo son 150 |

### Lo que se construyó

**Biblioteca de props** (`src/world/props.js`): quince objetos armados con
piezas, no cubos pintados. Un auto tiene carrocería, cabina, cuatro ruedas,
parabrisas y luces; un árbol tiene cantero, cordón, tronco y tres lóbulos de
copa de verdes distintos.

**Paleta compartida** (`src/world/palette.js`): la regla es que dos
superficies que se tocan nunca compartan valor, y que el color saturado se
reserve para lo que importa —toldos, taxis, semáforos, objetos de misión—.

**Diseño a mano vs. generado**: lo que cambia cómo se JUEGA vive en
`mission001.js`; lo que solo cambia cómo se VE lo genera la semilla. Y lo
colocado a mano **reserva** una zona donde el generador no puede poner nada,
porque si no un auto al azar puede cerrar el paso que una barricada dejaba
abierto a propósito.

**Rutas alternativas**: dos pasajes, uno por tramo cortado. Son calles
angostas sin veredas que se meten entre dos edificios, corren por el fondo
de la manzana y vuelven a salir más adelante. El generador abre un hueco en
la hilera de fachadas donde el pasaje toca la calle, y ni los árboles ni los
faroles pueden plantarse ahí: si tapan la boca, el pasaje no existe.

La decisión que crean es el pilar de "decisiones rápidas" del documento 01:

| | Por la calle | Por el pasaje |
|---|---|---|
| Distancia | Más corto | +40 m |
| Riesgo | Hay que cruzar el corte, donde va a estar el peligro | Se evita el corte |
| Ancho | Calzada de 10 m, se esquiva | 5 m, no se esquiva a nadie |
| Recompensa | Nada | Munición a la entrada, curación a la salida |

**Zonas de juego**: doce zonas definidas en `mission001.js` —siete de zombis
y cinco de objetos— cada una con su peso y una nota que explica por qué está
ahí. Todavía no aparece nada: son decisiones de diseño de nivel tomadas con
el mapa fresco, para que la Fase 4 no tenga que inventarlas.

**Agrupado estático de mallas**: 1774 mallas se funden en unos 98 lotes.
Sin eso, esto no corre en un teléfono.

### Cómo se prueba

```
npm run test:e2e     incluye la prueba que camina la ruta entera
```

Esa prueba es nueva y es la más útil de la fase: un caminante tosco recorre
los tres tramos esquivando obstáculos y, si se traba, informa **la
coordenada exacta y qué caja lo bloquea**. Ya encontró dos problemas reales:
un colectivo colocado a mano que el tráfico generado terminaba de tapar, y
un paso de menos de un metro junto al cordón.

A mano:

1. Caminar el recorrido entero: ¿se entiende hacia dónde ir sin leer el
   objetivo? ¿La brújula ayuda o estorba?
2. Intentar perderse a propósito: ¿hay algún lugar donde quedarse trabado?
3. Cronometrarlo: entre 90 segundos y 3 minutos corriendo sin enemigos es el
   rango sano.
4. **Probar el pasaje**: meterse por la boca de la derecha antes de la
   barricada. ¿Se entiende que es un camino y no un callejón sin salida?
5. **En el teléfono:** mirar el overlay (F1 o tres dedos). Hoy son 171 draw
   calls y el objetivo son 150.

### Criterio de salida

- [x] El recorrido completo se camina sin trabarse en ningún lado
- [x] Hay al menos dos rutas alternativas que cambian la experiencia
- [x] Los dos pasajes se atraviesan de punta a punta
- [ ] Una persona que nunca vio el juego sabe hacia dónde ir
- [ ] El recorrido corriendo toma entre 90 s y 3 min
- [ ] Los draw calls bajan de 150 en el teléfono

### ⚠️ Lo que quedó corto

1. **Draw calls: 171 contra 150.** Se bajó de 246 agrandando los lotes del
   agrupado, unificando los acabados mates y recortando la distancia de
   sombras. Lo que queda son 64 materiales distintos, y bajarlos significa
   resignar variedad de color. **Se revisa en la Fase 13**, cuando los
   modelos reales reemplacen las primitivas: un edificio modelado es una
   malla, no treinta cajas.
2. **Patios internos.** Los baldíos siguen siendo decorado. Los pasajes
   cubren la necesidad de ruta alternativa, así que no urge.
3. **Carácter propio de cada tramo (3.7).** Varían altura y densidad, pero
   los tres se parecen. Se resuelve mejor en la Fase 12, con arte.

---

# FASE 4 — El primer zombi ⬜

**Objetivo:** un zombi que te detecta, te persigue esquivando obstáculos, te
alcanza y te hace daño. **Esta es la fase más importante de todo el roadmap**:
es donde el juego empieza a ser un juego.

### Tareas

| # | Tarea |
|---|---|
| 4.1 | Componente de salud reutilizable (lo van a usar Gus, los zombis y después las barricadas) |
| 4.2 | Zombi provisional: cápsula de otro color, con la silueta distinguible de Gus |
| 4.3 | Máquina de estados del zombi: `IDLE`, `ALERT`, `CHASE`, `ATTACK`, `STUNNED`, `DEAD` |
| 4.4 | Detección: distancia + cono de visión de 120° + línea de vista contra las paredes |
| 4.5 | Detección por cercanía sin ver (4 m): que no te ignore si estás pegado atrás |
| 4.6 | Movimiento con dirección + evasión por tres rayos (D-10) |
| 4.7 | Separación entre zombis para que no se apilen |
| 4.8 | Memoria del último lugar donde te vio: va ahí y busca unos segundos |
| 4.9 | Límite de alejamiento: si te fuiste muy lejos, vuelve a su zona |
| 4.10 | Ataque con alcance, tiempo de espera y daño |
| 4.11 | Invulnerabilidad breve al recibir daño, para no morir de tres mordidas seguidas |
| 4.12 | Retroalimentación al recibir daño: destello rojo en pantalla + sacudón de cámara |
| 4.13 | `SpawnManager`: coloca zombis según la definición de la misión |
| 4.14 | Apagar la IA de los zombis lejanos y limitar los activos a 12 |
| 4.15 | Modo debug: dibujar el cono de visión y el estado de cada zombi sobre su cabeza |
| 4.16 | Pruebas unitarias de la máquina de estados y de la detección |

### Cómo se prueba

1. Acercarse de frente → el zombi pasa a `ALERT` y después a `CHASE`.
2. Esconderse detrás de un edificio → pierde la línea de vista, va al último
   lugar conocido, busca y se calma.
3. Acercarse por detrás en silencio → no te ve hasta que estás a 4 m.
4. Hacerlo perseguirte por una esquina → la rodea, no se clava.
5. Poner 6 zombis juntos → no se apilan en el mismo punto.
6. Dejarse morder → la vida baja, hay destello rojo, con 8 mordidas se muere.
7. Correr y escaparse → se puede. Esto es obligatorio: ver los valores de balance del documento 02, sección 3.
8. **En el teléfono:** 12 zombis activos y mirar los FPS en el overlay.

### Criterio de salida

- [ ] Un encuentro con un zombi funciona igual diez veces seguidas
- [ ] El zombi no se traba contra las paredes ni se apila con otros
- [ ] Se puede escapar corriendo
- [ ] Con 12 zombis el teléfono mantiene 30 FPS
- [ ] Al morir aparece la pantalla de derrota y se puede reintentar

### 🔍 Decisión a cerrar en esta fase

**El ángulo de cámara (D-02).** Recién con zombis persiguiéndote se puede
decidir: el ángulo se elige por cuánto peligro necesitás ver venir. Probar los
tres de los mockups —57°, 66° y 75°— con la rueda del mouse y después en el
teléfono. Anotar el resultado en el documento 02.

La orientación vertical y la calle en diagonal ya están decididas y no se
reabren acá: lo único que se ajusta es la inclinación.

---

# FASE 5 — Combate cuerpo a cuerpo ⬜

**Objetivo:** el cuchillo. Que pegarle a un zombi se sienta bien.

### Tareas

| # | Tarea |
|---|---|
| 5.1 | `WeaponController`: arma equipada, tiempos de espera, estados |
| 5.2 | Ataque con arco: alcance de 1,7 m y 55° a cada lado |
| 5.3 | Demora entre apretar y golpear (0,12 s), para sincronizar con la animación |
| 5.4 | Que un solo golpe pueda alcanzar a varios zombis del arco |
| 5.5 | Que un golpe no pegue dos veces al mismo zombi |
| 5.6 | Reacción del zombi al recibir daño: empujón hacia atrás e interrupción |
| 5.7 | Muerte del zombi: apagar IA y colisión, dejar el cuerpo unos segundos, desaparecer |
| 5.8 | Reutilizar los zombis muertos en vez de crear y destruir (evita tirones por recolección de basura) |
| 5.9 | Retroalimentación de impacto: destello en el zombi, partícula, sacudón de cámara |
| 5.10 | Retroalimentación de fallo: que se note que tiraste el golpe al aire |
| 5.11 | Que el cuchillo emita un evento de ruido de 2 m (D-05) |

### Cómo se prueba

1. Golpear al aire → se ve la animación, no pasa nada más.
2. Golpear a un zombi → se ve el impacto, pierde vida, retrocede.
3. Dos cuchillazos → el zombi muere y el cuerpo queda unos segundos.
4. Golpear a tres zombis juntos → los alcanza a todos, una vez a cada uno.
5. Apretar el botón muy rápido → el tiempo de espera lo limita.
6. Matar 30 zombis seguidos → no hay tirones ni se degrada el rendimiento.
7. **En el teléfono:** ¿el botón de ataque está donde la mano lo encuentra sin
   mirar?

### Criterio de salida

- [ ] Se entiende sin dudas cuándo acertaste y cuándo fallaste
- [ ] Dos cuchillazos matan a un zombi estándar
- [ ] Matar muchos zombis no degrada el rendimiento
- [ ] Un zombi se puede derrotar sin recibir daño si lo hacés bien

---

# FASE 6 — Pistola y sistema de ruido ⬜

**Objetivo:** el arma a distancia, y que disparar tenga consecuencias.

### Tareas

| # | Tarea |
|---|---|
| 6.1 | Disparo instantáneo: rayo con alcance de 28 m, que choca contra paredes |
| 6.2 | Dispersión de 2,5° (castiga el tiro a máxima distancia) |
| 6.3 | Apuntado asistido en móvil: ligera corrección hacia el zombi más cercano al centro |
| 6.4 | Cargador de 12 balas, recarga de 1,6 s, munición de reserva |
| 6.5 | Clic sin munición: que se escuche y se vea que estás vacío |
| 6.6 | Línea de trazado del disparo y chispa en el impacto |
| 6.7 | Fogonazo y retroceso de cámara |
| 6.8 | Cambio de arma: cuchillo ↔ pistola (botón y tecla Q) |
| 6.9 | **Sistema de ruido** (D-05): evento con posición y radio |
| 6.10 | Que los zombis dentro del radio pasen a `ALERT` y vayan hacia el origen del ruido |
| 6.11 | Indicador visual del ruido en modo debug: círculo que se expande |
| 6.12 | Mostrar munición en el HUD |

### Cómo se prueba

1. Disparar a un zombi a 10 m → acierta, dos tiros lo matan.
2. Disparar a 28 m → el disparo no llega.
3. Disparar a través de una pared → no pasa.
4. Vaciar el cargador → recarga, y durante la recarga no se puede disparar.
5. Quedarse sin reserva → clic en vacío.
6. **Disparar con tres zombis alrededor que no te habían visto** → los tres
   vienen. Esta es la prueba clave de la fase.
7. Matar un zombi con cuchillo al lado de otros → los otros no se enteran.
8. **En el teléfono:** ¿se puede apuntar y acertar sin frustrarse?

### Criterio de salida

- [ ] Disparar atrae zombis de forma notoria y predecible
- [ ] El cuchillo sirve por ser silencioso, no solo como recurso de emergencia
- [ ] El jugador duda antes de disparar. **Si no duda, el ruido es muy poco**
- [ ] Se puede apuntar con el dedo sin frustrarse

---

# FASE 7 — Bazooka ⬜

**Objetivo:** el arma especial con barra de espera y apuntado automático (D-03).

### Tareas

| # | Tarea |
|---|---|
| 7.1 | Barra de carga de 30 s, visible en el HUD |
| 7.2 | Selección automática del zombi más cercano dentro de 40 m |
| 7.3 | Indicador del objetivo seleccionado antes de disparar |
| 7.4 | Proyectil que viaja a 24 m/s, no instantáneo (se ve venir, se puede esquivar) |
| 7.5 | Explosión con daño en área: 250 en el centro, 60 en el borde, radio de 6 m |
| 7.6 | Empujón a los zombis cercanos a la explosión |
| 7.7 | Efecto visual: destello, onda y humo |
| 7.8 | Sacudón de cámara proporcional a la distancia |
| 7.9 | Evento de ruido de 45 m |
| 7.10 | Bloqueo del botón mientras la barra no está llena |
| 7.11 | Qué pasa si no hay ningún zombi en rango (no debería gastarse) |

### Cómo se prueba

1. Esperar 30 s → la barra se llena y el botón se habilita.
2. Disparar con un grupo de zombis → mueren todos los del radio.
3. Disparar con un zombi en el borde del radio → sobrevive con poca vida.
4. Disparar sin zombis en rango → no se gasta la carga.
5. Después del disparo → la barra vuelve a cero y arranca de nuevo.
6. Disparar cerca → los zombis de medio barrio vienen a ver qué pasó.
7. **En el teléfono:** ¿el efecto de explosión baja los FPS? Si sí, simplificar.

### Criterio de salida

- [ ] La bazooka se siente poderosa y vale la pena esperarla
- [ ] El ruido que genera la convierte en una decisión, no en un botón gratis
- [ ] No se puede abusar de ella
- [ ] La explosión no baja los FPS en el teléfono

---

# FASE 8 — Objetos e inventario ⬜

**Objetivo:** recursos que se recogen y se usan.

### Tareas

| # | Tarea |
|---|---|
| 8.1 | `InventorySystem`: munición, botiquines, vendas, con topes de carga |
| 8.2 | `PickupItem`: objeto en el mundo, visible y distinguible del decorado |
| 8.3 | Que los objetos giren o floten suavemente para que se noten |
| 8.4 | Detección de proximidad (1,8 m) y botón contextual que aparece solo entonces |
| 8.5 | Recoger: el objeto desaparece, el inventario se actualiza, hay confirmación visible |
| 8.6 | Que un objeto no se pueda recoger dos veces |
| 8.7 | Que no se pueda recoger si ya estás al tope (y que se avise por qué) |
| 8.8 | Curarse: lleva tiempo (1,2 s) y durante ese tiempo sos vulnerable |
| 8.9 | Cancelar la curación si te golpean |
| 8.10 | Colocar los objetos de la Misión 001 según el plano de la Fase 3 |
| 8.11 | Mostrar el inventario en el HUD de forma compacta |
| 8.12 | Pruebas unitarias del inventario (topes, duplicados, consumo) |

### Cómo se prueba

1. Acercarse a un botiquín → aparece el botón de recoger.
2. Alejarse → el botón desaparece.
3. Recoger → el objeto desaparece y el contador sube.
4. Volver a pasar por el mismo lugar → no hay nada.
5. Recoger 3 botiquines y buscar un cuarto → avisa que estás al tope.
6. Curarse con la vida baja → tarda, y la vida sube.
7. **Curarse mientras un zombi te muerde** → la curación se cancela. Esta es la
   prueba clave: define si curarse es una decisión táctica o un botón.
8. Recorrer la misión entera → ¿alcanzan los recursos? ¿sobran?

### Criterio de salida

- [ ] Recoger y usar un objeto hace exactamente lo que se espera
- [ ] Los objetos se distinguen del decorado de un vistazo
- [ ] Curarse en medio del combate es una decisión arriesgada
- [ ] La misión se puede completar con los recursos que hay, pero sin sobrar

---

# FASE 9 — La misión completa ⬜

**Objetivo:** que se pueda jugar de principio a fin, ganar, perder y reintentar.

### Tareas

| # | Tarea |
|---|---|
| 9.1 | Controles intermedios: detección, guardado y aviso en pantalla |
| 9.2 | Que no se puedan saltear: hay que tomarlos en orden |
| 9.3 | Reaparecer en el último control al morir |
| 9.4 | Meta final: solo cuenta con todos los controles tomados |
| 9.5 | Pantalla de victoria con tiempo, zombis eliminados y vida restante |
| 9.6 | Pantalla de derrota, con el motivo y desde dónde se reanuda |
| 9.7 | **Reinicio limpio:** ni un zombi duplicado, ni un objeto recogido que vuelve a estar recogido, ni un temporizador que quedó corriendo |
| 9.8 | Guardar en `localStorage`: último control y mejor tiempo (D-14) |
| 9.9 | Objetivo que se actualiza en cada tramo |
| 9.10 | Indicador de dirección hacia el próximo objetivo |
| 9.11 | Ajuste de dificultad: cantidad y ubicación de zombis por tramo |
| 9.12 | Pruebas automáticas del recorrido completo |

### Cómo se prueba

1. Jugar la misión entera sin morir → victoria, con estadísticas correctas.
2. Morir en el segundo tramo → reaparecer en el primer control, con vida llena.
3. Reiniciar desde la pausa cinco veces seguidas → el mundo queda igual cada
   vez, sin zombis ni objetos duplicados.
4. Ir directo a la meta salteando los controles → no completa la misión.
5. Cerrar la pestaña y volver a abrir → el mejor tiempo sigue ahí.
6. **Darle el teléfono a alguien que nunca lo vio, sin explicarle nada.**
   ¿Entiende qué tiene que hacer? Esta es la prueba más valiosa del roadmap.

### Criterio de salida

- [ ] La misión se completa de principio a fin
- [ ] Se puede reiniciar infinitas veces sin que nada se rompa
- [ ] Una persona nueva entiende el objetivo sin que se lo expliquen
- [ ] El progreso sobrevive a cerrar la pestaña
- [ ] **Este es el "primer hito" del documento 01.** A partir de acá el juego
      existe.

---

# FASE 10 — Interfaz completa ⬜

**Objetivo:** que el juego tenga principio, menús y ajustes, no solo partida.

### Tareas

| # | Tarea |
|---|---|
| 10.1 | Menú principal con título, jugar, ajustes y cómo se juega |
| 10.2 | Pantalla de controles, distinta según sea teclado o táctil |
| 10.3 | Ajustes: sensibilidad de cámara, ángulo de cámara, volumen, invertir eje Y |
| 10.4 | Guardar los ajustes en `localStorage` |
| 10.5 | Pantalla de carga con progreso real, no fingido |
| 10.6 | Pausa completa: continuar, reiniciar, ajustes, volver al menú |
| 10.7 | Revisar el tamaño y la posición de los botones con una mano real, **en vertical** |
| 10.8 | Verificar que nada quede tapado por el notch ni por la barra de gestos |
| 10.9 | Mensaje claro si el dispositivo no soporta WebGL |
| 10.10 | Manejar la pérdida de contexto de WebGL sin que el juego muera |
| 10.11 | Revisar la legibilidad de todos los textos en una pantalla chica |
| 10.12 | Unificar todos los textos en un solo archivo, en voseo rioplatense |
| 10.13 | Revisar que el HUD horizontal también funcione, aunque no sea el principal |

### Cómo se prueba

1. Recorrer todas las pantallas y volver: ninguna deja el juego trabado.
2. Cambiar la sensibilidad, salir, volver → se mantuvo.
3. **Jugar 10 minutos con una sola mano** → ¿se llega a todos los botones?
4. Probar en un teléfono con notch → nada tapado, ni arriba ni en la barra de gestos.
5. Probar girando a horizontal → el HUD se reacomoda y el juego sigue andando.
6. Leer todos los textos en el teléfono con el brazo estirado → se leen.

### Criterio de salida

- [ ] Todas las pantallas funcionan y ninguna traba el juego
- [ ] Los ajustes se guardan
- [ ] Todos los botones se alcanzan cómodamente con una mano
- [ ] Nada queda tapado por el notch en ningún teléfono probado
- [ ] El tercio central de la pantalla nunca queda tapado por un dedo

---

# FASE 11 — Audio ⬜

**Objetivo:** que el juego suene, y que el sonido aporte información.

### Tareas

| # | Tarea |
|---|---|
| 11.1 | `AudioManager` con canales separados: efectos, ambiente, interfaz |
| 11.2 | Verificar que el audio arranca después del toque inicial (ya está preparado) |
| 11.3 | Los 14 sonidos mínimos de la demo (ver documento 02, sección 3) |
| 11.4 | Audio posicional 3D para los zombis |
| 11.5 | Variación de tono en los sonidos repetidos (pasos, golpes) para que no cansen |
| 11.6 | Ambiente de calle vacía en bucle |
| 11.7 | Gruñidos ocasionales de zombis fuera de la vista |
| 11.8 | Control de volumen y silencio total |
| 11.9 | Pausar el audio cuando el juego se pausa o se cambia de pestaña |
| 11.10 | Todos los sonidos cortos en un solo archivo |
| 11.11 | Anotar cada sonido en el registro de licencias |

### Cómo se prueba

1. Caminar → se escuchan los pasos, y cambian al correr.
2. Un zombi a la izquierda → se escucha a la izquierda.
3. **Cerrar los ojos y caminar** → ¿se puede saber si hay un zombi cerca y de
   qué lado? Si sí, el audio posicional está bien.
4. Disparar → suena fuerte y se diferencia del cuchillo.
5. Pausar → el audio se detiene.
6. Jugar 10 minutos → ningún sonido cansa ni se vuelve molesto.
7. **En el teléfono con auriculares** y también sin ellos.

### Criterio de salida

- [ ] El audio arranca sin problemas en Chrome Android y en Safari iOS
- [ ] Se puede ubicar a un zombi de oído
- [ ] Ningún sonido cansa a los 10 minutos
- [ ] Todos los sonidos tienen su licencia registrada

---

# FASE 12 — Arte original ⬜

**Objetivo:** reemplazar las cajas grises por la Buenos Aires del documento 01.
Es la fase más larga. Conviene hacerla en el orden de abajo, que es el de mayor
impacto visual por hora de trabajo.

### 12.A — Guía de estilo

| # | Tarea |
|---|---|
| 12.1 | Paleta cerrada: 8 a 12 colores para todo el juego |
| 12.2 | Escena de prueba con una fachada, una vereda, Gus, un zombi y un objeto, para validar escala y estilo juntos |
| 12.3 | Definir resolución de texturas por tipo de objeto |
| 12.4 | Definir nivel de detalle: cuántos polígonos para personaje, prop y edificio |

### 12.B — Gus

| # | Tarea |
|---|---|
| 12.5 | **Completar la ficha:** vistas de frente, perfil, espalda y cuerpo entero (ver documento 02, sección 5) |
| 12.6 | Decidir mochila, guantes y dónde se guardan las armas |
| 12.7 | Modelar o generar, y limpiar en Blender |
| 12.8 | Exagerar los dos rasgos que se leen a distancia: el pelo con volumen y las solapas de la campera |
| 12.9 | Esqueleto compatible con Mixamo, revisando los pesos |
| 12.10 | Animaciones: quieto, caminar, correr, cuchillazo, disparar, recargar, recibir daño, morir, curarse |
| 12.11 | Mezcla entre animaciones para que los cambios no sean bruscos |
| 12.12 | Puntos de anclaje de las armas en la mano |
| 12.13 | Exportar a GLB e integrar, reemplazando la cápsula |

### 12.C — Zombis

| # | Tarea |
|---|---|
| 12.14 | Diseñar el zombi estándar con una silueta claramente distinta de Gus |
| 12.15 | Modelar, riggear y animar: caminar, correr, atacar, recibir daño, morir |
| 12.16 | Dos o tres variantes de ropa y color sobre el mismo modelo |

### 12.D — Armas y objetos

| # | Tarea |
|---|---|
| 12.17 | Cuchillo, pistola y bazooka |
| 12.18 | Botiquín, vendas y caja de munición, con una silueta reconocible a distancia |

### 12.E — La ciudad

| # | Tarea |
|---|---|
| 12.19 | Kit modular: tramos de calle, esquinas, veredas, cruces peatonales |
| 12.20 | Fachadas: puertas, ventanas, balcones, persianas metálicas |
| 12.21 | Mobiliario urbano: postes, semáforos, luminarias, bancos, canteros, árboles |
| 12.22 | Props porteños: kiosco, parada de colectivo, contenedor, bolsas de basura |
| 12.23 | Vehículos: autos y un colectivo abandonado |
| 12.24 | Cartelería en español, con comercios ficticios. **Sin logos reales** |
| 12.25 | Barricadas y escombros |
| 12.26 | Reemplazar las cajas del generador por los módulos, manteniendo las mismas colisiones |
| 12.27 | Repasar la iluminación ahora que hay materiales reales |

### Cómo se prueba

Después de cada grupo (12.B, 12.C, 12.D, 12.E), por separado:

1. ¿La escala es correcta? Gus al lado de una puerta tiene que verse creíble.
2. ¿Se distingue a Gus de los zombis de un vistazo, a distancia de cámara?
3. ¿Los objetos recogibles se distinguen del decorado?
4. **Medir en el teléfono antes y después de cada grupo.** Si los FPS bajan, se
   corrige en el momento, no al final.
5. Mostrarle una captura a alguien que conozca Buenos Aires: ¿se da cuenta de
   dónde es?

### Criterio de salida

- [ ] No quedan cajas grises provisionales
- [ ] El estilo es coherente entre todos los recursos
- [ ] La escala es consistente
- [ ] Los FPS en el teléfono no bajaron respecto a la Fase 9
- [ ] Alguien que conoce Buenos Aires la reconoce
- [ ] Todos los recursos están en el registro de licencias

---

# FASE 13 — Optimización ⬜

**Objetivo:** que ande bien en el teléfono de referencia. **Nada se optimiza sin
una medición previa que lo justifique.**

### Tareas

| # | Tarea |
|---|---|
| 13.1 | Medir el estado actual y **anotar los números de partida** |
| 13.2 | Identificar el cuello de botella real: ¿CPU, GPU, memoria o descarga? |
| 13.3 | Reducir draw calls agrupando geometría estática |
| 13.4 | Usar instanciado para lo que se repite (postes, autos, ventanas) |
| 13.5 | Texturas a KTX2/Basis (ver NOTA-06) |
| 13.6 | Geometría con compresión Draco |
| 13.7 | Revisar las sombras: distancia, resolución, qué proyecta y qué no |
| 13.8 | Niveles de detalle para los modelos lejanos, si hace falta |
| 13.9 | Reutilización de objetos para zombis, proyectiles y partículas |
| 13.10 | Carga progresiva: que se pueda empezar antes de que cargue todo |
| 13.11 | Revisar fugas de memoria tras 10 reinicios seguidos |
| 13.12 | Probar una sesión de 20 minutos: temperatura, batería, degradación |
| 13.13 | Probar en al menos dos teléfonos distintos y dos navegadores |
| 13.14 | Probar con 4G real, no solo con WiFi |

### Cómo se prueba

Contra los presupuestos del documento 02, sección 3:

| Métrica | Objetivo | Medido |
|---|---|---|
| FPS sostenidos | ≥ 30 | |
| Peor frame | < 50 ms | |
| Draw calls | < 150 | |
| Descarga total | < 25 MB | |
| Tiempo hasta jugar en 4G | < 8 s | |

### Criterio de salida

- [ ] Todos los presupuestos se cumplen en el teléfono de referencia
- [ ] 20 minutos de juego sin que se degrade ni se recaliente
- [ ] 10 reinicios seguidos sin que crezca la memoria
- [ ] Funciona en Chrome Android y en Safari iOS

---

# FASE 14 — Publicación de la demo ⬜

**Objetivo:** una URL que se pueda abrir desde cualquier teléfono.

### Tareas

| # | Tarea |
|---|---|
| 14.1 | Elegir dónde alojarla (cualquier hosting de archivos estáticos sirve) |
| 14.2 | Configurar la compresión del servidor |
| 14.3 | Configurar el caché para que la segunda visita cargue rápido |
| 14.4 | Página de inicio con título, descripción y requisitos |
| 14.5 | Verificar que todos los archivos cargan desde la URL publicada |
| 14.6 | Probar desde un teléfono con datos móviles, no con WiFi |
| 14.7 | Probar desde un teléfono que nunca abrió el juego (caché vacía) |
| 14.8 | Revisar que no haya ninguna clave ni credencial en lo publicado |
| 14.9 | Revisar que el registro de licencias esté completo |
| 14.10 | Forma de recibir comentarios de quien la pruebe |
| 14.11 | Etiquetar la versión estable en Git |

### Cómo se prueba

1. Abrir la URL desde cuatro teléfonos distintos.
2. Abrirla con datos móviles y cronometrar la carga.
3. Jugar la misión completa desde la versión publicada.
4. Pedirle a tres personas que la jueguen sin explicarles nada y mirarlas.

### Criterio de salida

- [ ] La URL funciona desde varios teléfonos y navegadores
- [ ] Carga en menos de 8 segundos con datos móviles
- [ ] Tres personas la completaron sin ayuda
- [ ] Hay una versión estable etiquetada

---

# FASE 15 — Ampliación ⏸️

**No se empieza hasta que la Fase 14 esté terminada y la demo haya sido jugada
por gente de verdad.** El documento 01 es muy claro en esto y tiene razón.

Ideas en orden de valor esperado:

| Prioridad | Qué |
|---|---|
| Alta | Más misiones reusando el kit modular (lo más barato por hora) |
| Alta | Zombi lento y resistente, y zombi rápido y frágil |
| Media | Caballito, Almagro y Flores (el kit ya existe) |
| Media | Compañeros, en el orden de NOTA-03 |
| Media | Progresión entre misiones |
| Baja | Ciclo de día y noche |
| Baja | Más armas |
| Muy baja | Multijugador cooperativo |

---

## Apéndice A — Decisiones que se cierran en cada fase

| Fase | Decisión pendiente | Cómo se cierra |
|---|---|---|
| 2 | Velocidad de movimiento | Jugando en el teléfono |
| 4 | Inclinación de cámara (D-02) | Probando 57°, 66° y 75° con zombis, en el teléfono |
| 6 | Cuánto ruido hace la pistola | Si el jugador no duda antes de disparar, es poco |
| 8 | Cantidad de recursos de la misión | Que se pueda terminar sin que sobre |
| 9 | Dificultad general | Con alguien que nunca lo jugó |
| 12 | Nivel de detalle del arte | Midiendo en el teléfono después de cada grupo |

## Apéndice B — Comandos

```bash
npm install          # instalar (una sola vez)
npm run dev          # servidor local → http://localhost:5173
npm run dev:lan      # servidor accesible desde el teléfono en la misma WiFi
npm test             # pruebas unitarias (rápidas, correr siempre)
npm run test:e2e     # pruebas en navegador real
npm run test:all     # todas
npm run build        # versión de producción en dist/
npm run preview      # servir dist/ para probar la versión final
```

**Para probar en el teléfono:** `npm run dev:lan` y abrir desde el celular la
dirección `http://<IP-de-tu-PC>:5173`, con ambos en la misma red WiFi. La IP la
muestra el propio comando.

---

## Apéndice C — Qué hacer cuando algo sale mal

| Síntoma | Primero mirar |
|---|---|
| Pantalla negra | La consola del navegador. Siempre |
| El jugador atraviesa una pared | ¿La caja tiene colisión? ¿El `dt` se disparó? |
| Un zombi se traba | Modo debug de la Fase 4: ver su estado y sus rayos |
| Va lento en el teléfono | F1 → ¿draw calls o tiempo de CPU? No adivinar |
| Anda en la PC y no en el teléfono | Depurar el teléfono por USB con Chrome |
| Se rompió algo que andaba | `npm test` y `npm run test:e2e` |

---

*Este roadmap se corrige a medida que probamos. Cuando una fase resulte distinta
de lo previsto, se reescribe acá y se anota por qué cambió.*
