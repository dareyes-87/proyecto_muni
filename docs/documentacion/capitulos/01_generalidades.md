# CAPÍTULO I

# 1 GENERALIDADES

## 1.1 Antecedentes

La Municipalidad de Gualán, departamento de Zacapa, Guatemala, opera dos farmacias: una de venta de
medicamentos al público y otra de dispensación gratuita de medicamentos donados. Esta segunda, la
Farmacia Municipal de Gualán, entrega medicamentos sin costo a la población como beneficio social.
Según el análisis de requerimientos inicial del proyecto, la farmacia operaba de forma manual, sin
herramientas digitales para el control de inventario, lo que generaba pérdida de información,
dificultad para auditar las existencias y falta de trazabilidad en las dispensaciones.

El proyecto se originó en una reunión de levantamiento de requerimientos entre el Alcalde Municipal
de Gualán y el equipo de desarrollo, realizada durante el primer trimestre de 2026. En ella, el
Alcalde expresó la siguiente solicitud, transcrita textualmente en el documento de análisis: "Tener
un control de inventario de medicina. Parte que se regala y parte de la farmacia de la que se vende.
Control de lo que sale y entra de la farmacia. Tanto pagado como no pagado."

A partir de esa solicitud, el equipo elaboró un análisis de requerimientos que abarcaba la
dispensación gratuita y la venta directa mediante tickets, con 37 casos de uso que en este documento
se citan como CUO-01 a CUO-37. Durante el desarrollo, el equipo y la municipalidad acordaron
delimitar el sistema a la farmacia de dispensación gratuita (ver sección 1.5). El sistema
resultante, denominado FarmaG, se desarrolló como proyecto del curso de Seminario de la carrera de
Ingeniería en Sistemas de la Universidad Mariano Gálvez de Guatemala, por un equipo de tres
estudiantes, y fue instalado en la Farmacia Municipal de Gualán, donde opera en la red local.

## 1.2 Planteamiento del problema

La Farmacia Municipal de Gualán carecía de un sistema digital que permitiera llevar un registro
preciso del inventario de medicamentos. El análisis inicial identificó, para la farmacia de
dispensación gratuita, los siguientes problemas:

1. No era posible conocer las existencias de medicamentos en tiempo real.
2. No existía trazabilidad sobre a quién se entregaban los medicamentos gratuitos.
3. Resultaba difícil generar reportes para las autoridades municipales.
4. Existía riesgo de pérdidas por vencimiento de medicamentos que no se monitoreaban.
5. No existía un registro de las acciones de las personas que operaban el inventario.

Los medicamentos provienen de donaciones y tienen fecha de vencimiento, por lo que el control no
puede limitarse a la cantidad total por medicamento: cada ingreso tiene un vencimiento propio y las
existencias deben consumirse en un orden que reduzca las pérdidas. En consecuencia, el problema se
enuncia así: la Farmacia Municipal de Gualán no contaba con un medio que registrara las entradas y
salidas de medicamentos por lote, que asociara cada entrega a un beneficiario identificado y que
permitiera a la municipalidad consultar el estado del inventario y la actividad de la farmacia.

## 1.3 Justificación

La dispensación gratuita es un servicio social sostenido con medicamentos donados, por lo que la
municipalidad necesita demostrar a quién se entregó cada medicamento, en qué cantidad y quién
realizó la entrega. Un registro manual no permite responder esas preguntas con rapidez ni verificar
que las existencias físicas coincidan con lo registrado.

El control por lote y por fecha de vencimiento permite identificar los medicamentos próximos a vencer
y entregar primero los que vencen antes, lo que reduce las pérdidas, y las alertas de existencias
bajas permiten anticipar el desabastecimiento. El registro de auditoría permite supervisar el uso del
inventario, y los reportes exportables atienden la necesidad de informar a las autoridades
municipales. La delimitación a la farmacia de dispensación gratuita permitió concentrar el trabajo
en un solo proceso y entregar un sistema instalado y en operación.

## 1.4 Objetivos

### 1.4.1 Objetivo general

Desarrollar e instalar un sistema web para la Farmacia Municipal de Gualán que registre las entradas
y salidas de medicamentos por lote, asocie cada dispensación gratuita a un beneficiario y a la
persona que la realizó, y permita consultar el inventario, las alertas de vencimiento y los reportes
de la operación.

### 1.4.2 Objetivos específicos

1. Registrar el inventario de medicamentos por lote, con cantidad, fecha de vencimiento y estado de
   cada lote.
2. Clasificar cada lote en un semáforo de vencimiento con umbrales configurables y mostrar alertas de
   existencias bajas, de lotes por vencer y de lotes vencidos en el tablero principal.
3. Registrar cada dispensación gratuita asociada a un beneficiario identificado y al usuario que la
   realizó, descontando las existencias en orden de fecha de vencimiento y conservando los datos del
   medicamento tal como estaban al momento de la entrega.
4. Impedir que dos dispensaciones simultáneas descuenten las mismas unidades de un lote.
5. Mantener los catálogos de medicamentos, categorías, ubicaciones y códigos de barras.
6. Controlar el acceso mediante usuarios con contraseña y dos roles (Administrador y Encargado de
   Beneficencia), y registrar en un log de auditoría las operaciones sobre los datos.
7. Generar seis reportes de la operación, exportables a PDF y Excel.

