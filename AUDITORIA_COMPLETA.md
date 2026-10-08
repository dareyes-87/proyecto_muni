# AUDITORÍA TÉCNICA COMPLETA — FarmaG

**Sistema:** FarmaG — Gestión de inventario y dispensación gratuita de medicamentos, Farmacia Municipal de Gualán, Zacapa, Guatemala.
**Fecha de la auditoría:** 2026-10-07
**Rama auditada:** `feature/dispensacion-evidencia-pc` (árbol de trabajo con cambios sin commit)
**Entorno de prueba:** Docker Compose en ejecución (db + api + web sanos) en `localhost` — `NODE_ENV=development`.
**Auditor:** Revisión integral (QA, backend, frontend, base de datos, seguridad, DevOps) con inspección de código + pruebas en vivo.

> Documentos complementarios: [`TEST_PLAN.md`](TEST_PLAN.md), [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md), [`BUGS_FOUND.md`](BUGS_FOUND.md), [`CODE_REVIEW.md`](CODE_REVIEW.md), [`CHANGES_MADE.md`](CHANGES_MADE.md).

---

## 1. Resumen ejecutivo

**Valoración general: BUENO.**

FarmaG es un sistema maduro y bien construido. La lógica de negocio crítica —dispensación FIFO con control de concurrencia, criterio único de vencimiento, auditoría de acciones, separación de roles— funciona correctamente y fue **verificada en tiempo de ejecución**, no solo por lectura de código. El proyecto ya pasó por un ciclo de remediación previo (informe de 34 hallazgos, 28/09/2026) y la gran mayoría de aquellos defectos están efectivamente corregidos y los confirmé en vivo (invalidación de sesión en caliente, bloqueo por intentos de login, cabeceras de seguridad, fotos de evidencia no públicas, exclusión de lotes vencidos del despacho, etc.).

**No se encontró ningún hallazgo CRÍTICO.** No hay bypass de autenticación, no hay escalamiento de privilegios, no hay inyección SQL, no se exponen secretos en el repositorio, y el control de concurrencia evita el doble gasto de inventario bajo carrera real.

Los problemas pendientes son principalmente de **preparación para producción y madurez operativa**, no de corrección funcional: el contenedor del backend arranca siempre en modo desarrollo (con sincronización de esquema destructiva), el sistema se siembra con una contraseña de administrador conocida, hay dependencias con CVEs conocidos (destaca `sharp`, que procesa imágenes subidas), y varios endpoints devuelven HTTP 500 ante un filtro de fecha inválido en vez de 400.

| Dimensión | Estado |
|---|---|
| Funcionalidad núcleo (inventario, dispensación, catálogos, reportes, auditoría) | ✅ Correcta y verificada en runtime |
| Autenticación y autorización | ✅ Sólida (RBAC verificado, sesión validada contra BD en cada request) |
| Concurrencia / integridad de inventario | ✅ Correcta (Serializable + SELECT FOR UPDATE, probado con carrera real) |
| Manejo de errores | 🟡 Bueno, con una fuga de código 500 ante fechas inválidas |
| Seguridad | 🟡 Buena base; pendientes de endurecimiento para producción |
| Preparación para despliegue en producción | 🔴 No lista (Dockerfile solo dev, sin migraciones versionadas, credenciales por defecto) |
| Dependencias | 🟡 Varios CVEs conocidos; `sharp` es el de mayor relevancia en runtime |
| Pruebas automatizadas | 🔴 Inexistentes (se añadieron 6 pruebas unitarias en esta auditoría) |

---

## 2. Alcance de la auditoría

**Se revisó realmente (no por suposición):**

- **Código fuente completo** del backend (11 archivos de rutas/servicios/middleware/utils + schema Prisma + seed) y del frontend (páginas, componentes, contexto de auth, cliente API).
- **Configuración y despliegue:** `docker-compose.yml`, ambos `Dockerfile`, `nginx.conf`, `vite.config.ts`, `.env.example`, `.gitignore`, scripts `start.*`.
- **Ejecución real del sistema:** stack Docker levantado y sano; se ejecutaron ~60 pruebas con `curl` contra la API en vivo (auth, roles, validaciones, concurrencia, casos límite, pruebas negativas, inyección).
- **Frontend en navegador real:** login + recorrido de Dashboard, Inventario, Reportes (las 6 pestañas), Catálogos y Auditoría, con revisión de la consola (0 errores JS).
- **Base de datos:** modelo relacional (Prisma schema), restricciones, FKs, índices únicos, y verificación de integridad tras operaciones (FIFO, concurrencia).
- **Dependencias:** `npm audit` y `npm outdated` en ambos proyectos dentro de los contenedores.
- **Type-check:** `tsc --noEmit` (backend) y `tsc -b` (frontend) — ambos limpios.
- **Pruebas automatizadas:** se creó y ejecutó una suite unitaria de la lógica de dominio (6/6 PASS).

