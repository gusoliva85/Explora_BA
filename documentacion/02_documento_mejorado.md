# Documento 02 — Correcciones, decisiones y vacíos

**Proyecto:** Explorar BA — supervivencia zombi en Buenos Aires para navegador móvil
**Versión:** 1.0 — 24 de octubre de 2026
**Depende de:** `01_documento_inicial.md`
**Continúa en:** `03_roadmap.md`

---

## 0. Para qué sirve este documento

El documento 01 define **qué** queremos hacer y está bien planteado: el alcance
es realista, el orden de etapas es sensato y la regla de "primero una misión
chica que funcione" es la decisión más valiosa de todo el documento.

Este documento 02 **no lo reemplaza ni lo repite**. Hace cuatro cosas:

1. **Resuelve contradicciones** del 01 que, si no se deciden ahora, se
   descubren a mitad de la implementación y obligan a rehacer trabajo.
2. **Completa los vacíos técnicos** que el 01 no cubre y sin los cuales no se
   puede empezar a programar.
3. **Fija números y convenciones** concretas, para no estar inventando valores
   distintos en cada sesión de trabajo.
4. **Deja anotaciones para el futuro** (`NOTA-xx`), que son cosas que hoy no
   hacemos pero que van a aparecer y conviene tener pensadas de antemano.

Las decisiones están numeradas (`D-01`, `D-02`...) para poder citarlas desde el
código y desde el roadmap. **Si una decisión cambia, se actualiza acá**, no en
un comentario suelto de un archivo.

### Cómo leer las prioridades

| Marca | Significado |
|---|---|
| 🔴 **Bloqueante** | Hay que resolverlo antes de escribir el código que lo usa |
| 🟡 **Importante** | No bloquea hoy, pero genera retrabajo si se posterga |
| 🔵 **Futuro** | Anotación consciente; no se hace en la demo |

---

## 1. Contradicciones del documento 01 que hay que resolver

Estas no son errores de redacción: son lugares donde el 01 dice dos cosas
distintas y hay que elegir una.

### 🔴 D-01 — El motor: editor en la nube vs. proyecto local

**La contradicción.** El 01 elige PlayCanvas y describe un flujo de "crear el
proyecto en PlayCanvas" (sección 7.1, etapa 1), que es el **editor en la nube**.
Pero también pide control de versiones con Git desde el inicio (7.8) y una
estructura de carpetas con `codigo/` (sección 14). Y tu pedido es correr todo en
local.

Las tres cosas no conviven bien. El editor en la nube guarda las escenas en un
formato propio en los servidores de PlayCanvas: no se puede versionar en Git de
forma útil, no se puede revisar un cambio línea por línea, no funciona sin
internet y no se puede automatizar.

**La decisión: usar el motor PlayCanvas como biblioteca local.**

PlayCanvas son en realidad dos productos distintos:

| | Editor PlayCanvas (nube) | Motor PlayCanvas (`npm install playcanvas`) |
|---|---|---|
| Dónde vive el proyecto | Servidores de PlayCanvas | Tu disco |
| Escenas | Editor visual, formato propio | Código y archivos de datos |
| Git | No sirve en la práctica | Todo es texto, diff perfecto |
| Internet | Obligatorio | No hace falta |
| Pruebas automáticas | No | Sí |
| Modelos .glb | Igual | Igual |
| Rendimiento final | **Idéntico** | **Idéntico** |

El motor es el mismo, es open source y el rendimiento es exactamente el mismo.
Lo único que se resigna es el editor visual de escenas, que para un grey-box de
cajas no aporta casi nada, y para colocar props sí va a aportar más adelante
(ver `NOTA-01`).

**Consecuencia práctica:** el proyecto es una carpeta normal con `npm`, Vite
como servidor de desarrollo y Git. Se abre con `npm run dev` y se prueba en el
teléfono con `npm run dev:lan` desde la misma red WiFi.

> 🔵 **NOTA-01.** Si más adelante colocar props a mano en código se vuelve
> tedioso, hay dos salidas sin abandonar lo local: (a) armar la escena en
> Blender y exportar un `.glb` que el juego lee como "mapa", o (b) hacer un
> editor mínimo propio dentro del juego (modo debug que deja arrastrar objetos
> y exporta un JSON). La opción (a) es casi siempre la correcta.

---

### 🔴 D-02 — La cámara: "tercera persona, vista cenital"

**La contradicción.** La sección 1 dice *"tercera persona, vista cenital"*. Son
dos cámaras distintas: cenital es mirar desde arriba en picada; tercera persona
es por detrás del hombro. La sección 12 vuelve sobre el tema sin cerrarlo.

**La decisión: cámara inclinada sobre una calle en diagonal, teléfono en
vertical.**

Hay tres piezas en esta decisión, y conviene separarlas:

| Pieza | Decisión | Estado |
|---|---|---|
| **Orientación** | Teléfono **en vertical** | Cerrada (ver D-15) |
| **Trazado en pantalla** | Calle en **diagonal**, de abajo a la derecha hacia arriba a la izquierda | Cerrada |
| **Inclinación** | Entre 57° y 75°; se arranca en **66°** | Abierta hasta la Fase 4 |

**Por qué la diagonal.** Con el teléfono en vertical, una calle dibujada de
abajo hacia arriba desperdicia los costados, y una calle horizontal desperdicia
el alto. La diagonal usa la pantalla entera, deja ver mucho más recorrido hacia
adelante y da una lectura de profundidad que ninguna de las otras dos consigue.
Además resuelve un problema de los pulgares: el centro de la acción queda sobre
la diagonal, y las dos esquinas de abajo —donde van joystick y botones— quedan
fuera de ella.

**Por qué 66° para empezar.** Es el punto donde todavía se ve bastante calle por
delante y ya aparecen las persianas, los toldos y los carteles. Por debajo de
60° la ciudad gana mucho pero se deja de ver lo que viene; por encima de 72° es
al revés.

Lo importante no es el número: es que **el ángulo sea una variable**, no algo
cableado. Está en `src/config/balance.js` (`CAMERA.pitchDegrees`) y se puede
mover con la rueda del mouse mientras se juega, así la decisión definitiva se
toma jugando y no discutiendo.

**Hay mockups de las tres.** En `documentacion/mockup/` están las tres variantes
dibujadas sobre la misma cuadra, con los mismos autos, los mismos zombis y Gus
en el mismo lugar, para que la comparación sea justa:

