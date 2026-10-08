# CHANGES_MADE — FarmaG (auditoría 2026-10-07)

Durante esta auditoría **no se modificó código funcional de la aplicación**. Los únicos cambios son **aditivos** (pruebas + un script), de riesgo nulo para el runtime, y existen para dejar evidencia ejecutable de la lógica crítica. Todos los hallazgos de mayor alcance se documentaron como tales (no se aplicaron silenciosamente), conforme a la FASE 19 del encargo.

---

## Cambio 1 — Suite de pruebas unitarias de la lógica de dominio

- **Archivo (nuevo):** `backend/tests/inventario.service.test.ts`
- **Qué:** 6 pruebas unitarias de las funciones puras de `inventario.service.ts`: `diasParaVencer`, `estaVencido`, `calcularSemaforo` (umbrales y estado forzado), `esDispensable`, `validarFechaVencimientoEntrada`.
- **Por qué:** el proyecto no tenía ninguna prueba automatizada (H-016). Estas funciones son el núcleo de los hallazgos previos H-01 (no dispensar/stockear lotes vencidos) y H-34 (rechazar fechas pasadas/hoy); conviene fijarlas con pruebas.
- **Riesgo:** nulo. No toca código de la app; usa el runner integrado de Node (`node:test` + `node:assert`), **sin dependencias nuevas**.
- **Pruebas ejecutadas tras el cambio:** `6/6 PASS` (ver salida abajo).

## Cambio 2 — Script `npm test` en el backend

- **Archivo:** `backend/package.json` (se añadió una línea en `scripts`)
- **Qué:** `"test": "node --import tsx --test tests/**/*.test.ts"`
- **Por qué:** permitir al equipo ejecutar las pruebas con `npm test`.
- **Riesgo:** nulo (solo añade un script; no cambia dependencias ni build).

---

## Cómo ejecutar las pruebas

> **Gotcha:** el `docker-compose.yml` monta `./backend/src`, `./backend/prisma` y `./backend/uploads` en el contenedor, **pero no `./backend/tests`**. Por eso, para correrlas dentro del contenedor hay que copiar la carpeta o añadir un bind-mount. En host (con Node 20+) corren directamente.

**En host** (desde `backend/`):
```bash
npm test
```

**Dentro del contenedor** (copiando los tests, como se hizo en la auditoría):
```bash
docker compose exec -T api sh -c "mkdir -p /app/tests"
docker cp backend/tests/inventario.service.test.ts farmag_api:/app/tests/inventario.service.test.ts
docker compose exec -T api sh -c "cd /app && node --import tsx --test tests/inventario.service.test.ts"
```

**Opcional** (para que `npm test` funcione dentro del contenedor sin copiar): añadir a `docker-compose.yml`, servicio `api`, el volumen:
```yaml
      - ./backend/tests:/app/tests:z
```

**Salida obtenida (2026-10-07):**
```
# tests 6
# pass 6
# fail 0
```

---

## Datos de prueba creados en la BD de desarrollo (no es un cambio de código)

Ver [`TEST_PLAN.md`](TEST_PLAN.md) §4. Registros `qa_*`/`QA*` claramente identificables; **no se realizaron operaciones destructivas**. Pueden eliminarse si se desea una BD de demo limpia.

---

## Lo que NO se cambió (documentado como hallazgo para tu decisión)

- **H-004 / BUG-01** (fecha inválida → 500): corrección pequeña pero toca 3 archivos → documentada con parche propuesto, no aplicada.
- **H-001** (Dockerfile producción + migraciones), **H-002** (credencial admin), **H-003** (dependencias), **H-005** (PrismaClient singleton), **H-006** (lockfile): cambios mayores o con decisiones de producto/operación → documentados, no aplicados.
