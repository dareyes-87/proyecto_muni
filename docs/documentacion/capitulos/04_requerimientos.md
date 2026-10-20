# CAPÍTULO IV

# 4 REQUERIMIENTOS

## 4.1 Introducción al capítulo

Este capítulo presenta los requerimientos funcionales y no funcionales de FarmaG, las reglas de
negocio principales, el modelo de casos de uso con la especificación de cada caso y las matrices de
trazabilidad. Los requerimientos provienen de cuatro fuentes: el análisis de requerimientos inicial
del proyecto, cuyos casos de uso se citan como CUO-01 a CUO-37; la entrevista con el Alcalde Municipal
de Gualán incluida en ese análisis; las decisiones de alcance tomadas por el equipo y la
municipalidad, identificadas como R-01 a R-09; y el sistema construido, del que se tomaron las
funciones agregadas durante el desarrollo, señaladas con el origen "Construcción". Todos los
requerimientos describen el comportamiento del sistema en el commit `bdf1187` y se redactan con base
en la norma ISO/IEC/IEEE 29148 (ISO, 2018).

## 4.2 Requerimientos funcionales

Los requerimientos funcionales se agrupan en once módulos. En cada tabla, la prioridad expresa la
importancia del requerimiento para la operación de la farmacia: Alta, cuando sin él no se puede
controlar el inventario ni registrar las entregas; Media, cuando facilita o complementa una tarea
principal; y Baja, cuando es una ayuda opcional. La columna "Origen" indica el caso de uso original,
la entrevista, la decisión de alcance (R-XX) o la etapa de construcción de la que proviene el
requerimiento, y la columna "CU" remite a los casos de uso de la sección 4.6.

### 4.2.1 Autenticación

La Tabla 28 presenta los requerimientos del inicio y cierre de sesión y del control de acceso.

Tabla 28.
Requerimientos funcionales del módulo de Autenticación

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-01 | El sistema debe permitir iniciar sesión con usuario y contraseña a las cuentas activas, entregar un token de sesión con vigencia de 8 horas por defecto y registrar la fecha del último acceso | Alta | CUO-34 | CU-01 |
| RF-02 | El sistema debe rechazar temporalmente el inicio de sesión cuando una dirección IP supere 20 solicitudes en 10 minutos o cuando una combinación de usuario e IP acumule 3 intentos fallidos, en este caso durante 5 minutos | Alta | Construcción | CU-01 |
| RF-03 | El sistema debe comprobar en cada petición que el token esté vigente y que la cuenta siga activa, aplicar el rol vigente del usuario y mostrar solo las opciones de menú que corresponden a ese rol | Alta | CUO-34 | CU-01, CU-02 |
| RF-04 | El sistema debe permitir cerrar la sesión, eliminando del navegador el token y los datos del usuario | Media | CUO-34 | CU-01 |

Fuente: Elaboración propia.

### 4.2.2 Usuarios

La Tabla 29 presenta los requerimientos de la administración de cuentas, exclusiva del rol
Administrador.

Tabla 29.
Requerimientos funcionales del módulo de Usuarios

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-05 | El sistema debe permitir al Administrador crear usuarios con nombre de usuario único, nombre completo, correo opcional, contraseña de al menos 6 caracteres y rol (Administrador o Encargado de Beneficencia) | Alta | CUO-28 | CU-02 |
| RF-06 | El sistema debe permitir al Administrador editar el nombre completo, el correo y el rol de un usuario, sin cambiar el nombre de usuario y sin que un Administrador se quite su propio rol | Media | CUO-28 | CU-02 |
| RF-07 | El sistema debe permitir al Administrador restablecer la contraseña de cualquier usuario, con un mínimo de 6 caracteres | Media | CUO-28 | CU-02 |
| RF-08 | El sistema debe permitir al Administrador activar y desactivar usuarios, sin eliminarlos, e impedir que desactive su propia cuenta | Alta | CUO-28 | CU-02 |

Fuente: Elaboración propia.

### 4.2.3 Catálogos

La Tabla 30 presenta los requerimientos de los catálogos de medicamentos, códigos de barras,
categorías y ubicaciones. Las operaciones de escritura son exclusivas del Administrador; el Encargado
de Beneficencia solo consulta.

Tabla 30.
Requerimientos funcionales del módulo de Catálogos

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-09 | El sistema debe permitir registrar medicamentos con nombre genérico, nombre comercial, presentación, concentración, unidad de medida, categoría y stock mínimo (10 por defecto) | Alta | CUO-29 | CU-03 |
| RF-10 | El sistema debe advertir, antes de registrar un medicamento, si existen otros con nombre genérico similar, la misma presentación y la misma concentración, y permitir confirmar el registro | Media | Construcción | CU-03 |
| RF-11 | El sistema debe sugerir los datos de un medicamento nuevo a partir de su código de barras, consultando el servicio OpenFDA cuando el código no está registrado en el sistema | Baja | Construcción | CU-03 |
| RF-12 | El sistema debe permitir editar, desactivar y reactivar medicamentos, y mostrar en el catálogo tanto los activos como los inactivos | Alta | CUO-29 | CU-03 |
| RF-13 | El sistema debe permitir asociar una fotografía a cada medicamento y reemplazarla | Baja | Construcción | CU-03 |
| RF-14 | El sistema debe permitir vincular a un medicamento uno o más códigos de barras únicos en todo el sistema, con descripción opcional, y eliminarlos | Alta | CUO-29 | CU-04 |
| RF-15 | El sistema debe identificar un medicamento a partir de su código de barras, leído con escáner o escrito, e informar su stock dispensable | Alta | Construcción | CU-04, CU-07, CU-15 |
| RF-16 | El sistema debe permitir crear, editar, desactivar y reactivar categorías de medicamentos con nombre único | Media | CUO-31 | CU-05 |
| RF-17 | El sistema debe permitir crear y editar ubicaciones físicas (estantes) con código único | Media | Construcción | CU-06 |

Fuente: Elaboración propia.

### 4.2.4 Entradas e importación

La Tabla 31 presenta los requerimientos del registro de medicamentos recibidos, de forma manual o
mediante un archivo de Excel.

Tabla 31.
Requerimientos funcionales del módulo de Entradas e importación

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-18 | El sistema debe permitir registrar una entrada con uno o más lotes, cada uno con medicamento, número de lote, cantidad, fecha de vencimiento y, de forma opcional, ubicación y costo unitario, y guardar la entrada y sus lotes en una sola operación | Alta | CUO-01, entrevista | CU-07 |
| RF-19 | El sistema debe rechazar los lotes cuya fecha de vencimiento sea el día actual o anterior, tanto en el registro manual como en la importación | Alta | Construcción | CU-07, CU-08 |
| RF-20 | El sistema debe permitir al Administrador registrar un medicamento nuevo desde la pantalla de entradas y dejarlo seleccionado en el lote | Media | Construcción | CU-07, CU-03 |
| RF-21 | El sistema debe mostrar el historial de las entradas recientes | Media | CUO-01 | CU-07 |
| RF-22 | El sistema debe proporcionar al Administrador una plantilla de Excel con las columnas requeridas, una fila de ejemplo y una hoja de instrucciones | Media | Construcción | CU-08 |
| RF-23 | El sistema debe permitir al Administrador importar lotes desde un archivo de Excel, validar cada fila, crear las categorías, ubicaciones y medicamentos que falten, vincular los códigos de barras libres y presentar un resumen con los errores y avisos por fila | Alta | CUO-01, Construcción | CU-08 |
| RF-24 | El sistema debe omitir en la importación los lotes que ya existían y rechazar las filas cuyo medicamento o categoría estén inactivos | Media | Construcción | CU-08 |

Fuente: Elaboración propia.

### 4.2.5 Inventario y vencimientos

La Tabla 32 presenta los requerimientos de consulta de existencias, control de vencimientos y baja de
lotes.

Tabla 32.
Requerimientos funcionales del módulo de Inventario y vencimientos

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-25 | El sistema debe mostrar, por cada medicamento activo, el stock dispensable, el número de lotes y la fecha del próximo vencimiento, con búsqueda por texto, filtro de stock bajo y paginación de 20 registros | Alta | CUO-02, entrevista | CU-09 |
| RF-26 | El sistema debe mostrar el detalle de todos los lotes de un medicamento con su estado, ubicación, cantidad y días para vencer | Alta | CUO-02 | CU-09 |
| RF-27 | El sistema debe clasificar cada lote en un semáforo de vencimiento (sin riesgo, por vencer, urgente o vencido) según umbrales de días configurados, de 30 y 90 días por defecto | Alta | CUO-05, CUO-37 | CU-09, CU-12, CU-15 |
| RF-28 | El sistema debe señalar como stock bajo a todo medicamento activo cuyo stock dispensable sea menor que su stock mínimo | Alta | CUO-04 | CU-09, CU-12 |
| RF-29 | El sistema debe permitir al Administrador dar de baja un lote, con confirmación y motivo opcional, sin posibilidad de revertirlo | Alta | R-05 | CU-10 |
| RF-30 | El sistema debe cambiar a vencidos, cada día a las 00:05 y cada vez que arranca, los lotes disponibles cuya fecha de vencimiento sea el día actual o anterior, y eliminar en el mismo proceso los enlaces de captura vencidos | Alta | CUO-37 | CU-11 |
| RF-31 | El sistema debe permitir al Administrador modificar los umbrales del semáforo por medio de la API | Baja | CUO-32 | Ninguno (sin pantalla) |

Fuente: Elaboración propia.

El requerimiento RF-31 se cumple solo en la API: no existe una pantalla que permita cambiar los
umbrales, por lo que no tiene caso de uso asociado (sección 4.7.2).

### 4.2.6 Beneficiarios

La Tabla 33 presenta los requerimientos del registro de las personas que reciben medicamentos.

Tabla 33.
Requerimientos funcionales del módulo de Beneficiarios

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-32 | El sistema debe permitir registrar beneficiarios con nombre completo (al menos 3 caracteres) y, de forma opcional, DPI de 13 dígitos único, teléfono, dirección y observaciones | Alta | CUO-15 | CU-13, CU-15 |
| RF-33 | El sistema debe permitir buscar beneficiarios activos por nombre o por los primeros dígitos del DPI | Alta | CUO-15 | CU-13, CU-14, CU-15 |
| RF-34 | El sistema debe permitir editar los datos de un beneficiario | Media | CUO-15 | CU-13 |
| RF-35 | El sistema debe mostrar el historial de dispensaciones de un beneficiario con fecha, usuario que atendió, medicamentos entregados, observaciones y estado de la evidencia fotográfica | Alta | CUO-16 | CU-14 |

Fuente: Elaboración propia.

### 4.2.7 Dispensación

La Tabla 34 presenta los requerimientos de la entrega gratuita de medicamentos.

Tabla 34.
Requerimientos funcionales del módulo de Dispensación

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-36 | El sistema debe permitir agregar medicamentos a una dispensación por código de barras o por nombre, mostrando su stock disponible y el semáforo del próximo vencimiento, e impedir agregar un medicamento repetido o sin stock | Alta | CUO-14 | CU-15 |
| RF-37 | El sistema debe registrar la dispensación a un beneficiario activo, con uno o más medicamentos en cantidades enteras y observaciones opcionales, después de una confirmación del usuario | Alta | CUO-14, entrevista | CU-15 |
| RF-38 | El sistema debe descontar las unidades de los lotes disponibles no vencidos en orden de fecha de vencimiento, repartiendo la cantidad entre varios lotes si hace falta y marcando como agotado el lote que llega a cero | Alta | Construcción | CU-15 |
| RF-39 | El sistema debe verificar el stock al confirmar la dispensación, con los lotes bloqueados, y no registrar nada si el stock no alcanza o si persiste un conflicto con otra dispensación simultánea | Alta | Construcción | CU-15 |
| RF-40 | El sistema debe conservar en cada dispensación el lote usado, el usuario que la registró y una copia del nombre, la presentación y la concentración del medicamento al momento de la entrega | Alta | CUO-14 | CU-15, CU-14 |
| RF-41 | El sistema debe permitir registrar un beneficiario nuevo desde la pantalla de dispensación y mostrar las cinco dispensaciones más recientes del beneficiario elegido | Media | CUO-15, CUO-16 | CU-15 |

Fuente: Elaboración propia.

Una dispensación registrada no se puede editar, anular ni devolver. La ausencia de devoluciones es
una regla de negocio confirmada (R-06) y no un requerimiento funcional.

### 4.2.8 Evidencia fotográfica

La Tabla 35 presenta los requerimientos de la captura de fotografías de la receta y de la entrega.

Tabla 35.
Requerimientos funcionales del módulo de Evidencia fotográfica

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-42 | El sistema debe mostrar, después de registrar una dispensación, un código QR con un enlace de captura vigente durante 30 minutos | Media | Construcción | CU-16 |
| RF-43 | El sistema debe permitir subir una fotografía de la receta y una de la entrega desde un teléfono sin sesión, mediante el enlace del código QR, o desde la misma computadora | Media | Construcción | CU-16 |
| RF-44 | El sistema debe mostrar en la computadora el estado de cada fotografía (pendiente o recibida) y permitir omitir las fotografías | Media | Construcción | CU-16 |
| RF-45 | El sistema debe aceptar solo imágenes JPG, PNG o WEBP de hasta 5 MB, permitir reemplazar una fotografía mientras falte la otra e impedir cualquier reemplazo cuando ya estén las dos | Media | Construcción | CU-16 |
| RF-46 | El sistema debe mostrar las fotografías de evidencia solo a usuarios con sesión iniciada e indicar si la evidencia de cada dispensación está completa, es parcial o no existe | Alta | Construcción | CU-14, CU-16 |

Fuente: Elaboración propia.

### 4.2.9 Reportes

