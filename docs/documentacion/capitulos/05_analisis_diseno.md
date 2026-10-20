# CAPÍTULO V

# 5 ANÁLISIS Y DISEÑO

Este capítulo describe cómo está construido FarmaG para cumplir los requerimientos del capítulo 4.
Presenta el comportamiento de los procesos críticos mediante diagramas de actividad, de secuencia y
de estados; el modelo del dominio y el modelo de datos con su diccionario; la arquitectura según el
modelo de vistas 4+1 (Kruchten, 1995); la especificación resumida de la API; el diseño de seguridad y
el diseño de la interfaz. Los diagramas siguen la notación UML 2.5 y, como el resto del documento,
describen el código del commit `bdf1187`.

## 5.1 Diagramas de actividad

Los diagramas de actividad muestran el orden de las acciones y las decisiones de los cinco procesos
con más reglas del sistema: el inicio de sesión, el registro de entradas, la importación desde Excel,
la dispensación y la captura de la evidencia fotográfica. Cada diagrama separa en carriles las
acciones del usuario, del navegador y del servidor.

### 5.1.1 Iniciar sesión

La Figura 13 presenta el inicio de sesión (CU-01). Antes de comprobar las credenciales, la API aplica
dos controles en memoria: primero cuenta la solicitud para la dirección IP y la rechaza con el código
429 si la IP superó 20 solicitudes en 10 minutos; después de validar que el usuario y la contraseña
sean texto no vacío, verifica que la combinación de usuario e IP no esté bloqueada. Solo entonces
busca el usuario y compara la contraseña con el hash bcrypt. Un fallo suma un intento para esa
combinación, se registra en la bitácora si el usuario existe y, al tercer fallo, bloquea la
combinación durante 5 minutos. Con credenciales correctas, la API reinicia el contador, actualiza el
último acceso, firma el token JWT, registra `LOGIN` y el navegador guarda la sesión y muestra el menú
según el rol.

Figura 13.
Diagrama de actividad del inicio de sesión

{{imagen: 05_actividad_login.png}}

Fuente: Elaboración propia.

### 5.1.2 Registrar entrada de medicamentos

La Figura 14 muestra el registro manual de una entrada (CU-07). El usuario repite, por cada lote, la
identificación del medicamento, que puede hacer con el lector de códigos de barras, eligiéndolo de la
lista o, si es Administrador y el medicamento no existe, registrándolo en ese momento. Al enviar la
entrada, el navegador comprueba que los campos estén completos y la API aplica tres validaciones en
orden: el formato de los datos, la fecha de vencimiento posterior al día actual y la existencia de los
medicamentos activos y de las ubicaciones. Si todo es válido, la entrada y sus lotes se crean en una
sola transacción, de modo que un lote inválido impide registrar la entrada completa.

Figura 14.
Diagrama de actividad del registro de una entrada

{{imagen: 05_actividad_registrar_entrada.png}}

Fuente: Elaboración propia.

### 5.1.3 Importar inventario desde Excel

La Figura 15 presenta la importación desde Excel (CU-08). Primero se valida el archivo completo: que
exista, que sea un `.xlsx` legible, que tenga filas y que contenga las 11 columnas de la plantilla,
reconocidas por su nombre. Luego se validan todas las filas en memoria y las válidas se procesan una
por una, cada una en su propia transacción. En cada fila se buscan o crean la categoría, la ubicación
y el medicamento; la fila se revierte si la categoría o el medicamento están inactivos, o si el mismo
lote ya existía antes de la importación. El diseño por fila permite que un error no detenga el resto
del archivo y que una fila posterior reutilice lo creado por una anterior. Al final, el sistema
devuelve un resumen con los conteos, los errores y los avisos.

Figura 15.
Diagrama de actividad de la importación desde Excel

{{imagen: 05_actividad_importar_excel.png}}

Fuente: Elaboración propia.

### 5.1.4 Dispensar medicamentos

La Figura 16 muestra la dispensación (CU-15), el proceso central del sistema. La primera parte ocurre
en el navegador: se elige o registra al beneficiario y se arma la lista de medicamentos, consultando
el stock no vencido de cada uno. Tras la confirmación, el servidor abre una transacción con
aislamiento `Serializable` y, por cada medicamento, bloquea con `SELECT … FOR UPDATE` los lotes
disponibles, con unidades y con fecha de vencimiento posterior al día actual, ordenados por esa fecha.
Si el stock no alcanza, revierte toda la transacción; si alcanza, descuenta primero del lote que vence
antes y continúa con el siguiente, y marca como agotado el lote que llega a cero. La transacción se
reintenta hasta tres veces si la base de datos detecta un conflicto con otra dispensación simultánea.
Confirmada la operación, se registra `DISPENSAR` y se ofrece la captura de evidencia.

