<!-- Numeración de tablas: continúa desde la Tabla 21 (Cap. VI). Este capítulo usa las Tablas 22 a
27. Si se incorporan tablas en los capítulos IV y V, deberán renumerarse para conservar la numeración
corrida del documento. La Figura 27 corresponde al diagrama de despliegue según diagramas/README.md;
aquí solo se referencia, no se repite. -->

# CAPÍTULO VII

# 7 TRANSICIÓN

La fase de Transición comprende las actividades que llevan el sistema del entorno de desarrollo a la
operación en la Farmacia Municipal de Gualán. Este capítulo describe los requisitos del equipo
servidor y de los equipos cliente, el procedimiento de instalación, la configuración por variables de
entorno, la puesta en marcha, el mecanismo de actualización, los respaldos y su restauración, las
tareas de mantenimiento y la entrega al usuario.

El contenido se basa en los archivos de configuración versionados en el repositorio y en las guías
`docs/DESPLIEGUE.md` y `docs/RESPALDOS.md`. Los procedimientos descritos son los que esos archivos
establecen o permiten; la configuración del equipo instalado en la farmacia no consta en el
repositorio y se indica en cada caso como dato por completar. La disposición de los contenedores,
puertos, volúmenes y clientes se representa en el diagrama de despliegue (véase la Figura 27).

## 7.1 Requisitos del sistema

### 7.1.1 Servidor

El sistema se ejecuta como un conjunto de contenedores de Docker orquestados con Docker Compose, por
lo que el servidor no requiere instalar Node.js, PostgreSQL ni nginx de forma directa: cada componente
se obtiene de una imagen. La Tabla 22 distingue los requisitos que se deducen de los archivos del
repositorio de las características del equipo instalado; las que no se verificaron como parte de
este trabajo se indican así.

Tabla 22.
Requisitos técnicos del servidor

| Aspecto | Requisito deducido del sistema | Equipo instalado en la farmacia |
|---------|--------------------------------|---------------------------------|
| Sistema operativo | Cualquier sistema capaz de ejecutar contenedores Linux con Docker. Las imágenes base son `node:20-alpine`, `postgres:16-alpine` y `nginx:alpine`. El `Dockerfile` del backend indica que el servidor de la municipalidad es Windows y normaliza los finales de línea del script de arranque por ese motivo | Windows, según el `Dockerfile` del backend; según el equipo, casi con seguridad Windows 10 (no comprobado) |
| Docker | Docker con el complemento Compose en su versión que admite el comando `docker compose` | Casi con seguridad Docker Desktop, según el equipo (no comprobado). [COMPLETAR: versiones de Docker y Docker Compose (`docker compose version`)] |
| Git | Necesario para clonar el repositorio y para la actualización automática, que ejecuta `git pull origin main` | No verificado |
| Memoria | El repositorio no establece un valor mínimo. Deben ejecutarse en simultáneo cuatro contenedores: PostgreSQL, la API de Node.js, nginx y el servicio de respaldos | No verificado |
| Disco | El repositorio no establece un valor mínimo. El disco aloja el volumen de la base de datos (`pgdata`), hasta 28 respaldos periódicos y 10 respaldos previos con la configuración por defecto, las fotografías de `backend/uploads/` y las imágenes de Docker | No verificado |
| Procesador | El repositorio no establece un requisito | No verificado |
| Red | Conexión a la red local de la farmacia con una dirección IP accesible desde los equipos cliente y el celular de captura. En producción, solo el puerto 80 queda publicado hacia la red; la base de datos (5432) y la API (3000) se publican únicamente en `127.0.0.1`. La actualización automática y la consulta de OpenFDA requieren acceso a Internet | [COMPLETAR: dirección de acceso, configuración del cortafuegos y puertos abiertos] |

Fuente: Elaboración propia con base en `docker-compose.prod.yml`, `backend/Dockerfile`,
`frontend/Dockerfile`, `docs/DESPLIEGUE.md`, `docs/RESPALDOS.md` y
`analisis/pendientes_instalacion.md`.

### 7.1.2 Equipos cliente

Los usuarios acceden al sistema desde un navegador web, sin instalar programas en los equipos cliente.
El frontend se sirve como una aplicación de una sola página que se comunica con la API por el mismo
origen, a través del proxy de nginx. Los dispositivos de apoyo son los siguientes:

1. Equipo de escritorio: navegador web conectado a la red local de la farmacia, con acceso a la
   dirección IP del servidor.
