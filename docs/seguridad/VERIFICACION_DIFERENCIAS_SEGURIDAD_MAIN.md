# VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md

> **Rama:** `seguridad` (commit `931f74b`) vs `main` (`4fde08a`) · **Fecha:** 2026-10-08
> **Entorno:** local/desarrollo en vivo (Docker: api :3000, db :5432, `NODE_ENV=development`, TZ America/Guatemala).
> **Alcance:** reproducir cada punto, hallar causa raíz, corregir y ejecutar pruebas de regresión.
> **Sin commit ni push.** Los datos de prueba se crean y se eliminan en cada prueba (BD real intacta).

---

# Resumen ejecutivo

Se verificaron los 12 puntos. **El punto crítico (lote vencido no dispensable) ya estaba correcto en
`seguridad` y se demostró a nivel SQL y HTTP.** La concurrencia, el lockout, las migraciones de
producción, la protección de fotos y la auditoría también se confirmaron correctos.

Durante la verificación de validaciones (punto 8) y de subida de imágenes (punto 6) se encontraron
**nuevos HTTP 500 por entrada inválida** que `seguridad` todavía no cubría; **se corrigieron en esta
sesión** y se añadieron pruebas de regresión. `tsc` limpio y **32/32 pruebas verdes**.

| Punto | Estado | Evidencia |
|---|---|---|
| Lote vencido no dispensable | **PASS** | SQL `FOR UPDATE` devuelve solo el lote futuro; despachar lote vencido → 409; integración 1/1 |
| Concurrencia sin sobreventa | **PASS** | 6×5 sobre stock 20 → 201×4+409×2, stock final 0 (varias rondas) |
| P2034 no genera 500 | **PASS** | Reintento ≤3 → 409; 0 respuestas 500 en 4 rondas |
| Producción sin `db push --accept-data-loss` | **PASS** | Dockerfile prod = `migrate deploy && node dist`; grep sin `--accept-data-loss` en prod |
| `migrate deploy` correcto | **PASS** | BD limpia desechable → 14 tablas + `_prisma_migrations`, `0_init` aplicada |
| Lockout real | **PASS** | 3 fallos → 429; contraseña correcta durante bloqueo → 429, 0 token; expiración (test con timers) |
| Fotos protegidas | **PASS** | `/uploads/dispensaciones` no servido (404); endpoint sin token → 401; traversal → 404 |
| Upload seguro | **PASS (tras fix)** | válida→200(.webp), MIME falso/corrupto/no permitido→**400** (antes 500); oversize→400 |
| Auditoría protegida | **PASS** | solo `GET` ADMIN; 0 `delete/update` de logAuditoria; subida de foto auditada |
| Inputs inválidos sin 500 | **PASS (tras fix)** | objeto/array/HPP/enum inválido → 400/200 (antes varios 500) |
| Tests verdes | **PASS** | 32/32 (`node --test tests/*.test.ts`) |

**Conclusión:** la rama `seguridad` corrige diferencias de `main` que son necesarias para evitar
**dispensar lotes vencidos, sobreventa por concurrencia, 500 por conflicto de concurrencia, pérdida de
datos en despliegue (db push), bypass de lockout, exposición de fotos y errores 500 por input**. Con
las correcciones adicionales de esta sesión, no quedan 500 por input conocidos.

---

# Bug de lote vencido (PUNTO 1 — CRÍTICO)

**Causa (en `main`):** el `SELECT ... FOR UPDATE` del despacho filtraba `estado = 'DISPONIBLE'` pero
**no** la fecha, y el cron (00:05) es quien marca `VENCIDO`. En la ventana entre el vencimiento y el
cron, un lote vencido con `estado = DISPONIBLE` podía dispensarse.

