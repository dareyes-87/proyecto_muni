# Registro de ejecución de las pruebas funcionales

> Se llena durante la ejecución de `casos_prueba.md`. No se anotan resultados que no se hayan
> observado: un caso no ejecutado queda con la fila vacía.

## Datos del ciclo

| Campo | Valor |
|-------|-------|
| Ciclo | 1 |
| Commit probado | `bdf1187` (el código de `backend/` y `frontend/` de la rama `docs/documentacion` no difiere de ese commit) |
| Fecha de carga de datos ("hoy" de los cálculos) | 2026-10-20 (hora de Guatemala). Los casos UI se ejecutaron el 2026-10-21: antes se sumó un día a la fecha de vencimiento de los 5026 lotes QA (`UPDATE lotes SET fecha_vencimiento = fecha_vencimiento + 1 WHERE numero_lote LIKE 'QA-%'`), con lo que vuelven a quedar como en `datos_prueba.md` (QA-V-HOY vence hoy, QA-V-AGO ayer, QA-S-30 a 30 días, QA-S-90 a 90, QA-B-2 a 180, etc.). No hizo falta correr el proceso de vencimiento: QA-V-HOY ya estaba en `VENCIDO` desde CP-52 y ningún otro lote QA quedó vencido |
| Ejecutor | Casos API: ejecución por peticiones HTTP con Claude Code el 2026-10-20, a solicitud del responsable de la documentación. Casos UI y DISPOSITIVO: ejecución automatizada con Playwright (Claude Code) el 2026-10-21, a solicitud del responsable de la documentación |
| Navegador y versión | No aplica a los casos API. Casos UI: Chromium 130 sin interfaz (Playwright 1.48.2, imagen `mcr.microsoft.com/playwright:v1.48.2-noble`), ventana de 1366 × 768, configuración regional es-GT y zona horaria America/Guatemala. La interfaz se abrió en `http://192.168.65.254:5173`, la dirección de `host.docker.internal` dentro del contenedor: Vite 5.4.21 rechaza el nombre `host.docker.internal` ("Blocked request. This host is not allowed") y no se modificó su configuración |
| Teléfono y navegador (CP-77) | Sin teléfono físico: simulado con un contexto de Chromium de 390 × 844, táctil, escala 3 y agente de usuario de Chrome 130 para Android; el código QR se decodificó de la imagen de la pantalla y el lector de códigos se simuló escribiendo el código y Enter |
| `npm test` antes del ciclo | No se ejecutó al inicio del ciclo; la última ejecución registrada antes de él aprobó 53 de 53 (2026-10-20, commit `bdf1187`, `analisis/11_resultados_pruebas_automatizadas.md`) |
| `npm test` después del ciclo | 53 de 53 aprobadas, 0 fallidas (2026-10-21, 08:14 hora de Guatemala; ver "Regresión final") |

## Instrucciones

- **Estado:** Aprobado (el resultado obtenido coincide con el esperado), Fallido (no coincide) o
  Bloqueado (no se pudo ejecutar; anotar la causa en "Resultado obtenido").
- **Defecto:** para un caso Fallido, el hallazgo de `analisis/hallazgos_defectos.md`. Los 14 casos de
  hallazgos abiertos (CP-07, CP-08, CP-16, CP-26, CP-29, CP-32, CP-43, CP-49, CP-71, CP-78, CP-79,
  CP-82, CP-88, CP-91) ya tienen su H-XX; si otro caso falla, se agrega un hallazgo nuevo con el
  siguiente número libre y se anota aquí.
- **Evidencia:** nombre del archivo en `pruebas/evidencia/` (captura, salida de `curl` o consulta).
- **Orden de ejecución sugerido**, por dependencias de datos:
  1. CP-55 (base vacía), luego cargar `datos_prueba.md` y ejecutar los ajustes SQL de QA-V-HOY y
     QA-V-AGO.
  2. CU-01 y CU-02, salvo CP-03 y CP-04.
  3. CU-03 a CU-08 (CP-17 antes de CP-20 a CP-24 y de CP-33; CP-86 queda para el final).
  4. CP-50, CP-51, CP-44 a CP-49.
  5. CP-53 (sin reiniciar la API), CU-13, CP-63 a CP-70, CU-16, CP-60 a CP-62.
  6. CP-52 (reinicio de la API), CP-54, CU-17, CU-18 (sin CP-86), CU-19.
  7. CP-71, CP-81, CP-82, CP-91 (ajustes de `created_at`).
  8. CP-03, CP-04 y, al final, CP-86 (carga de 5001 lotes).

## Clasificación de los casos por forma de ejecución

Se clasificó cada caso según dónde se observa su resultado esperado:

- **API (52 casos):** todos los resultados esperados se observan en la respuesta HTTP o en la base
  de datos. Se incluyen los casos cuyo texto en pantalla es el que la interfaz construye directamente
  con la respuesta (el campo `error` de la API, los rótulos del semáforo, los contadores de la
  importación o los avisos de éxito tras un 201); en la evidencia de cada caso se cita el archivo y la
  línea del frontend que lo muestra. Se ejecutaron con peticiones a `http://localhost:3000/api`.
- **UI (39 casos):** algún resultado esperado solo se observa en el navegador (menús,
  navegación, diálogos, validaciones propias del formulario, comportamiento de un campo, vista previa
  de imágenes, consulta periódica de la pantalla de evidencia). Se ejecutan con
  `guia_ejecucion_manual.md`.
- **DISPOSITIVO (1 caso):** requiere un teléfono real. Se ejecuta con la misma guía.

| Tipo | Casos |
|------|-------|
| API | CP-03, CP-04, CP-08, CP-09, CP-10, CP-11, CP-13, CP-14, CP-16, CP-22, CP-24, CP-26, CP-28, CP-29, CP-31, CP-32, CP-35, CP-37, CP-39, CP-40, CP-42, CP-43, CP-45, CP-47, CP-48, CP-49, CP-52, CP-53, CP-55, CP-56, CP-58, CP-62, CP-64, CP-65, CP-66, CP-67, CP-69, CP-71, CP-74, CP-75, CP-78, CP-79, CP-81, CP-82, CP-83, CP-84, CP-86, CP-87, CP-88, CP-90, CP-91, CP-92 |
| UI | CP-01, CP-02, CP-05, CP-06, CP-07, CP-12, CP-15, CP-17, CP-18, CP-19, CP-20, CP-21, CP-23, CP-25, CP-27, CP-30, CP-33, CP-34, CP-36, CP-38, CP-41, CP-44, CP-46, CP-50, CP-51, CP-54, CP-57, CP-59, CP-60, CP-61, CP-63, CP-68, CP-70, CP-72, CP-73, CP-76, CP-80, CP-85, CP-89 |
| DISPOSITIVO | CP-77 |

Fuente: Elaboración propia.

