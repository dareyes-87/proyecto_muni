<!-- Numeración de tablas: este capítulo usa provisionalmente números de la serie 300; el script de
ensamblado las renumera para conservar la numeración corrida del documento. No incluye figuras.
Los resultados de las pruebas funcionales provienen de pruebas/registro_ejecucion.md (ciclo 1, 20 y
21 de octubre de 2026). -->

# CAPÍTULO VIII

# 8 ASEGURAMIENTO DE LA CALIDAD

El aseguramiento de la calidad comprende las actividades con que se comprobó que FarmaG cumple los
requerimientos del capítulo 4 y con que se detectaron, registraron y corrigieron sus defectos. Este
capítulo describe la estrategia de calidad, el plan y los resultados de las pruebas funcionales, las
pruebas automatizadas, la gestión de los defectos, las pruebas de seguridad y la evaluación frente a
los requerimientos no funcionales. Lo descrito corresponde a la versión del sistema vigente al 21 de
octubre de 2026, fecha en que el equipo congeló la documentación; las correcciones posteriores se
registran como trabajo posterior a la entrega.

## 8.1 Estrategia de aseguramiento de la calidad

El marco de calidad es el modelo de la norma ISO/IEC 25010 descrito en el capítulo 2 (ISO, 2023): la
adecuación funcional se evalúa con pruebas funcionales derivadas de los casos de uso, y las demás
características, mediante los requerimientos no funcionales del capítulo 4, cada uno con su medio de
verificación. La calidad se verificó en los seis niveles de la Tabla 301. Se entiende por prueba
unitaria la que no necesita base de datos y por prueba de integración la que se conecta a ella; el
frontend no cuenta con pruebas automatizadas, por lo que su comportamiento se verificó con las
pruebas funcionales. Durante la construcción se hicieron además verificaciones manuales al integrar
cada módulo, como la prueba de concurrencia del despacho del 19 de julio de 2026, que no siguieron un
plan formal.

Tabla 301.
Niveles de prueba aplicados y responsables

| Nivel | Alcance | Responsable |
|-------|---------|-------------|
| Pruebas unitarias | 42 casos: vencimiento y semáforo, límites de inicio de sesión, validación de datos y arranque sin secretos | Jorge Vargas y Daniel Reyes |
| Pruebas de integración | 11 casos: despacho sin lotes vencidos, vencimiento al arrancar, inventario, catálogos y carga inicial | Jorge Vargas y Daniel Reyes |
| Integración continua | Flujo automatizado "Despliegue seguro" | Daniel Reyes |
| Pruebas funcionales de caja negra | 92 casos derivados de los 19 casos de uso | Plan y casos: Audias Guevara; ejecución automatizada bajo su supervisión |
| Revisión de código | Contraste del código con la especificación y verificación de cada corrección | Audias Guevara, con los informes de revisión del equipo |
| Pruebas de penetración | Auditoría ofensiva y matriz de 62 pruebas de seguridad | Ver Anexo B |

Fuente: Elaboración propia.

## 8.2 Plan de pruebas funcionales

El plan verifica que el sistema cumple los requerimientos funcionales y los 19 casos de uso, con al
menos un caso positivo y uno negativo por caso de uso, y con énfasis en las reglas que protegen el
inventario y la trazabilidad: el criterio de vencimiento y el orden FIFO, la verificación del stock,
los permisos por rol, el límite de intentos de inicio de sesión, los filtros de fechas de los reportes
y la evidencia fotográfica. Quedan fuera las pruebas de seguridad (sección 8.6), el despliegue y los
respaldos, que verifica la integración continua, y las pruebas de carga, que no se definieron. Los
casos se derivaron del flujo normal y de los flujos alternativos de cada caso de uso, con partición
de equivalencia, valores límite, pruebas por rol y transición de estados. Se ejecutaron en el equipo
de desarrollo, con una base de datos de prueba recreada para el ciclo y nunca sobre la de la
municipalidad, desde la interfaz web o con peticiones a la API cuando el resultado solo se observa
allí; la captura desde el teléfono se simuló en un navegador con tamaño de teléfono.

El ciclo se inicia con el entorno levantado, las pruebas automatizadas aprobadas, los datos y las
cuentas de prueba cargados y los casos revisados. Se da por concluido cuando se ejecutaron todos los
casos de prioridad alta y al menos el 90 % de los de prioridad media, no queda abierto un defecto
crítico o alto fuera de un hallazgo con corrección planificada, todo caso fallido tiene un defecto
asociado, los bloqueados tienen su causa anotada, las pruebas automatizadas siguen aprobadas y el
registro de ejecución está completo. Los defectos se clasifican en cuatro severidades: crítica
(pérdida de datos, descuento incorrecto de stock o acceso sin permiso), alta (resultado incorrecto en
una función principal sin alternativa), media (defecto con alternativa o error de trazabilidad) y baja
(mensaje inexacto o defecto cosmético).

