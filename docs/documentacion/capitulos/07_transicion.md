# CAPÍTULO VII

# 7 TRANSICIÓN

La fase de Transición comprende el paso del sistema a su uso real en la Farmacia Municipal de Gualán.
Este capítulo describe los requisitos para instalarlo, la instalación, los respaldos, los riesgos de
la instalación actual y el mantenimiento. La disposición de los equipos se muestra en el diagrama de
despliegue (véase la Figura 27).

## 7.1 Requisitos del sistema

El sistema se instala con Docker, por lo que el servidor no necesita tener instalados por separado
los demás programas. La Tabla 22 resume lo que se requiere.

Tabla 22.
Requisitos del sistema

| Elemento | Requisito |
|----------|-----------|
| Servidor | Un equipo con un sistema operativo capaz de ejecutar Docker, conectado a la red local |
| Programas en el servidor | Docker con Docker Compose, y Git para instalar y actualizar el sistema |
| Red | Una dirección fija en la red local, accesible desde las computadoras y el teléfono, y acceso a Internet para las actualizaciones |
| Equipos de la farmacia | Una computadora con navegador web y un lector de código de barras USB |
| Teléfono | Un teléfono con cámara y navegador, conectado a la misma red, para las fotografías de respaldo |

Fuente: Elaboración propia.

Los usuarios entran al sistema desde el navegador, sin instalar ningún programa. Para que el código
QR funcione en el teléfono, la computadora debe entrar al sistema con la dirección de red del
servidor.

## 7.2 Instalación

El sistema incluye dos configuraciones: una de desarrollo, para el trabajo del equipo, y una de
producción, recomendada para el servidor de la farmacia porque exige claves propias, es más rápida y
no muestra detalles internos ante un error. Una instalación nueva sigue estos pasos:

1. Instalar Docker y Git en el servidor.
2. Descargar el código del sistema desde su repositorio.
3. Crear el archivo de configuración a partir de la plantilla incluida y definir en él las claves
   propias de la instalación: la contraseña de la base de datos, la clave de las sesiones y la
   contraseña inicial del administrador.
4. Poner en marcha el sistema con la configuración de producción.
5. Abrir el sistema desde una computadora de la red, comprobar que aparece la pantalla de inicio de
   sesión y entrar con la cuenta del administrador.
6. Cambiar la contraseña inicial del administrador desde la gestión de usuarios.

Cada vez que arranca, el sistema hace un respaldo de la base de datos, aplica los cambios pendientes
en su estructura y deja anotado el resultado en un archivo de estado. Ningún paso del arranque borra
información.

Una vez instalado, el servidor busca cada 30 minutos si hay una versión nueva y, si la hay, se
actualiza solo. Por eso cada cambio se prueba antes de publicarse, como se explicó en el capítulo 6.

## 7.3 Respaldo y restauración

El sistema genera respaldos de la base de datos de forma automática: uno cada 12 horas, que se
conservan durante 14 días, y uno antes de cada arranque, de los que se guardan los diez más
recientes. Cada respaldo se comprueba al crearlo. Los respaldos contienen datos personales de los
beneficiarios, por lo que deben tratarse como información confidencial. Las fotografías se guardan
en una carpeta aparte y no forman parte de estos respaldos.

Para restaurar un respaldo se detiene el servidor de la aplicación, se carga el respaldo elegido en
la base de datos y se vuelve a poner en marcha. La restauración reemplaza toda la información
actual por la del respaldo, por lo que se reserva para casos de pérdida o daño de datos. El
procedimiento detallado se encuentra en la guía de respaldos del sistema.

## 7.4 Riesgos de la instalación actual

El sistema se instaló en la farmacia antes de que el equipo terminara de preparar la configuración
de producción, y el equipo de desarrollo no tiene acceso al servidor para cambiarla a distancia. Por
eso la instalación actual tiene los siguientes riesgos:

1. Claves de ejemplo. Todo indica que el servidor conserva las claves de ejemplo de la plantilla de
   configuración, que son públicas en el repositorio. Con ellas, alguien con conocimientos técnicos
   dentro de la red podría hacerse pasar por un administrador.
2. Modo de desarrollo. El servidor parece funcionar con la configuración de desarrollo, que ante un
   error muestra detalles internos y es menos restrictiva que la de producción.
3. Windows 10 y licencia de Docker Desktop. Según la información del equipo, el servidor usa Docker
   Desktop sobre Windows 10. Windows 10 ya no recibe actualizaciones de seguridad de Microsoft
   (Microsoft, s.f.), y Docker Desktop requiere una suscripción de pago cuando lo usa una entidad de
   gobierno (Docker Inc., s.f.-c). Ambos problemas se resuelven usando un equipo con Linux y Docker
   Engine, que es gratuito.
4. Respaldos en el mismo disco. Los respaldos se guardan en el mismo disco que la base de datos, y no
   existe una copia fuera del servidor. Una falla del disco haría perder a la vez la información, los
   respaldos y las fotografías.

Durante la revisión de la instalación también se detectó que la cuenta del administrador conservaba
la contraseña inicial con que se creaba en versiones anteriores del sistema, conocida públicamente.
El personal de la farmacia la cambió desde la gestión de usuarios, con lo que ese riesgo quedó
resuelto.

## 7.5 Mantenimiento

Los respaldos, las actualizaciones y el marcado diario de los lotes vencidos se hacen de forma
automática. El sistema deja en archivos de estado el resultado del último arranque y del último
respaldo; conviene revisarlos con regularidad, junto con el espacio libre en disco y el crecimiento
de la carpeta de fotografías, que no se borran.

## 7.6 Capacitación y entrega

El uso de cada pantalla del sistema se describe en el manual de usuario, que se incluye como Anexo A
de este documento.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa.

Docker Inc. (s.f.-c). *Docker Plans FAQs*. Recuperado el 20 de octubre de 2026 de
https://www.docker.com/pricing/faq/

Microsoft. (s.f.). *Finalización del soporte de Windows 10, Windows 8.1 y Windows 7*. Recuperado el
21 de octubre de 2026 de https://www.microsoft.com/es-es/windows/end-of-support
