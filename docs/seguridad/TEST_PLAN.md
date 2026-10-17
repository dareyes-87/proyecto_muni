# TEST_PLAN — FarmaG

**Fecha:** 2026-10-07 · **Entorno:** Docker (db+api+web) en `localhost`, `NODE_ENV=development`.
**Método:** pruebas en vivo con `curl` contra la API (`http://localhost:3000/api`), recorrido del frontend en navegador real, y pruebas unitarias con `node --test`.

Estados: **PASS** (comportamiento = esperado), **FAIL** (≠ esperado), **BLOCKED**, **NOT TESTED**.

---

## 1. Matriz de funcionalidades (resumen)

| ID | Módulo | Funcionalidad | Rol | Resultado esperado | Endpoint |
|---|---|---|---|---|---|
| F-01 | Auth | Iniciar sesión | Todos | Acceso solo con credenciales válidas | `POST /auth/login` |
| F-02 | Auth | Perfil (rol real) | Autenticado | Devuelve datos del usuario del token | `GET /auth/perfil` |
| F-03 | Usuarios | CRUD usuarios | ADMIN | Crear/editar/reset/activar | `/usuarios*` |
| F-04 | Inventario | Registrar entrada con lotes | Ambos | Lotes creados, fecha futura obligatoria | `POST /inventario/entradas` |
| F-05 | Inventario | Listado con semáforo | Ambos | Stock agregado + semáforo | `GET /inventario` |
| F-06 | Inventario | Dar de baja lote | ADMIN | Lote → DADO_DE_BAJA | `PUT /inventario/lotes/:id/baja` |
| F-07 | Inventario | Importar Excel | ADMIN | Alta masiva, errores por fila | `POST /inventario/importar-excel` |
| F-08 | Dispensación | Despachar FIFO + concurrencia | Ambos | Descuento FIFO, sin doble gasto | `POST /dispensacion/despachar` |
| F-09 | Dispensación | Beneficiarios | Ambos | Crear/buscar/editar, DPI 13 dígitos | `/dispensacion/beneficiarios*` |
| F-10 | Captura | Subir evidencia por token | Público | Solo con token vigente | `/captura/:token/*` |
| F-11 | Catálogos | CRUD medicamentos/cat/ubic | ADMIN escritura | Con detección de duplicados | `/catalogos/*` |
| F-12 | Reportes | 6 reportes + exportación | Lectura ambos; export ADMIN | Datos + PDF/Excel | `/reportes/*` |
| F-13 | Auditoría | Consulta de log | ADMIN | Registro de acciones | `GET /auditoria` |

---

## 2. Casos de prueba ejecutados

### Autenticación y autorización

| ID | Caso | Entrada | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| T-01 | Health | `GET /health` | 200 `status:ok` | 200 | PASS |
| T-02 | Login válido | admin/admin2026 | 200 + token | 200 + JWT (236 chars) | PASS |
| T-03 | Login password incorrecto | admin/malaX | 401 | 401 | PASS |
| T-04 | Login usuario inexistente | noexisteXYZ | 401 `intentosRestantes` | 401 `intentosRestantes:2` | PASS |
| T-05 | Login campos faltantes | solo username | 400 | 400 "Usuario y contraseña..." | PASS |
| T-06 | Endpoint protegido sin token | `GET /usuarios` | 401 | 401 | PASS |
| T-07 | Token inválido | Bearer abc.def.ghi | 401 | 401 "Token inválido o expirado" | PASS |
| T-08 | Admin lista usuarios | `GET /usuarios` | 200 | 200 | PASS |
| T-09 | Crear usuario ENCARGADO | datos válidos | 201 | 201 | PASS |
| T-10 | Crear usuario password <6 | password "123" | 400 | 400 | PASS |
| T-11 | Crear usuario duplicado | username repetido | 409 | 409 | PASS |
| T-12 | Escalamiento: ENCARGADO → `/usuarios` | token ENCARGADO | 403 | 403 | PASS |
| T-13 | Escalamiento: ENCARGADO → `/auditoria` | token ENCARGADO | 403 | 403 | PASS |
| T-14 | Escalamiento: ENCARGADO → crear medicamento | token ENCARGADO | 403 | 403 | PASS |
| T-15 | Escalamiento: ENCARGADO → exportar reporte | token ENCARGADO | 403 | 403 | PASS |
| T-16 | Escalamiento: ENCARGADO → plantilla Excel | token ENCARGADO | 403 | 403 | PASS |
| T-17 | Escalamiento: ENCARGADO → lookup-FDA | token ENCARGADO | 403 | 403 | PASS |
| T-18 | ENCARGADO → `GET /inventario` (permitido) | token ENCARGADO | 200 | 200 | PASS |
| T-19 | ENCARGADO → `GET /reportes/dispensaciones` (lectura) | token ENCARGADO | 200 | 200 | PASS |
| T-20 | **H-10** Desactivar usuario invalida su token al instante | toggle + reusar token | 401 | 401 "cuenta ya no está activa" | PASS |
| T-21 | **H-09** Lockout tras 3 fallos | 3× login malo (usuario throwaway) | 429 al 3.º | 429 al 3.º | PASS |

