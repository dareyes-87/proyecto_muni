#!/usr/bin/env bash
# ============================================
# FarmaG - Inicio automatico con deteccion de IP
# ============================================
# Detecta la IP de la red local para que el QR de captura de evidencia
# apunte a una direccion accesible desde el celular.
#
# Uso:
#   ./start.sh                (docker compose up -d)
#   ./start.sh --build        (docker compose up --build -d)
#   ./start.sh down           (docker compose down)
# ============================================

# --- Detectar IP de red local (192.168.x.x o 10.x.x.x) ---
if command -v ip &>/dev/null; then
    # Linux
    LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)' | head -1)
elif command -v ifconfig &>/dev/null; then
    # macOS
    LAN_IP=$(ifconfig | grep -oE '(192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+)' | head -1)
fi

export LAN_IP

if [ -n "$LAN_IP" ]; then
    echo "[FarmaG] IP de red local detectada: $LAN_IP"
    echo "[FarmaG] El QR de captura apuntara a http://$LAN_IP:5173"
else
    echo "[FarmaG] No se detecto IP de red local."
    echo "[FarmaG] El QR usara localhost - no funcionara desde el celular."
fi
echo

# --- Ejecutar docker compose ---
if [ "$1" = "down" ]; then
    shift
    docker compose down "$@"
elif [ $# -eq 0 ]; then
    docker compose up -d
else
    docker compose up "$@"
fi
