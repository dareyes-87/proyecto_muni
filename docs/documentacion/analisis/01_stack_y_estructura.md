# 01 — Stack tecnológico y estructura del repositorio

> Actualizado al commit bdf1187 el 2026-10-20 (extracción original: 194f8fb, 2026-09-25).

> Fase: Extracción (parte 1 de 4). Documento de hechos con fuente; no es texto final de la tesis.
> Rama analizada: `docs/documentacion`, commit `bdf1187` (incorpora `main` = `d68ceb3`).
> Las verificaciones en ejecución de esta versión se hicieron el 2026-10-20 contra los contenedores
> del equipo de desarrollo, levantados con el código de `bdf1187` (`docker compose ps`: `farmag_db`,
> `farmag_api`, `farmag_web`, `farmag_backup`), solo con comandos que no modifican datos.

---

## 1. Tecnologías

### 1.1 Nota sobre versiones

Desde `bdf1187` el repositorio **sí contiene archivos de bloqueo**: `backend/package-lock.json` y
`frontend/package-lock.json` (fuente: `git ls-files`; commit `254d0f8`). Ambos Dockerfiles instalan
con `npm ci` a partir del lockfile (fuente: backend/Dockerfile, líneas 27–28; frontend/Dockerfile,
líneas 8–9 y 22–23), por lo que la versión instalada ya no depende del momento en que se reconstruye
la imagen. `package.json` sigue declarando rangos (prefijo `^`). Cada tabla muestra dos columnas:

- **Versión declarada:** rango de `package.json` o etiqueta de imagen del `Dockerfile` /
  `docker-compose.yml`.
- **Versión instalada:** versión real en los contenedores en ejecución (fuente: salida de
  `npm ls --depth=0` en `farmag_api` y `farmag_web`, `node --version` y `SELECT version();` en
  `farmag_db`, 2026-10-20).

Observación: con el lockfile, cuatro paquetes quedaron instalados en una versión **menor** que la
registrada el 2026-09-25 (cuando se resolvían sin lockfile): `autoprefixer` 10.6.1 → 10.5.4,
`postcss` 8.5.28 → 8.5.26, `react-hot-toast` 2.6.1 → 2.6.0; y `@types/multer` subió de 2.2.0 a
2.3.0. En el contenedor `api`, `npm ls` lista además `@emnapi/runtime@1.11.3` y
`@img/sharp-wasm32@0.35.5` como *extraneous* (dependencias opcionales de `sharp`).

La versión de nginx sigue sin poder verificarse: en modo desarrollo el contenedor `web` ejecuta
Vite (`ps aux` → `vite --host 0.0.0.0`) y no nginx (P-02, resuelta parcialmente).

### 1.2 Infraestructura, runtime y base de datos

| Capa | Tecnología | Versión declarada | Versión instalada | Uso en el sistema | Fuente |
|------|-----------|-------------------|------------------|-------------------|--------|
| Base de datos | PostgreSQL (imagen `postgres`) | `16-alpine` | 16.14 | Motor relacional del sistema; servicio `db` | (fuente: docker-compose.yml, líneas 2–3) |
| Respaldos | PostgreSQL (imagen `postgres`, `pg_dump`/`pg_restore`) | `16-alpine` | 16.14 (`PG_VERSION` del contenedor `farmag_backup`) | Servicio `backup`: respaldo periódico de la base | (fuente: docker-compose.yml, líneas 106–107) |
| Runtime backend | Node.js (imagen `node`) | `20-alpine` | v20.20.2 | Ejecuta la API Express | (fuente: backend/Dockerfile, línea 14) |
| Cliente PostgreSQL en el backend | `postgresql16-client` (paquete Alpine) | Sin versión fija | No verificada | `pg_dump`, `pg_restore` y `psql` del respaldo previo de `docker-entrypoint.sh` | (fuente: backend/Dockerfile, líneas 17–20) |
| Zona horaria del backend | `tzdata` (paquete Alpine) + `TZ=America/Guatemala` | Sin versión fija | Verificado: `TZ=America/Guatemala`, `date` → `CST` | Hace que el cron de 00:05 y el cálculo de "hoy" usen la hora de Guatemala | (fuente: backend/Dockerfile, líneas 15–20; docker-compose.yml, línea 36; salida de `date` en `farmag_api`, 2026-10-20) |
| Runtime frontend (desarrollo y build) | Node.js (imagen `node`) | `20-alpine` | v20.20.2 (contenedor `web`, modo desarrollo) | Ejecuta Vite en desarrollo y el `npm run build` en producción | (fuente: frontend/Dockerfile, líneas 4 y 18) |
| Servidor web (producción) | Nginx (imagen `nginx`) | `alpine` (sin versión fija) | No verificable: nginx no se ejecuta en modo desarrollo (P-02) | Sirve el build estático, agrega cabeceras de seguridad y hace proxy de `/api/` y `/uploads/medicamentos/` al backend | (fuente: frontend/Dockerfile, líneas 28–35; frontend/nginx.conf, líneas 1–48) |
| Contenerización | Docker Compose | Sin versión declarada (los archivos no tienen clave `version:`) | Docker Compose v5.1.4 / Docker Engine 29.5.3 (equipo donde se verificó) | Orquesta los 4 servicios `db`, `api`, `web`, `backup` | (fuente: docker-compose.yml, líneas 1–147; docker-compose.prod.yml, líneas 16–122) |
| Lenguaje backend | TypeScript (compilado a `ES2022`, módulos `commonjs`, modo `strict`) | `^5.6.0` (devDependency) | 5.9.3 | Lenguaje del backend | (fuente: backend/tsconfig.json, líneas 3–8; backend/package.json, línea 44) |
| Lenguaje frontend | TypeScript | `^5.6.0` (devDependency) | 5.9.3 | Lenguaje del frontend | (fuente: frontend/package.json, línea 28) |
| Integración continua | GitHub Actions (`ubuntu-latest`, `actions/checkout@v4`, `actions/setup-node@v4` con Node 20, servicio `postgres:16-alpine`) | — | No aplica (corre en GitHub) | Workflow "Despliegue seguro" (ver sección 7) | (fuente: .github/workflows/despliegue-seguro.yml, líneas 20–57) |

### 1.3 Dependencias de producción — backend

| Capa | Tecnología | Versión declarada | Versión instalada | Uso en el sistema | Fuente |
|------|-----------|-------------------|------------------|-------------------|--------|
| Backend / ORM | `@prisma/client` | `^6.9.0` | 6.19.3 | Cliente de acceso a PostgreSQL generado desde `schema.prisma`. **Desde `bdf1187` existe un único cliente compartido** (`config/prisma.ts`) que importan todas las rutas, servicios y middlewares; solo `seed.ts` crea el suyo | (fuente: backend/package.json, línea 20; uso: backend/src/config/prisma.ts, líneas 1–18; backend/src/middleware/audit.ts, línea 2; backend/prisma/seed.ts, línea 5) |
| Backend / seguridad | `bcryptjs` | `^2.4.3` | 2.4.3 | Hash y verificación de contraseñas (factor de costo 12) | (fuente: backend/package.json, línea 21; uso: backend/src/routes/auth.routes.ts, línea 101; backend/src/routes/usuarios.routes.ts, líneas 65 y 204; backend/prisma/seed.ts, línea 48) |
| Backend / HTTP | `cors` | `^2.8.5` | 2.8.6 | Middleware CORS global; los orígenes dependen de `CORS_ORIGIN` y `NODE_ENV` (ver 05, §8) | (fuente: backend/package.json, línea 22; uso: backend/src/server.ts, líneas 2 y 33–41) |
| Backend / archivos | `exceljs` | `^4.4.0` | 4.4.0 | Exportación de reportes a Excel e importación masiva de inventario desde `.xlsx` | (fuente: backend/package.json, línea 23; uso: backend/src/utils/excel.ts, línea 1; backend/src/routes/inventario.routes.ts, línea 5) |
| Backend / HTTP | `express` | `^4.21.0` | 4.22.3 | Framework HTTP de la API | (fuente: backend/package.json, línea 24; uso: backend/src/server.ts, líneas 1 y 19) |
| Backend / seguridad | `helmet` | `^7.2.0` | 7.2.0 | **Nueva.** Cabeceras HTTP de seguridad en todas las respuestas de la API | (fuente: backend/package.json, línea 25; uso: backend/src/server.ts, líneas 3 y 27) |
| Backend / seguridad | `jsonwebtoken` | `^9.0.2` | 9.0.3 | Firma (login) y verificación (middleware) de tokens JWT | (fuente: backend/package.json, línea 26; uso: backend/src/routes/auth.routes.ts, línea 3; backend/src/middleware/auth.ts, línea 2) |
| Backend / archivos | `multer` | `^2.2.0` | 2.4.0 | Recepción de archivos subidos (fotos de medicamentos, fotos de evidencia, Excel de importación) | (fuente: backend/package.json, línea 27; uso: backend/src/routes/catalogos.routes.ts, línea 3; backend/src/routes/captura.routes.ts, línea 2; backend/src/routes/inventario.routes.ts, línea 4) |
| Backend / tareas programadas | `node-cron` | `^3.0.3` | 3.0.3 | Programación del proceso diario de vencimientos | (fuente: backend/package.json, línea 28; uso: backend/src/services/vencimiento.service.ts, líneas 1 y 42) |
| Backend / archivos | `pdfkit` | `^0.15.1` | 0.15.2 | Generación de reportes en PDF | (fuente: backend/package.json, línea 29; uso: backend/src/utils/pdf.ts, línea 1) |
| Backend / imágenes | `sharp` | `^0.35.5` | 0.35.5 | **Nueva.** Reduce y recodifica a WebP las fotos de medicamentos (lado máximo 1000 px) y de evidencia (1600 px, calidad 80); una imagen no decodificable se rechaza con 400 | (fuente: backend/package.json, línea 30; uso: backend/src/utils/imagen.ts, líneas 1 y 26–55; backend/src/routes/catalogos.routes.ts, línea 699; backend/src/services/dispensacion.service.ts, línea 588) |
| Backend / validación | `zod` | `^3.23.8` | 3.25.76 | Validación de cuerpos de petición; los `ZodError` se traducen a HTTP 400 | (fuente: backend/package.json, línea 31; uso: backend/src/routes/inventario.routes.ts, línea 3; backend/src/routes/catalogos.routes.ts, línea 2; backend/src/middleware/errorHandler.ts, líneas 18–27) |

