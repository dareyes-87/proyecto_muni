# 12 — Plan de correcciones de los hallazgos abiertos

> Fase: Planificación de correcciones. Documento de trabajo para el equipo; no es texto final de la tesis.
> Fecha: 2026-10-20. Rama: `docs/documentacion`, código de referencia en el commit `bdf1187`.
> Fuentes: `09_seguimiento_correcciones.md` (tablas 1, 2 y secciones 4–5), `hallazgos_defectos.md`
> (H-01 a H-46), `discrepancias.md` (D-01 a D-28) y `preguntas_abiertas.md` (P-01 a P-23, R-01 a R-09).
> No se corrigió nada: este documento solo propone.

## Criterios

- **Alcance:** todo lo que en `09_seguimiento_correcciones.md` no está "Resuelto": hallazgos Pendientes
  (H-08, H-20, H-22, H-29), Resueltos parcialmente (H-03, H-07, H-10, H-15, H-16, H-17, H-19, H-27,
  H-30, H-31), No verificables (H-23), los nuevos H-35 a H-46 y las discrepancias Pendientes o Resueltas
  parcialmente (D-14, D-18, D-19, D-20, D-22, D-23, D-24, D-27), más las que siguen pendientes de
  confirmación (D-16, D-17) y la nueva D-28.
- **Excluidas:** D-01 a D-10, D-12, D-13, D-15, D-21, D-25 y D-26, porque son cambios intencionales
  de diseño (R-01, R-04), diferencias de documentación ya explicadas o ya resueltas; no requieren
  acción sobre el código. D-12 queda cubierta por H-08 y H-36.
- **Prioridad:**
  - **Crítica:** puede exponer credenciales o el control total del sistema en la instalación real.
  - **Alta:** produce datos incorrectos visibles para el usuario o debilita la seguridad de forma
    aprovechable desde la red.
  - **Media:** defecto funcional o de trazabilidad con alternativa o con impacto acotado.
  - **Baja:** solo afecta a llamadas directas a la API, a mensajes, o a un escenario local improbable.
- **Responsable original:** módulo según la sección "Asignación de Módulos" de `CLAUDE.md`; entre
  paréntesis, el autor principal del archivo según `git log --format=%an -- <archivo>` (`dareyes-87` =
  Daniel Reyes, `jorgevargas83` = Jorge Vargas, `Audias22` = Audias Guevara). La mayoría de las
  correcciones de seguridad posteriores entró en `254d0f8` (Jorge Vargas), aunque el archivo pertenezca
  a otro módulo.
- **Esfuerzo:** S = menos de medio día, sin migración; M = un día o requiere migración o pantalla
  nueva; L = varios días o cambia el despliegue.

## 1. Tabla de correcciones

Tabla 1.
Hallazgos y discrepancias abiertos, con la corrección propuesta