Figura 16.
Diagrama de actividad de la dispensación

{{imagen: 05_actividad_dispensar.png}}

Fuente: Elaboración propia.

### 5.1.5 Registrar evidencia fotográfica

La Figura 17 presenta la captura de la evidencia (CU-16), que involucra a la computadora, al servidor
y al teléfono. La computadora pide un enlace de captura; el servidor lo rechaza si la dispensación ya
tiene las dos fotografías y, si no, devuelve el enlace vigente o genera uno nuevo de 30 minutos. A
partir de ahí hay tres caminos: subir las fotografías desde el teléfono con el código QR, subirlas
desde la misma computadora u omitirlas. En los dos primeros, cada subida valida el enlace, el tipo y
el archivo, convierte la imagen a WebP, reemplaza la anterior del mismo tipo y, cuando ya están las
dos, marca el enlace como usado. La computadora detecta el resultado mediante consultas periódicas.

Figura 17.
Diagrama de actividad de la captura de evidencia fotográfica

{{imagen: 05_actividad_captura_evidencia.png}}

Fuente: Elaboración propia.

## 5.2 Diagramas de secuencia

Los diagramas de secuencia muestran los mensajes que intercambian los componentes en tres procesos:
el inicio de sesión, la dispensación y la captura por código QR. Los participantes corresponden a los
archivos del código (páginas del frontend, rutas, servicios y middleware del backend) y a la base de
datos.

### 5.2.1 Iniciar sesión

La Figura 18 detalla los mensajes del inicio de sesión. El navegador envía el usuario y la contraseña
a la ruta de autenticación, que consulta en orden al limitador por IP y al limitador por usuario e IP,
ambos en la memoria del proceso de la API. Solo si ninguno lo impide se consulta el usuario en
PostgreSQL y se compara la contraseña con bcrypt. En el camino de éxito, la API limpia el contador de
fallos, actualiza el último acceso, firma el token, registra `LOGIN` y responde con el token y los
datos del usuario, que el navegador guarda en el almacenamiento local. Como los limitadores viven en
memoria, sus contadores se reinician si la API se reinicia.

Figura 18.
Diagrama de secuencia del inicio de sesión

{{imagen: 05_secuencia_login.png}}

Fuente: Elaboración propia.

### 5.2.2 Dispensar medicamentos

La Figura 19 muestra la secuencia de la dispensación. Antes de llegar al servicio, `authMiddleware`
consulta el usuario en la base de datos para confirmar que la cuenta sigue activa y tomar su rol
vigente, y la ruta valida el cuerpo de la petición. El servicio calcula la fecha del día como texto
`AAAA-MM-DD`, para no depender de la zona horaria de la sesión de PostgreSQL, y ejecuta la
transacción: por cada ítem, consulta el medicamento, bloquea sus lotes en orden de vencimiento,
verifica el stock y actualiza las cantidades; después inserta la dispensación con sus detalles y
confirma. Ante un error de serialización espera 10 milisegundos multiplicados por el número de intento
y repite. La auditoría se registra después de confirmar la transacción y no detiene la respuesta si
falla.

Figura 19.
Diagrama de secuencia de la dispensación

{{imagen: 05_secuencia_dispensar.png}}

Fuente: Elaboración propia.

### 5.2.3 Captura de evidencia con código QR

La Figura 20 presenta la captura por código QR. La generación del enlace ocurre con la sesión del
usuario en la computadora; el servicio crea un token aleatorio de 64 bits o reutiliza el vigente y la
ruta registra la operación en la bitácora. Después corren en paralelo dos procesos: la computadora
consulta cada 3 segundos las fotografías registradas, y el teléfono, sin sesión, usa la ruta pública
de captura para obtener los datos de la dispensación y subir cada fotografía. En cada subida, el
servicio valida de nuevo el token, convierte la imagen a WebP, reemplaza el archivo anterior del mismo
tipo, actualiza el registro de la fotografía, marca el token como usado cuando están las dos y
registra la subida en la bitácora a nombre del usuario que hizo la dispensación.

Figura 20.
Diagrama de secuencia de la captura de evidencia con código QR

