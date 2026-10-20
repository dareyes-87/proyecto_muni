# 02 — Modelo de datos

> Actualizado al commit bdf1187 el 2026-10-20 (extracción original: 194f8fb, 2026-09-25).

> Fase: Extracción (parte 1 de 4). Documento de hechos con fuente; no es texto final de la tesis.
> Fuente principal: `backend/prisma/schema.prisma` (291 líneas) y `backend/prisma/migrations/`.
> Fecha de extracción original: 2026-09-25; actualización: 2026-10-20.

## Convenciones de este documento

- **Tipo PostgreSQL — verificado contra la base de datos.** El 2026-09-25 se compararon los tipos,
  la nulabilidad, los valores por defecto, los índices y las claves foráneas de las 14 tablas con la
  base en ejecución (`\d+ <tabla>` e `information_schema.columns`, PostgreSQL 16.14) y todo
  coincidió. El 2026-10-20 se repitió `\d+` sobre las 4 tablas afectadas por el cambio de esquema
  (`lotes`, `entradas`, `dispensaciones`, `log_auditoria`) y se ejecutó `prisma migrate diff
  --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code` dentro de
  `farmag_api`: **"No difference detected"** (código 0), es decir, la base en ejecución coincide con
  `schema.prisma` completo. Las columnas, tipos y claves foráneas no cambiaron entre `194f8fb` y
  `bdf1187`; solo se agregaron índices (ver sección 6). Equivalencias de notación:
  - `TIMESTAMP(3)` = `timestamp(3) without time zone` (sin zona horaria).
  - `DECIMAL(10,2)` = `numeric(10,2)`.
  - Los enums existen como tipos de PostgreSQL con nombre entre comillas: `"Rol"`,
    `"EstadoLote"`, `"TipoFoto"`, `"AccionAuditoria"`, con los mismos valores del esquema.
- **Valores por defecto en la base de datos:** `now()` aparece como `DEFAULT CURRENT_TIMESTAMP`;
  `@default(true/false/10)` y `@default(DISPONIBLE)` aparecen como `DEFAULT` en la columna.
- **UUID:** los `id` usan `@default(uuid())`. Verificado: la columna es `text` **sin** `DEFAULT`
  en la base de datos; el valor lo genera el cliente Prisma al insertar.
- **`@updatedAt`:** verificado: la columna **no** tiene `DEFAULT` en la base de datos; la actualiza
  el cliente Prisma en cada `update` (no hay trigger).
- **onDelete / onUpdate:** el esquema no define `onDelete` ni `onUpdate` en ninguna relación.
  Verificado en la base de datos: las 13 claves foráneas obligatorias tienen
  `ON UPDATE CASCADE ON DELETE RESTRICT`, y la única opcional (`lotes.ubicacion_id`) tiene
  `ON UPDATE CASCADE ON DELETE SET NULL` (confirmado de nuevo en `\d+ lotes`, 2026-10-20, y en
  backend/prisma/migrations/0_init/migration.sql, líneas 224–264).
- **Nombres de columna:** cuando un campo tiene `@map`, la columna real se indica entre paréntesis
  en la columna "Campo".
- **Índices:** en `194f8fb` ningún modelo definía `@@index`. Desde `bdf1187` hay **4 `@@index`**
  (en `Entrada`, `Lote`, `Dispensacion` y `LogAuditoria`, sección 6). Verificado en la base
  (`pg_indexes`, 2026-10-20): además de las claves primarias existen 14 índices: los 10 `UNIQUE` de
  antes y los 4 nuevos. Las columnas FK siguen sin índice propio, salvo
  `tokens_captura.dispensacion_id` (cubierta por su `UNIQUE`), `fotos_dispensacion.dispensacion_id`
  (primera columna del `UNIQUE` compuesto) y, desde `bdf1187`, `lotes.medicamento_id` (primera
  columna del índice compuesto nuevo).
- **Cliente Prisma:** desde `bdf1187` el backend usa un único `PrismaClient` compartido (fuente:
  backend/src/config/prisma.ts, líneas 10–18); el seed crea el suyo (fuente: backend/prisma/seed.ts,
  línea 5).

---

## 1. Resumen

| Elemento | Cantidad | Detalle |
|----------|----------|---------|
| Modelos (tablas) | **14** | Usuario, Categoria, Medicamento, CodigoBarras, Ubicacion, Entrada, Lote, Beneficiario, Dispensacion, FotoDispensacion, TokenCaptura, DetalleDispensacion, LogAuditoria, ConfiguracionSistema |
| Enums | **4** | Rol, EstadoLote, TipoFoto, AccionAuditoria |
| Relaciones (claves foráneas) | **14** | Ver sección 4 |
| Índices no únicos | **4** | Ver sección 6 (nuevos en `bdf1187`) |
| Migraciones | **2** | `0_init`, `20261017052535_indices_consultas` (sección 6) |

(fuente: backend/prisma/schema.prisma, líneas 1–291; backend/prisma/migrations/)

Además de las 14 tablas del modelo, la base tiene la tabla de control `_prisma_migrations`, que crea
Prisma al aplicar migraciones (verificado: 15 tablas en el esquema `public`, 2026-10-20). No forma
parte del modelo de dominio.

El esquema agrupa los modelos en secciones comentadas: Autenticación y usuarios (líneas 10–37),
Catálogos base (39–99), Inventario (101–148), Dispensación gratuita (150–244), Auditoría
(246–278) y Configuración del sistema (280–291).

---

## 2. Modelos

### 2.1 Usuario → tabla `usuarios`

