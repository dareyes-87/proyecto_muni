# CAPÍTULO VII

# 7 TRANSICIÓN

La fase de Transición comprende las actividades que llevan el sistema del entorno de desarrollo a la
operación en la Farmacia Municipal de Gualán. Este capítulo describe los requisitos del servidor y de
los equipos cliente, la instalación y el despliegue, la configuración, los respaldos y su
restauración, los riesgos de la instalación actual, el mantenimiento y la entrega al usuario. El
contenido se basa en los archivos de configuración y las guías de despliegue y respaldos del
repositorio; la configuración del equipo instalado en la farmacia no consta en el repositorio, y lo
que no se verificó se indica en cada caso. La disposición de los contenedores, puertos, volúmenes y
clientes se representa en el diagrama de despliegue (véase la Figura 27).

## 7.1 Requisitos del sistema

El sistema se ejecuta como un conjunto de contenedores de Docker, por lo que el servidor no requiere
instalar Node.js, PostgreSQL ni Nginx de forma directa. La Tabla 22 resume los requisitos del
servidor.

Tabla 22.
Requisitos técnicos del servidor

| Aspecto | Requisito | Equipo instalado en la farmacia |
|---------|-----------|---------------------------------|
| Sistema operativo | Cualquiera capaz de ejecutar contenedores Linux con Docker | Windows; según el equipo, casi con seguridad Windows 10 (no comprobado) |
| Software | Docker con Docker Compose, y Git para la instalación y la actualización automática | Según el equipo, casi con seguridad Docker Desktop (no comprobado) |
| Memoria, disco y procesador | El repositorio no fija mínimos. El disco aloja la base de datos, los respaldos, las fotografías y las imágenes de Docker | No verificado |
| Red | Dirección IP en la red local accesible desde los equipos cliente y el teléfono de captura; acceso a Internet para la actualización automática y la consulta de OpenFDA | No verificado |

Fuente: Elaboración propia con base en los archivos de configuración y las guías de despliegue y
respaldos del repositorio.

Los usuarios acceden desde un navegador web, sin instalar programas. Los dispositivos de apoyo son
un equipo de escritorio conectado a la red local, un lector de código de barras USB configurado en
modo teclado y un teléfono celular conectado a la misma red para la captura de evidencia. Como el
enlace del código QR se forma con la dirección desde la que se accede al sistema, el equipo de
escritorio debe entrar por la dirección IP de la red local y no por `localhost`.

## 7.2 Instalación y despliegue

El repositorio contiene dos archivos de composición: el de desarrollo, que se usa por defecto, y el
de producción, que es el recomendado para el servidor porque exige definir los secretos, ejecuta el
código compilado, sirve la interfaz con Nginx y publica hacia la red solo el puerto 80. El
procedimiento para una instalación nueva es el siguiente:

1. Instalar Docker con Docker Compose y Git en el servidor.
2. Clonar el repositorio en la carpeta de instalación:

   ```bash
   git clone https://github.com/dareyes-87/proyecto_muni.git
   cd proyecto_muni
   ```

3. Crear el archivo de variables a partir de la plantilla (en PowerShell, `Copy-Item .env.example .env`):

   ```bash
   cp .env.example .env
   ```

4. Editar `.env` y definir las variables de la Tabla 24. El siguiente comando genera una cadena
   aleatoria apta para la clave de firma:

   ```bash
   openssl rand -hex 32
   ```

5. Construir las imágenes y levantar los servicios con la composición de producción:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

6. Verificar que los cuatro contenedores estén en ejecución:

   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

7. Abrir en un equipo cliente la dirección `http://<dirección IP del servidor>`, confirmar que se
   muestra la pantalla de inicio de sesión e iniciar sesión con la cuenta del administrador inicial.

Al arrancar, el backend saca un respaldo de la base si ya tiene datos, aplica solo las migraciones
pendientes, crea el administrador inicial si no existe y registra el resultado en el archivo
`backups/ESTADO_ARRANQUE.txt`. Ningún paso borra datos: ante un fallo, la API se levanta con el
esquema existente y el problema queda anotado en ese archivo. Si no se definió una contraseña
inicial, el sistema genera una aleatoria y la muestra una sola vez en el registro del contenedor de
la API, de donde se obtiene con el siguiente comando:

```bash
docker compose -f docker-compose.prod.yml logs api | grep -A4 "CREDENCIAL INICIAL"
```

El sistema no obliga a cambiar la contraseña inicial; el Administrador la restablece desde la página
de gestión de usuarios.

Una vez instalado, el sistema se actualiza solo: según la guía de despliegue, el servidor de la
municipalidad descarga cada 30 minutos los cambios de la rama principal y, si los hay, reconstruye
los contenedores. Lo que se integra a `main` llega a producción sin intervención en sitio, por lo que
cada cambio se prueba antes en el workflow de integración continua (sección 6.3), cada arranque genera
un respaldo previo y los cambios de esquema solo llegan como migraciones versionadas. Para volver a
una versión anterior se integra un cambio que revierta el problemático; un cambio de esquema se
corrige con una migración nueva o restaurando el respaldo previo.

La instalación existente se hizo a más tardar el 25 de septiembre de 2026; no constan la fecha exacta
ni quiénes la realizaron, y su modo de ejecución se trata en la sección 7.5.

## 7.3 Configuración

La configuración se define en el archivo `.env` de la carpeta de instalación, que está excluido del
control de versiones. La Tabla 24 describe las variables que deben definirse; las demás tienen
valores por defecto adecuados.

Tabla 24.
Variables de entorno que deben definirse en la instalación

| Variable | Obligatoria | Propósito | Valor recomendado |
|----------|-------------|-----------|-------------------|
| `DB_PASSWORD` | Sí | Contraseña de la base de datos | Contraseña propia, larga y aleatoria, distinta del valor de la plantilla |
| `JWT_SECRET` | Sí | Clave con la que la API firma los tokens de sesión | Cadena aleatoria de al menos 32 caracteres |
| `ADMIN_INITIAL_PASSWORD` | Recomendada | Contraseña del administrador inicial; solo se usa si ese usuario todavía no existe | Al menos 8 caracteres y no un valor común. Si se deja vacía, se genera una aleatoria |

Fuente: Elaboración propia con base en la composición de producción y la plantilla de variables.

La composición de producción no arranca si faltan `DB_PASSWORD` o `JWT_SECRET`, pero no comprueba que
sean distintas de los valores de ejemplo; en ese caso el backend escribe un aviso en
`ESTADO_ARRANQUE.txt` y arranca de todos modos.

## 7.4 Respaldo y restauración

El sistema genera dos tipos de respaldo de la base de datos en la carpeta `backups/`: uno periódico,
cada 12 horas, que se conserva 14 días, y uno previo a cada arranque del backend, del que se
conservan los 10 más recientes. Cada respaldo se acepta solo si puede leerse; el resultado del último
respaldo periódico queda en `backups/ULTIMO_RESPALDO.txt`. Los respaldos contienen datos personales
de los beneficiarios y deben tratarse como información sensible. Las fotografías de la carpeta
`backend/uploads/` no forman parte de estos respaldos.

La restauración reemplaza las tablas actuales por las del respaldo, por lo que todo lo registrado
después de esa copia se pierde; se reserva para casos de pérdida o daño de datos. El procedimiento,
desde la carpeta de instalación, es el siguiente (con la composición de producción se agrega
`-f docker-compose.prod.yml` en los pasos 1 y 4):

1. Detener la API:

   ```bash
   docker compose stop api
   ```

2. Copiar el respaldo al contenedor de la base de datos (con `docker cp`, porque las redirecciones de
   PowerShell corrompen los datos binarios):

   ```bash
   docker cp ./backups/farmag_AAAAMMDD_HHMMSSZ.dump farmag_db:/tmp/restaurar.dump
   ```

3. Restaurar el respaldo, sustituyendo `<DB_USER>` y `<DB_NAME>` por los valores de `.env`:

   ```bash
   docker exec farmag_db pg_restore -U <DB_USER> -d <DB_NAME> --clean --if-exists --no-owner /tmp/restaurar.dump
   ```

4. Volver a iniciar la API:

   ```bash
   docker compose start api
   ```

## 7.5 Riesgos de la instalación actual