## Datos preparados fuera de la API

- `QA-V-HOY` y `QA-V-AGO`: la API rechaza un lote con fecha de hoy o anterior (comprobado en
  `evidencia/00_preparacion_datos.txt`), así que se registraron con hoy + 1 y se ajustaron con las
  consultas SQL de `datos_prueba.md`, sección 5.
- Los cambios de `created_at` (CP-71, CP-81, CP-82, CP-91) y de `expira_en` del enlace de captura
  (CP-52) se hicieron con SQL, como indica `datos_prueba.md`, sección 5; cada evidencia muestra la
  consulta.
- Para que la ejecución por API no altere los datos que esperan los casos UI pendientes:
  - en lugar de QA Diclofenaco (lo crea CP-17 desde la pantalla) se usó "QA Diclofenaco API"
    (Ampolla, 75 mg/3 ml) en CP-22, CP-24 y CP-35;
  - en lugar de "QA Antisépticos" (CP-27) se usó la categoría "QA Categoría Edición" en CP-28, y en
    lugar de QA-02 (CP-30) la ubicación QA-01 en CP-31;
  - las dispensaciones auxiliares de CP-71, CP-74, CP-75, CP-78, CP-79, CP-81, CP-82 y CP-91 son de
    1 unidad de QA Ácido Fólico (importado en CP-39) y no de QA Enalapril, para conservar las
    50 unidades que espera CP-63.
- El detalle de la carga y su comprobación (sección 7 de `datos_prueba.md`) está en
  `evidencia/00_preparacion_datos.txt`.

## Registro

