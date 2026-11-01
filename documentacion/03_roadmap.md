# Documento 03 — Plan de trabajo

**Proyecto:** Explorar BA — supervivencia zombi en Buenos Aires para navegador móvil
**Actualizado:** 31 de octubre de 2026

> 📖 **El porqué de cada cosa está en [`04_bitacora.md`](04_bitacora.md).**
> Este documento es sólo el plan: qué está hecho, qué falta y qué sigue.
> Si algo necesita una explicación larga, va a la bitácora, no acá.

---

## ▶️ La tarea que sigue

### **12R.8 — Vehículos**

Los autos son cajas sobre cajas con las ruedas apenas insinuadas. El
criterio de salida pide carrocería y ruedas visibles con proporciones
creíbles.

**Qué entra:** auto con capó, techo, baúl y ventanas hundidas; ruedas de
verdad; taxi con su techo amarillo; colectivo con su frente, sus ventanillas
y la puerta.

**Ya resuelto en 12R.5 y no se toca:** la colocación. Ningún vehículo va
cruzado en el medio de la calzada, porque eso trababa el recorrido.

**Dónde:** nace `src/visual/kit/vehiculos.js`.

---

## 📊 Dónde estamos

| | Fase | Estado |
|---|---|---|
| ✅ | 0 a 9 — El juego | **Terminadas.** Se juega de principio a fin |
| ❌ | 12 — Arte original | **Descartada.** El arte se rehace desde cero |
| 🔄 | **12R — La capa visual nueva** | **8 de 17 tareas.** Es lo que estamos haciendo |
| ⬜ | 10 — Interfaz completa | Pendiente, después de 12R |
| ⬜ | 11 — Audio | Pendiente, después de 12R |
| ⬜ | 13 — Optimización | Pendiente |
| ⬜ | 14 — Publicación | Pendiente |
| ⏸️ | 15 — Ampliación | No se toca hasta que la 14 esté cerrada |

**Lo que hay hoy:** Gus camina tres cuadras de Boedo, los zombis lo detectan
por vista y por ruido y lo persiguen esquivando obstáculos, pelea con cuchillo,
pistola y bazooka, los tiros se escuchan y atraen zombis, levanta munición y
botiquines, se cura quedándose quieto, toma los controles en orden, llega a la
comisaría, gana o pierde, y el récord sobrevive a cerrar la pestaña.

**Lo que no hay:** arte que valga —se está haciendo ahora—, audio, menús y
ajustes.

---

## 🔄 FASE 12R — La capa visual nueva

**Qué es:** rehacer **todo** lo visual desde cero siguiendo
`documentacion/visual/`. La lógica no se toca: está bien y se conserva entera.

**Por qué:** el arte anterior se hizo sin referencia y no se parece a la que
hay ahora. No se corrige, se reemplaza. Son unas 4.400 líneas.

### Las 17 tareas

- [x] **12R.0 — Banco visual y paleta.** 58 colores medidos de la referencia, 16 pruebas, y el banco para compararlos contra el original
- [x] **12R.1 — Cámara y encuadre.** 48° y 15 m con la mira 3 m adelante: Gus pasó de 29 a 43 px. Y la cámara ahora esquiva lo que la tapa aunque sea bajo
- [x] **12R.2 — Sol, cielo y atmósfera.** Tres luces con temperaturas distintas. Y apareció el error gordo: **el sol estaba a 17° creyendo que estaba a 73**, por eso la calle estaba siempre en sombra
- [x] **12R.3 — El suelo.** Cordón con volumen, vereda con juntas, eje de doble mano y la bocacalle rehecha con cuatro ochavas. La paleta medida necesitó dos correcciones al salir del banco
- [x] **12R.4 — Fachadas.** Planta baja con profundidad real: local hundido, persiana con lamas, cornisa que vuela. Y apareció por qué se veían lisas: **el relieve viejo sobresalía hacia adentro del edificio**
- [x] **12R.5 — Cartelería.** 31 carteles con texto de verdad. Y de paso se rehizo la hilera entera: pared continua sin huecos, y los vidrios dejaron de ser agujeros negros
- [x] **12R.6 — Árboles.** Tronco que se abre en ramas y copa de cinco volúmenes irregulares, ninguno igual a otro
- [x] **12R.7 — Mobiliario urbano.** Cables cruzando la calle, que era la pieza que faltaba, y el resto rehecho con la paleta medida. **Murió `src/world/lighting.js`**
- [ ] **12R.8 — Vehículos.** Autos con carrocería y ruedas, colectivo abandonado ⬅️ *la que sigue*
- [ ] **12R.9 — Abandono.** Barricadas, escombros, bolsas, cajones, grafiti
- [ ] **12R.10 — Composición de la cuadra.** Que no se repita nada en fila
- [ ] **12R.11 — Gus.** El modelo nuevo con la campera de cuero (D-24)
- [ ] **12R.12 — Zombis.** Humanoides con postura y ropa, distintos de Gus
- [ ] **12R.13 — Armas en la mano.** Cuchillo, pistola y bazooka
- [ ] **12R.14 — Objetos del piso.** Munición, botiquín y marcas de misión
- [ ] **12R.15 — HUD.** Arreglar el objetivo truncado y el panel que tapa la bazooka
- [ ] **12R.16 — Medición y cierre.** Borrar el arte viejo, medir en el teléfono, actualizar el README

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
- [ ] Hay cartelería en español, legible