(fuente: backend/prisma/schema.prisma, líneas 19–37)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del usuario. |
| username | String | TEXT | No | — | UNIQUE | Nombre de usuario con el que se inicia sesión; se incluye en el JWT (uso: backend/src/routes/auth.routes.ts, líneas 92–94 y 118–120). |
| email | String | TEXT | Sí | — | UNIQUE | Correo del usuario; se devuelve en el login y en la gestión de usuarios (uso: backend/src/routes/auth.routes.ts, línea 141; backend/src/routes/usuarios.routes.ts, líneas 68 y 163). El administrador inicial ya no recibe un correo por defecto: solo se asigna si se define `ADMIN_EMAIL` (backend/prisma/seed.ts, líneas 45–47). |
| passwordHash (`password_hash`) | String | TEXT | No | — | — | Hash bcrypt de la contraseña, costo 12; se compara en el login (uso: backend/src/routes/auth.routes.ts, línea 101; backend/src/routes/usuarios.routes.ts, líneas 65 y 204; backend/prisma/seed.ts, línea 48). |
| nombreCompleto (`nombre_completo`) | String | TEXT | No | — | — | Nombre para mostrar del usuario (uso: backend/src/routes/auth.routes.ts, línea 139; reportes y auditoría lo muestran como autor de la acción). |
| rol | Rol (enum) | ENUM `Rol` | No | — | — | Rol del usuario para control de acceso. Desde `bdf1187` `authMiddleware` lo lee de la base en cada petición, no del token (uso: backend/src/middleware/auth.ts, líneas 44–54 y 62–76). |
| activo | Boolean | BOOLEAN | No | `true` | — | Si es `false`, el login se rechaza y, desde `bdf1187`, también cualquier petición con un token ya emitido; se alterna desde la gestión de usuarios y se audita como ACTIVAR/DESACTIVAR (uso: backend/src/routes/auth.routes.ts, línea 96; backend/src/middleware/auth.ts, líneas 49–52; backend/src/routes/usuarios.routes.ts, líneas 112–126). |
| ultimoAcceso (`ultimo_acceso`) | DateTime | TIMESTAMP(3) | Sí | — | — | Fecha y hora del último login exitoso (uso: backend/src/routes/auth.routes.ts, líneas 111–114). |
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
| nombre | String | TEXT | No | — | UNIQUE | Nombre de la categoría terapéutica; el alta comprueba que no exista y la importación Excel la busca por nombre (uso: backend/prisma/seed.ts, líneas 76–99; backend/src/routes/catalogos.routes.ts, línea 487; backend/src/routes/inventario.routes.ts, línea 772). |
| descripcion | String | TEXT | Sí | — | — | Descripción libre de la categoría (uso: backend/src/routes/catalogos.routes.ts, líneas 494 y 516; frontend/src/pages/Catalogos/Categorias.tsx). |
| activo | Boolean | BOOLEAN | No | `true` | — | Borrado lógico; editable en el PUT de categorías (validado con Zod desde `bdf1187`); el listado lo filtra salvo `incluirInactivos=true` (uso: backend/src/routes/catalogos.routes.ts, líneas 466–467 y 513–560). |

**Relaciones:** Categoria (1) → (N) Medicamento, por `Medicamento.categoriaId`.

**Índices / restricciones compuestas:** ninguna.

---

### 2.3 Medicamento → tabla `medicamentos`

(fuente: backend/prisma/schema.prisma, líneas 55–76)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del medicamento. |
| nombreGenerico (`nombre_generico`) | String | TEXT | No | — | — | Nombre genérico; requerido (mín. 2 caracteres en la validación Zod) y parte del criterio de detección de duplicados (uso: backend/src/routes/catalogos.routes.ts, líneas 219 y 248–262). |
| nombreComercial (`nombre_comercial`) | String | TEXT | Sí | — | — | Nombre comercial opcional (uso: backend/src/routes/catalogos.routes.ts, líneas 220 y 273). |
| presentacion | String | TEXT | No | — | — | Forma farmacéutica (ej. "Tableta", "Cápsula" en los ejemplos del seed); parte del criterio de duplicados (uso: backend/src/routes/catalogos.routes.ts, líneas 221 y 251; backend/prisma/seed.ts, líneas 163–167). |
| concentracion | String | TEXT | Sí | — | — | Concentración (ej. "500mg" en los ejemplos del seed); parte del criterio de duplicados (uso: backend/src/routes/catalogos.routes.ts, líneas 222 y 256–258). |
| unidadMedida (`unidad_medida`) | String | TEXT | No | — | — | Unidad de medida del medicamento; requerida (uso: backend/src/routes/catalogos.routes.ts, línea 223; frontend/src/pages/Dispensacion.tsx). |
| categoriaId (`categoria_id`) | String | TEXT | No | — | FK → `categorias.id` | Categoría terapéutica (uso: backend/src/routes/catalogos.routes.ts, líneas 224 y 241). |
| stockMinimo (`stock_minimo`) | Int | INTEGER | No | `10` | — | Umbral de alerta: el medicamento se marca como `stockBajo` cuando el stock disponible es menor que este valor (uso: backend/src/routes/inventario.routes.ts, líneas 245, 334 y 433). |
| imagenUrl (`imagen_url`) | String | TEXT | Sí | — | — | Ruta relativa de la foto del medicamento, con forma `/uploads/medicamentos/<archivo>`. Desde `bdf1187` la imagen se guarda recodificada a WebP (uso: backend/src/routes/catalogos.routes.ts, líneas 699 y 714–717; backend/src/utils/imagen.ts, líneas 26–55). |
| activo | Boolean | BOOLEAN | No | `true` | — | Borrado lógico; los listados filtran `activo: true` salvo `incluirInactivos=true`, y no se puede dispensar un medicamento inactivo (uso: backend/src/routes/catalogos.routes.ts, líneas 25–28; backend/src/services/dispensacion.service.ts, líneas 206–207). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |
| updatedAt (`updated_at`) | DateTime | TIMESTAMP(3) | No | `@updatedAt` | — | Fecha de última modificación, mantenida por Prisma. |

**Relaciones:**
- Medicamento (N) → (1) Categoria, por `categoriaId` (obligatoria).
- Medicamento (1) → (N) CodigoBarras, por `CodigoBarras.medicamentoId`.
- Medicamento (1) → (N) Lote, por `Lote.medicamentoId`.
- Medicamento (1) → (N) DetalleDispensacion, por `DetalleDispensacion.medicamentoId`.

