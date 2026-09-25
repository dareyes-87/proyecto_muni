# 02 — Modelo de datos

> Fase: Extracción (parte 1 de 4). Documento de hechos con fuente; no es texto final de la tesis.
> Fuente principal: `backend/prisma/schema.prisma` (286 líneas). Fecha de extracción: 2026-09-25.

## Convenciones de este documento

- **Tipo PostgreSQL:** el esquema solo fija el tipo nativo en dos campos (`@db.Date` y
  `@db.Decimal(10, 2)`). Para el resto, el tipo indicado es el que genera el mapeo por defecto de
  Prisma para el conector `postgresql` (`String`→`TEXT`, `Int`→`INTEGER`, `Boolean`→`BOOLEAN`,
  `DateTime`→`TIMESTAMP(3)`, `Json`→`JSONB`, enum→tipo `ENUM` de PostgreSQL con el mismo nombre).
  No se verificó contra una base de datos en ejecución → ver P-08 en `preguntas_abiertas.md`.
- **UUID:** los `id` usan `@default(uuid())`. El valor lo genera el cliente Prisma al insertar; la
  columna es `TEXT` sin `DEFAULT` en la base de datos.
- **`@updatedAt`:** lo actualiza el cliente Prisma en cada `update`; no es un `DEFAULT` ni un
  trigger de la base de datos.
- **onDelete / onUpdate:** ninguna relación del esquema define `onDelete` ni `onUpdate`
  (verificado: no aparecen en `schema.prisma`). Aplica el comportamiento por defecto de Prisma:
  relaciones obligatorias → `onDelete: Restrict`, `onUpdate: Cascade`; relaciones opcionales →
  `onDelete: SetNull`, `onUpdate: Cascade`.
- **Nombres de columna:** cuando un campo tiene `@map`, la columna real se indica entre paréntesis
  en la columna "Campo".
- Ningún modelo define `@@index`. Los índices existentes son los implícitos de `@id`, `@unique` y
  `@@unique`.

---

## 1. Resumen

| Elemento | Cantidad | Detalle |
|----------|----------|---------|
| Modelos (tablas) | **14** | Usuario, Categoria, Medicamento, CodigoBarras, Ubicacion, Entrada, Lote, Beneficiario, Dispensacion, FotoDispensacion, TokenCaptura, DetalleDispensacion, LogAuditoria, ConfiguracionSistema |
| Enums | **4** | Rol, EstadoLote, TipoFoto, AccionAuditoria |
| Relaciones (claves foráneas) | **14** | Ver sección 4 |

(fuente: backend/prisma/schema.prisma, líneas 1–286)

El esquema agrupa los modelos en secciones comentadas: Autenticación y usuarios (líneas 10–37),
Catálogos base (39–99), Inventario (101–145), Dispensación gratuita (147–240), Auditoría
(242–273) y Configuración del sistema (275–286).

---

## 2. Modelos

### 2.1 Usuario → tabla `usuarios`

(fuente: backend/prisma/schema.prisma, líneas 19–37)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del usuario. |
| username | String | TEXT | No | — | UNIQUE | Nombre de usuario con el que se inicia sesión (uso: backend/src/routes/auth.routes.ts; se incluye en el JWT según CLAUDE.md). |
| email | String | TEXT | Sí | — | UNIQUE | Correo del usuario; se devuelve en el login y en la gestión de usuarios (uso: backend/src/routes/auth.routes.ts, línea 68; backend/src/routes/usuarios.routes.ts). |
| passwordHash (`password_hash`) | String | TEXT | No | — | — | Hash bcrypt de la contraseña, costo 12; se compara en el login (uso: backend/src/routes/auth.routes.ts, línea 31; backend/src/routes/usuarios.routes.ts, líneas 49 y 188). |
| nombreCompleto (`nombre_completo`) | String | TEXT | No | — | — | Nombre para mostrar del usuario (uso: backend/src/routes/auth.routes.ts, línea 66; reportes y auditoría lo muestran como autor de la acción). |
| rol | Rol (enum) | ENUM `Rol` | No | — | — | Rol del usuario para control de acceso (uso: backend/src/middleware/auth.ts, línea 4 — `requireRole`). |
| activo | Boolean | BOOLEAN | No | `true` | — | Si es `false`, el login se rechaza; se alterna desde la gestión de usuarios y se audita como ACTIVAR/DESACTIVAR (uso: backend/src/routes/auth.routes.ts, línea 26; backend/src/routes/usuarios.routes.ts, líneas 98–104). |
| ultimoAcceso (`ultimo_acceso`) | DateTime | TIMESTAMP(3) | Sí | — | — | Fecha y hora del último login exitoso (uso: backend/src/routes/auth.routes.ts, línea 40). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |
| updatedAt (`updated_at`) | DateTime | TIMESTAMP(3) | No | `@updatedAt` | — | Fecha de última modificación, mantenida por Prisma. |