| ID | Problema (una línea) | Prioridad | Tipo de acción | Módulo y responsable original | Archivos a tocar | Corrección propuesta | Esfuerzo | Prueba que la verificaría |
|----|----------------------|-----------|----------------|-------------------------------|------------------|----------------------|-----------|---------------------------|
| H-36 | La actualización automática usa `docker-compose.yml` (modo desarrollo: `tsx watch`, Vite, `NODE_ENV=development`, secretos por defecto) | Crítica | Decisión + Instalación | Setup/despliegue — Daniel Reyes (`docker-compose.yml`: dareyes-87; `DESPLIEGUE.md`/entrypoint: Jorge Vargas, Daniel Reyes) | `auto-update.cmd` (fuera del repo), docs/DESPLIEGUE.md, `.env` del servidor | **Recomendado:** que `auto-update.cmd` ejecute `docker compose -f docker-compose.prod.yml up -d --build` y que `DESPLIEGUE.md` lo documente; porque es el único archivo que ya exige secretos, compila (`node dist`) y sirve nginx en el 80. Hacerlo en sitio, tras completar la lista de la sección 4. | L | En el servidor: `docker compose -f docker-compose.prod.yml ps` muestra `web` solo en `:80`; `GET /api/health` → `"environment":"production"`; `ps` en `farmag_api` muestra `node dist/server.js` |
| H-03 | `docker-compose.yml` conserva `farmag_secret_2026` y `farmag_jwt_secret_cambiar_en_produccion` como respaldo, y el backend arranca con ellos | Crítica | Instalación, luego Código | Setup — Daniel Reyes (`docker-compose.yml`: dareyes-87; `env.ts`: jorgevargas83) | `.env` del servidor; después docker-compose.yml (líneas 8, 38, 39, 116) | 1) En sitio: definir `DB_PASSWORD` y `JWT_SECRET` propios en el `.env` (cambiar la contraseña del usuario de Postgres con `ALTER USER`, no solo la variable). 2) Solo después, cambiar `${VAR:-valor}` por `${VAR:?mensaje}` en `docker-compose.yml`. **El orden importa:** si el paso 2 llega a `main` antes que el 1, el servidor deja de arrancar en la siguiente actualización y no hay acceso remoto. | M | `docker compose config` sin `.env` falla con el mensaje; con `.env`, `grep farmag_jwt_secret` sobre `docker compose config` no devuelve nada; `backend/tests/env.test.ts` sigue pasando |
| H-07 | `NODE_ENV=development` por defecto: errores 500 con mensaje interno y `/api/health` revela el entorno | Alta | Instalación + Código | Setup — Daniel Reyes (`server.ts`: dareyes-87) | `.env` del servidor (o H-36); backend/src/server.ts, línea 65 | Se resuelve en la instalación con H-36 (`NODE_ENV=production`). En el código: quitar `environment` de la respuesta de `/api/health`. | S | `curl /api/health` no incluye `environment`; con `NODE_ENV=production`, un error forzado responde `{"error":"Error interno del servidor"}` sin `mensaje` |
| H-17 | CORS refleja cualquier origen en desarrollo; cabeceras del SPA solo con nginx | Alta | Instalación | Setup — Daniel Reyes | Ninguno (lo resuelve H-36) | Con `docker-compose.prod.yml`, CORS queda con lista blanca o desactivado y nginx agrega las cabeceras. No cambiar el código. | S | `curl -H "Origin: http://evil.example" -I /api/health` en el servidor no devuelve `Access-Control-Allow-Origin`; `curl -I http://<IP>/` muestra las cabeceras de `nginx.conf` |
| H-40 | `docker-compose.yml` no pasa `CORS_ORIGIN` al contenedor `api` | Media | Código | Setup — Daniel Reyes (dareyes-87) | docker-compose.yml (servicio `api`, `environment`) | Agregar `CORS_ORIGIN: ${CORS_ORIGIN:-}`, igual que en `docker-compose.prod.yml`, línea 49. | S | `docker compose exec api printenv CORS_ORIGIN` devuelve el valor del `.env`; con un origen no listado, sin `Access-Control-Allow-Origin` |
| H-46 | Reportes y auditoría: `desde=AAAA-MM-DD` se interpreta como medianoche UTC e incluye 18:00–23:59 del día anterior | Alta | Código | Reportes — Daniel Reyes (`reportes.service.ts`, `fecha.ts`: jorgevargas83) | backend/src/utils/fecha.ts; backend/src/services/reportes.service.ts; backend/src/routes/auditoria.routes.ts; backend/tests/fecha.test.ts | En `parseFechaQuery`, si el valor coincide con `^\d{4}-\d{2}-\d{2}$`, construir `new Date(a, m-1, d)` (medianoche local); agregar `parseFechaHastaQuery` que lleve una fecha simple a 23:59:59.999 local. Usar ambos en reportes y auditoría. | M | Prueba unitaria con `TZ=America/Guatemala` y `TZ=UTC`: `parseFechaQuery('2026-10-20')` → `getDate()===20, getHours()===0`. Integración: una dispensación creada a las 19:00 del día 19 no aparece en el reporte con `desde=2026-10-20`. Revisar a mano el reporte de bajas (`@db.Date`) |
| H-45 | `GET /dispensacion/historial`: `fechaHasta` queda en el día anterior y `fechaDesde` incluye 6 h del día previo | Media | Código | Dispensación — Jorge Vargas | backend/src/services/dispensacion.service.ts, líneas 339–355 | Reemplazar el `setHours` por los helpers de H-46 (`parseFechaQuery` / `parseFechaHastaQuery`). | S | Con `TZ=America/Guatemala`, `historial?fechaDesde=2026-10-20&fechaHasta=2026-10-20` incluye una dispensación de las 10:00 del 20 y excluye una de las 19:00 del 19 |
| H-39 | La contraseña aleatoria del administrador inicial queda en claro en el log del contenedor y nada obliga a cambiarla | Alta | Decisión (P-21) + Código | Admin — Daniel Reyes (`seed.ts`: dareyes-87) | backend/prisma/seed.ts; schema.prisma + migración (`debeCambiarPassword`); backend/src/routes/auth.routes.ts; frontend (pantalla de cambio) | **Recomendado:** campo `debeCambiarPassword` (true al crear por seed o al restablecer) y endpoint `PUT /auth/password` del propio usuario; el frontend redirige a cambiarla tras el login; porque cierra a la vez H-39 y la falta de cambio propio de contraseña. Mientras tanto, en la instalación, definir `ADMIN_INITIAL_PASSWORD`. | M | Instalación nueva: tras el primer login, toda ruta distinta de `/auth/password` y `/auth/perfil` responde 403 hasta cambiarla; `backend/tests/seed.test.ts` ampliado |
| H-15 | `POST`/`PUT /usuarios` no validan formato ni unicidad de `email` (500), ni tipo de `nombreCompleto`; `descripcion` de ubicaciones sin validar | Media | Código | Admin — Daniel Reyes (dareyes-87) | backend/src/routes/usuarios.routes.ts (líneas 42–57, 90–92, 150–183); backend/src/routes/catalogos.routes.ts (ubicaciones) | Esquema Zod con `email: z.string().email().optional()` y `nombreCompleto: z.string().trim().min(1)`; reemplazar los `catch` propios por `responderError` (P2002 → 409). Validar `descripcion` como `string` opcional. | S | `rutas_integracion.test.ts`: crear dos usuarios con el mismo email → 409; email `abc` → 400; `nombreCompleto: 5` → 400 |
| H-16 | Política de contraseñas: 6 caracteres en usuarios, 8 + lista prohibida en el seed, sin complejidad | Media | Decisión (P-22) | Admin — Daniel Reyes (`usuarios.routes.ts`: dareyes-87) | backend/src/routes/usuarios.routes.ts; backend/prisma/seed.ts; nuevo helper en backend/src/utils/validacion.ts | **Recomendado:** una sola regla de 8 caracteres mínimo con la lista de valores prohibidos del seed, aplicada en crear, restablecer y cambio propio; porque unifica las tres reglas sin exigir complejidad que el personal anote en papel. | S | Prueba unitaria del helper; crear/restablecer con 7 caracteres → 400; con un valor prohibido → 400 |
| H-41 | Si `ADMIN_INITIAL_PASSWORD` es inválida, el seed aborta antes de sembrar catálogos y el arranque solo deja un `AVISO` | Media | Código | Admin/Setup — Daniel Reyes (`seed.ts`: dareyes-87; entrypoint: Jorge Vargas) | backend/prisma/seed.ts (líneas 26–38); backend/docker-entrypoint.sh (línea 149) | Sembrar categorías, ubicaciones y configuración antes de validar la contraseña, y que el entrypoint escriba `ATENCION` (no `AVISO`) cuando el seed falla, para que lo detecte el workflow. | S | `seed.test.ts`: con `ADMIN_INITIAL_PASSWORD=123` existen las 13 categorías y los umbrales; `ESTADO_ARRANQUE.txt` contiene `ATENCION` |
| H-10 | Sin *logout* en el servidor: la acción `LOGOUT` nunca se registra y un token robado vale 8 h | Media | Código (parcial) + Aceptar (revocación) | Auth — Daniel Reyes (`auth.routes.ts`: dareyes-87) | backend/src/routes/auth.routes.ts; frontend/src/context/AuthContext.tsx (función `logout`) | Agregar `POST /auth/logout` que registre `LOGOUT` y llamarlo desde `logout()`. La revocación individual de tokens se acepta como riesgo: `authMiddleware` ya rechaza al usuario desactivado, que es la respuesta operativa a un robo. | S | Cerrar sesión desde la interfaz crea un registro `LOGOUT` en `GET /api/auditoria?accion=LOGOUT` |
| H-35 | La subida de fotos por captura se audita con el usuario que dispensó, sin IP, y el reemplazo previo no queda registrado | Media | Código | Dispensación — Jorge Vargas | backend/src/routes/captura.routes.ts (líneas 70–73); backend/src/services/dispensacion.service.ts (líneas 594–640) | Pasar `req.ip` al servicio; en `datosNuevos` agregar `origen: 'captura'` para dejar claro que el usuario es el dueño de la dispensación, no quien subió; si ya existía foto del mismo tipo, registrar `EDITAR` con `datosAnteriores` (ruta y fecha de la foto reemplazada). | S | Subir dos veces `RECETA` con el mismo token: la auditoría tiene un `CREAR` y un `EDITAR`, ambos con `ipAddress` no nulo |
| H-38 | `generar-token` audita `CREAR` aunque devuelva el token vigente | Baja | Código | Dispensación — Jorge Vargas | backend/src/services/dispensacion.service.ts (líneas 462–468); backend/src/routes/dispensacion.routes.ts (líneas 250–262) | Que `generarTokenCaptura` devuelva `{ ..., creado: boolean }` y la ruta audite solo si `creado`. | S | Dos llamadas seguidas a `generar-token` → un solo registro `CREAR TokenCaptura` |
| H-29 | No se puede desactivar a un beneficiario | Media | Decisión (P-19) + Código | Dispensación — Jorge Vargas | backend/src/services/dispensacion.service.ts (`editarBeneficiario`); backend/src/routes/dispensacion.routes.ts (PUT beneficiarios); frontend/src/pages/Beneficiarios.tsx | **Recomendado:** sí; aceptar `activo` en el PUT (solo ADMIN) con botón Activar/Desactivar; porque el campo ya existe y la convención del proyecto es *soft delete*. | M | Desactivar → no aparece en `beneficiarios/buscar` y `despachar` responde el código definido en P-23; queda un `EDITAR Beneficiario` en auditoría |
| D-19 | Búsqueda por DPI con `startsWith`, no exacta | Baja | Decisión | Dispensación — Jorge Vargas | Ninguno (documentación) | **Recomendado:** conservar `startsWith` y documentarlo como mejora sobre la especificación; porque permite encontrar al beneficiario con un DPI incompleto y el DPI completo sigue dando un único resultado. | S | No aplica (texto de la tesis) |
| H-20 / D-17 | El Encargado no ve la página de Reportes, aunque el backend se lo permite | Media | Decisión (R-07 sin confirmar) + Código | Reportes — Daniel Reyes (`App.tsx`, `Layout.tsx`: dareyes-87) | frontend/src/App.tsx (línea 77); frontend/src/components/layout/Layout.tsx (línea 55); frontend/src/pages/Reportes.tsx | Tras confirmar R-07: sacar `/reportes` de `AdminRoute`, agregar `ENCARGADO_BENEFICENCIA` al ítem del menú y ocultar los botones de exportar si `!isAdmin` (la exportación sigue siendo solo ADMIN en el backend). | S | Con un usuario Encargado: el menú muestra Reportes, los 6 tabs cargan, no hay botones de exportar y `exportar` por API sigue en 403 |
| D-16 | La especificación dice que el Encargado ve solo sus dispensaciones; el código muestra todas | Baja | Aceptar | Dispensación — Jorge Vargas | Ninguno | Aceptar según R-08 (una sola persona opera la farmacia); documentar como cambio de diseño cuando se confirme. | — | No aplica |
| H-22 / D-24 | Los umbrales del semáforo no tienen pantalla de edición | Media | Código | Inventario — Daniel Reyes | frontend/src/pages/Inventario.tsx (o una sección nueva en la pantalla de Usuarios/Administración); frontend/src/api/inventario.ts (ya tiene `actualizarConfiguracion`) | Agregar, solo para ADMIN, un formulario "Umbrales de vencimiento" (rojo, amarillo) que use `actualizarConfiguracion`; el backend ya valida. | M | Cambiar rojo a 45 → Inventario y Dispensación muestran ROJO para un lote a 40 días; queda un `EDITAR configuracion` en auditoría |
| H-27 / D-27 | Motivo de baja opcional, solo en la auditoría, y se puede dar de baja cualquier lote | Media | Decisión (P-18) + Código | Inventario — Daniel Reyes | backend/src/routes/inventario.routes.ts (líneas 447–480); schema.prisma + migración (`Lote.motivoBaja`, `Lote.fechaBaja`); frontend/src/pages/Inventario.tsx; backend/src/services/reportes.service.ts (reporte de bajas) | **Recomendado:** motivo obligatorio (mínimo 5 caracteres) y permitir la baja de cualquier lote no dado de baja (vencido, dañado, extraviado); guardar motivo y fecha en el lote y mostrarlos en el reporte de bajas; porque la baja de lotes vigentes es la única corrección de inventario disponible (R-05). | M | `PUT /lotes/:id/baja` sin motivo → 400; con motivo → el reporte `baja` muestra motivo y fecha; el reporte puede filtrar por fecha de baja |
| H-43 | `GET /inventario` y `/inventario/entradas` no controlan `page`/`pageSize` no numéricos (500 o `null`) | Baja | Código | Inventario — Daniel Reyes (dareyes-87) | backend/src/routes/inventario.routes.ts (líneas 153–154 y 190–191) | Usar `clampPaginacion` de `utils/validacion.ts`, como en `historial` y `auditoria`. | S | `GET /inventario/entradas?page=abc` → 200 con `page: 1`; `GET /inventario?pageSize=x` → `pageSize` numérico |
| D-18 | Sin auditoría: cron `DISPONIBLE→VENCIDO`, marca `usado` y purga de tokens, vinculación de códigos en la importación | Baja | Código (importación) + Aceptar (eventos automáticos) | Inventario — Daniel Reyes; captura — Jorge Vargas | backend/src/routes/inventario.routes.ts (líneas 847–857 y 927) | Auditar `CREAR codigo_barras` en la importación (hay `req.user`). Aceptar los eventos automáticos: `LogAuditoria.usuarioId` es obligatorio (schema.prisma, línea 264) y el cambio a `VENCIDO` se deduce de la fecha; documentarlo así en la tesis. | S | Importar un Excel con código de barras nuevo → registro `CREAR` de entidad `codigo_barras` |
| H-42 | Alta de categorías y ubicaciones compara sin recortar y guarda recortado → 500 en vez de 409 | Baja | Código | Catálogos — Audias Guevara (`catalogos.routes.ts`: dareyes-87, jorgevargas83, Audias22) | backend/src/routes/catalogos.routes.ts (líneas 482–495 y 580–593) | Recortar antes de comprobar, comparar con `mode: 'insensitive'` (igual que la importación) y usar `responderError` en el `catch`. | S | `POST /catalogos/categorias` con `" Analgésico "` existente → 409 |
| H-31 | El 409 del código de barras dice "otro medicamento" aunque sea el mismo | Baja | Código | Catálogos — Audias Guevara | backend/src/routes/catalogos.routes.ts (línea 405) | Si `existente.medicamentoId === id`, responder "Este código ya está registrado en este medicamento". | S | Agregar dos veces el mismo código al mismo medicamento → 409 con el mensaje nuevo |
| H-44 | La exportación de inventario no valida `estado` (500 donde la consulta da 400) | Baja | Código | Reportes — Daniel Reyes (dareyes-87) | backend/src/routes/reportes.routes.ts (líneas 69–72 y 225–232) | Extraer la validación de `estado` de `inventario-actual` a una función y usarla también en `exportar`. | S | `GET /reportes/exportar/inventario/pdf?estado=XYZ` → 400 |
| H-30 | Nombres de entidad en la auditoría mezclan PascalCase y minúsculas | Baja | Aceptar | Auditoría — Daniel Reyes / Dispensación — Jorge Vargas | Ninguno | Aceptar: el filtro ya compara sin mayúsculas (auditoria.routes.ts, línea 48); renombrar ahora partiría el historial en dos nombres. Documentar la lista real de entidades en la tesis. | — | No aplica |
| H-19 | El JWT sigue en `localStorage` | Baja | Aceptar | Auth — Daniel Reyes | Ninguno | Aceptar: pasar a *cookie* `httpOnly` exige CSRF y cambiar `client.ts` y el backend; el riesgo depende de un XSS, mitigado por React y por las cabeceras de nginx en producción (H-36). | — | No aplica |
| H-37 | Con `trust proxy 1`, una petición local al puerto 3000 puede falsear `X-Forwarded-For` | Baja | Aceptar | Setup — Daniel Reyes | Ninguno | Aceptar: el puerto 3000 solo escucha en `127.0.0.1` (H-04); requiere acceso al propio servidor. | — | No aplica |
| H-08 | En modo desarrollo el puerto 80 está publicado sin proceso | Baja | Aceptar (se resuelve con H-36) | Setup — Daniel Reyes | Ninguno | Aceptar: con `docker-compose.prod.yml` solo se publica el 80 con nginx; los scripts de inicio ya anuncian el puerto correcto. | — | No aplica |
| D-23 | Recursos públicos: `/api/captura/:token/*`, `/api/health`, fotos de medicamentos | Baja | Aceptar | Setup — Daniel Reyes / captura — Jorge Vargas | Ninguno (salvo H-07) | Aceptar por diseño: el token de captura es la credencial y las fotos de medicamentos no son datos personales. Quitar `environment` de `/api/health` se hace en H-07. | — | No aplica |
| D-20 | Lote a 30 días exactos: ROJO en el código, AMARILLO en la especificación | Baja | Decisión | Inventario — Daniel Reyes | Ninguno (documentación) | **Recomendado:** conservar `<=` y documentarlo como regla vigente; porque es el criterio más conservador, ya lo comparten Inventario y Dispensación y lo cubre `inventario.service.test.ts`. | — | No aplica |
| D-22 | El historial de beneficiario no se exporta a PDF/Excel | Baja | Decisión | Reportes — Daniel Reyes | Si se implementa: backend/src/routes/reportes.routes.ts (`TIPOS_VALIDOS`), reportes.service.ts, frontend/src/pages/Beneficiarios.tsx | **Recomendado:** aceptar como fuera de alcance de esta entrega; porque el historial se consulta en pantalla y el reporte de dispensaciones ya filtra por beneficiario y sí se exporta. | (L si se implementa) | Si se implementa: `exportar/beneficiario/pdf?beneficiarioId=…` → PDF con sus dispensaciones |
| D-14 | La especificación nombra Recharts; la dependencia se eliminó | Baja | Aceptar | Documentación — Audias Guevara | Ninguno | Aceptar: documentar en la tesis que el dashboard no tiene gráficos; no modificar la especificación v1 (documento histórico). | — | No aplica |
| D-28 | Compose define 4 servicios (`backup` incluido) y dos archivos, la especificación dice 3 | Baja | Aceptar | Setup — Daniel Reyes | Ninguno | Aceptar: documentar el servicio `backup` y los dos archivos de Compose en el capítulo 7. | — | No aplica |
| H-23 | La operación diaria se hace con una cuenta ADMIN | Media | Instalación | Operación — responsable de la instalación | Ninguno | Crear en el servidor una cuenta `ENCARGADO_BENEFICENCIA` para el despacho y reservar la ADMIN; depende de H-20 (sin reportes el Encargado no puede trabajar). | — | En el servidor: `GET /api/auditoria?accion=DISPENSAR` muestra el usuario Encargado en las dispensaciones nuevas |

