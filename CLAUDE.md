# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Este archivo es la fuente de verdad para cualquier sesión de Claude que trabaje en este proyecto.**
> Cada integrante debe actualizar su sección después de cada sesión de trabajo.

---

## Comandos

Todo corre vía Docker Compose. Desde la raíz del proyecto:

```bash
docker compose up --build      # Levanta db + api + web (primera vez o tras cambiar deps)
docker compose up              # Levanta sin reconstruir
docker compose down            # Detiene. Agregar -v para borrar el volumen pgdata
docker compose logs -f api     # Logs de un servicio (db | api | web)
```

- **Frontend (dev):** http://localhost:5173 · **API:** http://localhost:3000/api/health
- Credenciales seed: `admin` / `admin2026`
- `backend/src` y `frontend/src` están montados como volúmenes → hot reload sin reconstruir.

**Backend (dentro del contenedor `farmarh_api`, o local en `backend/`):**
```bash
docker compose exec api sh                 # Shell dentro del contenedor api
npx prisma studio                          # GUI de la base de datos (puerto 5555)
npx prisma db push                         # Aplica el schema a la BD SIN crear migración
npx prisma migrate dev --name <nombre>     # Crea y aplica una migración con nombre
npx prisma generate                        # Regenera el cliente Prisma tras editar el schema
npx prisma db seed                         # Re-ejecuta prisma/seed.ts (idempotente)
npm run build                              # tsc → dist/ (chequeo de tipos)
```

> ⚠️ **Migraciones:** el `Dockerfile` del backend arranca con `prisma db push --accept-data-loss`
> (no migraciones versionadas), mientras que `npm run dev` usa `prisma migrate deploy`. Al cambiar
> el schema en desarrollo el flujo real es **editar `schema.prisma` → `db push` → `generate`**. No
> existe carpeta `prisma/migrations/` todavía.

**Frontend (local en `frontend/`):**
```bash
npm run build      # tsc -b && vite build (chequeo de tipos + bundle de producción)
```

No hay framework de tests ni linter configurado en el proyecto.

---

## Arquitectura

Monorepo de 3 servicios orquestados por `docker-compose.yml`: **db** (PostgreSQL 16), **api** (Express)
y **web** (Vite/React). En desarrollo el `vite.config.ts` hace proxy de `/api` → `http://api:3000`,
así que el frontend nunca usa una URL absoluta de API. El servicio `web` es multi-stage: `development`
(Vite, puerto 5173) o `production` (build estático servido por nginx, puerto 80) según `FRONTEND_TARGET`.

**Flujo de autenticación (atraviesa varios archivos):**
- `POST /api/auth/login` valida con bcrypt y firma un JWT con `{ userId, username, rol }`.
- El frontend guarda el token en `localStorage['farmarh_token']`; `frontend/src/api/client.ts` lo
  inyecta en cada request y, ante un `401`, limpia el storage y redirige a `/login`.
- `backend/src/middleware/auth.ts` expone `authMiddleware` (verifica el JWT, rellena `req.user`) y
  `requireRole(...roles)`. Roles: `ADMIN`, `ENCARGADO_BENEFICENCIA`.
- En el frontend, `context/AuthContext` + `<ProtectedRoute>` en `App.tsx` protegen las rutas.

**Auditoría:** toda acción que modifica datos debe llamar `registrarAuditoria()`
(`backend/src/middleware/audit.ts`). Es fire-and-forget: captura sus propios errores y nunca
interrumpe la operación principal.

**Modelo de datos (`backend/prisma/schema.prisma`) — conceptos clave:**
- El stock NO vive en `Medicamento` sino en **`Lote`** (cada entrada genera lotes con
  `cantidadActual`, `fechaVencimiento` y `estado`). La dispensación descuenta de lotes en orden
  **FIFO por `fechaVencimiento`** (ver reglas de concurrencia más abajo).
- `DetalleDispensacion` guarda **snapshots inmutables** del nombre/presentación/concentración del
  medicamento al momento de dispensar — no se debe leer el medicamento actual para mostrar historial.
