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

## 5.5 Modelo de datos

El modelo de datos se implementa en PostgreSQL 16 y se define en el archivo `schema.prisma` del
backend. Los cambios de esquema se aplican mediante migraciones versionadas: la migración `0_init`
crea las 14 tablas, las 4 enumeraciones, los índices únicos y las claves foráneas, y la migración
`20261017052535_indices_consultas` agrega cuatro índices de consulta. Las tablas se nombran en plural
y en minúsculas con guion bajo; los campos, que en el código se escriben en notación camelCase, se
guardan en columnas con el mismo formato que las tablas.

### 5.5.1 Diagrama entidad-relación

La Figura 25 muestra las 14 tablas con sus claves primarias, claves foráneas, campos únicos y la
cardinalidad de sus 14 relaciones. Todas las claves primarias son identificadores UUID de tipo texto,
que genera el cliente Prisma al insertar. Las claves foráneas obligatorias impiden borrar un registro
que tenga registros dependientes (`ON DELETE RESTRICT`); la única opcional, la ubicación del lote, se
anula si se borra la ubicación (`ON DELETE SET NULL`). Como el sistema usa desactivación en lugar de
borrado, en la práctica estas reglas protegen la integridad del historial. La tabla
`configuracion_sistema` no tiene relaciones, y la columna `entidad_id` de la bitácora es una
referencia lógica a la entidad registrada, sin clave foránea.

Figura 25.
Diagrama entidad-relación

{{imagen: 05_er_modelo_datos.png}}

Fuente: Elaboración propia.

### 5.5.2 Diccionario de datos

Las Tablas 69 a 82 describen cada tabla de la base de datos. En la columna "Tipo" se usa el tipo de
PostgreSQL: `TEXT`, `INTEGER`, `BOOLEAN`, `DATE`, `TIMESTAMP(3)` (fecha y hora sin zona horaria, con
milisegundos), `DECIMAL(10,2)`, `JSONB` y las enumeraciones. En "Restricciones", PK indica la clave
primaria, FK la clave foránea con la tabla referida, UNIQUE un valor único y DEFAULT el valor por
defecto. Los campos `updated_at` los actualiza el cliente Prisma en cada modificación, sin valor por
defecto en la base de datos.

La Tabla 69 describe la tabla de usuarios del sistema.

Tabla 69.
Diccionario de datos de la tabla `usuarios`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del usuario |
| `username` | TEXT | No | UNIQUE | Nombre con el que el usuario inicia sesión |
| `email` | TEXT | Sí | UNIQUE | Correo electrónico del usuario |
| `password_hash` | TEXT | No | — | Hash bcrypt de la contraseña, con costo 12 |
| `nombre_completo` | TEXT | No | — | Nombre que se muestra en la interfaz, los reportes y la bitácora |
| `rol` | `Rol` | No | — | Rol del usuario; se consulta en cada petición protegida |
| `activo` | BOOLEAN | No | DEFAULT true | Indica si el usuario puede usar el sistema |
| `ultimo_acceso` | TIMESTAMP(3) | Sí | — | Fecha y hora del último inicio de sesión correcto |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha de creación del registro |
| `updated_at` | TIMESTAMP(3) | No | — | Fecha de la última modificación |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 70 describe las categorías terapéuticas con que se clasifican los medicamentos.

Tabla 70.
Diccionario de datos de la tabla `categorias`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID de la categoría |
| `nombre` | TEXT | No | UNIQUE | Nombre de la categoría; la importación desde Excel la busca por este campo |
| `descripcion` | TEXT | Sí | — | Descripción libre |
| `activo` | BOOLEAN | No | DEFAULT true | Desactivación lógica; una categoría inactiva no aparece en los selectores |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 71 describe el catálogo de medicamentos. La combinación de nombre genérico, presentación y
concentración no es única en la base de datos: la detección de posibles duplicados es una advertencia
de la aplicación que el usuario puede confirmar.

Tabla 71.
Diccionario de datos de la tabla `medicamentos`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del medicamento |
| `nombre_generico` | TEXT | No | — | Nombre genérico, de al menos 2 caracteres; se usa en la detección de duplicados |
| `nombre_comercial` | TEXT | Sí | — | Nombre comercial |
| `presentacion` | TEXT | No | — | Forma farmacéutica, por ejemplo tableta o cápsula |
| `concentracion` | TEXT | Sí | — | Concentración, por ejemplo 500mg |
| `unidad_medida` | TEXT | No | — | Unidad en que se cuentan las existencias |
| `categoria_id` | TEXT | No | FK → `categorias.id` | Categoría del medicamento |
| `stock_minimo` | INTEGER | No | DEFAULT 10 | Umbral bajo el cual el medicamento se marca con stock bajo |
| `imagen_url` | TEXT | Sí | — | Ruta de la fotografía del medicamento, guardada en WebP |
| `activo` | BOOLEAN | No | DEFAULT true | Desactivación lógica; un medicamento inactivo no recibe entradas ni se dispensa |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha de creación del registro |
| `updated_at` | TIMESTAMP(3) | No | — | Fecha de la última modificación |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 72 describe los códigos de barras, que permiten identificar un medicamento con el lector.

Tabla 72.
Diccionario de datos de la tabla `codigos_barras`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del código |
| `medicamento_id` | TEXT | No | FK → `medicamentos.id` | Medicamento al que identifica el código |
| `codigo` | TEXT | No | UNIQUE | Valor del código de barras; un código pertenece a un solo medicamento |
| `descripcion` | TEXT | Sí | — | Descripción opcional; la interfaz sugiere indicar el empaque, por ejemplo "Caja de 20 tabletas" |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 73 describe las ubicaciones físicas donde se guardan los lotes. Esta tabla no tiene campo de
desactivación.

Tabla 73.
Diccionario de datos de la tabla `ubicaciones`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID de la ubicación |
| `codigo` | TEXT | No | UNIQUE | Código corto del estante, por ejemplo A o BOD |
| `descripcion` | TEXT | Sí | — | Descripción, por ejemplo "Estante A" o "Bodega" |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 74 describe las entradas, que agrupan los lotes recibidos en un mismo registro.

Tabla 74.
Diccionario de datos de la tabla `entradas`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID de la entrada |
| `usuario_id` | TEXT | No | FK → `usuarios.id` | Usuario que registró la entrada |
| `observaciones` | TEXT | Sí | — | Notas de la entrada; la importación escribe "Importado desde Excel (fila N)" |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha y hora del registro |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 75 describe los lotes, la tabla donde reside el stock del sistema.

