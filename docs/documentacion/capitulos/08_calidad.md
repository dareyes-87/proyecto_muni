# CAPÍTULO VIII

# 8 ASEGURAMIENTO DE LA CALIDAD

Este capítulo describe cómo se comprobó que FarmaG cumple sus requerimientos y cómo se encontraron,
registraron y corrigieron sus defectos.

## 8.1 Estrategia de calidad

La calidad se evaluó con el modelo de la norma ISO/IEC 25010 (ISO, 2023): el cumplimiento de las
funciones se comprobó con pruebas basadas en los casos de uso, y las demás características, con los
requerimientos no funcionales del capítulo 4. La Tabla 301 presenta los tipos de prueba que se
aplicaron y quién se encargó de cada uno.

Tabla 301.
Tipos de prueba aplicados

| Tipo de prueba | Alcance | Responsable |
|----------------|---------|-------------|
| Pruebas automatizadas del servidor | 53 pruebas sobre vencimientos, inicio de sesión, validación de datos, inventario y entregas | Jorge Vargas y Daniel Reyes |
| Pruebas automáticas de cada cambio | Compilación, pruebas y simulación de la actualización del servidor antes de integrar un cambio | Daniel Reyes |
| Pruebas funcionales | 92 casos de prueba derivados de los 19 casos de uso | Audias Guevara |
| Revisión del código | Comparación del sistema con su diseño y revisión de cada corrección | Audias Guevara |
| Pruebas de seguridad | Pruebas de ataque al sistema y revisión de vulnerabilidades | Integrante a cargo de la seguridad (Anexo B) |

Fuente: Elaboración propia.

## 8.2 Plan de pruebas funcionales

El plan busca comprobar que el sistema cumple cada caso de uso, con al menos una prueba de uso
correcto y una de uso incorrecto por caso, y con especial atención a las reglas que protegen el
inventario: el descuento por fecha de vencimiento, la revisión de existencias, los permisos de cada
rol, el bloqueo del inicio de sesión, los filtros de los reportes y las fotografías de respaldo. Las
pruebas se hicieron en un entorno de prueba, nunca sobre la información de la farmacia.

El ciclo de pruebas se daba por terminado cuando se ejecutaran todos los casos de prioridad alta y
media, no quedara un defecto grave sin plan de corrección y cada caso fallido tuviera su defecto
registrado. Los defectos se clasificaron en cuatro niveles: crítico, si afecta los datos, el
inventario o el acceso; alto, si una función principal da un resultado incorrecto; medio, si hay una
alternativa para seguir trabajando; y bajo, si es un mensaje inexacto o un detalle visual.

Se elaboraron 92 casos de prueba, distribuidos por caso de uso y prioridad como muestra la Tabla 304.

Tabla 304. Catorce de ellos describen el comportamiento esperado tras corregir un
hallazgo ya registrado, por lo que se preveía que fallaran y su fallo no se cuenta como defecto nuevo.

Tabla 304.
Casos de prueba por caso de uso y prioridad

| Caso de uso | Casos | Alta | Media | Baja |
|-------------|------:|-----:|------:|-----:|
| CU-01 Iniciar y cerrar sesión | 8 | 4 | 2 | 2 |
| CU-02 Gestionar usuarios | 8 | 4 | 4 | 0 |
| CU-03 Gestionar medicamentos | 7 | 2 | 3 | 2 |
| CU-04 Gestionar códigos de barras | 3 | 1 | 1 | 1 |
| CU-05 Gestionar categorías | 3 | 0 | 2 | 1 |
| CU-06 Gestionar ubicaciones | 3 | 0 | 2 | 1 |
| CU-07 Registrar entrada de medicamentos | 6 | 2 | 4 | 0 |
| CU-08 Importar inventario desde Excel | 5 | 2 | 2 | 1 |
| CU-09 Consultar inventario | 6 | 3 | 1 | 2 |
| CU-10 Dar de baja lote | 2 | 1 | 1 | 0 |
| CU-11 Actualizar lotes vencidos | 2 | 2 | 0 | 0 |
| CU-12 Consultar panel de alertas | 2 | 0 | 1 | 1 |
| CU-13 Gestionar beneficiarios | 4 | 3 | 1 | 0 |
| CU-14 Consultar historial de beneficiario | 3 | 1 | 2 | 0 |
| CU-15 Dispensar medicamentos | 9 | 5 | 4 | 0 |
| CU-16 Registrar evidencia fotográfica | 8 | 2 | 5 | 1 |
| CU-17 Consultar reportes | 5 | 3 | 2 | 0 |
| CU-18 Exportar reportes | 4 | 1 | 1 | 2 |
| CU-19 Consultar bitácora de auditoría | 4 | 2 | 2 | 0 |
| **Total** | **92** | **38** | **40** | **14** |