**Índices / restricciones compuestas:** ninguna. La unicidad nombre+presentación+concentración
**no** está en la base de datos; es una advertencia de aplicación que se puede omitir con
`forzarCreacion: true` (fuente: backend/src/routes/catalogos.routes.ts, líneas 229–268).

---

### 2.4 CodigoBarras → tabla `codigos_barras`

(fuente: backend/prisma/schema.prisma, líneas 78–88)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del código. |
| medicamentoId (`medicamento_id`) | String | TEXT | No | — | FK → `medicamentos.id` | Medicamento al que identifica el código (uso: backend/src/routes/catalogos.routes.ts, línea 411). |
| codigo | String | TEXT | No | — | UNIQUE | Valor del código de barras; un código solo puede pertenecer a un medicamento. Desde `bdf1187` se recorta antes de comprobar la unicidad (uso: backend/src/routes/catalogos.routes.ts, líneas 395, 403–407 y 410–411). |
| descripcion | String | TEXT | Sí | — | — | Descripción libre del código (uso: backend/src/routes/catalogos.routes.ts, línea 411). [COMPLETAR: qué se espera registrar aquí; la especificación sugiere el laboratorio] |

**Relaciones:** CodigoBarras (N) → (1) Medicamento, por `medicamentoId` (obligatoria).

**Índices / restricciones compuestas:** ninguna.

---

### 2.5 Ubicacion → tabla `ubicaciones`

(fuente: backend/prisma/schema.prisma, líneas 90–99)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la ubicación. |
| codigo | String | TEXT | No | — | UNIQUE | Código corto del estante (ej. "A", "BOD" en el seed); el alta comprueba que no exista y la importación Excel busca la ubicación por código sin distinguir mayúsculas (uso: backend/prisma/seed.ts, líneas 104–112; backend/src/routes/catalogos.routes.ts, líneas 585 y 625–630; backend/src/routes/inventario.routes.ts, líneas 788–794). |
| descripcion | String | TEXT | Sí | — | — | Descripción del estante (ej. "Estante A", "Bodega") (uso: backend/prisma/seed.ts, líneas 105–111; backend/src/routes/catalogos.routes.ts, líneas 592 y 631). |

**Relaciones:** Ubicacion (1) → (N) Lote, por `Lote.ubicacionId` (opcional en Lote).

**Índices / restricciones compuestas:** ninguna. Este modelo **no** tiene campo `activo`.

---

### 2.6 Entrada → tabla `entradas`

(fuente: backend/prisma/schema.prisma, líneas 105–117)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la entrada (ingreso de inventario que agrupa uno o varios lotes). |
| usuarioId (`usuario_id`) | String | TEXT | No | — | FK → `usuarios.id` | Usuario que registró la entrada; se toma de `req.user.userId` (uso: backend/src/routes/inventario.routes.ts, líneas 102 y 861). |
| observaciones | String | TEXT | Sí | — | — | Notas libres de la entrada; la importación Excel escribe "Importado desde Excel (fila N)" (uso: backend/src/routes/inventario.routes.ts, líneas 43, 103 y 862). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha y hora de registro de la entrada; es la columna del índice nuevo. |

**Relaciones:**
- Entrada (N) → (1) Usuario, por `usuarioId` (obligatoria).
- Entrada (1) → (N) Lote, por `Lote.entradaId`.

**Índices / restricciones compuestas:** **nuevo** `@@index([createdAt])` →
`entradas_created_at_idx` (btree sobre `created_at`) (fuente: backend/prisma/schema.prisma,
línea 115; verificado con `\d+ entradas`, 2026-10-20).

---

### 2.7 Lote → tabla `lotes`

(fuente: backend/prisma/schema.prisma, líneas 126–148)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del lote. |
| entradaId (`entrada_id`) | String | TEXT | No | — | FK → `entradas.id` | Entrada que originó el lote (uso: backend/src/routes/inventario.routes.ts, líneas 109 y 868). |
| medicamentoId (`medicamento_id`) | String | TEXT | No | — | FK → `medicamentos.id` | Medicamento del lote; es el filtro del `SELECT … FOR UPDATE` de la dispensación y la primera columna del índice nuevo (uso: backend/src/services/dispensacion.service.ts, líneas 213–222). |
| cantidad | Int | INTEGER | No | — | — | Unidades ingresadas originalmente (uso: backend/src/routes/inventario.routes.ts, líneas 35 y 111). |
| cantidadActual (`cantidad_actual`) | Int | INTEGER | No | — | — | Unidades restantes; se inicializa igual a `cantidad` y la dispensación la descuenta (uso: backend/src/routes/inventario.routes.ts, líneas 112 y 871; backend/src/services/dispensacion.service.ts, líneas 237–246). |
| numeroLote (`numero_lote`) | String | TEXT | No | — | — | Número de lote; requerido en la validación (uso: backend/src/routes/inventario.routes.ts, líneas 36, 113 y 643–644). |
| fechaVencimiento (`fecha_vencimiento`) | DateTime `@db.Date` | DATE | No | — | — | Fecha de vencimiento; define el orden FIFO de la dispensación (`ORDER BY fecha_vencimiento ASC`), que desde `bdf1187` además excluye `fecha_vencimiento <= hoy`; también el semáforo y el cron de vencimientos (uso: backend/src/services/dispensacion.service.ts, líneas 219–221; backend/src/services/vencimiento.service.ts, líneas 11–14; backend/src/services/inventario.service.ts). Las entradas exigen fecha futura (backend/src/routes/inventario.routes.ts, líneas 64–73). |
| costoUnitario (`costo_unitario`) | Decimal `@db.Decimal(10, 2)` | DECIMAL(10,2) | Sí | — | — | Costo por unidad, opcional y no negativo; alimenta el costo estimado perdido del reporte de bajas (uso: backend/src/routes/inventario.routes.ts, líneas 38 y 115; backend/src/services/reportes.service.ts, línea 29). |
| ubicacionId (`ubicacion_id`) | String | TEXT | Sí | — | FK → `ubicaciones.id` | Estante donde se colocó el lote; se valida que exista (uso: backend/src/routes/inventario.routes.ts, líneas 39, 87–95 y 116). |
| estado | EstadoLote (enum) | ENUM `EstadoLote` | No | `DISPONIBLE` | — | Estado del lote. Pasa a `AGOTADO` cuando `cantidadActual` llega a 0, a `VENCIDO` por el cron diario (y al arrancar) y a `DADO_DE_BAJA` por acción del administrador (uso: backend/src/services/dispensacion.service.ts, línea 244; backend/src/services/vencimiento.service.ts, líneas 11–14; backend/src/routes/inventario.routes.ts, líneas 447–490). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |

