# 11 — Resultados de las pruebas automatizadas

> Fase: Verificación de correcciones. Documento de hechos con fuente; no es texto final de la tesis.
> A diferencia de `10_material_calidad.md`, aquí las pruebas **sí se ejecutaron**. Las referencias
> `H-XX` de dos cifras son las de `hallazgos_defectos.md`; las de tres cifras (`H-001`…) son la
> numeración propia de los informes de `docs/seguridad/`.

## 1. Datos de la ejecución

- **Fecha y hora:** 2026-10-20, de 02:51:56 a 02:52:06 (hora de Guatemala, UTC−6).
- **Código probado:** commit `bdf1187`. La rama `docs/documentacion` estaba en `19de73b`, pero
  `git diff --stat bdf1187 19de73b` solo muestra archivos de `docs/documentacion/analisis/`, así que el
  código de `backend/` es idéntico al de `bdf1187`.
- **Comando exacto** (desde la raíz del repositorio):

  ```
  docker compose exec -T api sh -c 'cd /app && npm test'
  ```

  `npm test` = `node --import tsx --test --test-concurrency=1 tests/*.test.ts`
  (fuente: backend/package.json, script `test`). Se usó el reporter por defecto (TAP, porque la salida
  no era una terminal interactiva).
- **Entorno:**
  - Contenedor `farmag_api` (imagen `proyecto_muni-api`, target `development`), construido con
    `start.cmd --build` en Windows 11 con Docker Desktop.
  - Node.js v20.20.2; tsx 4.23.15; variable `TZ=America/Guatemala` (fuente: docker-compose.yml,
    servicio `api`, `TZ`).
  - PostgreSQL 16.14 (imagen `postgres:16-alpine`, contenedor `farmag_db`); zona horaria de la sesión
    de la base: `UTC` (`SHOW timezone`).
  - Base de datos: la misma base de desarrollo `farmag_db` (variable `DATABASE_URL` del servicio
    `api`), recién creada con `docker compose down -v` y luego `start.cmd --build`. Antes de la prueba
    se habían aplicado las migraciones `0_init` y `20261017052535_indices_consultas` y el seed había
    creado el usuario `admin`, 13 categorías, 7 ubicaciones y 3 configuraciones (fuente: logs de
    `farmag_api` y `backups/ESTADO_ARRANQUE.txt`). No había medicamentos, lotes ni dispensaciones.

### 1.1 Diferencias con la ejecución del workflow

El workflow `.github/workflows/despliegue-seguro.yml` no ejecuta `npm test`. En su lugar:

- corre las seis pruebas sin base de datos en el job `compilacion` (línea 123), con
  `TZ=America/Guatemala`;
- corre las cuatro de Postgres en el job `esquema` (líneas 94–95) dos veces, una con
  `TZ=America/Guatemala` y otra con `TZ=UTC`, sobre una base `farmag` cuya zona horaria se fija en
  `America/Guatemala` (línea 91).

La ejecución local corrió las 10 en un solo proceso, una vez, con `TZ=America/Guatemala` en Node y la
base en `UTC`. Después se repitieron con `TZ=UTC` las cuatro pruebas de Postgres que corre el job
`esquema` (ver sección 6).

### 1.2 Efectos sobre la base de datos

Según el código de las pruebas, las de integración crean sus propios datos (prefijos `QA-`,
`QA_TEST_`) y los borran al terminar con `deleteMany` filtrado por sus IDs (fuente:
backend/tests/despacho_vencimiento.test.ts, líneas 50–52; rutas_integracion.test.ts, líneas 84–92,
226 y 282–283; vencimiento_arranque.test.ts, líneas 27–29). `seed.test.ts` crea una base aparte
`farmag_seed_test_<marca de tiempo>` y la elimina con `DROP DATABASE … WITH (FORCE)` (líneas 15–30).
`marcarLotesVencidos()` (vencimiento_arranque.test.ts) actúa sobre **todos** los lotes de la base, no
solo los de la prueba; en esta ejecución la base no tenía lotes propios.

Después de la ejecución se consultó la base: 0 medicamentos, 0 lotes, 0 entradas, 0 beneficiarios,
0 dispensaciones, 0 ubicaciones `QA-%`, ninguna base `farmag_seed_test_*`, y en `log_auditoria` solo
2 registros `LOGIN`, que provienen de las comprobaciones manuales de login hechas antes de la prueba y
no de las pruebas.

## 2. Resultados por archivo

En la Tabla 8 se presentan los resultados de cada archivo de prueba. Los casos de cada archivo se
asociaron por el nombre del `test()` declarado en el archivo y el nombre que aparece en la salida TAP;
los 53 casos ejecutados se asociaron sin que sobrara ninguno. La duración es la suma de los
`duration_ms` que reporta el TAP para cada caso. No incluye el tiempo de carga de cada archivo, así que
la suma de la tabla (≈5,2 s) es menor que la duración total del proceso (9,46 s).

Tabla 8.
Resultados de `npm test` por archivo de prueba (commit `bdf1187`)

