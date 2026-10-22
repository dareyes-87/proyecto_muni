# CAPÍTULO V

# 5 ANÁLISIS Y DISEÑO

Este capítulo explica cómo está diseñado FarmaG para cumplir los requerimientos del capítulo 4. Se
presentan el proceso principal del sistema, la entrega de medicamentos, el ciclo de vida de un lote,
la base de datos, la arquitectura, la seguridad y las pantallas.

## 5.1 Diagrama de actividad de la entrega de medicamentos

La Figura 16 muestra el proceso de entrega de medicamentos, que es el centro del sistema. El
Encargado busca al beneficiario por nombre o DPI y, si no está registrado, lo registra. Luego agrega
los medicamentos, con el lector de código de barras o por nombre, indica la cantidad y confirma. El
sistema revisa que haya existencias suficientes: si no alcanzan, avisa y no registra nada; si
alcanzan, descuenta las unidades del lote que vence primero, guarda la entrega y muestra un código QR
para tomar, si se desea, las fotografías de respaldo.

Figura 16.
Diagrama de actividad de la dispensación

{{imagen: v2_actividad_dispensacion.png}}

Fuente: Elaboración propia.

## 5.2 Diagrama de secuencia de la entrega

La Figura 19 muestra cómo se comunican la pantalla, el servidor y la base de datos al confirmar una
entrega. El servidor reserva los lotes del medicamento, ordenados por fecha de vencimiento, comprueba
que haya existencias, descuenta las unidades empezando por el lote que vence primero y guarda la
entrega con su detalle. Mientras dura esta operación, otra entrega del mismo medicamento debe esperar,
y cuando continúa ya ve las existencias actualizadas. Así se evita que las mismas unidades se
entreguen dos veces.

Figura 19.
Diagrama de secuencia de la dispensación

{{imagen: v2_secuencia_dispensacion.png}}

Fuente: Elaboración propia.

## 5.3 Diagrama de estados del lote

La Figura 22 muestra los estados por los que pasa un lote. Todo lote nace disponible al registrar una
entrada. Con las entregas sigue disponible mientras le queden unidades y pasa a agotado cuando llega
a cero. Cada día, el sistema marca como vencidos los lotes que alcanzaron su fecha de vencimiento, y
el Administrador puede dar de baja un lote en cualquier momento. Un lote agotado, vencido o dado de
baja no vuelve a estar disponible, porque la farmacia no acepta devoluciones ni ajustes de
existencias.

Figura 22.
Diagrama de estados del lote

{{imagen: v2_estados_lote.png}}

Fuente: Elaboración propia.

## 5.4 Modelo del dominio

La información del sistema se organiza en cuatro grupos: seguridad (usuarios, bitácora y
configuración), catálogos (categorías, medicamentos, códigos de barras y ubicaciones), inventario
(entradas y lotes) y dispensación (beneficiarios, entregas y fotografías). Tres decisiones definen el
modelo. Las existencias no se guardan en el medicamento, sino que se calculan sumando sus lotes, y
cada lote conserva su propia fecha de vencimiento. Cada entrega guarda una copia de los datos del
medicamento y el lote exacto del que salió, para que el historial no cambie si después se modifica
el catálogo. Y nada se borra: los registros se desactivan, para conservar la historia completa.

## 5.5 Modelo de datos

La base de datos se implementó en PostgreSQL. La Figura 25 muestra sus 14 tablas con sus campos,
las llaves primarias (PK), las llaves foráneas (FK) y la forma en que se relacionan entre sí. La
Tabla 71 describe el propósito de cada una.

Figura 25.
Diagrama entidad-relación

{{imagen: v3_entidad_relacion.png}}

Fuente: Elaboración propia.

Tabla 71.
Tablas de la base de datos

| Tabla | Propósito |
|-------|-----------|
| usuarios | Cuentas de acceso con su rol y su estado |
| categorias | Clasificación de los medicamentos |
| medicamentos | Catálogo de medicamentos con su existencia mínima |
| codigos_barras | Códigos de barras de cada medicamento |
| ubicaciones | Estantes o lugares donde se guardan los lotes |
| entradas | Cada recepción de medicamentos |
| lotes | Unidades recibidas por lote, con su vencimiento y su estado |
| beneficiarios | Personas que reciben medicamentos |
| dispensaciones | Cada entrega a un beneficiario |
| detalle_dispensaciones | Unidades entregadas de cada lote |
| fotos_dispensacion | Fotografías de respaldo de cada entrega |
| tokens_captura | Enlaces temporales del código QR |
| log_auditoria | Bitácora de las acciones de los usuarios |
| configuracion_sistema | Parámetros del sistema, como los plazos del indicador de vencimiento |

Fuente: Elaboración propia.

## 5.6 Arquitectura del sistema

La arquitectura se describe con el modelo de vistas 4+1, que presenta el sistema desde varios puntos
de vista complementarios (Kruchten, 1995).

