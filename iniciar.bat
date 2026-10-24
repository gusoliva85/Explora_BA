@echo off
setlocal EnableDelayedExpansion
title Explorar BA - iniciar

REM ===========================================================================
REM  EXPLORAR BA - arranque en un solo paso
REM ===========================================================================
REM
REM  Uso:
REM     iniciar.bat          servidor local, se abre en este equipo
REM     iniciar.bat lan      ademas accesible desde el celular por WiFi
REM
REM  Que hace, en orden:
REM     1. Libera los puertos del proyecto (mata lo que haya quedado colgado).
REM     2. Instala dependencias si faltan.
REM     3. Levanta el servidor en una ventana aparte.
REM     4. Espera a que responda de verdad, no un tiempo fijo.
REM     5. Abre el navegador.
REM
REM  SOBRE EL BACKEND: este proyecto no tiene. El juego es una pagina estatica
REM  que corre entera en el navegador, y asi esta decidido en el documento 02
REM  (D-01 y D-14: sin cuentas, sin guardado en la nube, progreso en
REM  localStorage). Si algun dia aparece un backend, el paso esta marcado mas
REM  abajo como PASO 3-A y alcanza con descomentarlo.
REM
REM  El archivo esta escrito sin acentos a proposito: la consola de Windows
REM  los rompe segun la pagina de codigos que tenga configurada.
REM ===========================================================================

REM Trabajar siempre en la carpeta del .bat, aunque se lo llame desde otro lado.
cd /d "%~dp0"

REM Puertos que usa el proyecto:
REM   5173  servidor de desarrollo (Vite)
REM   5174  al que se corre Vite si el 5173 esta ocupado
REM   4173  vista previa de la version compilada (npm run preview)
set PUERTOS=5173 5174 4173

set MODO=%~1
if /i "%MODO%"=="lan" (
    set COMANDO=dev:lan
    set ETIQUETA=local + WiFi
) else (
    set COMANDO=dev
    set ETIQUETA=local
)

echo.
echo  ===========================================================
echo   EXPLORAR BA
echo   Arranque %ETIQUETA%
echo  ===========================================================
echo.

REM ---------------------------------------------------------------------------
REM  PASO 1 - Liberar los puertos del proyecto
REM ---------------------------------------------------------------------------
REM  Se matan solo los procesos que estan ESCUCHANDO en los puertos de arriba.
REM  A proposito NO se hace "taskkill /IM node.exe": eso se llevaria puesto
REM  cualquier otro Node que tengas abierto, incluido trabajo sin guardar.

echo  [1/5] Liberando puertos...

REM  Ojo con "netstat -p tcp": ese filtro muestra SOLO IPv4, y Vite escucha
REM  en IPv6 ([::1]:5173). Con -p tcp el puerto parece libre cuando no lo
REM  esta. Por eso se pide netstat sin filtro de protocolo.

set ALGO_CERRADO=0
for %%P in (%PUERTOS%) do (
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr /r /c:":%%P[ ]" ^| findstr /i "LISTENING"') do (
        if not "%%A"=="0" (
            taskkill /F /PID %%A >nul 2>&1
            if !errorlevel! equ 0 (
                echo        puerto %%P liberado ^(proceso %%A^)
                set ALGO_CERRADO=1
            )
        )
    )
)
if "!ALGO_CERRADO!"=="0" echo        no habia nada escuchando, todo libre

REM Un respiro para que el sistema suelte los puertos antes de volver a usarlos.
ping -n 2 127.0.0.1 >nul

REM ---------------------------------------------------------------------------
REM  PASO 2 - Dependencias
REM ---------------------------------------------------------------------------

echo  [2/5] Revisando dependencias...

where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: no se encontro npm. Hace falta instalar Node.js:
    echo         https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo        falta node_modules, instalando. Esto tarda un rato la primera vez.
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: fallo npm install. Mira el detalle de arriba.
        echo.
        pause
        exit /b 1
    )
) else (
    echo        ya estan instaladas
)

