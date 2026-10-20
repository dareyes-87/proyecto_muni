# 10 — Inventario de material de calidad

> Fase: Verificación de correcciones. Inventario de fuentes para los capítulos 7 y 8 y el anexo de
> pentesting; no es texto final de la tesis. Fecha: 2026-10-20. Commit: `bdf1187`.
> Las pruebas **no se ejecutaron** en esta fase: se describe lo que cada archivo hace según su código.
> Los resultados (aprobado/fallido) que citan los informes de `docs/seguridad/` son declaraciones del
> equipo, no comprobaciones de esta fase.
> Las referencias `H-XX` de dos cifras son las de `hallazgos_defectos.md`; las de tres cifras (`H-001`…)
> son la numeración propia de los informes de seguridad (ver `09_seguimiento_correcciones.md`, Método,
> punto 5).

## 1. Pruebas automatizadas (`backend/tests/`)

Ejecución: `npm test` en `backend/` = `node --import tsx --test --test-concurrency=1 tests/*.test.ts`
(fuente: backend/package.json, script `test`). Usan el ejecutor integrado de Node (`node:test`) y
`node:assert`; no hay dependencias de pruebas adicionales. El frontend no tiene pruebas.

Se entiende por **unitaria** la que no necesita base de datos y por **integración** la que se conecta a
PostgreSQL (directamente o montando las rutas en un servidor Express temporal).

Tabla 4.
Archivos de prueba del backend

