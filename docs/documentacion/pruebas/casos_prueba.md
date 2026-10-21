# Casos de prueba funcionales de FarmaG

> Derivados de los casos de uso CU-01 a CU-19 (`capitulos/04_requerimientos.md`, sección 4.6) y de las
> reglas de `analisis/06_reglas_negocio.md`. Los resultados esperados describen el comportamiento del
> commit `bdf1187`: los mensajes entre comillas son los textos exactos del código. Plan:
> `plan_pruebas.md`; datos: `datos_prueba.md`; registro: `registro_ejecucion.md`.

## Convenciones

- **Tipo:** (+) caso positivo, del flujo normal; (−) caso negativo, de un flujo alternativo o de una
  entrada inválida.
- **Hallazgo abierto H-XX:** el resultado esperado es el comportamiento correcto según
  `analisis/12_plan_correcciones.md`. **Se espera que el caso falle** en `bdf1187` hasta que se corrija
  el hallazgo; en la columna se indica también lo que ocurre hoy.
- **Usuarios:** `admin` (Administrador del seed), `qa_admin2` (Administrador), `qa_encargado` y
  `qa_temporal` (Encargado de Beneficencia). Los nombres de medicamentos (QA …), lotes (QA-…),
  beneficiarios y archivos son los de `datos_prueba.md`.
- **Fechas:** "hoy" es el día de ejecución en hora de Guatemala; "hoy + N" son N días después.
- **API:** `curl` contra `http://localhost:3000/api` con la cabecera `Authorization: Bearer <token>`
  del usuario indicado. `<token_adm>` y `<token_enc>` son los tokens de `admin` y `qa_encargado`,
  obtenidos con `POST /api/auth/login`.
- Toda operación de escritura debe dejar su registro en la bitácora (RF-54, RN-69); cuando un caso lo
  verifica, se consulta en Auditoría o con `GET /api/auditoria`.

## Resumen

| CU | Casos | Alta | Media | Baja | Esperados fallidos |
|----|------:|-----:|------:|-----:|--------------------|
| CU-01 Iniciar y cerrar sesión | 8 | 4 | 2 | 2 | CP-07 (H-47), CP-08 (H-10) |
| CU-02 Gestionar usuarios | 8 | 4 | 4 | 0 | CP-16 (H-15) |
| CU-03 Gestionar medicamentos | 7 | 2 | 3 | 2 | — |
| CU-04 Gestionar códigos de barras | 3 | 1 | 1 | 1 | CP-26 (H-31) |
| CU-05 Gestionar categorías | 3 | 0 | 2 | 1 | CP-29 (H-42) |
| CU-06 Gestionar ubicaciones | 3 | 0 | 2 | 1 | CP-32 (H-42) |
| CU-07 Registrar entrada de medicamentos | 6 | 2 | 4 | 0 | — |
| CU-08 Importar inventario desde Excel | 5 | 2 | 2 | 1 | CP-43 (H-48) |
| CU-09 Consultar inventario | 6 | 3 | 1 | 2 | CP-49 (H-43) |
| CU-10 Dar de baja lote | 2 | 1 | 1 | 0 | — |
| CU-11 Actualizar lotes vencidos | 2 | 2 | 0 | 0 | — |
| CU-12 Consultar panel de alertas | 2 | 0 | 1 | 1 | — |
| CU-13 Gestionar beneficiarios | 4 | 3 | 1 | 0 | — |
| CU-14 Consultar historial de beneficiario | 3 | 1 | 2 | 0 | — |
| CU-15 Dispensar medicamentos | 9 | 5 | 4 | 0 | CP-71 (H-45) |
| CU-16 Registrar evidencia fotográfica | 8 | 2 | 5 | 1 | CP-78 (H-38), CP-79 (H-35) |
| CU-17 Consultar reportes | 5 | 3 | 2 | 0 | CP-82 (H-46) |
| CU-18 Exportar reportes | 4 | 1 | 1 | 2 | CP-88 (H-44) |
| CU-19 Consultar bitácora de auditoría | 4 | 2 | 2 | 0 | CP-91 (H-46) |
| **Total** | **92** | **38** | **40** | **14** | **14** |

Fuente: Elaboración propia.

---

## CU-01 Iniciar y cerrar sesión

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-01 (+) | CU-01 | RF-01, RF-03, RN-56, RN-69 | Alta | Sin sesión en el navegador. Cuenta `admin` activa | Usuario `admin` y su contraseña | 1. Abrir `http://localhost:5173`. 2. Escribir usuario y contraseña y pulsar "Iniciar sesión". 3. Revisar el menú. 4. Como `admin`, abrir Auditoría y filtrar acción `LOGIN` | Se muestra "Bienvenido al sistema" y el panel. El menú incluye Usuarios, Reportes y Auditoría. En la bitácora hay un registro `LOGIN` de `admin` con `exito: true`. `localStorage` contiene `farmag_token` |
| CP-02 (−) | CU-01 | RF-01, RN-56, RN-69 | Alta | Sin sesión. API recién reiniciada (`docker compose restart api`) | Usuario `qa_encargado`, contraseña incorrecta `Incorrecta1` | 1. Iniciar sesión con la contraseña incorrecta. 2. Repetir la petición con `curl -X POST /api/auth/login -H "Content-Type: application/json" -d '{"username":"qa_encargado","password":"Incorrecta2"}'`. 3. Revisar la bitácora como `admin` | Paso 1: la pantalla muestra "Credenciales inválidas" y sigue en el inicio de sesión. Paso 2: 401 con `{"error":"Credenciales inválidas","intentosRestantes":1}`. En la bitácora hay dos registros `LOGIN` de `qa_encargado` con `exito: false`. Un usuario inexistente recibe el mismo mensaje y no se registra en la bitácora |
| CP-03 (−) | CU-01 | RF-02, RN-72, RNF-04 | Alta | API recién reiniciada | Usuario `qa_temporal`, contraseña incorrecta y luego la correcta | 1. Enviar tres inicios de sesión con contraseña incorrecta desde la misma computadora. 2. Enviar un cuarto con la contraseña correcta. 3. Esperar 5 minutos e intentar de nuevo con la correcta | Intentos 1 y 2: "Credenciales inválidas" (401). Intento 3: 429 "Demasiados intentos fallidos. Intente de nuevo en 5 minuto(s)." con cabecera `Retry-After`. Intento 4: 429 con el mismo mensaje, sin verificar la contraseña. Paso 3: inicia sesión correctamente |
| CP-04 (−) | CU-01 | RF-02, RN-72 | Media | API recién reiniciada. Ejecutar al final de la sesión de pruebas | 21 peticiones con usuarios inexistentes `noexiste01` … `noexiste21` | 1. Enviar con `curl` 21 peticiones de inicio de sesión seguidas desde la misma IP. 2. Enviar una más con `admin` y su contraseña correcta | Peticiones 1 a 20: 401 "Credenciales inválidas". Petición 21 y la del paso 2: 429 "Demasiadas solicitudes de inicio de sesión desde esta red. Intente de nuevo más tarde." con `Retry-After`. Tras `docker compose restart api` se puede volver a iniciar sesión |
| CP-05 (+) | CU-01 | RF-04, RNF-02, RN-57 | Media | Sesión iniciada como `qa_encargado` | — | 1. Pulsar "Cerrar sesión". 2. Escribir en la barra `http://localhost:5173/inventario`. 3. `curl /api/inventario` sin cabecera `Authorization` | Paso 1: se muestra el inicio de sesión y `localStorage` ya no tiene `farmag_token` ni `farmag_usuario`. Paso 2: redirige a `/login`. Paso 3: 401 "Token de autenticación requerido" |
| CP-06 (−) | CU-01, CU-02 | RF-03, RN-61, RN-73, RNF-05 | Alta | `qa_temporal` con sesión abierta en un navegador; `admin` con sesión en otro | — | 1. Como `admin`, desactivar `qa_temporal` en Usuarios. 2. En el navegador de `qa_temporal`, abrir Inventario. 3. Intentar iniciar sesión otra vez como `qa_temporal`. 4. Reactivar `qa_temporal` | Paso 2: la petición recibe 401 "La cuenta ya no está activa. Inicie sesión nuevamente."; el sistema borra la sesión y muestra el inicio de sesión. Paso 3: "Credenciales inválidas". Paso 4: "Usuario activado" |
| CP-07 (−) | CU-01 | RN-56, RN-72 | Baja | API recién reiniciada. **Hallazgo abierto H-47** | Usuario `qa_encargado`, contraseña incorrecta | 1. Fallar dos veces el inicio de sesión desde la pantalla | Esperado tras la corrección: la pantalla muestra los intentos restantes ("Le quedan 2 intento(s)…" y luego 1). **Hoy falla:** solo muestra "Credenciales inválidas", aunque la API devuelve `intentosRestantes` |
| CP-08 (−) | CU-01 | RF-54, RN-69 | Baja | Sesión iniciada como `qa_encargado`. **Hallazgo abierto H-10** | — | 1. Pulsar "Cerrar sesión". 2. Como `admin`, `GET /api/auditoria?accion=LOGOUT` | Esperado tras la corrección: un registro `LOGOUT` de `qa_encargado`. **Hoy falla:** el cierre no se registra (CU-01, postcondiciones) y la consulta no devuelve registros |

