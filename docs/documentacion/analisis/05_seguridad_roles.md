# 05 — Seguridad, roles y matriz de permisos

> Actualizado al commit bdf1187 el 2026-10-20 (extracción original: 194f8fb, 2026-09-25).

> Fase: Extracción, parte 2 de 4. Documento de hechos con fuente; no es texto final de la tesis.
> Fecha de extracción original: 2026-09-25; actualización: 2026-10-20. Complementa a `04_api.md`
> (detalle de cada endpoint).
> Las verificaciones en ejecución de esta versión se hicieron el 2026-10-20 contra los contenedores
> del equipo de desarrollo con el código de `bdf1187` (`NODE_ENV=development`), solo con peticiones
> que no modifican datos (`GET /api/health`, una petición con cabecera `Origin`, rutas sin token). No
> se hicieron intentos de login, para no alterar la bitácora ni los contadores de bloqueo.

---

## 1. Autenticación

### 1.1 Flujo de inicio de sesión

1. La pantalla de login llama a `login(username, password)` del contexto de autenticación, que envía
   `POST /api/auth/login` con `{ username, password }` (fuente: frontend/src/context/AuthContext.tsx,
   líneas 68–69).
2. **Capa 1 — límite por IP** (nuevo): antes de leer el cuerpo, el backend cuenta la solicitud para
   `req.ip`. Si la IP supera **20 solicitudes de login en una ventana fija de 10 minutos**, responde
   **429** con cabecera `Retry-After` (segundos restantes de la ventana) y el mensaje "Demasiadas
   solicitudes de inicio de sesión desde esta red…". Cuenta **toda** solicitud de login, correcta o
   no (fuente: backend/src/routes/auth.routes.ts, líneas 58–69; backend/src/middleware/ipRateLimit.ts,
   líneas 20–22 y 43–64).
3. Exige que `username` y `password` sean texto no vacío; si no, 400 (fuente: auth.routes.ts,
   líneas 73–79). Antes solo se comprobaba que existieran.
4. **Capa 2 — bloqueo por usuario+IP** (nuevo): si la combinación `username` (recortado y en
   minúsculas) + IP está bloqueada, responde **429** con `Retry-After` y "Demasiados intentos
   fallidos. Intente de nuevo en N minuto(s)", sin verificar credenciales (fuente: auth.routes.ts,
   líneas 81–90; backend/src/middleware/loginRateLimit.ts, líneas 24–26 y 41–52).
5. Busca el usuario por `username` (único). Si no existe **o** está inactivo, o si
   `bcrypt.compare` no coincide, se ejecuta `responderFallo` (fuente: auth.routes.ts, líneas
   92–105):
   - suma un fallo a la combinación usuario+IP; al llegar a **3 fallos** la bloquea **5 minutos**
     (fuente: loginRateLimit.ts, líneas 13–14 y 58–80);
   - si el usuario existe, registra la auditoría `LOGIN` con `datosNuevos = { exito: false, motivo,
     bloqueado, intentosRestantes }` e IP (fuente: auth.routes.ts, líneas 26–40);
   - responde **429** si con ese fallo quedó bloqueado, o **401** `{ error: 'Credenciales inválidas',
     intentosRestantes }` si no (líneas 42–52). El mensaje sigue sin distinguir usuario inexistente,
     inactivo o contraseña incorrecta.
6. Si es correcto: borra el contador de esa combinación usuario+IP (línea 108) y actualiza
   `usuarios.ultimo_acceso` (líneas 110–114).
7. Firma el JWT con `config.jwtSecret` y `expiresIn: config.jwtExpiresIn` (líneas 116–124).
8. Registra la auditoría `LOGIN` (entidad `usuario`, IP `req.ip`) (líneas 126–132).
9. Responde `{ token, usuario: { id, username, nombreCompleto, rol, email } }` (líneas 134–143).
10. El frontend guarda `token` en `localStorage['farmag_token']` y el objeto `usuario` en
    `localStorage['farmag_usuario']` (JSON), y actualiza el estado de React (fuente:
    frontend/src/context/AuthContext.tsx, líneas 70–76).

Características del mecanismo de límites (hechos del código):

| Aspecto | Límite por IP | Bloqueo por usuario+IP |
|---------|---------------|------------------------|
| Umbral | Más de 20 solicitudes (`MAX_INTENTOS_IP = 20`) | 3 fallos (`MAX_INTENTOS = 3`) |
| Duración | Ventana fija de 10 min (`VENTANA_IP_MS`) desde la primera solicitud | 5 min (`BLOQUEO_MS`) desde el tercer fallo |
| Qué cuenta | Toda solicitud de login de la IP | Solo los fallos; un login correcto reinicia el contador |
| Clave | `req.ip` | `username.trim().toLowerCase()` + `|` + IP |
| Respuesta | 429 + `Retry-After` | 429 + `Retry-After` |
| Almacenamiento | En memoria (`Map`); se pierde al reiniciar el backend | En memoria (`Map`); se pierde al reiniciar el backend |
| Fuente | backend/src/middleware/ipRateLimit.ts, líneas 1–22 y 43–64 | backend/src/middleware/loginRateLimit.ts, líneas 1–14, 24–26 y 58–83 |

Los fallos con un `username` inexistente cuentan para el bloqueo, pero **no** se auditan, porque
`log_auditoria.usuario_id` es una FK obligatoria (fuente: auth.routes.ts, líneas 18–21 y 26). La IP
que usan ambas capas depende de `trust proxy` (ver 7.1 y H-37). Las pruebas
backend/tests/loginRateLimit.test.ts y backend/tests/ipRateLimit.test.ts ejercen estos valores.

### 1.2 Hash y política de contraseñas

