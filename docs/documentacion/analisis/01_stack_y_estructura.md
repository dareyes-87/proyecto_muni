# 01 — Stack tecnológico y estructura del repositorio

> Fase: Extracción (parte 1 de 4). Documento de hechos con fuente; no es texto final de la tesis.
> Rama analizada: `docs/documentacion` (código idéntico a `194f8fb`, último commit de código).
> Fecha de extracción: 2026-09-25.

---

## 1. Tecnologías

### 1.1 Nota sobre versiones

El repositorio **no contiene `package-lock.json`** ni otro archivo de bloqueo de dependencias, por
lo que `package.json` solo declara rangos (prefijo `^`). Cada tabla muestra dos columnas:

- **Versión declarada:** rango de `package.json` o etiqueta de imagen del `Dockerfile` /
  `docker-compose.yml`.
- **Versión instalada:** versión real resuelta en los contenedores en ejecución (fuente: salida de
  `npm ls --depth=0` en los contenedores `api` y `web`, `node --version` y `SELECT version();` en
  `db`, 2026-09-25). Los contenedores estaban en ejecución desde hacía unas 35 horas; la versión
  instalada puede cambiar si la imagen se reconstruye, porque no hay archivo de bloqueo.

La versión de nginx no se pudo verificar porque en modo desarrollo el contenedor `web` ejecuta Vite
y no nginx (P-02, resuelta parcialmente).

### 1.2 Infraestructura, runtime y base de datos

| Capa | Tecnología | Versión declarada | Versión instalada | Uso en el sistema | Fuente |
|------|-----------|-------------------|------------------|-------------------|--------|
| Base de datos | PostgreSQL (imagen `postgres`) | `16-alpine` | 16.14 | Motor relacional del sistema; servicio `db` | (fuente: docker-compose.yml, líneas 2–3) |
| Runtime backend | Node.js (imagen `node`) | `20-alpine` | v20.20.2 | Ejecuta la API Express | (fuente: backend/Dockerfile, línea 1) |
| Runtime frontend (desarrollo y build) | Node.js (imagen `node`) | `20-alpine` | v20.20.2 (contenedor `web`, modo desarrollo) | Ejecuta Vite en desarrollo y el `npm run build` en producción | (fuente: frontend/Dockerfile, líneas 2 y 16) |
| Servidor web (producción) | Nginx (imagen `nginx`) | `alpine` (sin versión fija) | No verificable: nginx no se ejecuta en modo desarrollo (P-02) | Sirve el build estático y hace proxy de `/api/` y `/uploads/` al backend | (fuente: frontend/Dockerfile, líneas 26–33; frontend/nginx.conf, líneas 1–34) |
| Contenerización | Docker Compose | Sin versión declarada (el archivo no tiene clave `version:`) | Docker Compose v5.1.4 / Docker Engine 29.5.3 (equipo donde se verificó) | Orquesta los 3 servicios `db`, `api`, `web` | (fuente: docker-compose.yml, líneas 1–61) |
| Lenguaje backend | TypeScript (compilado a `ES2022`, módulos `commonjs`, modo `strict`) | `^5.6.0` (devDependency) | 5.9.3 | Lenguaje del backend | (fuente: backend/tsconfig.json, líneas 3–8; backend/package.json, línea 42) |
| Lenguaje frontend | TypeScript | `^5.6.0` (devDependency) | 5.9.3 | Lenguaje del frontend | (fuente: frontend/package.json, línea 29) |

### 1.3 Dependencias de producción — backend

