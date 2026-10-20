# 04 — Especificación de la API REST

> Extraído del commit 194f8fb. Pendiente de actualizar al commit bdf1187.

> Fase: Extracción, parte 2 de 4. Documento de hechos con fuente; no es texto final de la tesis.
> Fecha de extracción: 2026-09-25. Rama: `docs/documentacion`.
> Archivos leídos completos: `backend/src/server.ts`, `backend/src/routes/*.ts` (8 archivos),
> `backend/src/middleware/*.ts` (3 archivos), `backend/src/config/env.ts`,
> `backend/src/services/*.ts` (4 archivos).
> Las pruebas en ejecución indicadas se hicieron el 2026-09-25 contra el contenedor `farmag_api` del
> equipo de desarrollo (`NODE_ENV=development`), solo con peticiones que no modifican datos.

---

## 1. Resumen

### 1.1 Prefijo base y montaje

Todas las rutas de la API cuelgan de `/api`. Cada archivo de rutas se monta con su propio prefijo
(fuente: backend/src/server.ts, líneas 26–34):

| Prefijo | Archivo de rutas | Endpoints |
|---------|------------------|-----------|
| `/api/auth` | `auth.routes.ts` | 2 |
| `/api/usuarios` | `usuarios.routes.ts` | 5 |
| `/api/catalogos` | `catalogos.routes.ts` | 15 |
| `/api/inventario` | `inventario.routes.ts` | 10 |
| `/api/dispensacion` | `dispensacion.routes.ts` | 10 |
| `/api/captura` | `captura.routes.ts` (pública) | 2 |
| `/api/reportes` | `reportes.routes.ts` | 7 |
| `/api/auditoria` | `auditoria.routes.ts` | 1 |
| `/api/health` | definido en `server.ts` | 1 |
| **Total** | | **53** |

Además, `server.ts` sirve archivos estáticos en `/uploads` (no es un endpoint de la API; ver
sección 3) (fuente: backend/src/server.ts, línea 23).

El frontend nunca usa una URL absoluta: su cliente Axios tiene `baseURL: '/api'` (fuente:
frontend/src/api/client.ts, líneas 3–8) y el servidor de desarrollo de Vite reenvía `/api` y
`/uploads` a `http://api:3000` (fuente: frontend/vite.config.ts, líneas 8–14). En modo producción
lo hace nginx (fuente: frontend/nginx.conf, líneas 16–32).

### 1.2 Middlewares globales

Se registran en este orden (fuente: backend/src/server.ts, líneas 20–23 y 45–46):

| Orden | Middleware | Configuración exacta | Efecto |
|-------|-----------|----------------------|--------|
| 1 | `cors()` (paquete `cors` 2.8.6) | Sin opciones | Permite cualquier origen. Verificado con `curl -I /api/health`: responde `Access-Control-Allow-Origin: *`. |
| 2 | `express.json()` | Sin opciones | Límite por defecto de body-parser: **100 kB** (102 400 bytes) (fuente: `node_modules/body-parser/lib/types/json.js`, líneas 55–57, en el contenedor `api`). |
| 3 | `express.static` en `/uploads` | `path.join(__dirname, '..', 'uploads')` → carpeta `backend/uploads` | Sirve los archivos subidos **sin autenticación**. |
| último | `errorHandler` | — | Manejador centralizado de errores (ver 1.3). |

No se usan `helmet`, limitación de peticiones (*rate limiting*), `express.urlencoded`, `trust proxy`
ni compresión: no aparecen en `backend/package.json` ni en `backend/src` (búsqueda de `helmet`,
`rate-limit` y `rateLimit` sin resultados). Express envía la cabecera `X-Powered-By: Express`
(verificado con `curl -I`).

### 1.3 Formato de respuestas

**Éxito.** No es uniforme entre módulos:
- Objeto directo: `auth`, `usuarios` (excepto el reset de contraseña), `inventario/entradas` (POST),
  `dispensacion`, `captura`.
- Envuelto en `{ data: ... }`: `catalogos`, casi todo `inventario`, `usuarios/:id/password`.
- Listados paginados: `{ data: [...], pagination: { page, limit|pageSize, total, totalPages } }`
  (`inventario` usa `pageSize`; `catalogos`, `dispensacion`, `reportes` y `auditoria` usan `limit`).

**Error.** Formato general `{ "error": "mensaje" }`. Variantes:
- Validación con Zod (`safeParse`): `400 { error: "Datos inválidos", detalles: <error.flatten()> }`
  (fuente: backend/src/routes/catalogos.routes.ts, línea 229; inventario.routes.ts, líneas 53 y 498).
- `errorHandler` global (fuente: backend/src/middleware/errorHandler.ts, líneas 9–22):
  - si `err.name === 'ZodError'` → `400 { error: "Datos inválidos", detalles: JSON.parse(err.message) }`.
    Ninguna ruta usa `.parse()` (todas usan `safeParse`), por lo que esta rama no se alcanza desde el
    código actual;
  - cualquier otro error → `500 { error: "Error interno del servidor", mensaje }`, donde `mensaje`
    solo se incluye si `NODE_ENV === 'development'`.
  - Llegan a este manejador los errores que no captura la propia ruta: JSON mal formado, cuerpo
    mayor de 100 kB y rechazos de `multer` (tipo de archivo o tamaño). **Verificado:** un JSON mal
    formado en `POST /api/auth/login` devuelve
    `500 {"error":"Error interno del servidor","mensaje":"Expected property name or '}' in JSON at position 1"}`,
    y un archivo `text/plain` en `POST /api/captura/<token>/foto` devuelve
    `500 {..., "mensaje":"Formato de imagen no permitido. Use JPG, PNG o WEBP"}`.
