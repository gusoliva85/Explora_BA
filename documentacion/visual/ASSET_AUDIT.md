# Registro de recursos externos

**Qué es esto.** Todo modelo, textura o sonido que no se haya hecho acá, con
su fuente, su autor, su licencia y la comprobación de que de verdad carga.
Lo pide el capítulo 9 del prompt maestro, y además **CC-BY obliga a dar
crédito**: sin esta tabla, el juego no se puede publicar.

**Regla:** nada entra al repositorio sin una fila acá. Y nada se escribe acá
sin haberlo cargado y visto en pantalla.

---

## Modelos

| Recurso | Fuente | Autor | Licencia | Archivo local | Carga | Uso |
|---|---|---|---|---|---|---|
| Tree | [poly.pizza/m/6Yjt8nIwLsD](https://poly.pizza/m/6Yjt8nIwLsD) | Marc Solà | **CC-BY 3.0** | `public/modelos/arbol-01.glb` (69 KB) | ✅ verificada en pantalla | Árbol de vereda |
| Tree-2 | [poly.pizza/m/cRipmFHCEVU](https://poly.pizza/m/cRipmFHCEVU) | Marc Solà | **CC-BY 3.0** | `public/modelos/arbol-02.glb` (53 KB) | ✅ verificada en pantalla | Árbol de vereda |

**Atribución que hay que mostrar al publicar:**

> Árboles: "Tree" y "Tree-2" de **Marc Solà**, vía Poly Pizza, bajo licencia
> Creative Commons Attribution (CC-BY).

### Lo que se midió antes de elegirlos

| Modelo | Peso | Triángulos | Mallas | Materiales | Draco |
|---|---|---|---|---|---|
| Tree (Marc Solà) | 69 KB | ~930 | 1 | 2 | no |
| Tree-2 (Marc Solà) | 53 KB | ~700 | 1 | 2 | no |
| Trees (Quaternius, CC0) | 3,3 MB | ~32.200 | 5 | 2 | no |
| Birch Trees (Quaternius, CC0) | 4,1 MB | ~27.200 | 5 | 2 | no |
| Pine Trees (Quaternius, CC0) | 97 KB | ~3.700 | 1 | 2 | no |

Los de Quaternius son CC0 —más cómodos de licenciar— y se descartaron igual:
**3 y 4 MB es más que todo el resto del juego junto**, y el juego se abre
desde un enlace en el celular, muchas veces con datos. Los de Marc Solà pesan
122 KB entre los dos y tienen la forma correcta: tronco que se abre en ramas
y copa facetada de varios lóbulos.

### Ajustes que se les hicieron

- **Escala y pivote.** Venían de 1,74 y 2,46 unidades de alto y con el origen
  en el medio del tronco. Se miden al cargar y se escalan al alto pedido
  (5,2 a 7 m), apoyados en el piso.
- **Paleta.** Traían un verde más ácido que el medido de la referencia. Se
  los lleva un 65 % hacia nuestro verde, conservando la variación interna que
  el autor le puso a la copa. El prompt maestro lo pide explícitamente: *"no
  mezclar estilos de assets sin ajustar materiales y paleta"*.
- **El cantero sigue siendo nuestro**, porque tiene que calzar con la vereda.

---

## Lo que NO se pudo bajar, y por qué

| Fuente | Estado | Evidencia |
|---|---|---|
| **threejsassets.com** | ❌ requiere cuenta | Los `.glb` devuelven la página de login: `http 200`, `content-type: text/html`, 54 KB, empiezan con `<!DOC`. Probado con `metropolis-street-tree-01`, `apartment-block-01` y `abandoned-bus` |
| Kenney | ❌ bloquea descargas automáticas | HTTP 403 |
| Quaternius (sitio propio) | ⚠️ sus paquetes están en Google Drive | Se consiguieron igual vía Poly Pizza, que los redistribuye |

Es la biblioteca que nombra el prompt maestro, y **fue un error mío dar por
cerrado el tema ahí**: Poly Pizza sirve `.glb` por URL directa, sin cuenta,
sin compresión Draco y con licencias claras. Si en algún momento hace falta
algo de threejsassets, el único paso que falta es que Gus cree la cuenta
gratuita y baje los archivos a `public/modelos/`.

---

## Texturas

| Recurso | Origen | Licencia | Uso |
|---|---|---|---|
| Carteles de comercio | **Generadas acá**, con canvas, al arrancar | propia | Los 31 carteles de la calle |
| Chapas de calle | **Generadas acá** | propia | Nombres de calle en las esquinas |

No se descarga ninguna textura. Las de los carteles se dibujan en el
navegador: pesan cero en la red.

---

## El banco de assets: `_assets/`

**Qué es.** 461 MB de paquetes que trajo Gus el 7 de noviembre de 2026. Es la
**fuente**, no el destino, y está en `.gitignore` por peso. Decisión **D-33**.

**La regla, y no es negociable.** Nada del código referencia `_assets/`. Lo
que se usa se **copia** a `public/modelos/`, se le agrega una fila en la tabla
de arriba y recién entonces existe para el juego. Una ruta a `_assets/`
funciona en la máquina de Gus y rompe el juego publicado: es la peor clase de
error, porque no se ve hasta que ya está arriba.

### Inventario, medido el 7 de noviembre

| Paquete | Peso | `.glb`/`.gltf` | `.fbx` | Licencia | Para qué |
|---|---|---|---|---|---|
| `skeleton-zombie-free-1.0.0` | 54 MB | 2 | 1 | Propia: comercial embebido, crédito opcional | **Zombi estándar** (100/10) |
| `CryptZombie-Godot-1.0.1` | 18 MB | **0** | **0** | G4G v1.0: comercial, sin atribución | **Zombi agresivo** (120/20) |
| `KayKit_Skeletons_1.1_FREE` | 17 MB | 19 | 32 | **CC0** | Mini-jefes |
| `Bestiary - Dungeon Monsters Kit` | 47 MB | 2 | 2 | Quaternius QAL v1.0 | Jefes — **Fase 15** |
| `Universal Base Characters[Standard]` | 127 MB | 18 | 26 | **CC0** | **Gus** |
| `Universal Animation Library[Standard]` | 61 MB | 2 | 2 | **CC0** | Animaciones de Gus |
| `KayKit_Character_Animations_1.1` | 42 MB | 16 | 16 | **CC0** | Animaciones — alternativa chibi |
| `KayKit_Adventurers_2.0_FREE` | 23 MB | 39 | 70 | **CC0** | Sin uso asignado |
| `Ultimate Gun Pack by Quaternius` | 35 MB | **0** | 55 | **CC0** | **El arma de Gus** |
| `KayKit_FantasyWeaponsBits_1.0_FREE` | 6,3 MB | 31 | 62 | **CC0** | Cuerpo a cuerpo — **no se usa** (D-29) |
| `KayKit_City_Builder_Bits_1.0_FREE` | 9,3 MB | 41 | 82 | **CC0** | Mobiliario y props, **no fachadas** |
| `Realistic Car Pack - Nov 2018` | 7,6 MB | **0** | 7 | **CC0** | **Autos**: bloqueo y cobertura |
| `pvfx-foundry-thirteen-spritesheets` | 16 MB | — | — | **CC0** (hojas y manifiestos) | Fogonazo, impacto, sangre |
| `ExplosionFXFree` | 1,8 MB | — | — | ver pack | Sin uso: la bazooka se fue |

### Los tres hallazgos que cambian el plan

**1. Casi nada viene en `.glb`.** El pack de autos, el de armas y el
CryptZombie vienen **sólo** en `.fbx` o en formato de Godot, y PlayCanvas
carga `.glb`. Hace falta un convertidor por Blender en línea de comandos.
Es la tarea **20.1**, y es bloqueante: sin eso, más de la mitad del banco
no entra.

**2. Los pesos no entran como vienen.** El presupuesto de descarga de todo el
juego son 25 MB, de los cuales 12 para modelos:

| Archivo | Peso | Veredicto |
|---|---|---|
| `skeleton-zombie.glb` | 10,05 MB | ❌ ni cerca |
| `skeleton-zombie-mobile.glb` | 3,97 MB | ⚠️ entra, pero se come un tercio del presupuesto |
| `Bestiary/Imp.glb` | 8,98 MB | ❌ Fase 15, y recortado |
| `Bestiary/Puglin.glb` | 7,49 MB | ❌ Fase 15, y recortado |
| `Universal Base Characters` (`.gltf`) | 7,27 MB | ⚠️ hay que recortar |
| KayKit, personajes | 0,25 a 0,46 MB | ✅ sin problema |
| KayKit, animaciones | 0,55 a 1,39 MB | ✅ sin problema |

Todo lo que entre pasa por Draco y compresión de texturas. Los KayKit son la
referencia de lo que pesa un modelo bien exportado: **veinte veces menos** que
el zombi.

**3. Dos licencias prohíben redistribuir.** `skeleton-zombie` y `CryptZombie`
permiten uso comercial embebido en el juego —que es lo que vamos a hacer— pero
**prohíben redistribuir los archivos como colección de assets**. En la
práctica: el `.glb` convertido va a `public/modelos/` y nunca a una carpeta
que parezca un pack para bajar. Todo el resto es CC0 y no tiene esa
restricción.

### Atribución que hay que mostrar al publicar, además de la de los árboles

> Modelos de **Quaternius** (quaternius.com) y **Kay Lousberg**
> (kaylousberg.com), bajo licencia CC0.
> Zombi: **Blaine Ritz / Winged Relay Asset Studio**.
> Efectos: **PVFX Foundry**, bajo licencia CC0.

Ninguna de las tres exige crédito. Se pone igual: cuesta una línea.