| Capa | Tecnología | Versión declarada | Versión instalada | Uso en el sistema | Fuente |
|------|-----------|-------------------|------------------|-------------------|--------|
| Backend / ORM | `@prisma/client` | `^6.9.0` | 6.19.3 | Cliente de acceso a PostgreSQL generado desde `schema.prisma`; cada archivo de rutas instancia su propio `PrismaClient` | (fuente: backend/package.json, línea 19; uso: backend/src/routes/auth.routes.ts, línea 2; backend/src/middleware/audit.ts, línea 1) |
| Backend / seguridad | `bcryptjs` | `^2.4.3` | 2.4.3 | Hash y verificación de contraseñas (factor de costo 12) | (fuente: backend/package.json, línea 20; uso: backend/src/routes/auth.routes.ts, línea 31; backend/src/routes/usuarios.routes.ts, líneas 49 y 188; backend/prisma/seed.ts, línea 17) |
| Backend / HTTP | `cors` | `^2.8.5` | 2.8.6 | Middleware CORS global (sin opciones, acepta cualquier origen) | (fuente: backend/package.json, línea 21; uso: backend/src/server.ts, líneas 2 y 21) |
| Backend / archivos | `exceljs` | `^4.4.0` | 4.4.0 | Exportación de reportes a Excel e importación masiva de inventario desde `.xlsx` | (fuente: backend/package.json, línea 22; uso: backend/src/utils/excel.ts, línea 1; backend/src/routes/inventario.routes.ts, línea 5) |
| Backend / HTTP | `express` | `^4.21.0` | 4.22.3 | Framework HTTP de la API | (fuente: backend/package.json, línea 23; uso: backend/src/server.ts, líneas 1 y 18) |
| Backend / seguridad | `jsonwebtoken` | `^9.0.2` | 9.0.3 | Firma (login) y verificación (middleware) de tokens JWT | (fuente: backend/package.json, línea 24; uso: backend/src/routes/auth.routes.ts, línea 4; backend/src/middleware/auth.ts, línea 2) |
| Backend / archivos | `multer` | `^2.2.0` | 2.4.0 | Recepción de archivos subidos (fotos de medicamentos, fotos de evidencia, Excel de importación) | (fuente: backend/package.json, línea 25; uso: backend/src/routes/catalogos.routes.ts, línea 4; backend/src/routes/captura.routes.ts, línea 2; backend/src/routes/inventario.routes.ts, línea 4) |
| Backend / utilidades | `nanoid` | `^3.3.17` | 3.3.19 | Generación del token aleatorio de 10 caracteres para la captura de fotos por QR | (fuente: backend/package.json, línea 26; uso: backend/src/services/dispensacion.service.ts, líneas 2 y 409) |
| Backend / tareas programadas | `node-cron` | `^3.0.3` | 3.0.3 | Programación del proceso diario de vencimientos | (fuente: backend/package.json, línea 27; uso: backend/src/services/vencimiento.service.ts, líneas 1 y 9) |
| Backend / archivos | `pdfkit` | `^0.15.1` | 0.15.2 | Generación de reportes en PDF | (fuente: backend/package.json, línea 28; uso: backend/src/utils/pdf.ts, línea 1) |
| Backend / validación | `zod` | `^3.23.8` | 3.25.76 | Validación de cuerpos de petición; los `ZodError` se traducen a HTTP 400 | (fuente: backend/package.json, línea 29; uso: backend/src/routes/inventario.routes.ts, línea 3; backend/src/routes/catalogos.routes.ts, línea 3; backend/src/middleware/errorHandler.ts, línea 11) |

### 1.4 Dependencias de producción — frontend

| Capa | Tecnología | Versión declarada | Versión instalada | Uso en el sistema | Fuente |
|------|-----------|-------------------|------------------|-------------------|--------|
| Frontend / HTTP | `axios` | `^1.7.0` | 1.20.0 | Cliente HTTP; `api/client.ts` inyecta el JWT; `api/captura.ts` usa una instancia sin JWT para la página pública de captura | (fuente: frontend/package.json, línea 12; uso: frontend/src/api/client.ts; frontend/src/api/captura.ts, línea 1) |
| Frontend / UI | `react` | `^18.3.1` | 18.3.1 | Librería de interfaz | (fuente: frontend/package.json, línea 13; uso: frontend/src/components/layout/Layout.tsx, línea 21, entre otros) |
| Frontend / UI | `react-dom` | `^18.3.1` | 18.3.1 | Montaje de la aplicación en el DOM | (fuente: frontend/package.json, línea 14; uso: frontend/src/main.tsx, línea 2) |
| Frontend / navegación | `react-router-dom` | `^6.26.0` | 6.30.6 | Enrutamiento de páginas del SPA | (fuente: frontend/package.json, línea 15; uso: frontend/src/App.tsx, línea 1) |
| Frontend / UI | `react-hot-toast` | `^2.4.1` | 2.6.1 | Notificaciones tipo *toast* | (fuente: frontend/package.json, línea 16; uso: frontend/src/main.tsx; frontend/src/components/MedicamentoFormModal.tsx, línea 2) |
| Frontend / UI | `react-qr-code` | `^2.2.0` | 2.2.0 | Dibujo del código QR de captura de evidencia tras despachar | (fuente: frontend/package.json, línea 17; uso: frontend/src/pages/Dispensacion.tsx, línea 7) |
| Frontend / gráficos | `recharts` | `^2.12.0` | 2.15.4 | **Declarada pero no importada en ningún archivo de `frontend/src`** (búsqueda de `recharts` sin resultados) | (fuente: frontend/package.json, línea 18) → ver P-03 |
| Frontend / tablas | `@tanstack/react-table` | `^8.20.0` | 8.21.3 | Tablas de datos (componente `DataTable` y páginas de Auditoría, Medicamentos, Reportes) | (fuente: frontend/package.json, línea 19; uso: frontend/src/pages/Auditoria.tsx, línea 8; frontend/src/components/ui/DataTable.tsx) |
| Frontend / iconos | `lucide-react` | `^0.441.0` | 0.441.0 | Iconografía de la interfaz | (fuente: frontend/package.json, línea 20; uso: frontend/src/components/layout/Layout.tsx, línea 20) |