- `EstadoLote`: `DISPONIBLE | AGOTADO | VENCIDO | DADO_DE_BAJA`. El cron en
  `services/vencimiento.service.ts` corre diario (00:05) y pasa lotes vencidos `DISPONIBLE → VENCIDO`.

**Backend — patrón de rutas:** cada archivo en `routes/` instancia su propio `new PrismaClient()`
y se monta en `server.ts` bajo `/api/<modulo>`. Los módulos de Inventario y Dispensación están
implementados. Catálogos tiene GETs de lectura reales (Daniel) y el CRUD está en `feature/catalogos`
(Audias, pendiente de merge). Los errores se centralizan en `middleware/errorHandler.ts` (maneja `ZodError` → 400).

---

## Proyecto

**FarmaRH** — Sistema de gestión de inventario y dispensación gratuita de medicamentos para la Farmacia Municipal de Gualán, Zacapa, Guatemala.

**Repositorio:** https://github.com/dareyes-87/proyecto_muni.git

**Especificación completa:** Ver `docs/FarmaRH_Especificacion_Tecnica_v1.md`

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + TypeScript |
| Backend | Node.js + Express + Prisma ORM + TypeScript |
| Base de datos | PostgreSQL 16 |
| Contenedores | Docker Compose (3 servicios: db, api, web) |
| Librerías UI | TanStack Table, Recharts, Lucide React, react-hot-toast |
| Auth | JWT (jsonwebtoken + bcryptjs) |

---

## Estructura del Proyecto

```
farma-rh/
├── docker-compose.yml
├── .env.example
├── CLAUDE.md              ← ESTE ARCHIVO
├── backend/
│   ├── prisma/schema.prisma   ← Modelo de datos completo
│   ├── prisma/seed.ts          ← Datos iniciales
│   └── src/
│       ├── server.ts           ← Entry point
│       ├── routes/             ← Un archivo por módulo
│       ├── services/           ← Lógica de negocio
│       ├── middleware/         ← Auth JWT, auditoría, errores
│       └── config/
├── frontend/
│   └── src/
│       ├── App.tsx             ← Rutas principales
│       ├── api/client.ts       ← Axios con JWT interceptor
│       ├── context/AuthContext  ← Estado de autenticación
│       ├── components/layout/   ← Sidebar + header
│       └── pages/              ← Una página por vista
└── docs/
```

---

## Convenciones de Código

### Git
- **Rama principal:** `main` (siempre funcional)
- **Ramas de trabajo:** `feature/[modulo]-[descripcion]`
  - Ejemplo: `feature/inventario-entradas`, `feature/dispensacion-flujo`
- **Commits en español**, formato: `tipo: descripción`
  - `feat: endpoint de registro de entradas con lotes`
  - `fix: corregir cálculo FIFO en dispensación`
  - `style: ajustar tabla de inventario en mobile`

### Backend
- Rutas en `/api/[modulo]/[recurso]`
- Toda acción que modifica datos debe llamar `registrarAuditoria()`
- Validación con Zod en los endpoints
- Errores responden con `{ error: "mensaje" }`
- Éxito responde con el objeto creado/modificado o `{ data: [], pagination: {} }`

### Frontend
- Páginas en `src/pages/`, una por vista
- Componentes reutilizables en `src/components/ui/`
- Llamadas API siempre vía `src/api/client.ts` (ya tiene JWT)
- Toast para feedback: `toast.success()`, `toast.error()`
- Tailwind CSS, sin archivos CSS adicionales por componente

### Base de Datos
- Tablas en snake_case plural: `medicamentos`, `detalle_dispensaciones`
- Campos en camelCase en Prisma, mapeados a snake_case en PostgreSQL
- Soft delete (campo `activo`) en lugar de DELETE
- UUIDs como primary keys

---

## Asignación de Módulos