| ID | Fecha | Resultado obtenido | Estado | Defecto (H-XX) | Evidencia |
|----|-------|--------------------|--------|----------------|-----------|
| CP-01 | 2026-10-21 | "Bienvenido al sistema" y panel; menú con Usuarios, Reportes y Auditoría; registro LOGIN de qa_admin2 (el inicio exitoso se registra sin datos nuevos, no con exito: true); farmag_token presente | Aprobado |  | `evidencia/CP-01_a.png`, `evidencia/CP-01_b.png`, `evidencia/CP-01.txt` |
| CP-02 | 2026-10-21 | Pantalla: "Credenciales inválidas" y sigue en /login; petición: 401 con "intentosRestantes":1; bitácora: dos LOGIN de qa_encargado con exito false | Aprobado |  | `evidencia/CP-02_a.png`, `evidencia/CP-02_curl.txt`, `evidencia/CP-02_b.png`, `evidencia/CP-02.txt` |
| CP-03 | 2026-10-20 | 401, 401, 429 "Demasiados intentos fallidos. Intente de nuevo en 5 minuto(s)." con Retry-After, 429 con la contraseña correcta; tras 5 minutos, 200 | Aprobado |  | `evidencia/CP-03.txt` |
| CP-04 | 2026-10-20 | 1 a 20: 401; la 21 y la de admin con contraseña correcta: 429 "Demasiadas solicitudes de inicio de sesión desde esta red…" con Retry-After; tras reiniciar, 200 | Aprobado |  | `evidencia/CP-04.txt` |
| CP-05 | 2026-10-21 | Vuelve al inicio de sesión sin farmag_token ni farmag_usuario; /inventario redirige a /login; la API responde 401 "Token de autenticación requerido" | Aprobado |  | `evidencia/CP-05_a.png`, `evidencia/CP-05_b.png`, `evidencia/CP-05_curl.txt`, `evidencia/CP-05.txt` |
| CP-06 | 2026-10-21 | La petición recibe 401 "La cuenta ya no está activa. Inicie sesión nuevamente." y vuelve al inicio de sesión; nuevo intento: "Credenciales inválidas"; "Usuario activado" | Aprobado |  | `evidencia/CP-06_a.png`, `evidencia/CP-06_b.png`, `evidencia/CP-06.txt` |
| CP-07 | 2026-10-21 | Intentos 1 y 2: solo "Credenciales inválidas", sin los intentos restantes | Fallido | H-47 (esperado) | `evidencia/CP-07.png`, `evidencia/CP-07.txt` |
| CP-08 | 2026-10-20 | No hay endpoint de cierre de sesión (404 "Ruta no encontrada"); la bitácora tiene 0 registros LOGOUT | Fallido | H-10 (esperado) | `evidencia/CP-08.txt` |
| CP-09 | 2026-10-20 | 201; qa_nuevo activo, rol Encargado; sin contraseña ni hash en la respuesta; CREAR de usuario en la bitácora | Aprobado |  | `evidencia/CP-09.txt` |
| CP-10 | 2026-10-20 | 409 "El nombre de usuario ya existe"; no se creó usuario | Aprobado |  | `evidencia/CP-10.txt` |
| CP-11 | 2026-10-20 | 400 con los cuatro mensajes esperados; no se creó ningún usuario | Aprobado |  | `evidencia/CP-11.txt` |
| CP-12 | 2026-10-21 | "Usuario actualizado" y EDITAR con datos anteriores y nuevos; al recargar, qa_nuevo ve Usuarios, Reportes y Auditoría; "Contraseña actualizada" e inicio de sesión correcto con la nueva; la bitácora no muestra la contraseña | Aprobado |  | `evidencia/CP-12_a.png`, `evidencia/CP-12_b.png`, `evidencia/CP-12.txt` |
| CP-13 | 2026-10-20 | Ambos 400 con los mensajes esperados; la cuenta sigue activa y con rol Administrador | Aprobado |  | `evidencia/CP-13.txt` |
| CP-14 | 2026-10-20 | Desactivado y visible como inactivo; login 401 "Credenciales inválidas"; reactivado; DESACTIVAR y ACTIVAR en la bitácora | Aprobado |  | `evidencia/CP-14.txt` |
| CP-15 | 2026-10-21 | Menú sin Usuarios, Reportes ni Auditoría; las tres rutas redirigen al panel; sin botones de crear, editar, códigos, importar ni dar de baja; las siete peticiones → 403 "No tiene permisos para esta acción" | Aprobado |  | `evidencia/CP-15_a.png`, `evidencia/CP-15_b.png`, `evidencia/CP-15_c.png`, `evidencia/CP-15_curl.txt`, `evidencia/CP-15.txt` |
| CP-16 | 2026-10-20 | 500 "Error interno del servidor" en lugar de 409; no se creó el usuario | Fallido | H-15 (esperado) | `evidencia/CP-16.txt` |
| CP-17 | 2026-10-21 | Stock mínimo propuesto 10; "Medicamento creado"; queda seleccionado en el lote 1; aparece en el catálogo; CREAR en la bitácora | Aprobado |  | `evidencia/CP-17.png`, `evidencia/CP-17.txt` |
| CP-18 | 2026-10-21 | Diálogo "Posibles duplicados" con el texto esperado y QA Paracetamol; "Revisar de nuevo" vuelve al formulario con los datos; "Crear de todos modos" → "Medicamento creado" | Aprobado |  | `evidencia/CP-18.png`, `evidencia/CP-18.txt` |
| CP-19 | 2026-10-21 | Paso 1: no se crea nada, pero el formulario lo detiene la validación del navegador ("Please select an item in the list.") y no aparece "Seleccione una categoría". Paso 2: 400 "La categoría especificada no existe". Paso 3: 400 "Datos inválidos" | Fallido | H-53 | `evidencia/CP-19.png`, `evidencia/CP-19_curl.txt`, `evidencia/CP-19.txt` |
| CP-20 | 2026-10-21 | "Medicamento actualizado", pero el EDITAR incluye además nombreComercial null → "" (no solo el stock mínimo); "Foto actualizada" con vista previa y archivo .webp; sin cambios: la API responde "No hubo cambios que aplicar" y no registra EDITAR (la pantalla muestra "Medicamento actualizado") | Fallido | H-55 | `evidencia/CP-20_a.png`, `evidencia/CP-20_b.png`, `evidencia/CP-20.txt` |
| CP-21 | 2026-10-21 | Paso 1: el código 00303789205353 ya no tiene datos en OpenFDA (404 de api.fda.gov); con el código vigente 00342291936904 (Sucralfate) el formulario se llena (Sucralfate, Sucralfate) con "Datos sugeridos por OpenFDA — verifique antes de guardar"; paso 2: "Este medicamento ya está registrado: QA Paracetamol"; paso 3: "No se encontraron datos en OpenFDA para este código. Complete el formulario manualmente." | Aprobado |  | `evidencia/CP-21_a0.png`, `evidencia/CP-21_a.png`, `evidencia/CP-21_b.png`, `evidencia/CP-21_c.png`, `evidencia/CP-21.txt` |
| CP-22 | 2026-10-20 | 400 "Formato de imagen no permitido…", 400 "El archivo supera el tamaño máximo permitido" y 400 "El archivo no es una imagen válida"; la foto anterior no cambió | Aprobado |  | `evidencia/CP-22.txt` |
| CP-23 | 2026-10-21 | "Medicamento desactivado", sigue en el catálogo como inactivo y EDITAR en la bitácora; no aparece en Registrar entrada, Dispensación ni Existencias; "Medicamento activado" y vuelve a aparecer | Aprobado |  | `evidencia/CP-23_a.png`, `evidencia/CP-23_b.png`, `evidencia/CP-23_c.png`, `evidencia/CP-23.txt` |
| CP-24 | 2026-10-20 | Código guardado sin espacios (201); consulta 200 con stockActual; eliminado; luego 404 "Código de barras no registrado"; CREAR y ELIMINAR en la bitácora | Aprobado |  | `evidencia/CP-24.txt` |
| CP-25 | 2026-10-21 | "Este código de barras ya está registrado en otro medicamento" y no se vincula; campo vacío: "Escanee o escriba un código de barras" | Aprobado |  | `evidencia/CP-25.png`, `evidencia/CP-25_b.png`, `evidencia/CP-25.txt` |
| CP-26 | 2026-10-20 | 409 "Este código de barras ya está registrado en otro medicamento" (mensaje de otro medicamento) | Fallido | H-31 (esperado) | `evidencia/CP-26.txt` |
| CP-27 | 2026-10-21 | "Categoría creada", "Categoría actualizada", "Categoría desactivada" (no aparece en el selector), "Categoría activada"; CREAR y EDITAR en la bitácora | Aprobado |  | `evidencia/CP-27.png`, `evidencia/CP-27.txt` |
| CP-28 | 2026-10-20 | 409, 400, 409 "Ya existe un registro con el mismo nombre" y 400 con los mensajes esperados; no se creó ni cambió ninguna categoría | Aprobado |  | `evidencia/CP-28.txt` |
| CP-29 | 2026-10-20 | 500 "Error interno del servidor" | Fallido | H-42 (esperado) | `evidencia/CP-29.txt` |
| CP-30 | 2026-10-21 | "Ubicación creada", "Ubicación actualizada"; QA-02 en el selector de Registrar entrada; la fila solo tiene el botón Editar | Aprobado |  | `evidencia/CP-30.png`, `evidencia/CP-30.txt` |
| CP-31 | 2026-10-20 | 409 y 400/400 con los mensajes esperados; no se creó ni cambió ninguna ubicación | Aprobado |  | `evidencia/CP-31.txt` |
| CP-32 | 2026-10-20 | 500 "Error interno del servidor" | Fallido | H-42 (esperado) | `evidencia/CP-32.txt` |
| CP-33 | 2026-10-21 | "Entrada registrada", el formulario se limpia y la entrada aparece en las recientes; QA-E-1 (30) y QA-E-2 (20) DISPONIBLE; stock 50; CREAR en la bitácora | Aprobado |  | `evidencia/CP-33.png`, `evidencia/CP-33_b.png`, `evidencia/CP-33.txt` |
| CP-34 | 2026-10-21 | "QA Paracetamol seleccionado", queda elegido en el lote y el campo se vacía; "No se encontró medicamento con ese código de barras" (lector simulado con teclado) | Aprobado |  | `evidencia/CP-34.png`, `evidencia/CP-34_b.png`, `evidencia/CP-34.txt` |
| CP-35 | 2026-10-20 | 400 "Lote 2 (QA-E-4): La fecha de vencimiento ya pasó o es hoy…" con hoy y con ayer; ningún lote de la entrada quedó registrado | Aprobado |  | `evidencia/CP-35.txt` |
| CP-36 | 2026-10-21 | Paso 1: "Complete medicamento, cantidad, número de lote y vencimiento en cada lote". Paso 2: no se registra, pero lo detiene la validación del navegador (min=1, "Value must be greater than or equal to 1.") y no aparece "La cantidad debe ser mayor a 0"; no se registra nada | Fallido | H-53 | `evidencia/CP-36.png`, `evidencia/CP-36_b.png`, `evidencia/CP-36.txt` |
| CP-37 | 2026-10-20 | 400 "Uno o más medicamentos no existen o están inactivos" y 400 "Una o más ubicaciones no existen"; no se registró nada | Aprobado |  | `evidencia/CP-37.txt` |
| CP-38 | 2026-10-21 | "No se encontró medicamento con ese código de barras"; "Medicamento creado" y queda seleccionado; "Entrada registrada"; QA Clotrimazol sin el código 7790000000059 (0 códigos) | Aprobado |  | `evidencia/CP-38.png`, `evidencia/CP-38.txt` |
| CP-39 | 2026-10-20 | Plantilla correcta (2 hojas, 11 encabezados, 1 fila de ejemplo); 3 filas → 3 lotes, 2 medicamentos, 1 categoría (QA Importada), 1 ubicación (QA-IMP), 1 código vinculado; CREAR en la bitácora por cada uno | Aprobado |  | `evidencia/CP-39.txt` |
| CP-40 | 2026-10-20 | 3 filas con errores (4, 5 y 6) con los tres mensajes esperados; se importaron solo QA-I-4 y QA-I-5 | Aprobado |  | `evidencia/CP-40.txt` |
| CP-41 | 2026-10-21 | Paso 1: el botón "Importar" está deshabilitado sin archivo y no se muestra "Seleccione un archivo .xlsx". Paso 2: "Faltan columnas en el Excel: fechaVencimiento. Descargue la plantilla actualizada.", "El archivo no es un Excel (.xlsx) válido", "El archivo no contiene filas de datos"; no se importa nada | Fallido | H-54 | `evidencia/CP-41_a.png` … `evidencia/CP-41_d.png`, `evidencia/CP-41.txt` |
| CP-42 | 2026-10-20 | Fila 2: aviso "Ya existe el lote QA-F-B…" y 1 lote omitido; fila 3: error de QA Ranitidina inactivo; fila 4: lote importado con aviso de código no vinculado | Aprobado |  | `evidencia/CP-42.txt` |
| CP-43 | 2026-10-20 | La fila se rechazó: "La categoría "QA Categoría Inactiva" existe pero está inactiva; actívela antes de importar" | Fallido | H-48 (esperado) | `evidencia/CP-43.txt` |
| CP-44 | 2026-10-21 | Lista de 20 en 20 con stock, lotes, próximo vencimiento y semáforo; "QA Para": solo QA Paracetamol, stock 17, 2 lotes, "Por vencer · 60d" (datos tras CP-64); detalle con QA-F-A (0, AGOTADO), QA-F-B (7) y QA-F-C (10) con fecha, días, semáforo, estado y ubicación; QA-B-1 DADO_DE_BAJA y stock de QA Cetirizina 5 | Aprobado |  | `evidencia/CP-44_a.png`, `evidencia/CP-44_b.png`, `evidencia/CP-44_c.png`, `capturas/cap5_existencias_semaforo.png`, `evidencia/CP-44.txt` |
| CP-45 | 2026-10-20 | 30 d → ROJO (Urgente), 31 y 90 d → AMARILLO (Por vencer), 91 d → VERDE (Sin riesgo); la fila toma ROJO | Aprobado |  | `evidencia/CP-45.txt` |
| CP-46 | 2026-10-21 | QA Omeprazol (9/10) marcado con stock bajo y QA Metformina (10/10) no; con "Solo stock bajo" aparece QA Omeprazol y no QA Metformina. Los 17 medicamentos caben en una página: el regreso a la página 1 no se pudo observar | Aprobado |  | `evidencia/CP-46.png`, `evidencia/CP-46.txt` |
| CP-47 | 2026-10-20 | Stock 0, semáforo nulo ("Sin stock") y detalle sin lotes | Aprobado |  | `evidencia/CP-47.txt` |
| CP-48 | 2026-10-20 | 200 y QA-S-31 en ROJO con rojo = 45; 400 por rojo ≥ amarillo; 400 "Datos inválidos" por -1; restablecido a 30/90 | Aprobado |  | `evidencia/CP-48.txt` |
| CP-49 | 2026-10-20 | Paso 1: 500 "Error interno del servidor"; paso 2: 200 con lista vacía, page 1 y pageSize y totalPages nulos (el caso preveía también page nulo) | Fallido | H-43 (esperado) | `evidencia/CP-49.txt` |
| CP-50 | 2026-10-21 | Diálogo con el texto esperado y "Motivo (opcional)"; "Lote dado de baja"; QA-B-1 en DADO_DE_BAJA sin botón; stock de QA Cetirizina 15 → 5 (queda QA-B-2); BAJA con estado y cantidad anteriores y el motivo; QA-B-1 en Dados de baja | Aprobado |  | `evidencia/CP-50_a.png`, `evidencia/CP-50_b.png`, `evidencia/CP-50_c.png`, `evidencia/CP-50.txt` |
| CP-51 | 2026-10-21 | Cancelar no cambia QA-B-2 ni crea BAJA; 409 "El lote ya fue dado de baja"; 404 "Lote no encontrado" | Aprobado |  | `evidencia/CP-51.png`, `evidencia/CP-51_curl.txt`, `evidencia/CP-51.txt` |
| CP-52 | 2026-10-20 | Tras reiniciar: QA-V-HOY → VENCIDO, QA-V-AGO sigue AGOTADO, token vencido eliminado; QA-V-HOY en "vencidos sin baja"; sin registros nuevos en la bitácora | Aprobado |  | `evidencia/CP-52.txt` |
| CP-53 | 2026-10-20 | Stock 6 y QA-V-HOY en "Vencido"; /stock 6; 201; las 5 u salieron de QA-V-OK (queda 1) y QA-V-HOY conserva 4 | Aprobado |  | `evidencia/CP-53.txt` |
| CP-54 | 2026-10-21 | "12 asuntos requieren tu atención hoy. 7 con stock bajo. 4 por vencer. 1 vencidos sin baja."; Stock bajo con QA Omeprazol y QA Salbutamol; Próximos a vencer con QA-F-B y QA-S-30; Dispensaciones hoy 0 (coincide con la base: ninguna desde la medianoche); hasta 8 por panel y 6 entradas recientes; los botones abren Dispensación y Registrar entrada | Aprobado |  | `evidencia/CP-54.png`, `capturas/cap5_panel.png`, `evidencia/CP-54.txt` |
| CP-55 | 2026-10-20 | Con la base vacía, /inventario/alertas devuelve las tres listas vacías y /inventario/entradas vacío; el panel muestra "Todo en orden…" y los cuatro textos de panel vacío (Dashboard.tsx:78, 118, 132, 144, 165) | Aprobado |  | `evidencia/CP-55.txt` |
| CP-56 | 2026-10-20 | 201; DPI parcial → Uno, Dos y Cuatro; "prueba cua" → Cuatro (sin distinguir mayúsculas); "zzz" sin resultados; CREAR en la bitácora | Aprobado |  | `evidencia/CP-56.txt` |
| CP-57 | 2026-10-21 | "El nombre debe tener al menos 3 caracteres"; "El DPI debe tener exactamente 13 dígitos"; el DPI descarta las letras y se corta en 13 dígitos; no se registra nada | Aprobado |  | `evidencia/CP-57.png`, `evidencia/CP-57_b.png`, `evidencia/CP-57.txt` |
| CP-58 | 2026-10-20 | 409 "Ya existe un beneficiario con DPI 0000000000001" al registrar y al editar; no se guardó nada | Aprobado |  | `evidencia/CP-58.txt` |
| CP-59 | 2026-10-21 | "Beneficiario actualizado"; EDITAR con datos anteriores y nuevos; sin opción para desactivar ni eliminar | Aprobado |  | `evidencia/CP-59.png`, `evidencia/CP-59.txt` |
| CP-60 | 2026-10-21 | La dispensación de CP-64 muestra fecha y hora dd/mm/aaaa HH:mm, "Atendido por: Encargado Prueba", "QA Paracetamol" (no el nombre nuevo) y cantidades; qa_encargado ve el mismo historial, incluida una dispensación registrada por qa_admin2 para comprobarlo; nombre restablecido | Aprobado |  | `evidencia/CP-60_a.png`, `evidencia/CP-60_b.png`, `evidencia/CP-60_c.png`, `evidencia/CP-60.txt` |
| CP-61 | 2026-10-21 | Insignias "Evidencia completa" (2), "Parcial" (1) y "Sin evidencia" (2); 5 miniaturas cargadas; la foto se amplía | Aprobado |  | `evidencia/CP-61_a.png`, `evidencia/CP-61_b.png`, `evidencia/CP-61.txt` |
| CP-62 | 2026-10-20 | Sin dispensaciones; 401 sin sesión; 404 "Foto no encontrada"; la ruta /uploads/dispensaciones/… responde 404 | Aprobado |  | `evidencia/CP-62.txt` |
| CP-63 | 2026-10-21 | Dispensaciones recientes (2) y cursor en el campo de código; QA Enalapril con cantidad 1, stock 49 (tras CP-70) y semáforo; resumen con beneficiario, medicamento, 3 unid. y observaciones; "Dispensación registrada correctamente" y pantalla de evidencia; stock 46; DISPENSAR en la bitácora | Aprobado |  | `evidencia/CP-63_a.png`, `evidencia/CP-63_b.png`, `evidencia/CP-63_c.png`, `capturas/cap5_dispensacion.png`, `capturas/cap5_evidencia_qr.png`, `evidencia/CP-63.txt` |
| CP-64 | 2026-10-20 | FIFO: QA-F-A → 0 (AGOTADO), QA-F-B → 7, QA-F-C sin cambio; stock 17; detalles 5 + 3 con snapshots; la API no admite elegir lote | Aprobado |  | `evidencia/CP-64.txt` |
| CP-65 | 2026-10-20 | 409 "Stock insuficiente para QA Metformina. Solicitado: 11, Disponible: 10"; stock 10 sin cambio; sin dispensación ni DISPENSAR nuevos | Aprobado |  | `evidencia/CP-65.txt` |
| CP-66 | 2026-10-20 | 409 "Stock insuficiente para QA Metformina. Solicitado: 11, Disponible: 10"; QA Enalapril conserva su stock (50); no se registró nada | Aprobado |  | `evidencia/CP-66.txt` |
| CP-67 | 2026-10-20 | Una 201 y una 409 "Stock insuficiente para QA Ibuprofeno. Solicitado: 15, Disponible: 5"; ninguna 500; stock final 5; una sola dispensación nueva | Aprobado |  | `evidencia/CP-67.txt` |
| CP-68 | 2026-10-21 | "Seleccione un beneficiario para continuar" con el botón deshabilitado; "Agregue al menos un medicamento"; "Este medicamento ya está en la lista"; "QA Salbutamol no tiene stock disponible"; "No se encontró medicamento con ese código de barras"; la cantidad se ajusta a 50; Cancelar no registra nada | Aprobado |  | `evidencia/CP-68_a.png`, `evidencia/CP-68_b.png`, `evidencia/CP-68.txt` |
| CP-69 | 2026-10-20 | 400, 400, 404 "Medicamento no encontrado o inactivo: <id>", 404 "Beneficiario no encontrado o inactivo" y 400 por items vacío; nada registrado | Aprobado |  | `evidencia/CP-69.txt` |
| CP-70 | 2026-10-21 | "No se encontraron resultados"; "Beneficiario registrado" y queda seleccionado sin dispensaciones recientes; "Dispensación registrada correctamente"; QA Enalapril queda en 49 | Aprobado |  | `evidencia/CP-70_a.png`, `evidencia/CP-70.png`, `evidencia/CP-70.txt` |
| CP-71 | 2026-10-20 | Con desde = hasta = hoy, la de las 10:00 de hoy no aparece y la de las 19:00 de ayer aparece | Fallido | H-45 (esperado) | `evidencia/CP-71.txt` |
| CP-72 | 2026-10-21 | La página abre sin sesión con el nombre del beneficiario, la fecha y los dos botones; "Receta subida" y la ventana B la marca recibida en 1.0 s; "Entrega subida", "Todo listo" y "Puede cerrar esta página."; "Evidencia completa" y "Siguiente dispensación"; archivos .webp y dos CREAR de foto | Aprobado |  | `evidencia/CP-72_a.png`, `evidencia/CP-72_b.png`, `evidencia/CP-72_c.png`, `evidencia/CP-72_d.png`, `evidencia/CP-72.txt` |
| CP-73 | 2026-10-21 | Enlace usado, vencido e inventado: "Enlace inválido o expirado" y "Pida a la encargada que genere un código QR nuevo desde la computadora."; /api/captura/<token>/info → 404 "Enlace inválido o expirado" en los tres | Aprobado |  | `evidencia/CP-73_a.png`, `evidencia/CP-73.png`, `evidencia/CP-73_c.png`, `evidencia/CP-73_curl.txt`, `evidencia/CP-73.txt` |
| CP-74 | 2026-10-20 | 400 por formato, por tamaño y por imagen no válida; la receta sigue pendiente | Aprobado |  | `evidencia/CP-74.txt` |
| CP-75 | 2026-10-20 | Reemplazo correcto: un registro RECETA y un archivo .webp; generar-token en evidencia completa → 409 "La evidencia de esta dispensación ya está completa…" | Aprobado |  | `evidencia/CP-75.txt` |
| CP-76 | 2026-10-21 | "Foto de receta subida" y "Foto de entrega subida"; "Evidencia completa"; en la segunda, "Omitir fotos" detiene la consulta (0 consultas en 7 s) y vuelve al formulario; queda "Sin evidencia" | Aprobado |  | `evidencia/CP-76_a.png`, `evidencia/CP-76_b.png`, `evidencia/CP-76.txt` |
| CP-77 | 2026-10-21 | Simulado sin teléfono: QR decodificado y abierto en un viewport móvil de 390 × 844; página ajustada al ancho con botones de 60 px; el campo tiene capture="environment"; "Receta subida". No se verificó la apertura real de la cámara trasera | Aprobado |  | `evidencia/CP-77_a.png`, `evidencia/CP-77.png`, `evidencia/CP-77_b.png`, `capturas/cap5_captura_celular.png`, `evidencia/CP-77.txt` |
| CP-78 | 2026-10-20 | Mismo token en las dos llamadas, pero 2 registros CREAR de TokenCaptura | Fallido | H-38 (esperado) | `evidencia/CP-78.txt` |
| CP-79 | 2026-10-20 | Dos CREAR a nombre de qa_encargado y sin dirección IP; no hay EDITAR con la foto reemplazada | Fallido | H-35 (esperado) | `evidencia/CP-79.txt` |
| CP-80 | 2026-10-21 | Seis pestañas sin errores y con fechas dd/mm/aaaa; Dispensaciones filtrado: 1 fila(s) de Beneficiario Prueba Uno con QA Paracetamol; Consumo por Analgésico con QA Paracetamol; Inventario actual solo lotes DISPONIBLE de Analgésico; la página 2 no repite filas | Aprobado |  | `evidencia/CP-80_a.png` … `evidencia/CP-80_d.png`, `evidencia/CP-80.txt` |
| CP-81 | 2026-10-20 | La dispensación de las 23:30 de hoy aparece con hasta = hoy y no con hasta = ayer | Aprobado |  | `evidencia/CP-81.txt` |
| CP-82 | 2026-10-20 | Con desde = hoy aparecen la dispensación (Dispensaciones y Consumo) y la entrada de las 19:00 de ayer | Fallido | H-46 (esperado) | `evidencia/CP-82.txt` |
| CP-83 | 2026-10-20 | 400 "Estado inválido…", 400 "El filtro de fecha desde no es una fecha válida…", 400 "El rango de fechas es inválido…"; rango sin datos → lista vacía | Aprobado |  | `evidencia/CP-83.txt` |
| CP-84 | 2026-10-20 | Por vencer: 90 días por defecto (QA-S-90 sí, QA-S-91 no) y 30 días (QA-S-30 sí, QA-S-31 no); Dados de baja: QA-B-API (sustituye a QA-B-1) y QA-V-HOY, con 7 u y costo estimado 6.40 | Aprobado |  | `evidencia/CP-84.txt` |
| CP-85 | 2026-10-21 | 12 descargas con "Reporte exportado"; PDF con logo, nombre de la farmacia, filtros, "Generado:" dd/mm/aaaa HH:mm y "Página X de Y"; Excel con encabezado y filtro automático; 12 CREAR de entidad reporte | Aprobado |  | `evidencia/CP-85_pdf.png`, `evidencia/CP-85_xlsx.png`, `evidencia/CP-85.txt` |
| CP-86 | 2026-10-20 | Sin filtros: 400 "El reporte tiene 5026 registros y el máximo exportable es 5000…"; filtrado por Analgésico: PDF descargado | Aprobado |  | `evidencia/CP-86.txt` |
| CP-87 | 2026-10-20 | 400 por tipo, 400 por formato; PDF de un rango sin datos con "Sin registros para los filtros aplicados." | Aprobado |  | `evidencia/CP-87.txt` |
| CP-88 | 2026-10-20 | 500 "Error interno del servidor" en lugar de 400 | Fallido | H-44 (esperado) | `evidencia/CP-88.txt` |
| CP-89 | 2026-10-21 | Del más reciente al más antiguo, 20 por página; solo DISPENSAR de qa_encargado; "DISPENSACION" en mayúsculas da los mismos 12 registros; el EDITAR muestra datos anteriores y nuevos y la contraseña como ***restablecida*** | Aprobado |  | `evidencia/CP-89_a.png`, `evidencia/CP-89_b.png`, `evidencia/CP-89_c.png`, `evidencia/CP-89.txt` |
| CP-90 | 2026-10-20 | 400 "accion inválida. Use: …"; LOGOUT sin resultados; 400 "El filtro de fecha desde no es una fecha válida (use AAAA-MM-DD)" | Aprobado |  | `evidencia/CP-90.txt` |
| CP-91 | 2026-10-20 | Con desde = hoy aparece el registro de las 19:00 de ayer | Fallido | H-46 (esperado) | `evidencia/CP-91.txt` |
| CP-92 | 2026-10-20 | 12 registros DISPENSAR = 12 dispensaciones; DELETE y PUT sobre /api/auditoria/<id> → 404 | Aprobado |  | `evidencia/CP-92.txt` |



