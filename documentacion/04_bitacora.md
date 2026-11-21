# Documento 04 — Bitácora: el detalle y el porqué de cada fase

**Qué es esto.** Todo lo que se decidió, se midió y se aprendió en cada fase,
con el texto completo. Es el archivo al que se viene cuando hay que entender
**por qué** algo está como está, o cuando alguien va a cambiar una decisión y
conviene saber qué la apoyaba.

**El plan de trabajo NO está acá.** Está en `03_roadmap.md`, que es corto,
tiene una casilla por tarea y dice cuál sigue. Si lo que buscás es "qué hago
ahora", andá para allá.

Esto nació el 31 de octubre de 2026, separando el roadmap en dos: se había
vuelto tan largo que ya no se podía ver de un vistazo qué estaba hecho y qué
no, que es justamente para lo que sirve un roadmap. El contenido de abajo es
el documento tal como estaba, sin tocar.

---
## 12R.7 — Mobiliario urbano

### Los cables eran la pieza que faltaba

En la referencia cruzan la calle de lado a lado y son lo único que pasa por
encima de la calzada. Cuestan tres cajas cada uno y hacen dos cosas que
ninguna otra pieza hace: le ponen un techo a la cuadra, y dan una referencia
de profundidad —al caminar uno pasa por debajo de uno, después de otro— que
el piso solo no da.

El primer intento los puso de 5 cm a 6,6 m de altura y se veían como caños
de hierro cruzados. Quedaron en 3 cm y a 7,4 m.

### Lo demás tenía bien la forma y mal el color

El semáforo, el banco, el cesto y la parada estaban razonablemente
resueltos de forma; lo que seguían usando era la paleta vieja, elegida a
ojo. Se rehicieron con la medida, y de paso ganaron las piezas que les
faltaban para leerse desde arriba: la visera del semáforo, el aro del cesto,
el alero de la parada y las tablas separadas del banco.

### Un verde que no se puede poner arriba

La copa del árbol salió de un verde ácido que no existe en la calle. La
causa es contraintuitiva: **la cámara mira desde arriba, así que el lóbulo
superior es casi todo lo que se ve del árbol**, y tenía el verde más claro.
Pintarlo con el claro pinta el árbol entero. Ahora el claro va en un lóbulo
lateral, donde se lee como un reflejo del sol y no como el color del árbol.

Es el mismo tipo de error que el relieve de las fachadas: una decisión que
parece correcta mirando la pieza suelta y es incorrecta desde el ángulo en
que se la ve.

### Y murió `src/world/lighting.js`

Era lo último que quedaba del arte de la Fase 2B. Sobrevivía sólo porque
tenía el farol; ahora el farol es un prop como cualquier otro y el archivo
se borró. Con él se fueron los materiales sueltos de ventana y lámpara que
ya nadie usaba.

Y se agregó algo que faltaba: las 31 texturas de cartel ahora **se liberan**
al reconstruir el mundo. El juego se reconstruye en cada reintento, así que
sin eso quedaban colgadas en la memoria de la placa.

---
## 12R.6 — Árboles

El criterio de aceptación del prompt maestro es textual: *"los árboles no
son esferas verdes idénticas sobre cilindros"*. El viejo era exactamente
eso. Lo que lo arregla no es poner más esferas:

- **El tronco se abre.** Un plátano sube un tramo y se parte en dos o tres
  ramas gruesas en abanico. Ese contorno es el que se reconoce desde arriba.
- **La copa es irregular**: cinco volúmenes de tamaños distintos,
  desplazados y achatados cada uno a su manera, en los tres verdes medidos.
  Ninguno centrado.
- **Ninguno es igual a otro**: altura, giro, inclinación y mezcla salen del
  generador.
- **La corteza es clara**, como la del plátano porteño. Además así se separa
  de la hoja en sombra, que era el otro problema del viejo: se leía como una
  sola mancha. Ya estaba anotado en 12R.0 y acá se cobra.

---

## 12R.5 — Cartelería, y la pared que estaba rota

### Lo que encontró Gus

Dos cosas, jugando: paredes sueltas con huecos entre edificio y edificio, y
"vidrios negros que parecen un error".

### La hilera no era una hilera

El generador recorría la cuadra poniendo edificios de ancho al azar y dejaba
tres clases de agujero:

- el frente ocupaba el 72-96 % del ancho del edificio, así que entre uno y
  otro quedaba pared pelada;
- algunos se corrían hacia atrás ("retiro") y abrían un escalón;
- los baldíos eran literalmente nada: un hueco en la línea municipal.

En una cuadra de Boedo eso no existe: los edificios comparten medianera y la
línea municipal es continua de esquina a esquina. **Lo que varía es la
altura, el color y lo que pasa en la planta baja, no la posición del plano.**

Ahora las parcelas van pegadas una a la otra, sin retiros; la altura de cada
una se separa por lo menos dos metros de la de al lado —dos edificios casi
iguales se leen como uno solo—; el baldío deja un muro bajo en vez de un
agujero; y lo único que abre la pared de verdad es la boca de un pasaje, que
es una decisión de juego.

### Los vidrios negros eran dos colores mal elegidos, y eran míos

El fondo del local estaba en **0,11 de luminancia**: prácticamente negro.
Puesto en la calle, cada local se leía como un agujero recortado. Un interior
en penumbra no es negro, le entra luz de la calle. Y la vidriera usaba el
color de la persiana, así que no había diferencia entre el vidrio y el hueco.

Ahora el hueco está en 0,19 y hay un color de vidrio propio, un gris azulado
**más claro que el hueco que tiene detrás**. Esa diferencia es exactamente lo
que hace que se lea como vidrio y no como un agujero.

### Las letras

31 carteles, cada uno con su textura de texto dibujada en un canvas al
arrancar: no se descarga nada. Nombres ficticios en español —FARMACIA, LA
ESQUINA, VERDULERÍA, FERRETERÍA, LAVADERO— sin ninguna marca real.

La banda pasó de 0,58 a **0,95 m de alto, por legibilidad y no por gusto**: a
25 m un cartel de 0,58 ocupa 8 píxeles en pantalla y el texto adentro sería
la mitad. Es más grande de lo que sería en la calle real, y un cartel que no
se puede leer no cumple ninguna función. Comprobado en una captura: desde la
cámara del juego se lee "LAVADERO".

### Lo que se confirmó sobre los assets

Gus pidió reemplazar los edificios por modelos de la biblioteca. **No hay**:
`documentacion/visual/` tiene cuatro archivos y ninguno es un modelo, y los
`.glb` de threejsassets devuelven la página de login —`text/html`, 54 KB,
empiezan con `<!DOC`— porque hacen falta una cuenta. Probado con tres
modelos distintos. Hasta que esos archivos existan localmente, "reemplazar
por lo nuevo" sólo puede significar rehacerlo en código, que es lo que
decidió D-22.

---
## 12R.4 — Fachadas

### Lo que el plan decía era falso, y lo desmintió el propio motor

El roadmap decía "los edificios son cajas de color liso: no tienen una sola
ventana". **Era mío y estaba mal.** El generador viejo ya ponía 180 ventanas,
79 balcones con su baranda, 33 persianas, toldos, carteles, medianeras y
tanques de agua. Lo verifiqué contándolos en la escena, no mirando.

Lo que pasaba era otra cosa, y hubo que buscarla.

### Primero: la fachada casi no entra en el encuadre

Proyectando la línea municipal a la pantalla con la cámara del juego:

| Distancia por delante | Altura de fachada visible |
|---|---|
| al lado del jugador | **nada**: queda fuera por arriba |
| 10 m | hasta 8 m |
| 25 m | hasta 4 m |
| 45 m | apenas el pie |

O sea que **los pisos altos casi no se ven nunca**. Todo ese detalle se
estaba dibujando para nadie, y los primeros cuatro metros —que se ven
siempre— tenían menos trabajo que el resto.

Esto se preguntó y Gus eligió: el esfuerzo va a la planta baja.

### Y segundo: el relieve apuntaba para el lado equivocado

Ésta es la causa real de que la fachada se viera lisa teniendo piezas. El
toldo viejo "volaba" 1,5 m **hacia adentro del edificio**. Medido: la cara de
la fachada estaba en x = 10,04 y el toldo ocupaba de 10,04 a 11,54, enterrado
en la pared. Lo mismo el cartel, la persiana y el zócalo.

Con todas las piezas enterradas, una fachada es un plano liso por más piezas
que tenga.

Para que no vuelva a pasar, el kit nuevo **no habla de coordenadas**: habla
de cuánto sobresale cada pieza hacia la calle. Positivo vuela sobre la
vereda, negativo se hunde. La traducción a ejes vive en un solo lugar.

### Qué tiene ahora la planta baja

Local hundido 45 cm con su vidriera, jambas y dintel; persiana metálica con
lamas, que puede estar baja, a media asta o levantada dejando ver el hueco
negro; zócalo; puerta de edificio con marco, hoja hundida y escalón; toldo
con faldilla; cartel; y la cornisa que vuela 38 cm y le tira una sombra dura
a todo lo de abajo.

La cornisa es la pieza más barata y la que más rinde: sin ella la fachada es
una pared que sube sin accidentes.

Los pisos altos quedaron al revés que antes: ventana hundida en todos, pero
balcón **sólo en el primero**, que es el único que se ve. Y un remate arriba,
que es lo que recorta el edificio contra el cielo.

### El costo

| | Antes | Después |
|---|---|---|
| Piezas | 925 | 1289 |
| Llamadas de dibujo (aparición) | 232 | 252 |

Las 20 llamadas de más no son las piezas —el agrupado estático se las come—
sino que los lotes se parten en más grupos. Se mide de nuevo en la Fase 13.

### Y otra vez la semilla

Cambiar el frente cambió cuántos números al azar consume, y volvió a mover el
mapa: una caja de colisión de diferencia. Mismo arreglo que en la calzada: la
fachada tiene su propio generador y el del mundo consume en ese punto la
misma reserva que consumía el frente viejo. Mapa verificado idéntico: 105
cajas y 90 props.

**Van dos veces que esto pasa en dos tareas seguidas.** Queda anotado como lo
primero a resolver en 12R.10.

---
## 12R.3 bis — Lo que encontró Gus probándolo en el celular

Tres cosas, y una era grave. Vale la pena anotar que las tres se vieron
jugando y ninguna había salido en mis capturas: yo había mirado el tramo
recto y desde el punto de aparición.

### 1. Una calle de doble mano SÍ lleva línea de eje

Saqué toda la pintura de la calzada para que dejara de parecer una avenida, y
me llevé puesta la que sí corresponde. Lo que sobraba eran las **dos líneas de
borde**, que son de avenida; el eje discontinuo es de cualquier calle de doble
mano. Volvió, y además ahora **se interrumpe en la bocacalle**, como en la
calle de verdad.

### 2. La bocacalle estaba rota, y la rompí yo al mejorar el cordón

La esquina era una sola plancha de vereda de 16 x 16 m centrada en el cruce.
O sea que **la bocacalle entera era vereda**: el asfalto desaparecía y los
cordones de las dos calles se cruzaban uno encima del otro.

Eso ya era así antes de 12R.3. Lo que pasó es que con el cordón viejo —chato y
del mismo gris que la vereda— no se notaba, y con el cordón nuevo —amarillo y
con volumen— el cruce se volvió un dibujo sin sentido. **Una mejora puede
volver visible un error viejo**, y eso cuenta como haberlo causado.

Ahora la esquina son **cuatro ochavas de 3 x 3** en las diagonales, cada una
con sus dos cordones en L, y el centro del cruce es calzada. Y las veredas de
las dos calles **se cortan media calzada antes** del cruce, o volverían a
pasarle por encima.

### 3. Las manchas del piso eran los remiendos, mal hechos

Eran rectángulos de 3 x 6 m con demasiado contraste: se leían como manchas
pegadas encima y no como una reparación. Ahora son tiras largas y angostas
—que es la forma de la zanja que abren— y el tono está mucho más cerca del
asfalto.

### Y un efecto secundario que casi se me pasa

Al cambiar cuántos remiendos se dibujan cambió **cuántos números al azar
consume la calzada**, y como todo el mundo sale de un único generador con
semilla, eso corrió la secuencia entera: se movieron props, vehículos y
**siete cajas de colisión**, por un retoque de pintura.

Se arregla de raíz: la calzada ahora tiene **su propio generador**, derivado
de la semilla de la misión y del número de tramo. Lo visual ya no puede mover
el juego.

Pero eso solo no alcanzaba, y lo demostró la prueba de punta a punta: al
dejar de consumir del generador compartido, la secuencia se corrió igual —en
la otra dirección— y el mapa se reacomodó. **Dos autos quedaron tapando la
calle y el recorrido automático se trabó**, dando vueltas sin poder llegar al
primer control.

Así que además hay una **reserva de aleatoriedad**: el generador del mundo
consume, en el punto donde antes lo hacía la calzada, exactamente las mismas
tiradas que consumía. No se usan para nada y tienen que estar: mantienen la
secuencia donde el mapa está probado. Se van cuando el generador se rehaga en
12R.10 y cada familia de objetos tenga su propia semilla.

Con eso el mapa vuelve a ser idéntico: 105 cajas de colisión y 90 props, los
mismos de siempre.

> Vale la pena quedarse con esto: en un mundo con semilla, **cambiar cuántos
> números al azar consume un paso visual es cambiar el mapa**. No se ve en
> ninguna captura y lo encuentra una prueba que camina el recorrido entero.

### Las llamadas de dibujo, medidas en los dos lados

| Dónde | Antes | Después |
|---|---|---|
| Punto de aparición | 229 | 231 |
| La bocacalle | 292 | **277** |

Y de paso quedó claro que el techo de 238 que figuraba en el roadmap era el
número **del punto de aparición**, no el peor caso del juego. El peor caso es
la bocacalle, y ya estaba por encima antes de esta fase.

---

## 12R.3 — El suelo

### No parecía una avenida por el ancho, parecía por la pintura

El plan decía "angostar la calzada". Se midió antes de tocar: tiene **10 m
entre cordones**, que es exactamente lo que mide una calle de barrio porteña
—un carril y estacionamiento de los dos lados—. **El ancho estaba bien.**

Lo que la hacía parecer avenida era la pintura: línea de eje discontinua y dos
líneas de borde. Una calle de Boedo no tiene nada de eso; tiene asfalto pelado,
la senda peatonal en las esquinas y el cordón pintado. Sacando las tres líneas,
la misma calzada pasa a leerse como barrio.

Y fue una suerte, porque angostarla habría corrido las fachadas, y con las
fachadas se mueven todas sus cajas de colisión.

### La paleta medida no funcionaba tal cual en el mundo

Era la otra pregunta que esta tarea tenía que contestar, y la respuesta es
**no: hubo que corregir dos colores**. Los dos se veían bien en el banco, de a
un casillero por vez, y se veían mal cubriendo una calle entera.

| Color | Qué pasaba | Corrección |
|---|---|---|
| **Asfalto** | Salía **lila**: el medido tiene más azul que rojo | Neutralizado, y bajado a 0,30 |
| **Vereda** | Brillaba como papel: 0,81 de albedo | Bajada a 0,62 |

Lo del asfalto tiene una explicación que vale para todo lo que venga: el
descuento de la luz **divide por un sol cálido**, y eso sobre-corrige, porque
da por sentado que el sol es la única luz cuando en la referencia la calle
también recibe el azul del cielo. En un parche de 40 px no se nota; en diez
metros de calzada, sí.

Lo de la vereda es el límite que ya estaba anotado en `paleta.js`: el método
corrige el **color** de la luz, no su **intensidad**. Una baldosa al sol medida
da el albedo de una hoja de papel.

### El cordón era una franja pintada

Estaba a la misma altura que la vereda, así que desde la cámara se leía como
una raya de color en el piso. Ahora es un volumen de hormigón que sobresale
dos centímetros, con **la cara vertical a la vista** contra la calzada, y el
amarillo pintado sólo en el canto de arriba. Con la cámara de D-23 esa cara se
ve, y es lo que hace que la vereda esté arriba y la calle abajo.

Pintar el bloque entero de amarillo lo convertía en una barra de color que
competía con los objetos de misión.

> Un error intermedio: al rehacer el cordón lo corrí hacia afuera del borde de
> la calzada, y con él se corrió la vereda 32 cm, metiéndose adentro de las
> fachadas. Va centrado en el borde, como el viejo.

### Las juntas son lo que le da escala a la vereda

Tres metros de plano gris no dicen de qué tamaño es nada. Ahora hay dos juntas
a lo largo y una cruzada cada 2,4 m, en geometría y no en textura. Son 244
piezas más y, como entran al agrupado estático, casi no cuestan llamadas de
dibujo: de 224 se pasó a 229.

### El anillo ámbar: se queda, pero chico

Se comparó con y sin. Sin el disco, Gus **se lee solo**: el asfalto nuevo tiene
0,30 de albedo contra los 0,19 del cuero, y la cámara lo dejó en 43 px. Las dos
premisas que justificaban el disco —"de noche" y "40 px"— ya no existen.

Pero perder de vista al personaje propio en medio de una horda se paga caro,
así que la red de seguridad queda en una versión discreta: de 2,5 m de diámetro
a 0,95, y de 0,55 de opacidad a 0,26.

> El intento intermedio fue un aro fino en vez de un disco, con la primitiva de
> toro. No sirve: el toro de PlayCanvas tiene tan pocos segmentos que achatado
> se dibuja como dos manchas.

---

## 12R.2 — Sol, cielo y atmósfera

### El sol estaba a 17 grados, no a 73

Es el hallazgo de la tarea, y explica por qué el juego se veía mal desde la
Fase 2B.

La escena ponía el sol con `setEulerAngles(73, …)` creyendo que eso eran 73
grados sobre el horizonte. **La cuenta está invertida: eso pone el sol a 17**,
que es casi un atardecer. Con un sol a 17 grados una fachada de 18 m tira
**59 m de sombra**, así que la cuadra entera estaba permanentemente en sombra.
Ésa era la mancha oscura que cruzaba la calle en todas las capturas, y por eso
la escena se veía sucia haga uno lo que haga con los colores.

Y hay algo peor. **D-16 intentó arreglar exactamente este problema y lo
empeoró.** Decía: "a 58 grados un edificio de 17 m proyecta casi once metros
de sombra y la calzada mide diez, así que la cubría entera; a 73 la sombra
baja a cinco". El razonamiento es correcto; el número no existía. Subir de 58
a 73 **bajó** el sol de 32 a 17 grados, o sea que duplicó el problema que
quería resolver. La medición era sobre un número imaginario.

Se comprobó poniendo el sol en cuatro ángulos y mirando:

| `eulerX` | Lo que se ve | Elevación real |
|---|---|---|
| 89 | la cuadra entera en sombra | ~1° |
| 73 | una banda de sombra cruzando la calzada | ~17° |
| 40 | casi despejado | ~50° |
| **17** | **despejado, sombras cortas bajo los árboles** | **~73°** |

Ahora la conversión vive sola en `src/visual/angulos.js`, con cinco pruebas.
Estaba enterrada en el medio del armado de la escena, y por eso nadie pudo
verla en meses.

### Cómo se encontró

No se encontró mirando: se encontró descartando. Primero se escondió a Gus
—la mancha seguía—, después se apagaron las sombras del sol —la mancha
desaparecía, así que era una sombra—, después se apagaron árboles y edificios
por nombre —la mancha seguía, porque las mallas están agrupadas y los nombres
ya no mandan—, y al final se movió el sol, que fue lo que lo delató.

### Tres luces en vez de una

El banco de 12R.0 había dejado anotado que todo se veía más rosado que la
referencia. No era la paleta: era que había un sol cálido y un relleno parejo,
y nada más. Una cara que mira a la cámara recibía cálido más cálido.

| Luz | Color | Qué hace |
|---|---|---|
| Sol | cálido | dibuja, y es la única que tira sombra |
| Cielo | frío, desde arriba y del lado opuesto | rellena y **enfría** las caras que el sol no toca |
| Rebote | cálido, muy débil, desde abajo | la vereda devolviendo luz, para que los bajos no queden negros |

Hubo que bajar bastante todas las intensidades: con el sol de verdad alto la
calle recibe mucha más luz que antes, y el asfalto renderizaba en 0,53 de
luminancia teniendo 0,33 de albedo. Ahora da 0,43.

### El banco también estaba mal, y por lo mismo

Sus muestras eran cuadrados verticales de cara a la cámara. Con el sol
arreglado les pegaba de refilón y salían casi negras: no se comparaba el color
del material, se comparaba una cara en penumbra. Ahora van inclinadas 40
grados, que es lo que recibe una superficie de la calle.

### El cielo no se ve, así que no se paga

La tarea pedía un cielo con degradé en vez de un color plano. Se escribió —una
cúpula con una textura de 2 x 64 generada en el navegador, sin descargar
nada— y después se midió: **con esta cámara el cielo no se ve nunca.** El
borde de arriba de la pantalla todavía mira 10 grados hacia abajo, y sólo
asomaría 1,4 grados si el jugador inclina la cámara hasta el tope, donde lo
que se vería es el color del horizonte, que es el que ya tiene el fondo.

Queda escrita y apagada por defecto, para cuando haga falta. Un dibujado por
algo invisible no se paga.

> ⚠️ El primer intento tenía dos errores que conviene no repetir: la cúpula
> tenía 260 m de radio contra un `farClip` de 230, así que quedaba entera
> detrás del plano lejano y no se dibujaba nunca; y usaba
> `useLighting = false`, que en PlayCanvas además de la luz apaga el emisivo
> y la dejaba negra.

---

## 12R.1 — Cámara y encuadre

### Los números del roadmap estaban mal, y eran míos

El plan decía "hoy Gus mide 40 px y se ven 16 m de calle". Los dos números
salían de la tabla de mockups del documento 02, que comparaba tres **dibujos**
hechos con una cámara a 9,5 m. La del juego está a 20. Medido en el juego de
verdad:

| | Lo que decía el plan | Lo que mide el juego |
|---|---|---|
| Alto de Gus | 40 px | **29 px** |
| Calle por delante | 16 m | **34 m** |

Y con eso se cae el razonamiento entero del plan, que era "bajar el ángulo
cuesta calle por delante". **Es al revés:** al bajar el ángulo, el borde de
arriba de la pantalla se acerca al horizonte y se ve *más* lejos. El piso de
16 m que iba a ser la restricción difícil se cumple solo, con margen.

### Lo que de verdad limita es el ancho

El costo de acercar la cámara no es la profundidad: es el **ancho**. La calzada
mide 10 m entre cordones, y con un campo horizontal de 38° hay que estar a
14,5 m como mínimo para que entre entera. Por debajo de eso el juego se vuelve
un pasillo.

Y no se puede comprar con el campo de visión: abrirlo deja ver más ancho pero
achica a Gus en la misma proporción. Se probó —46° a 12 m da exactamente los
mismos 43 px que 38° a 15 m— y es así por geometría, no por casualidad.

**Conclusión honesta: el techo de esta tarea es un 50 %, no el doble.** Gus
pasa de 29 a 43 px. El salto grande no lo va a dar la cámara, lo va a dar el
modelo en 12R.11.

### Lo elegido

| | Antes | Ahora |
|---|---|---|
| Inclinación | 57° | **48°** |
| Distancia | 20 m | **15 m** |
| Mira corrida hacia adelante | — | **3 m** |
| Alto de Gus | 29 px | **43 px** |
| Calle por delante | 34 m | **47 m** |
| Ancho visible | 13,8 m | 10,3 m |
| Dónde queda Gus en pantalla | 51 % | 63 % |

Correr la mira hacia adelante va en la dirección a la que mira la **cámara**, no
a la que mira Gus. Si siguiera a Gus, girarse en el lugar barrería la escena
entera y marearía.

### La cuenta tenía un error del 25 %, y lo encontró el motor

La primera versión de `encuadre.js` calculaba el tamaño de Gus con la
inclinación de la cámara. Está mal: el ángulo que importa es el que hay **hasta
el objeto**, y con la mira corrida Gus queda en la mitad de abajo de la
pantalla, o sea que se lo mira más en picada que al centro. Daba 54 px donde el
motor mide 43.

Se detectó comparando la cuenta contra `worldToScreen` del propio motor.
Corregido, la cuenta cae a menos del 3 % del valor real, y por eso se puede
confiar en ella para elegir un ángulo sin tener que abrir el juego.

### Un colectivo tapaba a Gus, y el rayo de la cámara no se enteraba

La cámara tira un rayo para ver si algo se interpone, y descartaba **todas** las
cajas más bajas que la cámara. Con la cámara a 20 m eso estaba bien: sólo los
edificios podían taparla. A 12,3 m dejó de estarlo, y un colectivo de 3 m
estacionado entre Gus y la cámara no contaba como obstáculo.

Ahora el rayo tiene altura en los dos extremos: sale del pecho de Gus, a 1,2 m,
y llega a la cámara. Cada caja tapa o no según lo alta que sea **donde el rayo
la cruza**. Hay tres pruebas nuevas que lo fijan.

Queda un caso que esto no arregla y que no tiene arreglo por acá: si Gus está
parado pegado al colectivo, acercar la cámara no despeja nada, porque el bulto
está al lado del personaje y no entre medio.

### El anillo ámbar se queda, por ahora

Con Gus más grande se nota más, pero todavía hace falta: el asfalto del juego
sigue siendo el viejo, que es oscuro. La paleta nueva lo aclara a 0,335 y ahí
Gus se despega solo. **La decisión se corre a 12R.3**, cuando el asfalto nuevo
esté puesto y se pueda mirar en vez de suponer.

---

## Apéndice — El roadmap tal como estaba hasta el 31 de octubre de 2026

**Proyecto:** Explorar BA — supervivencia zombi en Buenos Aires para navegador móvil
**Versión:** 1.0 — 24 de octubre de 2026
**Depende de:** `01_documento_inicial.md` y `02_documento_mejorado.md`

---

## 📍 Dónde estamos — 31 de octubre de 2026

