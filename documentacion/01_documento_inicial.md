# Proyecto: supervivencia zombi en Buenos Aires para navegador móvil

**Documento maestro de concepto, herramientas y hoja de ruta**\
**Versión:** 1.0 --- Octubre de 2026\
**Estado:** concepto inicial. Las decisiones técnicas deben validarse
con prototipos y pruebas en dispositivos reales.

## Índice

1.  Resumen ejecutivo
2.  Visión y pilares de diseño
3.  Alcance de la primera versión
4.  Bucle principal y misión de ejemplo
5.  Barrios y construcción del mapa
6.  Estilo gráfico y rendimiento móvil
7.  Herramientas y función de cada una
8.  Bocetos a personajes y objetos 3D
9.  Flujo de producción de arte
10. Arquitectura del juego
11. Enemigos, armas e inventario
12. Controles táctiles
13. Plan de desarrollo por etapas
14. Organización del proyecto
15. Pruebas y publicación
16. Riesgos, costos y licencias
17. Criterios para dar por terminada la demo
18. Lista de tareas inicial
19. Glosario
20. Recursos oficiales
21. Prompts reutilizables

------------------------------------------------------------------------

## 1. Resumen ejecutivo

La idea es crear un **juego de supervivencia zombi en 3D, minimalista y
diseñado desde el comienzo para celulares**, que se juegue desde un
navegador web sin instalar una aplicación tradicional.

El jugador controla a un superviviente que atraviesa calles inspiradas
en barrios de Buenos Aires para llegar de un punto A a un punto B.
Durante el trayecto explora, encuentra armas y suministros, evita o
combate zombis, administra salud y munición y trata de alcanzar un
refugio o punto de extracción.

La primera versión no intentará recrear toda Buenos Aires ni construir
un mundo abierto enorme. Se concentrará en una misión corta y divertida.
El objetivo inicial es comprobar que moverse, mirar, recoger objetos,
luchar y escapar resulte agradable en un teléfono real.

### Decisiones recomendadas

-   **Plataforma:** navegador móvil.
-   **Motor inicial:** PlayCanvas.
-   **Modelado y preparación 3D:** Blender.
-   **Animaciones humanoides de apoyo:** Mixamo, si el modelo y las
    condiciones de uso son compatibles.
-   **Generación opcional de modelos desde imágenes:** Meshy u otra
    herramienta equivalente, siempre revisando el resultado.
-   **Formato 3D a evaluar:** glTF/GLB.
-   **Estilo visual:** low-poly o estilizado, con identidad urbana
    porteña.
-   **Cámara inicial propuesta:** tercera persona, vista senital; evaluar vista
    superior si los controles resultan más cómodos.
-   **Modo inicial:** un jugador. El cooperativo queda para una etapa
    futura.
-   **Primera zona:** unas pocas manzanas ficticias inspiradas en el recorrido real del barrio de Boedo. La idea seria empezar en Avenida independencia 3250 y la meta es llegar a Billinghurst 240.
-   **Escala inicial:** una misión, un protagonista, uno o dos tipos de
    zombi y tres categorías de armas: * Pistola: dispara en un rango directo con daño normal * Cuchillo: Ataca en rango corto, es para emergencias y el daño es grande * Bazooka (es un especial que se habilita cada determinado tiempo en base a una barra de espera): Dispara al zombie mas cercano con un daño enorme en area a donde fue el impacto.

> **Regla principal:** primero lograr una misión pequeña que funcione de
> principio a fin. Después ampliar barrios, enemigos, armas y sistemas.

## 2. Visión y pilares de diseño

### Premisa

Buenos Aires ha quedado parcialmente aislada después de un brote zombi que nacio por culpa de una nueva pizza de Uggis.
El protagonista necesita atravesar calles bloqueadas para alcanzar a sus amigos e ir agrandando el escuadron, tomando como check una estacion de policia / comisaria que puede actuar para cerrar el nivel y empezar el siguiente.

El jugador decide si conviene combatir, correr, buscar suministros o
tomar una ruta alternativa. Los recursos son limitados y el ruido de
ciertas armas puede atraer enemigos.

### Pilares

1.  **Recorridos concretos:** cada misión tiene inicio, destino y una
    razón para avanzar.
2.  **Decisiones rápidas:** luchar, esquivar, correr o explorar.
3.  **Recursos limitados:** munición y curación con valor real.
4.  **Identidad porteña:** fachadas, veredas, persianas, carteles,
    kioscos, colectivos y plazas.
5.  **Lectura visual clara:** distinguir enemigos, objetos y rutas de un
    vistazo.
6.  **Rendimiento móvil:** escenarios contenidos, modelos económicos y
    pocos efectos costosos.
7.  **Desarrollo incremental:** cada etapa deja un prototipo que se
    puede probar.

### Realismo selectivo

No hace falta modelar cada ladrillo, cable o ventana. El reconocimiento
surge de la silueta de los edificios, los colores, las persianas, las
veredas, los carteles y la disposición de las calles. Se prioriza que el
juego sea claro y fluido antes que la fidelidad visual extrema.

## 3. Alcance de la primera versión

### Incluido