- `dispensacion.routes.ts` responde los 500 con `{ error: error.message }` (el mensaje interno, sin
  depender de `NODE_ENV`) (fuente: backend/src/routes/dispensacion.routes.ts, líneas 30, 69, 81,
  124, 178, 194, 205, 232, 243 y 255).
- Ruta inexistente: Express responde `404` con una página HTML (`Cannot GET /api/...`), no JSON
  (verificado con `curl /api/noexiste`).

### 1.4 Respuestas comunes a todas las rutas protegidas

Para no repetirlas en cada fila, se aplican a todo endpoint marcado con `authMiddleware`
(fuente: backend/src/middleware/auth.ts, líneas 20–53):

| Código | Cuándo |
|--------|--------|
| 401 `Token de autenticación requerido` | Falta la cabecera `Authorization` o no empieza con `Bearer ` |
| 401 `Token inválido o expirado` | `jwt.verify` falla (firma, formato o expiración) |
| 403 `No tiene permisos para esta acción` | Solo en rutas con `requireRole('ADMIN')`, si el rol del token no es `ADMIN` |
| 500 | JSON mal formado o cuerpo > 100 kB (en POST/PUT con JSON), vía `errorHandler` |

En las tablas, "Autenticado" significa cualquier rol (`ADMIN` o `ENCARGADO_BENEFICENCIA`) con token
válido; ninguna ruta usa `requireRole` con el rol `ENCARGADO_BENEFICENCIA`.

Ninguna ruta de la API valida que los parámetros `:id` sean UUID; si el valor no existe en la base de
datos la búsqueda devuelve `null` y la ruta responde 404 (o 500, donde se indica).

---

## 2. Endpoints por archivo de rutas

Abreviaturas de tablas: se usan los nombres reales de PostgreSQL (`@@map` en
backend/prisma/schema.prisma). "L" = lee, "E" = escribe. Toda escritura en `log_auditoria` la hace
`registrarAuditoria()` (backend/src/middleware/audit.ts, líneas 15–31).

### 2.1 `auth.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| POST | `/api/auth/login` | Público | — | `username` (string, obligatorio), `password` (string, obligatorio). Validación manual: solo se comprueba que ambos existan (sin tipo ni longitud). No usa Zod. | 200 `{ token, usuario: { id, username, nombreCompleto, rol, email } }`; 400 si falta alguno; 401 `Credenciales inválidas` si el usuario no existe, está inactivo o la contraseña no coincide (mismo mensaje en los tres casos); 500 error interno. | L `usuarios`; E `usuarios` (`ultimo_acceso`); E `log_auditoria` | Sí: `LOGIN`, entidad `usuario`, solo si el acceso es correcto. Los intentos fallidos no se registran. | backend/src/routes/auth.routes.ts, líneas 13–75 |
| GET | `/api/auth/perfil` | Autenticado | — | — | 200 `{ id, username, nombreCompleto, email, rol, ultimoAcceso, createdAt }`; 404 si el usuario del token ya no existe; 500. | L `usuarios` | No | backend/src/routes/auth.routes.ts, líneas 78–103 |

`GET /api/auth/perfil` no lo consume ninguna pantalla del frontend (búsqueda de `/auth/perfil` en
`frontend/src` sin resultados).

### 2.2 `usuarios.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/usuarios` | ADMIN | — | — | 200 arreglo de usuarios (sin `passwordHash`), orden `createdAt` desc, sin paginación; 500. | L `usuarios` | No | backend/src/routes/usuarios.routes.ts, líneas 11–31 |
| POST | `/api/usuarios` | ADMIN | — | `username` (obligatorio), `password` (obligatorio, **sin longitud mínima**), `nombreCompleto` (obligatorio), `rol` (obligatorio, **no se valida que sea un valor del enum**), `email` (opcional, sin validar formato). Validación manual de presencia; sin Zod. Contraseña con `bcrypt.hash(password, 12)`. | 201 usuario creado; 400 si falta un campo obligatorio; 409 si `username` ya existe; 500 (p. ej. `rol` fuera del enum o `email` duplicado, que es `@unique`). | L/E `usuarios`; E `log_auditoria` | Sí: `CREAR`, entidad `usuario` (`datosNuevos` sin contraseña) | backend/src/routes/usuarios.routes.ts, líneas 34–78 |
| PUT | `/api/usuarios/:id/toggle` | ADMIN | `:id` usuario | — | 200 `{ id, username, activo }`; 404 no existe; 400 si es la propia cuenta; 500. | L/E `usuarios`; E `log_auditoria` | Sí: `ACTIVAR` o `DESACTIVAR`, entidad `usuario` | backend/src/routes/usuarios.routes.ts, líneas 81–117 |
| PUT | `/api/usuarios/:id` | ADMIN | `:id` usuario | `nombreCompleto`, `email`, `rol`, todos opcionales. Solo se valida que `rol`, si viene, sea `ADMIN` o `ENCARGADO_BENEFICENCIA`. Sin validación de tipo de los demás. | 200 usuario actualizado; 400 rol inválido; 400 si el ADMIN intenta quitarse su propio rol; 404; 500 (p. ej. `email` duplicado). | L/E `usuarios`; E `log_auditoria` | Sí: `EDITAR`, entidad `usuario`, con valores anterior/nuevo | backend/src/routes/usuarios.routes.ts, líneas 121–168 |
| PUT | `/api/usuarios/:id/password` | ADMIN | `:id` usuario | `password` (string, obligatorio, **mínimo 6 caracteres**) | 200 `{ data: { id, message } }`; 400 si no cumple; 404; 500. | L/E `usuarios`; E `log_auditoria` | Sí: `EDITAR`, entidad `usuario`, `datosNuevos: { password: '***restablecida***' }` | backend/src/routes/usuarios.routes.ts, líneas 172–205 |

