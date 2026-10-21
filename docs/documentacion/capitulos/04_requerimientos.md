# CAPÍTULO IV

# 4 REQUERIMIENTOS

## 4.1 Introducción al capítulo

Este capítulo presenta los requerimientos funcionales y no funcionales de FarmaG, las reglas de
negocio, el modelo de casos de uso con la especificación de cada caso y la matriz de trazabilidad. Los
requerimientos provienen del análisis de requerimientos inicial del proyecto, cuyos casos de uso se
citan como CUO-01 a CUO-37; de la entrevista con el Alcalde Municipal de Gualán incluida en ese
análisis; de las decisiones de alcance tomadas por el equipo y la municipalidad (R-01 a R-09); y de
las funciones agregadas durante la construcción. Se redactan con base en la norma ISO/IEC/IEEE 29148
(ISO, 2018) y describen el sistema tal como quedó construido.

## 4.2 Requerimientos funcionales

La Tabla 28 presenta los 58 requerimientos funcionales agrupados en once módulos. La prioridad
expresa la importancia del requerimiento para la operación de la farmacia: Alta, cuando sin él no se
puede controlar el inventario ni registrar las entregas; Media, cuando facilita o complementa una
tarea principal; y Baja, cuando es una ayuda opcional. La columna "CU" remite a los casos de uso de la
sección 4.6.

Tabla 28.
Requerimientos funcionales por módulo

| ID | Requerimiento | Prioridad | CU |
|----|---------------|-----------|----|
| **Autenticación** | | | |
| RF-01 | Iniciar sesión con usuario y contraseña en las cuentas activas | Alta | CU-01 |
| RF-02 | Bloquear temporalmente el inicio de sesión ante intentos fallidos repetidos | Alta | CU-01 |
| RF-03 | Comprobar en cada operación la sesión, la cuenta activa y el rol vigente | Alta | CU-01, CU-02 |
| RF-04 | Cerrar la sesión | Media | CU-01 |
| **Usuarios** | | | |
| RF-05 | Crear usuarios con rol Administrador o Encargado de Beneficencia | Alta | CU-02 |
| RF-06 | Editar el nombre, el correo y el rol de un usuario | Media | CU-02 |
| RF-07 | Restablecer la contraseña de un usuario | Media | CU-02 |
| RF-08 | Activar y desactivar usuarios sin eliminarlos | Alta | CU-02 |
| **Catálogos** | | | |
| RF-09 | Registrar medicamentos con sus datos, categoría y stock mínimo | Alta | CU-03 |
| RF-10 | Advertir posibles medicamentos duplicados antes de registrarlos | Media | CU-03 |
| RF-11 | Sugerir los datos de un medicamento nuevo a partir de OpenFDA | Baja | CU-03 |
| RF-12 | Editar, desactivar y reactivar medicamentos | Alta | CU-03 |
| RF-13 | Asociar una fotografía a cada medicamento | Baja | CU-03 |
| RF-14 | Vincular y eliminar códigos de barras únicos en el sistema | Alta | CU-04 |
| RF-15 | Identificar un medicamento por su código de barras | Alta | CU-04, CU-07, CU-15 |
| RF-16 | Crear, editar, desactivar y reactivar categorías | Media | CU-05 |
| RF-17 | Crear y editar ubicaciones físicas | Media | CU-06 |
| **Entradas e importación** | | | |
| RF-18 | Registrar una entrada con uno o más lotes en una sola operación | Alta | CU-07 |
| RF-19 | Rechazar lotes con fecha de vencimiento del día o anterior | Alta | CU-07, CU-08 |
| RF-20 | Registrar un medicamento nuevo desde la pantalla de entradas | Media | CU-07, CU-03 |
| RF-21 | Mostrar el historial de las entradas recientes | Media | CU-07 |
| RF-22 | Proporcionar una plantilla de Excel para la importación | Media | CU-08 |
| RF-23 | Importar lotes desde Excel con validación y resumen por fila | Alta | CU-08 |
| RF-24 | Omitir en la importación los lotes repetidos y las filas con catálogos inactivos | Media | CU-08 |
| **Inventario y vencimientos** | | | |
| RF-25 | Mostrar las existencias por medicamento con búsqueda y filtro de stock bajo | Alta | CU-09 |
| RF-26 | Mostrar el detalle de los lotes de un medicamento | Alta | CU-09 |
| RF-27 | Clasificar cada lote en un semáforo de vencimiento | Alta | CU-09, CU-12, CU-15 |
| RF-28 | Señalar los medicamentos con stock bajo | Alta | CU-09, CU-12 |
| RF-29 | Dar de baja un lote de forma definitiva | Alta | CU-10 |
| RF-30 | Marcar cada día los lotes vencidos | Alta | CU-11 |
| RF-31 | Modificar los umbrales del semáforo | Baja | Ninguno |
| **Beneficiarios** | | | |
| RF-32 | Registrar beneficiarios con DPI opcional y único | Alta | CU-13, CU-15 |
| RF-33 | Buscar beneficiarios por nombre o DPI | Alta | CU-13, CU-14, CU-15 |
| RF-34 | Editar los datos de un beneficiario | Media | CU-13 |
| RF-35 | Mostrar el historial de dispensaciones de un beneficiario | Alta | CU-14 |
| **Dispensación** | | | |
| RF-36 | Agregar medicamentos a una dispensación por código de barras o por nombre | Alta | CU-15 |
| RF-37 | Registrar la dispensación después de la confirmación del usuario | Alta | CU-15 |
| RF-38 | Descontar las unidades de los lotes que vencen primero | Alta | CU-15 |
| RF-39 | Verificar el stock al confirmar y evitar descuentos simultáneos | Alta | CU-15 |
| RF-40 | Conservar el lote, el usuario y una copia de los datos del medicamento | Alta | CU-15, CU-14 |
| RF-41 | Registrar un beneficiario y ver sus últimas entregas desde la dispensación | Media | CU-15 |
| **Evidencia fotográfica** | | | |
| RF-42 | Mostrar un código QR con un enlace de captura de 30 minutos | Media | CU-16 |
| RF-43 | Subir las fotografías de receta y entrega desde un teléfono o la computadora | Media | CU-16 |
| RF-44 | Mostrar el estado de cada fotografía y permitir omitirlas | Media | CU-16 |
| RF-45 | Validar las imágenes e impedir reemplazos con la evidencia completa | Media | CU-16 |
| RF-46 | Mostrar las fotografías solo con sesión e indicar el estado de la evidencia | Alta | CU-14, CU-16 |
| **Reportes** | | | |
| RF-47 | Generar el reporte de dispensaciones | Alta | CU-17 |
| RF-48 | Generar el reporte de consumo por medicamento | Media | CU-17 |
| RF-49 | Generar el reporte de inventario actual por lote | Alta | CU-17 |
| RF-50 | Generar el reporte de lotes por vencer | Alta | CU-17 |
| RF-51 | Generar el reporte de entradas | Media | CU-17 |
| RF-52 | Generar el reporte de lotes vencidos y dados de baja con el costo perdido | Media | CU-17 |
| RF-53 | Exportar los reportes a PDF o Excel | Alta | CU-18 |
| **Auditoría** | | | |
| RF-54 | Registrar en una bitácora las operaciones que modifican datos | Alta | CU-01 a CU-08, CU-10, CU-13, CU-15, CU-16, CU-18 |
| RF-55 | Consultar la bitácora con filtros | Alta | CU-19 |
| **Panel** | | | |
| RF-56 | Mostrar los indicadores del día | Media | CU-12 |
| RF-57 | Mostrar las alertas de stock bajo y de vencimiento | Alta | CU-12 |
| RF-58 | Ofrecer accesos directos y la lista de entradas recientes | Baja | CU-12 |