**Relaciones:**
- Lote (N) → (1) Entrada, por `entradaId` (obligatoria).
- Lote (N) → (1) Medicamento, por `medicamentoId` (obligatoria).
- Lote (N) → (0..1) Ubicacion, por `ubicacionId` (opcional → `ON DELETE SET NULL`, verificado en la BD).
- Lote (1) → (N) DetalleDispensacion, por `DetalleDispensacion.loteId`.

**Índices / restricciones compuestas:** **nuevo** `@@index([medicamentoId, estado,
fechaVencimiento])` → `lotes_medicamento_id_estado_fecha_vencimiento_idx` (btree). Comentario del
esquema: "Lo usa el despacho FIFO: lotes DISPONIBLE de un medicamento por vencimiento." (fuente:
backend/prisma/schema.prisma, líneas 145–146; verificado con `\d+ lotes`, 2026-10-20). Cubre el
filtro y el orden de la consulta FIFO, que en `194f8fb` no tenía índice.

---

### 2.8 Beneficiario → tabla `beneficiarios`

(fuente: backend/prisma/schema.prisma, líneas 154–169)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del beneficiario. |
| nombreCompleto (`nombre_completo`) | String | TEXT | No | — | — | Nombre del beneficiario; mínimo 3 caracteres y de tipo texto; se usa en la búsqueda por nombre (uso: backend/src/routes/dispensacion.routes.ts, líneas 43–49; backend/src/services/dispensacion.service.ts, líneas 38–44). |
| dpi | String | TEXT | Sí | — | UNIQUE | Documento Personal de Identificación; si se envía debe tener exactamente 13 dígitos; búsqueda por prefijo y verificación de duplicado (uso: backend/src/routes/dispensacion.routes.ts, líneas 59 y 116; backend/src/services/dispensacion.service.ts, líneas 32, 56–59 y 118–121). |
| telefono | String | TEXT | Sí | — | — | Teléfono de contacto; desde `bdf1187` se valida que sea texto (uso: backend/src/routes/dispensacion.routes.ts, líneas 52–58 y 67). |
| direccion | String | TEXT | Sí | — | — | Dirección (uso: backend/src/routes/dispensacion.routes.ts, líneas 52–58 y 68). |
| observaciones | String | TEXT | Sí | — | — | Notas libres del beneficiario (uso: backend/src/routes/dispensacion.routes.ts, líneas 52–58 y 69; frontend/src/pages/Beneficiarios.tsx). |
| activo | Boolean | BOOLEAN | No | `true` | — | Borrado lógico; no se puede dispensar a un beneficiario inactivo y las búsquedas filtran activos (uso: backend/src/services/dispensacion.service.ts, líneas 19, 31, 41 y 174–175). Sigue sin existir forma de cambiarlo (H-29). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de registro del beneficiario. |
| updatedAt (`updated_at`) | DateTime | TIMESTAMP(3) | No | `@updatedAt` | — | Fecha de última modificación, mantenida por Prisma. |

**Relaciones:** Beneficiario (1) → (N) Dispensacion, por `Dispensacion.beneficiarioId`.

**Índices / restricciones compuestas:** ninguna.

---

### 2.9 Dispensacion → tabla `dispensaciones`

(fuente: backend/prisma/schema.prisma, líneas 171–187)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la dispensación (entrega a un beneficiario). |
| beneficiarioId (`beneficiario_id`) | String | TEXT | No | — | FK → `beneficiarios.id` | Beneficiario que recibe (uso: backend/src/services/dispensacion.service.ts, líneas 172 y 271). |
| usuarioId (`usuario_id`) | String | TEXT | No | — | FK → `usuarios.id` | Usuario que dispensó (uso: backend/src/services/dispensacion.service.ts, línea 272). Desde `bdf1187` también es el usuario al que se atribuye en la auditoría la subida de fotos por captura (líneas 626–640; H-35). |
| observaciones | String | TEXT | Sí | — | — | Notas libres de la dispensación (uso: backend/src/services/dispensacion.service.ts, línea 273). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha y hora de la dispensación; el historial filtra por rango (`fechaDesde`/`fechaHasta`) y ordena descendente sobre este campo; es la columna del índice nuevo (uso: backend/src/services/dispensacion.service.ts, líneas 323–360). |

**Relaciones:**
- Dispensacion (N) → (1) Beneficiario, por `beneficiarioId` (obligatoria).
- Dispensacion (N) → (1) Usuario, por `usuarioId` (obligatoria).
- Dispensacion (1) → (N) DetalleDispensacion, por `DetalleDispensacion.dispensacionId`.
- Dispensacion (1) → (N) FotoDispensacion, por `FotoDispensacion.dispensacionId` (máximo 2, uno
  por tipo, por el `@@unique` de FotoDispensacion).
- Dispensacion (1) → (0..1) TokenCaptura, por `TokenCaptura.dispensacionId` (UNIQUE).

**Índices / restricciones compuestas:** **nuevo** `@@index([createdAt])` →
`dispensaciones_created_at_idx` (btree) (fuente: backend/prisma/schema.prisma, línea 185; verificado
con `\d+ dispensaciones`, 2026-10-20).

