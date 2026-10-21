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
reconstruyen a partir del historial del repositorio. Las descripciones técnicas corresponden a la
versión del sistema vigente al 21 de octubre de 2026, fecha en que se cerró la documentación; lo que
no pudo verificarse se indica en cada caso.

El Capítulo I, Generalidades, presenta los antecedentes del proyecto, el planteamiento del problema,
la justificación, los objetivos, los alcances, las exclusiones y los límites del sistema, y la
metodología.

El Capítulo II, Marco de referencia, expone el control de inventario por lotes con el criterio de
salida por fecha de vencimiento, el proceso RUP, el lenguaje UML, las normas ISO/IEC 25010 e
ISO/IEC/IEEE 29148 y las tecnologías del sistema con la función que cumple cada una.

El Capítulo III, Fase de Inicio, contiene el documento de visión, los interesados y usuarios, las
necesidades del producto, el análisis de riesgos y la factibilidad técnica, operativa y económica.

El Capítulo IV, Requerimientos, especifica los 58 requerimientos funcionales agrupados por módulo,
los requerimientos no funcionales principales clasificados según la norma ISO/IEC 25010, un resumen
de las reglas de negocio, el modelo de casos de uso, la especificación de los 19 casos de uso y la
matriz de trazabilidad entre requerimientos y casos de uso.

El Capítulo V, Análisis y diseño, presenta los diagramas de actividad, de secuencia y de estados del
proceso de dispensación y del lote, el modelo del dominio, el modelo de datos, la arquitectura según
el modelo de vistas 4+1, los módulos de la API, el diseño de seguridad con la matriz de permisos y el
diseño de la interfaz.

El Capítulo VI, Construcción, describe la estructura del repositorio, los estándares de código, el
flujo de trabajo con Git, las iteraciones reconstruidas del historial, la distribución del trabajo
entre los integrantes, la evolución del diseño durante la construcción y las herramientas de apoyo
utilizadas.

El Capítulo VII, Transición, detalla los requisitos del sistema, la instalación y el despliegue, la
configuración, los respaldos y su restauración, los riesgos de la instalación actual, el
mantenimiento y la entrega del sistema al usuario.

El Capítulo VIII, Aseguramiento de la calidad, presenta la estrategia de calidad, el plan de pruebas
funcionales, las pruebas automatizadas, los resultados de las pruebas funcionales, la gestión de los
defectos, la referencia a las pruebas de seguridad y la evaluación frente a los requerimientos no
funcionales.

El Glosario define, en orden alfabético, los términos técnicos y del dominio que se usan en el
documento. Las Referencias bibliográficas reúnen las fuentes citadas en los capítulos. El Anexo A
contiene el manual de usuario; el Anexo B, el informe de pruebas de penetración, y el Anexo C, las
reglas de negocio vigentes del sistema.
