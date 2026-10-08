# REMAINING_SECURITY_RISKS.md — FarmaG

> Riesgos que **no** se eliminaron en la auditoría del 2026-10-07, con su justificación y
> recomendación. Ninguno es crítico. Léase junto a `SECURITY_PENTEST.md`.

## Residuales ACEPTADOS (por diseño / bajo impacto)

### R-01 (H-008) — Sin autorización a nivel de objeto (IDOR por diseño) · MEDIO-BAJO
Cualquier usuario autenticado (ADMIN o ENCARGADO) puede leer/editar **cualquier** beneficiario,
leer **cualquier** dispensación y generar su token de captura. No hay "dueño" por registro.
**Verificado:** ENCARGADO edita beneficiario ajeno → 200.
**Por qué se acepta:** el sistema tiene 2 roles, ambos de personal de confianza de la farmacia, y la
operación es compartida (la encargada atiende a todos los beneficiarios). No hay separación de
inquilinos. Es una decisión de negocio (ligada a R-07/R-08 ya diferidas).
**Recomendación:** si en el futuro hay varias farmacias/usuarios con datos segregados, añadir
control de objeto. Mientras tanto, la auditoría (quién hizo qué) es el control compensatorio.

### R-02 — CORS refleja cualquier origen en desarrollo · BAJO
En dev, `cors({origin:true})` refleja el `Origin` (p. ej. `https://evil.example`) **sin**
`Access-Control-Allow-Credentials`. En producción se restringe por `CORS_ORIGIN` (o se desactiva).
**Por qué es bajo:** el token vive en `localStorage` del origen de la app, no en cookies; una página
externa no puede leerlo ni adjuntarlo. Sin credenciales, la reflexión no expone datos del usuario.
**Recomendación:** definir `CORS_ORIGIN` explícito también fuera de producción si se expone en LAN.

### R-03 — Endpoints públicos de captura sin rate limit · BAJO
`/api/captura/:token/info|foto` no tienen throttle. El token es `nanoid(10)` (~64¹⁰ ≈ 10¹⁸
combinaciones), vive 30 min, sirve para una sola dispensación y se invalida al completar 2 fotos.
**Por qué es bajo:** la fuerza bruta del token es inviable; token inexistente/vencido/usado → el
mismo 404. El upload está limitado (MIME, 5 MB, recompresión `sharp`).
**Recomendación:** opcional, un rate limit por IP en `/api/captura` como defensa en profundidad.

### R-04 — Otros 500 por entrada de tipo objeto en endpoints ADMIN · BAJO
Tras corregir login y despacho, aún pueden existir 500 si un ADMIN envía tipos inesperados a algunos
endpoints de catálogos/inventario (p. ej. `categoriaId`/`activo` como objeto en `PUT
/catalogos/medicamentos/:id`). Son solo-ADMIN y no persisten datos (rollback/validación de Prisma),
y en producción no filtran detalle.
**Recomendación:** adoptar esquemas Zod completos (o el helper `exigirCadena`) en todos los handlers
de escritura de catálogos para uniformar 400. No bloqueante.

### R-05 — Sin `Cache-Control: no-store` en respuestas sensibles · INFORMATIVO
`/usuarios`, `/auditoria`, etc. no fijan `no-store`. Sin proxy compartido y con XHR+Authorization el
riesgo práctico es mínimo.
**Recomendación:** añadir `Cache-Control: no-store` a respuestas de datos sensibles (helmet no lo
hace por defecto).

### R-06 — JWT sin revocación; validez 8 h · INFORMATIVO
No hay lista de revocación de tokens. **Mitigado** porque `authMiddleware` consulta la BD en cada
request: desactivar al usuario o cambiarle el rol surte efecto inmediato (verificado). El robo de un
token sería explotable hasta su expiración (8 h) solo si la cuenta sigue activa.
**Recomendación:** si se requiere corte inmediato ante robo de token, bajar la validez o añadir un
`tokenVersion` por usuario.

### R-07 — `health` expone el entorno · INFORMATIVO
`GET /api/health` devuelve `environment` (`development`/`production`). Fuga trivial.

## Residual que requiere ACCIÓN antes de producción

### R-08 (H-024) — Cabeceras de seguridad del SPA: verificar en runtime · MEDIO
La corrección de cabeceras (X-Frame-Options/CSP/…) se aplicó a `frontend/nginx.conf`, que **solo se
usa con `FRONTEND_TARGET=production`**. El `docker-compose.yml` por defecto sirve el SPA con Vite
(:5173), que **no** pasa por nginx y por tanto sigue sin estas cabeceras.
**Acción:** al desplegar a producción, confirmar con `curl -D-` que el SPA responde con las
cabeceras y que la CSP no rompe la carga (ajustar `connect-src`/`img-src` si se usan orígenes
externos). En dev/LAN la exposición de clickjacking persiste porque se usa Vite.

### R-09 (H-003) — Dependencias con avisos · BAJO (no explotable en runtime)
- **Backend (prod):** 3 high (`deepmerge-ts` vía `@prisma/config`/prisma — stack exhaustion al
  fusionar grafos recursivos, **no alcanzable desde entrada HTTP**) + 3 moderate (`uuid` vía
  `exceljs`/`node-cron` — bounds check con `buf` provisto, **no se usa esa ruta**). 0 critical.
- **Frontend:** avisos en herramientas de build/dev (vite/esbuild/tailwind/micromatch…), **no
  embarcadas** en el runtime (nginx sirve estáticos ya compilados).
**Acción recomendada:** `npm audit fix` cuando Prisma publique una versión que arrastre
`deepmerge-ts ≥ 8`; `uuid`/`node-cron` requieren bump breaking — planificar, no urgente.

## Preguntas de negocio pendientes (no tocar sin consultar)
R-07/R-08 originales del informe de hallazgos (rol ENCARGADO y alcance de sus operaciones),
H-22 (pantalla de umbrales) y H-29 (desactivar beneficiario) siguen diferidas por decisión del
usuario; no se modificaron en esta auditoría.

## Checklist mínimo pre-producción (seguridad)
1. Secretos propios y largos: `JWT_SECRET`, `DB_PASSWORD` (el guard de `config/env.ts` aborta si son
   de ejemplo en prod — verificado).
2. `ADMIN_INITIAL_PASSWORD` propia (o recuperar la aleatoria de los logs del seed) y cambiarla.
3. Desplegar con `docker-compose.prod.yml` (`FRONTEND_TARGET=production`, nginx :80) y **verificar
   cabeceras del SPA** (R-08).
4. Definir `CORS_ORIGIN` explícito.
5. Borrar/!activar cuentas de prueba (`qa_*`, `sec_*` ya desactivadas).
6. Revisar `npm audit` (R-09) y planificar los bumps.
