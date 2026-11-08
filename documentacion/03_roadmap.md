# Documento 03 — Plan de trabajo

**Proyecto:** Explorar BA — supervivencia zombi en Buenos Aires para navegador móvil
**Actualizado:** 7 de noviembre de 2026

> 📖 **El porqué de cada cosa está en [`04_bitacora.md`](04_bitacora.md).**
> Este documento es sólo el plan: qué está hecho, qué falta y qué sigue.
> Si algo necesita una explicación larga, va a la bitácora, no acá.

> ⚠️ **El 7 de noviembre el juego cambió de forma.** Se van los ítems, la
> bazooka, el cuchillo, la munición, caminar y **todos** los botones de
> acción; el combate pasa a ser automático; el recorrido pasa a ser el real
> de Buenos Aires; y la progresión se mueve a cartas en los checkpoints.
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
control sirva para algo. Si se saca y no se pone nada, los checkpoints quedan
siendo sólo un punto de guardado hasta que llegue la **Fase 19**. Es
aceptable y es temporal, pero hay que saberlo mientras se prueba: entre la
16 y la 19 el juego va a ser más pobre que hoy.

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
| ⬜ | 19 — Power-ups de checkpoint | Depende de la 17 y la 18 |
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
19 al final del bloque, porque modifica estadísticas que la 17 todavía no
fijó. La 12R se retoma recién cuando el juego nuevo se pueda jugar.

**Lo que hay hoy:** Gus camina tres cuadras de Boedo, los zombis lo detectan
por vista y por ruido y lo persiguen esquivando obstáculos, pelea con cuchillo,
pistola y bazooka, los tiros se escuchan y atraen zombis, levanta munición y
botiquines, se cura quedándose quieto, toma los controles en orden, llega a la
comisaría, gana o pierde, y el récord sobrevive a cerrar la pestaña.

**Lo que no hay:** arte que valga, audio, menús y ajustes.

---

## 🔥 El cambio del 7 de noviembre

### En una frase

El juego deja de ser *un shooter con inventario y botones* y pasa a ser **un
juego de posicionamiento**: moverse o disparar, nunca las dos cosas a la vez,
y la única decisión del jugador es *dónde pararse y cuánto tiempo*.

### Las nueve decisiones nuevas

Numeradas desde **D-26**, porque D-01 a D-21 son del documento 02 y D-22 a
D-25 son de la 12R.

#### 🔴 D-26 — El recorrido es el real, comprimido al 40 %

**Qué dice.** Las seis ubicaciones que pidió Gus se conservan, con sus
direcciones, su orden, sus giros y sus rumbos reales. La geometría se
comprime a un 40 %: **649,5 m jugables** en lugar de los 1.623,9 m reales.
Los anchos de calle, de vereda y de cordón **no** se comprimen, porque son
lo que hace que un cuerpo de 1,80 m quepa en la escena.

**Por qué corrige D-04.** D-04 comprimió el recorrido a 350 m con el
argumento de que el real medía *"varios kilómetros, atravesando varios
barrios"*. **Eso estaba mal medido.** El recorrido real mide 1.623,9 m en
cinco tramos de entre 260 y 357 m: ni varios kilómetros ni varios barrios.
El motivo del descarte no existía. Y D-04 además reemplazaba el destino por
una comisaría inventada sobre Carlos Calvo; ahora el destino vuelve a ser
Billinghurst 250.

**El trazado.** Ejes del juego: X = este/oeste, Z = norte/sur (−Z es al
norte), 1 unidad = 1 metro. El cero es el punto de aparición.

| | Dirección | Latitud | Longitud | x | z | Tramo | Rumbo |
|---|---|---|---|---|---|---|---|
| Inicio | Av. Independencia 3250 | −34,620511 | −58,411406 | 0,0 | 0,0 | — | — |
| Control 1 | Agrelo 3400 | −34,618206 | −58,413928 | −92,5 | −102,3 | 137,9 m | −42,1° |
| Control 2 | Maza 379 | −34,615399 | −58,415827 | −162,2 | −226,8 | 142,7 m | −29,2° |
| Control 3 | Av. Boedo 120 | −34,612672 | −58,417772 | −233,5 | −347,8 | 140,5 m | −30,5° |
| Control 4 | Mario Bravo 90 | −34,609881 | −58,417396 | −219,7 | −471,7 | 124,6 m | +6,4° |
| **Fin** | **Billinghurst 250** | −34,607771 | −58,416173 | −174,9 | −565,3 | 103,8 m | +25,6° |

