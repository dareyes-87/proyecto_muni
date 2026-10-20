# CAPÍTULO III

# 3 FASE DE INICIO

En la fase de Inicio se delimitó el problema, se identificaron los interesados y se acordó el alcance
del sistema. Este capítulo presenta el documento de visión, los interesados y usuarios, las
necesidades y características del producto, el análisis de riesgos y la factibilidad del proyecto.
El alcance aquí descrito es el que resultó de las decisiones tomadas durante el desarrollo, en
particular la delimitación a la farmacia de dispensación gratuita (sección 1.5).

## 3.1 Documento de visión

### 3.1.1 Posicionamiento

FarmaG se dirige a la Farmacia Municipal de Gualán, que entrega medicamentos donados sin costo a la
población. La declaración de posicionamiento del producto se presenta en la Tabla 4.

Tabla 4.
Declaración de posicionamiento del producto

| Elemento | Descripción |
|----------|-------------|
| Para | La Municipalidad de Gualán y la persona que opera la Farmacia Municipal de dispensación gratuita |
| Quienes | Necesitan controlar las existencias de medicamentos donados, saber a quién se entregó cada medicamento y evitar pérdidas por vencimiento |
| El producto | FarmaG es un sistema web de inventario y dispensación de medicamentos que opera en la red local de la farmacia |
| Que | Registra las entradas por lote, descuenta las existencias en orden de fecha de vencimiento al dispensar, asocia cada entrega a un beneficiario y al usuario que la realizó, alerta sobre existencias bajas y lotes por vencer, y genera reportes exportables |
| A diferencia de | El registro manual con el que operaba la farmacia, que no permitía conocer las existencias en tiempo real ni auditar las entregas |
| Nuestro producto | Mantiene el historial de cada lote y de cada dispensación y registra en un log de auditoría las operaciones de los usuarios |

Fuente: Elaboración propia.

### 3.1.2 Enunciado del problema

La Tabla 5 presenta el enunciado del problema en el formato del documento de visión de RUP.

Tabla 5.
Enunciado del problema

| Elemento | Descripción |
|----------|-------------|
| El problema de | La falta de un registro digital de las entradas y salidas de medicamentos de la Farmacia Municipal de Gualán |
| Afecta a | La municipalidad, que no puede supervisar ni informar sobre el uso de los medicamentos donados; a la persona que opera la farmacia, que no conoce las existencias ni los vencimientos; y a los beneficiarios, que dependen de que haya medicamento disponible |
| Cuyo impacto es | Desconocimiento de las existencias reales, falta de trazabilidad de las entregas gratuitas, pérdidas por vencimiento no detectadas, dificultad para generar reportes para las autoridades y ausencia de un registro de las acciones de los operadores |
| Una solución exitosa sería | Un sistema que registre cada lote con su fecha de vencimiento, descuente las existencias al dispensar, identifique al beneficiario y al usuario de cada entrega, alerte sobre vencimientos y existencias bajas, y genere reportes y un registro de auditoría |

Fuente: Elaboración propia con base en el análisis de requerimientos inicial del proyecto.

### 3.1.3 Enunciado del producto

FarmaG es una aplicación web que se ejecuta en un equipo de la farmacia y se usa desde el navegador
de cualquier equipo de la red local. El sistema mantiene un catálogo de medicamentos con sus
categorías, ubicaciones y códigos de barras; registra las entradas de medicamentos como lotes con
cantidad y fecha de vencimiento; y registra las dispensaciones gratuitas a beneficiarios
identificados, descontando las existencias de los lotes que vencen primero. Tras cada dispensación,
el sistema muestra un código QR que permite tomar con un teléfono celular las fotografías de la
receta y de la entrega, sin que esas fotografías sean obligatorias.

El sistema clasifica cada lote en un semáforo según los días que faltan para su vencimiento, marca
como vencidos los lotes cuya fecha ya llegó y muestra en el tablero las alertas de existencias bajas,
de lotes por vencer y de lotes vencidos. Ofrece seis reportes exportables a PDF y Excel y un log de
auditoría consultable por el Administrador. El acceso se controla con usuario, contraseña y dos
roles: Administrador y Encargado de Beneficencia.

## 3.2 Interesados y usuarios

Se distingue entre interesados, que tienen un interés en el resultado del proyecto aunque no usen el
sistema, y usuarios, que interactúan directamente con él. La Tabla 6 presenta los interesados.

Tabla 6.
Interesados del proyecto

