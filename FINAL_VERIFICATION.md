# FINAL_VERIFICATION — FarmaG

**Fecha:** 2026-10-07 · **Rama:** `feature/dispensacion-evidencia-pc`
**Método:** verificación independiente basada en evidencia de ejecución (curl contra la API en vivo, pruebas automatizadas, consultas SQL directas, builds, navegador real, inspección de código y configuración). **No se confió en los informes previos**: cada afirmación se reverificó.
**Entorno:** Docker en vivo (db+api+web sanos, `NODE_ENV=development`). La ruta de producción se verificó en una instancia desechable con BD nueva y secretos seguros, sin tocar los datos de desarrollo.

---

## 1. Resumen ejecutivo

Las correcciones de la Fase 1 (**H-001…H-007**) están **confirmadas por prueba**: la separación dev/producción es real, la credencial `admin2026` ya no existe como contraseña usable, el bug de fechas 500→400 está resuelto en todos los endpoints, hay un único PrismaClient, los lockfiles están presentes y los builds usan `npm ci`, y el frontend de producción se sirve con nginx (no con el dev server de Vite). La integridad de datos es sólida (cero huérfanos, cero sobre-venta de stock, cero inconsistencias).

Los hallazgos **H-008…H-018** —que **no** eran objetivo de la Fase 1— se revalidaron individualmente: la mayoría **siguen presentes** tal como estaban clasificados (severidad baja/informativa), ninguno es crítico. Se descubrió **un hallazgo nuevo, H-019 (Medio)**: bajo despacho concurrente del mismo medicamento, un fallo de serialización de PostgreSQL (SQLSTATE 40001) devuelve ocasionalmente HTTP 500 en lugar de 409 — **sin pérdida ni corrupción de datos** (la integridad del inventario se mantiene siempre).

No hay vulnerabilidades **critical**; las **high** restantes son todas de dependencias de **desarrollo/build** (toolchain de Prisma CLI y de Vite), no explotables en el runtime de producción (backend compilado + nginx estático).

---

## 2. Estado general del sistema

### Clasificación: **APTO CON OBSERVACIONES**

**Por qué:**
- ✅ Los bloqueadores reales de producción están **corregidos y verificados**: arranque de producción no destructivo (H-001), sin credencial por defecto (H-002), build estático servido por nginx (H-007), builds reproducibles (H-006).
- ✅ **Cero vulnerabilidades critical**; las high restantes no son explotables en producción (devDeps/build).
- ✅ **Integridad de datos verificada** (sin huérfanos, sin sobre-venta, concurrencia correcta).
- ⚠️ Observaciones a resolver/aceptar antes de entregar: **H-019** (500 bajo concurrencia — sin pérdida de datos), y los hallazgos bajos H-008/H-010/H-011/H-012/H-013/H-014/H-015 (endurecimiento). H-003 queda parcial (dependencias disruptivas documentadas).
- ⚠️ **Requisitos operativos de despliegue** (no son defectos del código): definir `JWT_SECRET`/`DB_PASSWORD` seguros (el backend lo exige y aborta si no), `ADMIN_INITIAL_PASSWORD`, usar `docker-compose.prod.yml`, y eliminar las cuentas de prueba `qa_*`.

No es "NO APTO" porque ningún problema abierto causa pérdida de datos, acceso no autorizado por rol, ni es critical. No es "APTO" a secas porque quedan observaciones de severidad media/baja que conviene atender.

---

## 3. Resultado de hallazgos anteriores