Las coordenadas de juego salen de la proyección plana local sobre el punto de
inicio (1° de latitud = 110.933,6 m; 1° de longitud = 91.707,7 m a esa
latitud) multiplicada por 0,40. **El cálculo va en el código, no a mano**,
para que cambiar el factor de compresión sea cambiar un número.

A 6 m/s, los 649,5 m son **108 segundos de carrera pura**. Con zombis en el
camino, la misión completa debería quedar entre tres y cinco minutos, que es
lo que pide una demo.

**Lo que esto cuesta, y hay que decirlo:** el mapa pasa de ~350 m a 650 m y
**ninguno de los cinco tramos está alineado a un eje**. El generador de hoy
exige que lo estén. Eso es la tarea 18.1 y es la más técnica de todo el
bloque.

**Sobre OpenStreetMap.** La NOTA-02 del documento 02 decía que la escala real
se trae de OSM y se generan las manzanas por código. Con el 40 % elegido, la
traza se escribe a mano en `mission001.js` desde la tabla de arriba: seis
vértices no justifican una tubería de datos. **OSM queda disponible y
justificado para la Fase 15**, cuando haya varias misiones y la traza deje de
caber en una tabla. Si se usa, exige atribución (licencia ODbL).

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
bloqueadas con autos cruzados, contenedores, barricadas, escombros y bolsas,
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
| Bazooka y sistema de bomba | `projectile.js`, `explosion.js`, HUD, 2 pruebas |
| Cuchillo y cuerpo a cuerpo | `balance.js`, `weaponController.js`, `combatFx.js`, 2 pruebas |
| Caminar | `balance.js`, `playerController.js`, `pose.js`, `inputManager.js` |
| 7 botones de acción | `index.html`, `hud.css`, `hud.js`, `inputManager.js` |
| Rutas alternativas | `mission001.js`, `worldBuilder.js` |

**Lo que se rescata antes de borrar:** `objetivoAutomatico()` vive hoy en
`src/combat/explosion.js` porque era el apuntado de la bazooka. **Es
exactamente lo que necesita el combate automático.** Se mueve a su propio
archivo *antes* de que muera la bazooka, y no se reescribe.

---

## 🔄 FASE 16 — La poda

**Objetivo:** que no quede en el juego nada de lo que se va. No
"desactivado": borrado. Lo que queda apagado vuelve solo tres meses después.

- [ ] **16.1 Los ítems.** Munición y botiquines, de la vista y del sistema entero ⬅️ *la que sigue*
- [ ] **16.2 La munición de la pistola.** Sin cargador, sin reserva, sin recarga
- [ ] **16.3 El sistema de bomba.** La bazooka entera: el contador, la barra, el cohete y la explosión. **Rescatar `objetivoAutomatico()` antes**
- [ ] **16.4 El cuchillo.** Y con él el cambio de arma: queda un arma sola
- [ ] **16.5 Caminar.** Correr pasa a ser la única velocidad (D-30)
- [ ] **16.6 Interactuar.** Ya no hay nada con lo que interactuar
- [ ] **16.7 El joystick a la derecha** y la cámara a la izquierda (D-27)
- [ ] **16.8 Limpieza del HUD.** Borrar el `action-cluster` entero y su CSS. Lo que queda: vida, objetivo, brújula, pausa y joystick

**Criterio de salida**