Tabla 75.
Diccionario de datos de la tabla `lotes`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del lote |
| `entrada_id` | TEXT | No | FK → `entradas.id` | Entrada en la que se registró el lote |
| `medicamento_id` | TEXT | No | FK → `medicamentos.id` | Medicamento del lote |
| `cantidad` | INTEGER | No | — | Unidades recibidas |
| `cantidad_actual` | INTEGER | No | — | Unidades restantes; inicia igual a la cantidad recibida y disminuye con cada dispensación |
| `numero_lote` | TEXT | No | — | Número de lote del fabricante |
| `fecha_vencimiento` | DATE | No | — | Fecha de vencimiento; define el orden de despacho y el semáforo |
| `costo_unitario` | DECIMAL(10,2) | Sí | — | Costo por unidad; se usa para estimar el costo de los lotes perdidos |
| `ubicacion_id` | TEXT | Sí | FK → `ubicaciones.id` (ON DELETE SET NULL) | Estante donde se guarda el lote |
| `estado` | `EstadoLote` | No | DEFAULT `DISPONIBLE` | Estado del lote (sección 5.3.1) |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha de creación del registro |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 76 describe los beneficiarios que reciben medicamentos sin costo.

Tabla 76.
Diccionario de datos de la tabla `beneficiarios`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del beneficiario |
| `nombre_completo` | TEXT | No | — | Nombre del beneficiario, de al menos 3 caracteres |
| `dpi` | TEXT | Sí | UNIQUE | Documento Personal de Identificación, de 13 dígitos |
| `telefono` | TEXT | Sí | — | Teléfono de contacto |
| `direccion` | TEXT | Sí | — | Dirección |
| `observaciones` | TEXT | Sí | — | Notas sobre el beneficiario |
| `activo` | BOOLEAN | No | DEFAULT true | Las búsquedas y la dispensación solo consideran beneficiarios activos; ninguna pantalla lo modifica |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha de registro |
| `updated_at` | TIMESTAMP(3) | No | — | Fecha de la última modificación |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 77 describe las dispensaciones, cada una de las cuales corresponde a una entrega a un
beneficiario.

Tabla 77.
Diccionario de datos de la tabla `dispensaciones`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID de la dispensación |
| `beneficiario_id` | TEXT | No | FK → `beneficiarios.id` | Beneficiario que recibe los medicamentos |
| `usuario_id` | TEXT | No | FK → `usuarios.id` | Usuario que registró la dispensación |
| `observaciones` | TEXT | Sí | — | Notas de la entrega, por ejemplo los datos de la receta |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha y hora de la dispensación |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 78 describe el detalle de cada dispensación. Un mismo medicamento puede generar varias filas
cuando la cantidad se reparte entre varios lotes.

Tabla 78.
Diccionario de datos de la tabla `detalle_dispensaciones`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID de la línea |
| `dispensacion_id` | TEXT | No | FK → `dispensaciones.id` | Dispensación a la que pertenece la línea |
| `lote_id` | TEXT | No | FK → `lotes.id` | Lote del que se descontaron las unidades |
| `medicamento_id` | TEXT | No | FK → `medicamentos.id` | Medicamento dispensado |
| `cantidad` | INTEGER | No | — | Unidades descontadas de ese lote |
| `nombre_medicamento_snapshot` | TEXT | No | — | Copia del nombre genérico al momento de dispensar |
| `presentacion_snapshot` | TEXT | No | — | Copia de la presentación al momento de dispensar |
| `concentracion_snapshot` | TEXT | Sí | — | Copia de la concentración al momento de dispensar |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 79 describe las fotografías de evidencia de las dispensaciones.

Tabla 79.
Diccionario de datos de la tabla `fotos_dispensacion`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID de la fotografía |
| `dispensacion_id` | TEXT | No | FK → `dispensaciones.id`; UNIQUE (`dispensacion_id`, `tipo`) | Dispensación a la que pertenece la evidencia |
| `tipo` | `TipoFoto` | No | UNIQUE (`dispensacion_id`, `tipo`) | Receta o entrega; solo una fotografía de cada tipo por dispensación |
| `imagen_url` | TEXT | No | — | Ruta del archivo WebP; el archivo se entrega solo por un endpoint que exige sesión |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha de la subida; se actualiza al reemplazar la fotografía |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 80 describe los tokens que autorizan la captura de fotografías sin sesión.

Tabla 80.
Diccionario de datos de la tabla `tokens_captura`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del registro |
| `dispensacion_id` | TEXT | No | UNIQUE; FK → `dispensaciones.id` | Dispensación que autoriza el token; hay un solo token por dispensación |
| `token` | TEXT | No | UNIQUE | Valor aleatorio de 64 bits en base64url (11 caracteres) que viaja en el código QR |
| `usado` | BOOLEAN | No | DEFAULT false | Se marca cuando la dispensación tiene las dos fotografías |
| `expira_en` | TIMESTAMP(3) | No | — | Fin de la vigencia: 30 minutos después de generarse |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha de creación del registro |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 81 describe la bitácora de auditoría.

Tabla 81.
Diccionario de datos de la tabla `log_auditoria`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del registro |
| `usuario_id` | TEXT | No | FK → `usuarios.id` | Usuario que realizó la acción; por ser obligatorio, los intentos con un usuario inexistente no se registran |
| `accion` | `AccionAuditoria` | No | — | Tipo de acción registrada |
| `entidad` | TEXT | No | — | Nombre de la entidad afectada, por ejemplo `medicamento` o `reporte` |
| `entidad_id` | TEXT | Sí | — | Identificador del registro afectado, sin clave foránea |
| `datos_anteriores` | JSONB | Sí | — | Estado previo del registro |
| `datos_nuevos` | JSONB | Sí | — | Estado nuevo del registro o datos de la operación |
| `ip_address` | TEXT | Sí | — | Dirección IP de origen de la petición |
| `created_at` | TIMESTAMP(3) | No | DEFAULT CURRENT_TIMESTAMP | Fecha y hora de la acción |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

La Tabla 82 describe la configuración del sistema, organizada como pares de clave y valor.

Tabla 82.
Diccionario de datos de la tabla `configuracion_sistema`

| Campo | Tipo | Nulo | Restricciones | Descripción |
|-------|------|------|---------------|-------------|
| `id` | TEXT | No | PK | Identificador UUID del parámetro |
| `clave` | TEXT | No | UNIQUE | Nombre del parámetro: `ALERTA_VENCIMIENTO_ROJO`, `ALERTA_VENCIMIENTO_AMARILLO` o `NOMBRE_FARMACIA` |
| `valor` | TEXT | No | — | Valor del parámetro como texto; los umbrales se convierten a número al leerse (30 y 90 por defecto) |
| `descripcion` | TEXT | Sí | — | Descripción del parámetro |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