### 1.5 Dependencias de desarrollo

| Proyecto | Paquete | Versión declarada | Versión instalada | Uso | Fuente |
|----------|---------|-------------------|------------------|-----|--------|
| backend | `@types/bcryptjs` | `^2.4.6` | 2.4.6 | Tipos TypeScript | (fuente: backend/package.json, línea 32) |
| backend | `@types/cors` | `^2.8.17` | 2.8.19 | Tipos TypeScript | (fuente: backend/package.json, línea 33) |
| backend | `@types/express` | `^5.0.0` | 5.0.6 | Tipos TypeScript (versión 5 de tipos sobre Express 4; ver nota en CLAUDE.md sobre `req.params`) | (fuente: backend/package.json, línea 34) |
| backend | `@types/jsonwebtoken` | `^9.0.7` | 9.0.10 | Tipos TypeScript | (fuente: backend/package.json, línea 35) |
| backend | `@types/multer` | `^2.2.0` | 2.2.0 | Tipos TypeScript | (fuente: backend/package.json, línea 36) |
| backend | `@types/node` | `^22.9.0` | 22.20.4 | Tipos TypeScript | (fuente: backend/package.json, línea 37) |
| backend | `@types/node-cron` | `^3.0.11` | 3.0.11 | Tipos TypeScript | (fuente: backend/package.json, línea 38) |
| backend | `@types/pdfkit` | `^0.13.4` | 0.13.9 | Tipos TypeScript | (fuente: backend/package.json, línea 39) |
| backend | `prisma` | `^6.9.0` | 6.19.3 | CLI de Prisma (`db push`, `generate`, `db seed`, `studio`) | (fuente: backend/package.json, líneas 10–13 y 40; backend/Dockerfile, líneas 9 y 15) |
| backend | `tsx` | `^4.19.0` | 4.23.15 | Ejecuta TypeScript sin compilar; usado en el arranque (`tsx watch`) y en el seed | (fuente: backend/package.json, líneas 7, 16 y 41; backend/Dockerfile, línea 15) |
| backend | `typescript` | `^5.6.0` | 5.9.3 | Compilador (`npm run build` → `tsc`) | (fuente: backend/package.json, líneas 8 y 42) |
| frontend | `@types/react` | `^18.3.0` | 18.3.31 | Tipos TypeScript | (fuente: frontend/package.json, línea 23) |
| frontend | `@types/react-dom` | `^18.3.0` | 18.3.7 | Tipos TypeScript | (fuente: frontend/package.json, línea 24) |
| frontend | `@vitejs/plugin-react` | `^4.3.0` | 4.7.0 | Plugin de React para Vite | (fuente: frontend/package.json, línea 25; frontend/vite.config.ts, líneas 2 y 5) |
| frontend | `autoprefixer` | `^10.4.20` | 10.6.1 | Plugin PostCSS | (fuente: frontend/package.json, línea 26; frontend/postcss.config.js, línea 4) |
| frontend | `postcss` | `^8.4.45` | 8.5.28 | Procesador CSS usado por Tailwind | (fuente: frontend/package.json, línea 27; frontend/postcss.config.js, líneas 1–6) |
| frontend | `tailwindcss` | `^3.4.10` | 3.4.19 | Framework CSS utilitario; paletas `primary`, `dorado` y `farmacia` definidas en la configuración | (fuente: frontend/package.json, línea 28; frontend/tailwind.config.js, líneas 1–47) |
| frontend | `typescript` | `^5.6.0` | 5.9.3 | Compilador (`tsc -b` en el build) | (fuente: frontend/package.json, líneas 8 y 29) |
| frontend | `vite` | `^5.4.0` | 5.4.21 | Servidor de desarrollo y empaquetador | (fuente: frontend/package.json, líneas 7–9 y 30) |

