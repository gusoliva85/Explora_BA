# PROMPT MAESTRO — Reconstrucción visual y técnica del juego zombi de Buenos Aires

**Uso:** copiar el contenido de este archivo en el agente de programación que trabaja dentro de VS Code, con la carpeta del proyecto abierta. Dejar `REFERENCIA_VISUAL.png` en la misma carpeta y pedirle expresamente que la abra/analice con visión si su entorno lo permite.

**Objetivo de esta intervención:** elevar un prototipo visualmente rudimentario a una demo web móvil con una dirección artística coherente, modelos 3D reales, ambiente urbano reconocible y controles funcionales. No se acepta reemplazar el trabajo por una nueva maqueta de cubos, esferas o cápsulas.

---

## 0. Instrucción principal

Actuá como **director técnico de un videojuego web 3D, artista técnico y programador senior especializado en Three.js/WebGL y rendimiento móvil**.

No te limites a explicar lo que habría que hacer. Primero inspeccioná el proyecto real, luego proponé un plan breve y después implementá cambios verificables. No afirmes que una función está terminada si no existe y no se probó.

El juego es una experiencia de supervivencia zombi en navegador móvil, inspirada en barrios de Buenos Aires. El jugador debe avanzar de un punto A a un punto B, evitar o combatir zombis, recoger armas y suministros, administrar salud y llegar a un refugio.

**La prioridad de esta intervención es la calidad visual de la escena y la integración correcta de assets; no agregar muchas funciones nuevas.**

### Reglas innegociables

1. **Auditá antes de editar.** Inspeccioná `package.json`, archivos de entrada, motor 3D, escena, scripts, dependencias, rutas de assets, controles, cámara y despliegue actual.
2. **No asumas que el proyecto usa un motor específico.** La URL de prueba sugiere una demo web, pero debés confirmar si el proyecto real usa Three.js, React Three Fiber, PlayCanvas u otra tecnología.
3. **No reescribas todo desde cero ni cambies de motor** sin presentar primero una razón técnica concreta. Conservá la lógica funcional que ya exista.
4. **No uses primitivas como arte final.** Cubos, esferas, cilindros y cápsulas solo se permiten como colisionadores invisibles, marcadores temporales durante el desarrollo o geometría auxiliar. No pueden ser el modelo visible final del protagonista, los zombis, los árboles, los autos, las armas ni los edificios principales.
5. **No simules que descargaste assets.** Comprobá que cada archivo existe localmente, que se carga y que se ve en pantalla. Si un asset requiere inicio de sesión o una descarga manual, informalo claramente y continuá con los assets realmente disponibles.
6. **No rompas controles, combate, misión ni interfaz** que ya funcionen. Después de cada cambio importante, probá las funciones existentes.
7. **No cargues modelos remotos directamente desde una URL de una web de assets en producción.** Descargá los archivos permitidos al proyecto y servilos desde una carpeta local/publicada con la app, respetando la licencia.
8. **No uses imágenes planas como sustituto de modelos 3D** para protagonista, zombis o armas en la vista jugable.
9. **No agregues un montón de assets inconexos.** La coherencia visual, escala y composición importan más que la cantidad.
10. **No te detengas después de crear un plan.** Tras el diagnóstico, implementá el siguiente incremento seguro y comprobable, salvo que exista un bloqueo real de acceso o licencia.

---

## 1. Referencia visual obligatoria

Abrí y analizá `REFERENCIA_VISUAL.png`. Es una **referencia de dirección artística**, no una imagen que deba ponerse como fondo del juego.

Extraé de ella estas decisiones:

- Ciudad estilizada con identidad porteña: edificios residenciales de varias plantas, balcones, persianas de comercios, veredas, árboles urbanos, cables, carteles en español, autos, paradas y colectivos.
- Estilo 3D low-poly **pulido**, con formas diseñadas, siluetas legibles, materiales consistentes, paleta cálida y sombras intencionales. Low-poly no significa geometría improvisada ni ausencia de detalle.
- Protagonista reconocible: adulto superviviente, chaqueta azul oscura, pantalón vaquero, calzado, mochila y equipo práctico. Debe tener anatomía y proporciones coherentes, no ser un muñeco compuesto por cubos.
- Zombis humanoides con anatomía, ropa y postura distinguibles. Debe poder reconocerse qué tipo de enemigo es a distancia.
- Armas e ítems con escala correcta, forma identificable y contraste visual suficiente.