| Interesado | Descripción | Responsabilidades |
|------------|-------------|-------------------|
| Alcalde Municipal de Gualán | Patrocinador y cliente del proyecto; expresó la solicitud que dio origen al sistema | Definir la necesidad, aprobar la delimitación del alcance a la farmacia de dispensación gratuita y confirmar las decisiones pendientes con la municipalidad |
| Municipalidad de Gualán | Institución propietaria de la farmacia y del sistema instalado | Proveer el equipo y la red local donde opera el sistema, y recibir los reportes de la farmacia. [COMPLETAR: unidad o persona de la municipalidad responsable del equipo servidor] |
| Persona que opera la farmacia | Única persona que despacha medicamentos y consulta los reportes en la operación actual | Registrar entradas y dispensaciones, mantener los datos de los beneficiarios y revisar las alertas. [COMPLETAR: cargo de esta persona] |
| Beneficiarios | Ciudadanos que reciben medicamentos sin costo; no usan el sistema | Presentar su identificación y la receta al recibir los medicamentos |
| Equipo de desarrollo | Daniel Reyes (Inventario, configuración base y administración), Jorge Vargas (Dispensación) y Audias Guevara (Catálogos y documentación) | Analizar, diseñar, construir, instalar y documentar el sistema |
| Asesor del curso de Seminario | Docente que supervisa el proyecto en la Universidad Mariano Gálvez de Guatemala | Revisar y aprobar la documentación. [COMPLETAR: nombre del asesor] |

Fuente: Elaboración propia.

La farmacia municipal de venta y la ventanilla de cobro de la municipalidad figuraban como
interesados en el análisis inicial, pero no lo son en este proyecto porque la venta de medicamentos
quedó fuera del alcance.

Los usuarios del sistema corresponden a los dos roles que define el sistema y al acceso público
limitado de la página de captura de fotografías, como se muestra en la Tabla 7.

Tabla 7.
Usuarios del sistema

| Usuario (rol) | Descripción | Responsabilidades en el sistema |
|---------------|-------------|---------------------------------|
| Administrador (`ADMIN`) | Usuario con acceso a todas las funciones. En la operación actual es la cuenta que usa la persona que opera la farmacia, tanto para despachar como para consultar reportes | Gestionar usuarios; mantener el catálogo de medicamentos, categorías, ubicaciones y códigos de barras; registrar entradas e importar inventario desde Excel; dar de baja lotes; registrar dispensaciones; consultar y exportar reportes; consultar el log de auditoría |
| Encargado de Beneficencia (`ENCARGADO_BENEFICENCIA`) | Rol definido para la persona que despacha. Existe en el sistema pero no se usa en la operación actual | Registrar y buscar beneficiarios, registrar dispensaciones, registrar entradas manuales y consultar el inventario. Su acceso a los reportes está pendiente de confirmación con la municipalidad |
| Teléfono de captura (sin sesión) | Teléfono celular que abre el enlace del código QR mostrado tras una dispensación | Subir la fotografía de la receta y la de la entrega de esa dispensación mientras el enlace esté vigente |

Fuente: Elaboración propia.

## 3.3 Necesidades y características del producto

Las necesidades se tomaron de la solicitud del Alcalde y de los problemas identificados en el análisis
inicial. La Tabla 8 relaciona cada necesidad con las características del producto que la atienden y
con los casos de uso originales correspondientes.

Tabla 8.
Necesidades y características del producto

| Necesidad | Características del producto | Casos de uso originales |
|-----------|------------------------------|-------------------------|
| "Control de inventario de medicina" | Inventario por lote con cantidad, fecha de vencimiento y estado; consulta de existencias por medicamento con el detalle de sus lotes | CUO-02 |
| "Control de lo que sale y entra" | Registro de entradas con uno o más lotes e importación masiva desde Excel; registro de dispensaciones con descuento por lote | CUO-01, CUO-14 |
| "Parte que se regala" y trazabilidad de las entregas gratuitas | Registro y búsqueda de beneficiarios; dispensación asociada a beneficiario y usuario; historial por beneficiario; evidencia fotográfica opcional por código QR | CUO-14, CUO-15, CUO-16 |
| Reducir las pérdidas por vencimiento | Despacho en orden de fecha de vencimiento; semáforo con umbrales configurables; marcado diario de lotes vencidos; baja de lotes | CUO-05, CUO-32, CUO-37 |
| Evitar el desabastecimiento | Alerta de existencias bajas en el tablero | CUO-04 |
| Reportes para las autoridades municipales | Seis reportes con filtros, exportables a PDF y Excel | CUO-19, CUO-21, CUO-27 |
| Rastrear las acciones de los operadores | Usuarios con contraseña, dos roles y log de auditoría consultable por el Administrador | CUO-28, CUO-33, CUO-34 |
| Catálogo de medicamentos ordenado | Catálogo de medicamentos con fotografía y códigos de barras, categorías y ubicaciones; lectura con escáner de código de barras | CUO-29, CUO-31 |
| Acceso desde cualquier dispositivo con navegador | Aplicación web usable desde los equipos de la red local; página de captura de fotografías para teléfono | Requerimiento complementario del análisis inicial |
| "Tanto pagado como no pagado" | Solo se atiende la parte no pagada; la venta quedó fuera del alcance | CUO-06 a CUO-13 (excluidos) |