**Relaciones:**
- Usuario (1) → (N) Entrada, por `Entrada.usuarioId`.
- Usuario (1) → (N) Dispensacion, por `Dispensacion.usuarioId`.
- Usuario (1) → (N) LogAuditoria, por `LogAuditoria.usuarioId`.

**Índices / restricciones compuestas:** ninguna (solo UNIQUE simples en `username` y `email`).

---

### 2.2 Categoria → tabla `categorias`

(fuente: backend/prisma/schema.prisma, líneas 43–53)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la categoría. |
| nombre | String | TEXT | No | — | UNIQUE | Nombre de la categoría terapéutica; el seed y la importación Excel la buscan por nombre (uso: backend/prisma/seed.ts, líneas 35–57; backend/src/routes/catalogos.routes.ts, línea 475). |
| descripcion | String | TEXT | Sí | — | — | Descripción libre de la categoría (uso: backend/src/routes/catalogos.routes.ts, líneas 461–509; frontend/src/pages/Catalogos/Categorias.tsx). |
| activo | Boolean | BOOLEAN | No | `true` | — | Borrado lógico; editable en el PUT de categorías (uso: backend/src/routes/catalogos.routes.ts, líneas 505–509). |

**Relaciones:** Categoria (1) → (N) Medicamento, por `Medicamento.categoriaId`.

**Índices / restricciones compuestas:** ninguna.

---

### 2.3 Medicamento → tabla `medicamentos`

(fuente: backend/prisma/schema.prisma, líneas 55–76)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del medicamento. |
| nombreGenerico (`nombre_generico`) | String | TEXT | No | — | — | Nombre genérico; requerido (mín. 2 caracteres en la validación Zod) y parte del criterio de detección de duplicados (uso: backend/src/routes/catalogos.routes.ts, líneas 214 y 242–253). |
| nombreComercial (`nombre_comercial`) | String | TEXT | Sí | — | — | Nombre comercial opcional (uso: backend/src/routes/catalogos.routes.ts, líneas 215 y 266). |
| presentacion | String | TEXT | No | — | — | Forma farmacéutica (ej. "Tableta", "Cápsula" en el seed); parte del criterio de duplicados (uso: backend/src/routes/catalogos.routes.ts, líneas 216 y 245; backend/prisma/seed.ts, líneas 123–127). |
| concentracion | String | TEXT | Sí | — | — | Concentración (ej. "500mg" en el seed); parte del criterio de duplicados (uso: backend/src/routes/catalogos.routes.ts, líneas 217 y 249–253). |
| unidadMedida (`unidad_medida`) | String | TEXT | No | — | — | Unidad de medida del medicamento; requerida (uso: backend/src/routes/catalogos.routes.ts, línea 218; frontend/src/pages/Dispensacion.tsx). |
| categoriaId (`categoria_id`) | String | TEXT | No | — | FK → `categorias.id` | Categoría terapéutica (uso: backend/src/routes/catalogos.routes.ts, líneas 219 y 236–240). |
| stockMinimo (`stock_minimo`) | Int | INTEGER | No | `10` | — | Umbral de alerta: el medicamento se marca como `stockBajo` cuando el stock disponible es menor que este valor (uso: backend/src/routes/inventario.routes.ts, líneas 224, 310 y 409). |
| imagenUrl (`imagen_url`) | String | TEXT | Sí | — | — | Ruta relativa de la foto del medicamento, con forma `/uploads/medicamentos/<archivo>` (uso: backend/src/routes/catalogos.routes.ts, líneas 678–690). |
| activo | Boolean | BOOLEAN | No | `true` | — | Borrado lógico; los listados filtran `activo: true` y no se puede dispensar un medicamento inactivo (uso: backend/src/routes/catalogos.routes.ts, línea 24; backend/src/services/dispensacion.service.ts, líneas 194–195). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |
| updatedAt (`updated_at`) | DateTime | TIMESTAMP(3) | No | `@updatedAt` | — | Fecha de última modificación, mantenida por Prisma. |

