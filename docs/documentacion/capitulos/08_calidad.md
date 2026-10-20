<!-- Numeración de tablas: este capítulo usa provisionalmente las Tablas 300 a 313; el script de
ensamblado las renumera para conservar la numeración corrida del documento. No incluye figuras
nuevas. Los resultados de la ejecución de las pruebas funcionales (sección 8.4) se completarán con
pruebas/registro_ejecucion.md. -->

# CAPÍTULO VIII

# 8 ASEGURAMIENTO DE LA CALIDAD

El aseguramiento de la calidad comprende las actividades con que se comprobó que FarmaG cumple los
requerimientos especificados en el capítulo 4 y con que se detectaron, registraron y corrigieron sus
defectos. Este capítulo describe la estrategia de calidad, el plan de pruebas funcionales, las
pruebas automatizadas y sus resultados, la estructura de los resultados de las pruebas funcionales,
la gestión de los defectos, las pruebas de seguridad y la evaluación del sistema frente a los
requerimientos no funcionales.

Salvo que se indique otra cosa, lo descrito corresponde al commit `bdf1187` de la rama
`docs/documentacion`, cuyo código de `backend/` y `frontend/` es idéntico al de la rama `main` en el
commit `d68ceb3`. Según la decisión del equipo del 20 de octubre de 2026 (R-24), la documentación se
congela el 21 de octubre de 2026 con el código de `main` en ese momento; las correcciones posteriores
se registran como trabajo posterior a la entrega.

## 8.1 Estrategia de aseguramiento de la calidad

### 8.1.1 Marco de referencia

El marco de calidad del proyecto es el modelo de calidad del producto de la norma ISO/IEC 25010,
descrito en el capítulo 2 (ISO, 2023). La característica de adecuación funcional se evalúa con las
pruebas funcionales derivadas de los casos de uso, y las demás características se evalúan mediante
los requerimientos no funcionales del capítulo 4, cada uno con un criterio verificable y un medio de
verificación. En la Tabla 300 se relaciona cada característica con los requerimientos que la
representan y con el medio de verificación principal.

Tabla 300.
Características de la norma ISO/IEC 25010 y medios de verificación en FarmaG

| Característica | Requerimientos | Medio de verificación principal |
|----------------|----------------|---------------------------------|
| Adecuación funcional | RF-01 a RF-58; casos de uso CU-01 a CU-19 | Pruebas funcionales de caja negra (sección 8.2) |
| Seguridad | RNF-01 a RNF-12 | Pruebas automatizadas, peticiones directas a la API, revisión de código y pruebas de penetración (sección 8.6) |
| Fiabilidad | RNF-13 a RNF-21 | Pruebas automatizadas de integración y trabajos del workflow "Despliegue seguro" |
| Usabilidad | RNF-22 a RNF-27 | Recorrido de las pantallas en las pruebas funcionales |
| Eficiencia de desempeño | RNF-28 a RNF-32 | Pruebas automatizadas; la prueba de carga no se ha definido |
| Mantenibilidad | RNF-33 a RNF-37 | Pruebas automatizadas, compilación en el workflow y revisión de código |
| Portabilidad | RNF-38 a RNF-41 | Trabajos `instalacion` y `esquema` del workflow e inspección de la configuración |
| Compatibilidad | RNF-42 a RNF-45 | Inspección de la API y de la configuración; prueba de exportación e importación |

Fuente: Elaboración propia con base en el capítulo 4, secciones 4.2 y 4.3.

### 8.1.2 Niveles de prueba

La calidad se verificó en cinco niveles, que se resumen en la Tabla 301 junto con quién realizó cada
uno. Las pruebas unitarias y de integración se automatizaron en el backend con el ejecutor de pruebas
integrado de Node.js; se entiende por unitaria la prueba que no necesita base de datos y por
integración la que se conecta a PostgreSQL, directamente o mediante un servidor Express temporal. El
frontend no cuenta con pruebas automatizadas, por lo que su comportamiento se verifica con las
pruebas funcionales.

Tabla 301.
Niveles de prueba aplicados y responsables

| Nivel | Alcance | Responsable | Fecha | Fuente |
|-------|---------|-------------|-------|--------|
| Pruebas unitarias | 6 archivos, 42 casos: vencimiento y semáforo, límites de inicio de sesión, validación de fechas y de paginación, arranque sin secretos | Jorge Vargas (5 archivos) y Daniel Reyes (`env.test.ts`) | 2026-10-07 y 2026-10-12 | `backend/tests/` (historial de Git) |
| Pruebas de integración | 4 archivos, 11 casos: despacho sin lotes vencidos, marcado de vencidos al arrancar, rutas de inventario y catálogos, seed | Jorge Vargas (`despacho_vencimiento.test.ts`) y Daniel Reyes (3 archivos) | 2026-10-07 y 2026-10-16 | `backend/tests/` (historial de Git) |
| Integración continua | Workflow "Despliegue seguro": esquema, compilación, despliegue sin pérdida de datos e instalación desde cero | Daniel Reyes | Desde 2026-10-11 | `.github/workflows/despliegue-seguro.yml` |
| Pruebas funcionales de caja negra | 92 casos derivados de los 19 casos de uso | Plan y casos: Audias Guevara. Ejecución: [COMPLETAR: integrante o integrantes que ejecutan los casos] | [COMPLETAR: fechas de ejecución de las pruebas funcionales] | `pruebas/plan_pruebas.md`, `pruebas/casos_prueba.md` |
| Revisión de código | Análisis del código contra la especificación y verificación de cada corrección; revisión de calidad y auditoría técnica del equipo | Análisis para la documentación: Audias Guevara (2026-09-25 y 2026-10-20). Informes `CODE_REVIEW.md` y `AUDITORIA_COMPLETA.md`: incorporados al repositorio por Jorge Vargas | 2026-09-25 a 2026-10-20 | `analisis/hallazgos_defectos.md`, `analisis/09_seguimiento_correcciones.md`, `docs/seguridad/` |
| Pruebas de penetración | Auditoría ofensiva contra la API local y matriz de 62 pruebas de seguridad | Incorporadas al repositorio por Jorge Vargas; la autoría del informe se indica en el Anexo B | 2026-10-07 y 2026-10-08 | `docs/seguridad/`, Anexo B |

