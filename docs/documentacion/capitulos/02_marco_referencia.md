# CAPÍTULO II

# 2 MARCO DE REFERENCIA

Este capítulo describe los conceptos del dominio, el proceso de desarrollo, los estándares y las
tecnologías en los que se basa el sistema FarmaG. Para cada tecnología se indica qué es, según su
documentación oficial, y qué función cumple en el sistema. El equipo de desarrollo no dejó un registro
escrito de los criterios con que eligió cada tecnología, por lo que la justificación se expresa en función de
lo que cada tecnología resuelve en el sistema implementado.

## 2.1 Dispensación de medicamentos

La dispensación es el acto de entregar un medicamento a un paciente o beneficiario.
En la Farmacia Municipal de Gualán la dispensación es gratuita y
se realiza con receta; la farmacia no acepta devoluciones de medicamentos dispensados.

En FarmaG, una dispensación registra al beneficiario que recibe los medicamentos, el usuario que los
entrega, la fecha, los medicamentos y las cantidades, y los lotes de los que se descontaron. Cada
línea de la dispensación conserva una copia del nombre, la presentación y la concentración del
medicamento tal como estaban al momento de la entrega, de modo que el historial no cambia si después
se modifica el catálogo.

## 2.2 Control de inventario por lotes y método FIFO por fecha de vencimiento

Un lote es el conjunto de unidades de un mismo medicamento que ingresan juntas y comparten número de
lote y fecha de vencimiento. Controlar el inventario por lote permite saber qué unidades vencen
primero, retirar las vencidas y medir las pérdidas por vencimiento. En FarmaG las existencias no se
guardan como un total por medicamento, sino como la suma de las cantidades disponibles de sus lotes;
cada lote tiene uno de cuatro estados: disponible, agotado, vencido o dado de baja.

Para el orden de salida de las existencias, el proyecto denomina "FIFO" (del inglés *first in, first
out*, primero en entrar, primero en salir) a su regla de despacho, pero la implementa ordenando los
lotes por fecha de vencimiento y no por fecha de ingreso: al dispensar, el sistema descuenta primero
de los lotes que vencen antes. En la literatura sobre almacenamiento de productos médicos este
criterio recibe el nombre de FEFO (*first expiry, first out*, primero en vencer, primero en salir),
definido como el procedimiento de distribución que asegura que las existencias con la fecha de
vencimiento más próxima se distribuyan o utilicen antes que las existencias idénticas con una fecha
de vencimiento posterior (Organización Mundial de la Salud [OMS], 2020). Las buenas prácticas de
almacenamiento de la OMS indican que las existencias deben rotarse de forma adecuada siguiendo ese
principio (OMS, 2020). En este documento se conserva el término FIFO usado por el proyecto, con la
aclaración de que el criterio aplicado es el de fecha de vencimiento.

Una cantidad solicitada puede repartirse entre varios lotes. Cuando un lote llega a cero pasa al
estado agotado, y un proceso diario cambia a vencido los lotes disponibles cuya fecha de vencimiento
ya llegó. Para que dos dispensaciones simultáneas no descuenten las mismas unidades, la consulta de
lotes del despacho los bloquea dentro de una transacción de la base de datos hasta que la operación
termina.

## 2.3 Proceso Unificado de Rational (RUP)

El Proceso Unificado de Rational es un proceso de ingeniería de software iterativo, dirigido por casos
de uso y centrado en la arquitectura, que divide el ciclo de vida en cuatro fases: Inicio,
Elaboración, Construcción y Transición (Kruchten, 2004). Cada fase termina en un hito y se compone de
iteraciones en las que participan disciplinas como el modelado del negocio, los requerimientos, el
análisis y diseño, la implementación, las pruebas y el despliegue (Kruchten, 2004).

En este proyecto se adoptó RUP de forma adaptada: se conservan las cuatro fases como estructura del
documento y los artefactos principales de cada una (documento de visión, casos de uso, modelos de
diseño, plan de despliegue y pruebas), sin producir el conjunto completo de artefactos que define el
proceso. La relación entre las fases y los capítulos se presentó en la sección 1.6.

## 2.4 Lenguaje Unificado de Modelado (UML)

UML es un estándar del Object Management Group para un lenguaje gráfico de modelado que permite
visualizar, especificar, construir y documentar los componentes de sistemas de software (Object
Management Group [OMG], 2017). Los diagramas de este documento siguen la versión 2.5.1 de la
especificación.

## 2.5 Norma ISO/IEC 25010