2. Lector de código de barras: conectado por USB y configurado en modo teclado, de forma que cada
   lectura se recibe como texto escrito en el campo activo de la pantalla.
3. Celular para la captura de evidencia: el teléfono que fotografía la receta y la entrega abre el
   enlace del código QR en su navegador, por lo que debe estar conectado a la misma red que el
   servidor. La URL del QR se forma con la dirección desde la que el equipo de escritorio accede al
   sistema; si se accede por `localhost`, el celular no puede abrir el enlace, por lo que el equipo de
   escritorio debe entrar por la dirección IP de la red local.

### 7.1.3 Licenciamiento

Los componentes del sistema son de código abierto. La plataforma Docker con la que se ejecutan
requiere una consideración aparte: los términos de Docker establecen que las entidades de gobierno no
pueden usar Docker Desktop sin una suscripción pagada (Docker Inc., s.f.-c). Docker Engine en Linux no
tiene ese requisito. Dado que el servidor de la farmacia es un equipo con Windows, según el comentario
del `Dockerfile` del backend, la plataforma que se use determina si la municipalidad debe adquirir una
suscripción. Según el equipo, el servidor ejecuta casi con seguridad Docker Desktop sobre Windows 10,
porque es el medio habitual para ejecutar contenedores Linux en Windows y nadie reporta haber
instalado Docker Engine dentro de WSL2; no se comprobó en el equipo.

En consecuencia, el licenciamiento queda como un riesgo legal abierto, con dos salidas: adquirir la
suscripción de Docker Desktop o migrar a Docker Engine, que es gratuito, en un equipo con Linux o
dentro de WSL2. A ello se suma que Windows 10 no tiene soporte de Microsoft desde el 14 de octubre de
2025 (Microsoft, s.f.), por lo que el sistema operativo del servidor ya no recibe actualizaciones de
seguridad. Una migración a Linux atendería ambos riesgos a la vez.

## 7.2 Procedimiento de instalación

El repositorio contiene dos archivos de composición. `docker-compose.yml` es el archivo por defecto y
corresponde al modo de desarrollo, salvo que el archivo `.env` cambie sus valores. `docker-compose.prod.yml`
es la composición de producción y es el procedimiento recomendado para el servidor, porque exige
definir los secretos, ejecuta el código compilado y sirve el frontend con nginx. En la Tabla 23 se
comparan ambos modos.

Tabla 23.
Comparación entre el modo de desarrollo y el modo de producción

| Aspecto | Desarrollo (`docker-compose.yml`) | Producción (`docker-compose.prod.yml`) |
|---------|-----------------------------------|----------------------------------------|
| *Target* del backend | `${BACKEND_TARGET:-development}`: `tsx watch` con recarga en caliente | `production` fijo: `node dist/server.js` |
| *Target* del frontend | `${FRONTEND_TARGET:-development}`: servidor de desarrollo de Vite | `production` fijo: compilación estática servida por nginx |
| `NODE_ENV` | `${NODE_ENV:-development}` | `production` fijo |
| Puertos publicados hacia la red | 80 y 5173 (solo responde el del modo activo) | Solo 80 |
| Puertos publicados en `127.0.0.1` | 5432 (base de datos) y 3000 (API) | 5432 (base de datos) y 3000 (API) |
| Secretos | `DB_PASSWORD` y `JWT_SECRET` tienen valores por defecto versionados en el archivo | `DB_PASSWORD` y `JWT_SECRET` son obligatorios: Compose se detiene con un mensaje si faltan |
| Volúmenes de `api` | Código fuente, `prisma`, `tests`, `uploads` y `backups` | Solo `uploads` y `backups` |
| Volúmenes de `web` | `src` y `public` del frontend | Ninguno |
| Servidor web | Vite en el puerto 5173 | nginx en el puerto 80, con cabeceras de seguridad y proxy de `/api/` y `/uploads/medicamentos/` |
| Verificación de salud de `api` | Definida (`/api/health` cada 30 segundos) | No definida |
| Servicio `backup` | Incluido | Incluido, con la misma configuración |

Fuente: Elaboración propia con base en `docker-compose.yml`, `docker-compose.prod.yml`,
`backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf` y
`analisis/01_stack_y_estructura.md`.

El procedimiento recomendado para una instalación nueva con la composición de producción es el
siguiente:

1. Instalar Docker con el complemento Compose y Git en el servidor.
2. Clonar el repositorio en la carpeta de instalación. El siguiente comando descarga el código desde
   GitHub:

   ```bash
   git clone https://github.com/dareyes-87/proyecto_muni.git
   cd proyecto_muni
   ```

