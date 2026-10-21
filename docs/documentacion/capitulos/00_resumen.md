# RESUMEN

La Farmacia Municipal de Gualán, Zacapa, entrega sin costo medicamentos donados a la población y
llevaba su control de forma manual, sin registro de existencias por lote, sin trazabilidad de las
entregas a cada beneficiario y sin un medio para informar a las autoridades municipales sobre el
inventario y los medicamentos perdidos por vencimiento.

El objetivo del proyecto fue desarrollar e instalar un sistema web, denominado FarmaG, que registre
las entradas y salidas de medicamentos por lote, asocie cada dispensación a un beneficiario y a la
persona que la realizó, y permita consultar el inventario, las alertas de vencimiento y los reportes
de la operación.

El desarrollo se documentó según el Proceso Unificado de Rational (RUP), adaptado al tamaño del
equipo y al plazo del curso, con las fases de Inicio, Elaboración, Construcción y Transición. Los
requerimientos se especificaron con base en las normas ISO/IEC/IEEE 29148 e ISO/IEC 25010, y los
diagramas en UML 2.5. La interfaz se construyó con React, TypeScript, Vite y Tailwind CSS; el
servidor, con Node.js, Express y Prisma ORM; la base de datos es PostgreSQL 16 y la instalación se
realiza con Docker Compose.

Se construyeron los módulos de Inventario, Dispensación, Catálogos, Administración y Reportes, que
responden a 58 requerimientos funcionales, 45 no funcionales y 19 casos de uso. La dispensación
descuenta las existencias en orden de fecha de vencimiento y bloquea los lotes durante la
transacción para que dos entregas simultáneas no usen las mismas unidades. Las 53 pruebas
automatizadas del servidor se aprobaron. La revisión del código registró 34 hallazgos de defectos,
de los cuales el equipo resolvió 19 y resolvió de forma parcial 10; 4 siguen pendientes y 1 depende
de la configuración de la instalación. En las pruebas funcionales, ejecutadas el 20 y el 21 de
octubre de 2026 por medio de la API y de pruebas de interfaz automatizadas, se aprobaron 74 de los 92
casos de prueba; de los 18 fallidos, 14 correspondían a hallazgos ya registrados y 4 a tres defectos
nuevos de severidad baja, y se cumplieron los criterios de salida del plan. La captura de fotografías
desde el teléfono se probó en un navegador con tamaño de teléfono; la prueba con un teléfono real
queda pendiente.

El control por lote y el registro de cada entrega con su beneficiario y su responsable dan a la
municipalidad un registro verificable de los medicamentos donados que recibe, entrega y pierde por
vencimiento, en un sistema instalado en la red local de la farmacia.

Palabras clave: inventario de medicamentos, dispensación gratuita, control por lotes, RUP, aplicación
web.