| Hallazgo | Severidad original | Estado actual | Evidencia (prueba realizada) |
|---|---|---|---|
| **H-001** Docker/prod/migraciones | Alto | **CORREGIDO** | `Dockerfile` prod = `migrate deploy && node dist` (sin `tsx watch` ni `--accept-data-loss`, solo en comentarios). En BD nueva `migrate deploy` creó 15 tablas; en BD existente es no-op. Imagen prod corrió end-to-end (`Entorno: production`, login 200). |
| **H-002** Credencial admin por defecto | Alto | **CORREGIDO** | `grep admin2026` → solo en la lista de bloqueo del seed. Seed con `ADMIN_INITIAL_PASSWORD` → login 200; con `admin2026` → seed falla; sin env → contraseña aleatoria impresa 1 vez. Admin existente no se restablece. |
| **H-003** Dependencias vulnerables | Alto | **PARCIALMENTE CORREGIDO** | `sharp` 0.33.5→0.35.5 (CVEs libvips resueltos; subida de imagen → `image/webp` 200). Backend **7→6**, Frontend **13→11**, **0 critical**. HIGH restantes = devDep/build (Prisma CLI, ecosistema Vite), no explotables en prod. |
| **H-004** Fecha inválida → 500 | Medio | **CORREGIDO** | 11 variantes (inválida, imposible `2026-13-45`, rango invertido, vacía, válida) en auditoría/4 reportes/historial: inválidas→**400** con mensaje controlado **sin stack**; válidas/vacías→200. |
| **H-005** Múltiples PrismaClient | Medio | **CORREGIDO** | `grep "new PrismaClient"` = 1 (singleton). 25 GET concurrentes sin errores de pool. Despacho concurrente mantiene integridad (stock final correcto). |
| **H-006** Falta package-lock.json | Medio | **CORREGIDO** | Ambos `package-lock.json` presentes; Dockerfiles con `npm ci`; rebuild limpio dev y prod. Lockfile incluye binarios musl y win32 de sharp. |
| **H-007** Vite expuesto en prod | Medio | **CORREGIDO** | `docker-compose.prod.yml` sirve con nginx :80 (sin 5173). nginx: `/`→200, `/inventario`→200 (SPA fallback), `/api/health`→200 (proxy). |
| **H-008** IDOR / sin control de objeto | Bajo | **SIGUE PRESENTE** (impacto bajo por diseño) | ENCARGADO lee **y edita** beneficiario/dispensación ajenos por UUID (200/200/200). Técnicamente **no existe** control de acceso a nivel de objeto, solo por rol. Impacto bajo: 2 roles de confianza, datos compartidos operativamente. |
| **H-009** IP de auditoría | Bajo | **SIGUE PRESENTE** (dev) · prod **NO VERIFICADO** | `ipAddress` registrado = `::ffff:172.18.0.1` (gateway Docker) en dev. En prod depende de `X-Forwarded-For` de nginx (no verificado con cliente LAN real). |
| **H-010** Enumeración por timing en login | Bajo | **SIGUE PRESENTE** | 5 muestras: usuario inexistente ~**0.21s** vs existente+pass mala ~**0.46s** (bcrypt solo corre para existentes). Oráculo temporal claro. |
| **H-011** DoS de bloqueo de cuenta | Bajo | **SIGUE PRESENTE** | Un tercero falló 3 veces con el username de `qa_encargado` → el login legítimo (`qa_encargado/qa123456`) devolvió **429**. |
| **H-012** Paginación en memoria | Bajo | **SIGUE PRESENTE** | `GET /inventario` usa `filas.slice()` (paginación en memoria) tras cargar todos los medicamentos con todos sus lotes; `/alertas` carga todos los lotes. |
| **H-013** JWT sin revocación | Bajo | **SIGUE PRESENTE** (mitigado) | Desactivar usuario → token 401 inmediato; rol tomado de BD (promoción surte efecto). Pero el token de un usuario **activo** no es revocable hasta expirar (logout solo cliente). |
| **H-014** `calcularSemaforo` recalcula "hoy" | Bajo | **SIGUE PRESENTE** | El código llama `diasParaVencer(fechaVencimiento)` sin pasar `hoy`; la firma no acepta `hoy`. Recalcula internamente. |
| **H-015** Archivos huérfanos | Bajo | **SIGUE PRESENTE** (latente) | Reemplazo de imagen de medicamento: 1 archivo (no deja huérfano). Pero no hay borrado en cascada de fotos de dispensación (no existe endpoint de borrado que lo dispare; latente). |
| **H-016** Sin pruebas automatizadas | Informativo | **PARCIALMENTE CORREGIDO** | 15 pruebas (6 dominio + 9 fechas) ejecutadas: **15 PASS / 0 FAIL**. Falta cobertura de rutas/integración/concurrencia. |
| **H-017** Rate-limit en memoria | Informativo | **SIGUE PRESENTE** (por diseño) | Estado en memoria; se pierde al reiniciar; no escala horizontalmente. Aceptable para una instancia. |
| **H-018** Prod nginx no verificado | Informativo | **VERIFICADO/RESUELTO** | nginx sirve estático + proxy `/api` probado en runtime (ver H-007). |