Fuente: Elaboración propia con base en el análisis de requerimientos inicial y las decisiones de
alcance del proyecto.

Algunos casos de uso originales se atienden de forma parcial: CUO-19 se cubre con reportes separados
de entradas, inventario, vencimientos, bajas y dispensaciones, no con un reporte único de movimientos;
CUO-37 usa por defecto umbrales de 30 y 90 días en lugar de los 30 y 15 días del análisis inicial; y
los tableros por área de CUO-23 y CUO-25 se reemplazaron por un único tablero general. El detalle de
cada caso se presenta en la matriz de trazabilidad del capítulo 4.

## 3.4 Análisis de riesgos

Los riesgos se identificaron a partir de hechos del proyecto: los hallazgos de la revisión del código
y de la configuración, el plan de correcciones del equipo y las condiciones de la instalación en la
farmacia. La Tabla 9 presenta cada riesgo con su probabilidad, su impacto, la mitigación aplicada y
su estado al 20 de octubre de 2026. La probabilidad y el impacto son valoraciones cualitativas (alta,
media o baja) hechas para este análisis; el impacto de los riesgos abiertos sigue la prioridad
asignada en el plan de correcciones. Entre paréntesis se indica el identificador del hallazgo
relacionado.

Tabla 9.
Análisis de riesgos del proyecto

| N.º | Riesgo | Probabilidad | Impacto | Mitigación aplicada | Estado |
|-----|--------|--------------|---------|---------------------|--------|
| 1 | Cambio de alcance: el análisis inicial abarcaba la farmacia de venta y la de dispensación gratuita | Alta (ocurrió) | Alto | Delimitación del sistema a la farmacia de dispensación gratuita, acordada entre el equipo y la municipalidad | Cerrado |
| 2 | Exposición de credenciales: el archivo de composición por defecto conserva contraseñas y clave de firma de ejemplo como valores de respaldo (H-03) | Media | Alto | El código ya no contiene una clave de firma fija y el archivo de composición de producción exige definir los secretos. Pendiente: revisar el archivo de variables del servidor y reemplazar los valores | Abierto |
| 3 | Instalación en modo de desarrollo: la actualización automática usa el archivo de composición por defecto, con mensajes de error internos visibles y CORS abierto (H-36, H-07, H-17) | Alta | Alto | Existe un archivo de composición de producción con el modo, los secretos y los puertos correctos. Pendiente: adoptarlo en el servidor de la farmacia | Abierto |
| 4 | Ausencia de acceso remoto al servidor: los cambios llegan solo por la actualización automática desde la rama principal cada 30 minutos, y un cambio que impida el arranque no puede corregirse a distancia | Media | Alto | Workflow de integración continua que prueba el despliegue antes de integrar cambios; respaldo de la base antes de cada arranque; orden de correcciones que no integra cambios de variables obligatorias antes de revisar el servidor en sitio | Mitigado parcialmente |
| 5 | Pérdida de datos al cambiar el esquema de la base, porque el arranque aplicaba los cambios con eliminación de datos sin confirmación (H-05) | Alta | Alto | Migraciones versionadas y respaldo automático previo a cada arranque | Mitigado |
| 6 | Dispensación de lotes vencidos, porque el despacho no comparaba la fecha de vencimiento y el proceso diario corría en hora UTC (H-01, H-02) | Media | Alto | El despacho excluye los lotes con fecha vencida; el proceso diario corre en hora de Guatemala y también al arrancar el servidor | Mitigado |
| 7 | Doble descuento de existencias por dos dispensaciones simultáneas | Baja | Alto | Bloqueo de los lotes dentro de una transacción durante el despacho | Mitigado |
| 8 | Acceso no autorizado por prueba masiva de contraseñas (H-09) | Media | Alto | Límite de intentos por dirección IP, bloqueo temporal por usuario tras intentos fallidos y registro de los fallos en la auditoría | Mitigado |
| 9 | Acceso sin sesión a las fotografías de recetas (H-11) | Media | Alto | Las fotografías de evidencia solo se entregan por un endpoint que exige sesión | Mitigado |
| 10 | Acceso directo a la base de datos y a la API desde la red local (H-04) | Media | Alto | Los puertos de la base de datos y de la API se publican solo en la interfaz local del servidor | Mitigado |
| 11 | Operación diaria con una cuenta de Administrador, contraria al principio de mínimo privilegio (H-23) | Alta (ocurre) | Medio | Ninguna aún. Pendiente: habilitar los reportes para el rol Encargado de Beneficencia (H-20) y crear una cuenta de ese rol para el despacho | Abierto |
| 12 | La contraseña aleatoria del administrador inicial queda escrita en el registro del contenedor y nada obliga a cambiarla (H-39) | Media | Alto | Ninguna en el código. Pendiente: definir la contraseña inicial en la configuración del servidor y agregar el cambio obligatorio de contraseña | Abierto |
| 13 | Reportes con rangos de fechas incorrectos: el filtro "desde" incluye registros de las 18:00 a las 23:59 del día anterior (H-46) | Alta | Alto | Ninguna aún. Corrección planificada en las funciones de lectura de fechas | Abierto |
| 14 | Falla de la captura de fotografías por código QR en la farmacia, porque no se ha probado con un teléfono real | Media | Bajo | Las fotografías son opcionales y no bloquean la dispensación. Pendiente: prueba en sitio con un teléfono conectado a la red local | Abierto |

