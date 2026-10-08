# CODE_REVIEW — FarmaG

**Fecha:** 2026-10-07 · **Alcance:** calidad, mantenibilidad, arquitectura, SOLID/DRY/KISS.

> **Valoración de calidad: ALTA.** Código legible, bien organizado (rutas/servicios/middleware/utils), con comentarios que explican el *por qué* (frecuentemente citando hallazgos previos). Los puntos de deuda son concretos y acotados; ninguno es grave.

---

## Fortalezas

- **Separación de responsabilidades:** rutas finas, lógica en servicios, utilidades reutilizables (`inventario.service`, `httpError`, `imagen`, `formatDate`).
- **DRY en el dominio crítico:** fuente única de verdad del vencimiento (`estaVencido`) y de la validación de fecha de entrada (`validarFechaVencimientoEntrada`), compartidas entre despacho, cron, entrada manual e importación Excel.
- **Manejo de errores centralizado:** `errorHandler` global + `responderError` que mapea reglas de negocio y errores Prisma (P2002→409, P2025→404) y oculta detalle de 500 fuera de desarrollo.
- **Validación:** Zod en las entradas estructuradas (entradas, medicamentos, configuración).
- **Comentarios de calidad:** explican decisiones no obvias (path traversal, por qué los endpoints de captura son públicos, por qué el token se marca usado, etc.).
- **Type-safety:** `tsc` limpio en ambos proyectos.

---

## Hallazgos de calidad / arquitectura

### CR-01 (H-005) — Múltiples instancias de `PrismaClient` · Medio
11 archivos hacen `new PrismaClient()`. Viola el patrón de cliente único de Prisma y arriesga el pool de conexiones (ver [`AUDITORIA_COMPLETA.md`](AUDITORIA_COMPLETA.md) H-005).
**Recomendación:** singleton exportado desde `src/config/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```
e importarlo en todos los módulos (un solo cambio mecánico por archivo).

### CR-02 (H-014) — `calcularSemaforo` recalcula "hoy" · Bajo
`inventario.service.ts:65-76` no acepta `hoy`; recalcula `hoyMedianoche()` internamente, mientras que los llamadores ya calcularon `hoy` y lo pasan a `diasParaVencer`/`esDispensable`. Inconsistencia potencial de 1 día si el request cruza la medianoche.
**Recomendación:** `calcularSemaforo(fecha, umbrales, estado?, hoy = hoyMedianoche())` y pasar `hoy` desde los llamadores.

### CR-03 — Uso de `any` en cláusulas `where` · Bajo
`const where: any = ...` en `inventario.routes.ts`, `catalogos.routes.ts`, `auditoria.routes.ts`. Pierde el tipado de Prisma.
**Recomendación:** tipar con `Prisma.MedicamentoWhereInput`, `Prisma.LogAuditoriaWhereInput`, etc. (como ya se hace en `dispensacion.service.ts`).

### CR-04 — Handler de importación Excel muy extenso · Bajo
`inventario.routes.ts` `POST /importar-excel` (~255 líneas) concentra parsing, validación, matcheo/creación de entidades y auditoría. Cohesivo pero largo.
**Recomendación:** extraer la lógica de "procesar una fila" a `inventario.service.ts` (`importarFilaInventario(tx, fila, usuarioId)`), facilitando pruebas unitarias.

### CR-05 — Validación de fecha en el borde ausente para filtros de query · Medio (ligado a H-004/BUG-01)
Patrón repetido `new Date(queryParam)` sin validar en 3 archivos. Además de causar el 500 (BUG-01), es lógica duplicada.
**Recomendación:** helper `parseFechaQuery` compartido (ver [`BUGS_FOUND.md`](BUGS_FOUND.md)).

### CR-06 — Agregación de stock en memoria · Bajo (rendimiento)
`GET /inventario` y `/alertas` cargan todos los lotes y agregan en JS. A escala actual es correcto; con crecimiento conviene `groupBy`/SQL. (H-012)

### CR-07 — Ausencia de pruebas automatizadas · Medio (remediado parcialmente)
No había pruebas. Se añadieron 6 unitarias de la lógica de dominio (ver [`CHANGES_MADE.md`](CHANGES_MADE.md)). Falta cobertura de rutas/servicios con BD.

### CR-08 — `console.*` como único logging · Informativo
Logging por `console.log/error`. Para producción conviene un logger estructurado (niveles, formato JSON) y no imprimir en cada arranque del cron. No bloqueante.

---

## Principios de diseño

| Principio | Evaluación |
|---|---|
| **SRP** | Bien, salvo el handler de importación Excel (CR-04) y el `authMiddleware` que además abre su propio PrismaClient. |
| **DRY** | Muy bien en el dominio (vencimiento/fecha). Duplicación menor en `new Date(query)` (CR-05) y en mapas MIME↔ext (en `dispensacion.service` y `catalogos.routes`). |
| **KISS** | Bien; sin sobreingeniería. |
| **Separation of Concerns** | Bien (rutas/servicios/utils/middleware). |
| **Dependency management** | Punto débil: múltiples PrismaClient (CR-01), sin lockfile (H-006). |

**Sin dependencias circulares detectadas.** `vencimiento.service` importa de `dispensacion.service` e `inventario.service`, en un solo sentido.

---

## Código muerto / TODO / imports

- No se hallaron bloques `catch` vacíos que oculten errores de forma peligrosa (la auditoría es fire-and-forget **a propósito**, documentado).
- No se hallaron TODO/FIXME pendientes relevantes ni imports sin usar evidentes (`tsc` limpio lo respalda).
- `Defensa_Backend_FarmaG.md` (sin versionar) es documentación del equipo, no código.