| Aspecto | Valor | Fuente |
|---------|-------|--------|
| Algoritmo | bcrypt, librería `bcryptjs` 2.4.3 (implementación en JavaScript) | backend/src/routes/usuarios.routes.ts, línea 2; versión de `npm ls` en `farmag_api`, 2026-10-20 |
| Costo (*salt rounds*) | **12** en la creación de usuarios, en el restablecimiento de contraseña y en el administrador inicial | backend/src/routes/usuarios.routes.ts, líneas 65 y 204; backend/prisma/seed.ts, línea 48 |
| Columna | `usuarios.password_hash` (`passwordHash`) | backend/prisma/schema.prisma, línea 23 |
| Longitud mínima al crear y al restablecer | **6** caracteres en ambos casos (antes solo al restablecer); se exige además que sea texto | backend/src/routes/usuarios.routes.ts, líneas 53–57 y 193–196 |
| Administrador inicial (seed) | Mínimo **8** caracteres y no puede ser uno de 6 valores conocidos (`PASSWORDS_INSEGUROS`); si no se define, se genera aleatoria (16 bytes en base64url) | backend/prisma/seed.ts, líneas 8, 27–43 |
| Complejidad, caducidad, historial | No existen reglas | Búsqueda en `backend/src` y `backend/prisma`: no hay otras validaciones de contraseña |
| Cambio de contraseña propio | No hay endpoint para que un usuario cambie su contraseña; solo un ADMIN restablece la de cualquier usuario (incluida la suya) con `PUT /usuarios/:id/password` | backend/src/routes/usuarios.routes.ts, líneas 186–221; backend/src/routes/auth.routes.ts (solo `login` y `perfil`) |
| Cambio obligatorio tras el primer inicio | No existe: el seed lo recomienda en un mensaje de consola, pero no hay campo ni control que lo exija | backend/prisma/seed.ts, líneas 16–20 y 61–67; backend/prisma/schema.prisma, líneas 19–37 → P-21 |

La contraseña nunca se devuelve en las respuestas: los `select` de `usuarios.routes.ts` y
`auth.routes.ts` excluyen `passwordHash`. Al restablecerla, la auditoría guarda
`{ password: '***restablecida***' }` (fuente: usuarios.routes.ts, línea 212). La contraseña aleatoria
del administrador inicial sí queda escrita en el registro de consola del contenedor (H-39).

Política resultante: tres reglas distintas conviven (6 caracteres para usuarios creados o
restablecidos desde la interfaz; 8 caracteres más lista de valores prohibidos para el administrador
inicial; ninguna regla de complejidad) → P-22. Relacionado con H-16.

### 1.3 Contenido del JWT

| Aspecto | Valor | Fuente |
|---------|-------|--------|
| Librería | `jsonwebtoken` 9.0.3 | backend/src/routes/auth.routes.ts, línea 3; versión en el contenedor |
| Algoritmo | HS256 (valor por defecto de `jwt.sign` con secreto de texto; no se especifica `algorithm`) | backend/src/routes/auth.routes.ts, líneas 116–124 |
| Claims propios | `userId`, `username`, `rol` | backend/src/routes/auth.routes.ts, líneas 117–121; backend/src/middleware/auth.ts, líneas 7–11 |
| Claims estándar | `iat` (lo agrega la librería) y `exp` (por `expiresIn`) | backend/src/routes/auth.routes.ts, línea 123 |
| Secreto | `process.env.JWT_SECRET`, **obligatorio**: si falta o está vacío el proceso termina con "Configuración inválida" (ya no existe el literal de respaldo). En producción, si contiene un valor de ejemplo o tiene menos de 16 caracteres, se advierte en consola y en `backups/ESTADO_ARRANQUE.txt`, y solo se aborta con `STRICT_SECRETS=true` | backend/src/config/env.ts, líneas 14–43 y 45–81 (ver H-03) |
| Expiración | `process.env.JWT_EXPIRES_IN` o `'8h'`; valor por defecto en Compose `${JWT_EXPIRES_IN:-8h}` | backend/src/config/env.ts, línea 87; docker-compose.yml, línea 40; .env.example, línea 29 |
| Uso del `rol` del token | Ya no se usa para autorizar: `authMiddleware` reemplaza `req.user` con los datos actuales de la base (ver 2.1) | backend/src/middleware/auth.ts, líneas 39–54 |

### 1.4 Almacenamiento y envío del token en el frontend

- Se guarda en `localStorage` (`farmag_token`), junto con una copia del usuario (`farmag_usuario`)
  (fuente: frontend/src/context/AuthContext.tsx, líneas 72–73).
- Al cargar la aplicación, `AuthProvider` lee el token y la copia del usuario y, **desde `bdf1187`,
  confirma el usuario con `GET /api/auth/perfil`**: reemplaza la copia local por la respuesta del
  servidor (incluido el rol) y la vuelve a guardar. Mientras la consulta no termina, `loading` es
  `true` y `ProtectedRoute` muestra "Cargando…" (fuente: AuthContext.tsx, líneas 28–66;
  frontend/src/App.tsx, líneas 24–40). Si la consulta falla con un error distinto de 401, se
  conserva la copia local.
- El interceptor de peticiones de Axios agrega `Authorization: Bearer <token>` a cada petición
  hecha con el cliente compartido (fuente: frontend/src/api/client.ts, líneas 11–17).
- La pantalla pública de captura usa otra instancia de Axios sin token ni interceptores (fuente:
  frontend/src/api/captura.ts, línea 48).
- Las fotos de evidencia se descargan con el cliente compartido como *blob* (componente nuevo
  `AuthImage`), porque una etiqueta `<img>` no puede enviar la cabecera `Authorization` (fuente:
  frontend/src/components/ui/AuthImage.tsx, líneas 12–37; frontend/src/pages/Beneficiarios.tsx,
  líneas 168–169 y 212–213).
- El token sigue siendo accesible a cualquier script de la página por estar en `localStorage`
  (H-19, pendiente en esa parte).

### 1.5 Expiración y cierre de sesión

- Cuando el backend responde **401** a cualquier petición del cliente compartido, el interceptor
  de respuestas borra `farmag_token` y `farmag_usuario` y redirige con
  `window.location.href = '/login'`, **excepto** si la petición es `/auth/login` (un 401 o 429 del
  login es un intento fallido o un bloqueo, no una sesión vencida) (fuente:
  frontend/src/api/client.ts, líneas 19–35; H-32). Una respuesta 403 no produce redirección.
- Mientras no se haga ninguna petición, la interfaz sigue mostrándose con los datos guardados aunque
  el token ya haya expirado (el frontend no revisa `exp`); la primera petición posterior provoca el
  401 y la redirección.
- **Cerrar sesión** solo borra `localStorage` en el navegador y navega a `/login` (fuente:
  frontend/src/context/AuthContext.tsx, líneas 79–84; frontend/src/components/layout/Layout.tsx,
  líneas 111–114). Sigue sin existir endpoint de *logout* ni lista de revocación: un token robado de
  una cuenta activa es válido hasta su `exp`. El valor `LOGOUT` del enum `AccionAuditoria` sigue sin
  usarse en el backend (búsqueda de `LOGOUT` en `backend/src` sin resultados), aunque el filtro de la
  página de Auditoría lo ofrece (frontend/src/pages/Auditoria.tsx, línea 25).