---

### 2.10 FotoDispensacion → tabla `fotos_dispensacion`

(fuente: backend/prisma/schema.prisma, líneas 196–209)

Comentario del esquema: "Evidencia fotográfica de la dispensación (receta y entrega), capturada
desde el celular vía la pantalla pública /captura/:token." (líneas 189–190).

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la foto. |
| dispensacionId (`dispensacion_id`) | String | TEXT | No | — | FK → `dispensaciones.id`; parte de UNIQUE compuesto | Dispensación a la que pertenece la evidencia (uso: backend/src/services/dispensacion.service.ts, líneas 590 y 605–609). |
| tipo | TipoFoto (enum) | ENUM `TipoFoto` | No | — | Parte de UNIQUE compuesto | Tipo de evidencia: receta o entrega (uso: backend/src/services/dispensacion.service.ts, líneas 594–609 y 617–618). |
| imagenUrl (`imagen_url`) | String | TEXT | No | — | — | Ruta relativa del archivo, con forma `/uploads/dispensaciones/<dispensacionId>/<TIPO>.webp` (desde `bdf1187` las fotos se recodifican a WebP). **Esa ruta ya no se sirve estáticamente**: el archivo se entrega por `GET /api/dispensacion/:id/foto/:tipo`, que toma solo el nombre del archivo (`path.basename`) de este campo (uso: backend/src/services/dispensacion.service.ts, líneas 551–569, 588 y 601–603; backend/src/server.ts, líneas 44–47). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de subida; se actualiza al reemplazar la foto (uso: backend/src/services/dispensacion.service.ts, línea 607). |

**Relaciones:** FotoDispensacion (N) → (1) Dispensacion, por `dispensacionId` (obligatoria).

**Índices / restricciones compuestas:** `@@unique([dispensacionId, tipo])` — comentario del
esquema: "Una sola foto vigente por tipo: subir de nuevo el mismo tipo reemplaza la anterior."
(fuente: backend/prisma/schema.prisma, líneas 206–207). El código lo usa como clave del `upsert` y de
la lectura del archivo (`dispensacionId_tipo`) (fuente: backend/src/services/dispensacion.service.ts,
líneas 553 y 606). Desde `bdf1187` ya no se pueden reemplazar las fotos una vez completas las dos,
porque no se genera un token nuevo (líneas 444–455; H-14).

---

### 2.11 TokenCaptura → tabla `tokens_captura`

(fuente: backend/prisma/schema.prisma, líneas 213–225)

Comentario del esquema: "Token de un solo uso que autoriza la subida de fotos SIN sesión
iniciada. Es la credencial que viaja en el QR, por eso debe ser aleatorio y de vida corta."
(líneas 211–212).

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del registro. |
| dispensacionId (`dispensacion_id`) | String | TEXT | No | — | UNIQUE; FK → `dispensaciones.id` | Dispensación para la que el token autoriza subir fotos; un solo token por dispensación, regenerado con `upsert` (uso: backend/src/services/dispensacion.service.ts, líneas 473–477). |
| token | String | TEXT | No | — | UNIQUE | Valor aleatorio. **Desde `bdf1187`** se genera con `randomBytes(8).toString('base64url')` (11 caracteres, 64 bits); antes era `nanoid(10)`. El comentario del código indica que los tokens anteriores siguen siendo válidos. Va en la URL `/captura/:token` (uso: backend/src/services/dispensacion.service.ts, línea 470; frontend/src/pages/Dispensacion.tsx, línea 479). |
| usado | Boolean | BOOLEAN | No | `false` | — | Se marca `true` cuando la dispensación ya tiene las dos fotos; un token usado deja de aceptarse (uso: backend/src/services/dispensacion.service.ts, líneas 462, 515 y 617–624). |
| expiraEn (`expira_en`) | DateTime | TIMESTAMP(3) | No | — | — | Instante de vencimiento: creación + 30 minutos (`TOKEN_VIGENCIA_MIN = 30`); los vencidos se rechazan y el mantenimiento diario los borra (uso: backend/src/services/dispensacion.service.ts, líneas 419, 471, 515 y 646–651). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha de creación del registro. |

**Relaciones:** TokenCaptura (0..1) → (1) Dispensacion, por `dispensacionId` (obligatoria, 1:1).

**Índices / restricciones compuestas:** ninguna compuesta (UNIQUE simples en `dispensacionId` y
`token`).

---

### 2.12 DetalleDispensacion → tabla `detalle_dispensaciones`

(fuente: backend/prisma/schema.prisma, líneas 227–244)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador de la línea de detalle. |
| dispensacionId (`dispensacion_id`) | String | TEXT | No | — | FK → `dispensaciones.id` | Dispensación a la que pertenece la línea (uso: backend/src/services/dispensacion.service.ts, líneas 268–276, creación anidada). |
| loteId (`lote_id`) | String | TEXT | No | — | FK → `lotes.id` | Lote exacto del que se descontaron las unidades; una solicitud puede generar varias líneas si el FIFO reparte entre lotes (uso: backend/src/services/dispensacion.service.ts, líneas 234–258). |
| medicamentoId (`medicamento_id`) | String | TEXT | No | — | FK → `medicamentos.id` | Medicamento dispensado (uso: backend/src/services/dispensacion.service.ts, línea 250). |
| cantidad | Int | INTEGER | No | — | — | Unidades descontadas de ese lote (uso: backend/src/services/dispensacion.service.ts, líneas 237 y 251). |
| nombreMedicamentoSnapshot (`nombre_medicamento_snapshot`) | String | TEXT | No | — | — | Comentario del esquema: "Snapshots inmutables del momento de dispensación" (línea 233). Copia de `Medicamento.nombreGenerico` al dispensar (uso: backend/src/services/dispensacion.service.ts, línea 252). |
| presentacionSnapshot (`presentacion_snapshot`) | String | TEXT | No | — | — | Snapshot inmutable (línea 233). Copia de `Medicamento.presentacion` (uso: backend/src/services/dispensacion.service.ts, línea 253). |
| concentracionSnapshot (`concentracion_snapshot`) | String | TEXT | Sí | — | — | Snapshot inmutable (línea 233). Copia de `Medicamento.concentracion` (uso: backend/src/services/dispensacion.service.ts, línea 254). |