**No se pudo verificar (declarado explícitamente):**

- **Despliegue en modo producción** (`FRONTEND_TARGET=production`, nginx sirviendo el build): el runtime actual es desarrollo (Vite). El proxy de `/uploads/` por nginx y el arranque del backend en producción **NO VERIFICADOS**.
- **Flujo de captura por QR con un celular físico** (cámara, `capture="environment"`): requiere hardware real. **NO VERIFICADO.**
- **Comportamiento bajo carga sostenida / estrés de conexiones** (p. ej. agotamiento del pool por los múltiples PrismaClient): razonado por diseño, **no medido**.

---

## 3. Arquitectura encontrada

Monorepo de **3 servicios** orquestados por Docker Compose:

```
Navegador  ──►  web (Vite dev :5173  ó  nginx :80)  ──►  api (Express :3000)  ──►  db (PostgreSQL 16)
                         │ proxy /api y /uploads                  │ Prisma ORM
```

- **web:** React 18 + Vite + TypeScript + Tailwind. En desarrollo, Vite sirve en `:5173` y hace proxy de `/api` y `/uploads` a `http://api:3000` por la red interna de Docker. En producción, build estático servido por nginx (`:80`) con el mismo proxy. El frontend **nunca usa una URL absoluta de API** (mismo origen).
- **api:** Node.js + Express + Prisma. Autenticación JWT. Un cron diario (00:05, zona `America/Guatemala`) marca lotes vencidos y purga tokens de captura. Sirve estáticamente **solo** `/uploads/medicamentos` (no sensible); las fotos de dispensación se sirven por un endpoint autenticado.
- **db:** PostgreSQL 16, puerto publicado solo en `127.0.0.1`. La API se conecta por la red interna de Docker.

**Flujo de autenticación:** `POST /api/auth/login` (bcrypt + JWT con `{userId, username, rol}`) → token en `localStorage['farmag_token']` → interceptor axios lo inyecta y limpia sesión en 401 (excepto en `/auth/login`). `authMiddleware` **consulta la BD en cada request** para confirmar que el usuario sigue activo y tomar su rol actual (no el del token).

