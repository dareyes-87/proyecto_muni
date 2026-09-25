# 05 — Seguridad, roles y matriz de permisos

> Fase: Extracción, parte 2 de 4. Documento de hechos con fuente; no es texto final de la tesis.
> Fecha de extracción: 2026-09-25. Complementa a `04_api.md` (detalle de cada endpoint).
> Las verificaciones en ejecución se hicieron el 2026-09-25 contra los contenedores del equipo de
> desarrollo (`NODE_ENV=development`), solo con peticiones que no modifican datos.

---

## 1. Autenticación

### 1.1 Flujo de inicio de sesión

1. La pantalla de login llama a `login(username, password)` del contexto de autenticación, que envía
   `POST /api/auth/login` con `{ username, password }` (fuente: frontend/src/context/AuthContext.tsx,
   líneas 39–41).
2. El backend exige que vengan ambos campos; si falta alguno responde 400 (fuente:
   backend/src/routes/auth.routes.ts, líneas 15–20).
3. Busca el usuario por `username` (único). Si no existe **o** está inactivo (`activo = false`)
   responde 401 `Credenciales inválidas` (líneas 22–29).
4. Compara la contraseña con `bcrypt.compare(password, usuario.passwordHash)`; si no coincide,
   401 con el mismo mensaje (líneas 31–35). El mensaje no distingue usuario inexistente, inactivo o
   contraseña incorrecta.
5. Actualiza `usuarios.ultimo_acceso` con la fecha actual (líneas 37–41).
6. Firma el JWT con `config.jwtSecret` y `expiresIn: config.jwtExpiresIn` (líneas 43–51).
7. Registra la auditoría `LOGIN` (entidad `usuario`, IP `req.ip`) (líneas 53–59).
8. Responde `{ token, usuario: { id, username, nombreCompleto, rol, email } }` (líneas 61–70).
9. El frontend guarda `token` en `localStorage['farmag_token']` y el objeto `usuario` en
   `localStorage['farmag_usuario']` (JSON), y actualiza el estado de React (fuente:
   frontend/src/context/AuthContext.tsx, líneas 42–47).

No hay límite de intentos, bloqueo de cuenta ni retardo tras fallos (no existe código para ello en
`auth.routes.ts` ni un middleware de *rate limiting* en `server.ts`). Los intentos fallidos no se
registran en auditoría.

### 1.2 Hash de contraseñas

| Aspecto | Valor | Fuente |
|---------|-------|--------|
| Algoritmo | bcrypt, librería `bcryptjs` 2.4.3 (implementación en JavaScript) | backend/src/routes/usuarios.routes.ts, línea 3; versión en `node_modules/bcryptjs/package.json` del contenedor `api` |
| Costo (*salt rounds*) | **12** en la creación de usuarios, en el restablecimiento de contraseña y en el usuario semilla | backend/src/routes/usuarios.routes.ts, líneas 49 y 188; backend/prisma/seed.ts, línea 17 |
| Columna | `usuarios.password_hash` (`passwordHash`) | backend/prisma/schema.prisma, línea 23 |
| Longitud mínima | Solo se exige (6 caracteres) al restablecer; al crear un usuario no hay mínimo | backend/src/routes/usuarios.routes.ts, líneas 38 y 177 |

La contraseña nunca se devuelve en las respuestas: los `select` de `usuarios.routes.ts` y
`auth.routes.ts` excluyen `passwordHash`.

### 1.3 Contenido del JWT

