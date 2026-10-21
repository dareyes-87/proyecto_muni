# CAPÍTULO V

# 5 ANÁLISIS Y DISEÑO

Este capítulo describe cómo está construido FarmaG para cumplir los requerimientos del capítulo 4.
Presenta el comportamiento del proceso crítico, la dispensación, mediante diagramas de actividad y de
secuencia; el ciclo de vida del lote; el modelo del dominio y el modelo de datos; la arquitectura
según el modelo de vistas 4+1 (Kruchten, 1995); la organización de la API; el diseño de seguridad y
el diseño de la interfaz. Los diagramas siguen la notación UML 2.5.

## 5.1 Diagrama de actividad

La Figura 16 muestra la dispensación (CU-15), el proceso central del sistema, separada en dos
carriles: las acciones del Encargado y las del sistema. El Encargado busca al beneficiario por nombre
o DPI y, si no está registrado, lo registra; después agrega los medicamentos, por código de barras o
por nombre, con su cantidad, y confirma. El sistema verifica el stock disponible: si no alcanza, avisa
y termina sin registrar nada; si alcanza, descuenta las unidades del lote que vence primero, registra
la dispensación y la bitácora y muestra el código QR, con el que el Encargado puede tomar, de forma
opcional, las fotografías de la receta y de la entrega.

Figura 16.
Diagrama de actividad de la dispensación

{{imagen: v2_actividad_dispensacion.png}}

Fuente: Elaboración propia.

## 5.2 Diagrama de secuencia

La Figura 19 presenta los mensajes que intercambian el usuario, la interfaz web, la API y la base de
datos al confirmar una dispensación. La API abre una transacción, bloquea los lotes disponibles del
medicamento ordenados por fecha de vencimiento, verifica que el stock sea suficiente y descuenta las
unidades empezando por el lote que vence primero; después guarda la dispensación con su detalle y
confirma la transacción. El bloqueo de los lotes hace que una segunda dispensación simultánea espere a
que termine la primera y lea el stock ya descontado, de modo que las mismas unidades no se entregan
dos veces. Por último, la API registra la operación en la bitácora y la interfaz muestra la
confirmación y el código QR.

Figura 19.
Diagrama de secuencia de la dispensación

{{imagen: v2_secuencia_dispensacion.png}}

Fuente: Elaboración propia.

## 5.3 Diagrama de estados del lote

La Figura 22 muestra los estados de un lote. Todo lote nace disponible al registrar una entrada. Una
dispensación lo mantiene disponible mientras le queden unidades o lo pasa a agotado cuando llega a
cero. El proceso diario lo pasa a vencido cuando se alcanza su fecha de vencimiento, y el
Administrador puede darlo de baja desde cualquiera de los otros tres estados. No hay transiciones de
regreso: como no existen devoluciones ni ajustes de existencias, un lote agotado, vencido o dado de
baja no vuelve a estar disponible. El semáforo de vencimiento no es un estado guardado, sino que se
calcula en cada consulta.

Figura 22.
Diagrama de estados del lote

{{imagen: v2_estados_lote.png}}

Fuente: Elaboración propia.

## 5.4 Modelo del dominio

El dominio se organiza en cuatro paquetes: seguridad y auditoría (usuario, bitácora y configuración),
catálogos (categoría, medicamento, código de barras y ubicación), inventario (entrada y lote) y
dispensación (beneficiario, dispensación, detalle, fotografía y enlace de captura). Tres decisiones de
diseño definen el modelo. La primera es que el stock no es un atributo del medicamento: se obtiene de
la suma de las cantidades de sus lotes, y cada lote conserva su propia fecha de vencimiento, lo que
permite despachar en orden de vencimiento. La segunda es que el detalle de dispensación guarda una
copia del nombre, la presentación y la concentración del medicamento y el lote exacto descontado, de
modo que el historial no cambia si después se edita el catálogo. La tercera es que la entrada y la
dispensación se componen de sus lotes y detalles, y cada dispensación tiene como máximo dos
fotografías, una por tipo.

## 5.5 Modelo de datos

El modelo de datos se implementa en PostgreSQL 16 y los cambios de esquema se aplican mediante
migraciones versionadas. La Figura 25 muestra las 14 tablas con su clave primaria y la cardinalidad
de sus relaciones. Todas las claves primarias son identificadores UUID. Las claves foráneas impiden
borrar un registro que tenga registros dependientes y, como el sistema usa desactivación en lugar de
borrado, en la práctica protegen la integridad del historial. La tabla de configuración no se
relaciona con las demás, y la bitácora solo se relaciona con el usuario que realizó cada acción.

Figura 25.
Diagrama entidad-relación