## Defectos nuevos de la ejecución

Ninguno en los 52 casos API: sus 13 fallos corresponden a hallazgos ya registrados. En los 40 casos UI y
DISPOSITIVO se encontraron tres defectos nuevos, todos de severidad Baja según `plan_pruebas.md`,
sección 7. Se anotaron primero como DP-01 a DP-03 y se registraron el 2026-10-21 en
`analisis/hallazgos_defectos.md` como H-53 a H-55, con su corrección en
`analisis/12_plan_correcciones.md` ("Después del 24/10"). H-53 y H-54 se clasifican como
**observación de diseño de la prueba**: la validación del navegador (`required`, `min=1`, botón
deshabilitado) impide el dato inválido antes del mensaje del sistema, y el comportamiento protege
igual. H-55 es un registro innecesario en la bitácora (null → "").

| ID | Casos | Severidad | Descripción | Evidencia |
|----|-------|-----------|-------------|-----------|
| H-53 | CP-19, CP-36 | Baja | Los avisos propios de la aplicación "Seleccione una categoría" (`MedicamentoFormModal.tsx`, `guardar`) y "La cantidad debe ser mayor a 0" (`Entradas.tsx`, `submit`) nunca se muestran: el selector de categoría tiene `required` y el campo de cantidad tiene `min={1}`, así que el navegador detiene el envío con su propio mensaje ("Selecciona un elemento de la lista", "El valor debe ser superior o igual a 1") antes de que corra la validación de la aplicación. No se registra nada, pero el mensaje no es el documentado y el código de esos avisos no se alcanza | `evidencia/CP-19.png`, `evidencia/CP-36_b.png` |
| H-54 | CP-41 | Baja | En "Importar desde Excel" el botón "Importar" está deshabilitado mientras no hay archivo (`disabled={!archivoImport \|\| importando}`), por lo que el aviso "Seleccione un archivo .xlsx" de `subirExcel` no se puede mostrar. La acción queda impedida; la diferencia es con el resultado documentado | `evidencia/CP-41_a.png` |
| H-55 | CP-20 | Baja | Al editar un medicamento sin nombre comercial desde la pantalla, el formulario envía `nombreComercial: ""` y el servidor lo compara contra `null`: el primer `EDITAR` registra `nombreComercial` (null → "") además del campo realmente cambiado, y el valor queda guardado como cadena vacía en lugar de `null` | `evidencia/CP-20.txt`, `evidencia/CP-20_b.png` |