### Daniel Reyes — Módulo de Inventario + Setup + Admin
**Archivos principales:**
- `backend/src/routes/inventario.routes.ts`
- `backend/src/services/inventario.service.ts` (crear)
- `backend/src/services/vencimiento.service.ts`
- `frontend/src/pages/Inventario.tsx` (crear)
- `frontend/src/pages/Dashboard.tsx` (conectar alertas reales)
- `backend/src/routes/usuarios.routes.ts`
- `frontend/src/pages/Usuarios.tsx` (crear)

**Responsabilidades:**
- [x] Setup inicial del proyecto (Docker, Prisma, Auth, Layout)
- [x] Endpoint POST /api/inventario/entradas (registro de entradas con lotes, transacción + auditoría)
- [x] Endpoint GET /api/inventario (listado agregado por medicamento con semáforo de vencimiento)
- [x] Endpoint GET /api/inventario/alertas (stock bajo + por vencer + vencidos + resumen dashboard)
- [x] Endpoint GET /api/inventario/medicamento/:id (detalle de stock con todos sus lotes)
- [x] Endpoint PUT /api/inventario/lotes/:id/baja (dar de baja lote, solo ADMIN)
- [x] Endpoints GET/PUT /api/inventario/configuracion (umbrales de alerta de vencimiento)
- [x] Página de Inventario (tabla con filtros, semáforo visual, modal de detalle con baja)
- [x] Página de registro de entradas (formulario con lotes dinámicos + historial)
- [x] Dashboard con alertas reales conectadas al backend
- [x] Página de gestión de usuarios (CRUD, editar, reset password, activar/desactivar)
- [x] Cron job de vencimiento (verificado, sin cambios)
- [ ] Escáner de código de barras en el formulario de entradas (pendiente, depende de Catálogos)

**Estado actual:** Módulo de Inventario y Admin (Usuarios) completos y verificados end-to-end.

**Notas para el equipo (cambios fuera de mi módulo, hechos para desbloquear):**
- `inventario.service.ts` (nuevo): helpers `getUmbrales`, `calcularSemaforo`, `diasParaVencer`, `esDispensable`. Reutilizables.
- `catalogos.routes.ts`: implementé **solo los GET de lectura** (medicamentos, categorías, proveedores, ubicaciones) que mis formularios necesitan. El CRUD/crear/editar/duplicados sigue como stub → **Audias**.
- `auth.routes.ts`: cast `as jwt.SignOptions` en `jwt.sign` para que `npm run build` (tsc) pase. La firma JWT no cambió.
- `prisma/seed.ts`: agregué 5 medicamentos de ejemplo (solo si no existe ninguno) para poder probar inventario. Audias puede reemplazarlos por el catálogo real.
- `usuarios.routes.ts`: agregué `PUT /:id` (editar) y `PUT /:id/password` (reset).
- Convención de IDs: `const { id } = req.params as { id: string }` porque `@types/express` v5 tipa los params como `string | string[]`.

---

### Jorge Vargas — Módulo de Dispensación

**Archivos principales:**
- `backend/src/routes/dispensacion.routes.ts`
- `backend/src/services/dispensacion.service.ts` (crear)
- `frontend/src/pages/Dispensacion.tsx` (crear)
- `frontend/src/pages/Beneficiarios.tsx` (crear)

**Responsabilidades:**
- [x] Endpoint POST /api/dispensacion/beneficiarios (registrar beneficiario)
- [x] Endpoint GET /api/dispensacion/beneficiarios/buscar?q= (búsqueda por DPI/nombre)
- [x] Endpoint GET /api/dispensacion/beneficiarios/:id (detalle con historial)
- [x] Endpoint PUT /api/dispensacion/beneficiarios/:id (editar beneficiario)
- [x] Endpoint POST /api/dispensacion/despachar (dispensación con FIFO + concurrencia)
- [x] Endpoint GET /api/dispensacion/historial (con filtros de fecha)
- [x] Endpoint GET /api/dispensacion/:id (detalle de dispensación)
- [x] Endpoint GET /api/dispensacion/stock/:medicamentoId (consulta de stock)
- [x] Página de Dispensación (flujo completo: buscar beneficiario → agregar medicamentos → confirmar)
- [x] Página de Beneficiarios (listado, búsqueda, historial)
- [x] Componente de escaneo de código de barras para dispensación
- [x] Lógica de concurrencia: SELECT FOR UPDATE + transacción Serializable

