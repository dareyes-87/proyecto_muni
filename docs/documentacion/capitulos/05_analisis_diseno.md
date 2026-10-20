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