- [ ] No hay un solo botón de acción en pantalla
- [ ] No queda código muerto de nada de lo borrado: ni import, ni rama, ni CSS
- [ ] Ninguna constante huérfana en `balance.js`
- [ ] El joystick se alcanza con el pulgar derecho, probado en el teléfono
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
- [ ] **17.3 Buscar el más cercano.** Con `objetivoAutomatico()` rescatado. **Con línea de vista**, para que no dispare a través de una pared
- [ ] **17.4 El blanco se mantiene.** No se recalcula cada frame. Sólo al entrar en quieto, cuando el blanco muere, o cuando sale del alcance o se pierde de vista
- [ ] **17.5 Girar y disparar.** El rumbo de Gus deja de depender del movimiento y pasa a depender del blanco. `rumboForzado` ya existe en `playerController`: se reusa
- [ ] **17.6 Al moverse, suelta.** Deja de disparar y suelta el blanco, sin arrastre
- [ ] **17.7 El daño es permanente** (D-31). Verificar que ningún zombi recupere vida al salir del radio de culling de 55 m ni al volver a su zona
- [ ] **17.8 La marca del blanco.** Sin botón, el jugador necesita ver a quién le está disparando. Lo mínimo que alcance
- [ ] **17.9 La cadencia.** Hoy 0,4 s: 1,6 s para matar un zombi. Probar en el teléfono y ajustar
- [ ] **17.10 La máquina de estados completa, con pruebas.** Moverse → quieto → blanco → muere → siguiente → moverse → quieto → otro blanco

**Decisiones que esta fase tiene que cerrar**

| Pregunta | Propuesta |
|---|---|
| ¿Dispara a través de otros zombis? | No: el primero del rayo se come la bala. Ya funciona así |
| ¿Dispara mientras gira hacia el blanco, o espera? | Espera a estar encarado. Si no, el primer tiro de cada blanco sale para cualquier lado |
| ¿Qué pasa si el más cercano está detrás de un auto? | No es blanco válido. La cobertura tiene que valer para los dos lados |
| ¿Se puede frenar a propósito para disparar desde cobertura? | Sí, y es el juego. Es lo que reemplaza a las decisiones de botón |

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

**Objetivo:** el trazado de D-26, con la ruta marcada y todo lo demás
bloqueado. Usa los props provisionales que ya existen; la Fase 20 los
reemplaza por modelos.

- [ ] **18.1 El generador, abierto a ángulos arbitrarios.** Hoy `worldBuilder` exige tramos alineados a un eje, y los cinco rumbos nuevos son −42,1°, −29,2°, −30,5°, +6,4° y +25,6°. Es la tarea más técnica del bloque
- [ ] **18.2 Las esquinas que no son esquinas.** Con las ochavas de la 12R.3 hechas para 90°, un giro de 13° (de −42° a −29°) no es una esquina: es una curva. Hay que recalcular empalmes de vereda, cordón y ochava
- [ ] **18.3 El trazado nuevo en `mission001.js`**, con las coordenadas GPS al lado de las de juego y el factor de compresión como constante
- [ ] **18.4 Cuatro controles** en vez de dos, y la meta en Billinghurst 250
- [ ] **18.5 Los cinco textos de objetivo**, en voseo
- [ ] **18.6 Marcar la ruta.** Que se lea desde la cámara a 48°. Propuesta: una franja de pintura gastada sobre la calzada, más flechas en los giros
- [ ] **18.7 Bloquear todo lo que no sea la ruta** (D-34). Cada bocacalle y cada vereda lateral, con autos cruzados, contenedores, barricadas, escombros y bolsas. **Con colisión**, no decorado
- [ ] **18.8 Borrar los pasajes** y las zonas de objetos de `mission001.js`
- [ ] **18.9 Rehacer las zonas de zombis** para cinco tramos, con dificultad creciente. El primero flojo: hay que dejar aprender a moverse
- [ ] **18.10 Los carteles de esquina** con los nombres nuevos, reusando la 12R.5: INDEPENDENCIA, AGRELO, MAZA, BOEDO, MARIO BRAVO, BILLINGHURST
- [ ] **18.11 Qué hay en Billinghurst 250.** Hoy la meta es una comisaría inventada sobre Carlos Calvo, que D-26 deja sin sentido. Hay que decidir qué es el refugio y modelarlo
- [ ] **18.12 Medir el costo del mapa grande.** 650 m contra 350: llamadas de dibujo y descarte de lo lejano. Es probable que haga falta cargar por tramos
- [ ] **18.13 Reescribir `recorrido.spec.js` y `mision.spec.js`**