Se especificaron 92 casos de prueba, CP-01 a CP-92, cuya distribución por caso de uso y prioridad se
presenta en la Tabla 304. Catorce de ellos describen el comportamiento esperado tras corregir un
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

El servidor cuenta con 53 pruebas automatizadas, escritas con el ejecutor de pruebas integrado de
Node.js; las de integración crean sus propios datos y los eliminan al terminar. Se ejecutaron el 20 de
octubre de 2026 sobre una base de datos de desarrollo recién creada y se aprobaron las 53, sin fallos;
las de integración se repitieron con la zona horaria UTC, con el mismo resultado. En la Tabla 305 se
resume qué verifica cada grupo. La cobertura tiene límites: de los 29 hallazgos resueltos total o
parcialmente, solo cinco tienen una prueba que ejerce la corrección, ninguna corrección del frontend
tiene prueba automatizada y no se midió la cobertura de código.

Tabla 305.
Pruebas automatizadas del servidor y resultados

| Grupo | Qué verifica | Resultado |
|-------|--------------|-----------|
| Vencimiento y semáforo | Días para vencer, semáforo, stock dispensable y validación de la fecha de vencimiento | 9 de 9 |
| Despacho y arranque | El despacho no toma lotes vencidos y al arrancar se marcan los vencidos | 2 de 2 |
| Inicio de sesión | Límites de intentos por equipo y por usuario | 11 de 11 |
| Configuración de arranque | El servidor no arranca sin clave de firma de sesiones | 5 de 5 |
| Validación de datos | Fechas, paginación, parámetros y límite de registros por exportación | 17 de 17 |
| Rutas de inventario y catálogos | Importación sin duplicar lotes, stock sin vencidos, tipos de datos y enlace de captura | 8 de 8 |
| Carga inicial | La carga inicial no restaura catálogos modificados | 1 de 1 |
| **Total** | | **53 de 53** |

Fuente: Elaboración propia.

El flujo automatizado "Despliegue seguro" se ejecuta en cada envío de cambios al repositorio y
comprueba que el esquema tenga sus migraciones, que el sistema compile y pase las pruebas, que una
actualización no altere los datos ni impida restaurar los respaldos y que una instalación desde cero
funcione. Su efecto como barrera depende de la protección de la rama principal, que no se confirmó;
desde el 11 de octubre de 2026 todos los cambios entraron con el flujo aprobado, por acuerdo del
equipo.

## 8.4 Resultados de las pruebas funcionales

Se ejecutó un ciclo de pruebas: los casos observables en la API, el 20 de octubre de 2026, y los de
interfaz, el 21 de octubre, de forma automatizada en un navegador, bajo la supervisión de Audias
Guevara y con evidencia de cada caso. En la Tabla 314 se presentan los resultados por prioridad. De
los 92 casos, 74 se aprobaron y 18 fallaron, sin casos bloqueados ni sin ejecutar; 14 de los fallos
eran los previstos por hallazgos ya registrados y los otros 4 corresponden a tres defectos nuevos de
severidad baja. Se aprobaron todos los casos de las reglas críticas de vencimiento y orden FIFO,
stock y concurrencia, permisos por rol y límite de intentos de inicio de sesión; entre ellos, se
repitió la prueba de dos dispensaciones simultáneas, en la que una se registró y la otra se rechazó
sin doble descuento.

Tabla 314.
Resultados de las pruebas funcionales por prioridad

| Prioridad | Casos | Aprobados | Fallidos por hallazgo ya registrado | Fallidos por defecto nuevo |
|-----------|------:|----------:|------------------------------------:|---------------------------:|
| Alta | 38 | 36 | 2 | 0 |
| Media | 40 | 33 | 3 | 4 |
| Baja | 14 | 5 | 9 | 0 |
| **Total** | **92** | **74** | **14** | **4** |

Fuente: Elaboración propia.

En la Tabla 308 se resumen los defectos asociados a los casos fallidos. Los nuevos, H-53 a H-55, se
deben en dos casos a que la validación propia del navegador impide el dato inválido antes de mostrar
el mensaje del sistema, por lo que el sistema protege igual y solo cambia el texto; el tercero deja
en la bitácora un cambio que la persona no hizo.

Tabla 308.
Defectos asociados a los casos de prueba fallidos

