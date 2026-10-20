# ANEXO D

# ESPECIFICACIÓN DE LA API

Este anexo presenta la especificación completa de los 54 endpoints de la API de FarmaG en el commit
`bdf1187`, agrupados por módulo en las Tablas 202 a 210. El resumen de cada módulo y el diseño de
seguridad se presentan en las secciones 5.7 y 5.8.

Convenciones: en la columna "Roles", "Ambos" significa cualquier usuario con sesión (Administrador o
Encargado de Beneficencia), "ADMIN" el rol Administrador y "Público" un acceso sin sesión. Los
parámetros que empiezan con dos puntos (`:id`) forman parte de la ruta; los de tipo "Query" van en la
cadena de consulta. Todas las respuestas de error tienen la forma `{ "error": "mensaje" }`. Las
respuestas comunes a todos los endpoints con sesión (401 sin token, con token inválido o vencido o con
la cuenta desactivada; 403 sin permiso; 400 por JSON mal formado; 413 por un cuerpo mayor de 100 kB)
se presentan en la Tabla 88 y no se repiten. En todas las tablas, 500 corresponde a "Error interno del
servidor", cuyo detalle técnico solo se incluye en modo de desarrollo.

La Tabla 202 presenta los endpoints del módulo de autenticación.

Tabla 202.
Endpoints de autenticación

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| POST | `/api/auth/login` | Público | `username` y `password`: deben ser texto no vacío. | 200 `{ token, usuario: { id, username, nombreCompleto, rol, email } }`; 429 `Demasiadas solicitudes de inicio de sesión desde esta red…` con `Retry-After` si la IP supera 20 solicitudes en 10 min (se cuenta antes de validar el cuerpo); 400 `Usuario y contraseña son requeridos` si falta alguno o no es texto; 429 `Demasiados intentos fallidos. Intente de nuevo en n minuto(s).` con `Retry-After` si la combinación usuario+IP está bloqueada (3 fallos → 5 min) o queda bloqueada con este fallo; 401 `{ error: 'Credenciales inválidas', intentosRestantes }` si el usuario no existe, está inactivo o la contraseña no coincide (mismo mensaje en los tres casos); 500 `Error interno del servidor`. El estado de ambos límites está en memoria. |
| GET | `/api/auth/perfil` | Ambos | — | 200 `{ id, username, nombreCompleto, email, rol, ultimoAcceso, createdAt }`; 404 si el usuario no existe; 500. |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 203 presenta los endpoints del módulo de estado del servicio.

Tabla 203.
Endpoints de estado del servicio

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/health` | Público | — | 200 `{ status: 'ok', timestamp, environment }` (expone `NODE_ENV`). |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 204 presenta los endpoints del módulo de usuarios.

Tabla 204.
Endpoints de usuarios

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/usuarios` | ADMIN | — | 200 arreglo de usuarios (sin `passwordHash`), orden `createdAt` desc, sin paginación; 500. |
| POST | `/api/usuarios` | ADMIN | `username`, `password`, `nombreCompleto`, `rol` obligatorios; `username` y `nombreCompleto` deben ser texto, `rol` ∈ {`ADMIN`, `ENCARGADO_BENEFICENCIA`}, `password` texto de mínimo 6 caracteres. `email` opcional, sin validar tipo ni formato. La contraseña se guarda con bcrypt, costo 12. | 201 usuario creado; 400 campo faltante, tipo incorrecto, rol inválido o contraseña corta; 409 `El nombre de usuario ya existe`; 500 (p. ej. `email` duplicado). |
| PUT | `/api/usuarios/:id/toggle` | ADMIN | `:id` usuario | 200 `{ id, username, activo }`; 404; 400 si es la propia cuenta; 500. |
| PUT | `/api/usuarios/:id` | ADMIN | `:id` usuario; `nombreCompleto`, `email`, `rol`, opcionales. Solo se valida que `rol`, si viene, sea del enum; sin validación de tipo de los demás. | 200 usuario actualizado; 400 rol inválido; 400 si el ADMIN intenta quitarse su propio rol; 404; 500 (p. ej. `email` duplicado o `nombreCompleto` no texto). |
| PUT | `/api/usuarios/:id/password` | ADMIN | `:id` usuario; `password` (texto, mínimo 6) | 200 `{ data: { id, message } }`; 400; 404; 500. |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 205 presenta los endpoints del módulo de catálogos.