Fuente: Elaboración propia con base en el historial de Git del repositorio y en
`analisis/10_material_calidad.md`.

Además de estos niveles, durante la construcción se hicieron verificaciones manuales al integrar cada
módulo, entre ellas la prueba de concurrencia del despacho del 19 de julio de 2026 citada en el
capítulo 4 (RNF-13). Esas verificaciones se registraron en el historial del proyecto, pero no
siguieron un plan de pruebas formal.

## 8.2 Plan de pruebas funcionales

### 8.2.1 Objetivo y alcance

El plan de pruebas funcionales tiene como objetivo verificar que el comportamiento de FarmaG en el
commit `bdf1187` cumple los requerimientos funcionales y los casos de uso del capítulo 4, con énfasis
en las reglas de negocio que protegen la integridad del inventario y la trazabilidad de las entregas:
el criterio de vencimiento y el orden FIFO, la verificación del stock, el control de acceso por rol,
el límite de intentos de inicio de sesión, los filtros de fechas de los reportes y la evidencia
fotográfica mediante código QR.

El alcance comprende los 19 casos de uso, con al menos un caso positivo y uno negativo por cada uno;
los requerimientos funcionales que tienen interfaz o API; las reglas de negocio críticas de
vencimiento, stock y concurrencia, inicio de sesión, permisos, fechas y evidencia; y los
requerimientos no funcionales que se observan desde la interfaz o la API como parte de un caso de uso.
El requerimiento RF-31 (umbrales del semáforo) se prueba por la API, porque no tiene pantalla (H-22).

Quedan fuera del plan las pruebas de seguridad, que cubre el informe de pruebas de penetración
(sección 8.6); el despliegue, los respaldos y la instalación, que verifican los trabajos del workflow
"Despliegue seguro"; las pruebas de rendimiento y carga, que no se han definido; y las funciones
fuera de la fase 1 de la especificación. Tampoco se incluyeron casos para tres comportamientos que,
al redactar el plan, estaban pendientes de decisión: la desactivación de beneficiarios (H-29), el
motivo obligatorio de la baja de lotes (H-27) y el acceso del Encargado de Beneficencia a la pantalla
de reportes (H-20). El equipo los decidió el 20 de octubre de 2026 (R-13, R-15 y R-19), pero su
corrección está programada para después de la entrega, por lo que sus casos se agregarán cuando se
implemente.

### 8.2.2 Enfoque

Cada caso de prueba se deriva de un caso de uso: el flujo normal da los casos positivos y los flujos
alternativos, los negativos. Se aplican cuatro técnicas de caja negra:

1. Partición de equivalencia: datos válidos e inválidos por campo, como un DPI de 13 dígitos frente a
   uno de 12, o una cantidad entera frente a una decimal.
2. Valores límite: fecha de vencimiento del día y del día siguiente; 30, 31, 90 y 91 días para el
   semáforo; tercer intento fallido de inicio de sesión; 5000 y 5001 registros en una exportación.
3. Pruebas por rol: cada operación exclusiva del Administrador se intenta también con el Encargado de
   Beneficencia, desde la interfaz y con una petición directa a la API.
4. Transición de estados: un lote pasa de `DISPONIBLE` a `AGOTADO`, `VENCIDO` o `DADO_DE_BAJA`, y un
   enlace de captura pasa de vigente a usado o vencido.

Los pasos se ejecutan desde la interfaz web. Cuando el resultado solo se observa en la API, o el caso
exige una petición que la interfaz no permite, el paso indica la petición con `curl` y el token de una
sesión. Catorce casos describen el comportamiento correcto según la corrección planificada de un
hallazgo abierto; se espera que fallen en el commit `bdf1187` y que pasen cuando se corrija el
hallazgo, por lo que su resultado fallido no se cuenta como defecto nuevo.

### 8.2.3 Entorno de pruebas

Las pruebas se ejecutan en el equipo de desarrollo, nunca sobre la base de datos de la municipalidad.
La Tabla 302 resume el entorno.

Tabla 302.
Entorno de las pruebas funcionales

| Elemento | Valor |
|----------|-------|
| Equipo | Windows 11 con Docker Desktop. [COMPLETAR: procesador y memoria del equipo de pruebas] |
| Código | Commit `bdf1187`; para verificar una corrección, el commit que la contiene |
| Servicios | `farmag_db` (PostgreSQL 16), `farmag_api` (Node.js 20, zona horaria `America/Guatemala`) y `farmag_web` (Vite, modo de desarrollo) |
| Acceso | Interfaz en `http://localhost:5173`; API en `http://localhost:3000/api`; captura desde el teléfono por la dirección IP del equipo |
| Navegador | [COMPLETAR: navegador y versión de la computadora, y modelo de teléfono y navegador para la captura] |
| Herramientas | `curl`, `psql` o Prisma Studio para preparar y consultar datos, y un lector de códigos de barras USB si está disponible |
| Base de datos | Base de desarrollo recreada antes del ciclo, con los datos de prueba de `pruebas/datos_prueba.md` |

Fuente: Elaboración propia con base en `pruebas/plan_pruebas.md`, sección 4.

Los datos de prueba usan fechas relativas al día de ejecución, por lo que los casos de vencimiento se
ejecutan el mismo día en que se cargan los datos. Los contadores del límite de inicio de sesión se
guardan en memoria y se reinician con el reinicio de la API; por eso los casos de bloqueo se ejecutan
al final de su sesión.

### 8.2.4 Criterios de entrada y de salida

