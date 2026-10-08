# BUGS_FOUND — FarmaG

**Fecha:** 2026-10-07. Defectos **funcionales confirmados** en ejecución. Los temas de seguridad, dependencias y configuración están en [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) y [`AUDITORIA_COMPLETA.md`](AUDITORIA_COMPLETA.md).

> **Resultado destacado:** de ~60 pruebas en runtime, **solo se encontró 1 defecto funcional** (una causa raíz que se manifiesta en 5 endpoints). El resto del sistema se comportó como se esperaba, incluidos los casos críticos de FIFO y concurrencia.

---

## BUG-01 (H-004) — Un filtro de fecha inválido devuelve HTTP 500 en vez de 400

- **Severidad:** Medio · **Categoría:** Backend / Manejo de errores / Validación
- **Estado:** Confirmado · Pendiente (candidato a corrección inmediata)

**Archivos y líneas:**
- `backend/src/routes/auditoria.routes.ts:33-34` — `where.createdAt.gte = new Date(desde)`
- `backend/src/services/reportes.service.ts:48-49, 103-104, 263-264, 324-325`
- `backend/src/services/dispensacion.service.ts:311-316` (`obtenerHistorial`)

**Descripción:** Los filtros de fecha de los parámetros de query se convierten con `new Date(cadena)` sin validación. Una cadena no parseable produce un `Invalid Date`; Prisma lo rechaza al construir la consulta y lanza un error que termina en el `catch` del handler, devolviendo **500 "Error interno del servidor"**.

**Cómo reproducirlo:**
1. `TOKEN` de admin.
2. `curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/auditoria?desde=basura"`

**Resultado actual:** `HTTP 500 {"error":"Error interno del servidor"}` (no se filtra stack trace).
**Resultado esperado:** `HTTP 400 {"error":"Fecha inválida"}`.

**Evidencia (runtime):**
```
GET /api/auditoria?desde=basura                 -> 500
GET /api/reportes/dispensaciones?desde=xx       -> 500
GET /api/reportes/consumo-medicamentos?desde=xx -> 500
GET /api/reportes/entradas?hasta=xx             -> 500
GET /api/dispensacion/historial?fechaDesde=xx   -> 500
```
(Para contraste: `?usuario=noUUID` → 200 vacío, `?dias=abc` → 200 con default. Solo las **fechas** disparan el 500.)

**Impacto:** Semántica HTTP incorrecta y "error interno" ante entrada de usuario trivialmente inválida. **No** hay fuga de información (mensaje genérico). Un bug de frontend o un filtro mal formado lo dispara.

**Probabilidad:** Media.

**Corrección propuesta (bajo riesgo):** validar en el borde con un helper compartido, p. ej.:
```ts
// utils/fecha.ts
export function parseFechaQuery(valor?: string): Date | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  if (isNaN(d.getTime())) { const e: any = new Error('Fecha inválida'); e.status = 400; throw e; }
  return d;
}
```
y usarlo en `auditoria.routes.ts`, `reportes.service.ts` y `dispensacion.service.ts` (el `errorHandler`/`responderError` ya traduce `err.status` 4xx al código correcto). **No se aplicó automáticamente** por tocar 3 archivos; se deja a tu decisión (FASE 19).

---

## Comportamientos verificados como CORRECTOS (no son bugs)

Se listan por su valor para regresión futura — todos confirmados en ejecución:

- **FIFO:** al despachar 25 sobre lotes de 20 (vence antes) + 30 (vence después), se agotó primero el lote de menor fecha (→ AGOTADO, 0) y se tomaron 5 del siguiente. Snapshots guardados.
- **Concurrencia:** 2 despachos simultáneos de 20 con stock 25 → uno 201, otro 409; stock final exacto 5, **sin doble gasto** (Serializable + SELECT FOR UPDATE).
- **Stock insuficiente / cantidad 0 / negativa / items vacío / beneficiario inexistente** → 409/400/400/400/404 respectivamente.
- **Entrada de lote vencido o con fecha = hoy** → 400 (H-34).
- **`medicamentoId` no-UUID** → 400 (Zod).
- **Beneficiario DPI ≠ 13 dígitos / nombre < 3** → 400.
- **JSON malformado** → 400; **cuerpo > 100KB** → 413; **ruta inexistente** → 404 JSON.
- **Token de captura inválido/vencido/usado** → 404 uniforme.
- **Desactivar usuario** invalida su token al instante → 401.
- **Lockout** tras 3 intentos → 429.
- **RBAC:** 6 endpoints ADMIN → 403 para ENCARGADO.
- **Frontend:** 5 pantallas sin errores de consola; Reportes sin pantalla en blanco.