**Relaciones:**
- Medicamento (N) → (1) Categoria, por `categoriaId` (obligatoria).
- Medicamento (1) → (N) CodigoBarras, por `CodigoBarras.medicamentoId`.
- Medicamento (1) → (N) Lote, por `Lote.medicamentoId`.
- Medicamento (1) → (N) DetalleDispensacion, por `DetalleDispensacion.medicamentoId`.

**Índices / restricciones compuestas:** ninguna. La unicidad nombre+presentación+concentración
**no** está en la base de datos; es una advertencia de aplicación que se puede omitir con
`forzarCreacion: true` (fuente: backend/src/routes/catalogos.routes.ts, líneas 223–262).

---

### 2.4 CodigoBarras → tabla `codigos_barras`

(fuente: backend/prisma/schema.prisma, líneas 78–88)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del código. |
| medicamentoId (`medicamento_id`) | String | TEXT | No | — | FK → `medicamentos.id` | Medicamento al que identifica el código (uso: backend/src/routes/catalogos.routes.ts, línea 392). |
| codigo | String | TEXT | No | — | UNIQUE | Valor del código de barras; un código solo puede pertenecer a un medicamento (uso: backend/src/routes/catalogos.routes.ts, líneas 372–392). |
| descripcion | String | TEXT | Sí | — | — | Descripción libre del código (uso: backend/src/routes/catalogos.routes.ts, línea 392). [COMPLETAR: qué se espera registrar aquí; la especificación sugiere el laboratorio] |

**Relaciones:** CodigoBarras (N) → (1) Medicamento, por `medicamentoId` (obligatoria).

**Índices / restricciones compuestas:** ninguna.

---

### 2.5 Ubicacion → tabla `ubicaciones`

(fuente: backend/prisma/schema.prisma, líneas 90–99)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la ubicación. |
| codigo | String | TEXT | No | — | UNIQUE | Código corto del estante (ej. "A", "BOD" en el seed); la importación Excel busca la ubicación por código (uso: backend/prisma/seed.ts, líneas 63–79; backend/src/routes/catalogos.routes.ts, línea 564). |
| descripcion | String | TEXT | Sí | — | — | Descripción del estante (ej. "Estante A", "Bodega") (uso: backend/prisma/seed.ts, líneas 64–70; backend/src/routes/catalogos.routes.ts, líneas 564 y 599). |

**Relaciones:** Ubicacion (1) → (N) Lote, por `Lote.ubicacionId` (opcional en Lote).

**Índices / restricciones compuestas:** ninguna. Este modelo **no** tiene campo `activo`.

---

### 2.6 Entrada → tabla `entradas`

(fuente: backend/prisma/schema.prisma, líneas 105–116)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la entrada (ingreso de inventario que agrupa uno o varios lotes). |
| usuarioId (`usuario_id`) | String | TEXT | No | — | FK → `usuarios.id` | Usuario que registró la entrada; se toma del JWT (`req.user.userId`) (uso: backend/src/routes/inventario.routes.ts, líneas 85 y 831). |
| observaciones | String | TEXT | Sí | — | — | Notas libres de la entrada; la importación Excel escribe "Importado desde Excel (fila N)" (uso: backend/src/routes/inventario.routes.ts, líneas 37, 86 y 832). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha y hora de registro de la entrada. |

**Relaciones:**
- Entrada (N) → (1) Usuario, por `usuarioId` (obligatoria).
- Entrada (1) → (N) Lote, por `Lote.entradaId`.

**Índices / restricciones compuestas:** ninguna.

---

### 2.7 Lote → tabla `lotes`