El ciclo de pruebas inicia cuando se cumplen cinco criterios de entrada:

1. El entorno está levantado y `GET /api/health` responde.
2. `npm test` en el contenedor `api` aprueba las 53 pruebas automatizadas.
3. Los datos de prueba están cargados y comprobados.
4. Existen las cuentas de prueba de ambos roles.
5. Los casos de prueba están revisados por el responsable de la documentación.

El ciclo se da por concluido cuando se cumplen seis criterios de salida:

1. Se ejecutó el 100 % de los casos de prioridad Alta y al menos el 90 % de los de prioridad Media.
2. No queda abierto ningún defecto de severidad Crítica ni Alta que no corresponda a un hallazgo ya
   registrado con su corrección planificada.
3. Todo caso fallido tiene un defecto asociado, existente o nuevo.
4. Los casos bloqueados tienen su causa anotada.
5. `npm test` aprueba las 53 pruebas al terminar el ciclo.
6. El registro de ejecución está completo y firmado por el ejecutor y el responsable.

### 8.2.5 Severidad de los defectos

Los defectos que se detecten en la ejecución se clasifican según la Tabla 303, cuyos criterios
coinciden con los de prioridad del plan de correcciones (sección 8.5).

Tabla 303.
Criterios de severidad de los defectos

| Severidad | Criterio | Ejemplo |
|-----------|----------|---------|
| Crítica | Pérdida o corrupción de datos de inventario o de dispensaciones, descuento incorrecto de stock, acceso a funciones o datos sin permiso, o sistema inutilizable | Se dispensa un lote vencido; el Encargado de Beneficencia da de baja un lote |
| Alta | Una función principal produce un resultado incorrecto visible para el usuario, sin alternativa razonable | Un reporte incluye registros fuera del rango de fechas (H-46) |
| Media | Defecto funcional con alternativa, o error de trazabilidad | Error 500 en lugar de un mensaje de validación; auditoría sin dirección IP (H-35) |
| Baja | Mensaje inexacto, defecto cosmético o que solo ocurre con una petición directa a la API | Mensaje "otro medicamento" para el mismo medicamento (H-31) |

Fuente: Elaboración propia con base en `pruebas/plan_pruebas.md`, sección 7.

### 8.2.6 Casos de prueba

Se especificaron 92 casos de prueba, CP-01 a CP-92. Cada caso indica el caso de uso, los
requerimientos y reglas que verifica, la prioridad, las precondiciones, los datos, los pasos y el
resultado esperado con los mensajes exactos del sistema. La prioridad de un caso sigue la del
requerimiento que verifica y sube a Alta cuando el caso verifica una regla crítica. En la Tabla 304 se
presenta la distribución de los casos por caso de uso y prioridad, y los casos que se espera que
fallen por un hallazgo abierto.

Tabla 304.
Casos de prueba por caso de uso y prioridad

| Caso de uso | Casos | Alta | Media | Baja | Esperados fallidos |
|-------------|------:|-----:|------:|-----:|--------------------|
| CU-01 Iniciar y cerrar sesión | 8 | 4 | 2 | 2 | CP-07 (H-47), CP-08 (H-10) |
| CU-02 Gestionar usuarios | 8 | 4 | 4 | 0 | CP-16 (H-15) |
| CU-03 Gestionar medicamentos | 7 | 2 | 3 | 2 | — |
| CU-04 Gestionar códigos de barras | 3 | 1 | 1 | 1 | CP-26 (H-31) |
| CU-05 Gestionar categorías | 3 | 0 | 2 | 1 | CP-29 (H-42) |
| CU-06 Gestionar ubicaciones | 3 | 0 | 2 | 1 | CP-32 (H-42) |
| CU-07 Registrar entrada de medicamentos | 6 | 2 | 4 | 0 | — |
| CU-08 Importar inventario desde Excel | 5 | 2 | 2 | 1 | CP-43 (H-48) |
| CU-09 Consultar inventario | 6 | 3 | 1 | 2 | CP-49 (H-43) |
| CU-10 Dar de baja lote | 2 | 1 | 1 | 0 | — |
| CU-11 Actualizar lotes vencidos | 2 | 2 | 0 | 0 | — |
| CU-12 Consultar panel de alertas | 2 | 0 | 1 | 1 | — |
| CU-13 Gestionar beneficiarios | 4 | 3 | 1 | 0 | — |
| CU-14 Consultar historial de beneficiario | 3 | 1 | 2 | 0 | — |
| CU-15 Dispensar medicamentos | 9 | 5 | 4 | 0 | CP-71 (H-45) |
| CU-16 Registrar evidencia fotográfica | 8 | 2 | 5 | 1 | CP-78 (H-38), CP-79 (H-35) |
| CU-17 Consultar reportes | 5 | 3 | 2 | 0 | CP-82 (H-46) |
| CU-18 Exportar reportes | 4 | 1 | 1 | 2 | CP-88 (H-44) |
| CU-19 Consultar bitácora de auditoría | 4 | 2 | 2 | 0 | CP-91 (H-46) |
| **Total** | **92** | **38** | **40** | **14** | **14** |

Fuente: Elaboración propia con base en `pruebas/casos_prueba.md`.

La especificación completa de los casos, los datos de prueba y el formato del registro de ejecución
se conservan en la carpeta `docs/documentacion/pruebas/` del repositorio. [COMPLETAR: cronograma de
preparación, ejecución, corrección y reejecución de las pruebas funcionales].

## 8.3 Pruebas automatizadas

### 8.3.1 Cobertura

El backend cuenta con 10 archivos de prueba y 53 casos, que se ejecutan con
`node --import tsx --test --test-concurrency=1 tests/*.test.ts` (script `npm test`). Usan el ejecutor
de pruebas y el módulo de aserciones integrados de Node.js, sin dependencias adicionales. Las pruebas
de integración crean sus propios datos con prefijos de prueba y los eliminan al terminar; la prueba
del seed crea y elimina una base de datos propia. En la Tabla 305 se describe qué cubre cada archivo y
el resultado de la ejecución del 20 de octubre de 2026.