### 2.3 `catalogos.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/catalogos/medicamentos` | Autenticado | Query: `page` (≥1, def. 1), `limit` (1–100, def. 20), `q` (texto; busca en nombre genérico y comercial, sin distinguir mayúsculas) | — | 200 `{ data, pagination }` solo medicamentos `activo = true`, con categoría y códigos; 500. | L `medicamentos`, `categorias`, `codigos_barras` | No | backend/src/routes/catalogos.routes.ts, líneas 17–46 |
| GET | `/api/catalogos/medicamentos/buscar` | Autenticado | Query: `q` | — | 200 `{ data }` (máx. 20, activos); si `q` vacío → `{ data: [] }`; 500. | L `medicamentos`, `categorias`, `codigos_barras` | No | backend/src/routes/catalogos.routes.ts, líneas 49–76 |
| GET | `/api/catalogos/medicamentos/barcode/:codigo` | Autenticado | `:codigo` código de barras | — | 200 `{ data: { ...medicamento, stockActual } }` (suma de `cantidad_actual` de lotes `DISPONIBLE`); 404 código no registrado; 500. No filtra medicamentos inactivos. | L `codigos_barras`, `medicamentos`, `categorias`, `lotes` | No | backend/src/routes/catalogos.routes.ts, líneas 79–108 |
| GET | `/api/catalogos/medicamentos/lookup-fda/:codigoBarras` | Autenticado | `:codigoBarras` GTIN/EAN/UPC | — | Siempre 200: `{ found: true, ndcConsultado, nombreGenerico, nombreComercial, presentacion, concentracion, unidadMedida, categoriaSugerida }` o `{ found: false }` (también ante errores). Consulta externa `https://api.fda.gov/drug/label.json` con hasta 3 formatos de NDC y tiempo máximo de 5 s por intento. | Ninguna (servicio externo OpenFDA) | No | backend/src/routes/catalogos.routes.ts, líneas 121–211 |
| POST | `/api/catalogos/medicamentos` | ADMIN | — | Zod `medicamentoSchema`: `nombreGenerico` string mín. 2 (oblig.); `nombreComercial` string opcional/nulo; `presentacion` string mín. 1 (oblig.); `concentracion` string opcional/nulo; `unidadMedida` string mín. 1 (oblig.); `categoriaId` UUID (oblig.); `stockMinimo` entero ≥ 0 opcional (def. 10). Fuera del esquema: `forzarCreacion` (booleano, solo cuenta si es `true`). | 201 `{ data }`; **200** `{ advertencia: true, mensaje, similares }` si hay posibles duplicados (nombre genérico que contiene el texto + misma presentación + misma concentración) y no se envió `forzarCreacion`; 400 Zod; 400 categoría inexistente; 500. | L `categorias`, `medicamentos`; E `medicamentos`; E `log_auditoria` | Sí: `CREAR`, entidad `medicamento` | backend/src/routes/catalogos.routes.ts, líneas 213–292 |
| PUT | `/api/catalogos/medicamentos/:id` | ADMIN | `:id` medicamento | **Sin validación de tipos.** Se aceptan solo los campos de la lista `nombreGenerico, nombreComercial, presentacion, concentracion, unidadMedida, categoriaId, stockMinimo, activo`; se aplican los que cambian respecto al valor actual. Solo se valida que `categoriaId`, si viene, exista. | 200 `{ data }`; 200 `{ data, mensaje: 'No hubo cambios que aplicar' }`; 404; 400 categoría inexistente; 500 (p. ej. tipo incorrecto rechazado por Prisma). | L `medicamentos`, `categorias`; E `medicamentos`; E `log_auditoria` | Sí: `EDITAR`, entidad `medicamento`, solo los campos cambiados (anterior/nuevo). Desactivar (`activo:false`) también se registra como `EDITAR`. | backend/src/routes/catalogos.routes.ts, líneas 295–362 |
| POST | `/api/catalogos/medicamentos/:id/codigos` | ADMIN | `:id` medicamento | `codigo` (string no vacío, oblig.); `descripcion` (opcional, sin validar). Sin Zod. | 201 `{ data }`; 400 código vacío; 404 medicamento no existe; 409 código ya registrado; 500. | L `medicamentos`, `codigos_barras`; E `codigos_barras`; E `log_auditoria` | Sí: `CREAR`, entidad `codigo_barras` | backend/src/routes/catalogos.routes.ts, líneas 369–409 |
| DELETE | `/api/catalogos/codigos/:id` | ADMIN | `:id` código de barras | — | 200 `{ mensaje }`; 404; 500. **Borrado físico** (`delete`), no lógico. | L/E `codigos_barras`; E `log_auditoria` | Sí: `ELIMINAR`, entidad `codigo_barras` | backend/src/routes/catalogos.routes.ts, líneas 412–438 |
| GET | `/api/catalogos/categorias` | Autenticado | — | — | 200 `{ data }` solo `activo = true`, orden por nombre; 500. | L `categorias` | No | backend/src/routes/catalogos.routes.ts, líneas 445–456 |
| POST | `/api/catalogos/categorias` | ADMIN | — | `nombre` (string no vacío, oblig.); `descripcion` (opcional). Sin Zod. | 201 `{ data }`; 400; 409 nombre existente (comparación exacta, sensible a mayúsculas); 500. | L/E `categorias`; E `log_auditoria` | Sí: `CREAR`, entidad `categoria` | backend/src/routes/catalogos.routes.ts, líneas 459–492 |
| PUT | `/api/catalogos/categorias/:id` | ADMIN | `:id` categoría | `nombre`, `descripcion`, `activo`, todos opcionales. **Sin ninguna validación** (se acepta `nombre` vacío o de otro tipo). | 200 `{ data }`; 404; 500 (incluye nombre duplicado, que es `@unique`, en lugar de 409). | L/E `categorias`; E `log_auditoria` | Sí: `EDITAR`, entidad `categoria` (objeto completo anterior/nuevo) | backend/src/routes/catalogos.routes.ts, líneas 495–528 |
| GET | `/api/catalogos/ubicaciones` | Autenticado | — | — | 200 `{ data }` todas (el modelo no tiene `activo`), orden por código; 500. | L `ubicaciones` | No | backend/src/routes/catalogos.routes.ts, líneas 535–545 |
| POST | `/api/catalogos/ubicaciones` | ADMIN | — | `codigo` (string no vacío, oblig.); `descripcion` (opcional). Sin Zod. | 201 `{ data }`; 400; 409 código existente; 500. | L/E `ubicaciones`; E `log_auditoria` | Sí: `CREAR`, entidad `ubicacion` | backend/src/routes/catalogos.routes.ts, líneas 548–581 |
| PUT | `/api/catalogos/ubicaciones/:id` | ADMIN | `:id` ubicación | `codigo`, `descripcion`, opcionales. **Sin ninguna validación.** | 200 `{ data }`; 404; 500 (incluye código duplicado). | L/E `ubicaciones`; E `log_auditoria` | Sí: `EDITAR`, entidad `ubicacion` | backend/src/routes/catalogos.routes.ts, líneas 586–618 |
| POST | `/api/catalogos/medicamentos/:id/imagen` | ADMIN | `:id` medicamento | `multipart/form-data`, campo de archivo `imagen` (ver sección 3). | 200 `{ data }` con `imagenUrl`; 400 sin archivo; 404 medicamento no existe; 500 (incluye tipo no permitido o > 5 MB, vía `errorHandler`). | L/E `medicamentos`; E disco; E `log_auditoria` | Sí: `EDITAR`, entidad `medicamento` (`imagenUrl` anterior/nuevo) | backend/src/routes/catalogos.routes.ts, líneas 624–700 |