La configuración de la instalación de la farmacia no se ha comprobado en el servidor, porque el
equipo de trabajo no tiene acceso a él. Con lo que se deduce de los archivos del repositorio, la
instalación presenta los siguientes riesgos:

1. Secretos por defecto. Se asume que los secretos del servidor no se cambiaron, porque el archivo de
   variables se creó a partir de la plantilla y nadie del equipo ha accedido después al equipo. La
   clave de firma de ejemplo es pública en el repositorio y permite firmar desde cualquier equipo de
   la red local un token con rol de Administrador.
2. Modo de desarrollo. La actualización automática usa el archivo de composición por defecto, cuyo
   modo es el de desarrollo salvo que el archivo de variables lo cambie. En ese modo las respuestas de
   error muestran detalles internos, la API acepta peticiones de cualquier origen y el endurecimiento
   de la composición de producción no se aplica. El modo y el puerto de acceso no están confirmados.
3. Windows 10 y licencia de Docker Desktop. Según el equipo, el servidor ejecuta casi con seguridad
   Docker Desktop sobre Windows 10. Los términos de Docker establecen que las entidades de gobierno no
   pueden usar Docker Desktop sin una suscripción pagada (Docker Inc., s.f.-c), y Windows 10 no tiene
   soporte de Microsoft desde el 14 de octubre de 2025 (Microsoft, s.f.), por lo que ya no recibe
   actualizaciones de seguridad. Las salidas son adquirir la suscripción o migrar a Docker Engine,
   que es gratuito, en un equipo con Linux; esta segunda opción atiende ambos riesgos a la vez.
4. Sin copia externa de respaldos. Los respaldos se guardan en el mismo disco que la base de datos y,
   por decisión del equipo, el servidor no tiene un disco adicional. En la farmacia no existe ninguna
   copia fuera del servidor, por lo que una falla del disco perdería a la vez la base de datos, sus
   respaldos y las fotografías. Queda pendiente una copia semanal de las carpetas `backups/` y
   `backend/uploads/` a una memoria USB cifrada, a cargo del administrador municipal.

Al revisar la instalación se detectó además un riesgo crítico que ya se resolvió. La instalación es
anterior al 7 de octubre de 2026, cuando la carga inicial creaba el usuario `admin` con una contraseña
fija que figura en el historial público del repositorio, y la carga inicial actual no cambia la
contraseña de un administrador que ya existe. Mientras esa contraseña estuvo vigente, cualquier
persona de la red local podía entrar al sistema como Administrador. El 21 de octubre de 2026 el
personal de la farmacia la cambió desde la página de gestión de usuarios, sin cambios en el código ni
acceso al servidor; el cambio lo confirmó el personal y no se comprobó en el servidor.

## 7.6 Mantenimiento

El sistema no incluye una herramienta de monitoreo ni de alertas. Los respaldos, la actualización
desde la rama principal, el marcado diario de lotes vencidos y la limpieza de los enlaces de captura
vencidos se ejecutan de forma automática. El estado se verifica con el estado de los contenedores,
sus registros y los archivos `ESTADO_ARRANQUE.txt` y `ULTIMO_RESPALDO.txt`, cuyos mensajes de error,
atención o falta de respaldo indican la acción que corresponde según la guía de despliegue. Las
guías no definen la frecuencia ni el responsable de revisar esos archivos, el espacio libre en disco
y el crecimiento de las fotografías de dispensación, que no se borran nunca.

## 7.7 Capacitación y entrega al usuario

La capacitación impartida y la entrega formal del sistema a la municipalidad no se documentaron como
parte de este trabajo. El uso de cada pantalla del sistema se describe en el manual de usuario, que
se incluye como Anexo A de este documento.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa. La letra "c"
> continúa la serie de Docker Inc. (s.f.-a y s.f.-b) del capítulo II.

Docker Inc. (s.f.-c). *Docker Plans FAQs*. Recuperado el 20 de octubre de 2026 de
https://www.docker.com/pricing/faq/

Microsoft. (s.f.). *Finalización del soporte de Windows 10, Windows 8.1 y Windows 7*. Recuperado el
21 de octubre de 2026 de https://www.microsoft.com/es-es/windows/end-of-support
