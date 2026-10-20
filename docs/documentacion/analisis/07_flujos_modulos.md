# 07 — Flujos por módulo

> Actualizado al commit bdf1187 el 2026-10-20 (extracción original: 194f8fb, 2026-09-25).

> Fase: Extracción (parte 3 de 4). Documento de hechos con fuente; no es texto final de la tesis.
> Rama: `docs/documentacion`. El código de `bdf1187` no cambia hasta `64d9e1c`.
> Reglas citadas: `06_reglas_negocio.md`. Endpoints: `04_api.md`. Permisos: `05_seguridad_roles.md`.
> Deducido de la lectura del código; no se ejecutaron los flujos en navegador para esta actualización.

## Convenciones

- **Actores:** **ADMIN** (rol `ADMIN`), **ENCARGADO** (rol `ENCARGADO_BENEFICENCIA`), **Sistema**
  (proceso automático), **Celular** (la persona que toma las fotos desde el teléfono, sin sesión).
  Según R-09, en la operación real una sola persona usa una cuenta ADMIN para todo; según R-07 y
  R-08, el ENCARGADO debería tener acceso a reportes y a todas las dispensaciones.
- Cada paso: **U** = acción del usuario, **S** = respuesta del sistema, con el endpoint entre
  corchetes.
- Rutas abreviadas como en `06_reglas_negocio.md` (`rt/`, `svc/`, `mw/`, `ut/`, `pg/`, `cmp/`).
- El frontend llama a la API con el prefijo `/api` (frontend/src/api/client.ts, línea 4).
- Los casos de uso de `08_casos_uso_candidatos.md` que corresponden a cada módulo se indican junto
  al título.

---

## 1. Autenticación (CU-01)

1. **Actores:** ADMIN, ENCARGADO.
2. **Pantallas:** `/login` → pg/Login.tsx; menú lateral con "Cerrar sesión" →
   cmp/layout/Layout.tsx, líneas 112 y 235–253.
3. **Flujo principal (iniciar sesión):**
   1. U: abre el sistema sin sesión. S: `ProtectedRoute` redirige a `/login` (frontend/src/App.tsx, líneas 24–40).
   2. U: escribe usuario y contraseña y pulsa "Iniciar sesión".
   3. S: [`POST /api/auth/login`] cuenta la solicitud para el límite por IP; valida que usuario y contraseña sean texto no vacío; comprueba que la combinación usuario + IP no esté bloqueada; busca el usuario, verifica que esté activo y compara la contraseña con bcrypt (rt/auth.routes.ts, líneas 56–105).
   4. S: con credenciales correctas reinicia el contador de fallos, actualiza `ultimo_acceso`, firma un JWT `{ userId, username, rol }` y registra `LOGIN` (líneas 107–143).
   5. S: el frontend guarda token y usuario en `localStorage`, muestra "Bienvenido al sistema" y navega a `/` (frontend/src/context/AuthContext.tsx, líneas 68–77; pg/Login.tsx, líneas 20–34).
   6. S: el menú se filtra por rol (Layout.tsx, líneas 42–59 y 97–100).
   - **Recarga o reapertura con sesión guardada:** S: el frontend usa la copia local para pintar y confirma usuario y rol con [`GET /api/auth/perfil`]; si el token ya no sirve, el interceptor limpia la sesión (AuthContext.tsx, líneas 28–66; RN-73).
   - **Cerrar sesión:** U: pulsa "Cerrar sesión". S: se borra `localStorage` en el navegador; no se llama al backend ni se registra `LOGOUT` (AuthContext.tsx, líneas 79–84; H-10).
4. **Flujos alternos y de error:**
   - Campos vacíos o de otro tipo (petición directa) → 400 "Usuario y contraseña son requeridos". En la interfaz ambos campos son `required`.
   - Usuario inexistente, inactivo o contraseña incorrecta → 401 "Credenciales inválidas" (mismo mensaje) con `intentosRestantes`; si el usuario existe, se audita `LOGIN` con `exito: false` (rt/auth.routes.ts, líneas 23–53). La página ya no se recarga (client.ts, líneas 26–28; H-32 resuelto). La pantalla muestra solo el texto del error, no los intentos restantes (H-47).
   - Tercer fallo de la misma combinación usuario + IP → 429 "Demasiados intentos fallidos. Intente de nuevo en <n> minuto(s)." y bloqueo de 5 minutos; durante el bloqueo no se verifican credenciales (líneas 42–48 y 81–90; RN-72).
   - Más de 20 solicitudes de login desde la misma IP en 10 minutos → 429 "Demasiadas solicitudes de inicio de sesión desde esta red. Intente de nuevo más tarde." (líneas 58–69).
   - Token vencido o inválido en cualquier petición posterior → 401 "Token inválido o expirado"; cuenta desactivada → 401 "La cuenta ya no está activa. Inicie sesión nuevamente."; en ambos casos el frontend borra la sesión y redirige a `/login` (mw/auth.ts, líneas 21–60; client.ts, líneas 23–35).
   - Usuario ya autenticado que abre `/login` → redirección a `/` (Login.tsx, líneas 16–18).
5. **Precondiciones:** cuenta existente y activa; combinación usuario + IP no bloqueada. **Postcondiciones:** `usuarios.ultimo_acceso` actualizado; JWT válido por el tiempo de `JWT_EXPIRES_IN` (8 h por defecto, 05 §1.5) mientras la cuenta siga activa.
6. **Reglas:** RN-56, RN-57, RN-61, RN-72, RN-73.
7. **Tablas y auditoría:** escribe `usuarios` (`ultimo_acceso`); lee `usuarios`. Auditoría: `LOGIN` / entidad `usuario`, tanto el éxito como los fallos de usuarios existentes. Los contadores de intentos viven en memoria del proceso de la API (mw/loginRateLimit.ts, líneas 13–14; mw/ipRateLimit.ts, líneas 20–22).

## 2. Usuarios (CU-02)

1. **Actores:** ADMIN.
2. **Pantalla:** `/usuarios` → pg/Usuarios.tsx (ruta envuelta en `AdminRoute`, App.tsx, línea 80).
3. **Flujo principal (crear usuario):**
   1. U: entra a Usuarios. S: [`GET /api/usuarios`] lista todos los usuarios (activos e inactivos) con rol, estado y último acceso (rt/usuarios.routes.ts, líneas 9–30).
   2. U: pulsa "Nuevo usuario", llena usuario, nombre completo, email, contraseña y rol (por defecto "Encargado de Beneficencia") y guarda.
   3. S: el frontend verifica contraseña ≥ 6 caracteres; [`POST /api/usuarios`] valida campos requeridos, tipos, rol y contraseña ≥ 6, comprueba la unicidad del nombre de usuario, guarda la contraseña con bcrypt (costo 12) y registra `CREAR` (rt/usuarios.routes.ts, líneas 32–94). Muestra "Usuario creado" y recarga la lista.
   - **Editar:** U: pulsa el lápiz, cambia nombre, email o rol (el usuario no se puede cambiar). S: [`PUT /api/usuarios/:id`] valida el rol y la regla de no quitarse el rol propio; registra `EDITAR` con valores anteriores y nuevos (líneas 135–184). "Usuario actualizado". El nuevo rol rige desde la siguiente petición del usuario editado (RN-73).
   - **Restablecer contraseña:** U: pulsa la llave e ingresa la nueva contraseña. S: [`PUT /api/usuarios/:id/password`] exige 6 caracteres, guarda el hash y registra `EDITAR` con `password: '***restablecida***'` (líneas 186–221). "Contraseña actualizada".
   - **Activar/desactivar:** U: pulsa el botón de encendido. S: [`PUT /api/usuarios/:id/toggle`] invierte `activo` y registra `ACTIVAR` o `DESACTIVAR` (líneas 96–133). "Usuario desactivado" / "Usuario activado".
