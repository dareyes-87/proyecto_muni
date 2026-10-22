# CAPÍTULO VI

# 6 CONSTRUCCIÓN

La fase de Construcción comprende la programación de los módulos del sistema a partir del diseño del
capítulo 5. Este capítulo describe cómo se organizó el código y el trabajo del equipo, las etapas de
la construcción y los cambios que tuvo el diseño en el camino.

## 6.1 Organización del código

Todo el sistema y su documentación se guardan en un único repositorio con control de versiones, que
contiene tres partes: el servidor, organizado por módulos y con sus pruebas automatizadas; la
interfaz, con una página por pantalla y componentes reutilizables; y la documentación, que incluye
las guías de instalación y de respaldos. Junto a ellas están los archivos que permiten instalar el
sistema con Docker.

El código está escrito en TypeScript, con nombres, comentarios y mensajes en español. Se siguieron
algunas reglas comunes: los registros se desactivan en lugar de borrarse, toda operación que modifica
datos queda en la bitácora y el descuento de existencias se hace siempre de forma protegida para que
dos entregas no choquen entre sí.

## 6.2 Forma de trabajo del equipo

Cada integrante trabajó en una rama propia de su módulo, y antes de unir su trabajo al código
principal se revisaba que funcionara junto con lo demás. Antes de integrar la dispensación, por
ejemplo, se probaron los tres módulos juntos, incluida una prueba de dos entregas simultáneas sobre el
mismo lote. En la etapa final cada cambio se propuso mediante una solicitud de integración, que
revisaba otro integrante y que pasaba antes por un proceso automático que compila el sistema, ejecuta
las pruebas y simula la actualización del servidor de la farmacia.

## 6.3 Etapas de la construcción

La construcción se desarrolló en cinco iteraciones, que se resumen en la Tabla 11.

Tabla 11.
Iteraciones de la construcción

| Iteración | Periodo | Resultado |
|-----------|---------|-----------|
| 1 | Junio de 2026 | Base del sistema: instalación con Docker, base de datos, inicio de sesión y estructura de las pantallas; primeros módulos de Inventario, Usuarios y Dispensación |
| 2 | Julio de 2026 | Catálogos, Auditoría y Reportes; colores institucionales y nombre definitivo de FarmaG. El sistema queda completo según el diseño |
| 3 | Agosto de 2026 | Funciones para agilizar el trabajo: lector de código de barras, carga desde Excel, datos sugeridos de medicamentos, fotografías de medicamentos y fotografías de respaldo con código QR |
| 4 | Agosto y septiembre de 2026 | Preparación para la instalación en la farmacia y rediseño de la interfaz |
| 5 | Octubre de 2026 | Corrección de defectos, actualizaciones seguras de la base de datos, respaldos automáticos y pruebas automatizadas |

Fuente: Elaboración propia.

La tercera iteración respondió a una necesidad detectada en la farmacia: registrar los medicamentos
uno por uno resultaba demasiado lento. La quinta se dedicó a que el sistema ya instalado pudiera
actualizarse sin perder información y sin que nadie tuviera que ir al servidor.

## 6.4 Distribución del trabajo

La Tabla 18 muestra la participación de cada integrante.

Tabla 18.
Distribución del trabajo por integrante

| Integrante | Responsabilidad principal | Aportes |
|------------|---------------------------|---------|
| Daniel Reyes | Inventario, configuración base y administración | Base del sistema, inventario, usuarios, panel, auditoría, reportes, carga desde Excel, fotografías, integración del trabajo del equipo, instalación segura, respaldos y pruebas automatizadas |
| Jorge Vargas | Dispensación | Entregas con descuento por vencimiento y control de entregas simultáneas, beneficiarios, lector de código de barras, preparación para la instalación, rediseño de la interfaz y correcciones de seguridad |
| Audias Guevara | Catálogos y documentación | Catálogos de medicamentos con detección de duplicados, códigos de barras, categorías y ubicaciones; documentación del sistema y plan de pruebas |
| Integrante a cargo del manual | Manual de usuario | Manual de usuario (Anexo A) |
| Integrante a cargo de la seguridad | Pruebas de seguridad | Informe de pruebas de seguridad (Anexo B) |

Fuente: Elaboración propia.

## 6.5 Cambios en el diseño

Durante la construcción el sistema se apartó del diseño inicial en algunos puntos. Se eliminaron los
proveedores y el origen de los medicamentos, y no se incluyeron la venta, el ajuste manual de
existencias ni las devoluciones, por las razones de la sección 1.5. Se agregaron funciones que no
estaban previstas, como la carga desde Excel, los datos sugeridos de medicamentos y las fotografías de
respaldo. También se cambió la forma de actualizar la base de datos, para que cada cambio se aplique
de manera controlada y después de un respaldo, sin riesgo de perder información.

## 6.6 Herramientas de apoyo

Además de las tecnologías del sistema, el equipo usó GitHub para compartir el código y revisar los
cambios, sus procesos automáticos para probar cada cambio antes de integrarlo, y la herramienta de
asistencia con inteligencia artificial Claude Code como apoyo en la programación y la revisión. Todo cambio,
viniera de donde viniera, pasó por revisión y por las pruebas antes de llegar al sistema.
