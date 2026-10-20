# Guía de ejecución manual de los casos UI y DISPOSITIVO

> Complemento de `registro_ejecucion.md`. Los 52 casos de tipo API ya se ejecutaron el 2026-10-20 con
> peticiones HTTP (evidencia en `evidencia/`). Esta guía ordena los 39 casos UI y el caso DISPOSITIVO
> (CP-77) para ejecutarlos en una sola pasada por el navegador, agrupados por pantalla. Los resultados
> esperados completos están en `casos_prueba.md`; aquí se resume lo que hay que observar y se indica
> qué cambia por el estado actual de los datos.

## 1. Preparación

### 1.1 Entorno y fecha

- Sistema local en Docker con el código `bdf1187`, interfaz en `http://localhost:5173`.
- **Ejecutar de preferencia el mismo día de la carga (2026-10-20).** Los valores "hoy + N" de los
  lotes se calcularon ese día; en otro día cambian los días para vencer, el semáforo de algunos lotes
  y el indicador "Dispensaciones hoy". Si se ejecuta otro día, anotarlo en el registro.
- Archivos de prueba (fuera del repositorio): `C:\Users\user8\respaldo_documentacion\archivos_prueba\`
  (`receta.jpg`, `receta2.jpg`, `entrega.png`, `foto_medicamento.jpg`, `grande.jpg`, `documento.pdf`,
  `falso.jpg` y los `.xlsx` de `datos_prueba.md`, sección 4).

### 1.2 Cuentas

| Cuenta | Rol | Uso en esta guía |
|--------|-----|------------------|
| `qa_admin2` | Administrador | Todas las operaciones de Administrador. Donde `casos_prueba.md` dice `admin`, se usa `qa_admin2` |
| `qa_encargado` | Encargado de Beneficencia | Operación diaria y permisos |
| `qa_temporal` | Encargado de Beneficencia | CP-06 |
| `qa_nuevo` | Encargado de Beneficencia | CP-12 (ya existe: lo creó CP-09) |

Las contraseñas se entregan aparte; no se anotan en el repositorio ni en las capturas.

### 1.3 Navegadores

Las ventanas de incógnito de un mismo navegador comparten la sesión, así que se usan tres contextos
separados:

- **Ventana A** (navegador normal): `qa_admin2`.
- **Ventana B** (otro navegador u otro perfil): `qa_encargado`.
- **Ventana C** (incógnito): sin sesión. Hace de teléfono en CP-72 y CP-73 y se usa para las sesiones
  breves de `qa_nuevo` (CP-12) y `qa_temporal` (CP-06). Cerrarla al terminar cada uno.

Para la página de captura en tamaño de teléfono sin un teléfono real: herramientas de desarrollador
(F12) → modo de dispositivo (Ctrl+Shift+M) → 375 × 812.

### 1.4 Límites de inicio de sesión

La API cuenta hasta 20 inicios de sesión por IP en 10 minutos y bloquea un usuario 5 minutos tras
3 fallos desde la misma IP. Los contadores se borran con `docker compose restart api` (las sesiones
abiertas siguen válidas). Antes de CP-02 y de CP-07 se reinicia la API, como piden los casos.

### 1.5 Peticiones con curl (pasos de API dentro de casos UI)

Algunos casos UI tienen un paso con `curl`. Desde Git Bash:

1. En la ventana de la cuenta, F12 → Aplicación → Almacenamiento local → `http://localhost:5173` →
   copiar el valor de `farmag_token`.
2. `T=<valor copiado>` y luego, por ejemplo:
   `curl -s -w "\n%{http_code}\n" -H "Authorization: Bearer $T" http://localhost:3000/api/usuarios`
3. No pegar el token en la evidencia: guardar solo la petición, el código y el cuerpo.

Identificadores útiles: lote QA-B-1 `4099fc66-a70f-472f-ac0a-bdbf72dedf17`; lote QA-B-2
`9dafb38a-e30c-4430-b68b-5d0ced48d96e`.

### 1.6 Estado de los datos tras la ejecución por API

La ejecución por API modificó algunos datos que los casos UI dan por iniciales. Los resultados
esperados de esta guía ya lo tienen en cuenta:

- **QA Paracetamol:** CP-64 dispensó 8 unidades. Stock 17; QA-F-A agotado (0), QA-F-B 7, QA-F-C 10.
- **QA Amoxicilina:** QA-V-HOY quedó `VENCIDO` (CP-52) y QA-V-OK con 1 unidad (CP-53).
- **QA Ibuprofeno:** stock 5 (CP-67).
- **QA Cetirizina:** existe además el lote QA-B-API, ya dado de baja (dato de CP-84).
- **QA Enalapril:** conserva sus 50 unidades.
- **Beneficiario Prueba Dos:** ya tiene dos dispensaciones: QA Ibuprofeno sin fotos (CP-67) y
  QA Ácido Fólico con solo la receta (CP-75).
- Hay medicamentos y datos creados por la API que aparecen en las listas: QA Diclofenaco API,
  QA Ácido Fólico, QA Sales de Rehidratación, QA Nistatina, QA Carga (5001 lotes, CP-86), la categoría
  QA Categoría Edición y las ubicaciones QA-IMP y QA-01.
- No existen todavía QA Diclofenaco (lo crea CP-17), "QA Antiséptico" (CP-27) ni QA-02 (CP-30).

### 1.7 Evidencia

- Captura de cada caso en `docs/documentacion/pruebas/evidencia/CP-XX.png` (si hace falta más de una,
  `CP-XX_a.png`, `CP-XX_b.png`…). Salida de `curl` en `CP-XX_curl.txt`.
- Las cinco capturas del capítulo V van en `docs/documentacion/pruebas/capturas/` (sección 3).
- Ninguna captura debe mostrar contraseñas ni el valor de `farmag_token`.
- Al terminar cada caso, llenar su fila en `registro_ejecucion.md`.

## 2. Casos en orden de ejecución

### 2.1 Inicio de sesión (sin sesión)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-02 | 1. `docker compose restart api`. 2. En la ventana A, iniciar sesión como `qa_encargado` con `Incorrecta1`. 3. Con curl: `curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"qa_encargado","password":"Incorrecta2"}'`. 4. Tras CP-01, revisar en Auditoría la acción `LOGIN` | Paso 2: "Credenciales inválidas" y sigue en el inicio de sesión. Paso 3: 401 con `"intentosRestantes":1`. Paso 4: dos `LOGIN` de `qa_encargado` con `exito: false` | `CP-02_a.png` (mensaje), `CP-02_curl.txt`, `CP-02_b.png` (bitácora) |
| CP-07 | 1. `docker compose restart api`. 2. Fallar dos veces el inicio de sesión de `qa_encargado` desde la pantalla | **Se espera Fallido (H-47):** solo muestra "Credenciales inválidas", sin los intentos restantes | `CP-07.png` |
| CP-01 | 1. `docker compose restart api` (para no arrastrar los fallos de CP-07). 2. En la ventana A, iniciar sesión como `qa_admin2`. 3. Revisar el menú. 4. Auditoría, filtrar `LOGIN`. 5. F12 → Almacenamiento local | "Bienvenido al sistema" y el panel; el menú incluye Usuarios, Reportes y Auditoría; registro `LOGIN` de `qa_admin2`; existe `farmag_token` (no capturar su valor) | `CP-01_a.png` (panel y menú), `CP-01_b.png` (bitácora) |

### 2.2 Usuarios (ventana A, `qa_admin2`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-12 | 1. En la ventana C, iniciar sesión como `qa_nuevo`. 2. En la ventana A, editar `qa_nuevo`: rol Administrador, guardar. 3. Recargar la ventana C. 4. Volver el rol a Encargado. 5. Restablecer la contraseña de `qa_nuevo` (8 caracteres o más) e iniciar sesión con ella en la ventana C. Cerrar la ventana C | Paso 2: "Usuario actualizado" y `EDITAR` con datos anteriores y nuevos. Paso 3: `qa_nuevo` ve Usuarios, Reportes y Auditoría sin volver a iniciar sesión. Paso 5: "Contraseña actualizada"; el inicio funciona y la bitácora no muestra la contraseña | `CP-12_a.png` (menú de `qa_nuevo` como Administrador), `CP-12_b.png` (bitácora) |
| CP-06 | 1. En la ventana C, iniciar sesión como `qa_temporal`. 2. En la ventana A, desactivar `qa_temporal`. 3. En la ventana C, abrir Existencias con F12 → Red abierto. 4. Intentar iniciar sesión otra vez como `qa_temporal`. 5. Reactivarlo en la ventana A. Cerrar la ventana C | Paso 3: la petición recibe 401 "La cuenta ya no está activa. Inicie sesión nuevamente." y la pantalla vuelve al inicio de sesión. Paso 4: "Credenciales inválidas". Paso 5: "Usuario activado" | `CP-06_a.png` (pestaña Red con el 401), `CP-06_b.png` |