Fuente: Elaboración propia.

El requerimiento RF-31 existe solo en el servidor: no hay una pantalla que permita cambiar los
umbrales del semáforo, por lo que no tiene caso de uso asociado. Una dispensación registrada no se
puede editar, anular ni devolver; la ausencia de devoluciones es una regla de negocio confirmada
(R-06) y no un requerimiento funcional.

## 4.3 Requerimientos no funcionales

Los requerimientos no funcionales se clasifican según las características del modelo de calidad de la
norma ISO/IEC 25010 (ISO, 2023). Se usan los nombres de usabilidad y portabilidad para las
características que la versión de 2023 denomina capacidad de interacción y flexibilidad. Se
identificaron 45 requerimientos no funcionales (RNF-01 a RNF-45); la Tabla 29 presenta los 16 más
importantes con su identificador original y el medio con que se verifica cada uno. Las pruebas
automatizadas citadas se ejecutaron el 20 de octubre de 2026, con 53 casos aprobados de 53; su
detalle se presenta en el capítulo 8.

Tabla 29.
Requerimientos no funcionales principales

| ID | Característica ISO 25010 | Requerimiento | Cómo se verifica |
|----|--------------------------|---------------|------------------|
| RNF-01 | Seguridad | Las contraseñas se guardan cifradas con una función de hash y nunca se muestran | Revisión del código y de las respuestas del sistema |
| RNF-02 | Seguridad | Toda función requiere una sesión válida, salvo las rutas públicas definidas | Petición sin sesión a una función protegida |
| RNF-03 | Seguridad | El servidor restringe el acceso a las funciones según el rol | Petición de un Encargado de Beneficencia a una función exclusiva |
| RNF-04 | Seguridad | El inicio de sesión limita los intentos fallidos y las solicitudes por equipo | Pruebas automatizadas de los dos límites, aprobadas |
| RNF-07 | Seguridad | El enlace de captura no se puede adivinar ni reutilizar | Prueba automatizada del formato del enlace |
| RNF-11 | Seguridad | Las acciones de los usuarios quedan registradas y no se pueden alterar desde el sistema | Comparación de la bitácora con las operaciones realizadas |
| RNF-12 | Seguridad | Los datos de entrada se validan antes de procesarse | Pruebas automatizadas de validación, aprobadas |
| RNF-13 | Fiabilidad | El stock no se descuenta dos veces cuando hay dispensaciones simultáneas | Dos dispensaciones simultáneas sobre el mismo stock |
| RNF-14 | Fiabilidad | No se dispensan lotes vencidos | Pruebas automatizadas de vencimiento, aprobadas |
| RNF-16 | Fiabilidad | La base de datos se respalda cada 12 horas | Registro del último respaldo y restauración en el flujo de despliegue |
| RNF-22 | Usabilidad | La interfaz y los mensajes están en español y explican la causa de cada error | Recorrido de las pantallas |
| RNF-23 | Usabilidad | Los campos de búsqueda admiten un lector de códigos de barras | Prueba con un lector en las tres pantallas que lo usan |
| RNF-28 | Eficiencia de desempeño | Los listados se cargan en páginas de 20 registros | Prueba automatizada de paginación |
| RNF-33 | Mantenibilidad | El backend cuenta con pruebas automatizadas | Ejecución de los 53 casos, todos aprobados |
| RNF-38 | Portabilidad | El sistema se instala en cualquier equipo con Docker | Instalación desde cero en el flujo de despliegue |
| RNF-43 | Compatibilidad | El sistema importa archivos de Excel y exporta a PDF y Excel | Apertura de los archivos exportados |

Fuente: Elaboración propia.

