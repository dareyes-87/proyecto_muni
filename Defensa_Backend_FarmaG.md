# Defensa Técnica — Backend FarmaG
### "Backend – Proyecto de Seminario" · Módulos: Dispensación · Inventario · Catálogos

> Defensa **enfocada en los tres módulos de negocio centrales**: Dispensación, Inventario y
> Catálogos. Todo verificado leyendo el código real (rama `feature/dispensacion-evidencia-pc`);
> cada afirmación cita archivo y línea. Donde algo no existe, se dice.

---

## 1. Resumen y arquitectura (lo mínimo para ubicar al jurado)

**FarmaG** gestiona el **inventario** y la **dispensación gratuita** de medicamentos de la
Farmacia Municipal de Gualán. El stock vive **por lote** (cada lote tiene su cantidad y su
vencimiento); la entrega es **FIFO** (sale primero el que vence antes).

**Flujo general:** Frontend (React) → `api/client.ts` (Axios + JWT) → `/api/<modulo>` (Express) →
servicio/handler → **Prisma ORM** → PostgreSQL 16.

```
Rutas (routes/*.routes.ts)         reciben HTTP, validan, responden
   │  Middleware: auth (JWT+rol), audit, errorHandler
Servicios (services/*.service.ts)  lógica de negocio + acceso a datos
   │
Prisma ORM  →  SQL  →  PostgreSQL 16
```

**A declarar con honestidad:** no hay capa "repositorio" separada — **Prisma es el acceso a
datos**. Dispensación está bien estratificado (ruta → `dispensacion.service.ts`); Inventario y
Catálogos hablan con Prisma **directo en el handler**. **No existen vistas, procedimientos,
triggers ni funciones SQL**; el único SQL crudo es un `SELECT ... FOR UPDATE`
(`dispensacion.service.ts:209`).

**Stack:** React 18 + Vite + TS + Tailwind · Node + Express + TS · Prisma · PostgreSQL 16 · JWT +
bcrypt · Zod (validación) · helmet/CORS.

---

## 2. Los tres módulos en foco

| Módulo | Función | Pantallas | Endpoints que modifican datos | Tablas | Archivos |
|--------|---------|-----------|-------------------------------|--------|----------|
| **Dispensación** | Beneficiarios + entrega FIFO con concurrencia | `Dispensacion.tsx`, `Beneficiarios.tsx` | `POST /dispensacion/despachar`, `POST/PUT /beneficiarios*` | `dispensaciones`, `detalle_dispensaciones`, `lotes`, `beneficiarios`, `log_auditoria` | `routes/dispensacion.routes.ts`, `services/dispensacion.service.ts` |
| **Inventario** | Entradas con lotes, semáforo, baja de lote, umbrales, Excel | `Inventario.tsx`, `Entradas.tsx`, `Dashboard.tsx` | `POST /inventario/entradas`, `PUT /lotes/:id/baja`, `PUT /configuracion`, `POST /importar-excel` | `entradas`, `lotes`, `medicamentos`, `ubicaciones`, `configuracion_sistema`, `log_auditoria` | `routes/inventario.routes.ts`, `services/inventario.service.ts` |
| **Catálogos** | CRUD medicamentos, categorías, ubicaciones, códigos de barras, foto | `Catalogos/*` | `POST/PUT /medicamentos`, `POST/DELETE /codigos`, `POST/PUT /categorias`, `POST/PUT /ubicaciones`, `POST /:id/imagen` | `medicamentos`, `categorias`, `ubicaciones`, `codigos_barras`, `log_auditoria` | `routes/catalogos.routes.ts` |

### Modelo de datos de estos módulos (tablas reales)
```
MEDICAMENTOS ──N:1──► CATEGORIAS
     │ 1:N
     ├──► CODIGOS_BARRAS
     │ 1:N
     ▼
   LOTES ◄──1:N── ENTRADAS ──N:1──► USUARIOS
     │ (cantidad_actual, fecha_vencimiento, estado)   UBICACIONES ──1:N──► LOTES (opcional)
     │ N:1 (lote_id)
     ▼
DETALLE_DISPENSACIONES ──N:1──► DISPENSACIONES ──N:1──► BENEFICIARIOS
   (lote, cantidad, snapshots)                      └──N:1──► USUARIOS

LOG_AUDITORIA  registra CREAR/EDITAR/DISPENSAR/BAJA sobre todo lo anterior
```
**Clave:** el stock **no** está en `medicamentos` sino en `lotes.cantidad_actual`.
`detalle_dispensaciones` guarda *snapshots inmutables* (nombre/presentación/concentración) para
que el historial no cambie aunque luego se edite el medicamento.

---