**Corrección en `seguridad` (confirmada, `dispensacion.service.ts`):** el query agrega una segunda
condición de seguridad que **no depende del estado persistido**:
```sql
WHERE medicamento_id = $1 AND estado = 'DISPONIBLE' AND cantidad_actual > 0
  AND fecha_vencimiento > $hoy::date
ORDER BY fecha_vencimiento ASC FOR UPDATE
```
Definición de "vencido" = fecha **hoy o anterior** (`estaVencido` → `diasParaVencer <= 0`), fuente
única usada por despacho, cron y validación de entradas. TZ del contenedor = America/Guatemala.

**Reproducción (escenario con 5 lotes del mismo medicamento):**
| Lote | estado | fecha | ¿elegible? |
|---|---|---|---|
| VENC-AYER | DISPONIBLE | ayer | **NO** |
| VENC-HOY | DISPONIBLE | hoy | **NO** (vence hoy = vencido) |
| VENC-MANANA | DISPONIBLE | mañana | **SÍ** |
| EST-VENCIDO | VENCIDO | +5 días | NO |
| STOCK-CERO | DISPONIBLE | +10 días | NO (sin stock) |

**Resultado (evidencia):**
- Query real `FOR UPDATE` → `ELEGIBLES_SQL = ["VENC-MANANA"]`.
- `GET /dispensacion/stock/:id` → `stockTotal: 10` (solo VENC-MANANA).
- `POST despachar cantidad=11` → **409** (no alcanza lo no vencido).
- `POST despachar cantidad=10` → **201**, consume **solo** VENC-MANANA (→ AGOTADO); VENC-AYER y
  VENC-HOY quedan intactos (cantidad 10).
- Segundo `despachar cantidad=1` → **409** (no queda elegible; los lotes vencidos nunca se tocan).

**Prueba de regresión añadida:** `backend/tests/despacho_vencimiento.test.ts` (integración, ejerce el
SQL real; se autolimpia) + casos puros ya presentes en `inventario.service.test.ts` (incluye
"vence hoy"). **No se requirió fix** (ya correcto en `seguridad`).

---

# Concurrencia (PUNTO 2)

**Antes (`main`):** un conflicto de serialización (Serializable → Postgres 40001 → Prisma **P2034**)
terminaba en **HTTP 500**.

**En `seguridad`:** `despachar` reintenta hasta **3** veces ante P2034/40001 (`MAX_REINTENTOS = 3`,
bucle acotado, no infinito) y, si persiste, lanza error con `status: 409`.

**Prueba (stock 20, 6 peticiones concurrentes de 5):**
- 4 rondas totales → siempre `201 201 201 201 409 409`.
- **Stock final = 0** en todas; **nunca negativo, nunca doble descuento, nunca 500.**
- Integridad verificada leyendo `cantidadActual` del lote tras cada ronda.

**Estado:** correcto en `seguridad`. (La prueba automatizada determinista de P2034 es difícil de
forzar en un solo proceso; se deja la evidencia HTTP reproducible y la revisión del código del retry.)

---

# Migraciones (PUNTO 3)

**Producción (`docker-compose.prod.yml` + `backend/Dockerfile` target `production`):**
```
CMD npx prisma migrate deploy && node dist/server.js
```
- **No** usa `prisma db push` ni `--accept-data-loss` ni `db seed` automático. Verificado por lectura
  y grep.
**Desarrollo (`Dockerfile` target `development`):** `prisma db push` **sin** `--accept-data-loss` +
seed idempotente + `tsx watch` (flujo cómodo, no destructivo).

**Instalación limpia (evidencia):** sobre una BD **desechable** `farmag_migtest` (creada y luego
eliminada; la BD real no se tocó):
- `prisma migrate deploy` → "All migrations have been successfully applied".
- 14 tablas de dominio + `_prisma_migrations` (15 en total); `0_init` con `finished_at` no nulo.
- `migration.sql`: 14 `CREATE TABLE`, **0 `DROP`**.

