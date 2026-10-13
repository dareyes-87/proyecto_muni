# SECURITY_AUDIT — FarmaG

**Fecha:** 2026-10-07 · **Alcance:** OWASP Top 10 + subida de archivos, path traversal, secretos, dependencias.
**Método:** revisión de código + pruebas en vivo (no destructivas) contra el entorno local de desarrollo.

> **Veredicto:** base de seguridad **sólida**, sin hallazgos críticos. Los pendientes son de endurecimiento para producción. Referencias cruzadas con [`AUDITORIA_COMPLETA.md`](AUDITORIA_COMPLETA.md).

---

## Resumen OWASP Top 10

| ID | Categoría | Estado | Hallazgo |
|---|---|---|---|
| A01 | Broken Access Control | ✅ Correcto / 🟡 IDOR por diseño | H-008 |
| A02 | Cryptographic Failures | ✅ bcrypt(12) + JWT; TLS a nivel despliegue | — |
| A03 | Injection | ✅ Parametrizado (Prisma) | — |
| A04 | Insecure Design | 🟡 lockout por username sin IP | H-011 |
| A05 | Security Misconfiguration | 🟡 Dockerfile dev + dev server en LAN | H-001, H-007 |
| A06 | Vulnerable Components | 🔴 varios CVEs (sharp) | H-003 |
| A07 | Identification & Auth Failures | 🟡 credencial por defecto; enum por tiempo | H-002, H-010 |
| A08 | Software & Data Integrity | 🟡 sin lockfile | H-006 |
| A09 | Logging & Monitoring | ✅ auditoría completa; IP dev poco útil | H-009 |
| A10 | SSRF | ✅ URL fija a OpenFDA, entrada solo dígitos | — |

---

## A01 — Broken Access Control

**Verificado en runtime.** Todas las rutas protegidas usan `authMiddleware`; las de administración añaden `requireRole('ADMIN')`.

- Escalamiento vertical: `ENCARGADO_BENEFICENCIA` recibió **403** en `/usuarios`, `/auditoria`, `POST /catalogos/medicamentos`, `/reportes/exportar/*`, `/inventario/plantilla-excel`, `/catalogos/medicamentos/lookup-fda/*`; y **200** en sus endpoints (`/inventario`, reportes de lectura).
- Protección en frontend (`AdminRoute`) **y** backend (`requireRole`): la defensa no depende del cliente.
- **H-008 (IDOR por diseño, BAJO):** un usuario autenticado puede leer cualquier recurso por UUID (p. ej. `GET /dispensacion/:id`). No hay control de pertenencia. Mitigado por UUID v4 no adivinables y por ser ambos roles personal de confianza. Aceptable para el contexto; a documentar.

## A02 — Cryptographic Failures

- Contraseñas con `bcrypt` cost 12. Tokens JWT firmados HS256 con secreto exigido.
- `config/env.ts` aborta en producción si `JWT_SECRET` es de ejemplo o < 16 chars, o si la contraseña de BD es de ejemplo. **Verificado por lectura.**
- TLS/HTTPS se delega al despliegue (no es responsabilidad de la app). La captura por QR usa `<input capture>` (no `getUserMedia`), así que no exige contexto seguro sobre IP de LAN.

## A03 — Injection

- **SQL:** Prisma parametriza todas las consultas. El único `$queryRaw` (SELECT ... FOR UPDATE en el despacho) usa *tagged template* de Prisma (`${item.medicamentoId}`, `${hoy}::date`) → parametrizado, no concatenado. **Probado en vivo:** `q=' OR 1=1--` no tuvo efecto (200, data vacía).
- **Command/Template injection:** no hay `exec`/`eval`/plantillas de servidor.

## A04 — Insecure Design

- **H-011 (lockout DoS, BAJO):** el bloqueo por 3 intentos es **por username, sin dimensión de IP**; un atacante que conozca usernames puede bloquear a usuarios legítimos. Compromiso clásico; considerar IP+usuario o backoff.
- **H-017 (rate-limit en memoria, INFORMATIVO):** no persiste ni escala horizontalmente. Aceptable para una sola instancia.

## A05 — Security Misconfiguration

- `helmet()` activo (HSTS, X-Content-Type-Options, X-Frame-Options SAMEORIGIN confirmados en vivo), `x-powered-by` **oculto** (confirmado).
- CORS: en producción solo orígenes de `CORS_ORIGIN` (o desactivado); en desarrollo refleja cualquier origen. Correcto.
- Puertos `db`(5432) y `api`(3000) atados a `127.0.0.1`; solo `web` en la LAN. **Verificado** (`docker compose ps`).
- **H-001 (ALTO):** Dockerfile del backend solo en modo desarrollo con `prisma db push --accept-data-loss`. Ver informe principal.
- **H-007 (MEDIO):** dev server de Vite publicado en `0.0.0.0:5173` en el modo por defecto; combinado con el CVE de esbuild, amplía superficie en la LAN.

## A06 — Vulnerable and Outdated Components

**`npm audit` (dentro de los contenedores):**