El cumplimiento de cada objetivo se verifica con los casos de uso y los casos de prueba de los
capítulos 4 y 8.

## 1.5 Alcances y límites

### 1.5.1 Alcances

El sistema cubre la operación de la farmacia de dispensación gratuita y comprende cinco módulos:

1. Inventario: registro de entradas con uno o más lotes, importación masiva desde Excel, consulta de
   existencias con semáforo de vencimiento, alertas y baja de lotes completos.
2. Dispensación: registro y búsqueda de beneficiarios, historial por beneficiario, despacho con
   lectura de código de barras y evidencia fotográfica opcional, tomada desde un teléfono celular
   mediante un código QR.
3. Catálogos: medicamentos (con fotografía y códigos de barras), categorías y ubicaciones.
4. Administración: usuarios, roles y consulta del log de auditoría.
5. Reportes: dispensaciones, consumo de medicamentos, inventario actual, medicamentos por vencer,
   entradas y medicamentos dados de baja, con filtros y exportación a PDF y Excel.

De las 40 funcionalidades que se derivan del análisis inicial, 15 están implementadas por completo,
8 de forma parcial, 16 quedaron excluidas del alcance por decisión documentada y 1 no aplica por una
regla de negocio de la farmacia. La correspondencia completa se presenta en la matriz de
trazabilidad del capítulo 4.

### 1.5.2 Exclusiones del alcance

Las exclusiones del alcance se resumen en la Tabla 1. Todas responden a decisiones tomadas durante el
desarrollo y registradas por el responsable de la documentación.

Tabla 1.
Funcionalidades del análisis inicial excluidas del alcance y motivo de la exclusión

| Funcionalidad excluida | Casos de uso originales afectados | Motivo de la exclusión |
|------------------------|-----------------------------------|------------------------|
| Venta de medicamentos con tickets, anulación de tickets, devoluciones de venta, reportes y tableros de ventas, rol de Farmacéutico/Cajero y precio de venta | CUO-06 a CUO-13, CUO-20, CUO-22, CUO-24 y CUO-35 | La municipalidad opera dos farmacias; por decisión unánime del equipo de desarrollo y la municipalidad, el sistema se delimitó a la farmacia de dispensación gratuita. Las funciones de venta corresponden a la farmacia de venta. |
| Registro de proveedores y del origen de los medicamentos (donante o presupuesto municipal) | CUO-30 y la vinculación de entradas a proveedor de CUO-01 | La recepción y verificación de donaciones corresponde a un proceso administrativo externo a la farmacia. Registrar su origen sin controlar ese proceso trasladaría al sistema la responsabilidad sobre información no verificable. |
| Ajuste manual de la cantidad en existencia | CUO-03 | Las correcciones de inventario se limitan a dar de baja lotes completos. El motivo de la exclusión no quedó registrado en las fuentes del proyecto. |
| Devolución de medicamentos dispensados | CUO-17 | No aplica por regla de negocio: los medicamentos se dispensan con receta y no se aceptan devoluciones. |

Fuente: Elaboración propia con base en las decisiones de alcance del proyecto.

### 1.5.3 Límites

El análisis inicial declaró fuera del alcance la integración con los sistemas del Ministerio de Salud
Pública y Asistencia Social, el expediente clínico del paciente, la facturación electrónica, una
aplicación móvil nativa, el control de otros recursos municipales y la gestión de recursos humanos.
Esos límites se mantienen. El sistema opera en la red local de la farmacia, y la evidencia
fotográfica se captura desde el navegador de un teléfono conectado a esa red.

El sistema no aplica criterios de elegibilidad de beneficiarios ni límites de medicamentos por
persona o por periodo, porque el análisis inicial los dejó pendientes de definición por la
administración municipal y no se recibieron. En la operación actual, una sola persona despacha y
consulta los reportes con una cuenta de rol Administrador; el rol Encargado de Beneficencia existe en
el sistema pero no se utiliza.

## 1.6 Metodología

El desarrollo se documenta según el Proceso Unificado de Rational (RUP), adaptado al tamaño del
equipo y al plazo del curso. RUP organiza el ciclo de vida en cuatro fases, cada una compuesta por una
o más iteraciones, y se guía por casos de uso (Kruchten, 2004). La adaptación consistió en conservar
las fases y sus artefactos principales, sin la totalidad de los artefactos que define el proceso.

Cada fase corresponde a uno o más capítulos de este documento. La fase de Inicio, que delimita el
problema, el alcance, los interesados y la factibilidad, se presenta en el capítulo 3. La
Elaboración, con los requerimientos, los casos de uso, el modelo de datos y la arquitectura, ocupa
los capítulos 4 y 5. La Construcción, con la estructura del repositorio, el flujo de trabajo y las
iteraciones realizadas, se describe en el capítulo 6, y la Transición, con la instalación, la
configuración y los respaldos, en el capítulo 7. El aseguramiento de la calidad, disciplina
transversal a las fases, se presenta en el capítulo 8.

Los requerimientos se redactan con base en la norma ISO/IEC/IEEE 29148, los requerimientos no
funcionales se clasifican según la norma ISO/IEC 25010 y los diagramas se elaboran en UML 2.5. El
trabajo se dividió por módulos entre los tres integrantes, y el código se gestionó con Git en un
repositorio común. Las iteraciones de la Construcción se reconstruyen a partir del historial real del
repositorio, sin asignar fechas ni duraciones que ese historial no registre.