4. **Flujos alternos y de error:** nombre de usuario repetido → 409 "El nombre de usuario ya existe"; faltan campos → 400 "Campos requeridos: username, password, nombreCompleto, rol"; tipos incorrectos → 400 "username y nombreCompleto deben ser texto"; contraseña corta → F y B "La contraseña debe tener al menos 6 caracteres"; rol inválido → 400 "Rol inválido"; correo repetido → 500 "Error interno del servidor" (H-15); quitarse el rol ADMIN → 400 "No puede cambiar su propio rol de administrador"; desactivarse a sí mismo → 400 "No puede desactivar su propia cuenta"; usuario inexistente → 404 "Usuario no encontrado"; usuario no ADMIN → 403 "No tiene permisos para esta acción" (y el frontend lo redirige a `/`). Errores genéricos: "No se pudo guardar el usuario", "No se pudo cambiar el estado", "No se pudo actualizar la contraseña", "No se pudieron cargar los usuarios".
5. **Precondiciones:** sesión ADMIN. **Postcondiciones:** fila nueva o modificada en `usuarios`; un usuario desactivado no puede volver a iniciar sesión y su token deja de servir en la siguiente petición (mw/auth.ts, líneas 39–55).
6. **Reglas:** RN-58, RN-59, RN-60, RN-61, RN-73.
7. **Tablas y auditoría:** `usuarios` (L/E). Auditoría: `CREAR`, `EDITAR`, `ACTIVAR`, `DESACTIVAR` / entidad `usuario`.

## 3. Catálogos (CU-03 a CU-06)

1. **Actores:** ADMIN (escritura); ADMIN y ENCARGADO (lectura).
2. **Pantallas:** `/catalogos` con pestañas `?tab=medicamentos|categorias|ubicaciones` →
   pg/Catalogos/index.tsx, líneas 9–13; pg/Catalogos/Medicamentos.tsx; pg/Catalogos/Categorias.tsx;
   pg/Catalogos/Ubicaciones.tsx; formulario compartido cmp/MedicamentoFormModal.tsx. Las rutas
   antiguas `/medicamentos`, `/categorias`, `/ubicaciones` redirigen (App.tsx, líneas 68–70).
3. **Flujo principal:**
   - **3a. Registrar medicamento (CU-03)** (se inicia desde Registrar entrada, ver módulo 4, paso 3):
     1. U: pulsa "Nuevo medicamento" (solo ADMIN). S: abre el formulario vacío con stock mínimo 10.
     2. U (opcional): escanea o escribe un código de barras y pulsa Enter. S: [`GET /api/catalogos/medicamentos/barcode/:codigo`]; si existe muestra "Este medicamento ya está registrado: <nombre>"; si no, [`GET /api/catalogos/medicamentos/lookup-fda/:codigo`] (solo ADMIN) y, si hay datos, llena el formulario y muestra "Datos sugeridos por OpenFDA — verifique antes de guardar" (MedicamentoFormModal.tsx, líneas 73–112; rt/catalogos.routes.ts, líneas 162–216). El código escaneado **no** se vincula al medicamento.
     3. U: completa nombre genérico, presentación, unidad, categoría (y opcionales) y guarda. S: [`POST /api/catalogos/medicamentos`] valida con Zod, comprueba la categoría y busca duplicados (rt/catalogos.routes.ts, líneas 228–268).
     4. S: si no hay similares, crea el medicamento, registra `CREAR` y muestra "Medicamento creado" (líneas 270–292).
   - **3b. Editar / activar / desactivar medicamento (CU-03):** U: busca en la pestaña Medicamentos [`GET /api/catalogos/medicamentos?page&limit=20&q&incluirInactivos=true`] (activos e inactivos) y pulsa el lápiz. S: abre el formulario con los datos y la foto. U: cambia campos y guarda. S: [`PUT /api/catalogos/medicamentos/:id`] valida los tipos con Zod, aplica solo los campos que cambiaron y registra `EDITAR` (líneas 299–375; pg/Catalogos/Medicamentos.tsx, línea 47). El botón de encendido envía `{ activo: !activo }` al mismo endpoint; un medicamento desactivado sigue en la lista y se puede reactivar.
   - **3c. Foto del medicamento (CU-03):** U: en el formulario de edición pulsa "Subir foto". S: [`POST /api/catalogos/medicamentos/:id/imagen`] valida formato y tamaño, recodifica la imagen a WebP (1000 px), reemplaza el archivo anterior y registra `EDITAR` (`imagenUrl`) (líneas 651–737).
   - **3d. Códigos de barras (CU-04):** U: pulsa el contador de códigos de un medicamento. S: muestra el modal con los códigos. U (ADMIN): escanea con la pistola (el modal captura las teclas aunque el campo no tenga foco) o escribe, opcionalmente describe, y pulsa "Agregar". S: [`POST /api/catalogos/medicamentos/:id/codigos`] recorta el código, verifica unicidad y registra `CREAR` / `codigo_barras`. Eliminar: [`DELETE /api/catalogos/codigos/:id`], borrado físico y `ELIMINAR` (Medicamentos.tsx, líneas 87–157; rt/catalogos.routes.ts, líneas 381–456).
   - **3e. Categorías (CU-05):** U: "Nueva categoría" / lápiz / encendido. S: [`GET /api/catalogos/categorias?incluirInactivos=true`] (activas e inactivas), [`POST /api/catalogos/categorias`], [`PUT /api/catalogos/categorias/:id`] (Zod: nombre no vacío) con `CREAR` / `EDITAR` (líneas 462–556; pg/Catalogos/Categorias.tsx, línea 26).
   - **3f. Ubicaciones (CU-06):** U: "Nueva ubicación" / lápiz. S: [`GET /api/catalogos/ubicaciones`], [`POST /api/catalogos/ubicaciones`], [`PUT /api/catalogos/ubicaciones/:id`] (código no vacío) con `CREAR` / `EDITAR` (líneas 562–649). No hay activar/desactivar.
4. **Flujos alternos y de error:**
   - Posibles duplicados → respuesta 200 con `advertencia`; el frontend abre "Posibles duplicados" con el mensaje "Se encontraron medicamentos similares. Revisa antes de continuar o confirma el registro." y la lista. "Revisar de nuevo" cierra la advertencia; "Crear de todos modos" repite el `POST` con `forzarCreacion: true` (MedicamentoFormModal.tsx, líneas 139–172 y 277–307).
   - Categoría inexistente → 400 "La categoría especificada no existe"; datos inválidos (alta o edición) → 400 "Datos inválidos"; sin categoría en el formulario → F "Seleccione una categoría".
   - OpenFDA sin datos → F "No se encontraron datos en OpenFDA para este código. Complete el formulario manualmente."; error de red → F "No se pudo consultar OpenFDA"; usuario no ADMIN → 403.
   - Código de barras vacío → F "Escanee o escriba un código de barras" / B 400 "El código de barras es requerido"; ya registrado → 409 "Este código de barras ya está registrado en otro medicamento".
   - Categoría o ubicación repetida al crear → 409 "Ya existe una categoría con ese nombre" / "Ya existe una ubicación con ese código" (con espacios extremos: 500, H-42); al editar → 409 "Ya existe un registro con el mismo <campo>"; vacía → 400 "El nombre de la categoría es requerido" / "El código de ubicación es requerido" (alta) o "… no puede quedar vacío" (edición).
   - Imagen sin archivo → 400 "Debe adjuntar una imagen en el campo \"imagen\""; formato no permitido → 400 "Formato de imagen no permitido. Use JPG, PNG o WEBP"; más de 5 MB → 400 "El archivo supera el tamaño máximo permitido"; contenido que no es imagen → 400 "El archivo no es una imagen válida".
   - Sin cambios al editar → 200 "No hubo cambios que aplicar".
   - ENCARGADO: ve las pestañas sin botones de edición; una escritura directa recibe 403.