{{imagen: v2_entidad_relacion.png}}

Fuente: Elaboración propia.

La Tabla 71 describe el propósito de cada tabla.

Tabla 71.
Tablas de la base de datos

| Tabla | Propósito |
|-------|-----------|
| `usuarios` | Cuentas de acceso con su rol y su estado |
| `categorias` | Clasificación terapéutica de los medicamentos |
| `medicamentos` | Catálogo de medicamentos con su stock mínimo |
| `codigos_barras` | Códigos de barras que identifican a cada medicamento |
| `ubicaciones` | Estantes o lugares donde se guardan los lotes |
| `entradas` | Cada recepción de medicamentos registrada |
| `lotes` | Unidades recibidas por lote, con su vencimiento y su estado; aquí reside el stock |
| `beneficiarios` | Personas que reciben medicamentos sin costo |
| `dispensaciones` | Cada entrega a un beneficiario |
| `detalle_dispensaciones` | Unidades entregadas de cada lote, con una copia de los datos del medicamento |
| `fotos_dispensacion` | Fotografías de la receta y de la entrega de cada dispensación |
| `tokens_captura` | Enlaces temporales para subir fotografías desde el teléfono |
| `log_auditoria` | Bitácora de las acciones de los usuarios |
| `configuracion_sistema` | Umbrales del semáforo de vencimiento y nombre de la farmacia |

Fuente: Elaboración propia.

## 5.6 Arquitectura del sistema

La arquitectura se describe con el modelo de vistas 4+1, que organiza la descripción de un sistema en
cuatro vistas, cada una dirigida a un tipo de interesado, y una quinta vista de escenarios que las
relaciona y valida (Kruchten, 1995). La Tabla 72 resume cada vista y dónde se representa.

Tabla 72.
Vistas de la arquitectura según el modelo 4+1

| Vista | Qué describe | Representación |
|-------|--------------|----------------|
| Lógica | Capas de la aplicación y paquetes del dominio | Sección 5.4 y Figura 25 |
| De procesos | Procesos en ejecución, concurrencia y tareas programadas | Figuras 16 y 19 |
| De desarrollo | Organización del código en componentes | Tabla 73 |
| Física | Servidor, contenedores y equipos cliente | Figura 27 |
| Escenarios | Casos de uso que recorren las demás vistas | Sección 4.6 |

Fuente: Elaboración propia con base en Kruchten (1995).

### 5.6.1 Vista lógica

FarmaG es una aplicación web de tres capas. La capa de presentación es una aplicación de una sola
página escrita en React, que se ejecuta en el navegador y se comunica con el servidor solo por HTTP.
La capa de lógica es una API REST en Node.js con Express, organizada por módulos que corresponden a
los paquetes del dominio descritos en la sección 5.4. La capa de datos es PostgreSQL, a la que la API
accede mediante el ORM Prisma.

### 5.6.2 Vista de procesos

En producción se ejecutan de forma permanente el servidor web, la API y la base de datos. Dentro de la
API corre la tarea programada que marca los lotes vencidos cada día a las 00:05 y al arrancar; un
contenedor aparte genera respaldos de la base de datos cada 12 horas, y la API saca otro respaldo
antes de aplicar cambios de esquema. La concurrencia relevante para el negocio está en la
dispensación: hasta cuatro usuarios pueden dispensar al mismo tiempo. El diseño resuelve el conflicto
en la base de datos, como se mostró en las Figuras 16 y 19: cada dispensación es una transacción que
bloquea los lotes que va a descontar y que se reintenta hasta tres veces si la base de datos detecta
un conflicto con otra dispensación simultánea.

### 5.6.3 Vista de desarrollo

El código se organiza en los componentes de la Tabla 73. En el frontend, las páginas usan un cliente
HTTP común que agrega el token de sesión; la página pública de captura usa uno propio, sin sesión. En
el backend, las rutas de cada módulo dependen del middleware de autenticación y auditoría, y las de
mayor lógica delegan en los servicios.

Tabla 73.
Componentes del sistema

| Componente | Responsabilidad |
|------------|-----------------|
| Interfaz web (React) | Pantallas, navegación según el rol y llamadas a la API con la sesión del usuario |
| Página de captura | Pantalla pública para el teléfono, sin menú ni sesión |
| Rutas de la API | Una por módulo; reciben las peticiones, validan los datos y aplican los permisos |
| Servicios | Reglas de negocio complejas: dispensación, inventario, reportes y vencimientos |
| Middleware | Autenticación, autorización, auditoría y manejo de errores |
| Utilidades | Generación de PDF y Excel, procesamiento de imágenes y validación de fechas |
| Acceso a datos (Prisma) | Cliente único para todas las consultas a PostgreSQL |
| Servicio externo OpenFDA | Sugiere los datos de un medicamento a partir de su código de barras |

