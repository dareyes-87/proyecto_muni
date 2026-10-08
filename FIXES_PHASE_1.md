# FIXES_PHASE_1 — Corrección de hallazgos H-001 … H-007

**Fecha:** 2026-10-07 · **Rama:** `feature/dispensacion-evidencia-pc`
**Entorno de verificación:** Docker en vivo (db+api+web). Desarrollo verificado contra el stack corriendo; producción verificada en una instancia desechable con BD nueva y secretos seguros (sin tocar los datos de desarrollo).

> Regla aplicada: **ningún hallazgo se declara CORREGIDO sin una prueba que lo demuestre.** No se usó `--accept-data-loss` ni se borraron datos/volúmenes/migraciones. Los cambios mayores con decisión de producto quedaron documentados.

---

## Tabla resumen

| Hallazgo | Estado inicial | Cambio realizado | Archivos modificados | Prueba ejecutada | Resultado |
|---|---|---|---|---|---|
| **H-001** Docker/prod/migraciones | `tsx watch` + `prisma db push --accept-data-loss` en todo arranque | Dockerfile multi-stage (dev/build/production); migraciones versionadas con baseline no destructivo; `docker-compose.prod.yml` | `backend/Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `backend/prisma/migrations/0_init/*` | `migrate deploy` en BD existente (no-op) y en BD nueva (crea 15 tablas); prod `node dist` arranca | **CORREGIDO** |
| **H-002** Credencial admin por defecto | `admin`/`admin2026` hardcodeada y documentada | Bootstrap por `ADMIN_INITIAL_PASSWORD` o contraseña aleatoria impresa 1 vez; rechazo de valores inseguros; docs/compose/env actualizados | `backend/prisma/seed.ts`, `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml`, `README.md`, `CLAUDE.md` | Seed con env → login 200; con `admin2026` → seed falla; sin pass → aleatoria impresa; admin existente intacto | **CORREGIDO** |
| **H-003** Dependencias vulnerables | Backend 7 (4 high), Frontend 13 (8 high) | `sharp` 0.33.5 → 0.35.5 (CVEs libvips/libheif/librsvg); `npm audit fix` seguro (sin `--force`); resto documentado | `backend/package.json`, `frontend/package.json`, ambos `package-lock.json` | `npm audit` después; sharp carga en Alpine y convierte a WebP; subida de imagen HTTP 200 → `image/webp` | **PARCIALMENTE CORREGIDO** |
| **H-004** Fecha inválida → 500 | 5 endpoints devolvían 500 | Validación en el borde (`utils/fecha.ts`) → 400; `responderError` honra `status` 4xx | `backend/src/utils/fecha.ts`, `httpError.ts`, `reportes.service.ts`, `reportes.routes.ts`, `auditoria.routes.ts`, `dispensacion.service.ts` | Los 5 endpoints: fecha inválida → **400**, válida → 200, rango invertido → 400; 9 pruebas unitarias | **CORREGIDO** |
| **H-005** Múltiples PrismaClient | 11 instancias | Singleton compartido `config/prisma.ts` | `config/prisma.ts` (nuevo) + 11 archivos | `grep "new PrismaClient"` = **0** fuera del singleton; arranque + CRUD + auth + reportes OK | **CORREGIDO** |
| **H-006** Sin package-lock.json | Ausente; `npm install` | Lockfiles generados en Alpine (incluyen binarios musl **y** win32 de sharp); Dockerfiles con `npm ci`; `.dockerignore` | `backend/package-lock.json`, `frontend/package-lock.json` (nuevos), ambos `Dockerfile`, `.dockerignore` (nuevos) | Rebuild limpio con `npm ci` de dev y prod sin errores | **CORREGIDO** |
| **H-007** Vite expuesto en prod | `:5173` en 0.0.0.0, dev server como front | `docker-compose.prod.yml` (nginx :80, sin 5173, target production) | `docker-compose.prod.yml`, `frontend/Dockerfile` | nginx sirve SPA (200), fallback SPA (200), proxy `/api` (200); sin dev server | **CORREGIDO** |

**Estados:** CORREGIDO = 6 · PARCIALMENTE CORREGIDO = 1 (H-003) · NO CORREGIDO = 0 · REQUIERE DECISIÓN = 0.

---

## H-001 — Docker / Prisma / producción

### Problema original
`backend/Dockerfile` arrancaba siempre con `npx prisma db push --accept-data-loss && npx prisma db seed && npx tsx watch src/server.ts`, sin etapa de producción y sin considerar `NODE_ENV`. Un despliegue "de producción" habría corrido el watcher de desarrollo y una sincronización de esquema que **puede eliminar datos**. No existían migraciones versionadas.

### Cambio realizado
- **Dockerfile multi-stage** (`base` → `deps` → `development` / `build` → `production`):
  - `development`: `prisma db push` **sin** `--accept-data-loss` + seed + `tsx watch`.
  - `production`: `prisma migrate deploy && node dist/server.js` (sin tsx watch, sin db push, sin seed automático).
- **Migraciones versionadas** con *baselining* no destructivo de la BD existente:
  - `prisma/migrations/0_init/migration.sql` generada con `migrate diff --from-empty --to-schema-datamodel`.
  - `prisma migrate resolve --applied 0_init` marcó la migración como aplicada en la BD existente **sin ejecutar SQL** → cero pérdida de datos.
- **`docker-compose.prod.yml`**: composición de producción (api `target: production`, web nginx :80, sin bind-mounts de código, db/api solo en 127.0.0.1). La carga inicial se hace una vez con `prisma db seed`.
- `docker-compose.yml`: `api.build.target: ${BACKEND_TARGET:-development}`.

### Archivos modificados
`backend/Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` (nuevo), `backend/prisma/migrations/0_init/migration.sql` (nuevo), `backend/prisma/migrations/migration_lock.toml` (nuevo).

### Prueba de regresión
1. `prisma migrate status` sobre la BD existente → *"Database schema is up to date!"* (sin aplicar nada).
2. `prisma migrate deploy` sobre la BD existente → *"No pending migrations to apply"* (no-op). Datos intactos: 34 medicamentos, usuarios 200.
3. En una **BD nueva** desechable: `migrate deploy` aplicó `0_init` y creó **15 tablas** (14 modelos + `_prisma_migrations`).
4. Imagen `production` arranca con `node dist/server.js`, logs: *"Entorno: production"*, `migrate deploy` sin pendientes, health 200, login 200.

### Resultado antes
Arranque único con `tsx watch` + `db push --accept-data-loss` (riesgo de pérdida de datos).
### Resultado después
Desarrollo y producción separados; producción con migraciones versionadas y `node dist`; ninguna operación de arranque puede borrar datos.

---

## H-002 — Credencial administrativa predeterminada

### Problema original
El seed creaba `admin`/`admin2026` (documentado en el repo), sin cambio forzado. `config/env.ts` protegía JWT/DB en producción pero no la contraseña del admin.

### Cambio realizado
- `seed.ts`: el primer admin ya **no** tiene contraseña fija. Se usa `ADMIN_INITIAL_PASSWORD` (mín. 8 chars, se rechazan valores conocidos como `admin2026`, `changeme`…). Si no se define, se **genera una contraseña aleatoria** (`crypto.randomBytes`) y se imprime **una sola vez** en consola. El `admin` existente **no se toca** (no se restablece su contraseña). `ADMIN_USERNAME`/`ADMIN_EMAIL` configurables; el email solo se asigna si se define (evita colisión de unicidad).
- `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml`: variables de bootstrap.
- `README.md`, `CLAUDE.md`: instrucciones nuevas (cómo obtener la credencial inicial de los logs).

### Archivos modificados
`backend/prisma/seed.ts`, `.env.example`, `docker-compose.yml`, `docker-compose.prod.yml`, `README.md`, `CLAUDE.md`.

### Prueba de regresión
- `ADMIN_USERNAME=qa_boot4 ADMIN_INITIAL_PASSWORD=Secreto12345` → usuario creado; login `qa_boot4/Secreto12345` → **200**; login `qa_boot4/admin2026` → **401**.
- `ADMIN_INITIAL_PASSWORD=admin2026` → el seed **falla**: *"ADMIN_INITIAL_PASSWORD usa un valor inseguro/conocido"*; el usuario no se crea (login 401).
- Sin `ADMIN_INITIAL_PASSWORD` → imprime bloque *"CREDENCIAL INICIAL DEL ADMINISTRADOR"* con contraseña aleatoria.
- En producción (BD nueva): seed con env → admin creado, login 200, `admin2026` → 401.
- `grep admin2026 backend/src backend/prisma/seed.ts` → solo aparece en la **lista de bloqueo** (no como contraseña usable).

### Resultado antes
Contraseña administrativa conocida y hardcodeada (`admin2026`).
### Resultado después
Sin contraseña por defecto; bootstrap por variable de entorno o aleatoria impresa una vez; valores inseguros rechazados.

> **Nota de transparencia:** una primera versión del cambio ponía un email por defecto (`admin@farmag.local`) que chocaba con la restricción única al crear un segundo admin (P2002). Se detectó **durante las pruebas** y se corrigió antes de finalizar (ahora el email solo se asigna si se define `ADMIN_EMAIL`). No es un hallazgo preexistente del sistema, sino un defecto de este propio cambio, atrapado por la verificación.

---

## H-003 — Dependencias vulnerables

### Problema original
Backend 7 vulnerabilidades (4 high); frontend 13 (8 high). `sharp` (procesa imágenes subidas, incluido el canal público por token) era la de mayor relevancia en runtime.

### Cambio realizado
- **`sharp` 0.33.5 → 0.35.5** (resuelve los CVEs de libvips/libheif/librsvg). Cambio mayor, pero la API usada (`.rotate().resize().webp()`) es estable y Node 20 es compatible.
- `npm audit fix` **sin `--force`** en ambos proyectos (solo correcciones compatibles; p. ej. `source-map-js` en frontend).
- El resto requiere actualizaciones disruptivas → **documentadas, no aplicadas** (ver tabla).

### Tabla de análisis de dependencias

**Backend**
| Paquete | Versión actual | Vulnerabilidad | Severidad | Runtime/Dev | Versión corregida | Breaking | Acción |
|---|---|---|---|---|---|---|---|
| sharp | 0.33.5 | libvips/libheif/librsvg CVEs (GHSA-f88m…, GHSA-rgj7…, GHSA-wq5f…) | high | **Runtime** | 0.35.5 | Sí | **APLICADO + verificado** |
| uuid | 9.x (<11.1.1) | buffer bounds (GHSA-w5hq-g745-h8pq) | moderate | Runtime (vía exceljs/node-cron) | 11.x | Sí (major de exceljs/node-cron; audit fix --force **degrada** exceljs a 3.4) | Documentado, no aplicado |
| deepmerge-ts | <8 | stack exhaustion (GHSA-ggr8-5vv4-36mx) | high | Dev/build (vía `prisma` CLI) | vía Prisma 7 | Sí (Prisma major) | Documentado, no aplicado |

**Frontend**
| Paquete | Versión actual | Vulnerabilidad | Severidad | Runtime/Dev | Versión corregida | Breaking | Acción |
|---|---|---|---|---|---|---|---|
| esbuild | ≤0.24.2 (vía vite 5) | dev server acepta peticiones de cualquier sitio (GHSA-67mh-4wv8-2f99) | moderate | **Dev only** | vite 8 | Sí | Documentado; **mitigado**: en producción se usa nginx, no el dev server (H-007) |
| source-map-js | 1.0–1.2.1 | DoS de build | high | Build only | patch | No | **APLICADO** (`npm audit fix`) |
| postcss-selector-parser | <7.1.6 | ReDoS de build | moderate | Build only | tailwind 4 | Sí | Documentado, no aplicado |
| react-router(-dom) | 6.30 | open redirect / inyección en hidratación SSR | moderate | Runtime (bajo; no se usa SSR) | 7.x | Sí | Documentado, no aplicado |

### Archivos modificados
`backend/package.json`, `frontend/package.json`, `backend/package-lock.json`, `frontend/package-lock.json`.

### Prueba de regresión
- `sharp` en el contenedor reconstruido: `version 0.35.5`, convierte a WebP; **subida de imagen de medicamento → HTTP 200**, servida como `Content-Type: image/webp`.
- `npm audit`: **Backend 7 → 6** (high 4 → 3), **Frontend 13 → 11** (high 8 → 6).
- `tsc` backend y `vite build` frontend sin errores tras el cambio de dependencias.

### Resultado antes
`sharp` vulnerable procesando uploads; 7+13 vulnerabilidades.
### Resultado después
`sharp` parcheado (CVEs resueltos); vulnerabilidades reducidas. Las restantes requieren cambios disruptivos (Prisma 7, vite 8, tailwind 4, react-router 7, exceljs/node-cron major) y quedan **documentadas** para una fase posterior; las de frontend son mayormente de build/dev y no afectan el build de producción (nginx).

**Estado: PARCIALMENTE CORREGIDO** (lo seguro y relevante en runtime, aplicado; el resto documentado por ser disruptivo).

---

## H-004 — Fecha inválida devuelve HTTP 500

### Problema original
Un filtro de fecha inválido (`?desde=basura`) llegaba a `new Date(...)` → `Invalid Date` → Prisma lanzaba → **500**. Afectaba `/auditoria`, `/reportes/{dispensaciones,consumo-medicamentos,entradas,baja}` y `/dispensacion/historial`.

### Cambio realizado
- Nuevo `utils/fecha.ts`: `parseFechaQuery` / `parseRangoFechas` validan en el borde y lanzan `ErrorFechaInvalida` (`status: 400`). También detecta rango invertido (desde > hasta).
- `utils/httpError.ts` (`responderError`): ahora honra `error.status` 4xx (devuelve el mensaje propio).
- Se reemplazó `new Date(query)` por las funciones validadas en `reportes.service.ts` (4 reportes), `auditoria.routes.ts` y `dispensacion.service.ts` (historial). Los catch de `reportes.routes.ts` y `auditoria.routes.ts` pasaron a `responderError`.

### Archivos modificados
`backend/src/utils/fecha.ts` (nuevo), `utils/httpError.ts`, `services/reportes.service.ts`, `routes/reportes.routes.ts`, `routes/auditoria.routes.ts`, `services/dispensacion.service.ts`.

### Prueba de regresión
Nuevo `backend/tests/fecha.test.ts` (9 pruebas: válida, vacía/ausente, inválida, formato incorrecto, tipo no-string, rango válido, rango con una inválida, rango invertido). **Runtime:**

| Endpoint | Antes | Después |
|---|---|---|
| `GET /auditoria?desde=basura` | 500 | **400** |
| `GET /reportes/dispensaciones?desde=xx` | 500 | **400** |
| `GET /reportes/consumo-medicamentos?desde=xx` | 500 | **400** |
| `GET /reportes/entradas?hasta=xx` | 500 | **400** |
| `GET /dispensacion/historial?fechaDesde=xx` | 500 | **400** |
| `GET /auditoria?desde=2026-01-01` (válida) | 200 | 200 |
| `GET /reportes/dispensaciones?desde=2026-12-31&hasta=2026-01-01` (rango invertido) | 200/500 | **400** |

Mensaje devuelto: `"El filtro de fecha desde no es una fecha válida (use AAAA-MM-DD)"` — claro y **sin detalle interno**.

### Resultado antes
HTTP 500.
### Resultado después
HTTP 400 con mensaje claro.

---

## H-005 — Múltiples PrismaClient

### Problema original
11 `new PrismaClient()` en rutas/servicios/middleware → 11 pools de conexiones.

### Cambio realizado
Nuevo `src/config/prisma.ts` que exporta un **singleton** (con `globalThis` para no multiplicarse en `tsx watch`). Los 11 módulos ahora importan `{ prisma }` de ahí.

### Archivos modificados
`backend/src/config/prisma.ts` (nuevo) + `middleware/audit.ts`, `middleware/auth.ts`, `routes/{auth,auditoria,usuarios,catalogos,inventario}.routes.ts`, `services/{dispensacion,inventario,reportes,vencimiento}.service.ts`.

### Prueba de regresión
- `grep "new PrismaClient" backend/src` → **1** coincidencia (solo `config/prisma.ts`); **0** fuera del singleton.
- Arranque OK; smoke de regresión: `/usuarios`, `/inventario`, `/catalogos/*`, `/reportes/*`, `/auditoria`, `/inventario/alertas` → 200; crear+leer beneficiario → 201/200; login inválido → 401; permisos (encargado→/usuarios) → 403.

### Resultado antes
11 instancias / 11 pools.
### Resultado después
1 instancia compartida.

---

## H-006 — Falta package-lock.json

### Problema original
Sin lockfile; `npm install` en los Dockerfiles → builds no reproducibles. Motivo histórico: un lockfile generado en Windows fija binarios win32 de `sharp` y rompe el build Alpine (musl).

### Cambio realizado
- **Lockfiles generados dentro del contenedor Alpine** (incluyen binarios **musl y win32** de sharp — npm 10 guarda todas las plataformas → `npm ci` funciona tanto en Alpine como en Windows).
- Dockerfiles backend y frontend usan **`npm ci`**.
- **`.dockerignore`** nuevos en backend y frontend: evitan copiar el `node_modules` del host (con sharp win32) sobre el instalado por `npm ci` en la imagen — la causa real del problema histórico.

### Archivos modificados
`backend/package-lock.json`, `frontend/package-lock.json` (nuevos), `backend/Dockerfile`, `frontend/Dockerfile`, `backend/.dockerignore`, `frontend/.dockerignore` (nuevos).

### Prueba de regresión
- Rebuild **limpio** con `npm ci` de las imágenes de desarrollo (api+web) y de producción (api+web) — sin errores.
- `sharp` carga y funciona en la imagen reconstruida (musl correcto).
- El lockfile contiene `@img/sharp-linuxmusl-x64` **y** 9 entradas `@img/sharp-win32`.

### Resultado antes
Sin lockfile; `npm install`.
### Resultado después
Lockfiles versionables + `npm ci` reproducible, compatible con Alpine y Windows.

---

## H-007 — Vite expuesto / build de producción

### Problema original
`docker-compose.yml` publica `:5173` (dev server de Vite) en `0.0.0.0` por defecto; sin separación clara dev/prod, el dev server podía usarse como front de producción (agravado por el CVE de esbuild).

### Cambio realizado
- `docker-compose.prod.yml`: `web` con `target: production` (nginx sirviendo el build estático en `:80`), **sin publicar `:5173`**; `api` en `target: production`. El dev server de Vite no se usa ni se expone en producción.
- `frontend/Dockerfile`: comentarios aclaran que el dev server es solo para desarrollo; `npm ci` en dev y build.

### Archivos modificados
`docker-compose.prod.yml` (nuevo), `frontend/Dockerfile`.

### Prueba de regresión
Imagen de producción del frontend ejecutada con nginx (en la red de Docker para resolver `api`):
- `GET /` → **200** (SPA, título "FarmaG - Farmacia Municipal de Gualán").
- `GET /inventario` → **200** (fallback SPA de React Router).
- `GET /api/health` → **200** (nginx hace proxy a la API).
- Logs: nginx (no Vite).

### Resultado antes
Dev server de Vite en 0.0.0.0:5173 como front.
### Resultado después
Producción sirve build estático por nginx; dev server solo en desarrollo.

---

## Verificación final (sweep completo)

| Comprobación | Resultado |
|---|---|
| Pruebas backend (`npm test`, 6 dominio + 9 fecha) | **15 PASS / 0 FAIL** |
| `tsc --noEmit` (backend) | limpio (exit 0) |
| `tsc -b && vite build` (frontend) | OK (built in ~5s) |
| Rebuild dev (api+web, `npm ci`) | OK |
| Build prod (api+web, `npm ci`) | OK |
| `prisma migrate deploy` (BD existente / BD nueva) | no-op / crea 15 tablas |
| `grep new PrismaClient` (fuera del singleton) | 0 |
| `grep admin2026` (código app) | solo en lista de bloqueo del seed |
| Login / usuario inválido / permisos (403) | 200 / 401 / 403 |
| Frontend dev (navegador, 5 pantallas antes) | render OK; peticiones actuales todas 200 |

### Resumen numérico
- **Pruebas ejecutadas:** 15 unitarias/regresión + ~25 comprobaciones de runtime (curl) + verificación en navegador.
- **PASS:** 15/15 unitarias; todas las comprobaciones de runtime esperadas.
- **FAIL:** 0.
- **Vulnerabilidades antes → después:** Backend **7 → 6** (high 4 → 3). Frontend **13 → 11** (high 8 → 6). `sharp` (runtime) resuelto.
- **Hallazgos corregidos:** H-001, H-002, H-004, H-005, H-006, H-007 (6).
- **Parcialmente corregidos:** H-003 (sharp aplicado; uuid/deepmerge-ts y majors de frontend documentados por ser disruptivos).
- **Regresiones encontradas:** **ninguna.**

### Nuevos problemas detectados durante la corrección
- **No se encontró ningún hallazgo nuevo del sistema (H-019+).**
- Se corrigió un defecto introducido por el propio cambio de H-002 (email por defecto que colisionaba con la unicidad), atrapado en pruebas y resuelto antes de finalizar (ver nota en H-002).
- **Informativo:** Prisma emite un *warning* de deprecación (`package.json#prisma` → migrar a `prisma.config.ts` en Prisma 7). No afecta el funcionamiento actual; conviene tenerlo presente al actualizar a Prisma 7 (ligado a H-003/deepmerge-ts).

---

## Notas operativas para el equipo
- **Instalaciones existentes:** el `admin` actual conserva su contraseña (el seed no la restablece). Cámbiela manualmente si seguía siendo `admin2026`.
- **Primer despliegue de producción:** `docker compose -f docker-compose.prod.yml up -d --build`, luego una vez `docker compose -f docker-compose.prod.yml run --rm api npm run prisma:seed` con `ADMIN_INITIAL_PASSWORD` definido. Requiere `JWT_SECRET` y `DB_PASSWORD` seguros en `.env` (el backend aborta en producción si son de ejemplo/cortos).
- **Pruebas:** `docker compose exec api npm test` (la carpeta `tests/` ahora se monta en el contenedor de desarrollo).
- **Datos de prueba:** los admins de prueba `qa_boot4`/`qa_rand4` quedaron **desactivados** (no pueden iniciar sesión); no se borraron por tener registros de auditoría asociados (inmutables).
