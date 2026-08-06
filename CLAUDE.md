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

**Backend (dentro del contenedor `farmag_api`, o local en `backend/`):**
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
- El frontend guarda el token en `localStorage['farmag_token']`; `frontend/src/api/client.ts` lo
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

**FarmaG** — Sistema de gestión de inventario y dispensación gratuita de medicamentos para la Farmacia Municipal de Gualán, Zacapa, Guatemala.

*(Antes se llamaba "FarmaRH"; renombrado a "FarmaG" el 2026-07-20 — ver sesión correspondiente en el
Historial. El repositorio de GitHub sigue llamándose `proyecto_muni`, eso no cambió.)*

**Repositorio:** https://github.com/dareyes-87/proyecto_muni.git

**Especificación completa:** Ver `docs/FarmaG_Especificacion_Tecnica_v1.md`

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
- [x] Escáner de código de barras en el formulario de entradas (agregado por Jorge, sesión 2026-08-03)
- [x] Importación masiva de inventario desde Excel (sesión 2026-08-04, ver Historial)

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
- [x] Evidencia fotográfica con flujo de dos dispositivos (QR + captura desde celular) (sesión 2026-08-06, ver Historial)

**Estado actual:** Módulo completo — backend y frontend implementados. Mergeado a `main` el 2026-06-27; correcciones finales (cast de `req.params`, modal de confirmación, import sin usar) mergeadas el 2026-07-19 tras verificación integral con los tres módulos.

**Deuda técnica:** resuelta. `dispensacion.routes.ts` ya usa `const { id } = req.params as { id: string }` en los handlers con `:id`, y `Dispensacion.tsx` ya tiene modal de confirmación antes de despachar. `tsc --noEmit` (backend) y `tsc -b` (frontend) limpios, verificado en `main`.

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
- [x] Endpoint CRUD completo para medicamentos (con detección de duplicados)
- [x] Endpoint de búsqueda por nombre parcial (autocompletado)
- [x] Endpoint de búsqueda por código de barras
- [x] Endpoint CRUD para códigos de barras (agregar/eliminar por medicamento)
- [x] Endpoint CRUD para categorías
- [x] Endpoint CRUD para proveedores/donantes
- [x] Endpoint CRUD para ubicaciones/estantes
- [x] Página de Medicamentos (tabla TanStack Table, búsqueda, modal crear/editar, advertencia de duplicados, gestión de códigos de barras)
- [x] Página de Categorías (tabla + formulario)
- [x] Página de Proveedores (tabla + formulario, filtro INSTITUCION/PERSONA)
- [x] Página de Ubicaciones (tabla + formulario)
- [x] Merge de `feature/catalogos` a `main` — completado 2026-07-19 tras auditoría independiente (ver Historial de Sesiones).
- [x] Endpoint de consulta OpenFDA por código de barras + autocompletado en el modal de Medicamentos (sesión 2026-08-04, ver Historial)
- [x] Campo de foto en medicamentos (subida + preview) (sesión 2026-08-04, ver Historial)

**Estado actual (2026-07-19):** Módulo de Catálogos completo y **mergeado a `main`**. Backend (CRUD medicamentos con duplicados, categorías, proveedores, ubicaciones, códigos de barras) y las 4 páginas frontend verificados de forma independiente (no solo con el resumen de Audias): diff de archivos, contenido íntegro de `catalogos.routes.ts`, checkout real de la rama + `docker compose up --build`, y pruebas en vivo con curl de los 4 GET más el flujo completo de barcode (creación de código de prueba → `GET /barcode/:codigo` devolviendo `stockActual` → limpieza del dato de prueba). **Pendiente:** verificación visual en navegador (click-through) de las 4 páginas — no se hizo en ninguna sesión hasta ahora por falta de herramienta de browser automation.

**Deuda técnica corregida en este merge:** `catalogos.routes.ts` tenía el mismo problema que ya estaba documentado como deuda técnica de Jorge en `dispensacion.routes.ts` (`@types/express` v5 vs `express` v4 → `req.params`/`req.query` tipan como `string | string[]`). Se corrigió con `as { id: string }` en los 7 handlers afectados. **`dispensacion.routes.ts` sigue con el mismo problema sin corregir** (fuera de mi alcance, ver sección de Jorge).

---

### Módulo Compartido — Reportes

**Responsable:** Daniel Reyes (implementado 2026-07-19)

**Archivos principales:**
- `backend/src/routes/reportes.routes.ts`
- `backend/src/services/reportes.service.ts`
- `backend/src/utils/pdf.ts`, `backend/src/utils/excel.ts`
- `frontend/src/pages/Reportes.tsx`

**Responsabilidades:**
- [x] Endpoint GET /api/reportes/dispensaciones (filtros: fecha, beneficiario, medicamento)
- [x] Endpoint GET /api/reportes/consumo-medicamentos (ranking, filtros: fecha, categoría)
- [x] Endpoint GET /api/reportes/inventario-actual (a nivel de lote, filtros: categoría, origen, estado)
- [x] Endpoint GET /api/reportes/por-vencer (filtro: umbral de días, default 90)
- [x] Endpoint GET /api/reportes/entradas-proveedor (filtros: fecha, proveedor, origen)
- [x] Endpoint GET /api/reportes/medicamentos-baja (lotes VENCIDO/DADO_DE_BAJA, con resumen de unidades y costo estimado perdidos)
- [x] Endpoint GET /api/reportes/exportar/:tipo/:formato (PDF + Excel, solo ADMIN)
- [x] Página de Reportes con selector de tipo, filtros dinámicos y tabla TanStack
- [x] Exportación a PDF (pdfkit, con encabezado institucional desde `NOMBRE_FARMACIA`)
- [x] Exportación a Excel (exceljs, headers + autofilter)
- [x] Auditoría de cada exportación (`accion: 'CREAR'`, `entidad: 'reporte'`)

**Estado actual:** Completo y verificado, incluyendo un ciclo de corrección post-entrega (ver
sesión 2026-07-19 "fix pantalla en blanco + rediseño PDF/Excel" en el Historial). `tsc` limpio en
backend y frontend. Probados con curl los 6 GET (incl. filtros reales) y las 6×2 combinaciones de
exportación PDF/Excel — todas devuelven archivos válidos y no vacíos (verificado con `file`,
`pdftotext`, `pdfinfo` y lectura de `sharedStrings.xml` del xlsx). Confirmado 403 en `/exportar`
para rol `ENCARGADO_BENEFICENCIA` (los 6 GET de solo lectura sí son accesibles para ambos roles,
por diseño — solo exportar es ADMIN-only). Los 6 tabs del frontend verificados con Playwright
headless (login real + clic en cada tab + estrés de clics rápidos), sin errores de consola.

**Notas de diseño:**
- El reporte "Historial de beneficiario" de la spec 3.5 **no se implementó como endpoint nuevo**:
  ya existe como `GET /api/dispensacion/beneficiarios/:id` (módulo de Jorge). No se duplicó.
- `medicamentos-baja` filtra por rango de fechas sobre `fechaVencimiento`, no sobre una fecha de
  "cuándo se dio de baja" — el modelo `Lote` no tiene ese campo (el motivo de baja solo queda en
  el log de auditoría). Es la aproximación más razonable con el esquema actual.