## 3. Transacciones por módulo (las que modifican la BD)

| Módulo | Transacción | INSERT | UPDATE | DELETE | SELECT | Nº tablas | ¿Atómica (`$transaction`)? |
|--------|-------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Dispensación | **Despachar (FIFO)** | ✔ (disp + detalle) | ✔ (lotes) | | ✔ FOR UPDATE | **4** | **Sí (Serializable)** |
| Dispensación | Crear/editar beneficiario | ✔ | ✔ | | ✔ | 2 | No |
| Inventario | **Registrar entrada** | ✔ (entrada + N lotes) | | | ✔ | **3** | **Sí** |
| Inventario | **Dar de baja un lote** | ✔ (audit) | ✔ (estado) | | ✔ | 2 | No (UPDATE único) |
| Inventario | Actualizar umbrales | ✔ | ✔ (upsert×2) | | ✔ | 1 | **Sí** |
| Inventario | Importar Excel | ✔ muchos | | | ✔ | hasta 5 | **Sí (1 tx/fila)** |
| Catálogos | **Crear medicamento** (duplicados) | ✔ | | | ✔ | 2 | No |
| Catálogos | Editar medicamento | ✔ (audit) | ✔ | | ✔ | 2 | No |
| Catálogos | Agregar código de barras | ✔ | | | ✔ | 2 | No |
| Catálogos | Eliminar código de barras | ✔ (audit) | | **✔ físico** | ✔ | 2 | No |
| Catálogos | Crear/editar categoría/ubicación | ✔ | ✔ | | ✔ | 2 | No |

---

## 4. Las 3 transacciones definitivas (una por módulo)

**T1 — Despachar (Dispensación)** · tablas: `lotes`, `dispensaciones`, `detalle_dispensaciones`,
`log_auditoria`. **La que cumple "múltiples tablas"** (4) y la única con concurrencia real.

**T2 — Registrar entrada (Inventario)** · tablas: `entradas`, `lotes`, `log_auditoria`. INSERT
multi-tabla atómico; se ve "nacer" el stock.

**T3 — Crear medicamento con detección de duplicados (Catálogos)** · tablas: `medicamentos`,
`log_auditoria`. Regla de negocio interesante (advertencia de similares).

> **Respaldo (plan B):** *Dar de baja un lote* (Inventario) — la más simple y segura para demo,
> documentada en el **Anexo A**.

---

## 5. TRANSACCIÓN 1 — Despachar medicamento (FIFO + concurrencia) ★ multi-tabla

```
Encargada en "Dispensación" → elige beneficiario, agrega medicamentos, confirma
→ POST /api/dispensacion/despachar → dispensacion.routes.ts:137 → despachar() (service.ts:154)
→ $transaction Serializable: SELECT ... FOR UPDATE (lotes) → UPDATE lotes
     → INSERT dispensaciones → INSERT detalle_dispensaciones
→ (fuera tx) INSERT log_auditoria → 201 { dispensacion, stockActualizado }
```

### 1. Acción del usuario
Pantalla `frontend/src/pages/Dispensacion.tsx`: (1) selecciona beneficiario; (2) escanea/busca
medicamento y lo agrega al carrito con cantidad; (3) observaciones; (4) "Confirmar" → modal;
(5) "Dispensar". Envía `beneficiarioId`, `items[]={medicamentoId,cantidad}`, `observaciones`.

### 2. Frontend
`Dispensacion.tsx`, `confirmarDispensacion` (**línea 389**), evento clic en "Dispensar" (`:951`):
```ts
// Dispensacion.tsx:401
const { data } = await api.post('/dispensacion/despachar', {
  beneficiarioId: beneficiario.id, observaciones: observaciones || null,
  items: carrito.map((i) => ({ medicamentoId: i.medicamento.id, cantidad: i.cantidad })),
});
```
Método: **POST** → `/api/dispensacion/despachar`.

### 3. Backend
```
POST /api/dispensacion/despachar
→ authMiddleware            middleware/auth.ts:22   (JWT + usuario activo + rol actual)
→ handler                   dispensacion.routes.ts:137   (valida body)
→ despachar(...)            services/dispensacion.service.ts:154   (lógica + transacción)
→ registrarAuditoria(...)   dispensacion.routes.ts:165
→ 201 JSON
```