### 5.5.3 Índices

Además de las claves primarias, la base de datos tiene 14 índices, que se presentan en la Tabla 83:
10 índices únicos que garantizan las restricciones UNIQUE del diccionario y 4 índices de consulta
agregados por la migración `20261017052535_indices_consultas`. El índice compuesto de `lotes` cubre el
filtro y el orden de la consulta con que la dispensación selecciona los lotes; los de `created_at`
apoyan los listados ordenados por fecha. Que el planificador de PostgreSQL use efectivamente cada
índice no se ha medido.

Tabla 83.
Índices de la base de datos

| Tabla | Columnas | Tipo | Propósito |
|-------|----------|------|-----------|
| `usuarios` | `username` | Único | Un nombre de usuario por cuenta |
| `usuarios` | `email` | Único | Un correo por cuenta |
| `categorias` | `nombre` | Único | Nombres de categoría sin repetir |
| `codigos_barras` | `codigo` | Único | Un código de barras por medicamento en todo el sistema |
| `ubicaciones` | `codigo` | Único | Códigos de ubicación sin repetir |
| `beneficiarios` | `dpi` | Único | Un DPI por beneficiario |
| `fotos_dispensacion` | `dispensacion_id`, `tipo` | Único | Una fotografía de cada tipo por dispensación |
| `tokens_captura` | `dispensacion_id` | Único | Un token por dispensación |
| `tokens_captura` | `token` | Único | Valor de token sin repetir |
| `configuracion_sistema` | `clave` | Único | Un valor por parámetro |
| `lotes` | `medicamento_id`, `estado`, `fecha_vencimiento` | Consulta | Selección de los lotes disponibles de un medicamento en orden de vencimiento al dispensar |
| `entradas` | `created_at` | Consulta | Historial de entradas ordenado por fecha |
| `dispensaciones` | `created_at` | Consulta | Historial de dispensaciones filtrado y ordenado por fecha |
| `log_auditoria` | `created_at` | Consulta | Consulta de la bitácora por rango de fechas |

Fuente: Elaboración propia con base en `backend/prisma/migrations/`.

### 5.5.4 Enumeraciones

La Tabla 84 presenta las cuatro enumeraciones del modelo, que PostgreSQL guarda como tipos propios.
El valor `LOGOUT` existe en la enumeración de acciones, pero el sistema no lo registra, porque el cierre
de sesión ocurre solo en el navegador.

Tabla 84.
Enumeraciones del modelo de datos

| Enumeración | Valores | Columna que la usa |
|-------------|---------|--------------------|
| `Rol` | `ADMIN`, `ENCARGADO_BENEFICENCIA` | `usuarios.rol` |
| `EstadoLote` | `DISPONIBLE`, `AGOTADO`, `VENCIDO`, `DADO_DE_BAJA` | `lotes.estado` |
| `TipoFoto` | `RECETA`, `EVIDENCIA_ENTREGA` | `fotos_dispensacion.tipo` |
| `AccionAuditoria` | `CREAR`, `EDITAR`, `ELIMINAR`, `DISPENSAR`, `BAJA`, `LOGIN`, `LOGOUT`, `ACTIVAR`, `DESACTIVAR` | `log_auditoria.accion` |

Fuente: Elaboración propia con base en `backend/prisma/schema.prisma`.

### 5.5.5 Datos iniciales

Al arrancar, el backend ejecuta un proceso de carga inicial que no modifica los datos existentes. Crea
el usuario administrador si no existe, con la contraseña definida en la variable
`ADMIN_INITIAL_PASSWORD` (de al menos 8 caracteres) o, si no se define, con una contraseña aleatoria
que se muestra una sola vez en el registro del contenedor; crea 13 categorías y 7 ubicaciones solo si
sus tablas están vacías; y crea los tres parámetros de configuración sin sobrescribir los valores que
ya existan. No crea medicamentos, lotes, beneficiarios ni dispensaciones, salvo cinco medicamentos de
ejemplo cuando se activa la variable `SEED_DEMO` en desarrollo.

## 5.6 Arquitectura del sistema

La arquitectura se describe con el modelo de vistas 4+1, que organiza la descripción de un sistema en
cuatro vistas, cada una dirigida a un tipo de interesado, y una quinta vista de escenarios que las
relaciona y valida (Kruchten, 1995). La Tabla 85 resume cada vista y los diagramas con que se
representa en este documento.

Tabla 85.
Vistas de la arquitectura según el modelo 4+1

| Vista | Qué describe | Interesados principales | Representación |
|-------|--------------|-------------------------|----------------|
| Lógica | Clases del dominio y su organización en capas | Equipo de desarrollo, asesor | Figura 21 y sección 5.6.1 |
| De procesos | Procesos en ejecución, concurrencia y tareas programadas | Equipo de desarrollo, responsable del servidor | Tabla 86 y Figuras 16 y 19 |
| De desarrollo | Organización del código en módulos y sus dependencias | Equipo de desarrollo | Figura 26 |
| Física | Nodos, contenedores, puertos y almacenamiento | Responsable del servidor de la municipalidad | Figura 27 |
| Escenarios | Casos de uso que recorren las demás vistas | Todos | Tabla 87 y sección 4.6 |

Fuente: Elaboración propia con base en Kruchten (1995).

### 5.6.1 Vista lógica

FarmaG es una aplicación web de tres capas. La capa de presentación es una aplicación de una sola
página escrita en React, que se ejecuta en el navegador y se comunica con el servidor solo por HTTP.
La capa de lógica es una API REST en Node.js con Express, organizada en rutas por módulo, servicios
con las reglas de negocio de mayor complejidad (dispensación, inventario, reportes y vencimiento),
middleware transversal (autenticación, autorización, auditoría y manejo de errores) y utilidades. La
capa de datos es PostgreSQL, a la que la API accede mediante un único cliente de Prisma compartido.

Las abstracciones de la vista lógica son las clases del dominio de la Figura 21, agrupadas en los
paquetes de seguridad y auditoría, catálogos, inventario y dispensación. Cada paquete corresponde a
uno o más módulos de la API: catálogos a `/api/catalogos`; inventario a `/api/inventario`; dispensación
a `/api/dispensacion` y `/api/captura`; y seguridad y auditoría a `/api/auth`, `/api/usuarios` y
`/api/auditoria`. Los reportes no tienen clases propias: consultan las de los demás paquetes.

### 5.6.2 Vista de procesos

La vista de procesos describe qué se ejecuta de forma simultánea y cómo se coordina. La Tabla 86
presenta los procesos del sistema en producción.