Tabla 205.
Endpoints de catálogos

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/catalogos/medicamentos` | Ambos | Query: `page` (def. 1), `limit` (1–100, def. 20), `q` (nombre genérico o comercial, sin distinguir mayúsculas), `incluirInactivos` (`'true'`) | 200 `{ data, pagination }` con categoría y códigos; por defecto solo `activo = true`; 500. |
| GET | `/api/catalogos/medicamentos/buscar` | Ambos | Query: `q` (recortado) | 200 `{ data }` (máx. 20, activos); `q` vacío → `{ data: [] }`; 500. |
| GET | `/api/catalogos/medicamentos/barcode/:codigo` | Ambos | `:codigo` (sin recortar) | 200 `{ data: {...medicamento, stockActual } }`; `stockActual` excluye lotes con fecha de vencimiento hoy o anterior; 404 `Código de barras no registrado`; 500. No filtra medicamentos inactivos. |
| GET | `/api/catalogos/medicamentos/lookup-fda/:codigoBarras` | ADMIN | `:codigoBarras` GTIN/EAN/UPC (se reduce a dígitos) | Siempre 200 (salvo 401/403): `{ found: true, ndcConsultado, nombreGenerico, nombreComercial, presentacion, concentracion, unidadMedida, categoriaSugerida }` o `{ found: false }` (también ante errores). Consulta `https://api.fda.gov/drug/label.json` con hasta 3 formatos de NDC y 5 s por intento. |
| POST | `/api/catalogos/medicamentos` | ADMIN | `nombreGenerico` texto mín. 2; `nombreComercial` texto opcional/nulo; `presentacion` texto mín. 1; `concentracion` texto opcional/nulo; `unidadMedida` texto mín. 1; `categoriaId` UUID; `stockMinimo` entero ≥ 0 opcional (def. 10). Fuera del esquema: `forzarCreacion` (solo cuenta si es `true`). | 201 `{ data }`; 200 `{ advertencia: true, mensaje, similares }` si hay posibles duplicados (nombre genérico que contiene el texto + misma presentación + misma concentración) y no se envió `forzarCreacion`; 400 datos inválidos; 400 `La categoría especificada no existe`; 500. |
| PUT | `/api/catalogos/medicamentos/:id` | ADMIN | `:id` medicamento; Los mismos campos del alta más `activo` (booleano), todos opcionales; los campos desconocidos se descartan. Se aplican solo los campos de la lista editable que cambian. | 200 `{ data }`; 200 `{ data, mensaje: 'No hubo cambios que aplicar' }`; 400 datos inválidos (p. ej. tipo incorrecto); 404; 400 categoría inexistente; 500. |
| POST | `/api/catalogos/medicamentos/:id/codigos` | ADMIN | `:id` medicamento; `codigo` texto no vacío; se recorta antes de comprobar duplicados; `descripcion` opcional sin validar. | 201 `{ data }`; 400; 404 medicamento; 409 `Este código de barras ya está registrado en otro medicamento`; 500. No comprueba que el medicamento esté activo. |
| DELETE | `/api/catalogos/codigos/:id` | ADMIN | `:id` código | 200 `{ mensaje }`; 404; 500. Borrado físico. |
| GET | `/api/catalogos/categorias` | Ambos | query `incluirInactivos` (`'true'`) | 200 `{ data }` (por defecto solo activas), orden por nombre; 500. |
| POST | `/api/catalogos/categorias` | ADMIN | `nombre` texto no vacío; `descripcion` opcional. | 201 `{ data }`; 400; 409 `Ya existe una categoría con ese nombre` (comparación exacta con el valor sin recortar); 500. |
| PUT | `/api/catalogos/categorias/:id` | ADMIN | `:id` categoría; Todos opcionales: `nombre` texto recortado mín. 1, `descripcion` texto o nulo, `activo` booleano. | 200 `{ data }`; 400 `{ error: <primer mensaje>, detalles }`; 404; 409 nombre duplicado (restricción única); 500. |
| GET | `/api/catalogos/ubicaciones` | Ambos | — | 200 `{ data }` todas (el modelo no tiene `activo`), orden por código; 500. |
| POST | `/api/catalogos/ubicaciones` | ADMIN | `codigo` texto no vacío; `descripcion` opcional. | 201 `{ data }`; 400; 409 `Ya existe una ubicación con ese código` (valor sin recortar); 500. |
| PUT | `/api/catalogos/ubicaciones/:id` | ADMIN | `:id` ubicación; `codigo`, si viene, debe ser texto no vacío (se recorta); `descripcion` sin validar tipo. | 200 `{ data }`; 404; 400 código vacío o no texto; 409 código duplicado (restricción única); 500 (p. ej. `descripcion` no texto). |
| POST | `/api/catalogos/medicamentos/:id/imagen` | ADMIN | `:id` medicamento; `multipart/form-data`, archivo `imagen`. | 200 `{ data }` con `imagenUrl`; 400 sin archivo; 400 tipo no permitido; 400 `El archivo supera el tamaño máximo permitido` (\> 5 MB); 400 `El archivo no es una imagen válida`; 404 medicamento; 500. |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 206 presenta los endpoints del módulo de inventario y entradas.

