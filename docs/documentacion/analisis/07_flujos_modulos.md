# 07 — Flujos por módulo

> Fase: Extracción (parte 3 de 4). Documento de hechos con fuente; no es texto final de la tesis.
> Fecha de extracción: 2026-09-25. Rama: `docs/documentacion`.
> Reglas citadas: `06_reglas_negocio.md`. Endpoints: `04_api.md`. Permisos: `05_seguridad_roles.md`.

## Convenciones

- **Actores:** **ADMIN** (rol `ADMIN`), **ENCARGADO** (rol `ENCARGADO_BENEFICENCIA`), **Sistema**
  (proceso automático), **Celular** (la persona que toma las fotos desde el teléfono, sin sesión).
  Según R-09, en la operación real una sola persona usa una cuenta ADMIN para todo; según R-07 y
  R-08, el ENCARGADO debería tener acceso a reportes y a todas las dispensaciones.
- Cada paso: **U** = acción del usuario, **S** = respuesta del sistema, con el endpoint entre
  corchetes.
- Rutas abreviadas como en `06_reglas_negocio.md` (`rt/`, `svc/`, `pg/`, `cmp/`).
- El frontend llama a la API con el prefijo `/api` (frontend/src/api/client.ts, línea 4).

---

## 1. Autenticación

1. **Actores:** ADMIN, ENCARGADO.
2. **Pantallas:** `/login` → pg/Login.tsx; menú lateral con "Cerrar sesión" →
   cmp/layout/Layout.tsx, líneas 112 y 235–253.
3. **Flujo principal (iniciar sesión):**
   1. U: abre el sistema sin sesión. S: `ProtectedRoute` redirige a `/login` (frontend/src/App.tsx, líneas 24–40).
   2. U: escribe usuario y contraseña y pulsa "Iniciar sesión".
   3. S: [`POST /api/auth/login`] busca el usuario, verifica que esté activo y compara la contraseña con bcrypt; actualiza `ultimo_acceso`, firma un JWT `{ userId, username, rol }` y registra `LOGIN` (rt/auth.routes.ts, líneas 13–75).
   4. S: el frontend guarda token y usuario en `localStorage`, muestra "Bienvenido al sistema" y navega a `/` (frontend/src/context/AuthContext.tsx, líneas 39–48; pg/Login.tsx, líneas 20–34).
   5. S: el menú se filtra por rol (Layout.tsx, líneas 42–59 y 97–100).
   - **Cerrar sesión:** U: pulsa "Cerrar sesión". S: se borra `localStorage` en el navegador; no se llama al backend ni se registra `LOGOUT` (AuthContext.tsx, líneas 50–55; H-10).
4. **Flujos alternos y de error:**
   - Campos vacíos (petición directa) → 400 "Usuario y contraseña son requeridos". En la interfaz ambos campos son `required`.
   - Usuario inexistente, inactivo o contraseña incorrecta → 401 "Credenciales inválidas" (mismo mensaje). Ver H-32 sobre la recarga de la página.
   - Token vencido o inválido en cualquier petición posterior → 401 "Token inválido o expirado"; el frontend borra la sesión y redirige a `/login` (client.ts, líneas 20–30).
   - Usuario ya autenticado que abre `/login` → redirección a `/` (Login.tsx, líneas 16–18).
5. **Precondiciones:** cuenta existente y activa. **Postcondiciones:** `usuarios.ultimo_acceso` actualizado; JWT válido por el tiempo de `JWT_EXPIRES_IN` (8 h por defecto, 05 §1.5).
6. **Reglas:** RN-56, RN-57, RN-61.
7. **Tablas y auditoría:** escribe `usuarios` (`ultimo_acceso`); lee `usuarios`. Auditoría: `LOGIN` / entidad `usuario`. Los intentos fallidos no se registran (H-09).

## 2. Usuarios

1. **Actores:** ADMIN.
2. **Pantalla:** `/usuarios` → pg/Usuarios.tsx (ruta envuelta en `AdminRoute`, App.tsx, línea 80).
3. **Flujo principal (crear usuario):**
   1. U: entra a Usuarios. S: [`GET /api/usuarios`] lista todos los usuarios (activos e inactivos) con rol, estado y último acceso (rt/usuarios.routes.ts, líneas 11–31).
   2. U: pulsa "Nuevo usuario", llena usuario, nombre completo, email, contraseña y rol (por defecto "Encargado de Beneficencia") y guarda.
   3. S: el frontend verifica contraseña ≥ 6 caracteres; [`POST /api/usuarios`] valida campos requeridos y unicidad del nombre de usuario, guarda la contraseña con bcrypt (costo 12) y registra `CREAR` (rt/usuarios.routes.ts, líneas 34–78). Muestra "Usuario creado" y recarga la lista.
   - **Editar:** U: pulsa el lápiz, cambia nombre, email o rol (el usuario no se puede cambiar). S: [`PUT /api/usuarios/:id`] valida el rol y la regla de no quitarse el rol propio; registra `EDITAR` con valores anteriores y nuevos (líneas 121–168). "Usuario actualizado".
   - **Restablecer contraseña:** U: pulsa la llave e ingresa la nueva contraseña. S: [`PUT /api/usuarios/:id/password`] exige 6 caracteres, guarda el hash y registra `EDITAR` con `password: '***restablecida***'` (líneas 172–205). "Contraseña actualizada".
   - **Activar/desactivar:** U: pulsa el botón de encendido. S: [`PUT /api/usuarios/:id/toggle`] invierte `activo` y registra `ACTIVAR` o `DESACTIVAR` (líneas 81–117). "Usuario desactivado" / "Usuario activado".