Fuente: Elaboración propia.

Tabla 2.
Resumen por prioridad y tipo de acción

| Prioridad | IDs | Código | Decisión | Instalación | Aceptar |
|-----------|-----|--------|----------|-------------|---------|
| Crítica | H-36, H-03 | 1 (H-03, paso 2) | 1 (H-36) | 2 | 0 |
| Alta | H-07, H-17, H-46, H-39 | 3 | 1 | 2 | 0 |
| Media | H-40, H-45, H-15, H-16, H-41, H-10, H-35, H-29, H-20/D-17, H-22/D-24, H-27/D-27, H-23 | 10 | 4 | 1 | 1 (H-10, revocación) |
| Baja | H-38, D-19, D-16, H-43, D-18, H-42, H-31, H-44, H-30, H-19, H-37, H-08, D-23, D-20, D-22, D-14, D-28 | 6 | 3 | 0 | 9 |

Fuente: Elaboración propia. Una fila puede combinar dos tipos (p. ej. "Decisión + Código"), por lo que
las columnas no suman el total de filas.

## 2. Preguntas abiertas que bloquean una corrección

Tabla 3.
Preguntas abiertas, opción recomendada y hallazgo que desbloquean

| Pregunta | Pregunta (resumen) | Opción recomendada | Desbloquea |
|----------|--------------------|--------------------|------------|
| P-16 | ¿La foto de la receta debe ser obligatoria para dispensar? | **No obligatoria en el sistema**, pero registrar en la auditoría la acción "Omitir fotos" para que quede constancia. Exigirla bloquearía el despacho si falla el celular o la red, y la receta física se puede revisar en mostrador (R-06). | RN-18 (texto de la tesis); cambio opcional en Dispensacion.tsx y una ruta de auditoría |
| P-17 | ¿Hay límites de cantidad por beneficiario o periodo? | **No implementar** hasta que la municipalidad defina el criterio por escrito; el documento original lo dejó pendiente. Documentarlo como fuera de alcance. | RN-14 (sin cambio de código) |
| P-18 | ¿Motivo de baja obligatorio? ¿Solo lotes vencidos? | **Motivo obligatorio; cualquier lote no dado de baja**, guardando motivo y fecha en el lote. | H-27, D-27 |
| P-19 | ¿Debe poder desactivarse un beneficiario? | **Sí, solo ADMIN, con *soft delete*.** | H-29 |
| P-20 | ¿Importación por Excel y alta de medicamentos solo para ADMIN, y entradas manuales para ambos roles? | **Mantener como está y documentarlo como intencional**: el alta de medicamentos y la carga masiva cambian el catálogo; la entrada manual es operación diaria. | Actores de CU-03, CU-07, CU-08; H-23 (la cuenta Encargado sigue pudiendo registrar entradas) |
| P-21 | ¿Obligar a cambiar la contraseña inicial? ¿Cambio de contraseña propio? | **Sí a ambas**: campo `debeCambiarPassword` + `PUT /auth/password`. | H-39 (y completa H-10/H-16) |
| P-22 | ¿Política oficial de contraseñas? | **Mínimo 8 caracteres + lista de valores prohibidos**, igual en todos los puntos; sin caducidad. | H-16, H-41 |
| P-23 | ¿Despachar a beneficiario o medicamento inactivo: 400 o 404? | **400** con mensaje "inactivo", y 404 solo si el id no existe; separar los dos mensajes del servicio. Lo necesita H-29 para que el rechazo sea comprensible. | H-29; casos de prueba del despacho (`04_api.md` §2.5) |
| R-07 / R-08 | Confirmación con la municipalidad de que el Encargado consulta todos los reportes y todas las dispensaciones | **Confirmar tal como está redactado.** | H-20, D-16, D-17, H-23 |
| P-06 (instalación) | ¿Se cambiaron `JWT_SECRET` y `DB_PASSWORD` en el servidor? | Comprobar en sitio (sección 4). | H-03 (paso 2 del código) |
| P-04 (instalación) | ¿Funciona `VITE_LAN_IP` para el QR en modo producción? | Comprobar en sitio tras H-36; si no funciona, el QR usa `window.location.origin`, que en producción es la IP del servidor. | H-36 |