| Casos | Defecto | Severidad |
|-------|---------|-----------|
| CP-82, CP-91 | H-46: el filtro de fecha inicial de reportes y bitácora incluye horas del día anterior | Alta |
| CP-08 | H-10: el cierre de sesión no queda en la bitácora | Media |
| CP-16 | H-15: un correo de usuario duplicado produce un error interno | Media |
| CP-71 | H-45: los filtros de fecha del historial de dispensaciones no usan la hora local | Media |
| CP-79 | H-35: la subida de fotografías se registra sin dirección IP y sin indicar el reemplazo | Media |
| CP-07 | H-47: el inicio de sesión no muestra los intentos restantes | Baja |
| CP-26 | H-31: mensaje de código duplicado inexacto para el mismo medicamento | Baja |
| CP-29, CP-32 | H-42: una categoría o ubicación con solo espacios produce un error interno | Baja |
| CP-43 | H-48: la importación rechaza un medicamento activo por su categoría inactiva | Baja |
| CP-49 | H-43: una paginación no numérica produce un error o una respuesta vacía | Baja |
| CP-78 | H-38: reutilizar el enlace de captura se registra como creación | Baja |
| CP-88 | H-44: la exportación de inventario no valida el estado | Baja |
| CP-19, CP-36 | H-53 (nuevo): el navegador muestra su propio mensaje de validación | Baja |
| CP-41 | H-54 (nuevo): el botón de importar está deshabilitado sin archivo, sin aviso | Baja |
| CP-20 | H-55 (nuevo): editar un medicamento sin nombre comercial registra un cambio inexistente | Baja |

Fuente: Elaboración propia con base en el registro de ejecución de las pruebas.

Se cumplieron los seis criterios de salida: se ejecutó el 100 % de los casos de prioridad alta y
media; los dos fallos de prioridad alta corresponden a H-46, con corrección planificada, y los
defectos nuevos son de severidad baja; los 18 casos fallidos tienen defecto asociado; no hubo casos
bloqueados; las 53 pruebas automatizadas se aprobaron de nuevo al terminar, y el registro quedó
completo. El ciclo se dio por concluido. Quedan pendientes la prueba de la captura con un teléfono
real y la reejecución de los casos fallidos cuando se integren sus correcciones.

## 8.5 Gestión de defectos

Los defectos siguieron un ciclo de detección, registro, corrección y verificación. Se detectaron
principalmente al contrastar el código con la especificación durante la elaboración de esta
documentación, y también en la auditoría de seguridad del equipo y en las pruebas funcionales. Cada
uno se registró con un identificador, su descripción, su impacto y una prioridad, junto con un
responsable y un lote de corrección. Las correcciones se integraron por lotes, con el flujo
automatizado aprobado, y cada hallazgo se marcó como resuelto solo cuando el código lo mostraba. De
los 34 primeros hallazgos, verificados uno por uno, 19 quedaron resueltos, 10 resueltos parcialmente,
4 pendientes y 1 no verificable en el código; los 17 detectados después en esa verificación siguen
pendientes, y se agregaron 4 más, H-52 por la instalación y H-53 a H-55 por las pruebas funcionales.
Entre los resueltos están el despacho de lotes que vencían el mismo día, el proceso de vencimiento
desfasado por la zona horaria, el borrado de datos al actualizar el esquema, las fotografías de
recetas accesibles sin sesión y la falta de límite de intentos de inicio de sesión.

En la Tabla 311 se presentan los hallazgos abiertos de prioridad crítica y alta. Cuatro de ellos
(H-36, H-03, H-07 y H-17) dependen de la configuración con que se ejecuta el servidor de la farmacia,
que por defecto usa el modo de desarrollo y al que nadie del equipo tiene acceso; como no consta que
los secretos de ejemplo se hayan cambiado, se tratan como riesgo abierto.

Tabla 311.
Hallazgos abiertos de prioridad crítica y alta

| ID | Hallazgo | Prioridad | Corrección |
|----|----------|-----------|------------|
| H-52 | La instalación de la farmacia puede conservar la contraseña fija del administrador que creaba la carga inicial anterior | Crítica | Inmediata: restablecer la contraseña desde la gestión de usuarios |
| H-36 | La actualización automática del servidor usa la configuración de desarrollo, con secretos por defecto | Crítica | Después de la entrega |
| H-03 | La configuración conserva valores por defecto de la contraseña de la base de datos y de la clave de firma de sesiones | Crítica | Bloqueada: requiere acceso al servidor |
| H-46 | El filtro de fecha inicial de reportes y bitácora incluye horas del día anterior | Alta | Después del cierre de la documentación |
| H-07 | En modo de desarrollo los errores internos muestran detalles del servidor | Alta | Después de la entrega |
| H-17 | En modo de desarrollo la API acepta peticiones de cualquier origen | Alta | Después de la entrega |
| H-39 | La contraseña aleatoria del administrador inicial queda en el registro del contenedor y nada obliga a cambiarla | Alta | Después de la entrega |

