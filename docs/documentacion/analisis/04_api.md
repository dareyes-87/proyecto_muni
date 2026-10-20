# 04 — Especificación de la API REST

> Actualizado al commit bdf1187 el 2026-10-20 (extracción original: 194f8fb, 2026-09-25).

> Fase: Extracción, parte 2 de 4. Documento de hechos con fuente; no es texto final de la tesis.
> Rama: `docs/documentacion`. Método de la actualización: `git diff 194f8fb bdf1187` de
> `backend/src/server.ts`, `backend/src/routes/*.ts` (8 archivos), `backend/src/middleware/*.ts`
> (5 archivos), `backend/src/services/*.ts` (4 archivos) y `backend/src/utils/*.ts` (8 archivos), más la
> lectura completa del código actual. El código del árbol de trabajo es idéntico al de `bdf1187`
> (`git diff --stat bdf1187 HEAD -- backend frontend` sin resultados).
> Verificaciones en ejecución del 2026-10-20: contenedor `farmag_api` del equipo de desarrollo levantado
> con `bdf1187` (`NODE_ENV=development`), solo con peticiones que no modifican datos, **sin iniciar
> sesión** (por eso los códigos que exigen token se dedujeron del código). Se indica en cada caso.

---

## 1. Resumen

### 1.1 Prefijo base y montaje

Todas las rutas de la API cuelgan de `/api`. Cada archivo de rutas se monta con su propio prefijo
(fuente: backend/src/server.ts, líneas 50–58):

| Prefijo | Archivo de rutas | Endpoints en `194f8fb` | Endpoints en `bdf1187` |
|---------|------------------|------------------------|------------------------|
| `/api/auth` | `auth.routes.ts` | 2 | 2 |
| `/api/usuarios` | `usuarios.routes.ts` | 5 | 5 |
| `/api/catalogos` | `catalogos.routes.ts` | 15 | 15 |
| `/api/inventario` | `inventario.routes.ts` | 10 | 10 |
| `/api/dispensacion` | `dispensacion.routes.ts` | 10 | **11** |
| `/api/captura` | `captura.routes.ts` (pública) | 2 | 2 |
| `/api/reportes` | `reportes.routes.ts` | 7 | 7 |
| `/api/auditoria` | `auditoria.routes.ts` | 1 | 1 |
| `/api/health` | definido en `server.ts` | 1 | 1 |
| **Total** | | **53** | **54** |