La norma ISO/IEC 25010:2023 define un modelo de calidad del producto para productos de software y de
tecnologías de la información, organizado en nueve características que se dividen en
subcaracterísticas: adecuación funcional, eficiencia de desempeño, compatibilidad, capacidad de
interacción, fiabilidad, seguridad, mantenibilidad, flexibilidad y protección (*safety*)
(Organización Internacional de Normalización [ISO], 2023). El modelo sirve para especificar
requerimientos de calidad, establecer criterios de aceptación y evaluar el producto (ISO, 2023). En
el capítulo 4 los requerimientos no funcionales de FarmaG se clasifican según estas características.

## 2.6 Norma ISO/IEC/IEEE 29148

La norma ISO/IEC/IEEE 29148:2018 especifica los procesos de ingeniería de requerimientos para
sistemas y productos de software a lo largo de su ciclo de vida, los documentos que esos procesos
producen y su contenido (ISO, 2018). Entre otros aspectos, establece las características que debe
cumplir un requerimiento bien redactado, como ser necesario, no ambiguo, completo, singular, factible
y verificable (ISO, 2018). Los requerimientos funcionales y no funcionales del capítulo 4 se redactan
con base en esta norma.

## 2.7 Tecnologías del sistema

FarmaG es una aplicación web de tres capas: una interfaz de una sola página que se ejecuta en el
navegador, una API REST que contiene la lógica de negocio y una base de datos relacional. Los
componentes se ejecutan en contenedores Docker. La Tabla 3 resume las tecnologías principales y la
versión instalada en el equipo de desarrollo donde se verificó el sistema.

Tabla 3.
Tecnologías principales del sistema y versión instalada

| Capa | Tecnología | Versión instalada | Función en el sistema |
|------|-----------|-------------------|-----------------------|
| Interfaz | React | 18.3.1 | Construcción de las pantallas como componentes |
| Interfaz | TypeScript | 5.9.3 | Lenguaje del frontend y del backend |
| Interfaz | Vite | 5.4.21 | Servidor de desarrollo y empaquetado del frontend |
| Interfaz | Tailwind CSS | 3.4.19 | Estilos de la interfaz y paleta institucional |
| Servidor | Node.js | 20.20.2 | Entorno de ejecución de la API |
| Servidor | Express | 4.22.3 | Framework HTTP de la API |
| Servidor | Prisma ORM (`@prisma/client` y CLI) | 6.19.3 | Acceso a la base de datos y migraciones |
| Servidor | jsonwebtoken | 9.0.3 | Firma y verificación de tokens JWT |
| Servidor | bcryptjs | 2.4.3 | Cálculo y verificación del hash de contraseñas |
| Datos | PostgreSQL | 16.14 | Base de datos relacional |
| Infraestructura | Docker Engine y Docker Compose | 29.5.3 y 5.1.4 | Contenedores y orquestación de los servicios |
| Infraestructura | Nginx | Imagen `nginx:alpine`, versión no verificada | Servidor web del frontend en modo producción |

Fuente: Elaboración propia con base en los archivos `package.json`, los Dockerfiles y las versiones
instaladas en los contenedores del equipo de desarrollo (20 de octubre de 2026).

Las versiones de Docker corresponden al equipo de desarrollo; la versión de Nginx no pudo verificarse
porque en modo de desarrollo el frontend no se sirve con Nginx. Las versiones instaladas en el equipo de la municipalidad
no se verificaron como parte de este trabajo.

### 2.7.1 React

React es una biblioteca de JavaScript para construir interfaces de usuario a partir de componentes,
piezas de la interfaz con su propia lógica y apariencia que pueden ser tan pequeñas como un botón o
tan grandes como una página completa (React, s.f.). En FarmaG, cada vista del sistema (tablero,
inventario, entradas, dispensación, beneficiarios, catálogos, usuarios, reportes, auditoría y la
página de captura de fotografías) es una página de React, y los elementos que se repiten entre
páginas, como botones, tablas, campos de formulario y diálogos de confirmación, son componentes
reutilizables. La aplicación es de una sola página: el navegador carga la interfaz una vez y obtiene
los datos de la API, lo que permite usarla desde cualquier equipo de la red local con un navegador,
incluido el teléfono que toma las fotografías de evidencia.

### 2.7.2 TypeScript

TypeScript es un verificador estático de tipos para programas JavaScript: se ejecuta antes que el
código y comprueba que los tipos del programa sean correctos (Microsoft, s.f.). En el proyecto se usa
en el frontend y en el backend, con el modo estricto activado en el backend. Esto permite detectar en
la compilación errores de forma de los datos entre la API y la interfaz; los tipos que describen las
entidades del sistema se definen una vez y se usan en todas las páginas.

### 2.7.3 Vite