Tabla 86.
Procesos del sistema en ejecución

| Proceso | Dónde se ejecuta | Activación | Función |
|---------|------------------|------------|---------|
| Servidor web | Contenedor `web` (nginx) | Permanente | Entrega la aplicación compilada y reenvía `/api/` y `/uploads/medicamentos/` a la API |
| API | Contenedor `api` (Node.js) | Permanente | Atiende las peticiones HTTP en un solo proceso con un bucle de eventos |
| Tarea de vencimiento | Dentro del proceso de la API (`node-cron`) | Diaria a las 00:05 (hora de Guatemala) y al arrancar la API | Marca los lotes vencidos y elimina los tokens de captura vencidos |
| Base de datos | Contenedor `db` (PostgreSQL) | Permanente | Ejecuta las transacciones y los bloqueos de filas |
| Respaldo periódico | Contenedor `backup` | Al arrancar y cada 12 horas | Genera y verifica una copia de la base con `pg_dump` y borra las de más de 14 días |
| Respaldo previo | Script de arranque del contenedor `api` | En cada arranque con datos | Respalda la base antes de aplicar migraciones |
| Consulta de fotografías | Navegador de la computadora | Cada 3 segundos tras una dispensación | Detecta las fotografías subidas desde el teléfono |

Fuente: Elaboración propia con base en los archivos de Compose, `server.ts` y `vencimiento.service.ts`.

La concurrencia relevante para el negocio está en la dispensación: hasta cuatro usuarios pueden
dispensar al mismo tiempo, y dos peticiones pueden intentar descontar unidades del mismo lote. El
diseño resuelve el conflicto en la base de datos y no en la API, como se mostró en las Figuras 16 y
19: cada dispensación es una transacción con aislamiento `Serializable` que bloquea los lotes con
`SELECT … FOR UPDATE`, de modo que la segunda transacción espera a que termine la primera y vuelve a
leer el stock ya descontado. Si PostgreSQL aborta una transacción por un conflicto de serialización,
la API la reintenta hasta tres veces. Los contadores de intentos de inicio de sesión se guardan en la
memoria del proceso de la API, por lo que se reinician con él.

### 5.6.3 Vista de desarrollo

La Figura 26 presenta el diagrama de componentes, que corresponde a la vista de desarrollo. En el
frontend, las páginas usan los clientes de la carpeta `src/api`, que a su vez usan un cliente HTTP
común que agrega el token de sesión; la página pública de captura usa una instancia propia, sin token,
para que un error de autenticación no redirija al teléfono a la pantalla de inicio de sesión. El
contexto de autenticación y los componentes de rutas protegidas controlan el acceso a las páginas.

Figura 26.
Diagrama de componentes

{{imagen: 05_componentes.png}}

Fuente: Elaboración propia.

En el backend, `server.ts` registra los middleware globales, monta los ocho archivos de rutas bajo
`/api` e inicia la tarea de vencimiento. Las rutas dependen del middleware de autenticación y de
auditoría, y las de mayor lógica delegan en los servicios. Las utilidades generan los PDF y los
archivos de Excel, procesan las imágenes y validan fechas y parámetros. Todos los accesos a datos
pasan por el cliente Prisma compartido de `config/prisma.ts`. Los componentes externos son PostgreSQL,
la carpeta de archivos subidos y el servicio OpenFDA, que solo consulta la ruta de catálogos.

### 5.6.4 Vista física

La Figura 27 muestra el diagrama de despliegue en el modo de producción. El sistema se ejecuta en un
servidor de la red local de la municipalidad, con Docker, en cuatro contenedores: `web`, con nginx y
la aplicación compilada; `api`, con Node.js; `db`, con PostgreSQL; y `backup`, que genera los
respaldos. El único puerto expuesto a la red local es el 80 del contenedor `web`; los puertos de la
API (3000) y de la base de datos (5432) solo se publican en la interfaz local del servidor, y los
contenedores se comunican por la red interna de Docker. Los datos persisten en un volumen de Docker
para la base de datos y en dos carpetas del servidor, una para los archivos subidos y otra para los
respaldos. Los equipos de escritorio y el teléfono de captura acceden con un navegador por HTTP.

Figura 27.
Diagrama de despliegue

{{imagen: 05_despliegue.png}}

Fuente: Elaboración propia.

En el modo de desarrollo, el contenedor `web` ejecuta el servidor de Vite en el puerto 5173, la API se
ejecuta con recarga automática y monta el código fuente, y los secretos tienen valores por defecto en
el archivo de composición. Según la guía de despliegue del proyecto, la actualización automática del
servidor de la farmacia usa el archivo de composición por defecto, que corresponde al modo de
desarrollo salvo que el archivo de variables del servidor lo cambie; esta situación es el riesgo 3 de
la Tabla 9. El uso de `docker-compose.yml` en el servidor se deduce de la configuración, porque el
comando de actualización no indica otro archivo; no se comprobó en el equipo, y el modo y el puerto
con que se ejecuta tampoco están confirmados.

### 5.6.5 Escenarios

La vista de escenarios relaciona las demás vistas mediante casos de uso concretos. Los 19 casos de
uso especificados en la sección 4.6 son los escenarios del sistema; la Tabla 87 presenta los cuatro
que recorren más elementos de la arquitectura y los diagramas que los describen.

Tabla 87.
Escenarios de la arquitectura

| Escenario | Caso de uso | Vistas que recorre | Diagramas |
|-----------|-------------|--------------------|-----------|
| Iniciar sesión | CU-01 | Lógica (usuario, bitácora), procesos (limitadores en memoria), desarrollo (rutas y middleware de autenticación), física (navegador, `web`, `api`, `db`) | Figuras 2, 13, 18 y 24 |
| Registrar una entrada o importar un archivo | CU-07, CU-08 | Lógica (entrada, lote, medicamento), desarrollo (rutas de inventario y catálogos, utilidades de Excel) | Figuras 5, 14, 15 y 22 |
| Dispensar medicamentos | CU-15 | Lógica (dispensación, detalle, lote), procesos (transacción y bloqueos), desarrollo (servicio de dispensación), física | Figuras 9, 16, 19 y 22 |
| Registrar evidencia desde el teléfono | CU-16 | Lógica (fotografía, token), procesos (consulta periódica), desarrollo (rutas públicas de captura), física (teléfono en la red local, carpeta de archivos) | Figuras 10, 17, 20 y 23 |

Fuente: Elaboración propia.

## 5.7 Especificación de la API