(fuente: backend/prisma/schema.prisma, líneas 125–145)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del lote. |
| entradaId (`entrada_id`) | String | TEXT | No | — | FK → `entradas.id` | Entrada que originó el lote (uso: backend/src/routes/inventario.routes.ts, líneas 92 y 838). |
| medicamentoId (`medicamento_id`) | String | TEXT | No | — | FK → `medicamentos.id` | Medicamento del lote; es el filtro del `SELECT … FOR UPDATE` de la dispensación (uso: backend/src/services/dispensacion.service.ts, líneas 199–207). |
| cantidad | Int | INTEGER | No | — | — | Unidades ingresadas originalmente (uso: backend/src/routes/inventario.routes.ts, línea 94). |
| cantidadActual (`cantidad_actual`) | Int | INTEGER | No | — | — | Unidades restantes; se inicializa igual a `cantidad` y la dispensación la descuenta (uso: backend/src/routes/inventario.routes.ts, líneas 94–95 y 841; backend/src/services/dispensacion.service.ts, líneas 221–229). |
| numeroLote (`numero_lote`) | String | TEXT | No | — | — | Número de lote; requerido en la validación (uso: backend/src/routes/inventario.routes.ts, líneas 30, 96 y 653–654). |
| fechaVencimiento (`fecha_vencimiento`) | DateTime `@db.Date` | DATE | No | — | — | Fecha de vencimiento; define el orden FIFO de la dispensación (`ORDER BY fecha_vencimiento ASC`), el semáforo y el cron de vencimientos (uso: backend/src/services/dispensacion.service.ts, línea 205; backend/src/services/vencimiento.service.ts, líneas 16–26; backend/src/services/inventario.service.ts). |
| costoUnitario (`costo_unitario`) | Decimal `@db.Decimal(10, 2)` | DECIMAL(10,2) | Sí | — | — | Costo por unidad, opcional y no negativo; alimenta el costo estimado perdido del reporte de bajas (uso: backend/src/routes/inventario.routes.ts, líneas 32 y 98; backend/src/services/reportes.service.ts). |
| ubicacionId (`ubicacion_id`) | String | TEXT | Sí | — | FK → `ubicaciones.id` | Estante donde se colocó el lote; se valida que exista (uso: backend/src/routes/inventario.routes.ts, líneas 33, 70–76 y 99). |
| estado | EstadoLote (enum) | ENUM `EstadoLote` | No | `DISPONIBLE` | — | Estado del lote. Pasa a `AGOTADO` cuando `cantidadActual` llega a 0, a `VENCIDO` por el cron diario y a `DADO_DE_BAJA` por acción del administrador (uso: backend/src/services/dispensacion.service.ts, línea 229; backend/src/services/vencimiento.service.ts, líneas 16–26; backend/src/routes/inventario.routes.ts, líneas 421–447). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |

**Relaciones:**
- Lote (N) → (1) Entrada, por `entradaId` (obligatoria).
- Lote (N) → (1) Medicamento, por `medicamentoId` (obligatoria).
- Lote (N) → (0..1) Ubicacion, por `ubicacionId` (opcional → `onDelete: SetNull` por defecto).
- Lote (1) → (N) DetalleDispensacion, por `DetalleDispensacion.loteId`.

**Índices / restricciones compuestas:** ninguna. No existe índice explícito sobre
`(medicamento_id, estado, fecha_vencimiento)`, que es el filtro/orden de la consulta FIFO.

---

### 2.8 Beneficiario → tabla `beneficiarios`

(fuente: backend/prisma/schema.prisma, líneas 151–166)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del beneficiario. |
| nombreCompleto (`nombre_completo`) | String | TEXT | No | — | — | Nombre del beneficiario; se usa en la búsqueda por nombre (uso: backend/src/routes/dispensacion.routes.ts, línea 37; backend/src/services/dispensacion.service.ts). |
| dpi | String | TEXT | Sí | — | UNIQUE | Documento Personal de Identificación; si se envía debe tener exactamente 13 dígitos; búsqueda por prefijo y verificación de duplicado (uso: backend/src/routes/dispensacion.routes.ts, líneas 44 y 96; backend/src/services/dispensacion.service.ts, líneas 28 y 52–53). |
| telefono | String | TEXT | Sí | — | — | Teléfono de contacto (uso: backend/src/routes/dispensacion.routes.ts, líneas 37 y 89). |
| direccion | String | TEXT | Sí | — | — | Dirección (uso: backend/src/routes/dispensacion.routes.ts, líneas 37 y 89). |
| observaciones | String | TEXT | Sí | — | — | Notas libres del beneficiario (uso: backend/src/routes/dispensacion.routes.ts, líneas 37 y 89; frontend/src/pages/Beneficiarios.tsx). |
| activo | Boolean | BOOLEAN | No | `true` | — | Borrado lógico; no se puede dispensar a un beneficiario inactivo y las búsquedas filtran activos (uso: backend/src/services/dispensacion.service.ts, líneas 15, 27, 37 y 170–171). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de registro del beneficiario. |
| updatedAt (`updated_at`) | DateTime | TIMESTAMP(3) | No | `@updatedAt` | — | Fecha de última modificación, mantenida por Prisma. |