3. Crear el archivo `.env` a partir de la plantilla versionada. El siguiente comando copia la
   plantilla (en PowerShell se usa `Copy-Item .env.example .env`):

   ```bash
   cp .env.example .env
   ```

4. Editar `.env` y definir, como mínimo, `DB_PASSWORD`, `JWT_SECRET` y `ADMIN_INITIAL_PASSWORD`
   según la Tabla 24 de la sección 7.3. El siguiente comando genera una cadena aleatoria apta para
   `JWT_SECRET`, como sugiere `.env.example`:

   ```bash
   openssl rand -hex 32
   ```

5. Construir las imágenes y levantar los servicios en segundo plano. El siguiente comando usa la
   composición de producción:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

6. Verificar que los cuatro contenedores (`farmag_db`, `farmag_api`, `farmag_web` y `farmag_backup`)
   estén en ejecución. El siguiente comando muestra su estado y los puertos publicados:

   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

7. Revisar el resultado del arranque en `backups/ESTADO_ARRANQUE.txt` y realizar las verificaciones de
   la sección 7.4.3.

El comentario de cabecera de `docker-compose.prod.yml` indica además una carga inicial que se ejecuta
una sola vez con `docker compose -f docker-compose.prod.yml run --rm api npm run prisma:seed`. El
script de arranque del backend ya ejecuta esa carga en cada inicio (sección 7.4.1), por lo que el paso
no es necesario en una instalación nueva.

El procedimiento anterior es el que los archivos del repositorio recomiendan; no describe la
instalación existente. Según la configuración, la instalación de la farmacia usa `docker-compose.yml`
(sección 7.5); el dato se deduce del mecanismo de actualización y no se comprobó en el servidor. El
modo de ejecución (`FRONTEND_TARGET` y `NODE_ENV`) y el puerto de acceso no están confirmados; los
valores por defecto de ese archivo son los del modo de desarrollo. [COMPLETAR: fecha de instalación y
personas que la realizaron].

## 7.3 Configuración

La configuración del sistema se define en el archivo `.env` de la carpeta de instalación, que Docker
Compose lee al levantar los servicios. Ese archivo está excluido del control de versiones; la
plantilla `.env.example` sí está versionada y no debe contener secretos reales. En la Tabla 24 se
describen las variables que lee la composición de producción.

Tabla 24.
Variables de entorno de la composición de producción

| Variable | Obligatoria | Propósito | Valor recomendado o formato |
|----------|-------------|-----------|-----------------------------|
| `DB_PASSWORD` | Sí | Contraseña de PostgreSQL; la usan los servicios `db`, `api` y `backup` | Contraseña propia, larga y aleatoria, distinta del marcador de `.env.example` |
| `JWT_SECRET` | Sí | Clave con la que la API firma y verifica los tokens de sesión | Cadena aleatoria de al menos 32 caracteres; el backend advierte si tiene menos de 16 o si es un valor de ejemplo |
| `DB_USER` | No | Usuario de PostgreSQL | Si se omite, se usa el valor por defecto del archivo de Compose |
| `DB_NAME` | No | Nombre de la base de datos | Si se omite, se usa el valor por defecto del archivo de Compose |
| `JWT_EXPIRES_IN` | No | Vigencia del token de sesión | Duración en el formato de `jsonwebtoken`; por defecto, `8h` |
| `ADMIN_USERNAME` | No | Nombre del administrador que se crea en la primera carga | Por defecto, `admin` |
| `ADMIN_INITIAL_PASSWORD` | No | Contraseña del administrador inicial; solo se usa si ese usuario todavía no existe | Al menos 8 caracteres y fuera de la lista de valores prohibidos del seed. Si se deja vacía, se genera una contraseña aleatoria (sección 7.4.2) |
| `ADMIN_EMAIL` | No | Correo del administrador inicial | Dirección de correo o vacío |
| `CORS_ORIGIN` | No | Orígenes autorizados para peticiones desde otro origen | Lista separada por comas con el formato `http://<dirección IP>`; puede quedar vacía, porque el frontend llega a la API por el mismo origen |
| `BACKUP_INTERVAL_HOURS` | No | Horas entre respaldos periódicos | Número entero; por defecto, 12 |
| `BACKUP_KEEP_DAYS` | No | Días que se conservan los respaldos periódicos | Número entero; por defecto, 14 |