La Tabla 36 presenta los requerimientos de los seis reportes y de su exportación. La pantalla de
reportes solo se muestra al Administrador, aunque la API también permite las consultas al Encargado
de Beneficencia; según la decisión R-07, el Encargado debe tener acceso a los reportes.

Tabla 36.
Requerimientos funcionales del módulo de Reportes

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-47 | El sistema debe generar el reporte de dispensaciones con filtros por rango de fechas, beneficiario y medicamento | Alta | CUO-18, CUO-21, CUO-26 | CU-17 |
| RF-48 | El sistema debe generar el reporte de consumo por medicamento, ordenado por cantidad dispensada, con filtros por rango de fechas y categoría | Media | CUO-19 | CU-17 |
| RF-49 | El sistema debe generar el reporte de inventario actual por lote, con filtros por categoría y estado | Alta | CUO-19 | CU-17 |
| RF-50 | El sistema debe generar el reporte de lotes por vencer dentro de un número de días indicado, 90 por defecto | Alta | CUO-19, CUO-37 | CU-17 |
| RF-51 | El sistema debe generar el reporte de entradas con filtro por rango de fechas | Media | CUO-19 | CU-17 |
| RF-52 | El sistema debe generar el reporte de lotes vencidos y dados de baja, con el total de unidades y el costo estimado perdidos | Media | CUO-19 | CU-17 |
| RF-53 | El sistema debe permitir al Administrador exportar cualquiera de los seis reportes a PDF o Excel con los filtros aplicados, hasta 5000 registros, con encabezado institucional en el PDF | Alta | CUO-27 | CU-18 |

Fuente: Elaboración propia.

### 4.2.10 Auditoría

La Tabla 37 presenta los requerimientos del registro y la consulta de la bitácora de auditoría.

Tabla 37.
Requerimientos funcionales del módulo de Auditoría

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-54 | El sistema debe registrar en una bitácora cada operación que modifica datos, cada inicio de sesión (incluidos los fallidos de usuarios existentes) y cada exportación de reportes, con usuario, acción, entidad, fecha, datos anteriores y nuevos y dirección IP | Alta | CUO-33 | CU-01 a CU-08, CU-10, CU-13, CU-15, CU-16, CU-18 |
| RF-55 | El sistema debe permitir al Administrador consultar la bitácora con filtros por usuario, acción, entidad y rango de fechas, y ver los datos anteriores y nuevos de cada registro | Alta | CUO-33 | CU-19 |

Fuente: Elaboración propia.

### 4.2.11 Panel

La Tabla 38 presenta los requerimientos del panel principal que se muestra al iniciar sesión.

Tabla 38.
Requerimientos funcionales del Panel

| ID | Requerimiento | Prioridad | Origen | CU |
|----|---------------|-----------|--------|----|
| RF-56 | El sistema debe mostrar en el panel el número de medicamentos, de medicamentos con stock bajo, de lotes por vencer y de dispensaciones del día | Media | CUO-23, CUO-25 | CU-12 |
| RF-57 | El sistema debe mostrar en el panel las alertas de stock bajo, de lotes próximos a vencer y de lotes vencidos sin baja, calculadas al momento de la consulta | Alta | CUO-04, CUO-05, CUO-36, CUO-37 | CU-12 |
| RF-58 | El sistema debe ofrecer en el panel accesos directos a dispensar y registrar entrada, y la lista de entradas recientes | Baja | Construcción | CU-12 |

Fuente: Elaboración propia.

## 4.3 Requerimientos no funcionales

Los requerimientos no funcionales se clasifican según las características del modelo de calidad de la
norma ISO/IEC 25010 (ISO, 2023). Se usan los nombres de usabilidad y portabilidad para las
características que la versión de 2023 denomina capacidad de interacción y flexibilidad. Cada
requerimiento indica el criterio que el sistema cumple y el medio con que se verifica. Las pruebas
automatizadas citadas se ejecutaron el 20 de octubre de 2026 sobre el commit `bdf1187`, con 53 casos
aprobados de 53; su detalle se presenta en el capítulo 8.

### 4.3.1 Seguridad

La Tabla 39 presenta los requerimientos de seguridad.

Tabla 39.
Requerimientos no funcionales de seguridad

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-01 | Las contraseñas se almacenan cifradas con una función de hash | Hash bcrypt con costo 12 al crear usuarios, al restablecer contraseñas y en el administrador inicial; la contraseña nunca se incluye en las respuestas de la API | Inspección de `usuarios.routes.ts` y `seed.ts`; revisión de las respuestas de `GET /api/usuarios` |
| RNF-02 | Toda función del sistema requiere una sesión válida, salvo las rutas públicas definidas | 50 endpoints exigen un token JWT válido; solo son públicos el inicio de sesión, el estado del servicio, las dos rutas de captura con enlace vigente y las fotografías de medicamentos. Sin token se responde 401 | Petición sin token a un endpoint protegido; verificado el 20 de octubre de 2026 con la ruta de fotografías de evidencia (401) |
| RNF-03 | El acceso a las funciones se restringe por rol en el servidor | 21 rutas exclusivas del Administrador responden 403 a otro rol; la interfaz oculta esas opciones | Petición con una cuenta de Encargado de Beneficencia a una ruta exclusiva; resultado esperado 403 |
| RNF-04 | El inicio de sesión resiste la prueba masiva de contraseñas | Máximo 20 solicitudes por IP en 10 minutos; bloqueo de 5 minutos tras 3 fallos de la misma combinación de usuario e IP; respuesta 429 con cabecera `Retry-After` | Pruebas automatizadas `ipRateLimit.test.ts` (5 casos) y `loginRateLimit.test.ts` (6 casos), aprobadas |
| RNF-05 | La desactivación de una cuenta y el cambio de rol surten efecto de inmediato | Cada petición protegida consulta la cuenta en la base de datos; una cuenta inactiva recibe 401 en su siguiente petición | Inspección de `middleware/auth.ts`; desactivar una cuenta y repetir una petición con su token |
| RNF-06 | Las fotografías de recetas y entregas solo se obtienen con sesión | Endpoint autenticado con cabecera `Cache-Control: private, no-store`; la ruta estática de esas fotografías no existe | Verificado el 20 de octubre de 2026: sin token, 401; ruta estática, 404 |
| RNF-07 | El enlace de captura no se puede adivinar ni reutilizar | Token aleatorio de 64 bits (11 caracteres), vigente 30 minutos, válido para una sola dispensación e inválido al completar las dos fotografías; el mismo mensaje 404 para un token inexistente, vencido o usado | Prueba automatizada del formato del token en `rutas_integracion.test.ts`; inspección de `dispensacion.service.ts` |
| RNF-08 | Las respuestas HTTP incluyen cabeceras de seguridad | Cabeceras de `helmet` (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, entre otras) y sin `X-Powered-By` | Verificado con `curl -D -` sobre `/api/health` el 20 de octubre de 2026 |
| RNF-09 | La base de datos y la API no se exponen directamente a la red local | Los puertos 5432 y 3000 se publican solo en la interfaz local del servidor (127.0.0.1) | Inspección de los archivos de Compose; `docker compose ps` |
| RNF-10 | La clave de firma de los tokens no puede faltar | Sin `JWT_SECRET` el servidor no arranca; en producción, una clave de ejemplo o de menos de 16 caracteres genera una advertencia, o detiene el arranque con `STRICT_SECRETS=true` | Prueba automatizada `env.test.ts` (5 casos), aprobada |
| RNF-11 | Las acciones de los usuarios quedan registradas y no se pueden alterar desde el sistema | Bitácora de auditoría (RF-54) sin endpoints de modificación ni de borrado | Comparación del número de registros por acción con las operaciones realizadas; inspección de `auditoria.routes.ts` |
| RNF-12 | Los datos de entrada se validan antes de procesarse | Validación de tipos y formatos en los endpoints de escritura; consultas parametrizadas; cuerpos JSON de hasta 100 kB, imágenes de hasta 5 MB y archivos Excel de hasta 10 MB | Pruebas automatizadas `validacion.test.ts` (8 casos), `fecha.test.ts` (9 casos) y los casos de tipo incorrecto de `rutas_integracion.test.ts` |

Fuente: Elaboración propia.

### 4.3.2 Fiabilidad

La Tabla 40 presenta los requerimientos de fiabilidad, que incluyen la integridad del inventario y la
recuperación de la información.

Tabla 40.
Requerimientos no funcionales de fiabilidad

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-13 | El stock no se descuenta dos veces cuando hay dispensaciones simultáneas | Transacción con aislamiento `Serializable` y bloqueo `SELECT … FOR UPDATE` de los lotes; hasta 3 reintentos ante un conflicto y respuesta 409 si persiste | Prueba manual del 19 de julio de 2026: dos dispensaciones simultáneas de 15 unidades con 20 en stock; una se registró y la otra recibió 409 |
| RNF-14 | No se dispensan lotes vencidos | Un lote con fecha de vencimiento del día actual o anterior no se descuenta ni cuenta como stock, aunque el proceso diario aún no lo haya marcado | Pruebas automatizadas `despacho_vencimiento.test.ts`, `inventario.service.test.ts` y `vencimiento_arranque.test.ts`, aprobadas |
| RNF-15 | Las operaciones de registro son atómicas | Una entrada y sus lotes, y una dispensación con sus detalles y descuentos, se guardan completas o no se guardan; en la importación, cada fila es una transacción independiente | Inspección de `inventario.routes.ts` y `dispensacion.service.ts` |
| RNF-16 | La base de datos se respalda de forma periódica | Respaldo cada 12 horas, retención de 14 días con un máximo de 28 copias; el archivo se conserva solo si `pg_restore -l` lo lee; ante un fallo se reintenta a los 5 minutos | Archivo `backups/ULTIMO_RESPALDO.txt`; trabajo `despliegue` del workflow, que restaura un respaldo periódico |
| RNF-17 | Ningún arranque modifica la base sin un respaldo previo | Respaldo antes de cada arranque con datos (se conservan los 10 más recientes); sin respaldo no se aplican cambios de esquema | Archivo `backups/ESTADO_ARRANQUE.txt`; trabajo `despliegue` del workflow, que restaura el respaldo previo |
| RNF-18 | Las actualizaciones del sistema no pierden datos | Los cambios de esquema se aplican solo con migraciones versionadas; la huella de los datos (conteo y md5 por tabla) no cambia al desplegar una versión nueva | Trabajos `esquema` y `despliegue` del workflow "Despliegue seguro", con 200 beneficiarios de prueba |
| RNF-19 | El sistema recupera su estado tras un reinicio | El proceso de vencimiento se ejecuta también al arrancar la API | Prueba automatizada `vencimiento_arranque.test.ts`, aprobada |
| RNF-20 | Un fallo secundario no interrumpe la operación principal | Un error al registrar la auditoría no anula la operación; un error al generar el código QR no anula la dispensación; la consulta a OpenFDA se abandona a los 5 segundos por intento | Inspección de `middleware/audit.ts`, `Dispensacion.tsx` y `catalogos.routes.ts` |
| RNF-21 | El estado de los servicios se puede comprobar | La base de datos se verifica cada 5 segundos con `pg_isready`; la API expone `/api/health`. [COMPLETAR: horario de operación y disponibilidad esperada por la farmacia] | `docker compose ps` |

Fuente: Elaboración propia.

### 4.3.3 Usabilidad

La Tabla 41 presenta los requerimientos de usabilidad.

Tabla 41.
Requerimientos no funcionales de usabilidad

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-22 | La interfaz y los mensajes están en español y describen la causa de cada error | Cada operación muestra una notificación de éxito o el mensaje de error del servidor (por ejemplo, "Stock insuficiente para \<medicamento\>. Solicitado: \<n\>, Disponible: \<m\>") | Recorrido de las pantallas; casos de prueba del capítulo 8 |
| RNF-23 | El sistema admite un lector de códigos de barras en los campos de búsqueda | El lector funciona como teclado en Registrar entrada, Dispensación y en los códigos de barras del catálogo; el campo recupera el foco después de cada lectura | Prueba con un lector de códigos de barras en las tres pantallas |
| RNF-24 | Las operaciones irreversibles requieren confirmación | Diálogo de confirmación antes de dispensar y antes de dar de baja un lote; advertencia antes de registrar un medicamento posiblemente duplicado | Recorrido de las pantallas |
| RNF-25 | La interfaz limita los datos que el usuario puede ingresar | La cantidad a dispensar se ajusta al rango de 1 al stock disponible; el campo DPI acepta solo 13 dígitos | Recorrido de las pantallas |
| RNF-26 | La página de captura se usa con una mano desde un teléfono | Ancho máximo de 420 px, botones de al menos 60 px de alto y apertura directa de la cámara trasera (`capture="environment"`) | Navegador con vista de 375 × 812 px (verificado el 6 de agosto de 2026). [COMPLETAR: resultado de la prueba con un teléfono real en la farmacia] |
| RNF-27 | Las fechas se muestran en un formato único | Formato dd/mm/aaaa y dd/mm/aaaa HH:mm en 24 horas en pantallas, PDF y Excel | Inspección de `utils/formatDate.ts` en el backend y el frontend |

Fuente: Elaboración propia.

### 4.3.4 Eficiencia de desempeño

La Tabla 42 presenta los requerimientos de eficiencia de desempeño. El tiempo de respuesta del
sistema no se ha medido, por lo que no se fija una cifra.