- Código de barras en reportes: texto/número plano, no imagen escaneable (decisión ya tomada).
- El PDF tiene identidad institucional: logo en `backend/src/assets/logo-municipalidad.png` (ya
  commiteado), color `#1E3F88` (= `primary-900` en `tailwind.config.js`), header con fondo de
  color, zebra striping, alineación por tipo de dato, y footer con "Página X de Y". Si el logo
  llegara a faltar en el filesystem, `pdf.ts` genera el PDF igual sin romperse (fallback con
  `fs.existsSync`) — no asumir que el archivo siempre está presente al tocar ese código.
- **Cuidado con pdfkit:** el truncado de texto largo requiere `height` acotado en las opciones de
  `.text()`, no `lineBreak: false` (no dispara el mecanismo de ellipsis). Y cualquier texto
  posicionado en `y >= page.height - margins.bottom` (fuera del área de contenido) hace que pdfkit
  inserte páginas en blanco silenciosamente — el footer de paginación tiene que ir *dentro* del
  margen inferior, no debajo de él.

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

> Última actualización: 2026-08-06 — evidencia fotográfica de dispensación con flujo de dos
> dispositivos: la encargada registra en la computadora y toma las fotos desde su celular
> escaneando un QR, sin transferir archivos. Deadline del proyecto: 2026-08-29.
> **Proyecto funcionalmente completo según la especificación técnica v1**, ahora con mejoras de
> productividad sobre ese alcance base.

### Lo que está en `main` y funciona HOY

| Módulo | Rutas activas | Estado |
|--------|--------------|--------|
| Inventario (Daniel) | `/inventario`, `/entradas` | ✅ Completo |
| Dispensación (Jorge) | `/dispensacion`, `/beneficiarios` | ✅ Completo, con evidencia fotográfica vía QR |
| Captura móvil | `/captura/:token` (**pública, sin login**) | ✅ Completa, ver sesión 2026-08-06 |
| Admin / Usuarios (Daniel) | `/usuarios` (solo ADMIN) | ✅ Completo |
| Auditoría | `/auditoria` (solo ADMIN) | ✅ Completo |
| Dashboard | `/` | ✅ Con alertas reales |
| Catálogos (Audias) | `/medicamentos`, `/categorias`, `/proveedores`, `/ubicaciones` | ✅ Completo, mergeado a `main` 2026-07-19 |
| Reportes (Daniel) | `/reportes` (solo ADMIN) | ✅ Completo, 6 reportes + exportación PDF/Excel |

**Los 5 módulos de la especificación técnica v1 están implementados, integrados y verificados en
`main`.** Ver detalle de cada verificación en Historial de Sesiones.

### Deuda técnica pendiente

- Los proveedores creados automáticamente por la importación de Excel quedan con `tipo:
  INSTITUCION` por defecto (el Excel no trae esa columna) — revisar/corregir manualmente en
  Catálogos > Proveedores si en realidad es una PERSONA.
- La conversión GTIN→NDC del lookup de OpenFDA asume que el NDC-11 usa alguno de los tres formatos
  de guion más comunes (4-4-2, 5-3-2, 5-4-1); no cubre todos los labelers registrados en la FDA.
- `frontend/nginx.conf` (proxy de `/uploads/` para el build de producción) no se probó en runtime
  en esta sesión — el `docker-compose.yml` de este proyecto usa `FRONTEND_TARGET=development` por
  defecto (Vite en :5173), que sí se verificó funcionando. Antes de desplegar a producción con
  `FRONTEND_TARGET=production`, confirmar que las fotos cargan a través de nginx.
- **El flujo de captura por QR no se probó con un celular físico** (no hay forma de escanear un QR
  real ni de abrir la cámara desde el entorno de desarrollo). Sí se verificó todo lo demás
  end-to-end en navegador. Ver "Prueba pendiente con celular real" abajo.
- Las fotos de dispensación no se borran nunca: al dar de baja o corregir una dispensación, los
  archivos en `backend/uploads/dispensaciones/<id>/` quedan. No es un problema con el volumen
  actual, pero conviene tenerlo presente si el sistema corre por años.

### Pendiente para el equipo

- Verificación visual en navegador (click-through) de las páginas de Catálogos y Auditoría —
  siguen sin probarse en un browser real. **Reportes ya se probó con Playwright headless**
  (instalado ad hoc en la sesión del 2026-07-19, no queda como dependencia del proyecto) — fue así
  como se encontró el bug de pantalla en blanco que el curl/tsc no detectaban.
- Fuera de fase 1 (no bloqueante, ver sección 5 de la especificación técnica): módulo de ventas con
  tickets, devoluciones, alertas de tratamientos recurrentes, código de barras visual en PDFs,
  super admin multi-tienda, integración con sistema de trámites municipal.
- Si se cambia `docker-compose.yml` o `.env` con datos reales de producción, recordar que
  `backend/uploads/medicamentos/` y `backend/uploads/dispensaciones/` son volúmenes bind-mount —
  no se pierden entre reinicios, pero si se hace `docker compose down -v` **no se borran** (no
  están en el volumen nombrado `pgdata`), son carpetas del host.

### Prueba pendiente con celular real (captura por QR)

Todo el flujo se verificó en navegador, pero **nadie lo ha probado escaneando el QR con un celular
de verdad**. Para hacerlo en la farmacia:

1. Averiguar la IP del equipo de escritorio en la red local: `ip addr | grep "inet 192"`.
2. Acceder al sistema desde esa IP, **no** desde `localhost`: `http://192.168.x.x:5173`. El QR se
   arma con `window.location.origin`, así que si la encargada entró por `localhost` el QR dirá
   `localhost` y el celular no podrá abrirlo. Este es el error más probable en la primera prueba.
3. Confirmar que el celular está en la misma red WiFi que el equipo.
4. Si el celular no carga la página, revisar el firewall del host:
   `sudo firewall-cmd --add-port=5173/tcp --add-port=3000/tcp` (agregar `--permanent` para que
   sobreviva a reinicios).
5. Escanear el QR y confirmar que los botones abren la **cámara trasera** directamente.

> No hace falta HTTPS: `<input type="file" capture="environment">` abre la app de cámara nativa y
> no usa `getUserMedia`, así que no requiere contexto seguro. Si en el futuro se cambiara a captura
> con vista previa en vivo dentro del navegador, ahí sí haría falta HTTPS y esto dejaría de
> funcionar sobre IP de red local.

### Primer paso cuando se reanude la sesión

```bash
git pull origin main          # traer el estado actual
docker compose up             # verificar que todo sigue arriba
curl -s http://localhost:3000/api/health   # confirmar API
```

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

### 2026-07-19 — Audias Guevara (rama `feature/catalogos`)
- Rebase de `feature/catalogos` sobre `main` (`89d7736`): un solo conflicto en
  `catalogos.routes.ts`, resuelto combinando mi CRUD completo con las lecturas mínimas de Daniel
  (paginación + filtro `q` en `/medicamentos`, filtro `tipo` + `activo` en `/proveedores`).
  `CLAUDE.md` se auto-mergeó sin conflicto.
