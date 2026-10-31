# Paquete de referencia para el agente de programación

1. Abrí la carpeta del juego existente en VS Code.
2. Copiá `PROMPT_MAESTRO.md` y `REFERENCIA_VISUAL.png` a la raíz del repositorio del juego (o dejá este paquete accesible desde el proyecto).
3. Pegá el prompt completo en el agente.
4. Indicá explícitamente que abra la imagen de referencia. Si el agente no puede inspeccionar imágenes, abrila vos y adjuntala en el chat del agente.
5. Dejá que audite el proyecto antes de pedirle una reescritura.
6. Revisá `docs/ASSET_AUDIT.md` y los archivos modificados antes de publicar.

Importante: el prompt no descarga mágicamente los modelos. El agente debe verificar cada descarga, licencia, ruta y carga real. Si el sitio exige una cuenta o una descarga manual, puede necesitar que vos descargues el archivo y lo coloques en la carpeta de assets.