Fuente: Elaboración propia con base en `docker-compose.prod.yml`, `.env.example`,
`backend/src/config/env.ts` y `backend/prisma/seed.ts`.

En la composición de producción, `NODE_ENV`, el *target* del backend y el del frontend tienen valores
fijos (`production`), por lo que las variables `NODE_ENV`, `BACKEND_TARGET` y `FRONTEND_TARGET` del
archivo `.env` no la afectan. Tampoco se pasan a sus contenedores `SEED_DEMO`, `STRICT_SECRETS` ni
`LAN_IP`. Las variables `PREDEPLOY_BACKUP_DIR` y `PREDEPLOY_BACKUP_KEEP`, que lee el script de
arranque, no se definen en ninguno de los dos archivos de Compose y conservan sus valores por defecto
(`/app/backups` y 10).

La variable `STRICT_SECRETS` controla la reacción del backend ante secretos de ejemplo. Cuando
`NODE_ENV` es `production` y `JWT_SECRET` es un valor de ejemplo o tiene menos de 16 caracteres, o la
contraseña de la base es un valor de ejemplo, el backend escribe un aviso en la consola y en
`backups/ESTADO_ARRANQUE.txt` y arranca de todos modos. Con `STRICT_SECRETS=true`, en cambio, el
backend no arranca. El comportamiento por defecto se eligió porque el servidor se actualiza solo y
nadie puede corregir su `.env` en sitio (`backend/src/config/env.ts`). Esta variable solo tiene efecto
con `docker-compose.yml`, que es el único archivo que la pasa al contenedor `api`, y solo cuando el
`.env` fija además `NODE_ENV=production`. `docker-compose.prod.yml` no la pasa; en su lugar exige que
`DB_PASSWORD` y `JWT_SECRET` estén definidas, aunque no comprueba que sean distintas de los valores de
ejemplo.

La variable `CORS_ORIGIN` define la lista de orígenes desde los que un navegador puede llamar a la API
desde otra página. Si la lista está vacía, en producción se desactiva el acceso desde otros orígenes y,
en desarrollo, se acepta cualquier origen (`backend/src/server.ts`). Solo `docker-compose.prod.yml` la
pasa al contenedor `api`; con `docker-compose.yml`, definirla en `.env` no tiene efecto (hallazgo H-40).
En consecuencia, ninguno de los dos archivos permite usar a la vez `STRICT_SECRETS` y `CORS_ORIGIN`.

## 7.4 Puesta en marcha

### 7.4.1 Secuencia de arranque del backend

Los dos *targets* del backend arrancan con el script `backend/docker-entrypoint.sh`, que sustituyó al
arranque anterior con `prisma db push --accept-data-loss` (hallazgo H-05, resuelto). Cada paso queda
registrado en la consola del contenedor y en `backups/ESTADO_ARRANQUE.txt`, que se reescribe en cada
arranque. La Tabla 25 presenta la secuencia.

Tabla 25.
Secuencia de arranque del backend

| Paso | Acción | Comportamiento ante un fallo |
|------|--------|------------------------------|
| 1. Espera de la base | Consulta la base de datos hasta 60 veces, cada 2 segundos | Si no responde, registra el error y arranca la API sin tocar el esquema |
| 2. Respaldo previo | Si la base ya tiene tablas, genera `backups/predeploy_<fecha>.dump` con `pg_dump`, lo verifica con `pg_restore -l` y conserva los 10 más recientes. En una base vacía se omite | Si el respaldo falla, registra "SIN RESPALDO" y no aplica ningún cambio de esquema |
| 3. Línea base | Solo en una base creada con el antiguo `db push` y sin historial de migraciones: si coincide con `schema.prisma`, la registra como migración `0_init`; si no, intenta cambios que no borran datos y vuelve a comparar | Si alinearla requiere borrar datos, no lo hace y registra "ATENCION" |
| 4. Migraciones | Aplica las migraciones versionadas de `prisma/migrations/` con `prisma migrate deploy` | Registra el error y la API arranca con el esquema que había |
| 5. Carga inicial | Ejecuta el seed, que es idempotente: crea el administrador inicial si no existe y las categorías, ubicaciones y umbrales solo si sus tablas están vacías | Registra "AVISO: el seed falló" y continúa |
| 6. Arranque de la API | `node dist/server.js` si `NODE_ENV` es `production` y existe el código compilado; si no, `tsx watch` | — |

Fuente: Elaboración propia con base en `backend/docker-entrypoint.sh` y `docs/DESPLIEGUE.md`.