Dependencia **eliminada**: `nanoid` (`^3.3.17`, instalada 3.3.19 en `194f8fb`). El token de captura
se genera ahora con `randomBytes(8).toString('base64url')` del módulo nativo `node:crypto` (fuente:
`git diff 194f8fb bdf1187 -- backend/package.json`; backend/src/services/dispensacion.service.ts,
líneas 2 y 470; commit `dd8e723`).

### 1.4 Dependencias de producción — frontend

| Capa | Tecnología | Versión declarada | Versión instalada | Uso en el sistema | Fuente |
|------|-----------|-------------------|------------------|-------------------|--------|
| Frontend / HTTP | `axios` | `^1.7.0` | 1.20.0 | Cliente HTTP; `api/client.ts` inyecta el JWT; `api/captura.ts` usa una instancia sin JWT para la página pública de captura | (fuente: frontend/package.json, línea 12; uso: frontend/src/api/client.ts, líneas 1–8; frontend/src/api/captura.ts, línea 48) |
| Frontend / UI | `react` | `^18.3.1` | 18.3.1 | Librería de interfaz | (fuente: frontend/package.json, línea 13; uso: frontend/src/components/layout/Layout.tsx, línea 21, entre otros) |
| Frontend / UI | `react-dom` | `^18.3.1` | 18.3.1 | Montaje de la aplicación en el DOM | (fuente: frontend/package.json, línea 14; uso: frontend/src/main.tsx, línea 2) |
| Frontend / navegación | `react-router-dom` | `^6.26.0` | 6.30.6 | Enrutamiento de páginas del SPA | (fuente: frontend/package.json, línea 15; uso: frontend/src/App.tsx, línea 1) |
| Frontend / UI | `react-hot-toast` | `^2.4.1` | 2.6.0 | Notificaciones tipo *toast* | (fuente: frontend/package.json, línea 16; uso: frontend/src/main.tsx, línea 4; frontend/src/components/MedicamentoFormModal.tsx, línea 2) |
| Frontend / UI | `react-qr-code` | `^2.2.0` | 2.2.0 | Dibujo del código QR de captura de evidencia tras despachar | (fuente: frontend/package.json, línea 17; uso: frontend/src/pages/Dispensacion.tsx, línea 7) |
| Frontend / tablas | `@tanstack/react-table` | `^8.20.0` | 8.21.3 | Tablas de datos (componente `DataTable` y páginas de Auditoría, Medicamentos, Reportes) | (fuente: frontend/package.json, línea 18; uso: frontend/src/pages/Auditoria.tsx, línea 8; frontend/src/components/ui/DataTable.tsx) |
| Frontend / iconos | `lucide-react` | `^0.441.0` | 0.441.0 | Iconografía de la interfaz | (fuente: frontend/package.json, línea 19; uso: frontend/src/components/layout/Layout.tsx, línea 20) |

Dependencia **eliminada**: `recharts` (`^2.12.0`, instalada 2.15.4 en `194f8fb`), que estaba
declarada pero no se importaba en ningún archivo (fuente: `git diff 194f8fb bdf1187 --
frontend/package.json`; commit `dd8e723`). Una búsqueda de `recharts` en `frontend/src` sigue sin
resultados. La especificación la sigue nombrando para el dashboard (D-14; P-03).

### 1.5 Dependencias de desarrollo

| Proyecto | Paquete | Versión declarada | Versión instalada | Uso | Fuente |
|----------|---------|-------------------|------------------|-----|--------|
| backend | `@types/bcryptjs` | `^2.4.6` | 2.4.6 | Tipos TypeScript | (fuente: backend/package.json, línea 34) |
| backend | `@types/cors` | `^2.8.17` | 2.8.19 | Tipos TypeScript | (fuente: backend/package.json, línea 35) |
| backend | `@types/express` | `^5.0.0` | 5.0.6 | Tipos TypeScript (versión 5 de tipos sobre Express 4; ver nota en CLAUDE.md sobre `req.params`) | (fuente: backend/package.json, línea 36) |
| backend | `@types/jsonwebtoken` | `^9.0.7` | 9.0.10 | Tipos TypeScript | (fuente: backend/package.json, línea 37) |
| backend | `@types/multer` | `^2.2.0` | 2.3.0 | Tipos TypeScript | (fuente: backend/package.json, línea 38) |
| backend | `@types/node` | `^22.9.0` | 22.20.4 | Tipos TypeScript | (fuente: backend/package.json, línea 39) |
| backend | `@types/node-cron` | `^3.0.11` | 3.0.11 | Tipos TypeScript | (fuente: backend/package.json, línea 40) |
| backend | `@types/pdfkit` | `^0.13.4` | 0.13.9 | Tipos TypeScript | (fuente: backend/package.json, línea 41) |
| backend | `prisma` | `^6.9.0` | 6.19.3 | CLI de Prisma (`migrate deploy`, `migrate diff`, `migrate resolve`, `db seed`, `generate`); se usa también en tiempo de ejecución desde `docker-entrypoint.sh` | (fuente: backend/package.json, líneas 11–14 y 42; backend/Dockerfile, líneas 24–30; backend/docker-entrypoint.sh, líneas 107–149) |
| backend | `tsx` | `^4.19.0` | 4.23.15 | Ejecuta TypeScript sin compilar; usado en el arranque de desarrollo (`tsx watch`), en el seed y en las pruebas (`node --import tsx --test`) | (fuente: backend/package.json, líneas 7, 9, 17 y 43; backend/docker-entrypoint.sh, línea 60) |
| backend | `typescript` | `^5.6.0` | 5.9.3 | Compilador (`npm run build` → `tsc`) | (fuente: backend/package.json, líneas 8 y 44) |
| frontend | `@types/react` | `^18.3.0` | 18.3.31 | Tipos TypeScript | (fuente: frontend/package.json, línea 22) |
| frontend | `@types/react-dom` | `^18.3.0` | 18.3.7 | Tipos TypeScript | (fuente: frontend/package.json, línea 23) |
| frontend | `@vitejs/plugin-react` | `^4.3.0` | 4.7.0 | Plugin de React para Vite | (fuente: frontend/package.json, línea 24; frontend/vite.config.ts, líneas 2 y 5) |
| frontend | `autoprefixer` | `^10.4.20` | 10.5.4 | Plugin PostCSS | (fuente: frontend/package.json, línea 25; frontend/postcss.config.js, línea 4) |
| frontend | `postcss` | `^8.4.45` | 8.5.26 | Procesador CSS usado por Tailwind | (fuente: frontend/package.json, línea 26; frontend/postcss.config.js, líneas 1–6) |
| frontend | `tailwindcss` | `^3.4.10` | 3.4.19 | Framework CSS utilitario; paletas `primary` y `dorado` definidas en la configuración | (fuente: frontend/package.json, línea 27; frontend/tailwind.config.js, líneas 1–41) |
| frontend | `typescript` | `^5.6.0` | 5.9.3 | Compilador (`tsc -b` en el build) | (fuente: frontend/package.json, líneas 8 y 28) |
| frontend | `vite` | `^5.4.0` | 5.4.21 | Servidor de desarrollo y empaquetador | (fuente: frontend/package.json, líneas 7–9 y 29) |