Tabla 206.
Endpoints de inventario y entradas

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| POST | `/api/inventario/entradas` | Ambos | `observaciones` texto recortado opcional/nulo; `lotes` arreglo mín. 1 de: `medicamentoId` UUID, `cantidad` entero \> 0, `numeroLote` texto recortado no vacío, `fechaVencimiento` texto que empiece con `YYYY-MM-DD`, `costoUnitario` número ≥ 0 opcional/nulo, `ubicacionId` UUID opcional/nulo. Cada `fechaVencimiento` debe ser posterior a hoy. | 201 entrada con lotes; 400 datos inválidos; 400 `Lote n (<lote>): La fecha de vencimiento ya pasó o es hoy; …`; 400 medicamento inexistente o inactivo; 400 ubicación inexistente; 500. Todo en una transacción. |
| GET | `/api/inventario/entradas` | Ambos | Query: `page` (def. 1), `pageSize` (1–100, def. 20) | 200 `{ data, pagination }` con usuario y número de lotes; 500. |
| GET | `/api/inventario` | Ambos | Query: `q`, `categoriaId`, `soloStockBajo` (`'true'`), `page`, `pageSize` (1–100) | 200 `{ data, pagination }` por medicamento activo: stock dispensable, número de lotes, próximo vencimiento, semáforo, `stockBajo`. Paginación en memoria. Solo carga lotes `DISPONIBLE` con stock. 500. |
| GET | `/api/inventario/alertas` | Ambos | — | 200 `{ data: { stockBajo, porVencer, vencidos, resumen } }`; 500. |
| GET | `/api/inventario/medicamento/:id` | Ambos | `:id` medicamento | 200 `{ data }` con todos los lotes (cualquier estado), semáforo y días para vencer; 404; 500. |
| PUT | `/api/inventario/lotes/:id/baja` | ADMIN | `:id` lote; `motivo` (opcional; se usa, recortado, solo si es texto). | 200 `{ data }`; 404; 409 `El lote ya fue dado de baja`; 500. Se permite dar de baja lotes en cualquier otro estado. |
| GET | `/api/inventario/configuracion` | Ambos | — | 200 `{ data: { rojo, amarillo } }` (30/90 si no hay valor válido); 500. Lo consume la pantalla de Dispensación. |
| PUT | `/api/inventario/configuracion` | ADMIN | `rojo` y `amarillo` enteros \> 0; además `rojo < amarillo`. | 200 `{ data: { rojo, amarillo } }`; 400 datos inválidos; 400 si `rojo >= amarillo`; 500. |
| POST | `/api/inventario/importar-excel` | ADMIN | `multipart/form-data`, archivo `archivo` (.xlsx de hasta 10 MB con las 11 columnas de la plantilla en la primera fila). | 200 `{ data: { totalFilas, medicamentosCreados, medicamentosExistentes, categoriasCreadas, ubicacionesCreadas, codigosBarrasVinculados, lotesRegistrados, lotesOmitidos, errores[], avisos[], avisosGenerales[] } }`; 400 sin archivo, archivo no .xlsx válido, sin filas de datos o columnas faltantes; 400 `El archivo supera el tamaño máximo permitido` (\> 10 MB). Una transacción por fila. Los errores de cada fila se informan en el resumen. |
| GET | `/api/inventario/plantilla-excel` | ADMIN | — | 200 archivo `plantilla-importacion-medicamentos.xlsx` (hojas "Plantilla" e "Instrucciones"). |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 207 presenta los endpoints del módulo de dispensación y beneficiarios.

