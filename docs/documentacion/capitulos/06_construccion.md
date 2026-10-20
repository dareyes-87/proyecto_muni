<!-- Numeración de tablas: continúa desde la Tabla 10 (Cap. III). Los capítulos IV y V aún no están
redactados; cuando se incorporen, las tablas de este capítulo (11 a 21) deberán renumerarse para
conservar la numeración corrida del documento. -->

# CAPÍTULO VI

# 6 CONSTRUCCIÓN

La fase de Construcción comprende la implementación de los módulos del sistema sobre la arquitectura
y el modelo de datos definidos en la especificación técnica. Este capítulo describe la estructura del
repositorio, los estándares de código que se observan en la implementación, el flujo de trabajo con
Git, las iteraciones reconstruidas a partir del historial del repositorio, la distribución del trabajo
entre los integrantes, la evolución del diseño durante la construcción y las herramientas de apoyo
utilizadas.

Las fechas citadas en este capítulo son las fechas de autoría que Git registra en cada commit. Esas
fechas indican cuándo se confirmó un cambio en el repositorio, no cuándo se inició el trabajo
correspondiente, por lo que no se usan para calcular duraciones ni esfuerzo.

## 6.1 Estructura del repositorio

El código del sistema y su documentación se encuentran en un único repositorio Git, alojado en GitHub
bajo el nombre `proyecto_muni`. El repositorio es un monorepo con tres componentes principales: el
backend (API REST), el frontend (aplicación de una sola página) y la documentación. Los servicios se
orquestan con Docker Compose, que define cuatro servicios: `db` (PostgreSQL 16), `api` (Express),
`web` (Vite en desarrollo o nginx en producción) y `backup` (respaldo periódico de la base de datos).

La Tabla 11 resume las carpetas y archivos principales del repositorio y el propósito de cada uno,
según el contenido versionado en el commit `bdf1187`.

Tabla 11.
Estructura resumida del repositorio y propósito de cada elemento

| Elemento | Propósito |
|----------|-----------|
| `docker-compose.yml` | Composición por defecto de los servicios `db`, `api`, `web` y `backup`; modo desarrollo salvo que el archivo `.env` indique otro |
| `docker-compose.prod.yml` | Composición de producción: imágenes compiladas, secretos obligatorios y solo el puerto 80 publicado |
| `.env.example` | Plantilla de las variables de entorno |
| `start.cmd`, `start.sh` | Arranque de los contenedores con detección de la IP de la red local, usada por el código QR de captura |
| `.github/workflows/` | Workflow de integración continua "Despliegue seguro" |
| `.github/scripts/` | Consulta SQL que calcula una huella de los datos antes y después de un despliegue simulado |
| `backend/Dockerfile`, `backend/docker-entrypoint.sh` | Imagen de la API en varias etapas y secuencia de arranque (respaldo previo, migraciones, carga inicial y arranque) |
| `backend/prisma/` | Esquema de datos (`schema.prisma`), carga inicial (`seed.ts`) y migraciones versionadas (`migrations/`) |
| `backend/src/server.ts` | Punto de entrada de la API: middleware global, montaje de rutas y tarea programada de vencimientos |
| `backend/src/routes/` | Un archivo de rutas por módulo (autenticación, usuarios, catálogos, inventario, dispensación, captura, reportes y auditoría) |
| `backend/src/services/` | Lógica de negocio de dispensación, inventario, reportes y vencimiento |
| `backend/src/middleware/` | Autenticación por JWT y roles, auditoría, manejo centralizado de errores y límites de intentos de inicio de sesión |
| `backend/src/config/` | Lectura y validación de variables de entorno, y cliente único de Prisma |
| `backend/src/utils/` | Generación de PDF y Excel, fechas, errores HTTP, procesamiento de imágenes y validación |
| `backend/src/assets/` | Logotipo institucional usado en los reportes PDF |
| `backend/tests/` | Diez archivos de pruebas automatizadas del backend |
| `backend/uploads/` | Fotografías de medicamentos y de evidencia de dispensación; solo se versiona la estructura de carpetas |
| `frontend/Dockerfile`, `frontend/nginx.conf` | Imagen del frontend en varias etapas y configuración de nginx para producción |
| `frontend/vite.config.ts` | Servidor de desarrollo y proxy de `/api` y `/uploads` hacia la API |
| `frontend/tailwind.config.js` | Paletas de color institucionales |
| `frontend/src/pages/` | Una página por vista; `Catalogos/` agrupa las pestañas de medicamentos, categorías y ubicaciones |
| `frontend/src/components/` | Estructura general de la interfaz (`layout/`), componentes reutilizables (`ui/`) y formulario compartido de medicamento |
| `frontend/src/api/` | Clientes HTTP por módulo; `client.ts` agrega el JWT y `captura.ts` atiende la página pública de captura |
| `frontend/src/context/`, `types/`, `utils/` | Estado de la sesión, tipos TypeScript compartidos y utilidades de formato |
| `docs/` | Especificación técnica, documento original del proyecto, guías de despliegue, respaldos y herramientas, e informes de seguridad (`seguridad/`) |
| `docs/documentacion/` | Documentación de este trabajo de graduación: lineamientos, análisis, capítulos, diagramas, plantilla, pruebas y salida |
| `CLAUDE.md` | Contexto del proyecto, asignación de módulos, convenciones e historial de sesiones de trabajo |
| `README.md` | Requisitos, inicio rápido y tabla de integrantes por módulo |