> Observación: la paleta `farmacia` que tenía `tailwind.config.js` en `194f8fb` se eliminó por no
> usarse (fuente: `git diff 194f8fb bdf1187 -- frontend/tailwind.config.js`; commit `a0c96f6`).

El backend no agrega ninguna dependencia de pruebas: las pruebas usan el ejecutor integrado de Node
(`node:test`) con `tsx` (fuente: backend/package.json, línea 9; ver sección 8). El frontend sigue sin
framework de pruebas ni linter (fuente: frontend/package.json, líneas 6–10).

---

## 2. Arquitectura de despliegue

Hay **dos archivos de composición**: `docker-compose.yml` (por defecto; modo desarrollo salvo que el
`.env` cambie los *targets*) y `docker-compose.prod.yml` (producción). Ninguno declara una red
explícita: los servicios comparten la red por defecto de Compose y se resuelven por nombre de
servicio (`db`, `api`) (fuente: docker-compose.yml, líneas 1–147; docker-compose.prod.yml, líneas
16–122; nombres usados como host en docker-compose.yml, líneas 38 y 114, frontend/vite.config.ts,
líneas 10 y 18, y frontend/nginx.conf, líneas 29 y 43).

La actualización automática del servidor de la municipalidad usa `docker compose up -d --build`, es
decir, `docker-compose.yml` (fuente: docs/DESPLIEGUE.md, líneas 5–7) → ver H-36 en
`09_seguimiento_correcciones.md`.

### 2.1 Servicio `db`

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Imagen | `postgres:16-alpine` | (fuente: docker-compose.yml, línea 3) |
| Nombre de contenedor | `farmag_db` | (línea 4) |
| Reinicio | `unless-stopped` | (línea 5) |
| Variables de entorno | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (tomadas de `DB_USER`, `DB_PASSWORD`, `DB_NAME`) | (líneas 6–9) |
| Volúmenes | Volumen nombrado `pgdata` → `/var/lib/postgresql/data` | (líneas 10–11, 146–147) |
| Puertos publicados | `127.0.0.1:5432:5432` (solo en la interfaz local del host). Verificado con `docker compose ps` el 2026-10-20 | (líneas 12–15) |
| Healthcheck | `pg_isready -U <DB_USER> -d <DB_NAME>`; intervalo 5 s, timeout 5 s, 5 reintentos | (líneas 16–20) |
| Dependencias | Ninguna | — |

### 2.2 Servicio `api`

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Build | Contexto `./backend`, `Dockerfile`, *stage* `target: ${BACKEND_TARGET:-development}` | (fuente: docker-compose.yml, líneas 23–29) |
| Imagen | Multi-stage `base` → `deps` → `development` / `build` → `production` (ver 3.2) | (fuente: backend/Dockerfile, líneas 14–62) |
| Nombre de contenedor | `farmag_api` | (docker-compose.yml, línea 30) |
| Reinicio | `unless-stopped` | (línea 31) |
| Variables de entorno | `NODE_ENV`, `TZ=America/Guatemala`, `PORT=3000`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD`, `ADMIN_EMAIL`, `SEED_DEMO`, `STRICT_SECRETS` (ver sección 4). **No** se pasa `CORS_ORIGIN` (sí en `docker-compose.prod.yml`) | (líneas 32–49) |
| Puertos publicados | `127.0.0.1:3000:3000` (solo local). Verificado con `docker compose ps` el 2026-10-20 | (líneas 50–54) |
| Dependencias | `db` con `condition: service_healthy` | (líneas 55–57) |
| Volúmenes (bind mounts, sufijo `:z`) | `./backend/src` → `/app/src`; `./backend/prisma` → `/app/prisma`; `./backend/uploads` → `/app/uploads`; `./backend/tests` → `/app/tests` (para `npm test` en el contenedor); `./backups` → `/app/backups` (respaldo previo y `ESTADO_ARRANQUE.txt`) | (líneas 58–65) |
| Healthcheck | `wget -qO- http://127.0.0.1:3000/api/health`; intervalo 30 s, timeout 5 s, 3 reintentos, `start_period` 180 s. Verificado: estado `healthy` | (líneas 66–71; `docker compose ps`, 2026-10-20) |
| Comando de arranque | `sh /app/docker-entrypoint.sh` en los dos *targets* (ver 3.2) | (fuente: backend/Dockerfile, líneas 40 y 62) |

### 2.3 Servicio `web`

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Build | Contexto `./frontend`, `Dockerfile`, *stage* `target: ${FRONTEND_TARGET:-development}` | (fuente: docker-compose.yml, líneas 74–77) |
| Nombre de contenedor | `farmag_web` | (línea 78) |
| Reinicio | `unless-stopped` | (línea 79) |
| Variables de entorno | `VITE_LAN_IP` (tomada de `LAN_IP`, vacía por defecto) | (líneas 80–81) |
| Puertos publicados | `80:80` y `5173:5173` en todas las interfaces, sin importar el *target*; el comentario del archivo reconoce que el puerto del modo inactivo queda sin proceso. Verificado el 2026-10-20: en modo desarrollo una petición a `127.0.0.1:80` recibe respuesta vacía (curl, código 52) | (líneas 82–89; `curl` al puerto 80, 2026-10-20) → H-08 |
| Dependencias | `api` (sin condición: solo orden de arranque) | (líneas 90–91) |
| Volúmenes | `./frontend/src` → `/app/src`; `./frontend/public` → `/app/public` | (líneas 92–94) |
| Healthcheck | No definido | — |

### 2.4 Servicio `backup` (nuevo)

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Imagen | `postgres:16-alpine` (la misma del servicio `db`) | (fuente: docker-compose.yml, líneas 106–107) |
| Nombre de contenedor | `farmag_backup` | (línea 108) |
| Reinicio | `unless-stopped` | (línea 109) |
| Dependencias | `db` con `condition: service_healthy` | (líneas 110–112) |
| Variables de entorno | `PGHOST=db`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (de `DB_*`), `BACKUP_INTERVAL_HOURS` (12 por defecto), `BACKUP_KEEP_DAYS` (14 por defecto). Verificado en el contenedor: 12 y 14 | (líneas 113–119; `env` en `farmag_backup`, 2026-10-20) |
| Volúmenes | `./backups` → `/backups` | (líneas 120–121) |
| Comando | Bucle de shell en línea: `pg_dump -Fc` a `farmag_<AAAAMMDD_HHMMSSZ>.dump` (marca en UTC); el archivo se acepta solo si `pg_restore -l` lo lee y no está vacío; registra `OK`/`ERROR` en `historial_respaldos.log` y en `ULTIMO_RESPALDO.txt`; borra los `.dump` con más de `BACKUP_KEEP_DAYS` días; espera `BACKUP_INTERVAL_HOURS` horas (5 min si falló) | (líneas 122–144) |
| Puertos publicados | Ninguno | — |

Verificado el 2026-10-20: `backups/` contiene `farmag_20261020_085109Z.dump` (823 bytes),
`ULTIMO_RESPALDO.txt` = `OK 20261020_085109Z` y la línea correspondiente en
`historial_respaldos.log`. La carpeta `backups/` está excluida del control de versiones (fuente:
.gitignore, línea 16). Procedimiento de restauración: docs/RESPALDOS.md.

### 2.5 Comunicación entre servicios

- **Navegador → `web`:** el usuario accede por el puerto 5173 (desarrollo, Vite) o 80 (producción,
  nginx) (fuente: frontend/Dockerfile, líneas 13 y 33).
- **`web` → `api`:** el frontend usa rutas relativas `/api` y `/uploads`. En desarrollo, Vite hace
  proxy de ambas a `http://api:3000` con `changeOrigin` y `xfwd: true` (reenvía `X-Forwarded-For`)
  (fuente: frontend/vite.config.ts, líneas 8–25). En producción, nginx hace `proxy_pass
  http://api:3000` para `/api/` y **solo** para `/uploads/medicamentos/`, con `X-Real-IP` y
  `X-Forwarded-For` y `client_max_body_size 10m` (fuente: frontend/nginx.conf, líneas 8, 28–37 y
  42–47).