El tiempo de respuesta del sistema no se ha medido, por lo que no se fija una cifra de desempeño. El
sistema se diseñó para cuatro usuarios simultáneos, pero no se realizó una prueba de carga.

## 4.4 Reglas de negocio

Las reglas de negocio son las condiciones que el sistema aplica a los datos y a las operaciones. Del
análisis del código se registraron 77 reglas (RN-01 a RN-77), de las cuales 76 están vigentes y una
fue eliminada. Las que más afectan el trabajo del usuario establecen que el stock de un medicamento es
la suma de sus lotes disponibles y no vencidos, que la dispensación descuenta primero del lote que
vence antes, que un lote vencido no se dispensa, que una dispensación no se edita, anula ni devuelve,
y que los catálogos y los usuarios se desactivan en lugar de eliminarse. La lista completa, con el
mensaje que muestra el sistema en cada caso, se presenta en el Anexo C.

## 4.5 Modelo de casos de uso

### 4.5.1 Actores

El modelo de casos de uso tiene cuatro actores, descritos en la Tabla 30. El Administrador especializa
al Encargado de Beneficencia: hereda todos sus casos de uso y agrega los exclusivos de su rol. En la
operación actual de la farmacia, una sola persona usa una cuenta de Administrador para todas las
tareas (R-09).

Tabla 30.
Actores del sistema

| Actor | Descripción | Participación en el sistema |
|-------|-------------|-----------------------------|
| Encargado de Beneficencia | Persona que registra las entradas, los beneficiarios y las dispensaciones | Consulta catálogos, inventario y panel; registra entradas manuales, beneficiarios, dispensaciones y evidencia |
| Administrador | Persona responsable del sistema; hereda los casos de uso del Encargado de Beneficencia | Además gestiona usuarios y catálogos, importa inventario, da de baja lotes, consulta y exporta reportes y consulta la bitácora |
| Persona con el celular | Quien toma las fotografías de la receta y de la entrega desde un teléfono, mediante el código QR | Sin cuenta ni sesión; su credencial es el enlace de captura vigente |
| Sistema | Proceso automático programado en el servidor | Marca los lotes vencidos y elimina los enlaces de captura vencidos |

Fuente: Elaboración propia.

### 4.5.2 Diagrama general

La Figura 1 muestra los 19 casos de uso del sistema agrupados en cinco paquetes: Seguridad,
Catálogos, Inventario, Dispensación, y Reportes y auditoría. El Encargado de Beneficencia participa
en los cuatro primeros, que hereda el Administrador; los reportes y la bitácora son exclusivos del
Administrador, igual que la gestión de usuarios dentro del paquete de Seguridad. En los catálogos, el
Encargado únicamente consulta. La Persona con el celular solo participa en el registro de la
evidencia fotográfica, y el Sistema solo en la actualización de los lotes vencidos.

Figura 1.
Modelo general de casos de uso

{{imagen: v2_casos_uso_general.png}}

Fuente: Elaboración propia.

## 4.6 Especificación de casos de uso

En esta sección se especifican los 19 casos de uso del sistema, en las Tablas 51 a 69. El flujo
normal describe los pasos principales del actor y del sistema; el flujo alternativo indica en qué paso
se desvía el caso y qué ocurre. Los textos entre comillas son los mensajes que muestra el sistema.
Cuando el actor es el Encargado de Beneficencia, el caso también lo realiza el Administrador.

La Tabla 51 especifica el caso de uso CU-01.

Tabla 51.
Caso de uso #1: Iniciar y cerrar sesión

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-01 Iniciar y cerrar sesión                                                |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite a un usuario registrado entrar al sistema con su usuario y           |
|                      | contraseña, y salir de él.                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | La cuenta existe y está activa.                                              |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre el sistema y el sistema muestra la pantalla de inicio de  |
|                      |    sesión.                                                                   |
|                      | 2. El usuario escribe su usuario y su contraseña y pulsa "Iniciar sesión".   |
|                      | 3. El sistema verifica las credenciales y que la cuenta esté activa.         |
|                      | 4. El sistema registra el acceso en la bitácora, abre el panel y muestra el  |
|                      |    menú que corresponde al rol del usuario.                                  |
|                      | 5. Para salir, el usuario pulsa "Cerrar sesión".                             |
|                      | 6. El sistema cierra la sesión y vuelve a la pantalla de inicio de sesión.   |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si las credenciales no son válidas, el sistema muestra             |
| alternativo**        |   "Credenciales inválidas" y el usuario vuelve a intentarlo.                 |
|                      | - Paso 3: después de tres intentos fallidos del mismo usuario, el sistema    |
|                      |   bloquea el acceso durante 5 minutos; también limita las solicitudes        |
|                      |   repetidas desde un mismo equipo.                                           |
|                      | - Después del paso 4: si la sesión vence o la cuenta se desactiva, el        |
|                      |   sistema vuelve a pedir el inicio de sesión.                                |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Al iniciar, sesión abierta por 8 horas mientras la cuenta siga activa. Al    |
|                      | cerrar, sesión eliminada del navegador.                                      |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 52 especifica el caso de uso CU-02.