La imagen generada puede contener errores de texto o detalles que no se deben copiar literalmente. La fidelidad importante es la **dirección artística general**, no reproducir errores accidentales.

### Paleta inicial sugerida

- Asfalto: gris carbón cálido, no negro absoluto.
- Veredas: gris cemento/beige con juntas visibles.
- Fachadas: terracota apagado, crema, gris cálido, verde envejecido y ladrillo.
- Vegetación: varios tonos de verde natural, sin copas esféricas idénticas.
- Protagonista: azul marino, denim, marrón cuero y verde oliva en mochila/equipo.
- Zombis: piel gris verdosa o desaturada, ropa vieja con variación de color.
- Objetos interactivos: un color de acento claro y consistente; botiquín rojo/blanco, munición con contraste.

Estos colores son una guía, no valores rígidos. Evitá saturación excesiva, materiales plásticos brillantes sin motivo y una iluminación plana que borre los volúmenes.

---

## 2. Objetivo visual concreto de la primera escena

La escena inicial debe mostrar una **calle corta de barrio de Buenos Aires**, no una avenida genérica vacía.

### Composición y entorno

Construí una manzana o tramo de calle con:

- calzada de asfalto con marcas de carril y desgaste discreto;
- cordones y veredas separadas físicamente de la calzada;
- fachadas de alturas variadas y una mezcla creíble de edificios de 2–6 plantas;
- balcones, ventanas, persianas, puertas y marquesinas;
- al menos dos comercios con cartelería ficticia en español;
- árboles urbanos con troncos y copas modeladas de forma coherente;
- postes, cableado, luminarias o señales, sin llenar cada rincón;
- dos o tres autos estacionados, con escala y ruedas correctas;
- una parada de colectivo o elemento urbano porteño;
- señales de abandono moderadas: bolsas, cajas, barricada, persiana cerrada, basura y algún objeto caído;
- un punto de destino visible o claramente señalado.

No se requiere una réplica cartográfica exacta de Caballito, Flores, Almagro u Once. Se necesita una interpretación estilizada reconocible como Buenos Aires.

### Composición de cámara

- Cámara de tercera persona, ligeramente elevada y detrás del jugador, salvo que la arquitectura actual requiera otra opción.
- El personaje debe ocupar suficiente pantalla para distinguir cuerpo, ropa y arma.
- La cámara debe mostrar calle y destino sin convertir al jugador en un punto diminuto.
- Evitá que la cámara atraviese fachadas, árboles o autos.
- No uses una vista tan vertical que el personaje parezca un icono.
- El horizonte y las fachadas deben dar profundidad; no construir solo una pista larga flanqueada por cajas.
- La luz principal debe tener dirección definida; las sombras deben apoyar la lectura sin oscurecer al jugador.

### Densidad y escala

El mundo debe verse completo desde el ángulo de juego. Las puertas, ventanas, veredas, autos, árboles y personajes deben compartir una escala coherente. No repitas el mismo edificio, árbol o auto de manera obvia en filas perfectas. Variá posición, orientación, color y distancia.

---

## 3. Personaje principal: estándar mínimo

El protagonista visible debe ser un modelo 3D real o un modelo provisional de calidad razonable, nunca una combinación visible de primitivas básicas.

### Diseño base

- Adulto superviviente de aspecto civil, no un soldado de ciencia ficción.
- Chaqueta azul oscura, remera neutra, pantalón denim, botas o zapatillas resistentes.
- Mochila compacta y uno o dos elementos de equipo.
- Silueta legible desde la cámara de juego.
- Cabeza, torso, brazos, manos, piernas y pies claramente diferenciados.
- Proporciones estilizadas pero coherentes; manos y cabeza no deben ser diminutas ni desproporcionadas.
- Materiales mate o semimate, pliegues simplificados y detalles que sobrevivan a la distancia de cámara.

### Requisitos técnicos

