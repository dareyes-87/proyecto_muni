# Informe de entrega para Daniel — Estado de seguridad y diferencias con GitHub

> **De:** Jorge · **Fecha:** 2026-10-07 · **Rama:** `feature/dispensacion-evidencia-pc`
> **Objetivo:** dejar constancia de (1) la auditoría ofensiva de seguridad y las correcciones
> aplicadas hoy, y (2) **qué diferencia exactamente este código local de lo que está en GitHub**,
> para coordinar el commit/merge.

---

## 0. TL;DR (léelo primero)

1. **GitHub `main` está en `4fde08a`**, que es exactamente el mismo commit que mi `HEAD` local.
   `git log origin/main..HEAD` está **vacío** → **no hay ningún commit local que no esté en GitHub**.
2. **TODO lo que difiere de GitHub está SIN COMMITEAR** (en el árbol de trabajo):
   **37 archivos modificados (+987 / −229) y 31 archivos nuevos.**
3. Ese bloque sin commitear **no es solo lo de hoy**: acumula varias sesiones —
   la remediación de hallazgos H-01..H-34 (01/10), dos auditorías (07/10) y el **pentest
   ofensivo + fixes de hoy**. Nada de eso se ha subido todavía.
4. **Nota de corrección:** el `CLAUDE.md` dice que `194f8fb` (refactor de UI) estaba "sin push y sin
   merge a main". **Eso ya no es cierto:** `main` en GitHub ya contiene `194f8fb` y `4fde08a`. La rama
   remota `feature/dispensacion-evidencia-pc` quedó en `194f8fb` (un commit por detrás de `main`).
5. Mi trabajo de hoy compila (`tsc` limpio), la API quedó sana y las **23 pruebas pasan**. Sin regresiones.

---

## 1. Qué hice hoy (auditoría ofensiva de seguridad)

Pentest completo contra el entorno **local en vivo** (Docker, `NODE_ENV=development`), reprobando
cada control directamente contra la API (no me fié de auditorías previas). Veredicto:
**RAZONABLEMENTE PROTEGIDO PARA PRODUCCIÓN, con observaciones. 0 críticos.**

Lo que **resiste** (verificado en vivo): login, **bloqueo de 5 min** (contraseña correcta durante el
bloqueo → 429 sin token), bypass de token (inválido/forjado/`alg:none`/expirado → 401), token de
usuario desactivado (401 inmediato), escalada de rol (token `rol:ADMIN` forjado → 403, manda la BD),
RBAC (10/10 endpoints ADMIN → 403 para ENCARGADO), SQLi (literal, tabla intacta), mass assignment,
path traversal, SSRF, upload. Concurrencia FIFO sin sobre-venta.

### Hallazgos nuevos — corregidos y reverificados

| ID | Sev | Problema | Fix | Reverificado |
|---|---|---|---|---|
| **H-019** | MEDIO | Despacho concurrente del mismo medicamento → conflicto Serializable (P2034) salía **HTTP 500** | Reintento acotado (3) en `despachar`; si persiste → `409` | 3 rondas 6×5 sobre stock 20 → `201×4,409×2`, **0 quinientos**, stock 0 |
| **H-020** | MEDIO | `POST /dispensacion/despachar`: `cantidad` no numérica burlaba el chequeo de stock (`NaN`) y creaba **dispensación con 0 renglones (201)**; IDs objeto → 500 | Validación estricta: ids string, `cantidad` entero positivo | `abc`/`{gt}`/`1.5`/objetos → 400; 0 dispensaciones vacías |
| **H-021** | BAJO | `POST /auth/login` con user/pass objeto/arreglo → **500** (sin auth) | Exigir `typeof string` | 400; login válido 200 |
| **H-022** | BAJO | Paginación sin clamp → `page` negativa = `skip` negativo → **500** (`/auditoria`, `/dispensacion/historial`); `limit` sin tope | Helper `clampPaginacion` (page≥1, limit∈[1,100]) | page neg → 200 clamp; limit → 100 |
| **H-023** | BAJO | `POST /usuarios` sin validar enum `rol` → **500** | Validar rol + tipos | `rol:"SUPERGOD"` → 400 |
| **H-024** | MEDIO | SPA (nginx/Vite) **sin cabeceras de seguridad** → clickjacking (la API sí tiene helmet, pero no protege el HTML estático) | Cabeceras en `nginx.conf` (X-Frame-Options, CSP con `frame-ancestors 'none'`, nosniff, Referrer-Policy) | **Solo build prod; falta verificar en runtime** |

### Archivos que toqué HOY