Tabla 305.
Pruebas automatizadas del backend y resultados

| Archivo | Tipo | Qué cubre | Casos | Aprobados | Hallazgo que cubre |
|---------|------|-----------|------:|----------:|--------------------|
| `despacho_vencimiento.test.ts` | Integración | El despacho nunca toma un lote con fecha de vencimiento del día o anterior, y el stock consultado lo excluye | 1 | 1 | H-01 |
| `env.test.ts` | Unitaria | Arranque sin `JWT_SECRET`, con secretos de ejemplo en producción y con `STRICT_SECRETS=true` | 5 | 5 | H-03 |
| `fecha.test.ts` | Unitaria | Fechas inválidas, de otro tipo o con rango invertido en los filtros responden 400 | 9 | 9 | `H-004` de los informes de seguridad |
| `inventario.service.test.ts` | Unitaria | Días para vencer, lote vencido, semáforo, stock dispensable y validación de la fecha de vencimiento de una entrada | 9 | 9 | H-01, H-34 |
| `ipRateLimit.test.ts` | Unitaria | Límite de 20 solicitudes de inicio de sesión por IP en 10 minutos | 5 | 5 | H-09 |
| `loginRateLimit.test.ts` | Unitaria | Bloqueo de 5 minutos tras 3 fallos por usuario e IP | 6 | 6 | H-09 |
| `rutas_integracion.test.ts` | Integración | Importación sin duplicar lotes, stock del lector sin vencidos, listados con stock, tipos incorrectos, cantidad no entera, formato del token de captura | 8 | 8 | H-01, H-15 (parcial) |
| `seed.test.ts` | Integración | El seed no revive catálogos modificados y solo crea medicamentos de demostración si se pide | 1 | 1 | `H-002` de los informes de seguridad |
| `validacion.test.ts` | Unitaria | Paginación, parámetros de consulta y límite de 5000 registros por exportación | 8 | 8 | H-15 (parcial) |
| `vencimiento_arranque.test.ts` | Integración | Al arrancar la API, los lotes con fecha de ayer y de hoy pasan a `VENCIDO` y el de mañana no | 1 | 1 | H-01, D-11 |
| **Total** | | | **53** | **53** | |

Fuente: Elaboración propia con base en `analisis/10_material_calidad.md` (Tabla 4) y
`analisis/11_resultados_pruebas_automatizadas.md` (Tabla 8).

La cobertura tiene límites que conviene precisar. De los 29 hallazgos resueltos total o parcialmente,
cinco tienen una prueba que ejerce la corrección (H-01, H-03, H-09, H-15 y H-34), y H-02 y H-05 se
ejercen de forma indirecta en el workflow; las demás correcciones se comprobaron por lectura del
código. Ninguna corrección del frontend tiene prueba automatizada, y no se midió la cobertura de
código con una herramienta.

### 8.3.2 Integración continua

El workflow "Despliegue seguro" de GitHub Actions se ejecuta en cada *pull request* hacia `main`, en
cada envío a cualquier rama y de forma manual; una ejecución nueva sobre la misma rama cancela la
anterior. Sus cuatro trabajos se describen en la Tabla 306.

Tabla 306.
Trabajos del workflow "Despliegue seguro"

| Trabajo | Qué comprueba |
|---------|---------------|
| `esquema` | Que `schema.prisma` no tenga cambios sin migración; aplica las migraciones y el seed sobre una base nueva y ejecuta las 4 pruebas de integración dos veces, con `TZ=America/Guatemala` y con `TZ=UTC`; avisa si una migración nueva borra o cambia datos |
| `compilacion` | Chequeo de tipos del backend, las 6 pruebas unitarias y la construcción del frontend (`tsc -b` y `vite build`) |
| `despliegue` | Con tres configuraciones del archivo `.env`, levanta la versión anterior con 200 beneficiarios de prueba, despliega la nueva como lo hace el servidor y comprueba que la huella de los datos no cambia, que el arranque no registra errores y que los respaldos previo y periódico se pueden restaurar |
| `instalacion` | Instalación desde cero con la contraseña inicial fijada: inicio de sesión con ella y rechazo de la contraseña antigua |

Fuente: Elaboración propia con base en `.github/workflows/despliegue-seguro.yml` y
`analisis/10_material_calidad.md`, Tabla 5.

Para que el workflow impida integrar un cambio con errores, la protección de la rama `main` debe estar
activada en GitHub. [COMPLETAR: confirmar si la protección de `main` está activada en GitHub].
[COMPLETAR: enlace o captura de una ejecución exitosa del workflow sobre `main`].

### 8.3.3 Resultados

Las pruebas se ejecutaron el 20 de octubre de 2026, de 02:51:56 a 02:52:06 (hora de Guatemala), sobre
el código del commit `bdf1187`, con el comando `docker compose exec -T api sh -c 'cd /app && npm test'`.
El entorno fue el contenedor `farmag_api` con Node.js v20.20.2 y `TZ=America/Guatemala`, y el
contenedor `farmag_db` con PostgreSQL 16.14, sobre una base de desarrollo recién creada, sin
medicamentos, lotes ni dispensaciones. Se aprobaron los 53 casos, sin fallos, cancelaciones ni
omisiones, en 9,46 segundos, con código de salida 0 (véase la Tabla 305).

El mismo día, de 02:58:19 a 02:58:26, se repitieron las cuatro pruebas de integración con `TZ=UTC`
en el proceso de Node.js, como lo hace el trabajo `esquema` del workflow. Se aprobaron los 11 casos,
sin fallos, con código de salida 0. A diferencia del workflow, cuya base de datos usa la zona
`America/Guatemala`, la base de desarrollo estaba en UTC, de modo que Node.js y PostgreSQL
compartían esa zona. Después de ambas ejecuciones la base quedó sin datos de prueba residuales.

