FROM node:20-alpine

# Cliente de PostgreSQL 16 (pg_dump/psql) para el respaldo previo al arranque.
# Debe ser la misma versión mayor que el servidor (postgres:16) para que los
# respaldos se puedan restaurar con el pg_restore del contenedor db.
RUN apk add --no-cache postgresql16-client

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# El servidor es Windows: si git convierte los finales de línea a CRLF, sh no
# puede ejecutar el script. Se normaliza aquí para no depender de la config de git.
RUN sed -i 's/\r$//' docker-entrypoint.sh

EXPOSE 3000

# Ver docker-entrypoint.sh: respaldo previo + migraciones versionadas.
# Ya NO se usa `prisma db push --accept-data-loss`.
CMD ["sh", "/app/docker-entrypoint.sh"]