Fuente: Elaboración propia.

## CU-02 Gestionar usuarios

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-09 (+) | CU-02 | RF-05, RN-58, RNF-01 | Alta | Sesión como `admin` | Usuario `qa_nuevo`, nombre "Usuario Prueba Nuevo", correo `qa_nuevo@example.com`, contraseña de 8 caracteres, rol Encargado de Beneficencia | 1. Abrir Usuarios y pulsar "Nuevo usuario". 2. Llenar los datos y guardar. 3. `GET /api/usuarios` con `<token_adm>` | "Usuario creado"; la lista muestra `qa_nuevo` activo con su rol. La respuesta de la API no incluye la contraseña ni su hash. En la bitácora hay `CREAR` de entidad usuario |
| CP-10 (−) | CU-02 | RF-05, RN-58 | Media | Sesión como `admin`. Existe `qa_encargado` | Usuario `qa_encargado` (repetido) | 1. Crear un usuario con el nombre `qa_encargado` | "El nombre de usuario ya existe" (409); no se crea ningún usuario |
| CP-11 (−) | CU-02 | RF-05, RF-07, RN-58, RN-60 | Media | Sesión como `admin` | Contraseña `12345`; petición sin `rol`; rol `SUPERUSUARIO` | 1. Crear usuario con contraseña `12345`. 2. Restablecer la contraseña de `qa_nuevo` con `12345`. 3. `POST /api/usuarios` sin `rol`. 4. `POST /api/usuarios` con `"rol":"SUPERUSUARIO"` | Pasos 1 y 2: "La contraseña debe tener al menos 6 caracteres". Paso 3: 400 "Campos requeridos: username, password, nombreCompleto, rol". Paso 4: 400 "Rol inválido" |
| CP-12 (+) | CU-02 | RF-06, RF-07, RF-03, RN-59, RN-73 | Media | Sesión como `admin`; `qa_nuevo` con sesión abierta en otro navegador | Rol nuevo Administrador; contraseña nueva de 8 caracteres | 1. Editar `qa_nuevo`: cambiar el rol a Administrador y guardar. 2. En el navegador de `qa_nuevo`, recargar la página. 3. Volver el rol a Encargado. 4. Restablecer la contraseña de `qa_nuevo` e iniciar sesión con ella | Paso 1: "Usuario actualizado" y `EDITAR` en la bitácora con datos anteriores y nuevos. Paso 2: `qa_nuevo` ve las opciones de Administrador sin volver a iniciar sesión. Paso 4: "Contraseña actualizada"; el inicio de sesión funciona con la nueva y la bitácora no guarda la contraseña |
| CP-13 (−) | CU-02 | RF-06, RF-08, RN-59, RN-61 | Alta | Sesión como `admin` | Fila del propio `admin` | 1. Editar al propio `admin` y cambiar su rol a Encargado. 2. Pulsar el botón de estado del propio `admin` | Paso 1: "No puede cambiar su propio rol de administrador" (400). Paso 2: "No puede desactivar su propia cuenta" (400). La cuenta sigue activa y con rol Administrador |
| CP-14 (+) | CU-02 | RF-08, RN-61 | Alta | Sesión como `admin`; `qa_nuevo` activo | — | 1. Pulsar el botón de estado de `qa_nuevo`. 2. Intentar iniciar sesión como `qa_nuevo`. 3. Volver a pulsar el botón de estado | Paso 1: "Usuario desactivado"; `DESACTIVAR` en la bitácora; el usuario sigue en la lista como inactivo. Paso 2: "Credenciales inválidas". Paso 3: "Usuario activado" y `ACTIVAR` en la bitácora |
| CP-15 (−) | CU-02, CU-03, CU-04, CU-05, CU-08, CU-10, CU-17, CU-18, CU-19 | RF-03, RNF-03, RN-05, RN-43, RN-53, RN-57, RN-67, RN-70 | Alta | Sesión como `qa_encargado` | Lote QA-B-1; medicamento QA Enalapril | 1. Revisar el menú. 2. Escribir en la barra `/usuarios`, `/auditoria` y `/reportes`. 3. En Catálogos, revisar las tres pestañas. 4. En Registrar entrada, buscar "Importar desde Excel". 5. En el detalle de inventario de QA Cetirizina, buscar "Dar de baja". 6. Con `<token_enc>`: `GET /api/usuarios`, `POST /api/catalogos/categorias`, `PUT /api/inventario/lotes/<id QA-B-1>/baja`, `POST /api/inventario/importar-excel`, `GET /api/reportes/exportar/inventario/pdf`, `GET /api/auditoria`, `PUT /api/inventario/configuracion` | Paso 1: el menú no muestra Usuarios, Reportes ni Auditoría. Paso 2: cada ruta redirige al panel. Pasos 3 a 5: no hay botones de crear, editar, activar o desactivar, agregar o eliminar códigos, importar ni dar de baja. Paso 6: todas responden 403 "No tiene permisos para esta acción" y no cambia ningún dato. Los `GET /api/reportes/<tipo>` responden 200 por diseño (RN-66) |
| CP-16 (−) | CU-02 | RF-05, RN-58 | Media | Sesión como `admin`. **Hallazgo abierto H-15** | Correo `qa_nuevo@example.com`, ya usado por `qa_nuevo` | 1. Crear el usuario `qa_otro` con el correo de `qa_nuevo` | Esperado tras la corrección: 409 con un mensaje de correo duplicado y sin usuario creado. **Hoy falla:** responde 500 "Error interno del servidor" (CU-02, flujo alternativo) |

Fuente: Elaboración propia.