**Estado actual:** Módulo completo — backend y frontend implementados. Mergeado a `main` el 2026-06-27.

**Deuda técnica pendiente:** `dispensacion.routes.ts` usa `req.params.id` sin cast. Con `@types/express` v5 esto puede fallar en `tsc --noEmit`. Corrección: `const { id } = req.params as { id: string }` en cada handler que use `:id`.

**CRÍTICO — Lógica FIFO + Concurrencia:**
```typescript
// El servicio de dispensación DEBE:
// 1. Abrir transacción Prisma ($transaction)
// 2. SELECT lotes WHERE medicamento_id = X AND estado = 'DISPONIBLE' ORDER BY fecha_vencimiento ASC FOR UPDATE
// 3. Verificar stock suficiente
// 4. Descontar de cantidad_actual (puede distribuirse entre varios lotes)
// 5. Si cantidad_actual llega a 0 → cambiar estado a 'AGOTADO'
// 6. Crear registros en dispensaciones y detalle_dispensaciones con snapshots
// 7. Registrar auditoría
// 8. Devolver stock actualizado en la respuesta
```

---

### Audias Guevara — Módulo de Catálogos

**Archivos principales:**
- `backend/src/routes/catalogos.routes.ts`
- `frontend/src/pages/Catalogos/Medicamentos.tsx` (crear)
- `frontend/src/pages/Catalogos/Categorias.tsx` (crear)
- `frontend/src/pages/Catalogos/Proveedores.tsx` (crear)
- `frontend/src/pages/Catalogos/Ubicaciones.tsx` (crear)

**Responsabilidades:**
- [x] Endpoint CRUD completo para medicamentos (con detección de duplicados) — *en `feature/catalogos`, pendiente merge*
- [x] Endpoint de búsqueda por nombre parcial (autocompletado) — *en `feature/catalogos`*
- [x] Endpoint de búsqueda por código de barras — *en `feature/catalogos`*
- [x] Endpoint CRUD para códigos de barras (agregar/eliminar por medicamento) — *en `feature/catalogos`*
- [x] Endpoint CRUD para categorías — *en `feature/catalogos`*
- [x] Endpoint CRUD para proveedores/donantes — *en `feature/catalogos`*
- [x] Endpoint CRUD para ubicaciones/estantes — *en `feature/catalogos`*
- [ ] ⚠️ PENDIENTE — Página de Medicamentos (tabla, crear, editar, buscar, códigos de barras)
- [ ] ⚠️ PENDIENTE — Página de Categorías (tabla + formulario)
- [ ] ⚠️ PENDIENTE — Página de Proveedores (tabla + formulario)
- [ ] ⚠️ PENDIENTE — Página de Ubicaciones (tabla + formulario)
- [ ] ⚠️ PENDIENTE — Merge de `feature/catalogos` a `main` (hacer rebase primero sobre main actualizado)
- [ ] ⚠️ PENDIENTE — Actualizar CLAUDE.md con historial de sesión y tareas completadas

**Estado actual:** Backend implementado en `feature/catalogos` (auditado y aprobado el 2026-06-27). Las 4 páginas frontend no existen. La rama NO está mergeada a `main`. En `main` actual, `catalogos.routes.ts` tiene los GETs de lectura implementados por Daniel y el CRUD como stubs.

---

### Módulo Compartido — Reportes (después de que los 3 módulos funcionen)

**Responsable:** Por asignar (equipo completo)

- [ ] Endpoint GET /api/reportes/dispensaciones
- [ ] Endpoint GET /api/reportes/consumo-medicamentos
- [ ] Endpoint GET /api/reportes/inventario-actual
- [ ] Endpoint GET /api/reportes/por-vencer
- [ ] Endpoint GET /api/reportes/entradas-proveedor
- [ ] Endpoint GET /api/reportes/exportar/:tipo/:formato (PDF + Excel)
- [ ] Página de Reportes con filtros
- [ ] Exportación a PDF (librería: pdfkit o puppeteer)
- [ ] Exportación a Excel (librería: exceljs)