**Personajes**

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

**Criterio de salida**

- [ ] Todas las pantallas funcionan y ninguna traba el juego
- [ ] Los ajustes se guardan
- [ ] Todos los botones se alcanzan cómodamente con una mano
- [ ] Nada queda tapado por el notch en ningún teléfono probado
- [ ] El tercio central de la pantalla nunca queda tapado por un dedo

---

## ⬜ FASE 11 — Audio

**Objetivo:** que el juego suene, y que el sonido aporte información.

- [ ] 11.1 `AudioManager` con canales separados: efectos, ambiente, interfaz
- [ ] 11.2 Verificar que el audio arranca después del toque inicial
- [ ] 11.3 Los 14 sonidos mínimos de la demo (documento 02, sección 3)
- [ ] 11.4 Audio posicional 3D para los zombis
- [ ] 11.5 Variación de tono en los sonidos repetidos, para que no cansen
- [ ] 11.6 Ambiente de calle vacía en bucle
- [ ] 11.7 Gruñidos ocasionales de zombis fuera de la vista
- [ ] 11.8 Control de volumen y silencio total
- [ ] 11.9 Pausar el audio al pausar el juego o cambiar de pestaña
- [ ] 11.10 Todos los sonidos cortos en un solo archivo
- [ ] 11.11 Anotar cada sonido en el registro de licencias

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
- [ ] 13.5 Texturas a KTX2/Basis, si para entonces hay texturas
- [ ] 13.6 Geometría con compresión Draco, si para entonces hay `.glb`
- [ ] 13.7 Revisar las sombras: distancia, resolución, qué proyecta y qué no
- [ ] 13.8 Niveles de detalle para los modelos lejanos, si hace falta
- [ ] 13.9 Reutilización de objetos para zombis, proyectiles y partículas
- [ ] 13.10 Carga progresiva: empezar antes de que cargue todo
- [ ] 13.11 Revisar fugas de memoria tras 10 reinicios seguidos
- [ ] 13.12 Sesión de 20 minutos: temperatura, batería, degradación
- [ ] 13.13 Probar en dos teléfonos distintos y dos navegadores
- [ ] 13.14 Probar con 4G real, no sólo con WiFi

**Los presupuestos que hay que cumplir**

| Métrica | Objetivo | Medido |
|---|---|---|
| FPS sostenidos | ≥ 30 | |
| Peor frame | < 50 ms | |
| Llamadas de dibujo | < 150 | hoy 238 |
| Descarga total | < 25 MB | |
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
| Alta | Zombi lento y resistente, y zombi rápido y frágil |
| Media | Caballito, Almagro y Flores |
| Media | Compañeros |
| Media | Progresión entre misiones |
| Baja | Ciclo de día y noche |
| Baja | Más armas |
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

### ❌ Fase 12 — Arte original: descartada

Se hizo antes de que existiera una referencia visual. Cuando llegó, se comparó
y no se parecía. **El arte se tira entero y lo rehace la Fase 12R.** El texto
queda en la bitácora, porque las preguntas que se hizo siguen siendo las
correctas aunque las respuestas no sirvan.

| | |
|---|---|
| 12.A Guía de estilo | ❌ reemplazada por `src/visual/paleta.js` |
| 12.B Gus | ❌ se rehace en 12R.11 |
| 12.C Zombis | ❌ se rehace en 12R.12 |
| 12.D Armas y objetos | ❌ se rehacen en 12R.13 y 12R.14 |
| 12.E La ciudad | ❌ nunca se hizo; la cubre 12R.3 a 12R.10 |

---

## Cómo se trabaja

1. **Una tarea por vez.** No se empieza la siguiente hasta que la anterior se probó.
2. **Captura antes y después**, con `node tools/captura.mjs`.
3. **Lo visual se mira primero en el banco** (`estilo.html`), contra la
   referencia, antes de enchufarlo al juego.
4. **Consola sin un solo error.**
5. **`npm test` y `npm run test:e2e` en verde.** Hoy son 459 y 74. De las
   unitarias, 114 son del arte viejo y se van a reescribir junto con lo que
   verifican; el resto es lógica y tiene que pasar siempre.
6. **Llamadas de dibujo con `F1`, antes y después.** 231 en el punto de
   aparición y 277 en la bocacalle, que es el peor caso. El "techo de 238"
   que figuraba acá era el número del punto de aparición, no el máximo: el
   presupuesto de verdad se fija en la Fase 13, midiendo el peor caso.
7. **Se sube y se prueba en el celular.** Nada se informa como terminado sin eso.
8. **Un commit por tarea**, diciendo qué se reemplazó y si se movió alguna caja
   de colisión.

---

## Decisiones abiertas

Las que todavía no están cerradas, y la tarea que las va a cerrar.

| Decisión | Se cierra en | Cómo |
|---|---|---|

| Si Gus y los zombis llegan a ser `.glb` riggeado (D-22) | 12R.11 y 12R.12 | Encontrando un modelo CC0 compatible, o consiguiendo el archivo |
| Nivel de detalle que soporta el teléfono | 12R.16 | Midiendo después de cada bloque |

Las decisiones **ya cerradas** —D-01 a D-21 en el documento 02, y D-22 a D-25
en la bitácora— no se vuelven a discutir salvo que aparezca un dato nuevo.

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