**Modificados (edición de seguridad sobre lo que ya existía):**
- `backend/src/routes/auth.routes.ts` (H-021)
- `backend/src/routes/dispensacion.routes.ts` (H-020)
- `backend/src/services/dispensacion.service.ts` (H-019 + clamp H-022)
- `backend/src/routes/auditoria.routes.ts` (H-022)
- `backend/src/routes/usuarios.routes.ts` (H-023)
- `frontend/nginx.conf` (H-024)

**Nuevos de hoy:**
- `backend/src/utils/validacion.ts` — helper de validación (`clampPaginacion`, `esEnteroPositivo`, `exigirCadena`, `ErrorValidacion`)
- `backend/tests/validacion.test.ts` — 8 pruebas de regresión (pasan)
- Informes: `ATTACK_SURFACE.md`, `SECURITY_PENTEST.md`, `SECURITY_FIXES.md`, `SECURITY_TEST_MATRIX.md`, `REMAINING_SECURITY_RISKS.md`

### Riesgos residuales aceptados (no bloqueantes)
IDOR por diseño (2 roles de confianza, sin authz de objeto), CORS dev refleja origin sin
credentials, captura pública sin rate limit (token nanoid grande), 500 por tipo-objeto en algunos
endpoints solo-ADMIN de catálogos, sin `Cache-Control: no-store`, JWT sin revocación (mitigado por
chequeo de BD por request), deps con avisos no explotables en runtime. Detalle en
`REMAINING_SECURITY_RISKS.md`.

> ⚠️ **H-024 requiere acción antes de producción:** las cabeceras del SPA solo aplican con
> `FRONTEND_TARGET=production` (nginx). El compose por defecto usa Vite, que sigue sin cabeceras.
> Verificar con `curl -D-` al desplegar en prod y ajustar la CSP si rompe algo.

---

## 2. Diferencias COMPLETAS entre este código y GitHub

> Base de comparación: `origin/main` = `4fde08a`. Todo lo de abajo está **sin commitear**.
> Resumen: **37 archivos modificados (+987 / −229) + 31 archivos nuevos.**

### 2.1 Archivos MODIFICADOS respecto a GitHub (tracked)

| Archivo | Δ aprox. | De qué sesión viene (principal) |
|---|---|---|
| `backend/src/services/dispensacion.service.ts` | +152/−… | Remediación + **H-019/H-022 (hoy)** |
| `backend/src/routes/dispensacion.routes.ts` | +107 | Remediación + **H-020 (hoy)** |
| `backend/src/routes/auth.routes.ts` | +67 | Lockout H-09 + **H-021 (hoy)** |
| `backend/src/config/env.ts` | +61 | H-03 (guard de secretos) |
| `backend/src/routes/catalogos.routes.ts` | +61 | Remediación medios/bajos |
| `backend/src/middleware/errorHandler.ts` | +57 | H-07/H-12 |
| `backend/prisma/seed.ts` | +55 | H-002 (bootstrap admin seguro) |
| `backend/Dockerfile` | +48 | H-001 (multi-stage dev/prod) |
| `backend/src/routes/inventario.routes.ts` | +34 | Remediación |
| `frontend/src/context/AuthContext.tsx` | +37 | H-19 (rol real del servidor) |
| `backend/src/server.ts` | +35 | helmet/CORS/estáticos H-17/H-11 |
| `docker-compose.yml` | +33 | H-04/H-02/H-001 (puertos, TZ, targets) |
| `backend/src/middleware/auth.ts` | +33 | H-10 (chequeo de BD por request) |
| `backend/src/routes/auditoria.routes.ts` | +26 | H-30 + **H-022 (hoy)** |
| `.env.example` | +25 | H-03/H-002 |
| `frontend/src/api/catalogos.ts` | +25 | Catálogos |
| `backend/src/routes/usuarios.routes.ts` | +20 | **H-023 (hoy)** |
| `frontend/nginx.conf` | +18 | **H-024 (hoy)** + /uploads |
| `frontend/src/pages/Inventario.tsx` | +56 | Paginación H-25 |
| `frontend/src/pages/Dispensacion.tsx` | +42 | Evidencia/semáforo |
| `backend/src/services/inventario.service.ts` | +42 | H-01 (estaVencido único) |
| `start.sh` / `start.cmd` | +17/+4 | H-06 |
| `backend/src/services/reportes.service.ts` | +34 | fecha/paginación |
| `frontend/src/pages/Auditoria.tsx` | +31 | Página auditoría |
| `backend/src/routes/reportes.routes.ts` | +16 | fecha→400 |
| `backend/src/services/vencimiento.service.ts` | +13 | H-01 (`lte`) + tokens |
| `README.md`, `CLAUDE.md` | +13/+2 | docs |
| `frontend/Dockerfile` | +12 | prod target |
| `backend/src/middleware/audit.ts` | +5 | singleton prisma |
| `backend/package.json` | +3 | pdfkit/exceljs/sharp/`npm test` |
| `frontend/src/api/client.ts` | +9 | H-32 (no redirigir en login) |
| `frontend/src/pages/Beneficiarios.tsx`, `Entradas.tsx`, `Catalogos/*` | pequeños | UI/validación |