- Verificación en runtime (docker compose up, los 4 GETs, ciclo POST→GET→PUT activo:false→GET
  para confirmar soft-delete): todo correcto.
- Corregí en `catalogos.routes.ts` el mismo problema de tipos (`@types/express` v5 vs `express`
  v4) que ya estaba documentado como deuda de Jorge en `dispensacion.routes.ts` — 7 handlers con
  `const { id } = req.params as { id: string }`. No toqué `dispensacion.routes.ts` (fuera de mi
  módulo); esa deuda sigue pendiente para Jorge.
- Frontend: 4 páginas nuevas (`Medicamentos.tsx` con TanStack Table + flujo de duplicados +
  gestión de códigos de barras, `Categorias.tsx`, `Proveedores.tsx`, `Ubicaciones.tsx`), extendí
  `api/catalogos.ts` y `types/index.ts` de forma aditiva (sin romper las funciones/tipos que ya
  usa `Entradas.tsx` de Daniel), agregué las 4 rutas y entradas de sidebar en `App.tsx` /
  `Layout.tsx` sin tocar las de otros módulos.
- `tsc` limpio en todo lo que toqué (backend y frontend). Probé las páginas vía Vite dev server
  (todas transforman sin error de resolución) pero **no hubo verificación visual en navegador**
  por no tener herramienta de browser automation disponible en esta sesión.
- **Pendiente:** push de `feature/catalogos` (requiere `--force-with-lease` por el rebase) y merge
  a `main` (completado en la siguiente sesión, ver abajo).

### 2026-07-19 — Auditoría y merge de `feature/catalogos` a `main`

**Auditoría independiente de la rama de Audias antes de mergear** (no se confió en su resumen de
sesión, se verificó todo directamente):
- Rebase sobre `main`: correcto — `merge-base(main, feature/catalogos)` = `89d7736` = HEAD de main.
- Archivos ajenos: ninguno tocado (`inventario.*`, `dispensacion.*`, `Usuarios.tsx`, etc. intactos).
- `catalogos.routes.ts` leído completo: soft-delete correcto en los GETs que aplican (Ubicación no
  tiene campo `activo` en el schema, así que no aplica ahí), barcode devuelve `stockActual`
  (probado en vivo creando y borrando un código de prueba), detección de duplicados presente,
  los 10 endpoints de escritura tienen `requireRole('ADMIN')` + `registrarAuditoria()`.
- Las 4 páginas frontend existen con implementaciones reales (135–495 líneas cada una), rutas
  activas en `App.tsx`.
- Checkout real de `feature/catalogos` + `docker compose up --build`: build limpio, containers
  arriba sin errores, los 4 GET de catálogos y el flujo de barcode responden con datos reales vía
  curl con JWT real.
- `tsc` backend y frontend: 2 errores, ambos preexistentes en `main` y ajenos al módulo de
  Catálogos (`dispensacion.routes.ts` sin cast de `req.params`, import `Plus` sin usar en
  `Dispensacion.tsx`) — confirmados comparando contra `origin/main`, no introducidos por Audias.
- Hallazgo de Audias sobre falta de modal de confirmación en `Dispensacion.tsx`: verificado y
  correcto.

**Veredicto:** apto para merge sin correcciones. `git merge --no-ff feature/catalogos` a `main`,
sin conflictos. Push a `origin/main` con autorización del usuario.

**Estado de `main` tras este merge:** Inventario + Dispensación + Admin + Catálogos completos y
funcionando end-to-end. El escáner de código de barras de Jorge ya tiene backend real. Reportes
sigue sin iniciar. Deuda técnica pendiente: casts de `req.params` y modal de confirmación en
`dispensacion.routes.ts` / `Dispensacion.tsx` (Jorge).

### 2026-07-19 — Verificación integral de los tres módulos + merge final de `feature/dispensacion`

Jorge subió el commit `323bbe7` a `feature/dispensacion` corrigiendo los 3 pendientes que había
dejado la auditoría de Catálogos: cast de `req.params`, modal de confirmación en `Dispensacion.tsx`,
e import `Plus` sin usar. Antes de mergear se hizo una verificación integral de los tres módulos
funcionando juntos (no solo lint/compilación):

- Rebase de `feature/dispensacion` sobre `main` actualizado (con Catálogos ya mergeado): limpio,
  sin conflictos.
- `docker compose down -v && up --build`: los 3 contenedores arrancan sanos, sin errores en logs.
- `tsc --noEmit` (backend) y `tsc -b` (frontend): **cero errores** — confirma que el commit de
  Jorge corrigió los 2 errores preexistentes detectados en la auditoría de Catálogos.
- Flujo funcional end-to-end con curl real (login + JWT) cubriendo los tres módulos integrados:
  catálogos (crear medicamento → detección de duplicados real porque ya existía en el seed, código
  de barras, búsqueda), inventario (entrada con 2 lotes, semáforos ROJO/VERDE, alertas de
  `porVencer`), dispensación (beneficiario, FIFO exacto entre 2 lotes, lote agotado, historial,
  rechazo por stock insuficiente).
- **Concurrencia (crítico):** dos dispensaciones simultáneas de 15 unidades con solo 20 en stock —
  una tuvo éxito (stock 20→5), la otra fue rechazada con 409 mostrando el stock ya actualizado
  (5 disponibles). Sin doble gasto. Confirma que el `SELECT ... FOR UPDATE` + transacción
  `Serializable` de Jorge funciona correctamente bajo carrera real, no solo en teoría.
- Permisos por rol: usuario `ENCARGADO_BENEFICENCIA` bloqueado (403) en crear medicamento y dar de
  baja un lote; permitido (201) en dispensar y registrar entradas.
- Auditoría: los conteos de `LOGIN`/`CREAR`/`DISPENSAR` en `GET /api/auditoria` coinciden
  exactamente con las acciones ejecutadas durante la prueba.

**Veredicto:** sistema listo. `git merge --no-ff feature/dispensacion` a `main`, sin conflictos.
Push a `origin/main` con autorización del usuario.

**Estado de `main` tras este merge:** los tres módulos (Inventario, Dispensación, Catálogos) más
Admin/Usuarios están integrados, compilan limpio y fueron verificados funcionando juntos en runtime,
incluyendo el caso crítico de concurrencia. No queda deuda técnica conocida. Pendiente: verificación
visual en navegador (nadie ha tenido herramienta de browser automation todavía) y el módulo de
Reportes, que no ha iniciado.

### 2026-07-19 — Página de Auditoría (frontend)

El backend de auditoría (`auditoria.routes.ts`, `GET /api/auditoria` con filtros y paginación) ya
existía y funcionaba, pero **la página frontend nunca se había creado** — la ruta `/auditoria`
estaba comentada en `App.tsx` y el link del sidebar (ya visible para ADMIN en `Layout.tsx`) llevaba
a un destino roto.

- Creado `frontend/src/pages/Auditoria.tsx`: tabla TanStack con filtros (usuario, acción, entidad,
  rango de fechas), paginación, fila expandible con `datosAnteriores`/`datosNuevos` en JSON, badges
  de color por acción.