Fuente: Elaboración propia.

P-11 y P-12 siguen marcadas como abiertas en `preguntas_abiertas.md`, pero sus hallazgos (H-06 y H-04)
ya están resueltos; no bloquean ninguna corrección.

## 3. Orden de trabajo sugerido (un lote por pull request)

Cada lote agrupa un módulo para tocar cada archivo una sola vez. Los lotes con migración (L4, L5, L7)
deben incluir la carpeta de `prisma/migrations/` (CLAUDE.md, sección "Comandos"). Como todo lo que
entra a `main` llega al servidor en 30 minutos (docs/DESPLIEGUE.md, líneas 5–7), ningún lote que
cambie variables obligatorias se mezcla antes de completar la sección 4.

Tabla 4.
Lotes de corrección en orden sugerido

| Orden | Lote (rama sugerida) | Responsable sugerido | IDs | Archivos | Requisito previo |
|-------|----------------------|----------------------|-----|----------|------------------|
| 0 | Instalación en sitio (sin PR) | Responsable de la instalación | H-36, H-03 (paso 1), H-07, H-17, H-23, P-06, P-04 | `.env` y `auto-update.cmd` del servidor | Ninguno. Va primero porque es lo único Crítico y no depende del código |
| 1 | `fix/fechas-reportes` | Daniel Reyes (Reportes) | H-46, H-44 | backend/src/utils/fecha.ts, backend/src/services/reportes.service.ts, backend/src/routes/reportes.routes.ts, backend/src/routes/auditoria.routes.ts, backend/tests/fecha.test.ts | Ninguno |
| 2 | `fix/config-compose` | Daniel Reyes (Setup) | H-40, H-07 (código), H-03 (paso 2) | docker-compose.yml, backend/src/server.ts, docs/DESPLIEGUE.md | Lote 0 completado y confirmado (si no, el servidor deja de arrancar) |
| 3 | `fix/catalogos-validacion` | Audias Guevara (Catálogos) | H-42, H-31, H-15 (ubicaciones) | backend/src/routes/catalogos.routes.ts | Ninguno |
| 4 | `fix/usuarios-contrasenas` | Daniel Reyes (Admin) | H-15 (usuarios), H-16, H-39, H-41, H-10 | backend/src/routes/usuarios.routes.ts, backend/src/routes/auth.routes.ts, backend/src/utils/validacion.ts, backend/prisma/seed.ts, backend/prisma/schema.prisma + migración, backend/docker-entrypoint.sh, frontend/src/context/AuthContext.tsx, frontend (pantalla de cambio de contraseña), backend/tests/seed.test.ts | P-21, P-22 decididas. Avisar antes del merge: el administrador del servidor deberá cambiar su contraseña al siguiente ingreso |
| 5 | `fix/dispensacion-trazabilidad` | Jorge Vargas (Dispensación) | H-45, H-35, H-38, H-29, P-23 | backend/src/services/dispensacion.service.ts, backend/src/routes/dispensacion.routes.ts, backend/src/routes/captura.routes.ts, frontend/src/pages/Beneficiarios.tsx | Lote 1 (usa los helpers de fecha); P-19 y P-23 decididas |
| 6 | `fix/inventario-bajas-umbrales` | Daniel Reyes (Inventario) | H-43, H-27/D-27, H-22/D-24, D-18 (importación) | backend/src/routes/inventario.routes.ts, backend/prisma/schema.prisma + migración, frontend/src/pages/Inventario.tsx, frontend/src/api/inventario.ts; backend/src/services/reportes.service.ts (solo el reporte de bajas) | P-18 decidida. Única excepción a "un archivo una vez": `reportes.service.ts` ya se tocó en el lote 1; va después para no mezclar migración con el arreglo de fechas |
| 7 | `fix/reportes-encargado` | Daniel Reyes (Reportes/frontend) | H-20/D-17 | frontend/src/App.tsx, frontend/src/components/layout/Layout.tsx, frontend/src/pages/Reportes.tsx | R-07 confirmada. Después, en sitio, completar H-23 (cuenta Encargado) |
| 8 | Documentación (rama `docs/documentacion`) | Audias Guevara | D-14, D-16, D-19, D-20, D-22, D-23, D-28, H-08, H-19, H-30, H-37, D-18 (eventos automáticos), P-16, P-17, P-20 | docs/documentacion/analisis y capítulos | Las decisiones de la sección 2 tomadas |