### 2.3 Registrar entrada (ventana A, `qa_admin2`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-19 (paso 1) | "Nuevo medicamento" junto al lote 1; llenar todo menos la categoría y guardar | "Seleccione una categoría"; no se crea nada. Pasos 2 y 3 con curl (ver `casos_prueba.md`): 400 "La categoría especificada no existe" y 400 "Datos inválidos" | `CP-19.png`, `CP-19_curl.txt` |
| CP-17 | "Nuevo medicamento" junto al lote 1; revisar el stock mínimo; registrar QA Diclofenaco, Tableta, 50 mg, unidad Tableta, categoría Analgésico | Stock mínimo propuesto 10; "Medicamento creado"; queda seleccionado en el lote 1; aparece en Catálogos; `CREAR` en la bitácora | `CP-17.png` |
| CP-21 | "Nuevo medicamento": escribir `00303789205353` y Enter; luego `7790000000011`; luego `7790000000099` (requiere internet) | Formulario lleno con "Datos sugeridos por OpenFDA — verifique antes de guardar"; "Este medicamento ya está registrado: QA Paracetamol"; "No se encontraron datos en OpenFDA para este código. Complete el formulario manualmente." | `CP-21_a.png`, `CP-21_b.png`, `CP-21_c.png` |
| CP-38 | Escanear (o escribir y Enter) `7790000000059` en el lote 1; "Nuevo medicamento": QA Clotrimazol, Crema, 1 %, Tubo, Dermatológico; completar el lote (fecha futura) y registrar | "No se encontró medicamento con ese código de barras"; "Medicamento creado" y queda seleccionado; "Entrada registrada"; en Catálogos, QA Clotrimazol sin el código `7790000000059` | `CP-38.png` |
| CP-41 | "Importar desde Excel": pulsar "Importar" sin archivo; importar `import_sin_columnas.xlsx`, `no_excel.xlsx` e `import_vacia.xlsx` | "Seleccione un archivo .xlsx"; "Faltan columnas en el Excel: fechaVencimiento. Descargue la plantilla actualizada."; "El archivo no es un Excel (.xlsx) válido"; "El archivo no contiene filas de datos" | `CP-41_a.png` … `CP-41_d.png` |

### 2.4 Catálogos (ventana A, `qa_admin2`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-18 | Registrar un medicamento "Paracetamol", Tableta, 500 mg (desde "Nuevo medicamento"); "Revisar de nuevo"; guardar otra vez y "Crear de todos modos" | Diálogo "Posibles duplicados" con QA Paracetamol; vuelve al formulario con los datos; "Medicamento creado" | `CP-18.png` (diálogo) |
| CP-20 | Medicamentos → editar QA Diclofenaco: stock mínimo 15, guardar; editar → "Subir foto" con `foto_medicamento.jpg`; editar y guardar sin cambios | "Medicamento actualizado" y `EDITAR` solo con el stock mínimo; "Foto actualizada" con vista previa; el archivo en `backend/uploads/medicamentos/` es `.webp`; sin cambios: no hay `EDITAR` nuevo | `CP-20_a.png` (vista previa), `CP-20_b.png` (bitácora) |
| CP-25 | Contador de códigos de QA Diclofenaco: agregar `7790000000011`; pulsar "Agregar" con el campo vacío | "Este código de barras ya está registrado en otro medicamento"; "Escanee o escriba un código de barras" | `CP-25.png` |
| CP-23 | Desactivar QA Diclofenaco; buscarlo en el selector de Registrar entrada, en la búsqueda de Dispensación y en Existencias; reactivarlo | "Medicamento desactivado", sigue en el catálogo como inactivo; no aparece en los tres lugares; "Medicamento activado" y vuelve a aparecer | `CP-23_a.png` (inactivo en el catálogo), `CP-23_b.png` (búsqueda sin resultado) |
| CP-27 | Categorías: crear "QA Antiséptico" (descripción "Prueba"); renombrar a "QA Antisépticos"; desactivar y revisar el selector de "Nuevo medicamento"; reactivar | "Categoría creada", "Categoría actualizada", "Categoría desactivada" (no aparece en el selector), "Categoría activada"; `CREAR` y `EDITAR` en la bitácora | `CP-27.png` |
| CP-30 | Ubicaciones: crear "QA-02" ("Estante de prueba"); editar la descripción; revisar el selector de ubicación de un lote en Registrar entrada | "Ubicación creada", "Ubicación actualizada"; QA-02 en el selector; no hay botón para desactivar ni eliminar | `CP-30.png` |