> Observación: la paleta `farmacia` de `tailwind.config.js` (líneas 37–42) no se referencia en el
> código según la sesión 2026-07-19 registrada en `CLAUDE.md`; no se volvió a verificar en esta
> extracción porque no es un hecho necesario para el stack.

---

## 2. Arquitectura de despliegue

Todos los servicios están definidos en `docker-compose.yml`. No se declara ninguna red explícita,
por lo que los tres servicios comparten la red por defecto que crea Docker Compose y se resuelven
entre sí por nombre de servicio (`db`, `api`) (fuente: docker-compose.yml, líneas 1–61; nombres
usados como host en líneas 29, `vite.config.ts` líneas 10 y 14, `nginx.conf` líneas 17 y 29).

### 2.1 Servicio `db`

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Imagen | `postgres:16-alpine` | (fuente: docker-compose.yml, línea 3) |
| Nombre de contenedor | `farmag_db` | (línea 4) |
| Reinicio | `unless-stopped` | (línea 5) |
| Variables de entorno | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (tomadas de `DB_USER`, `DB_PASSWORD`, `DB_NAME`) | (líneas 6–9) |
| Volúmenes | Volumen nombrado `pgdata` → `/var/lib/postgresql/data` | (líneas 10–11, 60–61) |
| Puertos publicados | `5432:5432` (expuesto también al host) | (líneas 12–13) |
| Healthcheck | `pg_isready -U <DB_USER> -d <DB_NAME>`; intervalo 5 s, timeout 5 s, 5 reintentos | (líneas 14–18) |
| Dependencias | Ninguna | — |

### 2.2 Servicio `api`

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Build | Contexto `./backend`, `Dockerfile` | (fuente: docker-compose.yml, líneas 21–23) |
| Imagen base | `node:20-alpine`; `npm install`, `prisma generate`, expone 3000 | (fuente: backend/Dockerfile, líneas 1–13) |
| Nombre de contenedor | `farmag_api` | (docker-compose.yml, línea 24) |
| Reinicio | `unless-stopped` | (línea 25) |
| Variables de entorno | `NODE_ENV`, `PORT=3000`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` | (líneas 26–31) |
| Puertos publicados | `3000:3000` | (líneas 32–33) |
| Dependencias | `db` con `condition: service_healthy` (espera a que el healthcheck de PostgreSQL pase) | (líneas 34–36) |
| Volúmenes (bind mounts, con sufijo `:z` de SELinux) | `./backend/src` → `/app/src`; `./backend/prisma` → `/app/prisma`; `./backend/uploads` → `/app/uploads` | (líneas 37–40) |
| Healthcheck | No definido | — |
| Comando de arranque | `npx prisma db push --accept-data-loss && npx prisma db seed && npx tsx watch src/server.ts` | (fuente: backend/Dockerfile, línea 15) |

### 2.3 Servicio `web`

| Atributo | Valor | Fuente |
|----------|-------|--------|
| Build | Contexto `./frontend`, `Dockerfile`, *stage* `target: ${FRONTEND_TARGET:-development}` | (fuente: docker-compose.yml, líneas 43–46) |
| Nombre de contenedor | `farmag_web` | (línea 47) |
| Reinicio | `unless-stopped` | (línea 48) |
| Variables de entorno | `VITE_LAN_IP` (tomada de `LAN_IP`, vacía por defecto) | (líneas 49–50) |
| Puertos publicados | `80:80` y `5173:5173` (ambos se publican sin importar el *target*). Verificado el 2026-09-25: en modo desarrollo el contenedor solo ejecuta `vite` (`ps aux`), por lo que el puerto 80 queda publicado sin proceso escuchando | (líneas 51–53; salida de `docker compose ps` y `ps aux` en `web`, 2026-09-25) |
| Dependencias | `api` (sin condición: solo orden de arranque) | (líneas 54–55) |
| Volúmenes | `./frontend/src` → `/app/src`; `./frontend/public` → `/app/public` | (líneas 56–58) |
| Healthcheck | No definido | — |

### 2.4 Comunicación entre servicios

- **Navegador → `web`:** el usuario accede por el puerto 5173 (desarrollo, Vite) o 80
  (producción, nginx) (fuente: frontend/Dockerfile, líneas 11 y 31).
- **`web` → `api`:** el frontend usa rutas relativas `/api` y `/uploads`. En desarrollo, Vite hace
  proxy de ambas a `http://api:3000` (fuente: frontend/vite.config.ts, líneas 7–17). En
  producción, nginx hace `proxy_pass http://api:3000` para `/api/` y `/uploads/`, con
  `client_max_body_size 10m` (fuente: frontend/nginx.conf, líneas 8, 16–33).