El informe `CIERRE_SEGURIDAD.md` del 8 de octubre de 2026 declara 37 pruebas aprobadas; esa cifra
corresponde al estado anterior a la incorporación de cuatro archivos de prueba en los *pull requests*
3 a 8 y no al código actual.

## 8.4 Resultados de las pruebas funcionales

Los resultados de la ejecución de los casos de prueba se registran en
`pruebas/registro_ejecucion.md` con el estado de cada caso (aprobado, fallido o bloqueado), el
resultado obtenido, el defecto asociado y la evidencia. [COMPLETAR: número de ciclo, commit probado,
fechas de ejecución y ejecutor].

En la Tabla 307 se resumen los resultados por caso de uso.

Tabla 307.
Resultados de las pruebas funcionales por caso de uso

| Caso de uso | Casos | Resultado (aprobados / fallidos / bloqueados / no ejecutados) |
|-------------|------:|----------------------------------------------------------------|
| CU-01 Iniciar y cerrar sesión | 8 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-02 Gestionar usuarios | 8 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-03 Gestionar medicamentos | 7 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-04 Gestionar códigos de barras | 3 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-05 Gestionar categorías | 3 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-06 Gestionar ubicaciones | 3 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-07 Registrar entrada de medicamentos | 6 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-08 Importar inventario desde Excel | 5 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-09 Consultar inventario | 6 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-10 Dar de baja lote | 2 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-11 Actualizar lotes vencidos | 2 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-12 Consultar panel de alertas | 2 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-13 Gestionar beneficiarios | 4 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-14 Consultar historial de beneficiario | 3 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-15 Dispensar medicamentos | 9 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-16 Registrar evidencia fotográfica | 8 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-17 Consultar reportes | 5 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-18 Exportar reportes | 4 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CU-19 Consultar bitácora de auditoría | 4 | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| **Total** | **92** | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |

Fuente: Elaboración propia con base en `pruebas/registro_ejecucion.md`.

En la Tabla 308 se presentan los casos fallidos con su defecto. Las primeras catorce filas
corresponden a los casos que se espera que fallen por un hallazgo ya registrado; los defectos nuevos
que aparezcan en la ejecución se agregan al final con el siguiente número de hallazgo libre.

Tabla 308.
Defectos asociados a los casos de prueba fallidos

| Caso | Defecto | Severidad | Resultado observado |
|------|---------|-----------|---------------------|
| CP-07 | H-47: el inicio de sesión no muestra los intentos restantes | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-08 | H-10: el cierre de sesión no registra `LOGOUT` | Media | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-16 | H-15: un correo duplicado responde 500 | Media | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-26 | H-31: mensaje "otro medicamento" para el mismo medicamento | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-29 | H-42: una categoría con espacios responde 500 | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-32 | H-42: una ubicación con espacios responde 500 | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-43 | H-48: la importación rechaza un medicamento activo por su categoría inactiva | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-49 | H-43: una paginación no numérica responde 500 o `null` | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-71 | H-45: filtros de fecha del historial de dispensaciones | Media | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-78 | H-38: `generar-token` audita `CREAR` al reutilizar el token | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-79 | H-35: la subida de fotos se audita sin IP y sin registrar el reemplazo | Media | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-82 | H-46: el filtro `desde` de los reportes incluye 6 horas del día anterior | Alta | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-88 | H-44: la exportación de inventario no valida `estado` | Baja | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| CP-91 | H-46: el filtro `desde` de la bitácora incluye 6 horas del día anterior | Alta | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| [COMPLETAR: resultados de la ejecución de pruebas funcionales] | | | |

Fuente: Elaboración propia con base en `pruebas/casos_prueba.md` y `pruebas/registro_ejecucion.md`.

[COMPLETAR: resultados de la ejecución de pruebas funcionales; evaluación de los criterios de salida
de la sección 8.2.4].

## 8.5 Gestión de defectos

### 8.5.1 Ciclo de gestión

La gestión de defectos del proyecto siguió un ciclo de cinco etapas, cuyo desarrollo cronológico se
resume en el capítulo 6 (sección 6.6.2):

1. Detección. Los defectos se detectaron principalmente por análisis del código: la extracción de
   hechos para la documentación comparó el código con la especificación técnica y, en algunos casos,
   lo verificó en ejecución sobre los contenedores de desarrollo (25 de septiembre y 20 de octubre de
   2026). La auditoría de seguridad del equipo (7 y 8 de octubre de 2026) aportó sus propios
   hallazgos, con una numeración distinta (`H-001`, `H-002`…).
2. Registro. Cada defecto se registra con un identificador `H-XX`, su tipo, su descripción, su
   impacto y la fuente en el código (`analisis/hallazgos_defectos.md`). Las diferencias con la
   especificación se registran aparte como discrepancias `D-XX`. Al 20 de octubre de 2026 hay 51
   hallazgos (H-01 a H-51) y 35 discrepancias (D-01 a D-35).
3. Priorización. Cada hallazgo o discrepancia abierto recibe una prioridad (crítica, alta, media o
   baja, con los criterios de la Tabla 303), un responsable según el módulo, un esfuerzo estimado, la
   prueba que verificaría la corrección y un lote de corrección (`analisis/12_plan_correcciones.md`).
   Las preguntas que bloqueaban una corrección se resolvieron con las decisiones del equipo R-10 a
   R-24.
4. Corrección. Las correcciones se integran a `main` mediante *pull request*, uno por lote, con los
   trabajos del workflow aprobados. La mayor parte de las correcciones de octubre entró en el commit
   `254d0f8` (Jorge Vargas, 7 de octubre de 2026), integrado en el *pull request* 3; el despliegue
   seguro, en el *pull request* 2, y las demás, en los *pull requests* 4 a 8.