REM ---------------------------------------------------------------------------
REM  PASO 3-A - Backend  (NO EXISTE TODAVIA)
REM ---------------------------------------------------------------------------
REM  El juego no tiene servidor propio: toda la logica corre en el navegador.
REM  Si alguna vez se agrega uno (tabla de mejores tiempos, cuentas,
REM  cooperativo), este es el lugar. Quedaria algo asi:
REM
REM      echo  [3/5] Levantando backend...
REM      start "Explorar BA - backend" cmd /k npm run backend
REM      REM y agregar su puerto a la variable PUERTOS de arriba
REM
REM  Mientras tanto, se saltea.

REM ---------------------------------------------------------------------------
REM  PASO 3-B - Servidor del juego
REM ---------------------------------------------------------------------------

echo  [3/5] Levantando el servidor del juego...

REM Ventana aparte para poder ver los errores de compilacion y cortar con
REM Ctrl+C sin matar esta ventana.
start "Explorar BA - servidor" cmd /k "npm run %COMANDO%"

REM ---------------------------------------------------------------------------
REM  PASO 4 - Esperar a que conteste
REM ---------------------------------------------------------------------------
REM  Se consulta el puerto hasta que responde, en vez de esperar un numero
REM  fijo de segundos. La primera vez Vite tarda mas, y una espera fija o se
REM  queda corta o hace perder tiempo siempre.
REM
REM  Se pide la pagina de verdad en vez de probar si el puerto esta abierto.
REM  Dos motivos: un puerto abierto no garantiza que Vite ya pueda servir, y
REM  sobre todo, sin --host Vite escucha SOLO en IPv6 ([::1]). Un socket TCP
REM  de .NET se crea IPv4 por omision, asi que una prueba de puerto contra
REM  "localhost" falla para siempre aunque el servidor este andando
REM  perfecto. Una peticion HTTP resuelve las dos familias y ademas
REM  confirma que la pagina se entrega.

echo  [4/5] Esperando a que el servidor conteste...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$fin = (Get-Date).AddSeconds(90);" ^
  "while ((Get-Date) -lt $fin) {" ^
  "  try {" ^
  "    $r = Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 3;" ^
  "    if ($r.StatusCode -ge 200) { exit 0 }" ^
  "  } catch { Start-Sleep -Milliseconds 400 }" ^
  "};" ^
  "exit 1"

if errorlevel 1 (
    echo.
    echo  El servidor no contesto en 90 segundos.
    echo  Mira la ventana "Explorar BA - servidor": ahi esta el error.
    echo.
    pause
    exit /b 1
)

echo        listo, contesta en el puerto 5173

REM ---------------------------------------------------------------------------
REM  PASO 5 - Abrir el navegador
REM ---------------------------------------------------------------------------

echo  [5/5] Abriendo el navegador...
start "" "http://localhost:5173/"

echo.
echo  ===========================================================
echo   Andando.
echo.
echo   En esta computadora:  http://localhost:5173/
if /i "%MODO%"=="lan" (
    echo.
    echo   Desde el celular, con la misma WiFi, una de estas:
    REM  Se usa PowerShell y no ipconfig: parsear la salida de ipconfig se
    REM  rompe con el idioma de Windows y con las interfaces virtuales.
    powershell -NoProfile -Command ^
      "Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } ^| ForEach-Object { '      http://' + $_.IPAddress + ':5173/' }"
)
echo.
echo   Para ver el HUD de celular desde la PC:
echo       http://localhost:5173/?input=touch
echo.
echo   Para parar todo: cerra la ventana "Explorar BA - servidor",
echo   o volve a correr este mismo archivo (libera los puertos primero).
echo  ===========================================================
echo.

REM Esta ventana ya no hace falta: se cierra sola a los pocos segundos.
REM Se usa ping y no timeout porque timeout falla cuando la entrada esta
REM redirigida, por ejemplo si el .bat se llama desde otro script.
ping -n 7 127.0.0.1 >nul
endlocal
exit /b 0