- **`api` → `db`:** Prisma se conecta con `DATABASE_URL=postgresql://…@db:5432/…?schema=public`
  (fuente: docker-compose.yml, línea 29; backend/prisma/schema.prisma, líneas 5–8).
- **Archivos subidos:** el backend sirve la carpeta `uploads` en la ruta `/uploads` con
  `express.static` (fuente: backend/src/server.ts, línea 23); la carpeta del host se monta en el
  contenedor (fuente: docker-compose.yml, línea 40).
- **Rutas de la API** montadas en `server.ts`: `/api/auth`, `/api/usuarios`, `/api/catalogos`,
  `/api/inventario`, `/api/dispensacion`, `/api/captura` (pública, comentada como tal),
  `/api/reportes`, `/api/auditoria` y `GET /api/health` (fuente: backend/src/server.ts,
  líneas 26–43). El manejador de errores centralizado se registra al final (línea 46).
- **Acceso directo desde el host:** además, `db` (5432) y `api` (3000) quedan publicados en el
  host (fuente: docker-compose.yml, líneas 12–13 y 32–33).

---

## 3. Modos de ejecución

### 3.1 Desarrollo vs. producción del frontend (`FRONTEND_TARGET`)

`docker-compose.yml` elige el *stage* del `Dockerfile` del frontend con
`target: ${FRONTEND_TARGET:-development}` (fuente: docker-compose.yml, línea 46). El valor por
defecto en `.env.example` es `development` (fuente: .env.example, líneas 11–13).

| Modo | Stage | Qué ejecuta | Puerto | Fuente |
|------|-------|-------------|--------|--------|
| Desarrollo (`development`) | `development` (`node:20-alpine`) | `npm run dev -- --host 0.0.0.0` → `vite --host 0.0.0.0`; recarga en caliente por los volúmenes de `src` y `public` | 5173 | (fuente: frontend/Dockerfile, líneas 2–13; frontend/package.json, línea 7; docker-compose.yml, líneas 56–58) |
| Producción (`production`) | `build` → `production` | `npm run build` (`tsc -b && vite build`) y copia de `/app/dist` a `nginx:alpine`; nginx con `try_files … /index.html` para el enrutamiento del SPA | 80 | (fuente: frontend/Dockerfile, líneas 16–33; frontend/package.json, línea 8; frontend/nginx.conf, líneas 11–13) |

Observaciones (hechos del código):
- Los volúmenes `./frontend/src` y `./frontend/public` se montan en `/app/...` también en modo
  producción, donde la imagen nginx sirve desde `/usr/share/nginx/html`, por lo que no tienen
  efecto en ese modo (fuente: docker-compose.yml, líneas 56–58; frontend/Dockerfile, línea 28).
- `VITE_LAN_IP` se pasa como variable de entorno de ejecución del contenedor, no como argumento
  de build (fuente: docker-compose.yml, líneas 49–50; no hay `args:` en líneas 43–46) → ver P-04.

