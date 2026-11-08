# Documento 03 — Plan de trabajo

**Proyecto:** Explorar BA — supervivencia zombi en Buenos Aires para navegador móvil
**Actualizado:** 7 de noviembre de 2026

> 📖 **El porqué de cada cosa está en [`04_bitacora.md`](04_bitacora.md).**
> Este documento es sólo el plan: qué está hecho, qué falta y qué sigue.
> Si algo necesita una explicación larga, va a la bitácora, no acá.

> ⚠️ **El 7 de noviembre el juego cambió de forma.** Se van los ítems, la
> bazooka, el cuchillo, la munición, caminar y **todos** los botones de
> acción; el combate pasa a ser automático; el recorrido pasa a ser el real
> de Buenos Aires en cuadrícula; **cada control es una esclusa del ejército que
> no abre hasta que no quede un zombi vivo en el tramo, y que se cierra a tus
> espaldas**; la progresión se mueve a
> cartas en los controles; y la meta es la casa de Sergio, el amigo al que
> Gus va a buscar.
> Está todo en [**el cambio del 7 de noviembre**](#-el-cambio-del-7-de-noviembre),
> y lo ejecutan las **fases 16 a 20**. **La 12R queda en pausa** hasta que
> las reglas nuevas estén en pie: no tiene sentido modelar la mano que
> sostiene un cuchillo que se está borrando.

---

## ▶️ La tarea que sigue

### **16.1 — Sacar los ítems** · primera de la poda

**Por qué va primera.** Todo lo que viene después se hace más fácil con el
juego más chico. Los ítems atraviesan nueve archivos y cuatro archivos de
pruebas; mientras estén, cada cambio de combate hay que pensarlo dos veces.

**Qué se saca, y de dónde.** Munición y botiquines desaparecen del juego
entero: de la vista, de la lógica, del balance, del mapa y del HUD.

| Archivo | Qué pasa |
|---|---|
| `src/items/itemLogic.js` | muere |
| `src/items/itemView.js` | muere |
| `src/items/inventario.js` | muere |
| `src/config/balance.js` | se va `ITEMS` y se va `CHECKPOINT_DROP` |
| `src/config/mission001.js` | se van las zonas `municion` y `curacion` |
| `src/main.js` | se van `BolsaDeObjetos`, `VistaObjetos`, `Inventario`, `UsoDeObjeto`, `recogerObjetos`, `soltarObjetosDelMapa`, `soltarEnControl`, `intentarCurarse`, `actualizarHudObjetos` |
| `index.html` | se van `btn-heal`, `heal-count`, `fila-uso`, `uso-fill` |
| `src/styles/hud.css` | se va el CSS de esos cuatro |
| `src/ui/hud.js` | se van las referencias y los métodos que los tocan |
| pruebas | mueren `inventario.test.js`, `objetos.test.js`, `objetos.spec.js`, `curacion.spec.js` |

**Cuidado con esto:** `CHECKPOINT_DROP` es lo que hoy hace que llegar a un
control sirva para algo. Si se saca y no se pone nada, los controles quedan
siendo sólo un punto de guardado hasta que llegue la **Fase 19A**, que los
convierte en esclusas. Es aceptable y es temporal, pero hay que saberlo
mientras se prueba: entre la 16 y la 19A el juego va a ser más pobre que hoy,
y va a parecer que el cambio salió mal cuando lo que pasa es que falta la
mitad.

**Cómo se sabe que está lista:** el juego arranca, se juega de punta a punta,
la consola no tiene un solo error, y `npm test` / `npm run test:e2e` están en
verde con las cuatro pruebas de arriba borradas y ninguna otra rota.

---

## 📊 Dónde estamos

| | Fase | Estado |
|---|---|---|
| ✅ | 0 a 9 — El juego | **Terminadas.** Se juega de principio a fin |
| ❌ | 12 — Arte original | **Descartada.** El arte se rehace desde cero |
| ⏸️ | 12R — La capa visual nueva | **8 de 17.** **En pausa** hasta cerrar la 17. Y se le caen 6 tareas, que se las lleva la 20 |
| 🔄 | **16 — La poda** | ⬅️ **lo que estamos haciendo** |
| ⬜ | 17 — Combate automático | Depende de la 16 |
| ⬜ | 18 — El recorrido real | Depende de la 16 |
| ⬜ | 19A — **La esclusa** | **El corazón del juego nuevo** (D-37). Va con la 18 |
| ⏸️ | 19B — Las cartas de power-up | **Espera la lista de mejoras de Gus** |
| ⬜ | 20 — Los assets del banco | Depende de la 16; absorbe 6 tareas de la 12R |
| ⬜ | 10 — Interfaz completa | Pendiente |
| ⬜ | 11 — Audio | Pendiente |
| ⬜ | 13 — Optimización | Pendiente |
| ⬜ | 14 — Publicación | Pendiente |
| ⏸️ | 15 — Ampliación | No se toca hasta que la 14 esté cerrada |

**El orden, y por qué es ése.** La 16 primero porque achica el juego y todo
lo demás se vuelve más barato. La 17 después, porque las reglas nuevas de
combate son el corazón del cambio y hay que poder jugarlas antes de construir
mapa para ellas. La 18 y la 20 pueden ir en paralelo si hiciera falta: la 18
usa los props provisionales que ya existen y la 20 los reemplaza después. La
19A va con la 18, porque un control que marca la llegada es parte del
recorrido; la 19B espera la lista de power-ups de Gus. La 12R se retoma
recién cuando el juego nuevo se pueda jugar.

**Lo que hay hoy:** Gus camina tres cuadras de Boedo, los zombis lo detectan
por vista y por ruido y lo persiguen esquivando obstáculos, pelea con cuchillo,
pistola y bazooka, los tiros se escuchan y atraen zombis, levanta munición y
botiquines, se cura quedándose quieto, toma los controles en orden, llega a la
comisaría, gana o pierde, y el récord sobrevive a cerrar la pestaña.

**Lo que no hay:** arte que valga, audio, menús y ajustes.

---

## 🔥 El cambio del 7 de noviembre

### En una frase

El juego deja de ser *un shooter con inventario y botones que corre hasta la
meta* y pasa a ser **limpiar siete cuadras, una por una**: en cada una hay una
puerta que no abre hasta que no quede un zombi vivo, y para matar hay que
frenar, porque moverse y disparar no se pueden a la vez. La única decisión del
jugador es *dónde pararse y cuánto tiempo*. Y la razón para hacerlo es ir a
buscar a Sergio.

### Las dieciocho decisiones nuevas

Numeradas **D-26 a D-43**, porque D-01 a D-21 son del documento 02 y D-22 a
D-25 son de la 12R.

#### 🔴 D-26 — El recorrido es el real, comprimido a siete cuadras

**Qué dice.** Las seis ubicaciones que pidió Gus se conservan, con sus
direcciones y su orden. Lo que **no** se conserva es la geometría: el
recorrido se construye como una cuadrícula de giros de 90° (**D-35**), con
**700 m caminados** en lugar de los 1.623,9 m reales. Los anchos de calle, de
vereda y de cordón no se comprimen, porque son lo que hace que un cuerpo de
1,80 m quepa en la escena.

**Por qué corrige D-04.** D-04 comprimió el recorrido a 350 m con el
argumento de que el real medía *"varios kilómetros, atravesando varios
barrios"*. **Eso estaba mal medido.** El recorrido real mide 1.623,9 m en
cinco tramos de entre 260 y 357 m: ni varios kilómetros ni varios barrios.
El motivo del descarte no existía. Y D-04 además reemplazaba el destino por
una comisaría inventada sobre Carlos Calvo; ahora el destino vuelve a ser
Billinghurst 250.

**La medición, que es el dato de referencia.** Ejes del juego: X = este/oeste,
Z = norte/sur (−Z es al norte), 1 unidad = 1 metro.

| | Dirección | Latitud | Longitud | Tramo | Rumbo |
|---|---|---|---|---|---|
| Inicio | Av. Independencia 3250 | −34,620511 | −58,411406 | — | — |
| | Agrelo 3400 | −34,618206 | −58,413928 | 344,8 m | −42,1° |
| | Maza 379 | −34,615399 | −58,415827 | 356,8 m | −29,2° |
| | Av. Boedo 120 | −34,612672 | −58,417772 | 351,2 m | −30,5° |
| | Mario Bravo 90 | −34,609881 | −58,417396 | 311,5 m | +6,4° |
| **Fin** | **Billinghurst 250** | −34,607771 | −58,416173 | 259,6 m | +25,6° |
| | | | **Total** | **1.623,9 m** | |

Sale de la proyección plana local sobre el punto de inicio (1° de latitud =
110.933,6 m; 1° de longitud = 91.707,7 m a esa latitud). **El cálculo está en
`tools/recorrido-real.mjs`, no escrito a mano**, y lo fija
`tests/trazado.test.js`: si alguien toca una coordenada, avisa.

**Esto NO es lo que se construye.** Lo que se construye es el trazado
ortogonal de **D-35**, que conserva el orden de las seis direcciones, la
proporción del desplazamiento y el largo caminado, pero corre sobre una
cuadrícula.

**Sobre OpenStreetMap.** La NOTA-02 del documento 02 decía que la escala real
se trae de OSM y se generan las manzanas por código. Con el trazado ortogonal
elegido, OSM entra como **guía de forma, no como fuente de geometría**: sirve
para decidir qué calle corre norte-sur y qué calle corre este-oeste, y para
ponerle nombre y altura a los dos controles nuevos (tarea 18.10). **La traza
a escala 1:1 generada desde OSM queda para la Fase 15**, cuando haya varias
misiones y deje de caber en una tabla. Si se usa, exige atribución (ODbL).

#### 🔴 D-35 — Todos los giros son de 90°, y las manzanas son cuadradas

**Qué dice.** El recorrido se construye como una **escalera de cuadras de
100 m sobre una cuadrícula**. Cada tramo corre sobre un eje y cada giro es de
90 grados, o derecho cruzando una avenida. Nunca en diagonal. Las manzanas
son cuadradas.

**El trazado, entonces.** Siete tramos de una cuadra, con un control en cada
esquina. Son **700 m caminados, 117 segundos a 6 m/s**:

| # | Punto | Cartel | x | z | Tramo | Giro |
|---|---|---|---|---|---|---|
| 0 | Inicio | Av. Independencia 3250 | 0 | 0 | — | — |
| 1 | Control 1 | *por asignar* | 0 | −100 | 100 m | derecho |
| 2 | Control 2 | **Agrelo 3400** | −100 | −100 | 100 m | 90° izq |
| 3 | Control 3 | *por asignar* | −100 | −200 | 100 m | 90° der |
| 4 | Control 4 | **Maza 379** | −200 | −200 | 100 m | 90° izq |
| 5 | Control 5 | **Av. Boedo 120** | −200 | −300 | 100 m | 90° der |
| 6 | Control 6 | **Mario Bravo 90** | −200 | −400 | 100 m | derecho |
| 7 | **Fin** | **Billinghurst 250** | −100 | −400 | 100 m | 90° der |

**Por qué esta forma y no otra.** El recorrido real se desplaza 437 m al
oeste y 1.413 m al norte: la proporción es **1 a 3,2**, o sea "mucho más
norte que oeste". Esta escalera se desplaza 100 al oeste y 400 al norte,
**1 a 4**: conserva el carácter —se va al norte bordeando hacia el oeste— con
siete cuadras en lugar de dieciocho. Los dos tramos "derecho" son el cruce de
una avenida, que es lo que se hace con una avenida: se cruza, no se dobla en
ella.

**Lo que esta decisión regala, y es mucho.** D-26 me había dejado dos tareas
que eran las más técnicas de todo el bloque, y las dos **se cancelan**:

| Tarea | Era | Ahora |
|---|---|---|
| 18.1 — abrir el generador a ángulos arbitrarios | La más técnica del bloque | ❌ **No hace falta.** El generador ya exige tramos alineados a un eje, y ahora lo están todos |
| 18.2 — recalcular las ochavas para ángulos raros | Rehacer parte de la 12R.3 | ❌ **No hace falta.** Las cuatro ochavas de la 12R.3 están hechas para 90°, que es exactamente lo que hay |

O sea que pedir giros cuadrados no simplificó el aspecto: **borró las dos
tareas más riesgosas de la fase** y dejó intacta una tarea de la 12R que ya
estaba terminada y medida.

**Los dos controles nuevos.** Gus pidió pasar de 4 controles a 6, con la
distancia total mantenida y los tramos parejos. Los cuatro originales
—Agrelo, Maza, Boedo, Mario Bravo— se conservan en su orden; los dos nuevos
caen en los tramos 1 y 3. **Les falta dirección**, y no la invento: el
documento 02 ya advierte que si el cartel no coincide con el barrio, cualquier
porteño lo nota. Lo cierra la tarea 18.10, con el mapa a la vista o con el
dato de Gus.

#### 🟡 D-36 — El tiro no falla nunca, salvo que haya algo en el medio

**Qué dice.** El disparo automático **siempre pega** en el blanco. Lo único
que lo detiene es una barrera física en la línea de tiro: un árbol, un auto,
un contenedor, una pared. No hay dispersión, no hay fallo por azar.

**Qué cambia en el código.** `WEAPONS.pistol.spreadDegrees` pasa de 2,5 a **0**,
y el apuntado asistido (`aimAssist`) desaparece: existía para perdonarle el
temblor del pulgar a un jugador que apuntaba a mano, y ya no hay nadie
apuntando a mano. El rayo de `ballistics.js` se queda, pero sólo para
preguntar **qué hay en el camino**, que es la única pregunta que queda.

**Por qué está bien.** Con dispersión, el jugador que se paró en el lugar
correcto igual podía perder por azar, y eso rompe lo único que este juego le
pide: elegir dónde pararse. Si el tiro falla, tiene que ser porque hay un
auto en el medio — y eso el jugador lo ve y lo puede resolver moviéndose.
**La cobertura vale para los dos lados** (tarea 17.3): si un árbol te tapa al
zombi, el mismo árbol te tapa a vos.

#### 🔴 D-37 — El control es una esclusa de contención, y se abre matando a todos los zombis del tramo

**Esta es la decisión más grande de todo el cambio.** Las otras ajustan cómo
se juega; ésta define **qué es el juego**.

> 📌 **Esta decisión se escribió dos veces el mismo día.** La primera versión
> era una barricada de autos que explotaba. La reemplaza una **puerta
> corrediza** que además **se cierra atrás**. El porqué del cambio está más
> abajo, en *"por qué la puerta le gana a la barricada"*, y no es estético:
> convierte una adivinanza en un evento.

**Qué dice.** El control es una **barrera de contención del ejército**: una
puerta corrediza que cruza los 16 m de calle —calzada y las dos veredas— y
que forma parte de un operativo que está **sellando la ciudad cuadra por
cuadra** para frenar la infección. Al llegar:

1. Si **quedan zombis vivos** en el tramo, la puerta está cerrada y no se
   pasa. Aparece un cartel de prohibido y un texto: *no podés pasar hasta que
   mates a todos los zombis*.
2. El jugador vuelve, los busca y los mata.
3. Cuando **no queda ninguno vivo en el tramo**, la puerta **se desliza y
   abre**.
4. Se cruza, y **a los 20 m la puerta se cierra sola a tus espaldas**. A esa
   cuadra no se vuelve nunca más.
5. La cuenta arranca de cero: el tramo 2 son los zombis que hay entre el
   control 1 y el control 2.

**Por qué 20 m, y no al instante.** Es un número que ya hacía falta por otro
motivo, así que sale gratis. La cámara se sienta **7 m por detrás de Gus**, y
hasta **14,4 m** cuando el jugador la aleja al máximo. Recién pasados esos
14,4 m la cuadra anterior queda fuera de cuadro y se puede liberar sin que se
vea el vacío (D-42). Veinte da margen. Y de paso regala unos segundos para
volver si entraste mal parado, que es la única retirada que el juego ofrece.

**Por qué es el ejército y no una puerta cualquiera.** Una puerta motorizada
en el medio de una calle de Boedo necesita una explicación o se lee como una
pieza del juego y no del mundo. La contención la da entera y de una sola vez:
explica por qué hay una barrera, por qué sólo abre con la cuadra limpia —es
el protocolo— y por qué se cierra atrás —para que no vuelva a entrar—. Y
agrega historia gratis: **Gus cruza una ciudad que lo está encerrando mientras
busca a Sergio** (D-41, D-43).

**Por qué la puerta le gana a la barricada que explotaba.**

| | Barricada que explota | Puerta que se cierra |
|---|---|---|
| Cuándo se libera la cuadra de atrás | **Hay que adivinarlo** con una distancia. Una vez que explotó, el paso queda abierto y el jugador *podría* volver | **Es un evento**: la puerta se cerró. Determinista y comprobable con una prueba |
| El vacío de la cuadra liberada | El hueco de la explosión **deja ver** lo que ya no existe | **La puerta tapa el agujero.** Resuelve sola la trampa que había que resolver a mano |
| Costo de dibujo | Dos autos, escombros y un efecto | **Una malla y una animación de posición** |
| Credibilidad | Muy alta en una invasión | Alta, con la contención que la explica |

El punto dos es el que decide. En la lista de trampas de D-42, la segunda era
*"no se libera en el control, se libera dos cuadras atrás, porque la cámara
ve para atrás y liberar lo que todavía se ve deja un agujero en pantalla"*.
**La puerta cerrada ES la tapa de ese agujero.** La mecánica se come el
problema técnico en vez de agregarle uno.

**En qué convierte al juego.** Dejaba de ser *"llegá a Billinghurst"* y pasa a
ser **"limpiá siete cuadras, una por una"**. El recorrido deja de ser una
carrera y se vuelve una serie de siete peleas con una puerta al final de cada
una. Y eso encaja con el combate automático mejor que lo que había: para
matar hay que **frenar**, y frenar es la única decisión del jugador. Un
recorrido que se podía hacer corriendo sin disparar nunca dejaba al combate
de adorno; esta regla lo hace obligatorio.

**Lo que cuesta, y hay que decirlo antes de empezar:**

| | |
|---|---|
| **La misión se alarga mucho.** | Hoy hay ~24 zombis en todo el mapa, unos 3 por tramo. Con la esclusa, la población por tramo pasa a ser la perilla que decide cuánto dura cada cuadra, y "más frenético" quiere más zombis. De 2 minutos puede irse a 10 o 15 |
| **El último zombi escondido.** | Buscar al que falta es la frustración clásica de este tipo de puerta. **No se puede dejar sin resolver**: hace falta un contador en pantalla y, cuando la puerta te frena, que la brújula apunte al zombi vivo más cercano en vez de al control |
| **Un zombi inalcanzable traba la partida para siempre.** | Con las bocacalles tapadas (D-34), un zombi que aparezca en un hueco cerrado no se puede matar y la puerta no abre nunca. Los puestos de aparición tienen que estar sobre la ruta caminable, y lo tiene que verificar una prueba, no el ojo |

**Y hay un hallazgo del código que convierte esto en condición previa.**
Ver la Fase 19A: hoy un zombi del que te alejás **desaparece para siempre sin
morir**. Mientras eso siga así, la puerta no puede abrir nunca.

**Y una cosa más, que cuesta dos líneas y conviene que estén escritas:** al
morir se reaparece **del lado de adentro** de la última puerta cruzada, al
principio del tramo en curso. No del lado de afuera, porque esa cuadra ya no
existe en memoria.

**Corrección: la explosión vuelve a morir.** Hace unas horas escribí que la
barricada rescataba `src/combat/explosion.js` de la poda, porque los autos
explotaban. **Con la puerta no explota nada.** Así que la lista de rescate de
la Fase 16.3 vuelve a tener un solo elemento, `objetivoAutomatico()`, y
`ExplosionFXFree` vuelve a quedar sin uso.

Es la segunda vez en el día que cambio de opinión sobre el mismo archivo, y
queda escrito a propósito: **la dirección correcta es la que borra más**. La
puerta hace menos cosas que la barricada, y por eso es mejor.

#### 🟡 D-38 — La brújula es permanente, y es protagonista

**Qué dice.** La flecha que indica a dónde ir está **siempre** en pantalla,
con la distancia que falta, y es **más grande y más llamativa** que la de hoy.
Y lleva el nombre de la calle por la que se va.

**Lo que ya está y lo que falta.** La brújula existe: una pastilla con flecha
que rota y los metros al objetivo, y ya se muestra siempre que haya objetivo.
Lo que falta es tamaño y presencia —hoy el glifo mide 15 px, que es menos que
el texto de al lado— y el nombre de la calle.

**Y gana un trabajo nuevo por D-37:** cuando la puerta frena al jugador, la
flecha deja de apuntar al control y **apunta al zombi vivo más cercano**. Sin
eso, "matá a todos" es una búsqueda a ciegas.

#### 🟡 D-39 — La escala y el acabado de Gus son la referencia de todo

**Qué dice.** El formato de Gus que hay hoy está bien y es el patrón. Todo lo
que entre de los paquetes nuevos se ajusta **a su escala y a su acabado**, no
al revés:

| | |
|---|---|
| Zombis normales | La misma estatura que Gus, más o menos |
| Jefes | Algo más altos, y nada más |
| Todos | El mismo tipo de textura y el mismo acabado mate |

**Y la cámara se queda como está.** La 12R.1 la dejó en 48°, 15 m y la mira
3 m adelante, y ahí se queda: se mueve lo que haga falta para dejar ver, y
nada más. **En particular, cuando Gus apunta solo a un zombi, la cámara NO
lo sigue.** Era lo primero que iba a querer hacer y queda prohibido: la
cámara acompaña al jugador, no al blanco.

#### 🔵 D-40 — Los nombres de calle son decorado, no información

**Qué dice.** Importan el punto de partida, los controles y el final. Los
nombres intermedios, no. Alcanza con que la calle por la que se va aparezca
**una vez** —en un cartel, en el piso o en la brújula— y nada más. Si el dato
sale del mapa, se usa; si no, no se busca.

**Lo que esto desbloquea.** La tarea 18.10 estaba esperando que Gus o el mapa
dieran la dirección de los dos controles nuevos. **Ya no bloquea nada**: los
controles nuevos pueden no tener dirección, y la calle se nombra donde sea
cómodo.

#### 🟡 D-41 — Billinghurst 250 es la casa de Sergio

**Qué dice.** La meta no es un refugio genérico: es **la casa de Sergio, el
amigo de Gus**. La misión 001 es ir a buscarlo en medio de la invasión.

**Y define de qué va el juego, que hasta ahora no estaba escrito:** la gracia
es **ir juntando a los amigos** para salvarlos. Al llegar a casa de Sergio se
tienen dos personajes y se puede elegir con cuál seguir; la misión siguiente
va a buscar al próximo amigo.

**Qué entra ahora y qué no.** Ahora: que la meta sea la casa de Sergio, con
una fachada que se lea como una casa y no como una comisaría. **La elección
de personaje y las misiones siguientes van a la Fase 15**, y quedan anotadas
ahí para que no se pierdan.

**Esto cierra la decisión abierta 18.11**, que era qué hay en Billinghurst
250. Ya no hay comisaría inventada, ni hace falta inventar nada.

#### 🔴 D-42 — El mundo se construye por tramos, y la esclusa es lo que lo hace fácil

**Gus propuso** construir sólo el tramo en el que está el jugador y liberar el
anterior al pasar el control, en vez de tener el mapa entero vivo todo el
tiempo. **Tiene razón en el principio, y es más importante de lo que parece —
pero el blanco al que lo apuntó es el barato.** Lo medí con
`tools/medir-memoria.mjs`, escrito para esto, sobre el mapa de hoy (3 cuadras,
~350 m):

| Rama | Entidades | Mallas | % de las mallas |
|---|---|---|---|
| **`World` — la ciudad** | **2.026** | **1.954** | **86 %** |
| `Zombi` ×18 | 486 | 234 | 10 % |
| `Gus` | 60 | 37 | 2 % |
| Efectos y objetos | 43 | 36 | 2 % |
| **Total** | **2.621** | **2.262** | |

Y el resto de la medición: **238 llamadas de dibujo** (53 de sombra), 167.924
triángulos, 133 materiales, 16,52 MB de texturas y 4,5 MB de vértices en
memoria de video, 98 MB de heap de JavaScript. Las 238 coinciden exactamente
con el número que el plan ya tenía anotado para el punto de aparición, que es
una buena señal de que la herramienta mide lo que dice medir.

**Por qué los zombis no son el problema.** Ya están hechos como Gus propone, y
mejor: el `SpawnManager` tiene una **reserva de 18 entidades** que se recicla,
y los 25 puntos de aparición del mapa **son sólo coordenadas** — tres números
cada uno, unos dos kilobytes en total. Y lo decisivo:

> `const necesarios = Math.min(this.puestos.length, PERF.maxActiveZombies + 6);`

**La reserva no crece con el mapa.** Con 3 cuadras son 18 entidades y con 7
cuadras son 18 entidades. Liberar los zombis de atrás no ahorra el 10 %:
ahorra **cero**, porque esas entidades se van a volver a usar adelante. Es el
trabajo ya hecho.

**Por qué la ciudad sí es el problema.** Es el 86 % de las mallas y es **lo
único que crece con los metros**. A unas 6,3 entidades por metro, los 700 m de
D-35 proyectan ~4.400 entidades, ~4.300 mallas y del orden de **480 llamadas
de dibujo**, contra un presupuesto de 150. Eso es la Fase 13 fallando antes de
empezar.

**Qué dice la decisión, entonces.** Se construye por tramos, pero el que se
construye y se libera es **el tramo entero de ciudad** —calzada, veredas,
fachadas, carteles, árboles, autos y sus cajas de colisión—, no los zombis.
Con una **ventana de tres cuadras** —la anterior, la actual y la siguiente—
viva a la vez:

> **Un mapa de 700 m costaría lo mismo que hoy cuesta el de 350**, porque en
> todo momento habría tres cuadras en memoria, que es lo que hay ahora. Y el
> presupuesto de 150 llamadas de dibujo de la Fase 13 pasa a ser alcanzable,
> porque hay que optimizar tres cuadras y no siete.

**Y acá está el regalo que hizo Gus sin darse cuenta.** Normalmente el
streaming es difícil porque el jugador puede volver: hay que cargar y
descargar en las dos direcciones, con histéresis para que no parpadee en el
borde. **Con la puerta de D-37 el recorrido es de ida.** Una vez que el
control se abrió, se cruzó y la puerta se cerró, a esa cuadra no se vuelve
nunca. Se carga sólo hacia adelante y se libera sólo hacia atrás, sin
histéresis y sin casos raros. **La mecánica que eligió por razones de juego
vuelve trivial la optimización.** Eso no se planifica, se aprovecha.

**Y con la puerta, además, el disparador deja de ser una heurística.** La
primera versión de D-37 —la barricada que explotaba— dejaba el paso abierto
para siempre, así que liberar la cuadra de atrás había que decidirlo midiendo
distancias y esperando que el jugador no volviera. Con la puerta hay un
evento: *se cerró*. Liberar pasa a ser una consecuencia, no una apuesta, y se
puede verificar con una prueba en vez de con el ojo.

> ⚠️ **Y esto hay que no romperlo después.** Si alguna vez se permite volver
> a una cuadra ya limpiada —por una misión, por un atajo, por lo que sea— se
> vuelve a pagar entero el costo que esta decisión ahorra. La ida sin vuelta
> no es una limitación del juego: es el cimiento de que el mapa entre en un
> teléfono.

**Las cuatro cosas que hay que cuidar, y ninguna es opcional:**

| | |
|---|---|
| **La colisión se libera con la geometría** | Si se destruye una fachada y su caja queda, el jugador choca contra una pared que no existe. Es el peor error posible porque no se ve |
| ~~No se libera en el control~~ ✅ **resuelta por D-37** | Era la trampa fea: la cámara ve para atrás, y liberar lo que todavía se ve deja un agujero. **La puerta cerrada es la tapa de ese agujero**, y el momento de liberar deja de ser una distancia adivinada para ser un evento: puerta cerrada y 20 m adentro |
| **No se construye en un solo frame** | Armar una cuadra de golpe congela el juego justo cuando se abre la puerta, que es el momento más visible de la partida. La cuadra siguiente se construye **mientras se juega la actual**, repartida en varios frames |
| **Destruir de verdad, no soltar la referencia** | Hay que destruir entidades, materiales y mallas, o la memoria sube con cada cuadra. Lo verifica la 13.11, que mide diez reinicios seguidos |

#### 🔵 D-43 — La ciudad se está sellando cuadra por cuadra

**Qué dice.** El operativo que explica las puertas de D-37: el ejército está
**cerrando la ciudad por cuadras** para contener la infección. Cada control es
una esclusa que sólo abre con el tramo limpio y se vuelve a cerrar detrás.

**Por qué es una decisión y no un adorno.** Convierte tres reglas arbitrarias
del juego en una sola idea del mundo:

| La regla | Antes era | Ahora es |
|---|---|---|
| No se pasa hasta matarlos a todos | Una puerta de videojuego | El protocolo de contención |
| No se puede volver atrás | Una limitación técnica | Lo que hace una esclusa |
| Las bocacalles están tapadas (D-34) | Autos puestos a propósito | La misma operación, en los costados |

**Lo mejor es lo que le hace a D-34.** Las bocacalles bloqueadas eran la parte
más arbitraria del diseño: autos cruzados por todos lados porque el juego
necesita que vayas derecho. Con la contención **dejan de ser un truco y pasan
a ser el mismo operativo visto de costado**, y encima explica por qué están
tan prolijamente puestos.

**Qué cambia en el arte, y es poco:** las puertas, y un vocabulario coherente
para los bloqueos — vallas del mismo tipo, pintura de la misma gama, algún
cartel de la operación. Eso es tarea de la 12R.9 y de la 18.7, que ya existen;
no agrega tareas, les da un criterio.

**Y qué NO entra ahora.** De dónde viene el ejército, si hay radio, si hay
sobrevivientes: nada. La contención se cuenta **con lo que se ve**, y nada
más. Contarla con texto es Fase 15, junto con el resto de la campaña de D-41.

#### 🔴 D-27 — El joystick a la derecha

**Qué dice.** El joystick de movimiento pasa a la **mitad derecha** de la
pantalla y la cámara a la izquierda. Es el espejo exacto de lo que hay.

**Por qué.** Sin botones de acción (D-28), la mitad derecha quedaba vacía, y
es la mitad que el pulgar dominante alcanza mejor. El movimiento es ahora la
única cosa que el jugador hace a propósito: va donde mejor se llega.

#### 🔴 D-28 — No hay botones de acción. El combate es automático al estar quieto

**Qué dice.** En pantalla quedan el joystick y el botón de pausa. Nada más.
Gus **dispara solo** al enemigo más cercano, y **sólo mientras está quieto**.
Al moverse deja de disparar.

**Las cinco reglas, tal como las pidió Gus:**

1. Quieto → busca el enemigo más cercano y le dispara.
2. Si lo mata y sigue quieto → busca el siguiente más cercano y sigue.
3. Si se mueve y vuelve a quedarse quieto → **vuelve a buscar**, y le va a
   disparar al que esté más cerca *ahora*, no al de antes.
4. Mientras se mueve no dispara: se mueve libre.
5. El cambio de "moviéndose" a "quieto" es **el único momento** en que se
   recalcula el blanco, además de cuando el blanco muere o se pierde.

**Lo que esto cambia de fondo.** El documento 01 ponía *"decisiones
rápidas"* como pilar, y las decisiones eran de botón: qué arma, cuándo
curarse, cuándo gastar la bazooka. Todas esas decisiones se borran. **La
decisión única pasa a ser espacial:** cuándo frenar, dónde, y cuánto
aguantar antes de volver a moverse. Es un juego distinto, más chico y más
limpio, y conviene saber que el pilar cambió.

#### 🟡 D-29 — Un arma, sin munición y sin recarga

Queda la pistola o revólver, una sola, siempre en la mano. Se van el
cuchillo, la bazooka, el cargador, la reserva, la recarga y el cambio de
arma. Lo que lo reemplaza como variedad son los power-ups de la Fase 19: el
tipo de disparo se **mejora**, no se **elige**.

#### 🟡 D-30 — Correr es la única velocidad

`walkSpeed` desaparece. La velocidad única es la de correr —6,0 m/s, a
revisar jugando— con el mismo movimiento y la misma animación. Se van el
botón, la tecla `Shift` y el estado `isRunning`.

**Ojo con la aceleración:** con `deceleration = 34` y 6 m/s, Gus tarda 0,18 s
en frenar del todo. Eso **no** es "estar quieto", y la Fase 17 va a tener que
poner un umbral: ver la tarea 17.2.

#### 🔴 D-31 — El daño es permanente y no se regenera

Ni Gus ni los zombis recuperan vida nunca. Un zombi al que se le dieron tres
tiros queda con 25 y sigue con 25 aunque Gus se vaya, mate a otros tres y
vuelva media cuadra después: le alcanza un tiro. Vale igual para Gus, salvo
que reciba curación, y la curación hoy no existe.

**Las estadísticas:**

| | Vida | Ataque | Cuentas |
|---|---|---|---|
| **Gus** | 120 | 25 | **4 tiros** matan un zombi normal (25 × 4 = 100) |
| **Zombi normal** | 100 | 10 | **12 golpes** matan a Gus (10 × 12 = 120) |
| Zombi agresivo | 120 | 20 | 5 tiros para matarlo; 6 golpes matan a Gus |

Las de Gus y las del zombi normal las fijó Gus y no se discuten. Las del
agresivo salen del pack CryptZombie y entran en la Fase 20.

#### 🟡 D-32 — La progresión vive en los checkpoints, no en el piso

**Qué dice.** Al llegar a un control, el juego se detiene y muestra **tres
cartas** de mejora. El jugador elige **una**, se aplica sola y se queda para
toda la partida. Las mejoras **se acumulan** y ninguna se pierde. Al morir se
pierden todas y se empieza de cero con las estadísticas estándar.

**Y se hace en dos tiempos, porque Gus todavía está armando las mejoras.**

| Cuándo | Qué hay |
|---|---|
| **Ahora** (Fase 19A) | El control **marca la llegada** y nada más: se guarda el progreso, se avisa en pantalla y se sigue. Es lo que pidió Gus explícitamente |
| **Cuando lleguen las mejoras** (Fase 19B) | Las tres cartas, la acumulación y el reinicio a cero |

La 19A se puede hacer ya y no bloquea nada. La 19B **espera la lista de
power-ups de Gus**: el sistema no se diseña bien sin saber qué tiene que
aplicar. El pool que figura más abajo es mi propuesta mientras tanto, para
que Gus tenga de dónde partir o qué contradecir.

**Qué reemplaza.** Esto deja sin efecto **D-20** (los objetos se levantan
caminándolos) y **D-21** (curarse lleva tiempo y hay que estar quieto): ya no
hay objetos ni curación. Las dos quedan registradas como cerradas y
superadas, no como equivocadas: eran correctas para el juego que había.

#### 🔴 D-33 — Low-poly coherente, y `_assets/` es fuente, no destino

**El estilo.** Low-poly coherente, con la paleta medida de la 12R.0. No se
mezcla fotorrealismo: todo lo que hay hecho y todo lo que trae el banco es
low-poly, y mezclar los dos se ve peor que cualquiera de los dos solo. Lo
"real" lo aporta la traza, los nombres de las calles, los carteles en español
y la silueta del barrio — no el renderizado.

**Descartado con motivo técnico, no de gusto:** la fotogrametría y el
Gaussian Splatting (SuperSplat, gsplat) que propone el documento 01. Un splat
es una nube de puntos **sin superficie**: no se puede colisionar contra él,
no se ilumina, no proyecta sombras y pesa cientos de megabytes. Un zombi lo
atravesaría caminando. Confirma lo que ya decía el documento 02 y cierra la
pregunta.

**La carpeta.** `_assets/` son 461 MB de packs descargados y está en
`.gitignore`. Es la **fuente**. Lo que se usa se copia a `public/modelos/`,
se anota en `documentacion/visual/ASSET_AUDIT.md` y recién entonces existe.
**Está prohibido que el código referencie `_assets/`**: no existe en el
repositorio ni en producción, y una ruta así rompe el juego publicado sin
romperlo en la máquina de desarrollo, que es la peor clase de error.

#### 🟡 D-34 — Ruta única: se van las rutas alternativas

Los dos pasajes —Pasaje Independencia y Pasaje Boedo— se borran. Todas las
bocacalles, veredas laterales y entradas que no sean la ruta marcada quedan
bloqueadas con autos cruzados, contenedores, vallas, escombros y bolsas,
**con colisión de verdad**. El jugador va por la ruta marcada o no va.

**Lo que se pierde:** la decisión "calle corta y peligrosa o pasaje largo y
seguro", que era el ejemplo más claro del pilar de decisiones rápidas del
documento 01. Se pierde a propósito. Lo que la reemplaza es la **cobertura**:
los autos y los obstáculos no van a estar sólo para cortar, van a estar para
poder esconderse detrás y buscar el ángulo, que es lo que pidió Gus.

### Qué se cae, en números

| Se borra | Dónde vive hoy |
|---|---|
| Ítems, inventario y curación | 3 archivos, ~510 líneas, 4 archivos de prueba |
| Munición, cargador y recarga | `balance.js`, `weaponController.js`, HUD, 2 pruebas |
| Bazooka: arma, botón, barra y cohete | `projectile.js`, `weaponController.js`, HUD, 2 pruebas |
| Cuchillo y cuerpo a cuerpo | `balance.js`, `weaponController.js`, `combatFx.js`, 2 pruebas |
| Caminar | `balance.js`, `playerController.js`, `pose.js`, `inputManager.js` |
| 7 botones de acción | `index.html`, `hud.css`, `hud.js`, `inputManager.js` |
| Rutas alternativas | `mission001.js`, `worldBuilder.js` |
| La explosión y su efecto | `explosion.js`, `combatFx.js`, pack `ExplosionFXFree` |

**Lo que se rescata antes de borrar, y son tres cosas, no una:**
**una sola cosa**: `objetivoAutomatico()`, el apuntado de la bazooka, que es
exactamente lo que necesita el combate automático. Vive dentro de
`src/combat/explosion.js`, que la 16.3 borra entero. El detalle —y por qué esa
lista cambió de tamaño dos veces en un día— está en la Fase 16.

---

## 🔄 FASE 16 — La poda

**Objetivo:** que no quede en el juego nada de lo que se va. No
"desactivado": borrado. Lo que queda apagado vuelve solo tres meses después.

- [ ] **16.1 Los ítems.** Munición y botiquines, de la vista y del sistema entero ⬅️ *la que sigue*
- [ ] **16.2 La munición de la pistola.** Sin cargador, sin reserva, sin recarga
- [ ] **16.3 El sistema de bomba.** El contador, la barra, el botón, el arma y el cohete. ⚠️ **Pero la explosión NO se borra** — ver abajo
- [ ] **16.4 El cuchillo.** Y con él el cambio de arma: queda un arma sola
- [ ] **16.5 Caminar.** Correr pasa a ser la única velocidad (D-30)
- [ ] **16.6 Interactuar.** Ya no hay nada con lo que interactuar
- [ ] **16.7 El joystick a la derecha** y la cámara a la izquierda (D-27)
- [ ] **16.8 Limpieza del HUD.** Borrar el `action-cluster` entero y su CSS. Lo que queda: vida, objetivo, brújula, pausa y joystick

### ⚠️ Lo que se rescata antes de borrar

**Una sola cosa**, y vive dentro de un archivo que la 16.3 borra entero:

| Qué | Vive en | Para qué |
|---|---|---|
| `objetivoAutomatico()` | `src/combat/explosion.js` | Es el apuntado de la bazooka, y es **exactamente** lo que necesita el combate automático (17.3). Se mueve a su propio archivo *antes* de borrar nada |

**Muere todo lo demás** de la bazooka: el arma, el botón, la barra de 30 s, el
cohete (`projectile.js`), el daño por área y **la explosión**.

> 📌 **Sobre la explosión cambié de opinión dos veces el mismo día**, y queda
> anotado porque el ida y vuelta enseña algo. Primero iba a morir. Después,
> cuando el control era una barricada de autos que explotaba, la rescaté.
> Ahora el control es una puerta corrediza (D-37) y **no explota nada**: la
> explosión vuelve a morir, y con ella el pack `ExplosionFXFree`.
>
> Lo que aprendí no es que me equivoqué dos veces: es que **cada vez que la
> mecánica se simplificó, la lista de rescate se achicó**. La puerta hace
> menos cosas que la barricada y por eso es mejor. Si la próxima vuelta
> agranda la lista, conviene desconfiar de la mecánica, no del plan.

**Y por qué el rescate importa igual.** `objetivoAutomatico()` no tenía por
qué vivir dentro de la bazooka: vive ahí porque la bazooka fue quien lo
necesitó primero. En un borrado grande, lo que se pierde no es el código que
uno recuerda — es el que quedó guardado en el lugar equivocado.

**Criterio de salida**

- [ ] No hay un solo botón de acción en pantalla
- [ ] No queda código muerto de nada de lo borrado: ni import, ni rama, ni CSS
- [ ] Ninguna constante huérfana en `balance.js`
- [ ] El joystick se alcanza con el pulgar derecho, probado en el teléfono
- [ ] **La explosión y `objetivoAutomatico()` siguen vivos, en su propio archivo y con pruebas**
- [ ] La consola no tiene un solo error
- [ ] Las pruebas que quedan están en verde, y las que murieron están borradas, no comentadas
- [ ] La misión se puede terminar

---

## ⬜ FASE 17 — Combate automático

**Objetivo:** que Gus pelee solo mientras está quieto, con las reglas de D-28
y los números de D-31. Es el corazón del cambio: si esto no se siente bien
jugándolo, no sirve nada de lo que viene después.

- [ ] **17.1 Las estadísticas nuevas.** Gus 120/25, zombi normal 100/10. Con una prueba que fije las cuentas: 4 tiros y 12 golpes, en números, no a ojo
- [ ] **17.2 Definir "quieto".** El umbral y la demora. Gus frena en 0,18 s por inercia: hay que decidir si eso cuenta. Propuesta a probar: quieto cuando el joystick está en cero por 0,15 s o más
- [ ] **17.3 Buscar el más cercano.** Con `objetivoAutomatico()` rescatado. **Con línea de vista** (D-36): lo único que impide el tiro es una barrera física, y vale para los dos lados
- [ ] **17.3 bis Sacar la dispersión** (D-36). `spreadDegrees` a 0 y el apuntado asistido afuera: el tiro no falla por azar
- [ ] **17.4 El blanco se mantiene.** No se recalcula cada frame. Sólo al entrar en quieto, cuando el blanco muere, o cuando sale del alcance o se pierde de vista
- [ ] **17.5 Girar y disparar.** El rumbo de Gus deja de depender del movimiento y pasa a depender del blanco. `rumboForzado` ya existe en `playerController`: se reusa
- [ ] **17.6 Al moverse, suelta.** Deja de disparar y suelta el blanco, sin arrastre
- [ ] **17.7 El daño es permanente** (D-31). Verificar que ningún zombi recupere vida al salir del radio de culling de 55 m ni al volver a su zona
- [ ] **17.8 La marca del blanco.** Sin botón, el jugador necesita ver a quién le está disparando. Lo mínimo que alcance. ⚠️ **Y la cámara no se mueve** (D-39): acompaña al jugador, no al blanco. Es lo primero que uno quiere hacer acá, y está prohibido
- [ ] **17.9 La cadencia.** Hoy 0,4 s: 1,6 s para matar un zombi. Probar en el teléfono y ajustar
- [ ] **17.10 La máquina de estados completa, con pruebas.** Moverse → quieto → blanco → muere → siguiente → moverse → quieto → otro blanco

**Decisiones que esta fase tiene que cerrar**

| Pregunta | Propuesta |
|---|---|
| ¿Dispara a través de otros zombis? | No: el primero del rayo se come la bala. Ya funciona así |
| ¿Dispara mientras gira hacia el blanco, o espera? | Espera a estar encarado. Si no, el primer tiro de cada blanco sale para cualquier lado |
| ¿Qué pasa si el más cercano está detrás de un auto? | No es blanco válido: busca al siguiente. Cerrado por D-36 |
| ¿Se puede frenar a propósito para disparar desde cobertura? | Sí, y es el juego. Es lo que reemplaza a las decisiones de botón |

**Lo de "quieto" lo decido yo, y así lo voy a hacer.** Gus lo dejó a mi
criterio, así que queda escrito antes de escribirlo en código, para poder
discutirlo mirando el resultado y no la intención:

> **Gus está quieto cuando el joystick está en cero.** No cuando la velocidad
> llega a cero. Los 0,18 s que tarda en frenar por inercia cuentan como
> quieto: el jugador ya soltó, ya decidió. Si esperáramos la velocidad, el
> primer tiro saldría dos décimas tarde y en un juego donde doce golpes te
> matan, dos décimas por parada se sienten como que el personaje duda.
>
> **Y hay un retardo de 0,15 s antes del primer tiro.** No para castigar:
> para que un roce del pulgar no dispare, y para que el jugador vea a Gus
> frenar y encarar antes de que salga la bala. Soltar y volver a tocar dentro
> de esos 0,15 s no cuenta como haber estado quieto.

Si jugándolo se siente lento, lo que baja es el retardo, no la regla.

**Criterio de salida**

- [ ] Se mata un zombi normal con exactamente 4 tiros, y un zombi mata a Gus con exactamente 12 golpes
- [ ] Un zombi herido sigue herido después de alejarse media cuadra y volver
- [ ] Al quedarse quieto, el blanco elegido es siempre el más cercano *en ese momento*
- [ ] Al matar un zombi estando quieto, pasa al siguiente sin que el jugador toque nada
- [ ] Moviéndose nunca dispara
- [ ] Nunca dispara a través de una pared ni de un auto
- [ ] Se entiende a quién le está disparando, mirando la pantalla del teléfono
- [ ] Se puede terminar la misión sin tocar nada más que el joystick

---

## ⬜ FASE 18 — El recorrido real

**Objetivo:** el trazado ortogonal de D-35, con la ruta marcada y todo lo
demás bloqueado. Usa los props provisionales que ya existen; la Fase 20 los
reemplaza por modelos.

> ✅ **Las dos tareas más técnicas de esta fase se cancelaron antes de
> empezar.** Eran abrir el generador a ángulos arbitrarios y recalcular las
> ochavas. Al pedir Gus giros de 90° (D-35), el generador ya sirve como está
> y las ochavas de la 12R.3 ya están hechas para 90°. **La fase pasó de 13
> tareas a 11, y de riesgosa a mecánica.**

- [x] ~~18.1 El generador, abierto a ángulos arbitrarios~~ — **cancelada por D-35**
- [x] ~~18.2 Las esquinas que no son esquinas~~ — **cancelada por D-35**
- [ ] **18.3 El trazado nuevo en `mission001.js`.** Las ocho esquinas de D-35, importadas de `tools/recorrido-real.mjs` para que no haya dos fuentes de verdad
- [ ] **18.4 Seis controles** en vez de dos, y la meta en Billinghurst 250
- [ ] **18.5 Los siete textos de objetivo**, en voseo, uno por tramo
- [ ] **18.6 Marcar la ruta.** Que se lea desde la cámara a 48°. Propuesta: una franja de pintura gastada sobre la calzada, más una flecha en cada uno de los cinco giros. Con la cuadrícula esto es más fácil: la flecha siempre apunta a 90°
- [ ] **18.7 Bloquear todo lo que no sea la ruta** (D-34). Cada bocacalle y cada vereda lateral, con autos cruzados, contenedores, vallas, escombros y bolsas. **Con colisión**, no decorado. Con la cuadrícula las bocacalles son contables: en siete cuadras hay un número fijo y se tapa cada una. **Y con D-43 dejan de ser arbitrarias**: son el mismo operativo de contención que puso las puertas, visto de costado. Mismo tipo de valla, misma gama de pintura
- [ ] **18.8 Borrar los pasajes** y las zonas de objetos de `mission001.js`
- [ ] **18.9 Las zonas de zombis, una por tramo.** Siete zonas, con dificultad creciente y el primero flojo: hay que dejar aprender a moverse. ⚠️ **Ahora cada zona declara su tramo**, porque la esclusa cuenta por tramo (19A.1), y la cantidad por zona es la perilla que decide cuánto dura cada cuadra (19A.11)
- [ ] **18.10 Los carteles.** Reusando la 12R.5. **Simplificada por D-40:** importan el inicio, los seis controles y la casa de Sergio. Los nombres intermedios aparecen una vez y nada más — en un cartel, en el piso o en la brújula. Los dos controles nuevos pueden quedarse sin dirección
- [ ] **18.11 La casa de Sergio** ✅ *decidido por D-41*. Billinghurst 250 es la casa del amigo al que Gus va a buscar. Hay que modelar una **fachada que se lea como una casa**, no como una comisaría, y que se distinga de la hilera a la que pertenece
- [ ] **18.12 La construcción por tramos** (D-42). **Ya no es "es probable que haga falta": está medido y hace falta.** La ciudad es el 86 % de las mallas y lo único que crece con los metros; los 700 m proyectan ~4.400 entidades y ~480 llamadas de dibujo contra un presupuesto de 150. Ventana de tres cuadras —anterior, actual y siguiente—, construyendo la siguiente repartida en varios frames mientras se juega la actual, y liberando dos cuadras atrás. Con la puerta el recorrido es de ida, así que no hace falta histéresis, y el disparador es un evento y no una distancia adivinada
- [ ] **18.12 bis Liberar de verdad.** Entidades, materiales, mallas **y cajas de colisión**. Una caja que sobrevive a su fachada es una pared invisible, que es el peor error posible porque no se ve. Se mide con `node tools/medir-memoria.mjs` antes y después de cada cuadra
- [ ] **18.13 Reescribir `recorrido.spec.js` y `mision.spec.js`**
- [ ] **18.14 La brújula, más grande y protagonista** (D-38). Hoy existe —una pastilla con flecha que rota y los metros al objetivo— y ya se muestra siempre que haya objetivo, así que lo de "siempre" está. Lo que falta: **tamaño**, porque el glifo mide 15 px y es más chico que el texto de al lado; **presencia**, que se vea de reojo mientras se corre; y **el nombre de la calle** por la que se va, que es donde D-40 dice que puede vivir. Y tiene que seguir funcionando cuando la 19A.6 le cambie el blanco al zombi más cercano

**Criterio de salida**

- [ ] Todos los giros del mapa construido son de 90°, verificado por `tests/trazado.test.js`
- [ ] Los siete tramos miden lo mismo, y los controles quedan a distancia pareja
- [ ] Las seis direcciones de Gus están en orden y coinciden con los carteles
- [ ] Billinghurst 250 se lee como una casa, y se distingue de sus vecinas
- [ ] No se puede salir de la ruta por ningún lado: probado intentándolo en las ocho esquinas
- [ ] Un jugador que nunca lo vio entiende para dónde ir sin que nadie le diga
- [ ] Ningún obstáculo bloquea la ruta que debería dejar pasar
- [ ] Se puede llegar de Independencia 3250 a Billinghurst 250 sin trabarse
- [ ] Las llamadas de dibujo del peor caso están medidas y anotadas
- [ ] Hay autos y obstáculos detrás de los que se puede cubrir, no sólo para cortar
- [ ] La brújula se ve de reojo mientras se corre, en el teléfono, y dice cuánto falta

---

## ⬜ FASE 19 — La esclusa, y después los power-ups

**Objetivo:** que llegar a un control sea el momento en que la partida cambia.
Reemplaza lo que hacía `CHECKPOINT_DROP` y lo hace mejor: una decisión en vez
de tres cajas tiradas en el piso.

**Va en dos tiempos** (D-32), porque Gus todavía está armando las mejoras.

### 19A — La esclusa · el corazón del juego nuevo (D-37)

> ⚠️ **Antes de todo lo demás: 19A.0.** Hay un error en el código que hoy no
> se ve y que con la puerta vuelve la partida imposible de terminar. Está
> descrito abajo y **es condición previa de todo lo demás de esta fase**.

**La parte obligatoria, antes de la esclusa:**

- [ ] **19A.0 El zombi que desaparece sin morir.** 🐛 **Es un error, no una mejora.** En [src/enemies/spawnManager.js:184](src/enemies/spawnManager.js#L184), cuando el jugador se aleja más de 55 × 1,4 m, el zombi se apaga y se saca de `enJuego` — **pero su puesto queda marcado en `puestosUsados` para siempre**. O sea que un zombi del que te alejaste **se va del juego sin morir y no vuelve nunca**. Hoy es invisible porque nada depende de las muertes. Con D-37, el jugador va a recibir la orden de matar a todos y algunos **ya no existen**: la puerta no abre jamás. Hay que liberar el puesto al apagar un zombi vivo, y dejar marcados sólo los puestos de los muertos
- [ ] **19A.1 Zonas con dueño, y el reparto por tramo.** Hoy cada puesto de aparición lleva `zona.nota`, que es un texto. Para contar "los zombis de este tramo" hace falta que cada zona de `mission001.js` declare **a qué tramo pertenece**, y que el `SpawnManager` sepa cuántos hay vivos por tramo. **Y es acá donde entra la otra mitad de lo que pidió Gus:** cada tramo declara **cuántos zombis y de qué tipo** — el estándar de 100/10, el agresivo de 120/20, los esqueletos como mini-jefes — y de ahí se sueltan con posición aleatoria dentro de la zona. No es ahorro de memoria (ver D-42): es la perilla de diseño que hace que cada cuadra se sienta distinta de la anterior
- [ ] **19A.2 Puestos alcanzables, verificado por una prueba.** Ningún puesto puede caer en un hueco que las bocacalles tapadas (D-34) dejen aislado. Un zombi ahí adentro traba la partida para siempre. Lo verifica una prueba contra el mapa construido, no el ojo

**La esclusa:**

- [ ] **19A.3 Los seis controles** como puerta corrediza del ejército que cruza los 16 m de calle —calzada y las dos veredas— con colisión. Y el séptimo: la casa de Sergio no necesita puerta, pero sí que el último tramo esté limpio
- [ ] **19A.4 Cerrada: el cartel.** Al tocar la puerta con zombis vivos en el tramo: cartel de prohibido y el texto *no podés pasar hasta que mates a todos los zombis*. Que se lea en el teléfono y no tape el juego
- [ ] **19A.5 El contador.** Cuántos quedan vivos en el tramo, siempre visible. Sin esto, "matá a todos" es una búsqueda a ciegas
- [ ] **19A.6 La brújula cambia de blanco** (D-38). Mientras la puerta frene al jugador, la flecha apunta al **zombi vivo más cercano**, no al control
- [ ] **19A.7 Abre.** Tramo limpio → la puerta se desliza y deja pasar. **Y la colisión se abre con ella**, o el paso queda abierto a la vista y cerrado al caminar. Es una animación de posición, no un efecto: barata y sin partículas
- [ ] **19A.8 Y se cierra a los 20 m** (D-37). El número sale de la cámara: se sienta 7 m detrás de Gus y hasta 14,4 m si el jugador la aleja al máximo. Pasados esos 20 m, la cuadra de atrás ya no se ve y **se dispara el evento que la libera** (D-42)
- [ ] **19A.9 Guardar y reaparecer del lado de adentro.** Al morir se reaparece al principio del tramo en curso, **nunca del lado de afuera de la puerta**: esa cuadra ya no existe en memoria
- [ ] **19A.10 El gancho para la 19B.** Un evento `controlAbierto` con el índice del control, para que las cartas se enchufen sin tocar nada de esto
- [ ] **19A.11 El ritmo.** Siete tramos por limpiar cambian la duración de la misión por completo: hoy hay ~24 zombis en total, unos 3 por tramo. Hay que medir cuánto dura una cuadra y cuántos zombis aguanta antes de aburrir. Es la perilla principal del juego, y se ajusta jugando en el teléfono

**Criterio de salida de la 19A**

- [ ] Ningún zombi desaparece sin morir, con una prueba que lo verifique
- [ ] El contador llega a cero si y sólo si están todos muertos
- [ ] Ningún puesto de aparición queda en un lugar inalcanzable
- [ ] La puerta no se pasa con un zombi vivo en el tramo, probado intentándolo
- [ ] El cartel de prohibido se entiende sin leer el texto dos veces
- [ ] Al limpiar el tramo la puerta abre, y el paso queda libre **también para la colisión**
- [ ] La puerta se cierra a los 20 m y no se puede volver, probado intentándolo
- [ ] Al cerrarse, no se ve ni un pedazo de la cuadra liberada desde ninguna distancia de cámara, incluida la máxima
- [ ] Al morir se reaparece del lado de adentro
- [ ] La brújula apunta al zombi que falta cuando la puerta frena
- [ ] Se puede terminar la misión limpiando los siete tramos
- [ ] Una cuadra no se siente larga, medido en el teléfono

### 19B — Las cartas · **espera la lista de power-ups de Gus**

> ⏸️ **Esta mitad no se empieza sin la lista.** El sistema no se diseña bien
> sin saber qué tiene que aplicar: una mejora que suma daño y una que cambia
> el tipo de disparo se implementan distinto, y descubrirlo a mitad de camino
> significa rehacerlo. **Lo que necesito de Gus está más abajo.**

- [ ] **19B.1 El sistema.** Una lista de mejoras con id, nombre, texto, familia y cómo se aplica. **Se aplican sobre una capa de modificadores, nunca sobre `balance.js`:** los números base no se tocan, así reiniciar es tirar la capa
- [ ] **19B.2 Las tres cartas.** Al tocar un control el juego se detiene y saca tres del pool, sin repetir las ya tomadas. Elegir una la aplica y sigue
- [ ] **19B.3 La acumulación.** Todo suma, nada se pierde durante la partida. Al morir, la capa entera a cero
- [ ] **19B.4 El pool definitivo**, con el de Gus
- [ ] **19B.5 La pantalla.** Tres cartas, en vertical, alcanzables con un pulgar
- [ ] **19B.6 Los iconos, dibujados de cero.** ⚠️ Las imágenes de `documentacion/habilidades/` **salieron de otro juego**, así que son **referencia de diseño y no entran a `public/`**. Modificarlas no las vuelve usables: una versión alterada de una imagen ajena sigue siendo obra derivada. Hay que dibujar iconos **originales en SVG** con el mismo lenguaje —cuadrado, marco verde, fondo claro, una o dos formas planas—, que además pesan nada y escalan solos. Son flechas: es media hora de trabajo, no un problema
- [ ] **19B.7 Qué se ve durante la partida.** Una fila de iconos chicos con lo que se lleva puesto
- [ ] **19B.8 Al morir se pierde todo**, con una prueba que lo verifique
- [ ] **19B.9 El balance de las seis.** Con 6 controles se termina con 6 mejoras: que la última cuadra se sienta frenética sin que el juego se rompa

### Lo que Gus ya empezó a armar

En `documentacion/habilidades/` aparecieron los cinco primeros, con icono y
todo. Quedan registrados acá para que no se pierdan:

| Carta | Icono | Qué entiendo que hace | Cuesta |
|---|---|---|---|
| **Tiro doble** | `Tiro doble.webp` | Dos balas paralelas por disparo | **El más barato**: es el mismo disparo dos veces |
| **Disparo múltiple** | `Disparo multiple.webp` | Dos balas abiertas en ángulo | Bajo |
| **Disparos diagonales** | `Disparos diagonales.webp` | Tres balas: una al frente y dos en diagonal | Bajo |
| **Rebote** | `Rebote.webp` | La bala salta de un zombi a otro cercano | **Caro**: hay que elegir el segundo blanco y dibujar el salto |
| **Rebote pared** | `Rebote pared.webp` | La bala rebota en una pared y sigue con otro ángulo | **El más caro**: necesita la normal de la superficie y un segundo rayo |

**Las cinco cambian cómo se dispara, no un número**, que es justo la familia
que avisé que costaba más. Así que el sistema de la 19B.1 tiene que nacer
sabiendo que una mejora puede reemplazar **el disparo entero**, y no sólo
multiplicar un valor. Bien que hayan aparecido éstas primero: si el pool
hubiera arrancado con "+10 de daño", me habría quedado corto en la
arquitectura y lo habría descubierto tarde.

> ⚠️ **Las tres primeras son la misma familia, y hay que decidir cómo se
> acumulan.** Tiro doble son dos balas, disparo múltiple son dos abiertas y
> disparos diagonales son tres. Si las tres salen en la misma partida, ¿son
> **siete balas por disparo**? ¿O cada una reemplaza a la anterior? Con seis
> controles es perfectamente posible juntar las tres, y la diferencia entre
> "suman" y "se reemplazan" es la diferencia entre una partida divertida y una
> en la que el último tramo se barre sin mirar. **No hace falta decidirlo
> ahora**, pero sí antes de la 19B.1, porque cambia la arquitectura: sumar
> pide una lista de cañones, reemplazar pide un solo patrón de disparo que se
> sustituye.

> ⚠️ **"Rebote pared" choca con D-36 y hay que resolverlo.** D-36 dice que una
> barrera —árbol, auto, pared— **detiene** la bala, y que eso es lo que hace
> que valga la pena moverse. Esta carta dice que la pared la **devuelve**. Las
> dos reglas no pueden convivir sin aclarar cuál gana: lo más probable es que
> el rebote sea la excepción que la carta compra, o sea *"ahora las paredes
> dejan de frenarte y pasan a servirte"*. Eso es una carta muy buena, pero hay
> que escribirlo antes de programarlo. Lo cierra la 19B.4.

**Y fijan el estilo del icono:** cuadrado con marco verde, fondo claro,
dibujo plano de una o dos formas, legible a tamaño chico. La 19B.6 se hace
contra eso, no inventando otro.

### Lo que necesito de Gus para la 19B

No hace falta que esté completo ni prolijo. Con esto alcanza para empezar, y
**cuanto antes llegue, mejor, porque la 17 se puede diseñar sabiendo qué va a
tener que modificar**:

| Lo que sirve | Por qué |
|---|---|
| **El nombre y qué hace**, en una línea cada uno | Es lo único imprescindible |
| **Cuántas quiere en total** | Con 6 controles, menos de 12 se repite rápido; más de 25 no se alcanza a ver en una partida |
| **Si alguna cambia *cómo* se juega**, no sólo un número | Perforante, abanico o rebote cuestan mucho más que "+10 de daño", y conviene saberlo antes |
| **Si alguna puede salir dos veces** y acumularse con ella misma | Decide si el pool se agota o no |
| **Si las tres de disparo múltiple suman o se reemplazan** | Es la que más urge: cambia la arquitectura del sistema, no un número |
| **Si alguna es "rara"** y tiene que aparecer poco | Si no hay rarezas, el sistema es más simple y se hace antes |

Lo que **no** necesito: números exactos, iconos, ni textos finales. Los
números los termino yo midiendo contra los 100 de vida del zombi, que es lo
que decide si una mejora se nota o no.

**El pool propuesto, mientras tanto.** Es para que Gus tenga de dónde partir
o qué contradecir, no una decisión tomada. Las de daño están medidas contra
los 100 de vida del zombi normal, porque lo que importa no es el número sino
**cuántos tiros hacen falta**:

| Familia | Carta | Efecto | Por qué ese número |
|---|---|---|---|
| Daño | Mano firme | 25 → 34 de daño | Baja de 4 tiros a **3** |
| Daño | Calibre grueso | 25 → 50 de daño | Baja a **2** tiros. Carta fuerte: debería ser rara |
| Cadencia | Gatillo liviano | −20 % de espera entre tiros | Mata más rápido sin matar en menos tiros |
| Vida | Aguante | +30 de vida máxima, y cura todo | 120 → 150: de 12 golpes a 15 |
| Defensa | Cuero grueso | −20 % de daño recibido | 10 → 8 por golpe: de 12 golpes a 15 |
| Disparo | Perforante | La bala atraviesa y pega al de atrás | Cambia *cómo* se pelea: premia alinearlos |
| Disparo | Doble tiro | Dos balas por disparo, más dispersión | El doble de daño de cerca, menos de lejos |
| Disparo | Abanico | Tres balas en cono | Para los grupos. Castiga el tiro largo |
| Alcance | Vista larga | +8 m de alcance | Permite empezar a tirar antes de que lleguen |
| Utilidad | Segundo aire | +1 de vida por segundo estando quieto | Devuelve la curación, pero atada a quedarse quieto |
| Utilidad | Carnicero | Cada muerte cura 5 | Premia aguantar en vez de correr |

**Criterio de salida de la 19B**

- [ ] Al llegar a un control aparecen tres cartas y el juego espera
- [ ] Elegir una la aplica al instante y sin que el jugador toque nada más
- [ ] Las seis mejoras conviven y se notan todas
- [ ] Morir devuelve las estadísticas estándar, verificado con una prueba
- [ ] Se ve en todo momento qué mejoras se llevan puestas
- [ ] Las tres cartas se leen y se eligen con un pulgar en el teléfono
- [ ] Ningún valor de `balance.js` quedó modificado en disco

---

## ⬜ FASE 20 — Los assets del banco

**Objetivo:** meter en el juego lo que sirve de los 461 MB de `_assets/`, con
la regla de D-33. **Absorbe seis tareas de la 12R:** 12R.8 (vehículos),
12R.11 (Gus), 12R.12 (zombis), 12R.13 (armas en la mano), 12R.14 (objetos del
piso, que muere con los ítems) y 12R.A (el barrido de assets).

### Primero: el convertidor NO es un bloqueante. Lo medí

Dije que faltaba un convertidor por Blender y que era bloqueante. **Lo medí y
me equivoqué en el diagnóstico.** Blender no está instalado, es verdad, pero
el problema no es el formato: es el peso, y el peso tiene otra cura.

**Lo que mide `tools/inspeccionar-glb.mjs`**, que escribí para esto, sobre el
zombi estándar:

| | |
|---|---|
| Peso | 3,97 MB |
| **Texturas** | **2,75 MB — el 69 %** · tres PNG de 1024×1024 (base, normal, metallic-roughness) |
| Geometría | 1,05 MB · 14.572 triángulos, 21 huesos |
| Animación | 0,11 MB · **6 animaciones ya nombradas**: Walk, Run, Swipe, Bite, Stumble, Die |

**Tres cosas que esto cambia.** Primero: **Gus se ve a 43 píxeles de alto en
el teléfono**, y para 43 píxeles una textura de 1024×1024 es veinticuatro
veces más de lo que hace falta; a 256×256 esos 2,75 MB se vuelven ~0,17 MB.
Segundo: el estilo es **low-poly mate** (D-33), así que el mapa de normales y
el de metallic-roughness **no se usan**; tirarlos es gratis y es ganancia
directa. Tercero: el zombi **ya trae las seis animaciones que la Fase 17
necesita**, con los nombres puestos. No hay que animar nada.

Resultado: **3,97 MB → ~1,2 MB sin instalar nada y sin tocar la geometría.**
Y eso lo hace un script propio, porque quitar imágenes de un `.glb` es
cirugía de JSON y buffers, no procesamiento de imagen.

**Y los `.fbx` tampoco son un problema.** Los 355 archivos `.fbx` del banco
son **Kaydara FBX Binary** —el formato que todos los convertidores soportan—
y pesan kilobytes: el taxi, 0,08 MB; un banco de plaza, 0,02 MB. Tres salidas,
de más barata a más cara, y se prueban en ese orden:

| | Camino | Costo | Nota |
|---|---|---|---|
| 1 | **Poly Pizza.** Los autos y las armas son de **Quaternius, CC0**, y Poly Pizza los redistribuye en `.glb` por URL directa | **Cero.** No se instala nada | **Ya funcionó en este proyecto**: los dos árboles de la 12R.6 salieron de ahí |
| 2 | **FBX2glTF**, binario suelto | Una descarga | Si Poly Pizza no tiene el modelo exacto |
| 3 | **Blender** por línea de comandos | ~400 MB de instalación | Último recurso, y sirve igual para otras cosas |

**Lo que de verdad no hace falta convertir:** el banco tiene **170 archivos
`.glb`/`.gltf`**. Eso ya cubre el zombi, los esqueletos, Gus, las animaciones
y todo KayKit. Lo único sin `.glb` son los autos, las armas y el CryptZombie.

### La regla de escala, que manda sobre todo lo demás (D-39)

**Gus es el patrón.** Ningún modelo entra sin medirse contra él, y el que no
calza se escala o no entra:

| | Contra Gus |
|---|---|
| Zombi normal y agresivo | La misma estatura, más o menos |
| Esqueletos | La misma estatura |
| Jefes | Algo más altos, y nada más |
| Todos | El mismo tipo de textura y el mismo acabado mate |

Y es más fácil de lo que parece, porque **la mayor parte del banco ya está en
esa escala**: KayKit y Quaternius exportan en metros con proporción humana.
El que hay que vigilar es el zombi de Meshy, que viene de otra pipeline.

**Esto también acota la 20.7.** Gus no se rediseña: el formato que tiene está
bien y gusta. Lo que la 20.7 hace es darle un modelo riggeado **con la misma
escala, las mismas proporciones y el mismo acabado** que el de hoy, más la
campera de cuero de D-24. Si el modelo nuevo no se parece al de hoy puesto al
lado, no entra.

### Las tareas

- [ ] **20.0 Medir a Gus.** Alto, ancho de hombros, y su alto en píxeles en el teléfono. Es la regla con la que se mide todo lo demás, y hoy el número que hay es 43 px de la 12R.1
- [ ] **20.1 El adelgazador.** `tools/adelgazar-glb.mjs`: tira las texturas que el estilo mate no usa, baja la que queda y reescribe el `.glb`. Código propio, sin dependencias. **Es la tarea que desbloquea el peso**, y reemplaza al convertidor que creía necesitar
- [ ] **20.1 bis Los `.fbx`, por el camino 1.** Buscar autos y armas de Quaternius en Poly Pizza como `.glb`. Si falta alguno, recién ahí se evalúa el camino 2
- [ ] **20.2 La regla de la carpeta.** `_assets/` en `.gitignore` ✅ *hecho el 7/11*. Falta una prueba que falle si alguna ruta del **juego** la menciona (las herramientas de medición sí pueden leerla)
- [ ] **20.3 Medir antes de elegir.** Con `tools/inspeccionar-glb.mjs` ✅ *hecho el 7/11*, que dice en qué se le va el peso a cada candidato. Las filas van a `ASSET_AUDIT.md`. Hereda la tabla de la 12R.A
- [ ] **20.4 El zombi estándar.** `skeleton-zombie-mobile.glb`, 100/10. Pasado por la 20.1 tiene que quedar en ~1,2 MB. **Trae sus seis animaciones**: Walk, Run, Swipe, Bite, Stumble, Die
- [ ] **20.5 El zombi agresivo.** CryptZombie, 120/20. Viene en formato Godot sin un solo `.glb`: es el único que no tiene salida por Poly Pizza, así que decide si hace falta el camino 2 o el 3
- [ ] **20.6 Los esqueletos.** KayKit_Skeletons, 0,25 a 0,35 MB, CC0. Mini-jefes
- [ ] **20.7 Gus.** Universal Base Characters + Universal Animation Library, las dos CC0. Buscar el cuerpo y la cara que más se acerquen a `Gus.jpeg` (D-24, cuero negro)
- [ ] **20.8 El arma de Gus.** Ultimate Gun Pack: hay **6 pistolas y 5 revólveres**. **Entregable: una lámina con los once renderizados, para que Gus elija.** Depende de la 20.1 bis
- [ ] **20.9 Los autos.** Realistic Car Pack, CC0, 7 modelos con taxi, sólo `.fbx`. Son los bloqueadores de bocacalles de la 18.7 y la cobertura de la 17. **Ya no son el control**: eso lo hace la puerta (D-37)
- [ ] **20.10 Los efectos.** pvfx-foundry, en hojas de sprites 2D: fogonazo, impacto, sangre. **`ExplosionFXFree` queda sin uso**: con la puerta corrediza de D-37 no explota nada. Vuelve a la Fase 15, por si algo lo necesita
- [ ] **20.11 Las animaciones.** Zombi: quieto, caminar, correr, atacar, morir. Gus: quieto apuntando, disparar, correr
- [ ] **20.12 El presupuesto.** Todos los modelos juntos, 12 MB como techo, de los 25 MB de descarga total. Se mide, no se estima
- [ ] **20.13 La atribución completa** en `ASSET_AUDIT.md`, antes de publicar

**Las licencias, verificadas el 7 de noviembre**

| Pack | Licencia | Entra |
|---|---|---|
| skeleton-zombie 1.0.0 | Propia, uso comercial embebido, crédito opcional. **No se puede redistribuir como asset suelto** | ✅ |
| CryptZombie 1.0.1 | G4G v1.0, uso comercial, sin atribución obligatoria. **Igual: no redistribuir suelto** | ✅ |
| KayKit (City Builder, Skeletons, Animations, Weapons) | **CC0** | ✅ |
| Quaternius (Guns, Cars, Base Characters, Animation Library) | **CC0** | ✅ |
| Bestiary — Dungeon Monsters | Quaternius Asset License v1.0, comercial, sin crédito | ✅ |
| pvfx-foundry | **CC0** sobre las hojas de sprites y los manifiestos | ✅ |

**La única cosa a cuidar:** los dos packs de zombis prohíben redistribuir los
archivos *como colección de assets*. Embeberlos en el juego publicado está
permitido y es exactamente lo que vamos a hacer, pero el `.glb` convertido va
en `public/modelos/` y nunca en una carpeta que parezca un pack para bajar.

**Las dos decisiones que esta fase tiene que cerrar**

**¿Universal Animation Library o KayKit_Character_Animations?** Mi lectura es
**Universal**, y el motivo es la escala: es de proporción humana y la 12R
tiene todo medido contra una puerta de 2,10 m y un auto. KayKit es chibi, de
cabeza grande, y metido en esta escena rompería la única cosa que la 12R
consiguió, que es que nada flote ni se hunda. Pero hay que verlo antes de
decidir: la 20.7 lo pone en pantalla y se mira.

**¿Qué hacemos con KayKit_City_Builder_Bits?** Era el respaldo por si no se
conseguía Buenos Aires. **Para fachadas: no.** Es otro estilo, y las fachadas
de la 12R.4 y la 12R.5 ya están hechas con la paleta medida: reemplazarlas
por un kit genérico es tirar dos tareas terminadas para quedar peor. **Para
mobiliario y props: sí** —bancos, cajas, cestos, bases—, pasados por la
paleta como se hizo con los árboles.

**Criterio de salida**

- [ ] Ninguna ruta del código menciona `_assets/`, y hay una prueba que lo verifica
- [ ] Cada modelo que entró tiene su fila en `ASSET_AUDIT.md` con licencia y atribución
- [ ] El zombi se distingue de Gus de un vistazo, **estando a su misma altura**
- [ ] El Gus nuevo, puesto al lado del de hoy, se reconoce como el mismo personaje
- [ ] Ningún modelo quedó fuera de la escala de Gus, jefes aparte
- [ ] Todos comparten el mismo acabado mate
- [ ] El arma se ve en la mano y no se despega
- [ ] La escala de Gus coincide con puertas, autos y veredas
- [ ] Los modelos juntos no pasan de 12 MB
- [ ] Nada mezcla estilos sin haber pasado por la paleta

---

## ⏸️ FASE 12R — La capa visual nueva

**En pausa hasta cerrar la Fase 17.** No se modela la mano que sostiene un
cuchillo que se está borrando.

**Qué es:** rehacer todo lo visual desde cero siguiendo `documentacion/visual/`.

### Las ocho que están hechas

- [x] **12R.0 — Banco visual y paleta.** 58 colores medidos de la referencia, 16 pruebas, y el banco para compararlos contra el original
- [x] **12R.1 — Cámara y encuadre.** 48° y 15 m con la mira 3 m adelante: Gus pasó de 29 a 43 px. Y la cámara ahora esquiva lo que la tapa aunque sea bajo
- [x] **12R.2 — Sol, cielo y atmósfera.** Tres luces con temperaturas distintas. Y apareció el error gordo: **el sol estaba a 17° creyendo que estaba a 73**
- [x] **12R.3 — El suelo.** Cordón con volumen, vereda con juntas, eje de doble mano y la bocacalle con cuatro ochavas. ⚠️ **La 18.2 la va a tener que retocar:** las ochavas están hechas para 90° y los giros nuevos no son de 90°
- [x] **12R.4 — Fachadas.** Planta baja con profundidad real. Y apareció por qué se veían lisas: **el relieve viejo sobresalía hacia adentro del edificio**
- [x] **12R.5 — Cartelería.** 31 carteles con texto de verdad, pared continua sin huecos, y los vidrios dejaron de ser agujeros negros
- [x] **12R.6 — Árboles.** Tronco que se abre en ramas y copa de cinco volúmenes irregulares
- [x] **12R.7 — Mobiliario urbano.** Cables cruzando la calle. **Murió `src/world/lighting.js`**

### Las que quedan, y a dónde se fueron

| | Tarea | Estado |
|---|---|---|
| ➡️ | 12R.A — Barrido de assets | **Se la lleva la 20.3** |
| ➡️ | 12R.8 — Vehículos | **Se la lleva la 20.9** (Realistic Car Pack) |
| ⬜ | 12R.9 — Abandono: vallas, escombros, bolsas, grafiti | Queda. Y crece: ahora bloquea bocacalles (18.7), con el vocabulario de la contención (D-43) |
| ⬜ | 12R.10 — Composición de la cuadra | Queda. Y crece: siete cuadras en vez de tres |
| ➡️ | 12R.11 — Gus | **Se la lleva la 20.7** |
| ➡️ | 12R.12 — Zombis | **Se la llevan la 20.4 a la 20.6** |
| ➡️ | 12R.13 — Armas en la mano | **Se la lleva la 20.8**, y es sólo una arma |
| ❌ | 12R.14 — Objetos del piso | **Muere con los ítems** (16.1) |
| ⬜ | 12R.15 — HUD | **Se rehace de cero en la 16.8.** El HUD que iba a arreglar casi no existe más |
| ⬜ | 12R.16 — Medición y cierre | Queda, al final de todo |

### Criterio de salida de la fase

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
- [ ] Hay cartelería en español, legible, con los nombres de D-26

**Personajes**

- [ ] Gus no se lee como un conjunto de cubos
- [ ] Se le distingue ropa, calzado, cabeza, brazos y piernas
- [ ] Su escala coincide con puertas, autos y veredas
- [ ] Se mueve con animación real, o está declarado como provisional
- [ ] El zombi se distingue de Gus de un vistazo
- [ ] El arma se ve en la mano y no se despega

**Jugabilidad y costo**

- [ ] Los controles táctiles siguen funcionando, con el joystick a la derecha
- [ ] La misión sigue pudiéndose terminar
- [ ] Ninguna caja de colisión se movió sin decirlo
- [ ] Las llamadas de dibujo del peor caso están medidas
- [ ] No queda arte viejo sin usar en el repositorio

---

## ⬜ FASE 10 — Interfaz completa

**Objetivo:** que el juego tenga principio, menús y ajustes, no sólo partida.

- [ ] 10.1 Menú principal con título, jugar, ajustes y cómo se juega
- [ ] 10.2 Pantalla de controles, distinta según sea teclado o táctil
- [ ] 10.3 Ajustes: sensibilidad de cámara, ángulo, volumen, invertir eje Y
- [ ] 10.4 Guardar los ajustes en `localStorage`
- [ ] 10.5 Pantalla de carga con progreso real, no fingido
- [ ] 10.6 Pausa completa: continuar, reiniciar, ajustes, volver al menú
- [ ] 10.7 Revisar tamaño y posición de los botones con una mano real, en vertical
- [ ] 10.8 Verificar que nada quede tapado por el notch ni por la barra de gestos
- [ ] 10.9 Mensaje claro si el dispositivo no soporta WebGL
- [ ] 10.10 Manejar la pérdida de contexto de WebGL sin que el juego muera
- [ ] 10.11 Revisar la legibilidad de todos los textos en una pantalla chica
- [ ] 10.12 Unificar todos los textos en un solo archivo, en voseo rioplatense
- [ ] 10.13 Revisar que el HUD horizontal también funcione
- [ ] 10.14 **Nueva:** explicar las dos reglas que sin botón no se descubren jugando: que Gus dispara solo cuando se queda quieto, y que la puerta no abre hasta limpiar el tramo
- [ ] 10.15 **Nueva:** la pantalla de "de qué va esto": Gus va a buscar a Sergio mientras el ejército sella la ciudad cuadra por cuadra (D-41, D-43). Hoy el juego no cuenta por qué camina

**Criterio de salida**

- [ ] Todas las pantallas funcionan y ninguna traba el juego
- [ ] Los ajustes se guardan
- [ ] Todos los botones se alcanzan cómodamente con una mano
- [ ] Nada queda tapado por el notch en ningún teléfono probado
- [ ] El tercio central de la pantalla nunca queda tapado por un dedo
- [ ] Alguien que nunca lo jugó entiende la regla de quedarse quieto

---

## ⬜ FASE 11 — Audio

**Objetivo:** que el juego suene, y que el sonido aporte información.

- [ ] 11.1 `AudioManager` con canales separados: efectos, ambiente, interfaz
- [ ] 11.2 Verificar que el audio arranca después del toque inicial
- [ ] 11.3 Los sonidos mínimos de la demo (documento 02, sección 3), menos los de la bazooka y los ítems
- [ ] 11.4 Audio posicional 3D para los zombis
- [ ] 11.5 Variación de tono en los sonidos repetidos, para que no cansen
- [ ] 11.6 Ambiente de calle vacía en bucle
- [ ] 11.7 Gruñidos ocasionales de zombis fuera de la vista
- [ ] 11.8 Control de volumen y silencio total
- [ ] 11.9 Pausar el audio al pausar el juego o cambiar de pestaña
- [ ] 11.10 Todos los sonidos cortos en un solo archivo
- [ ] 11.11 Anotar cada sonido en el registro de licencias
- [ ] 11.12 **Nueva:** un sonido que marque el momento en que Gus pasa a estar quieto y empieza a disparar. Es información de juego, no adorno
- [ ] 11.13 **Nueva:** los tres sonidos de la esclusa — el chirrido de la puerta al abrirse, el golpe al cerrarse atrás, y el ruido seco de chocarla cuando todavía no abre. Los tres son información: "podés pasar", "ya no se vuelve" y "falta alguien"

**Criterio de salida**

- [ ] El audio arranca sin problemas en Chrome Android y en Safari iOS
- [ ] Se puede ubicar a un zombi de oído
- [ ] Ningún sonido cansa a los 10 minutos
- [ ] Todos los sonidos tienen su licencia registrada

---

## ⬜ FASE 13 — Optimización

**Objetivo:** que ande bien en el teléfono de referencia. **Nada se optimiza sin
una medición previa que lo justifique.**

- [x] 13.1 Medir el estado actual y anotar los números de partida ✅ *hecho el 7/11 con `tools/medir-memoria.mjs`*, y están en la tabla de abajo
- [ ] 13.2 Identificar el cuello de botella real: ¿CPU, GPU, memoria o descarga?
- [ ] 13.3 Reducir llamadas de dibujo agrupando geometría estática
- [ ] 13.4 Instanciado para lo que se repite (postes, autos, ventanas)
- [ ] 13.5 Texturas a KTX2/Basis
- [ ] 13.6 Geometría con compresión Draco
- [ ] 13.7 Revisar las sombras: distancia, resolución, qué proyecta y qué no
- [ ] 13.8 Niveles de detalle para los modelos lejanos
- [ ] 13.9 Reutilización de objetos para zombis y partículas
- [ ] 13.10 Carga progresiva: empezar antes de que cargue todo
- [ ] 13.11 Revisar fugas de memoria tras 10 reinicios seguidos
- [ ] 13.12 Sesión de 20 minutos: temperatura, batería, degradación
- [ ] 13.13 Probar en dos teléfonos distintos y dos navegadores
- [ ] 13.14 Probar con 4G real, no sólo con WiFi
- [x] 13.15 ~~carga del mapa por tramos~~ — **se adelantó a la 18.12** (D-42). La medición lo exigió: no es optimización, es la única forma de que el mapa de 700 m entre

**Los presupuestos que hay que cumplir**

**Lo medido el 7 de noviembre**, con `node tools/medir-memoria.mjs` sobre el
mapa de 3 cuadras. Es el punto de partida que pedía la 13.1:

| Métrica | Objetivo | Medido (3 cuadras) | Proyectado a 7 cuadras |
|---|---|---|---|
| Llamadas de dibujo | **< 150** | **238** (53 de sombra) | **~480** ❌ |
| Entidades en la escena | — | 2.621 | ~5.000 |
| Mallas dibujables | — | 2.262 | ~4.300 |
| Triángulos por frame | — | 167.924 | ~330.000 |
| Materiales | — | 133 | |
| Texturas en VRAM | — | 16,52 MB | |
| Vértices en VRAM | — | 4,5 MB | |
| Heap de JavaScript | — | 98 MB | |
| FPS sostenidos | ≥ 30 | | |
| Peor frame | < 50 ms | | |
| Descarga total | < 25 MB | | |
| De eso, modelos | < 12 MB | | |
| Tiempo hasta jugar en 4G | < 8 s | | |

**Y el reparto, que es lo que dice dónde trabajar:** la ciudad es el **86 %**
de las mallas, los 18 zombis el 10 % y Gus el 2 %. Con la construcción por
tramos de D-42 —ventana de tres cuadras— la columna de la derecha vuelve a
ser la del medio, y recién entonces bajar de 238 a 150 es un problema de
tamaño normal.

---

## ⬜ FASE 14 — Publicación de la demo

**Objetivo:** una URL que se pueda abrir desde cualquier teléfono.

- [ ] 14.1 Elegir dónde alojarla
- [ ] 14.2 Configurar la compresión del servidor
- [ ] 14.3 Configurar el caché para que la segunda visita cargue rápido
- [ ] 14.4 Página de inicio con título, descripción y requisitos
- [ ] 14.5 Verificar que todos los archivos cargan desde la URL publicada
- [ ] 14.6 Probar desde un teléfono con datos móviles, no con WiFi
- [ ] 14.7 Probar desde un teléfono que nunca abrió el juego (caché vacía)
- [ ] 14.8 Revisar que no haya ninguna clave ni credencial en lo publicado
- [ ] 14.9 Revisar que el registro de licencias esté completo
- [ ] 14.10 Forma de recibir comentarios de quien la pruebe
- [ ] 14.11 Etiquetar la versión estable en Git
- [ ] 14.12 **Nueva:** verificar que ningún archivo publicado venga de `_assets/`

**Criterio de salida**

- [ ] La URL funciona desde varios teléfonos y navegadores
- [ ] Carga en menos de 8 segundos con datos móviles
- [ ] Tres personas la completaron sin ayuda
- [ ] Hay una versión estable etiquetada

---

## ⏸️ FASE 15 — Ampliación

**No se empieza hasta que la 14 esté terminada y la demo la haya jugado gente
de verdad.**

**Y ahora tiene una idea que la ordena** (D-41): el juego es **ir juntando a
los amigos de Gus** para salvarlos de la invasión. Cada misión va a buscar a
uno; al rescatarlo se suma como personaje jugable. Eso convierte a la Fase 15
de "más cosas" en una campaña, y las tres primeras filas de abajo dejan de
ser deseos y pasan a ser el plan.

| Prioridad | Qué |
|---|---|
| **Alta** | **Elegir personaje.** Al rescatar a Sergio hay dos, y se puede jugar con cualquiera. Es lo primero que pide D-41 y no entra en la demo |
| **Alta** | **La misión 002: el próximo amigo.** Reusando el kit modular, el trazado ortogonal y la esclusa |
| **Alta** | **El roster.** Quiénes son los amigos, dónde vive cada uno y en qué se diferencian jugando |
| Alta | Más misiones reusando el kit modular |
| Alta | Los jefes del Bestiary (Imp y Puglin). **Pesan 9 y 7,5 MB: no entran sin recortarlos** |
| Media | **Contar la contención con algo más que la escenografía** (D-43): radio, carteles del operativo, sobrevivientes. Ahora se cuenta sólo con lo que se ve, y alcanza |
| Alta | Más zombis especiales, con las estadísticas que trae cada pack |
| Media | **El recorrido a escala 1:1 desde OpenStreetMap.** Es la NOTA-02 del documento 02, y recién acá tiene sentido: con varias misiones la traza deja de caber en una tabla. Exige atribución (ODbL) |
| Media | Caballito, Almagro y Flores |
| Media | Compañeros |
| Media | Progresión entre misiones, encima de los power-ups de la Fase 19 |
| Baja | Ciclo de día y noche |
| Baja | Que la bomba vuelva, como otra cosa. Gus la dejó pendiente al sacarla |
| Baja | Más armas, o más tipos de disparo en el pool de cartas |
| Muy baja | Multijugador cooperativo |

---

## ✅ Lo que ya está hecho

Fases cerradas y probadas. El detalle de cada una está en la bitácora.

- [x] **Fase 0 — Fundaciones.** Proyecto que se abre, corre y se versiona
- [x] **Fase 1 — Escena y bucle.** Escena 3D con luz y máquina de estados
- [x] **Fase 2 — Movimiento y cámara.** Gus se mueve, con cámara y colisiones
- [x] **Fase 2B — Render y dirección visual.** No estaba planificada; se agregó al plan para que quedara registrada
- [x] **Fase 3 — El mapa.** Tres cuadras de Boedo con dos rutas alternativas
- [x] **Fase 4 — El primer zombi.** Te detecta, te persigue esquivando y te muerde
- [x] **Fase 5 — Cuerpo a cuerpo.** El cuchillo barre un arco y empuja
- [x] **Fase 6 — Pistola y ruido.** Disparar se escucha a 22 m y atrae zombis
- [x] **Fase 7 — Bazooka.** Barra de 30 s, apuntado automático y cohete que viaja
- [x] **Fase 8 — Objetos e inventario.** Munición, botiquines y curación interrumpible
- [x] **Fase 9 — La misión completa.** 🏁 Se gana, se pierde, se reintenta y el récord se guarda

> ⚠️ **De la 5, la 7 y la 8 no va a quedar nada.** Las borra la Fase 16. No
> fue trabajo perdido: fue cómo se descubrió qué juego queríamos. Pero el
> plan tiene que decir que están muertas, no que están hechas.

### ❌ Fase 12 — Arte original: descartada

Se hizo antes de que existiera una referencia visual. Cuando llegó, se comparó
y no se parecía. **El arte se tira entero y lo rehace la Fase 12R.** El texto
queda en la bitácora, porque las preguntas que se hizo siguen siendo las
correctas aunque las respuestas no sirvan.

---

## Cómo se trabaja

1. **Una tarea por vez.** No se empieza la siguiente hasta que la anterior se probó.
2. **Captura antes y después**, con `node tools/captura.mjs`.
3. **Lo visual se mira primero en el banco** (`estilo.html`), contra la
   referencia, antes de enchufarlo al juego.
4. **Lo que se borra, se borra.** No se comenta, no se deja detrás de un
   `if (false)`, no se renombra a `_viejo`. Si hay que volver, está en Git.
5. **Consola sin un solo error.**
6. **`npm test` y `npm run test:e2e` en verde.** La Fase 16 va a matar unas
   diez pruebas, y eso es correcto: una prueba de algo que ya no existe no se
   arregla, se borra. Lo que no se negocia es que no quede ninguna roja.
7. **Llamadas de dibujo con `F1`, antes y después.** 231 al aparecer y 277 en
   la bocacalle, que es el peor caso de hoy. El presupuesto se fija en la
   Fase 13, midiendo el peor caso.
8. **Nada del código referencia `_assets/`** (D-33). Lo que se usa se copia a
   `public/modelos/` y se anota en `ASSET_AUDIT.md`.
9. **Se sube y se prueba en el celular.** Nada se informa como terminado sin eso.
10. **Un commit por tarea**, diciendo qué se reemplazó y si se movió alguna
    caja de colisión.

---

## Decisiones abiertas

Las que todavía no están cerradas, y la tarea que las va a cerrar.

**Las que dependen de Gus** — no las puedo cerrar yo:

| Decisión | La necesito para | Qué hace falta |
|---|---|---|
| **La lista de power-ups** | 19B.1 | Nombre y qué hace, una línea cada uno. Cuanto antes llegue, mejor: la 17 se diseña mejor sabiendo qué va a tener que modificar |
| **Cuál es el arma de Gus** | 20.8 | Nada todavía: yo le muestro las once renderizadas y elige |

**Las que cierro yo midiendo:**

| Decisión | Se cierra en | Cómo |
|---|---|---|
| ~~Qué cuenta como "quieto"~~ | 17.2 | ✅ **Decidido:** joystick en cero, con 0,15 s de retardo. Está escrito en la Fase 17 y se revisa jugando |
| Si espera a estar encarado antes del primer tiro | 17.3 | Mirándolo: si el primer tiro de cada blanco sale torcido, espera |
| La cadencia de la pistola | 17.9 | Jugando. Hoy son 1,6 s por zombi |
| Si el mapa de 700 m necesita carga por tramos | 18.12 | Midiendo las llamadas de dibujo del peor caso |
| Cómo se marca la ruta en el piso | 18.6 | Probando la franja pintada contra las flechas, desde la cámara a 48° |
| Cuántos zombis por tramo, y cuánto dura una cuadra | 19A.10 | Jugando en el teléfono. Es la perilla principal del juego |
| Cómo se ve el cartel de prohibido | 19A.4 | Que se entienda sin leer el texto dos veces |
| Universal Animation Library o KayKit para las animaciones | 20.7 | Poniendo las dos en pantalla al lado de una puerta y un auto |
| Si hace falta FBX2glTF o Blender | 20.1 bis | Buscando primero los autos y las armas en Poly Pizza, que es gratis |
| ~~Si Gus y los zombis llegan a ser `.glb` riggeado (D-22)~~ | 20.4 y 20.7 | ✅ **Resuelto a favor:** el banco los trae, y el zombi trae sus seis animaciones |

Las decisiones **ya cerradas** —D-01 a D-21 en el documento 02, D-22 a D-25
en la bitácora y D-26 a D-43 acá arriba— no se vuelven a discutir salvo que
aparezca un dato nuevo. **D-04 es el ejemplo de qué es un dato nuevo:** se
reabrió porque la distancia que la justificaba estaba mal medida.
**D-20 y D-21 quedan superadas por D-32.**

---

## Comandos

```bash
npm install          # la primera vez
npm run dev          # http://localhost:5173
npm run dev:lan      # para abrirlo desde el celular
npm test             # pruebas unitarias
npm run test:e2e     # pruebas de punta a punta
npm run build        # compilar
node tools/captura.mjs [nombre]   # captura del juego corriendo

node tools/recorrido-real.mjs                  # el recorrido real y el trazado ortogonal
node tools/recorrido-real.mjs --json           # el trazado, para pegar en mission001.js
node tools/inspeccionar-glb.mjs <archivo.glb>  # en que se le va el peso a un modelo
node tools/medir-memoria.mjs                   # en que se gasta la escena (con npm run dev abierto)
```

| Página | Para qué |
|---|---|
| `/` | El juego |
| `/estilo.html` | El banco visual: la paleta contra la referencia, y la escala |

| Tecla | Dónde | Qué hace |
|---|---|---|
| `F1` | El juego | Diagnóstico (tres dedos en el celular) |
| `E` | El banco | Cambia entre muestras y escala |
| `M` | El banco | Alterna el sol del juego con el medido en la referencia |
| `H` | El banco | Esconde el panel |

| Carpeta | Qué es |
|---|---|
| `_assets/` | **Fuente.** 461 MB de packs descargados. En `.gitignore`. El código no la toca nunca |
| `public/modelos/` | **Destino.** Lo que de verdad usa el juego |
| `documentacion/visual/ASSET_AUDIT.md` | El registro. Nada entra a `public/modelos/` sin una fila acá |