{{imagen: 05_secuencia_captura_qr.png}}

Fuente: Elaboración propia.

## 5.3 Diagramas de estados

Tres entidades del sistema cambian de estado por reglas propias: el lote, el token de captura y el
usuario. Sus diagramas de estados se presentan a continuación.

### 5.3.1 Lote

La Figura 22 muestra los estados de un lote. Todo lote nace en `DISPONIBLE`, al registrar una entrada
o importar una fila, siempre que su fecha de vencimiento sea posterior al día actual. Una dispensación
lo mantiene disponible mientras le queden unidades o lo pasa a `AGOTADO` cuando llega a cero. El
proceso automático lo pasa a `VENCIDO` cuando su fecha de vencimiento es el día actual o anterior, y
el Administrador puede pasarlo a `DADO_DE_BAJA` desde cualquiera de los otros tres estados. No hay
transiciones de regreso: como no existen devoluciones ni ajustes de existencias, un lote agotado,
vencido o dado de baja no vuelve a estar disponible. El semáforo de vencimiento no es un estado
guardado: se calcula en cada consulta.

Figura 22.
Diagrama de estados del lote

{{imagen: 05_estados_lote.png}}

Fuente: Elaboración propia.

### 5.3.2 Token de captura

La Figura 23 presenta los estados del token de captura, que se derivan de los campos `usado` y
`expiraEn`. Un token vigente acepta subidas de fotografías durante 30 minutos; si se solicita de nuevo
mientras está vigente, el sistema devuelve el mismo valor. Pasa a usado cuando la dispensación tiene
las dos fotografías y a vencido cuando se cumple su plazo. Un token vencido puede reemplazarse por uno
nuevo en la misma fila si la evidencia sigue incompleta; uno usado, no, porque el sistema no genera
tokens para una dispensación con las dos fotografías. El proceso automático diario elimina las filas
cuyo plazo ya pasó. En los estados vencido y usado, las rutas públicas responden con el mismo mensaje
de enlace inválido.

Figura 23.
Diagrama de estados del token de captura

{{imagen: 05_estados_token_captura.png}}

Fuente: Elaboración propia.

### 5.3.3 Usuario

La Figura 24 muestra los dos estados de un usuario, activo e inactivo, y las transiciones que realiza
el Administrador. Un usuario se crea activo y no se elimina; el Administrador lo desactiva o lo
reactiva, pero no puede desactivar su propia cuenta. Un usuario inactivo no puede iniciar sesión y el
token que ya tenía deja de servir en su siguiente petición, porque cada petición protegida consulta el
estado de la cuenta. El bloqueo por intentos fallidos no forma parte de estos estados: se guarda en
memoria para cada combinación de usuario e IP y expira a los 5 minutos.

Figura 24.
Diagrama de estados del usuario

{{imagen: 05_estados_usuario.png}}

Fuente: Elaboración propia.

## 5.4 Diagrama de clases del dominio

La Figura 21 presenta las 14 clases del dominio, agrupadas en cuatro paquetes, con sus atributos
principales, las cuatro enumeraciones y la multiplicidad de las relaciones. El paquete de seguridad y
auditoría contiene al usuario, la bitácora y la configuración del sistema; el de catálogos, a la
categoría, el medicamento, el código de barras y la ubicación; el de inventario, a la entrada y el
lote; y el de dispensación, al beneficiario, la dispensación, su detalle, la fotografía y el token de
captura.

Figura 21.
Diagrama de clases del dominio

{{imagen: 05_clases_dominio.png}}

Fuente: Elaboración propia.

Tres decisiones de diseño se reflejan en el diagrama. La primera es que el stock no es un atributo del
medicamento: se obtiene de la suma de las cantidades actuales de sus lotes, y cada lote conserva su
propia fecha de vencimiento, lo que permite despachar en orden de vencimiento. La segunda es que el
detalle de dispensación guarda una copia del nombre, la presentación y la concentración del
medicamento y el lote exacto descontado, de modo que el historial no cambia si después se edita el
catálogo. La tercera es que la entrada y la dispensación se componen de sus lotes y detalles: la base
de datos admite cero, pero la API exige al menos un lote por entrada y un detalle por dispensación, y
cada dispensación tiene como máximo dos fotografías, una por tipo. La configuración del sistema no se
relaciona con otras clases; guarda los umbrales del semáforo y el nombre de la farmacia que aparece
en los reportes.