### 3.2 Arranque del backend

- **En Docker** (el único flujo documentado en `README.md`): `npx prisma db push
  --accept-data-loss` (sincroniza el esquema sin migraciones versionadas, aceptando pérdida de
  datos) → `npx prisma db seed` (ejecuta `tsx prisma/seed.ts`) → `npx tsx watch src/server.ts`
  (servidor con recarga automática) (fuente: backend/Dockerfile, línea 15; backend/package.json,
  líneas 15–17).
- Este comando es el mismo independientemente de `NODE_ENV`: el backend siempre corre con
  `tsx watch`, nunca con el build compilado (fuente: backend/Dockerfile, línea 15) → ver P-05.
- **Script `npm run dev`** (fuera de Docker): `npx prisma migrate deploy && npx prisma db seed &&
  tsx watch src/server.ts` (fuente: backend/package.json, línea 7). No existe la carpeta
  `backend/prisma/migrations/` (el directorio contiene solo `schema.prisma` y `seed.ts`), por lo
  que `migrate deploy` no tiene migraciones que aplicar.
- **Script `npm start`**: `node dist/server.js` tras `npm run build` (`tsc`) (fuente:
  backend/package.json, líneas 8–9); no lo usa ningún Dockerfile.
- Al escuchar en el puerto, `server.ts` inicia el cron de vencimientos (fuente:
  backend/src/server.ts, líneas 49–56).

### 3.3 Scripts `start.cmd` y `start.sh`

Ambos envuelven `docker compose` y detectan la IP de la red local para que el QR de captura de
evidencia apunte a una dirección accesible desde un celular.

| Aspecto | `start.cmd` (Windows) | `start.sh` (Linux/macOS) |
|---------|------------------------|--------------------------|
| Detección de IP | PowerShell `Get-NetIPAddress` IPv4 que empiece con `192.168.` o `10.` y `PrefixOrigin` distinto de `WellKnown`; toma la primera (fuente: start.cmd, líneas 15–16) | `ip -4 addr show` (Linux) o `ifconfig` (macOS), primera IP `192.168.x.x` o `10.x.x.x` (fuente: start.sh, líneas 15–21) |
| Exporta | `LAN_IP` en el entorno del proceso (fuente: start.cmd, línea 16) | `export LAN_IP` (fuente: start.sh, línea 23) |
| Detección de modo | Lee `FRONTEND_TARGET` de `.env`; si contiene `production` usa puerto 80, si no 5173 (fuente: start.cmd, líneas 18–25) | No detecta modo; siempre informa `http://$LAN_IP:5173` (fuente: start.sh, línea 27) |
| Mensajes | Informa la URL de acceso según el modo, o advierte que el QR usará `localhost` (fuente: start.cmd, líneas 27–38) | Informa la IP o advierte que el QR usará `localhost` (fuente: start.sh, líneas 25–31) |
| Sin argumentos | `docker compose up -d` (línea 46) | `docker compose up -d` (línea 39) |
| `down [args]` | `docker compose down %2 %3 %4` (línea 44) | `docker compose down "$@"` (líneas 35–37) |
| Otros argumentos | `docker compose up %*` (línea 48) | `docker compose up "$@"` (línea 41) |

Nota: la cabecera de ambos scripts documenta que `--build` ejecuta `docker compose up --build -d`
(fuente: start.cmd, línea 10; start.sh, línea 10), pero el código ejecuta `docker compose up
--build` **sin `-d`** (fuente: start.cmd, línea 48; start.sh, línea 41).

La variable `LAN_IP` llega al contenedor `web` como `VITE_LAN_IP` (fuente: docker-compose.yml,
línea 50) y el frontend la usa para construir la URL del QR solo si se accede desde `localhost` o
`127.0.0.1`; en otro caso usa `window.location.origin` (fuente:
frontend/src/pages/Dispensacion.tsx, líneas 446–457).

---

## 4. Variables de entorno

Columna "Sensible": **Sí** = secreto o credencial. Los valores por defecto de variables sensibles
no se transcriben; están en los archivos citados.