### 4. Código relevante
**Transacción Serializable** (`service.ts:182`, `282-284`):
```ts
return prisma.$transaction(async (tx) => { /* ... */ },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
```
**Bloqueo FIFO — el corazón** (`service.ts:209-218`):
```sql
SELECT id, medicamento_id, cantidad_actual, numero_lote, fecha_vencimiento, estado
FROM lotes
WHERE medicamento_id = $1 AND estado = 'DISPONIBLE'
  AND cantidad_actual > 0 AND fecha_vencimiento > $hoy::date   -- excluye vencidos (H-01)
ORDER BY fecha_vencimiento ASC                                 -- FIFO
FOR UPDATE                                                     -- bloquea filas hasta COMMIT
```
**Verificación de stock + descuento** (`service.ts:220-254`):
```ts
const stockTotal = lotes.reduce((s, l) => s + l.cantidad_actual, 0);
if (stockTotal < item.cantidad) throw new Error('Stock insuficiente ...'); // → 409
let restante = item.cantidad;
for (const lote of lotes) {
  const descontar = Math.min(restante, lote.cantidad_actual);
  const nuevaCantidad = lote.cantidad_actual - descontar;
  await tx.lote.update({ where:{id:lote.id},
    data:{ cantidadActual:nuevaCantidad, estado: nuevaCantidad===0?'AGOTADO':'DISPONIBLE' } });
  detallesCreados.push({ loteId: lote.id, cantidad: descontar, /* + snapshots */ });
  restante -= descontar;
}
```
**Creación dispensación + detalle anidado** (`service.ts:265-279`):
```ts
const dispensacion = await tx.dispensacion.create({
  data: { beneficiarioId, usuarioId, observaciones, detalles: { create: detallesCreados } },
  include: { beneficiario, usuario, detalles: true } });
```
**Errores** (`routes.ts:179-185`, `utils/httpError.ts`): "Stock insuficiente"→409, "no
encontrado"→404, "inactivo"→400, otro→500. **Respuesta:** `201 { dispensacion, stockActualizado }`.

### 5. Operaciones de BD
`SELECT ... FOR UPDATE` (lotes) · `UPDATE` (lotes 1..N) · `INSERT` (dispensaciones) · `INSERT`
(detalle_dispensaciones 1..N) · `INSERT` (log_auditoria).

### 6. Objetos afectados
| Objeto | Tipo | Operación | Qué cambia |
|--------|------|-----------|-----------|
| `lotes` | Tabla | SELECT FOR UPDATE + UPDATE | baja `cantidad_actual`; si 0 → `estado='AGOTADO'` |
| `dispensaciones` | Tabla | INSERT | nueva fila |
| `detalle_dispensaciones` | Tabla | INSERT | 1+ filas (lote, cantidad, snapshots) |
| `log_auditoria` | Tabla | INSERT | `DISPENSAR` |

### 7. Estado ANTES
```sql
SELECT id, numero_lote, cantidad_actual, fecha_vencimiento, estado
FROM lotes WHERE medicamento_id='<ID_MEDICAMENTO>' AND estado='DISPONIBLE'
ORDER BY fecha_vencimiento ASC;        -- p.ej. Lote A=5, Lote B=50
SELECT COUNT(*) FROM dispensaciones;
```
### 8. Ejecución en vivo
1. BD: SELECT de lotes + COUNT. 2. Sistema → Dispensación → beneficiario de prueba. 3. Pide
cantidad **> primer lote pero < total** (ej. 8 con 5 y 50) para que toque **dos** lotes.
4. Confirmar → Dispensar. 5. BD: SELECT del punto 9.
### 9. Estado DESPUÉS
```sql
SELECT numero_lote, cantidad_actual, estado FROM lotes
WHERE medicamento_id='<ID_MEDICAMENTO>' ORDER BY fecha_vencimiento ASC;  -- A:5→0 AGOTADO; B:50→47
SELECT * FROM dispensaciones ORDER BY created_at DESC LIMIT 1;           -- +1
SELECT lote_id, cantidad, nombre_medicamento_snapshot FROM detalle_dispensaciones
WHERE dispensacion_id=(SELECT id FROM dispensaciones ORDER BY created_at DESC LIMIT 1); -- 2 filas
SELECT accion, entidad FROM log_auditoria WHERE accion='DISPENSAR' ORDER BY created_at DESC LIMIT 1;
```
### 10. Comparación
| Dato | Antes | Después |
|------|-------|---------|
| Lote A `cantidad_actual`/`estado` | 5 / DISPONIBLE | 0 / AGOTADO |
| Lote B `cantidad_actual` | 50 | 47 |
| Filas `dispensaciones` | N | N+1 |
| Filas `detalle_dispensaciones` | M | M+2 |
| `log_auditoria` (DISPENSAR) | — | +1 |

---

## 6. TRANSACCIÓN 2 — Registrar entrada de inventario ★ multi-tabla