Vite es una herramienta de construcción para proyectos web con dos partes: un servidor de desarrollo
que ofrece reemplazo de módulos en caliente sobre módulos ES nativos y un comando de construcción que
empaqueta el código en archivos estáticos optimizados para producción (Vite, s.f.). En FarmaG, en modo
de desarrollo, Vite sirve el frontend en el puerto 5173 y reenvía las peticiones a `/api` hacia el
contenedor del backend, de modo que la interfaz nunca usa una dirección absoluta de la API. En modo de
producción, el comando de construcción genera los archivos estáticos que sirve Nginx.

### 2.7.4 Tailwind CSS

Tailwind CSS es un framework de CSS basado en clases utilitarias de un solo propósito que se aplican
directamente en el marcado, tomadas de un sistema de diseño predefinido (Tailwind CSS, s.f.). En el
proyecto se usa para todos los estilos de la interfaz, sin hojas de estilo por componente. Su
configuración define las paletas de colores `primary` y `dorado`, construidas a partir de los colores
del logotipo de la Municipalidad de Gualán.

### 2.7.5 Node.js

Node.js es un entorno de ejecución de JavaScript asíncrono y dirigido por eventos, diseñado para
construir aplicaciones de red escalables (OpenJS Foundation, s.f.-b). En FarmaG ejecuta la API y las
tareas programadas, como la verificación diaria de lotes vencidos. Usar Node.js permite escribir el
frontend y el backend en el mismo lenguaje.

### 2.7.6 Express

Express es un framework web mínimo y flexible para Node.js que ofrece métodos de utilidad HTTP y
*middleware* para construir API (OpenJS Foundation, s.f.-a). En FarmaG cada módulo (autenticación,
usuarios, catálogos, inventario, dispensación, captura, reportes y auditoría) tiene su propio archivo
de rutas montado bajo `/api/<módulo>`. Los *middleware* resuelven las tareas comunes a todas las
rutas: verificación del token y del rol, cabeceras de seguridad, límite de intentos de inicio de
sesión y manejo centralizado de errores.

### 2.7.7 Prisma ORM

Prisma ORM es un mapeador objeto-relacional de código abierto compuesto por Prisma Client, un
generador de consultas con tipos para Node.js y TypeScript; Prisma Migrate, un sistema de
migraciones; y Prisma Studio, una interfaz gráfica para ver y editar los datos (Prisma, s.f.). En el
proyecto, el modelo de datos completo se declara en un único archivo de esquema, del que Prisma
genera el cliente con tipos que usa el backend. Los cambios de esquema se aplican mediante
migraciones versionadas en el repositorio; al arrancar, el backend saca un respaldo de la base y
aplica solo las migraciones pendientes. Las consultas que Prisma no expresa de forma directa, como el
bloqueo de lotes durante la dispensación, se escriben en SQL dentro de transacciones de Prisma.

### 2.7.8 PostgreSQL

PostgreSQL es un sistema de gestión de bases de datos objeto-relacional de código abierto que admite
gran parte del estándar SQL y ofrece claves foráneas, integridad transaccional y control de
concurrencia multiversión (The PostgreSQL Global Development Group, s.f.). Su licencia permite usarlo,
modificarlo y distribuirlo sin costo con fines privados, comerciales o académicos (The PostgreSQL
Global Development Group, s.f.). En FarmaG almacena las 14 tablas del sistema. Las transacciones con
bloqueo de filas son las que permiten descontar existencias de un lote sin que dos dispensaciones
simultáneas usen las mismas unidades, y las claves foráneas garantizan que cada lote, dispensación y
registro de auditoría apunte a registros existentes.

### 2.7.9 Docker y Docker Compose

Docker es una plataforma abierta para desarrollar, distribuir y ejecutar aplicaciones que separa el
software de la infraestructura en la que se ejecuta. Una imagen es una plantilla de solo lectura con
las instrucciones para crear un contenedor, y un contenedor es una instancia ejecutable de una imagen
(Docker Inc., s.f.-b). Docker Compose es una herramienta para definir y ejecutar aplicaciones de
varios contenedores, cuyos servicios, redes y volúmenes se describen en un archivo YAML y se inician
con un solo comando (Docker Inc., s.f.-a).

En FarmaG, Docker Compose define cuatro servicios: `db` (PostgreSQL), `api` (backend), `web`
(frontend) y `backup` (respaldo periódico de la base de datos). El proyecto tiene dos archivos de
composición, uno por defecto y otro para producción. Con Docker, el mismo sistema se ejecuta igual en
los equipos de los desarrolladores y en el equipo de la farmacia, sin instalar Node.js ni PostgreSQL
directamente en el sistema operativo.

### 2.7.10 JSON Web Token (JWT)