Tabla 207.
Endpoints de dispensación y beneficiarios

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/dispensacion/beneficiarios/buscar` | Ambos | Query: `q`. Vacío → 50 más recientes; solo dígitos → DPI que empieza con `q` (máx. 20); si no → nombre que contiene `q` (máx. 20). Solo activos. | 200 `{ data }`; 500. |
| POST | `/api/dispensacion/beneficiarios` | Ambos | `nombreCompleto` texto de mín. 3 caracteres tras recortar; `dpi`, `telefono`, `direccion`, `observaciones`, si vienen y no son nulos, deben ser texto; `dpi` (si viene) exactamente 13 dígitos. | 201 beneficiario; 400 nombre, tipo o DPI inválido; 409 `Ya existe un beneficiario con DPI …`; 500. |
| GET | `/api/dispensacion/beneficiarios/:id` | Ambos | `:id` | 200 beneficiario con todas sus dispensaciones (usuario, fotos con `imagenUrl`, detalle con snapshots); 404 `Beneficiario no encontrado`; 500. |
| PUT | `/api/dispensacion/beneficiarios/:id` | Ambos | `:id`; `nombreCompleto` (si viene, texto mín. 3); los demás, si vienen y no son nulos, texto; `dpi` (si viene no vacío) 13 dígitos. No permite cambiar `activo`. | 200 beneficiario; 400; 404; 409 DPI duplicado; 500. |
| POST | `/api/dispensacion/despachar` | Ambos | `beneficiarioId` texto no vacío; `items` arreglo no vacío; cada ítem con `medicamentoId` texto no vacío y `cantidad` de tipo número, entera y \> 0; `observaciones` opcional sin validar. | 201 `{ dispensacion, stockActualizado }`; 400 `beneficiarioId es requerido` o `Cada ítem debe tener medicamentoId (texto) y cantidad entera mayor a 0`; 404 `Beneficiario no encontrado o inactivo` / `Medicamento no encontrado o inactivo: <id>`; 409 `Stock insuficiente para <nombre>. Solicitado: n, Disponible: m`; 409 `No se pudo completar la dispensación por un conflicto de concurrencia. Intente de nuevo.` tras 3 intentos fallidos por conflicto de serialización; 500. Transacción `Serializable` con `SELECT … FOR UPDATE` FIFO por `fecha_vencimiento`; excluye lotes con `fecha_vencimiento <= hoy` (fecha local enviada como texto `AAAA-MM-DD`). |
| GET | `/api/dispensacion/historial` | Ambos | Query: `fechaDesde`, `fechaHasta`, `beneficiarioId`, `page` (def. 1), `limit` (def. 20, máx. 100) | 200 `{ data, pagination }` de todas las dispensaciones; 400 fecha inválida o rango invertido; 500. |
| GET | `/api/dispensacion/stock/:medicamentoId` | Ambos | `:medicamentoId` | 200 `{ stockTotal, vencimientoProximo, lotes }`; solo lotes `DISPONIBLE` con cantidad \> 0 y fecha de vencimiento posterior a hoy; 200 con `stockTotal: 0` si el id no existe; 500. |
| POST | `/api/dispensacion/:id/generar-token` | Ambos | `:id` dispensación | 200 `{ token, url: '/captura/<token>', expiraEn }` (reutiliza el vigente o crea/reemplaza uno; token de 11 caracteres con `randomBytes(8)` en base64url); 404 `Dispensación no encontrada`; 409 `La evidencia de esta dispensación ya está completa; no se pueden reemplazar las fotos` si ya tiene RECETA y EVIDENCIA_ENTREGA; 500. |
| GET | `/api/dispensacion/:id/fotos` | Ambos | `:id` dispensación | 200 `{ data: [{ id, tipo, imagenUrl, createdAt }] }` (vacío si no existe); 500. |
| GET | `/api/dispensacion/:id/foto/:tipo` | Ambos | `:id` dispensación; `:tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`} | 200 binario de la imagen con `Content-Type` según la extensión (`image/webp`) y `Cache-Control: private, no-store`; 400 `Tipo de foto inválido`; 404 `Foto no encontrada` (sin registro, archivo inexistente o ruta fuera de la carpeta); 500. |
| GET | `/api/dispensacion/:id` | Ambos | `:id` dispensación | 200 dispensación con beneficiario, usuario, fotos y detalle (lote y medicamento); 404 `Dispensación no encontrada`; 500. |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 208 presenta los endpoints del módulo de captura de evidencia (pública).

Tabla 208.
Endpoints de captura de evidencia (pública)

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/captura/:token/info` | Público | `:token` | 200 `{ dispensacionId, beneficiario, fecha, expiraEn, fotosSubidas }`; 404 `Enlace inválido o expirado` si el token no existe, ya se usó o venció (mismo mensaje en los tres casos; también ante cualquier otro error). |
| POST | `/api/captura/:token/foto` | Público | `:token`; `multipart/form-data`: archivo `foto` y campo `tipo` ∈ {`RECETA`, `EVIDENCIA_ENTREGA`}. | 200 `{ success: true, dispensacionId, fotosSubidas, completo }`; 400 archivo no JPG/PNG/WEBP; 400 `El archivo supera el tamaño máximo permitido` (\> 5 MB); 400 sin archivo; 400 tipo inválido; 404 token inválido, usado o vencido (se comprueba antes de procesar la imagen); 400 `El archivo no es una imagen válida`; 500 `Error interno del servidor`. |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 209 presenta los endpoints del módulo de reportes.