5. Verificación. Cada hallazgo se contrasta con el código del commit corregido
   (`analisis/09_seguimiento_correcciones.md`) y se marca como resuelto solo si el código o la
   configuración lo muestran. Los mensajes de los commits y los informes de seguridad se usaron
   únicamente para saber dónde buscar.

### 8.5.2 Estado de los hallazgos

La Tabla 309 presenta el estado de los 51 hallazgos en el commit `bdf1187`. Los hallazgos H-01 a H-34
se verificaron uno por uno contra el código corregido; los hallazgos H-35 a H-51 se detectaron en esa
misma verificación o después, y ninguno se ha corregido.

Tabla 309.
Estado de los hallazgos en el commit `bdf1187`

| Estado | H-01 a H-34 | H-35 a H-51 | Total |
|--------|------------:|------------:|------:|
| Resuelto | 19 | 0 | 19 |
| Resuelto parcialmente | 10 | 0 | 10 |
| Pendiente | 4 | 17 | 21 |
| No verificable en el código | 1 | 0 | 1 |
| **Total** | **34** | **17** | **51** |

Fuente: Elaboración propia con base en `analisis/09_seguimiento_correcciones.md`, Tabla 3, y
`analisis/hallazgos_defectos.md`.

Entre los hallazgos resueltos están los que afectaban de forma más directa la integridad del
inventario y la protección de los datos: el despacho podía tomar un lote con fecha de vencimiento del
día (H-01), el proceso diario de vencimiento corría seis horas antes por la zona horaria del
contenedor (H-02), cada arranque del backend podía borrar datos al aplicar el esquema sin migraciones
(H-05), las fotografías de las recetas se servían sin autenticación (H-11), el inicio de sesión no
tenía límite de intentos (H-09) y la base de datos y la API se publicaban en toda la red local (H-04).
El hallazgo no verificable en el código (H-23) es una práctica de operación: el despacho diario se
hace con una cuenta de Administrador.

La Tabla 310 distribuye por prioridad y por momento de corrección los 47 elementos abiertos del plan
de correcciones, que incluyen los hallazgos no resueltos y las discrepancias que requieren una acción
o una decisión. La columna "Antes del 24/10" corresponde a los lotes pequeños sin migración que pueden
integrarse antes de la entrega; "Bloqueado", a lo que no puede hacerse sin acceso al servidor de la
municipalidad; y "Aceptado", a lo que no se corregirá.

Tabla 310.
Hallazgos y discrepancias abiertos por prioridad y momento de corrección

| Prioridad | Antes del 24/10 | Después del 24/10 | Bloqueado | Aceptado | Total |
|-----------|----------------:|------------------:|----------:|---------:|------:|
| Crítica | 0 | 1 | 1 | 0 | 2 |
| Alta | 1 | 3 | 0 | 0 | 4 |
| Media | 1 | 16 | 0 | 1 | 18 |
| Baja | 3 | 8 | 0 | 12 | 23 |
| **Total** | **5** | **28** | **1** | **13** | **47** |

Fuente: Elaboración propia con base en `analisis/12_plan_correcciones.md`, Tabla 2. H-15 se cuenta dos
veces porque su corrección se dividió en dos lotes.

### 8.5.3 Hallazgos críticos y altos

Los seis hallazgos abiertos de prioridad crítica o alta se presentan en la Tabla 311. Cuatro de ellos
(H-36, H-03, H-07 y H-17) se relacionan con la configuración con que se ejecuta el sistema en el
servidor y no con la lógica de negocio: la actualización automática del servidor usa el archivo
`docker-compose.yml`, cuyo modo por defecto es el de desarrollo, y nadie del equipo tiene acceso al
servidor para cambiar su configuración (R-10). H-39 se refiere a la credencial inicial del
administrador, y H-46 afecta a los datos que el usuario ve en los reportes y en la bitácora.

Tabla 311.
Hallazgos abiertos de prioridad crítica y alta

| ID | Hallazgo | Prioridad | Estado en `bdf1187` | Corrección | Momento |
|----|----------|-----------|---------------------|------------|---------|
| H-36 | La actualización automática del servidor usa `docker-compose.yml` en modo de desarrollo, con secretos por defecto | Crítica | Pendiente | Llevar la configuración de producción a `docker-compose.yml` y probarla en el workflow (R-10) | Después del 24/10 (lote 2) |
| H-03 | `docker-compose.yml` conserva valores por defecto de la contraseña de la base y de la clave de firma de los tokens, y el backend arranca con ellos | Crítica | Resuelto parcialmente | Definir secretos propios en el servidor; no es posible sin acceso a él (R-10) | Bloqueado |
| H-46 | En reportes y bitácora, el filtro `desde` se interpreta como medianoche UTC e incluye de 18:00 a 23:59 del día anterior | Alta | Pendiente | Interpretar las fechas simples como medianoche local y agregar el fin de día para `hasta` | Antes del 24/10 (lote 1) |
| H-07 | Con `NODE_ENV=development` por defecto, los errores 500 incluyen el mensaje interno y `/api/health` revela el entorno | Alta | Resuelto parcialmente | `NODE_ENV=production` en `docker-compose.yml` y quitar el entorno de `/api/health` | Después del 24/10 (lote 2) |
| H-17 | En modo de desarrollo, CORS acepta cualquier origen y las cabeceras de seguridad de la interfaz solo existen con nginx | Alta | Resuelto parcialmente | Se resuelve con la configuración de producción de H-36 | Después del 24/10 (lote 2) |
| H-39 | La contraseña aleatoria del administrador inicial queda legible en el registro del contenedor y nada obliga a cambiarla | Alta | Pendiente | Cambio obligatorio en el primer inicio de sesión solo para el administrador del seed (R-11) | Después del 24/10 (lote 4) |

Fuente: Elaboración propia con base en `analisis/12_plan_correcciones.md`, Tabla 1, y
`analisis/09_seguimiento_correcciones.md`.

