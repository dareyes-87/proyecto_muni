# GLOSARIO

1. Administrador: Rol del sistema con acceso a todas las funciones, incluidas la gestión de usuarios, los catálogos, la importación de inventario, la baja de lotes, los reportes y la bitácora de auditoría.
2. API REST: Interfaz de programación que expone las funciones del servidor como recursos accesibles mediante métodos HTTP, como GET, POST, PUT y DELETE. En FarmaG, la interfaz web se comunica con el servidor solo a través de ella.
3. Beneficiario: Persona que recibe medicamentos sin costo en la Farmacia Municipal. Se registra con su nombre y, de forma opcional, con su DPI.
4. Bitácora de auditoría: Registro de las operaciones que realizan los usuarios, con la fecha, el usuario, la acción, la entidad afectada y los datos anteriores y nuevos. Solo el Administrador la consulta.
5. Caso de uso: Descripción de la interacción entre un actor y el sistema para alcanzar un objetivo, con sus flujos normal y alternativo.
6. Código de barras: Código impreso en el empaque de un medicamento que se lee con un escáner. En FarmaG cada código pertenece a un solo medicamento y permite seleccionarlo sin escribir su nombre.
7. Código QR: Código bidimensional que se lee con la cámara de un teléfono. FarmaG lo muestra después de una dispensación para abrir en el teléfono la página de captura de fotografías.
8. Commit: Registro de un conjunto de cambios en el repositorio de Git, identificado por un código único y acompañado de un mensaje que describe el cambio.
9. Concurrencia: Situación en la que dos o más operaciones se ejecutan al mismo tiempo sobre los mismos datos, por ejemplo dos dispensaciones del mismo medicamento.
10. Contenedor: Unidad de ejecución aislada que incluye una aplicación y sus dependencias, creada a partir de una imagen de Docker.
11. Dispensación: Entrega gratuita de uno o más medicamentos a un beneficiario, registrada en el sistema con el usuario que la realizó y los lotes de los que se descontaron las unidades.
12. Docker: Plataforma que permite empaquetar y ejecutar aplicaciones en contenedores, de modo que se comporten igual en cualquier equipo que la tenga instalada.
13. Docker Compose: Herramienta que define y ejecuta en conjunto varios contenedores a partir de un archivo de configuración. FarmaG la usa para levantar la base de datos, la API, la interfaz y el servicio de respaldos.
14. DPI: Documento Personal de Identificación de Guatemala, de 13 dígitos. En FarmaG identifica de forma única a un beneficiario cuando se registra.
15. Encargado de Beneficencia: Rol del sistema destinado a la persona que despacha; registra entradas, beneficiarios y dispensaciones y consulta el inventario.
16. Entrada: Registro de los medicamentos que recibe la farmacia, compuesto por uno o más lotes con su cantidad y fecha de vencimiento.
17. Evidencia fotográfica: Fotografías de la receta y de la entrega de los medicamentos asociadas a una dispensación. Son opcionales y solo se ven con sesión iniciada.
18. FEFO: Criterio de despacho en el que sale primero el producto que vence primero, por sus siglas en inglés first expiry, first out. Es el orden en que FarmaG descuenta los lotes al dispensar.
19. FIFO: Criterio de despacho en el que sale primero lo que entró primero, por sus siglas en inglés first in, first out. En este documento, la expresión FIFO por fecha de vencimiento equivale a FEFO.
20. Importación desde Excel: Función que carga varios lotes a la vez a partir de un archivo de Excel con el formato de la plantilla del sistema.
21. JWT: Formato de token firmado digitalmente que contiene datos del usuario y una fecha de vencimiento, por sus siglas en inglés JSON Web Token. FarmaG lo usa para mantener la sesión.
22. Lote: Conjunto de unidades de un medicamento recibidas en una entrada con el mismo número de lote y la misma fecha de vencimiento. Las existencias del sistema se llevan por lote.
23. Migración: Archivo versionado con las instrucciones para modificar el esquema de la base de datos, que se aplica de forma ordenada y queda registrado.
24. OpenFDA: Servicio público de la Administración de Alimentos y Medicamentos de los Estados Unidos que ofrece información de medicamentos. FarmaG lo consulta para sugerir los datos de un medicamento nuevo a partir de su código de barras.
25. Pull request: Solicitud para integrar los cambios de una rama en otra, que permite revisarlos y comprobarlos antes de aceptarlos.
26. Requerimiento funcional: Descripción de una función que el sistema debe realizar, como registrar una dispensación o generar un reporte.
27. Requerimiento no funcional: Descripción de una propiedad de calidad que el sistema debe cumplir, como la seguridad, la fiabilidad o la portabilidad.
28. Respaldo: Copia de la base de datos que permite recuperar la información en caso de pérdida o daño. FarmaG genera respaldos periódicos y antes de cada arranque.
29. Rol: Conjunto de permisos asignado a un usuario que determina qué funciones del sistema puede usar. FarmaG tiene los roles Administrador y Encargado de Beneficencia.
30. RUP: Proceso Unificado de Rational, metodología de desarrollo de software organizada en las fases de Inicio, Elaboración, Construcción y Transición.
31. Semáforo de vencimiento: Clasificación de un lote por los días que faltan para su vencimiento en verde, amarillo, rojo o vencido, según umbrales configurables.
32. Stock mínimo: Cantidad de unidades por debajo de la cual un medicamento se señala con stock bajo en el inventario y en el panel.
33. Transacción: Conjunto de operaciones sobre la base de datos que se ejecutan como una unidad: se confirman todas o no se aplica ninguna.
34. UML: Lenguaje Unificado de Modelado, notación gráfica estándar para representar la estructura y el comportamiento de un sistema de software.