**Relaciones:** Beneficiario (1) → (N) Dispensacion, por `Dispensacion.beneficiarioId`.

**Índices / restricciones compuestas:** ninguna.

---

### 2.9 Dispensacion → tabla `dispensaciones`

(fuente: backend/prisma/schema.prisma, líneas 168–183)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la dispensación (entrega a un beneficiario). |
| beneficiarioId (`beneficiario_id`) | String | TEXT | No | — | FK → `beneficiarios.id` | Beneficiario que recibe (uso: backend/src/services/dispensacion.service.ts, líneas 170 y 256). |
| usuarioId (`usuario_id`) | String | TEXT | No | — | FK → `usuarios.id` | Usuario que dispensó (uso: backend/src/services/dispensacion.service.ts, línea 257). |
| observaciones | String | TEXT | Sí | — | — | Notas libres de la dispensación (uso: backend/src/services/dispensacion.service.ts, línea 258). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha y hora de la dispensación; el historial filtra por rango (`fechaDesde`/`fechaHasta`) y ordena descendente sobre este campo (uso: backend/src/services/dispensacion.service.ts, líneas 298–314). |

**Relaciones:**
- Dispensacion (N) → (1) Beneficiario, por `beneficiarioId` (obligatoria).
- Dispensacion (N) → (1) Usuario, por `usuarioId` (obligatoria).
- Dispensacion (1) → (N) DetalleDispensacion, por `DetalleDispensacion.dispensacionId`.
- Dispensacion (1) → (N) FotoDispensacion, por `FotoDispensacion.dispensacionId` (máximo 2, uno
  por tipo, por el `@@unique` de FotoDispensacion).
- Dispensacion (1) → (0..1) TokenCaptura, por `TokenCaptura.dispensacionId` (UNIQUE).

**Índices / restricciones compuestas:** ninguna.

---

### 2.10 FotoDispensacion → tabla `fotos_dispensacion`

(fuente: backend/prisma/schema.prisma, líneas 185–205)

Comentario del esquema: "Evidencia fotográfica de la dispensación (receta y entrega), capturada
desde el celular vía la pantalla pública /captura/:token." (líneas 185–186).

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la foto. |
| dispensacionId (`dispensacion_id`) | String | TEXT | No | — | FK → `dispensaciones.id`; parte de UNIQUE compuesto | Dispensación a la que pertenece la evidencia (uso: backend/src/services/dispensacion.service.ts, líneas 494 y 508–512). |
| tipo | TipoFoto (enum) | ENUM `TipoFoto` | No | — | Parte de UNIQUE compuesto | Tipo de evidencia: receta o entrega (uso: backend/src/services/dispensacion.service.ts, líneas 499–511 y 520–521). |
| imagenUrl (`imagen_url`) | String | TEXT | No | — | — | Ruta relativa del archivo, con forma `/uploads/dispensaciones/<dispensacionId>/<TIPO>.<ext>` (uso: backend/src/services/dispensacion.service.ts, línea 506). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de subida; se actualiza al reemplazar la foto (uso: backend/src/services/dispensacion.service.ts, línea 510). |

**Relaciones:** FotoDispensacion (N) → (1) Dispensacion, por `dispensacionId` (obligatoria).

**Índices / restricciones compuestas:** `@@unique([dispensacionId, tipo])` — comentario del
esquema: "Una sola foto vigente por tipo: subir de nuevo el mismo tipo reemplaza la anterior."
(fuente: backend/prisma/schema.prisma, líneas 202–203). El código lo usa como clave del `upsert`
(`dispensacionId_tipo`) (fuente: backend/src/services/dispensacion.service.ts, línea 509).

---

### 2.11 TokenCaptura → tabla `tokens_captura`

(fuente: backend/prisma/schema.prisma, líneas 207–221)