| Archivo | Qué muestra |
|---|---|
| `mockup/index.html` | Las tres lado a lado, con tabla comparativa |
| `mockup/01_alta.html` | 75°: Gus mide 18 px, se ven 32 m de calle |
| `mockup/02_media.html` | 66°: Gus mide 26 px, se ven 24 m. **Recomendada** |
| `mockup/03_baja.html` | 57°: Gus mide 40 px, se ven 16 m |

Se abren con doble clic, sin servidor. Los PNG están en `mockup/png/` y se
regeneran con `node tools/render-mockups.mjs`.

**Lo que los mockups ya dejaron claro:**

- A 75° las figuras se ven **achatadas**, porque la cámara las mira casi desde
  arriba. No es un defecto del dibujo: es geometría, y pasa igual en el motor.
- A cualquier ángulo, Gus necesita un **anillo ámbar en el piso**. Vestido de
  negro, sobre asfalto nocturno, sin eso el jugador pierde de vista su propio
  personaje. No es decoración, es legibilidad.
- Los carteles de los comercios corren **a lo largo de la diagonal**, así que se
  leen inclinados. Hay que probar en un teléfono real si eso molesta.
- Buenos Aires aparece por **acumulación de detalles chicos**: persianas
  metálicas, toldos a rayas, tanques de agua en las azoteas, baldosas de vereda
  y un colectivo abandonado. Ninguno cuesta casi nada y juntos alcanzan.

**Criterio para cerrarla:** después de la Fase 4 (zombis), probar 57°, 66° y 75°
en el teléfono y elegir. Antes de tener zombis la prueba no sirve, porque el
ángulo se decide por cuánto peligro necesitás ver venir.

### 🔴 D-03 — La bazooka: dos especificaciones incompatibles

**La contradicción.** La sección 1 dice *"dispara al zombi más cercano con un
daño enorme en área"* (apuntado automático). La tabla de la sección 11 dice
*"munición limitada, 1 solo disparo, espera de 30 segundos"*. Y en la sección 1
también se la describe como barra que se carga con el tiempo. Munición limitada
y recarga por tiempo son dos sistemas distintos.

**La decisión: barra de tiempo, apuntado automático, sin munición.**

| Propiedad | Valor inicial |
|---|---|
| Disponibilidad | Barra que se llena en **30 s** |
| Munición | Ninguna. No se recoge, no se agota |
| Apuntado | Automático al zombi más cercano dentro de 40 m |
| Daño directo | 250 |
| Daño en el borde del área | ~~60~~ → **35**, interpolando hacia el centro |
| Radio de explosión | 6 m |
| Ruido generado | 45 m (es lo que la vuelve una decisión y no un botón gratis) |

El motivo de elegir barra en vez de munición: una bazooka con munición es un
recurso que el jugador **acapara y nunca usa** por miedo a desperdiciarla. Una
barra que se llena sola es un recurso que **obliga a decidir cuándo gastarla**,
que es mucho más interesante y además es mucho más fácil de balancear.

El apuntado automático está bien resuelto en móvil: apuntar a mano con el dedo
en una pantalla chica es frustrante y es justo lo que el 01 quería evitar.

**Corregido al implementarla (Fase 7).** Dos cosas de esta tabla estaban mal:

1. **El daño de borde eran 60, que es exactamente la vida de un zombi
   estándar.** O sea que todo lo que entraba en el radio moría, incluido el
   que apenas lo rozaba: la bazooka era un botón de borrar pantalla y
   apuntarla no era una habilidad. Peor: la prueba a mano de la propia Fase 7
   pedía lo contrario ("un zombi en el borde sobrevive con poca vida"), así
   que los dos números se contradecían. Bajado a **35**.
2. **Faltaba exigir línea de vista** en el apuntado automático. Sin ella el
   arma elegiría un zombi del otro lado de una persiana, el cohete reventaría
   contra la pared a dos metros del jugador y la explosión de seis metros se
   lo llevaría puesto.

Y una decisión que la tabla no cubría: **el cohete no persigue**. El apuntado
es automático, pero una vez que sale vuela derecho. Si persiguiera, el segundo
y medio de vuelo no costaría nada y el arma volvería a ser "apretar para
matar".

---

### 🟡 D-04 — La geografía: Independencia 3250 → Billinghurst 240

**El problema.** Las direcciones son reales y están bien elegidas
temáticamente, pero **la distancia real entre esos dos puntos es de varios
kilómetros**, atravesando varios barrios. Construir eso a escala es exactamente
el mundo abierto que el 01 descarta en su propia sección 3.

Además, Billinghurst al 240 **no queda en Boedo**: cae del lado de
Almagro/Balvanera. Conviene verificarlo en un mapa antes de escribir cartelería
en el juego, porque si el barrio no coincide con lo que dice el cartel, cualquier
porteño que lo juegue lo va a notar.

**La decisión: la ruta es simbólica, no está a escala.**

El recorrido se **comprime a unos 350 metros jugables** divididos en tres
tramos, uno por cada control intermedio. Los nombres de las calles y las
alturas se conservan como cartelería y texto de objetivo, porque ahí está el
valor emocional, pero la geometría es un pasillo legible, no un mapa.

Esto es lo que hacen todos los juegos ambientados en ciudades reales. Nadie
camina los 40 minutos que tomaría el recorrido real.

> 🔵 **NOTA-02.** Si en algún momento querés la escala real, el camino no es
> modelarla a mano: es traer la traza de calles desde OpenStreetMap y generar
> las manzanas por código. Eso recién tiene sentido con varias misiones
> funcionando, y hay que revisar la licencia de OSM (ODbL, exige atribución).

---

### 🟡 D-05 — La escopeta fantasma

**El problema.** El set de armas definido en la sección 1 es
pistola / cuchillo / bazooka. Pero la sección 3 pide *"un arma de fuego sencilla
o escopeta de prueba"* y la sección 11 explica el sistema de ruido diciendo *"el
disparo de la escopeta puede emitir un evento de ruido"*. La escopeta quedó de
una versión anterior del documento.

**La decisión: no hay escopeta.** El sistema de ruido pasa a la pistola, que es
exactamente el mismo mecanismo y la misma decisión táctica: resolvés un problema
ahora y te creás otro en diez segundos.