### Nuevos hallazgos
| Hallazgo | Severidad | Estado |
|---|---|---|
| **H-019** Fallo de serialización (40001) bajo concurrencia → 500 | **Medio** | NUEVO — ver §4 |

---

## 4. Nuevos hallazgos

### H-019 — Fallo de serialización en despacho concurrente devuelve HTTP 500 (no 409)
- **Severidad:** Medio · **Categoría:** Backend / Concurrencia / Manejo de errores
- **Archivo:** `backend/src/services/dispensacion.service.ts` (transacción `Serializable` + `$queryRaw … FOR UPDATE`, ~línea 182-285); el error no mapeado cae en el `catch`→`responderError`→500.
- **Descripción:** Cuando dos usuarios despachan el **mismo medicamento simultáneamente**, la transacción `Serializable` puede fallar con `could not serialize access due to concurrent update` (SQLSTATE **40001** / Prisma P2034). Ese error **no está mapeado** a un código de negocio, así que se devuelve **HTTP 500**.
- **Evidencia (6 carreras):** 5/6 → `201 + 409` (correcto); **1/6 → `500 + 201`**. Log del api: `Raw query failed. Code: '40001'. Message: 'could not serialize access due to concurrent update'`.
- **Integridad:** **Preservada en todas las carreras** (stock final correcto, sin sobre-venta; verificado además con `SELECT count(*) FROM lotes WHERE cantidad_actual > cantidad` = 0 y `< 0` = 0).
- **¿Regresión?** **No.** Es inherente al aislamiento `Serializable` (pre-existente al diseño de concurrencia) y **no** lo introdujo el singleton de H-005 (la lógica transaccional es idéntica; el fenómeno es dependiente del *timing* y no determinista). No estaba en la lista H-001…H-018 porque las pruebas originales cayeron siempre en la rama del 409.
- **Impacto:** El sistema está pensado para 4 usuarios simultáneos; dos despachando el mismo medicamento a la vez pueden recibir un 500 confuso ("Error interno") en vez de "stock en conflicto, reintente". No hay pérdida de datos.
- **Recomendación:** Mapear Prisma `P2034`/SQLSTATE `40001` a **409** (mensaje "conflicto de concurrencia, reintente") y/o añadir un reintento acotado (2-3 intentos) dentro de `despachar`. **No corregido** en esta fase (es de verificación); documentado para decisión.

---

## 5. Testing funcional

CRUD verificado por módulo (códigos HTTP reales):
- **Categorías:** crear 201 · duplicada 409 · vacía 400 · editar 200 · inexistente 404.
- **Medicamentos:** falta campo 400 · categoría inexistente 400 · válido 201.
- **Ubicaciones:** crear 201 · duplicada 409.
- **Códigos de barras:** agregar 201 · duplicado 409 · eliminar inexistente 404.
- **Usuarios:** crear 201 · duplicado 409 · password <6 400 · rol inválido 400 · toggle 200 · inexistente 404 (verificado en fases previas y en auth).
- **Beneficiarios:** crear 201 · DPI inválido 400 · nombre <3 400 · editar 200 · inexistente 404.
- **Dispensación:** FIFO correcto · stock insuficiente 409 · cantidad 0/negativa/items vacío 400 · beneficiario inexistente 404.

## 6. Testing backend

`tsc --noEmit` **limpio**. Manejo de errores: 400/401/403/404/409/413/429 y 500 controlado (sin stack) verificados. Excepción: **H-019** (500 bajo concurrencia).

## 7. Testing frontend

Navegador real (dev): Dashboard, Inventario, Reportes (6 pestañas), Catálogos, Auditoría, Dispensación → **render correcto**. Las peticiones **actuales** de cada página son **200** (verificado en el log de red). Hay errores **500/ERR_EMPTY_RESPONSE** en el buffer de consola, pero son **obsoletos**: corresponden a la ventana en que se reconstruyó el stack (API momentáneamente abajo), no al estado actual — confirmado porque las últimas 15 de 104 peticiones son todas 200. `vite build` de producción **limpio** (4.9s).

## 8. Testing API

Endpoints autenticados exigen token (401 sin token, 401 token inválido/forjado `alg:none`, 403 por rol). Códigos observados: 200/201/400/401/403/404/409/413/429/500. Rutas inexistentes → 404 JSON.