- **Desde `bdf1187`**, `authMiddleware` consulta la base en cada petición: un usuario desactivado
  recibe 401 "La cuenta ya no está activa. Inicie sesión nuevamente." en su siguiente petición, y un
  cambio de rol surte efecto de inmediato (fuente: backend/src/middleware/auth.ts, líneas 39–55;
  H-10, resuelto parcialmente).

---

## 2. Autorización

### 2.1 Middlewares

Definidos en `backend/src/middleware/auth.ts`:

| Middleware | Funcionamiento | Respuesta si falla | Líneas |
|------------|----------------|--------------------|--------|
| `authMiddleware` | Lee `Authorization`; exige el prefijo `Bearer `; toma el segundo segmento; `jwt.verify(token, config.jwtSecret)`. **Nuevo:** busca el usuario por `payload.userId` en la base; si no existe o `activo = false` → 401; si existe, guarda en `req.user` el `id`, `username` y **rol actuales de la base** (no los del token). Es asíncrono | 401 `Token de autenticación requerido` / 401 `Token inválido o expirado` / 401 `La cuenta ya no está activa…` / 500 `Error de autenticación` si falla la consulta | 21–60 |
| `requireRole(...roles)` | Si no hay `req.user` → 401; si `req.user.rol` no está en la lista → 403. Como `req.user` lo arma `authMiddleware` desde la base, el rol que se evalúa es el actual | 401 `No autenticado` / 403 `No tiene permisos para esta acción` | 62–76 |

### 2.2 Dónde se aplican

- Se aplican **por ruta**, no por *router* ni de forma global (cada `router.<método>` los lista).
- `requireRole` solo se usa con `'ADMIN'` (**21 rutas**; en `194f8fb` eran 20). Ninguna ruta
  restringe al rol `ENCARGADO_BENEFICENCIA`.
- Rutas sin ningún middleware de autenticación: `POST /api/auth/login`, `GET /api/health`,
  `GET /api/captura/:token/info`, `POST /api/captura/:token/foto` y los archivos estáticos
  `/uploads/medicamentos/*` (fuente: backend/src/routes/auth.routes.ts, línea 56;
  backend/src/server.ts, líneas 44–47 y 61–67; backend/src/routes/captura.routes.ts, líneas 40 y
  52–55). Las fotos de dispensación **ya no** están en esta lista.
- Todas las demás (**50 endpoints**, uno más que en `194f8fb`: `GET /dispensacion/:id/foto/:tipo`)
  llevan `authMiddleware` (fuente: `grep router.<método>` en backend/src/routes, 53 endpoints menos
  los 3 públicos).

Rutas con `requireRole('ADMIN')` (21):

| Archivo | Rutas |
|---------|-------|
| usuarios.routes.ts | `GET /`, `POST /`, `PUT /:id/toggle`, `PUT /:id`, `PUT /:id/password` (líneas 10, 33, 97, 137, 188) |
| catalogos.routes.ts | **`GET /medicamentos/lookup-fda/:codigoBarras` (nuevo)**, `POST /medicamentos`, `PUT /medicamentos/:id`, `POST /medicamentos/:id/codigos`, `DELETE /codigos/:id`, `POST /categorias`, `PUT /categorias/:id`, `POST /ubicaciones`, `PUT /ubicaciones/:id`, `POST /medicamentos/:id/imagen` (líneas 162–165, 230, 311, 382, 430, 478, 522, 576, 614, 678–681) |
| inventario.routes.ts | `PUT /lotes/:id/baja`, `PUT /configuracion`, `POST /importar-excel`, `GET /plantilla-excel` (líneas 447–450, 515–518, 690–693, 988–991) |
| reportes.routes.ts | `GET /exportar/:tipo/:formato` (líneas 379–382) |
| auditoria.routes.ts | `GET /` (línea 14) |

Además, hay reglas de negocio de autorización dentro de las rutas de usuarios: un ADMIN no puede
desactivar su propia cuenta ni quitarse su propio rol de administrador (fuente:
backend/src/routes/usuarios.routes.ts, líneas 107–110 y 153–157).

---

## 3. Roles

El enum `Rol` tiene dos valores (fuente: backend/prisma/schema.prisma, líneas 14–17):

| Rol | Descripción según lo que permite el código |
|-----|--------------------------------------------|
| `ADMIN` | Todo lo que puede hacer el encargado, más: gestionar usuarios (listar, crear, editar, activar/desactivar, restablecer contraseña), crear y editar medicamentos, categorías, ubicaciones, códigos de barras e imágenes de medicamentos, **consultar OpenFDA**, dar de baja lotes, cambiar los umbrales de vencimiento, importar inventario desde Excel y descargar la plantilla, exportar reportes a PDF/Excel y consultar la bitácora de auditoría. |
| `ENCARGADO_BENEFICENCIA` | Consultar catálogos e inventario; consultar los umbrales de vencimiento; registrar entradas manuales de inventario; registrar, buscar y editar beneficiarios; dispensar; consultar el historial de dispensaciones de todos los usuarios; generar el token de captura y ver las fotos de evidencia; consultar en la API los 6 reportes (sin exportarlos). Desde `bdf1187` ya **no** puede consultar OpenFDA. |

Según R-09, en la operación real se usa una cuenta ADMIN (H-23).

---

## 4. Matriz de permisos según el backend

L = lectura, E = escritura (crear, modificar o dar de baja), — = sin acceso (403 si hay sesión).
"Público" = accesible sin sesión. Las filas marcadas con **(cambio)** difieren de `194f8fb`.