**Relaciones:**
- DetalleDispensacion (N) → (1) Dispensacion, por `dispensacionId` (obligatoria).
- DetalleDispensacion (N) → (1) Lote, por `loteId` (obligatoria).
- DetalleDispensacion (N) → (1) Medicamento, por `medicamentoId` (obligatoria).

**Índices / restricciones compuestas:** ninguna.

---

### 2.13 LogAuditoria → tabla `log_auditoria`

(fuente: backend/prisma/schema.prisma, líneas 262–278)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del registro de auditoría. |
| usuarioId (`usuario_id`) | String | TEXT | No | — | FK → `usuarios.id` | Usuario que ejecutó la acción (uso: backend/src/middleware/audit.ts, línea 18). Por ser obligatorio, los intentos de login con un usuario inexistente no se pueden auditar (backend/src/routes/auth.routes.ts, líneas 18–21). |
| accion | AccionAuditoria (enum) | ENUM `AccionAuditoria` | No | — | — | Tipo de acción registrada (uso: backend/src/middleware/audit.ts, línea 19). Desde `bdf1187` los intentos fallidos también se registran como `LOGIN`, con `datosNuevos.exito = false` (backend/src/routes/auth.routes.ts, líneas 26–39). |
| entidad | String | TEXT | No | — | — | Nombre de la entidad afectada, texto libre (ej. `'medicamento'`, `'reporte'`, `'FotoDispensacion'`) (uso: backend/src/middleware/audit.ts, línea 20; backend/src/routes/catalogos.routes.ts, línea 286; backend/src/services/dispensacion.service.ts, línea 636). |
| entidadId (`entidad_id`) | String | TEXT | Sí | — | — (no es FK) | Id del registro afectado; referencia lógica sin clave foránea (uso: backend/src/middleware/audit.ts, línea 21). |
| datosAnteriores (`datos_anteriores`) | Json | JSONB | Sí | — | — | Estado previo del registro (uso: backend/src/middleware/audit.ts, línea 22; backend/src/routes/inventario.routes.ts, línea 479). |
| datosNuevos (`datos_nuevos`) | Json | JSONB | Sí | — | — | Estado nuevo del registro (uso: backend/src/middleware/audit.ts, línea 23; backend/src/routes/inventario.routes.ts, línea 480). |
| ipAddress (`ip_address`) | String | TEXT | Sí | — | — | IP de origen, tomada de `req.ip`; desde `bdf1187`, con `trust proxy 1`, es la IP enviada por el proxy en `X-Forwarded-For` (uso: backend/src/middleware/audit.ts, línea 24; backend/src/routes/auth.routes.ts, línea 131; backend/src/server.ts, línea 23). La subida de fotos por captura se registra sin IP (H-35). |
| createdAt (`created_at`) | DateTime | TIMESTAMP(3) | No | `now()` | — | Fecha y hora de la acción; es la columna del índice nuevo. |

**Relaciones:** LogAuditoria (N) → (1) Usuario, por `usuarioId` (obligatoria).

**Índices / restricciones compuestas:** **nuevo** `@@index([createdAt])` →
`log_auditoria_created_at_idx` (btree) (fuente: backend/prisma/schema.prisma, línea 276; verificado
con `\d+ log_auditoria`, 2026-10-20).

Nota de uso: `registrarAuditoria()` captura sus propios errores y solo los registra en consola;
un fallo al auditar no interrumpe la operación (fuente: backend/src/middleware/audit.ts,
líneas 14–30).

---

### 2.14 ConfiguracionSistema → tabla `configuracion_sistema`

(fuente: backend/prisma/schema.prisma, líneas 284–291)

| Campo | Tipo Prisma | Tipo PostgreSQL | Nulo | Default | Restricciones | Descripción |
|-------|-------------|-----------------|------|---------|---------------|-------------|
| id | String | TEXT | No | `uuid()` | PK | Identificador del parámetro. |
| clave | String | TEXT | No | — | UNIQUE | Nombre del parámetro; claves usadas: `ALERTA_VENCIMIENTO_ROJO`, `ALERTA_VENCIMIENTO_AMARILLO`, `NOMBRE_FARMACIA` (uso: backend/src/services/inventario.service.ts, líneas 21–32; backend/src/routes/inventario.routes.ts, líneas 515–565; backend/src/services/reportes.service.ts, línea 372). |
| valor | String | TEXT | No | — | — | Valor del parámetro almacenado como texto; los umbrales se convierten a número al leerlos (uso: backend/src/services/inventario.service.ts, líneas 24–32). |
| descripcion | String | TEXT | Sí | — | — | Descripción legible del parámetro (uso: backend/prisma/seed.ts, líneas 124–140). |

**Relaciones:** ninguna.

**Índices / restricciones compuestas:** ninguna.

---

## 3. Enums

| Enum | Valores | Usado en | Fuente |
|------|---------|----------|--------|
| `Rol` | `ADMIN`, `ENCARGADO_BENEFICENCIA` | `Usuario.rol` | (fuente: backend/prisma/schema.prisma, líneas 14–17 y 25) |
| `EstadoLote` | `DISPONIBLE`, `AGOTADO`, `VENCIDO`, `DADO_DE_BAJA` | `Lote.estado` (default `DISPONIBLE`) | (fuente: backend/prisma/schema.prisma, líneas 119–124 y 136) |
| `TipoFoto` | `RECETA`, `EVIDENCIA_ENTREGA` | `FotoDispensacion.tipo` | (fuente: backend/prisma/schema.prisma, líneas 191–194 y 199) |
| `AccionAuditoria` | `CREAR`, `EDITAR`, `ELIMINAR`, `DISPENSAR`, `BAJA`, `LOGIN`, `LOGOUT`, `ACTIVAR`, `DESACTIVAR` | `LogAuditoria.accion` | (fuente: backend/prisma/schema.prisma, líneas 250–260 y 265) |

