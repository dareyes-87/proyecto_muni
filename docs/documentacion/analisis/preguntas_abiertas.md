# Preguntas abiertas

Registro de ambigüedades detectadas durante la documentación, pendientes de resolver por el responsable en lugar de suponer una respuesta.

## Extracción parte 1 — Stack, estructura y modelo de datos (2026-09-25)

| ID | Pregunta | Contexto | Fuente |
|----|----------|----------|--------|
| P-01 | ¿Qué versiones exactas de las dependencias se instalaron en el equipo de producción? ¿Se reportarán en la tesis los rangos (`^x.y.z`) o se generará un `package-lock.json`? | No hay archivo de bloqueo; cada `npm install` del Dockerfile puede resolver versiones distintas | backend/package.json; frontend/package.json; backend/Dockerfile, línea 6; frontend/Dockerfile, líneas 7 y 21 |
| P-02 | ¿Qué versión de nginx y de PostgreSQL 16 (versión menor) se usa realmente? | Las imágenes `nginx:alpine` y `postgres:16-alpine` no fijan versión exacta | frontend/Dockerfile, línea 26; docker-compose.yml, línea 3 |
| P-03 | ¿Recharts se usa en algún lugar o es una dependencia sobrante? ¿Se documenta como tecnología del sistema? | Declarada, sin ningún `import` en `frontend/src`; `CLAUDE.md` y la especificación la listan en el stack | frontend/package.json, línea 18 |
| P-04 | En modo producción, ¿funciona `VITE_LAN_IP` para el QR? | Se pasa como variable de entorno de ejecución del contenedor, no como argumento de build; en el *stage* `production` el frontend es un build estático servido por nginx. Requiere verificación en ejecución | docker-compose.yml, líneas 43–50; frontend/Dockerfile, líneas 16–33; frontend/src/pages/Dispensacion.tsx, línea 449 |
| P-05 | ¿Cuál es el procedimiento real de despliegue en la municipalidad? | El backend siempre arranca con `tsx watch` y `prisma db push --accept-data-loss`, sin distinción de `NODE_ENV`; `npm start` (código compilado) no lo usa ningún Dockerfile | backend/Dockerfile, línea 15; backend/package.json, líneas 7–9 |
| P-06 | ¿Se cambió `JWT_SECRET` (y `DB_PASSWORD`) en la instalación real? | El valor por defecto está versionado en docker-compose.yml y .env.example; además `env.ts` usa un valor de respaldo fijo si la variable no está definida | docker-compose.yml, líneas 8 y 30; .env.example, líneas 3 y 8; backend/src/config/env.ts, línea 4 |
| P-07 | ¿En qué zona horaria corre el contenedor `api`? | El cron `5 0 * * *` y el cálculo de "hoy" (`setHours(0,0,0,0)`) dependen de la zona horaria del proceso; no se configura `TZ` en docker-compose.yml ni en el Dockerfile | backend/src/services/vencimiento.service.ts, líneas 9 y 13–14; docker-compose.yml, líneas 26–31 |
| P-08 | ¿Los tipos PostgreSQL del diccionario de datos coinciden con la base de datos real? | Se derivaron del mapeo por defecto de Prisma; conviene confirmarlos con `\d <tabla>` en `psql` antes de publicar el diccionario | backend/prisma/schema.prisma |
| P-09 | ¿Qué es `docs/proyecto_farmacia_original.md` y debe usarse como fuente? | Está versionado pero no forma parte de la lista de archivos de esta fase | `git ls-files` |
| P-10 | ¿Qué información se espera en `CodigoBarras.descripcion`? | El código solo lo guarda como texto libre; la especificación sugiere el laboratorio ("Laboratorio XYZ") | backend/prisma/schema.prisma, línea 82; backend/src/routes/catalogos.routes.ts, línea 392; Espec. línea 128 |
| P-11 | ¿`start.cmd --build` / `start.sh --build` debe arrancar en segundo plano? | La cabecera de ambos scripts dice `up --build -d`, pero el código ejecuta `up --build` sin `-d` | start.cmd, líneas 10 y 48; start.sh, líneas 10 y 41 |
| P-12 | ¿Los puertos 5432 (PostgreSQL) y 3000 (API) quedan publicados en el equipo de producción? | docker-compose.yml los publica al host; la especificación solo prevé acceso por el puerto 80 | docker-compose.yml, líneas 12–13 y 32–33; Espec. §2.2, líneas 59–62 |