Tabla 42.
Requerimientos no funcionales de eficiencia de desempeño

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-28 | Los listados se cargan por páginas | 20 registros por página en las pantallas; máximo de 100 registros por petición | Prueba automatizada `validacion.test.ts` (`clampPaginacion`) |
| RNF-29 | Las consultas de inventario leen solo los datos necesarios | Índices de consulta (migración `20261017052535_indices_consultas`); los listados de inventario y alertas cargan solo los lotes con stock | Caso de `rutas_integracion.test.ts` sobre los listados de inventario y alertas |
| RNF-30 | Las imágenes ocupan poco espacio en el servidor | Toda imagen se guarda en WebP con calidad 80 y un lado máximo de 1600 px (evidencia) o 1000 px (medicamentos) | Inspección de `utils/imagen.ts` y de los archivos guardados |
| RNF-31 | La exportación de reportes tiene un tamaño acotado | Máximo de 5000 registros por exportación; un reporte mayor se rechaza con un mensaje | Prueba automatizada `validacion.test.ts` (`verificarLimiteExport`) |
| RNF-32 | El sistema atiende a varios usuarios simultáneos | Diseñado para 4 usuarios simultáneos. [COMPLETAR: tiempo de respuesta medido con esa carga] | [COMPLETAR: prueba de carga, si se realiza] |

Fuente: Elaboración propia.

### 4.3.5 Mantenibilidad

La Tabla 43 presenta los requerimientos de mantenibilidad.

Tabla 43.
Requerimientos no funcionales de mantenibilidad

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-33 | El backend cuenta con pruebas automatizadas | 10 archivos y 53 casos de prueba con el ejecutor de Node; 53 aprobados el 20 de octubre de 2026. El frontend no tiene pruebas automatizadas | `npm test` en el contenedor `api` |
| RNF-34 | Cada cambio se comprueba antes de integrarse a la rama principal | Workflow "Despliegue seguro" en GitHub Actions con los trabajos `esquema`, `compilacion`, `despliegue` e `instalacion`, ejecutado en cada *pull request* hacia `main` y en cada *push*. [COMPLETAR: confirmar si la protección de `main` exige estos trabajos] | Historial de ejecuciones en GitHub Actions |
| RNF-35 | El código se compila sin errores de tipos | Chequeo de tipos de TypeScript del backend y construcción del frontend (`tsc -b` y `vite build`) | Trabajo `compilacion` del workflow |
| RNF-36 | El código está organizado por módulos | Un archivo de rutas por módulo en `backend/src/routes/`, lógica de negocio en `services/`, control de acceso y auditoría en `middleware/`, una página por vista y componentes reutilizables en `frontend/src/components/ui/` | Revisión de la estructura del repositorio (capítulo 6) |
| RNF-37 | Los errores se responden con un formato único | Respuesta `{ "error": "mensaje" }`; los errores de validación responden 400; el detalle interno de un error 500 solo se incluye en modo de desarrollo | Inspección de `middleware/errorHandler.ts` y `utils/httpError.ts` |

Fuente: Elaboración propia.

### 4.3.6 Portabilidad

La Tabla 44 presenta los requerimientos de portabilidad.

Tabla 44.
Requerimientos no funcionales de portabilidad

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-38 | El sistema se instala en cualquier equipo con Docker | Servicios en contenedores orquestados por Docker Compose (`db`, `api` y `web`, más `backup` en la composición de producción); el esquema y los datos iniciales se crean al arrancar | Trabajo `instalacion` del workflow, que instala desde cero |
| RNF-39 | Los equipos cliente no requieren instalación | Acceso desde un navegador web de la red local, incluido el teléfono de captura. [COMPLETAR: navegadores y versiones usados en la farmacia] | Acceso desde los equipos de la farmacia |
| RNF-40 | Las fechas no dependen de la zona horaria del equipo | Contenedor de la API con `TZ=America/Guatemala`; la fecha del despacho se envía a la base como texto `AAAA-MM-DD` | Trabajo `esquema` del workflow, que ejecuta las pruebas de base de datos con la zona de Guatemala y con UTC |
| RNF-41 | La instalación se adapta por configuración, sin cambiar el código | Variables de entorno para secretos, modo de ejecución, orígenes CORS, intervalo y retención de respaldos y contraseña inicial del administrador | Inspección de `.env.example` y de los archivos de Compose |

Fuente: Elaboración propia.

### 4.3.7 Compatibilidad

La Tabla 45 presenta los requerimientos de compatibilidad.

Tabla 45.
Requerimientos no funcionales de compatibilidad

| ID | Requerimiento | Criterio verificable | Verificación |
|----|---------------|----------------------|--------------|
| RNF-42 | La interfaz y el servidor se comunican mediante una API estándar | API REST con datos JSON bajo el prefijo `/api` | Especificación de la API (capítulo 5) |
| RNF-43 | El sistema intercambia información con formatos de uso común | Importación de archivos `.xlsx`; exportación de reportes a PDF y `.xlsx` | Apertura de los archivos exportados en un lector de PDF y en una hoja de cálculo |
| RNF-44 | El sistema consulta un servicio externo de información de medicamentos | Consulta a OpenFDA convirtiendo el código GTIN, EAN o UPC a NDC en los formatos 4-4-2, 5-3-2 y 5-4-1; otros formatos de NDC no se cubren | Consulta con un código de barras conocido (verificado el 4 de agosto de 2026 con un código de Sucralfato) |
| RNF-45 | El sistema coexiste con otros programas del servidor | Los servicios se ejecutan en contenedores aislados y los usuarios acceden solo por el puerto del frontend (80 en producción, 5173 en desarrollo) | Inspección de los archivos de Compose |

Fuente: Elaboración propia.

## 4.4 Reglas de negocio

Las reglas de negocio son las condiciones que el sistema aplica a los datos y a las operaciones. Del
análisis del código se registraron 77 reglas (RN-01 a RN-77), de las cuales 76 están vigentes y una
fue eliminada. La Tabla 46 resume las 30 que más afectan el trabajo del usuario, con su identificador
original; la lista completa, con el mensaje que muestra el sistema y la fuente de cada regla, se
presenta en el Anexo C.

Tabla 46.
Reglas de negocio principales

| ID | Regla | Módulo |
|----|-------|--------|
| RN-02 | El stock de un medicamento es la suma de las cantidades de sus lotes disponibles, con unidades y no vencidos; no se guarda en el medicamento | Inventario |
| RN-71 | Un lote está vencido cuando su fecha de vencimiento es el día actual o anterior; el mismo criterio rige el despacho, el stock, el semáforo, el proceso diario y el registro de entradas | Inventario |
| RN-04 | Cada día a las 00:05 y al arrancar la API, los lotes disponibles vencidos pasan a estado vencido | Inventario |
| RN-05 | Solo el Administrador da de baja un lote; se admite cualquier lote que no esté ya dado de baja y la baja no se puede revertir | Inventario |
| RN-07 | La cantidad de un lote solo disminuye por dispensación; no existe ajuste manual de existencias | Inventario |
| RN-22 | Los umbrales del semáforo son 30 días (rojo) y 90 días (amarillo) por defecto | Inventario |
| RN-24 | El semáforo es vencido si faltan 0 días o menos, rojo hasta el umbral rojo, amarillo hasta el umbral amarillo y verde en otro caso | Inventario |
| RN-28 | Un medicamento está en stock bajo cuando su stock es menor que su stock mínimo | Inventario |
| RN-46 | Cada código de barras es único en el sistema; un medicamento puede tener varios | Catálogos |
| RN-44 | Al registrar un medicamento se advierte si existen otros con nombre similar, la misma presentación y la misma concentración | Catálogos |
| RN-63 | Medicamentos y categorías se desactivan en lugar de eliminarse; un medicamento inactivo no recibe entradas ni se dispensa | Catálogos |
| RN-52 | Cada lote de una entrada requiere medicamento activo, cantidad entera mayor que cero, número de lote y fecha de vencimiento posterior al día actual | Entradas |
| RN-55 | En la importación por Excel se crean las categorías, ubicaciones y medicamentos que no existen, y se rechaza la fila si el medicamento o la categoría están inactivos | Entradas |
| RN-30 | El nombre del beneficiario es obligatorio, con al menos 3 caracteres | Beneficiarios |
| RN-31 | El DPI del beneficiario es opcional; si se ingresa, debe tener exactamente 13 dígitos | Beneficiarios |
| RN-32 | No puede haber dos beneficiarios con el mismo DPI | Beneficiarios |
| RN-09 | Al dispensar, los lotes se toman en orden de fecha de vencimiento, solo entre los disponibles y no vencidos; la cantidad puede repartirse entre varios lotes | Dispensación |
| RN-11 | El stock se verifica de nuevo al confirmar; si no alcanza, no se registra ninguna parte de la dispensación | Dispensación |
| RN-74 | Ante un conflicto con otra dispensación simultánea, el sistema reintenta hasta 3 veces y, si persiste, rechaza la dispensación sin registrar nada | Dispensación |
| RN-14 | La cantidad dispensada es un entero mayor que cero; el único límite es el stock, sin límites por beneficiario ni por periodo | Dispensación |
| RN-17 | Cada detalle de dispensación guarda una copia del nombre, la presentación y la concentración del medicamento y el lote exacto descontado | Dispensación |
| RN-18 | La receta no es obligatoria para dispensar; las fotografías se piden después del registro y se pueden omitir | Dispensación |
| RN-19 | Una dispensación registrada no se puede editar ni anular | Dispensación |
| RN-20 | No se aceptan devoluciones de medicamentos dispensados | Dispensación |
| RN-35 | El enlace de captura dura 30 minutos y no se genera si la dispensación ya tiene las dos fotografías | Evidencia fotográfica |
| RN-37 | Solo hay una fotografía de receta y una de entrega por dispensación; subir otra del mismo tipo reemplaza la anterior mientras falte alguna | Evidencia fotográfica |
| RN-39 | Al completar las dos fotografías, el enlace queda usado y ya no se pueden reemplazar | Evidencia fotográfica |
| RN-61 | Los usuarios se activan o desactivan, no se eliminan; un Administrador no puede desactivar su propia cuenta | Usuarios |
| RN-72 | El inicio de sesión se bloquea 5 minutos tras 3 fallos del mismo usuario desde la misma IP, y se limita a 20 solicitudes por IP en 10 minutos | Autenticación |
| RN-67 | Solo el Administrador exporta reportes; una exportación de más de 5000 registros se rechaza | Reportes |

Fuente: Elaboración propia.

## 4.5 Modelo de casos de uso

### 4.5.1 Actores

El modelo de casos de uso tiene cuatro actores, descritos en la Tabla 47. El Administrador especializa
al Encargado de Beneficencia: hereda todos sus casos de uso y agrega los exclusivos de su rol. En la
operación actual de la farmacia, una sola persona usa una cuenta de Administrador para todas las
tareas (R-09).

Tabla 47.
Actores del sistema

| Actor | Descripción | Rol en el sistema |
|-------|-------------|-------------------|
| Encargado de Beneficencia | Persona que registra las entradas, los beneficiarios y las dispensaciones | `ENCARGADO_BENEFICENCIA`. Consulta catálogos, inventario y panel; registra entradas manuales, beneficiarios, dispensaciones y evidencia |
| Administrador | Persona responsable del sistema; hereda los casos de uso del Encargado de Beneficencia | `ADMIN`. Además gestiona usuarios y catálogos, importa inventario, da de baja lotes, consulta y exporta reportes y consulta la bitácora |
| Persona con el celular | Quien toma las fotografías de la receta y de la entrega desde un teléfono, mediante el código QR | Sin rol ni sesión; su credencial es el enlace de captura vigente |
| Sistema | Proceso automático programado en la API | Sin rol; ejecuta el marcado de lotes vencidos y la limpieza de enlaces vencidos |

Fuente: Elaboración propia.

### 4.5.2 Diagrama general

La Figura 1 muestra los 19 casos de uso del sistema agrupados en once paquetes y su relación con los
cuatro actores. El Encargado de Beneficencia participa en doce casos de uso, que hereda el
Administrador; seis son exclusivos del Administrador (gestión de usuarios, importación desde Excel,
baja de lotes, consulta y exportación de reportes y consulta de la bitácora). La Persona con el
celular solo participa en el registro de la evidencia fotográfica y el Sistema solo en la
actualización de lotes vencidos. En los catálogos, el Encargado únicamente consulta.

Figura 1.
Modelo general de casos de uso

{{imagen: 04_casos_uso_general.png}}

Fuente: Elaboración propia.

### 4.5.3 Diagramas por módulo

La Figura 2 detalla el caso de uso de autenticación. Iniciar sesión incluye la validación de las
credenciales y el registro en la bitácora, y se extiende con el bloqueo de intentos cuando una IP
supera 20 solicitudes en 10 minutos o un usuario acumula 3 fallos desde la misma IP. Cerrar sesión
solo elimina la sesión del navegador.

Figura 2.
Casos de uso del módulo de Autenticación

{{imagen: 04_casos_uso_autenticacion.png}}

Fuente: Elaboración propia.

La Figura 3 muestra la gestión de usuarios, exclusiva del Administrador, con sus cuatro extensiones:
crear, editar, restablecer la contraseña y activar o desactivar. El diagrama indica que un
Administrador no puede desactivar su propia cuenta ni quitarse su rol.

Figura 3.
Casos de uso del módulo de Usuarios

{{imagen: 04_casos_uso_usuarios.png}}

Fuente: Elaboración propia.

La Figura 4 presenta los cuatro casos de uso de catálogos. En la gestión de medicamentos, el registro
incluye la verificación de posibles duplicados y se extiende con la consulta a OpenFDA cuando el
código escaneado no está registrado; la edición se extiende con la carga de la fotografía. Los
códigos de barras se agregan o eliminan, las categorías se crean, editan, activan o desactivan, y las
ubicaciones solo se crean o editan. Todas las extensiones son exclusivas del Administrador.

Figura 4.
Casos de uso del módulo de Catálogos

{{imagen: 04_casos_uso_catalogos.png}}

Fuente: Elaboración propia.

La Figura 5 muestra el registro de entradas y la importación desde Excel. El registro manual incluye
la selección del medicamento de cada lote, que puede hacerse con el código de barras, y se extiende
con el registro de un medicamento nuevo cuando este no existe. La importación, exclusiva del
Administrador, incluye la validación de las filas y la creación de las categorías, ubicaciones y
medicamentos que falten, y se extiende con la descarga de la plantilla.