| Arma | Ruido que genera |
|---|---|
| Cuchillo | 2 m (silencioso: esa es su ventaja real) |
| Pistola | 22 m |
| Bazooka | 45 m |

Esto convierte al cuchillo en una opción válida y no en "el arma de cuando te
quedaste sin balas", que es el error de diseño más común en este género.

---

### 🟡 D-06 — El escuadrón que aparece y desaparece

**El problema.** La sección 2 dice que el protagonista *"necesita atravesar
calles bloqueadas para alcanzar a sus amigos e ir agrandando el escuadrón"*.
Eso es un sistema de compañeros con IA, que es uno de los sistemas más caros de
hacer bien, y **no aparece en ninguna otra parte del documento**: no está en el
alcance, no está en las etapas, no está en los criterios de terminado.

**La decisión: fuera de la demo, pero la historia se mantiene.**

La narrativa de "ir a buscar a los amigos" se conserva como **motivo** de las
misiones: la Misión 001 es llegar a la comisaría, y lo que te espera ahí es el
primer amigo. Pero el amigo no camina con vos ni pelea todavía.

> 🔵 **NOTA-03.** Cuando llegue el momento del escuadrón, el orden barato es:
> (1) el compañero existe y te sigue, sin pelear; (2) pelea pero es invulnerable;
> (3) puede morir. Saltar directo al (3) genera el problema de que el jugador
> pierde la misión por culpa de la IA, que se siente injusto. Además cada
> compañero multiplica el coste de IA en el teléfono, así que el tope razonable
> en móvil son 2 compañeros, no un escuadrón grande.

---

### 🔴 D-16 — El juego transcurre de **día**, no de noche

**El problema.** El documento 01 pide una estética *"oscura y atmosférica"*
(sección 6) y habla de calles con poca visibilidad. Se implementó así: noche
cerrada, faroles de sodio, contraste fuerte. Se veía bien en una captura y
**era injugable en un teléfono**.

**Por qué no funcionaba.** Un celular se usa de día, muchas veces en la
calle, con el brillo a la mitad para ahorrar batería y con reflejos en la
pantalla. Todo lo que en el monitor era "atmósfera" ahí era, simplemente, no
ver. Y obligar al jugador a esforzarse para distinguir un zombi de un
contenedor no genera tensión: genera que deje de jugar.

**La decisión: mediodía, low-poly claro.**

| | Qué |
|---|---|
| **Hora** | Mediodía, sol alto a 73° |
| **Paleta** | Colores francos pero algo apagados, nunca saturados al máximo |
| **Acabado** | Mate. Nada de brillo salvo chapa y persianas |
| **Definición** | Viene del contraste entre planos y de la oclusión ambiental, no del detalle |
| **Sombras** | Sí, y son la herramienta principal: una sombra nítida apoya el objeto en el piso |

Tres cosas que salieron de implementarlo y conviene no volver a aprender:

1. **La elevación del sol es el número más sensible de todo el render.** A
   58° un edificio de 17 m proyecta casi 11 m de sombra, y como la calzada
   mide 10, la cubría entera. A 73° la sombra baja a 5 m y la calle queda
   despejada.
2. **La luz ambiente tiñe todo.** Con un azul de cielo franco, el asfalto
   gris se veía azul marino. Su saturación se nota mucho más que la de
   cualquier material.
3. **Los albedos hay que calibrarlos con la luz puesta.** Los mismos colores
   que funcionaban de noche salían blancos quemados de día.

> 🔵 **NOTA-10.** La noche no se descarta para siempre: los faroles quedaron
> construidos como mobiliario urbano y volver a encenderlos es cambiar un
> parámetro. Una misión nocturna, puntual y diseñada para eso, puede ser un
> recurso fuerte más adelante. Lo que se descarta es que la noche sea el
> estado por defecto.

### 🔵 D-07 — La referencia "Pueblo"

La sección 5 del 01 dice: *"la referencia 'Pueblo' debe confirmarse antes de
fijar un barrio o zona concreta"*. No hay ninguna otra mención a "Pueblo" en todo
el documento. Es probable que sea un resto de una versión anterior.

**La decisión: se descarta.** Los barrios son Boedo (misión 001), y después
Caballito, Almagro y Flores, como ya dice la tabla de la sección 5. Si "Pueblo"
significaba algo, hay que anotarlo acá antes de la Fase 3.

---

## 2. Vacíos bloqueantes: lo que falta para poder programar

El documento 01 describe muy bien el juego pero deja sin definir cosas sin las
cuales no se puede escribir la primera línea. Van acá, resueltas.

### 🔴 D-08 — Entrada: teclado y táctil a la vez

**Lo que falta en el 01.** La sección 12 define controles táctiles, y está bien
pensada. Pero el 01 nunca dice cómo se prueba el juego **durante el desarrollo**.
Si los controles son solo táctiles, cada prueba exige levantar el servidor,
buscar la IP, agarrar el teléfono y abrirlo. Eso son 30 segundos cada vez que
querés ver si un cambio anduvo, y es la diferencia entre probar 200 veces por
día y probar 20.

**La decisión: una capa de entrada abstracta, con teclado de primera clase.**

El juego nunca pregunta "¿hay dedo o hay teclado?". Lee un vector de movimiento,
un delta de cámara y unos botones. Quién los llenó es problema de la capa de
entrada.

| Acción | Teclado/mouse | Táctil |
|---|---|---|
| Mover | WASD / flechas | Joystick (mitad izquierda, aparece donde apoyás) |
| Cámara | Arrastrar mouse / rueda para zoom | Arrastrar (mitad derecha) |
| Atacar | Click izquierdo / Espacio | Botón grande abajo a la derecha |
| Correr | Shift | Botón |
| Interactuar | E | Botón contextual (solo aparece si hay algo cerca) |
| Curarse | R | Botón |
| Cambiar arma | Q | Botón |
| Pausa | Esc | Botón arriba a la derecha |
| Diagnóstico | F1 | Tres dedos |

**Detalle que importa:** cada dedo queda "dueño" de su mitad de la pantalla.
Sin eso, mover y mirar a la vez se pisan, que es el defecto número uno de los
controles táctiles y está mencionado al pasar en el 01 sin decir cómo evitarlo.

#### Cómo se detecta que estamos en un celular

**Lo que falta en el 01.** No se menciona. Y es necesario: el juego tiene que
mostrar botones táctiles en el teléfono y ayudas de teclado en la computadora,
sin que el jugador configure nada.

