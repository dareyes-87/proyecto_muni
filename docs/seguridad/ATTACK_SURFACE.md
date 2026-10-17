# ATTACK_SURFACE.md — FarmaG

> Mapa de superficie de ataque. Generado en auditoría ofensiva del **2026-10-07** contra el
> entorno **local/desarrollo** (Docker en vivo: `farmag_api` 127.0.0.1:3000, `farmag_web`
> 0.0.0.0:80/5173, `farmag_db` 127.0.0.1:5432; `NODE_ENV=development`).
> Rama: `feature/dispensacion-evidencia-pc` (árbol de trabajo, sin commit).

## Autenticación y roles

- **Mecanismo:** JWT HS256 (`jsonwebtoken`), payload `{ userId, username, rol }`, `expiresIn=8h`.
  El token viaja en `Authorization: Bearer`, se guarda en `localStorage['farmag_token']`. **No se
  usan cookies** → CSRF no aplica al flujo autenticado.
- **`authMiddleware`** (`backend/src/middleware/auth.ts`): verifica firma y **consulta la BD en
  cada request** (usuario existe + `activo` + rol ACTUAL). El rol del token NO se usa para
  autorizar → desactivar/degradar surte efecto inmediato.
- **Roles:** `ADMIN`, `ENCARGADO_BENEFICENCIA`. `requireRole(...)` gatea los endpoints ADMIN.
- **Lockout de login** (`middleware/loginRateLimit.ts`): 3 fallos → 5 min por usuario, en memoria.
  La verificación de bloqueo ocurre **antes** de comprobar credenciales.

## Tabla de endpoints

Leyenda rol: **A**=ADMIN, **E**=ENCARGADO, **Pub**=público sin token, **Auth**=cualquier autenticado.

| Endpoint | Método | Auth | Rol | Entrada | Riesgo evaluado |
|---|---|---|---|---|---|
| `/api/health` | GET | Pub | — | — | Info menor (expone `environment`) |
| `/api/auth/login` | POST | Pub | — | username, password | **Fuerza bruta / lockout / 500 por tipo** |
| `/api/auth/perfil` | GET | Auth | A/E | — | Bajo |
| `/api/usuarios` | GET | Auth | A | — | RBAC (escalada) |
| `/api/usuarios` | POST | Auth | A | username, password, rol… | Creación de cuentas / validación rol |
| `/api/usuarios/:id` | PUT | Auth | A | nombre, email, rol | **Cambio de rol (escalada vertical)** |
| `/api/usuarios/:id/password` | PUT | Auth | A | password | Reset de contraseña |
| `/api/usuarios/:id/toggle` | PUT | Auth | A | — | Activar/desactivar |
| `/api/catalogos/medicamentos` | GET | Auth | A/E | q, page, limit | SQLi/paginación |
| `/api/catalogos/medicamentos/buscar` | GET | Auth | A/E | q | SQLi |
| `/api/catalogos/medicamentos/barcode/:codigo` | GET | Auth | A/E | path codigo | SQLi/IDOR |
| `/api/catalogos/medicamentos/lookup-fda/:cb` | GET | Auth | A | path | **SSRF** (llama OpenFDA) |
| `/api/catalogos/medicamentos` | POST/PUT | Auth | A | cuerpo medicamento | Mass assignment |
| `/api/catalogos/medicamentos/:id/imagen` | POST | Auth | A | archivo (multipart) | **File upload** |
| `/api/catalogos/medicamentos/:id/codigos` | POST | Auth | A | codigo | Duplicados/500 |
| `/api/catalogos/codigos/:id` | DELETE | Auth | A | path | Borrado |
| `/api/catalogos/categorias` | GET/POST/PUT | Auth(GET)/A | — | cuerpo | Validación |
| `/api/catalogos/ubicaciones` | GET/POST/PUT | Auth(GET)/A | — | cuerpo | Validación |
| `/api/inventario` | GET | Auth | A/E | q, categoriaId, page | SQLi/paginación |
| `/api/inventario/entradas` | POST | Auth | A/E | lotes[] (Zod) | Validación/negocio |
| `/api/inventario/entradas` | GET | Auth | A/E | page | Paginación |
| `/api/inventario/alertas` | GET | Auth | A/E | — | Bajo |
| `/api/inventario/medicamento/:id` | GET | Auth | A/E | path | IDOR |
| `/api/inventario/lotes/:id/baja` | PUT | Auth | **A** | motivo | RBAC |
| `/api/inventario/configuracion` | GET/PUT | Auth(GET)/**A** | rojo, amarillo (Zod) | RBAC/validación |
| `/api/inventario/importar-excel` | POST | Auth | **A** | archivo .xlsx | **File upload / lógica masiva** |
| `/api/inventario/plantilla-excel` | GET | Auth | **A** | — | RBAC |
| `/api/dispensacion/beneficiarios/buscar` | GET | Auth | A/E | q | SQLi |
| `/api/dispensacion/beneficiarios` | POST | Auth | A/E | nombre, dpi… | Mass assignment/validación |
| `/api/dispensacion/beneficiarios/:id` | GET/PUT | Auth | A/E | path, cuerpo | **IDOR (sin authz de objeto)** |
| `/api/dispensacion/despachar` | POST | Auth | A/E | beneficiarioId, items[] | **Negocio/concurrencia/FIFO/500** |
| `/api/dispensacion/historial` | GET | Auth | A/E | fechas, page | Paginación/fecha→500 |
| `/api/dispensacion/stock/:medId` | GET | Auth | A/E | path | IDOR/stock |
| `/api/dispensacion/:id` | GET | Auth | A/E | path | IDOR |
| `/api/dispensacion/:id/generar-token` | POST | Auth | A/E | path | Genera token QR público |
| `/api/dispensacion/:id/fotos` | GET | Auth | A/E | path | IDOR |
| `/api/dispensacion/:id/foto/:tipo` | GET | Auth | A/E | path | **Path traversal** |
| `/api/captura/:token/info` | GET | **Pub** | — | token | **Endpoint público por token** |
| `/api/captura/:token/foto` | POST | **Pub** | — | token, archivo, tipo | **Upload público por token** |
| `/api/reportes/{6 tipos}` | GET | Auth | A/E | fechas, filtros, page | Fecha→500 / paginación |
| `/api/reportes/exportar/:tipo/:formato` | GET | Auth | **A** | path + query | RBAC / inyección a PDF/Excel |
| `/api/auditoria` | GET | Auth | **A** | filtros, page | RBAC / paginación→500 |
| `/uploads/medicamentos/*` | GET | Pub (estático) | — | — | Solo fotos de producto (no sensible) |

## Otros vectores

- **Cron** (`vencimiento.service.ts`): diario 00:05, no expuesto por HTTP.
- **Subidas a disco:** `backend/uploads/medicamentos/` (público) y `backend/uploads/dispensaciones/`
  (solo vía endpoint autenticado). `multer` memoryStorage, límites 5–10 MB, filtro MIME, recompresión
  a WebP con `sharp` (`failOn:'none'`).
- **Salida externa:** `lookup-fda` hace `fetch` a `api.fda.gov` (único destino saliente; valor
  derivado solo de dígitos → sin SSRF arbitrario).
- **Frontend:** React (auto-escape), sin `dangerouslySetInnerHTML`/`innerHTML`/`eval`. Token y
  usuario en `localStorage`. Servido por Vite (dev :5173) o nginx (prod :80).
- **Base de datos:** Postgres 16, puerto atado a `127.0.0.1`. ORM Prisma (consultas
  parametrizadas); único `$queryRaw` es el `SELECT … FOR UPDATE` del FIFO, con parámetros ligados.