## 9. Base de datos

14 FKs · 25 índices · migración `0_init` aplicada. **Integridad:** 0 lotes huérfanos, 0 detalles huérfanos, 0 lotes con `cantidad_actual > cantidad`, 0 stock negativo, 0 DPIs duplicados. (Las restricciones `@unique` de Prisma se implementan como índices únicos — la unicidad se confirmó funcionalmente con los 409 de duplicados.)

## 10. Autenticación

Login correcto 200 · pass incorrecta 401 · usuario inexistente 401 · campos vacíos 400 · JSON inválido 400 · sin token 401 · token inválido 401 · token manipulado 401 · token forjado `alg:none` 401 · perfil 200. Usuario desactivado → token 401 inmediato. Bloqueo por 3 intentos → 429.

## 11. Autorización

**Roles:** `ADMIN`, `ENCARGADO_BENEFICENCIA`.

| Acción | ADMIN | ENCARGADO_BENEFICENCIA |
|---|---|---|
| Login / perfil / inventario (lectura) | ✅ | ✅ |
| Dispensar / registrar entrada / beneficiarios | ✅ | ✅ |
| Reportes (lectura) | ✅ | ✅ |
| Crear/editar medicamento, categoría, ubicación, código barras | ✅ | ❌ 403 |
| Dar de baja lote | ✅ | ❌ 403 |
| Importar Excel / plantilla / lookup-FDA | ✅ | ❌ 403 |
| Exportar reportes (PDF/Excel) | ✅ | ❌ 403 |
| Usuarios (CRUD) / Auditoría | ✅ | ❌ 403 |
| Configuración de umbrales (PUT) | ✅ | ❌ 403 |

Control por rol correcto a nivel de ruta (verificado vía API directa, no solo UI). **No** hay control a nivel de objeto (**H-008**).

## 12. Seguridad (OWASP)

- **A01 Broken Access Control:** control por rol OK; sin control de objeto (H-008, bajo por diseño).
- **A02 Cripto:** bcrypt(12), JWT firmado; secretos exigidos en prod (abort verificado con JWT inseguro).
- **A03 Injection:** Prisma parametriza; `$queryRaw` con *tagged template*; inyección SQL sin efecto.
- **A05 Misconfig:** helmet activo, `x-powered-by` oculto; **CORS en dev refleja origen** (`http://evil.example` reflejado) — por diseño en dev; en prod restringido por `CORS_ORIGIN`.
- **A06 Componentes vulnerables:** H-003 (sin critical; highs = build/dev).
- **A07 Auth failures:** H-010 (timing), H-011 (lockout DoS).
- **A08 Integridad:** lockfiles presentes; `.env` no versionado.
- **A10 SSRF:** `lookup-fda` URL fija a `api.fda.gov` con NDC de solo dígitos → sin SSRF.
- **Path traversal:** foto con traversal en `:tipo` → 400; `/uploads/dispensaciones` no servido estático → 404.
- **Mass assignment:** editar medicamento inyectando `id`/`createdAt` → **ignorados** (whitelist `CAMPOS_EDITABLES_MEDICAMENTO`); `id` y `createdAt` intactos.
- **XSS:** 0 sinks (`dangerouslySetInnerHTML`/`innerHTML`/`eval`).
- **Secretos:** `admin2026` solo en lista de bloqueo; sin API keys/passwords hardcodeadas; `.env` fuera de git.

## 13. Dependencias

| Área | Antes | Ahora |
|---|---:|---:|
| **Backend** total | 7 | **6** |
| — critical | 0 | 0 |
| — high | 4 | **3** (deepmerge-ts, @prisma/config, prisma — **devDep/build**) |
| — moderate | 3 | 3 (uuid vía exceljs/node-cron — runtime, bajo) |
| **Frontend** total | 13 | **11** |
| — critical | 0 | 0 |
| — high | 8 | **6** (braces, chokidar, fast-glob, micromatch, tailwindcss, vite — **todas build/dev**) |
| — moderate | 5 | 5 (esbuild dev, react-router x2 runtime, postcss x2 build) |

**Ninguna HIGH/CRITICAL es explotable en el runtime de producción:** backend highs = CLI de Prisma (build/deploy, no en la ruta de peticiones); frontend highs = toolchain de Vite/Tailwind (no se ejecuta en el estático de nginx). La única HIGH de runtime que importaba (`sharp`) **fue corregida**.