- **`api` → `db`:** Prisma se conecta con `DATABASE_URL=postgresql://…@db:5432/…?schema=public`
  (fuente: docker-compose.yml, línea 38; backend/prisma/schema.prisma, líneas 5–8).
  `docker-entrypoint.sh` usa la misma URL sin el parámetro `?schema=` para `psql`/`pg_dump` (fuente:
  backend/docker-entrypoint.sh, línea 34).
- **`backup` → `db`:** `pg_dump` por la red interna con `PGHOST=db` (fuente: docker-compose.yml,
  líneas 114 y 131).
- **Archivos subidos:** el backend sirve estáticamente **solo** `uploads/medicamentos` en
  `/uploads/medicamentos` (fuente: backend/src/server.ts, líneas 44–47). Las fotos de dispensación
  se sirven por `GET /api/dispensacion/:id/foto/:tipo` con autenticación (ver 05, §6). Verificado el
  2026-10-20: `GET /uploads/dispensaciones/x/RECETA.webp` → 404 y
  `GET /api/dispensacion/x/foto/RECETA` sin token → 401.
- **Rutas de la API** montadas en `server.ts`: `/api/auth`, `/api/usuarios`, `/api/catalogos`,
  `/api/inventario`, `/api/dispensacion`, `/api/captura` (pública, comentada como tal),
  `/api/reportes`, `/api/auditoria` y `GET /api/health` (fuente: backend/src/server.ts, líneas
  50–67). Una ruta inexistente responde 404 JSON `{"error":"Ruta no encontrada"}` (líneas 69–72;
  verificado con `curl`, 2026-10-20). El manejador de errores centralizado se registra al final
  (línea 75).
- **Acceso directo desde el host:** `db` (5432) y `api` (3000) quedan publicados solo en
  `127.0.0.1` (fuente: docker-compose.yml, líneas 14–15 y 53–54).

### 2.6 Composición de producción (`docker-compose.prod.yml`, nueva)

Se usa con `docker compose -f docker-compose.prod.yml up -d --build` (fuente:
docker-compose.prod.yml, líneas 11–14). Diferencias con `docker-compose.yml`:

| Aspecto | `docker-compose.yml` | `docker-compose.prod.yml` | Fuente (prod) |
|---------|----------------------|---------------------------|---------------|
| Target del backend | `${BACKEND_TARGET:-development}` | `production` fijo | líneas 36–39 |
| Target del frontend | `${FRONTEND_TARGET:-development}` | `production` fijo | líneas 66–69 |
| `NODE_ENV` | `${NODE_ENV:-development}` | `production` fijo | línea 43 |
| `DB_PASSWORD` / `JWT_SECRET` | Con valor por defecto versionado (H-03) | Obligatorias: `${VAR:?mensaje}` hace fallar Compose si faltan | líneas 23, 46–47 y 91 |
| `CORS_ORIGIN` | No se pasa al contenedor | `${CORS_ORIGIN:-}` | línea 49 |
| `SEED_DEMO`, `STRICT_SECRETS` | Se pasan | No se pasan | líneas 42–52 |
| Volúmenes de `api` | Código fuente, `prisma`, `tests`, `uploads`, `backups` | Solo `uploads` y `backups` | líneas 59–63 |
| Healthcheck de `api` | Definido | No definido | líneas 35–63 |
| Puertos de `web` | 80 y 5173 | Solo 80 | líneas 72–74 |
| Volúmenes de `web` | `src`, `public` | Ninguno | líneas 65–76 |
| Servicio `backup` | Igual | Igual | líneas 78–119 |

El comentario de cabecera indica que la carga inicial se hace con
`docker compose -f docker-compose.prod.yml run --rm api npm run prisma:seed` (líneas 13–14), aunque
el `docker-entrypoint.sh` del *target* `production` también ejecuta el seed en cada arranque
(fuente: backend/docker-entrypoint.sh, línea 149).

---

## 3. Modos de ejecución

### 3.1 Desarrollo vs. producción del frontend (`FRONTEND_TARGET`)

`docker-compose.yml` elige el *stage* del `Dockerfile` del frontend con
`target: ${FRONTEND_TARGET:-development}` (fuente: docker-compose.yml, línea 77). El valor por
defecto en `.env.example` es `development` (fuente: .env.example, líneas 36–38).

| Modo | Stage | Qué ejecuta | Puerto | Fuente |
|------|-------|-------------|--------|--------|
| Desarrollo (`development`) | `development` (`node:20-alpine`, `npm ci`) | `npm run dev -- --host 0.0.0.0` → `vite --host 0.0.0.0`; recarga en caliente por los volúmenes de `src` y `public`. Verificado: proceso `vite` en `farmag_web` | 5173 | (fuente: frontend/Dockerfile, líneas 4–15; frontend/package.json, línea 7; docker-compose.yml, líneas 92–94; `ps aux` en `web`, 2026-10-20) |
| Producción (`production`) | `build` (`npm ci` + `npm run build`) → `production` (`nginx:alpine`) | Copia `/app/dist` y `nginx.conf`; nginx con `try_files … /index.html` y cabeceras de seguridad (ver 05, §8) | 80 | (fuente: frontend/Dockerfile, líneas 18–35; frontend/package.json, línea 8; frontend/nginx.conf, líneas 16–25) |

Observaciones (hechos del código):
- Los volúmenes `./frontend/src` y `./frontend/public` se montan también en modo producción con
  `docker-compose.yml`, donde nginx sirve desde `/usr/share/nginx/html`, por lo que no tienen efecto
  en ese modo (fuente: docker-compose.yml, líneas 92–94; frontend/Dockerfile, línea 30).
  `docker-compose.prod.yml` ya no los monta (líneas 65–76).
- `VITE_LAN_IP` se pasa como variable de entorno de ejecución del contenedor, no como argumento de
  build (fuente: docker-compose.yml, líneas 80–81; no hay `args:` en líneas 74–77) → ver P-04.
- `frontend/.dockerignore` (nuevo) excluye `node_modules`, `dist`, `.env`, `.env.*`, `.git` y otros
  del contexto de build (fuente: frontend/.dockerignore, líneas 1–10).

### 3.2 Arranque del backend (`BACKEND_TARGET` y `docker-entrypoint.sh`)

`docker-compose.yml` elige el *stage* del `Dockerfile` del backend con
`target: ${BACKEND_TARGET:-development}` (fuente: docker-compose.yml, línea 29). `BACKEND_TARGET` no
aparece en `.env.example`.

| Stage | Contenido | Fuente |
|-------|-----------|--------|
| `base` | `node:20-alpine` + `apk add tzdata postgresql16-client` | backend/Dockerfile, líneas 14–21 |
| `deps` | `npm ci` desde `package-lock.json` y `npx prisma generate` | líneas 26–30 |
| `development` | Copia todo el código, normaliza finales de línea CRLF de `docker-entrypoint.sh` con `sed`, expone 3000, `CMD sh /app/docker-entrypoint.sh` | líneas 34–40 |
| `build` | `npm run build` (`tsc` → `dist/`) | líneas 44–46 |
| `production` | `ENV NODE_ENV=production`; copia `node_modules`, `dist`, `prisma` y el entrypoint; `CMD sh /app/docker-entrypoint.sh` | líneas 53–62 |

`backend/.dockerignore` (nuevo) excluye `node_modules` del host (el comentario explica que los
binarios de `sharp` para Windows rompen el build en Alpine), `dist`, `.env`, `.env.*` (salvo
`.env.example`) y `.git` (fuente: backend/.dockerignore, líneas 1–13).

**Secuencia de `docker-entrypoint.sh`** (fuente: backend/docker-entrypoint.sh):

| Paso | Qué hace | Líneas |
|------|----------|--------|
| 0 | Espera a la base con `psql "SELECT 1"` (60 intentos cada 2 s, ~2 min). Si no responde, registra el error y arranca la API sin tocar el esquema | 63–74 |
| — | Detecta si existen la tabla `usuarios` y la tabla `_prisma_migrations` | 76–78 |
| 1 | Si hay tablas: `pg_dump -Fc` a `backups/predeploy_<AAAAMMDD_HHMMSSZ>.dump`, verificado con `pg_restore -l` y tamaño no nulo; conserva los `PREDEPLOY_BACKUP_KEEP` (10 por defecto) más recientes. Si la base está vacía, omite el respaldo | 80–102 |
| 2a | Si el respaldo falló: no aplica ningún cambio de esquema | 113–114 |
| 2b | Base con tablas pero sin historial (creada con `db push`): si `prisma migrate diff` no muestra diferencias, registra `0_init` como aplicada (`migrate resolve --applied`); si hay diferencias, intenta `prisma db push --skip-generate` (**sin** `--accept-data-loss`) y repite la comparación | 115–135 |
| 2c | Si hay historial (o la base está vacía): `npx prisma migrate deploy` | 137–144 |
| 3 | `npx prisma db seed`; si falla, solo lo registra (no impide el arranque) | 146–149 |
| 4 | Arranca la API: `node dist/server.js` si `NODE_ENV=production` y existe `dist/server.js`; si no, `npx tsx watch src/server.ts` | 50–61 y 151 |