-   Un protagonista.
-   Cámara funcional y movimiento.
-   Controles táctiles básicos.
-   Una zona urbana pequeña.
-   Colisiones con paredes y obstáculos grandes.
-   Uno o dos tipos de zombi.
-   Detección, persecución y ataque sencillos.
-   Salud y daño.
-   Ataque cuerpo a cuerpo.
-   Un arma de fuego sencilla o escopeta de prueba.
-   Objetos recogibles, munición y curación.
-   Objetivo de misión y destino.
-   Condiciones de victoria y derrota.
-   Interfaz mínima.
-   Pruebas en un teléfono real.

### Fuera del alcance inicial

-   Toda Buenos Aires o un mundo abierto metropolitano.
-   Multijugador en línea.
-   Cuentas y guardado en la nube.
-   Inventario complejo.
-   Fabricación de armas.
-   Destrucción avanzada de edificios.
-   Vehículos conducibles.
-   Física realista para todos los objetos.
-   Ciclo completo de día y noche.
-   Cientos de zombis simultáneos.
-   Reconstrucción fotogramétrica de cada edificio.
-   IA generativa ejecutándose dentro del juego.

Estos elementos se podrán reconsiderar una vez validada la demo.

## 4. Bucle principal y misión de ejemplo

### Bucle de juego

1.  Recibir un objetivo.
2.  Aparecer en un punto de la zona.
3.  Identificar destino y rutas.
4.  Avanzar por calles.
5.  Encontrar suministros.
6.  Decidir si combatir o evitar zombis.
7.  Administrar salud, munición y curación.
8.  Llegar al destino.
9.  Ver el resultado y desbloquear otra misión o reintentar.

### Misión 001: "Llegar al refugio"

-   **Inicio:** calle residencial inspirada en Boedo.
-   **Destino:** Destino final es la direccion que ya fue proporcionada, pero en el medio van a existir 2 checkpoints.
-   **Obstáculo:** un grupo pequeño de zombis bloquea la ruta directa.
-   **Recursos:** cuchillo, botiquín y munición limitada.
-   **Decisión:** ruta directa peligrosa o desvío más largo con menos
    suministros.
-   **Victoria:** llegar al refugio con vida.
-   **Derrota:** la salud llega a cero.
-   **Reintento:** reiniciar con una distribución controlada de objetos.

La tensión no debe depender solo de poner más enemigos. También puede
surgir de un paso estrecho, un objeto valioso en una zona peligrosa, un
disparo que atrae zombis o una ruta alternativa más segura pero larga.

## 5. Barrios y construcción del mapa

Los barrios serán inspiración y organización temática. La primera misión
debe ser pequeña y legible; no hace falta reproducir cada parcela con
precisión geográfica.

  -----------------------------------------------------------------------
  Zona propuesta          Elementos visuales      Posible desafío
  ----------------------- ----------------------- -----------------------
  Boedo                   Avenidas, comercios,    Primeras misiones y
                          plazas y edificios      rutas alternativas

  Caballito               Casas bajas, locales y  Callejones y encuentros
                          calles residenciales    inesperados

  Almagro                 Edificios densos,       Visibilidad limitada y
                          pasajes y calles        emboscadas
                          estrechas               

  Flores                  Comercios, persianas,   Más enemigos y recursos
                          depósitos y tránsito    disputados, zombies mas agresivos
                          urbano                  
  -----------------------------------------------------------------------

Estos son lineamientos artísticos, no una descripción exacta de cada
calle. La referencia "Pueblo" debe confirmarse antes de fijar un barrio
o zona concreta.

### Kit modular de escenario

Crear piezas reutilizables:

-   segmentos rectos y esquinas de calle;
-   veredas, cordones y cruces peatonales;
-   fachadas, paredes, puertas y ventanas;
-   persianas, carteles y marquesinas;
-   postes, semáforos y luminarias;
-   árboles, bancos y canteros;
-   contenedores, autos y colectivos abandonados;
-   kioscos, paradas de colectivo y barricadas;
-   escombros y bolsas de basura.

Para sugerir Buenos Aires, usar cartelería en español, persianas
metálicas, baldosas de vereda, paradas de colectivo, casas bajas junto a
edificios y comercios locales ficticios. Evitar logos que impliquen
afiliación oficial.

### Cómo construir el primer mapa

1.  Dibujar un plano 2D.
2.  Marcar inicio, destino, obstáculos y rutas alternativas.
3.  Dividir el recorrido en segmentos.
4.  Construirlo con módulos reutilizables.
5.  Añadir colisiones.
6.  Probar que el jugador no atraviese paredes ni quede atrapado.
7.  Colocar enemigos y suministros.
8.  Medir rendimiento en un teléfono.

No hacen falta coordenadas geográficas reales en esta etapa.

## 6. Estilo gráfico y rendimiento móvil

### Estilo recomendado: low-poly estilizado

Geometría sencilla, texturas contenidas, iluminación clara y colores que
ayuden a leer la escena. Puede ser oscuro y atmosférico sin necesitar
realismo extremo.

Reglas visuales:

-   protagonista visible contra el fondo;
-   zombis con siluetas reconocibles;
-   objetos recogibles con iconos o colores claros;
-   contraste suficiente en calles oscuras;
-   pocas partículas y efectos simultáneos;
-   texturas de tamaño moderado;
-   materiales reutilizados;
-   sombras dinámicas limitadas;
-   cámara que no tape al personaje durante el combate.

### Rendimiento

Los objetivos se deben medir, no asumir:

-   conseguir que abra y se juegue sin cierres en un teléfono de
    referencia;
-   aspirar a unos 30 FPS en ese dispositivo, si el hardware lo permite;
-   mantener la carga inicial ligera;
-   limitar los enemigos activos;
-   reducir texturas o efectos si la memoria o la GPU lo requieren;
-   probar desde el comienzo en un teléfono real, no solo en escritorio.

No existe un límite universal de polígonos que garantice rendimiento.
Hay que medir la escena y optimizar el cuello de botella real.

## 7. Herramientas y función de cada una

No es necesario instalar todas al comienzo. Las herramientas resuelven
problemas distintos.

### 7.1 PlayCanvas --- motor del juego

**Función:** construir y ejecutar el videojuego web.

Se utilizaría para organizar escenas, colocar modelos, configurar cámara
e iluminación, implementar movimiento y colisiones, controlar enemigos,
gestionar armas e ítems, construir interfaz y publicar la experiencia
web.

-   Sitio: <https://playcanvas.com/>
-   Documentación: <https://developer.playcanvas.com/>

Se propone porque el objetivo es un juego 3D que funcione en navegador
móvil. Verificar la compatibilidad del navegador, los dispositivos
objetivo, las opciones de publicación y las condiciones vigentes del
servicio.

### 7.2 Blender --- modelado y preparación 3D

**Función:** crear o modificar personajes, armas, edificios y objetos;
limpiar modelos generados por IA; revisar mallas y materiales; preparar
esqueletos y animaciones; exportar modelos.

-   Sitio: <https://www.blender.org/>
-   Manual: <https://docs.blender.org/manual/en/latest/>

No hace falta modelar todo desde cero. Blender también sirve como
herramienta de corrección y preparación.
**IMPORTANTE: Mas adelante voy a subir modelos que se van a tener que usar dentro de la creacion y utilizacion dentro del juego** 

### 7.3 Mixamo --- animaciones humanoides

**Función:** obtener animaciones de caminar, correr, atacar o recibir
daño para personajes compatibles.

-   Sitio: <https://www.mixamo.com/>

Mixamo aporta movimientos; el juego decide cuándo ejecutarlos. Hay que
comprobar compatibilidad del esqueleto y condiciones de uso vigentes.

### 7.4 Meshy --- generación de modelos desde texto o imágenes

**Función:** crear una primera aproximación 3D a partir de un boceto o
una descripción, según las funciones disponibles.

-   Sitio: <https://www.meshy.ai/>

Puede ayudar a generar conceptos de personajes, armas y objetos. No
garantiza fidelidad exacta al dibujo ni una malla lista para animar. El
resultado puede requerir limpieza, reducción de polígonos, materiales
nuevos, rigging y pruebas. Revisar las condiciones de licencia,
privacidad y uso comercial antes de depender del servicio.
**IMPORTANTE: Adjunte la imagen del protagonista que se llama GUS, se encuentra en la carpeta documentacion\personajes\Gus.jpeg**

### 7.5 SuperSplat --- edición de Gaussian Splats

-   Editor: <https://superspl.at/editor>
-   Documentación:
    <https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/>

Sirve para editar escenas reconstruidas mediante Gaussian Splatting. Es
opcional y no reemplaza a Blender ni al motor del juego.

### 7.6 gsplat --- biblioteca de desarrollo

-   Documentación: <https://docs.gsplat.studio/main/>
-   Repositorio: <https://github.com/nerfstudio-project/gsplat>

Biblioteca orientada a procesos técnicos de entrenamiento y renderizado
de Gaussian Splatting, principalmente en el ecosistema Python. No es
necesaria para la primera versión; se consideraría si más adelante se
desarrolla un proceso propio de reconstrucción.

### 7.7 CesiumJS --- visualización geoespacial

-   Sitio: <https://cesium.com/platform/cesiumjs/>
-   Tutoriales: <https://cesium.com/learn/cesiumjs-learn/>

Permite mostrar mapas, terreno, edificios y datos geográficos en 3D.
Puede ser útil para una ciudad georreferenciada de mayor escala, pero es
innecesario para unas pocas manzanas construidas con módulos.

### 7.8 Git y GitHub --- control de versiones

-   Git: <https://git-scm.com/>
-   GitHub: <https://github.com/>

Permiten guardar versiones, comparar cambios y colaborar. Conviene
registrar código, documentación y configuraciones desde el inicio. Los
archivos 3D grandes pueden requerir una estrategia de almacenamiento
específica. Nunca subir claves o credenciales.

### Orden recomendado de adopción

1.  Crear el proyecto en PlayCanvas.
2.  Instalar Blender.
3.  Probar un modelo provisional.
4.  Probar una animación compatible.
5.  Incorporar generación 3D por IA cuando sea necesaria.
6.  Dejar gsplat y CesiumJS para etapas futuras.