Figura 5.
Casos de uso del módulo de Entradas

{{imagen: 04_casos_uso_entradas.png}}

Fuente: Elaboración propia.

La Figura 6 presenta los casos de uso de inventario. La consulta se extiende con el detalle de los
lotes de un medicamento, desde el cual el Administrador puede dar de baja un lote. El Sistema
actualiza los lotes vencidos cada día a las 00:05 y al arrancar la API, e incluye en el mismo proceso
la eliminación de los enlaces de captura vencidos.

Figura 6.
Casos de uso del módulo de Inventario

{{imagen: 04_casos_uso_inventario.png}}

Fuente: Elaboración propia.

La Figura 7 muestra el panel de alertas, que el usuario consulta al iniciar sesión y que se extiende
con la navegación a la acción sugerida: dispensar, registrar una entrada, revisar el inventario o los
catálogos.

Figura 7.
Casos de uso del Panel

{{imagen: 04_casos_uso_dashboard.png}}

Fuente: Elaboración propia.

La Figura 8 presenta los casos de uso de beneficiarios. La gestión incluye la búsqueda por nombre o
DPI y se extiende con el registro y la edición; la consulta del historial también incluye la búsqueda
y se extiende con la visualización de las fotografías de evidencia. No existe opción para desactivar
ni eliminar beneficiarios.

Figura 8.
Casos de uso del módulo de Beneficiarios

{{imagen: 04_casos_uso_beneficiarios.png}}

Fuente: Elaboración propia.

La Figura 9 muestra la dispensación de medicamentos. El caso incluye la búsqueda del beneficiario,
que se extiende con su registro cuando no se encuentra; el agregado de medicamentos, por código de
barras o por nombre; y la confirmación con descuento de stock en orden de vencimiento. El registro de
la evidencia fotográfica extiende la dispensación después de registrarla.

Figura 9.
Casos de uso del módulo de Dispensación

{{imagen: 04_casos_uso_dispensacion.png}}

Fuente: Elaboración propia.

La Figura 10 detalla la captura de evidencia. El caso incluye la generación del código QR, con un
enlace de 30 minutos, y la consulta periódica del estado de las fotografías; se extiende con la
subida desde el celular, que realiza la Persona con el celular sin sesión, con la subida desde la
computadora y con la omisión de las fotografías.

Figura 10.
Casos de uso de la captura de evidencia fotográfica

{{imagen: 04_casos_uso_captura.png}}

Fuente: Elaboración propia.

La Figura 11 presenta los reportes. La consulta se extiende con la aplicación de filtros y con la
exportación, que se especializa en PDF y Excel. El diagrama muestra al Administrador como único actor
porque la pantalla solo se le presenta a ese rol, aunque la API también permite las consultas al
Encargado de Beneficencia.

Figura 11.
Casos de uso del módulo de Reportes

{{imagen: 04_casos_uso_reportes.png}}

Fuente: Elaboración propia.

La Figura 12 muestra la consulta de la bitácora de auditoría, exclusiva del Administrador, que se
extiende con los filtros por usuario, acción, entidad y fechas, y con la vista de los datos
anteriores y nuevos de cada registro.

Figura 12.
Casos de uso del módulo de Auditoría

{{imagen: 04_casos_uso_auditoria.png}}

Fuente: Elaboración propia.

## 4.6 Especificación de casos de uso

En esta sección se especifican los 19 casos de uso del sistema, en las Tablas 48 a 66. Cada tabla
describe el comportamiento del commit `bdf1187`. En el flujo normal se alternan las acciones del
actor y las respuestas del sistema; el flujo alternativo indica en qué paso se desvía el caso y qué
ocurre. Los textos entre comillas son los mensajes que muestra el sistema, y el número entre
paréntesis es el código de respuesta HTTP de la API cuando aporta información. Cuando el actor es el
Encargado de Beneficencia, el caso también lo realiza el Administrador.

La Tabla 48 especifica el inicio y el cierre de sesión.

Tabla 48.
Caso de uso #1: Iniciar y cerrar sesión

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-01 Iniciar y cerrar sesión                                                |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite a un usuario registrado acceder al sistema con su usuario y          |
|                      | contraseña y salir de él. El acceso queda limitado por intentos y por        |
|                      | dirección IP.                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | La cuenta existe y está activa. La combinación de usuario e IP no está       |
|                      | bloqueada y la IP no superó 20 solicitudes de inicio de sesión en los        |
|                      | últimos 10 minutos.                                                          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre el sistema sin sesión.                                    |
|                      | 2. El sistema muestra la pantalla de inicio de sesión.                       |
|                      | 3. El usuario escribe su usuario y contraseña y pulsa "Iniciar sesión".      |
|                      | 4. El sistema cuenta la solicitud para el límite por IP, verifica que la     |
|                      |    combinación de usuario e IP no esté bloqueada, comprueba que la cuenta    |
|                      |    esté activa y compara la contraseña con el hash almacenado.               |
|                      | 5. El sistema reinicia el contador de fallos, actualiza la fecha del último  |
|                      |    acceso, emite un token de sesión y registra `LOGIN` en la bitácora.       |
|                      | 6. El sistema muestra "Bienvenido al sistema", abre el panel y presenta el   |
|                      |    menú correspondiente al rol del usuario.                                  |
|                      | 7. Para salir, el usuario pulsa "Cerrar sesión".                             |
|                      | 8. El sistema elimina la sesión del navegador y muestra la pantalla de       |
|                      |    inicio de sesión.                                                         |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el usuario no existe, está inactivo o la contraseña no          |
| alternativo**        |   coincide, el sistema responde "Credenciales inválidas" (401), cuenta el    |
|                      |   fallo y, si el usuario existe, registra `LOGIN` con resultado fallido en   |
|                      |   la bitácora. El caso vuelve al paso 3.                                     |
|                      | - Paso 4: al tercer fallo de la misma combinación de usuario e IP, el        |
|                      |   sistema responde "Demasiados intentos fallidos. Intente de nuevo en \<n\>  |
|                      |   minuto(s)." (429) y bloquea esa combinación durante 5 minutos sin          |
|                      |   verificar credenciales.                                                    |
|                      | - Paso 4: si la IP supera 20 solicitudes en 10 minutos, el sistema responde  |
|                      |   "Demasiadas solicitudes de inicio de sesión desde esta red. Intente de     |
|                      |   nuevo más tarde." (429).                                                   |
|                      | - Paso 4: si falta el usuario o la contraseña en una petición directa a la   |
|                      |   API, el sistema responde "Usuario y contraseña son requeridos" (400).      |
|                      | - Después del paso 6: si el token vence o la cuenta se desactiva, la         |
|                      |   siguiente petición recibe "Token inválido o expirado" o "La cuenta ya no   |
|                      |   está activa. Inicie sesión nuevamente." (401); el sistema elimina la       |
|                      |   sesión y muestra la pantalla de inicio de sesión.                          |
|                      | - Paso 1: si el usuario ya tiene una sesión guardada, el sistema confirma su |
|                      |   usuario y su rol con el servidor y abre el panel sin pedir credenciales.   |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Al iniciar: sesión abierta con un token válido por 8 horas por defecto       |
|                      | mientras la cuenta siga activa, último acceso actualizado y `LOGIN`          |
|                      | registrado. Al cerrar: sesión eliminada del navegador; el cierre no se       |
|                      | registra en la bitácora.                                                     |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 49 especifica la gestión de usuarios.

Tabla 49.
Caso de uso #2: Gestionar usuarios

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-02 Gestionar usuarios                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite al Administrador crear usuarios, editar sus datos y rol, restablecer |
|                      | su contraseña y activarlos o desactivarlos.                                  |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador.                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre la opción Usuarios.                                 |
|                      | 2. El sistema lista todos los usuarios, activos e inactivos, con su rol,     |
|                      |    estado y último acceso.                                                   |
|                      | 3. El Administrador pulsa "Nuevo usuario" e ingresa usuario, nombre          |
|                      |    completo, correo, contraseña y rol.                                       |
|                      | 4. El sistema valida los campos obligatorios, el rol y la longitud mínima de |
|                      |    la contraseña, comprueba que el nombre de usuario no exista, guarda la    |
|                      |    contraseña con hash bcrypt y registra `CREAR` en la bitácora.             |
|                      | 5. El sistema muestra "Usuario creado" y actualiza la lista.                 |
|                      | 6. Para editar, el Administrador cambia el nombre, el correo o el rol de un  |
|                      |    usuario y guarda.                                                         |
|                      | 7. El sistema valida el rol, guarda los cambios, registra `EDITAR` con los   |
|                      |    datos anteriores y nuevos y muestra "Usuario actualizado".                |
|                      | 8. Para restablecer la contraseña, el Administrador ingresa la nueva         |
|                      |    contraseña.                                                               |
|                      | 9. El sistema guarda el nuevo hash, registra `EDITAR` sin guardar la         |
|                      |    contraseña y muestra "Contraseña actualizada".                            |
|                      | 10. Para activar o desactivar, el Administrador pulsa el botón de estado de  |
|                      |     un usuario.                                                              |
|                      | 11. El sistema invierte el estado, registra `ACTIVAR` o `DESACTIVAR` y       |
|                      |     muestra "Usuario activado" o "Usuario desactivado".                      |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el nombre de usuario ya existe, el sistema muestra "El nombre   |
| alternativo**        |   de usuario ya existe" (409).                                               |
|                      | - Pasos 4 y 9: si la contraseña tiene menos de 6 caracteres, el sistema      |
|                      |   muestra "La contraseña debe tener al menos 6 caracteres".                  |
|                      | - Paso 4: si faltan campos obligatorios, el sistema responde "Campos         |
|                      |   requeridos: username, password, nombreCompleto, rol" (400); si el rol no   |
|                      |   existe, "Rol inválido" (400).                                              |
|                      | - Paso 4: si el correo ya pertenece a otro usuario, el sistema responde      |
|                      |   "Error interno del servidor" (500), porque no comprueba antes esa          |
|                      |   duplicidad.                                                                |
|                      | - Paso 7: si el Administrador intenta quitarse su propio rol, el sistema     |
|                      |   muestra "No puede cambiar su propio rol de administrador" (400).           |
|                      | - Paso 11: si el Administrador intenta desactivar su propia cuenta, el       |
|                      |   sistema muestra "No puede desactivar su propia cuenta" (400).              |
|                      | - Paso 1: si un usuario sin rol Administrador intenta abrir la opción, el    |
|                      |   sistema lo redirige al panel; una petición directa recibe "No tiene        |
|                      |   permisos para esta acción" (403).                                          |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Usuario creado, modificado, activado o desactivado, o con contraseña         |
|                      | restablecida, y la operación registrada en la bitácora. El cambio de rol o   |
|                      | la desactivación rigen desde la siguiente petición del usuario afectado; un  |
|                      | usuario inactivo no puede iniciar sesión.                                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 50 especifica la gestión de medicamentos.

Tabla 50.
Caso de uso #3: Gestionar medicamentos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-03 Gestionar medicamentos                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite registrar, editar, activar o desactivar los medicamentos del         |
|                      | catálogo y asociarles una fotografía. El registro se inicia desde la         |
|                      | pantalla Registrar entrada y el catálogo permite la edición.                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador (registrar, editar, activar o desactivar y subir fotografía);  |
|                      | Encargado de Beneficencia (solo consulta). Actor secundario: servicio        |
|                      | OpenFDA.                                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para las operaciones de escritura.     |
|                      | Para registrar, existe al menos una categoría activa.                        |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador pulsa "Nuevo medicamento" en Registrar entrada.          |
|                      | 2. El sistema muestra el formulario con stock mínimo 10.                     |
|                      | 3. El Administrador escanea o escribe el código de barras del producto y     |
|                      |    pulsa Enter.                                                              |
|                      | 4. El sistema busca el código en el catálogo y, si no existe, consulta       |
|                      |    OpenFDA; si obtiene datos, llena el formulario y muestra "Datos sugeridos |
|                      |    por OpenFDA — verifique antes de guardar".                                |
|                      | 5. El Administrador completa o corrige nombre genérico, presentación, unidad |
|                      |    de medida, categoría y los datos opcionales, y guarda.                    |
|                      | 6. El sistema valida los datos, comprueba la categoría y busca medicamentos  |
|                      |    similares por nombre genérico, presentación y concentración.              |
|                      | 7. El sistema registra el medicamento, registra `CREAR` en la bitácora y     |
|                      |    muestra "Medicamento creado".                                             |
|                      | 8. Para editar, el Administrador busca el medicamento en la pestaña          |
|                      |    Medicamentos del catálogo y pulsa editar.                                 |
|                      | 9. El sistema muestra el formulario con los datos y la fotografía actual.    |
|                      | 10. El Administrador modifica los datos o pulsa "Subir foto" y guarda.       |
|                      | 11. El sistema aplica solo los campos que cambiaron, convierte la fotografía |
|                      |     a WebP, registra `EDITAR` y muestra "Medicamento actualizado" o "Foto    |
|                      |     actualizada".                                                            |
|                      | 12. Para activar o desactivar, el Administrador pulsa el botón de estado.    |
|                      | 13. El sistema invierte el estado, registra `EDITAR` y muestra "Medicamento  |
|                      |     desactivado" o "Medicamento activado".                                   |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el código ya está registrado, el sistema muestra "Este          |
| alternativo**        |   medicamento ya está registrado: \<nombre\>" y no consulta OpenFDA.         |
|                      | - Paso 4: si OpenFDA no tiene datos, el sistema muestra "No se encontraron   |
|                      |   datos en OpenFDA para este código. Complete el formulario manualmente.";   |
|                      |   si la consulta falla, "No se pudo consultar OpenFDA". El caso continúa en  |
|                      |   el paso 5.                                                                 |
|                      | - Paso 6: si hay medicamentos similares, el sistema muestra "Posibles        |
|                      |   duplicados" con el mensaje "Se encontraron medicamentos similares. Revisa  |
|                      |   antes de continuar o confirma el registro." y la lista. Con "Revisar de    |
|                      |   nuevo" vuelve al paso 5; con "Crear de todos modos" continúa en el paso 7. |
|                      | - Paso 5: si no se elige categoría, el sistema muestra "Seleccione una       |
|                      |   categoría"; si la categoría no existe, "La categoría especificada no       |
|                      |   existe" (400); si los datos no son válidos, "Datos inválidos" (400).       |
|                      | - Paso 11: si nada cambió, el sistema responde "No hubo cambios que aplicar" |
|                      |   sin modificar el registro.                                                 |
|                      | - Paso 11: si la fotografía no es JPG, PNG o WEBP, supera 5 MB o no es una   |
|                      |   imagen válida, el sistema muestra "Formato de imagen no permitido. Use     |
|                      |   JPG, PNG o WEBP", "El archivo supera el tamaño máximo permitido" o "El     |
|                      |   archivo no es una imagen válida" (400).                                    |
|                      | - Cualquier paso: el Encargado de Beneficencia ve el catálogo sin botones de |
|                      |   escritura; una petición directa de escritura recibe 403.                   |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Medicamento registrado, editado, activado o desactivado, o con fotografía    |
|                      | nueva en WebP, y la operación registrada en la bitácora. El código escaneado |
|                      | en el paso 3 no queda vinculado al medicamento. Un medicamento inactivo      |
|                      | sigue visible en el catálogo y deja de estar disponible para entradas y      |
|                      | dispensación.                                                                |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 51 especifica la gestión de los códigos de barras.