| Variable | Servicio | Valor por defecto | Propósito | Sensible | Fuente |
|----------|----------|-------------------|-----------|----------|--------|
| `DB_USER` | db, api (vía `DATABASE_URL`) | `farmag` | Usuario de PostgreSQL | Sí (credencial) | (fuente: docker-compose.yml, líneas 7, 15, 29; .env.example, línea 2) |
| `DB_PASSWORD` | db, api (vía `DATABASE_URL`) | Definido en docker-compose.yml / .env.example (no se transcribe) | Contraseña de PostgreSQL | **Sí** | (fuente: docker-compose.yml, líneas 8, 29; .env.example, línea 3) |
| `DB_NAME` | db, api (vía `DATABASE_URL`) | `farmag_db` | Nombre de la base de datos | No | (fuente: docker-compose.yml, líneas 9, 15, 29; .env.example, línea 4) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | db | Derivadas de `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Inicialización de la imagen oficial de PostgreSQL | Sí (la contraseña) | (fuente: docker-compose.yml, líneas 6–9) |
| `NODE_ENV` | api | `development` (compose y `env.ts`) | Se expone en `/api/health`; en `development` el manejador de errores incluye el mensaje interno del error en la respuesta | No | (fuente: docker-compose.yml, línea 27; backend/src/config/env.ts, línea 3; backend/src/server.ts, línea 41; backend/src/middleware/errorHandler.ts, línea 21) |
| `PORT` | api | `3000` (fijo en compose; `3000` por defecto en `env.ts`) | Puerto de escucha de Express | No | (fuente: docker-compose.yml, línea 28; backend/src/config/env.ts, línea 2) |
| `DATABASE_URL` | api | Compuesta en compose a partir de `DB_*` y host `db:5432`, `schema=public`; `''` por defecto en `env.ts` | Cadena de conexión de Prisma | **Sí** (contiene la contraseña) | (fuente: docker-compose.yml, línea 29; backend/prisma/schema.prisma, línea 7; backend/src/config/env.ts, línea 6) |
| `JWT_SECRET` | api | Definido en docker-compose.yml / .env.example (no se transcribe); `env.ts` tiene además un valor de respaldo propio si la variable no existe | Clave de firma y verificación de los JWT | **Sí** | (fuente: docker-compose.yml, línea 30; .env.example, línea 8; backend/src/config/env.ts, línea 4) → ver P-06 |
| `JWT_EXPIRES_IN` | api | `8h` | Vigencia del token JWT | No | (fuente: docker-compose.yml, línea 31; .env.example, línea 9; backend/src/config/env.ts, línea 5) |
| `FRONTEND_TARGET` | web (build) | `development` | Selecciona el *stage* del Dockerfile del frontend (`development` o `production`); `start.cmd` también lo lee | No | (fuente: docker-compose.yml, línea 46; .env.example, líneas 11–13; start.cmd, líneas 20–25) |
| `LAN_IP` → `VITE_LAN_IP` | web | Vacío | IP de red local que se usa en la URL del QR de captura cuando se accede por `localhost` | No | (fuente: docker-compose.yml, línea 50; .env.example, líneas 15–18; frontend/src/pages/Dispensacion.tsx, línea 449) |

El archivo `.env` real está excluido del control de versiones (fuente: .gitignore, línea 4).

---

## 5. Estructura del repositorio

Árbol de archivos versionados (`git ls-files`) hasta 3 niveles, sin `node_modules` ni `.git`.

```
proyecto_muni/
├── .env.example            Plantilla de variables de entorno
├── .gitignore
├── CLAUDE.md               Contexto del proyecto, asignación de módulos e historial de sesiones
├── README.md               Requisitos e inicio rápido
├── docker-compose.yml      Definición de los servicios db, api, web
├── start.cmd / start.sh    Arranque con detección de IP de red local
├── backend/                API REST (Express + Prisma)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/             Esquema de datos (schema.prisma) y datos iniciales (seed.ts)
│   ├── src/
│   │   ├── server.ts       Punto de entrada: middleware global, montaje de rutas, cron
│   │   ├── assets/         Logo institucional usado en los PDF
│   │   ├── config/         Lectura de variables de entorno (env.ts)
│   │   ├── middleware/     Autenticación JWT/roles, auditoría, manejo de errores
│   │   ├── routes/         Un archivo de rutas por módulo (8 archivos)
│   │   ├── services/       Lógica de negocio: dispensación, inventario, reportes, vencimiento
│   │   └── utils/          Generación de PDF y Excel, formato de fechas
│   └── uploads/            Archivos subidos (no versionados salvo .gitkeep)
│       ├── dispensaciones/ Fotos de evidencia por dispensación
│       └── medicamentos/   Fotos de medicamentos
├── frontend/               SPA React + Vite + Tailwind
│   ├── Dockerfile          Multi-stage: development / build / production (nginx)
│   ├── index.html
│   ├── nginx.conf          Configuración de nginx para producción
│   ├── package.json
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
    ├── proyecto_farmacia_original.md         [COMPLETAR: propósito de este documento; no leído en esta fase]
    └── documentacion/      Documentación de la tesis (lineamientos, analisis, capitulos,
                            diagramas, plantilla, pruebas, salida)