Fuente: Elaboración propia.

## 8.3 Pruebas automatizadas

El servidor cuenta con 53 pruebas automatizadas, que revisan el cálculo de vencimientos, que no se
entreguen lotes vencidos, el bloqueo del inicio de sesión, la validación de los datos, la carga desde
Excel y el arranque del sistema. Las 53 se aprobaron, tanto al inicio como al final del ciclo de
pruebas. Además, cada cambio que se propone para el sistema pasa por un proceso automático que lo
compila, ejecuta estas pruebas y simula la actualización del servidor de la farmacia, para confirmar
que no se pierde información.

## 8.4 Resultados de las pruebas funcionales

Se ejecutaron los 92 casos de prueba. Se aprobaron 74 y fallaron 18; ningún caso quedó sin ejecutar.
De los 18 fallos, 14 correspondían a defectos que ya estaban registrados y 4 a tres defectos nuevos de
gravedad baja. Se aprobaron todos los casos de las reglas más importantes: el descuento por fecha de
vencimiento, la revisión de existencias, las entregas simultáneas, los permisos de cada rol y el
bloqueo del inicio de sesión. La Tabla 314 resume los resultados por prioridad.

Tabla 314.
Resultados de las pruebas funcionales por prioridad

| Prioridad | Casos | Aprobados | Fallidos |
|-----------|------:|----------:|---------:|
| Alta | 38 | 36 | 2 |
| Media | 40 | 33 | 7 |
| Baja | 14 | 5 | 9 |
| **Total** | **92** | **74** | **18** |

Fuente: Elaboración propia.

Los defectos que explican los casos fallidos se describen en la Tabla 308.

Tabla 308.
Defectos encontrados en las pruebas funcionales

| Defecto | Gravedad |
|---------|----------|
| El filtro de fecha inicial de los reportes y de la bitácora incluye horas del día anterior | Alta |
| El cierre de sesión no queda registrado en la bitácora | Media |
| Un correo de usuario repetido produce un error general en lugar de un aviso claro | Media |
| Los filtros de fecha del historial de entregas no toman la hora local | Media |
| La subida de fotografías no registra desde qué equipo se hizo | Media |
| La pantalla de inicio de sesión no indica cuántos intentos quedan | Baja |
| Algunos mensajes de validación muestran un texto inexacto o el aviso propio del navegador | Baja |
| Una categoría o ubicación con solo espacios produce un error general | Baja |
| La carga desde Excel rechaza un medicamento activo cuya categoría está inactiva | Baja |
| La exportación del inventario no valida uno de sus filtros | Baja |
| Al editar un medicamento sin nombre comercial, la bitácora registra un cambio que no hubo | Baja |

Fuente: Elaboración propia.

Se cumplieron los criterios para dar por terminado el ciclo: se ejecutaron todos los casos de
prioridad alta y media, los dos fallos de prioridad alta corresponden a un defecto con corrección
planificada y todos los fallos tienen su defecto registrado. Queda pendiente probar la toma de
fotografías con los teléfonos del personal en la farmacia.

## 8.5 Gestión de defectos