Ningún paso del arranque borra datos por su cuenta: ante un fallo, la API se levanta con el esquema
existente y el problema queda anotado en `ESTADO_ARRANQUE.txt`. Al iniciar, la API programa además la
tarea diaria de vencimientos y la ejecuta una vez.

### 7.4.2 Cuenta inicial del administrador

El sistema no tiene una contraseña de administrador fija en el código (hallazgo H-002 de los informes
de seguridad del equipo). En la primera carga, el seed crea un usuario con rol `ADMIN` y el nombre de
`ADMIN_USERNAME`, y toma su contraseña de una de dos fuentes:

1. Si `ADMIN_INITIAL_PASSWORD` está definida, se usa ese valor. Debe tener al menos 8 caracteres y no
   puede ser uno de los valores comunes que el seed prohíbe. Si no cumple esas reglas, el seed termina
   con error antes de crear el administrador, las categorías, las ubicaciones y los umbrales; el
   arranque continúa y el sistema queda sin una cuenta con la que iniciar sesión hasta corregir la
   variable y reiniciar (hallazgo H-41).
2. Si la variable está vacía, el seed genera una contraseña aleatoria y la muestra una sola vez en el
   registro del contenedor `api`, dentro de un bloque titulado "CREDENCIAL INICIAL DEL ADMINISTRADOR".
   Esa contraseña permanece legible para quien tenga acceso a Docker en el servidor mientras se
   conserve el registro del contenedor (hallazgo H-39).

Si el administrador ya existe, el seed no modifica su contraseña. El siguiente comando muestra el
bloque con la contraseña generada, cuando se usó la segunda opción:

```bash
docker compose -f docker-compose.prod.yml logs api | grep -A4 "CREDENCIAL INICIAL"
```

Se recomienda cambiar la contraseña inicial en el primer acceso. El sistema no obliga a hacerlo ni
ofrece a cada usuario un cambio de su propia contraseña; el equipo decidió que solo el ADMIN
restablezca contraseñas (R-11). El cambio se realiza desde la página de gestión de usuarios con la
función de restablecer contraseña, reservada al rol `ADMIN`, que exige un mínimo de 6 caracteres.

Lo anterior corresponde al seed actual. La instalación de la farmacia se hizo antes del 7 de octubre
de 2026 (commit `254d0f8`), cuando el seed creaba el usuario `admin` con una contraseña fija, la
cual figura en el historial público del repositorio; como el seed no modifica a un administrador que
ya existe, esa contraseña sigue vigente si nadie la cambió (hallazgo H-52, de prioridad crítica). La
acción inmediata, que no requiere acceso al servidor, es que la persona que opera la farmacia
restablezca la contraseña de `admin` desde la página de gestión de usuarios.

### 7.4.3 Verificación posterior

Una vez levantados los servicios, la instalación se verifica en tres pasos:

1. Comprobar que la API responde. En producción la API solo escucha en `127.0.0.1`, por lo que la
   consulta se hace desde el propio servidor; la respuesta incluye `"status":"ok"` y el entorno, que
   debe ser `production`:

   ```bash
   curl http://127.0.0.1:3000/api/health
   ```

2. Abrir en el navegador de un equipo cliente la dirección `http://<dirección IP del servidor>` y
   confirmar que se muestra la pantalla de inicio de sesión. La misma ruta `/api/health` responde a
   través de nginx en esa dirección.
3. Iniciar sesión con la cuenta del administrador inicial y confirmar el acceso al tablero principal.

## 7.5 Actualización del sistema

Según `docs/DESPLIEGUE.md`, el equipo de la municipalidad ejecuta el script `auto-update.cmd` cada 30
minutos. El script realiza `git pull origin main` y, si hubo cambios, `docker compose up -d --build`.
Todo lo que se integra a `main` queda en producción en un máximo de 30 minutos. El script no está
versionado en el repositorio.

El mecanismo tiene dos riesgos. El primero es que un cambio integrado a `main` llega a producción sin
intervención de nadie y sin revisión en sitio, y el servidor no tiene acceso remoto para corregir un
error una vez aplicado. El segundo es que el comando `docker compose up -d --build`, sin la opción
`-f`, usa `docker-compose.yml`, cuyo modo por defecto es el de desarrollo (hallazgo H-36). Si el `.env`
del servidor no fija las variables correspondientes, la instalación corre con `tsx watch`, el servidor
de Vite, `NODE_ENV=development` y los secretos por defecto del archivo, lo que mantiene abiertos los
hallazgos H-03 (secretos por defecto), H-07 (detalle de errores internos en las respuestas) y H-17
(CORS que acepta cualquier origen). El endurecimiento de `docker-compose.prod.yml` no se aplica
mientras el mecanismo no use ese archivo. El uso de `docker-compose.yml` en el servidor se deduce de
esta configuración y no se comprobó; el modo y el puerto de acceso tampoco están confirmados.
[COMPLETAR: contenido de `auto-update.cmd`].