Fuente: Elaboración propia con base en el listado de archivos versionados del commit `bdf1187`.

La estructura implementada difiere de la que propone la sección 7 de la especificación técnica. No
existen, entre otros, los archivos `medicamentos.routes.ts`, `beneficiarios.routes.ts` ni
`services/auth.service.ts`, ni las carpetas `hooks/` y `components/shared/` del frontend; en cambio,
existen elementos no previstos, como `captura.routes.ts`, `pages/Captura.tsx`, `config/prisma.ts`,
`backend/tests/` y `docker-entrypoint.sh` (discrepancia D-15).

## 6.2 Estándares de código y convenciones

Las convenciones del proyecto se registraron en `CLAUDE.md`, sección "Convenciones de Código". La
Tabla 12 presenta solo las que se observan en el código del commit `bdf1187`.

Tabla 12.
Estándares de código observados en la implementación

| Aspecto | Convención observada |
|---------|----------------------|
| Lenguaje | TypeScript en el backend y en el frontend, ambos con el modo `strict` activado en `tsconfig.json`. El backend se compila a ES2022 con módulos CommonJS |
| Idioma | Los identificadores del dominio, los comentarios y los mensajes al usuario están en español (por ejemplo, `registrarAuditoria`, `calcularSemaforo`, `validarFechaVencimientoEntrada`) |
| Nomenclatura de archivos | Backend: `<modulo>.routes.ts` y `<modulo>.service.ts`. Frontend: una página por vista con nombre en PascalCase (`Inventario.tsx`, `Dispensacion.tsx`) |
| Base de datos | Modelos de Prisma en singular y PascalCase, mapeados con `@@map` a tablas en snake_case plural (los 14 modelos). Campos en camelCase mapeados a snake_case. Claves primarias UUID generadas con `@default(uuid())` en los 14 modelos |
| Eliminación de registros | Desactivación lógica mediante el campo `activo` en `Usuario`, `Categoria`, `Medicamento` y `Beneficiario`, en lugar de borrar filas |
| Rutas de la API | Prefijo `/api/<modulo>/<recurso>`, con un archivo de rutas por módulo montado en `server.ts` |
| Respuestas | Los errores responden con el objeto `{ error: "mensaje" }`; los listados paginados, con `{ data, pagination }` |
| Manejo de errores | Manejador centralizado en `middleware/errorHandler.ts`: un `ZodError` o un JSON mal formado responden 400 y un cuerpo excesivo responde 413. La función `responderError` (`utils/httpError.ts`) traduce errores de reglas de negocio a 409 o 404 y oculta el detalle interno de los errores 500 fuera del modo desarrollo. Una ruta inexistente responde 404 en JSON |
| Validación | Esquemas Zod en las rutas de catálogos e inventario; funciones de validación propias (`utils/validacion.ts`, `utils/fecha.ts`) para parámetros de consulta, paginación, fechas y límite de exportación |
| Auditoría | Las operaciones que modifican datos llaman a `registrarAuditoria()`, que captura sus propios errores para no interrumpir la operación principal |
| Concurrencia | El descuento de existencias en la dispensación se hace dentro de una transacción de Prisma con aislamiento `Serializable` y `SELECT ... FOR UPDATE` sobre los lotes |
| Mensajes de commit | En español, con el formato `tipo: descripción` y los tipos `feat`, `fix`, `docs`, `chore`, `style`, `refactor`, `perf`, `test`, `ci` y `merge`. Dos commits del historial no siguen el formato (`dc9b292` y `316a65b`) |
| Pruebas | Backend: ejecutor integrado de Node (`node:test`) con `tsx`, en diez archivos de `backend/tests/` (funciones puras sin base de datos y pruebas de integración contra PostgreSQL), ejecutados en serie con `npm test`. Frontend: sin framework de pruebas. Ninguno de los dos proyectos tiene un linter configurado |

Fuente: Elaboración propia con base en `CLAUDE.md`, `backend/prisma/schema.prisma`,
`backend/src/` y el historial de commits.

El chequeo de tipos con el compilador de TypeScript (`tsc`) cumple, en ausencia de linter, la función
de verificación estática del código: el workflow de integración continua lo ejecuta en el backend y en
el frontend en cada cambio (sección 6.3.3).

## 6.3 Flujo de trabajo con Git

### 6.3.1 Ramas

La convención documentada en `CLAUDE.md` establece una rama principal, `main`, que debe mantenerse
funcional, y ramas de trabajo con el formato `feature/[modulo]-[descripcion]`. `docs/PROMPTS_EQUIPO.md`
asignó a cada integrante su rama de módulo. El historial muestra dos etapas en el uso de ramas:

1. De junio a septiembre de 2026 se usaron ramas por módulo (`feature/inventario`,
   `feature/dispensacion`, `feature/catalogos` y `feature/dispensacion-evidencia-pc`). La integración
   a `main` se hizo con *merges* locales sin avance rápido (`--no-ff`) ejecutados por Daniel Reyes,
   salvo los cambios de `feature/dispensacion-evidencia-pc`, que entraron a `main` por avance rápido
   (sin commit de *merge*). Algunos cambios se confirmaron directamente en `main`, como las mejoras
   del 4 y el 6 de agosto.
2. A partir de octubre de 2026 cada cambio se desarrolló en una rama corta con prefijo por tipo
   (`fix/`, `chore/`) y se integró a `main` mediante un *pull request* en GitHub.

La Tabla 13 lista las ramas del repositorio remoto y su estado de integración.

Tabla 13.
Ramas del repositorio y su integración a `main`

| Rama | Último commit | Propósito | Integración a `main` |
|------|---------------|-----------|----------------------|
| `feature/inventario` | `69600ca` (2026-06-27) | Módulo de Inventario y administración de usuarios | *Merge* `14d1f50` (2026-06-27) |
| `feature/dispensacion` | `0c9648c` (2026-08-03) | Módulo de Dispensación y lector de códigos de barras | *Merges* `7fce5e0` (2026-06-27), `c34b14b` (2026-07-19) y `6e53e17` (2026-08-03) |
| `feature/catalogos` | `4dc019b` (2026-07-18) | Módulo de Catálogos | *Merge* `4d01bfc` (2026-07-19) |
| `fix/sidebar-layout` | `4057cbb` (2026-07-20) | Ajuste del menú lateral | No integrada |
| `feature/dispensacion-evidencia-pc` | `194f8fb` (2026-09-07) | QR con IP de red local, subida de fotos desde la PC, rediseño de la interfaz y eliminación de proveedores | Avance rápido de `main` |
| `seguridad` | `d7250fa` (2026-10-12) | Auditoría y correcciones de seguridad | Incluida en el PR #3 |
| `fix/despliegue-seguro`, `seguridad-ajustes`, `fix/fechas-vencimiento`, `fix/importacion-exportacion-login`, `fix/seed-y-vencimiento-al-arrancar`, `fix/indices-y-carga-de-lotes`, `chore/limpieza-auditoria`, `chore/setup-skills` | Ver Tabla 14 | Correcciones de octubre | PR #2 a PR #9 |
| `docs/documentacion` | `64d9e1c` (2026-10-20) | Documentación del trabajo de graduación | No integrada; incorpora `main` hasta `d68ceb3` mediante el *merge* `bdf1187` |

Fuente: Elaboración propia con base en `git branch -a` y `git log --merges`.

La rama `fix/sidebar-layout` no se integró a `main`. El *merge* `6e53e17`, del 3 de agosto, incluye un
cambio de propósito similar en `Layout.tsx` (menú lateral con desplazamiento independiente).

### 6.3.2 Pull requests y revisión

En la primera etapa no se usaron *pull requests*: la revisión consistió en auditorías de cada rama,
realizadas por el integrador antes de mezclarla y registradas en el historial de sesiones de
`CLAUDE.md`. Según ese registro, el 27 de junio se rechazó la primera versión de
`feature/dispensacion` (cambios no deseados en la configuración de Docker, funciones sin implementar
en el backend y una versión antigua de `App.tsx`) y se aprobó la segunda tras un *rebase*; ese mismo
día se bloqueó la integración de `feature/catalogos` porque no tenía páginas de frontend. El 19 de
julio, antes de integrar `feature/catalogos`, se verificó la rama con la lista de archivos
modificados, la lectura del archivo de rutas, la construcción de los contenedores y pruebas de los
endpoints con `curl`. El mismo día se integró `feature/dispensacion` tras una verificación conjunta de
los tres módulos, que incluyó una prueba de dos dispensaciones simultáneas sobre el mismo lote.

En la segunda etapa los cambios se integraron mediante *pull requests* numerados del #2 al #9, que se
presentan en la Tabla 14. Los commits de *merge* se registraron en GitHub con el nombre "Daniel
Haroldo Reyes García". El historial no contiene un PR #1.

Tabla 14.
Pull requests integrados a `main`

| PR | Rama | Fecha de *merge* | Contenido |
|----|------|------------------|-----------|
| #2 | `fix/despliegue-seguro` | 2026-10-11 | Arranque con migraciones versionadas en lugar de `prisma db push --accept-data-loss`, respaldo previo, servicio de respaldos y workflow "Despliegue seguro" |
| #3 | `seguridad-ajustes` (incluye la rama `seguridad`) | 2026-10-12 | Correcciones de la auditoría de seguridad y ajustes para un servidor sin acceso remoto |
| #4 | `fix/fechas-vencimiento` | 2026-10-16 | Desfase de un día en fechas de vencimiento; despacho independiente de la zona horaria de PostgreSQL |
| #5 | `fix/importacion-exportacion-login` | 2026-10-16 | Bloqueo de inicio de sesión por usuario e IP, límite de exportación, lotes duplicados en la importación, stock del lector de códigos |
| #6 | `fix/seed-y-vencimiento-al-arrancar` | 2026-10-16 | Carga inicial que no restaura catálogos y marcado de lotes vencidos al arrancar |
| #7 | `fix/indices-y-carga-de-lotes` | 2026-10-16 | Índices de consulta (primera migración posterior a `0_init`) y carga solo de lotes con existencias |
| #8 | `chore/limpieza-auditoria` | 2026-10-17 | Eliminación de dependencias y código sin uso, validación con Zod en edición de catálogos, reorganización de informes |
| #9 | `chore/setup-skills` | 2026-10-19 | Guía de herramientas de Claude Code y su configuración |

