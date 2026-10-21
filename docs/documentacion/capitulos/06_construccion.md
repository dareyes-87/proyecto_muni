# CAPÍTULO VI

# 6 CONSTRUCCIÓN

La fase de Construcción comprende la implementación de los módulos del sistema sobre la arquitectura
y el modelo de datos definidos en la especificación técnica. Este capítulo describe la estructura del
repositorio, los estándares de código, el flujo de trabajo con Git, las iteraciones reconstruidas a
partir del historial del repositorio, la distribución del trabajo entre los integrantes, la evolución
del diseño y las herramientas de apoyo utilizadas. Las fechas citadas son las que Git registra en
cada cambio; indican cuándo se confirmó un cambio, no cuándo se inició el trabajo, por lo que no se
usan para calcular duraciones ni esfuerzo.

## 6.1 Estructura del repositorio

El código del sistema y su documentación se encuentran en un único repositorio Git alojado en GitHub.
Es un monorepo con tres componentes principales: el backend (API REST), el frontend (aplicación de
una sola página) y la documentación, además de los archivos que orquestan los servicios con Docker
Compose. La Tabla 11 resume su organización.

Tabla 11.
Estructura resumida del repositorio

| Elemento | Propósito |
|----------|-----------|
| Archivos de composición | Definen los servicios de base de datos, API, interfaz y respaldos, en modo de desarrollo y de producción |
| Backend | API organizada en rutas por módulo, servicios con la lógica de negocio, middleware de autenticación, auditoría y errores, y pruebas automatizadas |
| Esquema y migraciones | Modelo de datos, carga inicial y migraciones versionadas de la base |
| Frontend | Una página por vista, componentes reutilizables de interfaz y clientes de la API |
| Integración continua | Workflow que reproduce el despliegue antes de integrar cambios |
| Documentación | Especificación técnica, análisis original, guías de despliegue y respaldos, informes de seguridad y esta documentación |

Fuente: Elaboración propia con base en los archivos versionados del repositorio.

## 6.2 Estándares de código

El backend y el frontend están escritos en TypeScript en modo estricto, con identificadores del
dominio, comentarios y mensajes al usuario en español. La API sigue el prefijo `/api/<módulo>` con
un archivo de rutas por módulo, responde los errores con un objeto `{ error }` y centraliza su manejo,
de modo que el detalle interno no se expone fuera del modo de desarrollo. En la base de datos, las
tablas usan nombres en plural y claves primarias UUID, y los registros se desactivan en lugar de
borrarse. Toda operación que modifica datos registra una entrada de auditoría, y el descuento de
existencias se hace dentro de una transacción con bloqueo de los lotes. Los mensajes de commit siguen
el formato `tipo: descripción`. El backend cuenta con pruebas automatizadas; el frontend no tiene
framework de pruebas y ninguno de los dos tiene linter, por lo que el chequeo de tipos del compilador
cumple la función de verificación estática.

## 6.3 Flujo de trabajo con Git

La rama principal, `main`, debe mantenerse funcional. Entre junio y septiembre de 2026 cada
integrante trabajó en una rama de su módulo, y el integrador revisaba cada rama antes de mezclarla
con `main`: comprobaba los archivos modificados, construía los contenedores y probaba los endpoints;
en esa revisión se rechazó una primera versión del módulo de Dispensación y se retrasó la de
Catálogos hasta que tuvo sus páginas. Antes de integrar Dispensación se verificaron los tres módulos
juntos, incluida una prueba de dos dispensaciones simultáneas sobre el mismo lote. Desde octubre de
2026 cada cambio se desarrolla en una rama corta y se integra mediante un *pull request* en GitHub.
El workflow de integración continua "Despliegue seguro" se ejecuta en cada *pull request*: valida el
esquema y las migraciones, compila el backend y el frontend, ejecuta las pruebas automatizadas y
reproduce la actualización del servidor de la farmacia con datos de prueba, comprobando que los datos
se conservan y que los respaldos se restauran. La protección de la rama `main` que haría obligatorio
ese workflow no se confirmó, por lo que su uso es una práctica acordada por el equipo y no un bloqueo
técnico.

## 6.4 Iteraciones del proyecto

Las iteraciones se reconstruyeron agrupando los cambios del historial por periodos de actividad
continua y por objetivo común. Las fases de Inicio y Elaboración no tienen cambios en el repositorio,
porque se realizaron antes de crearlo; sus artefactos son el análisis inicial, elaborado a partir de
la entrevista con la municipalidad, y la especificación técnica del 26 de junio de 2026, que define el stack,
el modelo de datos, los módulos y la estrategia de concurrencia. La Tabla 16 resume las iteraciones
de la Construcción y la Transición.

Tabla 16.
Iteraciones del proyecto reconstruidas a partir del historial de Git