---

## Reglas de Concurrencia (IMPORTANTE)

El sistema soporta 4 usuarios simultáneos. Para evitar inconsistencias de inventario:

1. **Todas las operaciones que descuentan stock** (dispensación) deben usar transacciones Prisma con `$queryRaw` para `SELECT ... FOR UPDATE`.
2. **Las entradas de inventario** no necesitan bloqueo (solo insertan, no modifican lotes existentes).
3. **El frontend NO debe confiar en el stock mostrado en pantalla**. Siempre re-verificar en el backend al confirmar.

---

## Cómo usar este archivo

1. **Antes de empezar a trabajar:** Lee la sección de tu módulo y las convenciones.
2. **Al iniciar una sesión de Claude:** Pega el prompt inicial que se te asignó. Claude leerá este archivo para entender el contexto.
3. **Al terminar una sesión:** Actualiza tu sección con lo que completaste y lo que queda pendiente. Haz commit y push de este archivo.
4. **Si otro compañero completó algo:** Haz `git pull` antes de empezar. Revisa si sus cambios afectan tu módulo.

---

## Estado al reanudar

> Última actualización: 2026-06-27 — cierre de sesión Daniel Reyes

### Lo que está en `main` y funciona HOY

| Módulo | Rutas activas | Estado |
|--------|--------------|--------|
| Inventario (Daniel) | `/inventario`, `/entradas` | ✅ Completo |
| Dispensación (Jorge) | `/dispensacion`, `/beneficiarios` | ✅ Completo |
| Admin / Usuarios (Daniel) | `/usuarios` (solo ADMIN) | ✅ Completo |
| Dashboard | `/` | ✅ Con alertas reales |
| Catálogos (Audias) | *sin rutas activas en frontend* | ⚠️ Backend en `feature/catalogos`, sin frontend, sin merge |
| Reportes | *sin rutas activas* | ❌ No iniciado |

### Bloqueado esperando a Audias (`feature/catalogos`)

**En `main` actual los GETs de lectura de catálogos SÍ funcionan** (implementados por Daniel):
- `GET /api/catalogos/medicamentos` ✅
- `GET /api/catalogos/medicamentos/buscar?q=` ✅
- `GET /api/catalogos/categorias` ✅
- `GET /api/catalogos/proveedores` ✅
- `GET /api/catalogos/ubicaciones` ✅
- `GET /api/catalogos/medicamentos/barcode/:codigo` — **stub en main** → devuelve `{ message: 'TODO' }`

**Lo que Audias tiene en `feature/catalogos` (pendiente de merge):**
- CRUD completo medicamentos con detección de duplicados (`forzarCreacion: true` para forzar)
- `GET /barcode/:codigo` con stock real
- CRUD categorías, proveedores, ubicaciones + códigos de barras
- Auditoría en todos los endpoints que modifican datos

**Lo que Audias no entregó (bloqueante para hacer el merge):**
- `frontend/src/pages/Catalogos/Medicamentos.tsx` — no existe
- `frontend/src/pages/Catalogos/Categorias.tsx` — no existe
- `frontend/src/pages/Catalogos/Proveedores.tsx` — no existe
- `frontend/src/pages/Catalogos/Ubicaciones.tsx` — no existe

**Impacto en Jorge (Dispensación):** el escáner de código de barras en `Dispensacion.tsx` llama
a `GET /api/catalogos/medicamentos/barcode/:codigo`. Hoy recibe stub vacío — el flujo no se rompe
(maneja array vacío) pero el escaneo real no funciona hasta que el endpoint de Audias esté en main.

### Deuda técnica pendiente

**Jorge — `dispensacion.routes.ts`:** todos los handlers con `:id` en el path usan `req.params.id`
directamente sin el cast requerido por `@types/express` v5. Puede fallar en `tsc --noEmit` estricto.
Corrección en cada handler: `const { id } = req.params as { id: string }`.
No es bloqueante en runtime. Corregir antes de agregar más endpoints al módulo.