**La decisión: no se usa el user agent.** Ese texto miente, cambia solo y no
sabe nada de una notebook con pantalla táctil ni de un celular con teclado
bluetooth. La pregunta correcta no es "¿qué dispositivo es?" sino **"¿cuál es la
forma principal de tocar esta pantalla?"**, y eso sí se puede medir:

| Señal | Qué dice |
|---|---|
| `pointer: coarse` | El puntero principal es grueso: un dedo |
| `hover: none` | No se puede pasar por encima sin tocar |
| Ancho de pantalla | Descarta tablets grandes y pantallas táctiles de escritorio |

Con dos de las tres señales alcanza para entrar en modo celular. Si cambian
—girás el teléfono, enchufás un mouse, redimensionás la ventana— se vuelve a
evaluar y el HUD se reacomoda **sin recargar la página**.

**Los dos esquemas escuchan siempre.** Lo que decide el modo no es qué entradas
se leen, sino qué controles se **dibujan**. Una notebook con pantalla táctil
puede usar los dos a la vez, y funciona.

**Para probar sin levantar el teléfono:** `?input=touch` en la URL fuerza los
controles táctiles en la computadora, y hay un botón en el menú de pausa que
alterna entre los dos. Es la diferencia entre revisar el HUD de celular veinte
veces por día o tres.

---

### 🔴 D-09 — Física: no usar un motor de física

**Lo que falta en el 01.** La sección 10 pide colisiones pero no dice con qué.
En PlayCanvas, la respuesta por defecto sería Ammo.js (un port de Bullet a
WebAssembly). Vale la pena no hacerlo.

**La decisión: controlador cinemático con colisión círculo-contra-rectángulo.**

Motivos concretos, no de preferencia:

1. **El escenario es una ciudad.** Son paredes verticales sobre suelo plano.
   Un motor de física 3D completo resuelve un problema que no tenemos.
2. **Ammo.js son ~1,5 MB de WebAssembly** que hay que descargar y compilar antes
   de que arranque el juego. En un teléfono de gama media con 4G eso es tiempo
   de carga regalado, y el 01 pide explícitamente "mantener la carga inicial
   ligera".
3. **Es determinista.** Con física real, el mismo input dos veces puede dar
   resultados distintos. Sin ella, una prueba automática que dice "el jugador no
   atraviesa la pared" vale algo.
4. **Se depura.** Cuando el jugador se traba en una esquina, con un motor de
   física el problema está adentro de una caja negra en WebAssembly. Acá está
   en 40 líneas de JavaScript que podés leer.

> 🔵 **NOTA-04.** Esto no cierra la puerta a la física. Si algún día querés
> ragdolls al morir un zombi, escombros que vuelan con la bazooka o un auto que
> se mueve al chocarlo, se agrega Ammo.js **solo para esos objetos decorativos**,
> sin tocar el movimiento del jugador ni de los zombis. Es lo que hacen casi
> todos los juegos del género.

**Trampa conocida, ya resuelta:** si el desplazamiento de un frame es mayor que
el radio del personaje, el círculo aparece del otro lado de la pared sin haber
tocado nada (*tunneling*). Pasa con un frame largo, un cambio de pestaña o un
empujón de la bazooka. La solución es subdividir el movimiento en pasos menores
al radio. Esto no es teórico: apareció al escribir las pruebas y hay un test que
lo cubre.

---

### 🔴 D-10 — Navegación de los zombis

**Lo que falta en el 01.** La sección 10 dice que la IA puede usar *"distancia
de detección y una comprobación simple de línea de visión"*. Eso alcanza para
detectar, pero **no para moverse**. Un zombi que camina en línea recta hacia el
jugador se clava contra la primera pared y se queda ahí temblando. Es el bug que
más arruina la sensación de un juego de zombis.

**La decisión: dirección + evasión de obstáculos, sin navmesh completo.**

El zombi combina tres fuerzas:

1. **Perseguir:** dirección hacia el objetivo.
2. **Esquivar:** tres rayos hacia adelante (centro, 30° izquierda, 30° derecha);
   si el del centro choca, gira hacia el lado libre.
3. **Separarse:** empuje suave contra los otros zombis cercanos, para que no se
   apilen todos en el mismo punto.

Esto es barato (tres rayos por zombi por frame, con un tope de 12 zombis activos)
y funciona bien en calles, que es un entorno de pasillos sin laberintos.

> 🔵 **NOTA-05.** Si al llegar a un mapa con patios interiores o callejones sin
> salida los zombis empiezan a trabarse, la solución es una grilla de
> navegación de 2×2 m con A\*, calculada una vez al cargar el mapa. No hace falta
> antes. La señal de que hace falta es ver un zombi dar vueltas contra una
> esquina en vez de rodearla.

---

### 🔴 D-11 — Independencia del framerate

**Lo que falta en el 01.** No se menciona en ningún lado. Es invisible hasta que
rompe todo.

Si el movimiento se programa como "sumar 0,1 a la posición por frame", el
personaje camina al doble de velocidad en un monitor de 120 Hz que en un
teléfono a 60, y el juego es literalmente otro juego según el dispositivo. El 01
pide probar en teléfono real desde el principio, lo que hace que esto aparezca
enseguida.

**La decisión:**

- **Todo** se multiplica por el tiempo del frame (`dt`). Sin excepciones.
- Los suavizados (cámara, aceleración) usan interpolación exponencial, no un
  factor fijo por frame, para que se sientan igual a 30 y a 120 FPS.
- **Techo de `dt` en 1/15 de segundo.** Si el navegador se congela 3 segundos
  (cambio de pestaña, una llamada entrante, un pico de recolección de basura), el
  siguiente frame no debe simular 3 segundos de golpe: eso teletransporta al
  jugador a través de las paredes y hace que los zombis lo maten sin que llegue
  a ver nada.
- **Pausa automática** al perder el foco de la pestaña.

---

### 🟡 D-12 — Aleatoriedad con semilla

**Lo que falta en el 01.** No se menciona.

Si el mapa, la distribución de objetos o los zombis usan `Math.random()`,
entonces cada partida es distinta, y eso significa que:

- un bug que viste una vez puede no volver a aparecer nunca;
- no podés comparar "antes y después" de un cambio de balance;
- el juego se comporta distinto en tu PC y en tu teléfono.