### 2.4 `inventario.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| POST | `/api/inventario/entradas` | Autenticado (ADMIN y ENCARGADO) | — | Zod `entradaSchema`: `observaciones` string opcional/nulo; `lotes` arreglo mín. 1 de: `medicamentoId` UUID (oblig.), `cantidad` entero > 0 (oblig.), `numeroLote` string no vacío (oblig.), `fechaVencimiento` string que empiece con `YYYY-MM-DD` (oblig.), `costoUnitario` número ≥ 0 opcional/nulo, `ubicacionId` UUID opcional/nulo. | 201 entrada con lotes; 400 Zod; 400 medicamento inexistente o inactivo; 400 ubicación inexistente; 500. Todo en una transacción. | L `medicamentos`, `ubicaciones`; E `entradas`, `lotes`; E `log_auditoria` | Sí: `CREAR`, entidad `entrada`, `datosNuevos: { lotes: n }` | backend/src/routes/inventario.routes.ts, líneas 23–44 y 50–128 |
| GET | `/api/inventario/entradas` | Autenticado | Query: `page` (def. 1), `pageSize` (1–100, def. 20) | — | 200 `{ data, pagination }` con usuario y número de lotes; 500. | L `entradas`, `usuarios`, `lotes` | No | backend/src/routes/inventario.routes.ts, líneas 134–160 |
| GET | `/api/inventario` | Autenticado | Query: `q`, `categoriaId`, `soloStockBajo` (`'true'`), `page`, `pageSize` (1–100) | — | 200 `{ data, pagination }` por medicamento activo: stock dispensable, número de lotes, próximo vencimiento, semáforo, `stockBajo`. Paginación en memoria. 500. | L `configuracion_sistema`, `medicamentos`, `categorias`, `lotes` | No | backend/src/routes/inventario.routes.ts, líneas 167–241 |
| GET | `/api/inventario/alertas` | Autenticado | — | — | 200 `{ data: { stockBajo, porVencer, vencidos, resumen } }`; 500. | L `configuracion_sistema`, `medicamentos`, `lotes`, `dispensaciones`, `beneficiarios` | No | backend/src/routes/inventario.routes.ts, líneas 247–351 |
| GET | `/api/inventario/medicamento/:id` | Autenticado | `:id` medicamento | — | 200 `{ data }` con todos los lotes (cualquier estado), semáforo y días para vencer; 404; 500. | L `configuracion_sistema`, `medicamentos`, `categorias`, `codigos_barras`, `lotes`, `ubicaciones`, `entradas` | No | backend/src/routes/inventario.routes.ts, líneas 357–417 |
| PUT | `/api/inventario/lotes/:id/baja` | ADMIN | `:id` lote | `motivo` (opcional; se usa solo si es string). Sin Zod. | 200 `{ data }`; 404; 409 ya dado de baja; 500. Se permite dar de baja lotes en cualquier otro estado (incluido `DISPONIBLE` y `AGOTADO`). | L/E `lotes`; E `log_auditoria` | Sí: `BAJA`, entidad `lote` (estado y cantidad anteriores; `motivo` en `datosNuevos`) | backend/src/routes/inventario.routes.ts, líneas 423–466 |
| GET | `/api/inventario/configuracion` | Autenticado | — | — | 200 `{ data: { rojo, amarillo } }` (por defecto 30/90 si no hay valor válido); 500. | L `configuracion_sistema` | No | backend/src/routes/inventario.routes.ts, líneas 472–480; backend/src/services/inventario.service.ts, líneas 14–35 |
| PUT | `/api/inventario/configuracion` | ADMIN | — | Zod `configSchema`: `rojo` entero > 0, `amarillo` entero > 0 (ambos oblig.); además `rojo < amarillo`. | 200 `{ data: { rojo, amarillo } }`; 400 Zod; 400 si `rojo >= amarillo`; 500. | L/E `configuracion_sistema`; E `log_auditoria` | Sí: `EDITAR`, entidad `configuracion` (sin `entidadId`) | backend/src/routes/inventario.routes.ts, líneas 486–546 |
| POST | `/api/inventario/importar-excel` | ADMIN | — | `multipart/form-data`, campo `archivo` (.xlsx, ver sección 3). Se exigen las 11 columnas `nombreGenerico, nombreComercial, presentacion, concentracion, unidadMedida, categoria, codigoBarras, cantidad, numeroLote, fechaVencimiento, ubicacion` (encabezados normalizados sin tildes ni mayúsculas). Validación manual por fila: obligatorios `nombreGenerico`, `presentacion`, `unidadMedida`, `categoria`, `numeroLote`; `cantidad` entero > 0; `fechaVencimiento` fecha de Excel, `YYYY-MM-DD` o `DD/MM/YYYY`. | 200 `{ data: { totalFilas, medicamentosCreados, medicamentosExistentes, categoriasCreadas, ubicacionesCreadas, codigosBarrasVinculados, lotesRegistrados, errores[], avisos[] } }` (las filas con error no detienen las demás); 400 sin archivo, archivo no .xlsx, sin filas de datos o columnas faltantes; 500 (archivo > 10 MB, vía `errorHandler`). Una transacción por fila. | L/E `categorias`, `ubicaciones`, `medicamentos`, `codigos_barras`; E `entradas`, `lotes`; E `log_auditoria` | Sí: `CREAR` por cada medicamento, categoría y ubicación creados y por cada entrada (una por fila). La vinculación de códigos de barras **no** se audita. | backend/src/routes/inventario.routes.ts, líneas 552–937 |
| GET | `/api/inventario/plantilla-excel` | ADMIN | — | — | 200 archivo `plantilla-importacion-medicamentos.xlsx` (hojas "Plantilla" e "Instrucciones"). La ruta no tiene `try/catch`. | Ninguna | No | backend/src/routes/inventario.routes.ts, líneas 943–1001 |