Fuente: Elaboración propia con base en `git log --merges`.

Dos commits con el mensaje "ajustes de la revisión" (`71dcd15` en el PR #5 y `0f288c5` en el PR #6)
muestran correcciones hechas dentro del PR a partir de una revisión. `docs/HERRAMIENTAS_IA.md`
establece como obligatoria la revisión de la rama con la herramienta `ponytail` antes de abrir un PR.
El repositorio no registra quién revisó cada PR. [COMPLETAR: revisores de los pull requests #2 a #9,
según GitHub].

### 6.3.3 Integración continua

El workflow "Despliegue seguro" (`.github/workflows/despliegue-seguro.yml`) se incorporó en el PR #2.
Se ejecuta en GitHub Actions al abrir un *pull request* hacia `main`, en cada *push* a cualquier rama
y de forma manual. Su propósito, según el comentario de cabecera, es reproducir antes de cada
integración el mismo procedimiento con el que se actualiza el servidor de la municipalidad: cada 30
minutos, ese equipo ejecuta `git pull origin main` y, si hubo cambios, `docker compose up -d --build`
(`docs/DESPLIEGUE.md`). En la Tabla 15 se describen sus cuatro trabajos.

Tabla 15.
Trabajos del workflow "Despliegue seguro"

| Trabajo | Comprobaciones |
|---------|----------------|
| `esquema` | Valida `schema.prisma`; exige que coincida con las migraciones versionadas; ejecuta las pruebas contra PostgreSQL con la zona horaria de Guatemala y con UTC; advierte si una migración nueva elimina tablas, columnas o datos |
| `compilacion` | Chequeo de tipos del backend, pruebas que no requieren base de datos y construcción del frontend (`tsc` y `vite build`) |
| `despliegue` | En tres configuraciones del servidor (sin `.env`, con el `.env` de ejemplo y con valores de producción de ejemplo): levanta la versión anterior con 200 beneficiarios de prueba, despliega la versión nueva, compara una huella de los datos, revisa el registro de arranque, comprueba que los respaldos previo y periódico existen y se restauran, reinicia la API y prueba el inicio de sesión |
| `instalacion` | Instalación desde cero: arranque sin errores, inicio de sesión con la contraseña fijada y rechazo de la contraseña por defecto anterior |

Fuente: Elaboración propia con base en `.github/workflows/despliegue-seguro.yml`.

El comentario de cabecera del workflow indica que, para que bloquee integraciones, debe configurarse
en GitHub una regla de protección de la rama `main` que exija estos trabajos. Esa configuración no
se puede verificar desde el repositorio. [COMPLETAR: confirmar si la regla de protección de `main`
exige los cuatro trabajos del workflow]. [COMPLETAR: resultado de las ejecuciones del workflow en los
PR #2 a #9, según GitHub Actions].

## 6.4 Iteraciones del proyecto

Las iteraciones se reconstruyeron agrupando los commits del historial por periodos de actividad
continua y por objetivo común, y se delimitaron con los intervalos sin commits que separan esos
periodos. Para cada iteración se tomaron como fuentes los mensajes de commit, las ramas que los
contienen y el historial de sesiones de `CLAUDE.md`.

Las fases de Inicio y Elaboración no tienen commits en el repositorio, porque se realizaron antes de
crearlo. Sus artefactos son el documento de análisis inicial (`docs/proyecto_farmacia_original.md`),
elaborado a partir de la reunión con el Alcalde Municipal durante el primer trimestre de 2026
(sección 1.1), y la especificación técnica (`docs/FarmaG_Especificacion_Tecnica_v1.md`), fechada el
26 de junio de 2026, que define el stack, el modelo de datos, los módulos y la estrategia de
concurrencia. Ambos documentos llegaron al repositorio con el commit inicial del 27 de junio.

La Tabla 16 resume las iteraciones reconstruidas.

Tabla 16.
Iteraciones del proyecto reconstruidas a partir del historial de Git

| Iteración | Periodo | Objetivo | Ramas | Commits principales | Resultado | Fase de RUP |
|-----------|---------|----------|-------|---------------------|-----------|-------------|
| I1 | 2026-06-27 | Configuración base y primeros módulos | `main`, `feature/inventario`, `feature/dispensacion`, `feature/catalogos` | `7d431a5`, `560d537`, `69600ca`, `7f79e23`, `7fce5e0`, `14d1f50`, `dc9b292` | Docker Compose, esquema de Prisma, autenticación y estructura de la interfaz; módulos de Inventario, Usuarios y Dispensación integrados a `main`; Catálogos con solo los endpoints de lectura en `main` | Construcción (con la línea base de arquitectura de la Elaboración) |
| I2 | 2026-07-18 a 2026-07-20 | Completar e integrar los módulos de la especificación | `feature/catalogos`, `feature/dispensacion`, `main` | `4dc019b`, `4d01bfc`, `e8ea784`, `c34b14b`, `5126ec6`, `93b6312`, `4462ca0`, `5f721e2`, `347b1cb`, `63b9be0` | Catálogos, página de Auditoría y módulo de Reportes en `main`; corrección de pantalla en blanco en Reportes; paleta institucional; cambio de nombre de FarmaRH a FarmaG. El commit `4462ca0` marca el proyecto como funcionalmente completo según la especificación | Construcción |
| I3 | 2026-08-03 a 2026-08-06 | Funciones de productividad no previstas en la especificación | `feature/dispensacion`, `main` | `6e53e17`, `72f831c`, `9455139`, `bc647a0`, `f4ff51d`, `a2b4a36`, `ad273a4` | Lector de códigos de barras en tres pantallas; importación masiva desde Excel; autocompletado con OpenFDA; fotografía de medicamentos; evidencia fotográfica de la dispensación mediante QR | Construcción |
| I4 | 2026-08-18 a 2026-09-07 | Preparación para producción y rediseño de la interfaz | `feature/dispensacion-evidencia-pc` | `f3a74db`, `fd912a4`, `194f8fb` | QR con IP de red local y subida de fotos desde la PC; ajustes para el despliegue en producción (nginx, puerto 80, `start.cmd`); componentes de interfaz reutilizables, menú lateral colapsable y eliminación de proveedores y procedencia | Construcción y Transición |
| I5 | 2026-10-07 a 2026-10-19 | Corrección de defectos y despliegue seguro | `seguridad`, `seguridad-ajustes`, `fix/*`, `chore/*` | `254d0f8`, `b25c06e`, `319ebd3`, `a274f5f`, `4a865ae`, `40d16fa`, `99d4429`, `6ae2bd5`, `dd8e723` (PR #2 a #9) | Migraciones versionadas, respaldos, workflow de integración continua, pruebas automatizadas del backend y corrección de la mayor parte de los hallazgos | Transición |

Fuente: Elaboración propia con base en `git log --all` y el historial de sesiones de `CLAUDE.md`.

Entre las iteraciones hay intervalos sin commits: del 28 de junio al 17 de julio, del 21 de julio al 2
de agosto, del 7 al 17 de agosto y del 8 de septiembre al 6 de octubre. El historial no registra la
actividad del equipo en esos intervalos.

La iteración I1 concentra en una sola fecha la configuración base y dos módulos completos, lo que
indica que el trabajo se confirmó en el repositorio al terminarse y no durante su desarrollo. El orden
de construcción previsto en la especificación (Autenticación, Catálogos, Inventario, Dispensación,
Reportes y Auditoría) no se siguió: los módulos se construyeron en paralelo, cada uno en su rama, y
Catálogos se integró después de Inventario y Dispensación. Para no bloquear los formularios de
Inventario, se implementaron en `main` los endpoints de lectura de Catálogos antes de integrar ese
módulo (`CLAUDE.md`, notas del módulo de Inventario).

La iteración I3 respondió a una necesidad detectada en la farmacia: registrar los medicamentos uno por
uno resultaba demasiado lento con estantes de decenas de productos distintos (`CLAUDE.md`, sesión del
4 de agosto de 2026). Su relación con la fase de Transición se limita a ese origen en la operación, ya
que el historial no registra en esas fechas trabajo de instalación.

La relación de la iteración I4 con la fase de Transición se sustenta en el commit `fd912a4`
("preparar para despliegue en producción"). El sistema estaba instalado en la farmacia a más tardar
el 25 de septiembre de 2026, fecha en que el responsable de la documentación confirmó la instalación
(R-02). [COMPLETAR: fecha de instalación del sistema en la Farmacia Municipal de Gualán].

La iteración I5 pertenece a la fase de Transición porque sus cambios se orientan a que el sistema
instalado se actualice sin pérdida de datos y sin intervención en sitio, condición descrita en
`docs/DESPLIEGUE.md` y en el mensaje del commit `319ebd3`. Sus commits se agruparon por fecha de
autoría; algunos, como `254d0f8` y `b25c06e`, tienen fecha del 7 de octubre pero se integraron a
`main` el 12 de octubre, en el PR #3, tras un *rebase*.

En paralelo a I5, en la rama `docs/documentacion` se realizaron dos actividades de la disciplina de
aseguramiento de la calidad: la extracción de hechos del código del 25 de septiembre de 2026 (commits
`87ace3d` a `072e2b5`), que registró los hallazgos H-01 a H-34, y la verificación de las correcciones
del 20 de octubre de 2026 (commits `19de73b` a `dede5c4`). Su relación con las correcciones se resume
en la sección 6.6.2.

## 6.5 Distribución del trabajo por integrante

La asignación de módulos del proyecto se registra en la tabla "Equipo de Desarrollo" de `README.md`
y en la sección "Asignación de Módulos" de `CLAUDE.md`. Para relacionar el trabajo con cada
integrante, primero se identificó a qué persona corresponde cada usuario de Git, como se muestra en la
Tabla 17.

Tabla 17.
Correspondencia entre usuarios de Git e integrantes del equipo

| Usuario de Git (correo) | Integrante | Fundamento en el repositorio |
|-------------------------|------------|------------------------------|
| `dareyes-87`, `Daniel Reyes` y `Daniel Haroldo Reyes García` (mismo correo) | Daniel Reyes | Los tres nombres comparten la misma dirección de correo; `dareyes-87` es el propietario del repositorio en GitHub; las sesiones de `CLAUDE.md` firmadas por Daniel Reyes corresponden a commits de `dareyes-87` |
| `jorgevargas83` | Jorge Vargas | `CLAUDE.md` (sesión del 3 de agosto de 2026) indica que desde esa fecha los commits de Jorge Vargas salen con ese usuario |
| `Your Name <you@example.com>` | Jorge Vargas | `CLAUDE.md` atribuye el commit `0c9648c` a Jorge Vargas y explica que salió con un autor genérico por no tener configurado Git. Los otros tres commits con ese autor (`6662e88`, `7f79e23` y `e8ea784`) están en `feature/dispensacion` y corresponden a las sesiones de Jorge Vargas registradas en `CLAUDE.md` el 27 de junio y el 19 de julio de 2026 |
| `Audias22` | Audias Guevara | Las sesiones de `CLAUDE.md` firmadas por Audias Guevara corresponden a commits de `Audias22` en `feature/catalogos`; los lineamientos de la documentación lo designan responsable de la documentación, cuyos commits firma `Audias22` |

Fuente: Elaboración propia con base en `git shortlog -sne --all` y `CLAUDE.md`.

La Tabla 18 combina la asignación de módulos del `README.md` con el trabajo que el historial atribuye
a cada integrante, incluido el realizado fuera de su módulo. No se usa el número de commits como
medida de esfuerzo, porque el tamaño y la complejidad de cada commit varían y, como se observó en la
iteración I1, un solo commit puede contener un módulo completo.

Tabla 18.
Distribución del trabajo por integrante

| Integrante | Módulo asignado (`README.md`) | Trabajo atribuido en el historial |
|------------|-------------------------------|-----------------------------------|
| Daniel Reyes | Inventario + Setup + Admin | Configuración base (Docker, Prisma, autenticación, estructura de la interfaz); módulo de Inventario; administración de usuarios; tablero principal; endpoints de lectura de Catálogos; página de Auditoría; módulo de Reportes con exportación a PDF y Excel; paleta institucional y cambio de nombre a FarmaG; importación desde Excel, autocompletado con OpenFDA y fotografía de medicamentos; evidencia fotográfica por QR; integración de las ramas de módulo; despliegue seguro, respaldos y workflow de integración continua; correcciones de los PR #4 a #8; guía de herramientas (PR #9) |
| Jorge Vargas | Dispensación | Módulo de Dispensación con FIFO y control de concurrencia; página de Beneficiarios; lector de códigos de barras en Catálogos, Dispensación y Entradas; QR con IP de red local y subida de fotos desde la PC; preparación para producción; rediseño de la interfaz, menú lateral colapsable y eliminación de proveedores; auditoría y correcciones de seguridad (rama `seguridad`, PR #3) |
| Audias Guevara | Catálogos | Módulo de Catálogos (CRUD de medicamentos con detección de duplicados, códigos de barras, categorías, proveedores y ubicaciones, y sus páginas); documentación del trabajo de graduación en la rama `docs/documentacion` |

Fuente: Elaboración propia con base en `README.md`, `CLAUDE.md` y `git log --all`.

El módulo compartido de Reportes, no asignado en `README.md`, figura en `CLAUDE.md` bajo la
responsabilidad de Daniel Reyes. Las páginas de Proveedores y el CRUD de proveedores del módulo de
Catálogos se eliminaron después, en el rediseño del 7 de septiembre (sección 6.6).

## 6.6 Evolución del diseño

### 6.6.1 Cambios respecto a la especificación técnica

Durante la construcción, el sistema se apartó de la especificación técnica en varios puntos. Algunos
cambios fueron decisiones del equipo o de la municipalidad, registradas como respuestas R-XX en el
análisis; otros son diferencias entre el código y la especificación, registradas como discrepancias
D-XX. Conforme a los lineamientos de esta documentación, cuando el código y la especificación no
coinciden prevalece el código. En la Tabla 19 se presentan los cambios principales.

Tabla 19.
Cambios del diseño entre la especificación técnica y la implementación

| Tema | Especificación técnica | Implementación | Justificación o estado | Referencia |
|------|------------------------|----------------|------------------------|------------|
| Proveedores y procedencia | Catálogo de proveedores y donantes; cada entrada con proveedor y origen (donación o presupuesto municipal); reporte de entradas por proveedor | Se eliminaron el modelo `Proveedor`, los campos de origen y los filtros de procedencia; el reporte se llama "Entradas". Se conservó el costo unitario como dato opcional del lote | La recepción y verificación de donaciones corresponde a un proceso administrativo externo a la farmacia; registrar su origen sin controlar ese proceso trasladaría al sistema la responsabilidad sobre información no verificable. Eliminación en `194f8fb` (2026-09-07) | R-01; D-01, D-02, D-03, D-05, D-21 |
| Módulo de ventas | Fuera de la fase 1, previsto como ampliación futura | No implementado | La municipalidad opera dos farmacias y el sistema se delimitó a la de dispensación gratuita, por decisión unánime del equipo y la municipalidad | R-04 |
| Ajuste manual de existencias | Previsto en el análisis inicial (CUO-03) | No implementado; las correcciones se limitan a dar de baja lotes completos | [COMPLETAR: motivo de la exclusión, pendiente de confirmación con el equipo] | R-05 |
| Devoluciones | Fuera de la fase 1 | No implementadas | No aplica por regla de negocio: los medicamentos se dispensan con receta y no se aceptan devoluciones | R-06 |
| Gestión del esquema de datos | Prisma con "migraciones como código" | Hasta octubre, sincronización con `prisma db push --accept-data-loss` en cada arranque, sin migraciones. Desde el PR #2, migraciones versionadas aplicadas con `prisma migrate deploy` tras un respaldo | El método anterior borraba datos al eliminar columnas o tablas, como ocurrió con `proveedores` el 7 de septiembre; con la actualización automática del servidor, ese riesgo llegaba a producción sin revisión (`319ebd3`) | D-13 (resuelta); H-05 |
| Servicios de Docker Compose | Tres servicios: nginx, API y base de datos | Cuatro servicios (`db`, `api`, `web`, `backup`) y dos archivos de composición, de desarrollo y de producción | El servicio `backup` se agregó con el despliegue seguro para tener respaldos periódicos verificados | D-28 |
| Servidor web | nginx en el puerto 80 | Por defecto, Vite en el puerto 5173; nginx en el puerto 80 solo con `FRONTEND_TARGET=production` | Configuración heredada del modo de desarrollo; su efecto en la instalación real se registra como hallazgo | D-12; H-08, H-36 |
| Tabla de lotes | `detalle_entradas` | Modelo `Lote`, tabla `lotes` | Cambio de nombre sin efecto en la regla FIFO | D-04 |
| Funciones no previstas | No se describen | Importación desde Excel, autocompletado con OpenFDA, fotografía de medicamentos y evidencia fotográfica de la dispensación | Respuesta a la lentitud del registro manual observada en la farmacia (sesión del 4 de agosto) y a la necesidad de evidencia de la entrega | D-26 |
| Catálogos en la interfaz | Cuatro páginas independientes | Una ruta `/catalogos` con tres pestañas; la creación de medicamentos se trasladó a "Registrar entrada" | Rediseño de la navegación en `194f8fb` | D-15 |
| Gráficos del tablero | Recharts | El tablero no tiene gráficos y la dependencia se eliminó por no usarse | Limpieza de dependencias en `dd8e723` | D-14 |
| Estructura de carpetas | Árbol de la sección 7 de la especificación | Estructura de la Tabla 11 | Resultado de la construcción por módulos y del despliegue seguro | D-15 |
| Marcado de lotes vencidos | `fecha_vencimiento <= hoy` | Se implementó con `<` y se corrigió a `<=` en octubre; además se ejecuta al arrancar | Corrección del hallazgo H-01 | D-11 (resuelta) |
| Consulta del Encargado de Beneficencia | Ve sus propias dispensaciones; los reportes son funciones del Administrador | Ve las dispensaciones de todos los usuarios; el backend le permite consultar reportes, pero la interfaz no le muestra la página | En la operación real una sola persona despacha y consulta los reportes. Pendiente de confirmación con la municipalidad | R-07, R-08; D-16, D-17 |

Fuente: Elaboración propia con base en `docs/FarmaG_Especificacion_Tecnica_v1.md`,
`analisis/discrepancias.md` y `analisis/preguntas_abiertas.md`.

Además de los cambios frente a la especificación, la arquitectura interna del backend cambió durante
la construcción: cada archivo de rutas creaba su propio cliente de Prisma hasta que el commit `254d0f8`
introdujo un cliente único compartido (`config/prisma.ts`). En el mismo periodo se agregaron archivos
de bloqueo de dependencias (`package-lock.json`), Dockerfiles en varias etapas y la composición de
producción.

### 6.6.2 Ciclo de corrección de defectos de octubre

Entre septiembre y octubre de 2026 se completó un ciclo de detección, corrección y verificación de
defectos, que se resume en la Tabla 20. El detalle de cada hallazgo, de las pruebas y de sus
resultados se presenta en el capítulo 8.

Tabla 20.
Ciclo de corrección de defectos de septiembre y octubre de 2026

| Etapa | Fecha | Actividad | Resultado |
|-------|-------|-----------|-----------|
| Detección | 2026-09-25 | Extracción de hechos del código en el commit `194f8fb`, con verificaciones en ejecución sobre los contenedores del equipo de desarrollo (rama `docs/documentacion`) | 34 hallazgos (H-01 a H-34) y 27 discrepancias con la especificación (D-01 a D-27) |
| Detección | 2026-10-07 | Auditoría de seguridad del propio equipo (commits `254d0f8` y `b25c06e`, rama `seguridad`) | 16 informes, hoy en `docs/seguridad/`, con numeración propia (`H-001`, `R-01`) |
| Corrección | 2026-10-07 a 2026-10-17 | Correcciones integradas en los PR #2 a #8 | Migraciones versionadas, respaldos, workflow de integración continua, diez archivos de pruebas del backend y correcciones de seguridad, fechas, importación, exportación y validación |
| Verificación | 2026-10-20 | Revisión del código en el commit `bdf1187` contra cada hallazgo y ejecución de las pruebas automatizadas | De los 34 hallazgos: 19 resueltos, 10 resueltos parcialmente, 4 pendientes y 1 no verificable en el código. De 11 discrepancias revisadas: 3 resueltas, 2 resueltas parcialmente y 6 pendientes. Pruebas: 53 de 53 aprobadas. Hallazgos nuevos: H-35 a H-46 |
| Planificación | 2026-10-20 | Plan de correcciones de los hallazgos abiertos (commit `dede5c4`) | Propuesta de prioridad, responsable y esfuerzo para cada hallazgo no resuelto |

Fuente: Elaboración propia con base en `analisis/hallazgos_defectos.md`,
`analisis/09_seguimiento_correcciones.md`, `analisis/11_resultados_pruebas_automatizadas.md` y
`analisis/12_plan_correcciones.md`.

La mayor parte de las correcciones entró en el commit `254d0f8`, integrado a `main` en el PR #3. De
los 29 hallazgos resueltos total o parcialmente, cinco tienen una prueba automatizada que ejerce la
corrección (H-01, H-03, H-09, H-15 y H-34); H-02 y H-05 se ejercen de forma indirecta en el workflow,
y el resto se verificó por lectura del código. Las correcciones del frontend no tienen prueba
automatizada, porque el frontend no cuenta con un framework de pruebas.

## 6.7 Herramientas de apoyo al desarrollo

Además del stack descrito en el capítulo 2, el equipo utilizó herramientas de apoyo que no forman
parte del sistema desplegado.

El equipo utilizó Claude Code, el asistente de programación de Anthropic, como herramienta de apoyo
durante el desarrollo, en las condiciones que establece `docs/HERRAMIENTAS_IA.md`. `CLAUDE.md` reúne
el contexto del proyecto que el asistente consulta al iniciar cada sesión, y `docs/PROMPTS_EQUIPO.md`
contiene las instrucciones iniciales asignadas a cada integrante. Los cambios no llegaron a `main`
directamente desde el asistente: en la primera etapa pasaron por la auditoría de la rama previa a cada
*merge* (sección 6.3.2) y, desde octubre de 2026, se integraron mediante *pull request*, revisión y
los trabajos de pruebas automatizadas del workflow "Despliegue seguro" (sección 6.3.3). El historial
de sesiones registra además el uso de Playwright con Chromium sin interfaz gráfica, instalado
temporalmente para verificar páginas en navegador, sin quedar como dependencia del proyecto.

En octubre de 2026 se documentó en `docs/HERRAMIENTAS_IA.md` (PR #9) el uso de *skills* de Claude
Code, que son conjuntos de instrucciones que el asistente sigue y que no se despliegan al servidor.
Están instaladas de forma global en el equipo de Daniel Reyes. En la Tabla 21 se resume el uso
previsto de cada una.

Tabla 21.
Skills de Claude Code y su uso en el proyecto

| Skill | Uso previsto |
|-------|--------------|
| ponytail | Revisión de una rama antes de abrir un *pull request* (obligatoria), auditoría general del código y deuda técnica |
| impeccable | Crítica y mejora de pantallas y flujos del personal; no debe modificar lógica de negocio |
| mattpocock | Aclaración de un cambio antes de programarlo, registro del glosario y de decisiones (ADR), diagnóstico de defectos, desarrollo con pruebas primero y búsqueda de módulos por simplificar |
| addyosmani (dos skills) | Monitoreo y registros (`observability-and-instrumentation`) y preparación de versiones para el servidor (`shipping-and-launch`) |

Fuente: Elaboración propia con base en `docs/HERRAMIENTAS_IA.md`.

La misma guía fija reglas que ninguna herramienta puede modificar: no trabajar directamente en `main`
y llevar todo cambio por rama, *pull request* y los trabajos del workflow; no publicar en el
repositorio, que es público, datos de beneficiarios, direcciones IP, contraseñas ni datos del
servidor; verificar en el código los hallazgos de una herramienta antes de corregirlos, y conservar
las decisiones del equipo, como la eliminación de proveedores y procedencia, que los usuarios no
cambien su propia contraseña y la ausencia de un disco adicional para respaldos. La configuración de
`mattpocock` asocia el repositorio con GitHub Issues como gestor de tareas (`docs/agents/`).

Las demás herramientas de apoyo fueron Git y GitHub para el control de versiones y los *pull
requests*, GitHub Actions para la integración continua y Docker Compose para el entorno de
desarrollo. `CLAUDE.md` documenta además Prisma Studio como interfaz gráfica para consultar la base de
datos.