El riesgo de H-36, H-03, H-07 y H-17 depende de las variables que tenga definidas el archivo `.env`
del servidor, que no consta en el repositorio; si ese archivo fija valores de producción y secretos
propios, el riesgo se reduce. [COMPLETAR: variables de entorno definidas en el servidor de la
farmacia, sin anotar los valores de los secretos].

### 8.5.4 Defectos conocidos que quedan para después de la entrega

El equipo acordó, el 20 de octubre de 2026, que hasta el 24 de octubre solo se integren a `main` los
lotes pequeños sin migración (lotes 1 y 3), con los trabajos del workflow aprobados y fuera del
horario de atención de la farmacia, y que los lotes 4 a 7 se integren después de la entrega (R-23).
La regla se relaciona con el mecanismo de actualización: lo que entra a `main` lo aplica el
servidor de la municipalidad de forma automática en un máximo de 30 minutos, tras sacar un respaldo
(`docs/DESPLIEGUE.md`), y nadie del equipo tiene acceso a ese servidor (R-10). Además, como la documentación se
congela el 21 de octubre (R-24), los lotes 1 y 3 que se integren después de esa fecha también se
registran como trabajo posterior. En la Tabla 312 se presentan los elementos cuya corrección queda
para después de la entrega.

Tabla 312.
Correcciones programadas para después de la entrega

| Lote | Elementos | Contenido | Requiere migración |
|------|-----------|-----------|--------------------|
| 2 Configuración de Compose | H-36, H-07, H-17, H-40, H-50, H-51/D-34, D-30, D-31, D-32, D-33, D-35 | Configuración de producción en `docker-compose.yml`, variables que no llegan al contenedor y corrección de la documentación de despliegue | No |
| 4 Usuarios y contraseñas | H-15 (usuarios), H-16, H-39, H-41, H-10, H-47 | Validación de usuarios, política de contraseñas de 8 caracteres (R-12), cambio obligatorio de la contraseña inicial (R-11), registro del cierre de sesión e intentos restantes en el inicio de sesión | Sí |
| 5 Trazabilidad de la dispensación | H-45, H-35, H-38, H-29 | Filtros de fecha del historial, auditoría de las fotografías y de los enlaces de captura, desactivación de beneficiarios (R-13, R-14) | No |
| 6 Bajas y umbrales | H-43, H-27/D-27, H-22/D-24, D-18, H-48 | Paginación, motivo obligatorio de la baja guardado en el lote (R-15), pantalla de umbrales del semáforo, auditoría de códigos en la importación | Sí |
| 7 Reportes para el Encargado | H-20/D-17 | Acceso del Encargado de Beneficencia a la pantalla de reportes, sin exportación (R-19) | No |
| Operación | H-23 | Cuenta de Encargado de Beneficencia para el despacho diario, después del lote 7 | No |

Fuente: Elaboración propia con base en `analisis/12_plan_correcciones.md`, Tablas 1 y 4.

Los lotes 2, 5 y 7 no requieren migración, pero también quedan para después de la entrega: el lote
2 por la decisión R-10, que fija su realización después del 24 de octubre, y los lotes 5 y 7 porque
R-23 los incluye entre los que se integran después de la entrega. El lote 5 depende además de las
funciones de fecha que introduce el lote 1.

Por otra parte, H-03 queda bloqueado, porque requiere cambiar los secretos en el servidor, y trece
elementos de prioridad media o baja se aceptan sin corrección, con su justificación en el plan de
correcciones. Entre ellos están las diferencias con la especificación que el equipo decidió conservar:
la búsqueda de beneficiarios por el inicio del DPI (D-19, R-20), el color rojo para un lote a 30
días exactos de vencer (D-20, R-21), la exportación del historial de beneficiario fuera de esta
entrega (D-22, R-22) y la consulta de todas las dispensaciones por el Encargado (D-16, R-19). También
se aceptan riesgos menores de seguridad, como el almacenamiento del token de sesión en el navegador
(H-19), cuya mitigación exigiría rediseñar la autenticación.

## 8.6 Pruebas de seguridad

Las pruebas de seguridad se realizaron el 7 y el 8 de octubre de 2026 sobre el entorno de desarrollo,
antes de las correcciones integradas en los *pull requests* 4 a 9. Comprendieron una auditoría
ofensiva contra la API local, una matriz de 62 pruebas de seguridad con el resultado HTTP observado,
el mapa de la superficie de ataque y una revisión según las categorías de OWASP Top 10. Las
correcciones derivadas se integraron principalmente en el *pull request* 3 e incluyen el límite de
intentos de inicio de sesión, las cabeceras de seguridad, la consulta de la cuenta en cada petición y
la protección de las fotografías de evidencia.

Los riesgos residuales que el informe declara se contrastaron con el código del commit `bdf1187`: la
mayoría coincide, uno ya no corresponde al código actual (el arranque con secretos de ejemplo en
producción solo advierte, salvo `STRICT_SECRETS=true`) y la verificación agregó riesgos que el
informe no declara (H-35 a H-38). El informe completo, los documentos que lo respaldan y su autoría se
presentan en el Anexo B.

## 8.7 Evaluación frente a los requerimientos no funcionales

La Tabla 313 presenta los requerimientos no funcionales cuya verificación consta con evidencia
ejecutada: una prueba automatizada aprobada, una petición o comando registrado con su fecha, o una
prueba manual documentada. Los demás se agrupan al final según el medio de verificación pendiente.

Tabla 313.
Verificación de los requerimientos no funcionales