4. **Flujos alternos y de error:** nombre de usuario repetido → 409 "El nombre de usuario ya existe"; faltan campos → 400 "Campos requeridos: username, password, nombreCompleto, rol"; contraseña corta → F "La contraseña debe tener al menos 6 caracteres"; rol inválido → 400 "Rol inválido"; quitarse el rol ADMIN → 400 "No puede cambiar su propio rol de administrador"; desactivarse a sí mismo → 400 "No puede desactivar su propia cuenta"; usuario inexistente → 404 "Usuario no encontrado"; usuario no ADMIN → 403 "No tiene permisos para esta acción" (y el frontend lo redirige a `/`). Errores genéricos: "No se pudo guardar el usuario", "No se pudo cambiar el estado", "No se pudo actualizar la contraseña", "No se pudieron cargar los usuarios".
5. **Precondiciones:** sesión ADMIN. **Postcondiciones:** fila nueva o modificada en `usuarios`; un usuario desactivado no puede volver a iniciar sesión, aunque su token vigente sigue funcionando hasta expirar (H-10).
6. **Reglas:** RN-58, RN-59, RN-60, RN-61.
7. **Tablas y auditoría:** `usuarios` (L/E). Auditoría: `CREAR`, `EDITAR`, `ACTIVAR`, `DESACTIVAR` / entidad `usuario`.

## 3. Catálogos

1. **Actores:** ADMIN (escritura); ADMIN y ENCARGADO (lectura).
2. **Pantallas:** `/catalogos` con pestañas `?tab=medicamentos|categorias|ubicaciones` →
   pg/Catalogos/index.tsx, líneas 9–13; pg/Catalogos/Medicamentos.tsx; pg/Catalogos/Categorias.tsx;
   pg/Catalogos/Ubicaciones.tsx; formulario compartido cmp/MedicamentoFormModal.tsx. Las rutas
   antiguas `/medicamentos`, `/categorias`, `/ubicaciones` redirigen (App.tsx, líneas 68–70).
3. **Flujo principal:**
   - **3a. Registrar medicamento** (se inicia desde Registrar entrada, ver módulo 4, paso 3):
     1. U: pulsa "Nuevo medicamento" (solo ADMIN). S: abre el formulario vacío con stock mínimo 10.
     2. U (opcional): escanea o escribe un código de barras y pulsa Enter. S: [`GET /api/catalogos/medicamentos/barcode/:codigo`]; si existe muestra "Este medicamento ya está registrado: <nombre>"; si no, [`GET /api/catalogos/medicamentos/lookup-fda/:codigo`] y, si hay datos, llena el formulario y muestra "Datos sugeridos por OpenFDA — verifique antes de guardar" (MedicamentoFormModal.tsx, líneas 73–112). El código escaneado **no** se vincula al medicamento.
     3. U: completa nombre genérico, presentación, unidad, categoría (y opcionales) y guarda. S: [`POST /api/catalogos/medicamentos`] valida con Zod, comprueba la categoría y busca duplicados (rt/catalogos.routes.ts, líneas 225–292).
     4. S: si no hay similares, crea el medicamento, registra `CREAR` y muestra "Medicamento creado".
   - **3b. Editar / activar / desactivar medicamento:** U: busca en la pestaña Medicamentos [`GET /api/catalogos/medicamentos?page&limit=20&q`] y pulsa el lápiz. S: abre el formulario con los datos y la foto. U: cambia campos y guarda. S: [`PUT /api/catalogos/medicamentos/:id`] aplica solo los campos que cambiaron y registra `EDITAR` (líneas 295–362). El botón de encendido envía `{ activo: !activo }` al mismo endpoint.
   - **3c. Foto del medicamento:** U: en el formulario de edición pulsa "Subir foto". S: [`POST /api/catalogos/medicamentos/:id/imagen`] guarda el archivo, reemplaza el anterior y registra `EDITAR` (`imagenUrl`) (líneas 643–700).
   - **3d. Códigos de barras:** U: pulsa el contador de códigos de un medicamento. S: muestra el modal con los códigos. U (ADMIN): escanea con la pistola (el modal captura las teclas aunque el campo no tenga foco) o escribe, opcionalmente describe, y pulsa "Agregar". S: [`POST /api/catalogos/medicamentos/:id/codigos`] verifica unicidad y registra `CREAR` / `codigo_barras`. Eliminar: [`DELETE /api/catalogos/codigos/:id`], borrado físico y `ELIMINAR` (Medicamentos.tsx, líneas 87–157; rt/catalogos.routes.ts, líneas 369–438).
   - **3e. Categorías:** U: "Nueva categoría" / lápiz / encendido. S: [`GET /api/catalogos/categorias`] (solo activas), [`POST /api/catalogos/categorias`], [`PUT /api/catalogos/categorias/:id`] con `CREAR` / `EDITAR` (líneas 445–528).
   - **3f. Ubicaciones:** U: "Nueva ubicación" / lápiz. S: [`GET /api/catalogos/ubicaciones`], [`POST /api/catalogos/ubicaciones`], [`PUT /api/catalogos/ubicaciones/:id`] con `CREAR` / `EDITAR` (líneas 535–618). No hay activar/desactivar.