Para H-53 y H-54 hay dos salidas: ajustar la interfaz para que muestre el mensaje documentado o
corregir el resultado esperado de los casos; la decisión corresponde al responsable de pruebas y queda
planificada en `analisis/12_plan_correcciones.md`.

## Observaciones de la ejecución

- **CP-49:** falla por H-43 como se esperaba, con una diferencia menor respecto de la descripción del
  caso: con `pageSize=x` la respuesta trae `page: 1` (no `null`); `pageSize` y `totalPages` sí son
  `null`.
- **CP-50 (pendiente, UI):** el resultado esperado dice que el stock de QA Cetirizina baja a 0, pero con
  los datos de `datos_prueba.md` queda QA-B-2 (5 unidades) disponible, así que el stock debe quedar en
  5. Es un error del caso, no del sistema; ver `guia_ejecucion_manual.md`, sección 4.
- **CP-84:** el paso 3 se verificó con el lote QA-B-API (dado de baja por la API) en lugar de QA-B-1,
  cuya baja es el caso UI CP-50.
- **CP-86:** la exportación sin filtros informa 5026 registros (los 5001 de QA Carga más los demás
  lotes de la base).
- **Casos UI con datos alterados por la ejecución API:** CP-44 (QA Paracetamol con 17 unidades tras
  CP-64), CP-54, CP-61 y CP-63. La guía manual indica el resultado esperado con el estado actual.