Tabla 52.
Caso de uso #2: Gestionar usuarios

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-02 Gestionar usuarios                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite al Administrador crear usuarios, editar sus datos y su rol,          |
|                      | restablecer su contraseña y activarlos o desactivarlos.                      |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador.                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre Usuarios y el sistema muestra la lista de usuarios  |
|                      |    con su rol, su estado y su último acceso.                                 |
|                      | 2. El Administrador pulsa "Nuevo usuario" e ingresa usuario, nombre          |
|                      |    completo, correo, contraseña y rol.                                       |
|                      | 3. El sistema valida los datos, guarda el usuario y registra la operación en |
|                      |    la bitácora.                                                              |
|                      | 4. Para editar, el Administrador cambia el nombre, el correo o el rol de un  |
|                      |    usuario y guarda.                                                         |
|                      | 5. Para restablecer la contraseña, el Administrador escribe la nueva         |
|                      |    contraseña del usuario.                                                   |
|                      | 6. Para activar o desactivar, el Administrador pulsa el botón de estado del  |
|                      |    usuario.                                                                  |
|                      | 7. El sistema guarda cada cambio, lo registra en la bitácora y actualiza la  |
|                      |    lista.                                                                    |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el nombre de usuario ya existe o la contraseña tiene menos de 6 |
| alternativo**        |   caracteres, el sistema muestra el error y no guarda.                       |
|                      | - Pasos 4 y 6: el Administrador no puede quitarse su propio rol ni           |
|                      |   desactivar su propia cuenta.                                               |
|                      | - Paso 1: un usuario que no es Administrador no puede abrir esta opción.     |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Usuario creado, modificado, activado o desactivado, o con contraseña         |
|                      | restablecida. Los cambios de rol y de estado rigen desde la siguiente        |
|                      | operación del usuario afectado.                                              |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 53 especifica el caso de uso CU-03.

Tabla 53.
Caso de uso #3: Gestionar medicamentos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-03 Gestionar medicamentos                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite registrar, editar, activar o desactivar los medicamentos del         |
|                      | catálogo y asociarles una fotografía.                                        |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta). Actor secundario:  |
|                      | servicio OpenFDA.                                                            |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para modificar. Existe al menos una    |
|                      | categoría activa.                                                            |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador pulsa "Nuevo medicamento" en Registrar entrada.          |
|                      | 2. El Administrador escanea o escribe el código de barras del producto.      |
|                      | 3. Si el código no está registrado, el sistema consulta OpenFDA y llena el   |
|                      |    formulario con los datos sugeridos.                                       |
|                      | 4. El Administrador completa o corrige el nombre genérico, la presentación,  |
|                      |    la concentración, la unidad de medida, la categoría y el stock mínimo, y  |
|                      |    guarda.                                                                   |
|                      | 5. El sistema busca medicamentos similares, registra el medicamento y anota  |
|                      |    la operación en la bitácora.                                              |
|                      | 6. Para editar, el Administrador abre el medicamento en Catálogos, modifica  |
|                      |    sus datos o sube una fotografía y guarda.                                 |
|                      | 7. Para activar o desactivar, el Administrador pulsa el botón de estado.     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si OpenFDA no tiene datos del código, el Administrador llena el    |
| alternativo**        |   formulario manualmente.                                                    |
|                      | - Paso 5: si hay medicamentos similares, el sistema muestra "Posibles        |
|                      |   duplicados"; el Administrador puede revisar los datos o crear el           |
|                      |   medicamento de todos modos.                                                |
|                      | - Paso 6: si la fotografía no es JPG, PNG o WEBP o supera 5 MB, el sistema   |
|                      |   la rechaza.                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Medicamento registrado, editado, activado o desactivado, o con fotografía    |
|                      | nueva. Un medicamento inactivo sigue visible en el catálogo, pero no se usa  |
|                      | en entradas ni en dispensaciones.                                            |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 54 especifica el caso de uso CU-04.

Tabla 54.
Caso de uso #4: Gestionar códigos de barras

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-04 Gestionar códigos de barras                                            |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite vincular a un medicamento uno o más códigos de barras, que luego     |
|                      | sirven para identificarlo con un lector, y eliminarlos.                      |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta).                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para agregar o eliminar. El            |
|                      | medicamento existe.                                                          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre los códigos de barras de un medicamento en la       |
|                      |    pestaña Medicamentos.                                                     |
|                      | 2. El sistema muestra los códigos vinculados al medicamento.                 |
|                      | 3. El Administrador escanea o escribe el código, agrega una descripción      |
|                      |    opcional y pulsa "Agregar".                                               |
|                      | 4. El sistema comprueba que el código no esté registrado, lo vincula y       |
|                      |    registra la operación en la bitácora.                                     |
|                      | 5. Para eliminar, el Administrador pulsa eliminar junto a un código y el     |
|                      |    sistema lo elimina.                                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el código ya está registrado en algún medicamento, el sistema   |
| alternativo**        |   muestra "Este código de barras ya está registrado en otro medicamento".    |
|                      | - Paso 2: el Encargado de Beneficencia ve los códigos, pero no puede         |
|                      |   agregarlos ni eliminarlos.                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Código vinculado al medicamento y único en el sistema, o eliminado. La       |
|                      | operación queda en la bitácora.                                              |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 55 especifica el caso de uso CU-05.

Tabla 55.
Caso de uso #5: Gestionar categorías

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-05 Gestionar categorías                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite crear, editar, activar y desactivar las categorías con que se        |
|                      | clasifican los medicamentos.                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta).                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para modificar.                        |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre la pestaña Categorías del catálogo y el sistema     |
|                      |    lista las categorías.                                                     |
|                      | 2. El Administrador pulsa "Nueva categoría", o editar en una existente, y    |
|                      |    escribe el nombre y la descripción.                                       |
|                      | 3. El sistema valida que el nombre no esté vacío ni repetido, guarda la      |
|                      |    categoría y registra la operación en la bitácora.                         |
|                      | 4. Para activar o desactivar, el Administrador pulsa el botón de estado.     |
|                      | 5. El sistema cambia el estado y actualiza la lista.                         |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el nombre está vacío o ya existe, el sistema muestra el error y |
| alternativo**        |   no guarda.                                                                 |
|                      | - Paso 1: el Encargado de Beneficencia ve la lista sin opciones de           |
|                      |   modificación.                                                              |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Categoría creada, editada, activada o desactivada, con nombre único. Una     |
|                      | categoría inactiva deja de aparecer en los selectores y no se usa en la      |
|                      | importación.                                                                 |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 56 especifica el caso de uso CU-06.