```
"Registrar entrada" → agrega 1+ lotes → Guardar
→ POST /api/inventario/entradas → inventario.routes.ts:51 (Zod + fecha futura + refs)
→ $transaction: INSERT entradas → createMany INSERT lotes
→ (fuera tx) INSERT log_auditoria → 201 { entrada con lotes }
```

### 1-2. Acción + Frontend
Pantalla `frontend/src/pages/Entradas.tsx`, `submit` (**línea 115**); API
`frontend/src/api/inventario.ts:45`:
```ts
await registrarEntrada({ observaciones: observaciones.trim() || null, lotes: lotesValidados });
// → api.post('/inventario/entradas', entrada)
```
Método: **POST** → `/api/inventario/entradas`.

### 3. Backend
```
POST /api/inventario/entradas
→ authMiddleware → handler inventario.routes.ts:51 (Zod + fecha + existencia medicamentos/ubicaciones)
→ prisma.$transaction (INSERT entrada + createMany lotes)  inventario.routes.ts:94-124
→ registrarAuditoria  inventario.routes.ts:126 → 201 JSON
```

### 4. Código relevante
**Zod** (`:28-57`): cada lote con `medicamentoId` UUID, `cantidad` entero positivo, `numeroLote`,
`fechaVencimiento`. **Regla fecha futura** (`:61-68`, H-34): rechaza lotes ya vencidos (400).
**Validación refs** (`:72-92`): medicamentos/ubicaciones existen → 400 claro. **La transacción**:
```ts
// inventario.routes.ts:94-124
const entrada = await prisma.$transaction(async (tx) => {
  const nuevaEntrada = await tx.entrada.create({ data:{ usuarioId, observaciones } });     // INSERT entradas
  await tx.lote.createMany({ data: lotes.map((l)=>({ ..., cantidadActual:l.cantidad,
                              estado: EstadoLote.DISPONIBLE })) });                          // INSERT lotes (N)
  return tx.entrada.findUnique({ where:{id:nuevaEntrada.id}, include:{ lotes:{...} } });
});
```
**Errores** (`:136-139`): fallo → 500 genérico. **Respuesta**: `201` con la entrada y sus lotes.

### 5-6. Operaciones y objetos
`SELECT` (medicamentos/ubicaciones) · `INSERT` entradas · `INSERT` createMany lotes · `INSERT` audit.

| Objeto | Tipo | Operación | Qué cambia |
|--------|------|-----------|-----------|
| `entradas` | Tabla | INSERT | nueva cabecera |
| `lotes` | Tabla | INSERT (N) | stock nuevo; `DISPONIBLE`, `cantidad_actual=cantidad` |
| `log_auditoria` | Tabla | INSERT | `CREAR` / `entrada` |

### 7. ANTES
```sql
SELECT COUNT(*) FROM entradas;
SELECT COALESCE(SUM(cantidad_actual),0) FROM lotes
WHERE medicamento_id='<ID_MEDICAMENTO>' AND estado='DISPONIBLE' AND fecha_vencimiento > CURRENT_DATE;
```
### 8. En vivo
1. BD: COUNT + stock. 2. Sistema → Registrar entrada → medicamento X, cantidad 100, lote `DEMO-001`,
vencimiento 2027-12-31, ubicación A → Guardar. 3. BD: SELECT del punto 9.
### 9. DESPUÉS
```sql
SELECT * FROM entradas ORDER BY created_at DESC LIMIT 1;                       -- +1
SELECT numero_lote, cantidad, cantidad_actual, estado FROM lotes WHERE numero_lote='DEMO-001'; -- 100/100 DISPONIBLE
SELECT accion, entidad FROM log_auditoria WHERE entidad='entrada' ORDER BY created_at DESC LIMIT 1;
```
### 10. Comparación
| Dato | Antes | Después |
|------|-------|---------|
| Filas `entradas` | N | N+1 |
| Lotes del medicamento | k | k+1 |
| Lote nuevo `cantidad`/`cantidad_actual` | — | 100 / 100 |
| Stock dispensable | S | S+100 |

---

## 7. TRANSACCIÓN 3 — Crear medicamento con detección de duplicados (Catálogos)

```
ADMIN en "Catálogos > Medicamentos" → "Nuevo medicamento" → Guardar
→ POST /api/catalogos/medicamentos → catalogos.routes.ts:230 (Zod + categoría + duplicados)
→ si similares y NO forzarCreacion → advertencia (no crea)
→ si no → INSERT medicamentos → INSERT log_auditoria → 201 { data }
```