## CU-03 Gestionar medicamentos

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-17 (+) | CU-03, CU-07 | RF-09, RF-20, RN-27, RN-43 | Alta | Sesión como `admin`. Categoría Analgésico activa | Medicamento QA Diclofenaco, Tableta, 50 mg, unidad Tableta, categoría Analgésico | 1. En Registrar entrada, pulsar "Nuevo medicamento" junto al lote 1. 2. Revisar el stock mínimo. 3. Llenar los datos y guardar | Paso 2: el stock mínimo propuesto es 10. Paso 3: "Medicamento creado"; el medicamento queda seleccionado en el lote 1 y aparece en la pestaña Medicamentos del catálogo; `CREAR` en la bitácora |
| CP-18 (−) | CU-03 | RF-10, RN-44 | Media | Sesión como `admin`. Existe QA Paracetamol, Tableta, 500 mg | Nombre "Paracetamol", Tableta, 500 mg | 1. Registrar un medicamento nuevo con esos datos. 2. Pulsar "Revisar de nuevo". 3. Guardar otra vez y pulsar "Crear de todos modos" | Paso 1: diálogo "Posibles duplicados" con "Se encontraron medicamentos similares. Revisa antes de continuar o confirma el registro." y QA Paracetamol en la lista; no se crea nada. Paso 2: vuelve al formulario con los datos. Paso 3: "Medicamento creado" |
| CP-19 (−) | CU-03 | RF-09, RN-43 | Media | Sesión como `admin` | Formulario sin categoría; petición con `categoriaId` inexistente; petición con `nombreGenerico` de 1 carácter | 1. Guardar el formulario sin elegir categoría. 2. `POST /api/catalogos/medicamentos` con un `categoriaId` que no existe. 3. `POST` con `"nombreGenerico":"A"` | Paso 1: "Seleccione una categoría". Paso 2: 400 "La categoría especificada no existe". Paso 3: 400 "Datos inválidos". No se crea ningún medicamento |
| CP-20 (+) | CU-03 | RF-12, RF-13, RN-45, RN-49, RN-77 | Media | Sesión como `admin` | QA Diclofenaco; nuevo stock mínimo 15; archivo `foto_medicamento.jpg` | 1. En Catálogos > Medicamentos, editar QA Diclofenaco, cambiar el stock mínimo y guardar. 2. Editar de nuevo, pulsar "Subir foto" y elegir el archivo. 3. Editar y guardar sin cambiar nada | Paso 1: "Medicamento actualizado" y `EDITAR` en la bitácora solo con el campo cambiado. Paso 2: "Foto actualizada"; la vista previa muestra la foto y el archivo guardado en `backend/uploads/medicamentos/` es `.webp`. Paso 3: la API responde "No hubo cambios que aplicar" y no registra `EDITAR` |
| CP-21 (+) | CU-03 | RF-11, RN-48, RNF-44 | Baja | Sesión como `admin`. Equipo con internet | Código `00303789205353` (Sucralfato, verificado el 2026-08-04); código `7790000000011` (ya registrado); código `7790000000099` (no registrado ni en OpenFDA) | 1. En "Nuevo medicamento", escribir `00303789205353` y pulsar Enter. 2. Repetir con `7790000000011`. 3. Repetir con `7790000000099` | Paso 1: el formulario se llena y se muestra "Datos sugeridos por OpenFDA — verifique antes de guardar". Paso 2: "Este medicamento ya está registrado: QA Paracetamol" y no se consulta OpenFDA. Paso 3: "No se encontraron datos en OpenFDA para este código. Complete el formulario manualmente." |
| CP-22 (−) | CU-03 | RF-13, RN-49, RN-77 | Baja | Sesión como `admin` | `documento.pdf`, `grande.jpg` (más de 5 MB), `falso.jpg` (texto con extensión .jpg) | 1. Subir cada archivo como foto de QA Diclofenaco | "Formato de imagen no permitido. Use JPG, PNG o WEBP", "El archivo supera el tamaño máximo permitido" y "El archivo no es una imagen válida" (400), respectivamente. La foto anterior no cambia |
| CP-23 (+) | CU-03 | RF-12, RN-63 | Alta | Sesión como `admin`. QA Diclofenaco activo | — | 1. Pulsar el botón de estado de QA Diclofenaco. 2. Revisar el selector de Registrar entrada, la búsqueda de Dispensación y la lista de Inventario. 3. Reactivarlo | Paso 1: "Medicamento desactivado"; sigue en el catálogo como inactivo; `EDITAR` en la bitácora. Paso 2: no aparece en ninguno de los tres. Paso 3: "Medicamento activado" y vuelve a aparecer |

Fuente: Elaboración propia.

## CU-04 Gestionar códigos de barras

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-24 (+) | CU-04 | RF-14, RF-15, RN-46, RN-47 | Alta | Sesión como `admin` | QA Diclofenaco; código `  7790000000042  ` (con espacios) y descripción "Caja x 20" | 1. Pulsar el contador de códigos de QA Diclofenaco. 2. Escribir el código y la descripción y pulsar "Agregar". 3. `GET /api/catalogos/medicamentos/barcode/7790000000042`. 4. Eliminar el código | Paso 2: "Código de barras registrado"; la lista muestra `7790000000042` sin espacios; `CREAR` en la bitácora. Paso 3: 200 con el medicamento y su stock dispensable. Paso 4: el código desaparece; `ELIMINAR` en la bitácora; el paso 3 repetido da 404 "Código de barras no registrado" |
| CP-25 (−) | CU-04 | RF-14, RN-46 | Media | Sesión como `admin`. `7790000000011` pertenece a QA Paracetamol | Código `7790000000011`; campo vacío | 1. Agregar `7790000000011` a QA Diclofenaco. 2. Pulsar "Agregar" con el campo vacío | Paso 1: "Este código de barras ya está registrado en otro medicamento" (409); no se vincula. Paso 2: "Escanee o escriba un código de barras" |
| CP-26 (−) | CU-04 | RN-46 | Baja | Sesión como `admin`. **Hallazgo abierto H-31** | Código `7790000000011` | 1. Agregar `7790000000011` a QA Paracetamol, que ya lo tiene | Esperado tras la corrección: 409 "Este código ya está registrado en este medicamento". **Hoy falla:** 409 "Este código de barras ya está registrado en otro medicamento" |

Fuente: Elaboración propia.

## CU-05 Gestionar categorías

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-27 (+) | CU-05 | RF-16, RN-50, RN-63 | Media | Sesión como `admin` | Categoría "QA Antiséptico", descripción "Prueba"; nombre nuevo "QA Antisépticos" | 1. En Catálogos > Categorías, crear la categoría. 2. Editarla con el nombre nuevo. 3. Desactivarla y revisar el selector de categoría de "Nuevo medicamento". 4. Reactivarla | Paso 1: "Categoría creada". Paso 2: "Categoría actualizada". Paso 3: "Categoría desactivada"; no aparece en el selector. Paso 4: "Categoría activada". `CREAR` y `EDITAR` en la bitácora |
| CP-28 (−) | CU-05 | RF-16, RN-50 | Media | Sesión como `admin`. Existe "Analgésico" | Nombre "Analgésico"; nombre vacío | 1. `POST /api/catalogos/categorias` con `"nombre":"Analgésico"`. 2. `POST` con `"nombre":""`. 3. Editar "QA Antisépticos" con el nombre "Analgésico". 4. Editarla con nombre vacío | Paso 1: 409 "Ya existe una categoría con ese nombre". Paso 2: 400 "El nombre de la categoría es requerido". Paso 3: 409 "Ya existe un registro con el mismo <campo>". Paso 4: 400 "El nombre de la categoría no puede quedar vacío" |
| CP-29 (−) | CU-05 | RN-50 | Baja | Sesión como `admin`. **Hallazgo abierto H-42** | Nombre `" Analgésico "` (con espacios) | 1. `POST /api/catalogos/categorias` con ese nombre | Esperado tras la corrección: 409 "Ya existe una categoría con ese nombre". **Hoy falla:** 500 "Error interno del servidor" |

Fuente: Elaboración propia.

## CU-06 Gestionar ubicaciones

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-30 (+) | CU-06 | RF-17, RN-51 | Media | Sesión como `admin` | Código "QA-02", descripción "Estante de prueba" | 1. En Catálogos > Ubicaciones, crear la ubicación. 2. Editar su descripción. 3. Elegirla en un lote de Registrar entrada | Paso 1: "Ubicación creada". Paso 2: "Ubicación actualizada". Paso 3: aparece en el selector. No existe botón para desactivar ni eliminar |
| CP-31 (−) | CU-06 | RF-17, RN-51 | Media | Sesión como `admin`. Existe "A" | Código "A"; código vacío | 1. Crear la ubicación "A". 2. Crear una con código vacío. 3. Editar "QA-02" con código vacío | Paso 1: 409 "Ya existe una ubicación con ese código". Paso 2: 400 "El código de ubicación es requerido". Paso 3: 400 "El código de ubicación no puede quedar vacío" |
| CP-32 (−) | CU-06 | RN-51 | Baja | Sesión como `admin`. **Hallazgo abierto H-42** | Código `" A "` | 1. `POST /api/catalogos/ubicaciones` con ese código | Esperado tras la corrección: 409 "Ya existe una ubicación con ese código". **Hoy falla:** 500 "Error interno del servidor" |

Fuente: Elaboración propia.