La API expone 54 endpoints bajo el prefijo `/api`: 53 en los ocho archivos de rutas y uno de estado
del servicio. De ellos, 21 son exclusivos del rol Administrador, 29 están disponibles para los dos
roles con sesión y 4 son públicos. Las peticiones y respuestas usan JSON, salvo la subida de imágenes y
de archivos de Excel, que usan `multipart/form-data`, y las descargas de archivos. Todo error responde
con un objeto `{ "error": "mensaje" }`.

La Tabla 88 presenta las respuestas comunes a todos los endpoints que requieren sesión, que no se
repiten en las tablas siguientes.

Tabla 88.
Respuestas comunes de los endpoints protegidos

| Código | Mensaje | Causa |
|--------|---------|-------|
| 401 | Token de autenticación requerido | La petición no incluye la cabecera `Authorization` con el prefijo `Bearer` |
| 401 | Token inválido o expirado | La firma del token no es válida o pasaron las 8 horas de vigencia |
| 401 | La cuenta ya no está activa. Inicie sesión nuevamente. | El usuario del token no existe o fue desactivado |
| 403 | No tiene permisos para esta acción | El endpoint es exclusivo del Administrador y el usuario tiene otro rol |
| 400 | El cuerpo de la petición no es un JSON válido | El cuerpo JSON está mal formado |
| 413 | El cuerpo de la petición es demasiado grande | El cuerpo JSON supera 100 kB |
| 500 | Error interno del servidor | Error no previsto; el detalle solo se incluye en modo de desarrollo |

Fuente: Elaboración propia con base en `middleware/auth.ts` y `middleware/errorHandler.ts`.

Las Tablas 89 a 96 resumen los endpoints de cada módulo. En la columna "Roles", "Ambos" significa
cualquier usuario con sesión, "ADMIN" el rol Administrador y "Público" un acceso sin sesión. Las rutas
se escriben sin el prefijo `/api`. La especificación completa de cada endpoint, con sus parámetros,
cuerpos, tablas que lee y escribe y registros de auditoría, se presenta en el Anexo D.

Tabla 89.
Endpoints de autenticación y estado del servicio

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| POST | `/auth/login` | Público | Inicia sesión y devuelve el token y los datos del usuario | 200; 400 datos faltantes; 401 credenciales inválidas con intentos restantes; 429 por límite de IP o bloqueo de usuario |
| GET | `/auth/perfil` | Ambos | Devuelve el usuario de la sesión con su rol vigente | 200; 404 |
| GET | `/health` | Público | Indica que el servicio está activo y el modo de ejecución | 200 |

Fuente: Elaboración propia con base en `auth.routes.ts` y `server.ts`.

Tabla 90.
Endpoints del módulo de usuarios

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/usuarios` | ADMIN | Lista todos los usuarios sin su contraseña | 200 |
| POST | `/usuarios` | ADMIN | Crea un usuario | 201; 400 datos inválidos; 409 usuario repetido |
| PUT | `/usuarios/:id` | ADMIN | Edita nombre, correo y rol | 200; 400 rol inválido o propio rol; 404 |
| PUT | `/usuarios/:id/password` | ADMIN | Restablece la contraseña | 200; 400 menos de 6 caracteres; 404 |
| PUT | `/usuarios/:id/toggle` | ADMIN | Activa o desactiva un usuario | 200; 400 propia cuenta; 404 |

Fuente: Elaboración propia con base en `usuarios.routes.ts`.

Tabla 91.
Endpoints del módulo de catálogos

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/catalogos/medicamentos` | Ambos | Lista paginada de medicamentos con búsqueda e inactivos opcionales | 200 |
| GET | `/catalogos/medicamentos/buscar` | Ambos | Búsqueda por nombre para autocompletar (hasta 20) | 200 |
| GET | `/catalogos/medicamentos/barcode/:codigo` | Ambos | Medicamento de un código de barras con su stock dispensable | 200; 404 código no registrado |
| GET | `/catalogos/medicamentos/lookup-fda/:codigoBarras` | ADMIN | Datos sugeridos por OpenFDA para un código de barras | 200 con `found` verdadero o falso |
| POST | `/catalogos/medicamentos` | ADMIN | Crea un medicamento, con advertencia de posibles duplicados | 201; 200 con advertencia; 400 |
| PUT | `/catalogos/medicamentos/:id` | ADMIN | Edita, activa o desactiva un medicamento | 200; 400; 404 |
| POST | `/catalogos/medicamentos/:id/imagen` | ADMIN | Sube la fotografía del medicamento | 200; 400 formato, tamaño o imagen inválida; 404 |
| POST | `/catalogos/medicamentos/:id/codigos` | ADMIN | Vincula un código de barras | 201; 400; 404; 409 código ya registrado |
| DELETE | `/catalogos/codigos/:id` | ADMIN | Elimina un código de barras | 200; 404 |
| GET | `/catalogos/categorias` | Ambos | Lista las categorías, con inactivas opcionales | 200 |
| POST | `/catalogos/categorias` | ADMIN | Crea una categoría | 201; 400; 409 nombre repetido |
| PUT | `/catalogos/categorias/:id` | ADMIN | Edita, activa o desactiva una categoría | 200; 400; 404; 409 |
| GET | `/catalogos/ubicaciones` | Ambos | Lista las ubicaciones | 200 |
| POST | `/catalogos/ubicaciones` | ADMIN | Crea una ubicación | 201; 400; 409 código repetido |
| PUT | `/catalogos/ubicaciones/:id` | ADMIN | Edita una ubicación | 200; 400; 404; 409 |

Fuente: Elaboración propia con base en `catalogos.routes.ts`.

