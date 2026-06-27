# CLAUDE.md — Contexto del Proyecto FarmaRH

> **Este archivo es la fuente de verdad para cualquier sesión de Claude que trabaje en este proyecto.**
> Cada integrante debe actualizar su sección después de cada sesión de trabajo.

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
- [ ] Endpoint POST /api/inventario/entradas (registro de entradas con lotes)
- [ ] Endpoint GET /api/inventario (listado con semáforo de vencimiento)
- [ ] Endpoint GET /api/inventario/alertas (stock bajo + por vencer + vencidos)
- [ ] Endpoint GET /api/inventario/medicamento/:id (detalle de stock por medicamento)
- [ ] Endpoint PUT /api/inventario/lotes/:id/baja (dar de baja lote vencido)
- [ ] Página de Inventario (tabla con filtros, semáforo visual)
- [ ] Página de registro de entradas (formulario con escáner)
- [ ] Dashboard con alertas reales conectadas al backend
- [ ] Página de gestión de usuarios (CRUD, activar/desactivar)
- [ ] Cron job de vencimiento (ya creado, verificar funcionamiento)

**Estado actual:** Setup base completado. Rutas stub creadas.

---

### Jorge Vargas — Módulo de Dispensación

**Archivos principales:**
- `backend/src/routes/dispensacion.routes.ts`
- `backend/src/services/dispensacion.service.ts` (crear)
- `frontend/src/pages/Dispensacion.tsx` (crear)
- `frontend/src/pages/Beneficiarios.tsx` (crear)

**Responsabilidades:**
- [ ] Endpoint POST /api/dispensacion/beneficiarios (registrar beneficiario)
- [ ] Endpoint GET /api/dispensacion/beneficiarios/buscar?q= (búsqueda por DPI/nombre)
- [ ] Endpoint GET /api/dispensacion/beneficiarios/:id (detalle con historial)
- [ ] Endpoint PUT /api/dispensacion/beneficiarios/:id (editar beneficiario)
- [ ] Endpoint POST /api/dispensacion/despachar (dispensación con FIFO + concurrencia)
- [ ] Endpoint GET /api/dispensacion/historial (con filtros de fecha)
- [ ] Endpoint GET /api/dispensacion/:id (detalle de dispensación)
- [ ] Página de Dispensación (flujo completo: buscar beneficiario → agregar medicamentos → confirmar)
- [ ] Página de Beneficiarios (listado, búsqueda, historial)
- [ ] Componente de escaneo de código de barras para dispensación
- [ ] Lógica de concurrencia: SELECT FOR UPDATE + verificación optimista

**Estado actual:** Rutas stub creadas. Pendiente implementación.

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
- [ ] Endpoint CRUD completo para medicamentos (con detección de duplicados)
- [ ] Endpoint de búsqueda por nombre parcial (autocompletado)
- [ ] Endpoint de búsqueda por código de barras
- [ ] Endpoint CRUD para códigos de barras (agregar/eliminar por medicamento)
- [ ] Endpoint CRUD para categorías
- [ ] Endpoint CRUD para proveedores/donantes
- [ ] Endpoint CRUD para ubicaciones/estantes
- [ ] Página de Medicamentos (tabla, crear, editar, buscar, códigos de barras)
- [ ] Página de Categorías (tabla + formulario)
- [ ] Página de Proveedores (tabla + formulario)
- [ ] Página de Ubicaciones (tabla + formulario)
- [ ] Detección de duplicados: al crear medicamento, buscar similitudes y advertir

**Estado actual:** Rutas stub creadas. Pendiente implementación.

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

## Historial de Sesiones

### 2026-06-26 — Daniel Reyes
- Setup inicial completo: Docker Compose, Prisma schema, seed, auth, layout, login
- Todas las rutas stub creadas para los 3 módulos
- CLAUDE.md creado con asignación de tareas