Los cuatro enums no cambiaron entre `194f8fb` y `bdf1187` (fuente: `git diff 194f8fb bdf1187 --
backend/prisma/schema.prisma`; backend/prisma/migrations/0_init/migration.sql, líneas 5–14).

---

## 4. Relaciones del sistema (para el diagrama entidad-relación)

Ninguna define `onDelete`/`onUpdate` explícito en el esquema. En la base de datos, todas son `ON UPDATE CASCADE ON DELETE RESTRICT`, salvo la 8 (`ON DELETE SET NULL`) (ver Convenciones). Ninguna relación cambió en `bdf1187`.

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
`LogAuditoria.entidad` (fuente: backend/prisma/schema.prisma, líneas 266–267).

Modelo aislado: `ConfiguracionSistema` (sin relaciones).

---

## 5. Datos iniciales (seed)

Fuente: `backend/prisma/seed.ts` (200 líneas). Se ejecuta en cada arranque del contenedor `api`,
como paso 3 de `docker-entrypoint.sh`; si falla, el arranque continúa y queda el aviso en
`backups/ESTADO_ARRANQUE.txt` (fuente: backend/docker-entrypoint.sh, línea 149; backend/package.json,
línea 17). Es idempotente.

**Cambio de criterio respecto a `194f8fb`** (commit `99d4429`): antes las categorías, ubicaciones y
configuraciones se creaban con `upsert` por clave natural, de modo que un registro renombrado
reaparecía en el siguiente arranque, y los 5 medicamentos se creaban siempre que la tabla estuviera
vacía. Ahora categorías y ubicaciones se crean **solo si su tabla está vacía**, y los medicamentos
solo con `SEED_DEMO=true` (fuente: backend/prisma/seed.ts, líneas 92–99, 114–119 y 151–155; la
prueba backend/tests/seed.test.ts verifica ese comportamiento).

| Entidad | Cantidad | Registros | Condición | Fuente |
|---------|----------|-----------|-----------|--------|
| Usuario | 1 | Username de `ADMIN_USERNAME` (por defecto `admin`), nombre "Administrador del Sistema", rol `ADMIN`; correo solo si se define `ADMIN_EMAIL` (ya no se asigna `admin@farmag.local`). La contraseña **ya no está en el código** (ver abajo); hash bcrypt costo 12 | Solo si no existe ese username; si existe, no se toca ni se restablece su contraseña | (fuente: backend/prisma/seed.ts, líneas 13–71) |
| Categoria | 13 | Analgésico, Antibiótico, Antihipertensivo, Antidiabético, Antiinflamatorio, Antihistamínico, Antipirético, Vitamina/Suplemento, Gastrointestinal, Dermatológico, Respiratorio, Oftálmico, Otro (cada una con descripción) | `createMany` solo si la tabla `categorias` está vacía | (fuente: backend/prisma/seed.ts, líneas 76–99) |
| Ubicacion | 7 | A, B, C, D, E, F ("Estante A"…"Estante F") y BOD ("Bodega") | `createMany` solo si la tabla `ubicaciones` está vacía | (fuente: backend/prisma/seed.ts, líneas 104–119) |
| ConfiguracionSistema | 3 | `ALERTA_VENCIMIENTO_ROJO` = 30, `ALERTA_VENCIMIENTO_AMARILLO` = 90, `NOMBRE_FARMACIA` = "Farmacia Municipal de Gualán" | `upsert` por `clave` con `update: {}` (no sobrescribe valores cambiados) | (fuente: backend/prisma/seed.ts, líneas 124–149) |
| Medicamento | 5 (opcional) | Acetaminofén 500mg Tableta (Analgésico, stock mín. 50); Amoxicilina 500mg Cápsula (Antibiótico, 30); Ibuprofeno 400mg Tableta (Antiinflamatorio, 40); Losartán 50mg Tableta (Antihipertensivo, 20); Metformina 850mg Tableta (Antidiabético, 20). Si la categoría del ejemplo no existe se usa "Otro" o la primera activa | Solo con `SEED_DEMO=true` **y** la tabla `medicamentos` vacía; comentario: "solo para desarrollo … Nunca en producción" | (fuente: backend/prisma/seed.ts, líneas 151–188) |

**Origen de la contraseña del administrador inicial** (fuente: backend/prisma/seed.ts, líneas 16–68;
.env.example, líneas 10–16; commit `254d0f8` y siguientes):

1. Si `ADMIN_INITIAL_PASSWORD` tiene valor, se usa ese valor. Debe tener al menos 8 caracteres y no
   puede coincidir (sin distinguir mayúsculas) con ninguno de los 6 valores de la lista
   `PASSWORDS_INSEGUROS` (líneas 8 y 31–38); si no cumple, el seed lanza un error y termina (H-41).
2. Si está vacía, el seed genera una aleatoria con `crypto.randomBytes(16).toString('base64url')`
   (~22 caracteres) y la imprime **una sola vez** en la consola del contenedor `api`, junto con el
   usuario (líneas 40–42 y 59–65). CLAUDE.md indica recuperarla con
   `docker compose logs api | grep -A4 "CREDENCIAL INICIAL"` (H-39).
3. La contraseña nunca se guarda en claro; solo el hash (línea 48).

El valor por defecto fijo que existía en `194f8fb` ya no está en el código; el workflow comprueba que
en una instalación nueva esa contraseña antigua responde 401 (fuente:
.github/workflows/despliegue-seguro.yml, líneas 307–310). No se transcribe ninguna contraseña en este
documento.

Verificado el 2026-10-20 en la base del equipo de desarrollo (instalación nueva, sin `SEED_DEMO`):
1 usuario, 13 categorías, 7 ubicaciones, 3 configuraciones, 0 medicamentos y 0 lotes.