Cada paso se registra en consola y en `backups/ESTADO_ARRANQUE.txt` (líneas 31–44). Verificado el
2026-10-20 (instalación nueva del equipo de desarrollo): `ESTADO_ARRANQUE.txt` registra
`base: tablas=f historial_migraciones=f`, "base vacía (instalación nueva): se omite el respaldo
previo", "migraciones al día" y "arrancando API (desarrollo: tsx watch)". El proceso 1 del
contenedor es `npm exec tsx watch src/server.ts` (`ps aux`).

Otros scripts de `package.json`:
- `npm run dev` (fuera de Docker): `npx prisma migrate deploy && npx prisma db seed && tsx watch
  src/server.ts` (fuente: backend/package.json, línea 7). Ahora sí hay migraciones que aplicar
  (sección 6).
- `npm start`: `node dist/server.js` (línea 10); equivale a lo que el entrypoint ejecuta en
  producción.
- `npm test`: `node --import tsx --test --test-concurrency=1 tests/*.test.ts` (línea 9; ver
  sección 8).

Al escuchar en el puerto, `server.ts` inicia el cron de vencimientos (fuente: backend/src/server.ts,
líneas 77–85), que además ejecuta el mantenimiento una vez al arrancar (sección 9).

### 3.3 Scripts `start.cmd` y `start.sh`

Ambos envuelven `docker compose` (solo con `docker-compose.yml`) y detectan la IP de la red local
para que el QR de captura de evidencia apunte a una dirección accesible desde un celular.

| Aspecto | `start.cmd` (Windows) | `start.sh` (Linux/macOS) |
|---------|------------------------|--------------------------|
| Detección de IP | PowerShell `Get-NetIPAddress` IPv4 que empiece con `192.168.` o `10.` y `PrefixOrigin` distinto de `WellKnown`; toma la primera (fuente: start.cmd, líneas 15–16) | `ip -4 addr show` (Linux) o `ifconfig` (macOS), primera IP `192.168.x.x` o `10.x.x.x` (fuente: start.sh, líneas 15–21) |
| Exporta | `LAN_IP` en el entorno del proceso (fuente: start.cmd, línea 16) | `export LAN_IP` (fuente: start.sh, línea 23) |
| Detección de modo | Lee `FRONTEND_TARGET` de `.env`; si contiene `production` usa puerto 80, si no 5173 (fuente: start.cmd, líneas 18–25) | **Nuevo:** si `.env` tiene `FRONTEND_TARGET=production` usa puerto 80, si no 5173 (fuente: start.sh, líneas 25–29) |
| Mensajes | Informa la URL de acceso según el modo, o advierte que el QR usará `localhost` (fuente: start.cmd, líneas 27–38) | Igual que `start.cmd` (fuente: start.sh, líneas 31–42) |
| Sin argumentos | `docker compose up -d` (línea 46) | `docker compose up -d` (línea 50) |
| `down [args]` | `docker compose down %2 %3 %4` (línea 44) | `docker compose down "$@"` (líneas 46–48) |
| Otros argumentos | `docker compose up %* -d` (línea 48) | `docker compose up "$@" -d` (línea 52) |

La discrepancia de `194f8fb` entre la cabecera (`--build -d`) y el código (sin `-d`) se corrigió:
ambos scripts agregan `-d` a cualquier argumento (fuente: start.cmd, línea 48; start.sh, línea 52;
commit `254d0f8`; H-06).

La variable `LAN_IP` llega al contenedor `web` como `VITE_LAN_IP` (fuente: docker-compose.yml,
línea 81) y el frontend la usa para construir la URL del QR solo si se accede desde `localhost` o
`127.0.0.1`; en otro caso usa `window.location.origin` (fuente:
frontend/src/pages/Dispensacion.tsx, líneas 466–479).

---

## 4. Variables de entorno

Columnas: "Sensible" = **Sí** si es secreto o credencial. "Obligatoria" = el sistema no arranca o
no funciona sin ella. Los valores por defecto de variables sensibles no se transcriben; están en
los archivos citados.

| Variable | Servicio | Valor por defecto | Propósito | Sensible | Obligatoria | Fuente |
|----------|----------|-------------------|-----------|----------|-------------|--------|
| `DB_USER` | db, api (vía `DATABASE_URL`), backup | `farmag` | Usuario de PostgreSQL | Sí (credencial) | No (tiene valor por defecto) | (fuente: docker-compose.yml, líneas 7, 17, 38 y 115; .env.example, línea 5) |
| `DB_PASSWORD` | db, api (vía `DATABASE_URL`), backup | Definido en docker-compose.yml (no se transcribe); `.env.example` trae un marcador de ejemplo | Contraseña de PostgreSQL | **Sí** | **Sí en `docker-compose.prod.yml`** (`:?`); en `docker-compose.yml` tiene valor por defecto | (fuente: docker-compose.yml, líneas 8, 38 y 116; docker-compose.prod.yml, líneas 23, 46 y 91; .env.example, líneas 6–7) |
| `DB_NAME` | db, api, backup | `farmag_db` | Nombre de la base de datos | No | No | (fuente: docker-compose.yml, líneas 9, 17, 38 y 117; .env.example, línea 8) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | db | Derivadas de `DB_*` | Inicialización de la imagen oficial de PostgreSQL | Sí (la contraseña) | — | (fuente: docker-compose.yml, líneas 6–9) |
| `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` | backup | `db` / derivadas de `DB_*` | Conexión de `pg_dump` | Sí (`PGPASSWORD`) | — | (fuente: docker-compose.yml, líneas 114–117) |
| `BACKUP_INTERVAL_HOURS` | backup | `12` | Horas entre respaldos periódicos | No | No | (fuente: docker-compose.yml, línea 118) |
| `BACKUP_KEEP_DAYS` | backup | `14` | Días que se conservan los respaldos periódicos | No | No | (fuente: docker-compose.yml, línea 119) |
| `PREDEPLOY_BACKUP_DIR` / `PREDEPLOY_BACKUP_KEEP` | api (entrypoint) | `/app/backups` / `10` | Carpeta y cantidad de respaldos previos al arranque; `env.ts` usa la carpeta para escribir avisos | No | No | (fuente: backend/docker-entrypoint.sh, líneas 20–30; backend/src/config/env.ts, línea 56). No se definen en ningún archivo de Compose |
| `NODE_ENV` | api | `development` (compose, `.env.example` y `env.ts`); `production` fijo en `docker-compose.prod.yml` y en el *stage* `production` | Selecciona el arranque (`node dist` o `tsx watch`), la política de secretos, CORS y si los 500 incluyen el mensaje interno; se expone en `/api/health`. Verificado: `development` en el contenedor y en `/api/health` | No | No | (fuente: docker-compose.yml, línea 33; docker-compose.prod.yml, línea 43; backend/Dockerfile, línea 54; .env.example, línea 23; backend/src/config/env.ts, líneas 11–12; backend/src/server.ts, líneas 39 y 65; backend/src/middleware/errorHandler.ts, línea 15; backend/docker-entrypoint.sh, línea 55) |
| `TZ` | api | `America/Guatemala` (fijo) | Zona horaria del proceso Node | No | — | (fuente: docker-compose.yml, línea 36; docker-compose.prod.yml, línea 44) |
| `PORT` | api | `3000` (fijo en compose; `3000` por defecto en `env.ts`) | Puerto de escucha de Express | No | No | (fuente: docker-compose.yml, línea 37; backend/src/config/env.ts, línea 84) |
| `DATABASE_URL` | api | Compuesta en compose a partir de `DB_*` y host `db:5432`, `schema=public` | Cadena de conexión de Prisma y del entrypoint | **Sí** (contiene la contraseña) | **Sí**: `env.ts` detiene el proceso si falta (ya no hay `''` por defecto) | (fuente: docker-compose.yml, línea 38; backend/src/config/env.ts, líneas 35–43; backend/prisma/schema.prisma, línea 7) |
| `JWT_SECRET` | api | Definido en docker-compose.yml (no se transcribe); `.env.example` trae un marcador de ejemplo. **`env.ts` ya no tiene valor de respaldo** | Clave de firma y verificación de los JWT | **Sí** | **Sí**: `env.ts` aborta si falta; obligatoria también en `docker-compose.prod.yml`. En producción, un valor de ejemplo o de menos de 16 caracteres solo genera aviso, salvo `STRICT_SECRETS=true` | (fuente: docker-compose.yml, línea 39; docker-compose.prod.yml, línea 47; .env.example, líneas 24–28; backend/src/config/env.ts, líneas 14–22, 42 y 66–81) → ver P-06, H-03 |
| `JWT_EXPIRES_IN` | api | `8h` | Vigencia del token JWT | No | No | (fuente: docker-compose.yml, línea 40; .env.example, línea 29; backend/src/config/env.ts, línea 87) |
| `STRICT_SECRETS` | api | `false` | **Nueva.** Con `true`, en producción el backend no arranca si `JWT_SECRET` o la contraseña de la base son valores de ejemplo | No | No | (fuente: docker-compose.yml, línea 49; .env.example, líneas 45–48; backend/src/config/env.ts, líneas 51 y 78) |
| `CORS_ORIGIN` | api | Vacío | **Nueva.** Lista de orígenes permitidos para CORS, separada por comas | No | No | (fuente: docker-compose.prod.yml, línea 49; .env.example, líneas 30–34; backend/src/server.ts, líneas 33–41). **No** se pasa en docker-compose.yml → H-40 |
| `ADMIN_USERNAME` | api (seed) | `admin` | **Nueva.** Nombre del administrador inicial | No | No | (fuente: docker-compose.yml, línea 43; .env.example, línea 14; backend/prisma/seed.ts, línea 21) |
| `ADMIN_INITIAL_PASSWORD` | api (seed) | Vacío | **Nueva.** Contraseña del administrador inicial; si está vacía el seed genera una aleatoria. Mínimo 8 caracteres y no puede ser un valor de una lista de contraseñas conocidas | **Sí** | No (ver H-41 si no cumple la regla) | (fuente: docker-compose.yml, línea 44; docker-compose.prod.yml, línea 51; .env.example, líneas 10–15; backend/prisma/seed.ts, líneas 8 y 27–43) |
| `ADMIN_EMAIL` | api (seed) | Vacío | **Nueva.** Correo del administrador inicial (opcional) | No | No | (fuente: docker-compose.yml, línea 45; backend/prisma/seed.ts, línea 47) |
| `SEED_DEMO` | api (seed) | Vacío | **Nueva.** Con `true`, el seed crea 5 medicamentos de ejemplo si la tabla está vacía | No | No | (fuente: docker-compose.yml, línea 47; .env.example, líneas 17–19; backend/prisma/seed.ts, línea 155) |
| `BACKEND_TARGET` | api (build) | `development` | **Nueva.** *Stage* del Dockerfile del backend (`development` o `production`). No figura en `.env.example` | No | No | (fuente: docker-compose.yml, línea 29) |
| `FRONTEND_TARGET` | web (build) | `development` | *Stage* del Dockerfile del frontend; `start.cmd` y `start.sh` también lo leen | No | No | (fuente: docker-compose.yml, línea 77; .env.example, líneas 36–38; start.cmd, líneas 18–25; start.sh, líneas 25–29) |
| `LAN_IP` → `VITE_LAN_IP` | web | Vacío | IP de red local para la URL del QR cuando se accede por `localhost` | No | No | (fuente: docker-compose.yml, línea 81; .env.example, líneas 40–43; frontend/src/pages/Dispensacion.tsx, línea 471) |