5. **Precondiciones:** sesión (ADMIN para escribir); para crear un medicamento debe existir al menos una categoría activa. **Postcondiciones:** filas nuevas o modificadas en `medicamentos`, `categorias`, `ubicaciones`, `codigos_barras`; archivo WebP en `backend/uploads/medicamentos/`.
6. **Reglas:** RN-27, RN-43 a RN-51, RN-63, RN-64, RN-77.
7. **Tablas y auditoría:** `medicamentos`, `categorias`, `ubicaciones`, `codigos_barras` (L/E); lectura de `lotes` en la búsqueda por código. Auditoría: `CREAR`/`EDITAR` `medicamento`; `CREAR`/`ELIMINAR` `codigo_barras`; `CREAR`/`EDITAR` `categoria`; `CREAR`/`EDITAR` `ubicacion`. La consulta a OpenFDA no se audita.

## 4. Entradas (CU-07, CU-08)

1. **Actores:** ADMIN y ENCARGADO (registro manual); solo ADMIN (importación por Excel y "Nuevo medicamento").
2. **Pantalla:** `/entradas` → pg/Entradas.tsx.
3. **Flujo principal (registrar entrada manual, CU-07):**
   1. U: entra a "Registrar entrada". S: carga **todos** los medicamentos activos recorriendo las páginas de [`GET /api/catalogos/medicamentos`] (100 por petición), además de [`GET /api/catalogos/categorias`], [`GET /api/catalogos/ubicaciones`] y [`GET /api/inventario/entradas`] para el historial (Entradas.tsx, líneas 72–81; frontend/src/api/catalogos.ts, líneas 16–32; H-24 resuelto).
   2. U: por cada lote escanea el código de barras y pulsa Enter, o elige el medicamento en la lista. S: [`GET /api/catalogos/medicamentos/barcode/:codigo`] selecciona el medicamento y muestra "<nombre> seleccionado" (líneas 97–113).
   3. U (ADMIN, si el medicamento no existe): pulsa "Nuevo medicamento" junto al lote. S: flujo 3a del módulo Catálogos; al guardar, el nuevo medicamento queda seleccionado en ese lote (líneas 85–89 y 443–449).
   4. U: indica número de lote, cantidad, fecha de vencimiento, ubicación y costo unitario (opcionales los dos últimos); puede "Agregar lote" o quitar lotes; escribe observaciones opcionales y pulsa "Registrar entrada".
   5. S: el frontend verifica campos obligatorios y cantidad > 0; [`POST /api/inventario/entradas`] valida con Zod, rechaza cualquier lote con fecha de vencimiento hoy o anterior, comprueba que los medicamentos existan y estén activos y que las ubicaciones existan, y en una transacción crea la entrada y sus lotes en `DISPONIBLE` con `cantidadActual = cantidad`; registra `CREAR` / `entrada` (rt/inventario.routes.ts, líneas 56–145).
   6. S: muestra "Entrada registrada", limpia el formulario y recarga "Entradas recientes".
   - **Importar desde Excel (ADMIN, CU-08):**
     1. U: pulsa "Importar desde Excel" y "Descargar plantilla Excel". S: [`GET /api/inventario/plantilla-excel`] devuelve el `.xlsx` con la hoja "Plantilla" (encabezados y fila de ejemplo) y la hoja "Instrucciones" (rt/inventario.routes.ts, líneas 984–1046).
     2. U: completa la plantilla, la selecciona y pulsa "Importar". S: [`POST /api/inventario/importar-excel`] valida archivo y columnas, valida todas las filas en memoria (incluida la fecha posterior a hoy) y procesa las válidas una por una, cada una en su transacción: busca o crea categoría y ubicación, rechaza la fila si la categoría o el medicamento existentes están inactivos, omite la fila si el lote ya existía antes de la importación, busca o crea el medicamento, vincula el código de barras si está libre, crea una entrada y un lote (líneas 686–982).
     3. S: muestra el resumen (filas leídas, lotes registrados, medicamentos nuevos, filas con error, existentes, categorías y ubicaciones nuevas, códigos vinculados, lotes omitidos), la lista "Errores por fila" y "Avisos" (avisos generales y por fila) (Entradas.tsx, líneas 386–438).
4. **Flujos alternos y de error:**
   - Código de barras no registrado → F "No se encontró medicamento con ese código de barras".
   - Campos incompletos → F "Complete medicamento, cantidad, número de lote y vencimiento en cada lote"; cantidad ≤ 0 → F "La cantidad debe ser mayor a 0".
   - Fecha de vencimiento hoy o anterior → 400 "Lote <n> (<número de lote>): La fecha de vencimiento ya pasó o es hoy; no se puede registrar un lote vencido como disponible"; no se registra ningún lote de la entrada (rt/inventario.routes.ts, líneas 64–73).
   - Medicamento inactivo o inexistente → 400 "Uno o más medicamentos no existen o están inactivos"; ubicación inexistente → 400 "Una o más ubicaciones no existen"; formato inválido → 400 "Datos inválidos".
   - Importación: sin archivo → F "Seleccione un archivo .xlsx" / B "Debe adjuntar un archivo .xlsx en el campo \"archivo\""; archivo dañado → "El archivo no es un Excel (.xlsx) válido"; sin filas → "El archivo no contiene filas de datos"; columnas faltantes → "Faltan columnas en el Excel: <lista>. Descargue la plantilla actualizada."; filas con error (incluidas cantidad no entera, fecha imposible o fecha no futura) → se listan con su número y se omiten, el resto se importa (toasts "<n> lote(s) importado(s) correctamente" y "<n> fila(s) con errores"); categoría o medicamento inactivo → error de fila "La categoría \"<x>\" existe pero está inactiva; actívela antes de importar" / "El medicamento \"<x>\" existe pero está inactivo; actívelo antes de importar" (líneas 776–780 y 808–812; ver H-48); lote ya existente → aviso "Ya existe el lote <número> de <medicamento> con vencimiento <fecha>; no se importó…" y toast "<n> lote(s) omitido(s) por ya existir" (líneas 813–828; Entradas.tsx, líneas 189–191); código de barras de otro medicamento → aviso "El código de barras \"<código>\" ya pertenece a otro medicamento; no se vinculó"; códigos de barras guardados como número → un aviso general (líneas 958–964).
   - Plantilla no descargada → F "No se pudo descargar la plantilla".
5. **Precondiciones:** sesión; medicamentos activos en el catálogo (o ADMIN para crearlos); fechas de vencimiento posteriores a hoy. **Postcondiciones:** una fila en `entradas` y N en `lotes` en estado `DISPONIBLE`; el stock dispensable aumenta. En la importación, una entrada por fila importada y posibles filas nuevas en `categorias`, `ubicaciones`, `medicamentos` y `codigos_barras`; las filas omitidas no dejan ningún registro.
6. **Reglas:** RN-01, RN-08, RN-52 a RN-55, RN-71, RN-75.
7. **Tablas y auditoría:** `entradas`, `lotes` (E); `medicamentos`, `ubicaciones` (L); en la importación además `categorias`, `ubicaciones`, `medicamentos`, `codigos_barras` (E). Auditoría: `CREAR` / `entrada` (una por entrada); en la importación también `CREAR` / `medicamento`, `categoria`, `ubicacion` por cada entidad creada. La vinculación de códigos de barras en la importación no se audita (D-18).

