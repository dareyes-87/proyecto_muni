# 09 — Seguimiento de correcciones del equipo

> Fase: Verificación de correcciones. Documento de hechos con fuente; no es texto final de la tesis.
> Fecha de verificación: 2026-10-20. Rama: `docs/documentacion`, commit `bdf1187` (incorpora `main` =
> `d68ceb3`). Línea base de los hallazgos: commit `194f8fb` (`hallazgos_defectos.md`, `discrepancias.md`).
> Commits revisados: `git log --oneline 072e2b5..bdf1187` (44 commits, del `319ebd3` al `bdf1187`).

## Método

1. Para cada archivo citado por un hallazgo se revisó `git diff 194f8fb bdf1187 -- <archivo>` y el
   contenido actual del archivo en `bdf1187`.
2. Un hallazgo se marca **Resuelto** solo si el código o la configuración actual lo muestran. Los
   mensajes de commit y los informes de `docs/seguridad/` se usaron únicamente para saber dónde buscar.
3. No se ejecutó Docker, ni pruebas, ni peticiones HTTP: todo lo que depende de ejecución se indica como
   "no verificado en ejecución". Las verificaciones en ejecución de `hallazgos_defectos.md`
   (2026-09-25) no se repitieron.
4. La columna "Commit(s)" se obtuvo con `git log -S"<texto de la corrección>" 194f8fb..bdf1187`. La mayor
   parte de las correcciones entró en `254d0f8` (Jorge Vargas, 2026-10-07), mezclado a `main` en el PR #3
   (`5b9e858`).
5. **Nomenclatura:** los informes de `docs/seguridad/` usan su propia numeración (`H-001`, `H-002`…,
   `R-01`…), distinta de la de este análisis (`H-01`…`H-34`, `R-01`… de `preguntas_abiertas.md`). Los
   comentarios del código citan ambas. En este documento, `H-XX` de dos cifras es siempre la numeración de
   `hallazgos_defectos.md`.

Estados: **Resuelto** / **Resuelto parcialmente** / **Pendiente** / **No verificable en código (depende
de la instalación)** / **Ya no aplica**.

## 1. Hallazgos H-01 a H-34

Tabla 1.
Estado de los hallazgos H-01 a H-34 en el commit `bdf1187`