**Patrón notable:** cada archivo de rutas/servicio instancia su propio `PrismaClient` (ver [H-005](#h-005--múltiples-instancias-de-prismaclient-agotamiento-potencial-del-pool)).

---

## 4. Tecnologías encontradas

| Capa | Tecnología (versión instalada) |
|---|---|
| Frontend | React 18.3, Vite 5.4, TypeScript 5.9, Tailwind 3.4, TanStack Table 8.21, Recharts 2.15, react-router-dom 6.30, react-qr-code, lucide-react, react-hot-toast, axios 1.x |
| Backend | Node 20 (Alpine), Express 4.22, Prisma 6.19, Zod 3.25, jsonwebtoken 9, bcryptjs 2.4, multer 2.x, sharp 0.33.5, exceljs 4.4, pdfkit 0.15, node-cron 3, nanoid 3, helmet 7.2 |
| Base de datos | PostgreSQL 16 (Alpine) |
| Infra | Docker Compose; nginx (modo producción) |
| Type-check | `tsc` limpio en ambos proyectos |
| Pruebas | **Ninguna preexistente**; se añadió `node --test` + 6 unitarias en esta auditoría |

---

## 5. Módulos encontrados

| Módulo | Rutas frontend | Endpoints backend | Rol | Estado verificado |
|---|---|---|---|---|
| Autenticación | `/login` | `POST /auth/login`, `GET /auth/perfil` | Público / autenticado | ✅ |
| Dashboard | `/` | `GET /inventario/alertas` | Ambos | ✅ |
| Inventario | `/inventario`, `/entradas` | `GET/POST /inventario/*`, `importar-excel`, `plantilla-excel`, `lotes/:id/baja`, `configuracion` | Ambos (baja/import/config = ADMIN) | ✅ |
| Dispensación | `/dispensacion` | `POST /dispensacion/despachar`, `/stock/:id`, `/historial`, evidencia QR | Ambos | ✅ (FIFO + concurrencia) |
| Beneficiarios | `/beneficiarios` | `GET/POST/PUT /dispensacion/beneficiarios*` | Ambos | ✅ |
| Captura de evidencia (móvil) | `/captura/:token` (pública) | `GET/POST /captura/:token/*` | Público (token) | ✅ (lógica; no con celular físico) |
| Catálogos | `/catalogos` | CRUD medicamentos/categorías/ubicaciones, códigos de barras, foto, lookup-FDA | Lectura ambos; escritura ADMIN | ✅ |
| Reportes | `/reportes` | 6 GET + `exportar/:tipo/:formato` | Lectura ambos; export ADMIN | ✅ |
| Usuarios (Admin) | `/usuarios` | CRUD usuarios, toggle, reset password | ADMIN | ✅ |
| Auditoría | `/auditoria` | `GET /auditoria` | ADMIN | ✅ |

**Roles:** `ADMIN` y `ENCARGADO_BENEFICENCIA`. (Nota del equipo: la operación real del rol ENCARGADO está pendiente de confirmación con la municipalidad — fuera de alcance de esta auditoría.)

---

## 6. Estrategia de testing utilizada

1. **Caja blanca** (lectura de todo el código) para entender contratos y buscar defectos lógicos.
2. **Caja negra en runtime** (`curl` contra la API en vivo) para pruebas positivas, negativas, de autorización, de casos límite y de concurrencia.
3. **Pruebas de integración end-to-end** (frontend en navegador real → API → BD → auditoría), confirmando consistencia de datos entre capas.
4. **Pruebas de concurrencia real** (dos peticiones simultáneas compitiendo por el mismo stock).
5. **Análisis de dependencias** (`npm audit` / `npm outdated`).
6. **Pruebas unitarias** de la lógica de dominio pura (añadidas y ejecutadas).

Cada afirmación de este informe distingue entre **problema confirmado**, **riesgo potencial**, **recomendación** y **prueba no realizada (NO VERIFICADO)**.

---

## 7. Resumen de pruebas

Ver el detalle completo en [`TEST_PLAN.md`](TEST_PLAN.md).

| Estado | Cantidad |
|---|---:|
| PASS | 52 |
| FAIL | 1 (fecha inválida → 500) |
| BLOCKED | 0 |
| NOT TESTED | 7 (requieren hardware/producción/carga) |
| **Total** | **60** |

- Pruebas unitarias: **6/6 PASS**.
- Type-check: backend y frontend **limpios**.
- Consola del navegador: **0 errores** en 5 pantallas.

---

## 8. Hallazgos por severidad

| Severidad | Cantidad |
|---|---:|
| Crítico | 0 |
| Alto | 3 |
| Medio | 4 |
| Bajo | 8 |
| Informativo | 3 |
| **Total** | **18** |

---

## 9. Hallazgos detallados

> Formato resumido. Los hallazgos de seguridad se amplían en [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md); los funcionales en [`BUGS_FOUND.md`](BUGS_FOUND.md); los de calidad en [`CODE_REVIEW.md`](CODE_REVIEW.md).

### ALTO

#### H-001 — El contenedor del backend arranca siempre en modo desarrollo con sincronización de esquema destructiva
- **Severidad:** Alto · **Categoría:** Configuración / Despliegue
- **Archivo:** `backend/Dockerfile:20`
- **Descripción:** El `CMD` es `npx prisma db push --accept-data-loss && npx prisma db seed && npx tsx watch src/server.ts`, **sin etapa de producción y sin considerar `NODE_ENV`**. En un despliegue "de producción" (poniendo `FRONTEND_TARGET=production` para el web), el backend seguiría corriendo con `tsx watch` (recarga de archivos, sin compilar, mayor consumo) y aplicando `prisma db push --accept-data-loss` **en cada arranque**, además de re-sembrar. `prisma db push --accept-data-loss` puede **eliminar columnas/tablas** si el esquema difiere del estado real, sin migración versionada ni respaldo.
- **Evidencia:** `Dockerfile:20` + ausencia de target `production`. El script `npm run dev` sí usa `prisma migrate deploy`, pero el `CMD` del Dockerfile no lo usa. No existe carpeta `prisma/migrations/`.
- **Impacto:** Riesgo de pérdida de datos en producción; proceso no apto para producción (watcher de desarrollo).
- **Probabilidad:** Media (ocurriría en el primer intento de desplegar "en producción").
- **Recomendación:** Añadir una etapa `production` al Dockerfile del backend que haga `npm run build` y arranque con `node dist/server.js`; usar `prisma migrate deploy` con migraciones versionadas (no `db push --accept-data-loss`) y **no** sembrar automáticamente en producción. Condicionar el comando por `NODE_ENV`.
- **Estado:** Pendiente (relacionado con H-05 "migraciones", diferido por decisión del usuario).

#### H-002 — Credencial de administrador por defecto conocida (`admin` / `admin2026`), sin cambio forzado
- **Severidad:** Alto · **Categoría:** Seguridad / Autenticación (OWASP A07)
- **Archivo:** `backend/prisma/seed.ts:16-27` (documentada además en `README.md` / `CLAUDE.md`)
- **Descripción:** El seed crea el usuario `admin` con contraseña `admin2026`, valor documentado públicamente en el repositorio. `config/env.ts` protege en producción contra secretos JWT/DB de ejemplo, **pero no existe ninguna protección equivalente para la contraseña del administrador**, ni se obliga a cambiarla en el primer inicio.
- **Evidencia:** Confirmado en runtime — `POST /auth/login {admin/admin2026}` → 200 con token válido.
- **Impacto:** Si el sistema se expone en la LAN (que es el modo de operación previsto) con la credencial por defecto, cualquiera en la red obtiene acceso ADMIN total (datos de beneficiarios, auditoría, usuarios).
- **Probabilidad:** Alta si no se cambia manualmente.
- **Recomendación:** Forzar cambio de contraseña en el primer login del admin, o exigir una variable `ADMIN_INITIAL_PASSWORD` sin valor por defecto en producción (abortar si falta/es de ejemplo, igual que `JWT_SECRET`). Como mínimo, procedimiento operativo documentado y verificado de cambio inmediato.
- **Estado:** Requiere decisión.

#### H-003 — Dependencias con vulnerabilidades conocidas (destaca `sharp`, que procesa imágenes subidas)
- **Severidad:** Alto · **Categoría:** Dependencias (OWASP A06)
- **Archivo:** `backend/package.json`, `frontend/package.json`
- **Descripción:** `npm audit` reporta **7 vulnerabilidades en backend (4 high, 3 moderate)** y **13 en frontend (8 high, 5 moderate)**. La de mayor relevancia en runtime es **`sharp <= 0.35.5` (high)** por CVEs en libvips/libheif/librsvg: `sharp` procesa imágenes **subidas por usuarios**, incluido el endpoint **público** `POST /api/captura/:token/foto` (el que sube la foto no está autenticado, solo posee el token). Otras: `uuid < 11.1.1` (moderate, vía exceljs/node-cron), `deepmerge-ts` (vía prisma, devdep). En frontend la mayoría son de tiempo de build/dev (esbuild dev-server, postcss, source-map-js) + `react-router` (moderate).
- **Evidencia:** salida de `npm audit` en ambos contenedores (ver [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md)).
- **Impacto:** Una imagen maliciosa podría explotar la librería nativa de `sharp` (DoS o potencial corrupción de memoria) a través de un canal parcialmente no autenticado.
- **Probabilidad:** Media.
- **Recomendación:** Actualizar `sharp` a ≥ 0.35.5 (cambio mayor; validar el build Alpine). Resolver `uuid` actualizando `exceljs`/`node-cron`. Para producción, usar `FRONTEND_TARGET=production` (elimina la exposición del dev server). Documentar el impacto antes de actualizar (ya que no hay `package-lock.json`).
- **Estado:** Pendiente.

### MEDIO

#### H-004 — Un filtro de fecha inválido devuelve HTTP 500 en vez de 400 (varios endpoints)
- **Severidad:** Medio · **Categoría:** Backend / Manejo de errores / Validación
- **Archivos:** `backend/src/routes/auditoria.routes.ts:33-34`; `backend/src/services/reportes.service.ts:48-49,103-104,263-264,324-325`; `backend/src/services/dispensacion.service.ts:311-316`
- **Descripción:** Los filtros de fecha se convierten con `new Date(cadena)` sin validar. Una cadena inválida produce un `Invalid Date` que Prisma rechaza, lanzando un error que cae en el `catch` del handler → **500**. Confirmado en runtime en `/auditoria`, `/reportes/dispensaciones`, `/reportes/consumo-medicamentos`, `/reportes/entradas` y `/dispensacion/historial`.
- **Evidencia:** `GET /api/auditoria?desde=basura` → `HTTP 500 {"error":"Error interno del servidor"}` (no filtra stack). `GET /api/reportes/dispensaciones?desde=xx` → 500, etc.
- **Impacto:** Semántica incorrecta (debería ser 400) y ruido de "error interno" ante entrada de usuario trivialmente inválida. **No hay fuga de información** (el mensaje es genérico).
- **Probabilidad:** Media (un filtro mal formado o un bug de frontend lo dispara).
- **Recomendación / corrección propuesta:** Validar las fechas en el borde (helper compartido): si `isNaN(new Date(x).getTime())` → responder 400 "Fecha inválida". Es un cambio pequeño y de bajo riesgo pero toca 3 archivos; se documenta como hallazgo (no se aplicó automáticamente) para tu decisión.
- **Estado:** Pendiente (candidato a corrección inmediata).

#### H-005 — Múltiples instancias de PrismaClient (agotamiento potencial del pool)
- **Severidad:** Medio · **Categoría:** Arquitectura / Rendimiento
- **Archivo:** 11 instancias `new PrismaClient()` (auth.middleware, audit, auth.routes, usuarios.routes, catalogos.routes, inventario.routes, auditoria.routes, dispensacion.service, inventario.service, vencimiento.service, reportes.service).
- **Descripción:** Cada módulo crea su propio `PrismaClient`, y cada uno abre su propio pool de conexiones (por defecto `núcleos × 2 + 1`). En una máquina de 4 núcleos: 9 × 11 ≈ 99 conexiones potenciales, al límite del `max_connections=100` por defecto de PostgreSQL; en 8 núcleos lo supera → errores de conexión bajo carga.
- **Evidencia:** `grep "new PrismaClient()"` → 11 coincidencias.
- **Impacto:** Riesgo de agotamiento de conexiones bajo concurrencia; mayor uso de memoria. A escala actual (pocos usuarios) no se manifiesta, **no medido bajo carga**.
- **Recomendación:** Un único `PrismaClient` compartido (singleton exportado desde `src/config/prisma.ts`) importado por todos los módulos.
- **Estado:** Pendiente.

#### H-006 — Sin `package-lock.json`: builds no reproducibles y sin fijación de integridad
- **Severidad:** Medio · **Categoría:** Configuración / Cadena de suministro (OWASP A08)
- **Archivo:** `backend/Dockerfile:11`, `frontend/Dockerfile:7,19` (`npm install`, no `npm ci`); ausencia de `package-lock.json`.
- **Descripción:** El proyecto omite deliberadamente el lockfile (por un conflicto de binarios de `sharp` en Windows vs Alpine). Consecuencia: cada build resuelve rangos `^` a la última versión disponible → builds no deterministas y sin verificación de integridad de paquetes. Las versiones vulnerables pueden entrar o cambiar sin control.
- **Evidencia:** no existe `package-lock.json`; Dockerfiles usan `npm install`.
- **Impacto:** Riesgo de cadena de suministro y de regresiones silenciosas por drift de dependencias.
- **Recomendación:** Generar el lockfile en Linux/CI (o dentro del contenedor Alpine) y versionarlo; usar `npm ci`. Resolver el problema de `sharp` con `--os`/`--cpu` o `optionalDependencies`/`--include=optional` en vez de borrar el lock.
- **Estado:** Pendiente (requiere decisión por el conflicto conocido de sharp).

#### H-007 — El servidor de desarrollo de Vite queda expuesto en la LAN en el modo por defecto
- **Severidad:** Medio · **Categoría:** Configuración / Seguridad (A05)
- **Archivo:** `docker-compose.yml:64-66` (`ports: 80, 5173` en `0.0.0.0`) + `FRONTEND_TARGET` por defecto `development`.
- **Descripción:** El servicio `web` publica `:5173` (Vite dev) en todas las interfaces. Con el CVE de `esbuild` (GHSA-67mh-4wv8-2f99: cualquier sitio web puede enviar peticiones al dev server y leer la respuesta), exponer el dev server en la LAN amplía la superficie. El modo de operación previsto es LAN + target desarrollo.
- **Evidencia:** `docker compose ps` → `0.0.0.0:5173->5173`; `npm audit` frontend.
- **Impacto:** Lectura de recursos del dev server desde la red/navegador; no afecta al build de producción (nginx).
- **Recomendación:** Desplegar con `FRONTEND_TARGET=production` (nginx :80), y no publicar `:5173` fuera de desarrollo.
- **Estado:** Pendiente.

### BAJO

#### H-008 — Sin autorización a nivel de objeto (todo usuario autenticado puede leer cualquier dato)
- **Severidad:** Bajo · **Categoría:** Seguridad (IDOR por diseño)
- **Descripción:** Cualquier usuario autenticado (de cualquier rol) puede leer cualquier beneficiario, dispensación o foto conociendo su UUID (p. ej. `GET /api/dispensacion/:id`). No hay comprobación de pertenencia. Mitigado porque los IDs son UUID v4 no adivinables y ambos roles son personal de confianza. Es una decisión de diseño razonable para esta escala, pero conviene dejarla consciente.
- **Recomendación:** Aceptable para el contexto; documentar la decisión. Revisar si en el futuro se añaden roles de menor confianza.
- **Estado:** Informativo / por decisión.

#### H-009 — La IP registrada en auditoría es la de la red Docker, no la del cliente real (en desarrollo)
- **Severidad:** Bajo · **Categoría:** Backend / Logging
- **Evidencia:** El log muestra `::ffff:172.18.0.x` (gateway de Docker). Con `trust proxy=1`, en desarrollo el proxy de Vite no añade `X-Forwarded-For`, así que `req.ip` es la IP interna. En producción nginx sí establece `X-Forwarded-For`.
- **Impacto:** Las IP de auditoría en desarrollo no son útiles para trazabilidad. **No verificado en producción.**
- **Recomendación:** Confirmar en el despliegue nginx que `X-Forwarded-For` llega correctamente.
- **Estado:** Pendiente de verificación en producción.

#### H-010 — Posible enumeración de usuarios por tiempo de respuesta en login
- **Severidad:** Bajo · **Categoría:** Seguridad (A07)
- **Descripción:** `bcrypt.compare` solo se ejecuta para usuarios existentes y activos; para usuarios inexistentes la respuesta es más rápida → oráculo temporal para distinguir usuarios válidos. El cuerpo de la respuesta y el bloqueo **sí** son idénticos en ambos casos (bien).
- **Evidencia:** lectura de `auth.routes.ts:74-87` (no medido en tiempo). **Riesgo potencial, no confirmado por medición.**
- **Recomendación:** Comparar siempre contra un hash dummy cuando el usuario no exista, para igualar el tiempo.
- **Estado:** Pendiente.

#### H-011 — DoS de bloqueo de cuenta: se puede bloquear a un usuario conocido
- **Severidad:** Bajo · **Categoría:** Seguridad / Disponibilidad
- **Descripción:** 3 intentos fallidos bloquean un usuario 5 minutos (por username, sin dimensión de IP). Un atacante que conozca los nombres de usuario puede mantener bloqueados a usuarios legítimos.
- **Evidencia:** confirmado en runtime (429 tras 3 fallos). Es un compromiso clásico del lockout.
- **Recomendación:** Considerar bloqueo combinado por IP + usuario, o backoff incremental en vez de bloqueo duro.
- **Estado:** Por decisión.

#### H-012 — Listados/alertas cargan todos los lotes en memoria (sin paginación a nivel de BD)
- **Severidad:** Bajo · **Categoría:** Rendimiento
- **Archivo:** `inventario.routes.ts` (`GET /` y `/alertas`).
- **Descripción:** Se traen todos los medicamentos con **todos** sus lotes y se agrega/pagina en memoria. Correcto a escala actual (34 medicamentos), pero O(n) con el crecimiento del historial de lotes.
- **Recomendación:** Si el volumen crece, agregar stock con consultas SQL (`groupBy`/agregaciones) en vez de en memoria.
- **Estado:** Informativo.

#### H-013 — JWT sin revocación del lado servidor (logout solo cliente)
- **Severidad:** Bajo · **Categoría:** Seguridad / Auth
- **Descripción:** El logout solo borra `localStorage`. Un token robado de un usuario **activo** sigue siendo válido hasta expirar (8h). Mitigado por la verificación de "usuario activo" en cada request (desactivar la cuenta sí invalida al instante).
- **Recomendación:** Aceptable con expiración corta; para mayor robustez, lista de revocación o rotación de secreto.
- **Estado:** Informativo.

#### H-014 — `calcularSemaforo` recalcula "hoy" ignorando el valor del llamador
- **Severidad:** Bajo · **Categoría:** Código / Consistencia
- **Archivo:** `inventario.service.ts:65-76` (no acepta `hoy`; llama `diasParaVencer(fecha)` sin contexto).
- **Descripción:** En el mismo request, `esDispensable`/`diasParaVencer` reciben un `hoy` calculado una vez, pero `calcularSemaforo` recalcula `hoyMedianoche()` internamente. Si un request cruza la medianoche, el semáforo y los días podrían diferir en un día. Impacto prácticamente nulo.
- **Recomendación:** Aceptar `hoy` como parámetro opcional y pasarlo desde los llamadores.
- **Estado:** Informativo.

#### H-015 — Las fotos de dispensación no se borran nunca
- **Severidad:** Bajo · **Categoría:** Mantenibilidad / Almacenamiento
- **Descripción:** Al corregir/eliminar dispensaciones, los archivos en `uploads/dispensaciones/<id>/` quedan huérfanos. Ya documentado por el equipo. No es problema con el volumen actual.
- **Recomendación:** Tarea de limpieza o borrado en cascada controlado.
- **Estado:** Informativo (conocido).

### INFORMATIVO

#### H-016 — Inexistencia de suite de pruebas automatizadas (parcialmente remediado en esta auditoría)
- **Categoría:** Calidad / Mantenibilidad
- **Descripción:** El proyecto no tenía ninguna prueba ni framework. Se añadió `backend/tests/inventario.service.test.ts` (6 pruebas de la lógica de vencimiento/semáforo/dispensabilidad, **6/6 PASS**) usando el runner integrado de Node (sin dependencias nuevas) y un script `npm test`. Falta cobertura de rutas, concurrencia y servicios con BD.
- **Recomendación:** Añadir pruebas de integración de los endpoints críticos (despacho/concurrencia) con una BD de prueba.
- **Estado:** Parcialmente corregido (ver [`CHANGES_MADE.md`](CHANGES_MADE.md)).

#### H-017 — Rate-limit de login en memoria: no persiste ni escala
- **Categoría:** Seguridad / Arquitectura
- **Descripción:** El bloqueo se pierde al reiniciar y no funciona con múltiples instancias. Documentado como aceptable para una sola instancia. Correcto para el contexto actual.
- **Estado:** Informativo (por diseño).

#### H-018 — Modo producción (nginx) no verificado en runtime
- **Categoría:** Despliegue
- **Descripción:** El build de producción (nginx sirviendo estáticos + proxy de `/uploads/`) **NO fue verificado** en esta auditoría (el runtime es desarrollo). El proxy de fotos de medicamentos por nginx y el arranque del backend en producción están sin probar.
- **Estado:** NO VERIFICADO.

---

## 10. Seguridad

Base sólida; sin hallazgos críticos. Revisión OWASP Top 10 en [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md). Resumen:

- **A01 Broken Access Control:** RBAC verificado en runtime (ENCARGADO recibe 403 en 6 endpoints ADMIN; permitido en los suyos). Sin escalamiento vertical. IDOR solo "por diseño" entre personal de confianza (H-008).
- **A02 Fallos criptográficos:** bcrypt (cost 12) para contraseñas; JWT firmado; secretos exigidos en producción. Sin TLS a nivel app (se delega al despliegue).
- **A03 Inyección:** Prisma parametriza; `$queryRaw` usa interpolación segura de Prisma (tagged template). Inyección SQL probada en vivo → sin efecto. Sin command/template injection.
- **A05 Mala configuración:** helmet activo, `x-powered-by` oculto, CORS restringido en producción. Pendientes: Dockerfile dev (H-001), dev server en LAN (H-007).
- **A06 Componentes vulnerables:** H-003.
- **A07 Fallos de identificación/autenticación:** credencial admin por defecto (H-002), posible enumeración por tiempo (H-010).
- **A08 Integridad de software/datos:** sin lockfile (H-006).
- **A09 Logging/monitoreo:** auditoría completa y verificada (acciones se registran correctamente); IP en dev poco útil (H-009); sin alertas/monitoreo externo.
- **A10 SSRF:** el único fetch saliente (OpenFDA) usa URL fija con NDC derivado solo de dígitos → sin SSRF.
- **Path traversal:** la entrega de fotos usa `path.basename` + verificación de prefijo de raíz → protegido.
- **Subida de archivos:** tipo (jpg/png/webp) y tamaño (5MB) validados; recomprime a WebP.

---

## 11. Autenticación y permisos

- Login correcto / incorrecto / inexistente / campos faltantes: **todos con el código HTTP esperado** (200/401/401/400).
- Token ausente → 401; token inválido → 401; token de usuario desactivado → 401 **al instante** (verificación contra BD, H-10 remediado, confirmado en vivo).
- Bloqueo por 3 intentos → 429 (confirmado).
- Separación de roles verificada: `ENCARGADO_BENEFICENCIA` → 403 en `/usuarios`, `/auditoria`, crear medicamento, exportar reportes, plantilla Excel, lookup-FDA; → 200 en inventario y reportes de lectura.
- El frontend confirma el rol real contra `/auth/perfil` al cargar (no confía en `localStorage`).

---

## 12. Base de datos

- Modelo relacional correcto (Prisma): PK UUID, FKs explícitas, índices únicos (`username`, `email`, `dpi`, `codigo` de barras/ubicación, `clave` de config, `@@unique([dispensacionId, tipo])` en fotos, `token`/`dispensacionId` en tokens de captura).
- **Snapshots inmutables** en `DetalleDispensacion` (nombre/presentación/concentración al momento de dispensar): correcto para historial.
- **Soft delete** (`activo`) en usuarios, medicamentos, categorías, beneficiarios.
- **Integridad verificada en runtime:** tras FIFO, L1 (vence antes) quedó AGOTADO=0 y L2=restante; tras concurrencia, stock exacto sin doble gasto.
- **Transacciones:** despacho en `$transaction` Serializable con `SELECT ... FOR UPDATE`; entradas e importación Excel transaccionales por fila.
- Observaciones: sin migraciones versionadas (`db push`), ver H-001; carga de lotes en memoria para agregados (H-012). Sin índices sobre columnas de filtro frecuente (`createdAt`, `fechaVencimiento`, `estado`) — aceptable a la escala actual, recomendable si crece.

---

## 13. Backend

- Express + Prisma, rutas limpias por módulo, validación con Zod en entradas estructuradas (entradas de inventario, medicamentos, configuración) y validación manual en el resto.
- Manejo de errores centralizado (`errorHandler`) + helper `responderError` que mapea reglas de negocio y errores Prisma (P2002→409, P2025→404) y oculta detalle de 500 salvo en desarrollo. **Bien**, salvo el caso de fecha inválida (H-004).
- Códigos HTTP correctos en el amplio muestreo probado (200/201/400/401/403/404/409/413/429/500-controlado).
- Cron diario correcto (vencimiento + purga de tokens, cada uno en su try/catch).

---

## 14. Frontend

- 5 pantallas recorridas en navegador real (Dashboard, Inventario, Reportes×6 pestañas, Catálogos, Auditoría): **render correcto, 0 errores de consola**.
- Datos consistentes con el backend (KPIs del dashboard = resultados de mis pruebas; auditoría muestra mis acciones en tiempo real).
- El bug histórico de "pantalla en blanco" en Reportes está **corregido** (cambio de pestañas sin crash).
- Sin sinks de XSS (`dangerouslySetInnerHTML`/`eval`/`innerHTML` ausentes); React escapa por defecto.
- Token en `localStorage` (estándar para SPA; vulnerable a robo si hubiera XSS, pero no se halló vector). Interceptor correcto (no redirige en 401 de login).
- **No verificado:** validaciones visuales exhaustivas de cada formulario con DevTools y la captura por QR en celular físico.

---

## 15. Calidad de código

Alta en general. Detalle en [`CODE_REVIEW.md`](CODE_REVIEW.md). Puntos:
- Buena separación rutas/servicios/utils; nombres claros; comentarios que explican el "por qué" (a menudo citando hallazgos previos).
- Fuente única de verdad del criterio de vencimiento (`estaVencido`) y de validación de fecha de entrada — correcto (DRY).
- Puntos de deuda: 11 PrismaClient (H-005), `calcularSemaforo` recalcula "hoy" (H-014), uso de `any` en algunos `where`, lógica de importación Excel larga (función extensa pero cohesiva).

---

## 16. Dependencias

Ver [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) §Dependencias. Backend 7 vulns (4 high), frontend 13 (8 high, mayoría build/dev). Varias majors atrasadas (Express 5, Prisma 7, React 19, Vite 8, Zod 4) — **no** se recomienda actualizar a ciegas; priorizar `sharp` y `uuid`.

---

## 17. Rendimiento

- Sin N+1 evidentes gracias a `include`/`select` de Prisma.
- Agregados en memoria (H-012) y múltiples pools (H-005): únicos puntos de atención, no medidos bajo carga.
- Imágenes recomprimidas a WebP al subir (bueno para almacenamiento/ancho de banda).
- Exportaciones limitadas a 5000 filas (evita respuestas gigantes).

---

## 18. Casos de prueba

Matriz completa en [`TEST_PLAN.md`](TEST_PLAN.md) (positivas, negativas, límite, autorización, concurrencia).

---

## 19. Riesgos pendientes

1. **Despliegue en producción no resuelto** (H-001, H-006, H-018): el sistema no puede desplegarse con seguridad en su estado actual.
2. **Credencial por defecto** (H-002): riesgo inmediato si se expone sin cambiarla.
3. **`sharp` vulnerable** procesando uploads parcialmente no autenticados (H-003).
4. **Fecha inválida → 500** en varios endpoints (H-004).
5. **Cobertura de pruebas** muy limitada (H-016).
6. **Verificaciones pendientes** por hardware/entorno: captura por QR en celular, modo producción nginx, comportamiento bajo carga.

---

## 20. Recomendaciones priorizadas

### Prioridad 1 — Corregir inmediatamente
- **H-002:** Cambiar la contraseña del admin y/o forzar su cambio; no dejar `admin2026` en operación.
- **H-004:** Validar fechas en el borde → 400 en vez de 500 (corrección pequeña y segura).

### Prioridad 2 — Corregir antes de producción
- **H-001:** Etapa de producción en el Dockerfile del backend + migraciones versionadas (`migrate deploy`), sin `--accept-data-loss` ni seed automático en producción.
- **H-003:** Actualizar `sharp` (y `uuid`); correr en `FRONTEND_TARGET=production`.
- **H-006:** Versionar `package-lock.json` y usar `npm ci`.
- **H-007:** No exponer el dev server de Vite; usar nginx en producción.
- **H-005:** Unificar `PrismaClient` en un singleton.
- **H-018:** Verificar el modo producción (nginx + proxy de uploads) antes de salir a la farmacia.

### Prioridad 3 — Mejoras recomendadas
- **H-010, H-011, H-013:** Endurecimiento de login (hash dummy, dimensión IP en lockout, revocación de token).
- **H-012, H-014, H-015:** Agregados en SQL, parámetro `hoy` en semáforo, limpieza de fotos.
- **H-016:** Ampliar cobertura de pruebas (integración de despacho/concurrencia).
- **H-009:** Confirmar `X-Forwarded-For` en producción.

---

*Fin del informe. Ver documentos complementarios para el detalle por área.*