`PUT /api/inventario/configuracion` no tiene pantalla que lo use: la función
`actualizarConfiguracion` está definida en `frontend/src/api/inventario.ts` (líneas 65–68) pero no se
importa en ninguna página ni componente (búsqueda en `frontend/src/pages` y `components`).

### 2.5 `dispensacion.routes.ts`

Ninguna ruta de este archivo usa `requireRole`: todas están abiertas a cualquier usuario autenticado.
Los códigos 404/409 se deciden buscando texto dentro de `error.message`.

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/dispensacion/beneficiarios/buscar` | Autenticado | Query: `q`. Si `q` vacío → 50 más recientes; si son solo dígitos → DPI que **empieza con** `q` (máx. 20); si no → nombre que contiene `q` (máx. 20). Solo activos. | — | 200 `{ data }`; 500 con `error.message`. | L `beneficiarios` | No | backend/src/routes/dispensacion.routes.ts, líneas 24–32; backend/src/services/dispensacion.service.ts, líneas 12–43 |
| POST | `/api/dispensacion/beneficiarios` | Autenticado | — | `nombreCompleto` (oblig., mín. 3 caracteres tras `trim`); `dpi` (opcional; si viene, exactamente 13 dígitos); `telefono`, `direccion`, `observaciones` (opcionales, **sin validar**). Sin Zod; no se valida el tipo (un valor no string en `nombreCompleto` provoca 500). | 201 beneficiario; 400 nombre o DPI inválido; 409 DPI ya registrado; 500. | L/E `beneficiarios`; E `log_auditoria` | Sí: `CREAR`, entidad `Beneficiario` | backend/src/routes/dispensacion.routes.ts, líneas 35–71; dispensacion.service.ts, líneas 45–68 |
| GET | `/api/dispensacion/beneficiarios/:id` | Autenticado | `:id` beneficiario | — | 200 beneficiario con **todas** sus dispensaciones (usuario, fotos, detalle con snapshots); 404; 500. | L `beneficiarios`, `dispensaciones`, `usuarios`, `fotos_dispensacion`, `detalle_dispensaciones` | No | backend/src/routes/dispensacion.routes.ts, líneas 74–83; dispensacion.service.ts, líneas 70–97 |
| PUT | `/api/dispensacion/beneficiarios/:id` | Autenticado | `:id` beneficiario | `nombreCompleto` (opcional; si viene, mín. 3), `dpi` (opcional; si viene no vacío, 13 dígitos), `telefono`, `direccion`, `observaciones` (opcionales, sin validar). No permite cambiar `activo`. | 200 beneficiario; 400; 404; 409 DPI duplicado; 500. | L/E `beneficiarios`; L `dispensaciones` y relacionadas (lectura previa para auditoría); E `log_auditoria` | Sí: `EDITAR`, entidad `Beneficiario` (el `datosAnteriores` incluye todo el historial de dispensaciones) | backend/src/routes/dispensacion.routes.ts, líneas 86–126; dispensacion.service.ts, líneas 99–131 |
| POST | `/api/dispensacion/despachar` | Autenticado | — | `beneficiarioId` (oblig., sin validar formato); `items` arreglo no vacío de `{ medicamentoId (oblig.), cantidad (> 0) }` (no se valida que `cantidad` sea entero); `observaciones` (opcional). Sin Zod. | 201 `{ dispensacion, stockActualizado }`; 400 datos faltantes; 404 beneficiario o medicamento no encontrado o inactivo; 409 `Stock insuficiente ... Disponible: n`; 500 (incluye fallos de serialización de la transacción). Transacción `Serializable` con `SELECT ... FOR UPDATE` sobre `lotes` en orden FIFO por `fecha_vencimiento`. | L `beneficiarios`, `medicamentos`; L/E `lotes` (descuenta `cantidad_actual`, pasa a `AGOTADO` si llega a 0); E `dispensaciones`, `detalle_dispensaciones`; E `log_auditoria` | Sí: `DISPENSAR`, entidad `Dispensacion` (beneficiario, detalles, observaciones) | backend/src/routes/dispensacion.routes.ts, líneas 133–180; dispensacion.service.ts, líneas 151–274 |
| GET | `/api/dispensacion/historial` | Autenticado | Query: `fechaDesde`, `fechaHasta` (se lleva a 23:59:59.999), `beneficiarioId`, `page` (def. 1), `limit` (def. 20, **sin máximo**) | — | 200 `{ data, pagination }` de **todas** las dispensaciones (no filtra por usuario); 500. | L `dispensaciones`, `beneficiarios`, `usuarios`, `fotos_dispensacion`, `detalle_dispensaciones` | No | backend/src/routes/dispensacion.routes.ts, líneas 183–196; dispensacion.service.ts, líneas 280–341 |
| GET | `/api/dispensacion/stock/:medicamentoId` | Autenticado | `:medicamentoId` | — | 200 `{ stockTotal, vencimientoProximo, lotes }` (lotes `DISPONIBLE` con cantidad > 0, sin excluir los de fecha pasada); 500. | L `lotes` | No | backend/src/routes/dispensacion.routes.ts, líneas 199–207; dispensacion.service.ts, líneas 544–564 |
| POST | `/api/dispensacion/:id/generar-token` | Autenticado | `:id` dispensación | — | 200 `{ token, url: '/captura/<token>', expiraEn }` (reutiliza el vigente o crea/reemplaza uno); 404 dispensación no encontrada; 500. | L `dispensaciones`; L/E `tokens_captura`; E `log_auditoria` | Sí: `CREAR`, entidad `TokenCaptura`, `entidadId` = id de la dispensación (también cuando solo reutiliza el token vigente) | backend/src/routes/dispensacion.routes.ts, líneas 215–234; dispensacion.service.ts, líneas 387–423 |
| GET | `/api/dispensacion/:id/fotos` | Autenticado | `:id` dispensación | — | 200 `{ data: [{ id, tipo, imagenUrl, createdAt }] }` (vacío si no existe); 500. | L `fotos_dispensacion` | No | backend/src/routes/dispensacion.routes.ts, líneas 237–245; dispensacion.service.ts, líneas 425–431 |
| GET | `/api/dispensacion/:id` | Autenticado | `:id` dispensación | — | 200 dispensación con beneficiario completo, usuario, fotos y detalle (lote y medicamento); 404; 500. | L `dispensaciones`, `beneficiarios`, `usuarios`, `fotos_dispensacion`, `detalle_dispensaciones`, `lotes`, `medicamentos` | No | backend/src/routes/dispensacion.routes.ts, líneas 248–257; dispensacion.service.ts, líneas 343–364 |

`GET /api/dispensacion/historial` y `GET /api/dispensacion/:id` no los consume ninguna pantalla del
frontend (búsqueda de `/dispensacion/historial` y de llamadas a `/dispensacion/${id}` sin sufijo en
`frontend/src`; el historial que se muestra sale de `GET /beneficiarios/:id`).

### 2.6 `captura.routes.ts` (pública)

Estas rutas **no** llevan `authMiddleware` a propósito; la credencial es el token del QR (fuente:
backend/src/routes/captura.routes.ts, líneas 10–19; backend/src/server.ts, líneas 31–32).

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/captura/:token/info` | Público | `:token` token de captura | — | 200 `{ dispensacionId, beneficiario (nombre completo), fecha, expiraEn, fotosSubidas }`; 404 `Enlace inválido o expirado` si el token no existe, ya se usó o venció (mismo mensaje en los tres casos). | L `tokens_captura`, `dispensaciones`, `beneficiarios`, `fotos_dispensacion` | No | backend/src/routes/captura.routes.ts, líneas 38–47; dispensacion.service.ts, líneas 439–465 |
| POST | `/api/captura/:token/foto` | Público | `:token` | `multipart/form-data`: archivo `foto` (ver sección 3) y campo de texto `tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`} (oblig.). | 200 `{ success: true, dispensacionId, fotosSubidas, completo }`; 400 sin archivo; 400 tipo inválido; 404 token inválido/usado/vencido; **500** si el archivo no es JPG/PNG/WEBP o supera 5 MB (verificado para el tipo de archivo: el rechazo de `multer` llega a `errorHandler`); 500 otros. | L `tokens_captura`, `dispensaciones`, `beneficiarios`, `fotos_dispensacion`; E `fotos_dispensacion` (upsert por dispensación+tipo), E `tokens_captura` (`usado = true` al completar las 2 fotos); E disco | **No** | backend/src/routes/captura.routes.ts, líneas 23–35 y 50–87; dispensacion.service.ts, líneas 467–530 |