**La decisión: todo lo aleatorio sale de un generador con semilla.** La semilla
vive en la definición de la misión. `Math.random()` queda prohibido en código de
juego. Con la misma semilla, el mapa sale idéntico siempre.

---

### 🟡 D-13 — La interfaz: DOM, no el sistema de UI del motor

**Lo que falta en el 01.** La sección 10 menciona un `UIManager` y la 12 define
el layout, pero no dice con qué se dibuja.

**La decisión: HTML y CSS sobre el canvas.** El texto se ve nítido en cualquier
pantalla sin pelear con atlas de fuentes, `env(safe-area-inset-*)` resuelve el
notch del iPhone en una línea, y se puede rediseñar el HUD entero sin tocar una
línea de lógica de juego.

Lo único que conviene dibujar dentro del motor 3D son los indicadores que viven
en el mundo: el marcador de destino, el resplandor de un objeto recogible, la
flecha que apunta al objetivo.

---

### 🟡 D-14 — Guardado local

**Lo que falta en el 01.** La sección 3 pone "cuentas y guardado en la nube"
fuera de alcance, lo cual está bien, pero no dice nada de guardado local. Sin
él, cada vez que el jugador cierra la pestaña pierde todo, incluidos los ajustes
de sensibilidad que acaba de configurar.

**La decisión: `localStorage` para tres cosas**, nada más:

1. Ajustes (sensibilidad de cámara, volumen, ángulo de cámara elegido).
2. Último control alcanzado en la misión en curso.
3. Mejor tiempo por misión.

No se guarda el estado del mundo (qué objetos quedaron, dónde estaban los
zombis). Esa complejidad no se paga sola en una demo.

---

### 🔴 D-15 — Orientación de pantalla: **vertical**

**Lo que decía el 01.** La sección 12 propone "empezar en horizontal" y advierte
correctamente que hay que verificar el comportamiento.

**La decisión: el juego se diseña para el teléfono EN VERTICAL.**

Esto cambia respecto de lo que proponía el 01, y es un cambio de fondo, no de
detalle. Las razones:

1. **Es como se agarra un teléfono.** Un juego de navegador que se abre desde un
   enlace se juega en el momento, muchas veces con una sola mano. Pedir que lo
   giren es pedir una decisión antes de empezar a jugar.
2. **La diagonal necesita alto.** Con la calle cruzando en diagonal (D-02), una
   pantalla vertical muestra bastante más recorrido hacia adelante que una
   horizontal.
3. **Los pulgares caen en las esquinas de abajo.** En vertical, joystick y
   botones quedan naturalmente separados y el tercio central —donde pasa la
   acción— queda libre de dedos.
4. **No se puede forzar la orientación igual.** La API para bloquearla solo
   funciona en pantalla completa, y en Safari de iOS directamente no está. Si no
   se puede imponer horizontal, mejor diseñar para lo que el teléfono hace solo.

**Horizontal sigue funcionando.** El juego se adapta: se ve más calle a lo ancho
y el HUD se reacomoda. Simplemente no es la orientación para la que se diseña, y
**no hay ningún cartel pidiendo girar el teléfono**.

> **Consecuencia ya aplicada al código:** se sacó el aviso de rotación, el HUD
> tiene una variante para vertical con botones más chicos, y `device.js` marca
> el `<body>` con `is-portrait` para que el CSS reacomode todo sin que ningún
> JavaScript toque estilos.

---

## 3. Vacíos importantes: lo que hay que planificar

### 🟡 Presupuestos medibles

El 01 dice, con razón, que *"no existe un límite universal de polígonos"* y que
hay que medir. Pero no define **contra qué** se mide. Sin un número objetivo,
"anda bien" es una opinión.

**Teléfono de referencia (hay que elegir uno concreto y anotarlo acá):**

```
Modelo:     ___________________  ← completar con tu teléfono real
Año:        ___________________
Navegador:  ___________________
```

Elegí el teléfono más modesto que querés que corra el juego, no el mejor que
tenés. Si anda ahí, anda en todos.

**Presupuestos iniciales** (son hipótesis para validar, no leyes):

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| FPS sostenidos | ≥ 30, estables | Overlay de diagnóstico, con zombis activos |
| Peor frame | < 50 ms | Overlay: un tirón se nota más que un FPS bajo parejo |
| Draw calls | < 150 | Overlay |
| Descarga total | < 25 MB | Pestaña Red del navegador |
| Tiempo hasta jugar | < 8 s en 4G | Cronómetro, con caché vacía |
| Zombis activos | ≤ 12 | Constante de configuración |
| Luces con sombra | 1 | Solo la direccional |

**Dato medido hoy:** el motor PlayCanvas completo pesa 2,07 MB sin comprimir y
526 KB comprimido con gzip. Eso entra holgado en el presupuesto, pero conviene
no olvidarlo cuando se sumen los modelos.

> 🔵 **NOTA-06.** Si la descarga se vuelve un problema, el orden de ataque es:
> (1) texturas a KTX2/Basis, que suele ser el 70 % del peso; (2) geometría con
> compresión Draco; (3) recortar el motor sacando los módulos que no usamos.
> Empezar por el tercero es el error típico: da poco y cuesta mucho.

---

### 🟡 Herramientas de diagnóstico

**Lo que falta en el 01.** Pide probar en el teléfono desde el principio pero no
dice con qué herramientas. Probar en un teléfono sin instrumentación es probar a
ciegas: "lo siento lento" no se puede arreglar.

**Lo que hace falta desde el primer día:**

| Herramienta | Para qué | Cómo se activa |
|---|---|---|
| Overlay de métricas | FPS, peor frame, draw calls, tiempo de CPU | F1 / tres dedos |
| Posición en pantalla | Saber dónde se trabó el jugador y reproducirlo | En el overlay |
| Consola del navegador | Teletransportarse, darse vida, cambiar balance en vivo | `game.*` desde la consola |
| Pruebas unitarias | Que un cambio no rompa colisiones o la misión | `npm test` |
| Prueba de humo | Que el juego arranque sin errores | Navegador automatizado |

**Lo más importante de la lista es la última.** Un juego se rompe de una forma
particular: un error en consola que nadie ve, la pantalla queda negra y no sabés
cuál de los últimos diez cambios fue. Una prueba que abre el juego, le da a
"empezar", camina y verifica que no hubo ni un error en consola, encuentra eso
en 2 segundos.

