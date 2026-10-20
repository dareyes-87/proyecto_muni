# GLOSARIO

1. Administrador: Rol del sistema con acceso a todas las funciones, incluidas la gestión de usuarios, los catálogos, la importación de inventario, la baja de lotes, los reportes y la bitácora de auditoría.
2. API REST: Interfaz de programación que expone las funciones del servidor como recursos accesibles mediante métodos HTTP, como GET, POST, PUT y DELETE. En FarmaG, la interfaz web se comunica con el servidor solo a través de ella.
3. Bcrypt: Función de hash diseñada para contraseñas, que incorpora una sal aleatoria y un costo configurable que hace lento el cálculo. FarmaG la usa con costo 12.
4. Beneficiario: Persona que recibe medicamentos sin costo en la Farmacia Municipal. Se registra con su nombre y, de forma opcional, con su DPI.
5. Bitácora de auditoría: Registro de las operaciones que realizan los usuarios, con la fecha, el usuario, la acción, la entidad afectada y los datos anteriores y nuevos. Solo el Administrador la consulta.
6. Caso de uso: Descripción de la interacción entre un actor y el sistema para alcanzar un objetivo, con sus flujos normal y alternativo.
7. Clave foránea: Columna de una tabla que referencia la clave primaria de otra tabla y garantiza que la relación entre ambas sea válida.
8. Clave primaria: Columna que identifica de forma única cada fila de una tabla. En FarmaG todas las claves primarias son identificadores UUID.
9. Código de barras: Código impreso en el empaque de un medicamento que se lee con un escáner. En FarmaG cada código pertenece a un solo medicamento y permite seleccionarlo sin escribir su nombre.
10. Código QR: Código bidimensional que se lee con la cámara de un teléfono. FarmaG lo muestra después de una dispensación para abrir en el teléfono la página de captura de fotografías.
11. Commit: Registro de un conjunto de cambios en el repositorio de Git, identificado por un código único y acompañado de un mensaje que describe el cambio.
12. Concurrencia: Situación en la que dos o más operaciones se ejecutan al mismo tiempo sobre los mismos datos, por ejemplo dos dispensaciones del mismo medicamento.
13. Contenedor: Unidad de ejecución aislada que incluye una aplicación y sus dependencias, creada a partir de una imagen de Docker.
14. CORS: Mecanismo de los navegadores que controla si una página de un origen puede hacer peticiones a un servidor de otro origen, por sus siglas en inglés Cross-Origin Resource Sharing.
15. Dispensación: Entrega gratuita de uno o más medicamentos a un beneficiario, registrada en el sistema con el usuario que la realizó y los lotes de los que se descontaron las unidades.
16. Docker: Plataforma que permite empaquetar y ejecutar aplicaciones en contenedores, de modo que se comporten igual en cualquier equipo que la tenga instalada.
17. Docker Compose: Herramienta que define y ejecuta en conjunto varios contenedores a partir de un archivo de configuración. FarmaG la usa para levantar la base de datos, la API, la interfaz y el servicio de respaldos.
18. DPI: Documento Personal de Identificación de Guatemala, de 13 dígitos. En FarmaG identifica de forma única a un beneficiario cuando se registra.
19. Encargado de Beneficencia: Rol del sistema destinado a la persona que despacha; registra entradas, beneficiarios y dispensaciones y consulta el inventario.
20. Endpoint: Dirección de la API, formada por un método HTTP y una ruta, que atiende un tipo de petición, por ejemplo POST /api/dispensacion/despachar.
21. Entrada: Registro de los medicamentos que recibe la farmacia, compuesto por uno o más lotes con su cantidad y fecha de vencimiento.
22. Enumeración: Tipo de dato que solo admite un conjunto fijo de valores, como los estados de un lote o los roles de usuario.
23. Evidencia fotográfica: Fotografías de la receta y de la entrega de los medicamentos asociadas a una dispensación. Son opcionales y solo se ven con sesión iniciada.
24. FEFO: Criterio de despacho en el que sale primero el producto que vence primero, por sus siglas en inglés first expiry, first out. Es el orden en que FarmaG descuenta los lotes al dispensar.
25. FIFO: Criterio de despacho en el que sale primero lo que entró primero, por sus siglas en inglés first in, first out. En este documento, la expresión FIFO por fecha de vencimiento equivale a FEFO.
26. GitHub Actions: Servicio de GitHub que ejecuta tareas automáticas sobre el repositorio, como compilar y probar el código, cuando ocurren eventos como un pull request.
27. Hash: Resultado de aplicar a un dato una función que produce un valor de longitud fija del que no se puede obtener el dato original. Se usa para guardar contraseñas sin almacenarlas en texto legible.
28. HTTP: Protocolo de comunicación entre el navegador y el servidor web. Su versión cifrada se denomina HTTPS.
29. Importación desde Excel: Función que carga varios lotes a la vez a partir de un archivo de Excel con el formato de la plantilla del sistema.
30. Índice: Estructura de la base de datos que acelera la búsqueda y el ordenamiento de las filas de una tabla por una o más columnas.
31. Integración continua: Práctica de comprobar automáticamente cada cambio del código, mediante compilación y pruebas, antes de integrarlo a la rama principal.
32. JWT: Formato de token firmado digitalmente que contiene datos del usuario y una fecha de vencimiento, por sus siglas en inglés JSON Web Token. FarmaG lo usa para mantener la sesión.
33. Lote: Conjunto de unidades de un medicamento recibidas en una entrada con el mismo número de lote y la misma fecha de vencimiento. Las existencias del sistema se llevan por lote.
34. Middleware: Función del servidor que se ejecuta antes de atender una petición, por ejemplo para verificar la sesión, comprobar el rol o registrar errores.
35. Migración: Archivo versionado con las instrucciones para modificar el esquema de la base de datos, que se aplica de forma ordenada y queda registrado.
36. nginx: Servidor web que, en producción, entrega la interfaz de FarmaG y reenvía a la API las peticiones dirigidas a ella.
37. Node.js: Entorno que ejecuta código JavaScript fuera del navegador, sobre el cual funciona la API de FarmaG.
38. OpenFDA: Servicio público de la Administración de Alimentos y Medicamentos de los Estados Unidos que ofrece información de medicamentos. FarmaG lo consulta para sugerir los datos de un medicamento nuevo a partir de su código de barras.
39. ORM: Herramienta que permite trabajar con las tablas de una base de datos relacional como objetos del lenguaje de programación, por sus siglas en inglés Object-Relational Mapping. FarmaG usa Prisma.
40. PostgreSQL: Sistema gestor de bases de datos relacional de código abierto en el que FarmaG guarda su información.
41. Prisma: ORM para Node.js y TypeScript con el que la API de FarmaG define el modelo de datos, consulta la base y aplica las migraciones.
42. Pull request: Solicitud para integrar los cambios de una rama en otra, que permite revisarlos y comprobarlos antes de aceptarlos.
43. Rama: Línea de desarrollo independiente dentro de un repositorio de Git, que permite trabajar en un cambio sin afectar la rama principal.
44. React: Biblioteca de JavaScript para construir interfaces de usuario a partir de componentes, con la que se desarrolló la interfaz web de FarmaG.
45. Requerimiento funcional: Descripción de una función que el sistema debe realizar, como registrar una dispensación o generar un reporte.
46. Requerimiento no funcional: Descripción de una propiedad de calidad que el sistema debe cumplir, como la seguridad, la fiabilidad o la portabilidad.
47. Respaldo: Copia de la base de datos que permite recuperar la información en caso de pérdida o daño. FarmaG genera respaldos periódicos y antes de cada arranque.
48. Rol: Conjunto de permisos asignado a un usuario que determina qué funciones del sistema puede usar. FarmaG tiene los roles Administrador y Encargado de Beneficencia.
49. RUP: Proceso Unificado de Rational, metodología de desarrollo de software organizada en las fases de Inicio, Elaboración, Construcción y Transición.
50. Semáforo de vencimiento: Clasificación de un lote por los días que faltan para su vencimiento en verde, amarillo, rojo o vencido, según umbrales configurables.
51. Snapshot: Copia de un dato tomada en un momento determinado. En FarmaG, cada detalle de dispensación guarda una copia del nombre, la presentación y la concentración del medicamento.
52. Stock dispensable: Cantidad de unidades de un medicamento que se pueden entregar: la suma de sus lotes disponibles, con unidades y no vencidos.
53. Stock mínimo: Cantidad de unidades por debajo de la cual un medicamento se señala con stock bajo en el inventario y en el panel.
54. Token: Cadena de caracteres que funciona como credencial. FarmaG usa un token JWT para la sesión y un token aleatorio de corta vigencia para la captura de fotografías.
55. Transacción: Conjunto de operaciones sobre la base de datos que se ejecutan como una unidad: se confirman todas o no se aplica ninguna.
56. TypeScript: Lenguaje que agrega tipos estáticos a JavaScript y permite detectar errores antes de ejecutar el código. Se usa en la API y en la interfaz de FarmaG.
57. UML: Lenguaje Unificado de Modelado, notación gráfica estándar para representar la estructura y el comportamiento de un sistema de software.
58. UTC: Tiempo Universal Coordinado, referencia horaria mundial. La hora de Guatemala corresponde a UTC menos seis horas.
59. UUID: Identificador único universal de 128 bits que se genera sin consultar a un registro central. Se usa como clave primaria en las tablas de FarmaG.
60. Vite: Herramienta de desarrollo y construcción de aplicaciones web que sirve la interfaz de FarmaG en desarrollo y genera los archivos de producción.
61. Volumen: Espacio de almacenamiento de Docker que conserva los datos de un contenedor aunque este se elimine o se vuelva a crear.
62. WebP: Formato de imagen que ocupa menos espacio que JPG o PNG con una calidad similar. FarmaG guarda en este formato todas las fotografías.
63. Zona horaria: Región que comparte la misma hora oficial. El servidor de FarmaG usa la zona de Guatemala para fechar las operaciones y ejecutar las tareas programadas.