**Criterio de salida**

- [ ] Las seis ubicaciones están en la proporción correcta entre sí, y las direcciones coinciden con los carteles
- [ ] No se puede salir de la ruta por ningún lado: probado intentándolo en las seis esquinas
- [ ] Un jugador que nunca lo vio entiende para dónde ir sin que nadie le diga
- [ ] Ningún obstáculo bloquea la ruta que debería dejar pasar
- [ ] Se puede llegar de Independencia 3250 a Billinghurst 250 sin trabarse
- [ ] Las llamadas de dibujo del peor caso están medidas y anotadas
- [ ] Hay autos y obstáculos detrás de los que se puede cubrir, no sólo para cortar

---

## ⬜ FASE 19 — Power-ups de checkpoint

**Objetivo:** que llegar a un control sea el momento en que la partida cambia.
Reemplaza lo que hacía `CHECKPOINT_DROP` y lo hace mejor: una decisión en vez
de tres cajas tiradas en el piso.

- [ ] **19.1 El sistema.** Una lista de mejoras con id, nombre, texto, familia y cómo se aplica. **Se aplican sobre una capa de modificadores, nunca sobre `balance.js`:** los números base no se tocan, así reiniciar es tirar la capa
- [ ] **19.2 Las tres cartas.** Al tocar un control el juego se detiene y saca tres del pool, sin repetir las ya tomadas. Elegir una la aplica y sigue
- [ ] **19.3 La acumulación.** Todo suma, nada se pierde durante la partida. Al morir, la capa entera a cero
- [ ] **19.4 El pool.** La lista de abajo es la propuesta; se ajusta jugando
- [ ] **19.5 La pantalla.** Tres cartas, en vertical, alcanzables con un pulgar
- [ ] **19.6 Qué se ve durante la partida.** Una fila de iconos chicos con lo que se lleva puesto
- [ ] **19.7 Al morir se pierde todo**, con una prueba que lo verifique
- [ ] **19.8 El balance de las cuatro.** Con 4 controles se termina con 4 mejoras: que la última cuadra se sienta distinta de la primera sin que el juego se rompa

**El pool propuesto.** Las de daño están medidas contra los 100 de vida del
zombi normal, porque lo que importa no es el número sino **cuántos tiros
hacen falta**:

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

**Criterio de salida**

- [ ] Al llegar a un control aparecen tres cartas y el juego espera
- [ ] Elegir una la aplica al instante y sin que el jugador toque nada más
- [ ] Las cuatro mejoras conviven y se notan todas
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

- [ ] **20.1 El convertidor.** Blender por línea de comandos: `.fbx`/`.blend` → `.glb` con Draco y texturas comprimidas, en `tools/convertir-asset.mjs`. **Sin esto no entra más de la mitad del banco:** los autos, las armas y el CryptZombie vienen sólo en `.fbx`/`.blend`, y PlayCanvas carga `.glb`
- [ ] **20.2 La regla de la carpeta.** `_assets/` en `.gitignore` ✅ *hecho el 7/11*. Falta una prueba que falle si alguna ruta del código la menciona
- [ ] **20.3 Medir antes de elegir.** Peso, triángulos, mallas, materiales y licencia de cada candidato, en `ASSET_AUDIT.md`. Hereda la tabla de la 12R.A
- [ ] **20.4 El zombi estándar.** `skeleton-zombie-mobile.glb`, 100/10. **3,97 MB: hay que bajarlo mucho** antes de que entre
- [ ] **20.5 El zombi agresivo.** CryptZombie, 120/20. Viene en formato Godot sin un solo `.glb`: conversión obligatoria
- [ ] **20.6 Los esqueletos.** KayKit_Skeletons, 0,25 a 0,35 MB, CC0. Mini-jefes
- [ ] **20.7 Gus.** Universal Base Characters + Universal Animation Library, las dos CC0. Buscar el cuerpo y la cara que más se acerquen a `Gus.jpeg` (D-24, cuero negro)
- [ ] **20.8 El arma de Gus.** Ultimate Gun Pack: revólver o pistola grande. **Entregable: una lámina con los candidatos renderizados, para que Gus elija.** Sólo vienen en `.fbx`, así que depende de la 20.1
- [ ] **20.9 Los autos.** Realistic Car Pack, CC0, 7 modelos con taxi, sólo `.fbx`. Son los bloqueadores de la 18.7 y la cobertura de la 17
- [ ] **20.10 Los efectos.** pvfx-foundry y ExplosionFXFree, en hojas de sprites 2D: fogonazo, impacto, sangre. **Nada de explosiones: la bazooka se fue**
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
- [ ] El zombi se distingue de Gus de un vistazo
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
| ⬜ | 12R.9 — Abandono: barricadas, escombros, bolsas, grafiti | Queda. Y crece: ahora bloquea bocacalles (18.7) |
| ⬜ | 12R.10 — Composición de la cuadra | Queda. Y crece: cinco tramos en vez de tres |
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
- [ ] 10.14 **Nueva:** explicar en algún lado que Gus dispara solo cuando se queda quieto. Sin botón, eso no se descubre jugando

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