| Módulo | Funcionalidad | Endpoint(s) | ADMIN | ENCARGADO_BENEFICENCIA | Sin sesión |
|--------|---------------|-------------|-------|------------------------|------------|
| Autenticación | Iniciar sesión (con límites por IP y por usuario+IP) **(cambio)** | `POST /auth/login` | E | E | Público |
| Autenticación | Ver perfil propio | `GET /auth/perfil` | L | L | — |
| Usuarios | Listar usuarios | `GET /usuarios` | L | — | — |
| Usuarios | Crear, editar, activar/desactivar, restablecer contraseña | `POST /usuarios`, `PUT /usuarios/:id`, `/toggle`, `/password` | E | — | — |
| Catálogos | Consultar medicamentos, búsqueda y código de barras | `GET /catalogos/medicamentos`, `/buscar`, `/barcode/:codigo` | L | L | — |
| Catálogos | Consulta en OpenFDA **(cambio)** | `GET /catalogos/medicamentos/lookup-fda/:codigo` | L | — | — |
| Catálogos | Crear y editar medicamentos (incl. desactivar) | `POST/PUT /catalogos/medicamentos` | E | — | — |
| Catálogos | Subir imagen de medicamento | `POST /catalogos/medicamentos/:id/imagen` | E | — | — |
| Catálogos | Agregar y eliminar códigos de barras | `POST /medicamentos/:id/codigos`, `DELETE /codigos/:id` | E | — | — |
| Catálogos | Consultar categorías y ubicaciones | `GET /catalogos/categorias`, `/ubicaciones` | L | L | — |
| Catálogos | Crear y editar categorías y ubicaciones | `POST/PUT /catalogos/categorias`, `/ubicaciones` | E | — | — |
| Inventario | Consultar existencias, detalle por medicamento y alertas | `GET /inventario`, `/medicamento/:id`, `/alertas` | L | L | — |
| Inventario | Registrar entrada manual | `POST /inventario/entradas` | E | E | — |
| Inventario | Historial de entradas | `GET /inventario/entradas` | L | L | — |
| Inventario | Dar de baja un lote | `PUT /inventario/lotes/:id/baja` | E | — | — |
| Inventario | Consultar umbrales de vencimiento | `GET /inventario/configuracion` | L | L | — |
| Inventario | Modificar umbrales de vencimiento | `PUT /inventario/configuracion` | E | — | — |
| Inventario | Importar Excel / descargar plantilla | `POST /inventario/importar-excel`, `GET /plantilla-excel` | E | — | — |
| Dispensación | Buscar y consultar beneficiarios (con historial) | `GET /dispensacion/beneficiarios/buscar`, `/:id` | L | L | — |
| Dispensación | Registrar y editar beneficiarios | `POST/PUT /dispensacion/beneficiarios` | E | E | — |
| Dispensación | Dispensar | `POST /dispensacion/despachar` | E | E | — |
| Dispensación | Historial y detalle de dispensaciones (de todos los usuarios) | `GET /dispensacion/historial`, `/:id` | L | L | — |
| Dispensación | Consultar stock para dispensar | `GET /dispensacion/stock/:id` | L | L | — |
| Dispensación | Generar token de captura / listar fotos | `POST /dispensacion/:id/generar-token`, `GET /:id/fotos` | E / L | E / L | — |
| Dispensación | Ver el archivo de una foto de evidencia **(cambio: nuevo endpoint)** | `GET /dispensacion/:id/foto/:tipo` | L | L | — (401) |
| Captura móvil | Ver datos de la captura y subir fotos | `GET /captura/:token/info`, `POST /captura/:token/foto` | (con token) | (con token) | Público con token válido |
| Evidencia | Archivos estáticos **(cambio)** | `GET /uploads/medicamentos/...` (fotos de producto); `/uploads/dispensaciones/...` ya no se sirve (404) | L | L | Público (solo medicamentos) |
| Reportes | Consultar los 6 reportes en pantalla | `GET /reportes/*` (6) | L | L | — |
| Reportes | Exportar PDF / Excel | `GET /reportes/exportar/:tipo/:formato` | L | — | — |
| Auditoría | Consultar bitácora | `GET /auditoria` | L | — | — |
| Sistema | Estado del servicio (incluye el valor de `NODE_ENV`) | `GET /health` | L | L | Público |

Verificado el 2026-10-20: `GET /api/dispensacion/x/foto/RECETA` sin token → 401;
`GET /uploads/dispensaciones/x/RECETA.webp` → 404; `GET /api/health` sin token → 200 con
`"environment":"development"`.

---

## 5. Control de acceso en el frontend

### 5.1 Mecanismos

- `ProtectedRoute`: mientras `loading` es `true` muestra "Cargando…"; si no hay `usuario` en el
  contexto, redirige a `/login` (fuente: frontend/src/App.tsx, líneas 24–40). Envuelve al `Layout` y
  a todas las rutas internas (líneas 51–82).
- `AdminRoute`: si `usuario.rol !== 'ADMIN'`, redirige a `/` (líneas 16–22). **Desde `bdf1187`** el
  `usuario` del contexto es el que devuelve `GET /auth/perfil` al cargar la aplicación o el de la
  respuesta del login, no solo la copia de `localStorage` (ver 1.4).
- Menú lateral: cada entrada tiene una lista `roles` y se filtra por el rol del usuario (fuente:
  frontend/src/components/layout/Layout.tsx, líneas 39–65 y 97–101; sin cambios).
- Dentro de las páginas, el indicador `isAdmin` (`usuario?.rol === 'ADMIN'`, fuente:
  frontend/src/context/AuthContext.tsx, línea 86) oculta botones de escritura.

### 5.2 Rutas y menú por rol

`App.tsx` y `Layout.tsx` no cambiaron entre `194f8fb` y `bdf1187` (fuente: `git diff --stat 194f8fb
bdf1187 -- frontend/src/App.tsx frontend/src/components/layout`).

| Ruta (App.tsx) | Protección | Menú (Layout.tsx) | ADMIN | ENCARGADO |
|----------------|-----------|-------------------|-------|-----------|
| `/login` | Pública | — | Sí | Sí |
| `/captura/:token` | Pública, fuera del Layout | — | Sí | Sí |
| `/` (Dashboard) | ProtectedRoute | Dashboard | Sí | Sí |
| `/dispensacion` | ProtectedRoute | Dispensación | Sí | Sí |
| `/beneficiarios` | ProtectedRoute | Beneficiarios | Sí | Sí |
| `/inventario` | ProtectedRoute | Inventario → Existencias | Sí | Sí |
| `/entradas` | ProtectedRoute | Inventario → Registrar entrada | Sí | Sí |
| `/catalogos` (y redirecciones `/medicamentos`, `/categorias`, `/ubicaciones`) | ProtectedRoute | Catálogos | Sí | Sí |
| `/reportes` | ProtectedRoute + AdminRoute | Reportes (solo ADMIN) | Sí | No |
| `/usuarios` | ProtectedRoute + AdminRoute | Administración → Usuarios (solo ADMIN) | Sí | No |
| `/auditoria` | ProtectedRoute + AdminRoute | Administración → Auditoría (solo ADMIN) | Sí | No |
| Cualquier otra | Redirige a `/` | — | — | — |

(fuente: frontend/src/App.tsx, líneas 45–84; frontend/src/components/layout/Layout.tsx, líneas 41–65)

Opciones ocultas al ENCARGADO dentro de páginas visibles para ambos roles (`isAdmin`):