| Aspecto | Valor | Fuente |
|---------|-------|--------|
| Librería | `jsonwebtoken` 9.0.3 | backend/src/routes/auth.routes.ts, línea 4; versión en el contenedor |
| Algoritmo | HS256 (valor por defecto de `jwt.sign` con secreto de texto; no se especifica `algorithm`) | backend/src/routes/auth.routes.ts, líneas 43–51 |
| Claims propios | `userId`, `username`, `rol` | backend/src/routes/auth.routes.ts, líneas 44–48; backend/src/middleware/auth.ts, líneas 6–10 |
| Claims estándar | `iat` (lo agrega la librería) y `exp` (por `expiresIn`) | backend/src/routes/auth.routes.ts, línea 50 |
| Secreto | `process.env.JWT_SECRET` o, si no está definido, el literal `'fallback_secret'` (ver H-03) | backend/src/config/env.ts, línea 4 |
| Expiración | `process.env.JWT_EXPIRES_IN` o `'8h'`; valor por defecto en Compose `${JWT_EXPIRES_IN:-8h}`. Verificado en el contenedor `api`: `JWT_EXPIRES_IN=8h`. | backend/src/config/env.ts, línea 5; docker-compose.yml, línea 31; .env.example, línea 9 |

### 1.4 Almacenamiento y envío del token en el frontend

- Se guarda en `localStorage` (`farmag_token`), junto con una copia del usuario (`farmag_usuario`)
  (fuente: frontend/src/context/AuthContext.tsx, líneas 43–44).
- Al cargar la aplicación, `AuthProvider` lee ambos valores de `localStorage` y, si existen, los da
  por válidos sin consultar al servidor (no llama a `/api/auth/perfil`) (líneas 28–37).
- El interceptor de peticiones de Axios agrega `Authorization: Bearer <token>` a cada petición
  hecha con el cliente compartido (fuente: frontend/src/api/client.ts, líneas 11–17).
- La pantalla pública de captura usa otra instancia de Axios sin token ni interceptores (fuente:
  frontend/src/api/captura.ts, líneas 44–48).

### 1.5 Expiración y cierre de sesión

- Cuando el backend responde **401** a cualquier petición del cliente compartido (token expirado,
  inválido o ausente), el interceptor de respuestas borra `farmag_token` y `farmag_usuario` y
  redirige con `window.location.href = '/login'` (fuente: frontend/src/api/client.ts, líneas 20–30).
  Una respuesta 403 no produce redirección.
- Mientras no se haga ninguna petición, la interfaz sigue mostrándose con los datos guardados aunque
  el token ya haya expirado (el frontend no revisa `exp`).
- **Cerrar sesión** solo borra `localStorage` en el navegador y navega a `/login` (fuente:
  frontend/src/context/AuthContext.tsx, líneas 50–55; frontend/src/components/layout/Layout.tsx,
  líneas 111–114). No existe endpoint de *logout* ni lista de revocación: el token sigue siendo
  válido en el backend hasta su `exp`. El valor `LOGOUT` del enum `AccionAuditoria` no se usa en el
  backend (búsqueda de `LOGOUT` en `backend/src` sin resultados).
- `authMiddleware` solo verifica firma y expiración; **no** consulta la base de datos, por lo que un
  usuario desactivado o al que se le cambió el rol conserva el acceso y el rol anteriores hasta que
  expire su token (fuente: backend/src/middleware/auth.ts, líneas 28–36).

---

## 2. Autorización

### 2.1 Middlewares

Definidos en `backend/src/middleware/auth.ts`:

| Middleware | Funcionamiento | Respuesta si falla | Líneas |
|------------|----------------|--------------------|--------|
| `authMiddleware` | Lee `Authorization`; exige el prefijo `Bearer `; toma el segundo segmento; `jwt.verify(token, config.jwtSecret)`; guarda el *payload* en `req.user`. | 401 `Token de autenticación requerido` / 401 `Token inválido o expirado` | 20–37 |
| `requireRole(...roles)` | Si no hay `req.user` → 401; si `req.user.rol` no está en la lista → 403. El rol se toma **del token**, no de la base de datos. | 401 `No autenticado` / 403 `No tiene permisos para esta acción` | 39–53 |

### 2.2 Dónde se aplican