## CU-07 Registrar entrada de medicamentos

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-33 (+) | CU-07 | RF-18, RF-21, RN-01, RN-52, RNF-15 | Alta | Sesión como `qa_encargado` | QA Diclofenaco: lote QA-E-1, 30 unidades, hoy + 120, ubicación A, costo 0.50; lote QA-E-2, 20 unidades, hoy + 1 (límite), sin ubicación ni costo | 1. Abrir Registrar entrada. 2. Llenar el lote 1, pulsar "Agregar lote" y llenar el lote 2. 3. Pulsar "Registrar entrada". 4. Abrir el detalle de QA Diclofenaco en Inventario | Paso 3: "Entrada registrada", el formulario se limpia y la entrada aparece en las entradas recientes. Paso 4: dos lotes `DISPONIBLE` con cantidad actual 30 y 20; stock dispensable 50. `CREAR` en la bitácora |
| CP-34 (+) | CU-07 | RF-15, RNF-23 | Media | Sesión como `qa_encargado` | Código `7790000000011`; código `7790000000099` | 1. Escanear (o escribir y pulsar Enter) `7790000000011` en el campo del lote 1. 2. Repetir con `7790000000099` | Paso 1: "QA Paracetamol seleccionado"; el medicamento queda elegido en el lote y el campo se vacía. Paso 2: "No se encontró medicamento con ese código de barras" |
| CP-35 (−) | CU-07 | RF-19, RN-52, RN-71, RNF-15 | Alta | Sesión como `qa_encargado` | Lote QA-E-3, 10 unidades, hoy + 90 (válido); lote QA-E-4, 10 unidades, fecha **hoy** | 1. Registrar una entrada con los dos lotes en ese orden. 2. Revisar el detalle de QA Diclofenaco. 3. Repetir con QA-E-4 con fecha de ayer | Paso 1: 400 "Lote 2 (QA-E-4): La fecha de vencimiento ya pasó o es hoy; no se puede registrar un lote vencido como disponible". Paso 2: no existe QA-E-3 ni QA-E-4: no se registró ningún lote de la entrada. Paso 3: mismo mensaje |
| CP-36 (−) | CU-07 | RF-18, RN-52 | Media | Sesión como `qa_encargado` | Lote sin número de lote; lote con cantidad 0 | 1. Registrar una entrada con el lote sin número. 2. Registrar una con cantidad 0 | Paso 1: "Complete medicamento, cantidad, número de lote y vencimiento en cada lote". Paso 2: "La cantidad debe ser mayor a 0". No se registra nada |
| CP-37 (−) | CU-07 | RN-52, RN-63 | Media | Sesión como `qa_encargado`. QA Ranitidina inactivo | `POST /api/inventario/entradas` con un lote de QA Ranitidina; otro con `ubicacionId` inexistente | 1. Enviar cada petición con `<token_enc>` | 400 "Uno o más medicamentos no existen o están inactivos" y 400 "Una o más ubicaciones no existen". No se registra nada |
| CP-38 (+) | CU-07, CU-03 | RF-20 | Media | Sesión como `admin` | Código `7790000000059`, no registrado; medicamento QA Clotrimazol, Crema, 1 %, unidad Tubo, categoría Dermatológico | 1. Escanear el código en el lote 1. 2. Pulsar "Nuevo medicamento", registrar QA Clotrimazol y guardar. 3. Completar el lote y registrar la entrada | Paso 1: "No se encontró medicamento con ese código de barras". Paso 2: "Medicamento creado" y QA Clotrimazol queda seleccionado en el lote 1. Paso 3: "Entrada registrada". El código escaneado no queda vinculado al medicamento (CU-03, postcondiciones) |

Fuente: Elaboración propia.

## CU-08 Importar inventario desde Excel

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-39 (+) | CU-08 | RF-22, RF-23, RN-53, RN-55 | Alta | Sesión como `admin` | `import_valida.xlsx` (3 filas) | 1. En Registrar entrada pulsar "Importar desde Excel" y "Descargar plantilla Excel". 2. Abrir el archivo descargado. 3. Seleccionar `import_valida.xlsx` y pulsar "Importar". 4. Revisar Catálogos, Inventario y la bitácora | Paso 2: hojas "Plantilla" (11 encabezados y una fila de ejemplo) e "Instrucciones". Paso 3: "3 lote(s) importado(s) correctamente"; resumen con 3 filas leídas, 3 lotes, 2 medicamentos nuevos, 1 categoría nueva (QA Importada), 1 ubicación nueva (QA-IMP) y 1 código vinculado. Paso 4: existen los medicamentos y lotes; `CREAR` por cada entrada y por cada medicamento, categoría y ubicación creados |
| CP-40 (−) | CU-08 | RF-19, RF-23, RN-54, RN-71 | Alta | Sesión como `admin` | `import_errores.xlsx` (5 filas: 2 válidas, cantidad 12.5, fecha 31/02/2027, fecha hoy) | 1. Importar el archivo. 2. Revisar el inventario | "3 fila(s) con errores"; en "Errores por fila" aparecen las filas 4, 5 y 6 con "cantidad debe ser un entero mayor a 0", "fechaVencimiento es requerida y debe tener formato YYYY-MM-DD o DD/MM/YYYY" y "La fecha de vencimiento ya pasó o es hoy; no se puede registrar un lote vencido como disponible". Las 2 filas válidas se importan; las inválidas no dejan registros |
| CP-41 (−) | CU-08 | RN-53 | Media | Sesión como `admin` | `import_sin_columnas.xlsx` (sin la columna `fechaVencimiento`); `no_excel.xlsx` (texto con extensión .xlsx); `import_vacia.xlsx` (solo encabezados) | 1. Pulsar "Importar" sin archivo. 2. Importar cada archivo | Paso 1: "Seleccione un archivo .xlsx". Paso 2: "Faltan columnas en el Excel: fechaVencimiento. Descargue la plantilla actualizada.", "El archivo no es un Excel (.xlsx) válido" y "El archivo no contiene filas de datos" (400). No se importa nada |
| CP-42 (−) | CU-08 | RF-24, RN-55, RN-63, RN-75 | Media | Sesión como `admin`. Existe el lote QA-F-B de QA Paracetamol; QA Ranitidina inactivo | `import_repetidos.xlsx` (fila 2: QA-F-B de QA Paracetamol con su misma fecha; fila 3: lote de QA Ranitidina; fila 4: código `7790000000011` en un medicamento nuevo QA Nistatina) | 1. Importar el archivo | Fila 2: aviso "Ya existe el lote QA-F-B de QA Paracetamol con vencimiento <fecha>; no se importó…" y "1 lote(s) omitido(s) por ya existir". Fila 3: error "El medicamento "QA Ranitidina" existe pero está inactivo; actívelo antes de importar". Fila 4: lote importado con el aviso "El código de barras "7790000000011" ya pertenece a otro medicamento; no se vinculó" |
| CP-43 (−) | CU-08 | RN-55 | Baja | Sesión como `admin`. QA Paracetamol activo; categoría "QA Categoría Inactiva" inactiva. **Hallazgo abierto H-48** | `import_h48.xlsx` (lote QA-H48-1 de QA Paracetamol con `categoria` = QA Categoría Inactiva) | 1. Importar el archivo | Esperado tras la corrección: el lote se importa, porque el medicamento existe y está activo. **Hoy falla:** la fila se rechaza con "La categoría "QA Categoría Inactiva" existe pero está inactiva; actívela antes de importar" |

Fuente: Elaboración propia.

## CU-09 Consultar inventario

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-44 (+) | CU-09 | RF-25, RF-26, RN-02 | Alta | Sesión como `qa_encargado`. Datos de `datos_prueba.md` cargados. Ejecutar después de CP-50 y antes de CP-64 | QA Paracetamol, QA Cetirizina | 1. Abrir Inventario. 2. Buscar "QA Para". 3. Pulsar "Detalle" en QA Paracetamol. 4. Abrir el detalle de QA Cetirizina | Paso 1: lista paginada de 20 en 20 con stock, número de lotes, próximo vencimiento y semáforo. Paso 2: solo QA Paracetamol, con stock 25, 3 lotes y próximo vencimiento hoy + 20. Paso 3: lotes QA-F-A, QA-F-B y QA-F-C con cantidad, fecha, días para vencer, semáforo, estado y ubicación. Paso 4: QA-B-1 aparece con estado dado de baja y no suma al stock |
| CP-45 (+) | CU-09 | RF-27, RN-22, RN-23, RN-24 | Alta | Umbrales por defecto (30 y 90). Sesión como `qa_encargado` | QA Loratadina: lotes QA-S-30 (hoy + 30), QA-S-31 (hoy + 31), QA-S-90 (hoy + 90), QA-S-91 (hoy + 91) | 1. Abrir el detalle de QA Loratadina | QA-S-30: 30 días, "Urgente". QA-S-31: 31 días, "Por vencer". QA-S-90: 90 días, "Por vencer". QA-S-91: 91 días, "Sin riesgo". En la lista, el semáforo de QA Loratadina es "Urgente" (su lote que vence primero) |
| CP-46 (+) | CU-09 | RF-28, RN-28 | Alta | Sesión como `qa_encargado` | QA Omeprazol: mínimo 10, stock 9. QA Metformina: mínimo 10, stock 10 | 1. Revisar ambas filas. 2. Marcar "Solo stock bajo" | Paso 1: QA Omeprazol marcado como stock bajo; QA Metformina no (la comparación es "menor que"). Paso 2: la lista vuelve a la página 1 y contiene QA Omeprazol y no QA Metformina |
| CP-47 (−) | CU-09 | RF-25, RN-24 | Media | Sesión como `qa_encargado` | QA Salbutamol, sin lotes | 1. Buscar QA Salbutamol. 2. Abrir su detalle | Paso 1: stock 0 y semáforo "Sin stock". Paso 2: sin lotes |
| CP-48 (+/−) | CU-09 | RF-31, RN-25 | Baja | Sesión como `admin` | `{"rojo":45,"amarillo":90}`; `{"rojo":90,"amarillo":30}`; `{"rojo":-1,"amarillo":90}` | 1. `PUT /api/inventario/configuracion` con el primer cuerpo. 2. Abrir el detalle de QA Loratadina. 3. Enviar el segundo y el tercer cuerpo. 4. Restablecer `{"rojo":30,"amarillo":90}` | Paso 1: 200. Paso 2: QA-S-31 pasa a "Urgente". Paso 3: 400 "El umbral rojo debe ser menor que el amarillo" y 400 "Datos inválidos". Paso 4: 200 y los semáforos vuelven a los de CP-45 |
| CP-49 (−) | CU-09, CU-07 | RNF-28 | Baja | Sesión como `admin`. **Hallazgo abierto H-43** | `page=abc`, `pageSize=x` | 1. `GET /api/inventario/entradas?page=abc`. 2. `GET /api/inventario?pageSize=x` | Esperado tras la corrección: 200 con `page: 1` y `pageSize` numérico. **Hoy falla:** el paso 1 responde 500 y el paso 2 responde 200 con lista vacía y `page`, `pageSize` y `totalPages` en `null` |