| ID | Hallazgo (una línea) | Estado | Commit(s) de la corrección | Evidencia en el código actual (archivo, líneas) | Prueba automatizada que lo cubre | Observación |
|----|----------------------|--------|----------------------------|-------------------------------------------------|----------------------------------|-------------|
| H-01 | El cron usaba `< hoy` y el `FOR UPDATE` del despacho no filtraba por fecha | Resuelto | `254d0f8`, `b595051`, `99d4429` | backend/src/services/vencimiento.service.ts, líneas 7–16 (`lte: hoyMedianoche()`) y 23–50 (también corre al arrancar); backend/src/services/dispensacion.service.ts, líneas 183–184 y 213–222 (`AND fecha_vencimiento > ${hoyISO}::date`); backend/src/services/inventario.service.ts, líneas 115–117 (`estaVencido`, fuente única) y 144–153 | backend/tests/despacho_vencimiento.test.ts; backend/tests/vencimiento_arranque.test.ts; backend/tests/inventario.service.test.ts; backend/tests/rutas_integracion.test.ts (stock del lector de códigos) | El stock del lector de códigos y de `GET /dispensacion/stock/:id` también excluye lotes con fecha vencida (dispensacion.service.ts, líneas 657–668; catalogos.routes.ts, líneas 98–100). |
| H-02 | El contenedor `api` corría en UTC; el cron de 00:05 corría a las 18:05 de Guatemala | Resuelto | `254d0f8` | docker-compose.yml, línea 36 (`TZ: America/Guatemala`); docker-compose.prod.yml, línea 44; backend/Dockerfile, línea 20 (`apk add tzdata`) | Ninguna directa. El workflow corre las pruebas de base de datos con `TZ=America/Guatemala` y con `TZ=UTC` (.github/workflows/despliegue-seguro.yml, líneas 93–94) | No verificado en ejecución (no se levantó Docker). El despacho además dejó de depender de la zona de la sesión de Postgres (dispensacion.service.ts, líneas 181–184). |
| H-03 | Secretos por defecto versionados y `JWT_SECRET` de respaldo fijo en `env.ts` | Resuelto parcialmente | `254d0f8`, `a274f5f` | backend/src/config/env.ts, líneas 35–43 (sin respaldo: aborta si falta `JWT_SECRET`) y 66–81 (en producción, valores de ejemplo solo **advierten** salvo `STRICT_SECRETS=true`); docker-compose.prod.yml, líneas 23, 46–47 y 91 (exige las variables); **siguen** los valores por defecto en docker-compose.yml, líneas 8, 38, 39 y 116 | backend/tests/env.test.ts | Resuelto: no hay secreto fijo en el código. Pendiente: `docker-compose.yml`, que es el que usa la actualización automática del servidor (H-36), conserva `farmag_secret_2026` y `farmag_jwt_secret_cambiar_en_produccion`; y desde `a274f5f` el backend arranca igual con ellos. Si el servidor real los cambió sigue sin saberse (P-06). |
| H-04 | Puertos 5432 y 3000 publicados en todas las interfaces | Resuelto | `254d0f8` | docker-compose.yml, líneas 14–15 (`127.0.0.1:5432`) y 53–54 (`127.0.0.1:3000`); docker-compose.prod.yml, líneas 27–28 y 54–55 | Ninguna | El servicio `web` sigue publicando 80 y 5173 en todas las interfaces, que es lo esperado (ver H-08). No verificado con `docker compose ps`. |
| H-05 | El backend arrancaba con `prisma db push --accept-data-loss`, sin migraciones | Resuelto | `319ebd3`, `5e69a59`, `ae1310d`, `6ae2bd5` | backend/Dockerfile, líneas 40 y 62 (`CMD sh docker-entrypoint.sh`); backend/docker-entrypoint.sh, líneas 83–102 (respaldo previo), 113–135 (baseline) y 137–144 (`prisma migrate deploy`); backend/prisma/migrations/ (`0_init`, `20261017052535_indices_consultas`) | Ninguna en backend/tests/. Lo cubre el workflow: trabajos `esquema` y `despliegue` (.github/workflows/despliegue-seguro.yml, líneas 62–105 y 128–288) | El entrypoint todavía ejecuta una vez `prisma db push --skip-generate` (sin `--accept-data-loss`) para alinear una base antigua antes del baseline (docker-entrypoint.sh, línea 124). |
| H-06 | `start.cmd`/`start.sh` sin `-d` con `--build` y URL fija con 5173 en `start.sh` | Resuelto | `254d0f8` | start.cmd, líneas 9–10 y 42–49 (`docker compose up %* -d`); start.sh, líneas 25–37 (detecta el modo) y 45–53 | Ninguna | — |
| H-07 | `NODE_ENV=development` por defecto y el `errorHandler` devuelve `err.message` en 500 | Resuelto parcialmente | `254d0f8` | backend/src/middleware/errorHandler.ts, líneas 15 y 58–63; backend/src/utils/httpError.ts, líneas 46–50; docker-compose.prod.yml, línea 43 (`NODE_ENV: production`); **siguen** docker-compose.yml, línea 33 (`${NODE_ENV:-development}`) y .env.example, línea 23 | Ninguna | El mensaje interno solo se devuelve si `NODE_ENV === 'development'`, pero ese sigue siendo el valor por defecto del archivo que usa el servidor (H-36). `GET /api/health` devuelve además el entorno (backend/src/server.ts, línea 65). El valor real del servidor depende de su `.env`. |
| H-08 | El puerto 80 queda publicado sin proceso en modo desarrollo | Pendiente | — | docker-compose.yml, líneas 82–89 | Ninguna | Sin cambio funcional. El equipo lo documenta como "inofensivo" en el comentario de las líneas 82–86, y los scripts de inicio anuncian el puerto correcto (start.sh, líneas 25–37; start.cmd, líneas 18–33). `docker-compose.prod.yml` publica solo el 80 (líneas 72–74). |
| H-09 | Login sin límite de intentos y fallos no auditados | Resuelto | `254d0f8`, `b25c06e`, `40d16fa` | backend/src/routes/auth.routes.ts, líneas 23–54 (auditoría del fallo), 58–69 (límite por IP), 81–90 (bloqueo usuario+IP) y 108; backend/src/middleware/loginRateLimit.ts, líneas 13–14 (3 fallos → 5 min); backend/src/middleware/ipRateLimit.ts, líneas 20–22 (20 solicitudes / 10 min) | backend/tests/loginRateLimit.test.ts; backend/tests/ipRateLimit.test.ts | Estado en memoria (se pierde al reiniciar). Los fallos con un usuario inexistente no se auditan (auth.routes.ts, líneas 18–21 y 26). Las rutas públicas `/api/captura` no tienen límite (riesgo aceptado R-03 de REMAINING_SECURITY_RISKS.md). |
| H-10 | `authMiddleware` no consulta la BD; sin *logout* ni revocación | Resuelto parcialmente | `254d0f8` | backend/src/middleware/auth.ts, líneas 39–55 (consulta usuario, `activo` y rol actual en cada petición) | Ninguna | Resuelto: desactivar o cambiar el rol surte efecto inmediato. Pendiente: no existe endpoint de *logout* ni revocación de un token robado de una cuenta activa (8 h); la acción `LOGOUT` sigue sin registrarse en ningún archivo de backend/src, aunque el filtro de Auditoria.tsx la ofrece (frontend/src/pages/Auditoria.tsx, línea 25). |
| H-11 | `/uploads` servía sin autenticación las fotos de recetas | Resuelto | `254d0f8` | backend/src/server.ts, líneas 44–47 (solo `/uploads/medicamentos` es estático); backend/src/routes/dispensacion.routes.ts, líneas 284–308 (`GET /:id/foto/:tipo` con `authMiddleware`, `no-store`); backend/src/services/dispensacion.service.ts, líneas 551–569 (ruta derivada de la BD, sin *path traversal*); frontend/nginx.conf, líneas 39–47; frontend/src/components/ui/AuthImage.tsx, líneas 12–30 | Ninguna | No verificado en ejecución. El campo `imagenUrl` sigue guardando `/uploads/dispensaciones/...` (dispensacion.service.ts, línea 603), ruta que ya no se sirve; el frontend ya no la usa (Beneficiarios.tsx usa el endpoint autenticado). |
| H-12 | Errores del cliente (JSON mal formado, `multer`) respondían 500; 404 en HTML | Resuelto | `254d0f8` | backend/src/middleware/errorHandler.ts, líneas 29–56; backend/src/server.ts, líneas 69–72 (404 JSON); backend/src/routes/captura.routes.ts, líneas 23–35 y 76–94; backend/src/routes/catalogos.routes.ts, líneas 664–672 | Ninguna (backend/tests/fecha.test.ts y validacion.test.ts cubren otros 400, no el `errorHandler`) | Deducido del código; no se repitieron las peticiones del 2026-09-25. |
| H-13 | Las 10 rutas de dispensación devolvían `error.message` en 500 | Resuelto | `254d0f8` | backend/src/routes/dispensacion.routes.ts, líneas 5, 36, 83, 94, 142–145, 209–213, 229, 240, 266–269, 280, 306 y 317 (`responderError`); backend/src/utils/httpError.ts, líneas 46–50 | Ninguna | El detalle se oculta salvo con `NODE_ENV=development`; queda la misma dependencia de H-07. |
| H-14 | Las fotos se podían reemplazar después de completadas y la subida no se auditaba | Resuelto | `254d0f8` | backend/src/services/dispensacion.service.ts, líneas 444–455 (no genera token si hay RECETA y EVIDENCIA_ENTREGA) y 626–640 (auditoría de la subida); backend/src/routes/dispensacion.routes.ts, líneas 266–269 (409) | Ninguna (rutas_integracion.test.ts solo prueba el formato del token) | Antes de completar las dos fotos, subir de nuevo el mismo tipo reemplaza la anterior sin conservarla (dispensacion.service.ts, líneas 594–599). La auditoría de la subida tiene limitaciones propias: ver H-35. |
| H-15 | Endpoints de escritura sin validación de tipos/formato; duplicados → 500 | Resuelto parcialmente | `254d0f8`, `aa7598b` | catalogos.routes.ts, líneas 317–321 (Zod en PUT medicamentos), 513–530 (Zod en PUT categorías) y 625–628 (código de ubicación no vacío); usuarios.routes.ts, líneas 42–57 (rol del enum, tipos, contraseña); dispensacion.routes.ts, líneas 45–62, 104–119 y 160–185 (tipos, DPI, cantidad entera); auditoria.routes.ts, líneas 40–46 (`accion` del enum); httpError.ts, líneas 36–44 (P2002 → 409, P2025 → 404) | backend/tests/rutas_integracion.test.ts (PUT medicamentos y categorías con tipo incorrecto → 400); backend/tests/validacion.test.ts (`textoQuery`, `clampPaginacion`) | Pendiente: `POST` y `PUT /usuarios` no validan el formato ni la unicidad de `email` (campo `@unique`, schema.prisma, línea 22) y responden con su propio `catch` 500 (usuarios.routes.ts, líneas 90–92 y 180–183), por lo que un email repetido sigue dando 500; `PUT /usuarios/:id` no valida el tipo de `nombreCompleto`; `descripcion` de ubicaciones no valida tipo. Coincide con el riesgo R-04 que el equipo declara pendiente. |
| H-16 | Crear usuario no exigía longitud mínima; restablecer exigía 6 | Resuelto parcialmente | `254d0f8` | backend/src/routes/usuarios.routes.ts, líneas 53–57 (crear) y 193 (restablecer): ambos exigen 6 | Ninguna | La inconsistencia entre crear y restablecer se corrigió. Siguen sin reglas de complejidad, y el seed exige otra regla para el administrador inicial (mínimo 8 y lista de valores prohibidos: backend/prisma/seed.ts, líneas 8 y 32–33). |
| H-17 | `cors()` abierto, sin `helmet`, con `X-Powered-By` | Resuelto parcialmente | `254d0f8` | backend/src/server.ts, líneas 25–27 (`x-powered-by` desactivado, `helmet()`) y 29–41 (CORS: lista `CORS_ORIGIN`, desactivado en producción) | Ninguna | En `NODE_ENV=development` el CORS refleja cualquier origen (línea 39), que es el valor por defecto de docker-compose.yml (H-07, H-36). Las cabeceras del SPA están en frontend/nginx.conf, líneas 16–20, que solo aplica con `FRONTEND_TARGET=production`. No verificado con `curl -I`. |
| H-18 | La IP de la auditoría era la del proxy | Resuelto | `254d0f8`, `a274f5f` | backend/src/server.ts, línea 23 (`trust proxy 1`); frontend/vite.config.ts, líneas 9–24 (`xfwd: true`); frontend/nginx.conf, líneas 34–35 | Ninguna | No verificado en ejecución (no se consultó `log_auditoria`). Efecto lateral de `trust proxy`: ver H-37. |
| H-19 | JWT en `localStorage` y rol tomado de la copia local sin validar | Resuelto parcialmente | `254d0f8` | frontend/src/context/AuthContext.tsx, líneas 36–65 (confirma el usuario con `GET /auth/perfil` al cargar); backend/src/routes/auth.routes.ts, línea 151 | Ninguna | Resuelto: el rol mostrado se toma del servidor. Pendiente: el token sigue en `localStorage['farmag_token']` (AuthContext.tsx, líneas 29 y 72), accesible a un script inyectado. |
| H-20 | El Encargado no ve la página de Reportes (DF-01) | Pendiente | — | frontend/src/App.tsx, línea 77 (`AdminRoute`); frontend/src/components/layout/Layout.tsx, línea 55 (`roles: ['ADMIN']`) | Ninguna | Sin cambio. Depende de la confirmación de R-07. REMAINING_SECURITY_RISKS.md lo declara diferido por decisión del usuario. |
| H-21 | `lookup-fda` abierto a cualquier usuario autenticado (DF-02) | Resuelto | `254d0f8` | backend/src/routes/catalogos.routes.ts, línea 165 (`requireRole('ADMIN')`) | Ninguna | El botón que abre el formulario solo lo ve el ADMIN (frontend/src/pages/Entradas.tsx, líneas 255–262). |
| H-22 | `PUT /inventario/configuracion` sin pantalla (DF-03) | Pendiente | — | frontend/src/api/inventario.ts, línea 65 (`actualizarConfiguracion` sin uso en ninguna página) | Ninguna | Sin cambio. REMAINING_SECURITY_RISKS.md lo declara diferido. `GET /inventario/configuracion` ahora lo consume Dispensación (H-28). |
| H-23 | La operación diaria usa una cuenta ADMIN | No verificable en código (depende de la instalación) | — | — | Ninguna | Es una práctica de operación (R-09), no un defecto del código. |
| H-24 | La lista de medicamentos de "Registrar entrada" solo traía 20 | Resuelto | `254d0f8` | frontend/src/api/catalogos.ts, líneas 16–32 (`listarMedicamentosTodos` recorre todas las páginas); frontend/src/pages/Entradas.tsx, línea 73 | Ninguna | Se cargan todas las páginas en el navegador (100 por petición) al abrir la pantalla. |
| H-25 | Inventario sin paginación en el frontend | Resuelto | `254d0f8` | frontend/src/pages/Inventario.tsx, líneas 22–24, 33–49 y 167–190 | Ninguna | — |
| H-26 | Medicamentos y categorías inactivos desaparecían de la interfaz | Resuelto | `254d0f8` | backend/src/routes/catalogos.routes.ts, líneas 27–29 y 465–467 (`incluirInactivos=true`); frontend/src/pages/Catalogos/Medicamentos.tsx, línea 47; frontend/src/pages/Catalogos/Categorias.tsx, línea 26 | Ninguna | No verificado en navegador. Las demás pantallas (Entradas, Dispensación) siguen pidiendo solo activos. |
| H-27 | La baja de lotes desde la interfaz no registraba motivo | Resuelto parcialmente | `254d0f8` | frontend/src/pages/Inventario.tsx, líneas 31, 73 y 277–285 (campo "Motivo (opcional)"); frontend/src/api/inventario.ts, líneas 55–56; backend/src/routes/inventario.routes.ts, líneas 454 y 480 | Ninguna | El motivo es opcional, sigue guardándose solo en la auditoría y el reporte de bajas no lo muestra (backend/src/services/reportes.service.ts, línea 318, comentario). Relacionado con P-18 y D-27. |
| H-28 | Semáforo de Dispensación con umbrales fijos y comparación distinta | Resuelto | `254d0f8`, `0e705c3` | frontend/src/pages/Dispensacion.tsx, líneas 69–87 (`<=`, umbrales recibidos) y 247–254 (`obtenerConfiguracion`); frontend/src/utils/formatDate.ts, líneas 19–30 (`diasParaVencer`, misma fórmula que el backend); backend/src/routes/inventario.routes.ts, líneas 494–496 (GET abierto a ambos roles) | Ninguna | Si la consulta de umbrales falla, se usan 30/90 por defecto (Dispensacion.tsx, líneas 250–253). |
| H-29 | No se puede desactivar a un beneficiario | Pendiente | — | backend/src/services/dispensacion.service.ts, líneas 103–135 (`editarBeneficiario` sigue sin `activo`); backend/src/routes/dispensacion.routes.ts, líneas 98–147 | Ninguna | Sin cambio. REMAINING_SECURITY_RISKS.md lo declara diferido (P-19). |
| H-30 | Filtro de entidades incompleto y nombres de entidad no uniformes | Resuelto parcialmente | `254d0f8` | frontend/src/pages/Auditoria.tsx, líneas 32–46 (incluye `FotoDispensacion`, `reporte`, `TokenCaptura`); backend/src/routes/auditoria.routes.ts, línea 48 (comparación sin mayúsculas) | Ninguna | Resuelto el filtro. Pendiente la nomenclatura: el backend sigue registrando `Beneficiario`, `Dispensacion`, `FotoDispensacion` y `TokenCaptura` en PascalCase y el resto en minúscula (`registrarAuditoria` en backend/src/routes/*.ts y backend/src/services/dispensacion.service.ts, línea 636). |
| H-31 | Código de barras con espacios pasaba la comprobación y daba 500; mensaje 409 impreciso | Resuelto parcialmente | `254d0f8` | backend/src/routes/catalogos.routes.ts, líneas 395 y 403 (se recorta antes de comprobar) | Ninguna | Resuelto el 500. Pendiente: el 409 sigue diciendo "ya está registrado en otro medicamento" aunque sea el mismo (línea 405). |
| H-32 | Un 401 del login recargaba la página | Resuelto | `254d0f8` | frontend/src/api/client.ts, líneas 19–28 (excluye `/auth/login`) | Ninguna | No verificado en navegador. |
| H-33 | La importación por Excel reutilizaba medicamentos y categorías inactivos | Resuelto | `254d0f8` | backend/src/routes/inventario.routes.ts, líneas 776–780 (categoría) y 808–812 (medicamento) | Ninguna (rutas_integracion.test.ts prueba duplicados, no inactivos) | La fila se reporta como error y no carga stock. |
| H-34 | Entradas sin validar que la fecha de vencimiento sea futura | Resuelto | `254d0f8` | backend/src/routes/inventario.routes.ts, líneas 64–73 (manual) y 655–658 (Excel); backend/src/services/inventario.service.ts, líneas 160–168 (`validarFechaVencimientoEntrada`) | backend/tests/inventario.service.test.ts (`validarFechaVencimientoEntrada`) | La prueba es unitaria; no hay prueba de integración de la ruta con fecha pasada. |

Fuente: Elaboración propia.

## 2. Discrepancias revisadas

Las discrepancias no listadas aquí (D-01 a D-10, D-12, D-15 a D-17, D-21 y D-26) no cambian.

Tabla 2.
Estado de las discrepancias revisadas en el commit `bdf1187`

| ID | Discrepancia (una línea) | Estado | Commit(s) | Evidencia en el código actual (archivo, líneas) | Prueba automatizada | Observación |
|----|--------------------------|--------|-----------|-------------------------------------------------|---------------------|-------------|
| D-11 | Cron con `< hoy` frente a `<= hoy` de la especificación | Resuelto | `254d0f8`, `99d4429` | backend/src/services/vencimiento.service.ts, líneas 11–14 (`lte`) | backend/tests/vencimiento_arranque.test.ts | El código coincide ahora con la especificación (Espec. §3.3.4, línea 206). |
| D-13 | Sin migraciones; `db push --accept-data-loss` | Resuelto | `319ebd3`, `6ae2bd5` | backend/prisma/migrations/ (`0_init`, `20261017052535_indices_consultas`, `migration_lock.toml`); backend/docker-entrypoint.sh, líneas 137–144 | Ninguna (workflow, trabajo `esquema`) | Ver H-05. |
| D-14 | Recharts declarado pero no usado | Pendiente | `dd8e723` | frontend/package.json (ya no declara `recharts`); ningún import en frontend/src | Ninguna | La discrepancia cambió de forma: la dependencia se eliminó, pero la especificación sigue nombrando Recharts para el dashboard (Espec., línea 28) y el dashboard no tiene gráficos. Hay que actualizar el texto de D-14 y la sección de tecnologías. |
| D-18 | Acciones que modifican datos sin auditoría | Resuelto parcialmente | `254d0f8` | Se audita la subida de fotos por captura (backend/src/services/dispensacion.service.ts, líneas 626–640) | Ninguna | Siguen sin auditarse: el paso `DISPONIBLE → VENCIDO` (vencimiento.service.ts, líneas 11–14), la marca `usado` del token (dispensacion.service.ts, líneas 619–624), el borrado de tokens vencidos (líneas 646–651) y la vinculación de códigos de barras en la importación (inventario.routes.ts, líneas 847–857 y 927). |
| D-19 | Búsqueda de DPI con `startsWith`, no exacta | Pendiente | — | backend/src/services/dispensacion.service.ts, líneas 26–37 | Ninguna | Sin cambio. |
| D-20 | Lote a 30 días exactos: ROJO en el código, AMARILLO en la especificación | Pendiente | — | backend/src/services/inventario.service.ts, líneas 131–132 (`<=`) | backend/tests/inventario.service.test.ts (`calcularSemaforo`) | Sin cambio en el criterio. Ahora Dispensación usa el mismo `<=` (Dispensacion.tsx, líneas 84–85), por lo que la discrepancia con la especificación se extiende a esa pantalla. |
| D-22 | El historial de beneficiario no se exporta | Pendiente | — | backend/src/routes/reportes.routes.ts, línea 140 (`TIPOS_VALIDOS`) | Ninguna | Sin cambio. |
| D-23 | Recursos accesibles sin autenticación | Resuelto parcialmente | `254d0f8` | backend/src/server.ts, líneas 44–47 (solo `/uploads/medicamentos`), 55–56 (`/api/captura`) y 61–67 (`/api/health`) | Ninguna | Las fotos de recetas ya no son públicas (H-11). Siguen públicos, por diseño: `/api/captura/:token/*`, `/api/health` (con el entorno) y las fotos de medicamentos. |
| D-24 | Umbrales editables por el administrador, sin pantalla | Pendiente | — | frontend/src/api/inventario.ts, línea 65 | Ninguna | Ver H-22. |
| D-25 | Aviso de vencimiento en Dispensación con umbrales fijos | Resuelto | `254d0f8` | frontend/src/pages/Dispensacion.tsx, líneas 69–87 y 247–254 | Ninguna | Ver H-28. |
| D-27 | Se puede dar de baja cualquier lote, sin motivo obligatorio | Pendiente | — | backend/src/routes/inventario.routes.ts, líneas 447–472 (solo rechaza `DADO_DE_BAJA`); línea 454 (motivo opcional) | Ninguna | Sin cambio en la regla. La interfaz ahora ofrece un motivo opcional (ver H-27). |

Fuente: Elaboración propia.

## 3. Resumen

Tabla 3.
Totales por estado

| Estado | Hallazgos (H-01 a H-34) | Discrepancias revisadas (11) |
|--------|-------------------------|------------------------------|
| Resuelto | 19 (H-01, H-02, H-04, H-05, H-06, H-09, H-11, H-12, H-13, H-14, H-18, H-21, H-24, H-25, H-26, H-28, H-32, H-33, H-34) | 3 (D-11, D-13, D-25) |
| Resuelto parcialmente | 10 (H-03, H-07, H-10, H-15, H-16, H-17, H-19, H-27, H-30, H-31) | 2 (D-18, D-23) |
| Pendiente | 4 (H-08, H-20, H-22, H-29) | 6 (D-14, D-19, D-20, D-22, D-24, D-27) |
| No verificable en código | 1 (H-23) | 0 |
| Ya no aplica | 0 | 0 |
| **Total** | **34** | **11** |

Fuente: Elaboración propia.

Tienen prueba en `backend/tests/` que ejerce la corrección: 3 de los 19 resueltos (H-01, H-09, H-34) y
2 de los 10 resueltos parcialmente (H-03, H-15). H-02 y H-05 se ejercen solo de forma indirecta en el
workflow `despliegue-seguro.yml`. El resto se comprobó únicamente por lectura del código. Ninguna
corrección del frontend tiene prueba automatizada (no hay framework de pruebas en `frontend/`).

## 4. Hallazgos nuevos

Detectados al revisar el código modificado entre `194f8fb` y `bdf1187`. Deducidos del código; no se
probaron en ejecución.

| ID | Tipo | Descripción | Impacto | Fuente | Referencia |
|----|------|-------------|---------|--------|------------|
| H-35 | Trazabilidad | La subida de fotos por captura se registra en la auditoría con el `usuarioId` del usuario que hizo la dispensación y sin `ipAddress` (la ruta pública no pasa `req.ip`). La subida desde la PC usa el mismo endpoint con el token. Un reemplazo de foto antes de completar las dos no guarda la foto anterior ni la registra como edición. | La bitácora atribuye la subida a una persona que pudo no hacerla (cualquiera con el QR durante 30 min) y no permite saber desde qué equipo se hizo. | backend/src/services/dispensacion.service.ts, líneas 594–599 y 626–640; backend/src/routes/captura.routes.ts, líneas 70–73; frontend/src/pages/Dispensacion.tsx, líneas 13 y 136 | H-14; D-18 |
| H-36 | Configuración | La actualización automática del servidor ejecuta `docker compose up -d --build`, es decir `docker-compose.yml`, cuyo modo por defecto es desarrollo: `BACKEND_TARGET=development` (`tsx watch`), `NODE_ENV=development`, `FRONTEND_TARGET=development` (Vite en 5173) y secretos por defecto versionados. El endurecimiento de `docker-compose.prod.yml` (secretos obligatorios, `node dist`, nginx con cabeceras, solo puerto 80) solo aplica si se usa ese archivo, lo que el mecanismo documentado no hace; REMAINING_SECURITY_RISKS.md recomienda usarlo en su lista previa a producción. | Si el `.env` del servidor no fija esas variables, la instalación real corre con el detalle de errores visible (H-07), CORS abierto (H-17), sin cabeceras del SPA y con los secretos del repositorio (H-03). Qué variables tiene el servidor no se puede saber desde el repositorio. | docs/DESPLIEGUE.md, líneas 5–6; docker-compose.yml, líneas 8, 29, 33, 38–39 y 77; docker-compose.prod.yml, líneas 1–14; docs/seguridad/REMAINING_SECURITY_RISKS.md, sección "Checklist mínimo pre-producción", punto 3 | H-03, H-07, H-17; P-06 |
| H-37 | Seguridad (baja) | Con `trust proxy 1`, Express toma como IP del cliente el último valor de `X-Forwarded-For`. Una petición directa al puerto 3000 (publicado solo en `127.0.0.1`) puede enviar esa cabecera con cualquier valor. | Un proceso o usuario del propio equipo servidor puede evadir el límite de login por IP y registrar una IP falsa en la auditoría. Desde la red local no aplica, porque el puerto 3000 ya no está expuesto. | backend/src/server.ts, línea 23; docker-compose.yml, líneas 53–54; backend/src/routes/auth.routes.ts, líneas 61–62 | H-09, H-18 |
| H-38 | Trazabilidad (baja) | `POST /dispensacion/:id/generar-token` registra siempre una auditoría `CREAR` de `TokenCaptura`, incluso cuando devuelve el token vigente sin crear nada. | La bitácora muestra creaciones de token que no ocurrieron (la pantalla de Dispensación pide el token cada vez que muestra el QR). | backend/src/routes/dispensacion.routes.ts, líneas 250–262; backend/src/services/dispensacion.service.ts, líneas 462–468 | RN-69 |

Fuente: Elaboración propia.

## 5. Verificaciones posteriores en ejecución (2026-10-20)

Al actualizar `01_stack_y_estructura.md`, `02_modelo_datos.md` y `05_seguridad_roles.md` al commit
`bdf1187` se consultaron los contenedores del equipo de desarrollo levantados con ese código, solo con
comandos que no modifican datos. **Ningún estado de las tablas 1 y 2 cambia**: lo verificado confirma
lo que la tabla ya deducía del código, o confirma que lo pendiente sigue pendiente. Por eso no se
modificaron las filas, y se deja aquí la evidencia adicional.

| ID | Estado (sin cambio) | Evidencia en ejecución (2026-10-20) |
|----|---------------------|-------------------------------------|
| H-02 | Resuelto | `farmag_api`: `TZ=America/Guatemala`; `date` → `Tue Oct 20 03:00:42 CST 2026` |
| H-04 | Resuelto | `docker compose ps`: `127.0.0.1:5432->5432/tcp` (db) y `127.0.0.1:3000->3000/tcp` (api) |
| H-05 / D-13 | Resuelto | `_prisma_migrations` con `0_init` y `20261017052535_indices_consultas` aplicadas; `prisma migrate diff` contra la base → sin diferencias; `ESTADO_ARRANQUE.txt` registra "migraciones al día" |
| H-07 | Resuelto parcialmente | `NODE_ENV=development` en `farmag_api`; `GET /api/health` → `"environment":"development"` |
| H-08 | Pendiente | El puerto 80 está publicado y una petición a `127.0.0.1:80` recibe respuesta vacía (no hay proceso) |
| H-11 / D-23 | Resuelto / Resuelto parcialmente | `GET /uploads/dispensaciones/x/RECETA.webp` → 404; `GET /api/dispensacion/x/foto/RECETA` sin token → 401 |
| H-12 | Resuelto | `GET /api/noexiste` → 404 `{"error":"Ruta no encontrada"}` |
| H-17 | Resuelto parcialmente | `GET /api/health`: cabeceras de `helmet` presentes y sin `X-Powered-By`; con `Origin: http://evil.example` responde `Access-Control-Allow-Origin: http://evil.example` (CORS reflejado en desarrollo). Ver también H-40 |
| D-14 | Pendiente | La sección de tecnologías de `01_stack_y_estructura.md` ya refleja la eliminación de Recharts; P-03 se marcó resuelta. El texto de D-14 se conserva como registro histórico |

Hallazgos nuevos de esta actualización: **H-39, H-40 y H-41**, registrados en
`hallazgos_defectos.md` (sección "Actualización de la extracción al commit bdf1187 — parte 1").
Discrepancia nueva: **D-28**. Preguntas nuevas: **P-21 y P-22**; P-03 pasó a resuelta y P-05 a
resuelta parcialmente (`preguntas_abiertas.md`).