- Se aplican **por ruta**, no por *router* ni de forma global (cada `router.<método>` los lista).
- `requireRole` solo se usa con `'ADMIN'` (20 rutas). Ninguna ruta restringe al rol
  `ENCARGADO_BENEFICENCIA`.
- Rutas sin ningún middleware de autenticación: `POST /api/auth/login`, `GET /api/health`,
  `GET /api/captura/:token/info`, `POST /api/captura/:token/foto` y los archivos estáticos
  `/uploads/*` (fuente: backend/src/routes/auth.routes.ts, línea 13; backend/src/server.ts,
  líneas 23 y 37; backend/src/routes/captura.routes.ts, líneas 38 y 50–53).
- Todas las demás (49 endpoints) llevan `authMiddleware`.

Rutas con `requireRole('ADMIN')` (20):

| Archivo | Rutas |
|---------|-------|
| usuarios.routes.ts | `GET /`, `POST /`, `PUT /:id/toggle`, `PUT /:id`, `PUT /:id/password` (líneas 11, 34, 81, 121, 172) |
| catalogos.routes.ts | `POST /medicamentos`, `PUT /medicamentos/:id`, `POST /medicamentos/:id/codigos`, `DELETE /codigos/:id`, `POST /categorias`, `PUT /categorias/:id`, `POST /ubicaciones`, `PUT /ubicaciones/:id`, `POST /medicamentos/:id/imagen` (líneas 225, 306, 369, 412, 459, 495, 548, 586, 644–647) |
| inventario.routes.ts | `PUT /lotes/:id/baja`, `PUT /configuracion`, `POST /importar-excel`, `GET /plantilla-excel` (líneas 423–426, 491–494, 692–695, 943–946) |
| reportes.routes.ts | `GET /exportar/:tipo/:formato` (líneas 377–380) |
| auditoria.routes.ts | `GET /` (línea 9) |

Además, hay reglas de negocio de autorización dentro de las rutas de usuarios: un ADMIN no puede
desactivar su propia cuenta ni quitarse su propio rol de administrador (fuente:
backend/src/routes/usuarios.routes.ts, líneas 91–94 y 137–141).

---

## 3. Roles

El enum `Rol` tiene dos valores (fuente: backend/prisma/schema.prisma, líneas 14–17):

| Rol | Descripción según lo que permite el código |
|-----|--------------------------------------------|
| `ADMIN` | Todo lo que puede hacer el encargado, más: gestionar usuarios (listar, crear, editar, activar/desactivar, restablecer contraseña), crear y editar medicamentos, categorías, ubicaciones, códigos de barras e imágenes de medicamentos, dar de baja lotes, cambiar los umbrales de vencimiento, importar inventario desde Excel y descargar la plantilla, exportar reportes a PDF/Excel y consultar la bitácora de auditoría. |
| `ENCARGADO_BENEFICENCIA` | Consultar catálogos e inventario; registrar entradas manuales de inventario; registrar, buscar y editar beneficiarios; dispensar; consultar el historial de dispensaciones de todos los usuarios; generar el token de captura y ver las fotos de evidencia; consultar en la API los 6 reportes (sin exportarlos) y el autocompletado de OpenFDA. |

---

## 4. Matriz de permisos según el backend

L = lectura, E = escritura (crear, modificar o dar de baja), — = sin acceso (403).
"Público" = accesible sin sesión.