El archivo `.env` real está excluido del control de versiones (fuente: .gitignore, línea 7). El
workflow de CI usa valores propios solo para pruebas (`JWT_SECRET`, `ADMIN_INITIAL_PASSWORD`); no se
transcriben (fuente: .github/workflows/despliegue-seguro.yml, líneas 87–88, 132–136 y 298).

---

## 5. Estructura del repositorio

Árbol de archivos versionados (`git ls-files` en `bdf1187`) hasta 3 niveles, sin `node_modules` ni
`.git`. Se marcan con **(nuevo)** los elementos que no existían en `194f8fb`.

```
proyecto_muni/
├── .env.example            Plantilla de variables de entorno
├── .gitignore
├── .github/                (nuevo) Integración continua
│   ├── scripts/            huella-datos.sql (huella de las tablas antes/después de desplegar)
│   └── workflows/          despliegue-seguro.yml
├── CLAUDE.md               Contexto del proyecto, asignación de módulos e historial de sesiones
├── README.md               Requisitos e inicio rápido
├── docker-compose.yml      Servicios db, api, web y backup
├── docker-compose.prod.yml (nuevo) Composición de producción
├── start.cmd / start.sh    Arranque con detección de IP de red local
├── backend/                API REST (Express + Prisma)
│   ├── .dockerignore       (nuevo)
│   ├── Dockerfile          Multi-stage: base / deps / development / build / production
│   ├── docker-entrypoint.sh (nuevo) Respaldo previo + migraciones + seed + arranque
│   ├── package.json
│   ├── package-lock.json   (nuevo)
│   ├── tsconfig.json
│   ├── prisma/             schema.prisma, seed.ts y migrations/ (nuevo)
│   ├── src/
│   │   ├── server.ts       Punto de entrada: middleware global, montaje de rutas, cron
│   │   ├── assets/         Logo institucional usado en los PDF
│   │   ├── config/         env.ts (variables validadas) y prisma.ts (nuevo, cliente único)
│   │   ├── middleware/     Autenticación JWT/roles, auditoría, errores, límites de login (nuevo)
│   │   ├── routes/         Un archivo de rutas por módulo (8 archivos)
│   │   ├── services/       Lógica de negocio: dispensación, inventario, reportes, vencimiento
│   │   └── utils/          PDF, Excel, fechas, errores HTTP, imágenes, validación
│   ├── tests/              (nuevo) 10 archivos de prueba (node:test)
│   └── uploads/            Archivos subidos (no versionados salvo .gitkeep)
│       ├── dispensaciones/ Fotos de evidencia por dispensación
│       └── medicamentos/   Fotos de medicamentos
├── frontend/               SPA React + Vite + Tailwind
│   ├── .dockerignore       (nuevo)
│   ├── Dockerfile          Multi-stage: development / build / production (nginx)
│   ├── index.html
│   ├── nginx.conf          nginx de producción (con cabeceras de seguridad)
│   ├── package.json
│   ├── package-lock.json   (nuevo)
│   ├── postcss.config.js
│   ├── tailwind.config.js  Paleta institucional
│   ├── tsconfig.json
│   ├── vite.config.ts      Proxy de /api y /uploads en desarrollo
│   ├── public/             Recursos estáticos (vacío en el repositorio)
│   └── src/
│       ├── App.tsx, main.tsx, index.css, vite-env.d.ts
│       ├── api/            Clientes HTTP por módulo (client.ts con JWT, captura.ts sin JWT)
│       ├── components/     layout/ (Layout), ui/ (componentes reutilizables), MedicamentoFormModal
│       ├── context/        AuthContext (estado de sesión)
│       ├── pages/          Una página por vista; Catalogos/ agrupa sus pestañas
│       ├── types/          Tipos TypeScript compartidos
│       └── utils/          Utilidades (cn, formatDate)
└── docs/                   Documentación
    ├── FarmaG_Especificacion_Tecnica_v1.md   Especificación técnica original
    ├── PROMPTS_EQUIPO.md                     Prompts asignados a cada integrante
    ├── proyecto_farmacia_original.md         Documento original del proyecto (ver 03_documento_original.md)
    ├── DESPLIEGUE.md       (nuevo) Despliegue seguro y actualización automática
    ├── RESPALDOS.md        (nuevo) Respaldos y restauración
    ├── HERRAMIENTAS_IA.md  (nuevo) Uso de skills de Claude Code en el proyecto
    ├── Defensa_Backend_FarmaG.md (nuevo) [COMPLETAR: propósito de este documento; no leído en esta fase]
    ├── agents/             (nuevo) domain.md, issue-tracker.md, triage-labels.md
    ├── seguridad/          (nuevo) 16 informes de auditoría y seguridad (ver 5.1)
    └── documentacion/      Documentación de la tesis (lineamientos, analisis, capitulos,
                            diagramas, plantilla, pruebas, salida)
```

Fuentes: listado `git ls-files` en `bdf1187`; `git diff --stat 194f8fb bdf1187`; `.gitignore`,
líneas 12–16 (exclusión de `uploads` y `backups`); descripciones de carpetas basadas en los archivos
que contienen:
- `backend/prisma/migrations/`: `0_init/migration.sql`,
  `20261017052535_indices_consultas/migration.sql`, `migration_lock.toml` (sección 6).
