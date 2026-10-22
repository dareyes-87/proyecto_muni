# CAPÍTULO I

# 1 GENERALIDADES

## 1.1 Antecedentes

La Municipalidad de Gualán, departamento de Zacapa, cuenta con dos farmacias: una de venta de
medicamentos al público y otra de dispensación gratuita de medicamentos donados. Esta segunda, la
Farmacia Municipal de Gualán, entrega medicamentos sin costo a la población como un beneficio social.
Su control se llevaba de forma manual, sin herramientas digitales, lo que provocaba pérdida de
información, dificultad para revisar las existencias y falta de registro de las entregas.

El proyecto nació de una reunión entre el encargado de recursos humanos de la municipalidad y el
equipo de desarrollo. En ella se planteó la necesidad con estas palabras: "Tener un control de
inventario de medicina. Parte que se regala y parte de la farmacia de la que se vende. Control de lo
que sale y entra de la farmacia. Tanto pagado como no pagado."

Con base en esa solicitud se hizo un primer análisis que incluía tanto la dispensación gratuita como
la venta con tickets. Durante el desarrollo, el equipo y la municipalidad acordaron concentrar el
sistema en la farmacia de dispensación gratuita. El resultado es FarmaG, desarrollado como proyecto
del curso de Seminario de la carrera de Ingeniería en Sistemas de la Universidad Mariano Gálvez de
Guatemala por un equipo de cinco estudiantes, e instalado en la red local de la farmacia.

## 1.2 Planteamiento del problema

La farmacia no contaba con un sistema que permitiera llevar un registro preciso de sus medicamentos.
En el análisis inicial se identificaron estos problemas:

1. No era posible conocer las existencias en tiempo real.
2. No había registro de a quién se entregaban los medicamentos gratuitos.
3. Era difícil preparar reportes para las autoridades municipales.
4. Había pérdidas por medicamentos que vencían sin que nadie lo advirtiera.
5. No quedaba constancia de las acciones de quienes manejaban el inventario.

Como los medicamentos provienen de donaciones y cada ingreso tiene su propia fecha de vencimiento, no
basta con saber la cantidad total de cada medicamento: hace falta controlar cada lote y entregar
primero lo que vence antes. El problema, entonces, es que la farmacia no tenía un medio para registrar
las entradas y salidas por lote, asociar cada entrega a un beneficiario y permitir a la municipalidad
consultar el estado del inventario.

## 1.3 Justificación

La dispensación gratuita es un servicio social que se sostiene con donaciones, por lo que la
municipalidad necesita saber a quién se entregó cada medicamento, en qué cantidad y quién hizo la
entrega. Un registro manual no responde esas preguntas con rapidez ni permite comprobar que lo que hay
en los estantes coincide con lo anotado.

Controlar el inventario por lote y por fecha de vencimiento permite detectar a tiempo lo que está por
vencer y entregarlo primero, lo que reduce las pérdidas. Las alertas de existencias bajas ayudan a
prever el desabastecimiento, la bitácora permite supervisar el uso del inventario y los reportes
atienden la necesidad de informar a las autoridades. Concentrar el sistema en la farmacia gratuita
permitió entregar una solución completa, instalada y en uso.

## 1.4 Objetivos

### 1.4.1 Objetivo general

Desarrollar e instalar un sistema web para la Farmacia Municipal de Gualán que registre las entradas
y salidas de medicamentos por lote, asocie cada entrega gratuita a un beneficiario y a la persona que
la realizó, y permita consultar el inventario, las alertas de vencimiento y los reportes de la
farmacia.

### 1.4.2 Objetivos específicos

1. Registrar el inventario de medicamentos por lote, con su cantidad, fecha de vencimiento y estado.
2. Clasificar cada lote según su cercanía al vencimiento y mostrar alertas de existencias bajas, de
   lotes por vencer y de lotes vencidos en el panel principal.
3. Registrar cada entrega asociada a un beneficiario y al usuario que la realizó, descontando primero
   los lotes que vencen antes.