| Módulo | Funcionalidad | Endpoint(s) | ADMIN | ENCARGADO_BENEFICENCIA | Sin sesión |
|--------|---------------|-------------|-------|------------------------|------------|
| Autenticación | Iniciar sesión | `POST /auth/login` | E | E | Público |
| Autenticación | Ver perfil propio | `GET /auth/perfil` | L | L | — |
| Usuarios | Listar usuarios | `GET /usuarios` | L | — | — |
| Usuarios | Crear, editar, activar/desactivar, restablecer contraseña | `POST /usuarios`, `PUT /usuarios/:id`, `/toggle`, `/password` | E | — | — |
| Catálogos | Consultar medicamentos, búsqueda y código de barras | `GET /catalogos/medicamentos`, `/buscar`, `/barcode/:codigo` | L | L | — |
| Catálogos | Consulta en OpenFDA | `GET /catalogos/medicamentos/lookup-fda/:codigo` | L | L | — |
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
| Dispensación | Generar token de captura / ver fotos | `POST /dispensacion/:id/generar-token`, `GET /:id/fotos` | E / L | E / L | — |
| Captura móvil | Ver datos de la captura y subir fotos | `GET /captura/:token/info`, `POST /captura/:token/foto` | (con token) | (con token) | Público con token válido |
| Evidencia | Ver archivos de fotos e imágenes | `GET /uploads/...` | L | L | Público |
| Reportes | Consultar los 6 reportes en pantalla | `GET /reportes/*` (6) | L | L | — |
| Reportes | Exportar PDF / Excel | `GET /reportes/exportar/:tipo/:formato` | L | — | — |
| Auditoría | Consultar bitácora | `GET /auditoria` | L | — | — |
| Sistema | Estado del servicio | `GET /health` | L | L | Público |

---

## 5. Control de acceso en el frontend

### 5.1 Mecanismos

- `ProtectedRoute`: si no hay `usuario` en el contexto, redirige a `/login` (fuente:
  frontend/src/App.tsx, líneas 24–40). Envuelve al `Layout` y a todas las rutas internas
  (líneas 51–82).
- `AdminRoute`: si `usuario.rol !== 'ADMIN'`, redirige a `/` (líneas 16–22). El rol sale del objeto
  `usuario` guardado en `localStorage` al iniciar sesión (ver 1.4), no del token ni del servidor.
- Menú lateral: cada entrada tiene una lista `roles` y se filtra por el rol del usuario (fuente:
  frontend/src/components/layout/Layout.tsx, líneas 39–65 y 97–101).
- Dentro de las páginas, el indicador `isAdmin` (`usuario?.rol === 'ADMIN'`, fuente:
  frontend/src/context/AuthContext.tsx, línea 57) oculta botones de escritura.

### 5.2 Rutas y menú por rol

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
| Registrar entrada | Botón "Importar desde Excel"; botón "Nuevo medicamento" (abre `MedicamentoFormModal`, que incluye la consulta a OpenFDA) | frontend/src/pages/Entradas.tsx, líneas 209–215 y 252–261 |
| Inventario | Columna de acción para dar de baja un lote | frontend/src/pages/Inventario.tsx, líneas 186, 192 y 209 |
| Catálogos → Medicamentos | Acciones de edición y gestión de códigos de barras | frontend/src/pages/Catalogos/Medicamentos.tsx, líneas 201–228, 246, 325 y 334 |
| Catálogos → Categorías | Columna de acciones y botón de creación | frontend/src/pages/Catalogos/Categorias.tsx, líneas 87 y 107 |
| Catálogos → Ubicaciones | Columna de acciones y botón de creación | frontend/src/pages/Catalogos/Ubicaciones.tsx, líneas 75 y 88 |

### 5.3 Diferencias entre frontend y backend

Se compararon las secciones 4 y 5.2. Las funciones de escritura restringidas a ADMIN en el backend
coinciden con lo que el frontend oculta al ENCARGADO; no se encontró ninguna opción visible en el
frontend que el backend niegue al mismo rol. Se registran **3 diferencias**:

| ID | Funcionalidad | Backend | Frontend | Tipo | Hallazgo |
|----|---------------|---------|----------|------|----------|
| DF-01 | Consulta de los 6 reportes | `GET /reportes/*` accesibles para ambos roles (solo `authMiddleware`) (fuente: backend/src/routes/reportes.routes.ts, líneas 28, 47, 65, 88, 104, 122) | Página `/reportes` y menú solo para ADMIN (fuente: frontend/src/App.tsx, línea 77; Layout.tsx, línea 55) | El backend permite al ENCARGADO algo que el frontend le oculta | H-20 |
| DF-02 | Consulta en OpenFDA | `GET /catalogos/medicamentos/lookup-fda/:codigo` accesible para ambos roles (fuente: backend/src/routes/catalogos.routes.ts, líneas 158–161) | Solo se usa en `MedicamentoFormModal`, que solo abre un ADMIN (fuente: frontend/src/components/MedicamentoFormModal.tsx, línea 91; Entradas.tsx, líneas 252–261; Medicamentos.tsx, línea 303) | El backend permite al ENCARGADO algo que el frontend le oculta | H-21 |
| DF-03 | Modificar umbrales de vencimiento | `PUT /inventario/configuracion` para ADMIN (fuente: backend/src/routes/inventario.routes.ts, líneas 491–546) | Ninguna pantalla la ofrece a ningún rol: `actualizarConfiguracion` no se usa (fuente: frontend/src/api/inventario.ts, líneas 65–68) | Funcionalidad del backend sin interfaz | H-22 |

Observación general: el control del frontend depende de la copia del usuario en `localStorage`; si se
modifica ese valor, el frontend muestra las páginas de ADMIN, pero el backend sigue decidiendo con el
rol del token (ver H-19). Con DF-01, un ENCARGADO que haga eso ve la página de Reportes completa con
datos reales (solo fallaría la exportación, con 403).

---

## 6. Token de captura por QR

| Aspecto | Comportamiento | Fuente |
|---------|----------------|--------|
| Generación | `POST /api/dispensacion/:id/generar-token` (cualquier usuario autenticado). Token `nanoid(10)` (alfabeto URL-safe de 64 símbolos). Se guarda en `tokens_captura` (una fila por dispensación, `dispensacionId` único). | backend/src/services/dispensacion.service.ts, líneas 387–423; backend/prisma/schema.prisma, líneas 209–220 |
| Reutilización | Si ya existe un token vigente y no usado para esa dispensación, se devuelve el mismo; si venció o ya se usó, se **reemplaza** por uno nuevo con `usado = false` (upsert). | dispensacion.service.ts, líneas 401–416 |
| Vigencia | 30 minutos desde la generación (`TOKEN_VIGENCIA_MIN = 30`). | dispensacion.service.ts, líneas 371 y 410 |
| Uso | Varios usos mientras esté vigente: cada subida hace *upsert* de la foto de ese tipo (reemplaza el archivo anterior). Se marca `usado = true` cuando existen las dos fotos (`RECETA` y `EVIDENCIA_ENTREGA`); desde ese momento el token deja de servir. Como la generación reemplaza un token usado, se puede obtener un token nuevo para la misma dispensación y volver a reemplazar las fotos (ver H-14). | dispensacion.service.ts, líneas 482–530 |
| URL del QR | `<origen>/captura/<token>`, donde el origen es `window.location.origin` o, si se accede desde `localhost` y existe `VITE_LAN_IP`, `http://<VITE_LAN_IP>:<puerto>`. Viaja por HTTP (sin TLS). | frontend/src/pages/Dispensacion.tsx, líneas 446–457 |
| Endpoints sin sesión | `GET /api/captura/:token/info` (devuelve id de la dispensación, nombre del beneficiario, fecha, expiración y tipos de foto ya subidos) y `POST /api/captura/:token/foto`. | backend/src/routes/captura.routes.ts, líneas 38–87 |
| Validación | Token: existe, `usado = false` y `expiraEn > ahora`; si no, 404 con el mismo mensaje en los tres casos. `tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`}. Archivo JPG/PNG/WEBP según `mimetype`, máx. 5 MB. No hay límite de peticiones por token ni por IP. | backend/src/routes/captura.routes.ts, líneas 23–35 y 57–66; dispensacion.service.ts, líneas 439–465 y 487–491 |
| Auditoría | Solo la generación del token (`CREAR`, entidad `TokenCaptura`). La subida de fotos **no** se registra. | backend/src/routes/dispensacion.routes.ts, líneas 220–227 |
| Limpieza | El cron diario borra los tokens con `expiraEn < ahora`. | backend/src/services/dispensacion.service.ts, líneas 533–538; backend/src/services/vencimiento.service.ts, líneas 39–46 |
| Archivos resultantes | Se sirven en `/uploads/dispensaciones/<id>/<TIPO>.<ext>` sin autenticación. | backend/src/server.ts, línea 23 |