```

Fuentes: listado `git ls-files`; `.gitignore`, líneas 9–12 (exclusión de `uploads`); descripciones
de carpetas basadas en los archivos que contienen:
- `backend/src/routes/`: `auditoria`, `auth`, `captura`, `catalogos`, `dispensacion`,
  `inventario`, `reportes`, `usuarios` (`.routes.ts`).
- `backend/src/services/`: `dispensacion`, `inventario`, `reportes`, `vencimiento`
  (`.service.ts`).
- `backend/src/middleware/`: `audit.ts`, `auth.ts`, `errorHandler.ts`.
- `backend/src/utils/`: `excel.ts`, `formatDate.ts`, `pdf.ts`.
- `frontend/src/api/`: `auditoria`, `captura`, `catalogos`, `client`, `inventario`, `reportes`,
  `usuarios` (`.ts`).
- `frontend/src/components/ui/`: `Badge`, `Button`, `Card`, `ConfirmDialog`, `DataTable`,
  `EmptyState`, `EvidenciaBadge`, `Field`, `Modal`, `PageHeader`, `SearchInput`, `Semaforo`.
- `frontend/src/pages/`: `Auditoria`, `Beneficiarios`, `Captura`, `Dashboard`, `Dispensacion`,
  `Entradas`, `Inventario`, `Login`, `Reportes`, `Usuarios`, y `Catalogos/` (`index`,
  `Medicamentos`, `Categorias`, `Ubicaciones`).

---

## 6. Tareas programadas

| Tarea | Horario | Función / efecto | Fuente |
|-------|---------|------------------|--------|
| Verificación de vencimientos | Expresión cron `5 0 * * *` → todos los días a las 00:05 (hora del contenedor) | `iniciarCronVencimiento()` ejecuta `prisma.lote.updateMany` que cambia `estado` de `DISPONIBLE` a `VENCIDO` en los lotes con `fechaVencimiento` **menor que** la fecha de hoy a las 00:00:00 | (fuente: backend/src/services/vencimiento.service.ts, líneas 7–35) |
| Limpieza de tokens de captura (misma ejecución) | Igual que la anterior (00:05 diario), en un `try/catch` independiente | `limpiarTokensExpirados()` borra (`deleteMany`) los registros de `TokenCaptura` con `expiraEn` menor que el instante actual | (fuente: backend/src/services/vencimiento.service.ts, líneas 37–46; backend/src/services/dispensacion.service.ts, líneas 533–538) |

- El cron se registra una sola vez al iniciar el servidor, dentro del callback de `app.listen`
  (fuente: backend/src/server.ts, líneas 49–56).
- No se configura zona horaria en `cron.schedule` ni en `docker-compose.yml`. Verificado el
  2026-09-25: el contenedor `api` corre en **UTC** (`date` → `UTC`; `Intl…timeZone` → `UTC`;
  variable `TZ` vacía; sin `/etc/localtime`). Por lo tanto el cron de las 00:05 UTC se ejecuta a
  las **18:05 hora de Guatemala (UTC-6) del día anterior** → ver P-07 y H-02 en
  `hallazgos_defectos.md`.
- Proceso de fondo en el frontend (no es tarea del servidor): tras despachar, la pantalla de
  dispensación consulta las fotos de la dispensación cada 3 000 ms mientras no estén las dos o no
  se hayan omitido (fuente: frontend/src/pages/Dispensacion.tsx, líneas 405–421).