## 14. Docker y despliegue

- **Dev** (`docker-compose.yml`): api `target: development` (tsx watch + `db push` sin `--accept-data-loss`), web Vite :5173, db/api en 127.0.0.1, web en LAN. Montaje de `tests/` para `npm test`.
- **Prod** (`docker-compose.prod.yml`): api `target: production` (`migrate deploy` + `node dist`), web nginx :80 (sin 5173), sin bind-mounts de código, db/api en 127.0.0.1. Secretos exigidos.
- Separación dev/prod **real y verificada**.

## 15. Build producción

Backend: imagen `production` construida (`npm ci` + `tsc`→dist); arranque `node dist` con `migrate deploy`, health 200, login 200, env=production. Frontend: imagen `production` (nginx) construida; sirve SPA + proxy `/api`. `tsc` backend y `vite build` frontend **limpios**.

## 16. Tests automatizados

`npm test` → **15 tests, 15 PASS, 0 FAIL, 0 SKIPPED**. (`backend/tests/inventario.service.test.ts` 6 + `fecha.test.ts` 9.) Sin cobertura instrumentada configurada. Falta cobertura de rutas, integración y del caso de concurrencia H-019.

## 17. Regresiones

**No se encontraron regresiones** introducidas por las correcciones de Fase 1:
- Prisma singleton: CRUD, auth, reportes, auditoría, concurrencia → OK; sin errores de pool en 25 req concurrentes.
- Autenticación: toda la batería 200/401/403/400 correcta.
- Docker/Vite/dependencias: builds dev y prod limpios; frontend renderiza; sharp funciona.
- Fechas: válidas siguen 200; inválidas ahora 400.
- El **H-019** (500 bajo concurrencia) **no es una regresión**: es un fenómeno pre-existente y no determinista del aislamiento `Serializable` (5/6 carreras dan el 409 correcto; la integridad nunca falla).

## 18. Riesgos pendientes

1. **H-019 (Medio):** 500 ocasional bajo despacho concurrente del mismo medicamento (sin pérdida de datos). Recomendado mapear 40001→409 + reintento.
2. **H-003 (parcial):** dependencias con HIGH en build/dev (Prisma CLI, Vite/Tailwind) — requieren actualizaciones mayores (Prisma 7, Vite 8, Tailwind 4, react-router 7); documentadas, no explotables en prod.
3. **Bajos:** H-008 (sin control de objeto), H-010 (timing), H-011 (lockout DoS), H-012 (paginación en memoria), H-013 (revocación JWT), H-014 (semáforo), H-015 (huérfanos latentes).
4. **NO VERIFICADO:** IP real en producción con nginx + cliente LAN (H-009); captura QR con celular físico; carga/estrés por encima de ~25 concurrentes.
5. **Operativo:** cuentas de prueba `qa_encargado` (activa) y `qa_boot4`/`qa_rand4`/`qa_jwt`/`qa_idor` (desactivadas) en la BD de desarrollo — eliminar antes de producción.

## 19. Recomendaciones finales

**Antes de desplegar (obligatorio):**
- Definir `JWT_SECRET` (≥16, aleatorio) y `DB_PASSWORD` seguros en `.env` (el backend aborta en prod si son de ejemplo — verificado).
- Desplegar con `docker-compose.prod.yml`; hacer el `prisma db seed` inicial una vez con `ADMIN_INITIAL_PASSWORD`.
- Eliminar las cuentas `qa_*` de la base de datos.

**Prioridad alta (recomendado antes de producción):**
- Corregir **H-019** (40001→409 + reintento) — es el único medio abierto que afecta un flujo núcleo.
- Confirmar `X-Forwarded-For` real en el despliegue nginx (H-009).

**Prioridad media (post-lanzamiento):**
- H-010 (hash dummy anti-timing), H-011 (lockout por IP+usuario), H-013 (revocación/expiración corta).
- H-012 (agregación en SQL si crece el volumen), H-014 (pasar `hoy` al semáforo), H-015 (limpieza de fotos).
- H-003 restante en una ventana de actualización de dependencias mayores.

---

## Matriz final

