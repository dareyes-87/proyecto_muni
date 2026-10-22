# RECOMENDACIONES

1. A la municipalidad, con el apoyo del equipo de desarrollo: revisar la configuración del servidor
   de la farmacia, cambiar las claves de ejemplo por claves propias y poner el sistema en modo de
   producción, como se describe en el capítulo 7. Las claves nuevas deben guardarse en un lugar
   seguro.

2. Al responsable del sistema en la municipalidad: hacer cada semana una copia de los respaldos y de
   las fotografías en una memoria USB que se guarde fuera de la farmacia, y probar al menos una vez
   que esa copia se puede restaurar.

3. A la municipalidad: trasladar el sistema a un equipo con Linux y Docker Engine, porque Windows 10
   ya no recibe actualizaciones de seguridad y Docker Desktop requiere una licencia de pago para
   entidades de gobierno. El traslado debe hacerse a partir de un respaldo reciente.

4. Al equipo de desarrollo: aplicar las correcciones planificadas del capítulo 8, empezando por los
   filtros de fecha de los reportes y la configuración de producción, siempre con las pruebas
   automáticas aprobadas y un respaldo previo, y repetir las pruebas que fallaron por esos defectos.

5. Al responsable del sistema: cuando los reportes estén disponibles para el Encargado de
   Beneficencia, crear una cuenta de ese rol para la atención diaria y reservar la de Administrador
   para las tareas de administración.

6. Al equipo de desarrollo, con el personal de la farmacia: probar en la farmacia la toma de
   fotografías con los teléfonos del personal y el uso del lector de código de barras instalado.

7. Al responsable del repositorio del sistema: configurarlo para que ningún cambio se integre sin
   haber pasado las pruebas automáticas, ya que todo lo que se integra se instala solo en el servidor
   de la farmacia.

8. A la municipalidad: designar a una persona que revise cada semana los archivos de estado del
   sistema, el espacio libre en disco y el crecimiento de las fotografías, y que avise al equipo de
   soporte ante cualquier error o falta de respaldo.