### 2.7 `reportes.routes.ts`

Parámetros de paginación comunes a los 6 GET: `page` y `limit` (enteros; `page` ≥ 1, `limit` entre 1
y 5000, por defecto 20) (fuente: backend/src/routes/reportes.routes.ts, líneas 22–25;
backend/src/services/reportes.service.ts, líneas 18–22). Las fechas `desde`/`hasta` se convierten con
`new Date(...)` sin validar formato.

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/reportes/dispensaciones` | Autenticado | Query: `desde`, `hasta`, `beneficiarioId`, `medicamentoId`, `page`, `limit` | — | 200 `{ data, pagination }` (beneficiario con DPI, usuario, medicamentos con snapshots y primer código de barras); 500. | L `dispensaciones`, `beneficiarios`, `usuarios`, `detalle_dispensaciones`, `medicamentos`, `codigos_barras` | No | reportes.routes.ts, líneas 28–44; reportes.service.ts, líneas 43–86 |
| GET | `/api/reportes/consumo-medicamentos` | Autenticado | Query: `desde`, `hasta`, `categoriaId`, `page`, `limit` | — | 200 `{ data, pagination }` ranking por cantidad dispensada; 500. | L `detalle_dispensaciones`, `dispensaciones`, `medicamentos`, `categorias` | No | reportes.routes.ts, líneas 47–62; reportes.service.ts, líneas 98–138 |
| GET | `/api/reportes/inventario-actual` | Autenticado | Query: `categoriaId`, `estado` (valor de `EstadoLote`), `page`, `limit` | — | 200 `{ data, pagination }` a nivel de lote; 400 estado inválido; 500. | L `configuracion_sistema`, `lotes`, `medicamentos`, `categorias`, `codigos_barras`, `ubicaciones` | No | reportes.routes.ts, líneas 65–85; reportes.service.ts, líneas 149–191 |
| GET | `/api/reportes/por-vencer` | Autenticado | Query: `dias` (entero > 0, def. 90), `page`, `limit` | — | 200 `{ data, pagination, umbralDias }` (lotes `DISPONIBLE` con stock que vencen entre hoy y hoy+`dias`); 500. | L `configuracion_sistema`, `lotes`, `medicamentos`, `codigos_barras`, `categorias`, `ubicaciones` | No | reportes.routes.ts, líneas 88–101; reportes.service.ts, líneas 201–247 |
| GET | `/api/reportes/entradas` | Autenticado | Query: `desde`, `hasta`, `page`, `limit` | — | 200 `{ data, pagination }` con totales de lotes, unidades y costo; 500. | L `entradas`, `usuarios`, `lotes`, `medicamentos` | No | reportes.routes.ts, líneas 104–119; reportes.service.ts, líneas 258–302 |
| GET | `/api/reportes/medicamentos-baja` | Autenticado | Query: `desde`, `hasta` (sobre `fecha_vencimiento`), `page`, `limit` | — | 200 `{ data, pagination, resumen: { totalUnidadesPerdidas, costoTotalEstimado } }` (lotes `VENCIDO` y `DADO_DE_BAJA`); 500. | L `lotes`, `medicamentos`, `categorias` | No | reportes.routes.ts, líneas 122–136; reportes.service.ts, líneas 319–365 |
| GET | `/api/reportes/exportar/:tipo/:formato` | ADMIN | `:tipo` ∈ {`dispensaciones`, `consumo`, `inventario`, `por-vencer`, `entradas`, `baja`}; `:formato` ∈ {`pdf`, `xlsx`}; query: los mismos filtros del reporte correspondiente (límite fijo de 5000 registros) | — | 200 archivo (`application/pdf` o `.xlsx`, `Content-Disposition: attachment; filename="<tipo>-<timestamp>.<ext>"`); 400 tipo o formato inválido; 500 (incluye `estado` inválido en `inventario`, que aquí no se valida). | Las del reporte correspondiente + L `configuracion_sistema` (`NOMBRE_FARMACIA`, solo PDF); E `log_auditoria` | Sí: `CREAR`, entidad `reporte`, `datosNuevos: { tipo, formato, filtros }` (sin `entidadId`) | reportes.routes.ts, líneas 142–441; reportes.service.ts, líneas 367–370 |

### 2.8 `auditoria.routes.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/auditoria` | ADMIN | Query: `page` (def. 1), `limit` (def. 50, **sin máximo**), `usuario` (id), `accion`, `entidad`, `desde`, `hasta`. Sin validación (un `accion` fuera del enum provoca 500). | — | 200 `{ data, pagination }` con `usuario { username, nombreCompleto }`, orden `createdAt` desc; 500. | L `log_auditoria`, `usuarios` | No | backend/src/routes/auditoria.routes.ts, líneas 9–63 |

### 2.9 `server.ts`

| Método | Ruta completa | Roles | Parámetros | Cuerpo | Respuestas | Tablas | Auditoría | Fuente |
|--------|---------------|-------|-----------|--------|------------|--------|-----------|--------|
| GET | `/api/health` | Público | — | — | 200 `{ status: 'ok', timestamp, environment }` (expone el valor de `NODE_ENV`). | Ninguna | No | backend/src/server.ts, líneas 37–43 |

---

## 3. Endpoints que suben o sirven archivos

| Endpoint | Dirección | Campo | Tipos permitidos | Límite | Dónde se guarda / de dónde sale | Fuente |
|----------|-----------|-------|------------------|--------|---------------------------------|--------|
| `POST /api/catalogos/medicamentos/:id/imagen` | Subida (ADMIN) | `imagen` | `image/jpeg`, `image/png`, `image/webp` (por `mimetype` declarado, sin inspeccionar el contenido) | 5 MB (`multer`, memoria) | `backend/uploads/medicamentos/<idMedicamento>.<jpg\|png\|webp>`; antes borra cualquier archivo previo del mismo medicamento. URL guardada: `/uploads/medicamentos/<archivo>` en `medicamentos.imagen_url`. | backend/src/routes/catalogos.routes.ts, líneas 624–700 |
| `POST /api/captura/:token/foto` | Subida (pública, con token) | `foto` + `tipo` | `image/jpeg`, `image/png`, `image/webp` (por `mimetype`) | 5 MB (`multer`, memoria) | `backend/uploads/dispensaciones/<idDispensacion>/<RECETA\|EVIDENCIA_ENTREGA>.<ext>`; borra el archivo previo del mismo tipo. URL guardada en `fotos_dispensacion.imagen_url`. | backend/src/routes/captura.routes.ts, líneas 23–33; backend/src/services/dispensacion.service.ts, líneas 374–380 y 482–530 |
| `POST /api/inventario/importar-excel` | Subida (ADMIN) | `archivo` | **Sin filtro de tipo**; el archivo se valida al abrirlo con `exceljs` (400 si no es .xlsx válido) | 10 MB (`multer`, memoria) | No se guarda en disco: se procesa en memoria. | backend/src/routes/inventario.routes.ts, líneas 552–555 y 692–716 |
| `GET /api/inventario/plantilla-excel` | Descarga (ADMIN) | — | `.xlsx` | — | Generado en memoria con `exceljs`. | backend/src/routes/inventario.routes.ts, líneas 943–1001 |
| `GET /api/reportes/exportar/:tipo/:formato` | Descarga (ADMIN) | — | `.pdf` (pdfkit) o `.xlsx` (exceljs) | Máx. 5000 registros | Generado en memoria. | backend/src/routes/reportes.routes.ts, líneas 157–158 y 377–441 |
| `GET /uploads/...` (estático) | Descarga | — | Cualquier archivo existente en `backend/uploads` | — | `express.static` sobre `backend/uploads` **sin autenticación**; accesible directamente en el puerto 3000 y a través del proxy `/uploads` de Vite (5173) o nginx (80). | backend/src/server.ts, línea 23; frontend/vite.config.ts, líneas 13–14; frontend/nginx.conf, líneas 28–32 |

La carpeta `backend/uploads` está montada como volumen del host (`./backend/uploads:/app/uploads:z`)
(fuente: docker-compose.yml, línea 40). Verificado en el contenedor `api`, 2026-09-25: solo contiene
`dispensaciones/.gitkeep` y `medicamentos/.gitkeep` (no hay fotos cargadas en este equipo).

Los errores de `multer` (tipo no permitido o tamaño excedido) no los captura la ruta: pasan al
`errorHandler` global y se responden como 500 (ver 1.3).