### Primer paso cuando se reanude la sesión

```bash
git pull origin main          # traer el estado actual
docker compose up             # verificar que todo sigue arriba
curl -s http://localhost:3000/api/health   # confirmar API
```

Luego verificar si Audias ya subió trabajo:

```bash
git fetch --all
git log --oneline origin/feature/catalogos
git diff main..origin/feature/catalogos --name-only
```

**Prompt para auditar `feature/catalogos` de Audias cuando suba las páginas:**

> Verifica el estado de `origin/feature/catalogos`. Necesito saber:
> 1. ¿Existen las 4 páginas frontend en `frontend/src/pages/Catalogos/`?
> 2. ¿El backend tiene CRUD completo + GET barcode + detección de duplicados?
> 3. ¿Hizo rebase sobre main? (main actual está en commit `14d1f50`)
> 4. ¿Hay conflictos con `catalogos.routes.ts` en main?
> Si todo está completo y sin conflictos bloqueantes, proceder con
> `git merge --no-ff origin/feature/catalogos` resolviendo cualquier conflicto en catalogos.routes.ts
> tomando la versión de Audias (es más completa que los stubs actuales en main).

---

## Historial de Sesiones

### 2026-06-26 — Daniel Reyes
- Setup inicial completo: Docker Compose, Prisma schema, seed, auth, layout, login
- Todas las rutas stub creadas para los 3 módulos
- CLAUDE.md creado con asignación de tareas

### 2026-06-27 — Daniel Reyes (rama `feature/inventario`)
- Módulo de Inventario completo (backend + frontend): entradas, listado con semáforo,
  alertas, detalle por medicamento, baja de lotes, configuración de umbrales.
- Módulo Admin: Usuarios CRUD (crear, editar, reset password, activar/desactivar) + Dashboard real.
- GETs de lectura en Catálogos y 5 medicamentos de ejemplo en el seed (ver notas en mi sección).
- Backend y frontend pasan `tsc` sin errores. Endpoints verificados con curl (incl. roles).

### 2026-06-27 — Jorge Vargas (rama `feature/dispensacion`)
- Rebase sobre main (heredar fix Alpine/SELinux de 560d537, descartar cambios en Docker)
- Backend completo: dispensacion.service.ts con lógica FIFO + concurrencia (SELECT FOR UPDATE, $transaction Serializable)
- Rutas implementadas: 7 endpoints de beneficiarios + dispensación + 1 endpoint de stock
- Frontend: Beneficiarios.tsx (CRUD completo con búsqueda, detalle, historial)
- Frontend: Dispensacion.tsx (flujo completo: buscar beneficiario → escaneo barras / búsqueda manual → carrito con semáforo de vencimiento → confirmar)
- Habilitadas rutas /dispensacion y /beneficiarios en App.tsx
- Auditoría integrada en todos los endpoints que modifican datos

### 2026-06-27 — Daniel Reyes — CIERRE DE SESIÓN (merges a main)

**Auditoría de ramas antes de mergear:**
- `feature/catalogos` (Audias): backend CRUD aprobado, sin páginas frontend → merge bloqueado
- `feature/dispensacion` (Jorge): primera versión rechazada (Docker roto, stubs en backend, App.tsx
  basado en commit antiguo sin fix Alpine). Segunda versión aprobada tras rebase y entrega completa.

**Merges realizados a `main` en este orden:**
1. `feature/dispensacion` → `main` (merge limpio, sin conflictos)
2. `feature/inventario` → `main` (conflicto en `App.tsx` e `CLAUDE.md`, resuelto combinando
   imports y entradas del historial de ambas ramas)

**Estado de `main` al cerrar:** commit `14d1f50`. Módulos Inventario + Dispensación + Admin
funcionando. Catálogos en stubs (GETs de lectura sí funcionan). Reportes no iniciado.

**Veredicto de Jorge (aprobado):** FIFO correcto con `$queryRaw FOR UPDATE` + `Serializable`.
Única deuda: cast `req.params as { id: string }` faltante en `dispensacion.routes.ts`.