**Riesgos:** ninguno nuevo. Recordar que el arranque de dev hace `db push` (puede alterar el esquema
de la BD de dev); en prod solo migraciones versionadas.

---

# Login / rate limit (PUNTO 4)

Probado directamente contra la API (no solo mensaje visual):
- 3 contraseñas incorrectas → `401, 401, 429` (se activa el bloqueo).
- **Contraseña correcta durante el bloqueo → `429`, cuerpo sin token (`token?=0`).** No se puede
  entrar aunque la credencial sea válida.
- El bloqueo se comprueba **antes** de verificar credenciales (`auth.routes.ts`).
- **Expiración:** prueba con temporizadores simulados (`loginRateLimit.test.ts`): tras `BLOQUEO_MS`
  el bloqueo se libera; `limpiarIntentos` (login exitoso) reinicia el contador.
- **Clave insensible a mayúsculas/espacios** → no se evade variando el caso del usuario (test).

**Observación (residual, por diseño):** el bloqueo es **por usuario, en memoria**; **no hay rate limit
por IP**. Consecuencias: se pierde al reiniciar el backend; un tercero puede bloquear un usuario
conocido (lockout-DoS); no limita el barrido de muchos usuarios desde una IP. Aceptable para una
instancia única; documentado como pendiente opcional.

---

# Fotos (PUNTO 5)

- `server.ts` solo sirve estáticamente `/uploads/medicamentos` (fotos de producto, no sensibles).
- **`/uploads/dispensaciones/...` NO se sirve** (ni Express ni nginx): acceso directo → **404**.
- `nginx.conf` solo proxied `/uploads/medicamentos/` (verificado por lectura).
- Endpoint autenticado `GET /api/dispensacion/:id/foto/:tipo`: sin token → **401**; id inexistente →
  **404**; tipo inválido → **400**; traversal en `:id` (`..%2f..%2fetc%2fpasswd`) → **404**.
- La ruta física se deriva del registro en BD + `path.basename` + verificación de prefijo de la
  carpeta raíz; no se expone la ruta del servidor ni se construye desde entrada libre.

**Estado:** correcto. No hay ruta pública alternativa.

---

# WebP / upload (PUNTO 6)

**Hallazgos (nuevos) y correcciones de esta sesión:**
- Imagen válida → **200**, guardada como `.webp` (conversión `sharp` correcta, extensión correcta).
- Oversize (6 MB > límite 5 MB) → **400** (multer `LIMIT_FILE_SIZE`).
- **ANTES:** texto con MIME `image/png` falso → **500**; PNG corrupto → **500**; MIME no permitido
  (`text/plain`, rechazado por `fileFilter`) → **500**.
- **Causa:** `sharp` lanzaba al no poder decodificar y el error no tipado caía al 500; el error del
  `fileFilter` era un `Error` genérico (no `MulterError`), que el `errorHandler` no mapeaba a 4xx.
- **Fix:** `comprimirImagen` (`utils/imagen.ts`) envuelve `sharp` y lanza error con `status:400`
  ("El archivo no es una imagen válida"); los `fileFilter` (catálogos y captura) etiquetan su error
  con `status:400`; el handler de imagen de catálogos usa `responderError` y el de captura honra
  `err.status`.
- **DESPUÉS (reverificado):** MIME falso/corrupto/no permitido → **400**; válida → 200; oversize → 400.

El `fileFilter` confía en el MIME declarado por el cliente, pero **`sharp` es el control real**
(reencoda a WebP; cualquier no-imagen falla y ahora responde 400). Nombre de archivo seguro
(derivado del id/tipo, no del nombre del cliente); se borra la imagen previa del mismo medicamento
(sin huérfanos).

---

# Auditoría (PUNTO 7)

- **Inmutable desde la API:** el router `/auditoria` solo expone `GET` (ADMIN). No existe ningún
  `logAuditoria.delete/update/deleteMany/updateMany` en todo el backend (grep). Un usuario no puede
  crear/editar/borrar auditoría ni evitar su registro por un endpoint.