- **CP-50:** se ejecutó con el resultado esperado ya corregido en `casos_prueba.md` (el stock de
  QA Cetirizina queda en 5); la observación anterior queda resuelta.
- **Ejecución de los casos UI (2026-10-21):** Playwright sin interfaz contra la aplicación en Docker,
  con tres contextos de navegador separados (ventana A = `qa_admin2`, B = `qa_encargado`,
  C = sin sesión o tamaño de teléfono). Las contraseñas de las cuentas QA se restablecieron por la API
  con un Administrador antes de empezar y no se escribieron en ningún archivo; las sesiones se
  reutilizaron para no superar el límite de inicios de sesión, y la API se reinició antes de CP-02,
  CP-07 y CP-01, como pide la guía. Donde la guía pide F12 o `curl` con el token, las peticiones se
  hicieron desde la sesión del navegador y el token no se registró.
- **Mensajes de validación del navegador:** el Chromium de la imagen corre en inglés, así que en
  CP-19 y CP-36 el mensaje nativo aparece como "Please select an item in the list." y "Value must be
  greater than or equal to 1."; en un navegador en español es el equivalente traducido.
- **CP-01:** el inicio de sesión exitoso se registra como `LOGIN` sin datos nuevos; no lleva
  `exito: true` como dice `casos_prueba.md` (la guía ya no lo pide). Solo los fallidos llevan
  `{"exito": false, …}`. Se dio por aprobado.