Comentario del esquema: "Token de un solo uso que autoriza la subida de fotos SIN sesión
iniciada. Es la credencial que viaja en el QR, por eso debe ser aleatorio y de vida corta."
(líneas 207–208).

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del registro. |
| dispensacionId (`dispensacion_id`) | String | TEXT | No | — | UNIQUE; FK → `dispensaciones.id` | Dispensación para la que el token autoriza subir fotos; un solo token por dispensación, regenerado con `upsert` (uso: backend/src/services/dispensacion.service.ts, líneas 413–415). |
| token | String | TEXT | No | — | UNIQUE | Valor aleatorio de 10 caracteres generado con `nanoid(10)`; va en la URL `/captura/:token` (uso: backend/src/services/dispensacion.service.ts, línea 409; frontend/src/pages/Dispensacion.tsx, línea 457). |
| usado | Boolean | BOOLEAN | No | `false` | — | Se marca `true` cuando la dispensación ya tiene las dos fotos; un token usado deja de aceptarse (uso: backend/src/services/dispensacion.service.ts, líneas 401, 454 y 522–526). |
| expiraEn (`expira_en`) | DateTime | TIMESTAMP(3) | No | — | — | Instante de vencimiento: creación + 30 minutos (`TOKEN_VIGENCIA_MIN = 30`); los vencidos se rechazan y el cron diario los borra (uso: backend/src/services/dispensacion.service.ts, líneas 371, 410, 454 y 533–538). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |

**Relaciones:** TokenCaptura (0..1) → (1) Dispensacion, por `dispensacionId` (obligatoria, 1:1).

**Índices / restricciones compuestas:** ninguna compuesta (UNIQUE simples en `dispensacionId` y
`token`).

---

### 2.12 DetalleDispensacion → tabla `detalle_dispensaciones`

(fuente: backend/prisma/schema.prisma, líneas 223–240)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la línea de detalle. |
| dispensacionId (`dispensacion_id`) | String | TEXT | No | — | FK → `dispensaciones.id` | Dispensación a la que pertenece la línea (uso: backend/src/services/dispensacion.service.ts, líneas 253–262, creación anidada). |
| loteId (`lote_id`) | String | TEXT | No | — | FK → `lotes.id` | Lote exacto del que se descontaron las unidades; una solicitud puede generar varias líneas si el FIFO reparte entre lotes (uso: backend/src/services/dispensacion.service.ts, líneas 218–242). |
| medicamentoId (`medicamento_id`) | String | TEXT | No | — | FK → `medicamentos.id` | Medicamento dispensado (uso: backend/src/services/dispensacion.service.ts, línea 234). |
| cantidad | Int | INTEGER | No | — | — | Unidades descontadas de ese lote (uso: backend/src/services/dispensacion.service.ts, líneas 222 y 235). |
| nombreMedicamentoSnapshot (`nombre_medicamento_snapshot`) | String | TEXT | No | — | — | Comentario del esquema: "Snapshots inmutables del momento de dispensación" (línea 229). Copia de `Medicamento.nombreGenerico` al dispensar (uso: backend/src/services/dispensacion.service.ts, línea 237). |
| presentacionSnapshot (`presentacion_snapshot`) | String | TEXT | No | — | — | Snapshot inmutable (línea 229). Copia de `Medicamento.presentacion` (uso: backend/src/services/dispensacion.service.ts, línea 238). |
| concentracionSnapshot (`concentracion_snapshot`) | String | TEXT | Sí | — | — | Snapshot inmutable (línea 229). Copia de `Medicamento.concentracion` (uso: backend/src/services/dispensacion.service.ts, línea 239). |

**Relaciones:**
- DetalleDispensacion (N) → (1) Dispensacion, por `dispensacionId` (obligatoria).
- DetalleDispensacion (N) → (1) Lote, por `loteId` (obligatoria).
- DetalleDispensacion (N) → (1) Medicamento, por `medicamentoId` (obligatoria).

**Índices / restricciones compuestas:** ninguna.

---

### 2.13 LogAuditoria → tabla `log_auditoria`