| Iteración | Periodo | Objetivo | Resultado | Fase de RUP |
|-----------|---------|----------|-----------|-------------|
| I1 | 2026-06-27 | Configuración base y primeros módulos | Contenedores, esquema de datos, autenticación y estructura de la interfaz; módulos de Inventario, Usuarios y Dispensación integrados; Catálogos solo con consultas | Construcción |
| I2 | 2026-07-18 a 2026-07-20 | Completar e integrar los módulos de la especificación | Catálogos, Auditoría y Reportes integrados; paleta institucional y cambio de nombre a FarmaG. El proyecto queda funcionalmente completo según la especificación | Construcción |
| I3 | 2026-08-03 a 2026-08-06 | Funciones de productividad no previstas | Lector de códigos de barras, importación desde Excel, autocompletado con OpenFDA, fotografía de medicamentos y evidencia fotográfica por QR | Construcción |
| I4 | 2026-08-18 a 2026-09-07 | Preparación para producción y rediseño de la interfaz | QR con la dirección de la red local, ajustes de despliegue, componentes reutilizables, menú lateral colapsable y eliminación de proveedores | Construcción y Transición |
| I5 | 2026-10-07 a 2026-10-19 | Corrección de defectos y despliegue seguro | Migraciones versionadas, respaldos, integración continua, pruebas automatizadas y corrección de la mayor parte de los hallazgos | Transición |

Fuente: Elaboración propia con base en el historial del repositorio.

Entre las iteraciones hay intervalos sin cambios registrados. Los módulos no se construyeron en el
orden previsto por la especificación, sino en paralelo, cada uno en su rama; para no bloquear los
formularios de Inventario, las consultas de Catálogos se implementaron antes de integrar ese módulo.
La iteración I3 respondió a una necesidad detectada en la farmacia: registrar los medicamentos uno
por uno resultaba demasiado lento. El sistema estaba instalado en la farmacia a más tardar el 25 de
septiembre de 2026, y la iteración I5 se orientó a que el sistema instalado se actualice sin pérdida
de datos y sin intervención en sitio.

## 6.5 Distribución del trabajo por integrante

La Tabla 18 combina la asignación de módulos con el trabajo que el historial atribuye a cada
integrante, incluido el realizado fuera de su módulo. No se usa el número de cambios como medida de
esfuerzo, porque su tamaño varía y un solo cambio puede contener un módulo completo.

Tabla 18.
Distribución del trabajo por integrante

| Integrante | Módulo asignado | Trabajo atribuido en el historial |
|------------|-----------------|-----------------------------------|
| Daniel Reyes | Inventario, configuración base y administración | Configuración base; Inventario; usuarios; tablero principal; Auditoría; Reportes con exportación a PDF y Excel; paleta institucional; importación desde Excel, OpenFDA y fotografía de medicamentos; evidencia fotográfica por QR; integración de las ramas; despliegue seguro, respaldos e integración continua; correcciones de octubre |
| Jorge Vargas | Dispensación | Dispensación con descuento por vencimiento y control de concurrencia; Beneficiarios; lector de códigos de barras; QR con la dirección de la red local; preparación para producción; rediseño de la interfaz y eliminación de proveedores; auditoría y correcciones de seguridad |
| Audias Guevara | Catálogos | Catálogos de medicamentos con detección de duplicados, códigos de barras, categorías y ubicaciones, con sus páginas; documentación del trabajo de graduación |
| Integrante a cargo del manual de usuario | Manual de usuario | Manual de usuario del Anexo A; no registra cambios en el historial del repositorio |
| Integrante a cargo de las pruebas de seguridad | Pruebas de seguridad | Pruebas de seguridad del Anexo B; no registra cambios en el historial del repositorio |

Fuente: Elaboración propia con base en la asignación de módulos y el historial del repositorio.

## 6.6 Evolución del diseño

Durante la construcción el sistema se apartó de la especificación técnica en varios puntos; cuando
ambos no coinciden, prevalece lo implementado. Se eliminaron los proveedores y la procedencia de los
medicamentos, porque la recepción de donaciones corresponde a un proceso administrativo externo a la
farmacia, y no se implementaron la venta, el ajuste manual de existencias ni las devoluciones, por
las decisiones de alcance de la sección 1.5. El esquema de la base dejó de sincronizarse en cada
arranque, un método que borraba datos al eliminar columnas, y pasó a migraciones versionadas
aplicadas tras un respaldo. Se agregaron un servicio de respaldos y una configuración de producción
separada, aunque la instalación usa por defecto el modo de desarrollo. Se incorporaron funciones no
previstas (importación desde Excel, autocompletado con OpenFDA, fotografías de medicamentos y
evidencia de la dispensación), los catálogos se unificaron en una sola pantalla con pestañas y el
tablero quedó sin gráficos. La consulta de reportes por el Encargado de Beneficencia queda pendiente
de confirmación con la municipalidad.

## 6.7 Herramientas de apoyo al desarrollo

Además del stack descrito en el capítulo 2, el equipo utilizó herramientas que no forman parte del
sistema desplegado: Git y GitHub para el control de versiones y los *pull requests*, GitHub Actions
para la integración continua, Docker Compose para el entorno de desarrollo y Playwright para
verificar páginas en el navegador. Usó además Claude Code, el asistente de programación de
Anthropic, con extensiones de instrucciones para revisar ramas, mejorar pantallas y diagnosticar
defectos, bajo reglas que ninguna herramienta puede modificar: todo cambio pasa por rama, *pull
request* y los trabajos del workflow; no se publican en el repositorio, que es público, datos de
beneficiarios, contraseñas ni datos del servidor; y los hallazgos de una herramienta se verifican en
el código antes de corregirlos.
