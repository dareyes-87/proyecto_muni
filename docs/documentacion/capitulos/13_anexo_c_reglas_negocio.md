# ANEXO C

# REGLAS DE NEGOCIO

Este anexo presenta las 76 reglas de negocio vigentes del sistema FarmaG. Los identificadores no se
renumeran: la regla RN-26, eliminada durante la corrección de defectos, conserva su número y no se
incluye. En la Tabla 201 se presenta cada regla con el módulo al que pertenece.

Tabla 201.
Reglas de negocio del sistema

| ID | Regla | Módulo |
|----|-------|--------|
| RN-01 | Todo lote se crea disponible y con una cantidad actual igual a la cantidad recibida, tanto en el registro manual de entradas como en la importación por Excel. | Entradas |
| RN-02 | El stock de un medicamento es la suma de las existencias de sus lotes; solo cuenta como dispensable un lote disponible, con existencias y no vencido según RN-71. | Inventario |
| RN-03 | Cuando una dispensación deja un lote sin existencias, el lote pasa a agotado; si quedan unidades, sigue disponible. | Dispensación |
| RN-04 | Un proceso automático diario, que también se ejecuta al arrancar el sistema, marca como vencido todo lote disponible cuya fecha de vencimiento sea hoy o anterior. No afecta a los lotes agotados ni dados de baja. | Inventario |
| RN-05 | Solo el Administrador puede dar de baja un lote que no lo esté ya, previa confirmación; la baja no se puede revertir. | Inventario |
| RN-06 | El motivo de la baja es opcional y queda registrado solo en la bitácora de auditoría. | Inventario |
| RN-07 | La cantidad de un lote solo disminuye por dispensación; no existe ajuste manual de existencias y las correcciones se limitan a dar de baja lotes completos. | Inventario |
| RN-08 | Las entradas no registran proveedor, donante ni origen de los medicamentos. | Entradas |
| RN-09 | Al dispensar, los lotes se toman automáticamente en orden FIFO por fecha de vencimiento, solo entre los lotes disponibles, con existencias y no vencidos; la cantidad pedida puede repartirse entre varios lotes. | Dispensación |
| RN-10 | El lote del que se dispensa no se puede elegir manualmente. | Dispensación |
| RN-11 | El stock se vuelve a verificar al confirmar la dispensación, con bloqueo de los lotes del medicamento; si no alcanza, no se registra nada. | Dispensación |
| RN-12 | La dispensación requiere un beneficiario existente y activo y al menos un medicamento. | Dispensación |
| RN-13 | Cada medicamento dispensado debe existir y estar activo. | Dispensación |
| RN-14 | La cantidad de cada medicamento es un entero mayor que cero y no puede superar el stock disponible; no hay límites por beneficiario ni por periodo. | Dispensación |
| RN-15 | En la interfaz, un medicamento solo puede agregarse una vez a la misma dispensación y no se agrega si no tiene stock. | Dispensación |
| RN-16 | Antes de registrar una dispensación se muestra un resumen con el beneficiario, los medicamentos, las cantidades y las observaciones para su confirmación. | Dispensación |
| RN-17 | Cada línea de la dispensación guarda una copia inmutable del nombre, la presentación y la concentración del medicamento, y el lote del que se descontó; el historial se muestra desde esa copia. | Dispensación |
| RN-18 | La receta no es un dato obligatorio: las observaciones son opcionales y las fotografías de receta y de entrega pueden omitirse. | Dispensación |
| RN-19 | Una dispensación registrada no se puede editar ni anular. | Dispensación |
| RN-20 | No se aceptan devoluciones de medicamentos dispensados. | Dispensación |
| RN-21 | Cualquier usuario autenticado puede consultar las dispensaciones de todos los usuarios. | Dispensación |
| RN-22 | Los umbrales del semáforo de vencimiento son configurables; por defecto, rojo a 30 días y amarillo a 90 días. | Inventario |
| RN-23 | Los días para vencer son la diferencia entre la fecha de vencimiento y la fecha de hoy: cero si vence hoy y negativo si ya venció. | Inventario |
| RN-24 | El semáforo de un lote es vencido si el lote está vencido o dado de baja o le quedan cero días o menos; rojo o amarillo según los umbrales; y verde en otro caso. El de un medicamento es el de su lote dispensable que vence primero. | Inventario / Dispensación |
| RN-25 | Solo el Administrador puede cambiar los umbrales, que deben ser enteros positivos con el rojo menor que el amarillo; no hay pantalla para hacerlo. | Inventario |
| RN-27 | Cada medicamento tiene un stock mínimo entero no negativo, de 10 unidades por defecto. | Catálogos |
| RN-28 | Un medicamento activo está en stock bajo cuando su stock dispensable es menor que su stock mínimo. | Inventario |
| RN-29 | Las alertas del panel principal (stock bajo, lotes por vencer y lotes vencidos sin baja) se calculan al consultarlas; no se generan ni se notifican de forma automática. | Panel principal |
| RN-30 | El nombre completo del beneficiario es obligatorio y debe tener al menos 3 caracteres. | Beneficiarios |
| RN-31 | El DPI del beneficiario es opcional; si se ingresa, debe tener exactamente 13 dígitos. | Beneficiarios |
| RN-32 | No puede haber dos beneficiarios con el mismo DPI. | Beneficiarios |
| RN-33 | El teléfono, la dirección y las observaciones del beneficiario son opcionales y no se valida su formato. | Beneficiarios |
| RN-34 | La búsqueda de beneficiarios es por el inicio del DPI o por parte del nombre, solo entre beneficiarios activos y a partir de 2 caracteres. | Beneficiarios |
| RN-35 | Tras registrar una dispensación se genera un enlace de captura aleatorio con vigencia de 30 minutos, uno por dispensación; si hay uno vigente se reutiliza y no se genera si la evidencia ya está completa. | Captura de evidencia |
| RN-36 | Un enlace de captura inexistente, usado o vencido se rechaza con el mismo mensaje, sin distinguir la causa. | Captura de evidencia |
| RN-37 | Solo hay dos tipos de fotografía, receta y entrega, una de cada tipo por dispensación; mientras la evidencia está incompleta, una fotografía nueva reemplaza a la anterior del mismo tipo. | Captura de evidencia |
| RN-38 | Las fotografías de evidencia deben ser imágenes JPG, PNG o WEBP válidas de hasta 5 MB. | Captura de evidencia |
| RN-39 | El enlace de captura deja de servir cuando la dispensación tiene las dos fotografías. | Captura de evidencia |
| RN-40 | Las fotografías pueden subirse desde el teléfono, mediante el código QR y sin sesión, o desde la misma computadora; la pantalla de escritorio se actualiza sola al recibirlas. | Captura de evidencia |
| RN-41 | El proceso diario borra los enlaces de captura vencidos. | Captura de evidencia |
| RN-42 | El estado de la evidencia de una dispensación se muestra como completa, parcial o sin evidencia, según tenga dos, una o ninguna fotografía. | Beneficiarios |
| RN-43 | Solo el Administrador crea y edita medicamentos; son obligatorios el nombre genérico, la presentación, la unidad de medida y la categoría. El alta se hace desde la pantalla de registro de entradas. | Catálogos |
| RN-44 | Al crear un medicamento se advierte si existe uno similar por nombre, presentación y concentración; el usuario puede revisarlo o crearlo de todos modos. | Catálogos |
| RN-45 | Al editar un medicamento solo se guardan los campos permitidos que cambiaron. | Catálogos |
| RN-46 | Un código de barras es único en todo el sistema y un medicamento puede tener varios; solo el Administrador los agrega o elimina. | Catálogos |
| RN-47 | La búsqueda por código de barras devuelve el medicamento y su stock dispensable, con el mismo criterio que la dispensación. | Catálogos / Dispensación / Entradas |
| RN-48 | Al crear un medicamento, si el código de barras no existe en el sistema, se consultan datos sugeridos en OpenFDA, que el usuario revisa antes de guardar. | Catálogos |
| RN-49 | Solo el Administrador sube la fotografía de un medicamento, en JPG, PNG o WEBP de hasta 5 MB; una nueva reemplaza a la anterior. | Catálogos |
| RN-50 | Solo el Administrador crea y edita categorías; el nombre es obligatorio y único. | Catálogos |
| RN-51 | Solo el Administrador crea y edita ubicaciones; el código es obligatorio y único, y las ubicaciones no se desactivan ni se eliminan. | Catálogos |
| RN-52 | Ambos roles registran entradas. Cada entrada tiene al menos un lote, y cada lote requiere un medicamento activo, una cantidad entera mayor que cero, un número de lote y una fecha de vencimiento posterior a hoy; el costo y la ubicación son opcionales. | Entradas |
| RN-53 | Solo el Administrador importa inventario desde un archivo de Excel, que debe tener las columnas de la plantilla en la primera hoja. | Entradas |
| RN-54 | En la importación, cada fila se valida por separado: una fila inválida se informa con su número y se omite, y las demás se registran. | Entradas |
| RN-55 | En la importación, las categorías y ubicaciones que no existen se crean y el medicamento se reutiliza si coincide en nombre, presentación y concentración; una fila con categoría o medicamento inactivo se rechaza. | Entradas |
| RN-56 | Un usuario inexistente, inactivo o con contraseña incorrecta recibe el mismo mensaje al iniciar sesión; un inicio correcto reinicia el contador de fallos. | Autenticación |
| RN-57 | Toda función protegida requiere una sesión válida; si la sesión deja de serlo, se vuelve a la pantalla de inicio de sesión. Las pantallas de usuarios, auditoría y reportes solo se muestran al Administrador. | Autenticación |
| RN-58 | Solo el Administrador gestiona usuarios. Son obligatorios el usuario, único y no modificable, la contraseña de al menos 6 caracteres, el nombre completo y el rol; el correo es opcional. | Usuarios |
| RN-59 | Un Administrador no puede quitarse a sí mismo el rol de Administrador; el cambio de rol surte efecto en la siguiente acción del usuario afectado. | Usuarios |
| RN-60 | Al restablecer una contraseña se exigen al menos 6 caracteres. | Usuarios |
| RN-61 | Los usuarios no se eliminan, se activan o desactivan, y un Administrador no puede desactivar su propia cuenta. Un usuario inactivo no puede iniciar sesión. | Usuarios |
| RN-62 | La operación diaria la realiza una sola persona con una cuenta de Administrador; el rol de Encargado de Beneficencia existe, pero no se usa actualmente. | Usuarios |
| RN-63 | Los medicamentos y las categorías se desactivan en lugar de eliminarse. Un medicamento inactivo no aparece en búsquedas, inventario ni alertas, y no recibe entradas ni se dispensa; el catálogo permite reactivarlos. | Catálogos |
| RN-64 | La única eliminación que puede pedir un usuario es la de un código de barras; lotes, entradas, dispensaciones, beneficiarios, usuarios, ubicaciones y registros de auditoría no se eliminan. | Todos |
| RN-65 | Los beneficiarios tienen un estado activo que filtra la búsqueda y la dispensación, pero ninguna pantalla permite cambiarlo. | Beneficiarios |
| RN-66 | El Encargado de Beneficencia debe poder consultar los reportes; la pantalla de reportes solo se muestra al Administrador. | Reportes |
| RN-67 | Solo el Administrador exporta reportes a PDF o Excel; una exportación de más de 5000 registros se rechaza y cada exportación queda en la bitácora. | Reportes |
| RN-68 | El reporte de medicamentos por vencer usa 90 días si no se indica otro valor, y el de medicamentos dados de baja lista los lotes vencidos y dados de baja filtrados por fecha de vencimiento. | Reportes |
| RN-69 | Toda operación que modifica datos, además de los inicios de sesión y las exportaciones, se registra en la bitácora con el usuario, la acción, los datos anteriores y nuevos y la dirección IP; si el registro falla, la operación no se interrumpe. | Auditoría |
| RN-70 | Solo el Administrador consulta la bitácora de auditoría, con filtros por usuario, acción, entidad y rango de fechas. | Auditoría |
| RN-71 | Un lote está vencido cuando su fecha de vencimiento es hoy o anterior; el mismo criterio se aplica en el proceso diario, la dispensación, el stock, el semáforo y el registro de entradas. | Inventario / Dispensación / Entradas |
| RN-72 | El inicio de sesión se limita por equipo y por usuario: tres fallos seguidos bloquean al usuario en ese equipo durante 5 minutos, y cada fallo informa los intentos restantes. | Autenticación |
| RN-73 | En cada acción se comprueba que la cuenta siga activa y se usa su rol actual, por lo que desactivar una cuenta o cambiar su rol surte efecto de inmediato. | Autenticación / Usuarios |
| RN-74 | Si dos dispensaciones simultáneas entran en conflicto, el sistema reintenta la operación y, si el conflicto persiste, la rechaza sin registrar nada. | Dispensación |
| RN-75 | En la importación se omite la fila de un lote que ya existía con el mismo medicamento, número de lote y fecha de vencimiento. | Entradas |
| RN-76 | Las fotografías de receta y de entrega solo se consultan con sesión iniciada; las de los medicamentos son públicas. | Captura de evidencia / Beneficiarios |
| RN-77 | Toda imagen subida se convierte a un formato comprimido y se reduce de tamaño; un archivo que no es una imagen válida se rechaza. | Captura de evidencia / Catálogos |

Fuente: Elaboración propia con base en el código del sistema y las decisiones del equipo.