Fuente: Elaboración propia.

### 5.6.4 Vista física

La Figura 27 muestra el diagrama de despliegue en el modo de producción. El sistema se ejecuta en un
servidor de la red local de la municipalidad, con Docker, en cuatro contenedores: `web`, con nginx y
la aplicación compilada; `api`, con Node.js; `db`, con PostgreSQL; y `backup`, que genera los
respaldos. El único puerto expuesto a la red local es el 80 del contenedor `web`, que reenvía a la API
las peticiones de datos; la API y la base de datos solo son accesibles desde el propio servidor. Los
equipos de escritorio y el teléfono de captura acceden con un navegador. Según la guía de despliegue,
la actualización automática del servidor usa la configuración por defecto, que corresponde al modo de
desarrollo salvo que las variables del servidor la cambien; esta situación es el riesgo 3 de la
Tabla 9 y no se comprobó en el equipo.

Figura 27.
Diagrama de despliegue

{{imagen: v2_despliegue.png}}

Fuente: Elaboración propia.

### 5.6.5 Escenarios

La vista de escenarios relaciona las demás mediante casos de uso concretos: los 19 casos de uso de la
sección 4.6. El que recorre más elementos de la arquitectura es la dispensación (CU-15), que involucra
las clases de dispensación y lote, la transacción con bloqueo de lotes, el servicio de dispensación y
todos los nodos físicos, incluido el teléfono que captura la evidencia.

## 5.7 Especificación de la API

La API REST expone sus funciones bajo el prefijo `/api`, agrupadas en los módulos de la Tabla 74. Las
peticiones y respuestas usan JSON, salvo la subida de imágenes y de archivos de Excel y las descargas
de archivos. Todo error responde con un mensaje en español que la interfaz muestra al usuario. Las
funciones exclusivas del Administrador se protegen en el servidor, y solo cuatro rutas son públicas:
el inicio de sesión, el estado del servicio y las dos de captura de fotografías. La especificación
completa de cada función se presenta en el Anexo D.

Tabla 74.
Módulos de la API

| Módulo | Función principal | Roles |
|--------|-------------------|-------|
| Autenticación | Inicio de sesión y perfil del usuario | Público para iniciar sesión; ambos roles para el perfil |
| Usuarios | Administración de cuentas | Administrador |
| Catálogos | Medicamentos, códigos de barras, categorías, ubicaciones y consulta a OpenFDA | Ambos consultan; el Administrador modifica |
| Inventario | Existencias, alertas, entradas, baja de lotes, umbrales e importación desde Excel | Ambos; baja, umbrales e importación solo el Administrador |
| Dispensación | Beneficiarios, dispensación, stock y evidencia fotográfica | Ambos |
| Captura | Datos de la dispensación y subida de fotografías desde el teléfono | Público con enlace vigente |
| Reportes | Seis reportes y su exportación a PDF o Excel | Ambos consultan; el Administrador exporta |
| Auditoría | Consulta de la bitácora | Administrador |

Fuente: Elaboración propia.

## 5.8 Diseño de seguridad

### 5.8.1 Autenticación y límites de intentos

El acceso se controla con usuario y contraseña. Las contraseñas se guardan como hash bcrypt y nunca se
devuelven. Al iniciar sesión, la API firma un token JWT con una vigencia de 8 horas que el navegador
envía en cada petición. El servidor no confía solo en el token: en cada petición comprueba que la
cuenta siga activa y usa el rol que el usuario tiene en ese momento, de modo que una desactivación o
un cambio de rol surten efecto de inmediato. El inicio de sesión tiene dos límites: un máximo de 20
solicitudes por dirección IP en 10 minutos y un bloqueo de 5 minutos tras 3 intentos fallidos del
mismo usuario desde la misma IP; el mensaje de credenciales inválidas es el mismo en todos los casos,
para no revelar qué cuentas existen. Las fotografías de evidencia se suben con un enlace aleatorio que
vence a los 30 minutos y solo se pueden ver con sesión.

### 5.8.2 Matriz de permisos

La autorización se aplica en el servidor, que es la protección efectiva, y la interfaz oculta las
opciones que el rol no puede usar. La Tabla 75 resume los permisos por módulo.

Tabla 75.
Matriz de permisos por rol