Se asume que los secretos del servidor no se cambiaron, porque el `.env` se creó a partir de
`.env.example` y nadie del equipo ha accedido después al equipo (R-25). En esas condiciones,
`JWT_SECRET` es un riesgo abierto: el valor de ejemplo es público en el repositorio y permite firmar
desde cualquier equipo de la red local un token con rol `ADMIN`. `DB_PASSWORD` se considera un riesgo
aceptado, porque PostgreSQL solo escucha en `127.0.0.1`. La situación se puede comprobar sin acceso
técnico: con secretos de ejemplo en producción, el arranque escribe un aviso sobre `JWT_SECRET` en
`backups/ESTADO_ARRANQUE.txt`.

Como trabajo posterior a la entrega, el equipo propone dos cambios para la configuración de
producción en `docker-compose.yml` (lote 2 del plan de correcciones): que el script de arranque
genere un `JWT_SECRET` aleatorio y lo guarde en un volumen cuando detecte el valor de ejemplo, lo que
cierra las sesiones abiertas una sola vez sin impedir el arranque, y que nginx se publique en los
puertos 80 y 5173, para que el personal conserve el acceso con cualquiera de las dos direcciones
mientras el puerto actual no esté confirmado.

Las precauciones que el repositorio establece frente a estos riesgos son las siguientes:

1. Pruebas antes de integrar: los cambios se llevan a `main` mediante *pull request* y el workflow
   "Despliegue seguro" reproduce la actualización del servidor con datos de prueba antes de la
   integración (sección 6.3.3). Para que el workflow bloquee una integración fallida, debe configurarse
   en GitHub la protección de la rama `main` descrita en `docs/DESPLIEGUE.md`. Esa protección no se
   confirmó, por lo que el workflow es el procedimiento acordado por el equipo y no un bloqueo técnico.
2. Respaldo previo automático: cada arranque del backend, y por tanto cada actualización, genera un
   respaldo verificado antes de tocar el esquema (sección 7.4.1).
3. Migraciones revisadas: un cambio de esquema solo llega al servidor como migración versionada. El
   workflow falla si `schema.prisma` cambia sin migración y advierte si una migración elimina o
   transforma datos. Una migración ya integrada no se edita; se corrige con una nueva.

El repositorio no documenta un procedimiento para volver a una versión anterior. Dado que el servidor
aplica el contenido de `main`, la vuelta atrás del código consiste en integrar en `main`, mediante un
*pull request*, un commit que revierta el cambio (`git revert`), que el servidor aplicará en la
siguiente ejecución. `prisma migrate deploy` solo aplica migraciones pendientes y no deshace las ya
aplicadas, por lo que un cambio de esquema se corrige con una migración nueva o, si hubo pérdida de
datos, restaurando el respaldo previo correspondiente (sección 7.6.2).

## 7.6 Respaldo y restauración

### 7.6.1 Respaldos automáticos

El sistema genera dos tipos de respaldo de la base de datos, ambos con `pg_dump` en formato
personalizado y guardados en la carpeta `backups/` de la instalación. La Tabla 26 los compara.

Tabla 26.
Respaldos automáticos de la base de datos

| Aspecto | Respaldo periódico | Respaldo previo al arranque |
|---------|--------------------|-----------------------------|
| Origen | Servicio `backup`, basado en la imagen `postgres:16-alpine` | Script `docker-entrypoint.sh` del contenedor `api` |
| Frecuencia | Al arrancar el servicio y luego cada `BACKUP_INTERVAL_HOURS` horas (12 por defecto) | En cada arranque del backend con una base que ya tiene datos, incluidas las actualizaciones y los reinicios del equipo |
| Nombre del archivo | `farmag_AAAAMMDD_HHMMSSZ.dump` | `predeploy_AAAAMMDD_HHMMSSZ.dump` |
| Retención | Se borran los de más de `BACKUP_KEEP_DAYS` días (14 por defecto), hasta 28 copias | Se conservan los 10 más recientes (`PREDEPLOY_BACKUP_KEEP`) |
| Verificación | El archivo se acepta solo si `pg_restore -l` lo lee y no está vacío; si no, se descarta | La misma verificación |
| Ante un fallo | Registra `ERROR`, reintenta a los 5 minutos y no borra los respaldos válidos | Registra "SIN RESPALDO" y no aplica cambios de esquema |
| Archivos de estado | `ULTIMO_RESPALDO.txt` (`OK` o `ERROR` con la fecha) e `historial_respaldos.log` (una línea por intento, con el tamaño si fue correcto) | `ESTADO_ARRANQUE.txt` |