En la vista lógica, FarmaG es una aplicación web de tres capas: la interfaz, hecha en React, que se
usa desde el navegador; el servidor, en Node.js con Express, organizado en los mismos módulos del
sistema; y la base de datos PostgreSQL. En la vista de procesos, el servidor atiende a los usuarios y
además ejecuta tareas automáticas: marca cada día los lotes vencidos y genera respaldos de la base de
datos cada 12 horas. La vista de desarrollo corresponde a la organización del código en esas mismas
capas y módulos, y la vista de escenarios, a los casos de uso del capítulo 4.

La vista física se muestra en la Figura 27. El sistema funciona en un servidor de la red local de la
municipalidad, con cuatro contenedores: la aplicación web, el servidor de la aplicación, la base de
datos y el servicio de respaldos. Las computadoras de la farmacia y el teléfono de las fotografías
entran al sistema con un navegador.

Figura 27.
Diagrama de despliegue

{{imagen: v2_despliegue.png}}

Fuente: Elaboración propia.

## 5.7 Diseño de seguridad

El acceso se controla con usuario y contraseña. Las contraseñas se guardan cifradas y nunca se
muestran. Al iniciar sesión, el usuario recibe una sesión válida por 8 horas, y en cada operación el
sistema comprueba que la cuenta siga activa y que el rol le permita hacerla; si un usuario se
desactiva, pierde el acceso de inmediato. Tras tres intentos fallidos, el inicio de sesión se bloquea
durante cinco minutos. Las fotografías de respaldo se suben con un enlace que vence a los 30 minutos y
solo pueden verse con una sesión iniciada.

Los permisos de cada rol se aplican en el servidor y la interfaz oculta las opciones que el usuario no
puede usar. La Tabla 75 resume los permisos por módulo.

Tabla 75.
Permisos por rol

| Módulo | Administrador | Encargado de Beneficencia |
|--------|---------------|---------------------------|
| Usuarios | Gestión completa | Sin acceso |
| Catálogos | Consulta y modificación | Solo consulta |
| Inventario | Consulta, entradas, carga desde Excel y baja de lotes | Consulta y entradas |
| Beneficiarios y entregas | Acceso completo | Acceso completo |
| Fotografías de respaldo | Generar el código QR y ver las fotografías | Generar el código QR y ver las fotografías |
| Reportes | Consulta y exportación | Sin acceso desde la interfaz |
| Bitácora | Consulta | Sin acceso |

Fuente: Elaboración propia.

Toda operación que modifica datos, cada inicio de sesión y cada exportación de reportes queda en la
bitácora, con el usuario, la acción, los datos anteriores y nuevos y la fecha. La bitácora no se
puede modificar ni borrar desde el sistema, y solo el Administrador puede consultarla.

## 5.8 Diseño de la interfaz

La interfaz tiene un menú lateral que en pantallas pequeñas se convierte en un menú desplegable, usa
los colores institucionales de la Municipalidad de Gualán e informa el resultado de cada operación
con un aviso breve. La Tabla 76 presenta las pantallas principales.

Tabla 76.
Pantallas principales y acceso por rol

| Pantalla | Contenido principal | Roles |
|----------|---------------------|-------|
| Inicio de sesión | Usuario y contraseña | Todos |
| Panel | Estado general, accesos rápidos, indicadores y alertas | Ambos |
| Dispensación | Beneficiario, medicamentos, confirmación y código QR | Ambos |
| Beneficiarios | Registro, búsqueda e historial con fotografías | Ambos |
| Existencias | Existencias con indicador de vencimiento y detalle de lotes | Ambos; baja de lotes solo el Administrador |
| Registrar entrada | Lotes, historial de entradas y carga desde Excel | Ambos; carga desde Excel solo el Administrador |
| Catálogos | Medicamentos, categorías y ubicaciones | Ambos; modificación solo el Administrador |
| Reportes | Seis reportes con filtros y exportación | Administrador |
| Usuarios | Gestión de cuentas | Administrador |
| Auditoría | Bitácora con filtros | Administrador |

Fuente: Elaboración propia.

Al entrar al sistema se abre el panel principal, que se muestra en la Figura 28 con datos de prueba:
el aviso de estado, los accesos rápidos, los indicadores del día y las alertas.

Figura 28.
Panel principal

{{imagen: cap5_panel.png}}

Fuente: Elaboración propia.

Las pantallas de trabajo diario están pensadas para usarse con el lector de código de barras. La
entrega de medicamentos se hace en tres pasos, beneficiario, medicamentos y confirmación, como se ve
en la Figura 29.

Figura 29.
Pantalla de dispensación

{{imagen: cap5_dispensacion.png}}

Fuente: Elaboración propia.

En la pantalla de existencias, el indicador de vencimiento se muestra con color y con texto ("Sin
riesgo", "Por vencer", "Urgente" o "Vencido"), para que la información no dependa solo del color. La
Figura 32 muestra esta pantalla.

Figura 32.
Tabla de existencias con semáforo de vencimiento

{{imagen: cap5_existencias_semaforo.png}}

Fuente: Elaboración propia.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa.

Kruchten, P. B. (1995). The 4+1 view model of architecture. *IEEE Software, 12*(6), 42–50.
https://doi.org/10.1109/52.469759