## 5. Inventario (CU-09, CU-10, CU-11)

1. **Actores:** ADMIN y ENCARGADO (consulta); ADMIN (baja de lotes y cambio de umbrales); Sistema (vencimiento diario y al arrancar).
2. **Pantalla:** `/inventario` → pg/Inventario.tsx (tabla paginada + modal de detalle + diálogo de confirmación).
3. **Flujo principal (consultar inventario, CU-09, y dar de baja un lote, CU-10):**
   1. U: entra a Inventario, escribe un texto o marca "Solo stock bajo". S: [`GET /api/inventario?q&soloStockBajo&page`] devuelve por medicamento activo el stock dispensable, número de lotes, próximo vencimiento, semáforo y bandera de stock bajo, de 20 en 20 (rt/inventario.routes.ts, líneas 179–262).
   2. U: pasa de página con "Anterior" / "Siguiente". S: recarga la página pedida; al cambiar un filtro vuelve a la primera (Inventario.tsx, líneas 22–50 y 167–190; H-25 resuelto).
   3. U: pulsa "Detalle". S: [`GET /api/inventario/medicamento/:id`] devuelve todos los lotes (cualquier estado) con días para vencer, semáforo, estado y ubicación (líneas 377–441).
   4. U (ADMIN): pulsa "Dar de baja" en un lote. S: pide confirmación ("¿Seguro que deseas dar de baja el lote <número>? …") con el campo "Motivo (opcional)" (Inventario.tsx, líneas 269–295).
   5. U: escribe opcionalmente el motivo y confirma. S: [`PUT /api/inventario/lotes/:id/baja`] cambia el estado a `DADO_DE_BAJA` y registra `BAJA` con estado y cantidad anteriores y el motivo (líneas 443–490); muestra "Lote dado de baja" y recarga el detalle y la tabla.
   - **Configurar umbrales (solo API, sin pantalla — H-22; no es caso de uso, ver `08_casos_uso_candidatos.md`):** [`GET /api/inventario/configuracion`] (ambos roles; lo usa Dispensación) / [`PUT /api/inventario/configuracion`] (ADMIN) con `{ rojo, amarillo }`; registra `EDITAR` / `configuracion` (líneas 492–570).
   - **Vencimiento automático (Sistema, CU-11):** cada día a las 00:05 en la zona del contenedor (`TZ=America/Guatemala`) y una vez al arrancar la API, los lotes `DISPONIBLE` con fecha de vencimiento hoy o anterior pasan a `VENCIDO` y se borran los tokens de captura vencidos (svc/vencimiento.service.ts, líneas 7–50; docker-compose.yml, línea 36).
4. **Flujos alternos y de error:** error de carga → F "No se pudo cargar el inventario" / "No se pudo cargar el detalle"; lote inexistente → 404 "Lote no encontrado"; lote ya dado de baja → 409 "El lote ya fue dado de baja"; no ADMIN → 403 "No tiene permisos para esta acción" (el botón no se muestra); umbrales con rojo ≥ amarillo → 400 "El umbral rojo debe ser menor que el amarillo". Medicamento sin lotes dispensables → semáforo "Sin stock". Si falla el marcado de lotes, igual se intenta la limpieza de tokens (solo se escribe en consola, líneas 23–38).
5. **Precondiciones:** sesión. **Postcondiciones (baja):** `lotes.estado = DADO_DE_BAJA`; el lote deja de contar como stock y aparece en el reporte "Dados de baja"; el motivo, si se escribió, queda en la auditoría. **Postcondiciones (proceso automático):** lotes vencidos en `VENCIDO`; tokens vencidos eliminados.
6. **Reglas:** RN-02, RN-04 a RN-07, RN-22 a RN-25, RN-28, RN-41, RN-71.
7. **Tablas y auditoría:** `medicamentos`, `categorias`, `lotes`, `ubicaciones`, `entradas`, `codigos_barras`, `configuracion_sistema` (L); `lotes` y `configuracion_sistema` (E). Auditoría: `BAJA` / `lote`; `EDITAR` / `configuracion`. El cambio a `VENCIDO` del proceso automático no se audita (D-18).

## 6. Dispensación (CU-15)

1. **Actores:** ADMIN y ENCARGADO.
2. **Pantalla:** `/dispensacion` → pg/Dispensacion.tsx (pasos 1 Beneficiario, 2 Medicamentos, 3 Confirmar; modal de confirmación; modal "Nuevo beneficiario"; pantalla de éxito).
3. **Flujo principal:**
   1. S: al abrir la pantalla, [`GET /api/inventario/configuracion`] para los umbrales del semáforo (30/90 si falla) (Dispensacion.tsx, líneas 247–254).
   2. U: escribe al menos 2 caracteres del nombre o DPI. S: [`GET /api/dispensacion/beneficiarios/buscar?q`] muestra coincidencias (líneas 256–276).
   3. U: elige al beneficiario. S: [`GET /api/dispensacion/beneficiarios/:id`] muestra sus 5 últimas dispensaciones y pone el foco en el campo de código de barras (líneas 278–290 y 688–707).
   4. U: escanea un código de barras o busca por nombre. S: [`GET /api/catalogos/medicamentos/barcode/:codigo`] o [`GET /api/catalogos/medicamentos/buscar?q`]; al elegir el medicamento, [`GET /api/dispensacion/stock/:medicamentoId`] (stock de lotes no vencidos) y lo agrega a la lista con cantidad 1, stock disponible y semáforo del próximo vencimiento con los umbrales configurados (líneas 296–365 y 842).
   5. U: ajusta cantidades (1 a stock) o quita medicamentos; escribe observaciones opcionales; pulsa "Confirmar dispensación". S: muestra el modal de confirmación con el resumen.
   6. U: pulsa "Dispensar". S: [`POST /api/dispensacion/despachar`] valida tipos y cantidades enteras, abre una transacción `Serializable`, por cada ítem bloquea con `SELECT … FOR UPDATE` los lotes `DISPONIBLE`, con stock y **no vencidos**, en orden de vencimiento, verifica stock, descuenta FIFO (pasando a `AGOTADO` los lotes que llegan a 0), crea la dispensación con sus detalles y *snapshots*, y registra `DISPENSAR` (rt/dispensacion.routes.ts, líneas 153–215; svc/dispensacion.service.ts, líneas 155–288).
   7. S: muestra "Dispensación registrada correctamente" y la pantalla de éxito; continúa con el módulo 8 (Captura de evidencia).
   8. U: pulsa "Siguiente dispensación" / "Nueva dispensación". S: reinicia el formulario (líneas 445–457).
4. **Flujos alternos y de error:**
   - Beneficiario no encontrado en la búsqueda → F "No se encontraron resultados"; U puede pulsar "Nuevo" y registrarlo en el momento (módulo 7, flujo desde Dispensación); al guardar queda seleccionado (líneas 959–967).
   - Código no registrado → F "No se encontró medicamento con ese código de barras"; sin resultados por nombre → F "No se encontraron medicamentos".
   - Medicamento repetido → F "Este medicamento ya está en la lista"; sin stock (incluido el caso de que todos sus lotes con stock estén vencidos) → F "<nombre> no tiene stock disponible".
   - Sin beneficiario o sin medicamentos → aviso "Seleccione un beneficiario para continuar" / "Agregue al menos un medicamento" y botón deshabilitado.
   - Stock insuficiente al confirmar (p. ej. otra dispensación simultánea tomó las unidades) → 409 "Stock insuficiente para <nombre>. Solicitado: <n>, Disponible: <m>"; no se registra nada.
   - Conflicto de serialización con otra dispensación simultánea → el backend reintenta hasta 3 veces (espera de 10·n ms); si persiste → 409 "No se pudo completar la dispensación por un conflicto de concurrencia. Intente de nuevo."; no se registra nada (svc/dispensacion.service.ts, líneas 290–317; RN-74).
   - Beneficiario inactivo o inexistente → 404 "Beneficiario no encontrado o inactivo"; medicamento inactivo → 404 "Medicamento no encontrado o inactivo: <id>" (P-23).
   - Cantidad no entera o ítem mal formado (petición directa) → 400 "Cada ítem debe tener medicamentoId (texto) y cantidad entera mayor a 0".
   - Otros errores → F "Error al registrar dispensación" o el mensaje del backend; un 500 incluye el detalle interno solo con `NODE_ENV=development` (ut/httpError.ts, líneas 46–50; H-07, H-13).