- **Subida de foto auditada (flujo real verificado):** subir RECETA y EVIDENCIA_ENTREGA generó 2
  registros `LogAuditoria` (`accion: CREAR`, `entidad: FotoDispensacion`, `entidadId: dispensacionId`,
  `datosNuevos: { via: 'captura-token', tipo }`), con `usuarioId` = el usuario que dispensó (el celular
  no tiene sesión), y marca de tiempo. Al completar las 2 fotos el token queda **usado** (reintento
  → 404).
- ENCARGADO no puede leer `/auditoria` (**403**, verificado).

---

# Validaciones (PUNTO 8)

Revisados `validacion.ts`, `fecha.ts`, `httpError.ts` y los routes. Se buscó input que provocara 500.

**Ya cubierto en `seguridad`:** fechas inválidas → 400 (`parseFechaQuery`); page negativa / limit
gigante → clamp (`clampPaginacion`); `despachar` con cantidad no entera / ids objeto → 400; login con
user/pass no-string → 400; `estado`/`rol` inválidos → 400.

**Nuevos 500 encontrados y corregidos en esta sesión:**
| Endpoint / caso | Antes | Después |
|---|---|---|
| `POST /dispensacion/beneficiarios` nombre objeto/array | 500 | **400** |
| `POST/PUT beneficiarios` campos opcionales no-string | 500 | **400** |
| `buscar?q=a&q=b` (HPP) en dispensación/inventario/catálogos | 500 | **200** (coerción) |
| `GET /inventario?categoriaId[]` | 500 | **200** |
| `reportes/dispensaciones?beneficiarioId[]`, `consumo?categoriaId[]` | 500 | **200** |
| `dispensacion/historial?beneficiarioId[]` | 500 | **200** |
| `auditoria?usuario[]` / `entidad[]` | 500 | **200** |
| `auditoria?accion[]` (enum) | 500 | **200** |
| `auditoria?accion=BOGUS` (enum inválido) | 500 | **400** |

**Fix:** helper nuevo `textoQuery(v)` en `validacion.ts` (toma el primer string si es arreglo,
`undefined` si es objeto/número) aplicado a los filtros de query que llegaban a Prisma; `typeof`
string en los campos de beneficiario; validación del enum `accion` contra `AccionAuditoria`.
Objetivo cumplido: **input inválido → 400/200, nunca 500.**

---

# Tests (PUNTO 9)

`npm test` = `node --import tsx --test tests/*.test.ts`. **Total: 32 pruebas, 32 PASS.**

| Test | Área | Hallazgo cubierto | Resultado |
|---|---|---|---|
| inventario.service.test.ts (6) | Dominio puro de vencimiento/semáforo/dispensable | H-01 / H-34 | PASS |
| fecha.test.ts (9) | `parseFechaQuery`/`parseRangoFechas` | H-004 (fecha → 400) | PASS |
| validacion.test.ts (11) | `clampPaginacion`, `esEnteroPositivo`, `exigirCadena`, **`textoQuery`** | H-020/H-022/H-025 | PASS |
| **despacho_vencimiento.test.ts (1) — NUEVO** | Integración: SELECT FOR UPDATE real | **H-01 (lote vencido no dispensable)** | PASS |
| **loginRateLimit.test.ts (5) — NUEVO** | Lockout + expiración (timers simulados) | H-09 (lockout/expiración/bypass) | PASS |

**Nuevos en esta sesión:** 6 (despacho_vencimiento 1 + loginRateLimit 5) + 3 casos `textoQuery` en
validacion.test.ts. Antes de esta sesión `seguridad` traía 23 (inventario 6, fecha 9, validacion 8).

**Riesgos relevantes aún sin prueba automatizada dedicada:** concurrencia P2034→409 (verificada en
vivo, difícil de forzar de modo determinista en un proceso); protección de fotos y RBAC (verificadas
en vivo por HTTP). Recomendado: tests de integración de API (supertest) en una fase posterior.