Tabla 56.
Caso de uso #6: Gestionar ubicaciones

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-06 Gestionar ubicaciones                                                  |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite crear y editar las ubicaciones físicas (estantes) donde se guardan   |
|                      | los lotes.                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador; Encargado de Beneficencia (solo consulta).                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador para modificar.                        |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre la pestaña Ubicaciones del catálogo.                |
|                      | 2. El sistema lista las ubicaciones registradas.                             |
|                      | 3. El Administrador pulsa "Nueva ubicación", o editar en una existente, y    |
|                      |    escribe el código y la descripción.                                       |
|                      | 4. El sistema valida que el código no esté vacío ni repetido y guarda la     |
|                      |    ubicación.                                                                |
|                      | 5. El sistema registra la operación en la bitácora y actualiza la lista.     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el código está vacío o ya existe, el sistema muestra el error y |
| alternativo**        |   no guarda.                                                                 |
|                      | - Paso 2: el Encargado de Beneficencia ve la lista sin opciones de           |
|                      |   modificación.                                                              |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ubicación creada o editada, con código único. Las ubicaciones no se          |
|                      | desactivan ni se eliminan.                                                   |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 57 especifica el caso de uso CU-07.

Tabla 57.
Caso de uso #7: Registrar entrada de medicamentos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-07 Registrar entrada de medicamentos                                      |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite registrar los medicamentos recibidos por la farmacia como una        |
|                      | entrada con uno o más lotes, cada uno con su cantidad y su fecha de          |
|                      | vencimiento.                                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada. Los medicamentos existen y están activos, o el usuario es   |
|                      | Administrador y puede registrarlos.                                          |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre Registrar entrada.                                        |
|                      | 2. Por cada lote, el usuario escanea el código de barras del producto o      |
|                      |    elige el medicamento en la lista.                                         |
|                      | 3. El sistema identifica el medicamento y lo selecciona en el lote.          |
|                      | 4. El usuario ingresa el número de lote, la cantidad, la fecha de            |
|                      |    vencimiento y, si lo desea, la ubicación y el costo unitario.             |
|                      | 5. El usuario agrega más lotes si hace falta y pulsa "Registrar entrada".    |
|                      | 6. El sistema valida cada lote, guarda la entrada con todos sus lotes y      |
|                      |    registra la operación en la bitácora.                                     |
|                      | 7. El sistema muestra "Entrada registrada" y actualiza las entradas          |
|                      |    recientes.                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el código no está registrado, el sistema lo indica; el          |
| alternativo**        |   Administrador puede registrar el medicamento en ese momento (CU-03) y      |
|                      |   continuar.                                                                 |
|                      | - Paso 6: si un lote vence hoy o antes, le faltan datos o su medicamento     |
|                      |   está inactivo, el sistema muestra el error y no registra ningún lote de la |
|                      |   entrada.                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Una entrada con sus lotes en estado disponible; el stock del medicamento     |
|                      | aumenta. Si un lote no es válido, no se registra ninguno.                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 58 especifica el caso de uso CU-08.

Tabla 58.
Caso de uso #8: Importar inventario desde Excel

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-08 Importar inventario desde Excel                                        |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite al Administrador cargar muchos lotes a la vez desde un archivo de    |
|                      | Excel con el formato de la plantilla del sistema.                            |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador. Archivo de Excel con las columnas de  |
|                      | la plantilla.                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador pulsa "Importar desde Excel" en Registrar entrada y      |
|                      |    descarga la plantilla.                                                    |
|                      | 2. El Administrador llena la plantilla, la selecciona y pulsa "Importar".    |
|                      | 3. El sistema valida el archivo, sus columnas y cada fila.                   |
|                      | 4. Por cada fila válida, el sistema crea la categoría, la ubicación y el     |
|                      |    medicamento que falten, vincula el código de barras si está libre y       |
|                      |    registra una entrada con su lote.                                         |
|                      | 5. El sistema registra cada operación en la bitácora.                        |
|                      | 6. El sistema muestra el resumen con los lotes registrados, los medicamentos |
|                      |    nuevos y la lista de errores y avisos por fila.                           |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el archivo no es un Excel válido o le faltan columnas, el       |
| alternativo**        |   sistema muestra el error y no importa nada.                                |
|                      | - Paso 3: una fila con datos inválidos o con un medicamento o una categoría  |
|                      |   inactivos se informa con su número y se omite; las demás se procesan.      |
|                      | - Paso 4: si el mismo lote ya existía antes de la importación, la fila se    |
|                      |   omite con un aviso.                                                        |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Por cada fila importada, una entrada con un lote disponible y, si hacía      |
|                      | falta, la categoría, la ubicación y el medicamento nuevos. Las filas con     |
|                      | error no dejan registros.                                                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 59 especifica el caso de uso CU-09.

Tabla 59.
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
|                      | 2. El sistema muestra cada medicamento activo con su stock, su número de     |
|                      |    lotes, su próximo vencimiento, el semáforo y la marca de stock bajo, en   |
|                      |    páginas de 20.                                                            |
|                      | 3. El usuario busca por texto o marca "Solo stock bajo".                     |
|                      | 4. El sistema actualiza la lista con los filtros.                            |
|                      | 5. El usuario pulsa "Detalle" en un medicamento.                             |
|                      | 6. El sistema muestra todos sus lotes con la cantidad, la fecha de           |
|                      |    vencimiento, los días para vencer, el semáforo, el estado y la ubicación. |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 2: un medicamento sin lotes dispensables se muestra con el semáforo   |
| alternativo**        |   "Sin stock".                                                               |
|                      | - Paso 6: desde el detalle, el Administrador puede dar de baja un lote       |
|                      |   (CU-10).                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos.                                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 60 especifica el caso de uso CU-10.

