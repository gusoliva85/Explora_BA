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