Fuente: Elaboración propia.

El equipo acordó que hasta el 24 de octubre de 2026 solo se integren correcciones pequeñas que no
modifiquen la base de datos, porque lo que entra a la rama principal se aplica solo en el servidor de
la municipalidad, y que las demás se integren después de la entrega. Las correcciones programadas
para después de la entrega se presentan en la Tabla 312. Además, trece elementos de prioridad media o
baja se aceptaron sin corrección, entre ellos diferencias con la especificación que el equipo decidió
conservar.

Tabla 312.
Correcciones programadas para después de la entrega

| Lote | Contenido | Modifica la base de datos |
|------|-----------|---------------------------|
| 1 Fechas de reportes | Filtros de fecha de reportes y bitácora en hora local y validación del estado en la exportación | No |
| 2 Configuración de producción | Configuración segura del servidor, secretos propios y corrección de la guía de despliegue | No |
| 4 Usuarios y contraseñas | Validación de usuarios, contraseñas de 8 caracteres, cambio obligatorio de la contraseña inicial y registro del cierre de sesión | Sí |
| 5 Trazabilidad de la dispensación | Filtros de fecha del historial, auditoría de las fotografías y desactivación de beneficiarios | No |
| 6 Bajas y umbrales | Paginación, motivo obligatorio de la baja y pantalla de umbrales del semáforo | Sí |
| 7 Reportes para el Encargado | Acceso del Encargado de Beneficencia a los reportes, sin exportación | No |
| Operación | Uso de una cuenta de Encargado de Beneficencia para el despacho diario | No |
| Sin lote asignado | Mensajes de validación de la interfaz y nombre comercial vacío al editar (H-53 a H-55) | No |

Fuente: Elaboración propia.

## 8.6 Pruebas de seguridad

Las pruebas de seguridad se realizaron el 7 y el 8 de octubre de 2026 sobre el entorno de desarrollo
y comprendieron una auditoría ofensiva contra la API, una matriz de 62 pruebas, el mapa de la
superficie de ataque y una revisión según OWASP Top 10. De ellas derivaron correcciones como el
límite de intentos de inicio de sesión, las cabeceras de seguridad y la protección de las fotografías
de evidencia. Los riesgos residuales que declaran se contrastaron con el código y en su mayoría
coinciden. El informe y los documentos que lo respaldan se presentan en el Anexo B.

## 8.7 Evaluación frente a los requerimientos no funcionales

En la Tabla 313 se presenta el resultado de la verificación de los requerimientos no funcionales
principales del capítulo 4. Las verificaciones se hicieron en el equipo de desarrollo, por lo que no
sustituyen la comprobación en el servidor de la farmacia, cuya configuración determina el
cumplimiento real de los requerimientos de seguridad.

Tabla 313.
Verificación de los requerimientos no funcionales principales

| RNF | Resultado |
|-----|-----------|
| RNF-01 Contraseñas cifradas | Conforme en la revisión del código |
| RNF-02 Sesión obligatoria | Cumple: una petición sin sesión se rechaza |
| RNF-03 Acceso restringido por rol | Cumple en la interfaz y en peticiones directas |
| RNF-04 Límite de intentos de inicio de sesión | Cumple: pruebas automatizadas aprobadas |
| RNF-07 Enlace de captura no adivinable ni reutilizable | Cumple en lo probado; la vigencia y el uso único se revisaron en el código |
| RNF-11 Registro de las acciones | Conforme en la revisión del código |
| RNF-12 Validación de datos de entrada | Cumple parcialmente: quedan funciones sin validación completa |
| RNF-13 Sin doble descuento de stock | Cumple en las dos pruebas de dispensaciones simultáneas |
| RNF-14 Sin dispensación de lotes vencidos | Cumple: pruebas automatizadas aprobadas |
| RNF-16 Respaldo cada 12 horas | Verificado solo en el flujo automatizado |
| RNF-22 Interfaz y mensajes en español | Cumple, salvo los mensajes propios del navegador |
| RNF-23 Lector de códigos de barras | No verificado con un lector en la farmacia |
| RNF-28 Listados paginados | Cumple parcialmente: dos listados no usan la paginación común |
| RNF-33 Pruebas automatizadas del servidor | Cumple: 53 de 53 aprobadas |
| RNF-38 Instalación con Docker | Verificado solo en el flujo automatizado |
| RNF-43 Importación y exportación | Cumple: Excel de entrada; PDF y Excel de salida |

Fuente: Elaboración propia.