| Archivo | Qué prueba (una línea) | N.º de `test()` | Tipo | Hallazgo que cubre |
|---------|------------------------|-----------------|------|--------------------|
| despacho_vencimiento.test.ts | El `SELECT … FOR UPDATE` de `despachar` nunca toma un lote `DISPONIBLE` con fecha de hoy o pasada, y el stock consultado lo excluye | 1 | Integración (Postgres) | H-01 |
| env.test.ts | Arranque de `config/env.ts` en un proceso aparte: en producción con secretos de ejemplo advierte y arranca; con `STRICT_SECRETS=true` aborta; en desarrollo no advierte | 5 | Unitaria (sin BD) | H-03 |
| fecha.test.ts | `parseFechaQuery`/`parseRangoFechas`: fecha inválida, de otro tipo o rango invertido lanzan error 400 | 9 | Unitaria | Ninguno de H-01–H-34 (cubre `H-004` de los informes de seguridad) |
| inventario.service.test.ts | Funciones puras de vencimiento: `diasParaVencer`, `estaVencido`, `calcularSemaforo`, `esDispensable`, `validarFechaVencimientoEntrada`, `formatFechaDia`, `parseFechaCelda` | 9 | Unitaria | H-01, H-34 (y el criterio `<=` de D-20) |
| ipRateLimit.test.ts | Límite de 20 solicitudes de login por IP en 10 min, expiración de la ventana (temporizadores simulados) e independencia del bloqueo por usuario | 5 | Unitaria | H-09 |
| loginRateLimit.test.ts | Bloqueo tras 3 fallos por usuario+IP, expiración a los 5 min, reinicio tras login correcto, clave insensible a mayúsculas | 6 | Unitaria | H-09 |
| rutas_integracion.test.ts | Importación Excel sin duplicar lotes; stock del lector de códigos sin vencidos; listados de inventario y alertas solo con lotes con stock; PUT de medicamentos/categorías con tipo incorrecto → 400; cantidad no entera en Excel; formato del token de captura | 8 | Integración (HTTP + Postgres) | H-01, H-15 (parcial) |
| seed.test.ts | El seed no revive categorías/ubicaciones modificadas y solo crea medicamentos con `SEED_DEMO=true` (crea y borra una base propia) | 1 | Integración (Postgres) | Ninguno de H-01–H-34 (cubre `H-002` de los informes de seguridad y el PR #6) |
| validacion.test.ts | `clampPaginacion` (página negativa, límite máximo), `textoQuery` (parámetro repetido u objeto) y `verificarLimiteExport` (5000 registros) | 8 | Unitaria | H-15 (parcial) |
| vencimiento_arranque.test.ts | `marcarLotesVencidos`: lotes con fecha de ayer y de hoy pasan a `VENCIDO`; el de mañana sigue `DISPONIBLE` | 1 | Integración (Postgres) | H-01, D-11 |

Fuente: Elaboración propia a partir de backend/tests/*.test.ts.

Total: 10 archivos, 53 casos `test()` (conteo de llamadas `test(` en cada archivo). El informe
`docs/seguridad/CIERRE_SEGURIDAD.md` (2026-10-08) declara "37/37 pruebas verdes"; los archivos
`seed.test.ts`, `vencimiento_arranque.test.ts`, `rutas_integracion.test.ts` y `env.test.ts` se
agregaron después (PRs #3 a #8), por lo que esa cifra no corresponde al estado actual.
Resultado de ejecutar `npm test` sobre `bdf1187` (2026-10-20, contenedor `farmag_api`, Node v20.20.2,
PostgreSQL 16.14): 53 casos, 53 aprobados, 0 fallidos (ver `11_resultados_pruebas_automatizadas.md`).

## 2. Workflow `.github/workflows/despliegue-seguro.yml`

**Cuándo se ejecuta** (fuente: líneas 22–31): en cada `pull_request` hacia `main`, en cada `push` a
cualquier rama (`'**'`) y manualmente (`workflow_dispatch`). Una ejecución nueva sobre la misma rama
cancela la anterior (`concurrency`, `cancel-in-progress: true`). Para que bloquee los *merges* hay que
activar la protección de `main` en GitHub (líneas 17–18; docs/DESPLIEGUE.md, sección "Activar la
protección de `main`"); `[COMPLETAR: confirmar si la protección de main está activada en GitHub]`.

Tabla 5.
Trabajos y pasos del workflow "Despliegue seguro"

| Trabajo | Pasos que corre | Fuente (líneas) |
|---------|-----------------|-----------------|
| `esquema` | Servicio PostgreSQL 16; crea una base sombra; `prisma migrate diff` entre `prisma/migrations` y `schema.prisma` (falla si hay cambios de esquema sin migración y muestra el SQL faltante); crea la base `farmag` en hora de Guatemala, aplica `migrate deploy` y el seed, y corre las 4 pruebas de integración (`despacho_vencimiento`, `rutas_integracion`, `vencimiento_arranque`, `seed`) dos veces, con `TZ=America/Guatemala` y con `TZ=UTC`; avisa (sin fallar) si una migración nueva contiene `DROP`, cambio de tipo, `TRUNCATE` o `DELETE` | 34–105 |
| `compilacion` | `tsc --noEmit` del backend; las 6 pruebas unitarias (`env`, `fecha`, `inventario.service`, `ipRateLimit`, `loginRateLimit`, `validacion`); `npm run build` del frontend (`tsc -b` + `vite build`) | 107–126 |
| `despliegue` | Matriz de 3 casos de `.env` del servidor: `sin-env`, `env-de-ejemplo` y `produccion-ejemplo` (`NODE_ENV` y `FRONTEND_TARGET` en `production` con secretos de ejemplo). Levanta la versión anterior con `docker compose up -d --build`; carga 200 beneficiarios de prueba y hace login; calcula una huella (conteo + md5 por tabla, .github/scripts/huella-datos.sql); despliega la versión nueva igual que `auto-update.cmd`; espera a que la API esté sana; compara la huella (falla si cambió algún dato); revisa `ESTADO_ARRANQUE.txt` (sin `ERROR`, `ATENCION` ni `SIN RESPALDO`; en `produccion-ejemplo` exige el `AVISO` de secretos); comprueba que `0_init` quedó registrada; restaura en una base temporal el respaldo previo y uno periódico y verifica los 200 beneficiarios; reinicia la API, vuelve a comparar la huella y hace login | 128–288 |
| `instalacion` | Instalación desde cero con `ADMIN_INITIAL_PASSWORD` fijada; espera la API sana; falla si hay `ERROR`/`ATENCION`; login con la contraseña fijada; comprueba que la contraseña antigua `admin2026` responde 401 | 290–313 |

Fuente: Elaboración propia a partir de .github/workflows/despliegue-seguro.yml.

Relación con el análisis: el trabajo `despliegue` es la evidencia automatizada de H-05/D-13 y del
procedimiento de respaldo y restauración (docs/RESPALDOS.md), útil para el Cap. 7. El trabajo `esquema`
ejerce H-01 y H-02 en dos zonas horarias. `[COMPLETAR: enlace o captura de una ejecución exitosa del
workflow sobre main, si se cita como resultado]`.

## 3. Informes de `docs/seguridad/`

Autoría según `git log --follow`: los 16 archivos los agregó **jorgevargas83** en el commit `254d0f8`
(fecha de autor 2026-10-07), salvo `CIERRE_SEGURIDAD.md` y `VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md`,
que entraron en `b25c06e` (fecha de autor 2026-10-07; ambos dicen en su contenido 2026-10-08). Los dos
commits tienen fecha de *commit* 2026-10-12. **dareyes-87** los movió de la raíz a `docs/seguridad/` en
`7d006c4` (2026-10-16). Ningún informe declara un autor en su texto (AUDITORIA_COMPLETA.md dice "Auditor:
Revisión integral…"). `[COMPLETAR: autor real de los informes y si se elaboraron con asistencia de una
herramienta de IA, para citarlos correctamente en APA 7]`.

Todos se hicieron sobre el entorno de desarrollo (`NODE_ENV=development`) en la rama
`feature/dispensacion-evidencia-pc` o `seguridad`, **antes** de los PRs #4 a #9; algunos datos ya no
coinciden con el código actual (ver sección 4).

Tabla 6.
Informes de seguridad y calidad del equipo

| Archivo | Propósito (una línea) | Commit / fecha en el documento | Uso sugerido |
|---------|-----------------------|--------------------------------|--------------|
| ATTACK_SURFACE.md | Mapa de la superficie de ataque (rutas, roles, rutas públicas, puertos) | `254d0f8` / 2026-10-07 | Anexo de pentesting |
| AUDITORIA_COMPLETA.md | Auditoría técnica integral (funcional, backend, frontend, BD, seguridad, DevOps) con hallazgos `H-001`… | `254d0f8` / 2026-10-07 | Cap. 8 (y anexo) |
| BUGS_FOUND.md | Defectos funcionales confirmados en ejecución (1 causa raíz: filtro de fecha inválido → 500) | `254d0f8` / 2026-10-07 | Cap. 8 |
| CHANGES_MADE.md | Cambios aditivos de la auditoría (primeras pruebas unitarias y un script) | `254d0f8` / 2026-10-07 | Cap. 8 (origen de las pruebas) |
| CIERRE_SEGURIDAD.md | Cierre de los riesgos pendientes: límite de login por IP, cabeceras de producción, regresiones | `b25c06e` / 2026-10-08 | Anexo de pentesting; Cap. 8 |
| CODE_REVIEW.md | Revisión de calidad y mantenibilidad del código (SOLID/DRY/KISS) | `254d0f8` / 2026-10-07 | Cap. 8 |
| FINAL_VERIFICATION.md | Verificación independiente de las correcciones, incluida una instancia de producción desechable | `254d0f8` / 2026-10-07 | Cap. 8 |
| FIXES_PHASE_1.md | Corrección de `H-001` a `H-007` (despliegue de producción, bootstrap del admin, dependencias) | `254d0f8` / 2026-10-07 | Cap. 7 (producción) y Cap. 8 |
| INFORME_HANDOFF_DANIEL.md | Entrega de Jorge a Daniel: correcciones del día y diferencias entre el código local y GitHub | `254d0f8` / 2026-10-07 | Ninguno de los tres directamente (contexto del flujo Git, Cap. 6) |
| REMAINING_SECURITY_RISKS.md | Riesgos residuales aceptados o pendientes y lista mínima previa a producción | `254d0f8` / 2026-10-07 | Anexo de pentesting; Cap. 7 (lista previa a producción) |
| SECURITY_AUDIT.md | Revisión OWASP Top 10, subida de archivos, *path traversal*, secretos y dependencias | `254d0f8` / 2026-10-07 | Anexo de pentesting |
| SECURITY_FIXES.md | Correcciones aplicadas en la auditoría ofensiva, con estado antes/después | `254d0f8` / 2026-10-07 | Anexo de pentesting |
| SECURITY_PENTEST.md | Informe de la auditoría ofensiva (pruebas reales contra la API local) | `254d0f8` / 2026-10-07 | Anexo de pentesting (documento principal) |
| SECURITY_TEST_MATRIX.md | Matriz de 62 pruebas de seguridad (`T-01`…) con resultado HTTP observado | `254d0f8` / 2026-10-07 | Anexo de pentesting; Cap. 8 (resultados) |
| TEST_PLAN.md | Plan y matriz de pruebas funcionales (PASS/FAIL/BLOCKED/NOT TESTED) | `254d0f8` / 2026-10-07 | Cap. 8 |
| VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md | Comparación de la rama `seguridad` con `main` y pruebas de regresión | `b25c06e` / 2026-10-08 | Anexo de pentesting; Cap. 8 |

Fuente: Elaboración propia a partir de `git log --follow -- docs/seguridad/*.md` y del encabezado de
cada archivo.

Para el Cap. 7 también son fuentes directas docs/DESPLIEGUE.md (actualización automática, arranque
seguro, migraciones) y docs/RESPALDOS.md (servicio `backup`, restauración).

## 4. Riesgos pendientes declarados vs. verificación de esta fase

Fuente de la columna "Declarado": docs/seguridad/REMAINING_SECURITY_RISKS.md. Los identificadores `R-01`…`R-09` de ese
informe **no** son los `R-XX` de `preguntas_abiertas.md`.

Tabla 7.
Riesgos residuales declarados por el equipo frente al código de `bdf1187`

| Riesgo declarado | Declarado | Verificación en `bdf1187` | ¿Coincide? |
|------------------|-----------|---------------------------|------------|
| R-01 (`H-008`) Sin autorización por objeto | Aceptado: cualquier usuario autenticado lee/edita cualquier beneficiario y dispensación | Sin control por objeto en las rutas de dispensación (backend/src/routes/dispensacion.routes.ts, líneas 88–147 y 250–319). Equivale a D-16 | Sí |
| R-02 CORS refleja cualquier origen en desarrollo | Aceptado, bajo | `origin: true` cuando `NODE_ENV` no es `production` (backend/src/server.ts, línea 39) | Sí. Pero el valor por defecto del servidor es desarrollo (H-36), así que el riesgo no se limita a la máquina de desarrollo |
| R-03 Captura pública sin límite | Aceptado; token `nanoid(10)` | Sin límite en `/api/captura` (server.ts, línea 56; captura.routes.ts) | Sí en el fondo. **Dato desactualizado:** el token ya no es `nanoid(10)` sino `randomBytes(8)` en base64url, 11 caracteres (dispensacion.service.ts, línea 470; commit `dd8e723`) |
| R-04 Otros 500 por tipos inesperados en endpoints ADMIN | Pendiente, bajo; ejemplo: `PUT /catalogos/medicamentos/:id` | El ejemplo citado ya se corrigió con Zod (catalogos.routes.ts, línea 317; `aa7598b`). Siguen casos en `/usuarios` (email repetido → 500) y en `descripcion` de ubicaciones | Parcialmente (ver H-15) |
| R-05 Sin `Cache-Control: no-store` en respuestas sensibles | Informativo | Solo lo fija el endpoint de fotos (dispensacion.routes.ts, línea 303) | Sí |
| R-06 JWT sin revocación, 8 h | Informativo; mitigado por la consulta a la BD | Confirmado (auth.ts, líneas 39–55; env.ts, línea 87) | Sí (ver H-10) |
| R-07 `/api/health` expone el entorno | Informativo | `environment: config.nodeEnv` (server.ts, línea 65) | Sí |
| R-08 (`H-024`) Cabeceras del SPA solo en nginx | Requiere acción antes de producción | Cabeceras solo en frontend/nginx.conf, líneas 16–20; el compose por defecto sirve Vite (docker-compose.yml, línea 77) | Sí. Se agrava con H-36: la actualización automática usa ese compose |
| R-09 (`H-003`) Dependencias con avisos de `npm audit` | Bajo, no explotable en ejecución | No verificable sin ejecutar `npm audit` (fuera del alcance de esta fase) | No verificable |
| Preguntas de negocio diferidas: R-07/R-08 del informe de hallazgos, H-22, H-29 | No se modificaron | Confirmado: H-20, H-22 y H-29 siguen Pendientes; D-16 sin cambio | Sí |
| Lista previa a producción, punto 1: "el guard de `config/env.ts` aborta si son de ejemplo en prod — verificado" | Afirmación | **No coincide.** Desde `a274f5f` (2026-10-12) el backend solo advierte y arranca, salvo `STRICT_SECRETS=true` (env.ts, líneas 51 y 66–81). El informe es anterior a ese cambio | No |
| Lista previa a producción, punto 3: desplegar con `docker-compose.prod.yml` | Recomendación | La actualización automática documentada usa `docker compose up -d --build` sin `-f` (docs/DESPLIEGUE.md, líneas 5–6) | No se sigue en el mecanismo documentado (H-36) |

Fuente: Elaboración propia.

Riesgos que la verificación encontró y el informe no declara: H-35 (auditoría de subidas por captura
atribuida al usuario que dispensó, sin IP), H-36 (el servidor se actualiza con el compose de
desarrollo), H-37 (IP falsificable desde el propio equipo por `trust proxy`) y H-38 (auditoría de tokens
reutilizados). Ver `09_seguimiento_correcciones.md`, sección 4.