Fuente: Elaboración propia.

Cada lote de código debe pasar `npm run build` en backend y frontend y `npm test` en backend (el
workflow "Despliegue seguro" corre las pruebas con `TZ=America/Guatemala` y `TZ=UTC`,
`.github/workflows/despliegue-seguro.yml`, líneas 93–94), y agregar la prueba indicada en la tabla 1
cuando sea de backend. El frontend no tiene framework de pruebas: sus cambios (lotes 4, 5, 6 y 7) se
verifican a mano en navegador.

## 4. Lista de comprobación para el servidor de la farmacia

Para hacer en sitio, antes del lote 2. No anotar contraseñas ni secretos en este repositorio; registrar
solo Sí/No en `pendientes_instalacion.md`.

1. [ ] Sacar un respaldo manual antes de tocar nada y comprobar que existe el último
   `backups/predeploy_*.dump` (docs/RESPALDOS.md).
2. [ ] Revisar el `.env` del servidor: ¿define `JWT_SECRET` y `DB_PASSWORD` distintos de los valores de
   `docker-compose.yml`? (H-03, P-06). Si no:
   - generar un `JWT_SECRET` aleatorio largo (cerrará todas las sesiones abiertas, es esperado);
   - cambiar la contraseña del usuario de Postgres con `ALTER USER` dentro de `farmag_db` **y** luego la
     variable `DB_PASSWORD`; cambiar solo la variable deja la API sin conexión.