5. **Precondiciones:** sesión; beneficiario activo; medicamentos activos con stock dispensable (lotes no vencidos). **Postcondiciones:** una fila en `dispensaciones`, una o más en `detalle_dispensaciones` (una por lote usado); `lotes.cantidad_actual` reducida y, si llega a 0, `estado = AGOTADO`.
6. **Reglas:** RN-03, RN-09 a RN-19, RN-21, RN-24, RN-47, RN-71, RN-74.
7. **Tablas y auditoría:** `beneficiarios`, `medicamentos`, `lotes`, `codigos_barras`, `configuracion_sistema` (L); `lotes`, `dispensaciones`, `detalle_dispensaciones` (E). Auditoría: `DISPENSAR` / `Dispensacion` con beneficiario, ítems y observaciones. El paso a `AGOTADO` queda implícito en ese registro (D-18).

## 7. Beneficiarios (CU-13, CU-14)

1. **Actores:** ADMIN y ENCARGADO.
2. **Pantallas:** `/beneficiarios` → pg/Beneficiarios.tsx (listado, detalle con historial, modal crear/editar); modal rápido en pg/Dispensacion.tsx, líneas 976–1048.
3. **Flujo principal (registrar, CU-13, y consultar historial, CU-14):**
   1. U: entra a Beneficiarios. S: [`GET /api/dispensacion/beneficiarios/buscar?q=`] lista los 50 activos más recientes (Beneficiarios.tsx, líneas 53–73).
   2. U: escribe nombre o DPI (≥ 2 caracteres). S: misma ruta con `q`, hasta 20 resultados.
   3. U: pulsa "Nuevo beneficiario", llena nombre (obligatorio), DPI, teléfono, dirección y observaciones, y pulsa "Registrar". S: el frontend valida nombre y DPI; [`POST /api/dispensacion/beneficiarios`] valida tipos, nombre y DPI, comprueba DPI único, crea y registra `CREAR` / `Beneficiario` (rt/dispensacion.routes.ts, líneas 40–85). "Beneficiario registrado".
   4. U: pulsa "Ver detalle". S: [`GET /api/dispensacion/beneficiarios/:id`] muestra datos e historial completo: fecha y hora, quién atendió, medicamentos (desde *snapshots*), observaciones, estado de evidencia y miniaturas de las fotos, que se cargan con sesión por [`GET /api/dispensacion/:id/foto/:tipo`] y se amplían al pulsarlas (Beneficiarios.tsx, líneas 81–225; cmp/ui/AuthImage.tsx, líneas 12–30; RN-76).
   - **Editar:** U: pulsa el lápiz, cambia datos y guarda. S: [`PUT /api/dispensacion/beneficiarios/:id`] valida, comprueba DPI único si cambió y registra `EDITAR` con datos anteriores y nuevos (líneas 98–147). "Beneficiario actualizado".
4. **Flujos alternos y de error:** nombre < 3 caracteres → "El nombre debe tener al menos 3 caracteres"; DPI ≠ 13 dígitos → "El DPI debe tener exactamente 13 dígitos"; campo opcional que no es texto (petición directa) → 400 "El campo <campo> debe ser texto"; DPI repetido → 409 "Ya existe un beneficiario con DPI <dpi>"; beneficiario inexistente → 404 "Beneficiario no encontrado"; foto inexistente → 404 "Foto no encontrada"; sin resultados → "No se encontraron resultados"; lista vacía → "No hay beneficiarios registrados"; sin dispensaciones → "No hay dispensaciones registradas"; errores genéricos "Error al guardar", "Error al cargar detalle", "Error al buscar beneficiarios". No existe desactivar ni eliminar (H-29).
5. **Precondiciones:** sesión. **Postcondiciones:** fila nueva o modificada en `beneficiarios`.
6. **Reglas:** RN-30 a RN-34, RN-42, RN-65, RN-76.
7. **Tablas y auditoría:** `beneficiarios` (L/E); `dispensaciones`, `detalle_dispensaciones`, `usuarios`, `fotos_dispensacion` (L). Auditoría: `CREAR` / `EDITAR` entidad `Beneficiario`.

## 8. Captura de evidencia (CU-16)

1. **Actores:** ADMIN o ENCARGADO (en la computadora); Celular (misma persona, sin sesión).
2. **Pantallas:** pantalla de éxito de pg/Dispensacion.tsx (pestañas "QR Celular" y "Subir desde PC", líneas 463–605); `/captura/:token` → pg/Captura.tsx (pública, fuera del `Layout`, App.tsx, línea 49).
3. **Flujo principal (QR con el celular):**
   1. S: tras registrar la dispensación, [`POST /api/dispensacion/:id/generar-token`] crea o reutiliza el token (11 caracteres, 30 min) y registra `CREAR` / `TokenCaptura` (también al reutilizarlo, H-38); muestra el QR con la URL `<origen>/captura/<token>` (usa `VITE_LAN_IP` si se accedió por `localhost`) (Dispensacion.tsx, líneas 411–418 y 468–479; svc/dispensacion.service.ts, líneas 435–484).
   2. S: cada 3 s consulta [`GET /api/dispensacion/:id/fotos`] y actualiza "Foto de receta" / "Foto de entrega": pendiente/recibida (líneas 427–443).
   3. U (celular): escanea el QR. S: [`GET /api/captura/:token/info`] muestra beneficiario y fecha, y dos botones "Tomar foto de RECETA" / "Tomar foto de ENTREGA" (Captura.tsx, líneas 39–117).
   4. U: toma la foto (abre la cámara trasera), revisa la vista previa y pulsa "Subir" (o "Repetir"). S: [`POST /api/captura/:token/foto`] con `tipo`; valida el token antes de procesar la imagen, valida formato y tamaño, recodifica la imagen a WebP (1600 px), guarda el archivo, crea o reemplaza el registro de foto, marca el token como usado si ya están las dos y registra `CREAR` / `FotoDispensacion` a nombre del usuario que dispensó, sin IP (rt/captura.routes.ts, líneas 51–95; svc/dispensacion.service.ts, líneas 576–643; H-35). El celular muestra "Receta subida" / "Entrega subida" y, al completar, "Todo listo — Puede cerrar esta página."
   5. S (escritorio): al detectar las dos fotos muestra "Evidencia completa" y el botón "Siguiente dispensación".