### 2.5 Existencias (ventana A, `qa_admin2`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-51 (paso 1) | Detalle de QA Cetirizina → "Dar de baja" en QA-B-2 → Cancelar | El lote no cambia y no hay `BAJA` nuevo | `CP-51.png` |
| CP-50 | Detalle de QA Cetirizina → "Dar de baja" en QA-B-1 → motivo "Empaque dañado" → confirmar; revisar la bitácora y el reporte Dados de baja | Diálogo "¿Seguro que deseas dar de baja el lote QA-B-1? …" con "Motivo (opcional)"; "Lote dado de baja"; el botón desaparece. **El stock de QA Cetirizina queda en 5, no en 0:** QA-B-2 (5 u) sigue disponible; el caso supone 0 por error (ver la nota al final). `BAJA` con estado, cantidad anterior y motivo; QA-B-1 en Dados de baja | `CP-50_a.png` (diálogo), `CP-50_b.png` (detalle después) |
| CP-51 (pasos 2 y 3) | Con curl y el token de `qa_admin2`: `PUT /api/inventario/lotes/4099fc66-a70f-472f-ac0a-bdbf72dedf17/baja` y `PUT /api/inventario/lotes/00000000-0000-0000-0000-000000000000/baja` (`-X PUT`) | 409 "El lote ya fue dado de baja" y 404 "Lote no encontrado" | `CP-51_curl.txt` |

### 2.6 Reportes y Auditoría (ventana A, `qa_admin2`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-80 | Recorrer las seis pestañas; Dispensaciones por Beneficiario Prueba Uno y QA Paracetamol; Consumo por Analgésico; Inventario actual por Analgésico y `DISPONIBLE`; en Inventario actual sin filtros, pasar a la página 2 | Sin errores y con fechas dd/mm/aaaa (HH:mm); solo la dispensación de CP-64; Consumo con QA Paracetamol; solo lotes disponibles de Analgésico; la página 2 no repite filas (hay más de 5000 lotes por QA Carga) | `CP-80_a.png` … `CP-80_d.png` |
| CP-85 | En cada pestaña aplicar un filtro y pulsar "Exportar PDF" y "Exportar Excel"; abrir los 12 archivos; revisar la bitácora | "Reporte exportado" y descarga; PDF con logo, nombre de la farmacia, filtros, "Generado:" dd/mm/aaaa HH:mm, tabla y "Página X de Y"; Excel con encabezado, filtro automático y los datos de la pantalla; 12 `CREAR` de entidad reporte. **En Inventario actual filtrar por categoría:** sin filtro supera los 5000 registros y responde el aviso de CP-86 | `CP-85_pdf.png`, `CP-85_xlsx.png`; guardar los 12 archivos como `CP-85_<tipo>.pdf/.xlsx` si se desea |
| CP-89 | Auditoría: revisar orden y paginación; filtrar por usuario `qa_encargado` y acción `DISPENSAR`; filtrar entidad "DISPENSACION"; expandir un `EDITAR` de usuario | Del más reciente al más antiguo, 20 por página; solo dispensaciones de `qa_encargado`; mismos resultados en mayúsculas; datos anteriores y nuevos sin contraseñas (el restablecimiento aparece como `***restablecida***`) | `CP-89_a.png`, `CP-89_b.png` |