## 8. Bocetos a personajes y objetos 3D

### Sí, se pueden usar dibujos a mano

Los bocetos pueden definir protagonista, zombis, ropa, mochila, guantes,
cuchillo, escopeta, botiquines, herramientas, edificios y mobiliario
urbano. No necesitan ser profesionales, pero deben ser claros.

### Ficha de personaje

Registrar para cada personaje:

-   nombre provisional y función;
-   altura y complexión relativas;
-   ropa, calzado, pelo y accesorios;
-   colores principales;
-   rasgos que deben conservarse;
-   elementos que pueden variar;
-   vistas frontal, lateral y posterior;
-   animaciones necesarias.

### Cómo dibujar para facilitar la conversión

1.  Usar fondo blanco o uniforme.
2.  Dibujar el cuerpo completo, sin cortar cabeza ni pies.
3.  Añadir vista frontal.
4.  Añadir perfil y espalda cuando sea posible.
5.  Separar objetos que deban ser modelos independientes.
6.  Anotar colores y materiales.
7.  Señalar los detalles imprescindibles.
8.  Evitar que los brazos, piernas o accesorios se oculten entre sí.
9.  Para un personaje animable, preparar una pose neutral con los brazos
    ligeramente separados del torso.
10. Guardar el dibujo original y todas las versiones generadas.

Una ilustración en perspectiva ayuda a comunicar estilo; varias vistas
claras ayudan a inferir proporciones y zonas ocultas.

### Flujo del personaje

**Boceto → generación o modelado → limpieza en Blender → rigging →
animaciones → exportación → PlayCanvas → prueba.**

1.  Preparar una ficha visual.
2.  Generar una primera versión con una herramienta de imagen a 3D, si
    se elige ese camino.
3.  Comparar silueta, ropa y rasgos con el dibujo.
4.  Corregir malla, proporciones y materiales.
5.  Preparar un esqueleto compatible.
6.  Revisar los pesos de deformación si se usa rigging tradicional.
7.  Probar caminar, correr, atacar y recibir daño.
8.  Exportar en un formato compatible.
9.  Importar en PlayCanvas.
10. Probar en el entorno real del juego.

### Flujo de armas y objetos

1.  Dibujar el objeto de perfil.
2.  Añadir otra vista si la forma es compleja.
3.  Generar o modelar una malla sencilla.
4.  Corregir escala y geometría en Blender.
5.  Crear materiales simples.
6.  Definir dónde se sostiene o se muestra.
7.  Exportar a GLB/glTF.
8.  Integrar en PlayCanvas.
9.  Programar recoger, equipar, usar o consumir.

### Ropa intercambiable

Puede formar parte de la malla del personaje o ser una pieza separada.
Las prendas separadas facilitan la personalización, pero deben ajustarse
al cuerpo y no atravesarse durante las animaciones. Para la primera demo
conviene una vestimenta fija.

### Cómo evitar un resultado genérico

-   mantener una ficha visual de cada personaje;
-   definir una paleta común;
-   conservar rasgos reconocibles;
-   usar varias vistas;
-   corregir manualmente los detalles principales;
-   mantener una guía de estilo compartida;
-   evitar mezclar modelos de estilos incompatibles;
-   guardar versiones y registrar cambios.

La IA genera una base; la revisión y la integración hacen que el
resultado sea utilizable.

## 9. Flujo de producción de arte

### Guía de estilo

Definir proporciones, nivel de detalle, resolución de texturas, paleta,
iluminación, apariencia de zombis, lenguaje visual de armas, carteles y
escala de puertas/veredas.

### Escena de prueba

Preparar una calle, una fachada, una vereda, un personaje, un zombi, un
objeto recogible y una fuente de iluminación. Así se comprueba que
escala y estilo sean compatibles antes de crear muchos recursos.

### Convención de nombres

Ejemplos:

-   `CHR_Player_Base`
-   `CHR_Zombie_Standard`
-   `WPN_Knife_01`
-   `WPN_Shotgun_01`
-   `ITM_Medkit_01`
-   `ENV_Building_Facade_01`
-   `ENV_Street_Straight_01`
-   `ENV_Bus_Stop_01`

No son nombres obligatorios; la consistencia es lo importante.

### Revisión técnica de cada recurso

Comprobar número de polígonos, materiales, resolución y peso de
texturas, jerarquía, escala, animaciones, exportación y rendimiento en
el dispositivo de referencia. Medir antes de optimizar y cambiar una
variable por vez.

## 10. Arquitectura del juego

La arquitectura debe dividirse en sistemas pequeños. Los siguientes son
nombres propuestos, no componentes preexistentes:

-   **GameManager:** estado general de la partida.
-   **PlayerController:** movimiento y entradas.
-   **CameraController:** seguimiento y control de cámara.
-   **HealthComponent:** salud y daño.
-   **EnemyAI:** detección, persecución y ataque.
-   **WeaponController:** arma equipada y ataque.
-   **InventorySystem:** recursos del jugador.
-   **PickupItem:** objetos recogibles.
-   **MissionManager:** objetivo y progreso.
-   **UIManager:** salud, munición, inventario y mensajes.
-   **AudioManager:** sonidos y volumen.
-   **SpawnManager:** aparición controlada de enemigos y recursos.