Fuente: Elaboración propia.

## CU-10 Dar de baja lote

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-50 (+) | CU-10 | RF-29, RN-05, RN-06, RNF-24 | Alta | Sesión como `admin`. QA-B-1 `DISPONIBLE` con 10 unidades | Lote QA-B-1 de QA Cetirizina; motivo "Empaque dañado" | 1. Abrir el detalle de QA Cetirizina y pulsar "Dar de baja" en QA-B-1. 2. Escribir el motivo y confirmar. 3. Revisar la bitácora y el reporte Dados de baja | Paso 1: diálogo "¿Seguro que deseas dar de baja el lote QA-B-1? Esta acción quedará registrada en auditoría y no se puede deshacer." con el campo "Motivo (opcional)". Paso 2: "Lote dado de baja"; el lote queda dado de baja, el stock de QA Cetirizina baja a 5 (queda QA-B-2 con 5 unidades) y el botón desaparece. Paso 3: `BAJA` con estado y cantidad anteriores y el motivo; el lote aparece en el reporte |
| CP-51 (−) | CU-10 | RF-29, RN-05 | Media | Sesión como `admin` | Lote QA-B-2 (disponible); lote QA-B-1 (ya dado de baja); id inexistente | 1. Pulsar "Dar de baja" en QA-B-2 y cancelar. 2. `PUT /api/inventario/lotes/<id QA-B-1>/baja`. 3. `PUT /api/inventario/lotes/00000000-0000-0000-0000-000000000000/baja` | Paso 1: el lote no cambia y no hay registro `BAJA`. Paso 2: 409 "El lote ya fue dado de baja". Paso 3: 404 "Lote no encontrado" |

Fuente: Elaboración propia.

## CU-11 Actualizar lotes vencidos

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-52 (+) | CU-11 | RF-30, RN-04, RN-41, RN-71, RNF-19 | Alta | Ejecutar después de CP-53. Lote QA-V-HOY `DISPONIBLE` con fecha de hoy (preparado por SQL); lote QA-V-AGO `AGOTADO` con fecha de ayer; un token de captura con `expira_en` en el pasado | Consultas SQL de `datos_prueba.md`, sección 5 | 1. `docker compose restart api`. 2. Esperar a que `/api/health` responda. 3. Consultar el estado de los lotes y la tabla `tokens_captura`. 4. Abrir el panel | Paso 3: QA-V-HOY en `VENCIDO`; QA-V-AGO sigue `AGOTADO`; el token vencido ya no existe. Paso 4: QA-V-HOY aparece en "vencidos sin baja". La bitácora no registra estos cambios (CU-11, postcondiciones) |
| CP-53 (−) | CU-11, CU-15 | RN-02, RN-09, RN-47, RN-71, RNF-14 | Alta | QA Amoxicilina con QA-V-HOY (4 unidades, fecha de hoy, aún `DISPONIBLE`, sin reiniciar la API) y QA-V-OK (6 unidades, hoy + 100). Sesión como `qa_encargado` | Beneficiario Prueba Uno | 1. Ver QA Amoxicilina en Inventario. 2. `GET /api/dispensacion/stock/<id QA Amoxicilina>`. 3. Agregar QA Amoxicilina en Dispensación y dispensar 5 unidades. 4. Revisar el detalle de inventario y el detalle de la dispensación | Paso 1: stock 6, no 10; QA-V-HOY con semáforo "Vencido". Paso 2: stock 6. Paso 3: "Dispensación registrada correctamente". Paso 4: las 5 unidades salieron de QA-V-OK (queda con 1); QA-V-HOY sigue con 4 |

Fuente: Elaboración propia.

## CU-12 Consultar panel de alertas

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-54 (+) | CU-12 | RF-56, RF-57, RF-58, RN-29 | Media | Datos cargados. Al menos una dispensación hoy. Sesión como `qa_encargado` | Datos de `datos_prueba.md` | 1. Iniciar sesión. 2. Comparar los indicadores con los datos. 3. Pulsar "Dispensar medicamento" y volver; pulsar "Registrar entrada" | Paso 1: aviso "<n> asuntos requieren tu atención hoy." con el desglose. Paso 2: "Stock bajo" incluye QA Omeprazol y QA Salbutamol (stock 0 < mínimo); "Próximos a vencer" incluye los lotes disponibles con stock que vencen en 90 días o menos, por ejemplo QA-F-B y QA-S-30; "Dispensaciones hoy" coincide con las registradas desde la medianoche; hasta 8 elementos por panel y 6 entradas recientes. Paso 3: abren Dispensación y Registrar entrada |
| CP-55 (−) | CU-12 | RF-57 | Baja | Base recién creada, antes de cargar los datos. Sesión como `admin` | — | 1. Abrir el panel | "Todo en orden. No hay alertas de inventario que requieran atención."; paneles con "Todo el stock está por encima del mínimo", "No hay lotes próximos a vencer", "No hay lotes vencidos pendientes de baja" y "No hay entradas registradas todavía" |

Fuente: Elaboración propia.

## CU-13 Gestionar beneficiarios

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-56 (+) | CU-13 | RF-32, RF-33, RN-30, RN-31, RN-34 | Alta | Sesión como `qa_encargado` | Beneficiario Prueba Cuatro, DPI `0000000000004`, teléfono 5555-0004 | 1. En Beneficiarios pulsar "Nuevo beneficiario", llenar y pulsar "Registrar". 2. Buscar "00000000000". 3. Buscar "prueba cua". 4. Buscar "zzz" | Paso 1: "Beneficiario registrado"; `CREAR` en la bitácora. Paso 2: aparecen los beneficiarios cuyo DPI empieza así, incluido el nuevo. Paso 3: aparece Beneficiario Prueba Cuatro (sin distinguir mayúsculas). Paso 4: "No se encontraron resultados" |
| CP-57 (−) | CU-13 | RF-32, RN-30, RN-31 | Alta | Sesión como `qa_encargado` | Nombre "Jo"; DPI de 12 dígitos `000000000005`; DPI con letras | 1. Registrar con nombre "Jo". 2. Registrar con el DPI de 12 dígitos. 3. Escribir letras en el campo DPI | Paso 1: "El nombre debe tener al menos 3 caracteres". Paso 2: "El DPI debe tener exactamente 13 dígitos". Paso 3: el campo no acepta letras ni más de 13 dígitos. No se registra nada |
| CP-58 (−) | CU-13 | RF-32, RN-32 | Alta | Sesión como `qa_encargado`. Existe Beneficiario Prueba Uno con DPI `0000000000001` | Beneficiario Prueba Repetido con DPI `0000000000001` | 1. Registrar al beneficiario. 2. Editar a Beneficiario Prueba Dos con el DPI `0000000000001` | En ambos casos: "Ya existe un beneficiario con DPI 0000000000001" (409); no se guarda nada |
| CP-59 (+) | CU-13 | RF-34 | Media | Sesión como `qa_encargado` | Beneficiario Prueba Tres; dirección nueva "Barrio de prueba" | 1. Editar a Beneficiario Prueba Tres, cambiar la dirección y guardar | "Beneficiario actualizado"; `EDITAR` en la bitácora con datos anteriores y nuevos. No existe opción para desactivar ni eliminar |