---

### 🟡 Audio

**Lo que falta en el 01.** La sección 10 lista un `AudioManager`, la 15
menciona *"restricciones del navegador para audio automático"*, y ahí termina.
No hay plan de audio.

**Lo que hay que saber antes de llegar ahí:**

1. **Ningún navegador reproduce audio hasta que el usuario toca la pantalla.**
   Por eso el juego tiene una pantalla de "TOCAR PARA EMPEZAR": no es estética,
   es el gesto que habilita el audio. Ya está implementada.
2. **El audio posicional es la mejor inversión del proyecto.** Escuchar un
   gruñido a tu izquierda sin verlo hace más por la tensión que cualquier
   efecto visual, y cuesta mucho menos rendimiento.
3. **Los sonidos cortos van todos en un archivo.** Veinte archivos chicos son
   veinte pedidos al servidor.

**Sonidos mínimos de la demo (14):** pasos caminando, pasos corriendo, gruñido
de zombi en reposo, gruñido al detectar, ataque de zombi, impacto recibido,
cuchillazo al aire, cuchillazo con impacto, disparo de pistola, recarga, clic sin
munición, bazooka, explosión, recoger objeto.

---

### 🟡 Los textos del juego

**Lo que falta en el 01.** No se menciona.

**La decisión:** todos los textos visibles viven en un único archivo, en español
rioplatense (voseo: "llegá", "avanzá", "tenés"). No porque haya plan de
traducirlo, sino porque tener los textos juntos permite revisar el tono de una
sola pasada y evita el "Objetivo: Llegar" en una pantalla y "Objetivo: llegá" en
otra.

---

### 🟡 Escala y convenciones

**Lo que falta en el 01.** La sección 9 pide definir *"escala de puertas y
veredas"* pero no la define. Sin esto, el primer modelo que venga de Meshy va a
venir en una escala arbitraria y el segundo en otra.

**La decisión — 1 unidad = 1 metro:**

| Elemento | Medida |
|---|---|
| Altura de Gus | 1,80 m |
| Radio de colisión del jugador | 0,35 m |
| Altura de puerta | 2,10 m ← **la referencia para todo el arte** |
| Ancho de calzada | 10 m |
| Ancho de vereda | 3 m |
| Alto de cordón | 0,15 m |
| Largo de cuadra | 100 m |
| Planta baja de un edificio | 3,2 m |

**Ejes:** X este-oeste, Z norte-sur (−Z es "al norte"), Y arriba. Los modelos se
exportan mirando hacia −Z, con el origen entre los pies.

**Nomenclatura de archivos de arte:** la del 01 (`CHR_`, `WPN_`, `ITM_`, `ENV_`)
está bien y se mantiene. Falta la del código: archivos en `camelCase.js`, clases
en `PascalCase`, constantes de balance en `MAYUSCULAS`.

---

### 🟡 Valores de balance iniciales

**Lo que falta en el 01.** Dice correctamente que los valores *"deben
establecerse mediante pruebas"*. Pero una prueba necesita un punto de partida: no
se puede ajustar la nada.

Están todos en un solo archivo (`src/config/balance.js`) y **ningún sistema tiene
números adentro**. Resumen de los que más importan:

| Qué | Valor inicial | Por qué ese |
|---|---|---|
| Vida de Gus | 100 | Número redondo, fácil de leer en porcentaje |
| Velocidad caminando | 3,2 m/s | Un poco más que una persona real; caminar lento aburre |
| Velocidad corriendo | 6,0 m/s | 1,9× caminar: se nota la diferencia sin marear |
| Vida del zombi estándar | 60 | Dos tiros de pistola o un cuchillazo largo |
| Velocidad del zombi persiguiendo | 2,9 m/s | **Más lento que Gus caminando** |
| Daño del zombi | 12 | Hacen falta ~8 mordidas para morir: hay margen para escapar |
| Detección del zombi | 16 m con línea de vista | Te ve antes de que lo alcances con la pistola |
| Daño del cuchillo | 45 | Dos golpes por zombi |
| Daño de la pistola | 34 | Dos tiros por zombi |
| Cargador de la pistola | 12 balas | Seis zombis por cargador si no errás |

**La decisión de diseño más importante de la tabla: el zombi corriendo es más
lento que vos caminando.** Eso hace que huir sea siempre una opción viable, que
es el pilar de "decisiones rápidas" del 01. Si el zombi fuera más rápido, el
juego sería de combate obligatorio y no de decisiones. Cuando aparezca el zombi
rápido, será una excepción que asusta justamente porque rompe esa regla.

---

## 4. Revisión de las herramientas del documento 01

El 01 lista siete herramientas. No todas aportan lo mismo.

| Herramienta | Veredicto | Cuándo |
|---|---|---|
| **PlayCanvas (motor)** | ✅ Sí, como biblioteca local (D-01) | Ya |
| **Blender** | ✅ Imprescindible | Fase 11 |
| **Mixamo** | ✅ Sí, con cuidado | Fase 11 |
| **Meshy** | ⚠️ Opcional, conviene probarlo barato | Fase 11 |
| **SuperSplat** | ❌ No | — |
| **gsplat** | ❌ No | — |
| **CesiumJS** | ❌ No | — |
| **Git + GitHub** | ✅ Sí, desde el día uno | Ya |

**Sobre Mixamo:** es la mejor relación esfuerzo/resultado del proyecto, pero el
esqueleto que genera (65 huesos) es más de lo que necesita un juego móvil, y
cada animación descargada trae el personaje entero. Hay que descargar "sin
piel" y reutilizar un solo esqueleto. También hay que verificar las condiciones
de uso vigentes de Adobe, que el 01 señala bien.

**Sobre Meshy:** la advertencia del 01 es correcta y conviene subrayarla. Lo que
devuelve una herramienta de imagen a 3D es una malla con topología desordenada,
que **no se puede animar sin rehacerla**. Para props estáticos (un kiosco, un
contenedor) puede ahorrar tiempo. Para Gus, es probable que limpiar lo generado
cueste más que modelarlo en low-poly desde cero. **Conviene probarlo con un
objeto simple antes de depender de él**, y revisar la licencia de uso comercial.

