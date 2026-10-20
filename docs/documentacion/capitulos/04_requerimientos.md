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
| RNF-22 | La interfaz y los mensajes están en español y describen la causa de cada error | Cada operación muestra una notificación de éxito o el mensaje de error del servidor (por ejemplo, "Stock insuficiente para <medicamento>. Solicitado: <n>, Disponible: <m>") | Recorrido de las pantallas; casos de prueba del capítulo 8 |
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
presenta en el anexo [COMPLETAR: identificador del anexo de reglas de negocio].

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