**Criterio de salida**

- [ ] El audio arranca sin problemas en Chrome Android y en Safari iOS
- [ ] Se puede ubicar a un zombi de oído
- [ ] Ningún sonido cansa a los 10 minutos
- [ ] Todos los sonidos tienen su licencia registrada

---

## ⬜ FASE 13 — Optimización

**Objetivo:** que ande bien en el teléfono de referencia. **Nada se optimiza sin
una medición previa que lo justifique.**

- [ ] 13.1 Medir el estado actual y anotar los números de partida
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
- [ ] 13.15 **Nueva:** carga del mapa por tramos. 650 m de calle con fachadas a los dos lados no entran de una sola vez. Puede adelantarse a la 18.12 si la medición lo exige

**Los presupuestos que hay que cumplir**

| Métrica | Objetivo | Medido |
|---|---|---|
| FPS sostenidos | ≥ 30 | |
| Peor frame | < 50 ms | |
| Llamadas de dibujo | < 150 | 231 al aparecer, 277 en la bocacalle |
| Descarga total | < 25 MB | |
| De eso, modelos | < 12 MB | |
| Tiempo hasta jugar en 4G | < 8 s | |

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

| Prioridad | Qué |
|---|---|
| Alta | Más misiones reusando el kit modular |
| Alta | Los jefes del Bestiary (Imp y Puglin). **Pesan 9 y 7,5 MB: no entran sin recortarlos** |
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

| Decisión | Se cierra en | Cómo |
|---|---|---|
| Qué cuenta como "quieto", y con cuánta demora | 17.2 | Probándolo en el teléfono: los 0,18 s de frenado por inercia no deberían contar |
| Si espera a estar encarado antes del primer tiro | 17.3 | Mirándolo: si el primer tiro de cada blanco sale torcido, espera |
| La cadencia de la pistola | 17.9 | Jugando. Hoy son 1,6 s por zombi |
| Qué hay en Billinghurst 250 | 18.11 | Decidiendo qué es el refugio, ahora que la comisaría inventada no va |
| Si el mapa de 650 m necesita carga por tramos | 18.12 | Midiendo las llamadas de dibujo del peor caso |
| Cómo se marca la ruta en el piso | 18.6 | Probando la franja pintada contra las flechas, desde la cámara a 48° |
| El pool definitivo de power-ups y su rareza | 19.4 y 19.8 | Jugando las cuatro mejoras seguidas |
| Universal Animation Library o KayKit para las animaciones | 20.7 | Poniendo las dos en pantalla al lado de una puerta y un auto |
| Cuál es el revólver o la pistola de Gus | 20.8 | Renderizando los candidatos, y elige Gus |
| Si Gus y los zombis llegan a ser `.glb` riggeado (D-22) | 20.4 y 20.7 | Ya está resuelto a favor: el banco los trae |

Las decisiones **ya cerradas** —D-01 a D-21 en el documento 02, D-22 a D-25
en la bitácora y D-26 a D-34 acá arriba— no se vuelven a discutir salvo que
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