Fuente: Elaboración propia con base en el registro de hallazgos, el seguimiento de correcciones y el
plan de correcciones del proyecto.

Los riesgos abiertos de mayor impacto (2, 3 y 12) dependen de la configuración del servidor de la
farmacia y no del código, por lo que el plan de correcciones los asigna a una revisión en sitio que
debe hacerse antes de integrar cambios que modifiquen variables obligatorias. [COMPLETAR: resultado
de la revisión en sitio del servidor, cuando se realice].

## 3.5 Factibilidad

### 3.5.1 Factibilidad técnica

Las tecnologías del sistema, descritas en el capítulo 2, son de código abierto, cuentan con
documentación oficial y se ejecutan en contenedores Docker, de modo que el servidor solo necesita
Docker y un equipo conectado a la red local. El equipo de desarrollo tenía conocimiento de las
herramientas utilizadas [COMPLETAR: experiencia previa del equipo con el stack, si se desea
declarar]. La factibilidad técnica quedó demostrada en la práctica: el sistema fue instalado en la
Farmacia Municipal de Gualán y opera en su red local.

[COMPLETAR: características del equipo servidor de la farmacia (procesador, memoria, almacenamiento
y sistema operativo), de la red local y de los equipos cliente].

### 3.5.2 Factibilidad operativa

El sistema se usa desde un navegador web, sin instalar programas en los equipos cliente ni en el
teléfono de captura. Las tareas de la operación diaria (registrar entradas, dispensar, consultar
existencias y reportes) se realizan desde las pantallas del sistema, y las tareas de mantenimiento
de la base (respaldos, aplicación de cambios de esquema y marcado de lotes vencidos) se ejecutan de
forma automática.

En la operación actual, una sola persona realiza el despacho y consulta los reportes, con una cuenta
de Administrador. Esto simplifica la adopción, pero concentra en una cuenta todos los permisos del
sistema (riesgo 11 de la Tabla 9). [COMPLETAR: capacitación impartida a la persona que opera la
farmacia, aceptación del sistema por parte de la municipalidad y fecha desde la que se usa en la
operación diaria].

### 3.5.3 Factibilidad económica

Las bibliotecas, el motor de base de datos y el servidor web del sistema son de código abierto y no
requieren pago de licencias [COMPLETAR: confirmar la licencia de cada tecnología si se desea
detallarla]. [COMPLETAR: indicar si el servidor de la farmacia ejecuta Docker Desktop y, en ese caso,
si los términos de licencia de Docker exigen una suscripción para la municipalidad]. El
desarrollo lo realizó el equipo de estudiantes como proyecto académico. Los costos del proyecto que no
constan en las fuentes del repositorio se resumen en la Tabla 10 para ser completados por el
responsable.

Tabla 10.
Costos del proyecto

| Rubro | Descripción | Costo (Q) |
|-------|-------------|-----------|
| Equipo servidor | Computadora de la farmacia donde se ejecuta el sistema | [COMPLETAR: costo, o indicar si es equipo existente de la municipalidad] |
| Red local y equipos cliente | Conexión de red y equipos desde los que se usa el sistema | [COMPLETAR] |
| Escáner de código de barras | Lector usado en entradas y dispensación | [COMPLETAR: si se adquirió y su costo] |
| Licencias de software | Tecnologías de código abierto | [COMPLETAR: confirmar que es 0] |
| Horas de desarrollo | Trabajo del equipo de tres estudiantes | [COMPLETAR: horas estimadas y criterio de valoración, si se desea incluir] |
| Instalación y capacitación | Traslados, instalación en sitio y capacitación | [COMPLETAR] |
| Total | | [COMPLETAR] |

Fuente: Elaboración propia.

[COMPLETAR: comparación con el costo de operar con el registro manual o con una alternativa comercial,
si la municipalidad dispone de esos datos].