- Creado `frontend/src/api/auditoria.ts` y tipos `LogAuditoria`/`AccionAuditoria` en `types/index.ts`.
- Ruta `/auditoria` descomentada en `App.tsx`, envuelta en `AdminRoute`.
- Verificado: `tsc -b` limpio, Vite transforma el módulo sin error, endpoint probado con los
  filtros reales que usa la página (por acción, por entidad, por rango de fechas, paginación), y
  control de acceso (401 sin token, 403 para `ENCARGADO_BENEFICENCIA`).

### 2026-07-19 — Módulo de Reportes (backend + frontend, completo)

Último módulo pendiente de la especificación técnica v1. Implementado por Daniel Reyes (dueño del
módulo de Reportes según CLAUDE.md).

**Backend:**
- `backend/src/services/reportes.service.ts`: las 6 consultas (dispensaciones, consumo por
  medicamento vía `groupBy`, inventario actual a nivel de lote reutilizando
  `getUmbrales`/`calcularSemaforo`/`diasParaVencer` de `inventario.service.ts`, por vencer con
  umbral configurable, entradas por proveedor con totales calculados, medicamentos dados de baja
  con resumen de unidades/costo perdido), todas paginadas.
- `backend/src/utils/pdf.ts` (pdfkit, tabla simple con paginación automática) y
  `backend/src/utils/excel.ts` (exceljs, headers + autofilter).
- `backend/src/routes/reportes.routes.ts`: 6 GET (solo `authMiddleware`) + `GET
  /exportar/:tipo/:formato` (`requireRole('ADMIN')`), con encabezado institucional leído de
  `configuracion_sistema` (`NOMBRE_FARMACIA`) y `registrarAuditoria()` en cada exportación.
- Dependencias `pdfkit` y `exceljs` agregadas a `backend/package.json` (sin `package-lock.json` en
  este proyecto, nada más que actualizar).

**Frontend:** `frontend/src/pages/Reportes.tsx` — selector de tipo (6 tabs), panel de filtros
dinámico según el tipo seleccionado (incluye buscador con autocompletado para beneficiario y
medicamento en el reporte de Dispensaciones, reutilizando `/dispensacion/beneficiarios/buscar` y
`buscarMedicamentos`), tabla TanStack con columnas específicas por tipo, botones de exportación que
descargan el archivo vía blob (necesario porque el JWT va en `Authorization` header, no en cookie,
así que `window.open` no habría funcionado). Ruta `/reportes` activada en `App.tsx` dentro de
`AdminRoute` (el link del sidebar ya existía).