Tabla 60.
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
|                      | 3. El sistema pide confirmación, advierte que la acción no se puede deshacer |
|                      |    y ofrece el campo "Motivo (opcional)".                                    |
|                      | 4. El Administrador escribe el motivo, si lo desea, y confirma.              |
|                      | 5. El sistema cambia el lote a dado de baja y registra la operación y el     |
|                      |    motivo en la bitácora.                                                    |
|                      | 6. El sistema muestra "Lote dado de baja" y actualiza el detalle.            |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si el Administrador cancela, el lote no cambia.                    |
| alternativo**        | - Paso 2: el botón no aparece en los lotes ya dados de baja ni para otros    |
|                      |   roles.                                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Lote dado de baja de forma definitiva, fuera del stock y presente en el      |
|                      | reporte de dados de baja.                                                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 61 especifica el caso de uso CU-11.

Tabla 61.
Caso de uso #11: Actualizar lotes vencidos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-11 Actualizar lotes vencidos                                              |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Proceso automático que marca como vencidos los lotes cuya fecha de           |
|                      | vencimiento llegó y elimina los enlaces de captura vencidos.                 |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Sistema (proceso automático).                                                |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | El sistema está en ejecución y llega la hora programada (00:05, hora de      |
|                      | Guatemala), o el sistema acaba de arrancar.                                  |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Sistema inicia el proceso a las 00:05 o al arrancar.                   |
|                      | 2. El Sistema busca los lotes disponibles cuya fecha de vencimiento es el    |
|                      |    día actual o anterior.                                                    |
|                      | 3. El Sistema cambia esos lotes al estado vencido.                           |
|                      | 4. El Sistema elimina los enlaces de captura cuyo plazo ya pasó.             |
|                      | 5. Los lotes vencidos aparecen en las alertas del panel como vencidos sin    |
|                      |    baja.                                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Si el sistema estuvo apagado a las 00:05, el proceso se ejecuta en el      |
| alternativo**        |   siguiente arranque; mientras tanto, un lote vencido no se dispensa ni      |
|                      |   cuenta como stock.                                                         |
|                      | - Paso 3: si el marcado falla, el error queda en el registro del servidor y  |
|                      |   el proceso continúa con el paso 4.                                         |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Todo lote disponible con fecha de vencimiento del día actual o anterior      |
|                      | queda vencido. Estos cambios no se registran en la bitácora.                 |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 62 especifica el caso de uso CU-12.

Tabla 62.
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
|                      | 2. El sistema calcula las alertas de inventario en ese momento.              |
|                      | 3. El sistema muestra el aviso "Todo en orden" o el número de asuntos que    |
|                      |    requieren atención.                                                       |
|                      | 4. El sistema muestra las acciones rápidas, los indicadores (medicamentos,   |
|                      |    stock bajo, por vencer y dispensaciones del día), los paneles de alertas  |
|                      |    y las entradas recientes.                                                 |
|                      | 5. El usuario pulsa una acción rápida o el enlace de una alerta.             |
|                      | 6. El sistema abre Dispensación, Registrar entrada, Inventario o Catálogos.  |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 4: si un panel no tiene elementos, el sistema lo indica con un        |
| alternativo**        |   mensaje, como "No hay lotes próximos a vencer".                            |
|                      | - Paso 2: si una consulta falla, la parte correspondiente del panel queda    |
|                      |   vacía.                                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos.                                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 63 especifica el caso de uso CU-13.

Tabla 63.
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
| **Flujo normal**     | 1. El usuario abre Beneficiarios y el sistema lista los beneficiarios        |
|                      |    registrados más recientemente.                                            |
|                      | 2. El usuario escribe al menos 2 caracteres del nombre o del DPI.            |
|                      | 3. El sistema muestra las coincidencias.                                     |
|                      | 4. El usuario pulsa "Nuevo beneficiario" e ingresa el nombre completo y, si  |
|                      |    los tiene, el DPI, el teléfono, la dirección y las observaciones.         |
|                      | 5. El sistema valida los datos, guarda al beneficiario, registra la          |
|                      |    operación en la bitácora y muestra "Beneficiario registrado".             |
|                      | 6. Para editar, el usuario cambia los datos de un beneficiario y guarda.     |
|                      | 7. El sistema valida los datos, guarda los cambios y los registra en la      |
|                      |    bitácora.                                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Pasos 5 y 7: si el nombre tiene menos de 3 caracteres, o el DPI no tiene   |
| alternativo**        |   13 dígitos o ya pertenece a otro beneficiario, el sistema muestra el error |
|                      |   y no guarda.                                                               |
|                      | - Paso 4: el registro también se puede hacer desde Dispensación (CU-15).     |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Beneficiario registrado o editado, con DPI único cuando se indica. Los       |
|                      | beneficiarios no se desactivan ni se eliminan.                               |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 64 especifica el caso de uso CU-14.

Tabla 64.
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
| **Flujo normal**     | 1. El usuario busca al beneficiario en Beneficiarios (CU-13).                |
|                      | 2. El usuario pulsa "Ver detalle".                                           |
|                      | 3. El sistema muestra los datos del beneficiario y su historial: fecha,      |
|                      |    usuario que atendió, medicamentos y cantidades entregados y               |
|                      |    observaciones.                                                            |
|                      | 4. El sistema indica en cada dispensación si la evidencia está completa, es  |
|                      |    parcial o no existe, y muestra las miniaturas de las fotografías.         |
|                      | 5. El usuario pulsa una miniatura.                                           |
|                      | 6. El sistema muestra la fotografía ampliada.                                |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el beneficiario no tiene dispensaciones, el sistema muestra "No |
| alternativo**        |   hay dispensaciones registradas".                                           |
|                      | - Paso 3: si la consulta falla, el sistema muestra "Error al cargar          |
|                      |   detalle".                                                                  |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos. El historial muestra los datos del     |
|                      | medicamento guardados al momento de la entrega.                              |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 65 especifica el caso de uso CU-15.

