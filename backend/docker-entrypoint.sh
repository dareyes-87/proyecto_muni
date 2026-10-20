#!/bin/sh
# ============================================================
# Arranque seguro del backend FarmaG
# ============================================================
# El servidor de la municipalidad se actualiza solo (git pull + docker compose
# up --build) y nadie puede intervenir en sitio. Por eso este arranque:
#
#   1. Saca un respaldo de la base ANTES de tocar el esquema.
#   2. Aplica cambios de esquema SOLO con migraciones versionadas
#      (prisma/migrations), que se revisan en el pull request.
#   3. NUNCA usa `db push --accept-data-loss`. Ningún paso de arranque puede
#      borrar datos por sí solo.
#   4. Si algo falla, levanta la API igual (con el esquema que ya había) y deja
#      constancia en backups/ESTADO_ARRANQUE.txt, en vez de quedar caída.
#
# La primera vez que corre sobre una base creada con `db push` (la del servidor
# hoy), la registra como migración 0_init ("baseline") SOLO si coincide
# exactamente con schema.prisma.
#
# Variables opcionales:
#   PREDEPLOY_BACKUP_DIR   carpeta de respaldos previos (def. /app/backups)
#   PREDEPLOY_BACKUP_KEEP  cuántos respaldos previos conservar (def. 10)
# ============================================================

set -u

SCHEMA=prisma/schema.prisma
BASELINE=0_init
BACKUP_DIR="${PREDEPLOY_BACKUP_DIR:-/app/backups}"
KEEP="${PREDEPLOY_BACKUP_KEEP:-10}"
ESTADO="$BACKUP_DIR/ESTADO_ARRANQUE.txt"

# libpq no acepta el parámetro ?schema=public que usa Prisma en la URL.
PGURL="${DATABASE_URL%%\?*}"

mkdir -p "$BACKUP_DIR" 2>/dev/null || true
# (con `:` un fallo de redirección terminaría el script; con `true` no)
{ true > "$ESTADO"; } 2>/dev/null || ESTADO=/dev/null

log() {
  linea="[arranque $(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
  echo "$linea"
  echo "$linea" >> "$ESTADO" 2>/dev/null || true
}

sql() {
  psql "$PGURL" -v ON_ERROR_STOP=1 -tAc "$1" 2>/dev/null
}

# Arranca la API según el modo. En producción (imagen compilada, target
# `production`) corre el build de dist/; en desarrollo, tsx watch sobre src/.
# Así TODOS los targets del Dockerfile usan este mismo arranque seguro (respaldo
# previo + migraciones versionadas) sin que producción se salte esos pasos.
arrancar_api() {
  if [ "${NODE_ENV:-development}" = "production" ] && [ -f dist/server.js ]; then
    log "arrancando API (produccion: node dist/server.js)"
    exec node dist/server.js
  fi
  log "arrancando API (desarrollo: tsx watch)"
  exec npx tsx watch src/server.ts
}

# ------------------------------------------------------------
# 0. Esperar a la base de datos (máx. ~2 min)
# ------------------------------------------------------------
i=0
until sql "SELECT 1" >/dev/null; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    log "ERROR: la base de datos no responde; se arranca la API sin tocar el esquema"
    arrancar_api
  fi
  sleep 2
done

TIENE_TABLAS=$(sql "SELECT to_regclass('public.usuarios') IS NOT NULL")
TIENE_HISTORIAL=$(sql "SELECT to_regclass('public._prisma_migrations') IS NOT NULL")
log "base: tablas=$TIENE_TABLAS historial_migraciones=$TIENE_HISTORIAL"

# ------------------------------------------------------------
# 1. Respaldo previo (solo si ya hay datos)
# ------------------------------------------------------------
RESPALDO_OK=f
if [ "$TIENE_TABLAS" = "t" ]; then
  TS=$(date -u +%Y%m%d_%H%M%SZ)
  OUT="$BACKUP_DIR/predeploy_$TS.dump"
  if pg_dump -Fc -d "$PGURL" -f "$OUT.tmp" \
     && pg_restore -l "$OUT.tmp" >/dev/null 2>&1 \
     && [ -s "$OUT.tmp" ]; then
    mv "$OUT.tmp" "$OUT"
    RESPALDO_OK=t
    log "respaldo previo OK: $(basename "$OUT") ($(wc -c < "$OUT") bytes)"
    # Conservar solo los $KEEP más recientes
    ls -1t "$BACKUP_DIR"/predeploy_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
  else
    rm -f "$OUT.tmp"
    log "ERROR: no se pudo sacar el respaldo previo"
  fi
else
  RESPALDO_OK=t   # base vacía: no hay nada que perder
  log "base vacía (instalación nueva): se omite el respaldo previo"
fi

# ------------------------------------------------------------
# 2. Esquema
# ------------------------------------------------------------
sin_diferencias() {
  # exit 0 = la base coincide con schema.prisma; 2 = hay diferencias; 1 = error
  npx prisma migrate diff --from-url "$DATABASE_URL" \
    --to-schema-datamodel "$SCHEMA" --exit-code >/dev/null 2>&1
}

if [ "$RESPALDO_OK" != "t" ]; then
  log "SIN RESPALDO: no se aplica ningún cambio de esquema en este arranque"
elif [ "$TIENE_TABLAS" = "t" ] && [ "$TIENE_HISTORIAL" != "t" ]; then
  # Base creada con `db push` (el servidor hoy): intentar baseline.
  if sin_diferencias; then
    log "la base coincide con schema.prisma: se registra $BASELINE como aplicada"
    npx prisma migrate resolve --applied "$BASELINE" || log "ERROR: no se pudo registrar $BASELINE"
  else
    # Diferencias: aplicar solo cambios que no borran datos (sin --accept-data-loss,
    # Prisma se niega si algo se perdería) y volver a comparar.
    log "la base difiere de schema.prisma: se intentan cambios no destructivos"
    if npx prisma db push --skip-generate; then
      if sin_diferencias; then
        log "esquema alineado: se registra $BASELINE como aplicada"
        npx prisma migrate resolve --applied "$BASELINE" || log "ERROR: no se pudo registrar $BASELINE"
      else
        log "ATENCION: la base sigue distinta a schema.prisma; no se registra baseline"
      fi
    else
      log "ATENCION: alinear el esquema requiere borrar datos; NO se hizo. Revisar a mano."
    fi
  fi
fi

TIENE_HISTORIAL=$(sql "SELECT to_regclass('public._prisma_migrations') IS NOT NULL")
if [ "$RESPALDO_OK" = "t" ] && { [ "$TIENE_HISTORIAL" = "t" ] || [ "$TIENE_TABLAS" != "t" ]; }; then
  if npx prisma migrate deploy; then
    log "migraciones al día"
  else
    log "ERROR: falló migrate deploy; la API arranca con el esquema que había"
  fi
fi

# ------------------------------------------------------------
# 3. Datos iniciales (idempotente, no fatal)
# ------------------------------------------------------------
npx prisma db seed || log "AVISO: el seed falló (no impide el arranque)"

arrancar_api