### 1-2. Acción + Frontend
Pantalla `frontend/src/pages/Catalogos/Medicamentos.tsx` (y `MedicamentoFormModal.tsx`). **Solo
ADMIN.** Envía nombre genérico, (comercial), presentación, (concentración), unidad, `categoriaId`,
`stockMinimo`; al confirmar la advertencia reenvía con `forzarCreacion: true`.
```ts
await api.post('/catalogos/medicamentos', { nombreGenerico, nombreComercial, presentacion,
  concentracion, unidadMedida, categoriaId, stockMinimo /*, forzarCreacion */ });
```
Método: **POST** → `/api/catalogos/medicamentos`.

### 3. Backend
```
POST /api/catalogos/medicamentos
→ authMiddleware → requireRole('ADMIN') → handler catalogos.routes.ts:230
→ 201 (o 200 con advertencia si hay similares y no se forzó)
```

### 4. Código relevante (`catalogos.routes.ts:230-297`)
**Zod** (`:218-236`). **Categoría existe** (`:241-245`). **Detección de duplicados — la regla**:
```ts
// catalogos.routes.ts:247-268
const candidatos = await prisma.medicamento.findMany({ where:{
  nombreGenerico:{ contains: datos.nombreGenerico, mode:'insensitive' },
  presentacion:  { equals:   datos.presentacion,   mode:'insensitive' } } });
const similares = candidatos.filter((m)=>
  (m.concentracion||'').toLowerCase().trim() === (datos.concentracion||'').toLowerCase().trim());
if (similares.length > 0 && !forzarCreacion) {
  res.json({ advertencia:true, mensaje:'Se encontraron medicamentos similares...', similares });
  return;   // ← NO crea: deja decidir al usuario
}
```
**El INSERT** (`:270-281`):
```ts
const medicamento = await prisma.medicamento.create({
  data:{ nombreGenerico, nombreComercial, presentacion, concentracion,
         unidadMedida, categoriaId, stockMinimo: datos.stockMinimo ?? 10 },
  include:{ categoria:true, codigosBarras:true } });
```
**Auditoría + respuesta** (`:283-292`): `registrarAuditoria('CREAR','medicamento')` → `201 { data }`.

### 5-6. Operaciones y objetos
`SELECT` categoría · `SELECT` candidatos duplicados · `INSERT` medicamentos · `INSERT` audit.

| Objeto | Tipo | Operación | Qué cambia |
|--------|------|-----------|-----------|
| `medicamentos` | Tabla | SELECT (duplicados) + INSERT | fila nueva (`activo=true`) |
| `categorias` | Tabla | SELECT | valida FK `categoria_id` |
| `log_auditoria` | Tabla | INSERT | `CREAR` / `medicamento` |

### 7. ANTES
```sql
SELECT COUNT(*) FROM medicamentos;
SELECT id, nombre_generico, presentacion, concentracion FROM medicamentos
WHERE nombre_generico ILIKE '%<NOMBRE>%';     -- mostrar que no existe aún
SELECT id, nombre FROM categorias WHERE activo=true;   -- tomar un <ID_CATEGORIA> real
```
### 8. En vivo
1. BD: COUNT + ILIKE del nombre a crear (0 filas). 2. Sistema (ADMIN) → Catálogos > Medicamentos >
Nuevo. 3. (Demostrativo) escribe uno que **ya exista** (ej. "Acetaminofén/Tableta/500mg" del seed)
→ aparece la **advertencia** y no se crea. 4. Crea uno nuevo (ej. "Diclofenaco/Tableta/50mg") →
Guardar. 5. BD: SELECT del punto 9.
### 9. DESPUÉS
```sql
SELECT COUNT(*) FROM medicamentos;                                   -- +1
SELECT nombre_generico, presentacion, concentracion, activo, created_at
FROM medicamentos ORDER BY created_at DESC LIMIT 1;
SELECT accion, entidad FROM log_auditoria WHERE entidad='medicamento' AND accion='CREAR'
ORDER BY created_at DESC LIMIT 1;
```
### 10. Comparación
| Dato | Antes | Después |
|------|-------|---------|
| Filas `medicamentos` | N | N+1 |
| Medicamento buscado | No existe | Existe (`activo=true`) |
| Intento de duplicado | — | Advertencia, sin INSERT |
| `log_auditoria` (CREAR) | — | +1 |

---

## 8. Validaciones (de los tres módulos)

