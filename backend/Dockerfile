# Imagen multi-stage con separación real entre desarrollo y producción (H-001, H-006).
#
# Todos los targets arrancan con backend/docker-entrypoint.sh (despliegue seguro,
# PR #2): respaldo previo + solo migraciones versionadas (prisma migrate deploy),
# nunca `db push --accept-data-loss`. El entrypoint detecta NODE_ENV y arranca
# `tsx watch` en desarrollo o `node dist` en producción.
#
# - development: recarga en caliente (tsx watch), código montado como volumen.
# - production: build compilado (node dist), imagen mínima.
#
# El target se elige con `--target` (o BACKEND_TARGET en docker-compose).

# ============================================================
FROM node:20-alpine AS base
# tzdata: sin este paquete Alpine ignora TZ y el contenedor queda en UTC; el cron
# de vencimiento (00:05) y el cálculo de "hoy" deben usar hora de Guatemala (H-02).
# postgresql16-client: pg_dump/pg_restore/psql para el respaldo previo del
# docker-entrypoint.sh. Debe ser la misma versión mayor que el servicio db
# (postgres:16) para que los respaldos se puedan restaurar.
RUN apk add --no-cache tzdata postgresql16-client
WORKDIR /app

# ============================================================
# deps: instalación reproducible desde el lockfile (H-006) + cliente Prisma.
# Incluye el CLI de prisma, necesario en runtime para `migrate deploy`.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# ============================================================
# Desarrollo: hot reload. Arranque seguro vía docker-entrypoint.sh (tsx watch).
FROM deps AS development
COPY . .
# El servidor es Windows: si git convierte los finales de línea a CRLF, sh no
# puede ejecutar el script. Se normaliza aquí para no depender de la config de git.
RUN sed -i 's/\r$//' docker-entrypoint.sh
EXPOSE 3000
CMD ["sh", "/app/docker-entrypoint.sh"]

# ============================================================
# Build de producción: compila TypeScript a dist/.
FROM deps AS build
COPY . .
RUN npm run build

# ============================================================
# Producción: imagen mínima con el build compilado. Arranca con el MISMO
# docker-entrypoint.sh (respaldo previo + migraciones versionadas); el entrypoint
# ejecuta `node dist/server.js` porque NODE_ENV=production. Sin tsx watch, sin
# db push, sin seed automático destructivo.
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' docker-entrypoint.sh
EXPOSE 3000
CMD ["sh", "/app/docker-entrypoint.sh"]