- Si el personaje necesita caminar, correr, atacar y recibir daño, debe tener un rig/esqueleto compatible y animaciones reales.
- Comprobá la orientación del modelo, el punto de apoyo en el suelo, escala, pivote y dirección frontal.
- Comprobá que las animaciones no hundan los pies excesivamente, no atraviesen el suelo y no deformen brazos o torso de forma grave.
- Si todavía no existe un personaje compatible, buscá un modelo riggeado legalmente utilizable o prepará una integración explícitamente temporal. No afirmes que el personaje está terminado si solo tiene un idle o no se puede animar.
- El arma debe quedar en la mano correcta durante el movimiento y el ataque. Si no hay sistema de huesos/manos, implementá una solución temporal consistente y documentada, sin ocultar el problema.

---

## 4. Zombis: estándar mínimo y comportamiento visual

El primer prototipo necesita al menos **un zombi visualmente convincente y funcional**. Preferiblemente, prepará una arquitectura que permita más variantes después.

### Zombi común

- Humanoide de ropa civil deteriorada.
- Postura inclinada y hombros algo caídos.
- Piel desaturada gris verdosa, sin gore exagerado.
- Cara legible desde una distancia razonable.
- Ropa con colores distintos del protagonista para evitar confusión.
- Silueta diferente de la del jugador.
- Animación de caminar/perseguir y ataque; reacción al daño y muerte si ya existe combate.

### Variantes futuras

- **Lento:** ropa civil, postura caída, movimiento predecible.
- **Rápido:** cuerpo más delgado, inclinación hacia delante y zancada agresiva.
- **Pesado:** ropa de trabajo, chaleco reflectante o casco, cuerpo más robusto y animación lenta.

No hace falta implementar las tres variantes en la primera intervención. Sí hay que evitar que el único zombi sea un cilindro, una cápsula o una figura sin ropa/anatomía.

### IA mínima

- Detectar al jugador dentro de una distancia configurable.
- Perseguir sin atravesar paredes.
- Atacar solo dentro del alcance adecuado y con un intervalo entre golpes.
- Mostrar reacción clara al recibir daño.
- Morir o desactivarse de manera coherente.
- Evitar que los enemigos se queden vibrando contra esquinas o se alejen infinitamente.
- Si la IA ya existe, no reescribirla salvo que sea necesario.

---

## 5. Armas y objetos

Las armas y los objetos deben tener modelos 3D identificables y escalados de forma coherente.

### Primera selección

1. **Puños/guantes:** silueta visible en las manos, ataque corto.
2. **Cuchillo:** hoja y empuñadura distinguibles; ataque cercano.
3. **Escopeta:** cuerpo, cañón, culata y empuñadura legibles; disparo de prueba.
4. **Munición:** caja o cartuchos que se puedan reconocer.
5. **Botiquín:** caja roja/blanca, o diseño equivalente claramente médico.
6. **Vendas:** paquete compacto.
7. **Objeto de misión:** llave, radio o suministro que motive el recorrido.

No hace falta completar todas las armas si el proyecto aún no soporta equipamiento. Prioridad: integrar correctamente una arma cuerpo a cuerpo, un objeto de curación y un pickup.

### Requisitos funcionales

- El objeto tiene que existir como entidad/modelo, no solo como texto en pantalla.
- El jugador debe poder reconocerlo visualmente.
- La interacción debe tener feedback.
- El pickup debe desaparecer o cambiar de estado al recogerlo.
- La interfaz debe reflejar la cantidad o el efecto aplicado.
- No permitir recoger el mismo objeto infinitas veces, salvo que sea una mecánica deliberada.
- Las colisiones y el área de interacción no deben ser más grandes que el objeto de forma absurda.

---

## 6. Biblioteca de assets: prioridad de uso

URL principal: https://threejsassets.com/assets/free

El catálogo declara modelos GLB optimizados para web; en la página consultada indica uso comercial permitido en el nivel gratuito, sin atribución, con descarga mediante cuenta gratuita. La licencia y condiciones deben revisarse de nuevo antes de publicar. No se pueden revender ni redistribuir los archivos de modelo como un paquete de assets independiente.