Tabla 65.
Caso de uso #15: Dispensar medicamentos

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-15 Dispensar medicamentos                                                 |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Registra la entrega gratuita de uno o más medicamentos a un beneficiario y   |
|                      | descuenta las unidades de los lotes que vencen primero.                      |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Encargado de Beneficencia, Administrador.                                    |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada. Hay al menos un medicamento activo con lotes disponibles no |
|                      | vencidos.                                                                    |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El usuario abre Dispensación y busca al beneficiario por nombre o DPI.    |
|                      | 2. El usuario elige al beneficiario y el sistema muestra sus cinco           |
|                      |    dispensaciones más recientes.                                             |
|                      | 3. El usuario escanea el código de barras de cada medicamento o lo busca por |
|                      |    nombre.                                                                   |
|                      | 4. El sistema agrega el medicamento a la lista con su stock disponible y el  |
|                      |    semáforo del próximo vencimiento.                                         |
|                      | 5. El usuario ajusta las cantidades, escribe observaciones si lo desea y     |
|                      |    pulsa "Confirmar dispensación".                                           |
|                      | 6. El sistema muestra el resumen y el usuario pulsa "Dispensar".             |
|                      | 7. El sistema verifica el stock, descuenta las unidades de los lotes que     |
|                      |    vencen primero y registra la dispensación en la bitácora.                 |
|                      | 8. El sistema muestra "Dispensación registrada correctamente" y la pantalla  |
|                      |    de evidencia fotográfica (CU-16).                                         |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 1: si el beneficiario no está registrado, el usuario lo registra en   |
| alternativo**        |   ese momento (CU-13) y continúa.                                            |
|                      | - Paso 4: si el medicamento no tiene stock disponible o ya está en la lista, |
|                      |   el sistema lo indica y no lo agrega.                                       |
|                      | - Paso 7: si el stock ya no alcanza, por ejemplo porque otra dispensación    |
|                      |   tomó las unidades, el sistema muestra "Stock insuficiente" con la cantidad |
|                      |   disponible y no registra nada.                                             |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Dispensación registrada con el lote usado de cada medicamento; los lotes que |
|                      | llegan a cero quedan agotados. La dispensación no se puede editar, anular ni |
|                      | devolver.                                                                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 66 especifica el caso de uso CU-16.

Tabla 66.
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
| **Precondición**     | La dispensación está registrada (CU-15). Para usar el código QR, el teléfono |
|                      | está en la misma red que el servidor.                                        |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El sistema muestra en la computadora un código QR con un enlace de        |
|                      |    captura válido por 30 minutos.                                            |
|                      | 2. La Persona con el celular escanea el código QR.                           |
|                      | 3. El sistema muestra en el teléfono el nombre del beneficiario y los        |
|                      |    botones para fotografiar la receta y la entrega.                          |
|                      | 4. La Persona con el celular toma la fotografía de la receta y pulsa         |
|                      |    "Subir".                                                                  |
|                      | 5. El sistema guarda la fotografía y muestra "Receta subida".                |
|                      | 6. La Persona con el celular repite los pasos 4 y 5 con la fotografía de la  |
|                      |    entrega.                                                                  |
|                      | 7. El sistema muestra en el teléfono "Todo listo" y en la computadora        |
|                      |    "Evidencia completa".                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 2: el usuario puede elegir "Subir desde PC" y seleccionar las         |
| alternativo**        |   fotografías en la computadora, o pulsar "Omitir fotos", con lo que la      |
|                      |   dispensación queda sin evidencia.                                          |
|                      | - Pasos 3 y 5: si el enlace venció o ya se usó, el teléfono indica que el    |
|                      |   enlace no es válido y pide generar un código nuevo.                        |
|                      | - Paso 5: si la imagen no es JPG, PNG o WEBP o supera 5 MB, el sistema la    |
|                      |   rechaza.                                                                   |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Hasta dos fotografías, visibles solo con sesión. Al completar las dos, el    |
|                      | enlace deja de servir y las fotografías ya no se pueden reemplazar.          |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 67 especifica el caso de uso CU-17.

Tabla 67.
Caso de uso #17: Consultar reportes

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-17 Consultar reportes                                                     |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite consultar con filtros seis reportes: Dispensaciones, Consumo por     |
|                      | medicamento, Inventario actual, Por vencer, Entradas y Dados de baja.        |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador. El servidor también permite estas consultas al Encargado de   |
|                      | Beneficencia, pero la pantalla solo se muestra al Administrador.             |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador.                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador abre Reportes.                                           |
|                      | 2. El Administrador elige uno de los seis reportes.                          |
|                      | 3. El sistema muestra la primera página del reporte.                         |
|                      | 4. El Administrador ajusta los filtros del reporte, como el rango de fechas, |
|                      |    el beneficiario, el medicamento, la categoría o el estado.                |
|                      | 5. El sistema actualiza el reporte con los filtros aplicados.                |
|                      | 6. El Administrador cambia de página para ver más registros.                 |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 5: si no hay registros, el sistema muestra "Sin resultados".          |
| alternativo**        | - Paso 4: en Por vencer, si no se indica el número de días, se usan 90.      |
|                      | - Paso 1: un usuario que no es Administrador no puede abrir la pantalla.     |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos.                                        |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 68 especifica el caso de uso CU-18.