4. **Flujos alternos y de error:**
   - **Subir desde PC:** U elige la pestaña "Subir desde PC" y selecciona los archivos de receta y entrega; se usa el mismo endpoint público con el mismo token (Dispensacion.tsx, líneas 110–187 y 553–582). Mensajes: "Foto de receta subida" / el mensaje del backend o "No se pudo subir la foto de receta".
   - **Omitir fotos:** U pulsa "Omitir fotos"; se detiene la consulta periódica; la dispensación queda sin evidencia (líneas 593–602).
   - No se pudo generar el token → F "No se pudo generar el código QR para las fotos"; la dispensación ya está registrada.
   - Evidencia ya completa al pedir un token → 409 "La evidencia de esta dispensación ya está completa; no se pueden reemplazar las fotos" (rt/dispensacion.routes.ts, líneas 266–269).
   - Token inexistente, vencido o ya usado → 404 "Enlace inválido o expirado"; el celular muestra "Enlace inválido o expirado — Pida a la encargada que genere un código QR nuevo desde la computadora."
   - Tipo inválido → 400 "Tipo inválido. Use RECETA o EVIDENCIA_ENTREGA"; sin archivo → 400 "Debe adjuntar una imagen en el campo \"foto\""; formato no permitido → 400 "Formato de imagen no permitido. Use JPG, PNG o WEBP"; más de 5 MB → 400 "El archivo supera el tamaño máximo permitido"; contenido no decodificable → 400 "El archivo no es una imagen válida". En el celular: el mensaje recibido o "No se pudo subir la foto. Intente de nuevo."
   - Repetir una foto antes de completar las dos → reemplaza la anterior y borra su archivo (svc/dispensacion.service.ts, líneas 594–609). Después de completarlas no hay forma de corregir una foto (P-24).
   - El QR no es accesible si la URL usa `localhost` y no está configurada `VITE_LAN_IP` (CLAUDE.md, "Prueba pendiente con celular real"; P-04).
5. **Precondiciones:** dispensación registrada con evidencia incompleta; token vigente; celular en la misma red. **Postcondiciones:** hasta dos filas en `fotos_dispensacion` (una por tipo); archivos WebP en `backend/uploads/dispensaciones/<id>/`, accesibles solo con sesión (RN-76); `tokens_captura.usado = true` al completar.
6. **Reglas:** RN-18, RN-35 a RN-42, RN-69, RN-76, RN-77.
7. **Tablas y auditoría:** `dispensaciones`, `tokens_captura`, `fotos_dispensacion` (L/E). Auditoría: `CREAR` / `TokenCaptura` en cada solicitud del token y `CREAR` / `FotoDispensacion` en cada subida (sin IP). La marca `usado` no se audita (D-18).

## 9. Reportes (CU-17, CU-18)

1. **Actores:** ADMIN (pantalla y exportación). ENCARGADO: el backend le permite las consultas pero no la pantalla (H-20, R-07).
2. **Pantalla:** `/reportes` → pg/Reportes.tsx (6 pestañas: Dispensaciones, Consumo por medicamento, Inventario actual, Por vencer, Entradas, Dados de baja).
3. **Flujo principal:**
   1. U: entra a Reportes y elige una pestaña (CU-17). S: carga la primera página (20 filas) del reporte (Reportes.tsx, líneas 179–249):
      - Dispensaciones [`GET /api/reportes/dispensaciones`] — filtros desde/hasta, beneficiario (buscador), medicamento (buscador).
      - Consumo [`GET /api/reportes/consumo-medicamentos`] — desde/hasta, categoría.
      - Inventario actual [`GET /api/reportes/inventario-actual`] — categoría, estado.
      - Por vencer [`GET /api/reportes/por-vencer`] — días (por defecto 90).
      - Entradas [`GET /api/reportes/entradas`] — desde/hasta.
      - Dados de baja [`GET /api/reportes/medicamentos-baja`] — desde/hasta sobre la fecha de vencimiento; incluye resumen de unidades y costo perdidos.
   2. U: ajusta filtros y pagina. S: recarga con los filtros; la fecha "hasta" se envía como fin del día (`T23:59:59.999`) y la fecha "desde" como fecha simple (ver H-46).
   3. U: pulsa "Exportar PDF" o "Exportar Excel" (CU-18). S: [`GET /api/reportes/exportar/:tipo/:formato`] con los filtros actuales comprueba que el reporte no supere 5000 registros, genera el archivo (PDF con encabezado institucional, "Filtros aplicados" y paginación), registra `CREAR` / `reporte` y lo descarga; muestra "Reporte exportado" (rt/reportes.routes.ts, líneas 378–442; Reportes.tsx, líneas 268–302).
4. **Flujos alternos y de error:** sin datos → "Sin resultados" en pantalla y "Sin registros para los filtros aplicados." en el PDF (backend/src/utils/pdf.ts, línea 171); error → "No se pudo cargar el reporte"; fecha inválida o "desde" posterior a "hasta" → 400 (ut/fecha.ts, líneas 22–48); estado inválido → 400 "Estado inválido. Use: …" (la exportación no lo valida, H-44); tipo o formato inválido → 400; más de 5000 registros → 400 "El reporte tiene <n> registros y el máximo exportable es 5000. Reduzca el rango de fechas o aplique más filtros."; usuario no ADMIN → redirección a `/` en el frontend y 403 en la exportación.
5. **Precondiciones:** sesión ADMIN (en la interfaz). **Postcondiciones:** solo lectura; en la exportación, un registro de auditoría.
6. **Reglas:** RN-21, RN-66, RN-67, RN-68.
7. **Tablas y auditoría:** lectura de `dispensaciones`, `detalle_dispensaciones`, `beneficiarios`, `usuarios`, `medicamentos`, `categorias`, `codigos_barras`, `lotes`, `ubicaciones`, `entradas`, `configuracion_sistema`. Auditoría: `CREAR` / `reporte` por exportación (con tipo, formato y filtros).

## 10. Auditoría (CU-19)

1. **Actores:** ADMIN.
2. **Pantalla:** `/auditoria` → pg/Auditoria.tsx (tabla con fila expandible).
3. **Flujo principal:**
   1. U: entra a Auditoría. S: [`GET /api/usuarios`] para el filtro de usuario y [`GET /api/auditoria?page&limit=20`] ordenado del más reciente al más antiguo (rt/auditoria.routes.ts, líneas 13–83; Auditoria.tsx, líneas 81–109).
   2. U: filtra por usuario, acción, entidad (lista de 13 entidades, incluidas `FotoDispensacion`, `reporte` y `TokenCaptura`) y rango de fechas. S: recarga con los filtros (la entidad se compara sin distinguir mayúsculas; el "hasta" como fin del día) (Auditoria.tsx, líneas 30–46; rt/auditoria.routes.ts, línea 48).
   3. U: expande una fila. S: muestra `datosAnteriores` y `datosNuevos` en JSON.
4. **Flujos alternos y de error:** error → "No se pudo cargar la auditoría" / "No se pudieron cargar los usuarios"; acción fuera del catálogo (petición directa) → 400 "accion inválida. Use: …"; fecha inválida → 400; no ADMIN → 403 y redirección a `/`. La acción `LOGOUT` aparece en el filtro pero nunca se registra (H-10).
5. **Precondiciones:** sesión ADMIN. **Postcondiciones:** ninguna (solo lectura).
6. **Reglas:** RN-69, RN-70.
7. **Tablas y auditoría:** lectura de `log_auditoria` y `usuarios`. La consulta no se audita.

## 11. Dashboard (CU-12)

1. **Actores:** ADMIN y ENCARGADO.
2. **Pantalla:** `/` → pg/Dashboard.tsx.
3. **Flujo principal:**
   1. U: inicia sesión o pulsa "Dashboard". S: [`GET /api/inventario/alertas`] y [`GET /api/inventario/entradas`] (Dashboard.tsx, líneas 33–43).
   2. S: muestra saludo y fecha; banner "Todo en orden. No hay alertas de inventario que requieran atención." o "<n> asuntos requieren tu atención hoy." con el desglose (líneas 72–91).
   3. S: "Acciones rápidas" (Dispensar medicamento, Registrar entrada); "Resumen" (Medicamentos, Stock bajo, Por vencer, Dispensaciones hoy); "Requiere atención" con hasta 8 elementos por panel (Stock bajo, Próximos a vencer, Vencidos sin baja); "Entradas recientes" (6) (líneas 94–165).
   4. U: pulsa una tarjeta o enlace. S: navega a `/dispensacion`, `/entradas`, `/inventario` o `/catalogos`.