### 2.7 Sesión del Encargado (ventana B, `qa_encargado`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-54 | Iniciar sesión; comparar el panel con los datos; "Dispensar medicamento" y volver; "Registrar entrada" | Aviso "<n> asuntos requieren tu atención hoy." con desglose. Stock bajo incluye QA Omeprazol y QA Salbutamol; también aparecen otros medicamentos con stock menor que su mínimo por la ejecución anterior (por ejemplo QA Amoxicilina, QA Cetirizina tras CP-50, QA Diclofenaco API y los creados sin lotes en CP-17 y CP-18). Próximos a vencer incluye QA-F-B y QA-S-30. "Dispensaciones hoy" cuenta también la dispensación preparada a las 23:30 de hoy (CP-81). Hasta 8 elementos por panel y 6 entradas recientes; los botones abren Dispensación y Registrar entrada | `CP-54.png` y **`capturas/cap5_panel.png`** |
| CP-15 | Revisar el menú; escribir `/usuarios`, `/auditoria` y `/reportes`; revisar Catálogos, Registrar entrada y el detalle de QA Cetirizina; paso 6 con curl y el token de `qa_encargado` (siete peticiones de `casos_prueba.md`) | Sin Usuarios, Reportes ni Auditoría; las tres rutas redirigen al panel; sin botones de crear, editar, códigos, importar ni dar de baja; las siete peticiones → 403 "No tiene permisos para esta acción" | `CP-15_a.png` (menú), `CP-15_b.png` (detalle sin baja), `CP-15_curl.txt` |
| CP-33 | Registrar entrada: QA Diclofenaco, lote QA-E-1, 30 u, hoy + 120, ubicación A, costo 0.50; "Agregar lote": QA-E-2, 20 u, mañana, sin ubicación ni costo; "Registrar entrada"; abrir el detalle en Existencias | "Entrada registrada", el formulario se limpia y la entrada aparece en las recientes; dos lotes disponibles (30 y 20), stock 50; `CREAR` en la bitácora | `CP-33.png` |
| CP-34 | En el campo de lectura del lote 1: `7790000000011` + Enter; luego `7790000000099` + Enter | "QA Paracetamol seleccionado" y el campo se vacía; "No se encontró medicamento con ese código de barras" | `CP-34.png` |
| CP-36 | Registrar una entrada con un lote sin número; otra con cantidad 0 | "Complete medicamento, cantidad, número de lote y vencimiento en cada lote"; "La cantidad debe ser mayor a 0"; no se registra nada | `CP-36.png` |
| CP-46 | Existencias: revisar QA Omeprazol y QA Metformina; marcar "Solo stock bajo" | QA Omeprazol con stock bajo y QA Metformina no; la lista filtrada incluye QA Omeprazol y no QA Metformina. Con unos 17 medicamentos activos la lista cabe en una página, así que el regreso a la página 1 no se puede observar: anotarlo en el resultado | `CP-46.png` |
| CP-44 | Existencias: revisar la lista; buscar "QA Para"; "Detalle" de QA Paracetamol; detalle de QA Cetirizina | Lista de 20 en 20 con stock, lotes, próximo vencimiento y semáforo. **Por CP-64:** QA Paracetamol con stock 17, 2 lotes con stock y próximo vencimiento hoy + 60; el detalle muestra QA-F-A (0, agotado), QA-F-B (7) y QA-F-C (10) con fecha, días, semáforo, estado y ubicación. QA-B-1 dado de baja y sin sumar al stock | `CP-44_a.png`, `CP-44_b.png` y **`capturas/cap5_existencias_semaforo.png`** (lista con QA Loratadina en "Urgente" y otras filas en "Sin riesgo"; incluir la búsqueda "QA" para que se vean varios semáforos) |
| CP-57 | Beneficiarios → "Nuevo beneficiario": nombre "Jo"; luego DPI `000000000005`; escribir letras en el DPI | "El nombre debe tener al menos 3 caracteres"; "El DPI debe tener exactamente 13 dígitos"; el campo no acepta letras ni más de 13 dígitos; nada se registra | `CP-57.png` |
| CP-59 | Editar a Beneficiario Prueba Tres: dirección "Barrio de prueba" | "Beneficiario actualizado"; `EDITAR` con datos anteriores y nuevos (verlo con `qa_admin2`); no hay opción de desactivar ni eliminar | `CP-59.png` |