| RNF | Cómo se verificó | Resultado |
|-----|------------------|-----------|
| RNF-02 Sesión obligatoria | Petición sin token a la ruta de fotografías de evidencia, 20 de octubre de 2026 | Cumple: respuesta 401 |
| RNF-04 Resistencia a la prueba masiva de contraseñas | `ipRateLimit.test.ts` (5 casos) y `loginRateLimit.test.ts` (6 casos), 20 de octubre de 2026 | Cumple: 11 de 11 aprobadas |
| RNF-06 Fotografías solo con sesión | Peticiones del 20 de octubre de 2026 a la ruta estática anterior y al endpoint autenticado sin token | Cumple: 404 y 401 |
| RNF-07 Enlace de captura no adivinable ni reutilizable | Caso de formato del token en `rutas_integracion.test.ts`; petición con un token falso, 20 de octubre de 2026 | Cumple en lo probado (formato y rechazo con 404); la vigencia y el uso único se comprobaron solo por inspección |
| RNF-08 Cabeceras de seguridad | `curl -D -` sobre `/api/health`, 20 de octubre de 2026 | Cumple en la API: cabeceras de `helmet` y sin `X-Powered-By`. En modo de desarrollo CORS refleja cualquier origen (H-17) |
| RNF-09 Base de datos y API no expuestas a la red | `docker compose ps`, 20 de octubre de 2026 | Cumple: puertos 5432 y 3000 publicados solo en `127.0.0.1` |
| RNF-10 Clave de firma obligatoria | `env.test.ts` (5 casos), 20 de octubre de 2026 | Cumple el criterio: sin `JWT_SECRET` no arranca. Los secretos por defecto de `docker-compose.yml` siguen abiertos (H-03) |
| RNF-12 Validación de datos de entrada | `validacion.test.ts`, `fecha.test.ts` y casos de tipo incorrecto de `rutas_integracion.test.ts`; peticiones del 20 de octubre de 2026 con JSON mal formado, cuerpo grande e imagen no permitida | Cumple parcialmente: pruebas aprobadas y respuestas 400 y 413 correctas; quedan endpoints sin validación completa (H-15, H-42, H-43, H-44) |
| RNF-13 Sin doble descuento de stock | Prueba manual del 19 de julio de 2026: dos dispensaciones simultáneas de 15 unidades con 20 en stock | Cumple en esa prueba: una se registró y la otra recibió 409. No se repitió sobre `bdf1187`; lo hará el caso CP-67 |
| RNF-14 Sin dispensación de lotes vencidos | `despacho_vencimiento.test.ts`, `inventario.service.test.ts` y `vencimiento_arranque.test.ts` | Cumple: aprobadas con `TZ=America/Guatemala` y, las de integración, con `TZ=UTC` |
| RNF-19 Recuperación tras un reinicio | `vencimiento_arranque.test.ts` | Cumple: aprobada |
| RNF-26 Captura desde el teléfono | Navegador con vista de 375 × 812 px, 6 de agosto de 2026 | Cumple en la simulación. [COMPLETAR: resultado de la prueba con un teléfono real en la farmacia] |
| RNF-28 Listados paginados | `validacion.test.ts` (`clampPaginacion`) | Cumple parcialmente: la función está probada, pero dos rutas de inventario no la usan (H-43) |
| RNF-29 Consultas de inventario acotadas | Caso de listados con stock de `rutas_integracion.test.ts`; migración de índices aplicada, comprobada el 20 de octubre de 2026 | Cumple |
| RNF-31 Exportación acotada | `validacion.test.ts` (`verificarLimiteExport`) | Cumple: aprobada |
| RNF-33 Pruebas automatizadas del backend | `npm test`, 20 de octubre de 2026 | Cumple: 53 de 53 aprobadas. El frontend no tiene pruebas automatizadas |
| RNF-40 Fechas independientes de la zona horaria | Pruebas de integración con `TZ=America/Guatemala` y con `TZ=UTC`, 20 de octubre de 2026 | Cumple parcialmente: el despacho y el vencimiento no dependen de la zona horaria, pero los filtros de fecha de reportes, bitácora e historial sí (H-45, H-46) |
| RNF-44 Consulta a OpenFDA | Consulta con el código de barras de un producto conocido, 4 de agosto de 2026 | Cumple para los formatos de NDC 4-4-2, 5-3-2 y 5-4-1 |
| RNF-01, RNF-11, RNF-15, RNF-20, RNF-30, RNF-36, RNF-37, RNF-41, RNF-42, RNF-45 | Inspección del código y de la configuración (capítulo 4) | Conformes en la inspección; sin prueba en ejecución |
| RNF-03, RNF-05, RNF-22, RNF-24, RNF-25, RNF-27, RNF-43 | Casos de prueba funcionales (sección 8.2) | [COMPLETAR: resultados de la ejecución de pruebas funcionales] |
| RNF-16, RNF-17, RNF-18, RNF-34, RNF-35, RNF-38 | Trabajos del workflow "Despliegue seguro" | [COMPLETAR: enlace o captura de una ejecución exitosa del workflow sobre `main`] |
| RNF-21, RNF-23, RNF-39 | Comprobación en la instalación de la farmacia | [COMPLETAR: resultado de la verificación en el servidor y los equipos de la farmacia] |
| RNF-32 Varios usuarios simultáneos | Prueba de carga | [COMPLETAR: prueba de carga con 4 usuarios simultáneos, si se realiza] |

Fuente: Elaboración propia con base en el capítulo 4 (sección 4.3),
`analisis/09_seguimiento_correcciones.md` (sección 5) y
`analisis/11_resultados_pruebas_automatizadas.md`.

De los requerimientos con evidencia ejecutada, catorce se cumplen y cuatro se cumplen de forma
parcial (RNF-12, RNF-28, RNF-40 y, en lo que depende de la prueba con un teléfono real, RNF-26); las
limitaciones de estos últimos corresponden a hallazgos ya registrados y programados en el plan de
correcciones. Las verificaciones en ejecución se hicieron sobre el equipo de desarrollo, por lo que
no sustituyen la comprobación en el servidor de la farmacia, cuya configuración determina el cumplimiento
real de los requerimientos de seguridad afectados por H-03, H-07, H-17 y H-36.