El seed **no** crea lotes, entradas, beneficiarios, dispensaciones ni códigos de barras.

---

## 6. Migraciones e índices (nuevo)

| Migración | Qué crea | Fuente |
|-----------|----------|--------|
| `0_init` | Los 4 enums (líneas 5–14), las 14 tablas (líneas 17–192), los 10 índices `UNIQUE` (líneas 195–222) y las 14 claves foráneas (líneas 225–264). Es la línea base del esquema existente: en servidores con una base creada antes por `db push`, `docker-entrypoint.sh` la marca como aplicada sin ejecutarla si la base coincide con el esquema | backend/prisma/migrations/0_init/migration.sql; backend/docker-entrypoint.sh, líneas 115–135 |
| `20261017052535_indices_consultas` | Los 4 índices de la tabla siguiente | backend/prisma/migrations/20261017052535_indices_consultas/migration.sql, líneas 1–11; commit `6ae2bd5` (2026-10-16) |

Índices nuevos (verificados en la base con `\d+` y `pg_indexes`, 2026-10-20):

| Índice | Tabla | Columnas | Definido en el esquema | Consulta que lo aprovecha (según el código) |
|--------|-------|----------|------------------------|---------------------------------------------|
| `lotes_medicamento_id_estado_fecha_vencimiento_idx` | `lotes` | `medicamento_id, estado, fecha_vencimiento` | schema.prisma, línea 146 | `SELECT … FOR UPDATE` del despacho FIFO (backend/src/services/dispensacion.service.ts, líneas 213–222) |
| `entradas_created_at_idx` | `entradas` | `created_at` | schema.prisma, línea 115 | Historial de entradas, ordenado por `createdAt` descendente (backend/src/routes/inventario.routes.ts, líneas 151–177, `orderBy` en línea 158) |
| `dispensaciones_created_at_idx` | `dispensaciones` | `created_at` | schema.prisma, línea 185 | Historial de dispensaciones filtrado y ordenado por fecha (backend/src/services/dispensacion.service.ts, líneas 323–360) |
| `log_auditoria_created_at_idx` | `log_auditoria` | `created_at` | schema.prisma, línea 276 | Consulta de la bitácora por rango de fechas y ordenada por fecha descendente (backend/src/routes/auditoria.routes.ts, líneas 51–53 y 64) |

Estado de las migraciones en la base en ejecución (`SELECT … FROM _prisma_migrations`,
2026-10-20): `0_init` y `20261017052535_indices_consultas`, ambas con `finished_at` y
`applied_steps_count = 1`.

La columna "Consulta que lo aprovecha" se dedujo del código (filtro u orden sobre esas columnas). No
se ejecutó `EXPLAIN` para confirmar que PostgreSQL usa cada índice; con las tablas casi vacías del
equipo de desarrollo el planificador puede preferir un recorrido secuencial.

---

## Cambios respecto a la versión 194f8fb

Tabla 1.
Cambios del modelo de datos entre `194f8fb` y `bdf1187`

| Tema | Antes (194f8fb) | Ahora (bdf1187) | Commit | Hallazgo relacionado |
|------|-----------------|-----------------|--------|----------------------|
| Gestión del esquema | `prisma db push --accept-data-loss` en cada arranque; sin `prisma/migrations/` | Migraciones versionadas `0_init` y `20261017052535_indices_consultas`, aplicadas con `prisma migrate deploy` tras un respaldo | `319ebd3`, `6ae2bd5` | H-05, D-13 |
| Índices | Solo PK y 10 `UNIQUE`; la consulta FIFO sin índice | 4 índices nuevos: `lotes(medicamento_id, estado, fecha_vencimiento)` y `created_at` en `entradas`, `dispensaciones` y `log_auditoria` | `6ae2bd5` | — |
| Tablas, columnas, enums y FK | 14 tablas, 4 enums, 14 FK | Sin cambios (`migrate diff` sin diferencias); se añade la tabla de control `_prisma_migrations` | — | — |
| Cliente Prisma | Una instancia por archivo de rutas/servicio | Instancia única compartida (`config/prisma.ts`) | `254d0f8` | — |
| Seed — administrador | Usuario `admin` con contraseña fija en el código y correo `admin@farmag.local` | Usuario de `ADMIN_USERNAME`; contraseña de `ADMIN_INITIAL_PASSWORD` (mín. 8, lista de prohibidas) o aleatoria impresa una vez; correo solo con `ADMIN_EMAIL` | `254d0f8`, `a274f5f`, `99d4429` | H-39, H-41 |
| Seed — catálogos | `upsert` por nombre/código en cada arranque (revivía lo renombrado) | Solo si la tabla está vacía | `99d4429` | — |
| Seed — medicamentos de ejemplo | Se creaban si la tabla estaba vacía | Solo con `SEED_DEMO=true` y tabla vacía | `99d4429`, `0f288c5` | — |
| Seed — ejecución | Paso del `CMD` del Dockerfile (un fallo detenía el arranque) | Paso 3 del entrypoint, no fatal | `319ebd3` | — |
| `TokenCaptura.token` | `nanoid(10)` | `randomBytes(8)` en base64url (11 caracteres) | `dd8e723` | — |
| `FotoDispensacion.imagenUrl` | Ruta servida estáticamente; archivo en el formato original | Ruta solo como referencia; el archivo (WebP) se sirve por endpoint autenticado | `254d0f8`, `b25c06e` | H-11 |
| `LogAuditoria` | Solo logins correctos; IP del proxy | También logins fallidos de usuarios existentes y subidas de fotos por captura; IP de `X-Forwarded-For` | `254d0f8`, `a274f5f` | H-09, H-14, H-18, H-35, H-37 |
| `Usuario.rol` / `activo` | Solo se consultaban en el login | Se consultan en cada petición autenticada | `254d0f8` | H-10 |

Fuente: Elaboración propia.