### 2.8 Dispensación y evidencia (ventana B, `qa_encargado`)

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-68 | Revisar el botón sin beneficiario; elegir Beneficiario Prueba Uno; agregar QA Enalapril dos veces; agregar QA Salbutamol; leer `7790000000099`; cantidad 999 en QA Enalapril; "Confirmar dispensación" → "Cancelar" | "Seleccione un beneficiario para continuar"; "Agregue al menos un medicamento"; "Este medicamento ya está en la lista"; "QA Salbutamol no tiene stock disponible"; "No se encontró medicamento con ese código de barras"; la cantidad se ajusta a 50; no se registra nada | `CP-68_a.png`, `CP-68_b.png` |
| CP-70 | Buscar "Prueba Cinco"; "Nuevo", registrar Beneficiario Prueba Cinco (sin DPI); dispensar 1 u de QA Enalapril; pulsar "Omitir fotos" | "No se encontraron resultados"; "Beneficiario registrado" y queda seleccionado sin dispensaciones recientes; "Dispensación registrada correctamente". QA Enalapril queda en 49 | `CP-70.png` |
| CP-63 | Buscar "Prueba Dos" y elegirlo; leer `7790000000035`; cantidad 3, observaciones "Receta de prueba"; "Confirmar dispensación"; "Dispensar". **No cerrar la pantalla de evidencia** | Dispensaciones recientes (hasta 5; incluye las de CP-67 y CP-75) y cursor en el campo de código; QA Enalapril con cantidad 1, stock 49 y semáforo; resumen con los datos; "Dispensación registrada correctamente" y pantalla de evidencia; stock 46; `DISPENSAR` en la bitácora | `CP-63_a.png` y **`capturas/cap5_dispensacion.png`** (lista con QA Enalapril antes de confirmar); **`capturas/cap5_evidencia_qr.png`** (pantalla de evidencia, pestaña "QR Celular") |
| CP-72 | Copiar la dirección del QR (clic derecho o la URL mostrada) y abrirla en la ventana C en modo de dispositivo 375 px; "Tomar foto de RECETA" → `receta.jpg` → "Subir"; luego ENTREGA con `entrega.png`; observar la ventana B | Nombre del beneficiario, fecha y dos botones sin pedir sesión; "Receta subida" y en la ventana B la receta aparece recibida en 3 s o menos; "Entrega subida", "Todo listo" y "Puede cerrar esta página."; en la ventana B "Evidencia completa" y "Siguiente dispensación"; archivos `.webp` y dos `CREAR` de foto en la bitácora | `CP-72_a.png` (página de captura), `CP-72_b.png` (evidencia completa) |
| CP-73 | 1. Recargar el enlace de CP-72 en la ventana C. 2. Registrar otra dispensación (1 u de QA Enalapril a Beneficiario Prueba Uno), dejar abierta la evidencia y vencer su enlace con `docker compose exec db psql -U farmag -d farmag_db -c "UPDATE tokens_captura SET expira_en = (now() AT TIME ZONE 'UTC') - interval '1 minute' WHERE dispensacion_id = (SELECT id FROM dispensaciones ORDER BY created_at DESC LIMIT 1)"`; abrir su enlace. 3. Abrir `http://localhost:5173/captura/AAAAAAAAAAA`. 4. `curl` a `/api/captura/<token>/info` con los tres | Pasos 1 a 3: "Enlace inválido o expirado" y "Pida a la encargada que genere un código QR nuevo desde la computadora.". Paso 4: 404 "Enlace inválido o expirado" en los tres. Pulsar "Omitir fotos" en la ventana B al terminar | `CP-73.png`, `CP-73_curl.txt` (sin el token completo) |
| CP-76 | Dos dispensaciones nuevas de 1 u de QA Enalapril a Beneficiario Prueba Dos: en la primera, pestaña "Subir desde PC" con `receta.jpg` y `entrega.png`; en la segunda, "Omitir fotos" | "Foto de receta subida" y la de entrega; "Evidencia completa"; en la segunda la pantalla deja de consultar y vuelve al formulario; queda "Sin evidencia" | `CP-76_a.png`, `CP-76_b.png` |
| CP-77 (DISPOSITIVO) | Requiere teléfono en la misma red WiFi. Iniciar sesión en la ventana B por `http://<IP del equipo>:5173` (no `localhost`); puerto 5173 abierto en el firewall. Dispensar 1 u de QA Enalapril a Beneficiario Prueba Uno; escanear el QR con la cámara del teléfono; "Tomar foto de RECETA" fotografiando una hoja de papel de prueba | La página abre en el teléfono con botones grandes; se abre directamente la cámara trasera; al subir, "Receta subida". Anotar modelo de teléfono y navegador en el registro | Captura de pantalla del teléfono → `CP-77.png` y **`capturas/cap5_captura_celular.png`**. Si no hay teléfono, el caso queda Bloqueado y la figura se toma en CP-72 con el modo de dispositivo |
| CP-61 | Abrir el detalle de Beneficiario Prueba Dos; pulsar una miniatura | Insignias "Evidencia completa" (CP-72 y CP-76), "Parcial" (CP-75) y "Sin evidencia" (CP-67 y CP-76); miniaturas cargadas; la foto se amplía | `CP-61_a.png`, `CP-61_b.png` |