| Página | Opción oculta | Fuente |
|--------|---------------|--------|
| Registrar entrada | Botón "Importar desde Excel"; botón "Nuevo medicamento" (abre `MedicamentoFormModal`, que incluye la consulta a OpenFDA) | frontend/src/pages/Entradas.tsx, líneas 212–218 y 255–264 |
| Inventario | Columna de acción para dar de baja un lote (el diálogo incluye ahora "Motivo (opcional)") | frontend/src/pages/Inventario.tsx, líneas 223, 229, 246 y 277–285 |
| Catálogos → Medicamentos | Acciones de edición y gestión de códigos de barras | frontend/src/pages/Catalogos/Medicamentos.tsx, líneas 201–228, 246, 325 y 334 |
| Catálogos → Categorías | Columna de acciones y botón de creación | frontend/src/pages/Catalogos/Categorias.tsx, líneas 87 y 107 |
| Catálogos → Ubicaciones | Columna de acciones y botón de creación | frontend/src/pages/Catalogos/Ubicaciones.tsx, líneas 75 y 88 |

### 5.3 Diferencias entre frontend y backend

Se compararon las secciones 4 y 5.2. Las funciones de escritura restringidas a ADMIN en el backend
coinciden con lo que el frontend oculta al ENCARGADO; no se encontró ninguna opción visible en el
frontend que el backend niegue al mismo rol. De las **3 diferencias** registradas en `194f8fb`,
**una se resolvió** (DF-02) y **dos siguen** (DF-01, DF-03):

| ID | Funcionalidad | Backend | Frontend | Tipo | Estado en `bdf1187` | Hallazgo |
|----|---------------|---------|----------|------|---------------------|----------|
| DF-01 | Consulta de los 6 reportes | `GET /reportes/*` accesibles para ambos roles (solo `authMiddleware`) (fuente: backend/src/routes/reportes.routes.ts, líneas 30, 48, 65, 88, 104 y 121) | Página `/reportes` y menú solo para ADMIN (fuente: frontend/src/App.tsx, línea 77; Layout.tsx, línea 55) | El backend permite al ENCARGADO algo que el frontend le oculta | **Sigue.** Según R-07, el defecto es la restricción del frontend | H-20 |
| DF-02 | Consulta en OpenFDA | `GET /catalogos/medicamentos/lookup-fda/:codigo` con `requireRole('ADMIN')` (fuente: backend/src/routes/catalogos.routes.ts, líneas 162–165) | Solo se usa en `MedicamentoFormModal`, que solo abre un ADMIN (fuente: frontend/src/components/MedicamentoFormModal.tsx, línea 91; Entradas.tsx, líneas 255–264; Medicamentos.tsx, línea 303) | — | **Resuelta** (commit `254d0f8`): backend y frontend coinciden | H-21 |
| DF-03 | Modificar umbrales de vencimiento | `PUT /inventario/configuracion` para ADMIN (fuente: backend/src/routes/inventario.routes.ts, líneas 515–565) | Ninguna pantalla la ofrece a ningún rol: `actualizarConfiguracion` no se usa (fuente: frontend/src/api/inventario.ts, línea 65) | Funcionalidad del backend sin interfaz | **Sigue.** `GET /inventario/configuracion` sí lo consume ahora Dispensación (H-28) | H-22 |

Observación general: en `194f8fb` el control del frontend dependía solo de la copia del usuario en
`localStorage`. Desde `bdf1187` esa copia se reemplaza con la respuesta de `GET /auth/perfil` al
cargar la aplicación (ver 1.4), y el backend decide siempre con el rol actual de la base (ver 2.1).
Modificar `localStorage` ya no basta para ver las páginas de ADMIN tras recargar (deducido del
código; no verificado en navegador). H-19 queda resuelto en esa parte y pendiente en el uso de
`localStorage` para el token.

---

## 6. Token de captura por QR

| Aspecto | Comportamiento | Fuente |
|---------|----------------|--------|
| Generación | `POST /api/dispensacion/:id/generar-token` (cualquier usuario autenticado). **Desde `bdf1187`** el token es `randomBytes(8).toString('base64url')` (11 caracteres, 64 bits); antes, `nanoid(10)`. Se guarda en `tokens_captura` (una fila por dispensación, `dispensacionId` único) | backend/src/services/dispensacion.service.ts, líneas 435–484 (token en línea 470); backend/prisma/schema.prisma, líneas 213–225 |
| Evidencia completa | **Nuevo:** si la dispensación ya tiene `RECETA` y `EVIDENCIA_ENTREGA`, no se genera token y la ruta responde 409 | dispensacion.service.ts, líneas 444–455; backend/src/routes/dispensacion.routes.ts, líneas 266–269 |
| Reutilización | Si ya existe un token vigente y no usado para esa dispensación, se devuelve el mismo; si venció o ya se usó (y la evidencia no está completa), se **reemplaza** por uno nuevo con `usado = false` (upsert) | dispensacion.service.ts, líneas 457–477 |
| Vigencia | 30 minutos desde la generación (`TOKEN_VIGENCIA_MIN = 30`) | dispensacion.service.ts, líneas 419 y 471 |
| Uso | Varios usos mientras esté vigente: cada subida hace *upsert* de la foto de ese tipo y borra el archivo anterior del mismo tipo. Se marca `usado = true` cuando existen las dos fotos; desde ese momento el token deja de servir y, por la regla anterior, ya no se puede obtener otro | dispensacion.service.ts, líneas 576–643 |
| Procesamiento de la imagen | **Nuevo:** se recodifica a WebP (lado máximo 1600 px, calidad 80) con `sharp`; un archivo que no sea una imagen decodificable se rechaza con 400 | dispensacion.service.ts, línea 588; backend/src/utils/imagen.ts, líneas 26–55; captura.routes.ts, líneas 85–90 |
| URL del QR | `<origen>/captura/<token>`, donde el origen es `window.location.origin` o, si se accede desde `localhost` y existe `VITE_LAN_IP`, `http://<VITE_LAN_IP>:<puerto>`. Viaja por HTTP (sin TLS) | frontend/src/pages/Dispensacion.tsx, líneas 466–479 |
| Endpoints sin sesión | `GET /api/captura/:token/info` (devuelve id de la dispensación, nombre del beneficiario, fecha, expiración y tipos de foto ya subidos) y `POST /api/captura/:token/foto` | backend/src/routes/captura.routes.ts, líneas 39–95; dispensacion.service.ts, líneas 500–526 |
| Validación | Token: existe, `usado = false` y `expiraEn > ahora`; si no, 404 con el mismo mensaje en los tres casos. `tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`}. Archivo JPG/PNG/WEBP según `mimetype`, máx. 5 MB. Sigue sin haber límite de peticiones por token ni por IP (riesgo que el equipo declara aceptado) | captura.routes.ts, líneas 23–35, 46–47 y 64–68; dispensacion.service.ts, líneas 515–517 y 582–584 |
| Auditoría | La generación del token (`CREAR`, entidad `TokenCaptura`) — se registra **siempre**, aunque se devuelva el token vigente sin crear nada (H-38). **Nuevo:** cada subida de foto (`CREAR`, entidad `FotoDispensacion`, `datosNuevos = { tipo, via: 'captura-token' }`), atribuida al usuario que hizo la dispensación y sin IP (H-35). No se auditan la marca `usado` ni el borrado de tokens vencidos | backend/src/routes/dispensacion.routes.ts, líneas 255–262; dispensacion.service.ts, líneas 619–640 y 646–651 |
| Limpieza | El mantenimiento diario (y al arrancar) borra los tokens con `expiraEn < ahora` | dispensacion.service.ts, líneas 646–651; backend/src/services/vencimiento.service.ts, líneas 31–37 |
| Archivos resultantes | **Cambio:** se guardan en `uploads/dispensaciones/<id>/<TIPO>.webp`, pero ya **no** se sirven estáticamente. Se entregan solo por `GET /api/dispensacion/:id/foto/:tipo` (con `authMiddleware`): valida `tipo` contra el enum (400), toma la ruta del registro en la base aplicando `path.basename` y comprobando que quede dentro de la carpeta raíz (sin *path traversal*), y responde con `Cache-Control: private, no-store`; 404 si no existe | backend/src/server.ts, líneas 44–47; dispensacion.routes.ts, líneas 284–308; dispensacion.service.ts, líneas 545–569; frontend/nginx.conf, líneas 39–47 |

