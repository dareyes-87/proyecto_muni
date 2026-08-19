@echo off
REM ============================================
REM FarmaG - Inicio automatico con deteccion de IP
REM ============================================
REM Detecta la IP de la red local (Wi-Fi o Ethernet) para que el QR
REM de captura de evidencia apunte a una direccion accesible desde el celular.
REM
REM Uso:
REM   start.cmd                  (docker compose up -d)
REM   start.cmd --build          (docker compose up --build -d)
REM   start.cmd down             (docker compose down)
REM ============================================

REM --- Detectar IP de red local (192.168.x.x o 10.x.x.x) ---
set LAN_IP=
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(192\.168\.|10\.)' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress"') do set LAN_IP=%%i

REM --- Detectar modo (produccion o desarrollo) ---
set FARMAG_PORT=5173
if exist .env (
    for /f "tokens=1,* delims==" %%a in ('findstr /I "FRONTEND_TARGET" .env') do (
        echo %%b | findstr /I "production" >nul 2>&1
        if not errorlevel 1 set FARMAG_PORT=80
    )
)

if defined LAN_IP (
    echo [FarmaG] IP de red local detectada: %LAN_IP%
    if "%FARMAG_PORT%"=="80" (
        echo [FarmaG] Modo PRODUCCION - acceder desde: http://%LAN_IP%
    ) else (
        echo [FarmaG] Modo DESARROLLO - acceder desde: http://%LAN_IP%:5173
    )
    echo [FarmaG] El QR de captura usara esta IP automaticamente.
) else (
    echo [FarmaG] No se detecto IP de red local.
    echo [FarmaG] El QR usara localhost - no funcionara desde el celular.
)

echo.

REM --- Ejecutar docker compose con los argumentos recibidos ---
if "%~1"=="down" (
    docker compose down %2 %3 %4
) else if "%~1"=="" (
    docker compose up -d
) else (
    docker compose up %*
)