- **CP-02:** el usuario inexistente no se repitió desde la pantalla; ya se verificó por la API en CP-04.
  En la bitácora aparecen cuatro `LOGIN` fallidos de `qa_encargado`: dos de CP-02 y dos de CP-07.
- **CP-06:** se ejecutó dos veces; en la primera el script no alcanzó a leer el cuerpo del 401 antes de
  la redirección (falla del script, no del sistema).
- **CP-21:** el código de `datos_prueba.md` (00303789205353) ya no tiene datos en OpenFDA: la consulta
  directa a `api.fda.gov` del NDC 0378-9205-35 responde 404 "No matches found!". La función se
  verificó con el código vigente 00342291936904 (Sucralfate, NDC 42291-936-90), armado con la misma
  regla. Conviene actualizar el código en `datos_prueba.md`.
- **CP-46:** con 17 medicamentos activos la lista cabe en una página; el regreso a la página 1 al marcar
  "Solo stock bajo" no se pudo observar.
- **CP-60:** ninguna dispensación de Beneficiario Prueba Uno era de otro usuario, así que `qa_admin2`
  registró una (1 u de QA Enalapril) para comprobar que `qa_encargado` ve las de otros usuarios.
- **CP-77:** simulado, sin teléfono físico (ver "Datos del ciclo"). Se verificó que el código QR lleva a
  la página de captura, que la página se ajusta al ancho de 390 px con botones de 60 px, que el campo
  de archivo tiene `capture="environment"` y que la receta se sube. **No se verificó** que la cámara
  trasera se abra en un teléfono real: la prueba con dispositivo sigue pendiente (RNF-26). La figura
  `capturas/cap5_captura_celular.png` sale de esta simulación.
- **CP-85:** en un primer intento la exportación de Entradas con desde = ayer respondió 400 "El reporte
  tiene 5011 registros y el máximo exportable es 5000…" (límite de CP-86, por la carga de QA Carga);
  se repitió todo el caso con Entradas filtrado desde hoy. Esos 8 `CREAR` previos de reporte también
  están en la bitácora. Los 12 archivos se revisaron con pdf.js y exceljs y no se agregan al
  repositorio. Los filtros del PDF muestran el id del beneficiario o la categoría, no su nombre.
- **Datos que dejó la ejecución UI:** medicamentos QA Diclofenaco (con foto), Paracetamol (sin lotes)
  y QA Clotrimazol; categoría QA Antisépticos; ubicación QA-02; lotes QA-E-1, QA-E-2 y QA-CL-1;
  Beneficiario Prueba Cinco; siete dispensaciones de QA Enalapril (CP-63, CP-70, CP-73, dos de CP-76,
  CP-77 y CP-60; queda en 41 unidades); contraseña nueva de `qa_nuevo` (CP-12).
- **Figuras del capítulo V:** `cap5_panel.png` se tomó con la ventana a 1366 × 1500 y
  `cap5_existencias_semaforo.png` a 1366 × 1400 para que entren el panel completo y las 16 filas
  de la búsqueda "QA"; las otras dos de escritorio, a 1366 × 768.

## Regresión final

Ejecutada el 2026-10-21 a las 08:14 (hora de Guatemala), al terminar los 92 casos, con el comando de
`plan_pruebas.md`, sección 3.2, dentro del contenedor `farmag_api` (commit `bdf1187`,
`TZ=America/Guatemala`):

```
docker compose exec -T api sh -c 'cd /app && npm test'
```

- **Resultado:** 53 pruebas, 53 aprobadas, 0 fallidas, 0 canceladas, 0 omitidas (≈9,4 s).
- **Datos QA del ciclo:** antes de ejecutar se revisaron las limpiezas de `backend/tests/`: cada prueba
  borra solo los registros que crea (medicamentos `QA_RUTAS_<sufijo>`, `QA_TEST_CRON_…`,
  `QA_TEST_VENC_…`, `QA_STOCK_<sufijo>`, ubicaciones `QA-UBI-<sufijo>`, sus lotes, entradas,
  beneficiarios, dispensaciones, tokens y registros de auditoría, por id), y `seed.test.ts` usa una base
  temporal propia. No borran los datos QA de las pruebas funcionales, por lo que no se hizo respaldo
  previo. Tampoco había lotes `DISPONIBLE` con vencimiento hoy o anterior que `marcarLotesVencidos`
  pudiera cambiar. Comprobación antes y después: 5029 lotes `QA-%`, 18 medicamentos y 5178 registros
  de auditoría, sin cambios; 0 medicamentos `QA_%` remanentes de las pruebas.