Los defectos siguieron un ciclo de detección, registro, corrección y verificación. La mayoría se
encontraron al revisar el código durante la elaboración de esta documentación, y otros en las
pruebas de seguridad y en las pruebas funcionales. Cada uno se registró con su descripción, su
gravedad y un responsable, y se corrigió en grupos pequeños de cambios. Un defecto solo se dio por
resuelto cuando la corrección se comprobó en el sistema. Entre los defectos corregidos están la
posibilidad de entregar lotes que vencían ese mismo día, el horario incorrecto del proceso de
vencimientos, el riesgo de perder datos al actualizar la base de datos, el acceso a las fotografías
sin iniciar sesión y la falta de un límite de intentos en el inicio de sesión.

El defecto más grave encontrado en la instalación fue que la cuenta del administrador conservaba una
contraseña inicial conocida públicamente, con la que cualquiera en la red podía entrar al sistema con
todos los permisos. El personal de la farmacia la cambió y el riesgo quedó resuelto.

Los defectos que siguen abiertos de mayor gravedad tienen que ver con la configuración del servidor
de la farmacia, que conserva claves de ejemplo y funciona en modo de desarrollo, y con el filtro de
fechas de los reportes. Como todo cambio que se integra se instala solo en el servidor de la
farmacia, el equipo acordó hacer antes de la entrega únicamente correcciones pequeñas y dejar las
demás para después. La Tabla 312 resume las correcciones planificadas.

Tabla 312.
Correcciones planificadas

| Grupo | Contenido |
|-------|-----------|
| Fechas de reportes | Filtros de fecha de los reportes y de la bitácora en hora local |
| Configuración de producción | Configuración segura del servidor y claves propias |
| Usuarios y contraseñas | Validación de usuarios, contraseñas de al menos 8 caracteres, cambio obligatorio de la contraseña inicial y registro del cierre de sesión |
| Entregas y beneficiarios | Filtros de fecha del historial, registro completo de las fotografías y desactivación de beneficiarios |
| Inventario | Motivo obligatorio al dar de baja un lote y pantalla para ajustar los plazos del indicador de vencimiento |
| Reportes para el Encargado | Acceso del Encargado de Beneficencia a la consulta de reportes |
| Mensajes de la interfaz | Mensajes de validación más claros |

Fuente: Elaboración propia.

## 8.6 Pruebas de seguridad

Las pruebas de seguridad comprendieron ataques controlados al sistema, una lista de 62 pruebas y una
revisión según las vulnerabilidades más comunes de las aplicaciones web (OWASP Top 10). De ellas
salieron correcciones como el límite de intentos en el inicio de sesión, protecciones adicionales en
las respuestas del servidor y la protección de las fotografías de respaldo. El informe completo se
presenta en el Anexo B.

## 8.7 Cumplimiento de los requerimientos no funcionales

La Tabla 313 presenta el resultado de la revisión de los requerimientos no funcionales principales
del capítulo 4.

Tabla 313.
Cumplimiento de los requerimientos no funcionales principales

| RNF | Resultado |
|-----|-----------|
| RNF-01 Contraseñas cifradas | Cumple |
| RNF-02 Sesión obligatoria | Cumple |
| RNF-03 Acceso según el rol | Cumple |
| RNF-04 Bloqueo por intentos fallidos | Cumple |
| RNF-07 Enlace del código QR seguro | Cumple |
| RNF-11 Bitácora de acciones | Cumple |
| RNF-12 Validación de datos | Cumple en parte: algunas funciones necesitan mejor validación |
| RNF-13 Entregas simultáneas sin doble descuento | Cumple |
| RNF-14 Sin entrega de lotes vencidos | Cumple |
| RNF-16 Respaldo cada 12 horas | Cumple |
| RNF-22 Interfaz en español | Cumple, salvo algunos avisos propios del navegador |
| RNF-23 Lector de código de barras | Cumple en pruebas; falta probarlo con el lector de la farmacia |
| RNF-28 Listados por páginas | Cumple en parte: dos listados se cargan completos |
| RNF-33 Pruebas automatizadas | Cumple: 53 de 53 aprobadas |
| RNF-38 Instalación con Docker | Cumple |
| RNF-43 Importación y exportación de archivos | Cumple |

Fuente: Elaboración propia.