---

## 7. Auditoría

### 7.1 Mecanismo

`registrarAuditoria(params)` inserta una fila en `log_auditoria` con `usuarioId`, `accion`,
`entidad`, `entidadId` (o `null`), `datosAnteriores`, `datosNuevos` (JSON) e `ipAddress` (o `null`).
Captura cualquier error y solo lo escribe en consola, sin interrumpir la operación (fuente:
backend/src/middleware/audit.ts, líneas 15–31). Se invoca **después** de completar la operación y
fuera de la transacción: si la inserción falla, la operación queda hecha sin registro.

- **Usuario:** siempre `req.user.userId` (el del token), salvo en el login (el id del usuario que
  inicia sesión).
- **IP:** siempre `req.ip`. Como no se configura `trust proxy`, es la dirección del socket que llega a
  Express. **Verificado** el 2026-09-25: los 4 registros de `log_auditoria` de este equipo tienen
  `ip_address = ::ffff:172.18.0.4`, que es la IP del contenedor `farmag_web` en la red de Docker
  (`farmag_api` = 172.18.0.3, `farmag_db` = 172.18.0.2). Es decir, se guarda la IP del proxy de Vite,
  no la del equipo del usuario (ver H-18). En modo producción nginx envía `X-Forwarded-For`
  (fuente: frontend/nginx.conf, línea 23), pero Express no lo lee.
- **Detalle:** depende de cada endpoint (ver tabla 7.2). En `PUT /catalogos/medicamentos/:id` solo se
  guardan los campos que cambiaron; en categorías y ubicaciones, el objeto completo anterior y nuevo.

### 7.2 Acciones del enum `AccionAuditoria` y dónde se registran

Enum (fuente: backend/prisma/schema.prisma, líneas 246–256):

| Acción | Endpoint(s) que la registran | Entidad |
|--------|------------------------------|---------|
| `LOGIN` | `POST /auth/login` (solo si es correcto) | `usuario` |
| `LOGOUT` | **Ninguno** (no se usa en el backend) | — |
| `CREAR` | `POST /usuarios`; `POST /catalogos/medicamentos`; `POST /catalogos/medicamentos/:id/codigos`; `POST /catalogos/categorias`; `POST /catalogos/ubicaciones`; `POST /inventario/entradas`; `POST /inventario/importar-excel` (medicamento, categoría, ubicación y entrada por fila); `POST /dispensacion/beneficiarios`; `POST /dispensacion/:id/generar-token`; `GET /reportes/exportar/:tipo/:formato` | `usuario`, `medicamento`, `codigo_barras`, `categoria`, `ubicacion`, `entrada`, `Beneficiario`, `TokenCaptura`, `reporte` |
| `EDITAR` | `PUT /usuarios/:id`; `PUT /usuarios/:id/password`; `PUT /catalogos/medicamentos/:id`; `POST /catalogos/medicamentos/:id/imagen`; `PUT /catalogos/categorias/:id`; `PUT /catalogos/ubicaciones/:id`; `PUT /inventario/configuracion`; `PUT /dispensacion/beneficiarios/:id` | `usuario`, `medicamento`, `categoria`, `ubicacion`, `configuracion`, `Beneficiario` |
| `ELIMINAR` | `DELETE /catalogos/codigos/:id` | `codigo_barras` |
| `DISPENSAR` | `POST /dispensacion/despachar` | `Dispensacion` |
| `BAJA` | `PUT /inventario/lotes/:id/baja` | `lote` |
| `ACTIVAR` / `DESACTIVAR` | `PUT /usuarios/:id/toggle` | `usuario` |