JSON Web Token es un formato compacto y seguro para URL que representa declaraciones (*claims*)
transferidas entre dos partes, codificadas como un objeto JSON que puede firmarse o protegerse con un
código de autenticación de mensajes (Jones et al., 2015). En FarmaG, al iniciar sesión, la API firma
un token con el identificador, el nombre de usuario y el rol, con una vigencia de 8 horas por
defecto. El frontend lo envía en cada petición y el backend verifica la firma y, además, consulta en
la base de datos si el usuario sigue activo y cuál es su rol actual. Este mecanismo no necesita
sesiones guardadas en el servidor.

### 2.7.11 bcrypt

bcrypt es una función de hash de contraseñas basada en el cifrado eksblowfish, cuyo costo de cálculo
es ajustable para que pueda aumentarse a medida que el hardware se vuelve más rápido (Provos y
Mazières, 1999). En el proyecto se usa mediante la biblioteca `bcryptjs`, con un factor de costo de
12, para guardar las contraseñas de los usuarios. La base de datos solo almacena el hash, y el inicio
de sesión compara la contraseña recibida con ese hash.

### 2.7.12 Nginx

Nginx es un servidor web HTTP que también funciona como proxy inverso, caché de contenido, balanceador
de carga y proxy de correo (nginx, s.f.). En FarmaG se usa solo en el modo de producción del
frontend: sirve los archivos estáticos generados por Vite en el puerto 80, agrega cabeceras de
seguridad y reenvía al backend las peticiones a `/api/` y a las fotografías de medicamentos. En modo
de desarrollo su lugar lo ocupa el servidor de Vite.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa.

Docker Inc. (s.f.-a). *Docker Compose*. Recuperado el 20 de octubre de 2026 de
https://docs.docker.com/compose/

Docker Inc. (s.f.-b). *What is Docker?* Recuperado el 20 de octubre de 2026 de
https://docs.docker.com/get-started/docker-overview/

Jones, M., Bradley, J. y Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). Internet
Engineering Task Force. Recuperado el 20 de octubre de 2026 de https://www.rfc-editor.org/rfc/rfc7519

Kruchten, P. (2004). *The Rational Unified Process: An introduction* (3.ª ed.). Addison-Wesley.

Microsoft. (s.f.). *The TypeScript Handbook*. Recuperado el 20 de octubre de 2026 de
https://www.typescriptlang.org/docs/handbook/intro.html

nginx. (s.f.). *nginx*. Recuperado el 20 de octubre de 2026 de https://nginx.org/en/

Object Management Group. (2017). *OMG Unified Modeling Language (OMG UML), Version 2.5.1*.
Recuperado el 20 de octubre de 2026 de https://www.omg.org/spec/UML/2.5.1/About-UML

OpenJS Foundation. (s.f.-a). *Express*. Recuperado el 20 de octubre de 2026 de https://expressjs.com/

OpenJS Foundation. (s.f.-b). *About Node.js*. Recuperado el 20 de octubre de 2026 de
https://nodejs.org/en/about

Organización Internacional de Normalización. (2018). *ISO/IEC/IEEE 29148:2018 Systems and software
engineering: Life cycle processes: Requirements engineering*. Recuperado el 20 de octubre de 2026 de
https://www.iso.org/standard/72089.html

Organización Internacional de Normalización. (2023). *ISO/IEC 25010:2023 Systems and software
engineering: Systems and software Quality Requirements and Evaluation (SQuaRE): Product quality
model*. Recuperado el 20 de octubre de 2026 de https://www.iso.org/standard/78176.html

Organización Mundial de la Salud. (2020). *Good storage and distribution practices for medical
products* (Serie de Informes Técnicos de la OMS, n.º 1025, anexo 7). Recuperado el 20 de octubre de
2026 de https://www.who.int/publications/m/item/trs-1025-annex-7

Prisma. (s.f.). *What is Prisma ORM?* Recuperado el 20 de octubre de 2026 de
https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma

Provos, N. y Mazières, D. (1999). A future-adaptable password scheme. En *Proceedings of the FREENIX
Track: 1999 USENIX Annual Technical Conference* (pp. 81–92). USENIX Association. Recuperado el 20 de
octubre de 2026 de https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf

React. (s.f.). *Quick Start*. Recuperado el 20 de octubre de 2026 de https://react.dev/learn

Tailwind CSS. (s.f.). *Utility-first fundamentals* (versión 3). Recuperado el 20 de octubre de 2026
de https://v3.tailwindcss.com/docs/utility-first

The PostgreSQL Global Development Group. (s.f.). *What is PostgreSQL?* En *PostgreSQL 16
documentation*. Recuperado el 20 de octubre de 2026 de
https://www.postgresql.org/docs/16/intro-whatis.html

Vite. (s.f.). *Getting started*. Recuperado el 20 de octubre de 2026 de https://vite.dev/guide/