**Sobre Gaussian Splatting (SuperSplat y gsplat):** el 01 ya los posterga, y hace
bien, pero conviene ser más tajante. Un splat es una nube de puntos: se ve
fotorrealista y **no tiene superficie**. No podés colisionar contra él, no
proyecta sombras, no se ilumina, y pesa muchísimo. Son incompatibles con el
estilo low-poly elegido y con el presupuesto móvil. No es "para después": es para
otro proyecto.

**Sobre CesiumJS:** es para globos terráqueos y datos geoespaciales. Con la
decisión D-04 (ruta comprimida, no a escala), no tiene nada que aportar.

> 🔵 **NOTA-07.** Hay un hueco en la lista del 01: falta la herramienta de
> **audio**. Para la demo alcanza con Audacity (gratis) para recortar y
> normalizar, y bancos de sonido con licencia permisiva como Freesound (revisar
> licencia uno por uno) o sonidos propios grabados con el teléfono.

---

## 5. Gus: lo que falta para poder modelarlo

El 01 adjunta la referencia en `documentacion/personajes/Gus.jpeg`. La imagen
define bien la identidad del personaje, pero **no alcanza para generar un modelo
3D**, y conviene saberlo antes de intentarlo.

**Lo que la referencia define bien:**

| Rasgo | Descripción |
|---|---|
| Pelo | Oscuro, corto a los costados, con volumen y puntas hacia arriba |
| Cara | Barba de pocos días, mandíbula marcada, cejas gruesas |
| Torso | Remera negra lisa, cuello redondo |
| Abrigo | Campera de cuero negra tipo motociclista, solapas anchas, cierre en diagonal, bolsillo con cierre en el pecho |
| Piernas | Jean azul oscuro |
| Paleta | Negro dominante, jean azul, piel cálida. Alto contraste |

**Lo que falta y bloquea el modelado (🔴):**

1. **Vista de cuerpo entero.** La referencia corta a la altura del muslo. No se
   ve calzado, ni la proporción real de las piernas.
2. **Vista de frente exacta.** La actual está en tres cuartos, que es buena para
   el estilo pero mala para deducir proporciones simétricas.
3. **Vista de espalda.** Toda la espalda de la campera es invención.
4. **Vista de perfil.** El volumen del pelo y el grosor de la campera no se
   pueden deducir.
5. **Pose neutral (brazos separados del torso).** En la referencia, una mano
   está en el bolsillo. Para preparar un esqueleto hace falta una pose en T o en
   A, con los brazos despegados del cuerpo.

**Lo que hay que decidir (🟡):**

- **¿Qué lleva encima?** El 01 habla de mochila y guantes. La referencia no
  tiene ninguno de los dos. Si Gus lleva mochila, hay que dibujarla.
- **¿Dónde se guardan las armas cuando no están equipadas?** Una pistola en la
  cintura y un cuchillo en la bota se ven y suman mucho. Una bazooka a la
  espalda cambia la silueta por completo.
- **¿Cuánto detalle facial?** A la distancia de cámara elegida (9,5 m, 58°), la
  cara de Gus ocupa unos pocos píxeles. La barba de pocos días de la referencia
  **no se va a ver**. Lo que sí se lee desde esa distancia es la silueta: el
  pelo con volumen y las solapas de la campera. Esos son los dos rasgos que hay
  que exagerar en el modelo low-poly.

> ⚠️ **Sobre la licencia de la referencia.** La imagen parece generada con IA. Si
> fue así, conviene anotar con qué herramienta y bajo qué condiciones, en el
> registro de recursos que pide la sección 14 del 01. Esto importa si en algún
> momento el juego se distribuye.

> 🔵 **NOTA-08.** Cuando llegue la Fase 11, el orden barato es: primero un Gus
> low-poly feo pero con la silueta correcta y animado; después se mejora el
> modelo. Un personaje con buenas animaciones y mal modelo se ve mucho mejor en
> movimiento que uno con buen modelo y animaciones rígidas.

---

## 6. Riesgos que el documento 01 no lista

La tabla de riesgos de la sección 16 está bien. Le faltan cuatro.

| Riesgo | Por qué pasa | Mitigación |
|---|---|---|
| **Quedarse en el grey-box para siempre** | Las cajas grises funcionan, nunca "urge" reemplazarlas, y el proyecto se vuelve aburrido de mirar | Poner la Fase 11 (arte) con fecha, no "cuando esté todo lo demás" |
| **Balancear en la PC** | Con teclado y mouse todo es más fácil; los números quedan calibrados para un jugador que no existe | Todo cambio de balance se confirma en el teléfono antes de darlo por bueno |
| **Acumular sistemas a medio terminar** | Es tentador empezar el inventario antes de terminar el combate | Ninguna fase arranca sin que la anterior pase su criterio de salida |
| **Optimizar antes de tiempo** | Dedicar tres días a bajar polígonos cuando el cuello de botella eran las sombras | Nada se optimiza sin una medición previa que lo señale |

---

## 7. Resumen de decisiones

| # | Decisión | Prioridad |
|---|---|---|
| D-01 | Motor PlayCanvas como biblioteca local (npm + Vite + Git), no el editor en la nube | 🔴 |
| D-02 | Teléfono vertical, calle en diagonal, cámara a 66°; el ángulo se cierra tras la Fase 4 | 🔴 |
| D-03 | Bazooka con barra de 30 s, apuntado automático, sin munición | 🔴 |
| D-04 | Ruta comprimida a ~350 m; las direcciones son simbólicas, no están a escala | 🟡 |
| D-05 | No hay escopeta; el ruido pasa a la pistola | 🟡 |
| D-06 | El escuadrón queda fuera de la demo; la historia se mantiene | 🟡 |
| D-07 | Se descarta la referencia "Pueblo" | 🔵 |
| D-08 | Capa de entrada abstracta; el modo celular se detecta por capacidades, nunca por user agent | 🔴 |
| D-09 | Sin motor de física: controlador cinemático y colisión 2D | 🔴 |
| D-10 | Zombis con dirección + evasión por rayos, sin navmesh | 🔴 |
| D-11 | Todo por `dt`, con techo de 1/15 s y pausa al perder foco | 🔴 |
| D-12 | Aleatoriedad con semilla; `Math.random()` prohibido | 🟡 |
| D-13 | Interfaz en HTML/CSS sobre el canvas | 🟡 |
| D-14 | `localStorage` para ajustes, último control y mejor tiempo | 🟡 |
| D-15 | **Vertical** es la orientación de diseño; horizontal se adapta y no se avisa nada | 🔴 |
| D-16 | El juego transcurre **de día**, con estética low-poly clara y mate | 🔴 |
| D-17 | **Un solo convenio de ángulos**, en `core/rumbo.js`: rumbo 0 mira a `-Z`. Ningún `atan2` de rumbos fuera de ahí | 🔴 |
| D-18 | Ningún destello dura menos que el techo de `dt`, o puede no dibujarse nunca | 🟡 |