Fuente: Elaboración propia.

## CU-14 Consultar historial de beneficiario

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-60 (+) | CU-14 | RF-35, RF-40, RN-17, RN-21 | Alta | Beneficiario Prueba Uno con la dispensación de CP-64 (QA Paracetamol). Sesión como `admin` | Nombre nuevo de QA Paracetamol: "QA Paracetamol Renombrado" | 1. Editar QA Paracetamol en Catálogos y cambiar el nombre genérico. 2. Abrir el detalle de Beneficiario Prueba Uno. 3. Iniciar sesión como `qa_encargado` y abrir el mismo detalle | Paso 2: la dispensación muestra fecha y hora (dd/mm/aaaa HH:mm), usuario que atendió, "QA Paracetamol" con el nombre del momento de la entrega (no el renombrado), cantidades y observaciones. Paso 3: `qa_encargado` ve también las dispensaciones registradas por otros usuarios. Al final, volver a poner el nombre original |
| CP-61 (+) | CU-14 | RF-46, RN-42, RN-76 | Media | Tres dispensaciones de Beneficiario Prueba Dos: una con las dos fotos (CP-72), una con solo la receta (CP-75) y una sin fotos (CP-76, "Omitir fotos") | — | 1. Abrir el detalle de Beneficiario Prueba Dos. 2. Pulsar una miniatura | Paso 1: insignias "Evidencia completa", "Parcial" y "Sin evidencia"; las miniaturas cargan. Paso 2: la foto se muestra ampliada |
| CP-62 (−) | CU-14 | RF-35, RF-46, RN-76, RNF-06 | Media | Beneficiario Prueba Tres sin dispensaciones; dispensación de CP-75 sin foto de entrega | Id de esas dispensaciones | 1. Abrir el detalle de Beneficiario Prueba Tres. 2. `GET /api/dispensacion/<id>/foto/RECETA` sin `Authorization`. 3. `GET /api/dispensacion/<id CP-75>/foto/EVIDENCIA_ENTREGA` con `<token_enc>`. 4. Abrir `http://localhost:5173/uploads/dispensaciones/<id>/RECETA.webp` | Paso 1: "No hay dispensaciones registradas". Paso 2: 401. Paso 3: 404 "Foto no encontrada". Paso 4: 404 (no existe ruta estática de evidencia) |

Fuente: Elaboración propia.

## CU-15 Dispensar medicamentos

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-63 (+) | CU-15 | RF-36, RF-37, RN-12, RN-16, RN-69, RNF-24 | Alta | Sesión como `qa_encargado` | Beneficiario Prueba Dos; QA Enalapril (50 unidades, código `7790000000035`), 3 unidades; observaciones "Receta de prueba" | 1. Abrir Dispensación y escribir "Prueba Dos". 2. Elegir al beneficiario. 3. Escanear `7790000000035`. 4. Cambiar la cantidad a 3, escribir observaciones y pulsar "Confirmar dispensación". 5. Pulsar "Dispensar" | Paso 2: se muestran sus dispensaciones recientes (hasta 5) y el cursor queda en el campo de código. Paso 3: QA Enalapril en la lista con cantidad 1, stock 50 y semáforo. Paso 4: resumen con beneficiario, medicamento, cantidad y observaciones. Paso 5: "Dispensación registrada correctamente" y la pantalla de evidencia; stock 47; `DISPENSAR` en la bitácora |
| CP-64 (+) | CU-15 | RF-38, RF-40, RN-03, RN-09, RN-10, RN-17 | Alta | Lotes de QA Paracetamol: QA-F-A 5 u (hoy + 20), QA-F-B 10 u (hoy + 60), QA-F-C 10 u (hoy + 200). Sesión como `qa_encargado` | Beneficiario Prueba Uno; 8 unidades de QA Paracetamol | 1. Dispensar 8 unidades. 2. Abrir el detalle de QA Paracetamol en Inventario. 3. `GET /api/dispensacion/<id de la dispensación>` | Paso 2: QA-F-A con 0 unidades y estado agotado; QA-F-B con 7; QA-F-C con 10 sin cambios. Stock 17. Paso 3: dos detalles: 5 unidades de QA-F-A y 3 de QA-F-B, cada uno con el nombre, la presentación y la concentración guardados. La pantalla no permitió elegir el lote |
| CP-65 (−) | CU-15 | RF-39, RN-11 | Alta | Sesión como `qa_encargado`. QA Metformina con stock 10 | `POST /api/dispensacion/despachar` con 11 unidades de QA Metformina para Beneficiario Prueba Uno | 1. Enviar la petición con `<token_enc>`. 2. Revisar el stock y el historial del beneficiario | Paso 1: 409 "Stock insuficiente para QA Metformina. Solicitado: 11, Disponible: 10". Paso 2: stock 10 sin cambios; no hay dispensación nueva ni `DISPENSAR` nuevo |
| CP-66 (−) | CU-15 | RF-39, RN-11, RNF-15 | Alta | Igual que CP-65 | Una petición con dos ítems: 2 unidades de QA Enalapril (alcanza) y 11 de QA Metformina (no alcanza) | 1. Enviar la petición. 2. Revisar el stock de ambos | Paso 1: 409 "Stock insuficiente para QA Metformina. Solicitado: 11, Disponible: 10". Paso 2: QA Enalapril conserva su stock: no se registró ninguna parte de la dispensación |
| CP-67 (−) | CU-15 | RF-39, RN-11, RN-74, RNF-13 | Alta | QA Ibuprofeno con un lote de 20 unidades. Tokens de `admin` y `qa_encargado` | Dos peticiones de 15 unidades de QA Ibuprofeno, para Beneficiario Prueba Uno y Beneficiario Prueba Dos | 1. Lanzar las dos peticiones a la vez (comando de `datos_prueba.md`, sección 6). 2. Revisar el stock y las dispensaciones | Una responde 201 y la otra 409 con "Stock insuficiente para QA Ibuprofeno. Solicitado: 15, Disponible: 5" (o, si persiste un conflicto, "No se pudo completar la dispensación por un conflicto de concurrencia. Intente de nuevo."). Ninguna responde 500. Stock final 5 y una sola dispensación nueva |
| CP-68 (−) | CU-15 | RF-36, RN-12, RN-15, RN-16, RNF-25 | Media | Sesión como `qa_encargado` | QA Enalapril; QA Salbutamol (sin stock); código `7790000000099` | 1. Abrir Dispensación sin elegir beneficiario y revisar el botón. 2. Elegir Beneficiario Prueba Uno y revisar el botón. 3. Agregar QA Enalapril dos veces. 4. Buscar y agregar QA Salbutamol. 5. Escanear `7790000000099`. 6. Escribir 999 en la cantidad de QA Enalapril. 7. Pulsar "Confirmar dispensación" y luego "Cancelar" | Paso 1: botón deshabilitado con "Seleccione un beneficiario para continuar". Paso 2: "Agregue al menos un medicamento". Paso 3: "Este medicamento ya está en la lista". Paso 4: "QA Salbutamol no tiene stock disponible". Paso 5: "No se encontró medicamento con ese código de barras". Paso 6: la cantidad se ajusta al stock disponible. Paso 7: vuelve al formulario sin registrar nada |
| CP-69 (−) | CU-15 | RN-12, RN-13, RN-14 | Media | `<token_enc>` | Cantidad 1.5; cantidad 0; QA Ranitidina (inactivo); beneficiario inexistente; `items` vacío | 1. Enviar `POST /api/dispensacion/despachar` con cada dato | Cantidades 1.5 y 0: 400 "Cada ítem debe tener medicamentoId (texto) y cantidad entera mayor a 0". QA Ranitidina: 404 "Medicamento no encontrado o inactivo: <id>". Beneficiario inexistente: 404 "Beneficiario no encontrado o inactivo". `items` vacío: 400 "Debe incluir al menos un medicamento en items". Nada se registra |
| CP-70 (+) | CU-15, CU-13 | RF-41, RF-32 | Media | Sesión como `qa_encargado` | Beneficiario Prueba Cinco, sin DPI | 1. En Dispensación, buscar "Prueba Cinco". 2. Pulsar "Nuevo", registrar al beneficiario. 3. Dispensar 1 unidad de QA Enalapril | Paso 1: "No se encontraron resultados". Paso 2: "Beneficiario registrado" y queda seleccionado, sin dispensaciones recientes. Paso 3: "Dispensación registrada correctamente" |
| CP-71 (−) | CU-15 | RN-21 | Media | Una dispensación con `created_at` a las 10:00 de hoy y otra a las 19:00 de ayer (hora de Guatemala), preparadas con SQL (`datos_prueba.md`, sección 5). **Hallazgo abierto H-45** | `fechaDesde` = `fechaHasta` = fecha de hoy | 1. `GET /api/dispensacion/historial?fechaDesde=<hoy>&fechaHasta=<hoy>` con `<token_adm>` | Esperado tras la corrección: incluye la de las 10:00 de hoy y excluye la de las 19:00 de ayer. **Hoy falla:** excluye la de hoy (el filtro termina a las 23:59 de ayer) e incluye la de ayer (empieza a las 18:00 de ayer). La pantalla no usa este endpoint |

