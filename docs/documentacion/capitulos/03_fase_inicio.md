# CAPÍTULO III

# 3 FASE DE INICIO

En la fase de Inicio se definió el problema, se identificó a las personas involucradas y se acordó el
alcance del sistema. Este capítulo presenta la visión del producto, sus usuarios, las necesidades que
atiende, los riesgos del proyecto y su factibilidad.

## 3.1 Visión del producto

La Tabla 4 resume, en el formato del documento de visión de RUP, el problema que se atiende y la
propuesta del sistema.

Tabla 4.
Visión del producto

| Elemento | Descripción |
|----------|-------------|
| El problema de | La falta de un registro digital de las entradas y salidas de medicamentos de la farmacia |
| Afecta a | La municipalidad, que no puede supervisar el uso de los medicamentos donados; a la persona que atiende la farmacia, que no conoce con exactitud las existencias ni los vencimientos; y a los beneficiarios, que dependen de que haya medicamento disponible |
| Cuyo impacto es | Existencias desconocidas, entregas sin registro, pérdidas por vencimiento y dificultad para preparar reportes |
| Para | La Municipalidad de Gualán y el personal de la farmacia de dispensación gratuita |
| El producto | FarmaG, un sistema web de inventario y entrega de medicamentos que funciona en la red local de la farmacia |
| Que | Registra las entradas por lote, entrega primero lo que vence antes, asocia cada entrega a un beneficiario y a quien la realizó, avisa de existencias bajas y lotes por vencer, y genera reportes |
| A diferencia de | El registro manual, que no permitía conocer las existencias en tiempo real ni revisar las entregas |
| Nuestro producto | Conserva el historial de cada lote y de cada entrega y lleva una bitácora de las acciones de los usuarios |

Fuente: Elaboración propia.

## 3.2 Interesados y usuarios

Se distingue entre los interesados, que tienen interés en el resultado aunque no usen el sistema, y
los usuarios, que trabajan directamente con él. La Tabla 6 presenta ambos grupos.

Tabla 6.
Interesados y usuarios del sistema

| Tipo | Interesado o usuario | Descripción |
|------|----------------------|-------------|
| Interesado | Encargado de recursos humanos de la Municipalidad de Gualán | Planteó la necesidad que dio origen al sistema y aprobó su alcance |
| Interesado | Municipalidad de Gualán | Propietaria de la farmacia y del sistema; provee el equipo y la red, y recibe los reportes |
| Interesado | Beneficiarios | Personas que reciben medicamentos sin costo; no usan el sistema |
| Interesado | Equipo de desarrollo | Cinco integrantes: Daniel Reyes, Jorge Vargas y Audias Guevara desarrollaron el sistema; un integrante elaboró el manual de usuario y otro realizó las pruebas de seguridad |
| Interesado | Docente del curso de Seminario | Revisa y aprueba el proyecto |
| Usuario | Administrador | Tiene acceso a todas las funciones: usuarios, catálogos, inventario, entregas, reportes y bitácora |
| Usuario | Encargado de Beneficencia | Atiende la farmacia: registra beneficiarios, entregas y entradas, y consulta el inventario |
| Usuario | Persona con el teléfono | Toma las fotografías de la receta o del medicamento entregado desde el código QR que muestra el sistema, sin necesidad de cuenta |

Fuente: Elaboración propia.

## 3.3 Necesidades del producto

Las necesidades salen de la solicitud de la municipalidad y de los problemas descritos en el capítulo
1. El "control de lo que sale y entra" se atiende con el registro de entradas por lote y de cada
entrega; la "parte que se regala" queda documentada con el registro de beneficiarios, su historial y
las fotografías de respaldo; la reducción de pérdidas se logra entregando primero lo que vence antes
y con las alertas de vencimiento; el desabastecimiento se previene con la alerta de existencias
bajas; los reportes exportables responden a la necesidad de informar a las autoridades, y la
bitácora permite saber quién hizo cada operación. La parte de venta ("tanto pagado como no pagado")
quedó fuera del alcance, como se explicó en la sección 1.5.

## 3.4 Análisis de riesgos

La Tabla 9 presenta los principales riesgos del proyecto, con su probabilidad, su impacto, la medida
tomada y su situación.

Tabla 9.
Análisis de riesgos del proyecto

| N.º | Riesgo | Probabilidad | Impacto | Medida tomada | Situación |
|-----|--------|--------------|---------|---------------|-----------|
| 1 | Cambio de alcance, porque el análisis inicial incluía también la farmacia de venta | Alta | Alto | Se acordó con la municipalidad limitar el sistema a la farmacia gratuita | Controlado |
| 2 | Uso en el servidor de las claves de ejemplo que trae la configuración del sistema | Media | Alto | Existe una configuración segura; falta aplicarla en el servidor | Abierto |
| 3 | Servidor funcionando en modo de desarrollo, que muestra detalles internos ante un error | Alta | Alto | Existe la configuración de producción; falta adoptarla en la farmacia | Abierto |
| 4 | Imposibilidad de corregir a distancia un fallo del servidor | Media | Alto | Cada cambio se prueba antes de integrarlo y se respalda la base antes de cada arranque | Mitigado en parte |
| 5 | Pérdida de datos al actualizar el sistema | Alta | Alto | Actualizaciones controladas de la base de datos y respaldo automático previo | Controlado |
| 6 | Entrega de medicamentos vencidos | Media | Alto | El sistema excluye los lotes vencidos al entregar y los marca cada día | Controlado |
| 7 | Doble descuento de unidades por dos entregas al mismo tiempo | Baja | Alto | El sistema reserva los lotes mientras registra cada entrega | Controlado |
| 8 | Uso diario de una cuenta de Administrador, con más permisos de los necesarios | Alta | Medio | Habilitar los reportes para el Encargado y usar una cuenta de ese rol | Abierto |
| 9 | Contraseña inicial del administrador conocida públicamente | Media | Alto | El personal de la farmacia cambió la contraseña | Resuelto |
| 10 | Pérdida de la información por una falla del disco del servidor | Baja | Alto | Copia periódica de los respaldos fuera del servidor | Abierto |

Fuente: Elaboración propia.

Los riesgos 2 y 3 dependen de la configuración del servidor de la farmacia, que el equipo de
desarrollo no puede modificar a distancia; se tratan con más detalle en el capítulo 7.

## 3.5 Factibilidad

### 3.5.1 Factibilidad técnica

Las tecnologías del sistema son de uso extendido, cuentan con documentación oficial y se instalan con
Docker, de modo que el servidor solo necesita Docker y conexión a la red local. La factibilidad
técnica quedó demostrada: el sistema está instalado y en uso en la farmacia.

### 3.5.2 Factibilidad operativa

El sistema se usa desde un navegador, sin instalar programas en los equipos ni en el teléfono. Los
respaldos, las actualizaciones de la base de datos y el marcado de lotes vencidos se hacen solos, por
lo que el personal solo debe ocuparse de su trabajo diario.

### 3.5.3 Factibilidad económica

Las bibliotecas, la base de datos y el servidor web son de código abierto y no requieren licencias. La
excepción puede ser la plataforma de contenedores: si el servidor usa Docker Desktop, sus términos
exigen una suscripción de pago a las entidades de gobierno (Docker Inc., s.f.-c). La alternativa sin
costo se describe en el capítulo 7. El desarrollo lo realizó el equipo de estudiantes como proyecto
académico, sin costo para la municipalidad.