- `backend/src/config/`: `env.ts`, `prisma.ts`.
- `backend/src/routes/`: `auditoria`, `auth`, `captura`, `catalogos`, `dispensacion`,
  `inventario`, `reportes`, `usuarios` (`.routes.ts`).
- `backend/src/services/`: `dispensacion`, `inventario`, `reportes`, `vencimiento`
  (`.service.ts`).
- `backend/src/middleware/`: `audit.ts`, `auth.ts`, `errorHandler.ts`, `ipRateLimit.ts` (nuevo),
  `loginRateLimit.ts` (nuevo).
- `backend/src/utils/`: `excel.ts`, `fecha.ts` (nuevo), `formatDate.ts`, `httpError.ts` (nuevo),
  `imagen.ts` (nuevo), `pdf.ts`, `validacion.ts` (nuevo).
- `backend/tests/`: ver sección 8.
- `frontend/src/api/`: `auditoria`, `captura`, `catalogos`, `client`, `inventario`, `reportes`,
  `usuarios` (`.ts`).
- `frontend/src/components/ui/`: `AuthImage` (nuevo), `Badge`, `Button`, `Card`, `ConfirmDialog`,
  `DataTable`, `EmptyState`, `EvidenciaBadge`, `Field`, `Modal`, `PageHeader`, `SearchInput`,
  `Semaforo`.
- `frontend/src/pages/`: `Auditoria`, `Beneficiarios`, `Captura`, `Dashboard`, `Dispensacion`,
  `Entradas`, `Inventario`, `Login`, `Reportes`, `Usuarios`, y `Catalogos/` (`index`,
  `Medicamentos`, `Categorias`, `Ubicaciones`).

La estructura sigue sin coincidir con la de la especificación (D-15); los elementos nuevos amplían
esa diferencia (p. ej. `config/prisma.ts`, `tests/`, `docker-entrypoint.sh`).

### 5.1 `docs/seguridad/` (nuevo)

Contiene 16 informes en Markdown escritos por el equipo: `ATTACK_SURFACE.md`,
`AUDITORIA_COMPLETA.md`, `BUGS_FOUND.md`, `CHANGES_MADE.md`, `CIERRE_SEGURIDAD.md`, `CODE_REVIEW.md`,
`FINAL_VERIFICATION.md`, `FIXES_PHASE_1.md`, `INFORME_HANDOFF_DANIEL.md`,
`REMAINING_SECURITY_RISKS.md`, `SECURITY_AUDIT.md`, `SECURITY_FIXES.md`, `SECURITY_PENTEST.md`,
`SECURITY_TEST_MATRIX.md`, `TEST_PLAN.md` y `VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md` (fuente:
`git ls-files docs/seguridad`). Usan su propia numeración (`H-001`, `R-01`…), distinta de la de este
análisis (ver `09_seguimiento_correcciones.md`, Método, punto 5). En esta fase se usaron solo para
saber dónde buscar; el inventario de su contenido como material de calidad está en
`10_material_calidad.md`.

---

## 6. Migraciones de Prisma (nuevo)

| Migración | Contenido | Fuente |
|-----------|-----------|--------|
| `0_init` | Línea base: crea los 4 enums, las 14 tablas, los 10 índices `UNIQUE` y las 14 claves foráneas del esquema que ya existía (equivale al esquema de `194f8fb`) | backend/prisma/migrations/0_init/migration.sql, líneas 1–265 |
| `20261017052535_indices_consultas` | Crea 4 índices de consulta: `dispensaciones(created_at)`, `entradas(created_at)`, `log_auditoria(created_at)` y `lotes(medicamento_id, estado, fecha_vencimiento)` | backend/prisma/migrations/20261017052535_indices_consultas/migration.sql, líneas 1–11; commit `6ae2bd5` |
| `migration_lock.toml` | `provider = "postgresql"` | backend/prisma/migrations/migration_lock.toml |

Verificado el 2026-10-20 en la base en ejecución: `_prisma_migrations` tiene las dos migraciones con
`finished_at` registrado, y `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel
prisma/schema.prisma --exit-code` dentro de `farmag_api` devuelve "No difference detected" (código
0). Detalle de los índices en `02_modelo_datos.md`.

Regla de trabajo documentada por el equipo: todo cambio a `schema.prisma` debe ir con su migración
(`prisma migrate dev --name …`); el workflow falla si no coinciden (fuente: CLAUDE.md, sección
"Comandos"; .github/workflows/despliegue-seguro.yml, líneas 62–79).

---

## 7. Integración continua — `.github/workflows/despliegue-seguro.yml` (nuevo)

Workflow "Despliegue seguro". Se ejecuta en `pull_request` hacia `main`, en `push` a cualquier rama y
a mano (`workflow_dispatch`); cancela ejecuciones anteriores de la misma rama (fuente:
.github/workflows/despliegue-seguro.yml, líneas 20–31). El comentario de cabecera indica que, para
que bloquee *merges*, hay que configurar la regla de la rama `main` en GitHub (líneas 17–18); si esa
regla está activa no se puede verificar desde el repositorio → [COMPLETAR: confirmar si la regla de
protección de `main` exige estos trabajos].

| Trabajo | Qué comprueba | Líneas |
|---------|---------------|--------|
| `esquema` | `prisma validate`; que `schema.prisma` coincida con `prisma/migrations` (si no, falla e imprime el SQL que falta); corre las pruebas contra Postgres con la base en hora de Guatemala y Node con `TZ=America/Guatemala` y con `TZ=UTC`; avisa (sin fallar) si una migración nueva contiene `DROP TABLE/COLUMN/TYPE`, `ALTER COLUMN … TYPE`, `TRUNCATE` o `DELETE FROM` | 34–105 |
| `compilacion` | `tsc --noEmit` del backend; pruebas sin base de datos con `TZ=America/Guatemala`; `npm run build` del frontend | 107–126 |
| `despliegue` | Matriz de 3 configuraciones del servidor (`sin-env`, `env-de-ejemplo`, `produccion-ejemplo`): levanta la versión anterior con `docker compose up -d --build`, carga 200 beneficiarios de prueba, toma una huella de datos, despliega la versión nueva igual que la actualización automática, espera `healthy`, compara la huella, revisa `ESTADO_ARRANQUE.txt` (falla con `ERROR`, `ATENCION` o `SIN RESPALDO`; en `produccion-ejemplo` exige el AVISO de secretos), verifica que `0_init` quedó registrada, que existen respaldo previo y periódico y que ambos se restauran con los 200 registros; reinicia la API y prueba el login | 128–288 |
| `instalacion` | Instalación desde cero; exige que el arranque no registre errores, que el login con la contraseña fijada funcione y que la contraseña por defecto antigua responda 401 | 290–313 |

La huella de datos cuenta filas y calcula un `md5` del contenido de cada tabla, excluyendo
`updated_at` y `_prisma_migrations` (fuente: .github/scripts/huella-datos.sql, líneas 1–11).

No se consultó el historial de ejecuciones del workflow en GitHub → [COMPLETAR: resultado de las
ejecuciones del workflow sobre `bdf1187`, si se quiere citar en el Cap. 8]. Los resultados de las
pruebas ejecutadas localmente están en `11_resultados_pruebas_automatizadas.md`.

---

## 8. Pruebas automatizadas — `backend/tests/` (nuevo)

Usan el ejecutor integrado de Node (`node:test`) cargado con `tsx`; no hay dependencia de pruebas
adicional. `npm test` corre todos en serie (fuente: backend/package.json, línea 9). La carpeta se
monta en el contenedor `api` para ejecutarlas allí (fuente: docker-compose.yml, líneas 62–63).

| Archivo | Líneas | Tipo | Qué cubre (según su comentario de cabecera) |
|---------|--------|------|---------------------------------------------|
| `despacho_vencimiento.test.ts` | 89 | Contra Postgres | El `SELECT … FOR UPDATE` del despacho no elige lotes con fecha vencida (H-01) |
| `env.test.ts` | 74 | Sin BD | Arranque en producción con secretos de ejemplo: aviso por defecto, aborto con `STRICT_SECRETS=true` |
| `fecha.test.ts` | 60 | Sin BD | Validador de fechas de *query*: fecha inválida → error 400 |
| `inventario.service.test.ts` | 108 | Sin BD | Funciones puras del inventario (semáforo, vencimiento, fecha futura) |
| `ipRateLimit.test.ts` | 62 | Sin BD | Límite de login por IP, con temporizadores simulados |
| `loginRateLimit.test.ts` | 82 | Sin BD | Bloqueo de login por usuario+IP y su expiración |
| `rutas_integracion.test.ts` | 286 | Contra Postgres | Routers montados en un servidor temporal: importación, lector de códigos, validación de PUT, token de captura |
| `seed.test.ts` | 67 | Contra Postgres (base propia) | El seed no revive catálogos ni crea medicamentos de ejemplo sin `SEED_DEMO` |
| `validacion.test.ts` | 63 | Sin BD | `textoQuery`, `clampPaginacion` y otros controles de validación |
| `vencimiento_arranque.test.ts` | 49 | Contra Postgres | Marcado de lotes vencidos al arrancar y en el cron |