Fuente: Elaboración propia.

## CU-16 Registrar evidencia fotográfica de la dispensación

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-72 (+) | CU-16 | RF-42, RF-43, RF-44, RN-35, RN-39, RN-40, RN-77 | Alta | Dispensación recién registrada en CP-63 (pantalla de evidencia abierta) | `receta.jpg`, `entrega.png`; un segundo navegador en modo incógnito, sin sesión, como teléfono | 1. Copiar la dirección del código QR y abrirla en el navegador sin sesión. 2. Pulsar "Tomar foto de RECETA", elegir `receta.jpg` y "Subir". 3. Hacer lo mismo con "Tomar foto de ENTREGA" y `entrega.png`. 4. Observar la computadora | Paso 1: nombre del beneficiario, fecha y los dos botones, sin pedir inicio de sesión. Paso 2: "Receta subida"; en la computadora "Foto de receta" pasa a recibida en 3 segundos o menos. Paso 3: "Entrega subida", luego "Todo listo" y "Puede cerrar esta página.". Paso 4: "Evidencia completa" y "Siguiente dispensación". Los archivos guardados son `.webp`; dos `CREAR` de foto en la bitácora |
| CP-73 (−) | CU-16 | RNF-07, RN-36, RN-39 | Alta | Enlace de CP-72 ya usado. Otra dispensación con enlace vencido (`expira_en` en el pasado, por SQL) | Enlace usado; enlace vencido; token inventado `AAAAAAAAAAA` | 1. Abrir cada enlace en el navegador sin sesión. 2. `GET /api/captura/<token>/info` con cada uno | Paso 1: "Enlace inválido o expirado" y "Pida a la encargada que genere un código QR nuevo desde la computadora.". Paso 2: 404 "Enlace inválido o expirado" en los tres casos, sin distinguir la causa |
| CP-74 (−) | CU-16 | RF-45, RN-38 | Media | Dispensación nueva con enlace vigente | `documento.pdf`, `grande.jpg` (más de 5 MB), `falso.jpg` | 1. Subir cada archivo como receta desde el enlace | "Formato de imagen no permitido. Use JPG, PNG o WEBP", "El archivo supera el tamaño máximo permitido" y "El archivo no es una imagen válida" (400). La receta sigue pendiente |
| CP-75 (+/−) | CU-16 | RF-45, RN-35, RN-37, RN-39 | Media | Dispensación nueva a Beneficiario Prueba Dos con enlace vigente | `receta.jpg`, `receta2.jpg`, `entrega.png` | 1. Subir `receta.jpg` como receta. 2. Subir `receta2.jpg` como receta. 3. Revisar `fotos_dispensacion` y la carpeta de la dispensación. 4. En otra dispensación con las dos fotos (la de CP-72), `POST /api/dispensacion/<id>/generar-token` | Paso 2: "Receta subida"; la nueva reemplaza a la anterior. Paso 3: un solo registro `RECETA` y un solo archivo. Paso 4: 409 "La evidencia de esta dispensación ya está completa; no se pueden reemplazar las fotos". Dejar esta dispensación solo con la receta (para CP-61) |
| CP-76 (+) | CU-16 | RF-43, RF-44, RN-18, RN-40 | Media | Dos dispensaciones nuevas a Beneficiario Prueba Dos | `receta.jpg`, `entrega.png` | 1. En la primera, pulsar "Subir desde PC" y elegir ambos archivos. 2. En la segunda, pulsar "Omitir fotos" | Paso 1: "Foto de receta subida" y la de entrega; "Evidencia completa". Paso 2: la pantalla deja de consultar el estado y vuelve al formulario; la dispensación queda "Sin evidencia" |
| CP-77 (+) | CU-16 | RF-43, RNF-26 | Media | Teléfono real en la misma red WiFi que el equipo. Sesión iniciada en la computadora por `http://<IP del equipo>:5173`, no por `localhost`. Puerto 5173 abierto en el firewall | Dispensación nueva; foto real de un papel de prueba (no de una receta real) | 1. Escanear el código QR con la cámara del teléfono. 2. Pulsar "Tomar foto de RECETA" | Paso 1: la página de captura abre con un ancho adecuado al teléfono y botones grandes. Paso 2: se abre directamente la cámara trasera; al subir, "Receta subida". [COMPLETAR: resultado de la prueba con teléfono real; requisito pendiente de RNF-26] |
| CP-78 (−) | CU-16 | RN-35, RN-69 | Baja | Dispensación nueva. **Hallazgo abierto H-38** | — | 1. `POST /api/dispensacion/<id>/generar-token` dos veces seguidas con `<token_enc>`. 2. `GET /api/auditoria?entidad=TokenCaptura` | Paso 1: ambas devuelven el mismo token. Esperado tras la corrección: un solo `CREAR` de `TokenCaptura`. **Hoy falla:** hay dos registros `CREAR` |
| CP-79 (−) | CU-16 | RN-37, RN-69 | Media | Dispensación nueva con enlace vigente. **Hallazgo abierto H-35** | `receta.jpg` dos veces | 1. Subir dos veces la receta desde el enlace. 2. Revisar los registros de la bitácora | Esperado tras la corrección: un `CREAR` y un `EDITAR` con los datos de la foto reemplazada, ambos con dirección IP y con la indicación de que la subida vino de la captura. **Hoy falla:** dos `CREAR` a nombre del usuario que dispensó, sin dirección IP |

Fuente: Elaboración propia.

## CU-17 Consultar reportes

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-80 (+) | CU-17 | RF-47 a RF-52, RN-68 | Alta | Datos cargados y casos de dispensación ejecutados. Sesión como `admin` | Filtros: beneficiario Beneficiario Prueba Uno; categoría Analgésico; estado `DISPONIBLE` | 1. Abrir Reportes y recorrer las seis pestañas. 2. En Dispensaciones, filtrar por beneficiario y por QA Paracetamol. 3. En Consumo, filtrar por categoría. 4. En Inventario actual, filtrar por categoría y estado. 5. Cambiar de página en un reporte con más de 20 filas | Paso 1: cada pestaña carga sin errores y con fechas dd/mm/aaaa o dd/mm/aaaa HH:mm. Paso 2: solo las dispensaciones de ese beneficiario y medicamento. Paso 3: solo medicamentos de la categoría Analgésico con dispensaciones (QA Paracetamol), ordenados por cantidad dispensada. Paso 4: solo lotes `DISPONIBLE` de Analgésico. Paso 5: la página siguiente sin repetir filas |
| CP-81 (+) | CU-17 | RF-47, RF-51 | Alta | Una dispensación con `created_at` a las 23:30 de hoy (hora de Guatemala), por SQL | `desde` vacío; `hasta` = hoy | 1. En Dispensaciones, filtrar con hasta = hoy. 2. Filtrar con hasta = ayer | Paso 1: la dispensación de las 23:30 aparece (el fin del rango incluye todo el día). Paso 2: no aparece |
| CP-82 (−) | CU-17 | RF-47, RF-48, RF-51 | Alta | Una dispensación y una entrada con `created_at` a las 19:00 de ayer (hora de Guatemala), por SQL. **Hallazgo abierto H-46** | `desde` = hoy | 1. Filtrar Dispensaciones, Consumo y Entradas con desde = hoy | Esperado tras la corrección: ninguno de los registros de las 19:00 de ayer aparece. **Hoy falla:** aparecen, porque `desde` se interpreta como medianoche UTC (18:00 de ayer en Guatemala) |
| CP-83 (−) | CU-17 | RN-68 | Media | `<token_adm>` | `estado=XYZ`; `desde=2026-13-01`; `desde` posterior a `hasta` | 1. `GET /api/reportes/inventario-actual?estado=XYZ`. 2. `GET /api/reportes/dispensaciones?desde=2026-13-01`. 3. `GET /api/reportes/dispensaciones?desde=<hoy>&hasta=<ayer>`. 4. En la pantalla, filtrar un rango sin datos | Paso 1: 400 "Estado inválido. Use: DISPONIBLE, AGOTADO, VENCIDO, DADO_DE_BAJA". Paso 2: 400 "El filtro de fecha desde no es una fecha válida (use AAAA-MM-DD)". Paso 3: 400 "El rango de fechas es inválido: "desde" es posterior a "hasta"". Paso 4: "Sin resultados" |
| CP-84 (+) | CU-17 | RF-50, RF-52, RN-68 | Media | Sesión como `admin`. Lotes de QA Loratadina y QA-B-1 dado de baja | Días vacío; días = 30 | 1. En Por vencer, dejar los días vacíos. 2. Escribir 30. 3. Abrir Dados de baja | Paso 1: lotes disponibles con stock que vencen desde hoy hasta hoy + 90 (QA-S-90 sí, QA-S-91 no). Paso 2: solo lotes disponibles con stock que vencen hasta hoy + 30 (QA-S-30 sí, QA-S-31 no). Paso 3: QA-B-1 y los lotes vencidos, con el total de unidades y el costo estimado perdidos |