4. **Flujos alternos y de error:**
   - Posibles duplicados → respuesta 200 con `advertencia`; el frontend abre "Posibles duplicados" con el mensaje "Se encontraron medicamentos similares. Revisa antes de continuar o confirma el registro." y la lista. "Revisar de nuevo" cierra la advertencia; "Crear de todos modos" repite el `POST` con `forzarCreacion: true` (MedicamentoFormModal.tsx, líneas 139–172 y 277–307).
   - Categoría inexistente → 400 "La categoría especificada no existe"; datos inválidos → 400 "Datos inválidos"; sin categoría en el formulario → F "Seleccione una categoría".
   - OpenFDA sin datos → F "No se encontraron datos en OpenFDA para este código. Complete el formulario manualmente."; error de red → F "No se pudo consultar OpenFDA".
   - Código de barras vacío → F "Escanee o escriba un código de barras" / B 400 "El código de barras es requerido"; ya registrado → 409 "Este código de barras ya está registrado en otro medicamento".
   - Categoría o ubicación repetida al crear → 409 "Ya existe una categoría con ese nombre" / "Ya existe una ubicación con ese código"; vacía → 400 "El nombre de la categoría es requerido" / "El código de ubicación es requerido".
   - Imagen sin archivo → 400 "Debe adjuntar una imagen en el campo \"imagen\""; formato no permitido → 500 (H-12).
   - Sin cambios al editar → 200 "No hubo cambios que aplicar".
   - Un medicamento o categoría desactivado desaparece de la lista y no puede reactivarse desde la interfaz (H-26).
   - ENCARGADO: ve las pestañas sin botones de edición; una escritura directa recibe 403.
5. **Precondiciones:** sesión (ADMIN para escribir); para crear un medicamento debe existir al menos una categoría activa. **Postcondiciones:** filas nuevas o modificadas en `medicamentos`, `categorias`, `ubicaciones`, `codigos_barras`; archivo en `backend/uploads/medicamentos/`.
6. **Reglas:** RN-27, RN-43 a RN-51, RN-63, RN-64.
7. **Tablas y auditoría:** `medicamentos`, `categorias`, `ubicaciones`, `codigos_barras` (L/E); lectura de `lotes` en la búsqueda por código. Auditoría: `CREAR`/`EDITAR` `medicamento`; `CREAR`/`ELIMINAR` `codigo_barras`; `CREAR`/`EDITAR` `categoria`; `CREAR`/`EDITAR` `ubicacion`. La consulta a OpenFDA no se audita.

## 4. Entradas

1. **Actores:** ADMIN y ENCARGADO (registro manual); solo ADMIN (importación por Excel y "Nuevo medicamento").
2. **Pantalla:** `/entradas` → pg/Entradas.tsx.
3. **Flujo principal (registrar entrada manual):**
   1. U: entra a "Registrar entrada". S: [`GET /api/catalogos/medicamentos`], [`GET /api/catalogos/categorias`], [`GET /api/catalogos/ubicaciones`] y [`GET /api/inventario/entradas`] para el historial (Entradas.tsx, líneas 72–81). La lista de medicamentos trae solo los primeros 20 (H-24).
   2. U: por cada lote escanea el código de barras y pulsa Enter, o elige el medicamento en la lista. S: [`GET /api/catalogos/medicamentos/barcode/:codigo`] selecciona el medicamento y muestra "<nombre> seleccionado" (líneas 97–113).
   3. U (ADMIN, si el medicamento no existe): pulsa "Nuevo medicamento" junto al lote. S: flujo 3a del módulo Catálogos; al guardar, el nuevo medicamento queda seleccionado en ese lote (líneas 85–89 y 436–442).
   4. U: indica número de lote, cantidad, fecha de vencimiento, ubicación y costo unitario (opcionales los dos últimos); puede "Agregar lote" o quitar lotes; escribe observaciones opcionales y pulsa "Registrar entrada".
   5. S: el frontend verifica campos obligatorios y cantidad > 0; [`POST /api/inventario/entradas`] valida con Zod, comprueba que los medicamentos existan y estén activos y que las ubicaciones existan, y en una transacción crea la entrada y sus lotes en `DISPONIBLE` con `cantidadActual = cantidad`; registra `CREAR` / `entrada` (rt/inventario.routes.ts, líneas 50–128).
   6. S: muestra "Entrada registrada", limpia el formulario y recarga "Entradas recientes".
   - **Importar desde Excel (ADMIN):**
     1. U: pulsa "Importar desde Excel" y "Descargar plantilla Excel". S: [`GET /api/inventario/plantilla-excel`] devuelve el `.xlsx` con la hoja "Plantilla" (encabezados y fila de ejemplo) y la hoja "Instrucciones" (rt/inventario.routes.ts, líneas 943–1001).
     2. U: completa la plantilla, la selecciona y pulsa "Importar". S: [`POST /api/inventario/importar-excel`] valida archivo y columnas, valida todas las filas en memoria y procesa las válidas una por una, cada una en su transacción: busca o crea categoría y ubicación, busca o crea el medicamento, vincula el código de barras si está libre, crea una entrada y un lote (líneas 692–937).
     3. S: muestra el resumen (filas leídas, lotes registrados, medicamentos nuevos, filas con error, existentes, categorías y ubicaciones nuevas, códigos vinculados), la lista "Errores por fila" y "Avisos" (Entradas.tsx, líneas 383–431).