Fuente del conteo: `grep -cE "router\.(get|post|put|delete|patch)\("` sobre backend/src/routes/*.ts en
`bdf1187` (53 rutas) más `/api/health`. El único endpoint nuevo es `GET /api/dispensacion/:id/foto/:tipo`
(fuente: backend/src/routes/dispensacion.routes.ts, líneas 284–308). **No se eliminó ningún endpoint.**
Un endpoint cambió de rol: `GET /api/catalogos/medicamentos/lookup-fda/:codigoBarras` pasó de cualquier
usuario autenticado a solo ADMIN (fuente: backend/src/routes/catalogos.routes.ts, línea 165). Con eso
hay 21 rutas solo ADMIN, 29 abiertas a ambos roles autenticados y 4 públicas, igual que en
`05_seguridad_roles.md`, sección 2.2.

Además, `server.ts` sirve archivos estáticos **solo** en `/uploads/medicamentos` (no es un endpoint de la
API; ver sección 3) (fuente: backend/src/server.ts, líneas 44–47).

El frontend nunca usa una URL absoluta: su cliente Axios tiene `baseURL: '/api'` (fuente:
frontend/src/api/client.ts, líneas 3–8). El servidor de desarrollo de Vite reenvía `/api` y `/uploads`
a `http://api:3000` con `xfwd: true` (fuente: frontend/vite.config.ts, líneas 8–25). En modo producción
lo hace nginx con `location /api/` y `location /uploads/medicamentos/`, con
`client_max_body_size 10m` (fuente: frontend/nginx.conf, líneas 8, 28–37 y 42–47).

### 1.2 Middlewares globales

Se registran en este orden (fuente: backend/src/server.ts, líneas 23–47, 70–72 y 75):

| Orden | Middleware | Configuración exacta | Efecto |
|-------|-----------|----------------------|--------|
| 1 | `app.set('trust proxy', 1)` | Confía en el primer salto | `req.ip` toma el último valor de `X-Forwarded-For` (lo usan la auditoría y el límite de login). Ver H-18 y H-37. |
| 2 | `app.disable('x-powered-by')` | — | No se envía `X-Powered-By`. |
| 3 | `helmet()` | Opciones por defecto | Cabeceras de seguridad. **Verificado 2026-10-20:** `GET /api/health` devuelve `Content-Security-Policy: default-src 'self';…` y no devuelve `X-Powered-By`. |
| 4 | `cors({ origin })` | `origin` = lista de `CORS_ORIGIN` (separada por comas); si está vacía: `false` en `NODE_ENV=production`, `true` (refleja cualquier origen) en otro caso | Ver H-17 y H-40. |
| 5 | `express.json()` | Sin opciones | Límite por defecto de body-parser: 100 kB. **Verificado:** un cuerpo JSON de unos 120 kB en `POST /api/auth/login` devuelve `413 {"error":"El cuerpo de la petición es demasiado grande"}`. |
| 6 | `express.static` en `/uploads/medicamentos` | `path.join(__dirname, '..', 'uploads', 'medicamentos')` | Sirve solo las fotos de producto, sin autenticación. |
| 7 | Routers de `/api/*` | — | Ver sección 2. |
| 8 | Ruta no encontrada | `app.use((_req, res) => res.status(404).json(...))` | `404 {"error":"Ruta no encontrada"}`. **Verificado** con `GET /api/noexiste`. |
| último | `errorHandler` | — | Manejador centralizado de errores (ver 1.3). |

No se usan `express.urlencoded`, compresión ni un limitador de peticiones global: el único límite de
peticiones es el del login (ver 2.1) (fuente: backend/src/middleware/ipRateLimit.ts y
loginRateLimit.ts; búsqueda de `registrarIntentoIp` y `registrarFallo`, usados solo en
backend/src/routes/auth.routes.ts).

Todas las rutas usan un único cliente Prisma compartido (fuente: backend/src/config/prisma.ts,
líneas 12–18); en `194f8fb` cada archivo creaba su propio `new PrismaClient()`.

### 1.3 Formato de respuestas

**Éxito.** Sigue sin ser uniforme entre módulos:
- Objeto directo: `auth`, `usuarios` (excepto el restablecimiento de contraseña), `POST /inventario/entradas`,
  `dispensacion` (excepto `GET /:id/fotos`), `captura`, `health`.
- Envuelto en `{ data: ... }`: `catalogos`, el resto de `inventario`, `PUT /usuarios/:id/password`,
  `GET /dispensacion/:id/fotos` y `GET /dispensacion/beneficiarios/buscar`.
- Listados paginados: `{ data: [...], pagination: { page, limit|pageSize, total, totalPages } }`
  (`inventario` usa `pageSize`; `catalogos`, `dispensacion/historial`, `reportes` y `auditoria` usan `limit`).
- Archivos: `GET /dispensacion/:id/foto/:tipo`, `GET /inventario/plantilla-excel` y
  `GET /reportes/exportar/:tipo/:formato` responden el binario (sección 3).

**Error.** La propiedad `error` (texto) está presente en todas las respuestas de error. Hay tres
mecanismos (commits `254d0f8` y `b25c06e`):

1. **Respuesta directa de la ruta** — `res.status(4xx).json({ error: "<mensaje>" })`. Variantes con
   campos adicionales:
   - Validación con Zod (`safeParse`):
     `400 { "error": "Datos inválidos", "detalles": { "formErrors": [...], "fieldErrors": { "<campo>": [...] } } }`
     (el objeto `detalles` es `error.flatten()`). Lo usan `POST`/`PUT /catalogos/medicamentos`,
     `POST /inventario/entradas` y `PUT /inventario/configuracion` (fuente: backend/src/routes/catalogos.routes.ts,
     líneas 234 y 319; inventario.routes.ts, líneas 59 y 522). `PUT /catalogos/categorias/:id` usa como
     `error` el mensaje del primer problema y agrega el mismo `detalles` (fuente: catalogos.routes.ts,
     línea 528).
   - Login fallido: `401 { "error": "Credenciales inválidas", "intentosRestantes": n }` (fuente:
     backend/src/routes/auth.routes.ts, líneas 49–52).
   - En las rutas que conservan su propio `catch` (la mayoría de `auth`, `usuarios`, `catalogos`,
     `inventario` y dos de `reportes`), el 500 es `{ "error": "Error interno del servidor" }`, sin detalle.
2. **`responderError(res, error, reglas)`** (fuente: backend/src/utils/httpError.ts, líneas 16–51). Se usa
   en los `catch` de `dispensacion.routes.ts` (todas sus rutas), `auditoria.routes.ts`, cuatro rutas de
   `reportes.routes.ts` y la exportación, y en `PUT /catalogos/medicamentos/:id`, `PUT /catalogos/categorias/:id`,
   `PUT /catalogos/ubicaciones/:id` y `POST /catalogos/medicamentos/:id/imagen`. En orden:
   1. si `error.message` contiene el texto de una regla, responde `{ "error": error.message }` con el
      código de la regla (líneas 19–24);
   2. si el error trae `status` o `statusCode` entre 400 y 499 (p. ej. `ErrorFechaInvalida`,
      `ErrorValidacion`, imagen no decodificable), responde ese código con `{ "error": error.message }`
      (líneas 28–32);
   3. Prisma `P2002` (restricción única) → `409 { "error": "Ya existe un registro con el mismo <campos>" }`;
      `P2025` → `404 { "error": "Registro no encontrado" }` (líneas 36–44);
   4. cualquier otro → `500 { "error": "Error interno del servidor", "mensaje": "<error.message>" }`,
      donde `mensaje` **solo** aparece si `NODE_ENV === 'development'` (líneas 46–50).
3. **`errorHandler` global** (fuente: backend/src/middleware/errorHandler.ts, líneas 9–64). Recibe lo que
   no captura la ruta: errores de body-parser y de `multer`, que ocurren antes del handler.
   - `err.name === 'ZodError'` → `400 { "error": "Datos inválidos", "detalles": ... }` (líneas 18–27).
     Ninguna ruta usa `.parse()` (todas usan `safeParse`), por lo que esta rama no se alcanza desde el
     código actual (búsqueda de `.parse(` en backend/src/routes y services: solo `JSON.parse`);
   - JSON mal formado (`entity.parse.failed`) → `400 { "error": "El cuerpo de la petición no es un JSON válido" }`
     (líneas 30–33). **Verificado** con `POST /api/auth/login` y cuerpo `{x`;
   - cuerpo > 100 kB (`entity.too.large`) → `413 { "error": "El cuerpo de la petición es demasiado grande" }`
     (líneas 36–39). **Verificado**;
   - `MulterError` → `400 { "error": "El archivo supera el tamaño máximo permitido" }` si es
     `LIMIT_FILE_SIZE`, si no `400 { "error": "Archivo no válido" }` (líneas 42–49). **Verificado** con un
     archivo de 6 MB en `POST /api/captura/<token>/foto`;
   - otro error con `status`/`statusCode` 4xx (p. ej. el rechazo de tipo de archivo de los `fileFilter`,
     que trae `status = 400`) → ese código con `{ "error": err.message }` (líneas 52–56). **Verificado:**
     un archivo `text/plain` en `POST /api/captura/<token>/foto` devuelve
     `400 {"error":"Formato de imagen no permitido. Use JPG, PNG o WEBP"}`;
   - cualquier otro → `500 { "error": "Error interno del servidor", "mensaje" }`, con `mensaje` solo en
     desarrollo (líneas 59–63).

Como el valor por defecto de `NODE_ENV` en `docker-compose.yml` es `development`, en la instalación por
defecto los 500 de los mecanismos 2 y 3 incluyen `mensaje` (ver H-07 y H-36). **Verificado:**
`GET /api/health` → `"environment":"development"`.

### 1.4 Respuestas comunes a todas las rutas protegidas

Para no repetirlas en cada fila, se aplican a todo endpoint marcado con `authMiddleware`
(fuente: backend/src/middleware/auth.ts, líneas 21–76):

| Código | Cuándo |
|--------|--------|
| 401 `Token de autenticación requerido` | Falta la cabecera `Authorization` o no empieza con `Bearer ` (líneas 24–27). **Verificado** con `GET /api/inventario` y `GET /api/dispensacion/x/foto/RECETA` sin token. |
| 401 `Token inválido o expirado` | `jwt.verify` falla (firma, formato o expiración de 8 h por defecto) (líneas 32–37; backend/src/config/env.ts, línea 87) |
| 401 `La cuenta ya no está activa. Inicie sesión nuevamente.` | **Nuevo.** El usuario del token ya no existe o tiene `activo = false` (líneas 44–52). El rol que se usa es el de la base, no el del token (línea 54). |
| 500 `Error de autenticación` | **Nuevo.** Falla la consulta del usuario a la base (líneas 56–59). |
| 403 `No tiene permisos para esta acción` | Solo en rutas con `requireRole('ADMIN')`, si el rol actual del usuario no es `ADMIN` (líneas 69–72) |
| 400 / 413 | JSON mal formado o cuerpo > 100 kB en POST/PUT con JSON, vía `errorHandler` (ocurre **antes** de `authMiddleware`, porque `express.json()` es global) |

En las tablas, "Autenticado" significa cualquier rol (`ADMIN` o `ENCARGADO_BENEFICENCIA`) con token
válido; ninguna ruta usa `requireRole` con el rol `ENCARGADO_BENEFICENCIA`.

Ninguna ruta valida que los parámetros `:id` sean UUID. Las columnas `id` son `String @default(uuid())`
sin `@db.Uuid` (fuente: backend/prisma/schema.prisma, líneas 20, 44, 56, 79, 91, 106, 127, 155, 172 y
197), por lo que un valor arbitrario no provoca error de Prisma: la búsqueda devuelve `null` y la ruta
responde 404 (o 200 vacío, donde se indica).

### 1.5 Paginación y parámetros de consulta comunes (nuevo)

Utilidades nuevas de `backend/src/utils/validacion.ts` (commits `254d0f8`, `b25c06e`):

- `textoQuery(valor)` (líneas 23–30): si el parámetro llega repetido (`?q=a&q=b`), toma el primer texto;
  si no es texto, lo trata como ausente. Lo usan los filtros de texto de catálogos, inventario,
  dispensación, reportes y auditoría.
- `clampPaginacion(page, limit, { defLimit, maxLimit })` (líneas 37–52): `page` < 1 o no numérico → 1;
  `limit` < 1 o no numérico → `defLimit`; `limit` > `maxLimit` → `maxLimit`. Valores por defecto de la
  función: 50 / 100.
- `LIMITE_EXPORT = 5000` y `verificarLimiteExport(total)` (líneas 55–64): lanza `ErrorValidacion` (400)
  si el total supera 5000.
- `parseFechaQuery` y `parseRangoFechas` (backend/src/utils/fecha.ts, líneas 22–48): una fecha que no
  sea texto o no se pueda convertir con `new Date()` → 400 `El filtro de <campo> no es una fecha válida
  (use AAAA-MM-DD)`; `desde` posterior a `hasta` → 400 `El rango de fechas es inválido: "desde" es
  posterior a "hasta"`.

Paginación por endpoint en `bdf1187`:

| Endpoint | Parámetros | Por defecto | Máximo | Implementación | Valor no numérico |
|----------|-----------|-------------|--------|----------------|-------------------|
| `GET /catalogos/medicamentos` | `page`, `limit` | 1 / 20 | 100 | En línea (catalogos.routes.ts, líneas 22–23) | Cae al valor por defecto |
| `GET /inventario/entradas` | `page`, `pageSize` | 1 / 20 | 100 | En línea (inventario.routes.ts, líneas 153–154) | `NaN`: Prisma lo rechaza → **500** (ver H-43; el rechazo de Prisma se verificó en `farmag_api` con una consulta de solo lectura `findMany({ skip: NaN, take: NaN })` → `PrismaClientValidationError`; el 500 HTTP se deduce del `catch`) |
| `GET /inventario` | `page`, `pageSize` | 1 / 20 | 100 | En línea, paginación en memoria (líneas 190–191 y 251–252) | `NaN`: 200 con `data` vacía y `page`/`pageSize`/`totalPages` = `null` (deducido del código: `slice(NaN, NaN)` y `JSON.stringify(NaN)`; ver H-43) |
| `GET /dispensacion/historial` | `page`, `limit` | 1 / 20 | **100** (antes sin máximo) | `clampPaginacion` (dispensacion.service.ts, línea 331) | Cae al valor por defecto |
| `GET /auditoria` | `page`, `limit` | 1 / 50 | **100** (antes sin máximo) | `clampPaginacion` (auditoria.routes.ts, línea 28) | Cae al valor por defecto |
| 6 `GET /reportes/*` | `page`, `limit` | 1 / 20 | 5000 | `parsePage` + `resolverPaginacion` (reportes.routes.ts, líneas 24–27; reportes.service.ts, líneas 18–22); **no** usa `clampPaginacion` | `parsePage` lo convierte en `undefined` → valor por defecto |
| `GET /reportes/exportar/...` | — (ignora `page`/`limit`) | página 1, 5000 registros | 5000 | `LIMITE_EXPORT` + `verificarLimiteExport` | — |

Otros parámetros de consulta nuevos: `incluirInactivos=true` en `GET /catalogos/medicamentos` y
`GET /catalogos/categorias` (devuelve también los registros con `activo = false`; cualquier otro valor
se ignora) (fuente: catalogos.routes.ts, líneas 27–29 y 465–467).

**Rangos de fecha.** `new Date('AAAA-MM-DD')` se interpreta como medianoche UTC, y una fecha con hora
sin zona (`AAAA-MM-DDTHH:mm:ss`) como hora local del contenedor (`TZ=America/Guatemala`, H-02).
**Verificado en `farmag_api`:** `new Date('2026-10-20')` → `Mon Oct 19 2026 18:00:00 GMT-0600`. El
frontend envía `hasta` como `<fecha>T23:59:59.999` (fin del día local) y `desde` como fecha simple
(fuente: frontend/src/pages/Reportes.tsx, líneas 189, 197 y 270–272; frontend/src/pages/Auditoria.tsx,
líneas 89–90). Consecuencias en H-45 y H-46.

---

## 2. Endpoints por archivo de rutas

Abreviaturas de tablas: se usan los nombres reales de PostgreSQL (`@@map` en
backend/prisma/schema.prisma). "L" = lee, "E" = escribe. Toda escritura en `log_auditoria` la hace
`registrarAuditoria()` (backend/src/middleware/audit.ts, líneas 14–30), que nunca lanza. Salvo que se
indique, cada auditoría guarda `ipAddress: req.ip`.

### 2.1 `auth.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| POST | `/api/auth/login` | Público | — | `username` y `password`: deben ser texto no vacío (validación manual, sin Zod). | 200 `{ token, usuario: { id, username, nombreCompleto, rol, email } }`; **429** `Demasiadas solicitudes de inicio de sesión desde esta red…` con `Retry-After` si la IP supera 20 solicitudes en 10 min (se cuenta **antes** de validar el cuerpo); 400 `Usuario y contraseña son requeridos` si falta alguno o no es texto; **429** `Demasiados intentos fallidos. Intente de nuevo en n minuto(s).` con `Retry-After` si la combinación usuario+IP está bloqueada (3 fallos → 5 min) o queda bloqueada con este fallo; 401 `{ error: 'Credenciales inválidas', intentosRestantes }` si el usuario no existe, está inactivo o la contraseña no coincide (mismo mensaje en los tres casos); 500 `Error interno del servidor`. El estado de ambos límites está en memoria. | L `usuarios`; E `usuarios` (`ultimo_acceso`); E `log_auditoria` | `LOGIN`, entidad `usuario`, en el acceso correcto; **nuevo:** también en cada fallo de un usuario existente, con `datosNuevos: { exito: false, motivo, bloqueado, intentosRestantes }`. Los fallos con usuario inexistente no se registran. | backend/src/routes/auth.routes.ts, líneas 23–53 y 56–148; backend/src/middleware/ipRateLimit.ts, líneas 20–22 y 43–64; backend/src/middleware/loginRateLimit.ts, líneas 13–14 y 41–85 |
| GET | `/api/auth/perfil` | Autenticado | — | — | 200 `{ id, username, nombreCompleto, email, rol, ultimoAcceso, createdAt }`; 404 si el usuario no existe; 500. | L `usuarios` | No | backend/src/routes/auth.routes.ts, líneas 151–176 |

`GET /api/auth/perfil` ahora lo consume el frontend al cargar la sesión (fuente:
frontend/src/context/AuthContext.tsx, línea 49).

### 2.2 `usuarios.routes.ts`

Todas usan su propio `catch` con 500 `Error interno del servidor` (sin `responderError`), por lo que un
`email` repetido (campo `@unique`) sigue terminando en 500 (H-15).

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/usuarios` | ADMIN | — | — | 200 arreglo de usuarios (sin `passwordHash`), orden `createdAt` desc, sin paginación; 500. | L `usuarios` | No | backend/src/routes/usuarios.routes.ts, líneas 10–30 |
| POST | `/api/usuarios` | ADMIN | — | Validación manual (sin Zod): `username`, `password`, `nombreCompleto`, `rol` obligatorios; **nuevo:** `username` y `nombreCompleto` deben ser texto, `rol` ∈ {`ADMIN`, `ENCARGADO_BENEFICENCIA`}, `password` texto de mínimo 6 caracteres. `email` opcional, sin validar tipo ni formato. Contraseña con `bcrypt.hash(password, 12)`. | 201 usuario creado; 400 campo faltante, tipo incorrecto, rol inválido o contraseña corta; 409 `El nombre de usuario ya existe`; 500 (p. ej. `email` duplicado). | L/E `usuarios`; E `log_auditoria` | `CREAR`, entidad `usuario` (`datosNuevos` sin contraseña) | backend/src/routes/usuarios.routes.ts, líneas 33–94 |
| PUT | `/api/usuarios/:id/toggle` | ADMIN | `:id` usuario | — | 200 `{ id, username, activo }`; 404; 400 si es la propia cuenta; 500. | L/E `usuarios`; E `log_auditoria` | `ACTIVAR` o `DESACTIVAR`, entidad `usuario` | backend/src/routes/usuarios.routes.ts, líneas 97–133 |
| PUT | `/api/usuarios/:id` | ADMIN | `:id` usuario | `nombreCompleto`, `email`, `rol`, opcionales. Solo se valida que `rol`, si viene, sea del enum; sin validación de tipo de los demás. | 200 usuario actualizado; 400 rol inválido; 400 si el ADMIN intenta quitarse su propio rol; 404; 500 (p. ej. `email` duplicado o `nombreCompleto` no texto). | L/E `usuarios`; E `log_auditoria` | `EDITAR`, entidad `usuario`, valores anterior/nuevo | backend/src/routes/usuarios.routes.ts, líneas 137–184 |
| PUT | `/api/usuarios/:id/password` | ADMIN | `:id` usuario | `password` (texto, mínimo 6) | 200 `{ data: { id, message } }`; 400; 404; 500. | L/E `usuarios`; E `log_auditoria` | `EDITAR`, entidad `usuario`, `datosNuevos: { password: '***restablecida***' }` | backend/src/routes/usuarios.routes.ts, líneas 188–221 |

### 2.3 `catalogos.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/catalogos/medicamentos` | Autenticado | Query: `page` (def. 1), `limit` (1–100, def. 20), `q` (`textoQuery`; nombre genérico o comercial, sin distinguir mayúsculas), **`incluirInactivos`** (`'true'`) | — | 200 `{ data, pagination }` con categoría y códigos; por defecto solo `activo = true`; 500. | L `medicamentos`, `categorias`, `codigos_barras` | No | backend/src/routes/catalogos.routes.ts, líneas 20–51 |
| GET | `/api/catalogos/medicamentos/buscar` | Autenticado | Query: `q` (`textoQuery`, recortado) | — | 200 `{ data }` (máx. 20, activos); `q` vacío → `{ data: [] }`; 500. | L `medicamentos`, `categorias`, `codigos_barras` | No | backend/src/routes/catalogos.routes.ts, líneas 54–81 |
| GET | `/api/catalogos/medicamentos/barcode/:codigo` | Autenticado | `:codigo` (sin recortar) | — | 200 `{ data: { ...medicamento, stockActual } }`; **cambio:** `stockActual` sale de `obtenerStockMedicamento` y excluye lotes con fecha de vencimiento hoy o anterior; 404 `Código de barras no registrado`; 500. No filtra medicamentos inactivos. | L `codigos_barras`, `medicamentos`, `categorias`, `lotes` | No | backend/src/routes/catalogos.routes.ts, líneas 84–112; backend/src/services/dispensacion.service.ts, líneas 657–681 |
| GET | `/api/catalogos/medicamentos/lookup-fda/:codigoBarras` | **ADMIN** (antes: Autenticado) | `:codigoBarras` GTIN/EAN/UPC (se reduce a dígitos) | — | Siempre 200 (salvo 401/403): `{ found: true, ndcConsultado, nombreGenerico, nombreComercial, presentacion, concentracion, unidadMedida, categoriaSugerida }` o `{ found: false }` (también ante errores). Consulta `https://api.fda.gov/drug/label.json` con hasta 3 formatos de NDC y 5 s por intento. | Ninguna (OpenFDA) | No | backend/src/routes/catalogos.routes.ts, líneas 125–160 y 162–216 |
| POST | `/api/catalogos/medicamentos` | ADMIN | — | Zod `medicamentoSchema`: `nombreGenerico` texto mín. 2; `nombreComercial` texto opcional/nulo; `presentacion` texto mín. 1; `concentracion` texto opcional/nulo; `unidadMedida` texto mín. 1; `categoriaId` UUID; `stockMinimo` entero ≥ 0 opcional (def. 10). Fuera del esquema: `forzarCreacion` (solo cuenta si es `true`). | 201 `{ data }`; 200 `{ advertencia: true, mensaje, similares }` si hay posibles duplicados (nombre genérico que contiene el texto + misma presentación + misma concentración) y no se envió `forzarCreacion`; 400 Zod; 400 `La categoría especificada no existe`; 500. | L `categorias`, `medicamentos`; E `medicamentos`; E `log_auditoria` | `CREAR`, entidad `medicamento` | backend/src/routes/catalogos.routes.ts, líneas 218–226 y 230–297 |
| PUT | `/api/catalogos/medicamentos/:id` | ADMIN | `:id` medicamento | **Nuevo:** Zod `medicamentoSchema.extend({ activo: z.boolean() }).partial()` (mismas reglas que el alta, todos opcionales; los campos desconocidos se descartan). Se aplican solo los campos de la lista editable que cambian. | 200 `{ data }`; 200 `{ data, mensaje: 'No hubo cambios que aplicar' }`; 400 Zod (p. ej. tipo incorrecto); 404; 400 categoría inexistente; 500 vía `responderError`. | L `medicamentos`, `categorias`; E `medicamentos`; E `log_auditoria` | `EDITAR`, entidad `medicamento`, solo los campos cambiados (anterior/nuevo). Desactivar también es `EDITAR`. | backend/src/routes/catalogos.routes.ts, líneas 300–375 |
| POST | `/api/catalogos/medicamentos/:id/codigos` | ADMIN | `:id` medicamento | `codigo` texto no vacío; **cambio:** se recorta antes de comprobar duplicados; `descripcion` opcional sin validar. | 201 `{ data }`; 400; 404 medicamento; 409 `Este código de barras ya está registrado en otro medicamento` (también si es del mismo, H-31); 500. No comprueba que el medicamento esté activo. | L `medicamentos`, `codigos_barras`; E `codigos_barras`; E `log_auditoria` | `CREAR`, entidad `codigo_barras` | backend/src/routes/catalogos.routes.ts, líneas 382–427 |
| DELETE | `/api/catalogos/codigos/:id` | ADMIN | `:id` código | — | 200 `{ mensaje }`; 404; 500. **Borrado físico.** | L/E `codigos_barras`; E `log_auditoria` | `ELIMINAR`, entidad `codigo_barras` | backend/src/routes/catalogos.routes.ts, líneas 430–456 |
| GET | `/api/catalogos/categorias` | Autenticado | **Nuevo:** query `incluirInactivos` (`'true'`) | — | 200 `{ data }` (por defecto solo activas), orden por nombre; 500. | L `categorias` | No | backend/src/routes/catalogos.routes.ts, líneas 463–475 |
| POST | `/api/catalogos/categorias` | ADMIN | — | `nombre` texto no vacío; `descripcion` opcional. Sin Zod. | 201 `{ data }`; 400; 409 `Ya existe una categoría con ese nombre` (comparación exacta con el valor **sin recortar**); 500 (incluye un nombre con espacios al inicio o al final que coincide con uno existente, ver H-42). | L/E `categorias`; E `log_auditoria` | `CREAR`, entidad `categoria` | backend/src/routes/catalogos.routes.ts, líneas 478–511 |
| PUT | `/api/catalogos/categorias/:id` | ADMIN | `:id` categoría | **Nuevo:** Zod `categoriaEditSchema` (todo opcional): `nombre` texto recortado mín. 1, `descripcion` texto o nulo, `activo` booleano. | 200 `{ data }`; 400 `{ error: <primer mensaje>, detalles }`; 404; **409** nombre duplicado (P2002 vía `responderError`, antes 500); 500. | L/E `categorias`; E `log_auditoria` | `EDITAR`, entidad `categoria` (objeto completo anterior/nuevo) | backend/src/routes/catalogos.routes.ts, líneas 513–556 |
| GET | `/api/catalogos/ubicaciones` | Autenticado | — | — | 200 `{ data }` todas (el modelo no tiene `activo`), orden por código; 500. | L `ubicaciones` | No | backend/src/routes/catalogos.routes.ts, líneas 563–573 |
| POST | `/api/catalogos/ubicaciones` | ADMIN | — | `codigo` texto no vacío; `descripcion` opcional. Sin Zod. | 201 `{ data }`; 400; 409 `Ya existe una ubicación con ese código` (valor sin recortar); 500 (mismo caso de H-42). | L/E `ubicaciones`; E `log_auditoria` | `CREAR`, entidad `ubicacion` | backend/src/routes/catalogos.routes.ts, líneas 576–609 |
| PUT | `/api/catalogos/ubicaciones/:id` | ADMIN | `:id` ubicación | **Nuevo:** `codigo`, si viene, debe ser texto no vacío (se recorta); `descripcion` sin validar tipo. | 200 `{ data }`; 404; 400 código vacío o no texto; **409** código duplicado (P2002 vía `responderError`, antes 500); 500 (p. ej. `descripcion` no texto). | L/E `ubicaciones`; E `log_auditoria` | `EDITAR`, entidad `ubicacion` | backend/src/routes/catalogos.routes.ts, líneas 614–649 |
| POST | `/api/catalogos/medicamentos/:id/imagen` | ADMIN | `:id` medicamento | `multipart/form-data`, archivo `imagen` (ver sección 3). | 200 `{ data }` con `imagenUrl`; 400 sin archivo; 400 tipo no permitido (`fileFilter`, vía `errorHandler`); 400 `El archivo supera el tamaño máximo permitido` (> 5 MB); **400** `El archivo no es una imagen válida` (`sharp` no la decodifica); 404 medicamento; 500 vía `responderError`. | L/E `medicamentos`; E disco; E `log_auditoria` | `EDITAR`, entidad `medicamento` (`imagenUrl` anterior/nuevo) | backend/src/routes/catalogos.routes.ts, líneas 655–675 y 678–737 |

### 2.4 `inventario.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| POST | `/api/inventario/entradas` | Autenticado (ADMIN y ENCARGADO) | — | Zod `entradaSchema`: `observaciones` texto recortado opcional/nulo; `lotes` arreglo mín. 1 de: `medicamentoId` UUID, `cantidad` entero > 0, `numeroLote` texto recortado no vacío, `fechaVencimiento` texto que empiece con `YYYY-MM-DD`, `costoUnitario` número ≥ 0 opcional/nulo, `ubicacionId` UUID opcional/nulo. **Nuevo:** cada `fechaVencimiento` debe ser posterior a hoy (`validarFechaVencimientoEntrada`). | 201 entrada con lotes; 400 Zod; **400** `Lote n (<lote>): La fecha de vencimiento ya pasó o es hoy; …`; 400 medicamento inexistente o inactivo; 400 ubicación inexistente; 500. Todo en una transacción. | L `medicamentos`, `ubicaciones`; E `entradas`, `lotes`; E `log_auditoria` | `CREAR`, entidad `entrada`, `datosNuevos: { lotes: n }` | backend/src/routes/inventario.routes.ts, líneas 29–50 y 56–145; backend/src/services/inventario.service.ts, líneas 110–118 |
| GET | `/api/inventario/entradas` | Autenticado | Query: `page` (def. 1), `pageSize` (1–100, def. 20) | — | 200 `{ data, pagination }` con usuario y número de lotes; 500 (incluye `page` o `pageSize` no numérico, H-43). | L `entradas`, `usuarios`, `lotes` | No | backend/src/routes/inventario.routes.ts, líneas 151–177 |
| GET | `/api/inventario` | Autenticado | Query: `q`, `categoriaId` (ambos con `textoQuery`), `soloStockBajo` (`'true'`), `page`, `pageSize` (1–100) | — | 200 `{ data, pagination }` por medicamento activo: stock dispensable, número de lotes, próximo vencimiento, semáforo, `stockBajo`. Paginación en memoria. **Cambio:** solo carga lotes `DISPONIBLE` con stock (`LOTE_CON_STOCK`). 500 (con `page`/`pageSize` no numérico responde 200 vacío, H-43). | L `configuracion_sistema`, `medicamentos`, `categorias`, `lotes` | No | backend/src/routes/inventario.routes.ts, líneas 184–262; backend/src/services/inventario.service.ts, línea 87 |
| GET | `/api/inventario/alertas` | Autenticado | — | — | 200 `{ data: { stockBajo, porVencer, vencidos, resumen } }`; 500. | L `configuracion_sistema`, `medicamentos`, `lotes`, `dispensaciones`, `beneficiarios` | No | backend/src/routes/inventario.routes.ts, líneas 268–375 |
| GET | `/api/inventario/medicamento/:id` | Autenticado | `:id` medicamento | — | 200 `{ data }` con todos los lotes (cualquier estado), semáforo y días para vencer; 404; 500. | L `configuracion_sistema`, `medicamentos`, `categorias`, `codigos_barras`, `lotes`, `ubicaciones`, `entradas` | No | backend/src/routes/inventario.routes.ts, líneas 381–441 |
| PUT | `/api/inventario/lotes/:id/baja` | ADMIN | `:id` lote | `motivo` (opcional; se usa, recortado, solo si es texto). Sin Zod. | 200 `{ data }`; 404; 409 `El lote ya fue dado de baja`; 500. Se permite dar de baja lotes en cualquier otro estado. | L/E `lotes`; E `log_auditoria` | `BAJA`, entidad `lote` (estado y cantidad anteriores; `motivo` en `datosNuevos`) | backend/src/routes/inventario.routes.ts, líneas 447–490 |
| GET | `/api/inventario/configuracion` | Autenticado | — | — | 200 `{ data: { rojo, amarillo } }` (30/90 si no hay valor válido); 500. Ahora lo consume la pantalla de Dispensación. | L `configuracion_sistema` | No | backend/src/routes/inventario.routes.ts, líneas 496–504; backend/src/services/inventario.service.ts, líneas 19–34 |
| PUT | `/api/inventario/configuracion` | ADMIN | — | Zod `configSchema`: `rojo` y `amarillo` enteros > 0; además `rojo < amarillo`. | 200 `{ data: { rojo, amarillo } }`; 400 Zod; 400 si `rojo >= amarillo`; 500. | L/E `configuracion_sistema`; E `log_auditoria` | `EDITAR`, entidad `configuracion` (sin `entidadId`) | backend/src/routes/inventario.routes.ts, líneas 510–570 |
| POST | `/api/inventario/importar-excel` | ADMIN | — | `multipart/form-data`, archivo `archivo` (.xlsx, ver sección 3 y 2.4.1). | 200 `{ data: { totalFilas, medicamentosCreados, medicamentosExistentes, categoriasCreadas, ubicacionesCreadas, codigosBarrasVinculados, lotesRegistrados, lotesOmitidos, errores[], avisos[], avisosGenerales[] } }` (**nuevos:** `lotesOmitidos` y `avisosGenerales`); 400 sin archivo, archivo no .xlsx válido, sin filas de datos o columnas faltantes; **400** `El archivo supera el tamaño máximo permitido` (> 10 MB, antes 500). Una transacción por fila. El handler no tiene `try/catch` exterior; los errores de cada fila se capturan. | L/E `categorias`, `ubicaciones`, `medicamentos`, `codigos_barras`; E `entradas`, `lotes`; E `log_auditoria` | `CREAR` por cada medicamento, categoría y ubicación creados (con `origenImportacion: 'excel'` y `fila` en medicamento) y por cada entrada (una por fila). La vinculación de códigos de barras **no** se audita (D-18). | backend/src/routes/inventario.routes.ts, líneas 576–609, 628–684 y 690–982 |
| GET | `/api/inventario/plantilla-excel` | ADMIN | — | — | 200 archivo `plantilla-importacion-medicamentos.xlsx` (hojas "Plantilla" e "Instrucciones"). Sin `try/catch`. | Ninguna | No | backend/src/routes/inventario.routes.ts, líneas 988–1046 |

`PUT /api/inventario/configuracion` sigue sin pantalla: `actualizarConfiguracion` está en
`frontend/src/api/inventario.ts` (línea 65) pero ninguna página la importa (H-22).

#### 2.4.1 Validaciones de la importación por Excel

Columnas exigidas en la fila 1 (11, sin cambio): `nombreGenerico, nombreComercial, presentacion,
concentracion, unidadMedida, categoria, codigoBarras, cantidad, numeroLote, fechaVencimiento, ubicacion`,
comparadas sin tildes, mayúsculas ni signos (fuente: inventario.routes.ts, líneas 582–609 y 717–729).
Todas las filas se validan primero en memoria y luego se procesan una por una, en orden (líneas 731–769).

| Regla | Comportamiento en `bdf1187` | Resultado | Commit | Fuente |
|-------|-----------------------------|-----------|--------|--------|
| Obligatorios | `nombreGenerico`, `presentacion`, `unidadMedida`, `categoria`, `numeroLote`, `cantidad`, `fechaVencimiento` | Error de fila | — | inventario.routes.ts, líneas 631–654 |
| Cantidades enteras | `Number(cantidad)` en lugar de `parseInt`: `12.5` o `12abc` se rechazan (antes `parseInt` daba 12) | Error `cantidad debe ser un entero mayor a 0` | `42350b1` | líneas 646–650 |
| Fechas imposibles | `YYYY-MM-DD` o `DD/MM/YYYY` se aceptan solo si el día existe (`31/02/2027` se rechaza en vez de pasar a marzo); las fechas nativas de Excel se leen en UTC | Error de formato de `fechaVencimiento` | `b595051` | backend/src/utils/excel.ts, líneas 17–46 |
| Fecha futura | Fecha hoy o anterior se rechaza (misma regla que el registro manual) | Error de fila | `254d0f8` | inventario.routes.ts, líneas 655–659 |
| Catálogos inactivos | Si la categoría (sin distinguir mayúsculas) o el medicamento coincidente (nombre genérico + presentación sin distinguir mayúsculas + concentración) existen pero están inactivos, la fila se rechaza | Error de fila `… existe pero está inactiva/o; actívela/o antes de importar` | `254d0f8` | líneas 772–780 y 798–812 |
| Lotes duplicados | Si ya existe un lote del mismo medicamento con el mismo número (sin distinguir mayúsculas) y la misma fecha, **creado antes de iniciar esta importación**, la fila se omite y su transacción se deshace (no deja categoría ni ubicación creadas). Dos filas iguales del mismo archivo sí se importan las dos | Aviso por fila + `lotesOmitidos` | `5bdc091`, `71dcd15` | líneas 765–767, 813–828 y 946–950; backend/src/services/inventario.service.ts, líneas 127–140 |
| Códigos de barras numéricos | Si la celda `codigoBarras` es de tipo número, se cuenta la fila y se emite **un** aviso general (los ceros a la izquierda ya se perdieron en Excel); el código se vincula igual | `avisosGenerales[]` | `42350b1`, `aa163aa` | líneas 682, 753 y 958–964 |
| Código de barras de otro medicamento | No se vincula | Aviso por fila | — | líneas 847–857 y 928–930 |
| Categoría o ubicación inexistentes | Se crean (ubicación por código sin distinguir mayúsculas) | Contadores | — | líneas 781–796 |

### 2.5 `dispensacion.routes.ts`

Ninguna ruta de este archivo usa `requireRole`. **Cambio:** todos los `catch` usan `responderError`
(sección 1.3), con reglas de texto por ruta; los 500 ya no exponen `error.message` salvo en desarrollo
(fuente: backend/src/routes/dispensacion.routes.ts, líneas 36, 83, 94, 142–145, 209–213, 229, 240,
266–269, 280, 306 y 317).

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/dispensacion/beneficiarios/buscar` | Autenticado | Query: `q` (`textoQuery`). Vacío → 50 más recientes; solo dígitos → DPI que **empieza con** `q` (máx. 20); si no → nombre que contiene `q` (máx. 20). Solo activos. | — | 200 `{ data }`; 500. | L `beneficiarios` | No | dispensacion.routes.ts, líneas 30–38; dispensacion.service.ts, líneas 16–47 |
| POST | `/api/dispensacion/beneficiarios` | Autenticado | — | Validación manual: `nombreCompleto` texto de mín. 3 caracteres tras recortar; **nuevo:** `dpi`, `telefono`, `direccion`, `observaciones`, si vienen y no son nulos, deben ser texto; `dpi` (si viene) exactamente 13 dígitos. | 201 beneficiario; 400 nombre, tipo o DPI inválido; 409 `Ya existe un beneficiario con DPI …`; 500. | L/E `beneficiarios`; E `log_auditoria` | `CREAR`, entidad `Beneficiario` | dispensacion.routes.ts, líneas 41–85; dispensacion.service.ts, líneas 49–72 |
| GET | `/api/dispensacion/beneficiarios/:id` | Autenticado | `:id` | — | 200 beneficiario con **todas** sus dispensaciones (usuario, fotos con `imagenUrl`, detalle con snapshots); 404 `Beneficiario no encontrado`; 500. | L `beneficiarios`, `dispensaciones`, `usuarios`, `fotos_dispensacion`, `detalle_dispensaciones` | No | dispensacion.routes.ts, líneas 88–96; dispensacion.service.ts, líneas 74–101 |
| PUT | `/api/dispensacion/beneficiarios/:id` | Autenticado | `:id` | `nombreCompleto` (si viene, texto mín. 3); los demás, si vienen y no son nulos, texto; `dpi` (si viene no vacío) 13 dígitos. No permite cambiar `activo` (H-29). | 200 beneficiario; 400; 404; 409 DPI duplicado; 500. | L/E `beneficiarios`; L `dispensaciones` y relacionadas (para la auditoría); E `log_auditoria` | `EDITAR`, entidad `Beneficiario` (`datosAnteriores` incluye todo el historial) | dispensacion.routes.ts, líneas 99–147; dispensacion.service.ts, líneas 103–135 |
| POST | `/api/dispensacion/despachar` | Autenticado | — | Validación manual: `beneficiarioId` texto no vacío; `items` arreglo no vacío; **nuevo:** cada ítem con `medicamentoId` texto no vacío y `cantidad` de tipo número, **entera** y > 0; `observaciones` opcional sin validar. | 201 `{ dispensacion, stockActualizado }`; 400 `beneficiarioId es requerido` o `Cada ítem debe tener medicamentoId (texto) y cantidad entera mayor a 0`; 404 `Beneficiario no encontrado o inactivo` / `Medicamento no encontrado o inactivo: <id>`; 409 `Stock insuficiente para <nombre>. Solicitado: n, Disponible: m`; **409** `No se pudo completar la dispensación por un conflicto de concurrencia. Intente de nuevo.` tras 3 intentos fallidos por conflicto de serialización (antes 500); 500. Transacción `Serializable` con `SELECT … FOR UPDATE` FIFO por `fecha_vencimiento`; **cambio:** excluye lotes con `fecha_vencimiento <= hoy` (fecha local enviada como texto `AAAA-MM-DD`). | L `beneficiarios`, `medicamentos`; L/E `lotes`; E `dispensaciones`, `detalle_dispensaciones`; E `log_auditoria` | `DISPENSAR`, entidad `Dispensacion` (beneficiario, detalles, observaciones) | dispensacion.routes.ts, líneas 154–215; dispensacion.service.ts, líneas 155–317 (consulta: 213–222; reintentos: 296–316) |
| GET | `/api/dispensacion/historial` | Autenticado | Query: `fechaDesde`, `fechaHasta` (se lleva a 23:59:59.999 hora local; ver H-45), `beneficiarioId` (los tres con `textoQuery`), `page` (def. 1), `limit` (def. 20, **máx. 100**) | — | 200 `{ data, pagination }` de **todas** las dispensaciones; **400** fecha inválida o rango invertido; 500. | L `dispensaciones`, `beneficiarios`, `usuarios`, `fotos_dispensacion`, `detalle_dispensaciones` | No | dispensacion.routes.ts, líneas 218–231; dispensacion.service.ts, líneas 323–389 |
| GET | `/api/dispensacion/stock/:medicamentoId` | Autenticado | `:medicamentoId` | — | 200 `{ stockTotal, vencimientoProximo, lotes }`; **cambio:** solo lotes `DISPONIBLE` con cantidad > 0 y fecha de vencimiento posterior a hoy; 200 con `stockTotal: 0` si el id no existe; 500. | L `lotes` | No | dispensacion.routes.ts, líneas 234–242; dispensacion.service.ts, líneas 657–681 |
| POST | `/api/dispensacion/:id/generar-token` | Autenticado | `:id` dispensación | — | 200 `{ token, url: '/captura/<token>', expiraEn }` (reutiliza el vigente o crea/reemplaza uno; **cambio:** token de 11 caracteres con `randomBytes(8)` en base64url); 404 `Dispensación no encontrada`; **409** `La evidencia de esta dispensación ya está completa; no se pueden reemplazar las fotos` si ya tiene RECETA y EVIDENCIA_ENTREGA; 500. | L `dispensaciones`, `fotos_dispensacion`; L/E `tokens_captura`; E `log_auditoria` | `CREAR`, entidad `TokenCaptura`, `entidadId` = id de la dispensación, también cuando solo reutiliza el token (H-38) | dispensacion.routes.ts, líneas 250–271; dispensacion.service.ts, líneas 435–484 |
| GET | `/api/dispensacion/:id/fotos` | Autenticado | `:id` dispensación | — | 200 `{ data: [{ id, tipo, imagenUrl, createdAt }] }` (vacío si no existe); 500. | L `fotos_dispensacion` | No | dispensacion.routes.ts, líneas 274–282; dispensacion.service.ts, líneas 486–492 |
| GET | `/api/dispensacion/:id/foto/:tipo` | Autenticado | **Nuevo endpoint.** `:id` dispensación; `:tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`} | — | 200 binario de la imagen con `Content-Type` según la extensión (`image/webp` para las fotos nuevas) y `Cache-Control: private, no-store`; 400 `Tipo de foto inválido`; 404 `Foto no encontrada` (sin registro, archivo inexistente o ruta fuera de la carpeta); 500. **Verificado:** sin token → 401. | L `fotos_dispensacion`; L disco | No | dispensacion.routes.ts, líneas 284–308; dispensacion.service.ts, líneas 545–569 |
| GET | `/api/dispensacion/:id` | Autenticado | `:id` dispensación | — | 200 dispensación con beneficiario, usuario, fotos y detalle (lote y medicamento); 404 `Dispensación no encontrada`; 500. | L `dispensaciones`, `beneficiarios`, `usuarios`, `fotos_dispensacion`, `detalle_dispensaciones`, `lotes`, `medicamentos` | No | dispensacion.routes.ts, líneas 311–319; dispensacion.service.ts, líneas 391–412 |

`GET /api/dispensacion/historial` y `GET /api/dispensacion/:id` siguen sin consumirse en el frontend
(búsqueda de `/dispensacion/historial` y de `/dispensacion/${` en frontend/src: solo aparecen
`generar-token`, `fotos`, `foto/:tipo` y `stock`).

**Regla inalcanzable en el despacho.** La ruta declara `{ match: 'inactivo', status: 400 }` después de
`{ match: 'no encontrado', status: 404 }`, pero los dos mensajes que contienen "inactivo" contienen
también "no encontrado", por lo que un beneficiario o medicamento inactivo siempre responde 404
(fuente: dispensacion.routes.ts, líneas 209–213; dispensacion.service.ts, líneas 174–176 y 206–208).
Ver P-23.

### 2.6 `captura.routes.ts` (pública)

Estas rutas **no** llevan `authMiddleware` a propósito; la credencial es el token del QR (fuente:
backend/src/routes/captura.routes.ts, líneas 10–19; backend/src/server.ts, líneas 55–56). No tienen
límite de peticiones.

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/captura/:token/info` | Público | `:token` | — | 200 `{ dispensacionId, beneficiario, fecha, expiraEn, fotosSubidas }`; 404 `Enlace inválido o expirado` si el token no existe, ya se usó o venció (mismo mensaje en los tres casos; también ante cualquier otro error). **Verificado** con un token falso → 404. | L `tokens_captura`, `dispensaciones`, `beneficiarios`, `fotos_dispensacion` | No | captura.routes.ts, líneas 40–49; dispensacion.service.ts, líneas 500–526 |
| POST | `/api/captura/:token/foto` | Público | `:token` | `multipart/form-data`: archivo `foto` y campo `tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`}. | 200 `{ success: true, dispensacionId, fotosSubidas, completo }`; **400** archivo no JPG/PNG/WEBP (antes 500); **400** `El archivo supera el tamaño máximo permitido` (> 5 MB, antes 500); 400 sin archivo; 400 tipo inválido; 404 token inválido, usado o vencido (se comprueba **antes** de procesar la imagen); **400** `El archivo no es una imagen válida`; 500 `Error interno del servidor`. **Verificado:** `text/plain` → 400; 6 MB → 400; contenido no imagen declarado `image/png` con token falso → 404. | L `tokens_captura`, `dispensaciones`, `beneficiarios`, `fotos_dispensacion`; E `fotos_dispensacion` (upsert por dispensación+tipo), E `tokens_captura` (`usado = true` al completar las 2 fotos); E disco; E `log_auditoria` | **Nuevo:** `CREAR`, entidad `FotoDispensacion`, `entidadId` = dispensación, `datosNuevos: { tipo, via: 'captura-token' }`, con el `usuarioId` de quien hizo la dispensación y **sin** `ipAddress` (H-35) | captura.routes.ts, líneas 23–35 y 52–95; dispensacion.service.ts, líneas 576–643 |

La pantalla de escritorio también sube fotos por este endpoint, con el mismo token (H-35).

### 2.7 `reportes.routes.ts`

Paginación de los 6 GET: `page` y `limit` (`page` ≥ 1, `limit` entre 1 y 5000, por defecto 20) (sección
1.5). **Cambio:** las fechas `desde`/`hasta` se validan con `parseRangoFechas` (400 si son inválidas o
el rango está invertido) y los filtros de texto pasan por `textoQuery`, salvo `desde`/`hasta` de
`entradas` y `medicamentos-baja`, que se pasan sin normalizar y que `parseFechaQuery` rechaza con 400 si
no son texto (fuente: backend/src/routes/reportes.routes.ts, líneas 30–134;
backend/src/services/reportes.service.ts, líneas 45, 101, 262 y 324).

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/reportes/dispensaciones` | Autenticado | Query: `desde`, `hasta`, `beneficiarioId`, `medicamentoId`, `page`, `limit` | — | 200 `{ data, pagination }`; 400 fecha; 500 vía `responderError`. | L `dispensaciones`, `beneficiarios`, `usuarios`, `detalle_dispensaciones`, `medicamentos`, `codigos_barras` | No | reportes.routes.ts, líneas 30–45; reportes.service.ts, líneas 43–87 |
| GET | `/api/reportes/consumo-medicamentos` | Autenticado | Query: `desde`, `hasta`, `categoriaId`, `page`, `limit` | — | 200 `{ data, pagination }` ranking por cantidad dispensada; 400 fecha; 500. | L `detalle_dispensaciones`, `dispensaciones`, `medicamentos`, `categorias` | No | reportes.routes.ts, líneas 48–62; reportes.service.ts, líneas 99–140 |
| GET | `/api/reportes/inventario-actual` | Autenticado | Query: `categoriaId`, `estado` (valor de `EstadoLote`), `page`, `limit` | — | 200 `{ data, pagination }` a nivel de lote; 400 `Estado inválido. Use: …`; 500 (catch propio, sin `responderError`). | L `configuracion_sistema`, `lotes`, `medicamentos`, `categorias`, `codigos_barras`, `ubicaciones` | No | reportes.routes.ts, líneas 65–85; reportes.service.ts, líneas 151–193 |
| GET | `/api/reportes/por-vencer` | Autenticado | Query: `dias` (entero > 0, def. 90; no numérico → 90), `page`, `limit` | — | 200 `{ data, pagination, umbralDias }`; 500 (catch propio). | L `configuracion_sistema`, `lotes`, `medicamentos`, `codigos_barras`, `categorias`, `ubicaciones` | No | reportes.routes.ts, líneas 88–101; reportes.service.ts, líneas 203–249 |
| GET | `/api/reportes/entradas` | Autenticado | Query: `desde`, `hasta`, `page`, `limit` | — | 200 `{ data, pagination }` con totales de lotes, unidades y costo; 400 fecha; 500. | L `entradas`, `usuarios`, `lotes`, `medicamentos` | No | reportes.routes.ts, líneas 104–118; reportes.service.ts, líneas 260–305 |
| GET | `/api/reportes/medicamentos-baja` | Autenticado | Query: `desde`, `hasta` (sobre `fecha_vencimiento`), `page`, `limit` | — | 200 `{ data, pagination, resumen: { totalUnidadesPerdidas, costoTotalEstimado } }` (lotes `VENCIDO` y `DADO_DE_BAJA`); 400 fecha; 500. | L `lotes`, `medicamentos`, `categorias` | No | reportes.routes.ts, líneas 121–134; reportes.service.ts, líneas 322–369 |
| GET | `/api/reportes/exportar/:tipo/:formato` | ADMIN | `:tipo` ∈ {`dispensaciones`, `consumo`, `inventario`, `por-vencer`, `entradas`, `baja`}; `:formato` ∈ {`pdf`, `xlsx`}; query: los filtros del reporte correspondiente (se ignoran `page` y `limit`) | — | 200 archivo (`application/pdf` o `.xlsx`, `Content-Disposition: attachment; filename="<tipo>-<timestamp>.<ext>"`); 400 tipo o formato inválido; 400 fecha inválida; **400** `El reporte tiene n registros y el máximo exportable es 5000. Reduzca el rango de fechas o aplique más filtros.` (**antes** se truncaba en silencio a 5000); 500 (incluye `estado` inválido en `inventario`, que aquí no se valida: H-44). | Las del reporte + L `configuracion_sistema` (`NOMBRE_FARMACIA`, solo PDF); E `log_auditoria` | `CREAR`, entidad `reporte`, `datosNuevos: { tipo, formato, filtros: req.query }` (sin `entidadId`), solo si el archivo se generó | reportes.routes.ts, líneas 140–153, 155–376 y 379–442; backend/src/utils/validacion.ts, líneas 55–64 |

En `dispensaciones`, el límite de 5000 se compara con el número de **dispensaciones**, pero el archivo
tiene una fila por medicamento dispensado (fuente: reportes.routes.ts, líneas 157–178), por lo que puede
tener más de 5000 filas.

### 2.8 `auditoria.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/auditoria` | ADMIN | Query: `page` (def. 1), `limit` (def. 50, **máx. 100**), `usuario` (id), `accion`, `entidad` (los tres con `textoQuery`), `desde`, `hasta`. **Nuevo:** `accion` se valida contra el enum `AccionAuditoria`; `entidad` se compara sin distinguir mayúsculas; las fechas se validan. | — | 200 `{ data, pagination }` con `usuario { username, nombreCompleto }`, orden `createdAt` desc; **400** `accion inválida. Use: …` (antes 500); **400** fecha inválida o rango invertido; 500 vía `responderError`. | L `log_auditoria`, `usuarios` | No | backend/src/routes/auditoria.routes.ts, líneas 14–83 |

### 2.9 `server.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/health` | Público | — | — | 200 `{ status: 'ok', timestamp, environment }` (expone `NODE_ENV`). **Verificado:** `"environment":"development"`. | Ninguna | No | backend/src/server.ts, líneas 61–67 |

### 2.10 Acciones que registra la auditoría por endpoint (resumen)

| Endpoint | Acción / entidad | IP | Cambio respecto a `194f8fb` |
|----------|------------------|----|-----------------------------|
| `POST /auth/login` | `LOGIN` / `usuario` (éxito y fallo de usuario existente) | Sí | Se agregó el fallo |
| `POST /usuarios` | `CREAR` / `usuario` | Sí | — |
| `PUT /usuarios/:id/toggle` | `ACTIVAR` o `DESACTIVAR` / `usuario` | Sí | — |
| `PUT /usuarios/:id`, `PUT /usuarios/:id/password` | `EDITAR` / `usuario` | Sí | — |
| `POST /catalogos/medicamentos` | `CREAR` / `medicamento` | Sí | — |
| `PUT /catalogos/medicamentos/:id`, `POST …/:id/imagen` | `EDITAR` / `medicamento` | Sí | — |
| `POST /catalogos/medicamentos/:id/codigos` | `CREAR` / `codigo_barras` | Sí | — |
| `DELETE /catalogos/codigos/:id` | `ELIMINAR` / `codigo_barras` | Sí | — |
| `POST`/`PUT /catalogos/categorias` | `CREAR`/`EDITAR` / `categoria` | Sí | — |
| `POST`/`PUT /catalogos/ubicaciones` | `CREAR`/`EDITAR` / `ubicacion` | Sí | — |
| `POST /inventario/entradas` | `CREAR` / `entrada` | Sí | — |
| `PUT /inventario/lotes/:id/baja` | `BAJA` / `lote` | Sí | — |
| `PUT /inventario/configuracion` | `EDITAR` / `configuracion` | Sí | — |
| `POST /inventario/importar-excel` | `CREAR` / `medicamento`, `categoria`, `ubicacion`, `entrada` | Sí | — (los códigos de barras vinculados siguen sin auditarse) |
| `POST /dispensacion/beneficiarios`, `PUT …/:id` | `CREAR`/`EDITAR` / `Beneficiario` | Sí | — |
| `POST /dispensacion/despachar` | `DISPENSAR` / `Dispensacion` | Sí | — |
| `POST /dispensacion/:id/generar-token` | `CREAR` / `TokenCaptura` (siempre) | Sí | — (H-38) |
| `POST /captura/:token/foto` | `CREAR` / `FotoDispensacion` | **No** | **Nuevo** (H-14, H-35) |
| `GET /reportes/exportar/:tipo/:formato` | `CREAR` / `reporte` | Sí | — |

Ningún GET se audita, ni la descarga de fotos de evidencia por `GET /dispensacion/:id/foto/:tipo`.
Fuente: búsqueda de `registrarAuditoria(` en backend/src/routes/*.ts y backend/src/services/*.ts.

---

## 3. Endpoints que suben o sirven archivos

| Endpoint | Dirección | Campo | Tipos aceptados | Límite | Procesamiento, dónde se guarda / de dónde sale | Fuente |
|----------|-----------|-------|-----------------|--------|------------------------------------------------|--------|
| `POST /api/catalogos/medicamentos/:id/imagen` | Subida (ADMIN) | `imagen` | `image/jpeg`, `image/png`, `image/webp` por `mimetype` declarado (`fileFilter`, 400 si no); **nuevo:** el contenido se decodifica con `sharp` (400 si no es una imagen) | 5 MB (`multer`, memoria) | **Cambio:** se recodifica a WebP con `comprimirImagen(buffer, { maxDimension: 1000 })`: respeta la orientación EXIF, reduce el lado mayor a 1000 px sin ampliar, calidad 80. Se guarda en `backend/uploads/medicamentos/<idMedicamento>.webp`, tras borrar cualquier archivo previo del mismo medicamento. URL en `medicamentos.imagen_url`: `/uploads/medicamentos/<id>.webp`. | backend/src/routes/catalogos.routes.ts, líneas 655–675 y 697–718; backend/src/utils/imagen.ts, líneas 26–55 |
| `POST /api/captura/:token/foto` | Subida (pública, con token) | `foto` + `tipo` | Igual que la anterior (`extensionDeMime`) | 5 MB (`multer`, memoria) | **Cambio:** `comprimirImagen(buffer)` con los valores por defecto: lado mayor 1600 px, calidad 80, WebP. Se guarda en `backend/uploads/dispensaciones/<idDispensacion>/<RECETA\|EVIDENCIA_ENTREGA>.webp`, tras borrar el archivo previo del mismo tipo. `fotos_dispensacion.imagen_url` guarda `/uploads/dispensaciones/<id>/<archivo>`, ruta que **ya no se sirve** (H-11). | backend/src/routes/captura.routes.ts, líneas 23–35; backend/src/services/dispensacion.service.ts, líneas 576–609; backend/src/utils/imagen.ts, líneas 30–31 |
| `POST /api/inventario/importar-excel` | Subida (ADMIN) | `archivo` | Sin filtro de tipo; se valida al abrirlo con `exceljs` (400 si no es .xlsx válido) | 10 MB (`multer`, memoria) | No se guarda en disco. | backend/src/routes/inventario.routes.ts, líneas 576–579 y 696–714 |
| `GET /api/inventario/plantilla-excel` | Descarga (ADMIN) | — | `.xlsx` | — | Generado en memoria con `exceljs`. | backend/src/routes/inventario.routes.ts, líneas 988–1046 |
| `GET /api/reportes/exportar/:tipo/:formato` | Descarga (ADMIN) | — | `.pdf` (pdfkit) o `.xlsx` (exceljs) | 5000 registros; más → 400 | Generado en memoria. | backend/src/routes/reportes.routes.ts, líneas 379–442 |
| `GET /api/dispensacion/:id/foto/:tipo` | Descarga (autenticado) | — | La imagen guardada | — | **Nuevo.** La ruta del archivo se deriva del registro en base (`path.basename` de `imagen_url`) y se comprueba que quede dentro de `uploads/dispensaciones`; `res.sendFile` con `Cache-Control: private, no-store`. El frontend la muestra con `AuthImage` (petición con token). | backend/src/routes/dispensacion.routes.ts, líneas 284–308; backend/src/services/dispensacion.service.ts, líneas 551–569; frontend/src/pages/Beneficiarios.tsx, líneas 169 y 213 |
| `GET /uploads/medicamentos/...` (estático) | Descarga | — | Archivos de `backend/uploads/medicamentos` | — | `express.static` **sin autenticación**, solo esa carpeta. En desarrollo Vite reenvía todo `/uploads` a la API, pero la API solo atiende `/uploads/medicamentos` (el resto → 404 JSON); en producción nginx solo reenvía `/uploads/medicamentos/`. | backend/src/server.ts, línea 47; frontend/vite.config.ts, líneas 17–24; frontend/nginx.conf, líneas 42–47 |

**Cambio respecto a `194f8fb`:** `/uploads/dispensaciones/...` ya no se sirve estáticamente. **Verificado
2026-10-20** (registrado en `09_seguimiento_correcciones.md`, sección 5):
`GET /uploads/dispensaciones/x/RECETA.webp` → 404.

La carpeta `backend/uploads` está montada como volumen del host (`./backend/uploads:/app/uploads:z`)
(fuente: docker-compose.yml, línea 61). Verificado en `farmag_api`, 2026-10-20: `/app/uploads/medicamentos`
y `/app/uploads/dispensaciones` existen y están vacías (no hay fotos cargadas en este equipo).

Errores de subida: el rechazo de tipo y el exceso de tamaño ocurren en `multer`, antes del handler, y
los responde `errorHandler` con 400 (sección 1.3). La imagen no decodificable la rechaza `comprimirImagen`
con `status = 400`, que el handler respeta. **En `194f8fb` los tres casos respondían 500.**

---

## Cambios respecto a la versión 194f8fb

| Tema | Antes (`194f8fb`) | Ahora (`bdf1187`) | Commit | Hallazgo relacionado |
|------|-------------------|-------------------|--------|----------------------|
| Total de endpoints | 53 (dispensación: 10) | 54 (dispensación: 11); ninguno eliminado | `254d0f8` | H-11 |
| Foto de evidencia | Pública en `/uploads/dispensaciones/...` | Nuevo `GET /dispensacion/:id/foto/:tipo` con token, sin *path traversal*, `no-store`; estático solo `/uploads/medicamentos` | `254d0f8` | H-11, D-23 |
| Rol de OpenFDA | Cualquier usuario autenticado | Solo ADMIN | `254d0f8` | H-21 |
| Middlewares globales | `cors()` abierto, `X-Powered-By`, sin `helmet`, sin `trust proxy` | `trust proxy 1`, `helmet()`, sin `X-Powered-By`, CORS por `CORS_ORIGIN` | `254d0f8`, `a274f5f` | H-17, H-18, H-37, H-40 |
| Ruta inexistente | 404 HTML de Express | 404 `{"error":"Ruta no encontrada"}` | `254d0f8` | H-12 |
| `errorHandler` | 500 para JSON mal formado, cuerpo grande y `multer` | 400 JSON mal formado, 413 cuerpo > 100 kB, 400 `multer` y errores con `status` 4xx | `254d0f8` | H-12 |
| Errores de dispensación | 500 con `error.message` siempre | `responderError`: reglas de texto, `status` 4xx, P2002 → 409, P2025 → 404, 500 con `mensaje` solo en desarrollo | `b25c06e`, `254d0f8` | H-13, H-07 |
| `responderError` en otras rutas | No existía | Auditoría, reportes (4 GET + exportar), PUT de medicamentos/categorías/ubicaciones e imagen de medicamento | `b25c06e`, `254d0f8`, `aa7598b` | H-15 |
| `authMiddleware` | Solo firma y expiración | Consulta usuario y rol actual: 401 si la cuenta está inactiva, 500 si falla la consulta | `254d0f8` | H-10 |
| Login | Solo presencia de campos; sin límite; fallos sin auditar | Tipo texto; 429 por IP (20/10 min) y por usuario+IP (3 fallos/5 min) con `Retry-After`; 401 con `intentosRestantes`; fallo auditado | `254d0f8`, `b25c06e`, `40d16fa` | H-09 |
| Alta de usuarios | Sin validar rol, tipos ni longitud | Rol del enum, tipos texto, contraseña mín. 6 | `254d0f8` | H-15, H-16 |
| PUT medicamentos y categorías | Sin validación de tipos; duplicado → 500 | Zod parcial (400); categoría duplicada → 409 | `aa7598b` | H-15 |
| PUT ubicaciones | Sin validación; duplicado → 500 | Código texto no vacío; duplicado → 409 | `254d0f8` | H-15 |
| Código de barras con espacios | Comprobación sin recortar → 500 | Se recorta antes de comprobar | `254d0f8` | H-31 |
| Inactivos en catálogos | Solo activos | Parámetro `incluirInactivos=true` | `254d0f8` | H-26 |
| Parámetros repetidos (`?q=a&q=b`) | Podían provocar 500 | `textoQuery` en los filtros de texto | `b25c06e` | — |
| Paginación | `historial` y `auditoria` sin máximo; `page` negativa → 500 | `clampPaginacion` (máx. 100) en `historial` y `auditoria`; reportes sin cambio (máx. 5000); inventario sin cambio | `254d0f8` | H-43 |
| Filtros de fecha | `new Date()` sin validar → 500 | `parseFechaQuery`/`parseRangoFechas` → 400 en reportes, auditoría e historial | `254d0f8` | H-45, H-46 |
| Filtro `accion` de auditoría | Valor fuera del enum → 500 | 400; `entidad` sin distinguir mayúsculas | `b25c06e`, `254d0f8` | H-30 |
| Validación del despacho | Sin tipos; `cantidad` no entera aceptada | `beneficiarioId` texto; `cantidad` número entero > 0 | `254d0f8` | H-15 |
| Lotes vencidos en el despacho y el stock | El `FOR UPDATE` y `GET /stock` no filtraban por fecha | Excluyen `fecha_vencimiento <= hoy`; fecha enviada como texto (no depende de la zona de Postgres); mismo criterio en `barcode` | `254d0f8`, `b595051` | H-01 |
| Conflicto de concurrencia | 500 | 3 reintentos y luego 409 | `254d0f8` | — |
| Beneficiarios | Campos opcionales sin validar tipo | Deben ser texto (400) | `b25c06e` | H-15 |
| Token de captura | `nanoid` de 10 caracteres; se podía regenerar con la evidencia completa | `randomBytes(8)` base64url, 11 caracteres; 409 si la evidencia está completa | `dd8e723`, `254d0f8` | H-14 |
| Auditoría de fotos por captura | No se registraba | `CREAR` / `FotoDispensacion`, sin IP | `254d0f8` | H-14, H-35, D-18 |
| Fecha de vencimiento en entradas | Se aceptaban fechas pasadas | 400 si es hoy o anterior (manual y Excel) | `254d0f8` | H-34 |
| Importación: inactivos | Reutilizaba categorías y medicamentos inactivos | La fila se rechaza | `254d0f8` | H-33 |
| Importación: cantidades | `parseInt` (12.5 → 12) | `Number` + entero | `42350b1` | — |
| Importación: fechas imposibles | `31/02` pasaba a marzo | Se rechaza; fechas de Excel leídas en UTC | `b595051` | — |
| Importación: lotes duplicados | Se registraban otra vez | Se omiten (aviso + `lotesOmitidos`) si existían antes de la importación | `5bdc091`, `71dcd15` | — |
| Importación: códigos numéricos | Sin aviso | Un aviso general en `avisosGenerales` | `42350b1`, `aa163aa` | — |
| Subida de imágenes | Se guardaban tal cual; tipo o tamaño inválido → 500 | Recodificadas a WebP con `sharp` (1000 px catálogo, 1600 px evidencia, calidad 80); tipo, tamaño o contenido inválido → 400 | `b25c06e`, `254d0f8` | H-12 |
| Exportación > 5000 registros | Se truncaba en silencio | 400 con el total y el máximo | `4257e93` | — |
| Listado de inventario y alertas | Cargaba todos los lotes | Solo lotes `DISPONIBLE` con stock (`LOTE_CON_STOCK`) | `6ae2bd5`, `2f03675` | — |
| Cliente Prisma | Uno por archivo | Uno compartido | `254d0f8` | — |
| `GET /auth/perfil` | Sin uso en el frontend | Lo usa `AuthContext` al cargar | `254d0f8` | H-19 |

Fuente de los commits: `git log -S"<texto de la corrección>" 194f8fb..bdf1187 -- backend/src`.