Fuente: Elaboración propia.

## CU-18 Exportar reportes

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-85 (+) | CU-18 | RF-53, RN-67, RNF-27, RNF-43 | Alta | Sesión como `admin` | Los seis reportes, con un filtro aplicado en cada uno | 1. En cada pestaña, pulsar "Exportar PDF" y "Exportar Excel". 2. Abrir los 12 archivos. 3. Revisar la bitácora | Paso 1: "Reporte exportado" y descarga del archivo. Paso 2: el PDF tiene logo, nombre de la farmacia, filtros aplicados, fecha "Generado:" en dd/mm/aaaa HH:mm, tabla y "Página X de Y"; el Excel abre con encabezado, filtro automático y los mismos datos que la pantalla. Paso 3: 12 registros `CREAR` de entidad reporte con tipo, formato y filtros |
| CP-86 (−) | CU-18 | RN-67, RNF-31 | Media | Base con 5001 lotes de QA Carga (`carga_5001.xlsx`, `datos_prueba.md`, sección 4). Ejecutar al final del ciclo | Reporte Inventario actual sin filtros | 1. Exportar a PDF. 2. Filtrar por una categoría con menos de 5000 lotes y exportar | Paso 1: "El reporte tiene <n> registros y el máximo exportable es 5000. Reduzca el rango de fechas o aplique más filtros." (400); no se descarga nada. Paso 2: se descarga el archivo |
| CP-87 (−) | CU-18 | RN-67 | Baja | `<token_adm>` | Tipo `ventas`; formato `docx`; filtro sin registros | 1. `GET /api/reportes/exportar/ventas/pdf`. 2. `GET /api/reportes/exportar/inventario/docx`. 3. Exportar a PDF Dispensaciones de un rango sin datos | Paso 1: 400 "Tipo de reporte inválido. Use: …". Paso 2: 400 "Formato inválido. Use: pdf, xlsx". Paso 3: PDF con "Sin registros para los filtros aplicados." |
| CP-88 (−) | CU-18 | RN-68 | Baja | `<token_adm>`. **Hallazgo abierto H-44** | `estado=XYZ` | 1. `GET /api/reportes/exportar/inventario/pdf?estado=XYZ` | Esperado tras la corrección: 400 "Estado inválido. Use: DISPONIBLE, AGOTADO, VENCIDO, DADO_DE_BAJA", igual que la consulta. **Hoy falla:** 500 |

Fuente: Elaboración propia.

## CU-19 Consultar bitácora de auditoría

| ID | CU | RF/RN que verifica | Prioridad | Precondiciones | Datos de prueba | Pasos | Resultado esperado |
|----|----|--------------------|-----------|----------------|-----------------|-------|--------------------|
| CP-89 (+) | CU-19 | RF-54, RF-55, RN-70 | Alta | Casos anteriores ejecutados. Sesión como `admin` | Usuario `qa_encargado`; acción `DISPENSAR`; entidad "DISPENSACION" en mayúsculas | 1. Abrir Auditoría. 2. Filtrar por usuario `qa_encargado` y acción `DISPENSAR`. 3. Filtrar por la entidad escrita en mayúsculas. 4. Expandir un registro `EDITAR` de usuario | Paso 1: registros del más reciente al más antiguo, 20 por página. Paso 2: solo las dispensaciones de `qa_encargado`. Paso 3: mismos resultados que en minúsculas. Paso 4: datos anteriores y nuevos; ningún registro contiene contraseñas |
| CP-90 (−) | CU-19 | RN-70 | Media | `<token_adm>` | `accion=BORRAR`; `accion=LOGOUT`; `desde=abc` | 1. `GET /api/auditoria?accion=BORRAR`. 2. Filtrar en la pantalla por `LOGOUT`. 3. `GET /api/auditoria?desde=abc` | Paso 1: 400 "accion inválida. Use: …". Paso 2: sin resultados (la acción nunca se registra). Paso 3: 400 con el mensaje de fecha inválida |
| CP-91 (−) | CU-19 | RF-55 | Alta | Un registro de auditoría con `created_at` a las 19:00 de ayer (hora de Guatemala), por SQL. **Hallazgo abierto H-46** | `desde` = hoy | 1. En Auditoría, filtrar desde = hoy | Esperado tras la corrección: el registro de las 19:00 de ayer no aparece. **Hoy falla:** aparece |
| CP-92 (+) | CU-19 | RF-54, RNF-11, RN-64 | Media | Contar las acciones ejecutadas en el ciclo (por ejemplo, las dispensaciones registradas) | `<token_adm>` | 1. `GET /api/auditoria?accion=DISPENSAR` y comparar el total con las dispensaciones de la tabla `dispensaciones`. 2. `DELETE /api/auditoria/<id>` y `PUT /api/auditoria/<id>` | Paso 1: el total coincide. Paso 2: 404; no existe forma de modificar ni borrar la bitácora desde la API |

Fuente: Elaboración propia.

---

## Casos que se esperan fallidos por hallazgos abiertos

| Caso | Hallazgo | Prioridad del hallazgo | Lote de corrección (`12_plan_correcciones.md`, Tabla 4) |
|------|----------|------------------------|----------------------------------------------------------|
| CP-07 | H-47: el inicio de sesión no muestra los intentos restantes | Baja | 4 `fix/usuarios-contrasenas` |
| CP-08 | H-10: el cierre de sesión no registra `LOGOUT` | Media | 4 `fix/usuarios-contrasenas` |
| CP-16 | H-15: correo duplicado responde 500 | Media | 4 `fix/usuarios-contrasenas` |
| CP-26 | H-31: mensaje "otro medicamento" para el mismo medicamento | Baja | 3 `fix/catalogos-validacion` |
| CP-29 | H-42: categoría con espacios responde 500 | Baja | 3 `fix/catalogos-validacion` |
| CP-32 | H-42: ubicación con espacios responde 500 | Baja | 3 `fix/catalogos-validacion` |
| CP-43 | H-48: la importación rechaza un medicamento activo por su categoría inactiva | Baja | 6 `fix/inventario-bajas-umbrales` |
| CP-49 | H-43: paginación no numérica responde 500 o `null` | Baja | 6 `fix/inventario-bajas-umbrales` |
| CP-71 | H-45: filtros de fecha del historial de dispensaciones | Media | 5 `fix/dispensacion-trazabilidad` |
| CP-78 | H-38: `generar-token` audita `CREAR` al reutilizar el token | Baja | 5 `fix/dispensacion-trazabilidad` |
| CP-79 | H-35: la subida de fotos se audita sin IP y sin registrar el reemplazo | Media | 5 `fix/dispensacion-trazabilidad` |
| CP-82 | H-46: `desde` de los reportes incluye 6 horas del día anterior | Alta | 1 `fix/fechas-reportes` |
| CP-88 | H-44: la exportación de inventario no valida `estado` | Baja | 1 `fix/fechas-reportes` |
| CP-91 | H-46: `desde` de la bitácora incluye 6 horas del día anterior | Alta | 1 `fix/fechas-reportes` |

Fuente: Elaboración propia.