Los nombres de entidad no siguen una sola convención (minúsculas con guion bajo en la mayoría;
`Beneficiario`, `Dispensacion` y `TokenCaptura` con mayúscula inicial) (fuente: 28 llamadas a
`registrarAuditoria` en `backend/src/routes`).

Operaciones que modifican datos **sin** registro de auditoría:
- Subida de fotos por captura (`POST /captura/:token/foto`) y marca `usado` del token.
- Cambio automático `DISPONIBLE → VENCIDO` del cron y borrado de tokens vencidos (fuente:
  backend/src/services/vencimiento.service.ts, líneas 16–26 y 39–46).
- Vinculación de códigos de barras durante la importación de Excel (fuente:
  backend/src/routes/inventario.routes.ts, líneas 817–827 y 897).
- Actualización de `ultimo_acceso` en el login (queda implícita en el registro `LOGIN`).

La bitácora solo se consulta (`GET /auditoria`, ADMIN); no hay endpoints para modificarla o borrarla.

---

## 8. Otras medidas

| Medida | ¿Existe? | Detalle | Fuente |
|--------|----------|---------|--------|
| Limitación de peticiones (*rate limiting*) | **No** | No hay dependencia ni middleware; aplica también al login y a las rutas públicas de captura. | backend/package.json; backend/src/server.ts |
| Cabeceras de seguridad (`helmet`) | **No** | Se envía `X-Powered-By: Express` (verificado con `curl -I`). | backend/src/server.ts, líneas 18–23 |
| CORS | Sí, **abierto** | `cors()` sin opciones → `Access-Control-Allow-Origin: *` (verificado). La autenticación usa cabecera `Authorization`, no *cookies*. | backend/src/server.ts, línea 21 |
| HTTPS | **No** | El backend escucha en HTTP (`app.listen`); la especificación prevé acceso por HTTP en red local. | backend/src/server.ts, línea 49; Espec. §2.2, línea 61 |
| Validación de entrada | Parcial | Zod solo en 4 esquemas: `medicamentoSchema`, `loteEntradaSchema`/`entradaSchema`, `configSchema`. El resto valida a mano la presencia de algunos campos o no valida (ver `04_api.md` y H-15). Consultas Prisma parametrizadas; la única consulta SQL cruda usa la plantilla etiquetada `$queryRaw` (parametrizada). | backend/src/routes/catalogos.routes.ts, líneas 213–221; inventario.routes.ts, líneas 23–39 y 486–489; dispensacion.service.ts, líneas 199–207 |
| Manejo de errores | Parcial | Cada ruta tiene su `try/catch` y responde `{ error }`; `errorHandler` global convierte lo no capturado en 500 (incluye errores del cliente como JSON mal formado o archivo rechazado); expone `err.message` en desarrollo (H-07) y `dispensacion.routes.ts` lo expone siempre (H-13). | backend/src/middleware/errorHandler.ts, líneas 3–23 |
| Límite de tamaño del cuerpo | Sí | JSON: 100 kB (valor por defecto). Archivos: 5 MB (imágenes) y 10 MB (Excel). | backend/src/server.ts, línea 22; catalogos.routes.ts, línea 633; captura.routes.ts, línea 25; inventario.routes.ts, línea 554 |
| Protección de datos personales | Parcial | El DPI y los datos del beneficiario son visibles para cualquier usuario autenticado; las fotos de recetas se sirven sin autenticación (H-11). | backend/src/services/dispensacion.service.ts; backend/src/server.ts, línea 23 |
| Secretos | Ver H-03 | Secreto JWT y contraseña de BD con valores por defecto versionados. | backend/src/config/env.ts, línea 4; docker-compose.yml |