## Resumen del ciclo

Ciclo 1 completo: los 92 casos se ejecutaron, 52 por la API el 2026-10-20 y 40 en la interfaz el
2026-10-21 (39 UI y CP-77, simulado).

**Por caso de uso**

| Caso de uso | Casos | API | UI y dispositivo | Aprobados | Fallidos | Fallidos por hallazgo ya registrado | Fallidos por defecto nuevo | Bloqueados |
|-------------|------:|----:|-----------------:|----------:|---------:|------------------------------------:|---------------------------:|-----------:|
| CU-01 Iniciar y cerrar sesión | 8 | 3 | 5 | 6 | 2 | 2 | 0 | 0 |
| CU-02 Gestionar usuarios | 8 | 6 | 2 | 7 | 1 | 1 | 0 | 0 |
| CU-03 Gestionar medicamentos | 7 | 1 | 6 | 5 | 2 | 0 | 2 | 0 |
| CU-04 Gestionar códigos de barras | 3 | 2 | 1 | 2 | 1 | 1 | 0 | 0 |
| CU-05 Gestionar categorías | 3 | 2 | 1 | 2 | 1 | 1 | 0 | 0 |
| CU-06 Gestionar ubicaciones | 3 | 2 | 1 | 2 | 1 | 1 | 0 | 0 |
| CU-07 Registrar entrada de medicamentos | 6 | 2 | 4 | 5 | 1 | 0 | 1 | 0 |
| CU-08 Importar inventario desde Excel | 5 | 4 | 1 | 3 | 2 | 1 | 1 | 0 |
| CU-09 Consultar inventario | 6 | 4 | 2 | 5 | 1 | 1 | 0 | 0 |
| CU-10 Dar de baja lote | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 |
| CU-11 Actualizar lotes vencidos | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 0 |
| CU-12 Consultar panel de alertas | 2 | 1 | 1 | 2 | 0 | 0 | 0 | 0 |
| CU-13 Gestionar beneficiarios | 4 | 2 | 2 | 4 | 0 | 0 | 0 | 0 |
| CU-14 Consultar historial de beneficiario | 3 | 1 | 2 | 3 | 0 | 0 | 0 | 0 |
| CU-15 Dispensar medicamentos | 9 | 6 | 3 | 8 | 1 | 1 | 0 | 0 |
| CU-16 Registrar evidencia fotográfica | 8 | 4 | 4 | 6 | 2 | 2 | 0 | 0 |
| CU-17 Consultar reportes | 5 | 4 | 1 | 4 | 1 | 1 | 0 | 0 |
| CU-18 Exportar reportes | 4 | 3 | 1 | 3 | 1 | 1 | 0 | 0 |
| CU-19 Consultar bitácora de auditoría | 4 | 3 | 1 | 3 | 1 | 1 | 0 | 0 |
| **Total** | **92** | **52** | **40** | **74** | **18** | **14** | **4** | **0** |

Fuente: Elaboración propia a partir de la tabla "Registro".

**Por prioridad**

| Prioridad | Casos | API | UI y dispositivo | Aprobados | Fallidos | Fallidos por hallazgo ya registrado | Fallidos por defecto nuevo | Bloqueados |
|-----------|------:|----:|-----------------:|----------:|---------:|------------------------------------:|---------------------------:|-----------:|
| Alta | 38 | 20 | 18 | 36 | 2 | 2 | 0 | 0 |
| Media | 40 | 20 | 20 | 33 | 7 | 3 | 4 | 0 |
| Baja | 14 | 12 | 2 | 5 | 9 | 9 | 0 | 0 |
| **Total** | **92** | **52** | **40** | **74** | **18** | **14** | **4** | **0** |

Fuente: Elaboración propia a partir de la tabla "Registro".

- Fallidos por hallazgo ya registrado (14): CP-07 (H-47), CP-08 (H-10), CP-16 (H-15), CP-26 (H-31), CP-29 (H-42), CP-32 (H-42), CP-43 (H-48), CP-49 (H-43), CP-71 (H-45), CP-78 (H-38), CP-79 (H-35), CP-82 (H-46), CP-88 (H-44), CP-91 (H-46). Son los 14
  casos que `casos_prueba.md` ya preveía fallidos; ninguno falló de forma inesperada.
- Fallidos por defecto nuevo (4): CP-19 (H-53), CP-20 (H-55), CP-36 (H-53), CP-41 (H-54). Ver "Defectos nuevos
  de la ejecución".
- Bloqueados: ninguno. CP-77 se ejecutó simulado (ver "Observaciones").

**Criterios de salida (`plan_pruebas.md`, sección 6)**

El requisito de firmas del criterio 6 se eliminó el 2026-10-21: no aplica a este proyecto, cuyo
registro es un documento de trabajo del repositorio.

| # | Criterio | ¿Se cumple? | Detalle |
|---|----------|-------------|---------|
| 1 | 100 % de los casos Alta y al menos 90 % de los Media ejecutados | Sí | Alta 38 de 38 (100 %); Media 40 de 40 (100 %); Baja 14 de 14 |
| 2 | Ningún defecto Crítico ni Alto abierto que no corresponda a un hallazgo registrado con su corrección planificada | Sí | Los dos fallos de prioridad Alta (CP-82 y CP-91) son H-46, con corrección planificada en el lote 1 de `analisis/12_plan_correcciones.md`; los tres defectos nuevos (H-53 a H-55) son de severidad Baja |
| 3 | Todo caso Fallido con un defecto asociado (H-XX existente o uno nuevo en `analisis/hallazgos_defectos.md`) | Sí | Los 18 fallidos tienen hallazgo: 14 ya registrados y 4 con los nuevos H-53, H-54 y H-55, dados de alta en `analisis/hallazgos_defectos.md` y planificados en `analisis/12_plan_correcciones.md` |
| 4 | Casos Bloqueados con la causa anotada | Sí | No hay casos bloqueados |
| 5 | `npm test` aprueba las 53 pruebas al terminar el ciclo | Sí | 53 de 53 el 2026-10-21 (ver "Regresión final") |
| 6 | Registro completo | Sí | Los 92 casos tienen fecha, resultado, estado y evidencia |

**Conclusión:** se cumplen los seis criterios de salida del ciclo 1. Quedan fuera de los criterios,
como pendientes: la prueba de CP-77 con un teléfono real (se ejecutó simulado) y la corrección de los
hallazgos según `analisis/12_plan_correcciones.md`, cuyos casos se volverán a ejecutar al corregirse.
