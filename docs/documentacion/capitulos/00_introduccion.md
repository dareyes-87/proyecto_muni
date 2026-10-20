<!-- Nota para el ensamblado: la numeración arábiga del cuerpo inicia en 1 en esta página. -->

# INTRODUCCIÓN

La Farmacia Municipal de Gualán, Zacapa, entrega medicamentos donados sin costo a la población. Su
operación se llevaba de forma manual, lo que impedía conocer las existencias en tiempo real, saber a
quién se entregaba cada medicamento y detectar a tiempo los medicamentos próximos a vencer. A
solicitud del Alcalde Municipal, un equipo de tres estudiantes del curso de Seminario de la carrera
de Ingeniería en Sistemas de la Universidad Mariano Gálvez de Guatemala desarrolló FarmaG, un
sistema web de inventario y dispensación de medicamentos, delimitado durante el desarrollo a la
farmacia de dispensación gratuita.

Este documento describe el proceso de desarrollo de FarmaG y el sistema resultante. El proceso se
documenta según el Proceso Unificado de Rational (RUP) adaptado, y las iteraciones de construcción se
reconstruyen a partir del historial del repositorio. Las descripciones técnicas corresponden al
código del sistema en el commit `bdf1187`; los datos que no constan en el repositorio se señalan como
pendientes de completar.

El Capítulo I, Generalidades, presenta los antecedentes del proyecto, el planteamiento del problema,
la justificación, los objetivos, los alcances, las exclusiones y los límites del sistema, y la
metodología, con la relación entre las fases de RUP y los capítulos del documento.

El Capítulo II, Marco de referencia, expone los conceptos de dispensación de medicamentos y de
control de inventario por lotes con el método FIFO por fecha de vencimiento, el proceso RUP, el
lenguaje UML, las normas ISO/IEC 25010 e ISO/IEC/IEEE 29148, y las doce tecnologías del sistema con
la función que cumple cada una.

El Capítulo III, Fase de Inicio, contiene el documento de visión, los interesados y usuarios, las
necesidades y características del producto, el análisis de riesgos y la factibilidad técnica,
operativa y económica.

El Capítulo IV, Requerimientos, especifica los 58 requerimientos funcionales agrupados por módulo,
los 45 requerimientos no funcionales clasificados según la norma ISO/IEC 25010, las reglas de negocio
principales, el modelo de casos de uso con sus diagramas, la especificación de los 19 casos de uso y
las matrices de trazabilidad entre requerimientos, casos de uso y componentes, y entre los casos de
uso del análisis inicial y los del sistema.

El Capítulo V, Análisis y diseño, presenta los diagramas de actividad, de secuencia y de estados de
los procesos críticos, el diagrama de clases del dominio, el modelo entidad-relación con su
diccionario de datos, la arquitectura según el modelo de vistas 4+1, la especificación resumida de
la API, el diseño de seguridad con la matriz de permisos y el diseño de la interfaz.

El Capítulo VI, Construcción, describe la estructura del repositorio, los estándares de código, el
flujo de trabajo con Git, las iteraciones reconstruidas del historial, la distribución del trabajo
entre los integrantes, la evolución del diseño durante la construcción, incluido el ciclo de
corrección de defectos de octubre de 2026, y las herramientas de apoyo utilizadas.

El Capítulo VII, Transición, detalla los requisitos del servidor y de los equipos cliente, el
procedimiento de instalación, la configuración, la puesta en marcha, el mecanismo de actualización,
los respaldos y su restauración, el mantenimiento y la entrega del sistema al usuario.

El Capítulo VIII, Aseguramiento de la calidad, presenta el plan de pruebas funcionales y sus casos de
prueba, los resultados de las pruebas automatizadas y de las pruebas funcionales, el seguimiento de
los defectos detectados y su corrección, y la referencia al informe de pruebas de penetración.

El Glosario define, en orden alfabético, los términos técnicos y del dominio que se usan en el
documento. Las Referencias bibliográficas reúnen las fuentes citadas en los capítulos. El Anexo A
contiene el manual de usuario; el Anexo B, el informe de pruebas de penetración; el Anexo C, las 77
reglas de negocio registradas del sistema, y el Anexo D, la especificación completa de los 54
endpoints de la API.