### 2.2 Archivos NUEVOS respecto a GitHub (untracked, 31)

**De hoy (seguridad):**
- `backend/src/utils/validacion.ts`, `backend/tests/validacion.test.ts`
- `ATTACK_SURFACE.md`, `SECURITY_PENTEST.md`, `SECURITY_FIXES.md`, `SECURITY_TEST_MATRIX.md`, `REMAINING_SECURITY_RISKS.md`

**De sesiones previas (remediación/auditoría):**
- Código backend: `src/config/prisma.ts` (singleton, H-005), `src/middleware/loginRateLimit.ts`
  (H-09), `src/utils/fecha.ts` (H-004), `src/utils/httpError.ts` (H-13), `src/utils/imagen.ts`
  (sharp/WebP), `tests/fecha.test.ts`, `tests/inventario.service.test.ts`
- Migraciones Prisma: `backend/prisma/migrations/0_init/migration.sql`, `migration_lock.toml` (H-001/H-05)
- Reproducibilidad: `backend/package-lock.json`, `frontend/package-lock.json`,
  `backend/.dockerignore`, `frontend/.dockerignore` (H-006)
- Infra prod: `docker-compose.prod.yml` (H-007)
- Frontend: `src/components/ui/AuthImage.tsx` (H-11, fotos con JWT)
- Documentos de auditoría previos: `AUDITORIA_COMPLETA.md`, `TEST_PLAN.md`, `SECURITY_AUDIT.md`,
  `BUGS_FOUND.md`, `CODE_REVIEW.md`, `CHANGES_MADE.md`, `FIXES_PHASE_1.md`, `FINAL_VERIFICATION.md`,
  `Defensa_Backend_FarmaG.md`

> **Nota sobre el esquema:** hay migraciones Prisma nuevas y cambios en `schema.prisma` previos
> (eliminación de proveedores/procedencia del refactor de UI). Al levantar con el Dockerfile de dev
> se aplica `prisma db push`; para prod el flujo es `migrate deploy`. Si Daniel hace `docker compose
> up --build` va a aplicar el esquema actual. Revisar `FIXES_PHASE_1.md` para el detalle de la
> baseline de migraciones.

---

## 3. Cómo revisar lo de hoy

```bash
# Ver solo mis cambios de seguridad de hoy (archivos concretos)
git diff -- backend/src/routes/auth.routes.ts backend/src/routes/dispensacion.routes.ts \
  backend/src/services/dispensacion.service.ts backend/src/routes/auditoria.routes.ts \
  backend/src/routes/usuarios.routes.ts frontend/nginx.conf

# Archivos nuevos de hoy
git status --short | grep -E 'validacion|SECURITY_|ATTACK_SURFACE|REMAINING'

# Pruebas (dentro del contenedor api)
docker compose exec api sh -c "cd /app && node --import tsx --test tests/*.test.ts"
# -> 23 tests, 23 pass

# Typecheck
docker compose exec api sh -c "cd /app && npx tsc --noEmit"
```

Lectura recomendada en este orden: `SECURITY_PENTEST.md` (hallazgos + evidencia) →
`SECURITY_FIXES.md` (qué cambió y reverificación) → `SECURITY_TEST_MATRIX.md` (62 pruebas) →
`REMAINING_SECURITY_RISKS.md` (lo que queda).

---

## 4. Sugerencia de organización del commit (lo decides tú/Daniel)

Como todo está mezclado en el árbol de trabajo, una opción limpia es separarlo en 2–3 commits:

1. `feat: remediación de hallazgos H-01..H-34 y reproducibilidad` — el grueso previo (env, Dockerfile,
   migraciones, singleton prisma, lockout, helmet, package-lock, etc.).
2. `fix(seguridad): endurecimiento H-019..H-024 (validación de entrada, concurrencia 409, cabeceras SPA)`
   — los 6 archivos que toqué hoy + `validacion.ts` + `validacion.test.ts`.
3. `docs: informes de auditoría y pentest` — los `.md`.

O todo en uno si prefieren simplicidad. **Pendiente antes de dar por cerrado:**
- Verificar cabeceras del SPA en el build de producción (H-024).
- Fijar secretos propios y `CORS_ORIGIN` en el `.env` de producción.
- Decidir el destino de la rama: la remota está en `194f8fb`; `main` ya tiene ese commit + el de docs.
  Si se va a abrir PR de esta rama, habrá que empujar (`--force-with-lease` o rebase) y resolver que
  `main` ya está por delante.