### Estados de la partida

-   `MENU`
-   `LOADING`
-   `PLAYING`
-   `PAUSED`
-   `MISSION_COMPLETE`
-   `GAME_OVER`

El jugador no debería seguir recibiendo daño en pantallas de resultado o
durante la pausa.

### Estados del zombi

-   `IDLE`: quieto o patrullando.
-   `ALERT`: detectó al jugador o un ruido.
-   `CHASE`: persigue al jugador.
-   `ATTACK`: intenta atacar si está a distancia.
-   `STUNNED`: interrumpido temporalmente, si el diseño lo requiere.
-   `DEAD`: deja de atacar y perseguir.

### Detección y colisiones

La primera versión puede usar distancia de detección y una comprobación
simple de línea de visión. Más adelante se puede agregar detección por
ruido y búsqueda del último lugar donde se vio al jugador.

Las colisiones deben cubrir paredes, edificios, vehículos grandes,
jugador, zombis, objetos y ataques. No todos los adornos necesitan
colisión. Los enemigos necesitan límites de persecución para no alejarse
demasiado ni quedar atrapados.

### Configuración

Separar valores que se ajustan con frecuencia ---salud, velocidad, daño,
distancia de detección y munición--- de la lógica principal siempre que
la arquitectura lo permita. Esto facilita balancear el juego.

## 11. Enemigos, armas e inventario

### Protagonista

Ajustar con pruebas velocidad al caminar y correr, salud máxima, giro,
recuperación, distancia de interacción, arma equipada y recursos
disponibles. No fijar valores definitivos sin jugarlo en el teléfono.

### Zombi estándar

-   velocidad moderada;
-   detección a corta o media distancia;
-   ataque cuerpo a cuerpo;
-   animaciones de caminar y correr;
-   reacción al recibir daño;
-   muerte y desactivación de la IA.

Después se pueden crear variantes lentas y resistentes, rápidas y
frágiles, sensibles al ruido o especiales para finales de misión.

### Armas iniciales

  -----------------------------------------------------------------------
  Arma                    Ventaja                 Limitación
  ----------------------- ----------------------- -----------------------
  Pistola                 Largo alcance y mucha   Puede quedarse sin balas
                          munición    

  Cuchillo                Ataque cuerpo a cuerpo  Alcance corto
                          rápido                  

  Bazzoka                Alto impacto con daño    Munición limitada 1 solo dispoaro y
                         en area al impactar      con espera al proximo disparo (30 segundos)
  -----------------------------------------------------------------------

Los valores de daño, alcance y cadencia deben establecerse mediante
pruebas. No hace falta una simulación balística compleja en la primera
versión.

### Curación y recursos

Primera versión:

-   salud;
-   munición;
-   vendas o botiquines.

Futuro opcional:

-   llaves;
-   baterías;
-   objetos de misión;
-   fabricación;
-   mejoras permanentes.

Al recoger un objeto, el jugador se acerca y activa una interacción
sencilla. El objeto desaparece del mundo y actualiza el inventario. En
celular puede aparecer un botón contextual cuando el jugador está cerca.

### Ruido

El disparo de la escopeta puede emitir un evento de ruido que atraiga
enemigos cercanos. Esto crea una decisión táctica: resolver un peligro
ahora puede generar otro después.

## 12. Controles táctiles

### Distribución propuesta

-   joystick virtual a la izquierda;
-   arrastre a la derecha para la cámara;
-   botón de ataque;
-   botón de correr o esquivar;
-   botón contextual de recoger/interactuar;
-   botón para cambiar de arma;
-   botón de curación;
-   indicadores compactos de salud y munición.

### Reglas de usabilidad

-   botones grandes y separados;
-   evitar controles esenciales pegados al borde;
-   textos legibles;
-   cámara estable;
-   sensibilidad ajustable;
-   feedback al tocar;
-   evitar que joystick y cámara se activen simultáneamente por error.

### Cámara

La tercera persona muestra al personaje y su equipo, pero puede tapar la
vista en calles estrechas y exige resolver colisiones de cámara. Una
vista superior permite ver más rutas y enemigos y puede simplificar los
controles. Se debe elegir con una prueba real, no solo por preferencia
estética.

Se propone empezar en horizontal, pero hay que verificar el
comportamiento en navegadores y dispositivos objetivo; no asumir que
todos permiten forzar orientación de la misma manera.

## 13. Plan de desarrollo por etapas

### Etapa 0 --- Definición

-   confirmar cámara y estilo;
-   elegir teléfono de prueba;
-   dibujar el mapa de la primera misión;
-   preparar ficha visual del protagonista;
-   definir el zombi estándar;
-   listar objetos iniciales;
-   crear repositorio y documentación.

**Criterio de salida:** la primera misión se puede describir en una
página y tiene un alcance controlado.

### Etapa 1 --- Escena y movimiento

-   crear proyecto en PlayCanvas;
-   construir suelo, paredes y calle;
-   añadir un modelo provisional;
-   implementar movimiento y cámara;
-   añadir colisiones;
-   probar en un teléfono.

