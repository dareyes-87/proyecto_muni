# SECURITY_TEST_MATRIX.md — FarmaG

> Pruebas ejecutadas el 2026-10-07 contra el entorno local en vivo. "Resultado real" = código HTTP
> observado. Donde hubo corrección, se muestra antes → después.

| ID | Área | Ataque | Esperado | Resultado real | Estado |
|---|---|---|---|---|---|
| T-01 | Login | Credenciales válidas | 200 + token | 200 | PASS |
| T-02 | Login | Contraseña incorrecta | 401 | 401 | PASS |
| T-03 | Login | Usuario inexistente | 401 | 401 | PASS |
| T-04 | Login | Campos vacíos / password null | 400 | 400 | PASS |
| T-05 | Login | Cuerpo JSON malformado | 400 | 400 | PASS |
| T-06 | Login | username/password objeto o arreglo | 400 | 500 → **400** | FIXED (H-021) |
| T-07 | Lockout | 3 fallos activan bloqueo | 429 | 429 | PASS |
| T-08 | **Lockout bypass** | Password correcta durante bloqueo | 429, sin token | 429, 0 tokens | PASS (crítico) |
| T-09 | Lockout | Bypass por mayúsculas del usuario | bloqueado | 429 | PASS |
| T-10 | Bypass | Sin token / Bearer vacío | 401 | 401 | PASS |
| T-11 | Bypass | Token aleatorio / no-Bearer | 401 | 401 | PASS |
| T-12 | Bypass | Firma alterada | 401 | 401 | PASS |
| T-13 | Bypass | `alg:none` forjado (claims ADMIN) | 401 | 401 | PASS |
| T-14 | Bypass | HS256 firmado con secreto erróneo | 401 | 401 | PASS |
| T-15 | Bypass | Token expirado | 401 | 401 | PASS |
| T-16 | JWT | Firma válida, userId inexistente | 401 (BD) | 401 | PASS |
| T-17 | Escalada | Token `rol:ADMIN` forjado (ENCARGADO real) | 403 (BD manda) | 403 | PASS |
| T-18 | Desactivación | Token vigente de usuario recién desactivado | 401 | 401 | PASS (H-10) |
| T-19 | RBAC | ENCARGADO → `GET /usuarios` | 403 | 403 | PASS |
| T-20 | RBAC | ENCARGADO → `POST /usuarios` | 403 | 403 | PASS |
| T-21 | RBAC | ENCARGADO → `GET /auditoria` | 403 | 403 | PASS |
| T-22 | RBAC | ENCARGADO → `PUT /inventario/configuracion` | 403 | 403 | PASS |
| T-23 | RBAC | ENCARGADO → `POST /catalogos/medicamentos` | 403 | 403 | PASS |
| T-24 | RBAC | ENCARGADO → `GET /reportes/exportar/...` | 403 | 403 | PASS |
| T-25 | RBAC | ENCARGADO → `POST /inventario/importar-excel` | 403 | 403 | PASS |
| T-26 | RBAC | ENCARGADO → `lookup-fda` | 403 | 403 | PASS |
| T-27 | RBAC | ENCARGADO → `GET /inventario/plantilla-excel` | 403 | 403 | PASS |
| T-28 | RBAC | ENCARGADO → `PUT /inventario/lotes/:id/baja` | 403 | 403 | PASS |
| T-29 | RBAC | ENCARGADO → endpoints permitidos (inventario/reportes GET) | 200 | 200 | PASS (por diseño) |
| T-30 | IDOR | ENCARGADO lee/edita beneficiario ajeno | — | 200 | ACEPTADO (H-008, por diseño) |
| T-31 | IDOR | ENCARGADO genera token de dispensación ajena | — | 200 | ACEPTADO (por diseño) |
| T-32 | Mass assignment | `beneficiario` create con id/activo/createdAt/saldo | ignorados | id nuevo, activo=true | PASS |
| T-33 | SQLi | `' OR 1=1--` en buscar beneficiarios | literal | 200 | PASS |
| T-34 | SQLi | `';DROP TABLE lotes;--` en inventario q | literal, tabla intacta | 200, lotes=12 | PASS |
| T-35 | SQLi | inyección en `barcode/:codigo` | 404/sin efecto | 404 | PASS |
| T-36 | SQLi | inyección en `medicamentoId` del `$queryRaw` FIFO | 'no encontrado' | 404 | PASS |
| T-37 | XSS | Payload almacenado en nombre/observaciones | JSON escapado por SPA | guardado literal, React auto-escape | PASS |
| T-38 | Path traversal | `..%2f..%2fetc%2fpasswd` en foto `:id` | 404 | 404 | PASS |
| T-39 | Path traversal | tipo de foto manipulado | 400 | 400 | PASS |
| T-40 | File upload | archivo no-imagen / MIME inválido | rechazado | rechazado | PASS |
| T-41 | SSRF | `lookup-fda` destino arbitrario | solo api.fda.gov | sin SSRF | PASS |
| T-42 | Negocio | `despachar cantidad:"abc"` | 400, sin dispensación | 201 vacía → **400** | FIXED (H-020) |
| T-43 | Negocio | `despachar cantidad:{"gt":0}` / `1.5` | 400 | 201/— → **400** | FIXED (H-020) |
| T-44 | Negocio | `despachar` con IDs objeto | 400 | 500 → **400** | FIXED (H-020) |
| T-45 | Negocio | Dispensar lote vencido (fecha hoy/pasada) | 409 | 409 | PASS (H-01) |
| T-46 | Race | 6× despacho concurrente x5 sobre stock 20 | sin sobre-venta | 4×201,409, stock 0 | PASS |
| T-47 | Race | ¿conflicto → 500? | 409/sin 500 | 500 → **409** | FIXED (H-019) |
| T-48 | Validación | fecha inválida en auditoría/reportes/historial | 400 | 400 | PASS (H-004) |
| T-49 | Validación | page negativa (auditoría/historial) | 400/clamped | 500 → **200 clamped** | FIXED (H-022) |
| T-50 | Validación | limit enorme (999999) | tope | sin tope → **limit=100** | FIXED (H-022) |
| T-51 | Validación | rol inválido en `POST /usuarios` | 400 | 500 → **400** | FIXED (H-023) |
| T-52 | Métodos | DELETE/PATCH en rutas sin ese método | 404 | 404 | PASS |
| T-53 | 404 | Ruta inexistente | 404 JSON | 404 JSON | PASS |
| T-54 | Content-Type | login con text/plain | 400 (body vacío) | 400 | PASS |
| T-55 | Cabeceras | API (helmet) | CSP/XFO/HSTS/nosniff | presentes | PASS |
| T-56 | Clickjacking | SPA framable (sin XFO/CSP) | no framable | sin cabeceras → **corregido nginx** | FIXED prod (H-024) |
| T-57 | CORS | Origin externo | sin credentials | ACAO reflejado, sin credentials | ACEPTADO (dev) |
| T-58 | Cache | `/usuarios` sin no-store | — | sin cache-control | INFO |
| T-59 | Captura pública | token inválido / traversal | 404 | 404 | PASS |
| T-60 | Captura pública | sin rate limit (10 req rápidas) | — | 10×404 sin throttle | INFO (keyspace grande) |
| T-61 | Secretos | `.env` versionado | no | no (gitignored) | PASS |
| T-62 | Deps | HIGH/CRITICAL explotables en runtime | 0 | 0 (high = config/build) | PASS |