**Verificación:** `tsc --noEmit` (backend) y `tsc -b` (frontend) limpios. Los 6 GET probados con
curl y filtros reales (incl. `dias` dinámico en por-vencer, filtro de `medicamentoId`, `origen`
inválido → 400). Las 6 combinaciones de exportación × 2 formatos (12 en total) devuelven archivos
no vacíos y válidos — confirmado con `file`, `pdftotext` (el PDF trae el encabezado "Farmacia
Municipal de Gualán" + filtros aplicados + datos reales) y lectura de `sharedStrings.xml` dentro
del `.xlsx`. 403 confirmado en `/exportar` para `ENCARGADO_BENEFICENCIA`; los 6 GET de solo lectura
sí son accesibles para ambos roles (por diseño, solo exportar es ADMIN-only). Auditoría: 10
exportaciones de prueba generaron exactamente 10 registros `CREAR`/`reporte`.

**Nota:** el reporte "Historial de beneficiario" de la spec 3.5 no se implementó como endpoint
nuevo porque ya existe (`GET /api/dispensacion/beneficiarios/:id`, módulo de Jorge).

**Veredicto: proyecto funcionalmente completo según la especificación técnica v1.** Los 5 módulos
(Inventario, Dispensación, Catálogos, Auditoría, Reportes) más Admin/Usuarios están en `main`,
compilan limpio y fueron verificados end-to-end. Pendiente global: verificación visual en
navegador de todas las páginas (ninguna sesión ha tenido herramienta de browser automation) y las
funcionalidades explícitamente fuera de fase 1 según la spec (sección 5).

### 2026-07-19 — Fix de pantalla en blanco en Reportes + rediseño institucional de PDF/Excel

El usuario reportó dos problemas después de la entrega del módulo de Reportes: 4 de los 6 tabs
(Inventario actual, Por vencer, Entradas por proveedor, Dados de baja) ponían la pantalla en
blanco al seleccionarlos, y el PDF exportado se veía como texto plano sin identidad visual.

**Diagnóstico del bug (crítico):** el `curl`/`tsc` de la sesión anterior no lo detectaban porque no
era un problema de contrato API — verifiqué los 4 endpoints de nuevo y las formas de respuesta
coincidían exactamente con lo que el frontend esperaba. Para ver el error real instalé Playwright +
Chromium headless ad hoc en el entorno (no quedó como dependencia del proyecto) y reproduje el
crash con login real + clic en cada tab, capturando el stack trace: `Cannot read properties of
undefined (reading 'nombreGenerico')` en el `accessorFn` de una columna. Causa raíz: condición de
carrera de React — al cambiar `tipo`, las columnas de TanStack se recalculan de inmediato vía
`useMemo`, pero `filas` (estado async) todavía tiene los datos del tab anterior en el primer
render posterior al clic. Con columnas nuevas + filas viejas en el mismo render, TanStack accede a
un campo que no existe en la forma antigua (p. ej. `r.medicamento` en una fila de dispensaciones,
que tiene `medicamentos` en plural) y truena sin error boundary → pantalla en blanco.

**Fix:** en `Reportes.tsx`, se agregó `filasTipo` (con qué tipo de reporte corresponden las filas
actuales en estado) y un `tipoRef` que se actualiza de forma síncrona en cada render. La tabla solo
usa `filas` cuando `filasTipo === tipo`; si no coinciden, muestra "Cargando..." en vez de intentar
renderizar datos con la forma equivocada. Además, `cargar()` ahora descarta respuestas que llegan
después de que el usuario ya cambió de tab (comparando contra `tipoRef.current`), evitando que una
petición lenta pise datos más nuevos. Verificado con Playwright: los 6 tabs cargan sin error de
consola, y el flujo sobrevive 3 rondas de clics rápidos entre los 6 tabs sin crashear.

**Rediseño de PDF (`backend/src/utils/pdf.ts`):** logo desde `backend/src/assets/logo-municipalidad.png`
con fallback defensivo (`fs.existsSync`, nunca lanza 500 si falta — se verificó explícitamente
renombrando el archivo temporalmente y confirmando que el PDF se genera igual, sin logo). Color
institucional `#1E3F88` (= `primary-900` de `tailwind.config.js`). Header de tabla con fondo de
color y texto blanco en negrita, zebra striping, alineación derecha en columnas numéricas vía un
nuevo campo `alineacionesPdf` por tipo de reporte en `reportes.routes.ts`, footer con "Página X de
Y" usando `bufferPages: true` + `switchToPage`. En el camino se encontraron y corrigieron dos bugs
de pdfkit no obvios, detectados generando un PDF sintético de 60 filas para forzar salto de página:
1. El truncado de texto largo (`ellipsis: true`) no funciona con `lineBreak: false` — pdfkit
   necesita un `height` acotado para activar el mecanismo de truncado; sin eso el texto se
   desbordaba envolviendo a una segunda línea fuera de la fila.
2. El footer se había posicionado en `page.height - margins.bottom + 10` (por debajo del margen
   inferior). pdfkit interpreta cualquier texto ahí como contenido desbordado y agrega páginas en
   blanco silenciosamente — un reporte de 60 filas generaba 9-12 páginas en vez de 3. Corregido
   posicionando el footer dentro del área de contenido (`- 14` en vez de `+ 10`).
   También se ajustó que en saltos de página solo se repita el encabezado de columnas (no el
   logo/nombre/franja completos), evitando desperdiciar ~165pt por página.

**Excel (`backend/src/utils/excel.ts`):** freeze pane en la fila de encabezado, ancho de columna
calculado según el contenido real (no un valor fijo), mismo color institucional en el header.

**Verificación final:** `tsc` limpio en backend y frontend. Los 12 combos de exportación (6 tipos ×
2 formatos) regenerados y confirmados válidos. Convertí varios PDFs a imagen (`pdftoppm`) para
inspección visual real, no solo "el archivo no está vacío" — confirmé logo, colores, zebra
striping, alineación, truncado con ellipsis y paginación correcta en las 3 páginas de la prueba
sintética. Reporté el diagnóstico y las capturas al usuario antes de hacer commit, como pidió.

**Commit:** `5f721e2`, pusheado a `origin/main`, incluye el logo real que el usuario ya había
colocado en `backend/src/assets/logo-municipalidad.png`.

### 2026-07-19 — Paleta de colores institucional de la Municipalidad de Gualán

El usuario extrajo del logo los colores reales de la municipalidad y pidió reemplazar el azul
genérico que se usaba desde el setup inicial (`primary-700/800/900` = `#1d56d6/#1e47ad/#1e3f88`)
por la identidad real: azul principal `#0089C6`, azul oscuro `#006EAE`, azul muy oscuro `#003D8B`,
azul claro `#88C8E4`, dorado `#FFE000`.

- `frontend/tailwind.config.js`: la paleta `primary` (50-900) se regeneró completa por
  interpolación HSL, con los 4 azules dados como anclas **exactas** (no aproximadas) en 300, 500,
  600 y 900 — se calculó con un script de Python (`colorsys`) para que el resto de la escala fuera
  perceptualmente consistente en vez de inventada a ojo. Se agregó una paleta nueva `dorado`
  (50-900) anclada en `#FFE000` = `dorado-500`, para acentos únicamente.
- Acentos dorados aplicados solo donde el usuario pidió explícitamente: el wordmark "FarmaG" del
  sidebar (`text-dorado-400`), el badge de rol bajo el nombre de usuario (antes texto plano, ahora
  una píldora con fondo/anillo dorado), y un anillo + color de ícono dorado en el `Pill` del login.
  **No** se tocaron botones de acción primaria, bloques de texto largo, ni los colores del
  semáforo de vencimiento (`Semaforo.tsx` usa `emerald`/`amber`/`red`/`gray` de Tailwind
  directamente, no la paleta `farmacia` del config — que de hecho no se referencia en ningún lado
  del código; se dejó intacta igual, tal como pidió el usuario).
- Se encontraron y corrigieron 2 hardcodeos de `bg-blue-*`/`text-blue-*` que no habrían heredado el
  cambio de tailwind.config.js (`Dashboard.tsx` en el stat-tile de color "blue", `Auditoria.tsx` en
  el badge de la acción `EDITAR`) — cambiados a `primary-*` equivalentes.
- El color institucional hardcodeado en `backend/src/utils/pdf.ts` (`#1e3f88`, encabezado de tabla
  y línea divisoria) y en `backend/src/utils/excel.ts` (`FF1E3F88`, fondo del header) se
  actualizaron a `#003d8b` / `FF003D8B` — el usuario solo pidió `pdf.ts` explícitamente, pero
  `excel.ts` tenía el mismo azul viejo hardcodeado desde la sesión anterior y se corrigió también
  para no dejar el sistema con dos azules "institucionales" distintos conviviendo.

**Gotcha de Docker (dejar constancia para el equipo):** `tailwind.config.js` vive en la raíz de
`frontend/`, pero `docker-compose.yml` solo monta `./frontend/src` y `./frontend/public` como
volúmenes. Un cambio a `tailwind.config.js` (o a `package.json`, `vite.config.ts`, etc., cualquier
archivo fuera de `src/`/`public/`) **no se refleja con hot-reload** — el contenedor sigue sirviendo
la copia que se horneó en la imagen en el último build. Hace falta `docker compose up --build web`
para que tome el cambio. Esto costó una vuelta completa de verificación con capturas de pantalla
que mostraban el azul viejo a pesar del `tsc` limpio y el HMR de Vite reportando éxito — hay que
recordar este paso para cualquier cambio futuro a archivos de config del frontend.

**Verificación:** `tsc` limpio en frontend y backend. Reconstruí el contenedor `web` (no bastaba
con HMR por el punto anterior) y tomé capturas reales con Playwright del login, dashboard/sidebar,
inventario y auditoría para confirmar visualmente los colores nuevos — no me quedé solo con "el
build no truena". Confirmé que el semáforo de vencimiento sigue verde/ámbar/rojo sin cambios.
Regeneré un PDF y un Excel para confirmar que el color institucional también se actualizó ahí
(`#003d8b` presente, `#1e3f88` ausente, verificado extrayendo el XML interno de ambos archivos).
Corrí de nuevo la batería de Playwright sobre los 6 tabs de Reportes para descartar regresiones del
fix de la sesión anterior.

**Commit:** `347b1cb`, pusheado a `origin/main`.

### 2026-07-20 — Formato de fecha, espaciado de PDF, y rename FarmaRH → FarmaG

Tres correcciones al módulo de Reportes/PDF más un cambio de nombre de marca en todo el proyecto.

**1. Formato de fecha:** el sistema mostraba fechas inconsistentes entre componentes
(`toLocaleString('es-GT')` sin opciones da "19/7/2026, 7:08:02 a. m." — con segundos, 12h, y sin
ceros a la izquierda). Se creó un helper reutilizable en **dos** lugares —
`frontend/src/utils/formatDate.ts` y `backend/src/utils/formatDate.ts` (no se pueden compartir
directamente entre ambos runtimes sin infraestructura de paquete compartido, que este proyecto no
tiene) — con `formatFechaHora()` (`dd/mm/aaaa HH:mm`, 24h, sin segundos) y `formatFecha()`
(`dd/mm/aaaa`, sin hora), implementados con `padStart` manual en vez de `Intl`/`toLocaleString` para
que el formato sea determinista y no dependa de la locale del runtime. Aplicado en
`Reportes.tsx`, `Auditoria.tsx`, y en `pdf.ts`/`reportes.routes.ts` (backend, tanto la línea
"Generado:" del PDF como las columnas de fecha de los 6 reportes exportados).

**2. Espaciado de columnas en PDF:** `generarPdfTabla()` dividía el ancho de página en partes
iguales entre columnas, lo que en Dispensaciones dejaba "Present." (palabras cortas como "Cápsula")
con el mismo ancho que "Usuario" (nombres completos), truncando este último — dato importante para
trazabilidad de quién dispensó. Se agregó `anchosRelativos?: number[]` a `PdfTablaOptions` (pesos
proporcionales, no puntos absolutos) y un `anchosRelativosPdf` específico por tipo de reporte en
`reportes.routes.ts` para los 6 reportes, no solo Dispensaciones.

**3. Rename FarmaRH → FarmaG:** grep recursivo confirmó 0 ocurrencias de "farmarh" (case-insensitive)
en todo el repo tras el cambio, incluyendo:
- Contenido de código/docs (backend, frontend, README, docs/) vía reemplazo `FarmaRH`→`FarmaG` /
  `farmarh`→`farmag` respetando mayúsculas.
- El archivo `docs/FarmaRH_Especificacion_Tecnica_v1.md` **se renombró** (`git mv`) a
  `docs/FarmaG_Especificacion_Tecnica_v1.md`, y se actualizaron sus 3 referencias cruzadas
  (README.md, CLAUDE.md, docs/PROMPTS_EQUIPO.md).
- `frontend/src/context/AuthContext.tsx` y `api/client.ts`: las claves de `localStorage`
  (`farmarh_token`/`farmarh_usuario` → `farmag_token`/`farmag_usuario`). Efecto secundario esperado:
  cualquier sesión activa en un navegador se invalida (localStorage ya no tiene esas claves) — hay
  que volver a iniciar sesión una vez después de este cambio, no es un bug.
- **`docker-compose.yml`:** `container_name` de los 3 servicios (`farmarh_db/api/web` →
  `farmag_db/api/web`) y los *defaults* de `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`
  (`${DB_USER:-farmarh}` → `${DB_USER:-farmag}`, etc.). También `.env` (no versionado) y
  `.env.example` (sí versionado) a juego.

  **⚠️ Impacto operativo — leer antes de levantar Docker de nuevo:** cambiar el usuario/nombre de
  base de datos por defecto significa que el volumen `pgdata` ya existente (inicializado con el
  usuario/DB viejo `farmarh`) **ya no es compatible** con las nuevas credenciales — Postgres no
  renombra usuarios/DBs existentes solo porque cambien las variables de entorno. Todo el que tenga
  el proyecto corriendo localmente necesita:
  ```bash
  git pull origin main
  docker compose down -v      # -v es necesario: borra el volumen de Postgres viejo (solo datos de prueba/seed, no hay nada de producción que perder)
  docker compose up --build   # recrea todo con los nombres/credenciales nuevos y re-siembra la DB
  ```
  Sin el `-v`, el contenedor `api` fallará al conectar (usuario `farmag` no existe en el volumen
  viejo). Esto se probó en esta sesión: `down -v` + `up --build` dejó los 3 contenedores como
  `farmag_db`/`farmag_api`/`farmag_web`, sanos, con la DB re-sembrada desde cero.
- Se dejó **una** mención deliberada de "FarmaRH" como nota histórica en la sección "Proyecto" de
  este archivo (que antes se llamaba así) — es la única ocurrencia que debe sobrevivir un grep.

**Verificación:** `tsc` limpio en backend y frontend. Regeneré los 12 combos de exportación
(6 tipos × 2 formatos) tras el rebuild — todos 200 OK. Confirmé con `pdftotext` que el pie de
página del PDF dice "Documento generado por el Sistema FarmaG". Con Playwright: título de la
pestaña = "FarmaG - Farmacia Municipal de Gualán", `localStorage` con las claves `farmag_*`
correctas tras login real, y repetí la batería de los 6 tabs de Reportes (sin errores) para
descartar que el rebuild de contenedores rompiera el fix de la sesión anterior. Revisé
visualmente (capturas convertidas de PDF) el reporte de Dispensaciones: fecha sin segundos en
24h, "Usuario" ya no se trunca, "Present."/"Cant." angostas — y de paso los otros 5 tipos de
reporte para confirmar que ninguno quedó con columnas desproporcionadas.

**Commit:** `63b9be0`, pusheado a `origin/main` (además de `316a65b`, un commit manual del usuario
que ya había renombrado el sidebar en `Layout.tsx` antes de esta sesión).

### 2026-08-03 — Jorge Vargas — Merge de `feature/dispensacion` a `main`

Integración de pistola de códigos de barras en 3 páginas del frontend + sidebar con scroll
independiente. Auditoría de la rama realizada antes del merge.

**Archivos modificados (4, todos frontend, ningún archivo de backend tocado):**
- `frontend/src/pages/Catalogos/Medicamentos.tsx` (+103 −34)
- `frontend/src/pages/Dispensacion.tsx` (+11 −4)
- `frontend/src/pages/Entradas.tsx` (+78 −30)
- `frontend/src/components/layout/Layout.tsx` (+7 −5)

**Cambios:**
1. **Escáner de código de barras en Catálogos (Medicamentos.tsx):** al abrir el modal de códigos de
   barras, captura global de teclas (`document.addEventListener('keydown')`) redirige input de la
   pistola al campo aunque no tenga foco. Inputs no controlados (lectura directa del DOM vía
   `useRef`) para compatibilidad con la velocidad de la pistola. Re-focus automático tras cada
   escaneo.
2. **Escáner de código de barras en Dispensación (Dispensacion.tsx):** auto-focus al campo de código
   de barras al seleccionar beneficiario. Re-focus tras cada escaneo. Banner visual con icono de
   escáner. `autoComplete="off"` para evitar interferencias del navegador.
3. **Escáner de código de barras en Registrar Entrada (Entradas.tsx):** campo de escaneo por lote que
   busca medicamento vía `GET /catalogos/medicamentos/barcode/:codigo` y lo selecciona en el
   dropdown. Etiqueta verde de confirmación visual. Compatible con selección manual.
4. **Sidebar con scroll independiente (Layout.tsx):** contenedor `h-screen overflow-hidden`, sidebar
   con `flex-col` y zona de módulos con `overflow-y-auto` independiente del contenido principal.
   Header "FarmaG" y usuario/logout fijos.

**Auditoría pre-merge:**
- Rebase sobre `origin/main`: limpio (la rama ya estaba al día).
- `docker compose up --build`: 3 contenedores sanos, API y web sin errores en logs.
- `git diff origin/main..feature/dispensacion --name-only`: exactamente los 4 archivos esperados,
  ningún archivo ajeno.
- Endpoints verificados con curl (health, catálogos, inventario, dispensación, reportes): todos OK.
- Merge simulado (`--no-commit --no-ff`): limpio, sin conflictos.

**Merge:** `git merge --no-ff feature/dispensacion` → commit `6e53e17`, pusheado a `origin/main`.

**Nota:** el commit `0c9648c` (el de la rama) salió con autor genérico (`Your Name <you@example.com>`)
porque `git config` no estaba configurado al momento de hacerlo. A partir de este merge, los commits
de Jorge salen como `jorgevargas83 <jvargaso3@miumg.edu.gt>`.

### 2026-08-04 — Daniel Reyes — 3 mejoras urgentes de productividad (deadline 2026-08-29)

Se detectó en campo que registrar medicamentos uno por uno en el formulario es demasiado lento
cuando hay estantes llenos de decenas de productos distintos, con 25 días para la entrega final.
Se implementaron 3 mejoras directamente sobre `main` (sin rama feature, sesión única).

**1. Importación masiva de inventario por Excel (prioridad máxima):**
- `POST /api/inventario/importar-excel` (`backend/src/routes/inventario.routes.ts`): `multer`
  (memoria) + `exceljs`. Lee la hoja por **nombre de columna** (no por posición, tolera columnas
  reordenadas), matchea/crea medicamento (por nombreGenerico+presentacion+concentracion, igual
  criterio que la detección de duplicados de Catálogos pero exacto en vez de "contains"),
  categoría (por nombre), proveedor (por nombre — **los nuevos se crean como `INSTITUCION` por
  defecto**, el Excel no trae columna de tipo; deuda técnica documentada arriba) y ubicación (por
  código), vincula código de barras si no está ya tomado por otro medicamento. Cada fila corre en
  su propia transacción Prisma y se procesan **secuencialmente** (no en paralelo) para que una fila
  pueda reutilizar la categoría/proveedor/medicamento creado por una fila anterior del mismo
  archivo. Una fila con error (falta un campo obligatorio, fecha inválida, cantidad inválida, etc.)
  se reporta pero no aborta las demás. Auditoría granular: un registro por cada
  medicamento/categoría/proveedor/ubicación creado + uno por cada entrada, igual que los endpoints
  interactivos existentes. Solo ADMIN.
- `GET /api/inventario/plantilla-excel`: genera el `.xlsx` con las 13 columnas, una fila de
  ejemplo y una hoja "Instrucciones". Solo ADMIN.
- Modal en `Entradas.tsx` (botón "Importar desde Excel", visible solo para ADMIN): descargar
  plantilla, subir archivo, ver resumen (medicamentos creados/existentes, lotes registrados,
  categorías/proveedores/ubicaciones creados, códigos vinculados) y la lista de errores/avisos por
  fila.
- Probado con un Excel de 4 filas (2 lotes del mismo medicamento nuevo para confirmar reutilización,
  1 medicamento distinto, 1 fila con `cantidad` vacía a propósito): la fila inválida se reportó sin
  afectar las otras 3, que se importaron correctamente con sus entidades relacionadas.

**2. Autocompletado de medicamentos vía OpenFDA:**
- `GET /api/catalogos/medicamentos/lookup-fda/:codigoBarras` (`catalogos.routes.ts`,
  `authMiddleware` sin rol específico): convierte el GTIN/UPC-A/EAN-13 a NDC-10 (la estructura
  estándar de un GTIN de empaque farmacéutico es `[relleno(2)][indicador(1)][NDC-10(10)][dígito
  verificador(1)]` = 14 dígitos), y como el formato de guiones del NDC (4-4-2, 5-3-2 o 5-4-1)
  depende del labeler y no es inferible del código de barras, se prueban los tres contra
  `api.fda.gov/drug/label.json?search=openfda.package_ndc:"..."` hasta obtener resultado. Devuelve
  `{ found: false }` (no 404) si no hay match. Verificado con el GTIN de ejemplo del Sucralfato
  (`00303789205353` → NDC `0378-9205-35`, confirmado con curl y visualmente en el navegador).
- En el modal "Nuevo medicamento" (`Medicamentos.tsx`): campo de escaneo arriba del formulario, solo
  visible al crear (no al editar). Al presionar Enter busca primero localmente
  (`/barcode/:codigo`); si no existe, consulta OpenFDA y auto-llena nombre genérico, comercial,
  presentación, concentración y unidad de medida (los campos que OpenFDA no trae para ese registro
  quedan en blanco para llenado manual — no todos los labels de la FDA tienen todos los campos).
  Banner "Datos sugeridos por OpenFDA — verifique antes de guardar".
- **Bug encontrado y corregido durante la verificación con Playwright:** el banner de "sugerido por
  OpenFDA" quedaba visible también al abrir "Editar" en un medicamento sin relación, porque
  `abrirEditar()` no reseteaba el estado `fdaSugerido` heredado de un uso previo del escaneo en
  "Nuevo". Corregido agregando `setFdaSugerido(false)` en `abrirEditar()`.

**3. Foto de medicamentos:**
- Campo `imagenUrl String?` en `Medicamento` (`schema.prisma`, aplicado con `prisma db push`).
- `POST /api/catalogos/medicamentos/:id/imagen` (`multer` en memoria, límite 5MB, solo
  jpg/png/webp): guarda en `backend/uploads/medicamentos/<id>.<ext>`, borrando primero cualquier
  archivo previo del mismo medicamento (incluso con otra extensión) para no dejar huérfanos.
  `express.static('/uploads', ...)` en `server.ts`. Solo ADMIN.
- Volumen nuevo `./backend/uploads:/app/uploads:z` en `docker-compose.yml` — sin este volumen las
  fotos se pierden en cada `docker compose up --build` porque `backend/uploads` no estaba montado
  (a diferencia de `src` y `prisma`, que sí lo estaban).
- Proxy de `/uploads` agregado en `vite.config.ts` (dev) y `nginx.conf` (build de producción, sin
  probar en runtime esta sesión — ver deuda técnica arriba).
- En el modal de "Editar medicamento": preview de la imagen actual (o un ícono placeholder si no
  tiene) + botón "Subir foto".

**Verificación:** `tsc` limpio en backend y frontend en todo momento (se corrigió sobre la marcha un
error de tipos en la validación de fecha del importador Excel). Verificación funcional con curl:
plantilla Excel descargada y válida, importación de 4 filas con 1 error intencional aislado
correctamente, lookup-fda contra el GTIN real del Sucralfato, subida de imagen con verificación de
que el archivo se sirve vía `/uploads/...` tanto directo al API (3000) como a través del proxy de
Vite (5173). Se instaló Playwright + Chromium headless ad hoc (no queda como dependencia del
proyecto, mismo patrón que sesiones anteriores) para clic-through real de los 3 flujos nuevos con
capturas de pantalla, que fue como se encontró y corrigió el bug del banner de OpenFDA persistente
descrito arriba. `docker compose up --build` corrido para `api` y `web` (ambos tenían cambios en
archivos no montados como volumen: `package.json` del backend y `vite.config.ts`/`nginx.conf` del
frontend).

**Datos de prueba dejados en la base de datos de desarrollo** (no se limpiaron, son claramente
identificables): medicamentos "Loratadina" y "Omeprazol", proveedor "Farmacéutica de Prueba SA",
categoría "Antihistamínico", ubicación "B-2", lotes con `numeroLote` `TEST-00x`, y una imagen de
prueba (1×1 rojo) subida a "Loratadina". Limpiar manualmente si se quiere una BD de demo prolija
antes de mostrar el sistema a terceros.

**Commits:** 3 commits separados en `main` (sin rama feature): importación Excel, OpenFDA + foto de
medicamentos (agrupados porque comparten los mismos archivos en Catálogos), e infraestructura de
fotos (schema, volumen, proxy). Pendiente `git push origin main` — confirmar con el equipo antes de
publicar.

### 2026-08-06 — Evidencia fotográfica de dispensación con flujo de dos dispositivos

La encargada registra la dispensación en la computadora de escritorio y toma las fotos (receta y
entrega) desde su celular escaneando un código QR, sin transferir archivos entre dispositivos.

**Backend:**
- Modelos nuevos en `schema.prisma`: `FotoDispensacion` (con enum `TipoFoto`:
  `RECETA`/`EVIDENCIA_ENTREGA`) y `TokenCaptura`, más las relaciones inversas en `Dispensacion`.
  Aplicado con `prisma db push`.
- `POST /api/dispensacion/:id/generar-token` (autenticado): token `nanoid` de 10 chars, 30 minutos
  de vigencia. Si ya hay uno vigente lo devuelve en vez de crear otro. Como `dispensacionId` es
  `@unique` en `TokenCaptura`, la regeneración es un `upsert` sobre la misma fila (no se acumulan
  filas por dispensación).
- `GET /api/dispensacion/:id/fotos` (autenticado): lo consume el sondeo de la pantalla de escritorio.
- `backend/src/routes/captura.routes.ts` (**nuevo, público, montado en `/api/captura`**):
  `GET /:token/info` y `POST /:token/foto`. No llevan `authMiddleware` a propósito — el celular no
  tiene sesión y la credencial es el token del QR.
- Limpieza de tokens vencidos agregada al cron diario ya existente (`vencimiento.service.ts`), en
  su propio `try/catch` para que un fallo al marcar lotes vencidos no impida purgar los tokens.
- Las fotos se guardan en `backend/uploads/dispensaciones/<dispensacionId>/<TIPO>.<ext>`. **No hizo
  falta agregar un `express.static` nuevo**: el de `/uploads` que ya existía desde la sesión del
  2026-08-04 las sirve. Sí se agregó el volumen y la regla de `.gitignore` correspondientes.

**Sobre la seguridad de los endpoints públicos** (leer antes de tocarlos): que no lleven auth es
deliberado, pero el token está acotado por varios lados a la vez, y quitar cualquiera de estos
límites amplía la superficie de forma no obvia:
- Es aleatorio (`nanoid`, 10 chars) y vive 30 minutos.
- Sirve para **una sola** dispensación, la suya.
- Solo acepta los 2 tipos de foto del enum; cualquier otro valor es 400.
- Solo jpg/png/webp y máximo 5MB.
- Se agregó `@@unique([dispensacionId, tipo])` en `FotoDispensacion` (**esto no estaba en la
  especificación original de la tarea**): volver a subir el mismo tipo *reemplaza* la foto y borra
  el archivo anterior, en vez de acumular. Sin esa restricción, un endpoint público permitiría
  llenar el disco con un solo token válido, y el conteo de "2 fotos = evidencia completa" sería
  incorrecto al haber duplicados del mismo tipo.
- Se marca como `usado` en cuanto están las dos fotos, así que un QR fotografiado por un tercero
  deja de servir.
- Token inexistente, vencido y ya usado devuelven **el mismo 404**, sin distinguir cuál — para no
  filtrar si un token existió alguna vez.

**Frontend:**
- `Dispensacion.tsx`: tras despachar se guarda el id de la dispensación, se pide el token y se
  muestra el QR (`react-qr-code`) con indicadores de receta/entrega que se actualizan por sondeo
  cada 3 s, más "Omitir fotos" (no bloquea el flujo) y "Siguiente dispensación". Si falla generar
  el token se avisa pero no se interrumpe: la dispensación ya quedó registrada.
- `Captura.tsx` (**nuevo**): página standalone mobile-first (`max-w-[420px]`, botones de 60px de
  alto) en la ruta `/captura/:token`, declarada **fuera** de `ProtectedRoute` y sin `Layout`.
- `api/captura.ts` (**nuevo**): las llamadas del celular usan una **instancia limpia de axios**, no
  el `client.ts` compartido. Ese cliente inyecta el JWT y, ante un 401, limpia el storage y
  redirige a `/login` — en el celular eso sacaría al usuario de la pantalla de captura.
- `EvidenciaBadge.tsx` (**nuevo**) + thumbnails ampliables en el historial del detalle de
  beneficiario. El historial vive en `Beneficiarios.tsx`, no en una página propia (no existe una
  tabla de historial independiente en el sistema).

**Decisión de diseño — URL del QR:** se arma con `window.location.origin`, no con el puerto 5173
hardcodeado. En desarrollo da exactamente lo mismo (la encargada ya entra por `http://IP:5173`),
pero así el QR no apunta a un puerto muerto si algún día se despliega con
`FRONTEND_TARGET=production` (nginx en :80). Consecuencia práctica a recordar: **si la encargada
entra por `localhost`, el QR dirá `localhost` y el celular no podrá abrirlo** — tiene que entrar
por la IP de red local. Está documentado en "Prueba pendiente con celular real".

**Verificación:** `tsc` limpio en backend y frontend, y además `vite build` (build de producción
real, no solo chequeo de tipos). `docker compose up --build` de los 3 servicios sin errores en
logs. Con curl: generación de token e idempotencia (segundo POST devuelve el mismo token), info y
subida sin cabecera de auth, tipo inválido → 400, las 2 fotos → `completo: true`, y token ya usado
→ 404 tanto en info como en subida. Token expirado probado forzando `expira_en` al pasado en la BD:
404 en ambos endpoints. La limpieza del cron se ejecutó a mano y borró exactamente el token vencido
(4 → 3). Con Playwright (instalado ad hoc, no queda como dependencia): flujo completo con **dos
contextos de navegador separados** para simular escritorio y celular de verdad — se confirmó que el
contexto móvil tiene el `localStorage` vacío y aun así carga la página, que la subida funciona,
que el escritorio se actualiza solo por el sondeo, y que el badge verde aparece en el historial.
También los 3 estados de badge (completa/parcial/sin evidencia), el visor de foto ampliada, el
botón "Omitir fotos", y la pantalla de enlace inválido tanto con token falso como con token
realmente vencido. Viewport 375×812 (`isMobile: true`). Cero errores de consola; los únicos 404 que
aparecen son los de la prueba intencional de token inválido, duplicados por `React.StrictMode` en
desarrollo.

**Lo que NO se pudo verificar:** escanear el QR con la cámara de un celular físico y confirmar que
`capture="environment"` abre la cámara trasera. Requiere hardware real. Pasos para que el equipo lo
pruebe en la farmacia: ver "Prueba pendiente con celular real (captura por QR)" más arriba.

**Datos de prueba dejados en la BD de desarrollo:** beneficiaria "María López Pérez" (DPI
1234567890123) con 4 dispensaciones de Loratadina en distintos estados de evidencia (2 completas,
1 parcial, 1 sin fotos), usadas para verificar los 3 badges. Consumieron 8 unidades del stock de
prueba de Loratadina. No se limpiaron porque revertir dispensaciones implica restaurar
`cantidad_actual` de los lotes a mano, y son datos claramente identificables.

**Commits:** `f4ff51d` (backend) y `a2b4a36` (frontend), pusheados a `origin/main`.
