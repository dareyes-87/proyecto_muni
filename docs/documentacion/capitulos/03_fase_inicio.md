# CAPÍTULO III

# 3 FASE DE INICIO

En la fase de Inicio se delimitó el problema, se identificaron los interesados y se acordó el alcance
del sistema. Este capítulo presenta el documento de visión, los interesados y usuarios, las
necesidades del producto, el análisis de riesgos y la factibilidad del proyecto. El alcance descrito
es el que resultó de las decisiones tomadas durante el desarrollo, en particular la delimitación a
la farmacia de dispensación gratuita (sección 1.5).

## 3.1 Documento de visión

La Tabla 4 reúne, en el formato del documento de visión de RUP, el enunciado del problema y la
declaración de posicionamiento del producto.

Tabla 4.
Visión del producto: problema y posicionamiento

| Elemento | Descripción |
|----------|-------------|
| El problema de | La falta de un registro digital de las entradas y salidas de medicamentos de la Farmacia Municipal de Gualán |
| Afecta a | La municipalidad, que no puede supervisar ni informar sobre el uso de los medicamentos donados; a la persona que opera la farmacia, que no conoce las existencias ni los vencimientos; y a los beneficiarios, que dependen de que haya medicamento disponible |
| Cuyo impacto es | Desconocimiento de las existencias reales, falta de trazabilidad de las entregas, pérdidas por vencimiento no detectadas, dificultad para generar reportes y ausencia de un registro de las acciones de los operadores |
| Para | La Municipalidad de Gualán y la persona que opera la farmacia de dispensación gratuita |
| El producto | FarmaG, un sistema web de inventario y dispensación de medicamentos que opera en la red local de la farmacia |
| Que | Registra las entradas por lote, descuenta las existencias en orden de fecha de vencimiento al dispensar, asocia cada entrega a un beneficiario y al usuario que la realizó, alerta sobre existencias bajas y lotes por vencer, y genera reportes exportables |
| A diferencia de | El registro manual con el que operaba la farmacia, que no permitía conocer las existencias en tiempo real ni auditar las entregas |
| Nuestro producto | Mantiene el historial de cada lote y de cada dispensación y registra en un log de auditoría las operaciones de los usuarios |

Fuente: Elaboración propia con base en el análisis de requerimientos inicial del proyecto.

## 3.2 Interesados y usuarios

Se distingue entre interesados, que tienen un interés en el resultado del proyecto aunque no usen el
sistema, y usuarios, que interactúan directamente con él. La Tabla 6 presenta ambos grupos.

Tabla 6.
Interesados y usuarios del sistema

| Tipo | Interesado o usuario | Descripción y responsabilidades |
|------|----------------------|---------------------------------|
| Interesado | Encargado de recursos humanos de la Municipalidad de Gualán | Solicitante y cliente; expresó la solicitud que dio origen al sistema y aprobó la delimitación del alcance |
| Interesado | Municipalidad de Gualán | Propietaria de la farmacia y del sistema; provee el equipo y la red local y recibe los reportes |
| Interesado | Beneficiarios | Ciudadanos que reciben medicamentos sin costo y presentan su identificación y la receta; no usan el sistema |
| Interesado | Equipo de desarrollo | Cinco integrantes: Daniel Reyes, Jorge Vargas y Audias Guevara analizaron, diseñaron, construyeron, instalaron y documentaron el sistema; un integrante elaboró el manual de usuario y otro realizó las pruebas de seguridad |
| Interesado | Asesor del curso de Seminario | Docente de la Universidad Mariano Gálvez de Guatemala que revisa y aprueba la documentación |
| Usuario | Administrador | Acceso a todas las funciones: usuarios, catálogos, entradas e importación, baja de lotes, dispensaciones, reportes y auditoría. En la operación actual es la cuenta que usa la única persona que opera la farmacia |
| Usuario | Encargado de Beneficencia | Rol definido para quien despacha: beneficiarios, dispensaciones, entradas manuales y consulta del inventario. Existe en el sistema pero no se usa en la operación actual |
| Usuario | Teléfono de captura (sin sesión) | Abre el enlace del código QR mostrado tras una dispensación y sube las fotografías de la receta y de la entrega mientras el enlace esté vigente |

Fuente: Elaboración propia.

## 3.3 Necesidades del producto

Las necesidades se tomaron de la solicitud del encargado de recursos humanos de la municipalidad y de los problemas identificados en el análisis
inicial. La Tabla 8 relaciona cada necesidad con las características del producto que la atienden y
con los casos de uso originales correspondientes.

Tabla 8.
Necesidades y características del producto

| Necesidad | Características del producto | Casos de uso originales |
|-----------|------------------------------|-------------------------|
| "Control de inventario de medicina" | Inventario por lote con cantidad, fecha de vencimiento y estado | CUO-02 |
| "Control de lo que sale y entra" | Registro de entradas e importación desde Excel; dispensaciones con descuento por lote | CUO-01, CUO-14 |
| "Parte que se regala" y trazabilidad de las entregas | Beneficiarios, dispensación asociada a beneficiario y usuario, historial y evidencia fotográfica opcional | CUO-14, CUO-15, CUO-16 |
| Reducir las pérdidas por vencimiento | Despacho por fecha de vencimiento, semáforo con umbrales configurables, marcado diario de vencidos y baja de lotes | CUO-05, CUO-32, CUO-37 |
| Evitar el desabastecimiento | Alerta de existencias bajas en el tablero | CUO-04 |
| Reportes para las autoridades municipales | Seis reportes exportables a PDF y Excel | CUO-19, CUO-21, CUO-27 |
| Rastrear las acciones de los operadores | Usuarios con contraseña, dos roles y log de auditoría | CUO-28, CUO-33, CUO-34 |
| Catálogo de medicamentos ordenado | Medicamentos con fotografía y códigos de barras, categorías y ubicaciones | CUO-29, CUO-31 |
| "Tanto pagado como no pagado" | Solo se atiende la parte no pagada; la venta quedó fuera del alcance | CUO-06 a CUO-13 (excluidos) |