**Criterio de salida:** el jugador recorre la zona sin atravesar paredes
ni perder control.

### Etapa 2 --- Primer enemigo

-   importar modelo y animaciones;
-   implementar estados de IA;
-   detectar, perseguir y atacar;
-   añadir salud y daño;
-   mostrar derrota.

**Criterio de salida:** un encuentro con un zombi funciona
repetidamente.

### Etapa 3 --- Combate

-   implementar puños o cuchillo;
-   definir alcance y tiempo de ataque;
-   detectar impactos;
-   aplicar daño;
-   reproducir animaciones y feedback;
-   gestionar muerte del zombi.

**Criterio de salida:** el jugador entiende cuándo acierta y puede
derrotar al enemigo.

### Etapa 4 --- Objetos

-   colocar objetos;
-   detectar proximidad;
-   implementar recogida;
-   añadir munición y curación;
-   actualizar interfaz;
-   definir límites.

**Criterio de salida:** recoger y usar un objeto produce el efecto
esperado.

### Etapa 5 --- Misión completa

-   definir inicio y destino;
-   colocar rutas y obstáculos;
-   distribuir enemigos y recursos;
-   implementar extracción;
-   añadir victoria, derrota y reinicio;
-   ajustar dificultad.

**Criterio de salida:** una persona nueva entiende el objetivo y puede
completar o perder la misión.

### Etapa 6 --- Arte original

-   preparar guía visual;
-   diseñar protagonista y zombi;
-   crear armas e ítems;
-   construir módulos urbanos;
-   añadir carteles y detalles porteños;
-   corregir modelos en Blender;
-   revisar escala y materiales.

**Criterio de salida:** los recursos tienen estilo coherente y no
perjudican el rendimiento.

### Etapa 7 --- Optimización

-   medir rendimiento;
-   reducir costes de escena;
-   optimizar texturas;
-   probar carga y sesiones repetidas;
-   probar tamaños de pantalla;
-   comprobar controles;
-   revisar errores;
-   comprobar victoria, derrota y reinicio.

**Criterio de salida:** la misión se juega de principio a fin en el
dispositivo de referencia sin errores críticos.

### Etapa 8 --- Publicación de demo

-   preparar página de inicio;
-   publicar en alojamiento compatible;
-   comprobar carga y recursos;
-   probar enlace desde el teléfono;
-   registrar errores y comentarios;
-   conservar una versión estable.

El proceso exacto depende del flujo vigente de PlayCanvas y del
alojamiento elegido.

### Etapa 9 --- Ampliación

Solo después de validar la demo: nuevas manzanas, zombis, armas,
misiones, sonido, progresión, guardado y evaluación de multijugador.

## 14. Organización del proyecto

Estructura conceptual sugerida:

``` text
juego-zombi-buenos-aires/
├── README.md
├── docs/
│   ├── vision.md
│   ├── diseno-del-juego.md
│   ├── plan-de-desarrollo.md
│   ├── guia-visual.md
│   ├── arquitectura.md
│   └── decisiones-tecnicas.md
├── referencias/
│   ├── bocetos/
│   ├── personajes/
│   ├── armas/
│   ├── escenarios/
│   └── mapas/
├── arte/
│   ├── personajes/
│   ├── zombis/
│   ├── armas/
│   ├── objetos/
│   ├── edificios/
│   └── mobiliario-urbano/
├── animaciones/
├── audio/
├── misiones/
├── codigo/
│   ├── player/
│   ├── camera/
│   ├── enemies/
│   ├── combat/
│   ├── inventory/
│   ├── missions/
│   └── ui/
├── pruebas/
└── licencias/
    └── registro-de-recursos.md
```

Es una guía conceptual, no una exigencia de que todos estos directorios
existan dentro de PlayCanvas. La organización real dependerá del flujo
de trabajo elegido.

### Registro de recursos

Para cada modelo, textura, animación, sonido o fuente externa, registrar
nombre, autor/proveedor, URL, fecha, licencia, modificaciones y uso
previsto. Así se evita descubrir al final que un recurso no se puede
distribuir.

## 15. Pruebas y publicación

### Pruebas funcionales

-   ¿El personaje se mueve correctamente?
-   ¿La cámara evita atravesar paredes?
-   ¿Los controles responden al tacto?
-   ¿Las colisiones funcionan?
-   ¿Los zombis detectan y persiguen?
-   ¿El daño se aplica correctamente?
-   ¿Los objetos se recogen una sola vez?
-   ¿Munición y curación se actualizan bien?
-   ¿La misión reconoce la llegada?
-   ¿Se puede reiniciar sin duplicar enemigos u objetos?

### Pruebas de usabilidad

-   ¿Se entiende el objetivo?
-   ¿Los botones se pueden tocar sin tapar la acción?
-   ¿Se distingue un objeto del decorado?
-   ¿Se entiende por qué el jugador recibió daño?
-   ¿Se reconoce la dirección del destino?
-   ¿La cámara marea?
-   ¿Los textos son legibles?

### Pruebas de rendimiento

Medir en el teléfono de referencia tiempo de carga, fluidez,
comportamiento con varios enemigos, memoria si es posible, reinicios,
temperatura y consumo en sesiones largas. Si hay problemas, reducir una
variable por vez: enemigos, complejidad de modelos, texturas, efectos,
sombras u objetos visibles.