| Área | Estado | Comentario |
|---|---|---|
| Frontend | ✅ | Renderiza sin errores actuales; build de prod limpio; 0 sinks XSS |
| Backend | ⚠️ | Correcto salvo H-019 (500 bajo concurrencia, sin pérdida de datos) |
| Base de datos | ✅ | Integridad total: 0 huérfanos, 0 inconsistencias de stock, migración aplicada |
| Seguridad | ⚠️ | Sin critical; bajos abiertos (H-008/H-010/H-011); CORS dev permisivo por diseño |
| Autenticación | ✅ | Batería completa correcta; sesión validada contra BD |
| Autorización | ⚠️ | Por rol correcta; sin control a nivel de objeto (H-008, bajo) |
| Dependencias | ⚠️ | 0 critical; highs restantes = build/dev no explotables; sharp corregido |
| Docker | ✅ | Separación dev/prod real y verificada |
| Producción | ⚠️ | Apta siguiendo el checklist; pendiente H-019 y verificación de IP en prod |
| Tests | ⚠️ | 15/15 PASS; cobertura limitada (sin rutas/integración/concurrencia) |

---

## Conclusión obligatoria

1. **¿El sistema funciona correctamente?** Sí. Todos los flujos núcleo (auth, CRUD, inventario, dispensación FIFO, reportes, auditoría) funcionan y se verificaron en ejecución. Única excepción: un 500 ocasional bajo concurrencia (H-019), sin pérdida de datos.
2. **¿Todos los hallazgos anteriores fueron corregidos?** No todos. **Corregidos:** H-001, H-002, H-004, H-005, H-006, H-007 y H-018 (verificado). **Parciales:** H-003, H-016. **Siguen presentes (bajos/informativos):** H-008, H-009, H-010, H-011, H-012, H-013, H-014, H-015, H-017 — ninguno era objetivo de la Fase 1.
3. **¿Qué hallazgos siguen abiertos?** H-003 (parcial), H-008, H-009, H-010, H-011, H-012, H-013, H-014, H-015, H-017 y el nuevo **H-019**.
4. **¿Aparecieron nuevos hallazgos?** Sí: **H-019** (Medio) — fallo de serialización bajo concurrencia devuelve 500 en vez de 409.
5. **¿Existen regresiones?** **No.** Verificado en Prisma, auth, Docker, Vite, dependencias y fechas. H-019 no es regresión (fenómeno pre-existente, no determinista, integridad intacta).
6. **¿Hay riesgo de pérdida de datos?** **No.** Producción ya no usa `db push --accept-data-loss`; migraciones versionadas; integridad de BD verificada (0 inconsistencias); concurrencia sin sobre-venta.
7. **¿Hay credenciales inseguras?** **No** en el repositorio: `admin2026` solo en lista de bloqueo, `.env` fuera de git, sin keys/passwords hardcodeadas. **Operativo:** cambiar la contraseña del `admin` en instalaciones existentes y eliminar cuentas `qa_*`.
8. **¿Hay vulnerabilidades HIGH o CRITICAL?** **CRITICAL: no (0).** **HIGH: sí en dependencias**, pero todas de **build/desarrollo** (CLI de Prisma; toolchain de Vite/Tailwind), **no explotables en el runtime de producción**. La única HIGH de runtime (`sharp`) fue corregida.
9. **¿El sistema puede desplegarse en producción?** **Sí, con observaciones**, siguiendo el checklist de la §19 (secretos seguros, compose de producción, bootstrap de admin, eliminar cuentas de prueba). Se recomienda corregir H-019 primero.
10. **¿Qué debo corregir antes de entregarlo?** Obligatorio: secretos seguros + `docker-compose.prod.yml` + bootstrap de admin + eliminar cuentas `qa_*`. Muy recomendado: **H-019** (40001→409 + reintento) y confirmar `X-Forwarded-For` en prod (H-009).

### NO VERIFICADO (y por qué)
- **IP real del cliente en producción (H-009):** el runtime probado es desarrollo; no se desplegó nginx con clientes LAN reales.
- **Captura QR con celular físico:** requiere hardware (cámara).
- **Carga/estrés sostenido** por encima de ~25 peticiones concurrentes: no se ejecutó prueba de estrés prolongada.
- **Cobertura de código instrumentada:** no hay herramienta de cobertura configurada; se reporta el nº de pruebas, no el % de líneas.

*Conclusión basada únicamente en las pruebas ejecutadas y documentadas arriba. No se realizaron cambios de código en esta fase de verificación.*