---

### 🔴 D-17 — Un solo convenio de ángulos, y vive en un solo archivo

**El problema.** Durante cinco fases convivieron **dos convenios de rumbo
opuestos**, y ninguno estaba escrito en ningún lado.

- La cámara, las misiones y todos los modelos usaban `rumbo 0 = mirar
  hacia -Z`. No es una elección: es lo que impone PlayCanvas, porque
  `setEulerAngles(0, g, 0)` apunta el frente local de la entidad —que es
  `-Z`— hacia ese rumbo.
- El cerebro del zombi y el arma usaban el contrario, `atan2(dx, dz)`,
  donde el rumbo 0 mira hacia `+Z`.

Cada uno era **coherente consigo mismo**, así que los dos funcionaban por
separado y sus pruebas pasaban. El error aparecía sólo en el cruce: cuando
el arma recibía el rumbo del jugador y lo comparaba con el suyo, había 180°
de diferencia exactos. **El cuchillo golpeaba para atrás.** El zombi tenía
el mismo problema sin que nadie lo notara: su cuerpo apuntaba al revés de
donde caminaba, o sea que perseguía de espaldas, con los brazos hacia el
lado opuesto. Desde veinte metros de cámara cenital casi no se ve.

**La decisión.** Existe `src/core/rumbo.js`, define el convenio una sola
vez —**rumbo 0 mira hacia `-Z`, el ángulo crece girando hacia `-X`**— y
expone `rumboHacia`, `rumboEntre`, `dirDeRumbo`, `difRumbos` y
`normalizarRumbo`.

La regla operativa es: **ningún `atan2` de rumbos fuera de ese archivo.**
Si hay un solo lugar donde vive el signo, no puede haber dos convenios.

**Lo que hay que probar, y no es lo obvio.** Una prueba que fija un rumbo y
mide el arco alrededor de **ese** rumbo no sirve: es coherente consigo
misma y un convenio invertido le pasa entero. Hacen falta dos cosas más:

1. Una prueba que ate el convenio **al motor**: que `dirDeRumbo` coincida
   con lo que PlayCanvas le hace de verdad a una entidad rotada en Y.
2. Pruebas que unan las dos puntas: que el arma alcance lo que el jugador
   tiene **adelante** —preguntándole a `dirDeRumbo` dónde queda eso— y no
   lo que tiene atrás.

Y las pruebas del juego **no escriben ángulos a mano**: se los piden al
convenio. Una decía `player.yaw = 180` con el comentario *"o sea mirando
hacia -Z"*, que era falso, y pasaba igual porque el arma usaba el convenio
invertido: las dos mentiras se cancelaban.

---

### 🟡 D-18 — Ningún destello puede durar menos que el techo de `dt`

**El problema.** El fogonazo del disparo duraba 0,06 s. El techo de
simulación (D-11) es 1/15 = 0,067 s. Un efecto más corto que eso puede
**nacer y morir dentro del mismo cuadro y no dibujarse nunca**: el código
lo enciende, el contador se vence antes del siguiente render, y no se ve
jamás. Pasó exactamente eso, y no apareció en ninguna prueba porque las
pruebas comprobaban que el efecto se *activara*, no que se *viera*.

**La decisión.** Toda duración de efecto visual queda por encima de
`PERF.maxDeltaTime`, con margen. Siguen siendo destellos —a 60 cuadros por
segundo, seis o siete cuadros— pero no se pueden saltear. Vale para el
trazado, el fogonazo, el arco del cuchillo y cualquier cosa que venga.

---

## 8. Resumen de anotaciones para el futuro

| # | Anotación |
|---|---|
| NOTA-01 | Si colocar props en código se vuelve tedioso: armar la escena en Blender y exportarla como `.glb` |
| NOTA-02 | Escala real solo con OpenStreetMap y generación por código; revisar licencia ODbL |
| NOTA-03 | Compañeros: primero que te sigan, después que peleen, último que puedan morir. Tope de 2 |
| NOTA-04 | Ammo.js solo para ragdolls y escombros, nunca para el movimiento del jugador |
| NOTA-05 | Grilla de navegación con A\* solo si se ven zombis trabados en esquinas |
| NOTA-06 | Orden para bajar peso: texturas KTX2 → geometría Draco → recortar el motor |
| NOTA-07 | Falta herramienta de audio: Audacity + bancos con licencia revisada |
| NOTA-08 | Gus: primero feo pero animado, después bonito |
| NOTA-09 | Si la calle dobla en una esquina, hay que decidir si la cámara gira con la calle o se mantiene fija: girarla marea, no girarla rompe la diagonal |
| NOTA-10 | La noche queda disponible para una misión puntual: los faroles ya están construidos, solo hay que encenderlos |

---

## 9. Lo que este documento NO cambia del 01

Para que quede claro qué sigue vigente sin modificaciones:

- El alcance de la primera versión (sección 3) y todo lo que queda afuera.
- El bucle de juego y la estructura de la Misión 001 (sección 4).
- El estilo low-poly estilizado y las reglas visuales (sección 6), **salvo
  la parte de "oscuro y atmosférico"**, que queda reemplazada por D-16.
- El kit modular de escenario (sección 5).
- La lista de sistemas y los estados de partida y de zombi (sección 10).
- El flujo de producción de arte y la nomenclatura (secciones 8 y 9).
- Los criterios para dar por terminada la demo (sección 17).
- La regla principal: **primero una misión chica que funcione de principio a
  fin.**

Lo que **sí** cambia respecto del 01, y conviene tenerlo presente: la
orientación pasa a ser vertical (D-15), la cámara mira una calle en diagonal
(D-02) y el motor se usa como biblioteca local en vez del editor en la nube
(D-01).

---

*Las decisiones de este documento son revisables. Si al probar algo resulta que
una estaba equivocada, se corrige acá y se anota por qué. Un documento que nunca
cambia es un documento que nadie está usando.*