### Publicación web

-   probar URL desde el teléfono;
-   comprobar que todos los recursos cargan;
-   considerar restricciones del navegador para audio automático;
-   probar orientación horizontal y vertical;
-   mostrar mensaje claro si el dispositivo no es compatible;
-   no exponer claves ni credenciales en el código publicado.

## 16. Riesgos, costos y licencias

  Riesgo                          Mitigación
  ------------------------------- --------------------------------
  Mapa demasiado grande           Una misión y pocas manzanas
  Modelo IA sin revisar           Limpieza, rigging y pruebas
  Gaussian Splatting para todo    Usarlo solo donde aporte valor
  No probar en teléfono           Probar desde la primera etapa
  Multijugador demasiado pronto   Primero juego individual
  Recurso sin licencia adecuada   Mantener registro de licencias
  Muchos sistemas simultáneos     Etapas con criterios de salida
  Controles incómodos             Pruebas táctiles reales

Los precios, límites gratuitos y licencias pueden cambiar. Verificar las
condiciones vigentes de cada servicio antes de comprometer el proyecto.

Para modelos y animaciones, revisar si se permite uso comercial,
modificación y redistribución dentro de un videojuego, y si se exige
atribución. Con bocetos propios, conservar originales y versiones. Si se
fotografían calles reales, revisar privacidad, permisos y condiciones de
los datos; evitar publicar innecesariamente rostros, matrículas o
interiores privados.

## 17. Criterios para dar por terminada la demo

-   [ ] Abre desde una URL en un teléfono de prueba.
-   [ ] Muestra una calle urbana pequeña.
-   [ ] Permite mover al protagonista con controles táctiles.
-   [ ] Permite controlar la cámara.
-   [ ] Impide atravesar paredes principales.
-   [ ] Incluye al menos un zombi funcional.
-   [ ] El zombi puede perseguir y dañar.
-   [ ] El jugador puede atacar.
-   [ ] Hay salud visible.
-   [ ] Se puede recoger al menos un objeto.
-   [ ] Existe una condición de victoria.
-   [ ] Existe una condición de derrota.
-   [ ] Se puede reiniciar la misión.
-   [ ] El objetivo es comprensible.
-   [ ] No hay errores críticos que impidan completar la misión.
-   [ ] El rendimiento se probó en un dispositivo real.

La primera demo puede utilizar modelos provisionales. Lo importante es
validar la experiencia central antes de invertir mucho tiempo en arte
definitivo.

## 18. Lista de tareas inicial

### Antes de programar

-   [ ] Confirmar cámara inicial.
-   [ ] Elegir teléfono de prueba.
-   [ ] Dibujar el plano de la misión.
-   [ ] Definir protagonista en una ficha visual.
-   [ ] Definir zombi estándar.
-   [ ] Listar los objetos iniciales.
-   [ ] Crear repositorio y guardar esta documentación.

### Primera sesión

-   [ ] Crear proyecto en PlayCanvas.
-   [ ] Crear escena vacía.
-   [ ] Añadir suelo, paredes y calle.
-   [ ] Añadir modelo provisional.
-   [ ] Configurar cámara y movimiento.
-   [ ] Implementar colisiones.
-   [ ] Abrir desde el teléfono.
-   [ ] Registrar problemas.

### Después de validar movimiento

-   [ ] Añadir un zombi.
-   [ ] Implementar persecución y ataque.
-   [ ] Añadir salud.
-   [ ] Añadir arma cuerpo a cuerpo.
-   [ ] Añadir recogida de objetos.
-   [ ] Crear destino.
-   [ ] Implementar victoria, derrota y reinicio.
-   [ ] Reemplazar gradualmente los modelos provisionales.

## 19. Glosario

-   **3DGS / Gaussian Splatting:** técnica de representación de escenas
    3D mediante gaussianas, útil para reconstrucciones visuales
    realistas.
-   **Animación:** secuencia de movimientos de un personaje u objeto.
-   **Backend:** parte que se ejecuta en un servidor; puede gestionar
    cuentas, guardado o multijugador.
-   **Colisión:** detección de contacto entre objetos del juego.
-   **glTF/GLB:** formatos para transferir modelos 3D, materiales y,
    según el archivo, animaciones.
-   **Fotogrametría:** reconstrucción de geometría a partir de
    fotografías superpuestas.
-   **Game loop:** ciclo que procesa entradas, lógica y representación.
-   **Gemelo digital:** representación digital de un sistema real que
    puede combinar geometría y datos actualizados.
-   **IA de enemigos:** reglas y estados que controlan el comportamiento
    de los enemigos.
-   **Low-poly:** estilo o enfoque de modelado con geometría
    relativamente simple.
-   **Malla:** estructura geométrica que define la superficie de un
    objeto 3D.
-   **Motor de videojuegos:** entorno que coordina escenas, entrada,
    cámara, física, renderizado y lógica.
-   **Rigging:** preparación de un esqueleto y su relación con una malla
    para animar un personaje.
-   **Textura:** imagen usada para definir color u otras propiedades de
    una superficie.