### Backend — 7 vulnerabilidades (4 high, 3 moderate)
| Paquete | Severidad | Nota | Relevancia runtime |
|---|---|---|---|
| `sharp` ≤ 0.35.5 | **high** | CVEs en libvips/libheif/librsvg | **Alta** — procesa imágenes subidas (incluye canal público por token) |
| `uuid` < 11.1.1 | moderate | bounds check (vía `exceljs`, `node-cron`) | Baja |
| `deepmerge-ts` (vía `@prisma/config`→`prisma`) | high | stack exhaustion | Baja (devDependency / build) |

### Frontend — 13 vulnerabilidades (8 high, 5 moderate)
| Paquete | Severidad | Nota | Relevancia runtime |
|---|---|---|---|
| `esbuild` ≤ 0.24.2 (vía `vite`) | moderate | el dev server acepta peticiones de cualquier sitio | Solo **dev**; nulo en build nginx |
| `source-map-js` | high | DoS de build | Solo build |
| `postcss-selector-parser` (vía `postcss-nested`) | moderate | complejidad cuadrática | Solo build |
| `react-router` 6.x | moderate | open redirect por backslash / inyección en hidratación SSR | Baja (no se usa SSR; `<Link>` con destinos controlados) |

> **Conclusión:** priorizar **`sharp`** (runtime, uploads parcialmente no autenticados) y **`uuid`**. En frontend, la mayoría son de build/dev y desaparecen al desplegar con nginx (`FRONTEND_TARGET=production`). No actualizar a ciegas: no hay `package-lock.json` (H-006) y varias actualizaciones son *breaking*.

## A07 — Identification and Authentication Failures

- **H-002 (ALTO):** credencial admin por defecto `admin`/`admin2026`, documentada en el repo, sin cambio forzado. Confirmado en runtime.
- **H-010 (BAJO, potencial):** `bcrypt.compare` solo corre para usuarios existentes → posible enumeración por tiempo. Respuesta y lockout idénticos en ambos casos (bien). Recomendación: hash dummy para igualar tiempos.
- **H-013 (BAJO):** sin revocación de JWT (logout solo cliente). Mitigado por verificación de "usuario activo" en cada request.
- Positivo: **sesión validada contra BD en cada request** (desactivar usuario → 401 inmediato, verificado).

## A08 — Software and Data Integrity Failures

- **H-006 (MEDIO):** sin `package-lock.json`; `npm install` (no `npm ci`). Builds no reproducibles, sin verificación de integridad.
- Positivo: `.env` correctamente en `.gitignore`; solo `.env.example` con placeholders está versionado — **no hay secretos en el repositorio** (verificado con `git ls-files`).

## A09 — Security Logging and Monitoring Failures

- Auditoría completa (`registrarAuditoria`) en todas las acciones que modifican datos, incluida la subida de fotos por token (bajo el usuario que dispensó) y los intentos de login fallidos de usuarios existentes. **Verificado en vivo** (el log mostró mis acciones en tiempo real).
- **H-009 (BAJO):** en desarrollo la IP registrada es la de la red Docker (`::ffff:172.18.0.x`), no la del cliente. En producción nginx debe aportar `X-Forwarded-For` — **NO VERIFICADO**.
- Sin alertas/monitoreo externo (fuera de alcance para el tamaño del sistema).

## A10 — Server-Side Request Forgery

- Único fetch saliente: OpenFDA (`lookup-fda`). La URL es fija (`api.fda.gov/...`) y el NDC se deriva **solo de dígitos** (`replace(/\D/g,'')`), con timeout de 5s. **Sin SSRF.** Requiere rol ADMIN.

---

## Controles adicionales verificados

- **Path traversal (fotos):** `obtenerArchivoFoto` usa `path.basename(imagenUrl)` + `resolve` + verificación de prefijo de raíz → impide salir de `uploads/dispensaciones/`. El nombre nunca viene de entrada libre del cliente. ✅
- **Subida de archivos:** `multer` en memoria, límite 5MB (captura/medicamento) / 10MB (Excel), `fileFilter` restringe a jpg/png/webp; recompresión a WebP con `sharp({failOn:'none'})`. ✅
- **Fotos sensibles no públicas (H-11):** `/uploads/dispensaciones/*` **no** se sirve estático (404 confirmado); solo por `GET /api/dispensacion/:id/foto/:tipo` autenticado (401 sin token confirmado), con `Cache-Control: private, no-store`. ✅
- **Tokens de captura:** `nanoid(10)`, 30 min de vida, un solo uso, una dispensación, se marcan `usado` al completar; token inexistente/vencido/usado → **mismo 404** (no filtra existencia). ✅
- **XSS:** sin `dangerouslySetInnerHTML`/`innerHTML`/`eval` en el frontend; React escapa por defecto. Token en `localStorage` (robo solo posible con XSS; no se halló vector). ✅
- **CSRF:** la API usa `Authorization: Bearer` (no cookies de sesión) → no explotable por CSRF clásico. ✅

---

## Recomendaciones de seguridad priorizadas

1. **Inmediato:** cambiar la contraseña del admin (H-002); validar fechas → 400 (H-004).
2. **Antes de producción:** actualizar `sharp`/`uuid` (H-003); desplegar con nginx, no dev server (H-007); Dockerfile de producción + migraciones (H-001); lockfile + `npm ci` (H-006).
3. **Endurecimiento:** hash dummy anti-enumeración (H-010); lockout por IP+usuario (H-011); confirmar `X-Forwarded-For` en producción (H-009).