Tabla 51.
Caso de uso #4: Gestionar códigos de barras

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-04 Gestionar códigos de barras                                            |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite vincular a un medicamento uno o más códigos de barras, que luego     |
|                      | sirven para identificarlo con un escáner, y eliminarlos.                     |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta).                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para agregar o eliminar. El            |
|                      | medicamento existe.                                                          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador pulsa el contador de códigos de un medicamento en la     |
|                      |    pestaña Medicamentos.                                                     |
|                      | 2. El sistema muestra la ventana de códigos de barras con los códigos        |
|                      |    vinculados.                                                               |
|                      | 3. El Administrador escanea el código con el lector, o lo escribe, agrega    |
|                      |    una descripción opcional y pulsa "Agregar".                               |
|                      | 4. El sistema recorta el código, comprueba que no esté registrado en ningún  |
|                      |    medicamento, lo vincula y registra `CREAR` en la bitácora.                |
|                      | 5. El sistema muestra "Código de barras registrado" y actualiza la lista.    |
|                      | 6. Para eliminar, el Administrador pulsa eliminar junto a un código.         |
|                      | 7. El sistema elimina el código y registra `ELIMINAR` en la bitácora.        |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el campo está vacío, el sistema muestra "Escanee o escriba un   |
| alternativo**        |   código de barras".                                                         |
|                      | - Paso 4: si el código ya está registrado, el sistema muestra "Este código   |
|                      |   de barras ya está registrado en otro medicamento" (409), también cuando    |
|                      |   pertenece al mismo medicamento.                                            |
|                      | - Paso 7: si el código ya no existe, el sistema responde "Código de barras   |
|                      |   no encontrado" (404).                                                      |
|                      | - Paso 2: el Encargado de Beneficencia ve los códigos pero no el formulario  |
|                      |   para agregar ni el botón para eliminar.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Código vinculado al medicamento y único en el sistema, o eliminado de forma  |
|                      | física; la operación queda registrada en la bitácora.                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 52 especifica la gestión de categorías.

Tabla 52.
Caso de uso #5: Gestionar categorías

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-05 Gestionar categorías                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite crear, editar, activar y desactivar las categorías con que se        |
|                      | clasifican los medicamentos.                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta).                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para las operaciones de escritura.     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre la pestaña Categorías del catálogo.                 |
|                      | 2. El sistema lista las categorías activas e inactivas.                      |
|                      | 3. El Administrador pulsa "Nueva categoría", o editar en una categoría,      |
|                      |    escribe el nombre y la descripción y guarda.                              |
|                      | 4. El sistema valida que el nombre no esté vacío ni repetido, guarda la      |
|                      |    categoría y registra `CREAR` o `EDITAR` en la bitácora.                   |
|                      | 5. El sistema muestra "Categoría creada" o "Categoría actualizada".          |
|                      | 6. Para activar o desactivar, el Administrador pulsa el botón de estado.     |
|                      | 7. El sistema invierte el estado y muestra "Categoría desactivada" o         |
|                      |    "Categoría activada".                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el nombre está vacío, el sistema responde "El nombre de la      |
| alternativo**        |   categoría es requerido" al crear o "El nombre de la categoría no puede     |
|                      |   quedar vacío" al editar (400).                                             |
|                      | - Paso 4: si el nombre ya existe, el sistema responde "Ya existe una         |
|                      |   categoría con ese nombre" al crear o "Ya existe un registro con el mismo   |
|                      |   \<campo\>" al editar (409).                                                |
|                      | - Paso 2: el Encargado de Beneficencia ve la lista sin botones de escritura. |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Categoría creada, editada, activada o desactivada, con nombre único, y la    |
|                      | operación registrada en la bitácora. Una categoría inactiva deja de aparecer |
|                      | en los selectores y no se usa en la importación.                             |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 53 especifica la gestión de ubicaciones.

Tabla 53.
Caso de uso #6: Gestionar ubicaciones

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-06 Gestionar ubicaciones                                                  |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite crear y editar las ubicaciones físicas (estantes) donde se guardan   |
|                      | los lotes.                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta).                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para las operaciones de escritura.     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre la pestaña Ubicaciones del catálogo.                |
|                      | 2. El sistema lista las ubicaciones registradas.                             |
|                      | 3. El Administrador pulsa "Nueva ubicación", o editar en una ubicación,      |
|                      |    escribe el código y la descripción y guarda.                              |
|                      | 4. El sistema valida que el código no esté vacío ni repetido, guarda la      |
|                      |    ubicación y registra `CREAR` o `EDITAR` en la bitácora.                   |
|                      | 5. El sistema muestra "Ubicación creada" o "Ubicación actualizada".          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el código está vacío, el sistema responde "El código de         |
| alternativo**        |   ubicación es requerido" al crear o "El código de ubicación no puede quedar |
|                      |   vacío" al editar (400).                                                    |
|                      | - Paso 4: si el código ya existe, el sistema responde "Ya existe una         |
|                      |   ubicación con ese código" al crear o "Ya existe un registro con el mismo   |
|                      |   \<campo\>" al editar (409).                                                |
|                      | - Paso 2: el Encargado de Beneficencia ve la lista sin botones de escritura. |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ubicación creada o editada, con código único, y la operación registrada en   |
|                      | la bitácora. Las ubicaciones no se desactivan ni se eliminan.                |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 54 especifica el registro manual de entradas.

Tabla 54.
Caso de uso #7: Registrar entrada de medicamentos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-07 Registrar entrada de medicamentos                                      |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite registrar los medicamentos recibidos por la farmacia como una        |
|                      | entrada con uno o más lotes, cada uno con su cantidad y fecha de             |
|                      | vencimiento.                                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador (este último también puede          |
|                      | registrar un medicamento nuevo desde la misma pantalla, CU-03).              |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada. Los medicamentos de la entrada existen y están activos, o   |
|                      | el usuario es Administrador y puede registrarlos.                            |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre Registrar entrada.                                        |
|                      | 2. El sistema carga los medicamentos activos, las categorías, las            |
|                      |    ubicaciones y las entradas recientes.                                     |
|                      | 3. Por cada lote, el usuario escanea el código de barras del producto y      |
|                      |    pulsa Enter, o elige el medicamento en la lista.                          |
|                      | 4. El sistema identifica el medicamento por el código, lo selecciona en el   |
|                      |    lote y muestra "\<nombre\> seleccionado".                                 |
|                      | 5. El usuario ingresa número de lote, cantidad, fecha de vencimiento y, de   |
|                      |    forma opcional, ubicación y costo unitario; agrega o quita lotes y        |
|                      |    escribe observaciones opcionales.                                         |
|                      | 6. El usuario pulsa "Registrar entrada".                                     |
|                      | 7. El sistema verifica que cada lote tenga medicamento, cantidad mayor que   |
|                      |    cero, número de lote y fecha de vencimiento posterior al día actual, y    |
|                      |    que los medicamentos estén activos y las ubicaciones existan.             |
|                      | 8. El sistema guarda la entrada y sus lotes en estado disponible en una sola |
|                      |    transacción y registra `CREAR` en la bitácora.                            |
|                      | 9. El sistema muestra "Entrada registrada", limpia el formulario y actualiza |
|                      |    las entradas recientes.                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el código no está registrado, el sistema muestra "No se         |
| alternativo**        |   encontró medicamento con ese código de barras". Si el usuario es           |
|                      |   Administrador, puede pulsar "Nuevo medicamento" (CU-03); al guardarlo, el  |
|                      |   medicamento queda seleccionado en el lote y el caso continúa en el paso 5. |
|                      | - Paso 7: si faltan datos de algún lote, el sistema muestra "Complete        |
|                      |   medicamento, cantidad, número de lote y vencimiento en cada lote"; si la   |
|                      |   cantidad no es mayor que cero, "La cantidad debe ser mayor a 0".           |
|                      | - Paso 7: si un lote vence el día actual o antes, el sistema responde "Lote  |
|                      |   \<n\> (\<número de lote\>): La fecha de vencimiento ya pasó o es hoy; no   |
|                      |   se puede registrar un lote vencido como disponible" (400) y no registra    |
|                      |   ningún lote de la entrada.                                                 |
|                      | - Paso 7: si un medicamento está inactivo o no existe, el sistema responde   |
|                      |   "Uno o más medicamentos no existen o están inactivos" (400); si una        |
|                      |   ubicación no existe, "Una o más ubicaciones no existen" (400).             |
|                      | - Paso 2: si no se pueden cargar los catálogos, el sistema muestra "No se    |
|                      |   pudieron cargar los catálogos".                                            |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Una entrada con uno o más lotes en estado disponible, con cantidad actual    |
|                      | igual a la recibida; el stock dispensable aumenta y la operación queda       |
|                      | registrada en la bitácora. Si un lote no cumple las validaciones, no se      |
|                      | registra ninguno.                                                            |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 55 especifica la importación de inventario desde Excel.