| Validación | Capa | Archivo | Qué evita | Resp. |
|------------|------|---------|-----------|-------|
| JWT válido + usuario activo | Backend | `middleware/auth.ts:22-55` | Acceso sin sesión/cuenta desactivada | 401 |
| Rol ADMIN (crear med., baja lote) | Backend | `middleware/auth.ts:63` | Que un ENCARGADO lo haga | 403 |
| **T1** items + cantidad>0 | Backend | `dispensacion.routes.ts:141-156` | Dispensar vacío/≤0 | 400 |
| **T1** beneficiario activo | Backend | `dispensacion.service.ts:170-175` | Entregar a inactivo | 400 |
| **T1** stock suficiente (en tx) | Backend | `dispensacion.service.ts:220-226` | Sobregiro | 409 |
| **T1** excluir vencidos | Backend (SQL) | `dispensacion.service.ts:215` | Entregar vencido (H-01) | — |
| **T2** esquema entrada (Zod) | Backend | `inventario.routes.ts:28-57` | Datos faltantes/mal tipados | 400 |
| **T2** fecha futura | Backend | `inventario.routes.ts:61-68` | Lote ya vencido (H-34) | 400 |
| **T2** medicamentos/ubicaciones existen | Backend | `inventario.routes.ts:72-92` | FK rota (P2003) | 400 |
| **T3** esquema medicamento (Zod) | Backend | `catalogos.routes.ts:218-236` | Campos vacíos | 400 |
| **T3** categoría existe | Backend | `catalogos.routes.ts:241-245` | FK inválida | 400 |
| **T3** duplicados | Backend (negocio) | `catalogos.routes.ts:247-268` | Alta duplicada | 200 aviso |
| Unicidad / FK | **Constraint BD** | `schema.prisma` | Duplicados, refs inexistentes | 409 |

**Frontend vs Backend vs BD:** el frontend da feedback rápido (se puede saltar); el **backend** es
la validación que protege; la **BD** pone `unique` y FK (no hay CHECK de negocio como
`cantidad_actual >= 0`).

---

## 9. Integridad y manejo de errores

**Sí garantiza:** atomicidad con ROLLBACK en **T1 y T2** (`$transaction`); en **T3** el INSERT es
único. Aislamiento `Serializable` + `SELECT ... FOR UPDATE` en T1 → sin doble gasto (verificado:
dos entregas simultáneas, una 201 y otra 409). FKs e índices unique. Errores mapeados a HTTP
(`utils/httpError.ts`, `middleware/errorHandler.ts`).

**NO garantiza (dilo con honestidad):**
1. **Auditoría fuera de la transacción** (*fire-and-forget*, `middleware/audit.ts:28`): si el
   proceso muere tras el COMMIT, la operación queda sin registro. Decisión deliberada.
2. **Sin retry ante serialización (P2034)** en T1 (improbable por el `FOR UPDATE`).
3. **Stock no-negativo solo en la app** (no hay `CHECK` en BD).
4. **T3 no es transaccional** (INSERT + auditoría por separado); inofensivo, es un solo INSERT.

---

## 10. Riesgos para la defensa (auditoría previa)

| Riesgo | Sev. | Dónde | Nota |
|--------|------|-------|------|
| Sin migraciones versionadas (`prisma db push`) | ALTO | Dockerfile | Diferido a propósito (H-05); "versionar con `migrate` es el paso a producción". |
| Auditoría fuera de la tx | MEDIO | `middleware/audit.ts` | Para no bloquear la operación; mejora = meterla en la tx. |
| Sin retry serialización en T1 | MEDIO | `dispensacion.service.ts:282` | Improbable por `FOR UPDATE`. |
| Stock sin CHECK en BD | MEDIO | `schema.prisma` | La garantía es tx + `FOR UPDATE`. |
| `new PrismaClient()` por archivo | BAJO | varios | Cada uno abre su pool; a 4 usuarios no afecta. |
| Sin índices en FK | BAJO | `schema.prisma` | A esta escala no impacta. |
| Paginación en memoria `GET /inventario` | BAJO | `inventario.routes.ts:209-243` | Correcto a escala pequeña. |

**No es problema:** consulta cruda parametrizada (sin SQL injection, `service.ts:209`); 500 no
filtran detalle; `helmet` + CORS. **No existen:** vistas, procedimientos, triggers, funciones SQL.

---

## 11. Orden de la demostración (ventanas)

- **V1 — Base de datos** (pgAdmin / DBeaver / `psql` / Prisma Studio): ANTES y DESPUÉS.
- **V2 — Sistema** (navegador en `http://localhost:5173`).
- **V3 — Código** (VS Code).

Por cada transacción: **V1 (SELECT antes) → V2 (ejecutar) → V3 (endpoint + servicio) → V1 (SELECT
después) → explicar**. No hay Swagger/Postman; para ver la petición cruda usa DevTools → Network.

Archivos en VS Code: T1 `dispensacion.routes.ts` + `dispensacion.service.ts` + `Dispensacion.tsx`;
T2 `inventario.routes.ts` + `Entradas.tsx`; T3 `catalogos.routes.ts` + `Catalogos/Medicamentos.tsx`.

---

## 12. Guion oral