(fuente: backend/prisma/schema.prisma, líneas 258–273)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del registro de auditoría. |
| usuarioId (`usuario_id`) | String | TEXT | No | — | FK → `usuarios.id` | Usuario que ejecutó la acción (uso: backend/src/middleware/audit.ts, línea 19). |
| accion | AccionAuditoria (enum) | ENUM `AccionAuditoria` | No | — | — | Tipo de acción registrada (uso: backend/src/middleware/audit.ts, línea 20). |
| entidad | String | TEXT | No | — | — | Nombre de la entidad afectada, texto libre (ej. `'medicamento'`, `'reporte'`) (uso: backend/src/middleware/audit.ts, línea 21; backend/src/routes/catalogos.routes.ts, línea 279). |
| entidadId (`entidad_id`) | String | TEXT | Sí | — | — (no es FK) | Id del registro afectado; referencia lógica sin clave foránea (uso: backend/src/middleware/audit.ts, línea 22). |
| datosAnteriores (`datos_anteriores`) | Json | JSONB | Sí | — | — | Estado previo del registro (uso: backend/src/middleware/audit.ts, línea 23; backend/src/routes/inventario.routes.ts, línea 455). |
| datosNuevos (`datos_nuevos`) | Json | JSONB | Sí | — | — | Estado nuevo del registro (uso: backend/src/middleware/audit.ts, línea 24; backend/src/routes/catalogos.routes.ts, línea 280). |
| ipAddress (`ip_address`) | String | TEXT | Sí | — | — | IP de origen de la petición, tomada de `req.ip` (uso: backend/src/middleware/audit.ts, línea 25; backend/src/routes/auth.routes.ts, línea 58). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha y hora de la acción. |

**Relaciones:** LogAuditoria (N) → (1) Usuario, por `usuarioId` (obligatoria).

**Índices / restricciones compuestas:** ninguna.

Nota de uso: `registrarAuditoria()` captura sus propios errores y solo los registra en consola;
un fallo al auditar no interrumpe la operación (fuente: backend/src/middleware/audit.ts,
líneas 15–31).

---

### 2.14 ConfiguracionSistema → tabla `configuracion_sistema`

(fuente: backend/prisma/schema.prisma, líneas 279–286)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del parámetro. |
| clave | String | TEXT | No | — | UNIQUE | Nombre del parámetro; claves usadas: `ALERTA_VENCIMIENTO_ROJO`, `ALERTA_VENCIMIENTO_AMARILLO`, `NOMBRE_FARMACIA` (uso: backend/src/services/inventario.service.ts, líneas 22–33; backend/src/routes/inventario.routes.ts, líneas 512–524; backend/src/services/reportes.service.ts, línea 368). |
| valor | String | TEXT | No | — | — | Valor del parámetro almacenado como texto; los umbrales se convierten a número al leerlos (uso: backend/src/services/inventario.service.ts, líneas 25–33). |
| descripcion | String | TEXT | Sí | — | — | Descripción legible del parámetro (uso: backend/prisma/seed.ts, líneas 85–101). |

**Relaciones:** ninguna.

**Índices / restricciones compuestas:** ninguna.

---

## 3. Enums

| Enum | Valores | Usado en | Fuente |
|------|---------|----------|--------|
| `Rol` | `ADMIN`, `ENCARGADO_BENEFICENCIA` | `Usuario.rol` | (fuente: backend/prisma/schema.prisma, líneas 14–17 y 25) |
| `EstadoLote` | `DISPONIBLE`, `AGOTADO`, `VENCIDO`, `DADO_DE_BAJA` | `Lote.estado` (default `DISPONIBLE`) | (fuente: backend/prisma/schema.prisma, líneas 118–123 y 135) |
| `TipoFoto` | `RECETA`, `EVIDENCIA_ENTREGA` | `FotoDispensacion.tipo` | (fuente: backend/prisma/schema.prisma, líneas 187–190 y 195) |
| `AccionAuditoria` | `CREAR`, `EDITAR`, `ELIMINAR`, `DISPENSAR`, `BAJA`, `LOGIN`, `LOGOUT`, `ACTIVAR`, `DESACTIVAR` | `LogAuditoria.accion` | (fuente: backend/prisma/schema.prisma, líneas 246–256 y 261) |

---

## 4. Relaciones del sistema (para el diagrama entidad-relación)

Ninguna define `onDelete`/`onUpdate` explícito (ver Convenciones).