4. **Flujos alternos y de error:** si falla una de las consultas, esa parte queda vacía sin mensaje de error (líneas 35–36); paneles vacíos: "Todo el stock está por encima del mínimo", "No hay lotes próximos a vencer", "No hay lotes vencidos pendientes de baja", "No hay entradas registradas todavía". "Dispensaciones hoy" cuenta desde la medianoche de la zona del servidor (America/Guatemala, H-02 resuelto) y de todos los usuarios.
5. **Precondiciones:** sesión. **Postcondiciones:** ninguna.
6. **Reglas:** RN-28, RN-29.
7. **Tablas y auditoría:** lectura de `configuracion_sistema`, `medicamentos`, `lotes`, `dispensaciones`, `beneficiarios`, `entradas`, `usuarios`. Sin auditoría.

---

## 12. Máquinas de estado

### 12.1 Lote (`EstadoLote`)

Estados: `DISPONIBLE`, `AGOTADO`, `VENCIDO`, `DADO_DE_BAJA` (schema, líneas 119–124). Estado inicial:
`DISPONIBLE`. Estado final: `DADO_DE_BAJA` (no tiene transiciones de salida).

| # | Estado origen | Evento | Estado destino | Quién lo dispara | Fuente |
|---|---------------|--------|----------------|------------------|--------|
| 1 | (inicio) | Registro de entrada o fila válida de importación Excel, con fecha de vencimiento posterior a hoy | `DISPONIBLE` | ADMIN o ENCARGADO (entrada); ADMIN (Excel) | rt/inventario.routes.ts, líneas 64–73, 99–129, 652–659 y 866–877 |
| 2 | `DISPONIBLE` | Dispensación que deja `cantidadActual > 0` | `DISPONIBLE` | ADMIN o ENCARGADO | svc/dispensacion.service.ts, líneas 240–246 |
| 3 | `DISPONIBLE` | Dispensación que deja `cantidadActual = 0` | `AGOTADO` | ADMIN o ENCARGADO | svc/dispensacion.service.ts, líneas 240–246 |
| 4 | `DISPONIBLE` | Proceso automático con `fechaVencimiento <= hoy` (00:05 diario y al arrancar la API) | `VENCIDO` | Sistema | svc/vencimiento.service.ts, líneas 7–16 y 40–50 |
| 5 | `DISPONIBLE` | Baja de lote | `DADO_DE_BAJA` | ADMIN | rt/inventario.routes.ts, líneas 447–490 |
| 6 | `AGOTADO` | Baja de lote | `DADO_DE_BAJA` | ADMIN | ídem (solo se rechaza el estado `DADO_DE_BAJA`) |
| 7 | `VENCIDO` | Baja de lote | `DADO_DE_BAJA` | ADMIN | ídem |
| 8 | `DADO_DE_BAJA` | Baja de lote | (rechazado: 409 "El lote ya fue dado de baja") | ADMIN | rt/inventario.routes.ts, líneas 464–467 |

Notas: no existen transiciones `AGOTADO → DISPONIBLE` (no hay devoluciones, RN-20) ni `VENCIDO →
DISPONIBLE`. Un lote `AGOTADO` cuya fecha pase no cambia a `VENCIDO` (el proceso solo toma
`DISPONIBLE`). Entre la fecha de vencimiento y la siguiente ejecución del proceso, un lote vencido
puede seguir `DISPONIBLE` en la base de datos, pero ya no se dispensa ni cuenta como stock (RN-09,
RN-71). Como el proceso también corre al arrancar, una API apagada a las 00:05 no deja lotes sin
marcar más allá del siguiente arranque. El **semáforo** no es un estado persistido: se calcula en
cada consulta (RN-24).

### 12.2 Token de captura (`TokenCaptura`)

El modelo guarda `token`, `usado` y `expiraEn`, con una sola fila por dispensación (schema, líneas
213–225). Los estados son derivados:

- **Vigente:** `usado = false` y `expiraEn > ahora`.
- **Vencido:** `usado = false` y `expiraEn ≤ ahora`.
- **Usado:** `usado = true` (solo ocurre cuando la dispensación ya tiene las dos fotos).
- **Eliminado:** la fila fue borrada por el proceso automático.

| # | Estado origen | Evento | Estado destino | Quién lo dispara | Fuente |
|---|---------------|--------|----------------|------------------|--------|
| 1 | (no existe) | `POST /dispensacion/:id/generar-token` con evidencia incompleta | Vigente (11 caracteres, expira en 30 min) | Frontend, automáticamente tras dispensar (usuario autenticado) | svc/dispensacion.service.ts, líneas 435–484; pg/Dispensacion.tsx, líneas 411–418 |
| 2 | Vigente | `generar-token` de nuevo | Vigente (mismo token, sin cambios; se audita igual, H-38) | Usuario autenticado | svc/dispensacion.service.ts, líneas 462–468 |
| 3 | Vigente | Subida de una foto sin completar las dos | Vigente | Celular o "Subir desde PC" | svc/dispensacion.service.ts, líneas 576–643 |
| 4 | Vigente | Subida que completa `RECETA` + `EVIDENCIA_ENTREGA` | Usado | Celular o "Subir desde PC" | svc/dispensacion.service.ts, líneas 617–624 |
| 5 | Vigente | Pasan 30 minutos | Vencido | Tiempo (se evalúa en cada petición) | svc/dispensacion.service.ts, línea 515 |
| 6 | Vencido | `generar-token` (evidencia incompleta) | Vigente (token nuevo en la misma fila) | Usuario autenticado | svc/dispensacion.service.ts, líneas 470–477 |
| 7 | Usado | `generar-token` | (rechazado: 409 "La evidencia de esta dispensación ya está completa; no se pueden reemplazar las fotos") | Usuario autenticado | svc/dispensacion.service.ts, líneas 444–455; rt/dispensacion.routes.ts, líneas 266–269 |
| 8 | Vigente, Vencido o Usado con `expiraEn < ahora` | Proceso automático (00:05 diario y al arrancar) | Eliminado | Sistema | svc/vencimiento.service.ts, líneas 23–38; svc/dispensacion.service.ts, líneas 645–651 |
| 9 | Vencido, Usado o inexistente | `GET /captura/:token/info` o `POST /captura/:token/foto` | (rechazado: 404 "Enlace inválido o expirado") | Celular | rt/captura.routes.ts, líneas 39–49 y 76–80 |

Nota: después de que el proceso automático elimina la fila (estado Eliminado), `generar-token` sobre
una dispensación con evidencia incompleta vuelve a crear una fila (transición 1); con evidencia
completa la rechaza (409), porque la comprobación se hace sobre las fotos y no sobre el token
(líneas 444–455).

### 12.3 Usuario (`activo`)

Estados: **Activo** (`activo = true`, valor por defecto) e **Inactivo** (`activo = false`)
(schema, línea 26). No hay estado de eliminado.