4. Evitar que dos entregas realizadas al mismo tiempo descuenten las mismas unidades.
5. Mantener los catálogos de medicamentos, categorías, ubicaciones y códigos de barras.
6. Controlar el acceso con usuarios, contraseñas y dos roles, Administrador y Encargado de
   Beneficencia, y llevar una bitácora de las operaciones.
7. Generar seis reportes de la farmacia, exportables a PDF y Excel.

## 1.5 Alcances y límites

### 1.5.1 Alcances

El sistema cubre la operación de la farmacia de dispensación gratuita y se compone de cinco módulos:

1. Inventario: registro de entradas con uno o más lotes, carga masiva desde Excel, consulta de
   existencias con indicador de vencimiento, alertas y baja de lotes.
2. Dispensación: registro y búsqueda de beneficiarios, historial de cada beneficiario y entrega de
   medicamentos con lector de código de barras, con fotografías de respaldo tomadas desde un
   teléfono mediante un código QR.
3. Catálogos: medicamentos con fotografía y códigos de barras, categorías y ubicaciones.
4. Administración: usuarios, roles y consulta de la bitácora.
5. Reportes: entregas, consumo de medicamentos, inventario actual, medicamentos por vencer, entradas
   y medicamentos dados de baja, con filtros y exportación a PDF y Excel.

### 1.5.2 Exclusiones

Algunas funciones del análisis inicial quedaron fuera del sistema por decisión del equipo y de la
municipalidad. Se resumen en la Tabla 1.

Tabla 1.
Funciones del análisis inicial que quedaron fuera del alcance

| Función excluida | Motivo |
|------------------|--------|
| Venta de medicamentos con tickets, anulaciones, devoluciones de venta y precio de venta | La municipalidad tiene una farmacia de venta aparte. De común acuerdo, el sistema se limitó a la farmacia de dispensación gratuita |
| Registro de proveedores y del origen de los medicamentos | La recepción de donaciones es un proceso administrativo ajeno a la farmacia. Registrar su origen sin controlar ese proceso cargaría al sistema con información que no se puede comprobar |
| Ajuste manual de las existencias | Las correcciones del inventario se hacen dando de baja lotes completos, lo que deja constancia de cada movimiento |
| Devolución de medicamentos entregados | La farmacia no acepta devoluciones de medicamentos ya entregados |

Fuente: Elaboración propia.

### 1.5.3 Límites

El sistema no se integra con los sistemas del Ministerio de Salud Pública y Asistencia Social, no
lleva expedientes clínicos, no emite facturas y no es una aplicación móvil nativa. Funciona dentro de
la red local de la farmacia y las fotografías se toman desde el navegador de un teléfono conectado a
esa red. Tampoco aplica criterios de elegibilidad ni límites de medicamentos por persona, porque la
municipalidad no los ha definido.

## 1.6 Metodología

El desarrollo se organizó con el Proceso Unificado de Rational (RUP), adaptado al tamaño del equipo y
al plazo del curso. RUP divide el trabajo en cuatro fases, Inicio, Elaboración, Construcción y
Transición, y se guía por casos de uso (Kruchten, 2004). La adaptación consistió en conservar las
fases y sus productos principales sin elaborar todos los documentos que el proceso propone.

Este documento sigue esas fases: el capítulo 3 corresponde al Inicio, los capítulos 4 y 5 a la
Elaboración, el capítulo 6 a la Construcción y el capítulo 7 a la Transición; el capítulo 8 trata el
aseguramiento de la calidad, que acompaña a todas las fases. Los requerimientos se redactaron con
base en la norma ISO/IEC/IEEE 29148, se clasificaron según la norma ISO/IEC 25010 y los diagramas se
elaboraron en UML.

El equipo estuvo formado por cinco integrantes: tres se repartieron por módulos el desarrollo del
sistema, uno elaboró el manual de usuario y otro realizó las pruebas de seguridad. El código se
manejó en un repositorio común con control de versiones.