Tabla 92.
Endpoints del módulo de inventario

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/inventario` | Ambos | Existencias por medicamento con semáforo y stock bajo, paginadas | 200 |
| GET | `/inventario/medicamento/:id` | Ambos | Detalle de los lotes de un medicamento | 200; 404 |
| GET | `/inventario/alertas` | Ambos | Stock bajo, lotes por vencer, vencidos y resumen del panel | 200 |
| POST | `/inventario/entradas` | Ambos | Registra una entrada con sus lotes en una transacción | 201; 400 datos, fecha vencida, medicamento inactivo o ubicación inexistente |
| GET | `/inventario/entradas` | Ambos | Historial paginado de entradas | 200 |
| PUT | `/inventario/lotes/:id/baja` | ADMIN | Da de baja un lote con motivo opcional | 200; 404; 409 ya dado de baja |
| GET | `/inventario/configuracion` | Ambos | Umbrales del semáforo | 200 |
| PUT | `/inventario/configuracion` | ADMIN | Modifica los umbrales del semáforo (sin pantalla) | 200; 400 |
| GET | `/inventario/plantilla-excel` | ADMIN | Descarga la plantilla de importación | 200 archivo `.xlsx` |
| POST | `/inventario/importar-excel` | ADMIN | Importa lotes desde un archivo de Excel | 200 con el resumen por fila; 400 archivo o columnas inválidos |

Fuente: Elaboración propia con base en `inventario.routes.ts`.

Tabla 93.
Endpoints del módulo de dispensación y beneficiarios

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/dispensacion/beneficiarios/buscar` | Ambos | Busca beneficiarios activos por DPI o nombre | 200 |
| POST | `/dispensacion/beneficiarios` | Ambos | Registra un beneficiario | 201; 400; 409 DPI repetido |
| GET | `/dispensacion/beneficiarios/:id` | Ambos | Beneficiario con su historial de dispensaciones | 200; 404 |
| PUT | `/dispensacion/beneficiarios/:id` | Ambos | Edita un beneficiario | 200; 400; 404; 409 |
| POST | `/dispensacion/despachar` | Ambos | Registra una dispensación con descuento por vencimiento | 201; 400; 404 beneficiario o medicamento inactivo; 409 stock insuficiente o conflicto de concurrencia |
| GET | `/dispensacion/stock/:medicamentoId` | Ambos | Stock no vencido de un medicamento | 200 |
| GET | `/dispensacion/historial` | Ambos | Historial paginado de dispensaciones con filtros (sin uso en la interfaz) | 200; 400 fecha inválida |
| GET | `/dispensacion/:id` | Ambos | Detalle de una dispensación (sin uso en la interfaz) | 200; 404 |
| POST | `/dispensacion/:id/generar-token` | Ambos | Genera o reutiliza el token de captura | 200; 404; 409 evidencia completa |
| GET | `/dispensacion/:id/fotos` | Ambos | Fotografías registradas de una dispensación | 200 |
| GET | `/dispensacion/:id/foto/:tipo` | Ambos | Archivo de una fotografía de evidencia | 200 imagen; 400 tipo inválido; 404 |

Fuente: Elaboración propia con base en `dispensacion.routes.ts`.

Tabla 94.
Endpoints públicos de captura de evidencia

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/captura/:token/info` | Público (con token) | Datos de la dispensación para la pantalla del teléfono | 200; 404 enlace inválido o expirado |
| POST | `/captura/:token/foto` | Público (con token) | Sube la fotografía de receta o de entrega | 200; 400 tipo, formato, tamaño o imagen inválidos; 404 enlace inválido o expirado |

Fuente: Elaboración propia con base en `captura.routes.ts`.

Tabla 95.
Endpoints del módulo de reportes

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/reportes/dispensaciones` | Ambos | Dispensaciones por fechas, beneficiario y medicamento | 200; 400 fecha inválida |
| GET | `/reportes/consumo-medicamentos` | Ambos | Ranking de medicamentos dispensados | 200; 400 |
| GET | `/reportes/inventario-actual` | Ambos | Inventario por lote, por categoría y estado | 200; 400 estado inválido |
| GET | `/reportes/por-vencer` | Ambos | Lotes que vencen en un número de días (90 por defecto) | 200 |
| GET | `/reportes/entradas` | Ambos | Entradas por fechas con totales | 200; 400 |
| GET | `/reportes/medicamentos-baja` | Ambos | Lotes vencidos y dados de baja con unidades y costo perdidos | 200; 400 |
| GET | `/reportes/exportar/:tipo/:formato` | ADMIN | Exporta un reporte a PDF o Excel con los filtros aplicados | 200 archivo; 400 tipo, formato, fecha o más de 5000 registros |

Fuente: Elaboración propia con base en `reportes.routes.ts`.

Tabla 96.
Endpoint del módulo de auditoría

| Método | Ruta | Roles | Descripción | Respuestas principales |
|--------|------|-------|-------------|------------------------|
| GET | `/auditoria` | ADMIN | Bitácora paginada con filtros por usuario, acción, entidad y fechas | 200; 400 acción o fecha inválida |

Fuente: Elaboración propia con base en `auditoria.routes.ts`.

Las respuestas de éxito no tienen todavía un formato único: algunos módulos devuelven el objeto
directamente y otros lo envuelven en una propiedad `data`; los listados paginados devuelven `data` y
`pagination`. Esta diferencia no afecta al frontend, que conoce el formato de cada endpoint.

## 5.8 Diseño de seguridad

### 5.8.1 Autenticación

El acceso se controla con usuario y contraseña. Las contraseñas se guardan como hash bcrypt con costo
12 y nunca se devuelven en las respuestas. Al iniciar sesión, la API firma un token JWT con el
identificador, el nombre de usuario y el rol, con una vigencia de 8 horas por defecto y una clave de
firma que el servidor exige al arrancar. El navegador guarda el token en el almacenamiento local y el
cliente HTTP lo envía en la cabecera `Authorization` de cada petición; ante una respuesta 401, el
frontend borra la sesión y muestra la pantalla de inicio de sesión. El cierre de sesión solo borra
la sesión del navegador: no existe un endpoint para revocar un token, que sigue siendo válido hasta su
vencimiento mientras la cuenta esté activa.

El backend no confía únicamente en el contenido del token. En cada petición protegida,
`authMiddleware` verifica la firma y la vigencia, busca el usuario en la base de datos y rechaza la
petición si la cuenta ya no está activa; además, usa el rol que el usuario tiene en ese momento y no
el que llevaba el token. Al cargar la aplicación, el frontend también confirma el usuario y su rol con
el servidor.

### 5.8.2 Límites de intentos

El inicio de sesión tiene dos límites, que se presentan en la Tabla 97. Ambos se guardan en la memoria
del proceso de la API y responden con el código 429 y la cabecera `Retry-After`, sin verificar las
credenciales. El mensaje de credenciales inválidas es el mismo para un usuario inexistente, inactivo
o con contraseña incorrecta, para no revelar qué cuentas existen.

Tabla 97.
Límites de intentos de inicio de sesión

| Aspecto | Límite por dirección IP | Bloqueo por usuario e IP |
|---------|-------------------------|--------------------------|
| Qué se cuenta | Toda solicitud de inicio de sesión de la IP | Solo los intentos fallidos |
| Umbral | Más de 20 solicitudes | 3 fallos |
| Duración | Ventana de 10 minutos desde la primera solicitud | 5 minutos desde el tercer fallo |
| Reinicio | Al terminar la ventana | Al terminar el bloqueo o con un inicio de sesión correcto |
| Mensaje | "Demasiadas solicitudes de inicio de sesión desde esta red. Intente de nuevo más tarde." | "Demasiados intentos fallidos. Intente de nuevo en \<n\> minuto(s)." |