(fuente: backend/tests/*.test.ts, líneas 1–12 de cada archivo; conteo de líneas con `wc -l`.) La
relación de cada prueba con los hallazgos está en `09_seguimiento_correcciones.md` y los resultados
de su ejecución en `11_resultados_pruebas_automatizadas.md`.

---

## 9. Tareas programadas

| Tarea | Horario | Función / efecto | Fuente |
|-------|---------|------------------|--------|
| Verificación de vencimientos | Expresión cron `5 0 * * *` → todos los días a las 00:05 hora de Guatemala (`TZ=America/Guatemala`), **y una vez al arrancar el servidor** | `marcarLotesVencidos()` ejecuta `prisma.lote.updateMany` que cambia `estado` de `DISPONIBLE` a `VENCIDO` en los lotes con `fechaVencimiento` **menor o igual que** `hoyMedianoche()` | (fuente: backend/src/services/vencimiento.service.ts, líneas 7–16 y 40–50; backend/src/services/inventario.service.ts, `hoyMedianoche`) |
| Limpieza de tokens de captura (misma ejecución) | Igual que la anterior, en un `try/catch` independiente | `limpiarTokensExpirados()` borra (`deleteMany`) los `TokenCaptura` con `expiraEn` menor que el instante actual | (fuente: backend/src/services/vencimiento.service.ts, líneas 31–37; backend/src/services/dispensacion.service.ts, líneas 646–651) |
| Respaldo periódico de la base | Al arrancar el servicio `backup` y luego cada `BACKUP_INTERVAL_HOURS` (12 h por defecto) | Ver 2.4 | (fuente: docker-compose.yml, líneas 122–144) |
| Respaldo previo al arranque | En cada arranque del contenedor `api`, si la base tiene datos | Ver 3.2 | (fuente: backend/docker-entrypoint.sh, líneas 80–102) |

- El cron se registra una sola vez al iniciar el servidor, dentro del callback de `app.listen`
  (fuente: backend/src/server.ts, líneas 78–85); `iniciarCronVencimiento()` además lanza
  `ejecutarMantenimientoVencimiento()` sin esperar, para cubrir el caso de que el servidor haya
  estado apagado a las 00:05 (fuente: backend/src/services/vencimiento.service.ts, líneas 18–22 y
  48–49; commit `99d4429`).
- Zona horaria: verificado el 2026-10-20 que el contenedor `api` corre con `TZ=America/Guatemala`
  (`date` → `Tue Oct 20 03:00:42 CST 2026`). El cron de las 00:05 corre a las 00:05 de Guatemala
  (H-02 resuelto; P-07). El contenedor `backup` no define `TZ`: el nombre de sus archivos usa la
  hora UTC de forma explícita (`date -u`) (fuente: docker-compose.yml, línea 129).
- Proceso de fondo en el frontend (no es tarea del servidor): tras despachar, la pantalla de
  dispensación consulta las fotos de la dispensación cada 3 000 ms mientras no estén las dos o no
  se hayan omitido (fuente: frontend/src/pages/Dispensacion.tsx, líneas 427–443).

---

## Cambios respecto a la versión 194f8fb

Tabla 1.
Cambios del stack, el despliegue y la estructura entre `194f8fb` y `bdf1187`

| Tema | Antes (194f8fb) | Ahora (bdf1187) | Commit | Hallazgo relacionado |
|------|-----------------|-----------------|--------|----------------------|
| Archivos de bloqueo | Sin `package-lock.json`; versiones resueltas al construir | `package-lock.json` en backend y frontend; `npm ci` en los Dockerfiles | `254d0f8` | — |
| Dependencias del backend | Incluía `nanoid` | Se agregan `helmet` y `sharp`; se elimina `nanoid` (token con `node:crypto`) | `254d0f8`, `b25c06e`, `dd8e723` | H-17 |
| Dependencias del frontend | Incluía `recharts` sin uso | Se elimina `recharts` | `dd8e723` | D-14, P-03 |
| Paleta `farmacia` de Tailwind | Definida sin uso | Eliminada | `a0c96f6` | — |
| Cliente Prisma | Un `new PrismaClient()` por archivo de rutas/servicio | Cliente único en `config/prisma.ts` | `254d0f8` | — |
| Esquema de la base | `prisma db push --accept-data-loss` en cada arranque, sin migraciones | Migraciones versionadas (`0_init`, `indices_consultas`) aplicadas con `migrate deploy` | `319ebd3`, `6ae2bd5` | H-05, D-13 |
| Arranque del backend | `CMD` único con `tsx watch` en cualquier modo | `docker-entrypoint.sh` (espera, respaldo previo, baseline, migraciones, seed, `node dist` o `tsx watch`) | `319ebd3`, `5e69a59` | H-05, P-05 |
| Dockerfile del backend | Una sola etapa | Multi-stage con `BACKEND_TARGET` (`development` / `production`) | `254d0f8`, `5e69a59` | H-36 |
| Composición de producción | No existía | `docker-compose.prod.yml` (targets de producción, secretos obligatorios, solo puerto 80) | `254d0f8` | H-03, H-36 |
| Respaldos | Ninguno | Servicio `backup` (cada 12 h, 14 días) y respaldo previo a cada arranque | `319ebd3` | — |
| Puertos de `db` y `api` | Publicados en todas las interfaces | Solo `127.0.0.1` | `254d0f8` | H-04 |
| Zona horaria | Contenedor `api` en UTC | `TZ=America/Guatemala` + `tzdata` | `254d0f8` | H-02, P-07 |
| Healthcheck de `api` | No definido | `wget /api/health`, `start_period` 180 s | `319ebd3` | — |
| Variables de entorno | 7 variables propias | Se agregan `TZ`, `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD`, `ADMIN_EMAIL`, `SEED_DEMO`, `STRICT_SECRETS`, `CORS_ORIGIN`, `BACKEND_TARGET`, `BACKUP_*`, `PREDEPLOY_*`; `JWT_SECRET` y `DATABASE_URL` sin valor de respaldo en `env.ts` | `254d0f8`, `a274f5f`, `99d4429` | H-03, H-40, H-41 |
| Fotos de dispensación | Servidas estáticamente en `/uploads` | Solo `/uploads/medicamentos` es estático; fotos de evidencia por endpoint autenticado | `254d0f8` | H-11, D-23 |
| Proxy de Vite | Sin `xfwd` | `xfwd: true` (reenvía `X-Forwarded-For`) | `a274f5f` | H-18, H-37 |
| nginx | Proxy de `/api/` y `/uploads/` | Cabeceras de seguridad (CSP, `X-Frame-Options`…); proxy solo de `/api/` y `/uploads/medicamentos/` | `254d0f8` | H-11, H-17 |
| Scripts `start.*` | `--build` sin `-d`; `start.sh` sin detección de modo | `-d` siempre; `start.sh` detecta el modo | `254d0f8` | H-06 |
| Cron de vencimientos | Solo a las 00:05 (UTC), condición `<` | También al arrancar; condición `<=`; hora de Guatemala | `254d0f8`, `99d4429` | H-01, H-02, D-11 |
| Pruebas | No existían | `backend/tests/` con 10 archivos y `npm test` | `254d0f8`, `fe6f601`, `0f288c5`, `aa163aa` | — |
| Integración continua | No existía | Workflow "Despliegue seguro" (4 trabajos) | `319ebd3`, `074a8ff`, `100893a`, `0776300` | H-05 |
| Documentación del equipo | `FarmaG_Especificacion_Tecnica_v1.md`, `PROMPTS_EQUIPO.md`, `proyecto_farmacia_original.md` | Se agregan `DESPLIEGUE.md`, `RESPALDOS.md`, `HERRAMIENTAS_IA.md`, `Defensa_Backend_FarmaG.md`, `agents/` y `seguridad/` (16 informes) | Varios (ver `git log -- docs`) | — |

Fuente: Elaboración propia.