---

# Comparación `seguridad` vs `main`

`git diff main...seguridad` = **69 archivos, +12568 / −229** (las +12k se explican por los dos
`package-lock.json`). Categorizado:

- **A. Correcciones funcionales:** `services/dispensacion.service.ts` (FIFO + fecha vencida + retry),
  `services/inventario.service.ts` (`estaVencido` fuente única), `services/vencimiento.service.ts`
  (`lte`), `services/reportes.service.ts`, páginas `Inventario/Dispensacion/Beneficiarios/Entradas`.
- **B. Correcciones de seguridad:** `middleware/auth.ts` (rol/estado desde BD por request),
  `middleware/loginRateLimit.ts` (lockout), `config/env.ts` (guard de secretos),
  `middleware/errorHandler.ts` + `utils/httpError.ts` + `utils/fecha.ts` + `utils/validacion.ts`
  (400 en vez de 500), `routes/*` (RBAC, validación), `server.ts` (helmet, CORS, estáticos),
  `utils/imagen.ts` (WebP), `AuthImage.tsx` (fotos con JWT), `frontend/nginx.conf` (cabeceras SPA),
  `api/client.ts`/`AuthContext.tsx` (rol real del servidor).
- **C. Infraestructura:** `docker-compose.yml` (puertos 127.0.0.1, TZ, targets), `docker-compose.prod.yml`,
  `Dockerfile` backend/frontend (multi-stage), `.dockerignore`, `config/prisma.ts` (singleton),
  `start.sh`/`start.cmd`.
- **D. Migraciones:** `prisma/migrations/0_init/migration.sql`, `migration_lock.toml`.
- **E. Tests:** `tests/inventario.service.test.ts`, `fecha.test.ts`, `validacion.test.ts` (+ los nuevos
  de esta sesión, sin commitear).
- **F. Documentación:** `ATTACK_SURFACE.md`, `SECURITY_*`, `AUDITORIA_COMPLETA.md`, `BUGS_FOUND.md`,
  `CODE_REVIEW.md`, `TEST_PLAN.md`, `FIXES_PHASE_1.md`, `FINAL_VERIFICATION.md`,
  `Defensa_Backend_FarmaG.md`, `INFORME_HANDOFF_DANIEL.md`, `CLAUDE.md`, `README.md`.
- **G. Cambios de UI:** incluidos en la rama (rediseño/paginación/`AuthImage`), **no modificados en
  esta sesión** (solo se tocó backend + `nginx.conf` + tests, en sesiones previas).

**Correcciones de `seguridad` necesarias para evitar:** pérdida de datos (migraciones vs `db push`),
dispensar lotes vencidos (fecha en el SQL), sobreventa (FOR UPDATE + Serializable), P2034→500 (retry),
bypass de autenticación (BD por request + lockout), exposición de fotos (endpoint autenticado),
500 por input (helpers de validación), despliegue inseguro (compose/Dockerfile de producción).

---

# Nuevos problemas encontrados (y corregidos esta sesión)

Sobre la rama `seguridad`, en el árbol de trabajo (sin commit):
- **H-025 — 500 por input en varios endpoints** (beneficiarios no-string; HPP `?q=`/filtros arreglo
  en búsquedas, inventario, reportes, historial, auditoría; enum `accion` inválido). → corregido con
  `textoQuery`, `typeof` y validación de enum. Reverificado: 400/200, nunca 500.
- **H-026 — 500 en subida de imagen** (MIME falso, archivo corrupto, MIME no permitido). → corregido:
  `sharp` y `fileFilter` producen 400. Reverificado.