4. **Flujos alternos y de error:**
   - Código de barras no registrado → F "No se encontró medicamento con ese código de barras".
   - Campos incompletos → F "Complete medicamento, cantidad, número de lote y vencimiento en cada lote"; cantidad ≤ 0 → F "La cantidad debe ser mayor a 0".
   - Medicamento inactivo o inexistente → 400 "Uno o más medicamentos no existen o están inactivos"; ubicación inexistente → 400 "Una o más ubicaciones no existen"; formato inválido → 400 "Datos inválidos".
   - Importación: sin archivo → F "Seleccione un archivo .xlsx" / B "Debe adjuntar un archivo .xlsx en el campo \"archivo\""; archivo dañado → "El archivo no es un Excel (.xlsx) válido"; sin filas → "El archivo no contiene filas de datos"; columnas faltantes → "Faltan columnas en el Excel: <lista>. Descargue la plantilla actualizada."; filas con error → se listan con su número y se omiten, el resto se importa (toasts "<n> lote(s) importado(s) correctamente" y "<n> fila(s) con errores"); código de barras de otro medicamento → aviso "El código de barras \"<código>\" ya pertenece a otro medicamento; no se vinculó".
   - Fecha de vencimiento ya pasada → se acepta (H-34).
   - Plantilla no descargada → F "No se pudo descargar la plantilla".
5. **Precondiciones:** sesión; medicamentos activos en el catálogo (o ADMIN para crearlos). **Postcondiciones:** una fila en `entradas` y N en `lotes` en estado `DISPONIBLE`; el stock dispensable aumenta. En la importación, una entrada por fila válida y posibles filas nuevas en `categorias`, `ubicaciones`, `medicamentos` y `codigos_barras`.
6. **Reglas:** RN-01, RN-08, RN-52 a RN-55.
7. **Tablas y auditoría:** `entradas`, `lotes` (E); `medicamentos`, `ubicaciones` (L); en la importación además `categorias`, `ubicaciones`, `medicamentos`, `codigos_barras` (E). Auditoría: `CREAR` / `entrada` (una por entrada); en la importación también `CREAR` / `medicamento`, `categoria`, `ubicacion` por cada entidad creada. La vinculación de códigos de barras en la importación no se audita (D-18).

## 5. Inventario

1. **Actores:** ADMIN y ENCARGADO (consulta); ADMIN (baja de lotes y umbrales); Sistema (vencimiento diario).
2. **Pantalla:** `/inventario` → pg/Inventario.tsx (tabla + modal de detalle + diálogo de confirmación).
3. **Flujo principal (consultar inventario y dar de baja un lote):**
   1. U: entra a Inventario, escribe un texto o marca "Solo stock bajo". S: [`GET /api/inventario?q&soloStockBajo`] devuelve por medicamento activo el stock dispensable, número de lotes, próximo vencimiento, semáforo y bandera de stock bajo (rt/inventario.routes.ts, líneas 167–241). La interfaz muestra solo la primera página de 20 (H-25).
   2. U: pulsa "Detalle". S: [`GET /api/inventario/medicamento/:id`] devuelve todos los lotes (cualquier estado) con días para vencer, semáforo, estado y ubicación (líneas 357–417).
   3. U (ADMIN): pulsa "Dar de baja" en un lote. S: pide confirmación ("¿Seguro que deseas dar de baja el lote <número>? …").
   4. U: confirma. S: [`PUT /api/inventario/lotes/:id/baja`] cambia el estado a `DADO_DE_BAJA` y registra `BAJA` con estado y cantidad anteriores (líneas 423–466); muestra "Lote dado de baja" y recarga el detalle y la tabla.
   - **Configurar umbrales (solo API, sin pantalla — H-22):** [`GET /api/inventario/configuracion`] / [`PUT /api/inventario/configuracion`] con `{ rojo, amarillo }`; registra `EDITAR` / `configuracion` (líneas 472–546).
   - **Vencimiento automático (Sistema):** cada día a las 00:05 hora del servidor (UTC, H-02) los lotes `DISPONIBLE` con fecha pasada pasan a `VENCIDO` y se borran los tokens de captura vencidos (svc/vencimiento.service.ts, líneas 9–47).
4. **Flujos alternos y de error:** error de carga → F "No se pudo cargar el inventario" / "No se pudo cargar el detalle"; lote inexistente → 404 "Lote no encontrado"; lote ya dado de baja → 409 "El lote ya fue dado de baja"; no ADMIN → 403 "No tiene permisos para esta acción" (el botón no se muestra); umbrales con rojo ≥ amarillo → 400 "El umbral rojo debe ser menor que el amarillo". Medicamento sin lotes dispensables → semáforo "Sin stock". Si falla el cron de lotes, igual se intenta la limpieza de tokens (solo se escribe en consola).
5. **Precondiciones:** sesión. **Postcondiciones (baja):** `lotes.estado = DADO_DE_BAJA`; el lote deja de contar como stock y aparece en el reporte "Dados de baja". **Postcondiciones (cron):** lotes vencidos en `VENCIDO`; tokens vencidos eliminados.
6. **Reglas:** RN-02, RN-04 a RN-07, RN-22 a RN-25, RN-28.
7. **Tablas y auditoría:** `medicamentos`, `categorias`, `lotes`, `ubicaciones`, `entradas`, `codigos_barras`, `configuracion_sistema` (L); `lotes` y `configuracion_sistema` (E). Auditoría: `BAJA` / `lote`; `EDITAR` / `configuracion`. El cambio a `VENCIDO` del cron no se audita (D-18).

## 6. Dispensación