| Archivo de prueba | N.º de casos | Aprobados | Fallidos | Duración (ms) | Hallazgo que cubre (según 10_material_calidad.md) |
|-------------------|-------------:|----------:|---------:|--------------:|---------------------------------------------------|
| despacho_vencimiento.test.ts | 1 | 1 | 0 | 192 | H-01 |
| env.test.ts | 5 | 5 | 0 | 916 | H-03 |
| fecha.test.ts | 9 | 9 | 0 | 3 | Ninguno de H-01–H-34 (cubre `H-004` de los informes de seguridad) |
| inventario.service.test.ts | 9 | 9 | 0 | 2 | H-01, H-34 (y el criterio `<=` de D-20) |
| ipRateLimit.test.ts | 5 | 5 | 0 | 5 | H-09 |
| loginRateLimit.test.ts | 6 | 6 | 0 | 4 | H-09 |
| rutas_integracion.test.ts | 8 | 8 | 0 | 608 | H-01, H-15 (parcial) |
| seed.test.ts | 1 | 1 | 0 | 3 375 | Ninguno de H-01–H-34 (cubre `H-002` de los informes de seguridad y el PR #6) |
| validacion.test.ts | 8 | 8 | 0 | 3 | H-15 (parcial) |
| vencimiento_arranque.test.ts | 1 | 1 | 0 | 141 | H-01, D-11 |
| **Total** | **53** | **53** | **0** | **5 249** | |

Fuente: Elaboración propia a partir de la salida de `npm test` (2026-10-20) y de
`10_material_calidad.md`, Tabla 4.

## 3. Totales

Resumen final de la salida TAP:

```
1..53
# tests 53
# suites 0
# pass 53
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 9461.811869
```

Código de salida del proceso: 0.

## 4. Pruebas fallidas

Ninguna. Las 53 pruebas terminaron con `ok`. No se modificó ninguna prueba ni código.

## 5. Observaciones

- Un primer intento con `npm test -- --test-reporter=spec` terminó con `Could not find
  '/app/--test-reporter=spec'`. npm agrega los argumentos extra después del glob `tests/*.test.ts`, y
  Node los toma como ruta de archivo. Ese intento no ejecutó ninguna prueba. El resultado de este
  documento corresponde a `npm test` sin argumentos.
- La cifra de 53 casos coincide con el conteo estático de `10_material_calidad.md` (sección 1).
- La ejecución con `TZ=UTC` se registra en la sección 6.
- `[COMPLETAR: si se quiere citar en el Cap. 8 una ejecución del workflow en GitHub Actions, adjuntar
  enlace o captura de esa ejecución]`.

## 6. Ejecución con TZ=UTC

- **Fecha y hora:** 2026-10-20, de 02:58:19 a 02:58:26 (hora de Guatemala, UTC−6).
- **Código y entorno:** los mismos de la sección 1 (código de `bdf1187`, contenedor `farmag_api`,
  Node.js v20.20.2, PostgreSQL 16.14, misma base `farmag_db`), con `TZ=UTC` forzada en el proceso.
  Dentro del contenedor `date` devolvió `Tue Oct 20 08:58:19 UTC 2026`.
- **Archivos:** los cuatro que corre el job `esquema` con `TZ=UTC` (fuente:
  .github/workflows/despliegue-seguro.yml, línea 95), en el mismo orden.
- **Comando exacto** (desde la raíz del repositorio):

  ```
  docker compose exec -T -e TZ=UTC api sh -c 'cd /app && node --import tsx --test --test-concurrency=1 tests/despacho_vencimiento.test.ts tests/rutas_integracion.test.ts tests/vencimiento_arranque.test.ts tests/seed.test.ts'
  ```

- **Diferencia con el workflow:** en el workflow la base `farmag` tiene la zona horaria
  `America/Guatemala` (línea 91); aquí la base de desarrollo seguía en `UTC`. Así, tanto Node como la
  sesión de Postgres estaban en UTC.

En la Tabla 9 se presentan los resultados de esta ejecución. Los casos se asociaron a cada archivo y
la duración se calculó igual que en la Tabla 8.

Tabla 9.
Resultados de las pruebas de Postgres con `TZ=UTC` por archivo (commit `bdf1187`)

| Archivo de prueba | N.º de casos | Aprobados | Fallidos | Duración (ms) |
|-------------------|-------------:|----------:|---------:|--------------:|
| despacho_vencimiento.test.ts | 1 | 1 | 0 | 172 |
| rutas_integracion.test.ts | 8 | 8 | 0 | 560 |
| vencimiento_arranque.test.ts | 1 | 1 | 0 | 119 |
| seed.test.ts | 1 | 1 | 0 | 3 430 |
| **Total** | **11** | **11** | **0** | **4 281** |

Fuente: Elaboración propia a partir de la salida TAP de la ejecución con `TZ=UTC` (2026-10-20).

Resumen final de la salida TAP:

```
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 6178.247293
```

Código de salida del proceso: 0. No falló ninguna prueba, así que no se agregó ningún hallazgo a
`hallazgos_defectos.md`. Al terminar, la base volvió a quedar con 0 medicamentos, 0 lotes, 0 entradas
y 0 dispensaciones, sin bases `farmag_seed_test_*`, y con los mismos 2 registros en `log_auditoria`
que había antes.