-   **UV:** coordenadas que relacionan una superficie 3D con una
    textura.
-   **Weight painting:** asignación de la influencia de cada hueso sobre
    partes de la malla.

## 20. Recursos oficiales

### Motor y producción

-   PlayCanvas: <https://playcanvas.com/>
-   Documentación PlayCanvas: <https://developer.playcanvas.com/>
-   Blender: <https://www.blender.org/>
-   Manual Blender: <https://docs.blender.org/manual/en/latest/>
-   Mixamo: <https://www.mixamo.com/>
-   Meshy: <https://www.meshy.ai/>

### Gaussian Splatting y ciudades 3D

-   SuperSplat: <https://superspl.at/editor>
-   Documentación de SuperSplat:
    <https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/>
-   gsplat: <https://docs.gsplat.studio/main/>
-   Repositorio gsplat: <https://github.com/nerfstudio-project/gsplat>
-   CesiumJS: <https://cesium.com/platform/cesiumjs/>
-   Tutoriales CesiumJS: <https://cesium.com/learn/cesiumjs-learn/>
-   PLATEAU, modelos urbanos de Japón:
    <https://www.mlit.go.jp/plateau/en/>

### Control de versiones

-   Git: <https://git-scm.com/>
-   GitHub: <https://github.com/>

Los enlaces son puntos de partida. Verificar la documentación,
disponibilidad de funciones, precios y licencias vigentes antes de
adoptar una herramienta.

## 21. Prompts reutilizables

Estos prompts sirven como instrucciones base para trabajar con un
asistente de IA. No sustituyen la especificación técnica ni garantizan
que el resultado funcione sin pruebas.

### 21.1. Analizar un boceto de personaje

> Analizá este boceto para un videojuego 3D de supervivencia zombi
> ambientado en Buenos Aires. Describí silueta, proporciones, ropa,
> accesorios, paleta de colores y rasgos distintivos. Separá los
> detalles imprescindibles de los que se pueden simplificar para un
> estilo low-poly apto para celulares. Indicá qué vistas adicionales
> hacen falta. No inventes detalles que contradigan el dibujo.

### 21.2. Preparar un prompt de generación 3D

> A partir de la referencia adjunta, generá una propuesta de personaje
> 3D estilizado low-poly para un videojuego de supervivencia zombi en
> navegador móvil. Conservá silueta, vestimenta, colores y accesorios
> principales. Usá formas limpias, materiales simples y detalles
> legibles a distancia. Prepará una pose neutral apropiada para rigging
> y evitá accesorios innecesarios. El resultado será revisado y
> optimizado en Blender; no asumas que la malla está lista para
> producción.

### 21.3. Crear un objeto

> Diseñá un modelo 3D sencillo de \[NOMBRE DEL OBJETO\] a partir del
> boceto adjunto. Mantené las proporciones y detalles que identifican al
> objeto. Usá geometría y materiales apropiados para un juego low-poly
> en navegador móvil. Debe ser claro desde la cámara de juego y fácil de
> recoger o equipar. Indicá qué detalles no se pueden deducir con
> certeza del dibujo.

### 21.4. Diseñar una misión

> Diseñá una misión breve para un juego de supervivencia zombi 3D
> ambientado en una zona inspirada en Buenos Aires. El jugador debe ir
> del punto A al B. Incluí objetivo, mapa conceptual, ruta principal y
> alternativa, obstáculos, enemigos, recursos, victoria, derrota y
> dificultad. Limitá el alcance a una misión construible con piezas
> modulares y probada en un teléfono. No propongas un mundo abierto
> enorme.

### 21.5. Pedir código de una función

> Ayudame a implementar \[FUNCIÓN\] para el prototipo en PlayCanvas.
> Antes de escribir código, identificá la versión y el flujo de proyecto
> que estamos usando, los componentes existentes y las dependencias.
> Proponé una implementación pequeña, explicá dónde va, cómo se conecta
> y cómo probarla. No inventes APIs ni supongas que un script ya existe.
> Incluí pruebas manuales y posibles errores.

### 21.6. Optimizar el juego móvil

> Revisá el juego 3D para navegador móvil. Priorizá problemas medibles
> de rendimiento, carga, memoria, controles táctiles y legibilidad.
> Separá problemas confirmados de hipótesis. Proponé cambios pequeños y
> verificables, explicá cómo medir cada mejora y evitá reducir calidad
> visual sin evidencia.

------------------------------------------------------------------------

## Cierre: estrategia general

El orden recomendado es:

1.  Movimiento y cámara.
2.  Un enemigo funcional.
3.  Combate y salud.
4.  Objetos e inventario mínimo.
5.  Una misión completa.
6.  Arte original basado en bocetos.
7.  Identidad visual porteña.
8.  Optimización y publicación.
9.  Más barrios, misiones y sistemas.

Las herramientas avanzadas se incorporan cuando resuelven una necesidad
real, no solo porque estén disponibles.

**Primer hito:** abrir un enlace en un celular, recorrer una pequeña
calle, encontrar un arma, enfrentarse a un zombi y llegar a un refugio.
Todo lo demás se construye sobre esa base comprobada.