1. **Actores:** ADMIN y ENCARGADO.
2. **Pantalla:** `/dispensacion` → pg/Dispensacion.tsx (pasos 1 Beneficiario, 2 Medicamentos, 3 Confirmar; modal de confirmación; modal "Nuevo beneficiario"; pantalla de éxito).
3. **Flujo principal:**
   1. U: escribe al menos 2 caracteres del nombre o DPI. S: [`GET /api/dispensacion/beneficiarios/buscar?q`] muestra coincidencias (Dispensacion.tsx, líneas 234–254).
   2. U: elige al beneficiario. S: [`GET /api/dispensacion/beneficiarios/:id`] muestra sus 5 últimas dispensaciones y pone el foco en el campo de código de barras (líneas 256–268 y 666–685).
   3. U: escanea un código de barras o busca por nombre. S: [`GET /api/catalogos/medicamentos/barcode/:codigo`] o [`GET /api/catalogos/medicamentos/buscar?q`]; al elegir el medicamento, [`GET /api/dispensacion/stock/:medicamentoId`] y lo agrega a la lista con cantidad 1, stock disponible y semáforo del próximo vencimiento (líneas 274–343).
   4. U: ajusta cantidades (1 a stock) o quita medicamentos; escribe observaciones opcionales; pulsa "Confirmar dispensación". S: muestra el modal de confirmación con el resumen.
   5. U: pulsa "Dispensar". S: [`POST /api/dispensacion/despachar`] valida, abre una transacción `Serializable`, por cada ítem bloquea los lotes con `SELECT … FOR UPDATE` en orden de vencimiento, verifica stock, descuenta FIFO (pasando a `AGOTADO` los lotes que llegan a 0), crea la dispensación con sus detalles y *snapshots*, y registra `DISPENSAR` (rt/dispensacion.routes.ts, líneas 133–180; svc/dispensacion.service.ts, líneas 151–274).
   6. S: muestra "Dispensación registrada correctamente" y la pantalla de éxito; continúa con el módulo 8 (Captura de evidencia).
   7. U: pulsa "Siguiente dispensación" / "Nueva dispensación". S: reinicia el formulario (líneas 423–435).
4. **Flujos alternos y de error:**
   - Beneficiario no encontrado en la búsqueda → F "No se encontraron resultados"; U puede pulsar "Nuevo" y registrarlo en el momento (módulo 7, flujo desde Dispensación); al guardar queda seleccionado (líneas 937–945).
   - Código no registrado → F "No se encontró medicamento con ese código de barras"; sin resultados por nombre → F "No se encontraron medicamentos".
   - Medicamento repetido → F "Este medicamento ya está en la lista"; sin stock → F "<nombre> no tiene stock disponible".
   - Sin beneficiario o sin medicamentos → aviso "Seleccione un beneficiario para continuar" / "Agregue al menos un medicamento" y botón deshabilitado.
   - Stock insuficiente al confirmar (p. ej. otra dispensación simultánea tomó las unidades) → 409 "Stock insuficiente para <nombre>. Solicitado: <n>, Disponible: <m>"; no se registra nada.
   - Beneficiario inactivo o inexistente → 404 "Beneficiario no encontrado o inactivo"; medicamento inactivo → 404 "Medicamento no encontrado o inactivo: <id>".
   - Otros errores → F "Error al registrar dispensación" o el mensaje del backend (en 500 incluye el mensaje interno, H-13).
5. **Precondiciones:** sesión; beneficiario activo; medicamentos activos con stock dispensable. **Postcondiciones:** una fila en `dispensaciones`, una o más en `detalle_dispensaciones` (una por lote usado); `lotes.cantidad_actual` reducida y, si llega a 0, `estado = AGOTADO`.
6. **Reglas:** RN-03, RN-09 a RN-19, RN-21, RN-26.
7. **Tablas y auditoría:** `beneficiarios`, `medicamentos`, `lotes`, `codigos_barras` (L); `lotes`, `dispensaciones`, `detalle_dispensaciones` (E). Auditoría: `DISPENSAR` / `Dispensacion` con beneficiario, ítems y observaciones. El paso a `AGOTADO` queda implícito en ese registro (D-18).

## 7. Beneficiarios

1. **Actores:** ADMIN y ENCARGADO.
2. **Pantallas:** `/beneficiarios` → pg/Beneficiarios.tsx (listado, detalle con historial, modal crear/editar); modal rápido en pg/Dispensacion.tsx, líneas 954–1026.
3. **Flujo principal (registrar y consultar):**
   1. U: entra a Beneficiarios. S: [`GET /api/dispensacion/beneficiarios/buscar?q=`] lista los 50 activos más recientes (Beneficiarios.tsx, líneas 52–72).
   2. U: escribe nombre o DPI (≥ 2 caracteres). S: misma ruta con `q`, hasta 20 resultados.
   3. U: pulsa "Nuevo beneficiario", llena nombre (obligatorio), DPI, teléfono, dirección y observaciones, y pulsa "Registrar". S: el frontend valida nombre y DPI; [`POST /api/dispensacion/beneficiarios`] valida, comprueba DPI único, crea y registra `CREAR` / `Beneficiario` (rt/dispensacion.routes.ts, líneas 35–71). "Beneficiario registrado".
   4. U: pulsa "Ver detalle". S: [`GET /api/dispensacion/beneficiarios/:id`] muestra datos e historial completo: fecha y hora, quién atendió, medicamentos (desde *snapshots*), observaciones, estado de evidencia y miniaturas de las fotos, que se amplían al pulsarlas (Beneficiarios.tsx, líneas 80–224).
   - **Editar:** U: pulsa el lápiz, cambia datos y guarda. S: [`PUT /api/dispensacion/beneficiarios/:id`] valida, comprueba DPI único si cambió y registra `EDITAR` con datos anteriores y nuevos (líneas 86–126). "Beneficiario actualizado".