---

## 7. Auditoría

### 7.1 Mecanismo

`registrarAuditoria(params)` inserta una fila en `log_auditoria` con `usuarioId`, `accion`,
`entidad`, `entidadId` (o `null`), `datosAnteriores`, `datosNuevos` (JSON) e `ipAddress` (o `null`).
Captura cualquier error y solo lo escribe en consola, sin interrumpir la operación (fuente:
backend/src/middleware/audit.ts, líneas 14–30). Desde `bdf1187` usa el cliente Prisma compartido
(línea 2). Se sigue invocando **después** de completar la operación y fuera de la transacción: si la
inserción falla, la operación queda hecha sin registro.

- **Usuario:** `req.user.userId` (que desde `bdf1187` proviene de la base, ver 2.1), salvo en el
  login (el id del usuario que intenta iniciar sesión) y en la subida de fotos por captura (el
  usuario que hizo la dispensación) (fuente: auth.routes.ts, líneas 26–39 y 126–132;
  dispensacion.service.ts, líneas 628–639).
- **IP:** `req.ip`. **Desde `bdf1187`** el backend configura `app.set('trust proxy', 1)`, por lo que
  `req.ip` es el último valor de `X-Forwarded-For` que envía el proxy (fuente:
  backend/src/server.ts, líneas 21–23). Vite lo envía con `xfwd: true` (frontend/vite.config.ts,
  líneas 12–15 y 20–23) y nginx con `X-Forwarded-For $proxy_add_x_forwarded_for`
  (frontend/nginx.conf, líneas 35 y 46). En `194f8fb` se guardaba la IP del contenedor `web` (H-18,
  resuelto). No se verificó en ejecución el valor guardado (no se hicieron operaciones que
  escriban en la bitácora). Efecto lateral: una petición directa al puerto 3000 puede falsear esa
  cabecera (H-37). La subida de fotos por captura no guarda IP (H-35).
- **Detalle:** depende de cada endpoint (ver tabla 7.2). En `PUT /catalogos/medicamentos/:id` solo se
  guardan los campos que cambiaron; en categorías y ubicaciones, el objeto completo anterior y nuevo.

### 7.2 Acciones del enum `AccionAuditoria` y dónde se registran

Enum (fuente: backend/prisma/schema.prisma, líneas 250–260):

| Acción | Endpoint(s) que la registran | Entidad |
|--------|------------------------------|---------|
| `LOGIN` | `POST /auth/login` — correcto, y **desde `bdf1187` también los fallidos** de usuarios existentes (incluidos inactivos), con `datosNuevos.exito = false` | `usuario` |
| `LOGOUT` | **Ninguno** (no se usa en el backend) | — |
| `CREAR` | `POST /usuarios`; `POST /catalogos/medicamentos`; `POST /catalogos/medicamentos/:id/codigos`; `POST /catalogos/categorias`; `POST /catalogos/ubicaciones`; `POST /inventario/entradas`; `POST /inventario/importar-excel` (medicamento, categoría, ubicación y entrada por fila); `POST /dispensacion/beneficiarios`; `POST /dispensacion/:id/generar-token`; **`POST /captura/:token/foto` (nuevo)**; `GET /reportes/exportar/:tipo/:formato` | `usuario`, `medicamento`, `codigo_barras`, `categoria`, `ubicacion`, `entrada`, `Beneficiario`, `TokenCaptura`, `FotoDispensacion`, `reporte` |
| `EDITAR` | `PUT /usuarios/:id`; `PUT /usuarios/:id/password`; `PUT /catalogos/medicamentos/:id`; `POST /catalogos/medicamentos/:id/imagen`; `PUT /catalogos/categorias/:id`; `PUT /catalogos/ubicaciones/:id`; `PUT /inventario/configuracion`; `PUT /dispensacion/beneficiarios/:id` | `usuario`, `medicamento`, `categoria`, `ubicacion`, `configuracion`, `Beneficiario` |
| `ELIMINAR` | `DELETE /catalogos/codigos/:id` | `codigo_barras` |
| `DISPENSAR` | `POST /dispensacion/despachar` | `Dispensacion` |
| `BAJA` | `PUT /inventario/lotes/:id/baja` — `datosNuevos` incluye `motivo`, que **desde `bdf1187` la interfaz permite escribir** (opcional) | `lote` |
| `ACTIVAR` / `DESACTIVAR` | `PUT /usuarios/:id/toggle` | `usuario` |

(fuente: 28 llamadas a `registrarAuditoria`: 27 en `backend/src/routes` y 1 en
backend/src/services/dispensacion.service.ts, línea 633; búsqueda de `entidad:` en backend/src;
backend/src/routes/inventario.routes.ts, líneas 454 y 474–481; frontend/src/pages/Inventario.tsx,
líneas 73 y 277–285.)