**Archivos tocados (código):** `routes/{auditoria,captura,catalogos,dispensacion,inventario,reportes}.routes.ts`,
`utils/{imagen,validacion}.ts`.
**Tests añadidos:** `tests/despacho_vencimiento.test.ts`, `tests/loginRateLimit.test.ts`, casos
`textoQuery` en `tests/validacion.test.ts`.

---

# Pendientes

- **Sin commit/push** (por indicación). Decidir el commit en la rama `seguridad`.
- **Pruebas de integración de API (supertest)** para concurrencia P2034, fotos y RBAC: recomendado a
  futuro.
- Dependencias con avisos no explotables en runtime (`deepmerge-ts` vía Prisma, `uuid` vía exceljs):
  planificar bump.

> **Resueltos en el cierre de seguridad (2026-10-08) — ver `CIERRE_SEGURIDAD.md`:**
> - **Rate limit por IP del login:** IMPLEMENTADO (`middleware/ipRateLimit.ts`, 20/10 min, 429 +
>   `Retry-After`), segunda capa junto al lockout por usuario. Probado en vivo (A–F) + `SEC-RATE-001..005`.
> - **Cabeceras del SPA en producción:** VERIFICADAS EN RUNTIME (imagen prod + nginx): CSP con
>   `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; la
>   CSP no rompe la app (login + dashboard cargan, 0 violaciones).
> - **Autorización por objeto:** analizada → **RIESGO ACEPTADO** (el modelo no tiene propiedad por
>   usuario; RBAC por rol sí aplica).

---

# Residuos QA (PUNTO 4 — inventario, SIN borrar por decisión del usuario)

Inventario de datos de prueba detectados en la BD de **desarrollo** (no afectan pruebas actuales ni
producción). **No se eliminaron** (salvo lo que esta sesión creó y limpió). El equipo decide qué borrar.

**Cuentas de usuario de prueba** (no se pueden borrar: tienen FK de auditoría; están **desactivadas**):
| Usuario | Rol | Activo | Creado | Origen |
|---|---|---|---|---|
| qa_boot4, qa_rand4, qa_jwt | ADMIN | no | 2026-10-07 | auditorías previas |
| qa_idor | ENCARGADO | no | 2026-10-07 | auditoría previa |
| qa_encargado | ENCARGADO | **sí** | 2026-10-07 | auditoría previa (sigue activa) |
| sec_admin, sec_enc, sec_lock_*, sec_lock2_*, sec_lk_*, reg_lk_* | varios | no (desactivadas esta sesión) | 2026-10-07/08 | este ciclo de seguridad |

**Medicamentos de prueba:**
| Nombre | Lotes | Creado | Nota |
|---|---|---|---|
| Omeprazol | 0 | 2026-08-03 | prueba antigua, sin stock |
| prueba1 | 1 | 2026-08-18 | tiene 1 lote (aparece como "vencido sin baja" en el dashboard) |

> Nota: "QA Med 18736" (vacío, 0 lotes, de una sesión previa) fue **eliminado por error** en la
> limpieza de esta sesión (un `startsWith("QA_")` de Prisma trató el `_` como comodín SQL y lo
> incluyó). No tenía lotes ni dispensaciones ni datos reales. Se deja constancia por transparencia.

**Beneficiarios de prueba** (DPIs claramente ficticios, dígitos repetidos):
| Nombre | DPI | Dispensaciones | Creado |
|---|---|---|---|
| QA Smoke H005 | 9999988887777 | 0 | 2026-10-07 |
| QA IP Check | 7777766665555 | 0 | 2026-10-07 |
| QA Beneficiario | 1111122223333 | **9** | 2026-10-07 |

**Lotes de prueba:** `TEST-001` (en Acetaminofén, 2026-08-18). Total de dispensaciones en el sistema: 17.

**¿Pueden confundirse con datos reales?** Bajo riesgo: nombres con prefijo QA/prueba/TEST y DPIs
ficticios. Conviene limpiarlos antes de una demo o del pase a producción (en prod se parte de BD nueva,
así que no se arrastran).