> **Apertura.** "FarmaG gestiona el inventario y la dispensación gratuita de la Farmacia Municipal
> de Gualán. Nos centramos en tres módulos — Dispensación, Inventario y Catálogos — y demostramos
> una transacción de cada uno contra la base de datos. Usamos React, Express con TypeScript, Prisma
> y PostgreSQL."

> **T1 — Despachar (Dispensación).** "Observamos los lotes del medicamento [V1]. El usuario elige
> beneficiario y pide una cantidad que no cabe en el primer lote. El front hace POST a
> `/api/dispensacion/despachar`; el controlador valida y delega en `despachar`, que abre una
> transacción **Serializable**. Lo clave: un `SELECT ... FOR UPDATE` que **bloquea** los lotes y
> los ordena por vencimiento — eso es el FIFO. Descuenta del que vence antes; si se agota lo marca
> AGOTADO y sigue con el próximo. En la misma transacción crea la dispensación y su detalle; si algo
> falla, **todo se revierte**. [V1 después] El primer lote quedó en cero, el segundo bajó, hay una
> dispensación con dos líneas de detalle y un registro DISPENSAR en auditoría. El `FOR UPDATE` evita
> que dos entregas simultáneas gasten el mismo stock."

> **T2 — Entrada (Inventario).** "El stock vive en los lotes, no en el medicamento. Antes [V1].
> Desde 'Registrar entrada' agregamos un lote de 100 con vencimiento futuro. El backend valida con
> Zod, rechaza fechas vencidas y, dentro de una transacción, crea la entrada y sus lotes. Después:
> la entrada, el lote con 100 de 100 disponibles, y el stock subió exactamente 100."

> **T3 — Crear medicamento (Catálogos).** "Como ADMIN damos de alta un medicamento. Antes de crear,
> el backend busca similares por nombre, presentación y concentración; si hay uno parecido responde
> una **advertencia** en vez de crear, para evitar duplicados [lo muestro]. Al confirmar o si es
> nuevo, hace el INSERT y lo audita. [V1] Aparece el medicamento nuevo."

> **Cierre.** "Transacciones atómicas con ROLLBACK, FIFO con bloqueo de filas para la concurrencia,
> validación en el backend y bitácora de auditoría. La integridad se apoya en transacciones y
> llaves foráneas; la lógica vive en la aplicación, no en procedimientos de base de datos."

---

## 13. Preguntas del profesor y respuestas

1. **P:** ¿Cuál afecta más tablas? **R:** T1: 4 (`lotes`, `dispensaciones`,
   `detalle_dispensaciones`, `log_auditoria`). **📁** `dispensacion.service.ts:209-279`.
2. **P:** ¿Qué tabla se modifica primero en T1 y por qué? **R:** `lotes` (UPDATE); la dispensación
   y el detalle los referencian por FK. **📁** `service.ts:236,265`.
3. **P:** ¿Qué pasa si falla la inserción del detalle en T1? **R:** ROLLBACK total; nada se
   descuenta ni se crea. **📁** `service.ts:182-284`.
4. **P:** ¿Existe rollback? **R:** Sí, automático en `$transaction` (T1 y T2). **📁** `service.ts:182`, `inventario.routes.ts:94`.
5. **P:** ¿Cómo garantizan integridad con varios usuarios? **R:** `SELECT ... FOR UPDATE` +
   `Serializable`. **📁** `service.ts:209-218,282-284`.
6. **P:** ¿Dónde valida que no se dispense de más? **R:** En la tx: `if (stockTotal<cantidad) throw`
   → 409. **📁** `service.ts:220-226`.
7. **P:** ¿Qué es FIFO y cómo? **R:** `ORDER BY fecha_vencimiento ASC`. **📁** `service.ts:216`.
8. **P:** ¿Por qué POST en las tres y PUT en la baja? **R:** POST crea; PUT modifica estado. **📁** `dispensacion.routes.ts:137`, `inventario.routes.ts:51,435`, `catalogos.routes.ts:230`.
9. **P:** ¿Qué retorna T1? **R:** 201 `{ dispensacion, stockActualizado }`. **📁** `dispensacion.routes.ts:178`.
10. **P:** ¿Dónde se genera el ID? **R:** En la BD, UUID por defecto. **📁** `schema.prisma`.
11. **P:** ¿Qué FK interviene en T2? **R:** `lotes.entrada_id`→`entradas.id` (+ `medicamento_id`, `ubicacion_id`). **📁** `schema.prisma` (Lote).
12. **P:** ¿Qué pasa con un lote ya dispensado si se da de baja? **R:** No se borra; el detalle
    guarda `lote_id` + snapshots inmutables. **📁** `schema.prisma` (DetalleDispensacion).