### Validaciones y pruebas negativas

| ID | Caso | Entrada | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| T-22 | Inyección SQL en filtro `q` | `q=' OR 1=1--` | Sin efecto (parametrizado) | 200 data:[] | PASS |
| T-23 | **H-34** Entrada lote vencido (fecha pasada) | 2020-01-01 | 400 | 400 | PASS |
| T-24 | **H-34** Entrada lote fecha=hoy | fecha actual | 400 | 400 | PASS |
| T-25 | Entrada válida con 2 lotes | fechas futuras | 201 | 201 | PASS |
| T-26 | `medicamentoId` no-UUID en entrada | "NO-UUID" | 400 (Zod) | 400 | PASS |
| T-27 | Beneficiario DPI ≠ 13 dígitos | dpi "123" | 400 | 400 | PASS |
| T-28 | Beneficiario nombre <3 chars | "ab" | 400 | 400 | PASS |
| T-29 | Despachar cantidad 0 | cantidad:0 | 400 | 400 | PASS |
| T-30 | Despachar cantidad negativa | cantidad:-5 | 400 | 400 | PASS |
| T-31 | Despachar items vacío | items:[] | 400 | 400 | PASS |
| T-32 | Despachar beneficiario inexistente | UUID cero | 404 | 404 | PASS |
| T-33 | Ruta inexistente | `GET /no-existe` | 404 JSON | 404 "Ruta no encontrada" | PASS |
| T-34 | JSON malformado | `{bad json` | 400 | 400 | PASS |
| T-35 | Cuerpo demasiado grande (200KB) | body gigante | 413 | 413 | PASS |
| T-36 | Token de captura inválido | token falso | 404 | 404 | PASS |
| T-37 | **Fecha inválida en filtro** `/auditoria?desde=basura` | "basura" | **400** | **500** (sin fuga) | **FAIL (H-004)** |
| T-38 | Fecha inválida `/reportes/dispensaciones?desde=xx` | "xx" | 400 | 500 | FAIL (H-004) |
| T-39 | Fecha inválida `/reportes/consumo?desde=xx` | "xx" | 400 | 500 | FAIL (H-004) |
| T-40 | Fecha inválida `/reportes/entradas?hasta=xx` | "xx" | 400 | 500 | FAIL (H-004) |
| T-41 | Fecha inválida `/dispensacion/historial?fechaDesde=xx` | "xx" | 400 | 500 | FAIL (H-004) |
| T-42 | `auditoria?usuario=noUUID` | no-UUID | 200 vacío (string match) | 200 | PASS |
| T-43 | `reportes/por-vencer?dias=abc` | NaN | 200 (default) | 200 | PASS |

> Nota: T-37..T-41 son la **misma causa raíz** (H-004); se cuentan como 1 FAIL único en el resumen del informe principal.

### Lógica de negocio crítica (FIFO + concurrencia + integridad)