Fuente: Elaboración propia con base en el análisis de requerimientos inicial y las decisiones de
alcance del proyecto.

Algunos casos de uso originales se atienden de forma parcial; el detalle se presenta en la matriz de
trazabilidad del capítulo 4.

## 3.4 Análisis de riesgos

Los riesgos se identificaron a partir de hechos del proyecto: la revisión del código y de la
configuración, el plan de correcciones del equipo y las condiciones de la instalación en la farmacia.
La Tabla 9 presenta los principales, con su probabilidad, su impacto, la mitigación aplicada y su
estado al 20 de octubre de 2026. La probabilidad y el impacto son valoraciones cualitativas hechas
para este análisis.

Tabla 9.
Análisis de riesgos del proyecto

| N.º | Riesgo | Probabilidad | Impacto | Mitigación aplicada | Estado |
|-----|--------|--------------|---------|---------------------|--------|
| 1 | Cambio de alcance: el análisis inicial abarcaba la farmacia de venta y la de dispensación gratuita | Alta (ocurrió) | Alto | Delimitación del sistema a la farmacia de dispensación gratuita, acordada con la municipalidad | Cerrado |
| 2 | Exposición de credenciales por contraseñas y clave de firma de ejemplo en la configuración por defecto | Media | Alto | La configuración de producción exige definir los secretos. Pendiente: revisar y reemplazar los valores del servidor | Abierto |
| 3 | Instalación en modo de desarrollo, con mensajes de error internos visibles y acceso abierto desde otros orígenes | Alta | Alto | Existe una configuración de producción. Pendiente: adoptarla en el servidor de la farmacia | Abierto |
| 4 | Sin acceso remoto al servidor: un cambio que impida el arranque no puede corregirse a distancia | Media | Alto | Integración continua que prueba el despliegue antes de integrar cambios y respaldo antes de cada arranque | Mitigado parcialmente |
| 5 | Pérdida de datos al cambiar el esquema de la base | Alta | Alto | Migraciones versionadas y respaldo automático previo a cada arranque | Mitigado |
| 6 | Dispensación de lotes vencidos | Media | Alto | El despacho excluye los lotes vencidos y el proceso diario corre en hora de Guatemala y al arrancar | Mitigado |
| 7 | Doble descuento de existencias por dos dispensaciones simultáneas | Baja | Alto | Bloqueo de los lotes dentro de una transacción durante el despacho | Mitigado |
| 8 | Operación diaria con una cuenta de Administrador, contraria al principio de mínimo privilegio | Alta (ocurre) | Medio | Ninguna aún. Pendiente: habilitar los reportes para el Encargado de Beneficencia y crear una cuenta de ese rol | Abierto |
| 9 | La contraseña inicial del administrador queda escrita en el registro del servidor y nada obliga a cambiarla | Media | Alto | Ninguna en el código. Pendiente: definirla en la configuración y agregar el cambio obligatorio | Abierto |
| 10 | Reportes con rangos de fechas incorrectos: el filtro "desde" incluye registros del día anterior | Alta | Alto | Ninguna aún. Corrección planificada | Abierto |

Fuente: Elaboración propia con base en el registro de hallazgos y el plan de correcciones del
proyecto.

Los riesgos abiertos 2, 3 y 9 dependen de la configuración del servidor de la farmacia y no del
código, por lo que el plan de correcciones los asigna a una revisión en sitio.

## 3.5 Factibilidad

### 3.5.1 Factibilidad técnica

Las tecnologías del sistema, descritas en el capítulo 2, son de código abierto, cuentan con
documentación oficial y se ejecutan en contenedores, de modo que el servidor solo necesita Docker y
una conexión a la red local. La factibilidad técnica quedó demostrada en la práctica: el sistema fue
instalado en la Farmacia Municipal de Gualán y opera en su red local. Las características del equipo
servidor y de los equipos cliente no se verificaron como parte de este trabajo.

### 3.5.2 Factibilidad operativa

El sistema se usa desde un navegador web, sin instalar programas en los equipos cliente ni en el
teléfono de captura, y las tareas de mantenimiento de la base (respaldos, cambios de esquema y
marcado de lotes vencidos) se ejecutan de forma automática. En la operación actual una sola persona
despacha y consulta los reportes con una cuenta de Administrador, lo que simplifica la adopción pero
concentra en una cuenta todos los permisos (riesgo 8 de la Tabla 9).

### 3.5.3 Factibilidad económica

Las bibliotecas, el motor de base de datos y el servidor web son de código abierto y no requieren
licencias. La excepción es la plataforma de contenedores: según el equipo, el servidor de la farmacia
ejecuta casi con seguridad Docker Desktop, aunque no se comprobó, y los términos de Docker exigen una
suscripción de pago a las entidades de gobierno que lo usan (Docker Inc., s.f.-c). Este riesgo y sus
alternativas se tratan en la sección 7.5. El desarrollo lo realizó el equipo de estudiantes como
proyecto académico. Las fuentes del proyecto no registran el monto de los rubros de costo (equipo
servidor, red, lector de código de barras, horas de desarrollo, instalación y capacitación), por lo
que no se presenta una estimación de costos.