3. [ ] Definir `NODE_ENV=production` y `FRONTEND_TARGET=production` / `BACKEND_TARGET=production`, o
   adoptar `docker-compose.prod.yml` (H-36, H-07, H-17).
4. [ ] Revisar `auto-update.cmd` (no está en el repositorio) y, si se adopta `docker-compose.prod.yml`,
   cambiar su comando a `docker compose -f docker-compose.prod.yml up -d --build`; guardar una copia del
   script en `docs/` para la tesis (P-05).
5. [ ] Definir `CORS_ORIGIN` con la URL real de acceso (`http://<IP del servidor>`) (H-40).
6. [ ] Confirmar que `ADMIN_INITIAL_PASSWORD` tiene 8 o más caracteres y no es un valor prohibido, o
   dejarla vacía si el administrador ya existe (H-41).
7. [ ] Si el administrador se creó con contraseña aleatoria, cambiarla y, si Docker conserva el log
   antiguo, recrear el contenedor `api` para descartar ese log (H-39).
8. [ ] Tras reiniciar: `docker compose ps` muestra solo `:80` hacia la red (5432 y 3000 en `127.0.0.1`);
   `GET /api/health` responde y no indica `development`; `ESTADO_ARRANQUE.txt` sin `ERROR`/`ATENCION`
   (H-04, H-07, H-36).
9. [ ] Firewall del equipo: solo el puerto 80 abierto a la red local (P-12).
10. [ ] Probar el QR de captura con un celular real entrando por `http://<IP>` (P-04; CLAUDE.md, "Prueba
    pendiente con celular real").
11. [ ] Crear una cuenta `ENCARGADO_BENEFICENCIA` para la persona que despacha y dejar la cuenta ADMIN
    solo para administración (H-23), después del lote 7.
12. [ ] Anotar en `pendientes_instalacion.md` los datos de las filas 4, 6, 7 y 9 que se confirmen.

Fuente: Elaboración propia.