| ID | Caso | Escenario | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| T-44 | Stock tras entrada | 2 lotes (20+30) | stock 50 | 50 | PASS |
| T-45 | **FIFO** despacho 25 | L1 vence antes (20), L2 después (30) | L1 agota (0, AGOTADO), L2=25 | exacto | PASS |
| T-46 | Snapshots | detalle de dispensación | nombre/present/concentración guardados | guardados | PASS |
| T-47 | **Concurrencia** 2×20 con stock 25 | 2 despachos simultáneos | 1×201, 1×409; stock final 5 | 201 + 409; stock 5 | PASS |
| T-48 | Stock insuficiente | pedir 9999 | 409 con stock disponible | 409 | PASS |
| T-49 | Integridad post-operaciones | consulta de lotes | sin doble gasto, estados correctos | correcto | PASS |

### Seguridad / exposición

| ID | Caso | Esperado | Obtenido | Estado |
|---|---|---|---|---|
| T-50 | Cabeceras helmet presentes | HSTS, X-Content-Type, X-Frame | presentes | PASS |
| T-51 | `x-powered-by` oculto | ausente | ausente | PASS |
| T-52 | **H-11** `/uploads/dispensaciones/*` NO servido estático | 404 | 404 | PASS |
| T-53 | **H-11** Foto autenticada sin token | 401 | 401 | PASS |

### Frontend (navegador real)

| ID | Pantalla | Esperado | Obtenido | Estado |
|---|---|---|---|---|
| T-54 | Dashboard | Render + KPIs reales | OK (KPIs = resultados backend) | PASS |
| T-55 | Inventario | Tabla + semáforo + paginación | OK (stock 5 reflejado) | PASS |
| T-56 | Reportes (6 pestañas) | Sin pantalla en blanco | OK, cambio de pestañas sin crash | PASS |
| T-57 | Catálogos (3 pestañas) | Render tabla + tabs | OK (sin Proveedores) | PASS |
| T-58 | Auditoría | Log con mis acciones | OK (ACTIVAR/DESACTIVAR/DISPENSAR/CREAR) | PASS |
| T-59 | Consola del navegador | 0 errores | 0 errores | PASS |

### Pruebas unitarias (automatizadas)

| ID | Caso | Resultado |
|---|---|---|
| T-60 | `inventario.service` (6 pruebas: diasParaVencer, estaVencido, calcularSemaforo ×2, esDispensable, validarFechaVencimientoEntrada) | 6/6 PASS |

---

## 3. Casos NOT TESTED (y por qué)

| Caso | Motivo |
|---|---|
| Captura por QR con cámara de celular físico (`capture="environment"`) | Requiere hardware real |
| Despliegue en modo producción (nginx + proxy de uploads, backend compilado) | Runtime actual es desarrollo (Vite) |
| Comportamiento bajo carga / agotamiento del pool de conexiones (H-005) | No se ejecutó prueba de estrés sostenido |
| Enumeración de usuarios por tiempo (H-010) | No se midieron tiempos de respuesta |
| Validación visual exhaustiva de cada formulario vía DevTools (manipulación de campos ocultos) | Se verificó render y flujos; no cada campo |
| Restauración de esquema tras `prisma db push --accept-data-loss` con drift real (H-001) | No se forzó drift para evitar riesgo de datos |
| Rotación/expiración real del JWT a las 8h | Requiere espera / manipulación de reloj |

---

## 4. Datos de prueba creados (dejados en la BD de desarrollo)

Claramente identificables (prefijo `qa_`/`QA`), consistentes con la práctica de sesiones previas:
- Usuario `qa_encargado` (ENCARGADO_BENEFICENCIA).
- Beneficiario "QA Beneficiario" (DPI 1111122223333) con 2 dispensaciones de prueba.
- Lotes `QA-L1-antes` (agotado) y `QA-L2-despues` (5 unidades) sobre Acetaminofén 500mg Tableta.
- Entrada de inventario "QA stock".
- Entrada en memoria del lockout (`qa_lockout_victim`) — se pierde al reiniciar el backend.

> No se realizaron operaciones destructivas. Si se desea una BD de demo limpia, estos registros pueden eliminarse en orden de FK (FotoDispensacion/TokenCaptura → DetalleDispensacion → Dispensacion; luego lotes/entrada; luego beneficiario/usuario).