Fuente: Elaboración propia con base en `middleware/ipRateLimit.ts` y `middleware/loginRateLimit.ts`.

Las rutas públicas de captura no tienen límite de peticiones; su protección es el token aleatorio de
corta vigencia descrito en la sección 5.8.6.

### 5.8.3 Autorización y matriz de permisos

La autorización se aplica en dos lugares. En el backend, cada ruta declara el middleware
`requireRole('ADMIN')` cuando es exclusiva del Administrador; esta es la protección efectiva. En el
frontend, las rutas `/usuarios`, `/auditoria` y `/reportes` solo se muestran al Administrador, el menú
se filtra por rol y las páginas ocultan los botones de escritura a quien no tiene permiso. La Tabla
98 presenta la matriz de permisos por rol según el backend.

Tabla 98.
Matriz de permisos por rol

| Módulo | Funcionalidad | Administrador | Encargado de Beneficencia | Sin sesión |
|--------|---------------|---------------|---------------------------|------------|
| Autenticación | Iniciar sesión | Sí | Sí | Sí |
| Usuarios | Listar, crear, editar, activar o desactivar y restablecer contraseña | Sí | No | No |
| Catálogos | Consultar medicamentos, categorías, ubicaciones y códigos de barras | Sí | Sí | No |
| Catálogos | Crear y editar medicamentos, categorías, ubicaciones, códigos y fotografías | Sí | No | No |
| Catálogos | Consultar OpenFDA | Sí | No | No |
| Inventario | Consultar existencias, detalle, alertas, historial de entradas y umbrales | Sí | Sí | No |
| Inventario | Registrar entradas manuales | Sí | Sí | No |
| Inventario | Dar de baja lotes, modificar umbrales e importar desde Excel | Sí | No | No |
| Dispensación | Registrar, buscar y editar beneficiarios; dispensar; consultar historiales | Sí | Sí | No |
| Dispensación | Generar el token de captura y ver las fotografías de evidencia | Sí | Sí | No |
| Captura | Consultar la dispensación y subir fotografías | Con token | Con token | Con token vigente |
| Reportes | Consultar los seis reportes | Sí | Solo por API (la pantalla no se le muestra) | No |
| Reportes | Exportar a PDF o Excel | Sí | No | No |
| Auditoría | Consultar la bitácora | Sí | No | No |

Fuente: Elaboración propia con base en las rutas del backend y `frontend/src/App.tsx`.

La única diferencia entre los permisos del backend y lo que muestra la interfaz está en los reportes:
la API permite la consulta al Encargado de Beneficencia, pero la pantalla solo se muestra al
Administrador. Según la decisión R-07, el comportamiento correcto es el del backend.

### 5.8.4 Manejo de errores

Los errores se responden con un formato único, `{ "error": "mensaje" }`, mediante tres mecanismos que
se presentan en la Tabla 99. En todos, el detalle técnico de un error 500 solo se incluye cuando el
servidor corre en modo de desarrollo.

Tabla 99.
Mecanismos de manejo de errores

| Mecanismo | Dónde actúa | Comportamiento |
|-----------|-------------|----------------|
| Respuesta directa de la ruta | Validaciones dentro de cada endpoint | Responde 400, 404 o 409 con el mensaje de la regla; los errores de validación de esquema incluyen el detalle por campo |
| `responderError` | Rutas de dispensación, auditoría, reportes y edición de catálogos | Asigna el código según el texto del error (por ejemplo, stock insuficiente → 409, no encontrado → 404); una restricción única de la base de datos responde 409 y un registro inexistente, 404 |
| `errorHandler` global | Errores previos a la ruta (lectura del cuerpo y subida de archivos) y errores no capturados | JSON mal formado → 400; cuerpo mayor de 100 kB → 413; archivo demasiado grande o de tipo no permitido → 400; cualquier otro → 500 |

Fuente: Elaboración propia con base en `middleware/errorHandler.ts` y `utils/httpError.ts`.

Además, una ruta inexistente responde 404 con el mensaje "Ruta no encontrada", y la API envía las
cabeceras de seguridad de `helmet` sin la cabecera `X-Powered-By`. En producción, nginx agrega sus
propias cabeceras de seguridad a la aplicación.

### 5.8.5 Auditoría

Toda operación que modifica datos llama a la función `registrarAuditoria`, que guarda en la tabla
`log_auditoria` el usuario, la acción, la entidad, el identificador del registro, los datos anteriores
y nuevos y la dirección IP. La función se ejecuta después de completar la operación y captura sus
propios errores, de modo que un fallo de la auditoría no interrumpe la operación principal. La
bitácora no tiene endpoints de modificación ni de borrado y solo el Administrador la consulta. La
Tabla 100 resume qué acciones se registran.

Tabla 100.
Acciones registradas en la bitácora de auditoría

| Acción | Operaciones que la registran |
|--------|------------------------------|
| `LOGIN` | Inicio de sesión correcto y cada intento fallido de un usuario existente |
| `CREAR` | Alta de usuarios, medicamentos, códigos de barras, categorías, ubicaciones, entradas (también las importadas) y beneficiarios; generación del token de captura; subida de fotografías; exportación de reportes |
| `EDITAR` | Edición de usuarios y restablecimiento de contraseña; edición, activación o desactivación y fotografía de medicamentos; edición de categorías, ubicaciones y beneficiarios; cambio de umbrales |
| `ELIMINAR` | Eliminación de un código de barras |
| `DISPENSAR` | Registro de una dispensación |
| `BAJA` | Baja de un lote, con el motivo si se escribió |
| `ACTIVAR` y `DESACTIVAR` | Cambio de estado de un usuario |

Fuente: Elaboración propia con base en las llamadas a `registrarAuditoria` del backend.

Algunas modificaciones automáticas no se registran: el cambio de lotes a vencido y la eliminación de
tokens que hace la tarea diaria, la marca de token usado y la vinculación de códigos de barras durante
la importación. Los intentos de inicio de sesión con un usuario inexistente tampoco se registran,
porque el registro exige un usuario existente; la acción `LOGOUT` existe en la enumeración pero no se
usa. La subida de fotografías se registra a nombre del usuario que hizo la dispensación y sin
dirección IP.

### 5.8.6 Protección de la evidencia fotográfica

Las fotografías de recetas y entregas contienen datos personales de los beneficiarios, por lo que su
diseño combina un acceso público limitado para subirlas con un acceso autenticado para verlas:

1. El teléfono no inicia sesión: su credencial es un token aleatorio de 64 bits que solo sirve para
   una dispensación, vence a los 30 minutos y deja de servir cuando se completan las dos fotografías.
   Un token inexistente, vencido o usado recibe el mismo mensaje, para no revelar cuál es el caso.
