# RESUMEN

La Farmacia Municipal de Gualán, Zacapa, entrega sin costo medicamentos donados a la población. Hasta
ahora su control se llevaba a mano, sin un registro de existencias por lote, sin saber con certeza a
quién se entregaba cada medicamento y sin un medio sencillo para informar a las autoridades
municipales sobre el inventario y las pérdidas por vencimiento.

Para resolverlo se desarrolló FarmaG, un sistema web que registra las entradas y salidas de
medicamentos por lote, asocia cada entrega a un beneficiario y a la persona que la realizó, y permite
consultar el inventario, las alertas de vencimiento y los reportes de la farmacia.

El desarrollo se organizó con la metodología RUP, adaptada al tamaño del equipo y al plazo del curso.
Los requerimientos se especificaron con base en las normas ISO/IEC/IEEE 29148 e ISO/IEC 25010 y los
diagramas se elaboraron en UML. El sistema es una aplicación web construida con React y TypeScript en
la interfaz, Node.js y Express en el servidor y PostgreSQL como base de datos, y se instala con
Docker.

Se construyeron los módulos de Inventario, Dispensación, Catálogos, Administración y Reportes, que
cubren 19 casos de uso. Al entregar un medicamento, el sistema descuenta primero las unidades del lote
que vence antes, de modo que se aprovecha lo que está próximo a vencer. El sistema se sometió a
pruebas automatizadas y a pruebas funcionales por caso de uso; se aprobaron 74 de los 92 casos, y los
defectos encontrados quedaron registrados con su plan de corrección.

Con el control por lote y el registro de cada entrega, la municipalidad cuenta con información
confiable sobre los medicamentos donados que recibe, entrega y pierde por vencimiento.

Palabras clave: inventario de medicamentos, dispensación gratuita, control por lotes, RUP, aplicación
web.
