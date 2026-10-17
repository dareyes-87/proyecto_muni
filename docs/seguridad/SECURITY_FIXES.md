# SECURITY_FIXES.md — FarmaG

> Correcciones aplicadas durante la auditoría ofensiva del **2026-10-07**, con reverificación en
> runtime contra el stack local. `tsc --noEmit` limpio; `farmag_api` reiniciado tras editar
> (en Docker Windows `tsx watch` no recarga ediciones del host). Sin regresiones.

## Resumen

| ID | Severidad | Archivo(s) | Antes | Después | Reverificado |
|---|---|---|---|---|---|
| H-019 | MEDIO | `services/dispensacion.service.ts` | Carrera → 500 | Reintento → 409 | ✅ 3 rondas sin 500 |
| H-020 | MEDIO | `routes/dispensacion.routes.ts` | `cantidad` no numérica → dispensación vacía (201) / 500 | 400 | ✅ |
| H-021 | BAJO | `routes/auth.routes.ts` | user/pass objeto → 500 (sin auth) | 400 | ✅ |
| H-022 | BAJO | `routes/auditoria.routes.ts`, `services/dispensacion.service.ts`, `utils/validacion.ts` | page negativa → 500; limit sin tope | 200 clamped; limit≤100 | ✅ |
| H-023 | BAJO | `routes/usuarios.routes.ts` | rol inválido → 500 | 400 | ✅ |
| H-024 | MEDIO | `frontend/nginx.conf` | SPA sin cabeceras (clickjacking) | X-Frame-Options/CSP/… | ⚠️ prod no runtime |

Archivo nuevo: **`backend/src/utils/validacion.ts`** (helper `clampPaginacion`, `exigirCadena`,
`esEnteroPositivo`, `ErrorValidacion`).

---

## Detalle

### H-019 — Reintento de serialización → 409
`despachar` ahora ejecuta la transacción dentro de un bucle: ante Prisma `P2034`/SQLSTATE 40001
("could not serialize access" / deadlock / write conflict) reintenta hasta 3 veces con espera
incremental; si persiste, lanza un error con `status: 409` (traducido por `responderError`). No
cambia la lógica de stock ni el aislamiento `Serializable`; solo el manejo del conflicto.

**Reverificación:** 3 rondas de 6 despachos concurrentes de 5 sobre stock 20 → `201 201 201 201 409 409`
en todas, stock final 0 (sin sobre-venta), **0 respuestas 500**.

### H-020 — Validación estricta de `items` en despacho
Se exige `beneficiarioId` string no vacío; cada ítem con `medicamentoId` string y `cantidad` **entero
positivo real** (`typeof === 'number' && Number.isInteger && > 0`). Elimina la evasión del guardado de
stock por comparación `NaN` y los 500 por IDs tipo objeto.

**Reverificación:** `cantidad` `"abc"`/`{gt:0}`/`1.5`, `medicamentoId`/`beneficiarioId` objeto → **400**.
Dispensaciones con 0 renglones en BD: **0**. Despacho válido sigue **201**.

### H-021 — Validación de tipo en login
`typeof username/password !== 'string'` → 400 antes de tocar Prisma/bcrypt. Neutraliza los 500 no
autenticados y las sondas de inyección por tipo. Login legítimo intacto (200), mensajes de
credenciales inválidas y lockout intactos.

### H-022 — Clamp de paginación
`clampPaginacion(page, limit, {maxLimit})` normaliza a `page≥1` y `limit∈[1,100]`, evitando `skip`
negativo (que Prisma rechaza con 500) y resultados sin tope. Aplicado en `/auditoria` y en
`obtenerHistorial`. (El servicio de reportes ya clampeaba con `resolverPaginacion`.)

### H-023 — Validación de `rol` en creación de usuario
Se valida el enum y los tipos string antes de Prisma, igual que ya hacía `PUT /usuarios/:id`.

### H-024 — Cabeceras de seguridad del SPA (nginx)
`nginx.conf` agrega `X-Frame-Options: DENY`, `Content-Security-Policy` (con `frame-ancestors 'none'`,
`object-src 'none'`, `script-src 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`Permissions-Policy`. **Solo build de producción** (`FRONTEND_TARGET=production`); verificar al
desplegar (el `docker-compose.yml` por defecto usa Vite dev, que no pasa por nginx).

---

## Verificación global post-fix

- `npx tsc --noEmit` (backend) → **0 errores**.
- `farmag_api` reiniciado y sano (`/api/health` 200).
- Regresiones comprobadas: login válido 200, RBAC ENCARGADO→403, sin token→401, lockout→429,
  despacho válido→201, FIFO sin sobre-venta.
