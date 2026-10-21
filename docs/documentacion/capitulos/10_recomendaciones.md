# RECOMENDACIONES

1. A la municipalidad, con el apoyo del equipo de desarrollo: revisar en sitio la configuración del
   servidor de la farmacia, reemplazar la contraseña de la base de datos y la clave de firma de
   sesiones por valores propios y ejecutar el sistema en modo de producción. Mientras se conserven
   los valores de ejemplo publicados en el repositorio, cualquier equipo de la red local puede firmar
   una sesión de Administrador (H-03 y H-36). Los valores nuevos deben guardarse fuera del
   repositorio.

2. Al administrador municipal: hacer cada semana una copia de las carpetas `backups/` y
   `backend/uploads/` en una memoria USB cifrada que se guarde fuera de la farmacia, y restaurar una
   de esas copias en otro equipo al menos una vez para comprobar que sirve. Hoy los respaldos están
   en el mismo disco que la base de datos.

3. A la municipalidad: sustituir la plataforma del servidor. Windows 10 no recibe actualizaciones de
   seguridad desde el 14 de octubre de 2025 y Docker Desktop requiere una suscripción pagada para
   entidades de gobierno. La opción que atiende ambos riesgos es un equipo con Linux y Docker Engine;
   la migración debe hacerse a partir de un respaldo reciente y con la restauración descrita en el
   capítulo 7.

4. Al equipo de desarrollo: integrar después de la entrega las correcciones programadas en el
   capítulo 8, en el orden de los lotes, empezando por los filtros de fecha de los reportes (H-46) y la
   configuración de producción, siempre con el flujo "Despliegue seguro" aprobado y un respaldo
   previo. Al integrar cada lote, se deben volver a ejecutar los casos de prueba que fallaron por
   esos hallazgos.

5. Al administrador del sistema: una vez habilitados los reportes para el Encargado de Beneficencia
   (lote 7), crear una cuenta de ese rol para el despacho diario y reservar la cuenta de
   Administrador para la gestión de usuarios, la baja de lotes y la exportación de reportes.

6. Al equipo de desarrollo, con el personal de la farmacia: probar en la farmacia la captura de
   evidencia con un teléfono real, entrando al sistema por la dirección IP de la red local, y el
   despacho con el lector de códigos de barras instalado, porque ninguno de los dos se ha verificado
   con el equipo real.

7. A Daniel Reyes, como responsable del repositorio: activar la protección de la rama principal en
   GitHub para que ningún cambio entre sin el flujo "Despliegue seguro" aprobado. Todo lo que se
   integra a esa rama se aplica solo en el servidor de la farmacia en un máximo de 30 minutos.

8. A la municipalidad: designar a una persona responsable de revisar cada semana los archivos
   `ESTADO_ARRANQUE.txt` y `ULTIMO_RESPALDO.txt`, el espacio libre en disco y el crecimiento de las
   fotografías de dispensación, que el sistema no borra, y de actuar según la guía de despliegue
   cuando esos archivos indiquen un error o la falta de un respaldo.