Tabla 68.
Caso de uso #18: Exportar reportes

+----------------------+------------------------------------------------------------------------------+
| **Caso de uso**      | CU-18 Exportar reportes                                                      |
+----------------------+------------------------------------------------------------------------------+
| **Descripción**      | Permite descargar el reporte que se está consultando, con los filtros        |
|                      | aplicados, en formato PDF o Excel.                                           |
+----------------------+------------------------------------------------------------------------------+
| **Actores**          | Administrador.                                                               |
+----------------------+------------------------------------------------------------------------------+
| **Precondición**     | Sesión iniciada con rol Administrador.                                       |
+----------------------+------------------------------------------------------------------------------+
| **Flujo normal**     | 1. El Administrador consulta un reporte con los filtros deseados (CU-17).    |
|                      | 2. El Administrador pulsa "Exportar PDF" o "Exportar Excel".                 |
|                      | 3. El sistema comprueba que el reporte no supere 5000 registros.             |
|                      | 4. El sistema genera el archivo con los filtros aplicados; el PDF lleva el   |
|                      |    encabezado institucional y la numeración de páginas.                      |
|                      | 5. El sistema registra la exportación en la bitácora, descarga el archivo y  |
|                      |    muestra "Reporte exportado".                                              |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 3: si el reporte supera 5000 registros, el sistema pide reducir el    |
| alternativo**        |   rango de fechas o aplicar más filtros.                                     |
|                      | - Paso 4: si no hay registros, el PDF indica "Sin registros para los filtros |
|                      |   aplicados."                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Archivo PDF o Excel descargado y la exportación registrada en la bitácora.   |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

La Tabla 69 especifica el caso de uso CU-19.

Tabla 69.
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
|                      | 2. El sistema muestra los registros del más reciente al más antiguo, en      |
|                      |    páginas de 20.                                                            |
|                      | 3. El Administrador filtra por usuario, acción, entidad o rango de fechas.   |
|                      | 4. El sistema actualiza la lista con los filtros.                            |
|                      | 5. El Administrador expande un registro.                                     |
|                      | 6. El sistema muestra los datos anteriores y los datos nuevos de la          |
|                      |    operación.                                                                |
+----------------------+------------------------------------------------------------------------------+
| **Flujo              | - Paso 2: si la consulta falla, el sistema muestra "No se pudo cargar la     |
| alternativo**        |   auditoría".                                                                |
|                      | - Paso 3: el filtro de acciones incluye el cierre de sesión, que el sistema  |
|                      |   no registra, por lo que no devuelve resultados.                            |
|                      | - Paso 1: un usuario que no es Administrador no puede abrir la pantalla.     |
+----------------------+------------------------------------------------------------------------------+
| **Postcondiciones**  | Ninguna; el caso solo consulta datos y la consulta no se registra en la      |
|                      | bitácora.                                                                    |
+----------------------+------------------------------------------------------------------------------+

Fuente: Elaboración propia.

## 4.7 Matriz de trazabilidad

La Tabla 70 relaciona cada requerimiento funcional con los casos de uso que lo realizan.

Tabla 70.
Matriz de trazabilidad de requerimientos funcionales a casos de uso

| RF | CU | RF | CU |
|----|----|----|----|
| RF-01 | CU-01 | RF-30 | CU-11 |
| RF-02 | CU-01 | RF-31 | Ninguno |
| RF-03 | CU-01, CU-02 | RF-32 | CU-13, CU-15 |
| RF-04 | CU-01 | RF-33 | CU-13, CU-14, CU-15 |
| RF-05 | CU-02 | RF-34 | CU-13 |
| RF-06 | CU-02 | RF-35 | CU-14 |
| RF-07 | CU-02 | RF-36 | CU-15 |
| RF-08 | CU-02 | RF-37 | CU-15 |
| RF-09 | CU-03 | RF-38 | CU-15 |
| RF-10 | CU-03 | RF-39 | CU-15 |
| RF-11 | CU-03 | RF-40 | CU-15, CU-14 |
| RF-12 | CU-03 | RF-41 | CU-15 |
| RF-13 | CU-03 | RF-42 | CU-16 |
| RF-14 | CU-04 | RF-43 | CU-16 |
| RF-15 | CU-04, CU-07, CU-15 | RF-44 | CU-16 |
| RF-16 | CU-05 | RF-45 | CU-16 |
| RF-17 | CU-06 | RF-46 | CU-14, CU-16 |
| RF-18 | CU-07 | RF-47 | CU-17 |
| RF-19 | CU-07, CU-08 | RF-48 | CU-17 |
| RF-20 | CU-07, CU-03 | RF-49 | CU-17 |
| RF-21 | CU-07 | RF-50 | CU-17 |
| RF-22 | CU-08 | RF-51 | CU-17 |
| RF-23 | CU-08 | RF-52 | CU-17 |
| RF-24 | CU-08 | RF-53 | CU-18 |
| RF-25 | CU-09 | RF-54 | CU-01 a CU-08, CU-10, CU-13, CU-15, CU-16, CU-18 |
| RF-26 | CU-09 | RF-55 | CU-19 |
| RF-27 | CU-09, CU-12, CU-15 | RF-56 | CU-12 |
| RF-28 | CU-09, CU-12 | RF-57 | CU-12 |
| RF-29 | CU-10 | RF-58 | CU-12 |

Fuente: Elaboración propia.

Todos los casos de uso tienen al menos un requerimiento funcional asociado. El único requerimiento
sin caso de uso es RF-31, porque la modificación de los umbrales del semáforo existe en el servidor
pero no en la interfaz. La relación entre los casos de uso del análisis inicial y el alcance final se
resume en la tabla de exclusiones del capítulo 1 (Tabla 1).