> **Fases cerradas:** 0, 1, 2, 2B, 3, 4, 5, 6, 7, 8 y **9**.
> **En curso:** **Fase 12R — La capa visual nueva**.
> **La Fase 12 queda descartada como arte.**
>
> **Todo lo visual se rehace desde cero.** No se corrige: se reemplaza. La
> Fase 12 se hizo antes de que existiera una referencia; el 31 de octubre
> llegó `documentacion/visual/` —referencia de dirección artística y prompt
> maestro— y lo que hay en pantalla no se le parece. Son unas 4.400 líneas
> de arte que se reescriben.
>
> **La lógica no se toca, y está bien.** Movimiento, colisiones, IA, combate,
> objetos, inventario, misión, récord: todo eso se conserva entero. Para que
> se pueda cambiar el arte sin romperlo, la Fase 12R arranca fijando el
> **contrato entre la lógica y lo visual**, que está escrito ahí.
>
> Las decisiones nuevas son **D-22** (pipeline híbrido: la ciudad en código
> pero diseñada, los personajes en `.glb` riggeado), **D-23** (la cámara se
> acerca, con un piso de 16 m de calle visible), **D-24** (Gus es el de
> `Gus.jpeg`: cuero negro) y **D-25** (sol alto, color cálido). La 10 y la 11
> quedan para después.
>
> **🏁 Éste es el "primer hito" del documento 01: a partir de acá el juego
> existe.** Se puede jugar de principio a fin, ganar, perder, reintentar, y
> el récord sobrevive a cerrar la pestaña.
>
> El repositorio está en
> **[github.com/gusoliva85/Explora_BA](https://github.com/gusoliva85/Explora_BA)**.
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
> la calle. Y hay **zombis**: te detectan por vista o por cercanía, te
> persiguen esquivando obstáculos, te muerden y la cámara se sacude.
>
> Y **se puede pelear con dos armas**. El cuchillo barre un arco de 2,1 m,
> alcanza a varios zombis de un golpe, los empuja y los interrumpe. La
> pistola dispara a 28 m, la paran las paredes, tiene cargador de 12 y
> recarga de 1,6 s.
>
> **Y disparar tiene consecuencias.** El tiro se escucha a 22 metros y todo
> zombi dentro de ese radio viene a investigar. El cuchillo se escucha a 2.
> Esa diferencia es lo que convierte "¿peleo o corro?" en "¿peleo callado o
> hago ruido y resuelvo rápido?".
>
> **Y está la bazooka.** Una barra que se llena sola en 30 s, apuntado
> automático al zombi más cercano que se pueda ver, y un cohete que **viaja
> de verdad**: tarda más de un segundo en cruzar cuarenta metros, y en ese
> rato la horda se sigue moviendo. No persigue, así que un zombi que cambia
> de dirección se salva. La explosión mata en el centro y deja heridos en
> el borde.
>
> **Y hay recursos.** Cada checkpoint deja tres cajas en el piso —dos de
> munición y un botiquín— y hay más repartidos por el mapa, en las zonas
> que el plano marcaba desde la Fase 3. Se levantan caminándolos; lo que no
> te sirve se queda en el piso.
>
> **Y la misión se termina.** Los controles se toman en orden, la meta no
> cuenta sin ellos, y al llegar hay una pantalla con el tiempo, los zombis
> eliminados, la vida que quedó y los golpes recibidos. Si es récord, lo
> dice y lo guarda.
>
> **Curarse es una decisión.** El botiquín se guarda, no se usa al pisarlo.
> Usarlo tarda 1,2 s y hay que **estar quieto**: moverse lo corta, y un
> golpe también. Cura la mitad de la vida total, sumando. Si te cortan, el
> botiquín **no se pierde**.
>
> **Y se puede apuntar con el pulgar.** Un toque al botón dispara hacia
> adelante; manteniéndolo y arrastrando, se convierte en un segundo
> joystick: se camina para un lado y se dispara para el otro.
>
> **Ya es un juego**: hay un objetivo, enemigos que te buscan, y decisiones
> con costo. Lo que falta es el inventario, la misión completa y el
> audio.
>
> **Lo que no existe todavía:** objetos, audio y cualquier arte que no sean
> cajas de colores. **No hay sonido**, lo cual es una ironía incómoda para
> una fase cuya mecánica central es el ruido: hoy el ruido se *ve* (el
> aviso en pantalla, el anillo del diagnóstico) pero no se escucha.

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
| 4 | El primer zombi | Te detecta, te persigue, te muerde | ✅ |
| 5 | Combate cuerpo a cuerpo | El cuchillo mata zombis | ✅ |
| 6 | Pistola y ruido | Arma a distancia con consecuencias | 🔄 **siguiente** |
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

### Decisiones que se tomaron construyéndola

**Se agregó el estado `SEARCH`**, que no estaba en el documento 01. Es la
diferencia entre un enemigo que da miedo y uno que no: sin él, esconderse
detrás de un auto apaga al zombi de golpe y el juego se vuelve trivial. Con
él, el zombi va hasta donde te vio por última vez y da vueltas ahí, así que
esconderse es una apuesta y no un botón de apagado.

**La línea de vista usa un umbral de altura.** Un zombi ve *por encima* de
una barricada de un metro pero no *a través* de un auto de uno setenta. Sin
ese umbral, o no ve nada o lo ve todo.

**El ruido pone a buscar, no a perseguir.** Un zombi que corre derecho hacia
un disparo que escuchó a veinte metros sabe demasiado. Lo usa la Fase 6.

**Un golpe interrumpe aunque no mate.** Sin eso, un zombi que ya empezó a
atacar te pega igual por más que le des primero, y el combate se siente
injusto.

### Decisiones que se tomaron construyéndola

**El golpe tiene una demora de 0,12 s entre apretar y aplicar daño.** Con
daño instantáneo el zombi muere en el mismo cuadro en que empieza la
animación: no hay nada que anticipar y el golpe se siente despegado del
personaje. La demora también abre la puerta a que un zombi alcance a
interrumpirte, que es de donde sale la tensión del cuerpo a cuerpo.

**El golpe se resuelve desde donde mirás al conectar, no al apretar.** Si
fuera al apretar, girar durante el swing no serviría de nada.

**El arco se muestra al apretar, el daño sale después.** Es lo que hace que
el golpe se sienta inmediato aunque el daño llegue unas centésimas más
tarde: el jugador ve que su orden se registró.

**El color del arco dice el resultado.** Cálido y fuerte si conecta, un
trazo frío y tenue si falla. "Fallaste" y "el arma no hizo nada" son dos
cosas muy distintas para quien está jugando.

**Un error de diseño que corregí a mitad de camino:** el arco se dibujaba
desde el bucle principal, pegado al chequeo del botón. Eso significaba que
un ataque que no viniera del botón —una prueba, una captura, un ataque
automático más adelante— no mostraba nada. Lo moví adentro del arma, que es
la única que sabe de verdad que atacó.

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

> ⚠️ **Parcialmente superada el 7/11/2026.** Caminar desaparece: correr pasa a
> ser la única velocidad (**D-30**), y con eso se van `walkSpeed`, el botón, la
> tecla `Shift` y el estado `isRunning`. El joystick se muda a la derecha
> (**D-27**). La cámara se queda como la dejó la 12R.1 y **no sigue al blanco
> del disparo automático** (**D-39**).

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

> ⚠️ **Se rehace entera el 7/11/2026.** El mapa de tres cuadras con dos rutas
> alternativas lo reemplaza la **cuadrícula de siete cuadras con giros de 90°**
> (**D-35**), las rutas alternativas se borran (**D-34**) y el mundo pasa a
> construirse por tramos (**D-42**). Lo que sobrevive, y es lo importante: el
> generador exige tramos alineados a un eje, que era lo que yo trataba como
> deuda y resultó ser la especificación.

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

# FASE 4 — El primer zombi ✅

**Objetivo:** un zombi que te detecta, te persigue esquivando obstáculos, te
alcanza y te hace daño. **Esta es la fase más importante de todo el roadmap**:
es donde el juego empieza a ser un juego.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 4.1 | Componente de salud reutilizable | ✅ `src/entities/health.js` |
| 4.2 | Zombi con silueta distinguible de Gus | ✅ encorvado y con los brazos al frente |
| 4.3 | Máquina de estados | ✅ y se agregó `SEARCH`, ver abajo |
| 4.4 | Detección: distancia, cono de 120° y línea de vista | ✅ |
| 4.5 | Detección por cercanía sin ver | ✅ |
| 4.6 | Movimiento con evasión por tres rayos (D-10) | ✅ |
| 4.7 | Separación entre zombis | ✅ |
| 4.8 | Memoria del último lugar visto | ✅ |
| 4.9 | Límite de alejamiento | ✅ |
| 4.10 | Ataque con alcance, espera y daño | ✅ |
| 4.11 | Invulnerabilidad breve al recibir daño | ✅ |
| 4.12 | Destello rojo y sacudón de cámara | ✅ el sacudón escala con el daño |
| 4.13 | Aparición según las zonas de la misión | ✅ 25 puestos en 7 zonas |
| 4.14 | Apagar los lejanos, tope de activos | ✅ |
| 4.15 | Diagnóstico: cono de visión, estado y destino | ✅ con F1 |
| 4.16 | Pruebas de la máquina de estados y la detección | ✅ 29 pruebas nuevas |

### Cómo se prueba

```
npm test             29 pruebas nuevas del cerebro, sin navegador
npm run test:e2e     verifica que el cerebro esté conectado al juego
```

**Con F1 (o tres dedos) se ve el cono de visión de cada zombi, su estado por
color y a dónde va.** Es la herramienta para ajustar el comportamiento: sin
verlo, "me vio desde muy lejos" no se puede corregir.

A mano:

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

- [x] Un encuentro con un zombi funciona igual diez veces seguidas
- [x] El zombi no se traba contra las paredes ni se apila con otros
- [x] Se puede escapar corriendo (hay una prueba que lo fija)
- [x] Al morir aparece la pantalla de derrota y se puede reintentar
- [ ] **Con 12 zombis el teléfono mantiene 30 FPS** — pendiente de medirlo
      en un teléfono real

### ⚠️ Lo que quedó anotado

**Draw calls: 201 con diez zombis en pantalla**, contra 171 sin ninguno. Se
bajó de 379 con dos medidas: que solo el torso proyecte sombra, y agrupado
dinámico de mallas para los zombis. El objetivo sigue siendo 150 y se
revisa en la Fase 13.

**Los zombis nacen un poco alineados** dentro de cada zona, porque la zona
es un círculo y se reparten por igual. Se nota poco, pero cuando haya
variantes de zombi conviene mirarlo.

### 🔍 Decisión a cerrar en esta fase

**El ángulo de cámara (D-02).** Recién con zombis persiguiéndote se puede
decidir: el ángulo se elige por cuánto peligro necesitás ver venir. Probar los
tres de los mockups —57°, 66° y 75°— con la rueda del mouse y después en el
teléfono. Anotar el resultado en el documento 02.

La orientación vertical y la calle en diagonal ya están decididas y no se
reabren acá: lo único que se ajusta es la inclinación.

---

# FASE 5 — Combate cuerpo a cuerpo ✅

> ❌ **BORRADA el 7/11/2026 por D-29.** El cuchillo sale del juego entero.
> Queda una sola arma. El texto se conserva porque el razonamiento sobre el
> arco de golpe y el empujón sigue siendo bueno, y porque fue así como se
> descubrió qué juego queríamos.

**Objetivo:** el cuchillo. Que pegarle a un zombi se sienta bien.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 5.1 | `WeaponController`: arma equipada, tiempos y estados | ✅ lógica pura, sin motor |
| 5.2 | Ataque con arco: **2,1 m** y 55° a cada lado | ✅ corregido, ver abajo |
| 5.3 | Demora entre apretar y golpear | ✅ y el golpe sale desde donde mirás al conectar, no al apretar |
| 5.4 | Un golpe alcanza a varios zombis | ✅ |
| 5.5 | Un golpe no pega dos veces al mismo zombi | ✅ |
| 5.6 | Empujón e interrupción al recibir daño | ✅ venía de la Fase 4 |
| 5.7 | Muerte: se desploma, queda unos segundos y se recicla | ✅ |
| 5.8 | Reutilizar los zombis muertos | ✅ venía de la Fase 4 |
| 5.9 | Arco visible, destello en el zombi y sacudón | ✅ |
| 5.10 | El fallo se ve distinto del acierto | ✅ el arco cambia de color y no hay sacudón |
| 5.11 | El cuchillo hace ruido de 2 m (D-05) | ✅ conectado al sistema de zombis |

### Cómo se prueba

```
npm test             20 pruebas nuevas del arco y los tiempos
npm run test:e2e     que matar un zombi funcione de punta a punta
```

A mano:

1. Golpear al aire → se ve el arco frío, no pasa nada más.
2. Golpear a un zombi → se ve el impacto, pierde vida, retrocede.
3. Dos cuchillazos → el zombi muere y el cuerpo queda unos segundos.
4. Golpear a tres zombis juntos → los alcanza a todos, una vez a cada uno.
5. Apretar el botón muy rápido → el tiempo de espera lo limita.
6. Matar 30 zombis seguidos → no hay tirones ni se degrada el rendimiento.
7. **En el teléfono:** ¿el botón de ataque está donde la mano lo encuentra sin
   mirar?

### Criterio de salida

- [x] Se entiende sin dudas cuándo acertaste y cuándo fallaste
- [x] Dos cuchillazos matan a un zombi estándar (hay una prueba que lo fija
      leyendo el balance real, no un número copiado)
- [x] Matar muchos zombis no degrada el rendimiento: se reciclan
- [ ] **Un zombi se puede derrotar sin recibir daño si lo hacés bien** —
      pendiente de tu criterio jugando

### 🔧 Corregido después de probarlo en el teléfono

Dos cosas que reportó Gustavo jugando, y que ninguna prueba había visto.

**1. El cuchillo golpeaba para atrás.** No era un error de cálculo: eran
**dos convenios de ángulos opuestos conviviendo sin que ninguno estuviera
escrito.** La cámara y los modelos usaban "rumbo 0 mira hacia -Z", que es
el que impone PlayCanvas. El cerebro del zombi y el arma usaban el
contrario. Cada uno era coherente consigo mismo, así que funcionaban por
separado y sus pruebas pasaban; el error aparecía **solo en el cruce**,
cuando el arma recibía el rumbo del jugador y lo comparaba con el suyo:
180° de diferencia exactos.

El mismo error afectaba al zombi, y nadie lo había notado: su cuerpo
apuntaba al revés de donde caminaba, o sea que **perseguía de espaldas**,
con los brazos hacia el lado opuesto. A veinte metros de cámara cenital
casi no se ve.

Se cerró creando `src/core/rumbo.js`: **un único convenio, escrito, con el
signo viviendo en un solo lugar**. La regla que queda es "ningún `atan2` de
rumbos fuera de ese archivo". Si hay un solo lugar donde vive el signo, no
puede haber dos convenios.

**2. El alcance era muy corto.** Subido de 1,7 m a **2,1 m**. Con 1,7 había
que quedar prácticamente encima del zombi, y a la distancia de cámara del
juego esa diferencia no se ve, así que el golpe fallaba sin que se
entendiera por qué. Además el arco que se **dibuja** tenía su radio escrito
a mano, con un comentario que prometía que coincidía con el arma; ahora los
dos leen `WEAPONS.knife`, porque un comentario no mantiene nada
sincronizado.

**3. De paso, `difRumbos` estaba mal y nadie lo sabía.** La encontró una
prueba nueva del convenio. El `%` de JavaScript conserva el signo del
dividendo, así que la fórmula habitual devolvía diferencias mayores que
180° en cuanto los ángulos se salían de rango. No era hipotético: el rumbo
del zombi quieto **se incrementaba sin volver nunca al rango**, así que
bastaba dejarlo parado un rato para que su cono de visión se rompiera y
dejara de ver al jugador.

#### Por qué las pruebas no lo vieron, y qué se agregó

Las pruebas del arma le pasaban un rumbo **escrito a mano** y comprobaban
el arco alrededor de ese rumbo. Eran coherentes consigo mismas y por eso
inútiles: nunca enfrentaron el rumbo del arma con el del jugador. Encima
una decía `rumbo = 0` con un comentario que afirmaba "mira hacia +Z", que
era falso — y como el arma usaba el convenio invertido, **las dos mentiras
se cancelaban**.

Lo que se agregó:

- `tests/rumbo.test.js` — ata el convenio **al motor**: compara
  `dirDeRumbo` contra lo que PlayCanvas le hace de verdad a una entidad
  rotada en Y. Si alguien cambia el signo, se queja antes de que el juego
  entero quede al revés.
- `tests/arma.test.js` — las pruebas ya no escriben números de rumbo: se
  los piden al convenio. Y hay 16 nuevas que exigen que el golpe alcance lo
  que el jugador tiene **adelante** y no alcance lo que tiene **atrás**,
  en ocho rumbos distintos.
- `tests/combate.spec.js` — en el navegador, que es el único lugar donde
  existe el `yaw` real del jugador. Mide que el arco **dibujado** apunte a
  donde apunta el modelo, y que el zombi camine de frente.

Las tres se validaron **reintroduciendo cada error a propósito** y
comprobando que fallan. La primera versión de la prueba del arco no falló:
comparaba la rotación de la entidad, que no sabe nada de los vértices, así
que se reescribió para medir la geometría de la malla. Una prueba que no se
vio fallar no prueba nada.

### ⚠️ Lo que quedó anotado

**El balance del cuerpo a cuerpo no está ajustado.** Quedan 45 de daño y
0,55 s de espera, del documento 02. El alcance ya se corrigió jugando. El
resto se ajusta con la pistola puesta, para poder comparar.

**No hay animación de ataque.** Gus no se mueve al golpear: lo que se ve es
el arco. Eso llega con el modelo, en la Fase 12.

---

# FASE 6 — Pistola y sistema de ruido ✅

> ✅ **Sobrevive entera, y vale más que antes.** Es la única de las fases de
> combate que no se toca: la pistola pasa a ser **el arma** (**D-29**) y el
> sistema de ruido se vuelve más importante de lo que era. Con la esclusa de
> **D-37** hay que matar a todos los zombis del tramo para pasar, y el peor
> caso de esa mecánica es el último zombi escondido en una esquina. **Disparar
> hace ruido a 22 m y el ruido los atrae**: o sea que pararse a tirar los va
> trayendo solos. El sistema que se construyó para dar tensión resulta ser,
> además, la mitad de la solución a un problema que todavía no existía.
>
> Lo único que cambia: la dispersión se va a cero (**D-36**), el tiro no falla
> nunca salvo barrera, y con ella se va el apuntado asistido.

**Objetivo:** el arma a distancia, y que disparar tenga consecuencias.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 6.1 | Disparo instantáneo: rayo de 28 m que choca contra paredes | ✅ el rayo va a 1,2 m de altura, así que lo para un auto pero no un cordón |
| 6.2 | Dispersión de 2,5° | ✅ con azar de semilla propia, nunca `Math.random` |
| 6.3 | Apuntado asistido en móvil | ✅ cono de 14°, corrección máxima de 5° |
| 6.4 | Cargador de 12, recarga de 1,6 s, reserva de 24 | ✅ la munición se lleva por tipo, no por arma |
| 6.5 | Clic sin munición | ✅ el contador se sacude y la recarga arranca sola |
| 6.6 | Trazado del disparo y chispa en el impacto | ✅ |
| 6.7 | Fogonazo y retroceso de cámara | ✅ sacudón más corto y seco que el del cuchillo |
| 6.8 | Cambio de arma: botón y tecla Q | ✅ y cancela la recarga en curso, a propósito |
| 6.9 | Sistema de ruido: evento con posición y radio | ✅ |
| 6.10 | Los zombis del radio van al origen del ruido | ✅ a `ALERT`, no a `CHASE`: van a investigar, no saben dónde estás |
| 6.11 | Anillo de ruido en modo diagnóstico | ✅ se expande desde el origen |
| 6.12 | Munición en el HUD | ✅ con tres niveles de aviso, no dos |

### Decisiones que se tomaron construyéndola

**El ruido sale igual si el tiro falla.** Es el corazón de la fase: lo que
atrae a los zombis es el estruendo, no el acierto. Si errar fuera
silencioso, no tendría costo y disparar dejaría de ser una decisión.

**Un zombi que ya te está persiguiendo no se distrae con un ruido.** Si se
distrajera, disparar con un zombi encima lo mandaría a investigar el lugar
del disparo —donde estás parado vos—, lo cual se ve como que pierde el
rastro de alguien que tiene delante. Y sería explotable: disparar al aire
para sacarse uno de encima.

**La pared se resuelve antes que los zombis, no después.** Es el orden que
parece dar igual y no da igual: buscando primero el zombi más cercano, un
tiro contra una persiana con un zombi del otro lado igual lo mataría.

**El más cercano tapa al de atrás.** Es lo que hace que una fila de zombis
en un pasillo angosto sea un problema y no una oportunidad.

**Cambiar de arma cancela la recarga.** Si no, se podría empezar a recargar,
pasar al cuchillo, pelear, y volver a la pistola ya cargada: la recarga
dejaría de costar nada, y su costo es justamente el punto.

**La asistencia de puntería corrige menos de lo que busca** (5° de
corrección dentro de un cono de 14°). Si corrigiera todo el cono sería
apuntado automático y acertar dejaría de tener mérito; el jugador sigue
eligiendo a quién le tira, el juego sólo le perdona el temblor del pulgar.

**El botón grande dice DISPARAR cuando tenés la pistola.** Un botón que
dice ATACAR con una pistola en la mano sugiere cuerpo a cuerpo, que es
exactamente la decisión contraria a la que esta fase quiere que pienses.

### Lo que se encontró de paso

**`difRumbos` estaba mal y nadie lo sabía.** Lo encontró una prueba nueva
del convenio de ángulos. El `%` de JavaScript conserva el signo del
dividendo, así que la fórmula habitual devolvía diferencias mayores que
180° en cuanto los ángulos se salían de rango — y el rumbo del zombi quieto
**se incrementaba sin volver nunca al rango**. Bastaba dejar un zombi
parado un rato para que su cono de visión se rompiera y dejara de verte.

**El ruido se medía desde el puesto de origen del zombi, no desde donde
estaba.** Para un zombi quieto da lo mismo, y por eso no se notaba. Para
uno que ya había caminado treinta metros, estaba midiendo desde un lugar
donde no estaba: podía escuchar un disparo lejísimo o no escuchar uno al
lado.

**Un efecto más corto que un cuadro no se dibuja nunca.** El fogonazo
duraba 0,06 s y el techo de simulación es 1/15 = 0,067 s: nacía y moría
dentro del mismo cuadro. En el navegador de prueba no apareció jamás, y en
un teléfono de gama media con la calle llena habría pasado lo mismo. Las
duraciones de los destellos ahora están **por encima del techo de dt**, con
margen.

### Cómo se prueba

```
npm test             187 pruebas; 64 nuevas sólo de la pistola
npm run test:e2e     7 nuevas en el navegador, incluida la del ruido
npm run verificar    la versión compilada, con perfil de celular
```

A mano, con **F1** para ver los anillos de ruido:

1. Disparar a un zombi a 10 m → acierta, dos tiros lo matan.
2. Disparar a 30 m → la bala no llega, pero se gasta igual.
3. Disparar contra un auto con un zombi detrás → no pasa.
4. Vaciar el cargador → recarga sola, y durante la recarga no dispara.
5. **Disparar con zombis alrededor que no te vieron** → vienen todos.
   Esta es la prueba clave de la fase.
6. Matar con cuchillo al lado de otros → los otros no se enteran.
7. **En el teléfono:** ¿se puede apuntar y acertar sin frustrarse?

### Criterio de salida

- [x] Disparar atrae zombis de forma notoria y predecible — hay una prueba
      de navegador que pone tres zombis de espaldas a 19 m y exige que los
      tres vengan; se validó rompiéndola (bajando el radio del disparo al
      del cuchillo) y falla como debe
- [x] El cuchillo sirve por ser silencioso — la otra mitad de la prueba:
      un cuchillazo al lado de esos mismos tres no despierta a ninguno
- [ ] **El jugador duda antes de disparar** — pendiente de tu criterio
      jugando. Es el único criterio que no se puede medir con una prueba.
      Si no dudás, el ruido es muy poco y hay que subir `noiseRadius` o
      `NOISE.rangeMultiplier`
- [ ] **Se puede apuntar con el dedo sin frustrarse** — pendiente de tu
      criterio en el teléfono. Si cuesta, lo que se toca es
      `aimAssist.maxima`, pero **con cuidado**: pasando de 6° ya se siente
      como que el juego apunta solo

### ⚠️ Lo que quedó anotado

**No hay sonido.** Es incómodo en una fase sobre el ruido: hoy el ruido se
*ve* (el aviso "N TE ESCUCHARON" y el anillo del diagnóstico) pero no se
escucha. El audio llega en la Fase 11, y cuando llegue el aviso en pantalla
probablemente sobre.

**La pistola no se recoge: se tiene desde el principio.** Los objetos y la
munición de reserva en el mapa son de la Fase 8. Hoy arrancás con 12 + 24
balas y no hay forma de conseguir más, así que la escasez todavía no es
real.

**El ruido sólo lo escuchan los zombis en juego**, o sea los que están
dentro de la distancia de corte (55 m). Hoy no cambia nada porque el
disparo se escucha a 22, pero si alguna vez un arma hiciera más ruido que
ese corte habría que despertar a los de afuera. Está escrito en
`spawnManager.propagarRuido` para que no sea una sorpresa.

**El balance no está ajustado.** 34 de daño, 2,5° de dispersión y 22 m de
ruido son el punto de partida del documento 02. Se ajustan jugando.

---

# FASE 7 — Bazooka ✅

> ❌ **BORRADA el 7/11/2026 por D-29.** El arma, el botón, la barra de 30 s, el
> cohete y la explosión. **Lo único que sobrevive es `objetivoAutomatico()`**,
> el apuntado automático, que pasa a ser el corazón del combate (**D-28**). Es
> el ejemplo del proyecto de código guardado en el lugar equivocado: no tenía
> por qué vivir dentro de la bazooka, vive ahí porque la bazooka lo necesitó
> primero.

**Objetivo:** el arma especial con barra de espera y apuntado automático (D-03).

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 7.1 | Barra de carga de 30 s, visible en el HUD | ✅ carga siempre, tengas el arma que tengas |
| 7.2 | Selección automática del zombi más cercano dentro de 40 m | ✅ y que **se pueda ver**: ver abajo |
| 7.3 | Indicador del objetivo antes de disparar | ✅ resuelto distinto: el botón sólo aparece cuando hay blanco posible |
| 7.4 | Proyectil a 24 m/s, no instantáneo | ✅ y no persigue, a propósito |
| 7.5 | Explosión en área: 250 en el centro, radio de 6 m | ✅ el daño de borde bajó de 60 a 35, ver abajo |
| 7.6 | Empujón a los zombis cercanos | ✅ 2,5 m, con detección de colisión |
| 7.7 | Efecto visual: destello, onda y humo | ✅ |
| 7.8 | Sacudón proporcional a la distancia | ✅ escala con la **cercanía**, no con el daño |
| 7.9 | Ruido de 45 m | ✅ dos veces: el disparo y la explosión |
| 7.10 | Botón bloqueado mientras la barra no está llena | ✅ no bloqueado: **no existe** |
| 7.11 | Sin zombis en rango no se gasta la carga | ✅ |

### Decisiones que se tomaron construyéndola

**La barra carga siempre, con cualquier arma en la mano.** Si cargara sólo
con la bazooka equipada, lo racional sería andar con ella puesta sin
usarla, y el jugador tendría que elegir entre pelear y esperar. Cargando
sola, la única decisión que queda es **cuándo gastarla**, que es la única
interesante. Por eso tampoco entra en el cambio de arma: tiene botón
propio.

**El cohete no persigue.** El apuntado es automático, pero una vez que
sale vuela derecho hacia donde estaba el blanco. Si persiguiera, la demora
de segundo y medio no costaría nada y el arma volvería a ser "apretar para
matar". Volando derecho, un zombi que cambia de dirección se salva y el
radio de seis metros es lo que perdona el error. Hay una prueba que corre
el blanco 40 m mientras el cohete está en el aire y exige que sobreviva.

**El botón no existe hasta que sirve.** El roadmap pedía bloquearlo. Un
botón deshabilitado que igual se puede apretar enseña a apretarlo en vano;
uno que aparece recién cuando sirve enseña que apareció porque sirve. Y en
vertical, un botón menos bajo el pulgar derecho es espacio ganado.

**El apuntado exige línea de vista**, que no estaba en el documento 02. Sin
eso, el arma elegiría un zombi del otro lado de una persiana, el cohete
reventaría contra la pared a dos metros del jugador y la explosión de seis
metros se lo llevaría puesto, sin que pudiera entender qué pasó.

**Sin blanco no se gasta la carga, al revés que la pistola**, donde errar
cuesta una bala a propósito. La diferencia es el precio: una bala son unos
segundos, la barra son treinta. Castigar un dedo con treinta segundos no
es balance. Pero el juego **avisa por qué** no pasó nada ("SIN BLANCO A LA
VISTA"): un botón que no hace nada se lee como un botón roto.

**La barra arranca en cero, también al reaparecer.** Empezar cargado
convertiría el principio de cada intento en "gasto la bazooka en el primer
grupo". Y reaparecer con la barra llena premiaría morirse.

### Lo que se encontró de paso

**El daño de borde era exactamente la vida de un zombi.** El documento 02
fijaba `damageEdge: 60` y `ZOMBIE_STANDARD.maxHealth` también es 60: todo
lo que entraba en el radio moría, incluido el que apenas lo rozaba. La
bazooka era un botón de borrar pantalla y apuntarla no era una habilidad,
porque cualquier punto del grupo daba el mismo resultado. **Y la prueba a
mano número 3 de esta misma fase pedía lo contrario** ("un zombi en el
borde sobrevive con poca vida"), así que los dos números del documento se
contradecían entre sí. Bajado a 35: el radio letal queda en unos 4,6 m de
los 6. Lo encontró una prueba, no el ojo — jugando se ve que todos mueren,
que es exactamente lo que uno espera de una bazooka.

**El empujón estaba escrito a mano en el zombi.** Era un `0.35` fijo, así
que una explosión empujaba igual que un cuchillazo y los zombis se
quedaban parados en medio del humo. Ahora la fuerza la decide quien
golpea.

**El cohete detonaba hasta 0,7 m antes del cuerpo.** Usaba la proyección
sobre el segmento en vez del punto de entrada a la esfera. Con una
explosión de seis metros no cambia a quién mata, pero el destello aparecía
corto y de forma inconsistente según dónde cayera el cuadro.

**La explosión se veía como niebla rosa.** Las tres capas eran aditivas, y
sobre una calle de mediodía sumar luz satura a blanco y se lleva el color
puesto. Ahora sólo el núcleo es aditivo —es fuego, tiene que quemar la
imagen— y el humo y la marca del piso van en mezcla normal, que respeta el
naranja y deja ver los zombis debajo, que es lo que uno quiere mirar justo
en ese momento.

**Se repitió un error de especificidad de CSS que este proyecto ya había
cometido.** Para esconder el botón se escribió una clase nueva con un
`display: none` común; `.btn` se define más abajo en la hoja, tiene la
misma especificidad y le ganaba por orden, así que el botón se veía
siempre. Ya existía `.hidden` con `!important` justamente por eso. La
regla que queda: si hay una clase que ya resuelve esto, se usa esa.

### Cómo se prueba

```
npm test             226 pruebas; 39 nuevas de la bazooka
npm run test:e2e     8 nuevas en el navegador
npm run verificar    la versión compilada, con perfil de celular
```

A mano, con **F1** para ver el anillo del ruido:

1. Esperar 30 s → la barra se pone ámbar y **aparece** el botón.
2. Disparar a un grupo → el cohete tarda en llegar, y mueren los del centro.
3. Mirar al que quedó en el borde → sobrevive herido y sale despedido.
4. Disparar sin nadie en rango → no se gasta, y avisa por qué.
5. Disparar y correr → la barra vuelve a cero y arranca de nuevo.
6. Disparar cerca → medio barrio viene a ver qué pasó.
7. **En el teléfono:** ¿la explosión baja los FPS?

### Criterio de salida

- [x] La explosión no baja los FPS: el efecto son tres primitivas
      reutilizadas, no partículas. 177 llamadas de dibujo, las mismas que
      antes de la fase
- [x] No se puede abusar de ella: treinta segundos entre usos, y el cohete
      no persigue
- [ ] **Se siente poderosa y vale la pena esperarla** — pendiente de tu
      criterio jugando
- [ ] **El ruido la convierte en una decisión, no en un botón gratis** —
      pendiente. Hace 45 m de ruido dos veces (disparo y explosión), que es
      el doble que la pistola. Si igual la usás sin pensarlo, el número
      está bajo

### ⚠️ Lo que quedó anotado

**No hay indicador del blanco elegido** (tarea 7.3 en su forma original).
Existe `arma.blancoEspecial()` para dibujarlo, pero por ahora el juego no
lo muestra: con apuntado automático al más cercano, el jugador ya sabe a
quién le va a pegar, y un marcador más en pantalla compite con el resto.
Si al probarlo en el teléfono se extraña, está listo para engancharse.

**El cohete no tiene estela.** Se ve la cabeza caliente volando, nada más.
Con una estela se leería mejor la trayectoria; es trabajo de la Fase 12.

---

# FASE 8 — Objetos e inventario ✅

> ❌ **BORRADA el 7/11/2026 por D-32.** Munición, botiquines, inventario y
> curación salen del juego entero. La progresión se muda a **tres cartas de
> mejora al llegar a cada control**. D-20 y D-21 quedan superadas, no
> equivocadas: eran correctas para el juego que había.

**Objetivo:** recursos que se recogen y se usan.

Lo que sigue salió de probar el juego en el teléfono, no del plan original.
Se hizo antes que el resto de la fase porque sin esto la munición no se
podía reponer de ninguna manera.

### Lo que se hizo primero, pedido jugando

| # | Tarea | Estado |
|---|---|---|
| 8.a | Objetos tirados en el piso, con su entidad y su disco | ✅ |
| 8.b | Se levantan **caminándolos**, sin botón | ✅ |
| 8.c | Lo que no sirve **no se levanta** | ✅ |
| 8.d | Cada control deja 2 municiones (12 c/u) y 1 botiquín | ✅ |
| 8.e | El botiquín cura **la mitad de la vida total**, sumando | ✅ |

### Decisiones que se tomaron

**Se levantan caminándolos, no con el botón de interactuar.** Hay un botón
reservado desde la Fase 0 y no se usa acá. Con el pulgar izquierdo en el
joystick y el derecho en disparar, no queda dedo libre: pedir un tercer
toque significa frenar, buscar el botón y apretarlo, con zombis encima.
Pisarlo y que se levante solo hace que recoger sea parte de moverse. El
botón queda para lo que sí es una decisión: abrir una puerta, activar algo.

**Lo que no sirve se queda en el piso.** Un botiquín pisado con la vida
llena se perdería para siempre y el jugador ni se enteraría. Es la
diferencia entre un recurso que se administra y uno que se desperdicia por
caminar distraído.

**El control no rellena nada: suelta cajas.** Un relleno automático es un
premio que no se siente y no da ninguna decisión. Tres cajas tiradas que
hay que ir a pisar —con lo que eso implica si hay zombis cerca— son un
respiro que el jugador se gana caminando.

**El botiquín cura la mitad del TOTAL, no la mitad de lo que falta.** La
segunda cura mucho cuando estás por morir y casi nada cuando estás bien, o
sea que premia llegar hecho pedazos. Y el número sale de
`PLAYER.maxHealth`, no escrito a mano: si la vida máxima cambia, la cura la
acompaña sola.

**Los objetos son más grandes de lo que "deberían".** A veinte metros de
cámara, una caja de treinta centímetros son unos pocos píxeles y se
confunde con los escombros que ya hay en la calle. Lo que tiene que leerse
no es el tamaño real del objeto: es que **eso se levanta**. Por eso además
flotan y giran — nada más en la escena lo hace, así que cualquier cosa que
se mueva así se lee como interactiva sin explicar nada.

### Decisiones de la curación

**El botiquín se guarda; usarlo es una decisión aparte.** Antes curaba al
pisarlo. Un botiquín que cura al apretar —o al caminarlo— no es una
decisión: es un segundo medidor de vida, y la respuesta correcta a estar
herido es siempre "curarse ya". Con tiempo de uso la pregunta cambia a
**cuándo**.

**Para curarse hay que parar.** Moverse lo corta. Sin esta regla, curarse
mientras se corre sería gratis: el tiempo de uso no costaría nada porque se
gastaría haciendo lo que uno iba a hacer igual. Teniendo que frenar, el
costo es terreno y distancia, que es la moneda de este juego.

**Un golpe lo corta, y el botiquín NO se pierde.** Perderlo además de los
1,2 segundos sería castigar dos veces el mismo error, y llevaría a que
nadie se anime a usarlo nunca: lo contrario de lo que se busca. Por eso el
objeto se descuenta al **completar**, nunca al empezar — hay una prueba que
falla si alguien invierte ese orden.

**Se corta por cualquier daño, no sólo por un mordisco.** Está enganchado
al evento de daño y no al bucle, así que vale también para la explosión de
la propia bazooka. Es coherente: lo que corta la curación es que te pase
algo, no quién te lo hizo.

**Se mira la VELOCIDAD, no la entrada del joystick.** Soltar el dedo no
frena en seco —hay desaceleración— y cancelar por un resbalón de inercia se
sentiría arbitrario.

**Con la vida llena no arranca.** Gastar un botiquín para no curar nada es
el tipo de error que el juego tiene que impedir, no permitir y lamentar.

**Las vendas quedan fuera por ahora.** Dos objetos curativos obligan a un
selector, y en vertical con dos pulgares ocupados un selector es un
problema sin solución simple. El inventario es genérico y las acepta el día
que haya una forma de elegir que no estorbe. Con un solo tipo, la decisión
sigue siendo la que importa: **cuándo**.

### Lo que falta de la Fase 8

Este era el plan original. Tres tareas ya están hechas por el camino corto,
y **una se decidió al revés a propósito** (la 8.4): ver las decisiones de
arriba.

| # | Tarea | Estado |
|---|---|---|
| 8.1 | `InventorySystem`: con topes de carga | ✅ genérico; hoy sólo se usan botiquines |
| 8.2 | `PickupItem`: objeto en el mundo, visible y distinguible del decorado | ✅ |
| — | Vendas, además del botiquín | ❌ **descartada por ahora**: ver abajo |
| 8.3 | Que los objetos giren o floten suavemente para que se noten | ✅ |
| 8.4 | Detección de proximidad y botón contextual | ❌ **descartada**: se levantan caminándolos, sin botón |
| 8.5 | Recoger: el objeto desaparece y hay confirmación visible | ✅ |
| 8.6 | Que un objeto no se pueda recoger dos veces | ✅ con prueba |
| 8.7 | Que no se pueda recoger si ya estás al tope | ✅ se queda en el piso, que es mejor que avisar |
| 8.8 | Curarse: lleva tiempo (1,2 s) y hay que estar quieto | ✅ |
| 8.9 | Cancelar la curación si te golpean | ✅ y si te movés |
| 8.10 | Colocar los objetos según el plano de la Fase 3 | ✅ las zonas ya estaban definidas y nadie las usaba |
| 8.11 | Mostrar el inventario en el HUD de forma compacta | ✅ el contador va dentro del botón de curarse |
| 8.12 | Pruebas unitarias del inventario (topes, duplicados, consumo) | ✅ |

### Cómo se prueba

```
npm test             272 pruebas; 24 nuevas del inventario y la curación
npm run test:e2e     10 nuevas en el navegador, con perfil de celular
```

A mano, en el teléfono:

1. Arrancar → ya hay cajas repartidas por el mapa.
2. Llegar a un control → aparecen tres más.
3. Caminarlas → se levantan solas, con aviso en pantalla.
4. Con la mochila llena de botiquines → el siguiente **se queda** esperando.
5. Apretar curarse **parado** → tarda, y da media vida.
6. Apretar curarse y **salir corriendo** → se corta, y el botiquín queda.
7. Curarse **con un zombi encima** → el mordisco lo corta. Ésta es la
   prueba clave de la fase.
8. Reiniciar → el mapa vuelve como estaba, sin arrastrar lo del control.
9. Mantener el botón de disparar y arrastrar → el personaje gira y se ve la
   mira; se puede caminar para un lado y tirar para el otro.

### Criterio de salida

- [x] Recoger un objeto hace exactamente lo que se espera, y lo que no
      sirve se queda en el piso
- [x] Los objetos se distinguen del decorado de un vistazo: flotan y giran,
      y nada más en la escena lo hace
- [x] Curarse en medio del combate es una decisión arriesgada: tarda 1,2 s,
      hay que estar quieto, y cualquier golpe lo corta. Se validó
      reintroduciendo los dos errores posibles (que moverse no corte, y que
      el botiquín se gaste al empezar) y las pruebas fallan como deben
- [ ] La misión se puede completar con los recursos que hay, pero sin
      sobrar — **pendiente de jugarla entera**. Hoy hay 3 cajas de munición
      y 2 botiquines en el mapa, más 3 por cada control. Si sobra, se sacan
      del mapa; si falta, se suben los de los controles

---

# APUNTADO CON EL PULGAR ✅

**Objetivo:** poder caminar para un lado y disparar para el otro.

Pedido jugando. No estaba en ninguna fase del plan.

| Cómo | Qué hace |
|---|---|
| Un toque al botón | Dispara hacia donde mira el personaje |
| Mantener y arrastrar | Segundo joystick: apunta, y dispara seguido hacia allá |

### Decisiones que se tomaron

**El umbral de 18 px no es un detalle.** Un pulgar nunca toca un punto
exacto: al apoyarlo y levantarlo se mueve solo unos píxeles. Sin umbral,
cada disparo simple saldría apuntado a un lado al azar, que es peor que no
tener apuntado.

**Apuntar implica disparar, y tiene costo.** Mientras el pulgar está
arrastrado, el arma tira seguido respetando su cadencia. No hay forma de
"mirar" sin tirar, y con la pistola eso sale caro en ruido. Apuntar sin
tirar es para lo que están el cuchillo y las piernas. **Es lo primero que
hay que validar jugando**: si sale demasiado caro, se separa en dos gestos.

**El giro hacia el rumbo apuntado es instantáneo, no suavizado.** El pulgar
ya es el suavizado. Pasarlo por el mismo `turnSpeed` que el caminar haría
que la mira vaya atrás del dedo, que se siente como que el juego no
responde.

**La cuenta pantalla → mundo se sacó a `core/rumbo.js`.** La usan el
joystick de movimiento y el de apuntado, y tienen que coincidir
exactamente: si cada uno tuviera su versión, el día que una cambie el
personaje caminaría hacia un lado y dispararía hacia otro. Hay una prueba
que compara la función nueva contra la fórmula vieja copiada tal cual, para
que mover trigonometría de lugar no cuele un signo cambiado.

**La mira muestra el alcance REAL del arma.** Dos metros con el cuchillo,
veintiocho con la pistola. Es la forma más barata de que se entienda la
diferencia entre las dos armas sin leer nada.

---

# 🔧 EL ERROR DEL JOYSTICK ✅

Reportado jugando, y de los que no se encuentran leyendo el código:

> *"Si mantenés ahí, no se mueve. Tenés que apretar en cualquier otro lugar
> en blanco... Cuando hacés eso, si levantás y volvés a apretar el mismo
> lugar donde ahora se puso el stick, no te lo toma."*

**El joystick se escapaba del dedo.** La causa: `pointer-events: auto` sobre
el **dibujo** del joystick. El joystick no escucha nada —quien escucha los
dedos es el canvas, y el dibujo sólo se mueve a donde el canvas dice que
está el dedo—, pero al pedir eventos se convertía en una tapa justo encima
del lugar donde el jugador acababa de tocar:

1. Apoyás el dedo → cae sobre el dibujo, el canvas no se entera.
2. Apoyás en otro lado → anda, y el joystick **se muda ahí**.
3. Volvés a ese lugar → deja de andar.

Es la misma familia que el error de `#ui-layer` de la Fase 5: algo
decorativo puesto encima del canvas pidiendo eventos que no usa. **La regla
que queda: `pointer-events: auto` es para lo que TIENE un manejador.**

Hay una prueba que hace exactamente esa secuencia —tocar, soltar, y volver
a tocar el mismo punto— y se validó reintroduciendo el error: falla
nombrando al culpable.

### ⚠️ Lo que se aprendió de las pruebas

**El navegador de prueba corre a unos CUATRO cuadros por segundo** (WebGL
por software). Un `waitForTimeout(300)` puede no incluir ni un solo cuadro,
así que leer "lo que dibujó el juego" después de un tiempo fijo da
resultados al azar. Las primeras pruebas del apuntado fallaban por eso con
el juego funcionando bien. Ahora todo lo que depende del bucle se espera
**por condición**, contando cuadros reales.

---

# FASE 9 — La misión completa ✅ 🏁

> ⚠️ **Parcialmente superada el 7/11/2026.** La estructura —se gana, se pierde,
> se reintenta, el récord se guarda— se conserva. Lo que cambia: **seis
> controles en vez de dos**, cada uno es una esclusa que no abre hasta limpiar
> el tramo (**D-37**), el destino es la casa de Sergio (**D-41**), y al morir se
> reaparece **del lado de adentro** de la última puerta, porque del otro lado la
> cuadra ya no existe en memoria (**D-42**).

**Objetivo:** que se pueda jugar de principio a fin, ganar, perder y reintentar.

> **Éste es el "primer hito" del documento 01.** A partir de acá el juego
> existe: tiene principio, final, y una razón para volver a intentarlo.

### Tareas

| # | Tarea | Estado |
|---|---|---|
| 9.1 | Controles intermedios: detección, guardado y aviso | ✅ venía de la Fase 3 |
| 9.2 | Que no se puedan saltear: hay que tomarlos en orden | ✅ con prueba |
| 9.3 | Reaparecer en el último control al morir | ✅ |
| 9.4 | Meta final: sólo cuenta con todos los controles tomados | ✅ con prueba |
| 9.5 | Pantalla de victoria con tiempo, zombis y vida restante | ✅ |
| 9.6 | Pantalla de derrota, con el motivo y desde dónde se reanuda | ✅ y con su propio marcador |
| 9.7 | **Reinicio limpio** | ✅ con prueba que reinicia cinco veces |
| 9.8 | Guardar en `localStorage`: último control y mejor tiempo (D-14) | ✅ |
| 9.9 | Objetivo que se actualiza en cada tramo | ✅ venía de la Fase 3 |
| 9.10 | Indicador de dirección hacia el próximo objetivo | ✅ la brújula, de la Fase 3 |
| 9.11 | Ajuste de dificultad por tramo | ⚠️ las zonas tienen peso desde la Fase 3; falta **jugarlo** para ajustar |
| 9.12 | Pruebas automáticas del recorrido completo | ✅ `recorrido.spec.js` camina la ruta; `mision.spec.js` prueba las reglas |

### Decisiones que se tomaron

**El reloj NO se reinicia al morir.** Volver desde un control continúa el
**mismo** intento: el tiempo sigue corriendo y la muerte queda contada. Es
lo que hace que el mejor tiempo signifique algo —morir cuesta— sin
castigar con nada más. Un reloj que se pone en cero convertiría morir en
una forma barata de volver a empezar el cronómetro. Sólo *Reiniciar misión*
empieza de cero.

**Las estadísticas cuentan lo que el jugador puede cambiar jugando**:
tiempo, zombis eliminados, vida restante, golpes recibidos. No cosas que
simplemente pasan. Una pantalla que dice "ganaste" no enseña nada; una que
dice "11:42, 14 zombis, 38 de vida" le cuenta **cómo** ganó, y eso es lo
que hace que quiera volver a intentarlo distinto: más rápido, o más
entero, o sin disparar.

**Sin disparos, la puntería es `null` y no cero.** Un "0 %" al lado de "0
disparos" acusa al jugador de errar todos los tiros que no hizo — y pasar
la misión sin disparar es justamente una de las formas buenas de jugarla.

**El marcador se arma con el récord VIEJO, y recién después se guarda el
nuevo.** Al revés, la fila "mejor tiempo" siempre coincidiría con el tiempo
de arriba y no diría nada.

**La pantalla de derrota también lleva marcador.** Un "perdiste" sin
contexto se lee como un castigo; con el marcador, el intento fallido igual
dejó algo medido —cuántos controles, cuántos zombis, cuánto faltaba— y eso
es lo que invita a reintentar.

**Las muertes sólo se muestran si hubo.** Un "0 muertes" ocupa una línea
para no decir nada, y en una pantalla de teléfono las líneas valen.

**Todo el acceso a `localStorage` va envuelto.** En una ventana privada
tira excepción al escribir, con las cookies bloqueadas lanza al leer, y lo
guardado lo pudo escribir una versión vieja del juego. Hay pruebas con un
almacén que **falla en todo** y con datos corruptos: el juego tiene que ser
jugable igual, sólo que sin recordar. Si esto tirara, la pantalla de
victoria no se mostraría y parecería que el juego se colgó al ganar.

### 🔧 Lo que encontró la captura de pantalla

**Había DOS relojes**, `mission.elapsed` y `stats.tiempo`. Avanzaban con el
mismo `dt`, así que coincidían y el problema estuvo invisible... hasta que
la pantalla de victoria mostró uno en el subtítulo y el otro en el
marcador: **"0:00" arriba y "11:42" abajo, en la misma pantalla**.

No lo encontró ninguna prueba: lo encontró mirar la captura. Dos fuentes
para el mismo dato siempre terminan así.

Quedó uno solo —`stats`— y el subtítulo pasó a decir algo que el marcador
no dice ("Llegaste a Billinghurst 240"). De paso se borró `formatTime` de
`hud.js`, que era un segundo formateador de tiempo sin usar: la misma
duplicación un escalón más abajo.

Hay una prueba que exige que **ningún otro número con forma de reloj**
aparezca en la pantalla de victoria. Se validó reintroduciendo el error.

### Cómo se prueba

```
npm test             295 pruebas; 23 nuevas de estadísticas y progreso
npm run test:e2e     11 nuevas en el navegador
npm run verificar    la versión compilada, con perfil de celular
```

A mano, en el teléfono:

1. Ir directo a la meta salteando los controles → no completa.
2. Jugar la misión entera → victoria, con el marcador.
3. Ganar rápido y después lento → el récord no se pisa.
4. Cerrar la pestaña y volver → el récord sigue ahí.
5. Morir en el segundo tramo → se vuelve al primer control, **el reloj
   sigue corriendo** y la muerte queda contada.
6. Reiniciar desde la pausa cinco veces → el mundo queda igual cada vez.
7. **Darle el teléfono a alguien que nunca lo vio, sin explicarle nada.**
   ¿Entiende qué tiene que hacer? Ésta es la prueba más valiosa del
   roadmap, y es la única que no se puede automatizar.

### Criterio de salida

- [x] La misión se completa de principio a fin
- [x] Se puede reiniciar infinitas veces sin que nada se rompa — hay una
      prueba que reinicia cinco veces ensuciando el estado antes de cada
      una, y compara la escena entera; se validó metiendo una fuga de
      entidades a propósito
- [x] El progreso sobrevive a cerrar la pestaña, y también a no poder
      guardar
- [ ] **Una persona nueva entiende el objetivo sin que se lo expliquen** —
      pendiente: necesita una persona, no una prueba
- [ ] **El balance de dificultad por tramo** (9.11) — pendiente de jugarla
      entera. Las zonas ya tienen peso; falta saber si sobra o falta

### ⚠️ Lo que quedó anotado

**La misión nunca se jugó entera de verdad.** Las pruebas la completan
teletransportándose entre controles, que es lo correcto para probar las
reglas, y `recorrido.spec.js` camina la ruta con todos los obstáculos. Pero
nadie la jugó de punta a punta con zombis encima. Hasta que eso pase, el
balance —cuántos zombis, cuánta munición, cuántos botiquines— es una
hipótesis.

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

# FASE 12 — Arte original ❌ descartada

> **Esta fase ya no vale como plan. Su resultado visual se tira entero.**
>
> Se escribió y se ejecutó antes de que existiera `documentacion/visual/`.
> Cuando apareció la referencia, se comparó contra lo que se ve en pantalla y
> no se parece. **Lo reemplaza la [Fase 12R](#fase-12r--la-capa-visual-nueva)**,
> que no corrige esto: lo hace de nuevo.
>
> Queda acá entera, sin tocar, por dos motivos: las preguntas que se hizo
> siguen siendo las correctas (qué se exagera de una silueta, qué separa a un
> zombi de un humano, por qué el largo distingue un arma de otra), y porque
> borrar el registro de una decisión equivocada es la forma más segura de
> volver a tomarla.

**Objetivo (original):** reemplazar las cajas grises por la Buenos Aires del documento 01.
Es la fase más larga. Conviene hacerla en el orden de abajo, que es el de mayor
impacto visual por hora de trabajo.

### 12.A — Guía de estilo ✅

| # | Tarea | Estado |
|---|---|---|
| 12.1 | Paleta cerrada: 8 a 12 colores | ✅ **12 familias con rampa**, ver abajo |
| 12.2 | Escena de prueba con fachada, vereda, Gus, zombi y objeto | ✅ `estilo.html` |
| 12.3 | Resolución de texturas por tipo de objeto | ✅ **ninguna**, y está justificado |
| 12.4 | Nivel de detalle por tipo | ✅ presupuesto de triángulos |

**Dónde está:** `src/art/styleGuide.js` es la guía, y es **código**, no un
PDF que nadie vuelve a abrir. `tests/estilo.test.js` falla si la paleta
deja de cumplir sus propias reglas. `estilo.html` es la escena de prueba.

#### Por qué NO son 8 a 12 colores planos

La tarea pedía "paleta cerrada: 8 a 12 colores". La intención —coherencia—
se cumple, pero 8 a 12 colores *planos* rompen la regla que hace legible a
este juego: **dos superficies que se tocan nunca comparten valor**. El
asfalto, el cordón y la vereda se tocan entre sí y los tres tienen que
separarse solos.

Son **12 familias**, cada una con una rampa de cinco escalones derivados
del mismo tono. Todos los grises de la calle son la misma familia; lo que
cambia es cuánta luz reflejan. Hay coherencia de verdad —nada se elige a
ojo— y legibilidad al mismo tiempo. Y si mañana la calle tiene que tirar
más a marrón, se cambia **un** valor.

#### Lo que encontró la guía apenas se pudo medir

**Un toldo de comercio era más llamativo que la meta de la misión.** El
toldo amarillo estaba en 0,79 de saturación y la meta en 0,63. La regla
vieja decía "los colores saturados se reservan: toldos, taxis, semáforos y
objetos de misión", juntando en una frase cosas que no son lo mismo: un
toldo hay veinte, la meta hay una.

No se ve en una captura —los dos se ven "de color" y nadie los compara— y
sí se ve con un número. Ahora los decorados topan en 0,75 y lo de misión
arranca en 0,82, con una prueba que lo verifica.

#### Decisiones

**Sin texturas, y es una decisión.** El juego se abre desde un enlace en el
teléfono, muchas veces con datos: cada kilobyte es tiempo antes de poder
jugar. Las texturas además rompen el agrupado de mallas igual que los
materiales. Y a veinte metros de cámara el detalle de textura no se ve: lo
que se ve es la **silueta** y el **valor**. Lo que reemplaza a la textura
es geometría — un balcón de verdad en vez de un balcón pintado.

**El presupuesto de triángulos se ordena por cuántos hay en pantalla.** Gus
puede gastar porque hay uno; un objeto del piso no, porque hay muchos. El
número que de verdad limita en un teléfono son las llamadas de dibujo, no
los triángulos; estos topes están para que nadie meta un modelo de cien mil
"porque total los triángulos son gratis".

#### La escena de prueba tiene cámara ortográfica

Y eso es el motivo de que exista. En el juego la cámara está a veinte
metros y a 57 grados: desde ahí se ve si algo **se lee**, pero no si las
proporciones están bien.

La primera versión usaba perspectiva cerrada y tenía un defecto que la
invalidaba: la puerta de la fachada se veía más alta que la marca de 2,10 m
de una regla parada tres metros más adelante, **aunque las dos midieran lo
mismo**. Una herramienta para validar escala que deforma las alturas según
la profundidad no sirve. En ortográfica, lo que mide dos metros se ve de
dos metros esté donde esté.

Y monta **el mismo post-proceso que el juego**. Sin eso, la fachada ocre se
veía amarillo limón: el juego mapea los tonos con `TONEMAP_NEUTRAL` y sin
eso los claros se queman. Una escena de prueba que miente sobre los colores
es peor que no tenerla, porque lleva a "corregir" una paleta que estaba
bien.

#### Cómo se abre

```
npm run dev     y después http://localhost:5173/estilo.html
```

`←` `→` giran, `↑` `↓` acercan, `M` muestra las rampas de color en el piso.
Se compila junto con el juego: una guía que sólo funciona en desarrollo
deja de abrirse en cuanto alguien quiere mirarla desde el teléfono, que es
justo donde hay que mirarla.


### 12.B — Gus ✅

| # | Tarea | Estado |
|---|---|---|
| 12.5 | Completar la ficha | ✅ **como decisiones, no como dibujos**: ver abajo |
| 12.6 | Decidir mochila, guantes y dónde se guardan las armas | ✅ sin mochila, con guantes, pistola al cinto y cuchillo en la bota |
| 12.7 | Modelar o generar, y limpiar en Blender | ❌ **descartado**: se construye con primitivas en código |
| 12.8 | Exagerar el pelo con volumen y las solapas | ✅ son los dos rasgos de la silueta |
| 12.9 | Esqueleto compatible con Mixamo | ❌ **descartado**: jerarquía de primitivas, ver abajo |
| 12.10 | Nueve animaciones | ✅ todas, en `src/characters/pose.js` |
| 12.11 | Mezcla entre animaciones | ✅ 0,12 s |
| 12.12 | Anclaje del arma en la mano | ✅ `gus.anclaArma` |
| 12.13 | Reemplazar la cápsula | ✅ el controlador no cambió una línea |

#### La ficha se cerró con decisiones, no con dibujos

El documento 02 marcaba en 🔴 que faltaban vistas de frente, espalda, perfil
y cuerpo entero. **Siguen faltando**, y eso bloquea un modelo *realista*. No
bloquea éste.

A veinte metros de cámara Gus mide unos cuarenta píxeles de alto. A esa
escala no existen la barba de pocos días, el cierre en diagonal ni la
costura del bolsillo: lo único que llega al jugador es la **silueta** y el
**valor**. Así que lo que había que decidir no era cómo es la espalda de la
campera, sino **qué dos rasgos se exageran**. El propio 02 ya los nombraba:
el pelo con volumen y las solapas.

Las decisiones 🟡 que el 02 dejaba abiertas, cerradas:

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Mochila? | **No** | Redondea la espalda y mata el trapecio de los hombros, que es el rasgo que lo identifica desde arriba |
| ¿Guantes? | **Sí, oscuros** | Las manos son lo único de piel que se mueve rápido; con guantes la silueta del brazo queda limpia |
| ¿Dónde van las armas? | **Pistola al cinto, cuchillo en la bota** | Se ven, suman silueta y cuentan que está preparado |
| ¿La bazooka a la espalda? | **No** | Cambiaría la silueta por completo y aparece dos veces por partida |
| ¿Detalle facial? | **Ninguno** | A esa distancia la cara son tres píxeles |

#### Sin Blender y sin Mixamo, a propósito

- Un `.glb` con esqueleto y nueve animaciones pesa cientos de kilobytes. El
  juego se abre desde un enlace en el teléfono, muchas veces con datos: ese
  peso es tiempo antes de poder jugar. Es el mismo razonamiento que la
  decisión de no usar texturas.
- Todo el proyecto es texto versionable (D-01). Un binario exportado desde
  una herramienta externa no se revisa en un diff, no se prueba, y cuando
  algo sale mal no se sabe qué cambió.
- A veinte metros, lo que se lee de una animación no es la deformación de
  la malla: es el movimiento de los volúmenes grandes.

En su lugar hay un **esqueleto jerárquico de primitivas** —cada parte
cuelga de su padre y gira sobre su pivote, como un muñeco articulado— y las
poses se calculan con números que **se pueden probar**. Si algún día hace
falta deformación de verdad, el camino es el `.glb` y esta capa se
reemplaza entera.

#### Lo que las pruebas fijaron

Una animación mal hecha se ve rara pero no se puede describir, así que es
de las cosas que se "arreglan" moviendo números al azar. Ahora hay
condiciones que se cumplen o no:

- Las piernas van en oposición y los brazos al revés que las piernas del
  mismo lado. Sin eso, un caminar se lee como un muñeco arrastrado.
- **Las rodillas nunca doblan para el lado contrario.** Es el error más
  fácil de cometer y el más difícil de nombrar mirando la pantalla: se ve
  como una pata de saltamontes.
- El ciclo cierra: la fase 0 y la 1 son la misma pose, así que no hay un
  salto visible una vez por paso.
- Correr no es caminar más rápido: zancada más larga, torso más volcado y
  brazos más altos. Hay una prueba por cada una.
- La muerte avanza una sola vez y se queda. Un muerto que repite su caída
  en bucle es lo primero que delata que un juego está hecho de ciclos.

#### 🔧 Dos errores que encontró la medición

**Los pies quedaron enterrados.** El modelo medía 1,86 y la guía declara
1,80, así que se bajó la cadera seis centímetros. Lo que pasó no fue que el
personaje se achicara: **se hundió**. La altura total quedó igual y las
suelas quedaron bajo el asfalto. No tira ningún error y en el juego casi no
se nota.

Ahora la cadera **se deduce** de la cadena de la pierna, que es una
invariante y no una preferencia, y hay una prueba que exige que la suela
esté a altura cero.

**Los brazos se veían despegados del cuerpo.** Colgaban a 0,218 del eje;
con la campera de 0,44 de ancho y brazos de 0,12 de grosor, la mitad del
brazo quedaba fuera del torso. Se ve en una captura y no en un número.

**Y la ficha mostraba a Gus de espaldas.** El frente de los modelos es `-Z`
y la cámara mira desde `+Z`. Se veía bien, y era la vista equivocada: lo
que hay que juzgar son las solapas y la cara.

#### ⚠️ El costo, medido

Las llamadas de dibujo pasaron de **181 a 232**. Gus son 24 piezas, y las
que proyectan sombra cuestan una llamada extra cada una (por eso sólo
proyectan la campera, el cráneo y los dos muslos: a veinte metros la sombra
de un mechón cae dentro de la del cuerpo).

Es una regresión real y queda anotada. La salida natural es **fundir en una
sola malla los grupos que nunca se mueven entre sí** —cabeza y pelo son
cuatro piezas rígidas, el torso con la campera y las solapas son otras
cuatro— lo que bajaría de 24 piezas a unas 14. Es trabajo de la **Fase 13**,
que es la de optimización, y conviene hacerlo con los zombis y los props ya
puestos para medir todo junto una sola vez.

#### Cómo se mira

```
npm run dev     y después http://localhost:5173/estilo.html
```

Gus está en la escena de estilo, **animado**: las teclas `1` a `6` cambian
entre quieto, caminar, correr, atacar, recargar y curarse. Una ficha de
personaje con el modelo congelado en pose neutral no sirve para juzgar
nada; lo que hay que validar es si se lee **en movimiento**.

### 12.C — Zombis ✅

| # | Tarea | Estado |
|---|---|---|
| 12.14 | Silueta claramente distinta de Gus | ✅ y hay pruebas que lo fijan |
| 12.15 | Modelar, riggear y animar | ✅ seis poses, misma jerarquía que Gus |
| 12.16 | Dos o tres variantes de ropa | ✅ tres, repartidas parejo |

#### Qué hace que un zombi se lea como zombi

No es la sangre ni la cara: a veinte metros nada de eso existe. Son tres
cosas, y las tres son de **movimiento**:

1. **Asimetría.** Un humano camina parejo. Un zombi arrastra una pierna y
   lleva un brazo más caído que el otro. Es lo primero que el ojo marca
   como "algo anda mal" sin poder decir qué. Está en el código como un
   desfase de 0,12 de ciclo entre un lado y el otro, con una prueba que
   avisa si alguien lo "arregla" creyendo que es un error.
2. **Los brazos adelante y arriba**, no colgando. Es la silueta que lo
   separa de Gus desde la cámara cenital, que es el único ángulo desde el
   que se lo va a ver.
3. **El torso volcado** con la cabeza caída. Lo hace más bajo y más ancho
   aunque midan parecido.

Y una cuarta, que es la que más cuesta notar: **el zombi no contrapesa**.
Un humano camina con el brazo izquierdo acompañando la pierna derecha; el
zombi lleva los brazos tiesos adelante y apenas oscilan. Hay una prueba que
mide la relación entre la amplitud del brazo y la de la pierna: en Gus
tiene que ser alta, en el zombi baja.

#### Las medidas también los separan

| | Gus | Zombi |
|---|---|---|
| Alto | 1,80 m | 1,72 m |
| Ancho de hombros | 0,52 m | **0,38 m** |
| Postura | erguido | 26° volcado |
| Brazos en reposo | a los costados | al frente |

Gus tiene un trapecio ancho; el zombi, hombros caídos y angostos. A la
distancia de cámara esa diferencia de ancho es lo primero que separa las
dos siluetas, **antes que el color**.

#### Tres variantes, y por qué no más

Cada combinación de color crea un material, y cada material rompe el
agrupado de mallas. Con doce zombis en pantalla, tres variantes siguen
agrupando de a cuatro; con ocho variantes cada zombi sería su propio lote.

Lo que cambia es el **valor**, no el tono: una ropa clara, una media y una
oscura. A veinte metros eso es lo único que se nota, y alcanza para que una
horda no se lea como doce copias del mismo muñeco. Se reparten por índice y
no al azar: con azar podrían salir doce iguales, que es justo lo que las
variantes vienen a evitar.

#### 🔧 Lo que encontraron las pruebas

**Al recibir un golpe, el zombi se enderezaba pasando la vertical.** El
latigazo hacia atrás restaba 34 grados y lo dejaba en −8: por un instante
quedaba parado derecho, incluso inclinado hacia atrás, y en ese instante su
silueta era la de una persona. Dura dos décimas y es justo el momento en
que el jugador lo está mirando, porque le acaba de pegar.

**El animador volvía al reposo equivocado.** La máquina de estados de las
poses se reusó para el zombi, pero al terminar un mordisco volvía al estado
`QUIETO` de Gus, que no existe en la tabla del zombi: se quedaba en pose
neutral **humana**, parado derecho. Ahora el repertorio —poses, gestos,
estado de reposo, estado de muerte— entra por parámetro.

**El desplome dejó de ser un giro de la entidad.** Antes se rotaba la raíz
80 grados, lo que tumbaba también el eje sobre el que gira el cuerpo: el
zombi quedaba acostado pero seguía "mirando" hacia donde caminaba, y al
reciclarse había que acordarse de enderezarlo. Ahora es una pose.

**El destello de impacto colgaba de la raíz** con una posición fija
calculada contra el cuerpo viejo, que no se movía. Con el torso animado,
quedaría flotando separado del zombi justo cuando uno lo está mirando.

#### El costo

Las llamadas de dibujo quedaron en **232**, las mismas que con Gus solo: el
agrupado dinámico funde las mallas de los zombis que comparten material, y
las tres variantes siguen entrando. Las piezas por zombi pasaron de 8 a 13,
y sólo el torso y los dos muslos proyectan sombra.

### 12.D — Armas y objetos ✅

| # | Tarea | Estado |
|---|---|---|
| 12.17 | Cuchillo, pistola y bazooka | ✅ y se ven en la mano de Gus |
| 12.18 | Botiquín y caja de munición con silueta reconocible | ✅ las vendas no existen todavía (ver Fase 8) |

#### El largo es lo que separa las siluetas

Un arma en la mano de un personaje de cuarenta píxeles ocupa unos ocho. A
esa escala no existe el detalle: lo único que llega es el **contorno contra
el fondo**.

| Arma | Largo | Lo que la identifica |
|---|---|---|
| Cuchillo | 0,26 m | Corto y fino. Casi no sobresale de la mano |
| Pistola | 0,26 m | Corta pero con guardamonte: una **L** |
| Bazooka | **1,15 m** | Pasa el ancho del cuerpo y se apoya en el hombro |

Dos armas del mismo largo con formas distintas son la misma mancha; una
corta y una larga se distinguen aunque sean dos palos. Por eso la bazooka
mide más del doble del ancho de hombros de Gus, con la **cola marcada hacia
atrás**: esa cola es la mitad de lo que la identifica.

Los largos **no son los reales** —una 9 mm mide 19 cm, no 26— por la misma
razón que el pelo de Gus tiene más volumen del natural.

#### La bazooka aparece sólo al disparar

No se equipa: es un botón aparte (Fase 7). Pero disparar un cohete sin que
se vea de dónde sale es de las cosas que hacen que un juego se sienta hecho
de piezas sueltas. Aparece al hombro durante segundo y medio y vuelve el
arma que estaba.

#### Los objetos del piso tienen el problema contrario

No tienen que distinguirse entre sí: tienen que distinguirse **del
decorado**. La calle ya está llena de cajas chicas —escombros, bolsas,
cordones— así que lo que los separa es que **se mueven**: flotan y giran, y
nada más en la escena lo hace.

Lo que agrega esta parte es una marca encima que dice **qué** se va a
levantar: una cruz para el botiquín, una tapa alargada para la munición.
Dos siluetas que se distinguen a veinte metros sin leer un ícono.

#### Las armas no proyectan sombra

Son chicas, están en movimiento y su sombra cae dentro de la del brazo. Es
una llamada de dibujo por pieza que no cambia nada en pantalla.

---

## 🏁 FASE 12 — Revisión del criterio de salida

| Criterio | Estado |
|---|---|
| No quedan cajas grises provisionales | ⬜ **No.** Falta **12.E — La ciudad**: calles, fachadas, mobiliario, vehículos y cartelería siguen siendo el kit generado de la Fase 3 |
| El estilo es coherente entre todos los recursos | ✅ todo sale de `styleGuide.js` y hay pruebas que lo verifican |
| La escala es consistente | ✅ Gus 1,80, zombi 1,72, puerta 2,10, y pruebas que lo fijan |
| Los FPS en el teléfono no bajaron respecto a la Fase 9 | ⚠️ **las llamadas de dibujo subieron de 181 a 238.** Ver abajo |
| Alguien que conoce Buenos Aires la reconoce | ⬜ depende de 12.E, que es la parte porteña |
| Todos los recursos están en el registro de licencias | ✅ **no hay recursos externos**: todo es geometría generada en código |

### Lo que falta: 12.E

Las partes A, B, C y D están cerradas. **12.E — La ciudad** es la más larga
de todas —nueve tareas: kit modular de calles, fachadas, mobiliario
urbano, props porteños, vehículos, cartelería, barricadas, reemplazo del
generador y repaso de iluminación— y es la que decide dos de los seis
criterios de salida.

No se hizo porque no estaba en lo pedido. Queda como el siguiente paso
natural de la fase.

### ⚠️ El costo acumulado, medido

| Momento | Llamadas de dibujo |
|---|---|
| Fin de la Fase 9 | 181 |
| Con Gus (12.B) | 232 |
| Con los zombis (12.C) | 232 |
| Con armas y objetos (12.D) | **238** |

Los zombis salieron gratis gracias al agrupado dinámico: las mallas que
comparten material se funden. Gus no, porque es uno solo y se anima entero.

**La salida está identificada y es trabajo de la Fase 13**, que es la de
optimización: fundir en una sola malla los grupos de piezas que nunca se
mueven entre sí. En Gus, la cabeza con el pelo son cuatro piezas rígidas y
el torso con la campera y las solapas son otras cuatro; de 24 piezas se
bajaría a unas 14. Conviene hacerlo **con 12.E ya puesta**, para medir todo
junto una sola vez en vez de tres.


### 12.E — La ciudad ❌ **reemplazada por la Fase 12R**

Nunca se ejecutó. La Fase 12R cubre estas nueve tareas y además rehace lo que
la 12.A a la 12.D sí habían hecho. Quedan acá como registro de lo que se había
planeado.

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

# FASE 12R — La capa visual nueva 🔄

**Objetivo:** construir desde cero toda la parte visual del juego, siguiendo
`documentacion/visual/`. **La lógica no se toca. El arte actual no se reutiliza.**

---

## La regla madre

> **La única fuente de verdad visual es `documentacion/visual/`.**
> `REFERENCIA_VISUAL.png` manda la dirección artística; `PROMPT_MAESTRO.md`
> manda el método y los criterios de aceptación.

El arte que hay hoy —paleta, fachadas, árboles, autos, Gus, zombis, armas,
objetos, luz— **no se corrige: se reemplaza**. No se parte de él, no se
"mejora", no se toma como base. Se escribe una capa visual nueva al lado, se
enchufa al mismo contrato, y la vieja se borra.

Esto es un cambio respecto de lo que decía la Fase 12. Las decisiones 12.A a
12.D se tomaron antes de que existiera una referencia; ahora existe y no se le
parecen. **Quedan descartadas como arte.** Lo que sobrevive de ellas no es el
resultado, son dos o tres *instrumentos* de trabajo, y están listados abajo.

---

## Lo que NO se toca: la lógica

Esto está bien hecho, probado y jugándose de punta a punta. **Ninguna tarea de
esta fase puede modificar estos archivos** salvo para cambiar qué módulo visual
importan:

| Área | Archivos |
|---|---|
| Entrada y bucle | `src/main.js` (sólo los `import` y el armado) |
| Física y espacio | `src/physics/collisionWorld.js`, `src/core/rumbo.js` |
| Jugador | `src/player/playerController.js` |
| Enemigos | `src/enemies/zombieAI.js`, `src/enemies/spawnManager.js` |
| Combate | `src/combat/*` (balística, proyectil, explosión, controlador) |
| Objetos y misión | `src/items/itemLogic.js`, `src/items/inventario.js`, `src/missions/*`, `src/config/mission001.js` |
| Estado y servicios | `src/core/*`, `src/entities/health.js`, `src/input/inputManager.js` |
| Balance | `src/config/balance.js`, **menos el bloque `CAMERA`** |

Si al final de la fase el juego no se puede terminar igual que hoy, la fase está
mal hecha.

## Lo que sí se tira

| Archivo | Líneas | Qué era | Destino |
|---|---|---|---|
| `src/art/styleGuide.js` | 254 | Paleta de 12 familias y presupuestos | ❌ Reemplazado por `src/visual/paleta.js`, muestreada de la referencia |
| `src/world/palette.js` | 232 | Colores y acabados de materiales | ❌ Reemplazado por `src/visual/materiales.js` |
| `src/world/props.js` | 494 | Los 17 props de cajas | ❌ Reemplazado por `src/visual/kit/` |
| `src/world/lighting.js` | 216 | Luz, sol, faroles | ❌ Reemplazado por `src/visual/escena.js` |
| `src/characters/gus.js` | 463 | Gus de 24 primitivas | ❌ Reemplazado |
| `src/characters/pose.js` | 500 | Nueve animaciones de Gus | ⚠️ Depende de D-22: si Gus pasa a `.glb` con esqueleto, se va entero |
| `src/characters/zombiePose.js` | 242 | Animación del zombi | ⚠️ Igual |
| `src/characters/armas.js` | 181 | Cuchillo, pistola y bazooka de cajas | ❌ Reemplazado |
| `src/world/worldBuilder.js` | 943 | Generador de la cuadra | ⚠️ **Se parte en dos**: el trazado y las colisiones se conservan, el armado visual se reemplaza |
| `src/items/itemView.js` | 198 | Cajas de munición y botiquín | ❌ Reemplazado |
| `src/art/escenaEstilo.js`, `src/art/mainEstilo.js` | 525 | La escena de prueba | ♻️ Se rehace como **banco visual** (ver 12R.0) |
| `src/render/postProcess.js` | 170 | Mapeo de tonos y resolución | ♻️ Se conserva el mecanismo, se recalibra |

**Total a reescribir: unas 4.400 líneas.** Es la mitad del proyecto, y es
exactamente lo que se pidió.

## Lo que se reutiliza, y es herramienta, no arte

1. **El banco de pruebas visual** (`estilo.html`): la idea de tener una escena
   aparte para mirar el arte sin jugar es buena y se conserva. Lo que tenía
   adentro, no.
2. **`tools/captura.mjs`**: saca capturas con Playwright. Sirve tal cual.
3. **El agrupado de mallas** (`batchGroupId`, estático y dinámico): es
   infraestructura de rendimiento, no arte. Se conserva y se sigue usando.
4. **La caché de materiales**: el *mecanismo* de no crear dos materiales iguales
   se conserva; los colores que guarda, no.
5. **Las pruebas**: `tests/estilo.test.js`, `gus.test.js`, `pose.test.js`,
   `zombiPose.test.js` y `objetos.test.js` verifican el arte viejo. Se
   reescriben junto con lo que verifican, no se borran: una capa visual sin
   pruebas es como quedamos la vez pasada.

---

## El contrato entre la lógica y lo visual

Esto es lo más importante de toda la fase, y es lo que hace que se pueda
reemplazar el arte entero sin romper nada. **La lógica le pide estas cosas a la
capa visual y nada más.** Lo nuevo tiene que cumplir esta misma lista; si algo
tiene que cambiar, se cambia a propósito y se anota acá.

### Gus

| Lo que la lógica llama | Qué significa |
|---|---|
| `new Gus(entidadJugador, materiales)` | Se cuelga de la entidad que ya mueve el `playerController` |
| `gus.update(dt, { velocidad, corriendo, vivo, curandose })` | **La animación es una lectura del estado del juego, no una copia.** Esto se conserva sí o sí: no se agrega una máquina de estados paralela |
| `gus.gesto(Pose.ATACAR \| DISPARAR \| RECARGAR \| GOLPEADO)` | Gestos puntuales que dispara el combate |
| `gus.anclaArma` | Entidad en la mano de la que cuelga el arma |
| `gus.mostrarPistolaAlCinto(bool)` | La pistola guardada cuando lleva el cuchillo |

### Armas en la mano

| | |
|---|---|
| `new ArmasEnMano(gus.anclaArma, materiales)` | |
| `armas.equipar('knife' \| 'pistol' \| 'bazooka')` | Una visible por vez |

### Zombis

| | |
|---|---|
| `new Zombie(app, mundo, materiales, grupoLote, variante)` | |
| `zombie.update(dt, jugador, jugadorVivo, vecinos)` | La IA ya está adentro y **no se toca** |
| `zombie.recibirDaño(cantidad, info)`, `.vivo`, `.posicion` | |

### Objetos del piso

| | |
|---|---|
| `vistaObjetos.mostrar(objeto)` / `.quitar(id)` / `.update(dt)` / `.limpiar()` | El objeto trae tipo y posición; la lógica de recogida no sabe cómo se ve |

### El mundo

| | |
|---|---|
| `new WorldBuilder(app, collision, materialesLuz)` | |
| `builder.build(mission)` → `{ markers, stats }` | |
| `builder.mats` | La caché de materiales que usan Gus, zombis y armas |
| `collision.add(Box2D.fromCenter(x, z, ancho, fondo, tag, alturaCima))` | **La frontera crítica.** Lo visual puede cambiar entero; las cajas de colisión tienen que quedar donde están, o cambia el juego sin que nadie lo decida |

> **Regla de no-regresión:** si una tarea visual mueve una caja de colisión, hay
> que decirlo en el mensaje del commit. Un árbol más lindo que te deja pasar por
> adentro es un bug, no una mejora.

---

## Lo que encontró la revisión del 31 de octubre

Antes de escribir una línea se releyeron los documentos 01 y 02 enteros, el
roadmap, el código visual y las pruebas. Salieron cinco cosas, y tres cambian
el plan.

**1. Los números D-20 y D-21 ya estaban ocupados.** El documento 02 los usa para
"los objetos se levantan caminándolos" y "curarse lleva tiempo". Las decisiones
nuevas pasan a ser **D-22** a **D-25**. Parece un detalle y no lo es: dos
decisiones con el mismo número es la forma más rápida de que alguien aplique la
equivocada dentro de seis meses.

**2. Hay dos Gus, y no son el mismo personaje.** `documentacion/personajes/Gus.jpeg`
—la referencia de siempre, la del mockup del 30 de octubre— es campera de cuero
negra tipo motociclista, remera negra, jean y pelo en puntas.
`REFERENCIA_VISUAL.png` trae un superviviente de campera azul de jean, remera
gris y mochila. **Resuelto en D-24.**

**3. La luz de la referencia contradice una medición.** La referencia es de
tarde dorada, sol bajo y sombras largas. D-16 bajó eso con números: a 58° un
edificio de 17 m tira 11 m de sombra sobre una calzada de 10 y la tapa entera.
**Resuelto en D-25.**

**4. Bajar la cámara a 40° roba tiempo de aviso.** Los mockups del documento 02
están medidos: a 75° Gus mide 18 px y se ven 32 m de calle; a 66°, 26 px y 24 m;
a 57°, 40 px y 16 m. **Menos ángulo es más personaje y menos calle por delante.**
Y el zombi detecta a 16 m (`ZOMBIE_STANDARD.sightRange`). O sea que hoy lo ves
justo cuando él te ve. Si la cámara pasa a mostrar 11 m, el zombi te detecta
cinco metros antes de que vos lo veas, y eso no es una decisión artística: es
un cambio de dificultad que nadie pidió. **Cambia el criterio de 12R.1.**

**5. El anillo ámbar bajo Gus quedó sin justificación.** Se puso porque de noche,
vestido de negro sobre asfalto, el jugador perdía de vista su personaje. Pero el
juego pasó a ser de día (D-16) y la referencia no tiene nada parecido. Se revisa
en 12R.1 con la cámara nueva: si con Gus más grande ya no hace falta, se saca.

**La línea de base, medida hoy:** 418 pruebas unitarias en verde. De esas,
**114 son del arte** —`estilo` 19, `gus` 16, `pose` 39, `zombiPose` 26, `armas`
14— y se reescriben junto con lo que verifican. Las otras **304 son de lógica y
tienen que seguir pasando siempre**. Ése es el semáforo de toda la fase.

---

## Las decisiones nuevas

### D-22 — Pipeline híbrido

- **Ciudad, mobiliario, vehículos y props: geometría generada en código, nueva y
  diseñada.** Lo que falla hoy no es la técnica, es que las formas son pobres.
  Una fachada con balcones, ventanas hundidas y marquesina se arma con cajas y
  se ve bien; una caja lisa de color, no. El prompt maestro prohíbe *"geometría
  improvisada"* y pide *"formas diseñadas, siluetas legibles"*: eso se puede
  cumplir sin un solo archivo externo, y el juego sigue abriendo al instante
  desde el celular con datos.
- **Gus, zombis y armas: modelo `.glb` real y riggeado.** Acá las primitivas son
  el techo: la anatomía y las animaciones de un humano no se improvisan con
  cajas, y es lo que más mira el jugador. Si no aparece un modelo CC0 compatible,
  se pide el archivo, y mientras tanto lo que haya se declara **provisional**.

### D-23 — La cámara se acerca, con un piso que no se negocia

Corrige a **D-02**. Se conservan la diagonal de la calle y el campo horizontal,
que eran las dos partes de D-02 que resolvían un problema real de la pantalla
vertical. Lo que cambia es que hoy Gus mide unos 40 píxeles y es un ícono.

Pero bajar el ángulo a lo bruto sale caro, y está medido (ver el punto 4 de la
revisión). Así que la decisión no es un número, son **dos restricciones**:

| Restricción | Valor | Por qué |
|---|---|---|
| **Calle visible por delante** | **≥ 16 m**, nunca menos | Es el radio de detección del zombi. Si ves menos que eso, te detecta antes de que lo veas y la dificultad cambió sin que nadie lo decidiera |
| **Alto de Gus en pantalla** | **El máximo posible** dentro de lo anterior | Es lo que lo saca de ser un ícono |

**Y hay una tercera palanca, que es la que permite cumplir las dos:** correr el
punto al que mira la cámara **hacia adelante** del jugador, en vez de dejarlo
clavado sobre él. Así Gus baja en el encuadre y la calle que viene sube, sin
tener que levantar el ángulo. Es lo que hace cualquier juego de este tipo y hoy
no está.

El punto de partida a probar es **~45° y ~13 m con la mira corrida 3 o 4 m hacia
adelante**, y se ajusta midiendo, no a ojo.

**Va casi primera, y es la más barata.** Hasta que la cámara no esté donde va,
cualquier detalle que se modele no se ve y no hay manera de juzgar si quedó bien.

### D-24 — Gus es el modelo nuevo con la campera de cuero

**El cuerpo es el del paquete visual. La campera y la cara son las de Gus.**

El superviviente del panel de `REFERENCIA_VISUAL.png` es la base de todo:
anatomía, proporciones, postura, acabado, y el equipo que la referencia vieja
no tenía —mochila verde oliva, guantes sin dedos, cinturón con cartucheras,
reloj, zapatillas de lona—. Se copia entero, sin reinterpretar.

Lo único que cambia respecto de ese modelo son dos cosas, y son las que hacen
que sea **Gus** y no un superviviente genérico:

| | Qué |
|---|---|
| **La campera** | La de cuero negro tipo motociclista de `Gus.jpeg`, con solapas anchas, en lugar de la azul de jean del panel |
| **La cara** | Se corre **levemente** hacia la de `Gus.jpeg` —mandíbula, cejas, el pelo en puntas— sin salirse de la estética del modelo nuevo |

Todo lo demás del panel se respeta tal cual, incluida la **remera gris de
cuello en V**, que no es la negra de la foto. Sobre el cuero negro, una remera
gris es justamente lo que hace que la campera abierta se lea: con las dos
negras, el torso es una mancha sola. La prueba lo verifica (0.5 de separación).

> ✅ **La duda que esto arrastraba, resuelta en 12R.0.** De negro sobre asfalto
> Gus queda a 0.145 de luminancia: **se lee**. El problema del juego viejo no
> era que Gus fuera oscuro, era que el asfalto también lo era. Queda una sola
> cosa medida que hubo que corregir: el jean del modelo nuevo daba 0.042 contra
> el asfalto —las piernas se fundían con la calle— y se subió a 0.085. El
> anillo ámbar del piso probablemente sobra; se decide en 12R.1.

### D-25 — Sol alto, color cálido

La referencia es de tarde dorada; el juego se queda con el **sol a ~70-73°** de
D-16, porque tener la calzada despejada es jugabilidad medida y no una opinión.

De la referencia se toma **el color**: la luz cálida, el contraste, el cielo.
Parecido a la imagen sin perder el piso, que es por donde caminás y por donde
vienen los zombis.

---

## Lo que verifiqué sobre los assets

| Pregunta | Respuesta medida |
|---|---|
| ¿Internet desde el agente? | Sí |
| ¿Puedo mirar imágenes? | Sí — la referencia se analizó con visión |
| ¿Puedo sacar capturas del juego? | Sí, `tools/captura.mjs` |
| ¿Puedo bajar los `.glb` de threejsassets? | **No.** La URL del modelo responde 200 pero devuelve el HTML del login: hace falta la cuenta gratuita |
| ¿Personajes riggeados gratis ahí? | **No**, su sección de personajes es de pago |
| ¿PlayCanvas descomprime Draco de fábrica? | **No** en el paquete npm: está el parser, falta el `.wasm`. Hay que agregarlo o descomprimir antes con `gltf-transform` |
| Kenney | Bloquea las descargas automáticas (403) |
| Quaternius (CC0) | Responde; el catálogo es JavaScript y hay que revisarlo a mano |

> ⚠️ **El prompt maestro está escrito para Three.js** (`GLTFLoader`,
> `DRACOLoader`, `KTX2Loader`). Este proyecto es **PlayCanvas 2.23.3**. El
> equivalente es el *container asset*: `app.assets.loadFromUrl(url,
> 'container', …)`, que come `.glb` igual. El propio prompt lo contempla.
> **No se migra de motor.**

`documentacion/visual/ASSET_AUDIT.md` se crea **cuando exista el primer archivo
real**, con fuente, licencia, ruta y comprobación de carga. Antes no: una tabla
de assets que todavía no están es justo lo que el prompt prohíbe.

---

## La arquitectura nueva

Todo lo visual vive en un solo lugar, separado de la lógica:

```
src/visual/
  paleta.js        colores muestreados de REFERENCIA_VISUAL.png
  materiales.js    caché de materiales y acabados
  escena.js        sol, cielo, ambiente, niebla
  carteles.js      texturas de texto generadas por canvas
  registro.js      de dónde salió cada asset y con qué licencia
  kit/
    calle.js       calzada, cordón, vereda, cruce peatonal, rejilla
    fachada.js     módulos de planta baja y de piso tipo
    arbol.js
    mobiliario.js  poste, luminaria, semáforo, banco, cesto, cables
    vehiculos.js   auto, taxi, colectivo
    abandono.js    barricada, escombros, bolsas, cajones, contenedor
  personajes/
    gus.js
    zombi.js
    armas.js
    objetos.js     munición, botiquín, marcas de misión
```

`src/art/` y los archivos visuales de `src/world/` y `src/characters/` se borran
cuando su reemplazo está andando. **No quedan dos versiones conviviendo** más
allá de la tarea en curso.

---

## El orden de trabajo

17 tareas. Una por vez. El juego tiene que quedar **jugable al final de cada
una**: nada de un reemplazo grande que deja todo roto tres días.

| # | Tarea | Impacto | Riesgo |
|---|---|---|---|
| 12R.0 | Banco visual y paleta muestreada de la referencia | Base | Bajo |
| 12R.1 | Cámara y encuadre | Altísimo | Bajo |
| 12R.2 | Sol, cielo y atmósfera | Alto | Bajo |
| 12R.3 | El suelo: calzada, cordón, vereda, cruce | Alto | Medio |
| 12R.4 | Fachadas: kit modular de planta baja y pisos | Altísimo | Medio |
| 12R.5 | Cartelería con texto en español | Alto | Medio |
| 12R.6 | Árboles y canteros | Alto | Bajo |
| 12R.7 | Mobiliario urbano y cables | Medio | Bajo |
| 12R.8 | Vehículos | Medio | Bajo |
| 12R.9 | Abandono: barricadas, escombros, basura | Medio | Bajo |
| 12R.10 | Composición de la cuadra: variedad y densidad | Alto | Medio |
| 12R.11 | Gus | Altísimo | Alto |
| 12R.12 | Zombis | Alto | Alto |
| 12R.13 | Armas en la mano | Medio | Bajo |
| 12R.14 | Objetos del piso y marcas de misión | Medio | Bajo |
| 12R.15 | HUD | Medio | Bajo |
| 12R.16 | Medición, borrado del arte viejo y cierre | — | Medio |

### 12R.0 — Banco visual y paleta ✅

**Qué se hace.** Dos cosas que son la base de todo lo demás.

Primero, la paleta **se muestrea de `REFERENCIA_VISUAL.png`**, no se elige a
ojo: se leen los píxeles de las zonas que importan —asfalto, vereda, cordón,
cada fachada, los verdes de los árboles, la campera de Gus, la piel y la ropa de
los zombis, el botiquín— y de ahí salen los colores. Eso es lo que hace que el
resultado se parezca a la imagen en vez de parecerse a una idea de la imagen.

Segundo, el banco visual: `estilo.html` rehecho, con la referencia **al lado** de
la escena, en la misma pantalla, para comparar sin cambiar de ventana. Cámara
ortográfica (eso de 12.A estaba bien: una herramienta para validar escala no
puede deformar alturas) y el mismo mapeo de tonos que el juego, o los colores
mienten.

**Cómo se verifica.** La paleta se imprime en el banco al lado de los parches
recortados de la referencia: tienen que ser el mismo color.

#### Lo que se hizo

| Archivo | Qué es |
|---|---|
| `src/visual/paleta.js` | 58 colores medidos, la luz y las herramientas de medición |
| `tests/paleta.test.js` | 16 pruebas que fijan lo que la paleta promete |
| `src/visual/banco.js` + `estilo.html` | El banco, rehecho |
| ❌ `src/art/mainEstilo.js`, `src/art/escenaEstilo.js` | Borrados: 525 líneas |

#### Un píxel no es un color

Es lo primero que salió, y cambia el método entero. La referencia está bañada
en luz dorada de tarde: un píxel es el material **multiplicado por la luz**. Si
se copia el píxel como albedo y después el motor le pone su propio sol encima,
el color se dora dos veces y la escena termina naranja.

Así que primero hubo que medir la luz, sobre seis superficies que sabemos
blancas —la raya vial, la franja de la barricada, la carrocería del colectivo,
la franja del guante, la cruz del botiquín y la camisa del primer zombi—. Un
blanco fotografiado **es** el color de la luz:

| | R | G | B |
|---|---|---|---|
| La calle | 1.000 | 0.808 | 0.645 |
| Los paneles de personajes y objetos | 1.000 | 0.843 | 0.729 |

El albedo es el píxel dividido por eso. La calle está más dorada que los
paneles, que es exactamente lo que uno esperaría: la calle es exterior a las
17:30 y los paneles son de estudio.

#### Cinco colores no se podían usar como salieron, y los encontró la prueba

No se vieron mirando. Se escribieron las reglas como pruebas —"un zombi no se
funde con el asfalto", "el botiquín es lo más saturado del juego"— y fallaron.

| Qué | Medido | Puesto | Por qué |
|---|---|---|---|
| **Asfalto** | lum 0.42 | **0.335** | A 0.42 quedaba a **0.016** de la piel de los zombis: un zombi parado en la calle se fundía con el piso. Pero bajarlo tampoco era libre: el jean de Gus está en 0.25 y el cuero en 0.19, así que un asfalto oscuro se come al protagonista. La ventana que deja contento a todo el mundo va de 0.31 a 0.37 |
| **Piel de zombi** | lum 0.433 | **0.46** | Quedaba a 0.098 del asfalto, en el límite. Y un muerto está pálido, no bronceado |
| **Caja de munición** | lum 0.374 | **0.45** | En la referencia la caja está en sombra, y con ese valor no se despegaba del asfalto ni por luminancia (0.039) ni por color (0.107) |
| **Botiquín** | sat 0.71 | **0.80** | Quedaba **por debajo** del chaleco reflectante de un zombi, que es decorado. El único objeto que el jugador necesita encontrar no puede perder contra un chaleco |
| **Tronco de árbol** | lum 0.23 | **0.34** | Estaba a 0.044 de la hoja en sombra, y se tocan en todo el borde de la copa: el árbol se leía como una mancha sola. Además el plátano porteño tiene la corteza clara |

#### Y una respuesta a una pregunta abierta

**D-24 preguntaba si Gus de negro se iba a ver sobre el asfalto. Se ve.** El
cuero queda a 0.145 de luminancia del asfalto nuevo y a 0.24 de la piel de los
zombis. El problema que tenía el juego no era que Gus fuera oscuro: era que el
asfalto también lo era. Con esto, **el anillo ámbar del piso probablemente
sobra**, y se decide en 12R.1 con la cámara nueva.

#### Lo que el banco dejó a la vista para 12R.2

Comparando casillero por casillero, **todo el lado del juego se ve más rosado
que la referencia**. No es la paleta: es que hoy el banco ilumina con un sol
cálido y un rebote cálido, y nada aporta el frío del cielo sobre las caras que
miran a la cámara. En la referencia esas caras reciben sol cálido **y** cielo
frío a la vez. Es el primer trabajo de 12R.2.

#### Cómo se abre

```
npm run dev     y después http://localhost:5173/estilo.html
```

`E` cambia entre muestras y escala, `M` alterna el sol del juego con el medido
en la referencia, `H` esconde el panel.

### 12R.1 — Cámara y encuadre

**Qué se hace.** Según **D-23**, y no es poner un número: es encontrar el punto
donde Gus es lo más grande posible **sin bajar de 16 m de calle visible por
delante**. Tres palancas, en este orden:

1. **Correr el punto de mira hacia adelante** del jugador (3-4 m). Es lo que
   permite acercar la cámara sin perder la calle que viene. Hoy mira clavado
   sobre Gus.
2. **Bajar el ángulo y la distancia**: arrancar en ~45° y ~13 m.
3. Revisar `pitchMin`/`pitchMax`, `distanceMin`/`distanceMax` y el campo de
   visión, que al acercarse puede quedar corto.

**Cómo se verifica, con números.** Se agrega al diagnóstico de F1 **dos
lecturas**: alto de Gus en píxeles y metros de calle visibles por delante. Sin
eso esto se discute a ojo y no se cierra nunca.

| Medida | Hoy | Objetivo |
|---|---|---|
| Alto de Gus | ~40 px | el máximo que entre |
| Calle por delante | ~16 m | **≥ 16 m**, es un piso duro |

Y después, a mano: caminar la cuadra entera mirando si la cámara se clava en una
fachada o en un árbol (a 45° el rayo toca mucho más que a 57°), y mirar a Gus
**en el celular**, que es donde la pantalla es angosta.

**Lo que no puede romperse.** El apuntado por arrastre, que usa la dirección de
la cámara. La brújula al objetivo. Y la distancia a la que te das cuenta de que
viene un zombi: si bajó, la tarea está mal hecha.

**Además:** revisar el anillo ámbar del piso (punto 5 de la revisión). Si con
Gus más grande ya no hace falta, se saca; si hace falta, es porque el problema
real es que Gus va de negro, y eso se resuelve en 12R.11, no acá.

### 12R.2 — Sol, cielo y atmósfera

**Qué se hace.** Según **D-25**: sol a ~70-73° de elevación —eso no se toca,
está medido en D-16— pero con el color cálido de la referencia. La dirección se
saca de la imagen: la luz viene de atrás y a la izquierda, con las fachadas de
la derecha iluminadas. Cielo con horizonte, no un color plano. Sombras que den
volumen sin tapar a Gus. Revisar la sombra estirada de la captura actual.

**Ojo con dos cosas que D-16 ya aprendió a los golpes:** la saturación de la luz
ambiente tiñe todo —con un cielo azul franco el asfalto gris se ve azul marino—
y los albedos hay que calibrarlos **con la luz puesta**, no antes.

**Cómo se verifica.** Una fachada tiene que mostrar tres valores distintos
—frente, costado y hueco de balcón— sin tocarle el color.

### 12R.3 — El suelo

**Qué se hace.** Calzada angosta de calle de barrio, sin la línea punteada de
avenida. Cordón como volumen propio, con su amarillo gastado. Vereda de baldosa
con junta de geometría. Cruce peatonal. Rejilla de desagüe.

**Lo que no puede romperse.** Las cajas de colisión de cordón y vereda: definen
por dónde se camina y eso ya está probado.

### 12R.4 — Fachadas

**Qué se hace.** La tarea más grande, y la que más decide. Kit modular:

- **Planta baja:** local con persiana metálica, portal de edificio, local
  tapiado, zócalo, marquesina, toldo.
- **Piso tipo:** ventana con marco hundido, balcón con baranda y losa, persiana
  de enrollar.
- **Remate:** cornisa, tanque de agua, antenas.

Alturas de 2 a 6 plantas. **Sin repetir el mismo edificio en fila:** varía la
altura, el ancho, el color, cuántos balcones y dónde.

**Cómo se verifica.** Captura desde la cámara de juego al lado de la referencia.
Si la cuadra se lee como una fila de cajas, no está.

### 12R.5 — Cartelería

**Qué se hace.** Carteles con texto de verdad, generado por canvas y subido como
textura. **Es la única textura que vale la pena en todo el proyecto**, porque un
cartel sin letras no dice nada, y es la mitad de lo que hace que una calle se lea
como porteña. Comercios ficticios, en español, sin logos reales. Carteles de
calle con nombres del barrio.

### 12R.6 — Árboles

**Qué se hace.** Tronco que se abre en ramas, copa de tres a cinco volúmenes
irregulares con verdes distintos, cantero con su cordón. Variación de altura,
giro y color: hoy se nota que es el mismo árbol copiado.

**Criterio de aceptación textual del prompt:** *"los árboles no son esferas
verdes idénticas sobre cilindros"*.

### 12R.7 — Mobiliario urbano

Postes de luz con su brazo, semáforos, cables cruzando la calle (están en la
referencia y aportan muchísimo por lo poco que cuestan), bancos, cestos, parada
de colectivo con techo y lateral con publicidad.

### 12R.8 — Vehículos

Auto con carrocería, ventanas hundidas, ruedas visibles y paragolpes. Taxi.
Colectivo abandonado. **Proporciones medidas contra Gus y contra las puertas.**

### 12R.9 — Abandono

Barricadas de caballete rojo y blanco, escombros, bolsas de basura, cajones de
verdulería, contenedor volcado, persianas bajas con grafiti. Moderado: la
referencia muestra una calle abandonada hace poco, no una ruina.

### 12R.10 — Composición de la cuadra

**Qué se hace.** No es modelar, es acomodar. Revisar el generador para que no
ponga las cosas en fila perfecta ni repita el mismo módulo al lado del mismo
módulo. Densidad: la referencia tiene la calle vacía y las veredas con cosas.

**Cómo se verifica.** Capturas desde tres puntos del recorrido. Si las tres se
parecen demasiado entre sí, falta variedad.

### 12R.11 — Gus

**Qué se hace.** Primero buscar un modelo CC0 riggeado, probar que carga en
PlayCanvas, que la escala da 1,80 m, que el pivote está en los pies, que mira
para adelante y que trae animaciones de caminar, correr y atacar. Si aparece:
reemplazo completo, incluido el enganche del arma en el hueso de la mano. Si no
aparece: se pide el archivo, y mientras tanto se rehace la silueta con el nivel
de detalle de la referencia, **declarado como provisional en el README y en el
roadmap**.

**Quién es Gus: D-24.** El superviviente del panel de la referencia, copiado
entero —anatomía, proporciones, postura, mochila verde oliva, guantes sin
dedos, cinturón con cartucheras, reloj, zapatillas de lona, remera gris de
cuello en V— con **dos cambios y nada más**: la campera es la de cuero negro de
`Gus.jpeg`, y la cara se corre **levemente** hacia la de la foto. Sin margen:
lo que no esté en esas dos líneas sale del modelo nuevo tal cual.

Los dos rasgos que se exageran, porque son los únicos que llegan a la distancia
de cámara, siguen siendo **el pelo con volumen y las solapas**.

Los colores ya están medidos y probados en `src/visual/paleta.js`, y el banco
muestra cada uno al lado del píxel del que salió. **No hay nada que elegir a
ojo en esta tarea: hay que construir la geometría.**

**Lo que no puede romperse.** El contrato de arriba: `update` que lee el estado,
`gesto`, `anclaArma`, `mostrarPistolaAlCinto`.

**Criterio de bloqueo del prompt:** no se declara terminado un personaje sin
animación real.

### 12R.12 — Zombis

Humanoide con postura inclinada y hombros caídos, brazos colgando adelante, piel
gris verdosa, ropa civil rota con colores **distintos de los de Gus**. Silueta
que se distinga de la de Gus a distancia de cámara. Animación de caminar,
atacar, recibir daño y caer.

**Lo que no puede romperse.** La IA, la detección por vista y por ruido, y el
agrupado dinámico de mallas (es lo que hace que diez zombis no cuesten nada).

### 12R.13 — Armas en la mano

Cuchillo con hoja y empuñadura, pistola con corredera y culata, bazooka como
tubo con boca y mira. Con la cámara más cerca, ahora se ven. Escala correcta y
que no se despeguen de la mano al moverse ni al atacar.

### 12R.14 — Objetos del piso

Caja de munición verde militar y botiquín rojo con cruz blanca, los dos sacados
de la referencia. Tienen que **distinguirse del decorado de un vistazo**: son lo
único que el jugador necesita encontrar. Marcas de misión y de meta.

### 12R.15 — HUD

Va al final a propósito: el prompt dice que no se rediseña el HUD mientras el
mundo sea provisional. Lo que sí son errores de hoy y se arreglan: el objetivo
truncado en "hasta C…" y el panel que tapa la barra de la bazooka. Revisar que
nada tape a Gus, a los zombis ni a los objetos con la cámara nueva.

### 12R.16 — Medición y cierre

Borrar el arte viejo que quedó sin uso. Medir llamadas de dibujo y FPS en el
teléfono. Actualizar el README, que hoy dice que no se puede atacar y que todo
el arte es provisional. Escribir `ASSET_AUDIT.md` si entró algún archivo.

---

## Cómo se trabaja cada tarea

Esto es el procedimiento, y no se saltea. Es lo que pediste: que no haya fallas.

1. **Captura antes.** `node tools/captura.mjs`, guardada con el número de tarea.
2. **Se escribe el módulo nuevo en `src/visual/`**, sin tocar el viejo.
3. **Se mira en el banco visual** (`estilo.html`) contra la referencia, antes de
   enchufarlo al juego. Ahí se corrigen las proporciones, que es donde se pierde
   más tiempo si se hace jugando.
4. **Se enchufa al juego** cambiando un `import`, y recién ahí se borra el viejo.
5. **Consola sin un solo error.**
6. **`npm test` y `npm run test:e2e` en verde.** Si una prueba del arte viejo
   falla porque el arte cambió, se reescribe la prueba; si falla una de lógica,
   se revierte el cambio.
7. **Captura después**, al lado de la de antes y de la referencia.
8. **Llamadas de dibujo con F1**, antes y después. Techo duro: **238**, que es
   donde está hoy. Si una tarea lo pasa, se resuelve en esa tarea, no "después".
9. **Se sube y se prueba en el celular.** Nada se informa como terminado sin eso.
10. **Commit por tarea**, diciendo qué se reemplazó y si se movió alguna caja de
    colisión.

---

## Qué queda fuera de esta fase

La referencia muestra cosas que **hoy no existen en el juego** y que por eso no
se modelan todavía: escopeta, puños y guantes como arma, vendas, caja de munición
abierta con cartuchos sueltos, y los tres arquetipos de zombi (lento, rápido y
pesado) como enemigos con comportamiento propio —hoy hay uno solo con tres
variantes de color—. Tampoco entran audio ni interfaz nueva.

Se modela **lo que está activo**: la ciudad, Gus, un tipo de zombi, cuchillo,
pistola, bazooka, munición y botiquín.

## Criterio de salida

Del capítulo 10 del prompt maestro, filtrado a lo que hoy existe.

**Entorno**

- [ ] Calzada, cordón y vereda claramente diferenciados
- [ ] Fachadas con ventanas, puertas y balcones de escala coherente
- [ ] Se lee como un barrio porteño, no como edificios genéricos
- [ ] Los árboles no son esferas verdes idénticas sobre cilindros
- [ ] Los autos tienen carrocería y ruedas visibles
- [ ] Nada flota ni se hunde
- [ ] Variedad de alturas, colores, distancias y siluetas
- [ ] La iluminación crea volumen
- [ ] La cámara encuadra al personaje y deja leer la ruta
- [ ] Hay cartelería en español, legible

**Personaje y zombis**

- [ ] Gus no se lee como un conjunto de cubos
- [ ] Se le distingue ropa, calzado, cabeza, brazos y piernas
- [ ] Su escala coincide con puertas, autos y veredas
- [ ] Se mueve con animación real, o está declarado como provisional
- [ ] El zombi se distingue de Gus de un vistazo
- [ ] El arma se ve en la mano y no se despega

**Jugabilidad y costo**

- [ ] Munición y botiquín se distinguen del decorado
- [ ] Recogerlos sigue cambiando el estado del juego
- [ ] Los controles táctiles siguen funcionando
- [ ] La misión sigue pudiéndose terminar
- [ ] Ninguna caja de colisión se movió sin decirlo
- [ ] Las llamadas de dibujo no superan 238, o está justificado
- [ ] No queda arte viejo sin usar en el repositorio

**Regla de bloqueo.** Si falla un requisito principal de personaje, zombi o
entorno, **no se marca como terminado**. No se tapa la falta de modelos con
iluminación, niebla ni interfaz.

## Riesgos conocidos

| Riesgo | Cómo se maneja |
|---|---|
| No aparece un modelo riggeado gratis para Gus y los zombis | Se pide el archivo. Mientras tanto, provisional declarado, nunca "terminado" |
| El detalle nuevo dispara las llamadas de dibujo | Se mide en cada tarea, no al final. El agrupado estático ya está armado |
| Mover geometría mueve colisiones sin querer | Las colisiones se tocan sólo a propósito y se dice en el commit |
| Las texturas de cartel pesan | Se generan en el navegador con canvas: no suman descarga |
| La cámara más baja deja ver cosas que antes no se veían | Por eso va segunda: todo lo que se modele después ya se juzga con la cámara final |

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

# FASES 16 a 20 — El cambio del 7 de noviembre 🔄

**El plan está en [`03_roadmap.md`](03_roadmap.md), en las fases 16 a 20 y en
las decisiones D-26 a D-34.** Acá va lo que no cabe en un plan: por qué se
cambió, qué encontré revisando, y las dos cosas en las que me había
equivocado.

---

## Lo que pidió Gus, y de qué tamaño es

El 7 de noviembre Gus pidió, en un solo mensaje: el recorrido real de Buenos
Aires con seis coordenadas, sacar los ítems, sacar la bazooka, sacar caminar,
sacar el cambio de arma, sacar todos los botones de acción, combate
automático al estar quieto, estadísticas nuevas, power-ups en cartas al llegar
a cada control, y usar los 461 MB de assets que acababa de bajar.

**No es una lista de ajustes: es otro juego.** Y conviene decirlo sin
adornos, porque el riesgo de un cambio así no es hacerlo mal, es hacerlo de a
pedacitos y terminar con un híbrido que no es ninguno de los dos. De ahí que
la primera fase sea **borrar**, no construir: con el juego más chico, todo lo
que viene después se piensa una sola vez.

---

## Las dos cosas en las que me había equivocado

### 1. D-04 estaba mal medida, y por eso descarté la herramienta correcta

Gus preguntó por qué nunca apliqué la herramienta que, según él, servía para
replicar Buenos Aires con fotos o diagramas 3D. La pregunta es justa y la
respuesta tiene dos partes.

**La parte en la que tenía razón.** Lo que el documento 01 proponía para eso
eran SuperSplat, gsplat —las dos, Gaussian Splatting— y CesiumJS. El
documento 02 las descartó, y el argumento sigue siendo correcto: **un splat es
una nube de puntos sin superficie**. No se puede colisionar contra él, no se
ilumina, no proyecta sombras y pesa cientos de megabytes. En un juego donde
un zombi tiene que chocar contra una pared, un splat es una pared que no
existe. Eso no cambió y no va a cambiar.

**La parte en la que me equivoqué, y es la que importa.** El documento 02
tenía, debajo de D-04, la NOTA-02: *"si en algún momento querés la escala
real, el camino es traer la traza de calles desde OpenStreetMap y generar las
manzanas por código"*. Ésa era la herramienta correcta, y quedó archivada
porque D-04 había decidido comprimir el recorrido a 350 m.

**Y D-04 decidió eso sobre un dato falso.** Dice, textual, que la distancia
real entre los dos extremos es *"de varios kilómetros, atravesando varios
barrios"*. Lo medí con las seis coordenadas de Gus:

| Tramo | Distancia |
|---|---|
| Independencia 3250 → Agrelo 3400 | 344,8 m |
| Agrelo 3400 → Maza 379 | 356,8 m |
| Maza 379 → Av. Boedo 120 | 351,2 m |
| Av. Boedo 120 → Mario Bravo 90 | 311,5 m |
| Mario Bravo 90 → Billinghurst 250 | 259,6 m |
| **Total** | **1.623,9 m** |

**1,6 km en cinco tramos parejos.** Ni varios kilómetros, ni varios barrios:
Boedo y Almagro, pegados. Y cada tramo mide entre dos y tres cuadras
porteñas, o sea que los controles de Gus caen justo donde un nivel los
pondría si los hubiera diseñado alguien.

**La lección, que es la misma de los árboles y la misma del sol a 17°:** la
estimación a ojo de una cantidad medible es una decisión tomada sin dato. D-04
no se equivocó al comprimir —comprimir sigue siendo lo correcto, y Gus eligió
el 40 %—; se equivocó al justificarlo con un número inventado, y ese número
sirvió después para archivar la única herramienta que servía.

### 2. Los assets: dar por cerrado el tema después de probar una fuente

Esto ya estaba escrito en la 12R.A y vale repetirlo porque el banco de Gus lo
confirma: había dado por cerrado el tema de los assets después de probar una
sola biblioteca. Ahora hay 461 MB de modelos riggeados en la máquina, con
licencias limpias, y la mitad de la Fase 12R eran tareas para modelar a mano
lo que ya existe descargado. Seis de esas tareas se las lleva la Fase 20.

---

## Lo que encontré revisando, y que nadie había anotado

**El generador no soporta el recorrido nuevo.** `src/world/worldBuilder.js`
exige que cada tramo esté alineado a un eje — es un requisito que estaba
escrito en el comentario de `mission001.js` y que nunca molestó porque los
tres tramos de hoy son rectos y perpendiculares. Los cinco rumbos nuevos son
−42,1°, −29,2°, −30,5°, +6,4° y +25,6°: **ninguno**. Y las ochavas de la
12R.3 están hechas para esquinas de 90°; un giro de 13° no es una esquina,
es una curva. Es la tarea 18.1 y la 18.2, y es la más técnica del bloque.

**El apuntado automático ya está escrito, y está en el archivo que se va a
borrar.** `objetivoAutomatico()` vive en `src/combat/explosion.js` porque era
el apuntado de la bazooka (D-03). Es exactamente la función que necesita el
combate automático de la Fase 17. **Hay que rescatarla antes de borrar la
bazooka**, no reescribirla después: es el tipo de cosa que se pierde en un
borrado grande y se vuelve a inventar peor.

**"Quieto" no es una cosa obvia.** Con `deceleration = 34` y 6 m/s, Gus tarda
0,18 s en frenar del todo después de soltar el joystick. Si "quieto" se define
como velocidad cero, el disparo arranca dos décimas tarde y se va a sentir
pegajoso; si se define como joystick en cero, arranca mientras Gus todavía se
desliza. Hay que elegir y hay que probarlo en el teléfono: es la tarea 17.2.

**Los checkpoints se quedan sin premio entre la Fase 16 y la 19.** Hoy lo que
hace que llegar a un control valga la pena es `CHECKPOINT_DROP`: dos cajas de
munición y un botiquín tirados en el piso. La 16.1 lo borra y la 19 lo
reemplaza por las cartas. En el medio, el juego va a ser más pobre que hoy.
Es aceptable y es temporal, pero hay que saberlo mientras se prueba, para no
confundir "falta la Fase 19" con "el cambio salió mal".

**Más de la mitad del banco no carga.** El pack de autos, el de armas y el
CryptZombie vienen sólo en `.fbx` o en formato Godot. PlayCanvas carga `.glb`.
Falta un convertidor, y es bloqueante: tarea 20.1. El detalle de los pesos y
las licencias está en
[`visual/ASSET_AUDIT.md`](visual/ASSET_AUDIT.md).

---

## Segunda pasada, el mismo día: dos cosas que corregí

Gus leyó lo de arriba y respondió tres cosas que cambian el plan. Dos de
ellas me obligan a corregirme, así que van acá y no en el plan.

### Pedir giros cuadrados no simplificó el aspecto: borró las dos tareas más riesgosas

Gus pidió que los giros sean siempre de 90°, las manzanas cuadradas, y que la
cuadrícula se guíe por el mapa real sin copiarlo. Es **D-35**.

Yo había escrito que abrir el generador a ángulos arbitrarios (18.1) y
recalcular las ochavas (18.2) eran *"la tarea más técnica de todo el bloque"*.
**Las dos se cancelan.** El generador ya exige tramos alineados a un eje —era
una limitación— y ahora resulta que la limitación era la especificación. Las
cuatro ochavas de la 12R.3 están hechas para 90°, que es exactamente lo que
va a haber.

**La lección, y es incómoda:** yo venía tratando la restricción del generador
como deuda a pagar. Era una decisión de diseño que nadie había tomado
explícitamente, y cuando se tomó —cuadrícula— resultó que estaba bien. Antes
de abrir un sistema para que soporte un caso nuevo, conviene preguntar si el
caso nuevo hace falta.

**Cómo quedó el trazado.** Siete tramos de una cuadra de 100 m, con un control
en cada esquina: 700 m caminados, 117 s a 6 m/s. El recorrido real se desplaza
437 m al oeste y 1.413 m al norte, proporción 1 a 3,2; la escalera se desplaza
100 al oeste y 400 al norte, 1 a 4. Conserva el carácter —se va al norte
bordeando hacia el oeste— con siete cuadras en vez de dieciocho. Lo calcula
`tools/recorrido-real.mjs` y lo fijan quince pruebas en `tests/trazado.test.js`,
entre ellas la que importa: **todos los giros son de 90° o derecho**. Si
alguien mete un tramo en diagonal, la prueba se pone roja antes de que el
mundo se arme mal.

Los dos controles nuevos que pidió Gus caen en los tramos 1 y 3, y **les falta
dirección**. No la invento: el documento 02 advierte que si el cartel no
coincide con el barrio, cualquier porteño lo nota, y Gus es porteño. Lo cierra
la tarea 18.10, con el mapa a la vista.

### El convertidor no era un bloqueante, y el diagnóstico estaba mal

Había escrito que faltaba un convertidor por Blender y que era bloqueante
porque *"más de la mitad del banco no carga"*. Gus pidió buscarle la vuelta.
Se la busqué midiendo, y la conclusión es que **el problema que describí no
era el problema que hay**.

Escribí `tools/inspeccionar-glb.mjs` —lee el contenedor GLB y el JSON de
glTF, sin dependencias— y lo corrí sobre el zombi estándar:

| | |
|---|---|
| Peso | 3,97 MB |
| **Texturas** | **2,75 MB, el 69 %**: tres PNG de 1024 × 1024 |
| Geometría | 1,05 MB, 14.572 triángulos, 21 huesos |
| Animación | 0,11 MB, y **seis animaciones ya nombradas** |

**Tres cosas que esto cambia.**

Primero: el peso es un problema de texturas, no de formato ni de geometría. Y
**Gus se ve a 43 píxeles de alto en el teléfono** —lo midió la 12R.1—, así que
una textura de 1024 × 1024 es veinticuatro veces más de lo que hace falta. A
256 × 256, esos 2,75 MB son 0,17.

Segundo: de las tres texturas, dos son un mapa de normales y uno de
metallic-roughness. **El estilo es low-poly mate** (D-33): no se usan. Tirarlas
no es una optimización con pérdida, es sacar algo que nunca se iba a dibujar.

Tercero, y es lo mejor: el zombi **ya trae las seis animaciones que la Fase 17
necesita** —Walk, Run, Swipe, Bite, Stumble, Die— con los nombres puestos. La
tarea 20.11 se achica sola.

Resultado: 3,97 MB → ~1,2 MB **sin instalar nada**, con un script propio,
porque quitar imágenes de un `.glb` es cirugía de JSON y de buffers, no
procesamiento de imagen.

**Y los `.fbx` tampoco son un problema.** Verifiqué los 355: **los 355 son
Kaydara FBX Binary**, que es el formato que todo convertidor soporta, y pesan
kilobytes —el taxi 0,08 MB, un banco de plaza 0,02 MB—. Hay tres salidas, y se
prueban en orden de costo: Poly Pizza primero, que es gratis y **ya funcionó en
este proyecto** (los dos árboles de la 12R.6 salieron de ahí) y que
redistribuye los packs de Quaternius —que son los autos y las armas— en `.glb`
por URL directa; FBX2glTF después; Blender al final.

Y lo que no hace falta convertir: el banco tiene **170 archivos `.glb`/`.gltf`**.
Eso ya cubre el zombi, los esqueletos, Gus, las animaciones y todo KayKit. Sin
`.glb` quedan sólo los autos, las armas y el CryptZombie.

**La lección, que es la tercera vez que aparece en este proyecto:** "pesa
4 MB" no es una medición. Las mediciones de verdad —el sol a 17°, la distancia
de 1.624 m, estas tres texturas— siempre dijeron algo distinto de lo que yo
suponía, y siempre a favor.

### Lo que Gus dejó a mi criterio, y cómo lo resolví

**Qué cuenta como "quieto"** (D-28). Queda así, y lo escribo antes de
escribirlo en código para poder discutirlo mirando el resultado:

> Gus está quieto **cuando el joystick está en cero**, no cuando la velocidad
> llega a cero. Los 0,18 s que tarda en frenar por inercia cuentan como
> quieto: el jugador ya soltó, ya decidió. Si esperáramos la velocidad, el
> primer tiro saldría dos décimas tarde, y en un juego donde doce golpes te
> matan, dos décimas por parada se sienten como que el personaje duda.
>
> Y hay **0,15 s de retardo** antes del primer tiro. No para castigar: para
> que un roce del pulgar no dispare, y para que se vea a Gus frenar y encarar
> antes de que salga la bala. Soltar y volver a tocar dentro de esos 0,15 s no
> cuenta como haber estado quieto.

Si jugándolo se siente lento, lo que baja es el retardo, no la regla.

**El tiro no falla nunca salvo barrera** (D-36), que Gus sí decidió. Esto mata
la dispersión de la pistola (`spreadDegrees`, hoy 2,5°) y el apuntado asistido
entero: existía para perdonarle el temblor del pulgar a alguien que apuntaba a
mano, y ya no hay nadie apuntando a mano. El rayo de `ballistics.js` se queda,
pero sólo para preguntar **qué hay en el camino**, que es la única pregunta que
sobrevive. Y está bien que sea así: con dispersión, el jugador que se paró en
el lugar correcto podía perder igual por azar, y eso rompe lo único que el
juego le pide. Si el tiro falla tiene que ser porque hay un auto en el medio,
y eso se ve y se resuelve moviéndose.

### Los power-ups van en dos tiempos

Gus dijo que por ahora el control sólo marca la llegada, y que la lista de
mejoras la va armando. Así que la Fase 19 se parte: **19A** —el control
guarda, avisa y deja un gancho— se puede hacer ya y no bloquea nada. **19B**
—las tres cartas— no se empieza sin la lista, porque una mejora que suma daño
y una que cambia el tipo de disparo se implementan distinto, y descubrirlo a
mitad de camino significa rehacerlo. Lo que necesito de Gus está en el plan,
en la Fase 19; el pool propuesto queda como punto de partida o como algo que
contradecir.

---
## Tercera pasada: la barricada, y un error que estaba escondido

Gus agregó cinco cosas, y una de ellas no es un agregado: es el juego.

### La barricada cambia qué es Explorar BA

Hasta acá el control era una luz en el piso que guardaba el progreso. Ahora es
una **barricada de autos que corta la calle y no abre hasta que no quede un
zombi vivo en el tramo**; cuando se limpia, los dos autos del medio explotan y
dejan el paso. Es **D-37**.

**Esto no es una mecánica más: es la que faltaba.** El juego tenía un problema
de diseño que yo no había nombrado, y es que con el combate automático se
podía terminar la misión **sin disparar una sola vez**: corrés los 700 m, los
zombis te muerden en el camino, y si llegás con vida ganaste. El combate
quedaba de adorno, y la única decisión del jugador —cuándo frenar— no tenía
por qué tomarse nunca.

La barricada lo arregla de raíz. Para matar hay que frenar, y para pasar hay
que matar. La decisión única pasa a ser **obligatoria** siete veces, una por
cuadra. Y recién ahora los power-ups de los controles tienen sentido: cada
cuadra limpia es un premio ganado, no un peaje pagado.

**Lo que cuesta, y conviene tenerlo escrito antes de empezar.**

**1. La misión se alarga mucho.** Hoy el mapa tiene unos 24 zombis —la suma de
los pesos de las zonas por cinco—, que son unos 3 por tramo. Con la barricada,
la población por tramo deja de ser ambiente y pasa a ser **la perilla que
decide cuánto dura cada cuadra**. Y "más frenético", que es lo que pidió Gus,
quiere más zombis. La misión puede irse de dos minutos a diez o quince. No es
un problema, es una decisión, pero hay que tomarla midiendo.

**2. El último zombi escondido.** Es la frustración clásica de cualquier
puerta de este tipo: limpiaste la cuadra, la barricada no abre, y hay uno
trabado detrás de un árbol a cuarenta metros. **No se puede dejar sin
resolver**, así que van dos cosas: un contador en pantalla de cuántos quedan,
y —esto es lo que de verdad lo arregla— que mientras la barricada te frene, la
brújula **deje de apuntar al control y apunte al zombi vivo más cercano**. La
brújula que Gus pidió agrandar termina teniendo dos trabajos, y el segundo es
el que salva la mecánica.

**3. Un zombi inalcanzable traba la partida para siempre.** Con las bocacalles
tapadas (D-34), un puesto de aparición que caiga en un hueco cerrado es un
zombi que no se puede matar y una barricada que no abre nunca. Los puestos
tienen que estar sobre la ruta caminable, y eso lo verifica una prueba contra
el mapa construido. A ojo no se ve: el hueco puede estar a dos cuadras de
donde uno mira.

### El error que estaba escondido, y que la barricada vuelve fatal

Fui a ver si "matar a todos" era siquiera posible con el `SpawnManager` que
hay, y la respuesta es que **casi**.

Lo bueno: la población **es finita y determinista**. `#calcularPuestos` arma
una lista fija de puestos a partir de las zonas de la misión —`peso * 5` cada
una— y `puestosUsados` hace que cada puesto se encienda una sola vez. No hay
reaparición infinita. O sea que contar tiene sentido.

Lo malo está en [`src/enemies/spawnManager.js:184`](src/enemies/spawnManager.js#L184).
Cuando el jugador se aleja más de 55 × 1,4 m de un zombi que no lo está
persiguiendo, el zombi se apaga y se saca de `enJuego` — **pero su puesto
sigue marcado en `puestosUsados`**, y `puestosUsados` sólo se limpia al
reiniciar la partida.

**La consecuencia: un zombi del que te alejaste se va del juego sin morir, y
no vuelve nunca.**

Hoy eso es invisible. Nada en el juego depende de cuántos zombis mataste, así
que un zombi que se evapora a tus espaldas no se nota; si acaso, se siente
como que el mapa "se calma" cuando avanzás, que hasta parece intencional.

Con D-37 es fatal. El juego le va a decir al jugador *matá a todos los
zombis*, el contador va a decir que faltan dos, y esos dos **ya no existen**.
La barricada no abre jamás y la partida es imposible de terminar. Por eso la
tarea 19A.0 es condición previa de todo lo demás de la fase: hay que liberar
el puesto cuando se apaga un zombi **vivo**, y dejar marcados sólo los puestos
de los que de verdad murieron.

**Lo que me deja pensando.** Este error estuvo todo el tiempo y pasó por
cuatro fases y 459 pruebas sin que nada se quejara, porque **ningún sistema le
preguntaba al juego cuántos zombis quedaban**. No lo encontró una revisión de
código: lo encontró una regla nueva que necesitaba un número que nadie pedía.
Es la mejor razón que conozco para escribir la mecánica antes de programarla:
leer D-37 obligó a preguntar "¿se puede contar?", y ahí apareció.

### Lo que la barricada rescata de la basura

En el plan de la mañana, la tarea 16.3 borraba la bazooka entera: el contador,
la barra, el cohete, el daño por área y **`src/combat/explosion.js` con sus
efectos**. Ya había advertido que `objetivoAutomatico()` vivía ahí y que había
que salvarlo antes.

**Resulta que había que salvar tres cosas, no una.** La barricada explota, así
que la explosión y el empujón de la onda —que es lo que manda los dos autos a
los costados— pasan a ser requisitos, no restos. Lo mismo con el pack
`ExplosionFXFree`, que en el plan de la mañana figuraba como "sin uso: la
bazooka se fue".

Casi me pasa dos veces con el mismo archivo, y el patrón es claro: **en un
borrado grande, lo que se pierde no es el código que uno recuerda, es el que
estaba guardado en el lugar equivocado.** `objetivoAutomatico()` y la
explosión no tenían por qué vivir dentro de la bazooka; vivían ahí porque fue
quien los necesitó primero.

### Gus se queda como está, y es la medida de todo lo demás

Gus dijo que el formato de Gus está bien y le gusta, que la cámara no se mueva
más de lo que se mueve hoy, y que todo lo demás tenga su misma escala y su
mismo acabado. Es **D-39**.

Dos cosas que esto cambia de lo que tenía pensado.

**La 20.7 se acota.** No es "traer un modelo de Gus": es traerle un modelo
riggeado que, puesto al lado del de hoy, se reconozca como el mismo personaje
—misma escala, mismas proporciones, mismo acabado mate— más la campera de
cuero de D-24. Si no se parece, no entra. Y la 20.0 pasa a ser medir a Gus,
porque sin la regla no se puede comparar nada.

**La cámara no sigue al blanco, y esto hay que escribirlo porque es
contraintuitivo.** Con apuntado automático, lo primero que uno quiere hacer es
girar la cámara hacia el zombi al que Gus le dispara: se siente "más vivo".
Queda prohibido. La cámara acompaña al jugador, no al blanco. La 12R.1 la
dejó en 48°, 15 m y la mira 3 m adelante después de medir cuánta calle se ve
por delante, y una cámara que gira sola rompe esa medición cada vez que
aparece un zombi. Además, con siete tramos que hay que limpiar, el blanco
cambia todo el tiempo: una cámara que lo siguiera no pararía nunca de girar.

### Los nombres de calle dejaron de ser un problema

Gus dijo que los nombres intermedios no importan, que alcanza con nombrar la
calle una vez —en un cartel, en el piso o en la brújula— y que si el dato sale
del mapa se usa, y si no, no se busca. Es **D-40**.

Esto **desbloquea la 18.10**, que estaba esperando que alguien dijera cómo se
llaman los dos controles nuevos. Yo me había puesto un freno correcto —el
documento 02 advierte que un cartel que contradice al barrio lo nota cualquier
porteño— pero lo había convertido en una dependencia donde no hacía falta:
alcanzaba con no poner cartel. **No todo dato faltante es un bloqueo; a veces
es un dato que no hace falta.**

### Y por fin se sabe de qué va el juego

Billinghurst 250 es **la casa de Sergio**, el amigo al que Gus va a buscar. Y
la idea que ordena todo lo que viene: **el juego es ir juntando a los amigos**
para salvarlos de la invasión. Al rescatar a Sergio hay dos personajes y se
puede elegir con cuál seguir; la misión siguiente va a buscar al próximo. Es
**D-41**.

Vale la pena notar lo que esto arregla hacia atrás. D-04 había reemplazado el
destino por "una comisaría sobre Carlos Calvo" con el argumento de que
Billinghurst no quedaba en Boedo. Era correcto como observación geográfica y
**equivocado como decisión de diseño**, porque convirtió un destino que
significaba algo en un edificio genérico. La pregunta que había que hacer no
era "¿este cartel es correcto?" sino "¿por qué Gus camina hasta ahí?". Nadie
la hizo durante nueve fases, y el juego se construyó entero sin saber por qué
el protagonista cruzaba el barrio.

La elección de personaje y las misiones siguientes van a la Fase 15, que deja
de ser una lista de deseos y pasa a ser una campaña.

---
## Cuarta pasada: construir por tramos. Gus tenía razón, y apuntó al lado equivocado

Gus propuso construir sólo el tramo en el que está el jugador y liberar el
anterior al pasar el control, en vez de tener todo el mapa vivo. Y preguntó si
se equivocaba.

La respuesta honesta son dos mitades, y conviene separarlas porque la primera
es más importante que la segunda.

### Tenía razón en el principio, y más de lo que creía

Construir por tramos no es una optimización: con los 700 m de D-35 **es la
única forma de que el mapa entre**. Eso quedó medido y está más abajo.

Pero lo bueno de verdad es otra cosa, y es algo que Gus consiguió sin
proponérselo. **El streaming de mundo es difícil porque el jugador puede
volver**: hay que cargar y descargar en las dos direcciones, con histéresis
para que no parpadee cuando uno camina sobre el borde, y con la complicación
de que el estado de lo que se descargó tiene que recordarse para cuando se
vuelva.

**Con la barricada de D-37 el recorrido es de ida.** Una vez que el control se
abrió y se pasó, a esa cuadra no se vuelve nunca. O sea: se carga sólo hacia
adelante y se libera sólo hacia atrás. Sin histéresis, sin estado que
recordar, sin casos raros en el borde.

La mecánica que eligió por razones de juego —una puerta que se abre matando—
**vuelve trivial el problema técnico más caro que tenía el proyecto.** Eso no
se planifica. Se aprovecha, y se deja escrito para no romperlo después: si
alguna vez se permite volver a una cuadra ya limpiada, se vuelve a pagar todo
el costo que esta decisión ahorró.

### Y apuntó al lado equivocado, que es el barato

Escribí `tools/medir-memoria.mjs` —abre el juego con Playwright y cuenta las
entidades de cada rama del árbol de la escena— y medí el mapa de hoy, de tres
cuadras:

| Rama | Entidades | Mallas | % de las mallas |
|---|---|---|---|
| **`World` — la ciudad** | **2.026** | **1.954** | **86 %** |
| `Zombi` ×18 | 486 | 234 | 10 % |
| `Gus` | 60 | 37 | 2 % |
| Efectos y objetos | 43 | 36 | 2 % |
| **Total** | **2.621** | **2.262** | |

Y el resto: **238 llamadas de dibujo** (53 de sombra), 167.924 triángulos, 133
materiales, 16,52 MB de texturas en memoria de video, 98 MB de heap.

Las 238 coinciden **exactamente** con el número que el plan ya tenía anotado
para el punto de aparición. Es la mejor señal de que la herramienta mide lo que
dice medir: llegó al mismo resultado que el panel de F1 por un camino
distinto.

**Los zombis ya están hechos como Gus propone, y mejor.** El `SpawnManager`
tiene una reserva de 18 entidades que se recicla, y los 25 puntos de aparición
del mapa son **sólo coordenadas**: tres números cada uno, unos dos kilobytes.
Pero lo decisivo es esta línea:

```js
const necesarios = Math.min(this.puestos.length, PERF.maxActiveZombies + 6);
```

**La reserva no crece con el mapa.** Con 3 cuadras son 18 entidades y con 7
cuadras son 18 entidades. Liberar los zombis de atrás no ahorra el 10 % que
ocupan: ahorra **cero**, porque esas mismas entidades se van a reutilizar
adelante. Es trabajo ya hecho, y hecho bien.

**La ciudad, en cambio, es el 86 % y es lo único que crece con los metros.** A
unas 6,3 entidades por metro, los 700 m proyectan ~4.400 entidades, ~4.300
mallas y del orden de **480 llamadas de dibujo** contra un presupuesto de 150.
Eso es la Fase 13 fallando antes de empezar.

Con una ventana de tres cuadras —la anterior, la actual y la siguiente— el
mapa de 700 m cuesta **lo mismo que hoy cuesta el de 350**, porque en todo
momento hay tres cuadras en memoria, que es lo que hay ahora. Y bajar de 238 a
150 pasa a ser un problema de tamaño normal, porque hay que optimizar tres
cuadras y no siete.

### Lo que sí vale de su idea para los zombis, y no es memoria

Gus dijo también que al entrar a un tramo se declare **qué tipo de zombis hay
y cuántos**, y que de ahí se suelten con posición más o menos aleatoria. Eso
se queda, pero no como optimización: **como la perilla de diseño del juego.**

La barricada ya obliga a declarar la población por tramo para poder contarla
(19A.1). Una vez que está declarada, decidir que la primera cuadra tiene cuatro
zombis estándar y la quinta tiene ocho más un esqueleto de mini-jefe es lo que
hace que las siete cuadras no se sientan como la misma cuadra siete veces. Es
la perilla principal del juego nuevo, y el único lugar donde "más frenético" se
convierte en un número.

### Las cuatro trampas de construir por tramos

Ninguna es opcional, y la segunda es la que no es obvia.

**1. La colisión se libera con la geometría.** Si se destruye una fachada y su
caja de colisión queda, el jugador choca contra una pared que no existe. Es el
peor error posible porque **no se ve**: la pantalla está bien y el personaje
no pasa.

**2. No se libera en el control: se libera dos cuadras atrás.** La cámara ve
59 m por delante —lo midió la 12R.1— así que parado en el control se ve la
cuadra siguiente **y** la anterior. Liberar lo que todavía se ve deja un
agujero en pantalla. De ahí que la ventana sea de tres y no de una.

**3. No se construye en un solo frame.** Armar una cuadra de golpe congela el
juego **justo cuando explota la barricada**, que es el momento más visible de
toda la partida. La cuadra siguiente se construye mientras se juega la actual,
repartida en varios frames.

**4. Destruir de verdad, no soltar la referencia.** Hay que destruir
entidades, materiales y mallas, o la memoria sube con cada cuadra y el juego
se muere en el tramo cinco. La 13.11 ya mide eso con diez reinicios seguidos,
y ahora además hay con qué: `tools/medir-memoria.mjs` antes y después de cada
cuadra.

### La lección

Es la cuarta vez en un día que una medición contradice a una intuición, y
conviene anotar el patrón porque ya no es casualidad: **el sol a 17° creyendo
que estaba a 73; 1.624 m creyendo que eran "varios kilómetros"; 2,75 MB de
textura creyendo que el problema era el formato; y ahora el 86 % de la escena
en la ciudad, mientras los dos —Gus y yo— mirábamos los zombis.**

Las cuatro veces la intuición apuntaba a lo visible y el costo estaba en otro
lado. Y las cuatro veces alcanzó con una herramienta de treinta líneas para
saberlo. Vale más escribir la herramienta que discutir la intuición.

---
## Quinta pasada: la puerta. Una mecánica que se come un problema técnico

Gus propuso cambiar la barricada de autos que explota por una **puerta
corrediza** que además **se cierra a tus espaldas**, y preguntó si servía o si
había que buscar otra cosa.

Sirve, y por una razón más específica que "queda mejor".

### Lo que la puerta arregla, y no es estético

En la cuarta pasada quedó escrita una lista de cuatro trampas de construir el
mundo por tramos. La segunda era la fea:

> *No se libera en el control: se libera dos cuadras atrás. La cámara ve
> para atrás, así que liberar lo que todavía se ve deja un agujero en
> pantalla.*

Con la barricada que explota, el paso quedaba **abierto para siempre** después
de la explosión. O sea que el jugador podía volver, y liberar la cuadra de
atrás había que **adivinarlo**: medir una distancia, elegir un umbral, y
confiar en que nadie caminara para atrás en el momento equivocado. Un
heurístico, con su caso raro esperando.

**Con la puerta hay un evento: se cerró.** Liberar deja de ser una apuesta y
pasa a ser una consecuencia, que se puede escribir en una prueba. Y la puerta
cerrada **es, literalmente, la tapa del agujero**: el jugador no ve el vacío
porque hay una puerta de acero donde estaba la cuadra.

La mecánica no le agrega un problema a la parte técnica: **se come uno**. Eso
es raro y vale la pena anotarlo, porque lo habitual es al revés.

Y de yapa es más barata de dibujar: una malla con una animación de posición,
contra dos autos, escombros y un efecto de partículas.

### El número de los 20 m ya existía

La puerta se cierra cuando el jugador está 20 m adentro, y el número no es a
ojo. La cámara se sienta **7 m por detrás de Gus** con la distancia por
defecto, y hasta **14,4 m** cuando el jugador la aleja al máximo de 26.
Pasados esos 14,4 m la cuadra anterior queda fuera de cuadro y se puede
liberar sin que se vea nada. Veinte da margen.

Lo lindo es que el mismo número sirve para las dos cosas: **es el punto donde
se puede liberar la memoria y el punto donde se cierra la puerta**. No hay dos
umbrales que mantener sincronizados, hay uno.

Y regala unos segundos de retirada, que es la única que el juego ofrece: una
vez cerrada, con el combate automático —donde moverse es lo único que salva—
no hay para dónde escapar salvo hacia adelante.

### La contención, que apareció buscando una excusa y terminó ordenando el juego

Una puerta corrediza motorizada en el medio de una calle de Boedo no se
explica sola. Se eligió que sea una **barrera de contención del ejército**:
están sellando la ciudad cuadra por cuadra para frenar la infección. Es
**D-43**.

Empezó como una excusa para la puerta y terminó haciendo algo más grande, que
es **arreglar la parte más arbitraria del diseño**. Las bocacalles bloqueadas
de D-34 eran lo más difícil de defender de todo el plan: autos cruzados por
todos lados porque el juego necesita que vayas derecho. Con la contención
**dejan de ser un truco y pasan a ser el mismo operativo visto de costado**, y
encima explica por qué están puestos con prolijidad en vez de amontonados.

Tres reglas que eran de videojuego pasan a ser una sola idea del mundo:

| La regla | Era | Es |
|---|---|---|
| No se pasa hasta matarlos a todos | Una puerta de videojuego | El protocolo de contención |
| No se puede volver atrás | Una limitación técnica | Lo que hace una esclusa |
| Las bocacalles tapadas | Autos puestos a propósito | La misma operación, en los costados |

Y no agrega tareas: le da criterio a dos que ya existen, la 12R.9 y la 18.7.
Mismo tipo de valla, misma gama de pintura, algún cartel del operativo.

**Lo que no entra ahora:** de dónde viene el ejército, si hay radio, si hay
sobrevivientes. La contención se cuenta **con lo que se ve** y nada más.
Contarla con texto es Fase 15, con el resto de la campaña.

### La explosión, por segunda vez en el día

A la mañana la explosión iba a morir con la bazooka. Al mediodía la rescaté,
porque la barricada explotaba. A la tarde vuelve a morir, porque la puerta no
explota nada. Y con ella se va otra vez el pack `ExplosionFXFree`.

Dos cambios de opinión sobre el mismo archivo en un día es suficiente para
preguntarse si el método está mal. Creo que no, y la razón está en la
dirección: **cada vez que la mecánica se simplificó, la lista de rescate se
achicó**. La puerta hace menos cosas que la barricada y por eso es mejor. La
regla que me llevo: si la próxima vuelta **agranda** la lista de cosas que hay
que salvar de la basura, conviene desconfiar de la mecánica nueva, no del
plan.

Lo que no cambió nunca es `objetivoAutomatico()`, que hay que rescatar igual,
y por un motivo que no tiene nada que ver con la bazooka ni con la puerta: no
tenía por qué vivir ahí. Vive ahí porque la bazooka fue quien lo necesitó
primero. **En un borrado grande, lo que se pierde no es el código que uno
recuerda: es el que quedó guardado en el lugar equivocado.**

### Dos cosas que la puerta obliga a decidir, y quedan decididas

**Al morir se reaparece del lado de adentro.** Al principio del tramo en
curso, nunca del otro lado de la puerta, porque esa cuadra ya no existe en
memoria. Parece obvio escrito así; no lo era antes de que las cuadras se
destruyeran.

**Y no hay retirada.** Con la puerta cerrada atrás y las bocacalles tapadas,
el único escape es hacia adelante, dentro de los 100 m del tramo. Con el
combate automático —frenar para disparar, moverse para huir— eso achica el
espacio táctico de verdad. Es más tenso y es lo que Gus pidió, pero es un
cambio real y hay que mirarlo jugando: si una cuadra se vuelve injusta, lo que
se toca es la cantidad de zombis (19A.11), no la puerta.

### Una regla que no hay que romper después

La ida sin vuelta dejó de ser una decisión de juego y pasó a ser un cimiento.
Si alguna vez se permite volver a una cuadra ya limpiada —por una misión, por
un atajo, por lo que sea— se vuelve a pagar entero el costo que D-42 ahorra:
histéresis en los bordes, estado que recordar, y el mapa de 700 m otra vez sin
entrar en un teléfono. Queda anotado en D-42 con una advertencia, porque dentro
de seis meses va a parecer una limitación caprichosa y no lo es.

---
## Lo que el cambio se lleva puesto, y hay que decirlo

El documento 01 pone **"decisiones rápidas"** como pilar del juego, y las
decisiones que tenía en mente eran de botón: qué arma usar, cuándo curarse,
cuándo gastar la bazooka, si ir por la calle o por el pasaje. **El cambio del
7 de noviembre borra todas.** No queda un solo botón de acción, no hay
inventario, no hay armas para elegir y no hay rutas alternativas.

Eso no es un efecto colateral: es el cambio. La decisión pasa de ser *de
botón* a ser *espacial* — cuándo frenar, dónde pararse, cuánto aguantar antes
de volver a moverse, detrás de qué auto. Es un juego más chico y más limpio,
y probablemente mejor para un teléfono, donde cada botón en pantalla es un
dedo que tapa el juego.

Pero conviene que quede escrito que el pilar cambió, porque en tres meses
alguien va a abrir el documento 01, va a leer "decisiones rápidas", y va a
pensar que el juego se desvió solo. No se desvió: lo decidimos.

**Lo que se pierde concretamente**, además del pilar: la Fase 5 (cuerpo a
cuerpo), la Fase 7 (bazooka) y la Fase 8 (objetos e inventario) quedan
borradas enteras. Son tres fases cerradas, probadas y funcionando. No fue
trabajo perdido —fue cómo descubrimos qué juego queríamos— pero el plan tiene
que decir que están muertas, no que están hechas, porque un plan que dice
"hecho" sobre algo que ya no existe miente dos veces.

---

## Lo que NO se toca

Igual que en la 12R, hay una lista de cosas que el cambio no roza, y conviene
tenerla explícita para no abrirlas sin motivo:

| | Por qué no se toca |
|---|---|
| `core/rumbo.js` | El convenio de ángulos (D-17) es lo que evita que medio juego mire para el otro lado. La Fase 18 va a usarlo más que nunca |
| `physics/collisionWorld.js` | La colisión 2D (D-09) sirve igual con ángulos arbitrarios |
| `enemies/zombieAI.js` | La detección por vista y ruido y la evasión por rayos (D-10) son lo mejor que tiene el juego. La 17 les cambia los números, no la lógica |
| `core/rng.js` | La aleatoriedad con semilla (D-12) es lo que hace que un mapa roto se pueda reproducir |
| La reserva de 18 zombis del `SpawnManager` | **Ya hace lo que Gus pidió, y mejor**: se recicla y no crece con el mapa (D-42). Lo que hay que arreglar ahí es el puesto que no se libera (19A.0), no la reserva |
| `visual/paleta.js` | Los 58 colores medidos. Todo asset nuevo pasa por acá (D-33) |
| La cámara de la 12R.1 | 48°, 15 m y la mira 3 m adelante, medidos. **No sigue al blanco del disparo automático** (D-39): una cámara que gira sola rompe la medición de cuánta calle se ve por delante |
| El formato de Gus | Está bien y gusta (D-39). Es la regla de escala y de acabado de todo lo que entre |
| `combat/explosion.js` | **Muere con la bazooka después de todo.** Lo rescaté cuando el control era una barricada que explotaba; con la puerta corrediza (D-37) no explota nada. Lo único que se salva de ahí es `objetivoAutomatico()` |
| Todo lo de la 12R.0 a la 12R.7 | Ocho tareas terminadas y medidas. Con D-35 ya no hace falta ni retocar las ochavas |

---
## 16.1 — Los ítems: 2.223 líneas menos

**8 de noviembre de 2026.** Primera tarea de la poda, y la primera vez en
todo el día que se toca `src/`.

**Lo que se fue.** Munición y botiquines, del juego entero: `itemLogic.js`,
`itemView.js` e `inventario.js` —510 líneas—, `ITEMS` y `CHECKPOINT_DROP` del
balance, las cinco zonas de objetos de la misión, nueve funciones de
`main.js`, cuatro elementos del HUD con su CSS, los tres colores de la paleta
y cuatro archivos de prueba enteros. **25 archivos, 2.223 líneas menos y 45
agregadas.**

**Lo que verifica que está bien:**

| | Antes | Después |
|---|---|---|
| Pruebas unitarias | 474 | **423 en verde** |
| Pruebas de punta a punta | 57 | **57 en verde** |
| Llamadas de dibujo | 238 | 237 |
| Entidades en la escena | 2.621 | 2.593 |
| Rama `Objetos` del árbol | 23 entidades | **no existe** |

Las de punta a punta importan más que las unitarias acá: incluyen terminar la
misión de principio a fin y el reinicio cinco veces seguidas. El juego se
sigue jugando entero.

### Tres cosas que aparecieron haciéndolo

**1. Casi me llevo puesta la bazooka.** Para borrar `ITEMS` busqué hacia atrás
el comentario que precedía al bloque, y el `/**` más cercano hacia atrás no
era el de `ITEMS`: era el de `blastPush`, adentro de `WEAPONS.bazooka`. El
corte se comió el final de las armas. Lo agarró el `import()` de verificación
—`WEAPONS` seguía existiendo, pero mutilado— y se rehizo delimitando por
`export const` en vez de por comentario.

Lo anoto porque es el riesgo de toda esta fase: **en un borrado grande, el
error no es borrar de más en el archivo equivocado, es borrar de más en el
archivo correcto.** De acá en adelante, cada bloque que se corte se delimita
por un ancla que no se repita, y se verifica cargando el módulo.

**2. La prueba del reinicio seguía siendo buena, y había que arreglarla, no
borrarla.** `mision.spec.js` saca una "foto" del estado y compara cinco
reinicios contra la primera. Tres de sus campos eran de objetos. La tentación
era borrar la prueba entera con el sistema que miraba. Pero lo que esa prueba
mide —que nada se acumule al reiniciar— **vale más ahora que antes**, porque
la Fase 19A va a destruir y reconstruir cuadras enteras (D-42) y ahí una fuga
no se nota hasta el tramo cinco. Se le sacaron los tres campos y se quedó el
que de verdad detectaba la acumulación, que era el total de entidades.

**3. Una prueba de la paleta se murió con razón, y deja un hueco anotado.**
Había una que decía *"el botiquín es lo más saturado del juego"*: era la
cúspide de la jerarquía de saturación, el color más fuerte, reservado para lo
único que el jugador NECESITABA encontrar. Con los objetos afuera, la cúspide
queda vacante y el techo del decorado queda sin nada por encima.

No lo arreglé inventando una cúspide nueva. Quedó escrito en el archivo de
pruebas: cuando las cartas de power-up (D-32) traigan su color, **tiene que
entrar por arriba de ese techo**, y ahí la regla vuelve a cerrar. Una
jerarquía con la punta vacía no está rota, está esperando.

### Lo que queda peor que antes, a propósito

Los controles ahora **no dan nada**. Hasta hoy dejaban dos cajas de munición y
un botiquín; eso se fue y lo que lo reemplaza —la esclusa de D-37 y las cartas
de D-32— lo construye la Fase 19A. Entre hoy y esa fase el juego es más pobre
que ayer.

Está anotado en el plan y se repite acá porque es el momento en que uno duda:
**es una etapa, no el resultado.** El comentario quedó escrito en el propio
manejador de `CHECKPOINT_REACHED`, que es donde lo va a leer el que venga.

---

## 16.2 — La munición, y un aviso que viajaba colgado de otro

**8 de noviembre de 2026.**

**Lo que se fue.** Cargador, reserva, recarga y el gatillo en vacío. De
`balance.js` salieron `ammoType`, `magazineSize`, `reloadTime` y
`startingReserve`; de `weaponController.js`, el estado `RECARGANDO`, seis
métodos y tres avisos; del HUD, el contador de balas con sus tres niveles, la
barra de recarga y el botón `R`; del teclado, la tecla `R`. Y catorce pruebas.

| | Antes | Después |
|---|---|---|
| Pruebas unitarias | 423 | **409 en verde** |
| Pruebas de punta a punta | 57 | **56 en verde** |
| Llamadas de dibujo | 237 | 237 |

### El error que cometí, que es el más interesante del día

Al borrar la munición, **el nombre del arma dejó de actualizarse en el HUD**.
No lo vi: lo encontraron las pruebas de punta a punta, con un `#arma-nombre`
que seguía diciendo CUCHILLO después de pasar a la pistola.

La causa es fina y conviene entenderla porque va a volver a pasar. El método
`equipar()` terminaba llamando a `#avisarMunicion()`, que avisaba al HUD la
munición del arma nueva. Pero ese aviso, **de rebote**, hacía que `main.js`
corriera `actualizarHudArma()` entero: nombre, modelo en la mano, pistola al
cinto, texto del botón. O sea que el HUD del arma se refrescaba **colgado del
aviso de munición**, y nadie lo había escrito así a propósito: quedó así
porque la munición llegó después y se enganchó donde había lugar.

Al sacar la munición se fue el aviso, y con él se llevó cuatro cosas que no
tenían nada que ver.

**Cómo se arregló, que importa más que el síntoma.** No poniendo la llamada
donde faltaba, sino dándole al arma su propio aviso: `alCambiarArma`, que sale
de `equipar()`. Es el mismo criterio que este archivo ya tenía escrito para
`alIniciarAtaque`:

> *El arma es la única que sabe que atacó, así que es la que tiene que
> avisarlo.*

Ahora también es la única que sabe que cambió. **Un aviso que viaja colgado de
otro desaparece cuando el otro se borra**, y en una fase que es toda borrar,
eso no es una anécdota: es el modo de falla principal.

**Y hay una consecuencia para la 16.3.** La bazooka tiene `cargaEspecial`, que
se actualiza en cada cuadro desde `update()`. Antes de borrarla hay que buscar
qué más viaja colgado de eso. Quedó escrito en la tarea.

### Lo que se perdió, y vale nombrarlo

La munición era una decisión de verdad, y de las buenas. El HUD tenía **tres**
niveles y no dos —lleno, poca, vacío— porque el momento interesante no era
quedarse sin balas: era **"me quedan tres"**, cuando todavía se podía elegir
entre tirar o guardar y pasar al cuchillo. Y la recarga costaba 1,6 segundos
de estar indefenso, que era la mitad del precio de usar la pistola.

Todo eso se va. Lo reemplaza una decisión distinta y más chica: **para
disparar hay que frenar**. No es mejor ni peor en abstracto; es la que cabe en
un juego sin botones.

### Dos pruebas que cambiaron en vez de morir

`esperarCiclo()` sumaba `cooldown + reloadTime` para dejar el arma lista. Sin
recarga, sumar un tiempo que ya no existe daba `NaN` y el arma nunca volvía a
estar lista. Se arregló sacando el término, no la prueba.

Y la de punta a punta "el HUD muestra el arma y la munición" perdió la
munición pero **conservó lo que seguía siendo cierto**: que el botón grande
diga DISPARAR con la pistola y ATACAR con el cuchillo. Quedó renombrada. Una
prueba que verifica tres cosas y pierde una no se borra: se le sacan las dos
que sobran.

---

## 16.3 — La bazooka, y el rescate que salió bien

**8 de noviembre de 2026.**

**Lo primero fue el rescate, y recién después el borrado.** `objetivoAutomatico()`
—el apuntado automático— salió de `combat/explosion.js` a su propio archivo,
`combat/objetivo.js`, con once pruebas propias en `tests/objetivo.test.js`,
**antes** de que se borrara nada. Las pruebas vinieron de `bazooka.test.js`,
que murió media hora después.

Vale la pena mirar lo que esa función es ahora. Nació como el apuntado de un
arma que se usaba dos veces por partida. Hoy es **la única forma que tiene
Gus de elegir a quién dispararle** (D-28): la regla central del juego nuevo
ya estaba escrita, guardada en el archivo equivocado.

**Lo que se fue.** `projectile.js` y `explosion.js` enteros, `WEAPONS.bazooka`,
cuatro métodos del controlador, el cohete y la explosión de `combatFx.js`, el
modelo del tubo, la barra y el botón del HUD con su CSS, la tecla `F`, y dos
archivos de prueba.

| | Antes | Después |
|---|---|---|
| Pruebas unitarias | 409 | **373 en verde** |
| Pruebas de punta a punta | 56 | **48 en verde** |
| Entidades en la escena | 2.593 | 2.586 |
| Rama `EfectosCombate` | 20 entidades | 14 |

### Dos poses que seguían vivas sin que nadie las pidiera

Buscando restos aparecieron `Pose.RECARGAR` y `Pose.CURARSE`. Las dos
completas: su animación, su duración, su velocidad de ciclo y sus pruebas.
Y las dos **muertas desde hacía dos tareas**.

`CURARSE` murió en la 16.1, cuando `gus.update()` dejó de recibir
`curandose`. La rama del `if` quedó ahí, evaluando una variable que siempre
era `undefined`. `RECARGAR` murió en la 16.2 con el aviso de recarga.

Ninguna de las dos rompía nada. Por eso sobrevivieron: **el código muerto no
falla, y por eso no se encuentra solo.** Las unitarias seguían verdes porque
probaban la pose directamente —`poseDe(Pose.CURARSE, 0.5)` funciona
perfectamente aunque nadie la llame nunca—. Una prueba que verifica una
función aislada no puede decirte que ya nadie la usa.

Lo que las encontró fue buscar la palabra en todo el proyecto, a mano, al
terminar. Queda como parte del procedimiento de la fase: **después de cada
borrado, grep de los nombres que deberían haber desaparecido.** No sólo del
que se borró: también del que lo pedía.

**Y de la pose de curarse quedó anotada una deuda.** Era encorvado, cabeza
baja, las dos manos ocupadas: la pose que hacía que curarse se *leyera* como
peligroso y no como apretar un botón. Si la curación vuelve como carta de
power-up, la pose tiene que volver con ella. La regla que la justificaba no
cambió.

### Un comentario que sobrevivió a su código

En `hud.css` había un comentario largo sobre por qué esconder un botón se
hace con la clase `.hidden` de `game.css` y no con una clase nueva: una clase
nueva con la misma especificidad pierde por orden, y el botón se ve siempre.
Era el segundo error de especificidad del proyecto.

El botón que lo provocó era el de la bazooka. **El comentario se queda, el
botón no.** Está reescrito para decir eso explícitamente, porque la regla
—*si hay una clase que ya resuelve esto, se usa esa*— no tenía nada que ver
con la bazooka. Un error aprendido no se borra junto con el código que lo
cometió.

### Lo que la 16.3 deja planteado para la 16.4

`tests/armas.test.js` empezó el día probando que tres siluetas no se
confundieran entre sí. Con la bazooka afuera quedan dos, y la 16.4 borra el
cuchillo. **Un archivo entero de pruebas que deja de tener sentido**, no
porque esté mal, sino porque su premisa —que hay varias armas que distinguir—
deja de ser cierta. Queda anotado en la tarea.

---

## 16.4 — El cuchillo, y una función de cableado que sostenía cuatro cosas sanas

**20 de noviembre de 2026.**

**Lo que se fue.** `WEAPONS.knife`, el arco de ataque entero —detección y
dibujo—, el cambio de arma con su botón, su tecla `Q` y su fila de HUD, la
caja del nombre del arma, `Pose.ATACAR`, el modelo del cuchillo, y
`tests/arma.test.js` completo.

| | Antes | Después |
|---|---|---|
| Pruebas unitarias | 376 | **333 en verde**, más 1 marcada para fallar a propósito |
| Pruebas de punta a punta | 48 | **41 en verde** |
| Líneas | — | **1.311 borradas, 611 escritas** en 20 archivos |
| Llamadas de dibujo (celular, caminando) | — | 235 |

Las reglas de combate quedan en una sola frase: **hay un arma, dispara
siempre, hace ruido siempre, y para usarla hay que apuntar.**

### La función de cableado, que es lo que aprendí hoy

El roadmap me avisaba de tres cosas que podían quedar apuntando a la nada:
`alCambiarArma`, `actualizarHudArma()` y `armasEnMano.equipar()`. Las tres
existían. Pero la relación entre ellas no era la que yo esperaba.

Yo buscaba **tres restos sueltos**. Lo que había era **un centro y sus
radios**. `actualizarHudArma()`, catorce líneas en `main.js`, hacía tres
cosas cada vez que el arma cambiaba: escondía la pistola del cinto, encendía
el modelo de la equipada y escribía el nombre en el HUD. Y de ella colgaban
cinco piezas que, **mirada cada una por separado, estaba perfectamente
sana**:

| Pieza | Por qué parecía viva |
|---|---|
| `Gus.mostrarPistolaAlCinto()` | Un método de dos líneas que hace exactamente lo que dice |
| `ArmasEnMano.equipar()` | Enciende una y apaga el resto. Correcto |
| `Hud.setArma()` | Escribe un nombre y ajusta un botón. Correcto |
| `WeaponController.alCambiarArma` | Un aviso que la 16.2 había arreglado hacía dos semanas |
| `WEAPONS.pistol.name` y `.type` | Dos campos de datos. No hacen nada malo |

Ninguna de las cinco se delata sola. Ninguna rompe nada. Si yo hubiera
borrado el cuchillo y dejado `actualizarHudArma()` en pie —llamándose una
vez al arrancar, para encender la única arma—, **las cinco habrían
sobrevivido**, y el `grep` del final no habría encontrado nada: todas
seguían usadas.

Lo que las mató fue borrar **el centro** y aceptar que no quedaba nada que
poner en su lugar. Recién ahí los cinco radios quedaron colgando y se
vieron.

> **La regla, que no es la misma que la de la 16.3.** La 16.3 enseñó a
> buscar código que ya nadie llama. Esto es lo contrario y es más difícil:
> **código que sí se llama, desde un solo lugar, que existe únicamente para
> que ese lugar exista.** No se encuentra con un `grep` de nombres muertos.
> Se encuentra preguntándole a la función del medio *para qué sirve ahora*,
> y aceptando la respuesta cuando es "para nada".

### Tres restos de la 16.3 que aparecieron de rebote

Buscando a quién le pertenecía cada cosa salieron tres que no eran del
cuchillo:

- **`COLOR_ARMA.tubo` y `COLOR_ARMA.boca`** eran los colores del caño de la
  bazooka. Sobrevivieron a su arma. Nadie vuelve a mirar una tabla de
  colores después de borrar quien la usaba.
- **`progresoEspera`**, un getter del controlador que devolvía la fracción
  de espera para dibujar la barra de la bazooka. Muerto desde la 16.3.
- **El parámetro `acabado` de `pieza()`** en `armas.js`, con `ACABADO.metal`
  por omisión. El único que lo pasaba distinto era el mango de madera del
  cuchillo. Sin cuchillo, no es una opción: es una constante.

La diferencia con las poses huérfanas de la 16.3 es que estas tres son
**datos y parámetros**, no funciones. Una pose muerta al menos tiene pruebas
que la nombran. Una entrada en una tabla de colores no tiene nada: está ahí,
cuesta una línea, y no hay forma de que algo se queje.

### `armas.test.js` no murió entero, y creo que el plan estaba mal

La tarea decía, textual, que el archivo **muere entero**: *una silueta no se
confunde con nada si es la única que hay*. El argumento es correcto y las
pruebas comparativas se fueron: el largo relativo, el filo contra el mango,
el alcance de la pistola contra el del cuchillo.

Pero el archivo tenía dos tipos de prueba mezclados, y sólo uno era
comparativo. El otro medía **el arma contra el fondo**: que no sea más
llamativa que lo de misión, que se separe del asfalto, que entre en su
presupuesto de triángulos, y que haya un modelo por cada arma del balance.
Nada de eso necesita una segunda arma.

Esa última, además, **pasó a ser la prueba más valiosa del archivo**: hoy
dice `expect(Object.keys(WEAPONS)).toEqual(['pistol'])`. Es D-29 escrito
como número. Si alguna vez vuelve a haber dos entradas, alguien reabrió el
cambio de arma y se va a enterar acá.

**Lo que esto me corrige del método:** cuando digo "este archivo de pruebas
deja de tener sentido", lo que casi siempre pasa es que *una premisa* del
archivo dejó de valer. Vale la pena leer qué prueba cada bloque antes de
borrarlo entero, porque las premisas no se reparten parejo.

### Y midiendo lo que quedaba apareció un problema de verdad

La prueba que medía la separación contra el asfalto usaba `COLOR_ARMA.filo`
—la hoja clara del cuchillo— y pasaba con holgura. Al borrar el cuchillo
desapareció `filo`, y medí lo que queda:

| | Color | Separación contra el asfalto |
|---|---|---|
| Hoja del cuchillo (borrada) | 0,62 0,64 0,68 | 0,15 ✅ |
| **Cuerpo de la pistola** | **0,30 0,31 0,34** | **0,015** ❌ |
| Asfalto | 0,33 0,325 0,315 | — |

**Son el mismo gris.** Y no es teórico: el brazo se estira hacia adelante al
disparar, y desde la cámara cenital el arma queda sobre la calzada justo en
el momento en que el jugador la mira. La única arma del juego desaparece
contra el piso cuando se usa.

El cuchillo le venía tapando el agujero a la pistola desde que existían los
dos.

**No lo arreglé, y quiero dejar escrito por qué.** En la 20.8 Gus elige su
arma entre once modelos renderizados del banco, y esta pistola de cuatro
cajas se reemplaza entera: retocar un gris que se va a borrar es trabajo
tirado, y además el arte viejo está descartado. Lo que no podía pasar es que
el dato se perdiera. Así que la prueba está escrita con `it.fails`: **falla
a propósito, con el número adentro**, y la 20.8 tiene que medir el arma
nueva contra el asfalto y no sólo contra la mano.

### Dos cosas de Gus que se fueron sin que la tarea las pidiera

Gus tenía dos armas guardadas en el modelo: una pistola al cinto y un
cuchillo en la bota. Ocho triángulos cada una, puro volumen para romper la
línea recta de la cadera y de la pierna.

Se fueron las dos, por motivos distintos:

- **El cuchillo de la bota** era la funda de un arma que el juego ya no
  tiene. No molestaba a nadie y nadie lo habría notado nunca, y eso es
  exactamente lo que lo hacía peligroso: **un modelo que cuenta algo falso
  sobre las reglas.**
- **La pistola del cinto** se escondía cuando el arma estaba en la mano. Con
  un arma sola, el arma está siempre en la mano: la del cinto quedaba
  apagada toda la partida. Una pieza que no se ve nunca, y un método que
  sólo podía recibir `false`.

Lo que se pierde es silueta en la cadera, y queda anotado en el código: si
Gus se ve demasiado liso de perfil, la respuesta **no** es devolver la funda
—no hay qué guardar ahí— sino resolverlo en la 20.4, cuando Gus pase a ser
un `.glb` del banco.

### Lo que se perdió de verdad, y no es código

Había una prueba de punta a punta que se llamaba *"matar con el cuchillo al
lado de otros NO los despierta"*: tres zombis dormidos a diecinueve metros,
un cuchillazo, y los tres seguían durmiendo. Era la mitad silenciosa de
D-05, y **la que hacía que disparar fuera una decisión**: si el cuerpo a
cuerpo sonara igual que el tiro, la pistola sería siempre mejor y no habría
nada que elegir.

Hoy **no hay forma silenciosa de matar.** Conviene decirlo derecho, porque
es el costo real de la poda y no un detalle de pruebas. La elección que le
queda al jugador es *dónde pararse y cuánto tiempo*, y lo que la convierte
en elección es que el tiro siempre suena.

Y eso obligó a reescribir, no a borrar, la prueba unitaria que lo medía.
Decía "el disparo hace mucho más ruido que el cuchillo" y comparaba contra
un arma que ya no existe. Lo que cuidaba no era el cuchillo: era que
disparar tenga costo. Y eso tiene una medida propia, y mejor:

```js
expect(P.noiseRadius).toBeGreaterThan(ZOMBIE_STANDARD.sightRange);
```

**El estruendo llega más lejos que la vista del zombi.** Mientras eso sea
cierto, un tiro puede traerte a alguien que no te había visto. Es la misma
regla sin la muleta de la comparación.

### Cuatro pruebas que cambiaron en vez de morir

Es el mismo criterio de la 16.3, y esta vez hubo que aplicarlo cuatro veces:

| Prueba | Medía contra el cuchillo | Mide ahora |
|---|---|---|
| El ruido del disparo | El radio del cuchillo | El alcance de vista del zombi |
| La cadencia del tiro | La espera del cuchillazo | Los dos extremos en absoluto: ni cero ni más de un décimo |
| El ataque del zombi | Que Gus golpeara con un brazo | Que el zombi use los dos, simétricos |
| El Animador | `Pose.ATACAR` de ejemplo | `Pose.DISPARAR`, que es el gesto que queda |

La del Animador es la que más fácil se habría perdido. Usaba `ATACAR` como
gesto de ejemplo para probar que **un gesto no se interrumpe a la mitad** y
que **dos seguidos no se fusionan en uno largo**. Eso no es del cuchillazo:
es del mecanismo. Si moría con la pose, el Animador se quedaba sin la única
prueba de su regla central.

### Lo que la 16.4 deja planteado para la 16.5

Dos cosas, y la segunda no es de borrado:

1. **`velocidadDeCiclo()`** trata `CAMINAR` y `CORRER` en el mismo `case`,
   multiplicando por la velocidad real para que los pies no patinen. Con una
   sola velocidad hay que ver si sigue siendo un cálculo o si queda una
   cuenta fija disfrazada.
2. **`isRunning` no sólo elige la velocidad**: también decide el ruido al
   moverse y el balanceo de cámara. Sacar caminar saca **el sigilo por
   velocidad**, igual que esta tarea sacó el sigilo por arma. Es la segunda
   vez en dos tareas que la poda se lleva una forma de ser silencioso. Vale
   la pena decidirlo mirando, y no descubrirlo después.

---

## 16.5 — Caminar, y cinco pruebas que no eran sobre caminar

**20 de noviembre de 2026.**

**Lo que se fue.** `PLAYER.walkSpeed`, `isRunning`, `Pose.CAMINAR` con su
ciclo de pasos, el botón CORRER, las teclas `Shift`, y el parámetro
`runHeld` de `PlayerController.update()`. `runSpeed` pasó a llamarse
**`speed`**.

Gus se mueve de una sola manera: **6 m/s, corriendo, siempre.**

### El renombre no es cosmético

`runSpeed: 6.0` seguía siendo verdad: el número es el de correr. Pero un
nombre que dice "correr" **implica que hay otra cosa que no es correr**, y
no la hay. Es la misma clase de mentira que la funda del cuchillo en la bota
de la 16.4: no rompe nada, no la nota nadie, y le cuenta algo falso al
próximo que lea el archivo.

Lo que sí conserva sus dos velocidades es el zombi —`walkSpeed` y
`chaseSpeed`—, y la asimetría quedó escrita en el balance porque es una
decisión y no un descuido: **el jugador no tiene marchas, el zombi sí.** El
zombi cambia de paso cuando te ve, y ese cambio es la señal de que te
detectó.

### Las cinco pruebas que casi se van por el nombre del bloque

`pose.test.js` tenía un bloque llamado *"caminar se lee como caminar"* con
cinco pruebas, todas sobre `Pose.CAMINAR`. Por el nombre y por el argumento
—se borra la pose, se borran sus pruebas— se iban las cinco.

**Ninguna de las cinco era sobre caminar.** Las cinco miden
`cicloDePasos()`, la función que `CAMINAR` y `CORRER` compartían:

| Prueba | Qué fija |
|---|---|
| Las piernas van en oposición | Las dos adelante a la vez es un salto, no un paso |
| Los brazos al revés que la pierna del mismo lado | Lo que separa un paso de un muñeco arrastrado |
| Las rodillas nunca doblan al revés | El error más fácil de cometer y el más difícil de nombrar mirando |
| El ciclo cierra en la fase 1 | Si no, hay un salto visible una vez por paso |
| La cadera rebota hacia abajo en cada apoyo | El peso del cuerpo cayendo sobre la pierna |

Si morían con la pose, **el único ciclo de pasos que le queda al juego se
quedaba sin una sola prueba.** Pasaron a `CORRER` y están todas en verde.

> **Es la misma lección de la 16.4 con `armas.test.js`, y van dos seguidas.**
> El nombre de un bloque de pruebas dice contra qué se escribieron, no qué
> miden. Cuando una premisa se cae, hay que leer prueba por prueba cuál
> dependía de ella. Las premisas no se reparten parejo dentro de un archivo.

### Y tres que sí murieron, con un reemplazo peor pero honesto

El bloque *"correr no es caminar más rápido"* tenía tres comparaciones
contra `CAMINAR`: zancada más larga, torso más volcado, brazos más altos.
Las tres se fueron: no hay segunda pose contra la cual comparar.

Lo que cuidaban importa —es lo que impide el truco más barato de un juego
sin presupuesto de animación, que es reproducir el ciclo de caminar más
rápido y llamarlo correr— así que se reescribieron **en absoluto**, contra
lo que significa correr de verdad:

```js
// 42 grados de zancada. Caminar eran 26, y una persona a paso vivo
// no pasa de unos 30: por encima de eso el cuerpo tiene que caer hacia
// adelante, que es la definición mecánica de correr.
expect(Math.abs(poseDe(Pose.CORRER, 0.25).piernaI)).toBeGreaterThan(32);
```

**Son peores pruebas que las comparativas, y conviene admitirlo.** Un umbral
absoluto es un número elegido; una comparación entre dos poses es una
relación que se sostiene sola. Pero una comparación necesita dos cosas, y
quedó una.

### La duda que la 16.4 dejó planteada, resuelta: `velocidadDeCiclo()` se queda

La pregunta era si, con una sola velocidad, multiplicar el ciclo de pasos
por la velocidad real no queda siendo **una cuenta fija disfrazada de
cálculo**. La respuesta es que no, y por dos motivos que se ven jugando:

1. **La velocidad real casi nunca es la del tope.** Hay aceleración de 28
   m/s² y frenado de 34: arrancar y parar pasan por todos los valores del
   medio, y es ahí donde un ciclo fijo delata el truco — los pies patinan
   durante el medio segundo que tarda en llegar a los 6 m/s.
2. **El joystick a medio camino da media velocidad.** Eso no se fue con el
   botón: `Math.min(inputMag, 1)` sigue ahí. Lo que se perdió es la
   *marcha*, no la entrada analógica, y son dos cosas distintas que es fácil
   confundir al borrar.

O sea: hay movimiento lento sin que exista una velocidad lenta.

### El sigilo, y lo que cuesta de verdad

Gus confirmó la decisión antes de empezar: **el sigilo se va y no vuelve.**
En dos tareas seguidas la poda se llevó las dos formas de ser silencioso —el
cuchillo en la 16.4, caminar en la 16.5— y ahora está dicho que eso es el
diseño, no un efecto colateral.

Lo que sí apareció midiendo, y queda escrito en la prueba que lo toca:
**escapar dejó de costar.** El margen contra el zombi era de medio metro por
segundo caminando y es de más del doble corriendo:

| | Velocidad | Margen contra el zombi que persigue (2,9 m/s) |
|---|---|---|
| Gus caminando (borrado) | 3,2 m/s | +0,3 m/s |
| **Gus hoy** | **6,0 m/s** | **+3,1 m/s** |

Antes, huir caminando te dejaba al zombi pegado y correr era la decisión.
Hoy cualquier movimiento alcanza. Es coherente con el juego nuevo —la
decisión es *dónde pararse*, no *cómo moverse*— pero **si en la 19A los
tramos se sienten fáciles de atravesar sin pelear, el número a mirar es
éste**, y está anotado en `zombis.spec.js` para que no haya que
redescubrirlo.

### Lo que la 16.5 deja planteado para la 16.6

El botón de interactuar es el único de los que quedan que **aparece y
desaparece solo**. Hay código que decide cuándo mostrarlo, y ese código es
más fácil de olvidar que el botón: es exactamente la forma de resto que
encontró la 16.4 —algo que sostiene a otra cosa— pero al revés, porque acá
lo que puede quedar huérfano es el que manda, no el mandado.

---

## 16.6 — Interactuar, que estaba muerto hacía cinco tareas y nadie lo notó

**20 de noviembre de 2026.**

**Lo que se fue.** `PLAYER.interactRange`, el botón `btn-interact` con su
CSS y su animación `respira`, la tecla `E`, el botón `interact` del gestor
de entrada y el evento `EV.INTERACT_AVAILABLE`.

Queda **un solo botón de acción**: DISPARAR. Había seis.

### La tarea más corta de la fase, y el hallazgo más incómodo

Abrí la tarea esperando desconectar un sistema. No había sistema. Al buscar
quién usaba cada pieza, la cuenta dio esto:

| Pieza | Quién la usaba |
|---|---|
| `EV.INTERACT_AVAILABLE` | **Nadie lo emite. Nadie lo escucha.** |
| `btn-interact` | Nace con `hidden` y **ningún código se la saca nunca** |
| `wasPressed('interact')` | **No existe en todo el proyecto** |
| `PLAYER.interactRange` | **No lo lee nadie** |

El sistema entero estaba muerto **desde la 16.1**, cuando se fueron los
ítems del piso. Lo que quedó no fue un sistema a medias: fue **la cáscara
completa, sin nada adentro**, en cinco archivos distintos.

### Por qué sobrevivió cinco tareas, que es lo que importa

Las tres tareas anteriores terminaron con un `grep` de los nombres que
deberían haber desaparecido. Ninguna lo encontró, y la razón es simple y
vale escribirla: **buscás lo que acabás de borrar.** La 16.1 borró ítems y
buscó "item", "botiquin", "municion". Nadie buscó "interact", porque
interactuar no se estaba borrando: se estaba quedando sin para qué.

> **La regla que agrega esta tarea.** Después de borrar un sistema, el
> `grep` no alcanza. Hay que preguntarse **quién le hablaba al que se fue**,
> y revisar si a ése le queda alguien con quien hablar. Un sistema no muere
> cuando se borra su código: muere cuando se borra el último que lo
> necesitaba, y eso pasa en otro archivo y otro día.

Y una segunda, más incómoda: **el botón se veía bien en todas las capturas**
de las cinco tareas anteriores, justamente porque nunca se mostraba. Un
elemento permanentemente invisible pasa cualquier revisión visual.

### El evento que sí se queda, y con fecha

En el mismo barrido apareció `EV.NOISE_EMITTED`: lo emite `spawnManager` en
cada ruido, con posición, alcance y cuántos zombis alertó, y **no lo escucha
nadie**. Por el criterio de la fase —no queda código muerto— se iba.

Se queda, y el motivo está escrito en `events.js` al lado: **lo va a
consumir la Fase 11, el audio**, que es exactamente un sistema que necesita
enterarse de cada estruendo con su posición. La diferencia con
`INTERACT_AVAILABLE` no es de forma sino de futuro: aquél no tenía a quién
esperar, porque el sistema que lo iba a usar ya se había borrado; éste
espera a una fase que está en el plan.

**Y queda con vencimiento:** si la Fase 11 pasa y nadie lo escucha, se
borra. Un hook sin fecha es código muerto con mejor prensa.

### Lo que deja escrito el botón que latía

`.btn-interact` tenía una animación, `respira`: un halo que crecía y se
desvanecía cada 1,8 s. Era el único botón del juego que aparecía y
desaparecía solo, y el latido estaba para que se notara al aparecer.

El comentario quedó en el CSS aunque el botón no, igual que la regla de
especificidad de la 16.3: **un elemento que aparece en medio de la acción
necesita movimiento, no color.** El color se lee mirando; el movimiento se
nota con el ojo en otro lado, que es donde está el ojo del jugador cuando el
aviso importa. La 19A va a necesitar exactamente eso para el cartel de la
esclusa.

### Lo que la 16.6 deja planteado para la 16.7

La 16.7 es la primera tarea de la fase que **no borra: mueve**. Y trae un
choque que conviene ver antes de empezar: el joystick se va a la mitad
derecha y **el botón de disparar ya está abajo a la derecha**. Se pisan.

Las tres salidas son subir el botón, achicar la zona del joystick, o que el
botón desaparezca y el arrastre del pulgar sea todo. **La tercera es la que
se lleva mejor con la Fase 17**, donde el combate pasa a ser automático y el
botón deja de existir igual. Conviene decidirlo sabiendo eso y no
descubrirlo dos tareas después.

---

## 16.7 — El joystick a la derecha, y un control que se dibujaba donde no se escuchaba

**20 de noviembre de 2026.**

La primera tarea de la fase que **no borra: mueve**. El joystick pasa a la
mitad derecha y la cámara a la izquierda (D-27), y el botón de disparar se
muda a la esquina de abajo a la izquierda.

### El cambio son dos caracteres, y ése fue el problema

Dar vuelta el control es dar vuelta una comparación. El joystick no tiene
posición fija —se dibuja donde cae el dedo— así que todo el reparto de
pantalla vive en una línea:

```js
const enLadoDelJoystick = e.clientX > innerWidth * 0.55;   // antes: < 0.45
```

Lo cambié, espejé las coordenadas de las pruebas táctiles, y **las 41
pruebas de punta a punta pasaron**. Incluidas las cinco que tocan el
joystick con eventos CDP reales, con detección de impacto, que son las que
el proyecto escribió específicamente para no volver a confiar en
`dispatchEvent`.

Estaba mal igual.

### Lo que encontró la captura y no encontró ninguna prueba

El **dibujo** del joystick seguía abajo a la izquierda. No se había movido
porque su posición en reposo no la decide el código de entrada: la decide el
orden del DOM dentro de `.hud-bottom`, que es un flex con `space-between`.

O sea: **el jugador veía el control de un lado y el juego lo escuchaba del
otro.** Apoyabas el pulgar sobre el dibujo del joystick y movías la cámara.

Y nada fallaba. No hay error de consola para esto. Las pruebas pasaban
porque **tocan coordenadas explícitas**, y yo había espejado las
coordenadas junto con el código: le estaba preguntando al juego por el lugar
correcto, no por el lugar donde el juego dice que está el control.

> **La regla, que quedó escrita como prueba y no como comentario:** un
> control se **dibuja donde se escucha**. Y el corolario sobre las pruebas:
> una prueba que usa una coordenada literal está midiendo *el manejador*,
> no *la interfaz*. Si el cambio mueve la interfaz, hay que preguntarle a la
> interfaz dónde está.

La prueba nueva compara el centro del joystick contra la mitad de la
pantalla, le pregunta al DOM por la caja real, y hace lo mismo con el botón
del otro lado. Si alguien da vuelta una sola de las dos cosas, falla.

### El choque que la tarea anterior anticipó, y cómo se resolvió

La 16.6 dejó anotado que el joystick y el botón de disparar se iban a pisar:
los dos querían la esquina de abajo a la derecha. Las tres salidas eran
subir el botón, achicar la zona del joystick, o que el botón desapareciera.

**Ninguna de las tres.** Al leer D-27 entera apareció la frase que decide:

> *"Sin botones de acción (D-28), la mitad derecha quedaba vacía."*

**D-27 está escrita para un mundo que todavía no existe.** Supone que el
botón ya se fue, y el botón se va en la Fase 17 con el combate automático.
Aplicar D-27 hoy no crea un problema de diseño: crea un interinato de dos
tareas.

Así que el botón se muda a la izquierda y queda el esquema de dos pulgares
dado vuelta: **el derecho mueve, el izquierdo dispara y apunta.** No es la
forma final de nada, y está escrito como provisorio en el CSS, con la fase
que lo borra. Cuando la 17 se lleve el botón, la mitad izquierda vuelve a
ser sólo cámara.

**Lo que aprendí de esto es sobre el orden de las tareas, no sobre el
joystick.** Una decisión escrita para el estado final puede ser imposible de
aplicar limpio en el estado intermedio, y eso no la invalida: obliga a
decidir el interinato a propósito. Lo que no se puede hacer es aplicarla a
medias y dejar el resultado roto porque *"la próxima fase lo arregla"*.

### Lo que la 16.7 deja planteado para la 16.8

`bindHudButton()` quedó **sin un solo llamador**. Era el método que conectaba
correr, interactuar, recargar, curarse y la bazooka; el único botón que
queda usa `bindAimButton()`, que es otro. Es el caso exacto que la 16.4
llamó *función de cableado*: no está rota, nadie la llama, y nada se queja.

Y `.action-cluster` con `.action-row` adentro son dos capas de contenedor
para **un botón**. Las dos se van en la 16.8, que cierra la fase.

---

## 16.8 — El andamio, y el cierre de la Fase 16

**20 de noviembre de 2026.**

**Lo que se fue.** `.action-cluster` y `.action-row` con su CSS, la regla de
`body.is-landscape` que las reacomodaba, `bindHudButton()` entero, y la
referencia `btnAttack` del HUD.

### Dos capas de contenedor para un botón

`.action-cluster` apilaba las filas de botones y `.action-row` alineaba los
botones de cada fila. Con seis botones y tres filas, eran estructura. Con
uno, eran **andamio**: dos elementos flex para alinear un solo hijo, que es
justo lo que el flex del padre ya hacía.

El botón quedó colgando directo de `.hud-bottom`, que es el flex con
`space-between` que lo manda a la izquierda y manda al joystick a la
derecha.

**Y hubo una decisión que podía ir para los dos lados.** En la 19B vuelven
las cartas de power-up, y con ellas algo que elegir en pantalla: ¿no
convenía dejar el contenedor? No, y la razón es de forma, no de prolijidad:
las cartas van **tres en el medio, en pantalla quieta**, y esto era
**botones apilados en una esquina durante la acción**. No es el mismo
contenedor con otro contenido: es otra cosa que se va a escribir entera.

### `bindHudButton()`, el tercer caso del mismo patrón

Conectaba un botón del HUD a un botón lógico, con `pointerdown`/`pointerup`
en vez de `click` para que respondiera al apoyar el dedo. Lo usaban correr,
interactuar, recargar, curarse y la bazooka. **Los cinco se fueron, y el
único botón que queda nunca lo usó**: disparar usa `bindAimButton()`, que
además convierte el arrastre en apuntado.

Es el mismo patrón que la 16.4 llamó *función de cableado* y que la 16.6
encontró del otro lado. Van tres formas de lo mismo, y conviene tenerlas
juntas porque se buscan distinto:

| Forma | Ejemplo | Cómo se encuentra |
|---|---|---|
| El centro que sostiene cosas sanas | `actualizarHudArma()` (16.4) | Preguntándole *para qué sirve ahora* y aceptando "para nada" |
| La cáscara sin nadie adentro | el sistema de interactuar (16.6) | Preguntándose *quién le hablaba al que se fue* |
| **La función sin llamadores** | `bindHudButton()` (16.8) | Contando los llamadores, no los usos del nombre |

Las tres son código correcto. Ninguna rompe nada. **Ninguna se encuentra con
un `grep` del nombre**, porque el nombre está ahí y se lee perfecto.

Lo que sí sobrevive es el detalle que la función enseñaba, y ahora vive en
`bindAimButton()`: `pointercancel` y `pointerleave` cuentan como soltar,
porque un dedo que se va del botón sin levantarse dejaría la acción apretada
para siempre.

### Y un `getElementById` a un botón que el HUD ya no toca

`this.el.btnAttack` lo leía `setArma()`, para alternar el texto del botón
entre ATACAR y DISPARAR. `setArma()` se borró en la 16.4 y la referencia
quedó: un `document.getElementById` que se resolvía bien, apuntaba a un
elemento que existe, y no lo usaba nadie. **El caso más silencioso de los
cuatro**, porque ni siquiera es una función: es una línea en un objeto.

---

## La Fase 16, cerrada

**Del 8 al 20 de noviembre de 2026. Ocho tareas.**

| | Tarea | Qué se llevó |
|---|---|---|
| 16.1 | Los ítems | Munición y botiquines del piso y del sistema entero |
| 16.2 | La munición | Cargador, reserva, recarga y el estado `RECARGANDO` |
| 16.3 | La bazooka | El arma, el cohete, la explosión, la barra de 30 s |
| 16.4 | El cuchillo | El cuerpo a cuerpo, el arco y el cambio de arma |
| 16.5 | Caminar | La segunda velocidad y el botón CORRER |
| 16.6 | Interactuar | Un sistema que ya estaba muerto hacía cinco tareas |
| 16.7 | El joystick | *(no borró: movió)* a la mitad derecha, D-27 |
| 16.8 | El HUD | El andamio de los botones que ya no estaban |

**El juego quedó así:** una calle, un arma que no se elige, una velocidad
que no se elige, un botón, y zombis. Arriba vida, objetivo y brújula; abajo
el joystick a la derecha y DISPARAR a la izquierda.

### Lo que aprendí, que es casi todo lo mismo dicho de cuatro formas

Las ocho tareas borraron código y siete de las ocho encontraron **algo que
el plan no había previsto**. En todos los casos era código sano que nadie
usaba, y en ningún caso lo encontró una prueba o la consola.

> **El código muerto no falla, y por eso no se encuentra solo.** Lo escribió
> la 16.3 y lo confirmaron las cinco tareas siguientes. Lo que se agregó
> después es *cómo* buscarlo, y son cuatro preguntas distintas:
>
> 1. ¿Hay nombres que deberían haber desaparecido? → `grep` (16.3)
> 2. ¿Esta función del medio sirve para algo ahora? → (16.4)
> 3. ¿A quién le hablaba el que se fue? → (16.6)
> 4. ¿Cuántos llamadores tiene esto, no cuántas menciones? → (16.8)

Y una quinta, que no es sobre código muerto sino sobre pruebas, y apareció
tres veces seguidas:

> **El nombre de un bloque de pruebas dice contra qué se escribió, no qué
> mide.** `armas.test.js` (16.4), *"caminar se lee como caminar"* (16.5) y
> las táctiles de la 16.7 iban a morir o quedar mal por el nombre. Cuando
> una premisa se cae hay que leer prueba por prueba cuál dependía de ella,
> porque las premisas no se reparten parejo dentro de un archivo.

### Lo que la fase costó, y no está en las líneas borradas

Tres cosas, y conviene que estén juntas porque **ninguna fue un accidente**
pero las tres cambian el juego:

1. **No hay forma silenciosa de matar** (16.4). Se fue con el cuchillo. Lo
   confirmó Gus: el sigilo se va y no vuelve.
2. **No hay forma silenciosa de moverse** (16.5). Se fue con caminar, y de
   paso escapar dejó de costar: el margen contra el zombi pasó de +0,3 m/s a
   +3,1.
3. **El arma no se separa del asfalto** (16.4). Eso sí fue un accidente: el
   cuchillo le venía tapando el agujero a la pistola, y quedó escrito con
   `it.fails` para que la 20.8 no lo pase por alto.

Las dos primeras son el diseño: la única decisión que le queda al jugador es
**dónde pararse y cuánto tiempo**, y para que eso sea una decisión no puede
haber una salida barata.

### Lo único que la fase no pudo cerrar sola

El criterio decía *"no hay un solo botón de acción en pantalla"*. **Queda
uno**, DISPARAR, y no se podía borrar: hasta que algo dispare en su lugar,
borrarlo deja al jugador sin forma de pelear.

Se va en la 17, y por eso la 17 empieza por el estado de "quieto": es lo que
tiene que existir antes de que el botón pueda desaparecer.

---

## 17.1 — Las estadísticas nuevas, y tres pruebas que tenían el mismo número a mano

**20 de noviembre de 2026.** Primera tarea de la Fase 17.

Los números de D-31, que los fijó Gus y no se discuten:

| | Antes | Ahora | La cuenta |
|---|---|---|---|
| Vida de Gus | 100 | **120** | 10 × 12 = 120 → **12 mordidas** |
| Daño del arma | 34 | **25** | 25 × 4 = 100 → **4 tiros** |
| Vida del zombi | 60 | **100** | |
| Mordida del zombi | 12 | **10** | |

### Lo que de verdad cambió no es la vida: es el tiempo expuesto

Matar un zombi pasó de **0,8 s** a **1,6 s** de estar parado al lado suyo
—dos tiros a cuatro, con la cadencia en 0,4 s—. El doble. Y matar a Gus pasó
de 8 mordidas a 12.

Las dos cosas van para el mismo lado y no es casualidad: **la pelea se hace
más larga y más perdonadora a la vez**. Con el combate automático, quedarse
quieto es *la* decisión del jugador, y una decisión sólo existe si se puede
tomar mal sin perder la partida en el acto. Con ocho mordidas, pararse al
lado de dos zombis era una sentencia, y nadie elige una sentencia: todos
corren. Con doce hay lugar para equivocarse, ver qué pasó y volver a
intentar.

El tiempo expuesto quedó escrito como prueba, aunque no sea una prueba de
regresión, porque es **el número que define el ritmo del juego** y la 17.9
lo va a tocar:

```js
const tiros = ZOMBIE_STANDARD.maxHealth / P.damage;
expect(tiros * P.cooldown).toBeCloseTo(1.6, 2);
```

### Las cuentas ahora son exactas, y antes eran "alcanza o sobra"

La prueba vieja decía:

```js
expect(P.damage * 2).toBeGreaterThanOrEqual(ZOMBIE_STANDARD.maxHealth);
```

O sea: dos tiros alcanzan **o sobran**. Con 34 de daño y 60 de vida,
sobraban 8 puntos en cada muerte.

La nueva pide que dé **exacto**: `expect(P.damage * 4).toBe(100)`. No es
rigor por rigor. En la 19B las cartas de ataque multiplican el daño, y el
texto de una carta promete *"+20% de daño"*. Si el último tiro de cada zombi
viene desperdiciando daño, ese +20% **no se nota hasta que acumulás
suficiente como para quitar un tiro entero**, y la carta miente. Con la
cuenta exacta, cada punto de daño que una carta agrega es tiempo que el
jugador no pasa expuesto.

### Y la mitad de D-31 que no estaba medida en ningún lado

Las doce mordidas. Había pruebas del daño del arma contra la vida del zombi
desde la Fase 6, y **ninguna** del daño del zombi contra la vida de Gus. El
número existía en el balance y nadie lo cruzaba con nada.

Es el lado del balance que decide cuánto se puede equivocar el jugador, y
con el combate automático es **la única decisión que toma**. Ahora está
fijado igual que el otro.

### Tres pruebas que se rompieron por el mismo motivo, en tres archivos

Al subir la vida de 100 a 120 fallaron tres pruebas que no tienen nada que
ver entre sí: el HUD arrancando lleno, reaparecer en un checkpoint, y el
reloj que no se reinicia al morir.

Las tres tenían escrito `100`. Y **ninguna estaba midiendo el número 100**:

| Prueba | Qué mide de verdad |
|---|---|
| `smoke.spec.js:35` | Que el HUD arranque con la vida **llena** |
| `smoke.spec.js:203` | Que reaparecer en un control cure **del todo** |
| `mision.spec.js:315` | Que morir devuelva **entero**, conservando controles |

Las tres ahora leen `globalThis.game.balance.PLAYER.maxHealth`. No es
prolijidad: es que **una constante escrita a mano en una prueba convierte un
cambio de balance en un falso error**, y después de tres falsos errores
seguidos la reacción natural es cambiar el número sin leer qué se estaba
probando.

> **La regla:** una prueba que afirma un número del balance tiene que
> **pedírselo al balance**, salvo que el número *sea* lo que prueba. La
> unitaria de las cuatro balas sí escribe el 4, porque el 4 es la regla; la
> de smoke no escribe el 120, porque lo que prueba es "lleno".

Es la misma familia que la regla de los rumbos —*"los ángulos no se escriben
como números, se le piden al convenio del proyecto"*— que ya había costado
una fase entera cuando el cuchillo golpeaba para atrás.

### Lo que la 17.1 deja planteado para la 17.2

La 17.2 produce el estado *quieto*, y la trampa está en qué se mide:
**la entrada del jugador, no la velocidad del cuerpo**. Gus frena por
inercia en 0,18 s; si esperáramos la velocidad, cada parada sumaría esa
demora encima del retardo de 0,15 y daría casi un tercio de segundo entre
soltar y disparar. En un juego donde ahora hacen falta 1,6 s por zombi, un
tercio de segundo de duda por parada es mucho.

---

## 17.2 — "Quieto", que es la entrada de todo, y un error que no era un error

**20 de noviembre de 2026.**

Gus está quieto cuando **el joystick está en cero por 0,15 s**. No cuando la
velocidad llega a cero. El estado vive en `player.quieto`, la regla en la
función pura `avanzarQuieto()`, el número en `PLAYER.quietoDelay`, y se ve
en el diagnóstico con `F1`.

**No dispara nada todavía.** Esta tarea sólo produce el booleano.

### Las dos maneras de medir "quieto", y por qué una está mal

Se parecen muchísimo hasta que no se parecen:

| | Qué mide | Qué sale mal |
|---|---|---|
| **La entrada** (elegida) | Si el jugador **decidió** frenar | Nada que importe |
| La velocidad | Si el cuerpo **se detuvo** | Dos cosas, y las dos feas |

La primera es la obvia: Gus frena por inercia en 0,18 s, así que mirando la
velocidad cada parada sumaría esa demora **encima** del retardo de 0,15.
Casi un tercio de segundo entre soltar y que salga la bala, en un juego
donde matar un zombi lleva 1,6 s. Se sentiría como que el personaje duda.

**La segunda es la que no había visto, y es peor:** chocar de frente contra
una pared deja la velocidad en cero con el pulgar clavado en el joystick.
Midiendo la velocidad, eso es "quieto": Gus se pondría a pelear contra una
pared mientras el jugador cree que está escapando. Y no es un caso raro —en
una calle de diez metros con autos y cordones, chocar es lo normal.

Lo que el juego necesita saber es **si el jugador decidió frenar**. Eso está
en el pulgar, no en el cuerpo.

### La asimetría: ponerse a pelear tarda, dejar de pelear es instantáneo

Entrar en quieto lleva 0,15 s. Salir es inmediato: cualquier entrada lo
apaga en el mismo cuadro.

Es deliberado y es a favor del jugador. Si moverse tuviera su propio
retardo, Gus seguiría disparando —y por lo tanto **encarando al blanco**—
durante el primer paso de la huida, que es exactamente el paso en el que uno
huye porque algo salió mal.

### El contador se reinicia, no se pausa

Soltar y volver a tocar dentro de los 0,15 s **no** cuenta como haber estado
quieto.

Si el contador se pausara en vez de reiniciarse, un pulgar que se mueve a
tirones —tocar, soltar, tocar, soltar— iría sumando décimas sueltas hasta
cruzar el umbral, y Gus se pondría a disparar **en medio de una corrida**.
El jugador no tendría forma de entenderlo: nunca se quedó quieto.

Tiene su prueba, y es la que justifica el diseño entero: dos tramos de 0,083
s separados por un toque suman 0,166 —que cruzaría el umbral— y no dejan
quieto.

### El umbral de "hay entrada" se le copia al movimiento, a propósito

`inputMag > 0`, el mismo que ya usaba el movimiento. No se inventó uno
propio.

Si quieto usara un umbral más alto, quedaría una franja del joystick —el
pulgar apenas desviado— donde Gus **camina despacio y dispara al mismo
tiempo**. Eso rompe D-28 de la peor manera posible: no con un error visible,
sino con un rincón del control donde el juego se comporta distinto y nadie
sabe por qué.

### La función es pura, y eso no fue un detalle

`PlayerController` necesita una entidad de PlayCanvas para existir, así que
no tiene pruebas unitarias: todo lo suyo se prueba en el navegador. Si la
regla de quieto hubiera vivido adentro de la clase, **la entrada de todo el
combate automático habría quedado sin una sola prueba con números**.

Vive afuera, como `approach` y `approachAngle`, que ya estaban exportadas
por el mismo motivo. Diez pruebas, incluidas las dos que no se me habrían
ocurrido mirando la pantalla: qué pasa con un `dt` enorme tras un alt-tab
(deja quieto, y está bien: el jugador efectivamente no tocó nada) y qué pasa
con `dt` cero (nada, ni para un lado ni para el otro).

### Y un error que no era un error, que es la parte que vale la pena

La captura con el diagnóstico mostró esto:

```
quieto    no (0.15 s)
```

El contador en el umbral y el estado en `no`. Parecía un `>=` escrito como
`>`. Lo medí en el juego corriendo en vez de suponerlo, y 580 ms después de
soltar seguía en `no`, con el contador reiniciándose.

**No había ningún error.** El navegador de prueba corre con WebGL por
software **a 4 cuadros por segundo**, y el juego acota el `dt` a 1/15 de
segundo (`PERF.maxDeltaTime`) para que un cuadro largo no teletransporte a
nadie a través de una pared. O sea: **el reloj del juego avanza cuatro veces
más lento que el de pared**. 580 ms de espera son 0,067 s de juego: un
cuadro.

Esperando de verdad, pasa a `quieto: true` como corresponde.

> **Lo que me queda escrito:** en este proyecto, un número leído del
> navegador de prueba está en **tiempo de juego**, no en tiempo de pared, y
> los dos difieren por un factor de cuatro o más. Las pruebas de punta a
> punta ya lo sabían —varias tienen el comentario de esperar por condición y
> no por tiempo— pero yo lo apliqué al escribirlas y no al leer un
> diagnóstico.
>
> Y la otra mitad: **antes de arreglar lo que parece un error de borde, hay
> que medirlo.** Si hubiera "arreglado" el `>=`, habría cambiado la regla
> para tapar un problema que no existía.

### Lo que la 17.2 deja planteado para la 17.3

`objetivoAutomatico()` —el rescate de la 16.3, el único de toda la Fase 16—
nació como el apuntado de la **bazooka**, y una bazooka no busca al enemigo
más cercano: busca **el mejor centro de explosión**, el punto donde caen más
juntos. Son dos cosas parecidas que no son la misma.

Hay que leer qué hace de verdad antes de reusarlo. Si hace lo de la bazooka,
lo que la 16.3 rescató fue el archivo y las pruebas, no la función.

---

## 17.3 — El blanco, que es una foto y no un seguimiento

**20 de noviembre de 2026.**

Al quedarse quieto, Gus elige al enemigo más cercano que pueda ver, y lo
mantiene. Vive en `combat/blanco.js` como `SelectorDeBlanco`, lógica pura,
con trece pruebas unitarias y una de punta a punta. Se ve en el diagnóstico.

**Todavía no dispara.** La 17.5 gira hacia el blanco y la 17.9 aprieta el
gatillo.

### Primero, una sospecha mía que estaba equivocada

La 17.2 dejó anotado que había que desconfiar de `objetivoAutomatico()`: era
el apuntado de la **bazooka**, y una bazooka no busca al más cercano, busca
el mejor **centro de explosión**. Si fuera así, lo que la 16.3 rescató era
el archivo, no la función.

Lo leí. **No era así.** La función hace exactamente *"el más cercano, vivo,
dentro del alcance, con línea de vista"*, y hasta tiene escrito por qué la
línea de vista no es opcional. La bazooka la usaba para elegir **a quién**
apuntarle, y el daño en área lo resolvía después, en otro lado.

Queda anotado porque la sospecha era razonable y la respuesta no era
adivinable: **el rescate de la 16.3 fue aún mejor de lo que parecía**. La
regla central del juego nuevo estaba escrita entera, guardada en el archivo
de un arma que se borró.

### Por qué el blanco no se recalcula en cada cuadro

Elegir al más cercano sesenta veces por segundo parece lo mismo y es otra
cosa. Con dos zombis acercándose a la par, el "más cercano" se alterna
varias veces por segundo: Gus giraría en el lugar y **repartiría** el daño
en vez de concentrarlo.

Y con los números de la 17.1 eso no es un detalle estético: hacen falta
**cuatro tiros** por zombi. Un blanco que cambia solo garantiza que ninguno
llegue nunca a los cuatro. **El combate automático no mataría a nadie.**

Así que se elige **al entrar en quieto** —el flanco, no el estado— y se
mantiene. Es lo que el criterio de salida de la fase pide con todas las
letras: *"el blanco elegido es siempre el más cercano **en ese momento**"*.

### Y esa frase me hizo escribir una prueba mal

La prueba de punta a punta comparaba `blanco.distancia` contra las
posiciones de los zombis **de ahora**. Falló por tres metros: el elegido
estaba a 5,03 m y el más cercano visible a 1,98 m.

Mi primer reflejo fue que había un error en la elección. No lo había: **los
zombis caminan**. `blanco.distancia` es la distancia del instante en que
eligió, y entre esa elección y la medición pasó un segundo entero de juego.

El fallo no marcaba un error del código sino de la prueba, y marcaba
justamente **la regla que la tarea implementa**: el blanco es una foto del
momento en que el jugador frenó. Comparar una foto contra el presente no
prueba nada.

La prueba ahora fuerza una elección nueva y mide **en el mismo instante**,
sin dejar pasar un cuadro.

> **Van dos tareas seguidas con la misma forma:** en la 17.2 el diagnóstico
> parecía mostrar un `>=` roto y era el reloj del navegador de prueba; acá
> una prueba parecía mostrar una elección rota y era la prueba midiendo mal.
> **Las dos veces, lo que parecía un error era el sistema funcionando como
> estaba diseñado.** Y las dos veces, lo que lo aclaró fue medir en vez de
> suponer.

### Lo que sí cambia la elección, y lo que no

| Pasa esto | ¿Vuelve a elegir? |
|---|---|
| Otro zombi pasa a estar más cerca | **No.** Es la regla de arriba |
| El jugador se mueve y vuelve a frenar | **Sí.** Es otra decisión |
| Frenó donde no había nadie y aparece uno | **Sí**, sin tener que moverse |
| El blanco muere, se aleja o queda tapado | **Todavía no.** Es la 17.4 |

El tercero merece su párrafo porque es fácil no pensarlo: si el jugador
frena en una cuadra vacía y un zombi dobla la esquina tres segundos después,
tiene que empezar a dispararle **sin moverse**. Si hiciera falta un gesto
para que el juego "se entere", sería un gesto inútil que además lo expone.

### Y moverse lo suelta en el acto

Sin arrastre, igual que `quieto`. Si soltar el blanco tuviera cualquier
demora, Gus seguiría **encarando** al zombi del que huye durante el primer
paso de la huida, que es exactamente el paso en el que uno huye porque algo
salió mal.

### Una prueba intermitente, y la lección ya estaba escrita en este repo

La de punta a punta pasaba sola y fallaba en la corrida completa. Esperaba
300 ms después de apretar `W` y leía el estado.

El motivo es el mismo de la 17.2: el navegador de prueba corre con WebGL por
software, a veces a cuatro cuadros por segundo, así que 300 ms de pared
pueden ser un cuadro de juego **o ninguno**. Varias pruebas de este repo ya
tienen el comentario *"se espera a que pase, no se mide en un tiempo fijo"*.
Lo escribí mal igual.

Ahora espera por condición. Y queda anotado que la regla no es "a veces
conviene": en este proyecto, **esperar por tiempo en una prueba de navegador
está mal siempre**.

### Lo que la 17.3 deja planteado para la 17.3 bis

Sacar la dispersión tiene una trampa que no es del arma. El azar con semilla
(D-12) lo usaba **sólo** `dispersar()`. Al sacarla, el generador del combate
queda sin consumidores, y **si el mundo compartiera ese generador, sacar un
consumidor correría la secuencia y cambiaría el mapa entero** sin que nadie
lo pida.

El combate tiene su propia semilla justamente para que eso no pase. Hay que
verificar que se respetó antes de borrar nada.

---

## 17.3 bis — El tiro deja de fallar, y un generador de azar que se fue entero

**20 de noviembre de 2026.**

**Lo que se fue.** `spreadDegrees`, `aimAssist`, las funciones `dispersar()`
y `rumboAsistido()` de la balística, el parámetro `asistirApuntado`, y **el
generador de azar del combate completo**.

El tiro no falla nunca, salvo que haya una barrera física en el medio
(D-36).

### Errar dejó de ser información

La dispersión eran dos grados y medio: chica a propósito, porque a tres
metros no se nota y a veinticinco sí. Castigaba el tiro largo sin volver
injusto el de cerca, que es donde se jugaba.

Eso tenía sentido mientras el jugador apuntaba. **Un tiro que falla le
enseña algo a quien eligió el ángulo**: el trazado le muestra por dónde pasó
la bala y corrige el siguiente. Con el combate automático no eligió nada, así
que fallar no le enseña nada ni le da nada que corregir.

> **Un sistema que castiga con azar a quien no tomó la decisión es sólo
> ruido.** No es dificultad: es que a veces el juego funciona y a veces no.

El apuntado asistido se cayó solo, y de la forma más limpia: existía para
perdonarle el temblor del pulgar al jugador, y ya no se apunta con el
pulgar.

### El generador de azar, y la trampa que valía la pena verificar

La 17.3 dejó anotado el riesgo: el azar con semilla (D-12) lo consumía
**una sola cosa**, la dispersión. Al sacarla, el generador quedaba sin
usuarios. Y si el combate hubiera compartido el generador del mundo,
**sacarle un consumidor habría corrido la secuencia y cambiado el mapa
entero** sin que nadie lo pidiera.

No pasó, y no por suerte. El combate tenía su propia semilla
—`WORLD_SEED ^ 0x9e3779b9`— y el gestor de zombis la suya
—`mission.seed ^ 0x5a5a`—. El comentario que justificaba esa separación
hablaba del futuro: *"cualquier otra cosa que consuma azar en el futuro —el
graznido de un pájaro, la variación de una textura— correría la secuencia
del combate"*.

Resultó servir para lo contrario de lo que anticipaba:

> **Dos generadores separados no sólo se pueden razonar por separado:
> también se pueden *borrar* por separado.** Lo que parecía prolijidad fue
> lo que permitió sacar un sistema entero sin tocar el mapa.

Es la misma familia de cosas que la 16.3 aprendió al revés, con
`objetivoAutomatico()` guardado dentro de la bazooka: **lo que decide si un
borrado es barato o carísimo es dónde estaba guardada cada cosa**, y eso se
decide mucho antes de borrar.

Con el azar se fueron también el `import` de `createRng` y el de
`WORLD_SEED` en `main.js`. El combate ya no tiene una sola decisión al azar.

### Diez pruebas murieron, y esta vez murieron bien

Cuatro de dispersión y seis de apuntado asistido. Se borraron enteras.

Y conviene marcar la diferencia con los tres casos de la Fase 16, donde
estuve a punto de borrar pruebas que seguían valiendo:

| Caso | Qué se cayó | Qué hice |
|---|---|---|
| `armas.test.js` (16.4) | La **premisa** del bloque (había varias armas) | Salvar las que no eran comparativas |
| *"caminar se lee como caminar"* (16.5) | La **pose**, pero las pruebas medían el ciclo | Pasarlas a `CORRER` |
| **Dispersión y apuntado (17.3 bis)** | **El sistema entero que medían** | Borrarlas |

**Ninguna de las diez estaba mal.** Medían bien dos sistemas que el juego
dejó de tener. Cuando lo que desaparece es el sujeto, y no la premisa del
bloque, las pruebas se van con él.

### Lo que queda en su lugar, que es menos y es mejor

Tres pruebas, y la primera es la que importa:

```js
// Dos tiros identicos dan EXACTAMENTE el mismo resultado.
expect(a.ev.disparos[0].rumbo).toBe(b.ev.disparos[0].rumbo);
expect(a.ev.disparos[0].hasta).toEqual(b.ev.disparos[0].hasta);
```

Hay un detalle que me gustó encontrar. El `azar` por omisión del controlador
devolvía siempre el centro —cero dispersión— para que **una prueba que no
pasara generador obtuviera un disparo perfecto y repetible**. Era un truco
para que las pruebas no fallaran por mala suerte.

Ese truco es ahora la regla del juego. Lo que el código hacía para poder
probarse resultó ser lo que el diseño quería.

### Y una que no es de regresión sino de diseño

*"A máxima distancia también acierta: ya no hay castigo por tirar lejos."*

Era exactamente lo que la dispersión hacía: a veinticinco metros el desvío
superaba el ancho del cuerpo del zombi y el tiro se perdía. Dejó de tener
sentido cuando el jugador dejó de elegir la distancia: **no se para lejos
para tener ventaja, se para donde puede.**

### Lo que la 17.3 bis deja planteado para la 17.3 ter

La 17.3 ter escribe el disparo como **ráfaga** aunque hoy la ráfaga sea de
uno, y la prueba que vale es la de equivalencia: con `carriles = 1` y
`repeticiones = 1`, el comportamiento tiene que ser **exactamente** el de
hoy. No "parecido": si cambia el orden de los avisos, el ruido o el trazado,
la refactorización se llevó puesto algo.

Y hay una decisión chica que conviene cerrar ahí y no después: **el ruido es
uno por ráfaga, no uno por proyectil.** Es un disparo, no diez. Con las
cartas acumuladas de la 19B, uno por proyectil haría que una ráfaga tardía
despertara literalmente a todo el mapa.

---

## 17.3 ter — La ráfaga de uno, y un abanico que se carga para la derecha

**20 de noviembre de 2026.**

El disparo pasa a estar escrito como **ráfaga**, con la fórmula de D-44
adentro y los dos multiplicadores en 1. Vive en `combat/rafaga.js`, lógica
pura, con dieciséis pruebas.

```
proyectiles = carriles × repeticiones
```

Hoy sale **un** proyectil, exactamente como ayer.

### La prueba de equivalencia la dieron las pruebas que ya existían

La tarea pedía que con los multiplicadores en 1 el comportamiento fuera
**exactamente** el de hoy, no "parecido". Resultó que esa prueba ya estaba
escrita: las **39 pruebas de `pistola.test.js` pasaron sin tocar una sola
línea**, incluidas las ocho que recorren los ocho rumbos cardinales y la que
exige que dos tiros idénticos den resultados idénticos.

Es una forma de equivalencia que no se me había ocurrido pedir y que es más
fuerte que cualquier prueba que hubiera escrito a propósito: **el banco de
pruebas viejo, corriendo sin modificaciones sobre el código nuevo.**

### Lo que no implementé, y por qué

La tarea decía *"tiene que haber proyectiles que viajen"*. **No los hice**,
y quiero que quede dicho derecho en vez de escondido entre líneas.

Con `carriles: 1` y `repeticiones: 1` **no existe ningún proyectil extra**.
Un sistema de proyectiles con cero proyectiles es código que no se puede
probar jugando, que es exactamente lo que la Fase 16 estuvo ocho tareas
borrando, y que se arregla mal dos veces: primero se escribe a ciegas y
después se reescribe cuando aparece el primer caso real.

Lo que **sí** está hecho es lo que vuelve barata a la 19B, que es el motivo
real por el que la tarea existe:

- La **fórmula**, con los dos ejes multiplicándose.
- El **reparto**: qué proyectil es el rayo apuntado y cuáles vuelan.
- El **abanico**: a qué ángulo sale cada carril.
- El **ruido**: uno por ráfaga, no uno por proyectil.

Los proyectiles que vuelan llegan con la primera carta que produzca un
segundo proyectil. Para entonces habrá un caso real que mirar.

### El ruido es uno por ráfaga, y eso es balance, no prolijidad

Es un disparo, no diez: lo que suena es el arma.

Y tiene consecuencia concreta. Con las cartas acumuladas del final de la
partida —dieciséis impactos en una ráfaga, según la cuenta de D-44— un ruido
por proyectil haría que **una sola ráfaga despertara literalmente a todo el
mapa**. El jugador no tendría forma de relacionar una cosa con la otra:
dispararía una vez y vendría todo el barrio.

### Y el hallazgo: el abanico se carga para la derecha

Escribí una prueba dando por hecho que el abanico cerraba simétrico, y pedí
que los desvíos sumaran cero. Con cuatro carriles suman **24**.

Fui a arreglar el código y no había nada que arreglar. **Es inevitable:**

| Carriles | Desvíos | Suma |
|---|---|---|
| 1 | `0` | 0 |
| **2** | **`0, +12`** | **+12** |
| 3 | `0, +12, −12` | 0 |
| **4** | **`0, +12, −12, +24`** | **+24** |

El carril 0 **tiene que** ir derecho: es el tiro apuntado, el que no falla
(D-36). Con cantidad par de carriles siempre sobra uno de un lado, porque no
hay forma de centrar un abanico par alrededor de un rayo fijo.

Y el caso más común de todos es el peor: **`tiro doble` da dos carriles**,
o sea `0` y `+12`. Siempre a la derecha. Es probablemente la primera carta
que va a tomar un jugador.

**No lo "arreglé", y la razón importa.** La salida sería que `tiro doble`
abra a ±6 y mueva el rayo apuntado al centro del par — pero eso significa
que el tiro apuntado deja de ir al blanco, **o sea que cambia D-36**. Es una
decisión de diseño, no un ajuste de números, y no se puede tomar sin la
carta en la mano para mirarla jugando.

Quedó fijado con números en `rafaga.test.js` y anotado en la 19B del
roadmap, para que la 19B se tropiece con él cuando corresponda.

> **Es la tercera vez en esta fase que una prueba mal escrita encuentra algo
> cierto.** En la 17.3 fue el blanco que es una foto; acá, la asimetría del
> abanico. Las dos veces el reflejo fue "el código está mal" y las dos veces
> era el código haciendo lo único que podía hacer. **Escribir la prueba
> primero y mirar quién tiene razón después sigue siendo la parte más
> barata de todo esto.**

### Lo que la 17.3 ter deja planteado para la 17.4

La 17.4 hace que el blanco se suelte cuando deja de servir, y tiene una
trampa que conviene nombrar antes: **revalidar cada cuadro se parece
peligrosamente a elegir cada cuadro**, que es justo lo que la 17.3 decidió
no hacer.

La diferencia tiene que quedar escrita en el código: *se revalida al actual;
no se compara contra los demás*. Si el actual sigue vivo, en rango y a la
vista, se queda, **aunque haya otro a la mitad de distancia**. Si eso se
confunde, vuelve el problema de la 17.3 y ningún zombi llega nunca a los
cuatro tiros.

---

## 8/11 — Para qué sirven las cartas. Yo las había leído como quince aumentos sueltos

Gus explicó el 8/11 cuál es la gracia de los power-ups, y no era lo que yo
había entendido leyendo la especificación el día anterior.

Yo había leído quince cartas y había mirado cada una por separado: *esta sube
el daño un 30 %, esta agrega un proyectil*. Desde ahí llegué a un diagnóstico
—una carta Premium de daño sola no cambia nada— y a una propuesta: subir los
porcentajes. **El diagnóstico estaba bien. La propuesta estaba al revés.**

Lo que Gus describió es otra cosa:

> *"Tenés la mejora premium. Después te salta el que dispara 2 proyectiles al
> mismo tiempo: ahí cada tiro vale 2, más encima una mejora premium. Después
> la tercera carta es la que dispara un proyectil tras otro. Entonces en cada
> tiro que antes era uno solo, ahora dispara 4 tiros de una sola vez. Y encima
> con una mejora premium. Eso cambia un montón."*

### Lo que faltaba escribir, y era lo único importante

**La especificación decía "se suman" y eso no alcanza.** Con quince cartas que
se toman en cualquier orden, "se suman" no define el resultado: hay que decir
qué se suma y qué se multiplica, o la misma mano de cartas da números
distintos según el orden en que salieron. Eso es una ambigüedad de
especificación, y es el tipo de cosa que no se descubre leyendo: se descubre
haciendo la cuenta.

De la frase de Gus sale la fórmula, y quedó como **D-44**:

```
proyectiles = (1 + tiro_doble + 2 × diagonales) × (1 + disparo_múltiple)
daño_c/u    = base × (1 + Σ aditivos − Σ penalidades)
```

Dos carriles por dos repeticiones son **cuatro**, no tres. Gus lo dijo con esas
palabras —*"4 tiros de una sola vez"*— y es la diferencia entre un sistema que
escala y uno que se acerca a un techo.

### Por qué mi propuesta de subir los porcentajes era mala

Porque una carta de daño vale `proyectiles ×` su porcentaje.

| | Proyectiles | Lo que regala el Premium |
|---|---|---|
| Al principio de la partida | 1 | 7,5 de daño por ráfaga |
| Al final | 8 | **60 de daño por ráfaga** |

**Las cartas de daño no son flojas: son flojas al principio y enormes al
final.** Y eso es exactamente la curva que Gus quiere, la que hace que el
jugador quiera seguir jugando para ver cómo se descontrola. Si yo subía los
porcentajes para que la primera se sintiera, rompía la última.

La solución verdadera no está en los números: está en **el sorteo**. Que una
carta de daño no salga cuando el jugador todavía no tiene proyectiles que
multiplicar. Es una línea de código y es la 19B.9, que cambió de forma entera.

**La lección, que es la misma que la del sol a 17° y la de los 1.624 m, pero en
otro terreno:** esta vez la intuición no falló por falta de medición, falló por
*leer las partes sin hacer la cuenta del conjunto*. Quince cartas se pueden
leer una por una y entender cada una perfectamente, y no entender el sistema.
Alcanzaba con multiplicar dos números.

### Y después, lo que sale gratis: dos techos que nadie había buscado

Haciendo la fórmula aparecieron dos consecuencias de la regla de **no repetir
cartas**, que yo había anotado como una regla de variedad. No lo es: es el
techo de todo. Es **D-45**.

**El techo de proyectiles.** Si tiro doble y disparo múltiple se toman una vez
cada uno, el producto tiene un máximo: `4 carriles × 2 repeticiones = 8
proyectiles por ráfaga`. **Ocho, siempre, por más larga que sea la partida.**
Un número conocido es lo que hace que una reserva de objetos se pueda
dimensionar y medir. Si las cartas se pudieran repetir, ese techo no existe.

**El techo de controles, que es el que importa ahora.** Con 15 cartas y 3 por
control, en el control 13 quedan exactamente 3 cartas en el pool: las tres que
salen, o sea que no hay elección. En el 14 ya no se pueden repartir tres.
**Trece es el máximo matemático y doce el último que es una decisión.**

Esto importa porque Gus dijo en el mismo mensaje que está pensando en pasar a
un control por cuadra sobre el recorrido real, 16 controles. **No se puede sin
romper la regla de no repetir, que es la que sostiene el techo de proyectiles.**
Las dos decisiones están acopladas y conviene verlo antes de tocar cualquiera:

> más controles → cartas repetibles o con nivel → se cae el máximo de 8
> proyectiles → el costo en el teléfono deja de tener techo

No es un impedimento, es un precio. Queda en decisiones abiertas y se decide
antes de la 19B.1, porque el sistema de modificadores se escribe distinto si
las cartas tienen nivel.

### Una cuenta que hay que corregirle a Gus, y es a favor

Gus dijo *"si no me equivoco son 8 fases en total, o sea cada 2 cuadras es un
checkpoint"*. El número 8 está bien y el *cada 2 cuadras* no:

| | Hoy |
|---|---|
| Puntos del recorrido | **8** — inicio, 6 controles, casa de Sergio |
| Tramos | **7**, de 100 m cada uno |
| Controles por cuadra | **uno** |

**Lo que Gus quiere para más adelante ya es lo que hay**, sólo que sobre 700 m
en lugar de 1.624. El trazado ortogonal de D-35 ya comprimió el recorrido real
a siete cuadras, y cada esquina es un control.

O sea que la pregunta de los 16 controles no es *"¿controles más seguidos?"* —
eso ya está— sino **"¿16 cuadras de ciudad en vez de 7?"**. Eso es Fase 18 y
Fase 13: el doble y algo de ciudad para construir, iluminar, poblar y hacer
entrar en un teléfono, cuando bajar de 238 llamadas de dibujo a 150 sobre
*siete* cuadras todavía es una tarea pendiente. Es una decisión de alcance, no
de ritmo, y por eso dejarlo como está hoy es lo correcto.

### Dos cartas que tocan cosas que acabo de borrar

**"Sanar" restaura el 40 % de la salud**, y el botón de curarse se fue en la
16.1, con `Pose.CURARSE` borrada en la 16.3. La carta la trae de vuelta pero
cambiada, y mejor: no es un recurso que se administra —que es lo que D-28 vino
a sacar— es **un premio de una sola vez**. No devuelve ningún botón y no
contradice D-31, porque el daño sigue sin regenerarse solo. Lo que falta es
poder bajarle el daño a Gus desde afuera del combate, que hoy no está
conectado: tarea 19B.12.

**Y "HP Boost" y "Sanar" se van a confundir.** Una sube el techo, la otra llena
lo que falta. Con 120 de vida base, HP Boost lleva el máximo a 144 **sin curar
nada**: tomarla con 30 de vida deja al jugador con 30 de 144. Es el mismo
síntoma que el Premium de daño —una carta que se elige y no pasa nada visible—
y la misma solución, que es el texto de la carta y no el número.

### Lo que esto cerró de la Fase 17

La 17.3 ter estaba anotada como *"¿rayo o proyectil?"* con una propuesta mía y
un pedido de discutirla. **Ya no hace falta discutirla.** Si la progresión de
toda la partida es la multiplicación de proyectiles, tiene que haber
proyectiles que viajen; no es una opción de implementación, es el eje del
juego. Lo único que quedaba era si el tiro apuntado sigue siendo rayo, y las
dos cosas conviven: el primero va al blanco y no falla (D-36), los demás vuelan
y pueden errar.

Y queda una obligación chica que vale mucho: **la Fase 17 escribe "una ráfaga
de uno", no "un tiro"**, con la fórmula de D-44 adentro y todos los
multiplicadores en 1. Cuesta nada hoy y es la diferencia entre que la 19B
enchufe cartas o rehaga el disparo entero. Esto es la tercera vez en dos días
que una decisión de la 19B se empuja hacia la 17; la razón es siempre la misma,
y es que el disparo es el único lugar del código donde los power-ups se tocan
todos.

---

## 8/11, segunda vuelta — El recorrido entero. Y dejar de dibujar una traza que se parece

Gus pidió tres cosas en un mensaje: que aclarara lo de las cartas, que sacara
el recorrido real con sus indicaciones reales, y que explicara para qué sirven
los proyectiles diagonales. La segunda terminó siendo el cambio más grande del
proyecto desde el 7 de noviembre.

### Lo que yo estaba haciendo mal con el recorrido, y no era un número

D-35 construía una **escalera que imitaba la proporción** del recorrido real:
el real se corre 437 m al oeste y 1.413 al norte, o sea 1 a 3,2, así que yo
dibujé siete cuadras que dieran 1 a 4 y las llamé "orientativas". Las calles
intermedias quedaban *"por asignar"* y había una tarea —la 18.10— para
inventarles nombre más adelante.

**Eso es dibujar una traza que se parece al recorrido, en vez de caminar el
recorrido.** Y lo peor es que la diferencia no se nota en el documento: las
dos cosas se escriben igual, con una tabla de esquinas y coordenadas.

Lo que hice esta vez fue preguntarle a OpenStreetMap. La API de Overpass, un
`curl` y cuatro consultas sobre el corredor: para cada calle con nombre de la
zona, los centros de sus tramos. La orientación sale sola de ver cómo se
reparten —si comparten longitud y cambian de latitud, la calle corre
norte-sur— y funciona porque un tramo de calle va de esquina a esquina. Es el
método más tonto que podía servir y sirvió a la primera.

**Y el recorrido de Gus, caminado sobre las calles que existen, da 4 cuadras
al oeste, 1 al este y 11 al norte: dieciséis. A 100 m la cuadra, 1.600 m.**

Gus había dicho *"el recorrido, que son 1.600 metros"* sin haber hecho la
cuenta. No ajusté nada para que diera: conté esquinas. **Las dos veces que
este proyecto discutió una distancia, el que tenía razón sin haber medido era
Gus** —primero con "el recorrido real no es tan largo", que destapó el error de
D-04, y ahora con los 1.600— y las dos veces yo había puesto un número
inventado con cara de medido. Vale anotarlo como patrón y no como anécdota.

### Dos cosas que estaban en los datos y nadie había visto

**Maza y Billinghurst son la misma calle.** Al norte de Av. Rivadavia, Maza
pasa a llamarse Billinghurst. Los tramos de las dos caen sobre la misma
longitud, Maza siempre al sur de la avenida y Billinghurst siempre al norte.
O sea que **"Maza 379" y "Billinghurst 250" —dos de las seis ubicaciones que
dio Gus— están sobre la misma línea**, y Sergio vive en la calle por la que el
jugador ya subió media misión.

**Av. Boedo y Mario Bravo, lo mismo**, con la misma avenida de por medio. Y
**Mario Bravo corre norte-sur**: yo la tenía anotada como este-oeste porque
"Mario Bravo 90" suena a numeración de calle transversal. Todos sus tramos
están sobre la longitud −58,4174.

**Y eso explica lo único del recorrido real que no cerraba.** Las dos últimas
patas tienen rumbo +6,4° y +25,6°: vuelven un poco **al este** después de que
las tres primeras venían al noroeste. Yo lo había tomado por ruido de la
medición y lo había tirado al hacer la escalera. No era ruido: el recorrido
sube por la línea Boedo/Mario Bravo y **al final cruza una cuadra al este**
para caer en la línea Maza/Billinghurst.

Y de regalo hace algo que yo no hubiera diseñado: el último tramo es un cruce
de una cuadra y después una cuadra para arriba, o sea **un doblez final**. El
jugador no ve la casa de Sergio hasta que gira. Es el mejor remate posible de
la misión y salió de los datos.

**La lección es la misma de la cuarta pasada pero al revés.** Aquella vez una
medición contradijo una intuición. Esta vez **un dato que ya estaba en la
mesa desde el primer día** —las cinco direcciones de Gus— contenía información
que yo había descartado por no encajar con el modelo que había armado. No hizo
falta medir nada nuevo: hizo falta dejar de redondear.

### Los siete controles salieron de una división y quedaron exactos

Gus pidió 7 controles repartidos parejo, cada 2 cuadras. Con 16 cuadras eso es
exacto: puertas en las cuadras 2, 4, 6, 8, 10, 12 y 14, y la casa de Sergio al
final de la 16. **Ocho tramos de 200 m, todos iguales.** No hubo que elegir
nada.

Que sean parejos no es prolijidad: la esclusa de la 19A declara su población
de zombis por tramo, y un tramo más largo que otro **es una dificultad
distinta sin que nadie la haya decidido**. Eso quedó escrito como prueba.

Las cuatro ubicaciones de Gus que no caen en una puerta —Maza 379, Av. Boedo
120, Mario Bravo 90— caen en medio de un tramo y ahí son **un cartel**. Es lo
correcto: lo que Gus dio es el recorrido, y los controles los reparte la
cuadrícula, que es lo que él mismo dijo cuando escribió *"distribuilo como
quieras"*.

### Lo que esto cuesta, dicho antes y no después

El mapa pasa de 7 cuadras a 16. Proyectado desde lo medido: **~12.700
entidades y ~1.100 llamadas de dibujo** contra un presupuesto de 150.

Con eso, la construcción por tramos (D-42) **deja de ser una tarea y pasa a
ser un cimiento**: no es que el juego ande lento con 16 cuadras vivas, es que
no abre. La 18.12 sube a ser la primera de la Fase 18.

Y hay un número que cambió y era fácil no ver: **la ventana pasa de tres
cuadras a cuatro.** Con tramos de dos cuadras, el jugador tiene dos cuadras
por delante *dentro de su propio tramo*; una ventana de tres lo dejaría
mirando cómo se construye la segunda mitad del tramo que ya está jugando. Es
un 33 % más que hoy, no el doble, y es la diferencia entre que esto funcione y
que el jugador vea aparecer su propia cuadra.

Lo que no cambia es la mitad buena: la reserva de zombis son 18 entidades y no
crece con el mapa, el generador ya exige tramos alineados a un eje y los 16 lo
están, y las ochavas de la 12R.3 están hechas para 90°. **El doble de ciudad
no es el doble de trabajo: es el mismo trabajo repetido ocho veces más**, que
es lo que hace un generador.

### Las cartas: Gus frenó algo, y tenía razón en frenarlo aunque la cuenta estuviera bien

Gus dijo que el concepto de las tres cartas no estaba claro: *"de esas 3
cartas vos podés seleccionar solo una, no es que elegís las 3"*.

Las cuentas de D-45 ya suponían una carta por control —en el control 7 hay 6
tomadas, no 18— así que los techos siguen valiendo. **Pero tenía razón en
frenar**, porque lo que yo no había escrito en ninguna parte es *para qué
sirve que sean tres*, y eso no es interfaz: es el único momento del juego en
que el jugador decide algo que no es dónde pararse.

> *"El personaje al final va a ser en base a los power-ups que vos elegiste.
> Por ahí elegiste todo lo que sea defensa; por ahí elegiste que ataque para
> todos lados; por ahí el camino por vampirismo. Cada partida, ninguna va a
> ser igual a la otra."*

Con 7 controles y 15 cartas, el jugador ve 21 cartas y se lleva 7: **6.435
personajes distintos**.

**Y eso impone una regla que no estaba, y es una tarea.** Para que haya
decisión, las tres cartas **no pueden salir del mismo eje**. Si salen tres de
daño, no hay elección: hay una buena y dos peores, y el jugador aprieta la de
arriba. El ejemplo que dio Gus —*"si te queda poca vida vas a tener que
sacrificar más ataque por una carta de curación"*— sólo puede pasar si en esa
mano hay una de ataque **y** hay una de curación. Así que el sorteo saca tres
cartas de tres ejes distintos: conteo, daño, ritmo, aguante, caos. La 19B.9
dejó de ser "pesar el sorteo" y pasó a tener forma.

### Y un problema que apareció al juntar tres decisiones viejas

El daño es permanente (D-31), el recorrido pasa a 1.600 m (D-46) y las cartas
no se repiten. Las tres juntas dan algo que nadie decidió:

> En una partida de 16 cuadras, Gus tiene **exactamente una** oportunidad de
> recuperar vida, y sólo si "Sanar" aparece en una de las siete manos y la
> elige por encima de las otras dos.

Las tres decisiones tenían sentido solas. **El problema no está en ninguna de
las tres: está en que se tomaron en días distintos y nadie las puso en la
misma frase.** Es el tercer caso del mismo tipo en dos días —el aviso que
viajaba colgado de otro, las poses que nadie pedía— y los tres se encontraron
igual: mirando qué más toca lo que acabo de cambiar, en vez de mirar sólo lo
que cambié.

Mi voto es que "Sanar" sea la única carta exenta de no repetir: no agrega
proyectiles, así que no toca el techo de 8 de D-45. Queda como 19B.14, para
decidir jugando.

### Lo chico: dos cosas que Gus cerró de paso

**"HP Boost" pasa a llamarse "Aumentar HP"**, y tiene razón en que no es
cosmético: el problema era que se confundía con "Sanar", y "Boost" no dice qué
sube.

**Y los proyectiles diagonales quedaron explicados**, confirmando la
separación que la 17.3 ter ya proponía: el tiro principal va al más cercano y
no falla, los dos diagonales salen a 45° y *pueden* pegarle a otro zombi por
casualidad. Lo que yo había anotado como un defecto —*"contra un solo zombi no
hacen nada"*— deja de serlo cuando la carta se lee como **daño de regalo
contra un grupo**. Lo que sí queda en pie es que hay que decirlo en la carta:
*"Proyectiles diagonales +1"* no alcanza para que alguien entienda eso antes
de gastarle un control.

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
| 12R | Inclinación y distancia de cámara (D-23, corrige D-02) | Midiendo las dos cosas a la vez: alto de Gus en píxeles y metros de calle por delante, que no pueden bajar de 16 |
| 12R | Si Gus y los zombis llegan a ser `.glb` riggeado (D-22) | Encontrando un modelo CC0 compatible, o consiguiendo el archivo |
| 12R | Cómo se despega a Gus del asfalto yendo de negro (D-24) | Mirándolo en el celular con la cámara nueva, y de ahí si el anillo ámbar se queda o se va |
| 17 | Qué cuenta como "quieto", y con cuánta demora (D-28) | Probándolo en el teléfono: los 0,18 s de frenado por inercia no deberían contar |
| 17 | Si espera a estar encarado antes del primer tiro | Mirándolo: si el primer tiro de cada blanco sale torcido, espera |
| 17 | La cadencia de la pistola | Jugando. Hoy son 1,6 s por zombi |
| 18 | Qué hay en Billinghurst 250 (D-26) | Decidiendo qué es el refugio, ahora que la comisaría inventada de D-04 no va |
| 18 | Cómo se marca la ruta en el piso (D-34) | Probando la franja pintada contra las flechas, desde la cámara a 48° |
| 18 | Si el mapa de 650 m necesita carga por tramos | Midiendo las llamadas de dibujo del peor caso |
| 19A | Cuántos zombis por tramo, y cuánto dura una cuadra (D-37) | Jugando en el teléfono. Es la perilla principal del juego nuevo |
| 19A | Cómo se ve el cartel de "no podés pasar" (D-37) | Que se entienda sin leer el texto dos veces |
| 19A | Cómo salen despedidos los dos autos al explotar (D-37) | Con la explosión rescatada de la bazooka y los efectos del banco |
| 19B | El pool definitivo de power-ups y su rareza (D-32) | Jugando las seis mejoras seguidas, de un control al siguiente |
| 20 | Si el Gus nuevo se reconoce como el de hoy (D-39) | Puestos uno al lado del otro. Si no se parece, no entra |
| 18 | Cuántas cuadras tiene que haber vivas a la vez (D-42) | Midiendo con `tools/medir-memoria.mjs`. La ventana de tres es la hipótesis: la anterior, la actual y la siguiente |
| 18 | Cómo se reparte en varios frames el armado de una cuadra (D-42) | Que no se note un tirón al abrirse la puerta, que es el momento más visible de la partida |
| 19A | Si sin retirada una cuadra se vuelve injusta (D-37) | Jugando. Si pasa, se toca la cantidad de zombis, no la puerta |
| 20 | Cómo es la puerta de contención (D-37, D-43) | Modelándola: cruza 16 m, se desliza, y tiene que leerse como militar y no como portón de garaje |
| 20 | Universal Animation Library o KayKit para las animaciones | Poniendo las dos en pantalla al lado de una puerta de 2,10 m y un auto |
| 20 | Cuál es el revólver o la pistola de Gus (D-29) | Renderizando los candidatos del Ultimate Gun Pack, y elige Gus |

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