Los nombres de entidad siguen sin una sola convención (minúsculas con guion bajo en la mayoría;
`Beneficiario`, `Dispensacion`, `TokenCaptura` y `FotoDispensacion` con mayúscula inicial) (H-30).
La página de Auditoría ahora ofrece todas las entidades en su filtro y la comparación del backend no
distingue mayúsculas (fuente: frontend/src/pages/Auditoria.tsx, líneas 32–46;
backend/src/routes/auditoria.routes.ts, línea 48).

**Qué se registra ahora que antes no:**
- Intentos de login fallidos de usuarios existentes (con indicación de bloqueo e intentos
  restantes).
- Subida de fotos de evidencia por captura.
- El motivo de la baja de un lote, cuando el usuario lo escribe en la nueva casilla de la interfaz
  (el backend ya lo aceptaba).

Operaciones que modifican datos que **siguen sin** registro de auditoría:
- Marca `usado` del token de captura (fuente: dispensacion.service.ts, líneas 619–624).
- Cambio automático `DISPONIBLE → VENCIDO` (cron y arranque) y borrado de tokens vencidos (fuente:
  backend/src/services/vencimiento.service.ts, líneas 7–16 y 31–37).
- Vinculación de códigos de barras durante la importación de Excel (fuente:
  backend/src/routes/inventario.routes.ts, líneas 847–857).
- Actualización de `ultimo_acceso` en el login (queda implícita en el registro `LOGIN`).
- Intentos de login con un usuario inexistente (no auditables por la FK).

La bitácora solo se consulta (`GET /auditoria`, ADMIN); no hay endpoints para modificarla o borrarla.

---

## 8. Otras medidas

| Medida | ¿Existe? | Detalle | Fuente |
|--------|----------|---------|--------|
| Limitación de peticiones (*rate limiting*) | **Sí, solo en el login** | Dos capas en memoria (ver 1.1): 20 solicitudes / 10 min por IP y 3 fallos → 5 min por usuario+IP. No hay límite en las rutas públicas de captura ni en el resto de la API | backend/src/middleware/ipRateLimit.ts; backend/src/middleware/loginRateLimit.ts; backend/src/routes/auth.routes.ts, líneas 58–90 |
| Cabeceras de seguridad (`helmet`) | **Sí** | `app.disable('x-powered-by')` y `helmet()` con su configuración por defecto. Verificado con `curl -D -` el 2026-10-20 en `/api/health`: no hay `X-Powered-By`; se envían `Content-Security-Policy` (`default-src 'self'`…), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy: same-origin`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, entre otras | backend/src/server.ts, líneas 25–27 |
| Cabeceras del SPA | Solo en producción | nginx agrega `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y una CSP propia. El servidor de desarrollo de Vite no las envía (verificado: la respuesta de `/` en el puerto 5173 no las tiene) | frontend/nginx.conf, líneas 10–20; `curl` a `127.0.0.1:5173`, 2026-10-20 |
| CORS | Sí, **según el entorno** | Si `CORS_ORIGIN` tiene orígenes, solo esos; si está vacío: en `production` se desactiva CORS (`origin: false`), en cualquier otro entorno se refleja **cualquier** origen. Verificado en desarrollo: con `Origin: http://evil.example` la respuesta trae `Access-Control-Allow-Origin: http://evil.example`. `docker-compose.yml` no pasa `CORS_ORIGIN` al contenedor (H-40). La autenticación usa cabecera `Authorization`, no *cookies* | backend/src/server.ts, líneas 29–41; docker-compose.yml, líneas 32–49; docker-compose.prod.yml, línea 49 |
| *Trust proxy* | **Sí** (nuevo) | `app.set('trust proxy', 1)`: Express toma la IP del cliente del último salto de `X-Forwarded-For` (ver 7.1, H-18, H-37) | backend/src/server.ts, líneas 21–23 |
| Exposición de puertos | Reducida (nuevo) | `db` y `api` publicados solo en `127.0.0.1`; los usuarios entran por el puerto del frontend (verificado con `docker compose ps`) | docker-compose.yml, líneas 14–15 y 53–54 |
| HTTPS | **No** | El backend escucha en HTTP (`app.listen`); la especificación prevé acceso por HTTP en red local | backend/src/server.ts, línea 78; Espec. §2.2, línea 61 |
| Validación de entrada | Parcial, ampliada | Zod en 5 esquemas: `medicamentoSchema` (crear y, extendido y parcial, editar), `categoriaEditSchema`, `loteEntradaSchema`/`entradaSchema`, `configSchema`. Validaciones manuales de tipo en login, usuarios, beneficiarios, despacho y auditoría; utilidades `utils/validacion.ts` y `utils/fecha.ts`. Consultas Prisma parametrizadas; la única consulta SQL cruda usa `$queryRaw` con plantilla etiquetada (parametrizada) | backend/src/routes/catalogos.routes.ts, líneas 218–226, 317 y 513–526; inventario.routes.ts, líneas 33–44 y 510–520; dispensacion.service.ts, líneas 213–222; H-15 |
| Manejo de errores | **Sí, centralizado** (ver tabla siguiente) | — | backend/src/middleware/errorHandler.ts; backend/src/utils/httpError.ts |
| Límite de tamaño del cuerpo | Sí | JSON: 100 kB (valor por defecto de `express.json()`; un cuerpo mayor responde 413). Archivos: 5 MB (imágenes) y 10 MB (Excel) | backend/src/server.ts, línea 43; errorHandler.ts, líneas 35–39; catalogos.routes.ts, línea 664; captura.routes.ts, línea 25; inventario.routes.ts, línea 578 |
| Protección de datos personales | Parcial | El DPI y los datos del beneficiario son visibles para cualquier usuario autenticado. Las fotos de recetas **ya no** se sirven sin autenticación (H-11 resuelto) | backend/src/services/dispensacion.service.ts; backend/src/server.ts, líneas 44–47 |
| Secretos | Ver H-03 | Sin secreto JWT de respaldo en el código; `docker-compose.yml` conserva valores por defecto versionados para `DB_PASSWORD` y `JWT_SECRET`, y en producción solo se advierte salvo `STRICT_SECRETS=true` | backend/src/config/env.ts, líneas 35–81; docker-compose.yml, líneas 8, 38–39 y 116 |
| Credencial inicial | Nueva | Ya no hay contraseña de administrador fija; ver 1.2 y H-39 | backend/prisma/seed.ts, líneas 13–71 |

### 8.1 Manejo de errores (`errorHandler` y `httpError`)

Dos mecanismos complementarios (commits `254d0f8`, `b25c06e`):