4. **Flujos alternos y de error:** nombre < 3 caracteres → "El nombre debe tener al menos 3 caracteres"; DPI ≠ 13 dígitos → "El DPI debe tener exactamente 13 dígitos"; DPI repetido → 409 "Ya existe un beneficiario con DPI <dpi>"; beneficiario inexistente → 404 "Beneficiario no encontrado"; sin resultados → "No se encontraron resultados"; lista vacía → "No hay beneficiarios registrados"; sin dispensaciones → "No hay dispensaciones registradas"; errores genéricos "Error al guardar", "Error al cargar detalle", "Error al buscar beneficiarios". No existe desactivar ni eliminar (H-29).
5. **Precondiciones:** sesión. **Postcondiciones:** fila nueva o modificada en `beneficiarios`.
6. **Reglas:** RN-30 a RN-34, RN-42, RN-65.
7. **Tablas y auditoría:** `beneficiarios` (L/E); `dispensaciones`, `detalle_dispensaciones`, `usuarios`, `fotos_dispensacion` (L). Auditoría: `CREAR` / `EDITAR` entidad `Beneficiario`.

## 8. Captura de evidencia

1. **Actores:** ADMIN o ENCARGADO (en la computadora); Celular (misma persona, sin sesión).
2. **Pantallas:** pantalla de éxito de pg/Dispensacion.tsx (pestañas "QR Celular" y "Subir desde PC", líneas 441–583); `/captura/:token` → pg/Captura.tsx (pública, fuera del `Layout`, App.tsx, línea 49).
3. **Flujo principal (QR con el celular):**
   1. S: tras registrar la dispensación, [`POST /api/dispensacion/:id/generar-token`] crea o reutiliza el token (30 min) y registra `CREAR` / `TokenCaptura`; muestra el QR con la URL `<origen>/captura/<token>` (usa `VITE_LAN_IP` si se accedió por `localhost`) (Dispensacion.tsx, líneas 389–396 y 446–457).
   2. S: cada 3 s consulta [`GET /api/dispensacion/:id/fotos`] y actualiza "Foto de receta" / "Foto de entrega": pendiente/recibida (líneas 405–421).
   3. U (celular): escanea el QR. S: [`GET /api/captura/:token/info`] muestra beneficiario y fecha, y dos botones "Tomar foto de RECETA" / "Tomar foto de ENTREGA" (Captura.tsx, líneas 39–117).
   4. U: toma la foto (abre la cámara trasera), revisa la vista previa y pulsa "Subir" (o "Repetir"). S: [`POST /api/captura/:token/foto`] con `tipo`; guarda el archivo, crea o reemplaza el registro de foto y, si ya están las dos, marca el token como usado (rt/captura.routes.ts, líneas 50–87; svc/dispensacion.service.ts, líneas 482–530). El celular muestra "Receta subida" / "Entrega subida" y, al completar, "Todo listo — Puede cerrar esta página."
   5. S (escritorio): al detectar las dos fotos muestra "Evidencia completa" y el botón "Siguiente dispensación".
4. **Flujos alternos y de error:**
   - **Subir desde PC:** U elige la pestaña "Subir desde PC" y selecciona los archivos de receta y entrega; se usa el mismo endpoint público con el mismo token (Dispensacion.tsx, líneas 98–175 y 531–560). Mensajes: "Foto de receta subida" / "No se pudo subir la foto de receta".
   - **Omitir fotos:** U pulsa "Omitir fotos"; se detiene la consulta periódica; la dispensación queda sin evidencia (líneas 571–580).
   - No se pudo generar el token → F "No se pudo generar el código QR para las fotos"; la dispensación ya está registrada.
   - Token inexistente, vencido o ya usado → 404 "Enlace inválido o expirado"; el celular muestra "Enlace inválido o expirado — Pida a la encargada que genere un código QR nuevo desde la computadora."
   - Tipo inválido → 400 "Tipo inválido. Use RECETA o EVIDENCIA_ENTREGA"; sin archivo → 400 "Debe adjuntar una imagen en el campo \"foto\""; formato o tamaño no permitido → 500 (H-12). En el celular: el mensaje recibido o "No se pudo subir la foto. Intente de nuevo."
   - El QR no es accesible si la URL usa `localhost` y no está configurada `VITE_LAN_IP` (CLAUDE.md, "Prueba pendiente con celular real"; P-04).
5. **Precondiciones:** dispensación registrada; token vigente; celular en la misma red. **Postcondiciones:** hasta dos filas en `fotos_dispensacion` (una por tipo); archivos en `backend/uploads/dispensaciones/<id>/`; `tokens_captura.usado = true` al completar.
6. **Reglas:** RN-18, RN-35 a RN-42.
7. **Tablas y auditoría:** `dispensaciones`, `tokens_captura`, `fotos_dispensacion` (L/E). Auditoría: solo `CREAR` / `TokenCaptura` al generar el token; las subidas de fotos y la marca `usado` no se auditan (D-18, H-14).

## 9. Reportes

1. **Actores:** ADMIN (pantalla y exportación). ENCARGADO: el backend le permite las consultas pero no la pantalla (H-20, R-07).
2. **Pantalla:** `/reportes` → pg/Reportes.tsx (6 pestañas: Dispensaciones, Consumo por medicamento, Inventario actual, Por vencer, Entradas, Dados de baja).
3. **Flujo principal:**
   1. U: entra a Reportes y elige una pestaña. S: carga la primera página (20 filas) del reporte (Reportes.tsx, líneas 180–250):
      - Dispensaciones [`GET /api/reportes/dispensaciones`] — filtros desde/hasta, beneficiario (buscador), medicamento (buscador).
      - Consumo [`GET /api/reportes/consumo-medicamentos`] — desde/hasta, categoría.
      - Inventario actual [`GET /api/reportes/inventario-actual`] — categoría, estado.
      - Por vencer [`GET /api/reportes/por-vencer`] — días (por defecto 90).
      - Entradas [`GET /api/reportes/entradas`] — desde/hasta.
      - Dados de baja [`GET /api/reportes/medicamentos-baja`] — desde/hasta sobre la fecha de vencimiento; incluye resumen de unidades y costo perdidos.
   2. U: ajusta filtros y pagina. S: recarga con los filtros; la fecha "hasta" se envía como fin del día (`T23:59:59.999`).
   3. U: pulsa "Exportar PDF" o "Exportar Excel". S: [`GET /api/reportes/exportar/:tipo/:formato`] con los filtros actuales genera el archivo (hasta 5000 registros; PDF con encabezado institucional, "Filtros aplicados" y paginación), registra `CREAR` / `reporte` y lo descarga; muestra "Reporte exportado" (rt/reportes.routes.ts, líneas 377–441; Reportes.tsx, líneas 269–303).