Fuente: Elaboración propia con base en `docker-compose.prod.yml`, `backend/docker-entrypoint.sh` y
`docs/RESPALDOS.md`.

La hora del nombre de los archivos está en UTC, seis horas por delante de la hora de Guatemala. Los
respaldos contienen datos personales de los beneficiarios, las dispensaciones y la bitácora de
auditoría, por lo que `docs/RESPALDOS.md` indica tratarlos como información sensible, no subirlos a
servicios públicos ni enviarlos por correo o chat. La carpeta `backend/uploads/`, con las fotografías
de medicamentos y de evidencia de las dispensaciones, no forma parte de estos respaldos.

### 7.6.2 Restauración

La restauración reemplaza las tablas actuales por las del respaldo, por lo que todo lo registrado
después de esa copia se pierde. `docs/RESPALDOS.md` la reserva para casos de pérdida o daño de datos e
indica guardar antes una copia del estado actual si todavía es legible. Los respaldos periódicos y los
previos se restauran con el mismo procedimiento, desde la carpeta de instalación:

1. Detener la API para que no se registren operaciones durante la restauración. El siguiente comando
   detiene solo ese servicio:

   ```bash
   docker compose stop api
   ```

2. Copiar el archivo de respaldo al contenedor de la base de datos. El siguiente comando usa
   `docker cp`, porque las redirecciones `<` y `>` de PowerShell corrompen los datos binarios:

   ```bash
   docker cp ./backups/farmag_AAAAMMDD_HHMMSSZ.dump farmag_db:/tmp/restaurar.dump
   ```

3. Restaurar el respaldo. El siguiente comando elimina y recrea los objetos de la base con el
   contenido del archivo; `<DB_USER>` y `<DB_NAME>` se sustituyen por los valores del `.env`:

   ```bash
   docker exec farmag_db pg_restore -U <DB_USER> -d <DB_NAME> --clean --if-exists --no-owner /tmp/restaurar.dump
   ```

4. Eliminar la copia temporal del contenedor. El siguiente comando borra el archivo copiado:

   ```bash
   docker exec farmag_db rm /tmp/restaurar.dump
   ```

5. Volver a iniciar la API. El siguiente comando la levanta de nuevo:

   ```bash
   docker compose start api
   ```

Los comandos de los pasos 1 y 5 corresponden a `docker-compose.yml`, que es el archivo que usa la guía.
En una instalación con la composición de producción se agrega la opción
`-f docker-compose.prod.yml`. Un respaldo refleja el esquema de la base en el momento en que se hizo:
si un cambio posterior eliminó columnas o tablas, el respaldo las contiene y el esquema actual no.
Al reiniciar la API, el script de arranque saca un nuevo respaldo previo y aplica las migraciones pendientes.

### 7.6.3 Copias fuera del servidor

Los respaldos se guardan en el mismo disco que la base de datos. Protegen frente a un error de
software o un borrado de datos, pero no frente a la falla o pérdida del equipo. `docs/RESPALDOS.md`
recomienda copiar la carpeta `backups/` y la carpeta `backend/uploads/` a otro equipo o a un disco
externo de forma periódica y guardar esas copias en un lugar de acceso restringido. Por decisión del
equipo, el servidor no cuenta con un disco adicional para respaldos (`docs/HERRAMIENTAS_IA.md`).

En la farmacia no existe actualmente ninguna copia fuera del servidor (R-30): una falla del disco
perdería a la vez la base de datos, sus respaldos y las fotografías. Queda como tarea pendiente una
copia semanal de las carpetas `backups/` y `backend/uploads/` a una memoria USB cifrada, a cargo del
administrador municipal.

## 7.7 Mantenimiento y monitoreo

### 7.7.1 Medios de verificación

El sistema no incluye una herramienta de monitoreo ni de alertas; su estado se verifica con los
siguientes medios:

1. Verificaciones de salud de Docker: el servicio `db` comprueba la base con `pg_isready` cada 5
   segundos en ambos archivos de Compose. El servicio `api` consulta `/api/health` cada 30 segundos
   solo en `docker-compose.yml`; en la composición de producción no tiene esa verificación. Los
   servicios `web` y `backup` no tienen ninguna. El estado se consulta con
   `docker compose -f docker-compose.prod.yml ps`.
2. Registros de los contenedores: cada servicio escribe en su salida estándar y Docker conserva el
   registro según su configuración por defecto, porque los archivos de Compose no definen la clave
   `logging`. El siguiente comando muestra en tiempo real el registro de un servicio (`db`, `api`,
   `web` o `backup`):

   ```bash
   docker compose -f docker-compose.prod.yml logs -f api
   ```

3. `backups/ESTADO_ARRANQUE.txt`: resultado del último arranque del backend. `docs/DESPLIEGUE.md`
   describe la acción ante cada mensaje: "ATENCION" (la base no coincide con el esquema y alinearla
   borraría datos; requiere una migración explícita), "AVISO" sobre secretos (el servidor corre en
   producción con secretos de ejemplo), "SIN RESPALDO" (no se pudo escribir en `backups/` o falló
   `pg_dump`) y "falló migrate deploy" (una migración dio error y Prisma no aplicará otras hasta
   resolverla).
4. `backups/ULTIMO_RESPALDO.txt` e `historial_respaldos.log`: resultado del último respaldo periódico
   y registro de todos los intentos.

### 7.7.2 Tareas periódicas

La Tabla 27 reúne las tareas de mantenimiento que se derivan de las guías del repositorio. Las tareas
que el sistema ejecuta por sí mismo se indican como automáticas; en las demás, la frecuencia y el
responsable que las guías no definen se indican así.

Tabla 27.
Tareas periódicas de mantenimiento

| Tarea | Frecuencia | Responsable | Cómo se verifica |
|-------|------------|-------------|------------------|
| Respaldo periódico de la base | Cada 12 horas (configurable) | Automática (servicio `backup`) | `ULTIMO_RESPALDO.txt` dice `OK` con una fecha reciente |
| Respaldo previo al arranque | En cada actualización o reinicio | Automática (`docker-entrypoint.sh`) | Existe un `predeploy_*.dump` reciente y `ESTADO_ARRANQUE.txt` registra "respaldo previo OK" |
| Marcado de lotes vencidos y limpieza de tokens de captura vencidos | Diaria a las 00:05 y al arrancar la API | Automática (tarea programada de la API) | Los lotes vencidos aparecen con estado `VENCIDO` en Inventario |
| Actualización desde `main` | Cada 30 minutos | Automática (`auto-update.cmd`) | `ESTADO_ARRANQUE.txt` sin "ERROR", "ATENCION" ni "SIN RESPALDO" |
| Revisión del estado del arranque y de los respaldos | No definida | No definido | Lectura de `ESTADO_ARRANQUE.txt`, `ULTIMO_RESPALDO.txt` e `historial_respaldos.log` |
| Copia de `backups/` y `backend/uploads/` fuera del servidor (pendiente: no se realiza) | Semanal | Administrador municipal | Fecha del último respaldo presente en la memoria USB cifrada |
| Revisión del espacio libre en disco | No definida | No definido | Espacio libre suficiente para los respaldos, las fotografías y el crecimiento de la base |
| Revisión de las fotografías de dispensación acumuladas | No definida | No definido | Tamaño de `backend/uploads/dispensaciones/`; los archivos no se borran al corregir una dispensación |

Fuente: Elaboración propia con base en `docs/RESPALDOS.md`, `docs/DESPLIEGUE.md`,
`docker-compose.prod.yml` y `backend/docker-entrypoint.sh`.

## 7.8 Capacitación y entrega al usuario

La capacitación impartida y la entrega formal del sistema a la municipalidad no se documentaron como
parte de este trabajo.

El uso de cada pantalla del sistema se describe en el manual de usuario, que se incluye como Anexo A de
este documento.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa. La letra "c"
> continúa la serie de Docker Inc. (s.f.-a y s.f.-b) del capítulo II.

Docker Inc. (s.f.-c). *Docker Plans FAQs*. Recuperado el 20 de octubre de 2026 de
https://www.docker.com/pricing/faq/

Microsoft. (s.f.). *Finalización del soporte de Windows 10, Windows 8.1 y Windows 7*. Recuperado el
21 de octubre de 2026 de https://www.microsoft.com/es-es/windows/end-of-support