| # | Estado origen | Evento | Estado destino | Quién lo dispara | Fuente |
|---|---------------|--------|----------------|------------------|--------|
| 1 | (inicio) | `POST /api/usuarios` (o creación del administrador inicial por el *seed*) | Activo | ADMIN (o Sistema en el *seed*) | rt/usuarios.routes.ts, líneas 32–94; backend/prisma/seed.ts, líneas 21–71 |
| 2 | Activo | `PUT /api/usuarios/:id/toggle` | Inactivo | ADMIN, sobre otra cuenta | rt/usuarios.routes.ts, líneas 96–133 |
| 3 | Inactivo | `PUT /api/usuarios/:id/toggle` | Activo | ADMIN | ídem |
| 4 | Activo | `toggle` sobre la propia cuenta | (rechazado: 400 "No puede desactivar su propia cuenta") | ADMIN | rt/usuarios.routes.ts, líneas 107–110 |
| 5 | Inactivo | `POST /api/auth/login` | Inactivo (rechazado: 401 "Credenciales inválidas"; cuenta como intento fallido para el bloqueo y se audita) | Usuario | rt/auth.routes.ts, líneas 96–99 |
| 6 | Inactivo | Cualquier petición protegida con un token emitido antes de la desactivación | Inactivo (rechazado: 401 "La cuenta ya no está activa. Inicie sesión nuevamente.") | Usuario | mw/auth.ts, líneas 39–55 |

Nota: la desactivación surte efecto en la siguiente petición del usuario (transición 6); ya no
conserva el acceso hasta que expire el token (H-10, resuelto en esta parte). Cada transición 2 y 3
registra `DESACTIVAR` o `ACTIVAR`. Además del estado `activo`, el inicio de sesión puede quedar
**bloqueado temporalmente** para una combinación usuario + IP (RN-72); ese bloqueo no es un estado
del usuario ni se guarda en la base de datos.

---

## Cambios respecto a la versión 194f8fb

Comparación hecha con `git diff 194f8fb bdf1187 -- backend/src frontend/src backend/prisma` y la
lectura del código en `bdf1187`. Todos los números de línea del documento se recalcularon. Se
agregó a cada módulo la referencia al caso de uso de la numeración final (`08_casos_uso_candidatos.md`).

| Sección | Cambio | Antes (`194f8fb`) | Ahora (`bdf1187`) | Commit | Hallazgo / regla |
|---------|--------|-------------------|-------------------|--------|------------------|
| §1 | Límite de intentos y auditoría de fallos | Sin límite; fallos sin auditar | 429 por IP (20/10 min) y por usuario + IP (3 fallos, 5 min); 401 con `intentosRestantes`; fallos auditados | `254d0f8`, `b25c06e`, `40d16fa` | H-09; RN-56, RN-72 |
| §1 | Sesión guardada y 401 del login | Rol tomado de `localStorage`; el 401 del login recargaba la página | Confirma con `GET /auth/perfil`; el interceptor excluye `/auth/login` | `254d0f8` | H-19, H-32; RN-57, RN-73 |
| §2, §12.3 | Usuario desactivado | Conservaba el acceso hasta expirar el token | 401 en la siguiente petición; nueva transición 6 | `254d0f8` | H-10; RN-61, RN-73 |
| §2 | Alta de usuarios | Sin validar rol, tipos ni longitud en backend | Rol, tipos y contraseña ≥ 6 | `254d0f8` | H-15, H-16; RN-58 |
| §3 | Inactivos en el catálogo | Desaparecían y no se podían reactivar | Se muestran (`incluirInactivos`) y se reactivan | `254d0f8` | H-26; RN-63 |
| §3 | Validaciones de edición y errores de imagen | Sin validación; duplicados e imagen inválida → 500 | Zod/400; duplicado → 409; imagen → 400 y WebP | `aa7598b`, `b25c06e`, `254d0f8` | H-12, H-15, H-31; RN-45 a RN-51, RN-77 |
| §3 | OpenFDA | Cualquier usuario autenticado | Solo ADMIN | `254d0f8` | H-21; RN-48 |
| §4 | Lista de medicamentos | Solo los primeros 20 | Todos (recorre las páginas) | `254d0f8` | H-24 |
| §4, §12.1 | Fecha de vencimiento | Se aceptaba una fecha pasada | 400 si es hoy o anterior (manual y Excel) | `254d0f8` | H-34; RN-52, RN-54, RN-71 |
| §4 | Importación Excel | Reutilizaba inactivos; sin control de lotes repetidos | Rechaza inactivos; omite lotes existentes; aviso general por códigos numéricos | `254d0f8`, `5bdc091`, `71dcd15`, `42350b1`, `aa163aa` | H-33; RN-55, RN-75 |
| §5 | Paginación de Inventario | Solo la primera página | Controles "Anterior" / "Siguiente" | `254d0f8` | H-25 |
| §5 | Motivo de la baja | No se pedía | "Motivo (opcional)" en el diálogo | `254d0f8` | H-27; RN-06 |
| §5, §12.1 | Proceso de vencimiento | `< hoy`, 00:05 en UTC | `<= hoy`, 00:05 de America/Guatemala y al arrancar | `254d0f8`, `99d4429` | H-01, H-02, D-11; RN-04 |
| §6, §12.1 | Selección de lotes al dispensar | `DISPONIBLE` y `cantidad_actual > 0` | Además `fecha_vencimiento > hoy` | `254d0f8`, `b595051` | H-01; RN-09 |
| §6 | Conflicto de concurrencia | No descrito (terminaba en 500) | 3 reintentos (10·n ms) y luego 409 | `254d0f8` | RN-74; D-29 |
| §6 | Semáforo de Dispensación | Umbrales fijos 30/90 con `<` | Umbrales de `GET /inventario/configuracion` con `<=` | `254d0f8`, `0e705c3` | H-28, D-25; RN-24 |
| §6 | Errores del despacho | 500 con `error.message` | `responderError`; detalle solo en desarrollo; cantidad entera | `254d0f8`, `b25c06e` | H-13, H-15 |
| §7 | Miniaturas de fotos | `<img>` sobre `/uploads/dispensaciones/...` público | `AuthImage` sobre el endpoint autenticado | `254d0f8` | H-11; RN-76 |
| §8, §12.2 | Token de captura | `nanoid` 10 caracteres; un token usado se podía regenerar | `randomBytes(8)` base64url (11); 409 si la evidencia está completa: Usado no vuelve a Vigente | `dd8e723`, `254d0f8` | H-14; RN-35, RN-39 |
| §8 | Subida de fotos | No se auditaba; formato inválido → 500 | WebP; `CREAR` / `FotoDispensacion` sin IP; 400 | `b25c06e`, `254d0f8` | H-12, H-14, H-35; RN-38, RN-69, RN-77 |
| §9 | Exportación | Truncaba a 5000 en silencio | 400 si supera 5000; fechas validadas | `4257e93`, `71dcd15`, `254d0f8` | H-45, H-46; RN-67 |
| §10 | Filtro de entidad y acción | Lista incompleta; acción inválida → 500 | 13 entidades; comparación sin mayúsculas; 400 | `254d0f8`, `b25c06e` | H-30; RN-70 |
| §11 | "Dispensaciones hoy" | Medianoche UTC | Medianoche de America/Guatemala | `254d0f8` | H-02 |

### Diferencias de `diagramas/README.md` reflejadas

| Diferencia del README | Secciones actualizadas |
|-----------------------|------------------------|
| Inicio de sesión | §1 (pasos 3–4, flujos alternos), §12.3 transición 5 |
| Usuario desactivado | §2 postcondiciones, §12.3 transición 6 y nota |
| Cron de vencimiento | §5 ("Vencimiento automático"), §12.1 transición 4 y notas |
| Selección de lotes al dispensar | §6 pasos 4 y 6, §12.1 notas |
| Conflicto de concurrencia | §6 flujos alternos |
| Fecha de vencimiento en entradas | §4 paso 5 y flujos alternos, §12.1 transición 1 |
| Importación Excel | §4 "Importar desde Excel" y flujos alternos |
| Token de captura | §8 paso 1 y flujos alternos, §12.2 transiciones 1, 6 y 7 |
| Subida de fotos | §8 paso 4 y flujos alternos, apartado 7 |