1. Usuario (1) —— (N) Entrada : un usuario registra muchas entradas de inventario (`entradas.usuario_id`).
2. Usuario (1) —— (N) Dispensacion : un usuario realiza muchas dispensaciones (`dispensaciones.usuario_id`).
3. Usuario (1) —— (N) LogAuditoria : un usuario genera muchos registros de auditoría (`log_auditoria.usuario_id`).
4. Categoria (1) —— (N) Medicamento : una categoría clasifica muchos medicamentos (`medicamentos.categoria_id`).
5. Medicamento (1) —— (N) CodigoBarras : un medicamento puede tener varios códigos de barras (`codigos_barras.medicamento_id`).
6. Medicamento (1) —— (N) Lote : el stock de un medicamento se reparte en lotes (`lotes.medicamento_id`).
7. Medicamento (1) —— (N) DetalleDispensacion : un medicamento aparece en muchas líneas de dispensación (`detalle_dispensaciones.medicamento_id`).
8. Ubicacion (0..1) —— (N) Lote : un estante contiene muchos lotes; el lote puede no tener ubicación (`lotes.ubicacion_id`, opcional).
9. Entrada (1) —— (N) Lote : una entrada registra uno o más lotes (`lotes.entrada_id`).
10. Lote (1) —— (N) DetalleDispensacion : de un lote se descuentan unidades en muchas dispensaciones (`detalle_dispensaciones.lote_id`).
11. Beneficiario (1) —— (N) Dispensacion : un beneficiario recibe muchas dispensaciones (`dispensaciones.beneficiario_id`).
12. Dispensacion (1) —— (N) DetalleDispensacion : una dispensación tiene una o más líneas (`detalle_dispensaciones.dispensacion_id`).
13. Dispensacion (1) —— (0..2) FotoDispensacion : una dispensación tiene como máximo una foto por tipo (`fotos_dispensacion.dispensacion_id`, UNIQUE con `tipo`).
14. Dispensacion (1) —— (0..1) TokenCaptura : una dispensación tiene como máximo un token de captura (`tokens_captura.dispensacion_id`, UNIQUE).

Relación lógica sin FK: `LogAuditoria.entidadId` apunta al id de la entidad nombrada en
`LogAuditoria.entidad` (fuente: backend/prisma/schema.prisma, líneas 262–263).

Modelo aislado: `ConfiguracionSistema` (sin relaciones).

---

## 5. Datos iniciales (seed)

Fuente: `backend/prisma/seed.ts` (156 líneas). Se ejecuta en cada arranque del contenedor `api`
(fuente: backend/Dockerfile, línea 15) y es idempotente: usa `findUnique`/`upsert` con
`update: {}` o un conteo previo, por lo que no duplica ni sobrescribe registros existentes.

| Entidad | Cantidad | Registros | Condición | Fuente |
|---------|----------|-----------|-----------|--------|
| Usuario | 1 | `admin`, correo `admin@farmag.local`, nombre "Administrador del Sistema", rol `ADMIN`; contraseña definida en seed.ts (hash bcrypt costo 12) | Solo si no existe el username `admin` | (fuente: backend/prisma/seed.ts, líneas 12–30) |
| Categoria | 13 | Analgésico, Antibiótico, Antihipertensivo, Antidiabético, Antiinflamatorio, Antihistamínico, Antipirético, Vitamina/Suplemento, Gastrointestinal, Dermatológico, Respiratorio, Oftálmico, Otro (cada una con descripción) | `upsert` por `nombre` | (fuente: backend/prisma/seed.ts, líneas 35–58) |
| Ubicacion | 7 | A, B, C, D, E, F ("Estante A"…"Estante F") y BOD ("Bodega") | `upsert` por `codigo` | (fuente: backend/prisma/seed.ts, líneas 63–80) |
| ConfiguracionSistema | 3 | `ALERTA_VENCIMIENTO_ROJO` = 30, `ALERTA_VENCIMIENTO_AMARILLO` = 90, `NOMBRE_FARMACIA` = "Farmacia Municipal de Gualán" | `upsert` por `clave` | (fuente: backend/prisma/seed.ts, líneas 85–110) |
| Medicamento | 5 | Acetaminofén 500mg Tableta (Analgésico, stock mín. 50); Amoxicilina 500mg Cápsula (Antibiótico, 30); Ibuprofeno 400mg Tableta (Antiinflamatorio, 40); Losartán 50mg Tableta (Antihipertensivo, 20); Metformina 850mg Tableta (Antidiabético, 20) | Solo si la tabla `medicamentos` está vacía; comentario del seed: "Datos de prueba para el módulo de Inventario" | (fuente: backend/prisma/seed.ts, líneas 112–144) |

El seed **no** crea lotes, entradas, beneficiarios, dispensaciones ni códigos de barras.