4. **Flujos alternos y de error:** sin datos → "Sin resultados" en pantalla y "Sin registros para los filtros aplicados." en el PDF (backend/src/utils/pdf.ts, línea 171); error → "No se pudo cargar el reporte"; estado inválido → 400 "Estado inválido. Use: …"; tipo o formato inválido → 400; usuario no ADMIN → redirección a `/` en el frontend y 403 en la exportación.
5. **Precondiciones:** sesión ADMIN (en la interfaz). **Postcondiciones:** solo lectura; en la exportación, un registro de auditoría.
6. **Reglas:** RN-21, RN-66, RN-67, RN-68.
7. **Tablas y auditoría:** lectura de `dispensaciones`, `detalle_dispensaciones`, `beneficiarios`, `usuarios`, `medicamentos`, `categorias`, `codigos_barras`, `lotes`, `ubicaciones`, `entradas`, `configuracion_sistema`. Auditoría: `CREAR` / `reporte` por exportación (con tipo, formato y filtros).

## 10. Auditoría

1. **Actores:** ADMIN.
2. **Pantalla:** `/auditoria` → pg/Auditoria.tsx (tabla con fila expandible).
3. **Flujo principal:**
   1. U: entra a Auditoría. S: [`GET /api/usuarios`] para el filtro de usuario y [`GET /api/auditoria?page&limit=20`] ordenado del más reciente al más antiguo (rt/auditoria.routes.ts, líneas 9–63; Auditoria.tsx, líneas 76–104).
   2. U: filtra por usuario, acción, entidad y rango de fechas. S: recarga con los filtros (el "hasta" como fin del día).
   3. U: expande una fila. S: muestra `datosAnteriores` y `datosNuevos` en JSON.
4. **Flujos alternos y de error:** error → "No se pudo cargar la auditoría" / "No se pudieron cargar los usuarios"; no ADMIN → 403 y redirección a `/`. El filtro de entidad no ofrece `TokenCaptura` ni `reporte` (H-30).
5. **Precondiciones:** sesión ADMIN. **Postcondiciones:** ninguna (solo lectura).
6. **Reglas:** RN-69, RN-70.
7. **Tablas y auditoría:** lectura de `log_auditoria` y `usuarios`. La consulta no se audita.

## 11. Dashboard

1. **Actores:** ADMIN y ENCARGADO.
2. **Pantalla:** `/` → pg/Dashboard.tsx.
3. **Flujo principal:**
   1. U: inicia sesión o pulsa "Dashboard". S: [`GET /api/inventario/alertas`] y [`GET /api/inventario/entradas`] (Dashboard.tsx, líneas 33–43).
   2. S: muestra saludo y fecha; banner "Todo en orden. No hay alertas de inventario que requieran atención." o "<n> asuntos requieren tu atención hoy." con el desglose (líneas 72–91).
   3. S: "Acciones rápidas" (Dispensar medicamento, Registrar entrada); "Resumen" (Medicamentos, Stock bajo, Por vencer, Dispensaciones hoy); "Requiere atención" con hasta 8 elementos por panel (Stock bajo, Próximos a vencer, Vencidos sin baja); "Entradas recientes" (6) (líneas 94–165).
   4. U: pulsa una tarjeta o enlace. S: navega a `/dispensacion`, `/entradas`, `/inventario` o `/catalogos`.
4. **Flujos alternos y de error:** si falla una de las consultas, esa parte queda vacía sin mensaje de error (líneas 35–36); paneles vacíos: "Todo el stock está por encima del mínimo", "No hay lotes próximos a vencer", "No hay lotes vencidos pendientes de baja", "No hay entradas registradas todavía". "Dispensaciones hoy" cuenta desde la medianoche del servidor (UTC, H-02) y de todos los usuarios.
5. **Precondiciones:** sesión. **Postcondiciones:** ninguna.
6. **Reglas:** RN-28, RN-29.
7. **Tablas y auditoría:** lectura de `configuracion_sistema`, `medicamentos`, `lotes`, `dispensaciones`, `beneficiarios`, `entradas`, `usuarios`. Sin auditoría.

---

## 12. Máquinas de estado

### 12.1 Lote (`EstadoLote`)

Estados: `DISPONIBLE`, `AGOTADO`, `VENCIDO`, `DADO_DE_BAJA` (schema, líneas 118–123). Estado inicial:
`DISPONIBLE`. Estado final: `DADO_DE_BAJA` (no tiene transiciones de salida).