Tabla 55.
Caso de uso #8: Importar inventario desde Excel

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-08 Importar inventario desde Excel                                        |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite al Administrador cargar muchos lotes a la vez desde un archivo de    |
|                      | Excel con el formato de la plantilla del sistema.                            |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador. Archivo `.xlsx` de hasta 10 MB con    |
|                      | las 11 columnas de la plantilla en la primera fila.                          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador pulsa "Importar desde Excel" en Registrar entrada y      |
|                      |    luego "Descargar plantilla Excel".                                        |
|                      | 2. El sistema entrega el archivo con la hoja "Plantilla", que contiene los   |
|                      |    encabezados y una fila de ejemplo, y la hoja "Instrucciones".             |
|                      | 3. El Administrador llena la plantilla, la selecciona y pulsa "Importar".    |
|                      | 4. El sistema valida el archivo y sus columnas, y valida cada fila: campos   |
|                      |    obligatorios, cantidad entera mayor que cero y fecha de vencimiento       |
|                      |    válida y posterior al día actual.                                         |
|                      | 5. El sistema procesa las filas válidas en orden, cada una en su             |
|                      |    transacción: busca o crea la categoría y la ubicación, busca o crea el    |
|                      |    medicamento, vincula el código de barras si está libre y crea una entrada |
|                      |    con un lote.                                                              |
|                      | 6. El sistema registra `CREAR` en la bitácora por cada entrada y por cada    |
|                      |    medicamento, categoría y ubicación creados.                               |
|                      | 7. El sistema muestra el resumen (filas leídas, lotes registrados,           |
|                      |    medicamentos nuevos, filas con error, categorías y ubicaciones nuevas,    |
|                      |    códigos vinculados y lotes omitidos) con las listas "Errores por fila" y  |
|                      |    "Avisos", y la notificación "\<n\> lote(s) importado(s) correctamente".   |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si no se seleccionó archivo, el sistema muestra "Seleccione un     |
| alternativo**        |   archivo .xlsx".                                                            |
|                      | - Paso 4: si el archivo no es un Excel válido, no tiene filas o le faltan    |
|                      |   columnas, el sistema responde "El archivo no es un Excel (.xlsx) válido",  |
|                      |   "El archivo no contiene filas de datos" o "Faltan columnas en el Excel:    |
|                      |   \<lista\>. Descargue la plantilla actualizada." (400) y no importa nada.   |
|                      | - Paso 4: una fila con datos inválidos se informa con su número (por         |
|                      |   ejemplo, "cantidad debe ser un entero mayor a 0" o "La fecha de            |
|                      |   vencimiento ya pasó o es hoy; no se puede registrar un lote vencido como   |
|                      |   disponible") y se omite; el sistema muestra "\<n\> fila(s) con errores" y  |
|                      |   procesa las demás.                                                         |
|                      | - Paso 5: si la categoría o el medicamento existen pero están inactivos, la  |
|                      |   fila se rechaza con "La categoría "\<nombre\>" existe pero está inactiva;  |
|                      |   actívela antes de importar" o "El medicamento "\<nombre\>" existe pero     |
|                      |   está inactivo; actívelo antes de importar".                                |
|                      | - Paso 5: si ya existía, antes de la importación, un lote del mismo          |
|                      |   medicamento con el mismo número y fecha de vencimiento, la fila se omite   |
|                      |   con el aviso "Ya existe el lote \<número\> de \<medicamento\> con          |
|                      |   vencimiento \<fecha\>; no se importó…" y el sistema muestra "\<n\> lote(s) |
|                      |   omitido(s) por ya existir".                                                |
|                      | - Paso 5: si el código de barras pertenece a otro medicamento, el lote se    |
|                      |   importa con el aviso "El código de barras "\<código\>" ya pertenece a otro |
|                      |   medicamento; no se vinculó".                                               |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Por cada fila importada, una entrada y un lote disponible y, si hacía falta, |
|                      | categoría, ubicación, medicamento y código de barras nuevos. Las filas con   |
|                      | error y las omitidas no dejan registros. La vinculación de códigos de barras |
|                      | no se registra en la bitácora.                                               |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 56 especifica la consulta del inventario.

Tabla 56.
Caso de uso #9: Consultar inventario

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-09 Consultar inventario                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite conocer las existencias de cada medicamento, su próximo vencimiento  |
|                      | y el detalle de sus lotes.                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada.                                                             |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre Inventario.                                               |
|                      | 2. El sistema muestra, por cada medicamento activo, el stock dispensable, el |
|                      |    número de lotes, el próximo vencimiento, el semáforo y la marca de stock  |
|                      |    bajo, en páginas de 20 registros.                                         |
|                      | 3. El usuario escribe un texto de búsqueda, marca "Solo stock bajo" o cambia |
|                      |    de página con "Anterior" y "Siguiente".                                   |
|                      | 4. El sistema actualiza la lista con los filtros; al cambiar un filtro       |
|                      |    vuelve a la primera página.                                               |
|                      | 5. El usuario pulsa "Detalle" en un medicamento.                             |
|                      | 6. El sistema muestra todos sus lotes, en cualquier estado, con número de    |
|                      |    lote, cantidad, fecha de vencimiento, días para vencer, semáforo, estado  |
|                      |    y ubicación.                                                              |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 2: si el medicamento no tiene lotes dispensables, el sistema muestra  |
| alternativo**        |   el semáforo "Sin stock".                                                   |
|                      | - Pasos 2 y 6: si la consulta falla, el sistema muestra "No se pudo cargar   |
|                      |   el inventario" o "No se pudo cargar el detalle".                           |
|                      | - Paso 6: desde el detalle, el Administrador puede dar de baja un lote       |
|                      |   (CU-10).                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos.                                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 57 especifica la baja de un lote.

Tabla 57.
Caso de uso #10: Dar de baja lote

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-10 Dar de baja lote                                                       |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite al Administrador retirar del inventario un lote completo, por        |
|                      | ejemplo vencido o dañado, dejando constancia en la bitácora.                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador. El lote existe y no está dado de      |
|                      | baja.                                                                        |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre el detalle de un medicamento en Inventario (CU-09). |
|                      | 2. El Administrador pulsa "Dar de baja" en un lote.                          |
|                      | 3. El sistema pide confirmación con el mensaje "¿Seguro que deseas dar de    |
|                      |    baja el lote \<número\>? Esta acción quedará registrada en auditoría y no |
|                      |    se puede deshacer." y el campo "Motivo (opcional)".                       |
|                      | 4. El Administrador escribe el motivo, si lo desea, y confirma.              |
|                      | 5. El sistema cambia el estado del lote a dado de baja y registra `BAJA` en  |
|                      |    la bitácora con el estado y la cantidad anteriores y el motivo.           |
|                      | 6. El sistema muestra "Lote dado de baja" y actualiza el detalle y la lista. |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el Administrador cancela, el lote no cambia.                    |
| alternativo**        | - Paso 5: si el lote ya fue dado de baja, el sistema responde "El lote ya    |
|                      |   fue dado de baja" (409); si no existe, "Lote no encontrado" (404).         |
|                      | - Paso 2: el botón no se muestra en los lotes ya dados de baja ni a otros    |
|                      |   roles; una petición directa de otro rol recibe "No tiene permisos para     |
|                      |   esta acción" (403).                                                        |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Lote en estado dado de baja, sin posibilidad de revertirlo, fuera del stock  |
|                      | y presente en el reporte de dados de baja. El motivo, si se escribió, queda  |
|                      | solo en la bitácora.                                                         |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.


La Tabla 58 especifica el proceso automático de actualización de lotes vencidos.

Tabla 58.
Caso de uso #11: Actualizar lotes vencidos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-11 Actualizar lotes vencidos                                              |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Proceso automático que marca como vencidos los lotes cuya fecha de           |
|                      | vencimiento llegó y elimina los enlaces de captura vencidos.                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Sistema (proceso automático).                                                |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | La API está en ejecución y se cumple la hora programada (00:05, hora de      |
|                      | Guatemala) o la API acaba de arrancar.                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Sistema inicia el proceso a las 00:05 o al arrancar la API, sin        |
|                      |    detener el arranque.                                                      |
|                      | 2. El Sistema cambia a vencido todo lote disponible cuya fecha de            |
|                      |    vencimiento sea el día actual o anterior.                                 |
|                      | 3. El Sistema elimina los enlaces de captura cuya fecha de expiración ya     |
|                      |    pasó.                                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 2: si el marcado de lotes falla, el Sistema escribe el error en el    |
| alternativo**        |   registro de la API y ejecuta igualmente el paso 3.                         |
|                      | - Paso 2: los lotes agotados o dados de baja no cambian de estado.           |
|                      | - Si la API estuvo apagada a las 00:05, los lotes se marcan en el siguiente  |
|                      |   arranque. Mientras tanto, un lote vencido aún no marcado no se dispensa ni |
|                      |   cuenta como stock (CU-15).                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Todo lote disponible con fecha de vencimiento del día actual o anterior      |
|                      | queda en estado vencido y aparece en las alertas de vencidos sin baja; los   |
|                      | enlaces de captura vencidos quedan eliminados. Ninguno de estos cambios se   |
|                      | registra en la bitácora.                                                     |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 59 especifica la consulta del panel de alertas.

Tabla 59.
Caso de uso #12: Consultar panel de alertas

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-12 Consultar panel de alertas                                             |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Muestra al iniciar sesión los indicadores del día y las alertas de           |
|                      | inventario que requieren atención, con accesos a las acciones frecuentes.    |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada.                                                             |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario inicia sesión o pulsa "Dashboard" en el menú.                  |
|                      | 2. El sistema calcula las alertas y consulta las entradas recientes.         |
|                      | 3. El sistema muestra el saludo, la fecha y el aviso "Todo en orden. No hay  |
|                      |    alertas de inventario que requieran atención." o "\<n\> asuntos requieren |
|                      |    tu atención hoy." con el desglose por tipo.                               |
|                      | 4. El sistema muestra las acciones rápidas (Dispensar medicamento y          |
|                      |    Registrar entrada), el resumen (Medicamentos, Stock bajo, Por vencer y    |
|                      |    Dispensaciones hoy), los paneles de stock bajo, próximos a vencer y       |
|                      |    vencidos sin baja, con hasta 8 elementos cada uno, y las 6 entradas más   |
|                      |    recientes.                                                                |
|                      | 5. El usuario pulsa una acción rápida o un enlace.                           |
|                      | 6. El sistema abre Dispensación, Registrar entrada, Inventario o Catálogos   |
|                      |    según el enlace.                                                          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si un panel no tiene elementos, el sistema muestra "Todo el stock  |
| alternativo**        |   está por encima del mínimo", "No hay lotes próximos a vencer", "No hay     |
|                      |   lotes vencidos pendientes de baja" o "No hay entradas registradas          |
|                      |   todavía".                                                                  |
|                      | - Paso 2: si falla una de las consultas, la parte correspondiente queda      |
|                      |   vacía sin mensaje de error.                                                |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos. Las dispensaciones del día se cuentan  |
|                      | desde la medianoche, hora de Guatemala, y son las de todos los usuarios.     |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 60 especifica la gestión de beneficiarios.

Tabla 60.
Caso de uso #13: Gestionar beneficiarios

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-13 Gestionar beneficiarios                                                |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite buscar, registrar y editar a las personas que reciben medicamentos   |
|                      | sin costo.                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada.                                                             |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre Beneficiarios.                                            |
|                      | 2. El sistema lista los 50 beneficiarios activos registrados más             |
|                      |    recientemente.                                                            |
|                      | 3. El usuario escribe al menos 2 caracteres del nombre o del DPI.            |
|                      | 4. El sistema muestra hasta 20 coincidencias: por los primeros dígitos del   |
|                      |    DPI si el texto es numérico, o por nombre en otro caso.                   |
|                      | 5. El usuario pulsa "Nuevo beneficiario", ingresa el nombre completo y, de   |
|                      |    forma opcional, DPI, teléfono, dirección y observaciones, y pulsa         |
|                      |    "Registrar".                                                              |
|                      | 6. El sistema valida el nombre y el DPI, comprueba que el DPI no esté        |
|                      |    registrado, guarda el beneficiario y registra `CREAR` en la bitácora.     |
|                      | 7. El sistema muestra "Beneficiario registrado".                             |
|                      | 8. Para editar, el usuario pulsa editar en un beneficiario, cambia sus datos |
|                      |    y guarda.                                                                 |
|                      | 9. El sistema valida los datos, comprueba el DPI si cambió, registra         |
|                      |    `EDITAR` con los datos anteriores y nuevos y muestra "Beneficiario        |
|                      |    actualizado".                                                             |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si no hay coincidencias, el sistema muestra "No se encontraron     |
| alternativo**        |   resultados"; si no hay beneficiarios, "No hay beneficiarios registrados".  |
|                      | - Pasos 6 y 9: si el nombre tiene menos de 3 caracteres, el sistema muestra  |
|                      |   "El nombre debe tener al menos 3 caracteres"; si el DPI no tiene 13        |
|                      |   dígitos, "El DPI debe tener exactamente 13 dígitos".                       |
|                      | - Pasos 6 y 9: si el DPI ya pertenece a otro beneficiario, el sistema        |
|                      |   muestra "Ya existe un beneficiario con DPI \<dpi\>" (409).                 |
|                      | - Paso 5: el registro también se puede hacer desde la pantalla de            |
|                      |   Dispensación cuando el beneficiario no se encuentra (CU-15).               |
|                      | - No existe opción para desactivar ni eliminar beneficiarios.                |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Beneficiario registrado o editado, con DPI único cuando se indica, y la      |
|                      | operación registrada en la bitácora.                                         |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 61 especifica la consulta del historial de un beneficiario.

Tabla 61.
Caso de uso #14: Consultar historial de beneficiario

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-14 Consultar historial de beneficiario                                    |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite ver los datos de un beneficiario y todas las dispensaciones que ha   |
|                      | recibido, con su evidencia fotográfica.                                      |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada. El beneficiario existe.                                     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario busca al beneficiario en Beneficiarios (CU-13) y pulsa "Ver    |
|                      |    detalle".                                                                 |
|                      | 2. El sistema muestra los datos del beneficiario y su historial de           |
|                      |    dispensaciones: fecha y hora, usuario que atendió, medicamentos con las   |
|                      |    cantidades y los datos guardados al momento de la entrega, observaciones  |
|                      |    y estado de la evidencia ("Evidencia completa", "Parcial" o "Sin          |
|                      |    evidencia").                                                              |
|                      | 3. El sistema carga con la sesión del usuario las miniaturas de las          |
|                      |    fotografías de receta y de entrega.                                       |
|                      | 4. El usuario pulsa una miniatura.                                           |
|                      | 5. El sistema muestra la fotografía ampliada.                                |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 2: si el beneficiario no tiene dispensaciones, el sistema muestra "No |
| alternativo**        |   hay dispensaciones registradas".                                           |
|                      | - Paso 2: si la consulta falla, el sistema muestra "Error al cargar          |
|                      |   detalle"; si el beneficiario no existe, "Beneficiario no encontrado"       |
|                      |   (404).                                                                     |
|                      | - Paso 3: si una fotografía no existe, la API responde "Foto no encontrada"  |
|                      |   (404); sin sesión responde 401.                                            |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos. Las dispensaciones de todos los        |
|                      | usuarios son visibles para cualquier usuario con sesión.                     |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 62 especifica la dispensación de medicamentos.

Tabla 62.
Caso de uso #15: Dispensar medicamentos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-15 Dispensar medicamentos                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Registra la entrega gratuita de uno o más medicamentos a un beneficiario y   |
|                      | descuenta las unidades de los lotes que vencen primero.                      |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada. El beneficiario existe y está activo. Hay al menos un       |
|                      | medicamento activo con stock dispensable, es decir, con lotes disponibles no |
|                      | vencidos.                                                                    |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre Dispensación.                                             |
|                      | 2. El sistema obtiene los umbrales del semáforo de vencimiento.              |
|                      | 3. El usuario escribe al menos 2 caracteres del nombre o del DPI del         |
|                      |    beneficiario.                                                             |
|                      | 4. El sistema muestra las coincidencias.                                     |
|                      | 5. El usuario elige al beneficiario.                                         |
|                      | 6. El sistema muestra sus cinco dispensaciones más recientes y coloca el     |
|                      |    cursor en el campo de código de barras.                                   |
|                      | 7. El usuario escanea el código de barras de un medicamento o lo busca por   |
|                      |    nombre.                                                                   |
|                      | 8. El sistema consulta el stock no vencido del medicamento y lo agrega a la  |
|                      |    lista con cantidad 1, el stock disponible y el semáforo del próximo       |
|                      |    vencimiento.                                                              |
|                      | 9. El usuario ajusta las cantidades, entre 1 y el stock disponible, quita    |
|                      |    medicamentos si hace falta, escribe observaciones opcionales y pulsa      |
|                      |    "Confirmar dispensación".                                                 |
|                      | 10. El sistema muestra el resumen con el beneficiario, los medicamentos, las |
|                      |     cantidades y las observaciones.                                          |
|                      | 11. El usuario pulsa "Dispensar".                                            |
|                      | 12. El sistema abre una transacción, bloquea por cada medicamento los lotes  |
|                      |     disponibles, con stock y no vencidos en orden de fecha de vencimiento,   |
|                      |     verifica el stock y descuenta las unidades de esos lotes en ese orden,   |
|                      |     marcando como agotado el lote que llega a cero.                          |
|                      | 13. El sistema registra la dispensación con un detalle por lote usado, que   |
|                      |     guarda el nombre, la presentación y la concentración del medicamento, y  |
|                      |     registra `DISPENSAR` en la bitácora.                                     |
|                      | 14. El sistema muestra "Dispensación registrada correctamente" y la pantalla |
|                      |     de evidencia fotográfica (CU-16).                                        |
|                      | 15. El usuario pulsa "Siguiente dispensación".                               |
|                      | 16. El sistema limpia el formulario para una nueva dispensación.             |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si no hay coincidencias, el sistema muestra "No se encontraron     |
| alternativo**        |   resultados"; el usuario puede pulsar "Nuevo" y registrar al beneficiario   |
|                      |   (CU-13), que queda seleccionado. El caso continúa en el paso 6.            |
|                      | - Paso 8: si el código no está registrado, el sistema muestra "No se         |
|                      |   encontró medicamento con ese código de barras"; si la búsqueda por nombre  |
|                      |   no da resultados, "No se encontraron medicamentos".                        |
|                      | - Paso 8: si el medicamento ya está en la lista, el sistema muestra "Este    |
|                      |   medicamento ya está en la lista"; si no tiene stock no vencido,            |
|                      |   "\<nombre\> no tiene stock disponible".                                    |
|                      | - Paso 9: sin beneficiario o sin medicamentos, el botón "Confirmar           |
|                      |   dispensación" queda deshabilitado con el aviso "Seleccione un beneficiario |
|                      |   para continuar" o "Agregue al menos un medicamento".                       |
|                      | - Paso 11: si el usuario pulsa "Cancelar", vuelve al paso 9 sin registrar    |
|                      |   nada.                                                                      |
|                      | - Paso 12: si el stock ya no alcanza, por ejemplo porque otra dispensación   |
|                      |   tomó las unidades, el sistema responde "Stock insuficiente para            |
|                      |   \<nombre\>. Solicitado: \<n\>, Disponible: \<m\>" (409) y no registra      |
|                      |   nada.                                                                      |
|                      | - Paso 12: si la base de datos detecta un conflicto con otra dispensación    |
|                      |   simultánea, el sistema reintenta hasta 3 veces; si persiste, responde "No  |
|                      |   se pudo completar la dispensación por un conflicto de concurrencia.        |
|                      |   Intente de nuevo." (409) y no registra nada.                               |
|                      | - Paso 12: si el beneficiario o un medicamento están inactivos o no existen, |
|                      |   el sistema responde "Beneficiario no encontrado o inactivo" o "Medicamento |
|                      |   no encontrado o inactivo: \<id\>" (404).                                   |
|                      | - Paso 12: si una cantidad no es un entero mayor que cero en una petición    |
|                      |   directa, el sistema responde "Cada ítem debe tener medicamentoId (texto) y |
|                      |   cantidad entera mayor a 0" (400).                                          |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Una dispensación con un detalle por lote usado; los lotes quedan descontados |
|                      | en orden de vencimiento y en estado agotado los que llegan a cero;           |
|                      | `DISPENSAR` queda registrado. La dispensación no se puede editar, anular ni  |
|                      | devolver. Si el stock no alcanza o persiste el conflicto, no se registra     |
|                      | nada.                                                                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 63 especifica el registro de la evidencia fotográfica.

Tabla 63.
Caso de uso #16: Registrar evidencia fotográfica de la dispensación

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-16 Registrar evidencia fotográfica de la dispensación                     |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite adjuntar a una dispensación ya registrada una fotografía de la       |
|                      | receta y una de la entrega, tomadas con un teléfono mediante un código QR o  |
|                      | subidas desde la computadora. Las fotografías son opcionales.                |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador (en la computadora); Persona con el |
|                      | celular (sin sesión).                                                        |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | La dispensación está registrada (CU-15) y su evidencia no está completa. El  |
|                      | enlace de captura está vigente. Para usar el código QR, el teléfono está     |
|                      | conectado a la misma red que el servidor.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El sistema genera, o reutiliza si sigue vigente, un enlace de captura de  |
|                      |    30 minutos, registra `CREAR` en la bitácora y muestra el código QR con la |
|                      |    dirección del enlace.                                                     |
|                      | 2. El sistema consulta cada 3 segundos el estado de las fotografías y        |
|                      |    muestra "Foto de receta" y "Foto de entrega" como pendiente o recibida.   |
|                      | 3. La Persona con el celular escanea el código QR.                           |
|                      | 4. El sistema muestra en el teléfono el nombre del beneficiario, la fecha y  |
|                      |    los botones "Tomar foto de RECETA" y "Tomar foto de ENTREGA".             |
|                      | 5. La Persona con el celular toma la fotografía con la cámara trasera,       |
|                      |    revisa la vista previa y pulsa "Subir".                                   |
|                      | 6. El sistema valida el enlace, el tipo, el formato y el tamaño de la        |
|                      |    imagen, la convierte a WebP, guarda la fotografía, registra `CREAR` en la |
|                      |    bitácora a nombre del usuario que dispensó y muestra "Receta subida" o    |
|                      |    "Entrega subida".                                                         |
|                      | 7. La Persona con el celular repite los pasos 5 y 6 con la otra fotografía.  |
|                      | 8. El sistema marca el enlace como usado y muestra en el teléfono "Todo      |
|                      |    listo" y "Puede cerrar esta página."                                      |
|                      | 9. El sistema muestra en la computadora "Evidencia completa" y el botón      |
|                      |    "Siguiente dispensación".                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: el usuario puede elegir "Subir desde PC" y seleccionar los         |
| alternativo**        |   archivos de receta y entrega en la computadora; se usan el mismo enlace y  |
|                      |   las mismas validaciones del paso 6, con los mensajes "Foto de receta       |
|                      |   subida" o "No se pudo subir la foto de receta".                            |
|                      | - Paso 3: el usuario puede pulsar "Omitir fotos"; el sistema deja de         |
|                      |   consultar el estado y la dispensación queda sin evidencia.                 |
|                      | - Paso 1: si no se puede generar el enlace, el sistema muestra "No se pudo   |
|                      |   generar el código QR para las fotos"; la dispensación ya quedó registrada. |
|                      |   Si la evidencia ya está completa, la API responde "La evidencia de esta    |
|                      |   dispensación ya está completa; no se pueden reemplazar las fotos" (409).   |
|                      | - Pasos 4 y 6: si el enlace no existe, venció o ya se usó, el sistema        |
|                      |   responde "Enlace inválido o expirado" (404) y el teléfono muestra "Pida a  |
|                      |   la encargada que genere un código QR nuevo desde la computadora."          |
|                      | - Paso 6: si la imagen no es JPG, PNG o WEBP, supera 5 MB o no es una imagen |
|                      |   válida, el sistema responde "Formato de imagen no permitido. Use JPG, PNG  |
|                      |   o WEBP", "El archivo supera el tamaño máximo permitido" o "El archivo no   |
|                      |   es una imagen válida" (400).                                               |
|                      | - Paso 6: si ya existía una fotografía del mismo tipo y falta la otra, la    |
|                      |   nueva reemplaza a la anterior, que se elimina.                             |
|                      | - Paso 3: si el usuario entró al sistema por `localhost` y no está           |
|                      |   configurada la dirección de red local, el código QR no se puede abrir      |
|                      |   desde el teléfono.                                                         |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Hasta dos fotografías, una de receta y una de entrega, guardadas en WebP y   |
|                      | visibles solo con sesión. Al completar las dos, el enlace queda usado y las  |
|                      | fotografías ya no se pueden reemplazar. Si se omiten, la dispensación queda  |
|                      | sin evidencia.                                                               |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 64 especifica la consulta de reportes.

Tabla 64.
Caso de uso #17: Consultar reportes

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-17 Consultar reportes                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite consultar seis reportes del inventario y de las dispensaciones con   |
|                      | filtros: Dispensaciones, Consumo por medicamento, Inventario actual, Por     |
|                      | vencer, Entradas y Dados de baja.                                            |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador. La API también permite estas consultas al Encargado de        |
|                      | Beneficencia, pero la pantalla solo se muestra al Administrador.             |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para usar la pantalla.                 |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre Reportes y elige una pestaña.                       |
|                      | 2. El sistema muestra la primera página del reporte, con 20 registros.       |
|                      | 3. El Administrador ajusta los filtros del reporte: rango de fechas,         |
|                      |    beneficiario y medicamento en Dispensaciones; rango de fechas y categoría |
|                      |    en Consumo; categoría y estado en Inventario actual; número de días en    |
|                      |    Por vencer; y rango de fechas en Entradas y en Dados de baja.             |
|                      | 4. El sistema actualiza el reporte con los filtros aplicados.                |
|                      | 5. El Administrador cambia de página.                                        |
|                      | 6. El sistema muestra la página solicitada.                                  |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si no hay registros, el sistema muestra "Sin resultados".          |
| alternativo**        | - Paso 4: si una fecha no es válida o la fecha inicial es posterior a la     |
|                      |   final, la API responde 400; si el estado no es válido, "Estado inválido.   |
|                      |   Use: DISPONIBLE, AGOTADO, VENCIDO, DADO_DE_BAJA" (400).                    |
|                      | - Pasos 2 y 4: si la consulta falla, el sistema muestra "No se pudo cargar   |
|                      |   el reporte".                                                               |
|                      | - Paso 3: en Por vencer, si no se indica un número de días positivo, se usan |
|                      |   90.                                                                        |
|                      | - Paso 1: un usuario sin rol Administrador que intenta abrir la pantalla es  |
|                      |   redirigido al panel.                                                       |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos.                                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 65 especifica la exportación de reportes.

Tabla 65.
Caso de uso #18: Exportar reportes

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-18 Exportar reportes                                                      |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite descargar el reporte que se está consultando, con los filtros        |
|                      | aplicados, en formato PDF o Excel.                                           |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador. El reporte, con los filtros           |
|                      | aplicados, tiene como máximo 5000 registros.                                 |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador consulta un reporte con los filtros deseados (CU-17).    |
|                      | 2. El Administrador pulsa "Exportar PDF" o "Exportar Excel".                 |
|                      | 3. El sistema comprueba el número de registros, genera el archivo (el PDF    |
|                      |    con encabezado institucional, filtros aplicados y numeración de páginas)  |
|                      |    y registra `CREAR` en la bitácora con el tipo, el formato y los filtros.  |
|                      | 4. El sistema descarga el archivo y muestra "Reporte exportado".             |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el reporte supera 5000 registros, el sistema muestra "El        |
| alternativo**        |   reporte tiene \<n\> registros y el máximo exportable es 5000. Reduzca el   |
|                      |   rango de fechas o aplique más filtros." (400).                             |
|                      | - Paso 3: si no hay registros, el PDF se genera con el texto "Sin registros  |
|                      |   para los filtros aplicados."                                               |
|                      | - Paso 3: si el tipo de reporte o el formato no son válidos en una petición  |
|                      |   directa, la API responde "Tipo de reporte inválido. Use: …" o "Formato     |
|                      |   inválido. Use: pdf, xlsx" (400); si el usuario no es Administrador, "No    |
|                      |   tiene permisos para esta acción" (403).                                    |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Archivo PDF o Excel descargado y la exportación registrada en la bitácora.   |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 66 especifica la consulta de la bitácora de auditoría.

Tabla 66.
Caso de uso #19: Consultar bitácora de auditoría

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-19 Consultar bitácora de auditoría                                        |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite al Administrador revisar las acciones registradas en el sistema, con |
|                      | filtros y con los datos anteriores y nuevos de cada registro.                |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador.                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre Auditoría.                                          |
|                      | 2. El sistema muestra los registros del más reciente al más antiguo, 20 por  |
|                      |    página, y carga la lista de usuarios para el filtro.                      |
|                      | 3. El Administrador filtra por usuario, acción, entidad o rango de fechas.   |
|                      | 4. El sistema actualiza la lista con los filtros; la entidad se compara sin  |
|                      |    distinguir mayúsculas.                                                    |
|                      | 5. El Administrador expande un registro.                                     |
|                      | 6. El sistema muestra los datos anteriores y los datos nuevos de la          |
|                      |    operación.                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Pasos 2 y 4: si la consulta falla, el sistema muestra "No se pudo cargar   |
| alternativo**        |   la auditoría" o "No se pudieron cargar los usuarios".                      |
|                      | - Paso 4: si la acción no pertenece al catálogo en una petición directa, la  |
|                      |   API responde "accion inválida. Use: …" (400); si una fecha no es válida,   |
|                      |   400.                                                                       |
|                      | - Paso 3: el filtro ofrece la acción `LOGOUT`, que el sistema nunca          |
|                      |   registra, por lo que no devuelve resultados.                               |
|                      | - Paso 1: un usuario sin rol Administrador es redirigido al panel; una       |
|                      |   petición directa recibe 403.                                               |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos y la consulta no se registra en la      |
|                      | bitácora.                                                                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.


## 4.7 Matrices de trazabilidad

### 4.7.1 Requerimientos funcionales, casos de uso y componentes

La Tabla 67 relaciona cada requerimiento funcional con el caso de uso que lo realiza y con los
componentes que lo implementan: el endpoint de la API, cuyas rutas se escriben sin el prefijo `/api`,
y la página o el componente de la interfaz, ubicados en `frontend/src/pages/` salvo que se indique
otra carpeta.

Tabla 67.
Matriz de trazabilidad de requerimientos funcionales, casos de uso y componentes

| RF | CU | Backend (endpoint o módulo) | Frontend |
|----|----|-----------------------------|----------|
| RF-01 | CU-01 | `POST /auth/login` | `Login.tsx`, `context/AuthContext.tsx` |
| RF-02 | CU-01 | `POST /auth/login`, `middleware/ipRateLimit.ts`, `middleware/loginRateLimit.ts` | `Login.tsx` |
| RF-03 | CU-01, CU-02 | `middleware/auth.ts`, `GET /auth/perfil` | `App.tsx`, `components/layout/Layout.tsx` |
| RF-04 | CU-01 | Sin endpoint | `components/layout/Layout.tsx`, `context/AuthContext.tsx` |
| RF-05 | CU-02 | `POST /usuarios` | `Usuarios.tsx` |
| RF-06 | CU-02 | `PUT /usuarios/:id` | `Usuarios.tsx` |
| RF-07 | CU-02 | `PUT /usuarios/:id/password` | `Usuarios.tsx` |
| RF-08 | CU-02 | `PUT /usuarios/:id/toggle` | `Usuarios.tsx` |
| RF-09 | CU-03 | `POST /catalogos/medicamentos` | `components/MedicamentoFormModal.tsx`, `Entradas.tsx` |
| RF-10 | CU-03 | `POST /catalogos/medicamentos` | `components/MedicamentoFormModal.tsx` |
| RF-11 | CU-03 | `GET /catalogos/medicamentos/lookup-fda/:codigoBarras` | `components/MedicamentoFormModal.tsx` |
| RF-12 | CU-03 | `GET /catalogos/medicamentos`, `PUT /catalogos/medicamentos/:id` | `Catalogos/Medicamentos.tsx`, `components/MedicamentoFormModal.tsx` |
| RF-13 | CU-03 | `POST /catalogos/medicamentos/:id/imagen` | `components/MedicamentoFormModal.tsx` |
| RF-14 | CU-04 | `POST /catalogos/medicamentos/:id/codigos`, `DELETE /catalogos/codigos/:id` | `Catalogos/Medicamentos.tsx` |
| RF-15 | CU-04, CU-07, CU-15 | `GET /catalogos/medicamentos/barcode/:codigo` | `Entradas.tsx`, `Dispensacion.tsx`, `components/MedicamentoFormModal.tsx` |
| RF-16 | CU-05 | `GET`, `POST` y `PUT /catalogos/categorias` | `Catalogos/Categorias.tsx` |
| RF-17 | CU-06 | `GET`, `POST` y `PUT /catalogos/ubicaciones` | `Catalogos/Ubicaciones.tsx` |
| RF-18 | CU-07 | `POST /inventario/entradas` | `Entradas.tsx` |
| RF-19 | CU-07, CU-08 | `POST /inventario/entradas`, `POST /inventario/importar-excel` | `Entradas.tsx` |
| RF-20 | CU-07, CU-03 | `POST /catalogos/medicamentos` | `Entradas.tsx`, `components/MedicamentoFormModal.tsx` |
| RF-21 | CU-07 | `GET /inventario/entradas` | `Entradas.tsx` |
| RF-22 | CU-08 | `GET /inventario/plantilla-excel` | `Entradas.tsx` |
| RF-23 | CU-08 | `POST /inventario/importar-excel` | `Entradas.tsx` |
| RF-24 | CU-08 | `POST /inventario/importar-excel` | `Entradas.tsx` |
| RF-25 | CU-09 | `GET /inventario` | `Inventario.tsx` |
| RF-26 | CU-09 | `GET /inventario/medicamento/:id` | `Inventario.tsx` |
| RF-27 | CU-09, CU-12, CU-15 | `GET /inventario`, `GET /inventario/medicamento/:id`, `GET /inventario/alertas`, `GET /inventario/configuracion` | `Inventario.tsx`, `Dashboard.tsx`, `Dispensacion.tsx` |
| RF-28 | CU-09, CU-12 | `GET /inventario`, `GET /inventario/alertas` | `Inventario.tsx`, `Dashboard.tsx` |
| RF-29 | CU-10 | `PUT /inventario/lotes/:id/baja` | `Inventario.tsx` |
| RF-30 | CU-11 | `services/vencimiento.service.ts` (tarea programada y arranque) | Sin interfaz |
| RF-31 | Ninguno | `PUT /inventario/configuracion` | Sin interfaz |
| RF-32 | CU-13, CU-15 | `POST /dispensacion/beneficiarios` | `Beneficiarios.tsx`, `Dispensacion.tsx` |
| RF-33 | CU-13, CU-14, CU-15 | `GET /dispensacion/beneficiarios/buscar` | `Beneficiarios.tsx`, `Dispensacion.tsx` |
| RF-34 | CU-13 | `PUT /dispensacion/beneficiarios/:id` | `Beneficiarios.tsx` |
| RF-35 | CU-14 | `GET /dispensacion/beneficiarios/:id` | `Beneficiarios.tsx` |
| RF-36 | CU-15 | `GET /catalogos/medicamentos/barcode/:codigo`, `GET /catalogos/medicamentos/buscar`, `GET /dispensacion/stock/:medicamentoId` | `Dispensacion.tsx` |
| RF-37 | CU-15 | `POST /dispensacion/despachar` | `Dispensacion.tsx` |
| RF-38 | CU-15 | `POST /dispensacion/despachar` (`services/dispensacion.service.ts`) | `Dispensacion.tsx` |
| RF-39 | CU-15 | `POST /dispensacion/despachar` (`services/dispensacion.service.ts`) | `Dispensacion.tsx` |
| RF-40 | CU-15, CU-14 | `POST /dispensacion/despachar`, `GET /dispensacion/beneficiarios/:id` | `Dispensacion.tsx`, `Beneficiarios.tsx` |
| RF-41 | CU-15 | `POST /dispensacion/beneficiarios`, `GET /dispensacion/beneficiarios/:id` | `Dispensacion.tsx` |
| RF-42 | CU-16 | `POST /dispensacion/:id/generar-token` | `Dispensacion.tsx` |
| RF-43 | CU-16 | `GET /captura/:token/info`, `POST /captura/:token/foto` | `Captura.tsx`, `Dispensacion.tsx` |
| RF-44 | CU-16 | `GET /dispensacion/:id/fotos` | `Dispensacion.tsx` |
| RF-45 | CU-16 | `POST /captura/:token/foto`, `POST /dispensacion/:id/generar-token` | `Captura.tsx`, `Dispensacion.tsx` |
| RF-46 | CU-14, CU-16 | `GET /dispensacion/:id/foto/:tipo` | `Beneficiarios.tsx`, `components/ui/AuthImage.tsx`, `components/ui/EvidenciaBadge.tsx` |
| RF-47 | CU-17 | `GET /reportes/dispensaciones` | `Reportes.tsx` |
| RF-48 | CU-17 | `GET /reportes/consumo-medicamentos` | `Reportes.tsx` |
| RF-49 | CU-17 | `GET /reportes/inventario-actual` | `Reportes.tsx` |
| RF-50 | CU-17 | `GET /reportes/por-vencer` | `Reportes.tsx` |
| RF-51 | CU-17 | `GET /reportes/entradas` | `Reportes.tsx` |
| RF-52 | CU-17 | `GET /reportes/medicamentos-baja` | `Reportes.tsx` |
| RF-53 | CU-18 | `GET /reportes/exportar/:tipo/:formato` | `Reportes.tsx` |
| RF-54 | CU-01 a CU-08, CU-10, CU-13, CU-15, CU-16, CU-18 | `middleware/audit.ts` (`registrarAuditoria`), invocado por los endpoints de escritura | Sin interfaz |
| RF-55 | CU-19 | `GET /auditoria` | `Auditoria.tsx` |
| RF-56 | CU-12 | `GET /inventario/alertas` | `Dashboard.tsx` |
| RF-57 | CU-12 | `GET /inventario/alertas` | `Dashboard.tsx` |
| RF-58 | CU-12 | `GET /inventario/entradas` | `Dashboard.tsx` |

Fuente: Elaboración propia.

Todos los casos de uso tienen al menos un requerimiento funcional asociado. El único requerimiento
sin caso de uso es RF-31, porque la modificación de los umbrales del semáforo existe en la API pero no
en la interfaz.

### 4.7.2 Casos de uso originales y casos de uso del sistema

La Tabla 68 relaciona los 37 casos de uso del análisis de requerimientos inicial (CUO) con los casos
de uso del sistema. La columna "Cobertura" indica el caso de uso que lo realiza, total o
parcialmente; "Solo API" cuando la función existe en la API sin pantalla; "Excluido" cuando quedó
fuera del alcance por una decisión documentada; y "No aplica" cuando una regla de negocio lo hace
innecesario.

Tabla 68.
Matriz de trazabilidad de los casos de uso originales a los casos de uso del sistema

| CUO | Nombre en el análisis inicial | Cobertura | Observación |
|-----|-------------------------------|-----------|-------------|
| CUO-01 | Registrar entrada de medicamentos | CU-07, CU-08 | Parcial: sin proveedor ni origen de los medicamentos (R-01) |
| CUO-02 | Consultar inventario | CU-09 | Completa |
| CUO-03 | Actualizar stock manualmente | Excluido (R-05) | La baja de un lote completo (CU-10) es la única corrección disponible |
| CUO-04 | Visualizar alertas de stock mínimo | CU-12 | Completa |
| CUO-05 | Visualizar alertas de vencimiento | CU-09, CU-12 | Semáforo en el inventario y alertas en el panel |
| CUO-06 | Registrar venta y generar ticket | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-07 | Consultar pedidos pendientes | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-08 | Confirmar entrega o completar ticket | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-09 | Modificar ticket (anulación parcial) | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-10 | Anular ticket manualmente | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-11 | Reimprimir ticket | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-12 | Registrar devolución de venta | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-13 | Consultar ventas del día (propias) | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-14 | Registrar dispensación gratuita | CU-15 | Completa; se agrega la evidencia fotográfica opcional (CU-16) |
| CUO-15 | Registrar o buscar beneficiario | CU-13 | Completa |
| CUO-16 | Ver historial de beneficiario | CU-14 | Completa |
| CUO-17 | Registrar devolución de beneficencia | No aplica (R-06) | Los medicamentos se dispensan con receta y no se aceptan devoluciones |
| CUO-18 | Consultar dispensaciones del día (propias) | CU-17 | Parcial: el reporte filtra por fecha y no por usuario (R-08) |
| CUO-19 | Reporte de movimientos de inventario | CU-17 | Parcial: reportes separados de entradas, inventario actual, por vencer, dados de baja y dispensaciones |
| CUO-20 | Reporte de ventas | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-21 | Reporte de beneficencia (día, mes o año) | CU-17 | Filtro por rango de fechas |
| CUO-22 | Dashboard de ventas | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-23 | Dashboard de beneficencia | CU-12 | Parcial: un solo panel general, sin gráficos |
| CUO-24 | Dashboard diario propio (ventas) | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-25 | Dashboard diario propio (beneficencia) | CU-12 | Parcial: indicadores de todos los usuarios, no del usuario en sesión |
| CUO-26 | Historial con filtros para Farmacéutico y Encargado de Beneficencia | CU-17 | Parcial: la pantalla de reportes solo se muestra al Administrador (R-07) |
| CUO-27 | Exportar reportes a PDF | CU-18 | Completa; también exporta a Excel |
| CUO-28 | Gestionar usuarios | CU-02 | Completa |
| CUO-29 | Gestionar catálogo de medicamentos | CU-03, CU-04 | Completa |
| CUO-30 | Gestionar catálogo de proveedores | Excluido (R-01) | Proveedores eliminados del sistema |
| CUO-31 | Gestionar catálogo de categorías | CU-05 | Completa |
| CUO-32 | Configurar umbrales de alertas de vencimiento | Solo API | Existe la modificación por API (RF-31) sin pantalla, por lo que no tiene caso de uso |
| CUO-33 | Consultar log de auditoría | CU-19 | Completa |
| CUO-34 | Iniciar o cerrar sesión | CU-01 | Completa; se agrega el límite de intentos |
| CUO-35 | Anular tickets pendientes tras 12 horas | Excluido (R-04) | Farmacia de venta fuera del alcance |
| CUO-36 | Generar alertas de stock mínimo (automático) | CU-12 | Parcial: las alertas se calculan al consultar el panel, sin proceso automático |
| CUO-37 | Generar alertas de vencimiento de 30 y 15 días | CU-11, CU-12 | Parcial: umbrales por defecto de 30 y 90 días; el proceso automático solo marca los lotes vencidos |

Fuente: Elaboración propia con base en el análisis de requerimientos inicial del proyecto.

De los 37 casos de uso originales, 21 están cubiertos por casos de uso del sistema, 8 de ellos de
forma parcial (CUO-01, CUO-18, CUO-19, CUO-23, CUO-25, CUO-26, CUO-36 y CUO-37); uno existe solo en la
API (CUO-32); 14 quedaron excluidos del alcance, 12 por la delimitación a la farmacia de
dispensación gratuita (R-04), uno por la eliminación de proveedores (R-01) y uno por la exclusión del
ajuste manual de stock (R-05); y uno no aplica por regla de negocio (CUO-17, R-06). Cuatro casos de
uso del sistema no tienen un caso original de origen y corresponden a funciones agregadas durante la
construcción: la gestión de ubicaciones (CU-06), la importación desde Excel (CU-08, relacionada con
CUO-01), la baja de lotes (CU-10) y la evidencia fotográfica (CU-16).