| Módulo | Administrador | Encargado de Beneficencia | Sin sesión |
|--------|---------------|---------------------------|------------|
| Usuarios | Gestión completa | Sin acceso | Sin acceso |
| Catálogos | Consulta y modificación | Solo consulta | Sin acceso |
| Inventario | Consulta, entradas, importación y baja de lotes | Consulta y entradas manuales | Sin acceso |
| Beneficiarios y dispensación | Acceso completo | Acceso completo | Sin acceso |
| Evidencia fotográfica | Generar el enlace y ver las fotografías | Generar el enlace y ver las fotografías | Subir fotografías con un enlace vigente |
| Reportes | Consulta y exportación | Consulta solo por la API | Sin acceso |
| Auditoría | Consulta | Sin acceso | Sin acceso |

Fuente: Elaboración propia.

La única diferencia entre los permisos del servidor y lo que muestra la interfaz está en los
reportes: la API permite la consulta al Encargado de Beneficencia, pero la pantalla solo se muestra
al Administrador. Según la decisión R-07, el comportamiento correcto es el del servidor.

### 5.8.3 Auditoría

Toda operación que modifica datos, cada inicio de sesión y cada exportación de reportes se registran
en la bitácora con el usuario, la acción, la entidad afectada, los datos anteriores y nuevos, la fecha
y la dirección IP. El registro se hace después de completar la operación y un fallo de la auditoría no
la interrumpe. La bitácora no se puede modificar ni borrar desde el sistema y solo el Administrador la
consulta. No se registran los cambios automáticos del proceso diario ni los intentos de inicio de
sesión con un usuario inexistente.

## 5.9 Diseño de la interfaz

La interfaz es una aplicación de una sola página con un menú lateral que se puede contraer a una
barra de iconos en escritorio y que se muestra como menú desplegable en pantallas pequeñas. Usa los
colores institucionales de la Municipalidad de Gualán, componentes reutilizables y notificaciones
emergentes para informar el resultado de cada operación. La Tabla 76 presenta las pantallas
principales y los roles que tienen acceso a cada una.

Tabla 76.
Pantallas principales y acceso por rol

| Pantalla | Contenido principal | Roles |
|----------|---------------------|-------|
| Inicio de sesión | Usuario y contraseña | Todos |
| Panel | Estado general, accesos rápidos, indicadores y alertas | Ambos |
| Dispensación | Beneficiario, medicamentos, confirmación y evidencia con código QR | Ambos |
| Beneficiarios | Registro, búsqueda e historial con fotografías | Ambos |
| Existencias | Existencias con semáforo y detalle de lotes | Ambos; baja de lotes solo el Administrador |
| Registrar entrada | Lotes, historial de entradas e importación desde Excel | Ambos; importación solo el Administrador |
| Catálogos | Medicamentos, categorías y ubicaciones | Ambos; modificación solo el Administrador |
| Reportes | Seis reportes con filtros y exportación | Administrador |
| Usuarios | Gestión de cuentas | Administrador |
| Auditoría | Bitácora con filtros | Administrador |
| Captura | Pantalla del teléfono, sin menú ni sesión | Con enlace vigente |

Fuente: Elaboración propia.

Sin sesión, cualquier pantalla interna lleva al inicio de sesión y, tras iniciarla, el sistema abre
el panel; un usuario que no es Administrador y escribe la dirección de una pantalla exclusiva vuelve
al panel. La Figura 28 muestra el panel con datos de prueba: el aviso de estado, las acciones
rápidas, los indicadores y los paneles de alertas.

Figura 28.
Panel principal

{{imagen: cap5_panel.png}}

Fuente: Elaboración propia.

Las pantallas de trabajo diario están diseñadas para el uso con lector de códigos de barras: en
Dispensación, el campo de lectura recibe el foco al elegir al beneficiario y lo recupera después de
cada lectura. La dispensación se organiza en tres pasos (beneficiario, medicamentos y confirmación) y
termina con un diálogo de confirmación, tras el cual se muestra la pantalla de evidencia con el
código QR. La Figura 29 muestra los pasos de medicamentos y confirmación de una dispensación.

Figura 29.
Pantalla de dispensación

{{imagen: cap5_dispensacion.png}}

Fuente: Elaboración propia.

En la tabla de existencias, el semáforo de vencimiento se presenta con color y con texto ("Sin
riesgo", "Por vencer", "Urgente" o "Vencido"), de modo que la información no depende solo del color.
Las fechas se muestran en formato dd/mm/aaaa y las horas en formato de 24 horas. En la Figura 32 se
muestra la tabla de existencias con los medicamentos de prueba y el semáforo de cada uno.

Figura 32.
Tabla de existencias con semáforo de vencimiento

{{imagen: cap5_existencias_semaforo.png}}

Fuente: Elaboración propia.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa.

Kruchten, P. B. (1995). The 4+1 view model of architecture. *IEEE Software, 12*(6), 42–50.
https://doi.org/10.1109/52.469759