| Mecanismo | Dónde se usa | Comportamiento | Fuente |
|-----------|--------------|----------------|--------|
| `errorHandler` (middleware global, registrado al final de `server.ts`) | Errores no capturados por las rutas y errores de `body-parser` y `multer` | `ZodError` → 400 `{ error: 'Datos inválidos', detalles }`; JSON mal formado (`entity.parse.failed`) → 400; cuerpo demasiado grande (`entity.too.large`) → 413; `MulterError` → 400 ("El archivo supera el tamaño máximo permitido" o "Archivo no válido"); cualquier error con `status` 4xx → ese código con su mensaje; el resto → 500 `{ error: 'Error interno del servidor', mensaje }`, donde `mensaje` solo se incluye si `NODE_ENV === 'development'` | backend/src/middleware/errorHandler.ts, líneas 9–64; backend/src/server.ts, línea 75 |
| `responderError(res, error, reglas)` (utilidad, nuevo) | `catch` de las rutas de dispensación y auditoría, entre otras | Primero aplica reglas de negocio por coincidencia de texto (p. ej. "Stock insuficiente" → 409, "no encontrada" → 404); luego errores con `status` 4xx propio; Prisma `P2002` (único duplicado) → 409 "Ya existe un registro con el mismo …"; `P2025` → 404; el resto → 500 con `mensaje` solo en desarrollo | backend/src/utils/httpError.ts, líneas 16–51; backend/src/routes/dispensacion.routes.ts, líneas 266–269 y 317 |
| Ruta inexistente | Toda la API | 404 JSON `{ error: 'Ruta no encontrada' }` (verificado con `curl`, 2026-10-20) | backend/src/server.ts, líneas 69–72 |

Varias rutas conservan su propio `catch` que responde 500 sin pasar por estos mecanismos (p. ej.
`usuarios.routes.ts`, líneas 90–93 y 180–183; `auth.routes.ts`, líneas 144–147); en ellas un
duplicado de `email` sigue terminando en 500 (H-15, resuelto parcialmente). El detalle interno de
los 500 se muestra mientras `NODE_ENV=development`, que es el valor por defecto de
`docker-compose.yml` y el verificado en el equipo de desarrollo (H-07, H-36).

---

## Cambios respecto a la versión 194f8fb

Tabla 1.
Cambios de seguridad, roles y auditoría entre `194f8fb` y `bdf1187`

| Tema | Antes (194f8fb) | Ahora (bdf1187) | Commit | Hallazgo relacionado |
|------|-----------------|-----------------|--------|----------------------|
| Límite de intentos de login | No existía | Bloqueo 3 fallos → 5 min por usuario+IP | `254d0f8`, `40d16fa` | H-09 |
| Límite de login por IP | No existía | 20 solicitudes / 10 min por IP | `b25c06e` | H-09, H-37 |
| Auditoría del login fallido | No se registraba | `LOGIN` con `exito: false` para usuarios existentes | `254d0f8` | H-09 |
| Validación del cuerpo del login | Solo presencia | Tipo texto y no vacío | `254d0f8` | H-15 |
| Secreto JWT | Respaldo `'fallback_secret'` en `env.ts` | Obligatorio; aviso (o aborto con `STRICT_SECRETS`) si es de ejemplo en producción | `254d0f8`, `a274f5f` | H-03 |
| `authMiddleware` | Solo firma y expiración del JWT | Consulta usuario, `activo` y rol actual en cada petición | `254d0f8` | H-10 |
| Rol en el frontend | Copia de `localStorage` sin validar | Confirmado con `GET /auth/perfil` al cargar | `254d0f8` | H-19 |
| 401 del login en el frontend | Recargaba la página | Excluido del interceptor | `254d0f8` | H-32 |
| OpenFDA | Abierto a ambos roles (DF-02) | Solo ADMIN | `254d0f8` | H-21 |
| Fotos de evidencia | Públicas en `/uploads/dispensaciones` | Endpoint autenticado `GET /dispensacion/:id/foto/:tipo`, sin *path traversal*, `no-store`; frontend con `AuthImage` | `254d0f8` | H-11, D-23 |
| Reemplazo de fotos completas | Posible regenerando el token | 409: no se genera token si la evidencia está completa | `254d0f8` | H-14 |
| Auditoría de fotos por captura | No se registraba | `CREAR` `FotoDispensacion` | `254d0f8` | H-14, H-35, D-18 |
| Token de captura | `nanoid(10)` | `randomBytes(8)` base64url (11 caracteres) | `dd8e723` | — |
| Imágenes subidas | Se guardaban tal cual | Recodificadas a WebP con `sharp`; imagen inválida → 400 | `b25c06e`, `254d0f8` | — |
| Cabeceras HTTP | `X-Powered-By: Express`, sin `helmet` | `helmet()` y sin `X-Powered-By`; cabeceras de nginx en producción | `254d0f8` | H-17 |
| CORS | `cors()` abierto a cualquier origen | Lista `CORS_ORIGIN`; desactivado en producción si está vacía; abierto en desarrollo | `254d0f8`, `a274f5f` | H-17, H-40 |
| IP de auditoría | IP del contenedor `web` | `trust proxy 1` + `X-Forwarded-For` (Vite `xfwd`, nginx) | `254d0f8`, `a274f5f` | H-18, H-37 |
| Puertos de `db` y `api` | Todas las interfaces | Solo `127.0.0.1` | `254d0f8` | H-04 |
| Manejo de errores | `errorHandler` devolvía 500 para errores del cliente; dispensación exponía `error.message` siempre | `errorHandler` con 400/413 para errores del cliente; `responderError` con 409/404 y Prisma `P2002`/`P2025`; 404 JSON; detalle solo en desarrollo | `254d0f8`, `b25c06e` | H-07, H-12, H-13, H-15 |
| Política de contraseñas | Mínimo 6 solo al restablecer; admin inicial con contraseña fija | Mínimo 6 al crear y restablecer; admin inicial con mínimo 8 + lista prohibida, o aleatoria | `254d0f8`, `a274f5f` | H-16, H-39, H-41 |
| Matriz de permisos | 20 rutas ADMIN, 49 autenticadas | 21 rutas ADMIN (OpenFDA), 50 autenticadas (foto de evidencia) | `254d0f8` | H-21 |
| Diferencias frontend/backend | DF-01, DF-02, DF-03 | DF-01 y DF-03 siguen; DF-02 resuelta | `254d0f8` | H-20, H-21, H-22 |
| Motivo de baja | El backend lo aceptaba; la interfaz no lo enviaba | Casilla opcional en la interfaz; se guarda en la auditoría | `254d0f8` | H-27, D-27 |

Fuente: Elaboración propia.