2. Solo se aceptan los tipos receta y entrega, en JPG, PNG o WEBP de hasta 5 MB. El contenido se
   decodifica y se guarda recodificado en WebP, lo que descarta archivos que no sean imágenes.
3. No se genera un token nuevo para una dispensación con la evidencia completa, de modo que las
   fotografías no se pueden reemplazar después.
4. Las fotografías no se sirven como archivos estáticos. Se entregan solo por un endpoint que exige
   sesión, toma la ruta del archivo del registro en la base de datos, verifica que quede dentro de la
   carpeta de evidencias y responde sin permitir que el navegador guarde una copia en caché. La
   interfaz las descarga con el token de la sesión.

El enlace del código QR viaja por HTTP en la red local, sin cifrado, porque el sistema no usa HTTPS.

## 5.9 Diseño de la interfaz

La interfaz es una aplicación de una sola página con un menú lateral que se puede contraer a una
barra de iconos en escritorio y que se muestra como menú desplegable en pantallas pequeñas. Usa los
colores institucionales de la Municipalidad de Gualán, componentes reutilizables (botones, tablas,
campos, diálogos de confirmación y etiquetas de estado) y notificaciones emergentes para informar el
resultado de cada operación. La Tabla 101 presenta las pantallas principales y los roles que tienen
acceso a cada una.

Tabla 101.
Pantallas principales y acceso por rol

| Pantalla | Ruta | Menú | Contenido principal | Administrador | Encargado de Beneficencia |
|----------|------|------|---------------------|---------------|---------------------------|
| Inicio de sesión | `/login` | — | Formulario de usuario y contraseña | Sí | Sí |
| Panel | `/` | Dashboard | Estado general, acciones rápidas, indicadores, alertas y entradas recientes | Sí | Sí |
| Dispensación | `/dispensacion` | Dispensación | Pasos de beneficiario, medicamentos y confirmación; pantalla de evidencia con código QR | Sí | Sí |
| Beneficiarios | `/beneficiarios` | Beneficiarios | Listado, búsqueda, registro, edición e historial con fotografías | Sí | Sí |
| Existencias | `/inventario` | Inventario › Existencias | Tabla de existencias con semáforo y detalle de lotes | Sí (con baja de lotes) | Sí (solo consulta) |
| Registrar entrada | `/entradas` | Inventario › Registrar entrada | Formulario de lotes, historial de entradas e importación desde Excel | Sí (con importación y alta de medicamentos) | Sí (sin importación) |
| Catálogos | `/catalogos` | Catálogos | Pestañas de medicamentos, categorías y ubicaciones | Sí (con edición) | Sí (solo consulta) |
| Reportes | `/reportes` | Reportes | Seis pestañas de reportes con filtros y exportación | Sí | No |
| Usuarios | `/usuarios` | Administración › Usuarios | Gestión de cuentas | Sí | No |
| Auditoría | `/auditoria` | Administración › Auditoría | Bitácora con filtros y detalle | Sí | No |
| Captura | `/captura/:token` | — | Pantalla para teléfono, sin menú ni sesión | Con enlace vigente | Con enlace vigente |

Fuente: Elaboración propia con base en `frontend/src/App.tsx` y `components/layout/Layout.tsx`.

La navegación sigue el rol del usuario. Sin sesión, cualquier ruta interna redirige a la pantalla de
inicio de sesión y, tras iniciarla, el sistema abre el panel. Un usuario que no es Administrador y
escribe la dirección de una pantalla exclusiva es redirigido al panel, y una dirección inexistente
también lleva al panel. Las direcciones antiguas de los catálogos (`/medicamentos`, `/categorias` y
`/ubicaciones`) redirigen a la pestaña correspondiente de `/catalogos`. Desde el panel, las acciones
rápidas y los paneles de alertas llevan a Dispensación, Registrar entrada, Existencias o Catálogos.
La Figura 28 muestra el panel con datos de prueba: el banner de estado, las acciones rápidas, los
indicadores y los paneles de alertas.

Figura 28.
Panel principal

{{imagen: cap5_panel.png}}

Fuente: Elaboración propia.

Las pantallas de trabajo diario están diseñadas para el uso con lector de códigos de barras. En
Registrar entrada, cada lote tiene un campo de lectura que selecciona el medicamento; en
Dispensación, el campo de lectura recibe el foco al elegir al beneficiario y lo recupera después de
cada lectura. La dispensación se organiza en tres pasos (beneficiario, medicamentos y confirmación),
termina con un diálogo de confirmación y muestra después la pantalla de evidencia, con las pestañas
"QR Celular" y "Subir desde PC" y el estado de cada fotografía. La Figura 29 muestra los pasos de
medicamentos y confirmación de una dispensación, y la Figura 30, la pantalla de evidencia con el
código QR que se genera al registrarla.

Figura 29.
Pantalla de dispensación

{{imagen: cap5_dispensacion.png}}

Fuente: Elaboración propia.

Figura 30.
Pantalla de evidencia con código QR

{{imagen: cap5_evidencia_qr.png}}

Fuente: Elaboración propia.

La pantalla de captura está diseñada para un teléfono: tiene un ancho máximo de 420 píxeles, botones
de al menos 60 píxeles de alto y abre directamente la cámara trasera. Muestra el nombre del
beneficiario, un botón por cada fotografía pendiente y, al terminar, el mensaje "Todo listo". La
Figura 31 muestra esta pantalla en una vista simulada en tamaño de teléfono, tomada en las pruebas
funcionales (caso CP-77); no corresponde a un teléfono real.

Figura 31.
Pantalla de captura (vista simulada en tamaño de teléfono)

{{imagen: cap5_captura_celular.png | ancho=7cm}}

Fuente: Elaboración propia.

En la tabla de existencias, el semáforo de vencimiento se presenta con color y con texto ("Sin
riesgo", "Por vencer", "Urgente" o "Vencido"), y en la lista de la dispensación, con color y con los
días que faltan para el vencimiento, de modo que la información no depende solo del color. Las fechas se muestran en formato dd/mm/aaaa y las horas en formato de 24 horas.
En la Figura 32 se muestra la tabla de existencias filtrada con los medicamentos de prueba, con el
semáforo de cada medicamento.

Figura 32.
Tabla de existencias con semáforo de vencimiento

{{imagen: cap5_existencias_semaforo.png}}

Fuente: Elaboración propia.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa.

Kruchten, P. B. (1995). The 4+1 view model of architecture. *IEEE Software, 12*(6), 42–50.
https://doi.org/10.1109/52.469759