### Assets concretos que vale la pena inspeccionar

- [Metropolis Road Straight 01](https://threejsassets.com/assets/metropolis-road-straight-01) — calle con marcas y bordes. **Advertencia:** su diseño es de avenida moderna; usar solo si encaja o adaptar el diseño alrededor.
- [Sidewalk 01](https://threejsassets.com/assets/sidewalk-01) — baldosa de vereda con juntas y hueco para árbol.
- [Metropolis Street Tree 01](https://threejsassets.com/assets/metropolis-street-tree-01) — árbol urbano estilizado; comprobar que la copa no desentone con el resto.
- [Transit Shelter 01](https://threejsassets.com/assets/transit-shelter-01) — parada urbana de transporte.
- [Free Apartment Block 01](https://threejsassets.com/assets/apartment-block-01) — bloque de viviendas estilizado.
- [Free Boarded Store](https://threejsassets.com/assets/boarded-store) — local tapiado, útil para un entorno abandonado.
- [Abandoned Bus](https://threejsassets.com/assets/abandoned-bus) — vehículo abandonado; revisar escala y peso.
- [Catálogo de vehículos](https://threejsassets.com/assets/vehicles) — buscar autos y transporte adecuados.
- [Catálogo de edificios](https://threejsassets.com/assets/buildings) — elegir fachadas y edificios coherentes.
- [Catálogo de calles](https://threejsassets.com/assets/roads-streets) — explorar módulos de calle, cruces y veredas.
- [Catálogo de objetos urbanos/interiores](https://threejsassets.com/assets/props-interiors) — mobiliario y objetos de escena.
- [Catálogo completo gratuito](https://threejsassets.com/assets/free) — buscar `ammo`, `crate`, `car`, `bus`, `street`, `tree`, `building`, `store`, `barrier`, `bench`, `trash`, `lamp`.

Los assets de Modular Metropolis pueden ayudar con veredas, calle, árboles, autos, parada y mobiliario, pero su enfoque es un centro urbano moderno. No uses ese pack entero sin criterio: el objetivo son calles de barrio porteño, no un distrito de rascacielos. Combinalo con edificios más bajos o fachadas propias y ajustá paleta/materiales cuando la licencia y el archivo lo permitan.

### Cómo integrar cada asset

Para cada candidato:

1. Abrir su vista previa.
2. Confirmar licencia y formato.
3. Descargarlo a una carpeta local del proyecto, si el acceso lo permite.
4. Inspeccionar el archivo y su tamaño.
5. Cargarlo realmente en el motor.
6. Confirmar orientación, escala, pivote, materiales y texturas.
7. Confirmar que aparece en pantalla.
8. Añadirlo al registro de assets con fuente y licencia.
9. Verificar el rendimiento tras añadirlo.

**Importante para Three.js:** la biblioteca indica que los GLB de su catálogo usan compresión Draco. Si el asset está comprimido, configurá `GLTFLoader` con `DRACOLoader` según la documentación oficial. Si el modelo incluye texturas KTX2/Basis, configurá `KTX2Loader` cuando corresponda. No agregues loaders duplicados ni cambies la configuración existente sin revisar primero el proyecto.

Documentación: https://docs.threejsassets.com/

Si el motor es PlayCanvas u otro, usá su mecanismo compatible de importación; no copies automáticamente el código de carga de Three.js.

### Personajes y zombis

No asumas que esta biblioteca gratuita ofrece los personajes que necesitamos. Su sección de personajes anuncia modelos riggeados como productos de pago. Para los personajes:

- revisar primero si el repositorio ya tiene modelos utilizables;
- luego buscar un modelo gratuito con licencia adecuada;
- si no existe, pedir al usuario el archivo descargado o proponer una herramienta de creación;
- comprobar rig y animaciones antes de comprometerse con un modelo;
- registrar licencia y procedencia.

No sustituir la falta de personaje por un cubo o cápsula y declarar la tarea completada.

---

## 7. Reglas técnicas de rendimiento móvil

El objetivo es navegador de celular. No optimices solo para la computadora del desarrollador.

- Usar modelos y texturas proporcionados al tamaño que se ven en pantalla.
- Evitar cientos de materiales únicos.
- Reutilizar geometrías/materiales cuando sea apropiado.
- Usar instancing para elementos repetidos compatibles (por ejemplo, basura o mobiliario repetido), si el motor y la arquitectura lo permiten.
- Limitar sombras dinámicas y luces en tiempo real.
- Evitar partículas excesivas y postprocesado costoso.
- Mantener un número controlado de enemigos activos.
- Cargar recursos pesados de manera razonable y mostrar un estado de carga si hace falta.
- No bajar la calidad indiscriminadamente; medir primero.
- No asumir un presupuesto universal de polígonos. Evaluar el costo combinado de geometría, materiales, luces, sombras, texturas y draw calls.
- Probar la demo en el teléfono real, incluyendo una sesión de varios minutos.

Objetivo inicial de aceptación: experiencia estable y legible, con aspiración a 30 FPS en el teléfono de prueba. Si no se logra, reportar dispositivo, navegador, síntoma y medición; no inventar métricas.

---

## 8. Interfaz móvil

La interfaz existente puede conservarse si funciona, pero debe revisarse su integración visual.

- El HUD no debe tapar al protagonista, enemigos, pickups ni el objetivo.
- Salud y munición deben tener jerarquía clara.
- Los botones táctiles deben ser grandes, separados y fáciles de pulsar.
- El joystick debe responder al tacto y no bloquear el control de cámara.
- Correr, atacar, interactuar y curar deben tener estados visuales claros.
- El texto del objetivo debe caber en la pantalla sin truncar información crítica.
- El botón de pausa debe ser accesible.
- La interfaz debe adaptarse a diferentes proporciones de pantalla y áreas seguras del dispositivo.
- Evitar efectos de vidrio, brillos o degradados en exceso si dificultan la legibilidad.

No rediseñes el HUD como primera prioridad si el entorno y los modelos todavía son placeholders. Primero consigue una escena 3D coherente; después ajustá el HUD.

---

## 9. Flujo obligatorio de trabajo del agente

### Fase A — Diagnóstico

1. Enumerar archivos y estructura del proyecto.
2. Identificar el motor y su versión.
3. Explicar qué ya funciona.
4. Identificar qué partes visuales son placeholders.
5. Identificar errores de carga, controles, cámara o assets.
6. Verificar si el agente tiene acceso a internet/descargas y si puede inspeccionar imágenes.
7. Crear una lista de cambios pequeños, ordenados por impacto visual y riesgo.

No hagas una migración de motor por comodidad.

### Fase B — Asset audit

Crear `docs/ASSET_AUDIT.md` con una tabla:

| Recurso | Fuente | Licencia comprobada | Archivo local | Carga correcta | Uso |
|---|---|---|---|---|---|

Incluir solo assets que se hayan comprobado. Si la licencia no se verificó, marcar “pendiente”. Si no se pudo descargar, marcar “requiere descarga manual”; no inventar rutas locales.

### Fase C — Integración visual vertical

Implementar en este orden:

1. Una calle y veredas coherentes con assets reales.
2. Fachadas de barrio y mobiliario urbano.
3. Iluminación, cámara, escala y composición.
4. Protagonista con modelo y animación compatibles.
5. Un zombi con modelo, animación y comportamiento funcional.
6. Un pickup de arma y uno de curación.
7. Revisión del HUD y controles.
8. Optimización básica en teléfono.

Después de cada paso, ejecutar el proyecto y verificar el resultado.

### Fase D — Validación

Si hay navegador automatizado o captura de pantalla disponible, abrir la demo y guardar una captura en `docs/screenshots/`. Comparar visualmente con `REFERENCIA_VISUAL.png`, pero recordar que la referencia es una guía artística y no el fondo del juego.

Si no hay capacidad para abrir un navegador o tomar capturas, decirlo explícitamente y proporcionar instrucciones concretas para que el usuario lo pruebe. No afirmar que se comprobó visualmente lo que no se pudo ver.

### Fase E — Entrega

Al final informar:

- archivos modificados;
- assets incorporados y sus fuentes;
- qué quedó realmente funcional;
- qué se probó;
- errores pendientes;
- pasos exactos para ejecutar localmente;
- cómo probarlo desde el teléfono;
- qué tareas siguen pendientes.

---

## 10. Criterios de aceptación visual — no negociables

La escena no se considera lista hasta superar esta lista:

### Entorno

- [ ] La calle tiene calzada, cordones y veredas claramente diferenciados.
- [ ] Las fachadas tienen ventanas, puertas y detalles de escala coherente.
- [ ] Hay señales de barrio urbano porteño, no solo edificios genéricos.
- [ ] Los árboles no son esferas verdes idénticas sobre cilindros visibles.
- [ ] Los autos tienen carrocería y ruedas visibles y proporciones coherentes.
- [ ] Los objetos no flotan ni se hunden de manera evidente.
- [ ] Hay variedad de alturas, colores, distancias y siluetas.
- [ ] La iluminación crea volumen y la escena no parece un plano gris con cajas.
- [ ] La cámara encuadra al personaje y permite leer la ruta.

### Personaje

- [ ] No es un conjunto visible de cubos, cilindros o cápsulas.
- [ ] Tiene ropa, calzado, cabeza, brazos y piernas legibles.
- [ ] Su escala coincide con puertas, autos y veredas.
- [ ] Se mueve con animación compatible o se declara con honestidad que falta.
- [ ] El arma se muestra de manera consistente si la mecánica la usa.

### Zombi

- [ ] Es un modelo humanoide distinguible del protagonista.
- [ ] Tiene ropa y silueta coherentes.
- [ ] Persigue y ataca sin atravesar objetos principales.
- [ ] La reacción al daño se puede percibir.
- [ ] No es una cápsula, esfera o muñeco sin acabado.

### Objetos y jugabilidad

- [ ] Al menos un pickup tiene un modelo reconocible.
- [ ] Recogerlo cambia el estado del juego.
- [ ] El objetivo y la ruta son comprensibles.
- [ ] Los controles táctiles siguen funcionando.
- [ ] No se rompió la misión existente.

### Regla de bloqueo

Si cualquiera de los requisitos principales de personaje, zombi o entorno falla, **no lo marques como “terminado”**. Identificá la causa y resolvé el siguiente problema más importante. No escondas la falta de modelos reales con iluminación, niebla o interfaz.

---

## 11. Qué no hacer

- No entregar únicamente un plan o una lista de ideas.
- No responder “ya está” sin probar el resultado.
- No crear otra escena con cubos como sustituto de modelos.
- No usar un asset de alta complejidad solo porque es gratis; revisá peso y escala.
- No poner rascacielos en todas las calles de barrio.
- No llenar la escena de árboles, conos o cajas para aparentar detalle.
- No usar texturas de baja calidad estiradas sobre edificios grandes.
- No mezclar estilos de assets sin ajustar materiales y paleta.
- No agregar multijugador, crafting ni progresión compleja en esta intervención.
- No borrar funciones existentes para simplificar el código sin explicar el motivo.
- No hardcodear rutas a archivos que no existen.
- No ignorar errores de consola.
- No asumir que un modelo GLB contiene esqueleto o animaciones.
- No declarar que un asset tiene licencia comercial sin revisar su página/licencia.

---

## 12. Primera instrucción que debés ejecutar ahora

Empezá por **auditar el proyecto que ya existe**. No lo destruyas ni lo migres todavía.

Entregá primero un resumen breve con:

1. motor y versión detectados;
2. cómo se ejecuta el proyecto;
3. qué sistemas actuales conviene conservar;
4. qué elementos visuales son placeholders;
5. qué assets reales ya existen;
6. cuáles de los assets sugeridos de threejsassets se pueden descargar e integrar realmente;
7. el orden exacto de los tres primeros cambios.

Después implementá el primer cambio de mayor impacto visual que no ponga en riesgo los sistemas funcionales. Ejecutá el proyecto, comprobá errores y verificá el resultado antes de seguir.

**La meta no es que el código compile solamente. La meta es que el juego se vea y se juegue como una demo 3D estilizada deliberadamente diseñada para móviles, con identidad de Buenos Aires y assets reales integrados correctamente.**