Tabla 209.
Endpoints de reportes

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/reportes/dispensaciones` | Ambos | Query: `desde`, `hasta`, `beneficiarioId`, `medicamentoId`, `page`, `limit` | 200 `{ data, pagination }`; 400 fecha; 500. |
| GET | `/api/reportes/consumo-medicamentos` | Ambos | Query: `desde`, `hasta`, `categoriaId`, `page`, `limit` | 200 `{ data, pagination }` ranking por cantidad dispensada; 400 fecha; 500. |
| GET | `/api/reportes/inventario-actual` | Ambos | Query: `categoriaId`, `estado` (valor de `EstadoLote`), `page`, `limit` | 200 `{ data, pagination }` a nivel de lote; 400 `Estado inválido. Use: …`; 500. |
| GET | `/api/reportes/por-vencer` | Ambos | Query: `dias` (entero \> 0, def. 90; no numérico → 90), `page`, `limit` | 200 `{ data, pagination, umbralDias }`; 500. |
| GET | `/api/reportes/entradas` | Ambos | Query: `desde`, `hasta`, `page`, `limit` | 200 `{ data, pagination }` con totales de lotes, unidades y costo; 400 fecha; 500. |
| GET | `/api/reportes/medicamentos-baja` | Ambos | Query: `desde`, `hasta` (sobre `fecha_vencimiento`), `page`, `limit` | 200 `{ data, pagination, resumen: { totalUnidadesPerdidas, costoTotalEstimado } }` (lotes `VENCIDO` y `DADO_DE_BAJA`); 400 fecha; 500. |
| GET | `/api/reportes/exportar/:tipo/:formato` | ADMIN | `:tipo` ∈ {`dispensaciones`, `consumo`, `inventario`, `por-vencer`, `entradas`, `baja`}; `:formato` ∈ {`pdf`, `xlsx`}; query: los filtros del reporte correspondiente (se ignoran `page` y `limit`) | 200 archivo (`application/pdf` o `.xlsx`, `Content-Disposition: attachment; filename="<tipo>-<timestamp>.<ext>"`); 400 tipo o formato inválido; 400 fecha inválida; 400 `El reporte tiene n registros y el máximo exportable es 5000. Reduzca el rango de fechas o aplique más filtros.`; 500. |

Fuente: Elaboración propia con base en el código de la API.

La Tabla 210 presenta los endpoints del módulo de auditoría.

Tabla 210.
Endpoints de auditoría

| Método | Ruta | Roles | Parámetros y cuerpo | Respuestas |
|--------|------|-------|---------------------|------------|
| GET | `/api/auditoria` | ADMIN | Query: `page` (def. 1), `limit` (def. 50, máx. 100), `usuario` (id), `accion`, `entidad`, `desde`, `hasta`. `accion` se valida contra el enum `AccionAuditoria`; `entidad` se compara sin distinguir mayúsculas; las fechas se validan. | 200 `{ data, pagination }` con `usuario { username, nombreCompleto }`, orden `createdAt` desc; 400 `accion inválida. Use: …`; 400 fecha inválida o rango invertido; 500. |

Fuente: Elaboración propia con base en el código de la API.