### 2.9 Historial y cierre

| Caso | Pasos | Resultado esperado | Captura |
|------|-------|--------------------|---------|
| CP-60 | 1. En la ventana A, Catálogos: renombrar QA Paracetamol a "QA Paracetamol Renombrado". 2. Detalle de Beneficiario Prueba Uno. 3. En la ventana B, el mismo detalle. 4. Volver a poner "QA Paracetamol" | La dispensación de CP-64 muestra fecha y hora dd/mm/aaaa HH:mm, usuario "Encargado Prueba", "QA Paracetamol" (no el nombre nuevo), cantidades y observaciones; `qa_encargado` ve también las de otros usuarios | `CP-60_a.png`, `CP-60_b.png` |
| CP-05 | En la ventana B, "Cerrar sesión"; escribir `http://localhost:5173/inventario`; `curl http://localhost:3000/api/inventario` sin token | Pantalla de inicio de sesión y sin `farmag_token` ni `farmag_usuario`; redirige a `/login`; 401 "Token de autenticación requerido" | `CP-05_a.png` (almacenamiento vacío), `CP-05_curl.txt` |

## 3. Capturas del capítulo V

Guardar en `docs/documentacion/pruebas/capturas/` (crear la carpeta), en PNG, con la ventana a
1366 × 768 o más y sin datos personales reales:

| Archivo | Contenido | Cuándo se toma |
|---------|-----------|----------------|
| `cap5_panel.png` | Panel con el resumen, las alertas y las entradas recientes | CP-54 (sesión de `qa_encargado`) |
| `cap5_dispensacion.png` | Dispensación con Beneficiario Prueba Dos elegido y QA Enalapril en la lista, con stock y semáforo | CP-63, antes de "Confirmar dispensación" |
| `cap5_evidencia_qr.png` | Pantalla de evidencia con el código QR (pestaña "QR Celular") y el estado de las dos fotos | CP-63, después de "Dispensar". El enlace vence en 30 minutos y deja de servir al completar las fotos |
| `cap5_captura_celular.png` | Página de captura en el teléfono, con el nombre del beneficiario y los botones de foto | CP-77 (o CP-72 en modo de dispositivo si no hay teléfono; indicarlo en el pie de figura) |
| `cap5_existencias_semaforo.png` | Existencias con la columna del semáforo mostrando varios estados ("Urgente", "Por vencer", "Sin riesgo", "Sin stock") | CP-44 |

## 4. Nota sobre CP-50

Con los datos de `datos_prueba.md`, QA Cetirizina tiene QA-B-1 (10 u) y QA-B-2 (5 u). Al dar de baja
QA-B-1 el stock queda en 5, no en 0 como dice el resultado esperado de CP-50. Es un error del caso de
prueba, no del sistema: si el stock queda en 5, el caso se registra como Aprobado y se anota la
diferencia en "Resultado obtenido". Conviene corregir el texto de `casos_prueba.md` ("el stock de
QA Cetirizina baja a 5").