| # | Estado origen | Evento | Estado destino | Quién lo dispara | Fuente |
|---|---------------|--------|----------------|------------------|--------|
| 1 | (inicio) | Registro de entrada o fila válida de importación Excel | `DISPONIBLE` | ADMIN o ENCARGADO (entrada); ADMIN (Excel) | rt/inventario.routes.ts, líneas 90–101 y 836–847 |
| 2 | `DISPONIBLE` | Dispensación que deja `cantidadActual > 0` | `DISPONIBLE` | ADMIN o ENCARGADO | svc/dispensacion.service.ts, líneas 225–231 |
| 3 | `DISPONIBLE` | Dispensación que deja `cantidadActual = 0` | `AGOTADO` | ADMIN o ENCARGADO | svc/dispensacion.service.ts, líneas 225–231 |
| 4 | `DISPONIBLE` | Ejecución diaria del cron con `fechaVencimiento < hoy` | `VENCIDO` | Sistema (00:05 hora del servidor) | svc/vencimiento.service.ts, líneas 9–26 |
| 5 | `DISPONIBLE` | Baja de lote | `DADO_DE_BAJA` | ADMIN | rt/inventario.routes.ts, líneas 423–466 |
| 6 | `AGOTADO` | Baja de lote | `DADO_DE_BAJA` | ADMIN | ídem (solo se rechaza el estado `DADO_DE_BAJA`) |
| 7 | `VENCIDO` | Baja de lote | `DADO_DE_BAJA` | ADMIN | ídem |
| 8 | `DADO_DE_BAJA` | Baja de lote | (rechazado: 409 "El lote ya fue dado de baja") | ADMIN | rt/inventario.routes.ts, líneas 440–443 |

Notas: no existen transiciones `AGOTADO → DISPONIBLE` (no hay devoluciones, RN-20) ni `VENCIDO →
DISPONIBLE`. Un lote `AGOTADO` cuya fecha pase no cambia a `VENCIDO` (el cron solo toma
`DISPONIBLE`). Entre la fecha de vencimiento y la ejecución del cron, un lote vencido sigue
`DISPONIBLE` (H-01, H-02). El **semáforo** no es un estado persistido: se calcula en cada consulta
(RN-24).

### 12.2 Token de captura (`TokenCaptura`)

El modelo guarda `token`, `usado` y `expiraEn`, con una sola fila por dispensación (schema, líneas
209–216). Los estados son derivados:

- **Vigente:** `usado = false` y `expiraEn > ahora`.
- **Vencido:** `usado = false` y `expiraEn ≤ ahora`.
- **Usado:** `usado = true`.
- **Eliminado:** la fila fue borrada por el cron.

| # | Estado origen | Evento | Estado destino | Quién lo dispara | Fuente |
|---|---------------|--------|----------------|------------------|--------|
| 1 | (no existe) | `POST /dispensacion/:id/generar-token` | Vigente (expira en 30 min) | Frontend, automáticamente tras dispensar (usuario autenticado) | svc/dispensacion.service.ts, líneas 387–423; pg/Dispensacion.tsx, líneas 389–396 |
| 2 | Vigente | `generar-token` de nuevo | Vigente (mismo token, sin cambios) | Usuario autenticado | svc/dispensacion.service.ts, líneas 401–407 |
| 3 | Vigente | Subida de una foto sin completar las dos | Vigente | Celular o "Subir desde PC" | svc/dispensacion.service.ts, líneas 482–530 |
| 4 | Vigente | Subida que completa `RECETA` + `EVIDENCIA_ENTREGA` | Usado | Celular o "Subir desde PC" | svc/dispensacion.service.ts, líneas 520–527 |
| 5 | Vigente | Pasan 30 minutos | Vencido | Tiempo (se evalúa en cada petición) | svc/dispensacion.service.ts, línea 454 |
| 6 | Vencido o Usado | `generar-token` | Vigente (token nuevo en la misma fila, `usado = false`) | Usuario autenticado | svc/dispensacion.service.ts, líneas 409–416 (ver H-14) |
| 7 | Vigente, Vencido o Usado con `expiraEn < ahora` | Ejecución diaria del cron | Eliminado | Sistema | svc/vencimiento.service.ts, líneas 37–46; svc/dispensacion.service.ts, líneas 533–538 |
| 8 | Vencido, Usado o inexistente | `GET /captura/:token/info` o `POST /captura/:token/foto` | (rechazado: 404 "Enlace inválido o expirado") | Celular | rt/captura.routes.ts, líneas 38–47 y 75–78 |

### 12.3 Usuario (`activo`)

Estados: **Activo** (`activo = true`, valor por defecto) e **Inactivo** (`activo = false`)
(schema, línea 26). No hay estado de eliminado.

| # | Estado origen | Evento | Estado destino | Quién lo dispara | Fuente |
|---|---------------|--------|----------------|------------------|--------|
| 1 | (inicio) | `POST /api/usuarios` (o creación del `admin` por el *seed*) | Activo | ADMIN (o Sistema en el *seed*) | rt/usuarios.routes.ts, líneas 34–78; backend/prisma/seed.ts, líneas 12–27 |
| 2 | Activo | `PUT /api/usuarios/:id/toggle` | Inactivo | ADMIN, sobre otra cuenta | rt/usuarios.routes.ts, líneas 81–117 |
| 3 | Inactivo | `PUT /api/usuarios/:id/toggle` | Activo | ADMIN | ídem |
| 4 | Activo | `toggle` sobre la propia cuenta | (rechazado: 400 "No puede desactivar su propia cuenta") | ADMIN | rt/usuarios.routes.ts, líneas 91–94 |
| 5 | Inactivo | `POST /api/auth/login` | Inactivo (rechazado: 401 "Credenciales inválidas") | Usuario | rt/auth.routes.ts, líneas 26–29 |

Nota: la desactivación no invalida el token ya emitido; el usuario desactivado conserva el acceso
hasta que el token expire (H-10). Cada transición 2 y 3 registra `DESACTIVAR` o `ACTIVAR`.