13. **P:** Validación frontend vs backend. **R:** El front da feedback; el back protege. DPI en
    ambos. **📁** `Dispensacion.tsx:1002`, `dispensacion.routes.ts:49`.
14. **P:** ¿Regla de negocio de T3? **R:** Duplicados por nombre+presentación+concentración →
    advertencia en vez de crear. **📁** `catalogos.routes.ts:247-268`.
15. **P:** ¿T3 es transaccional? **R:** No; un INSERT + auditoría aparte; inofensivo. **📁** `catalogos.routes.ts:270-290`.
16. **P:** ¿Triggers/procedimientos/vistas? **R:** No; lógica en la app; único SQL crudo = `FOR UPDATE`. **📁** `schema.prisma`, `service.ts:209`.
17. **P:** ¿SQL injection en la consulta cruda? **R:** No: `$queryRaw` con parámetros. **📁** `service.ts:209-218`.
18. **P:** ¿Lote vencido se dispensa? **R:** No: excluido en el SELECT + cron diario lo marca
    VENCIDO. **📁** `service.ts:215`, `vencimiento.service.ts:19-29`.
19. **P:** ¿Por qué `cantidad` y `cantidad_actual`? **R:** entró vs. queda; permite auditar consumo. **📁** `schema.prisma` (Lote).
20. **P:** ¿Cómo autorizan por rol? **R:** `requireRole('ADMIN')` → 403. **📁** `catalogos.routes.ts:230`, `inventario.routes.ts:438`.
21. **P:** ¿La auditoría es parte de la transacción? **R:** No, *fire-and-forget* fuera de la tx.
    **📁** `middleware/audit.ts:15-31`.
22. **P:** ¿Si pido 8 y el primer lote tiene 5? **R:** Descuenta 5 (AGOTADO) y 3 del siguiente; dos
    filas de detalle. **📁** `service.ts:230-254`.
23. **P:** ¿Cómo versionan el esquema? **R:** `prisma db push` hoy; `migrate` es el paso a
    producción. **📁** `schema.prisma`, Dockerfile.
24. **P:** ¿Qué pasa si se cae la conexión a media transacción? **R:** Sin COMMIT → PostgreSQL
    revierte; cliente recibe 500. **📁** `service.ts:182`.

---

## Anexo A — Respaldo: Dar de baja un lote (Inventario)

Plan B muy seguro (UPDATE de un campo + 403 por rol).
- **Pantalla:** `Inventario.tsx` → detalle medicamento → "Dar de baja" (motivo opcional). **Solo ADMIN.**
- **Front:** `frontend/src/api/inventario.ts:55` → `PUT /inventario/lotes/:id/baja`.
- **Back:** `inventario.routes.ts:435` (`authMiddleware` + `requireRole('ADMIN')`): lee el lote
  (`:444`), rechaza doble baja (`:452`→409), `UPDATE estado='DADO_DE_BAJA'` (`:457`), auditoría
  antes/después (`:462-470`).
- **ANTES:** `SELECT estado FROM lotes WHERE id='<ID_LOTE>';` → `DISPONIBLE`.
- **DESPUÉS:** → `DADO_DE_BAJA`; sale del stock dispensable; auditoría con motivo.
- **Demo seguridad:** como `ENCARGADO_BENEFICENCIA` → **403**.

---

## Checklist

**Antes:** `docker compose up --build` · `curl .../api/health` ok · front en :5173 · login
`admin`/`admin2026` · un medicamento con **dos lotes** de distinta fecha (FIFO) · un beneficiario ·
un nombre de medicamento nuevo para T3 · consultas SQL pegadas · T1/T2/T3 probadas una vez · (plan
B) Anexo A listo.
**Durante:** estado inicial (SELECT) → acción en el front → endpoint + método → código → SQL/ORM
(sobre todo `FOR UPDATE`) → SELECT después → comparar → integridad → validaciones.

---

## Preguntas que necesito confirmar (Jorge)
1. ¿Tiempo de exposición? (si es corto, T1 a fondo + mención de T2/T3).
2. ¿Gestor de BD: pgAdmin / DBeaver / `psql` / **Prisma Studio**? (con Studio no corres SQL; adapto).
3. ¿T3 = Crear medicamento, o prefieres el Anexo A (dar de baja)?
4. ¿Preparo datos de demo deterministas (medicamento con lotes 5 y 50, beneficiario, nombre para T3)? No toco nada sin tu OK.
5. ¿Demostrarás concurrencia en vivo (dos pestañas) o uso el caso de stock insuficiente (409)?
6. ¿Lo quieres en PDF/diapositivas o te sirve el Markdown?
