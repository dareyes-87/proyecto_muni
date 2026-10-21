# CAPÍTULO II

# 2 MARCO DE REFERENCIA

Este capítulo describe el concepto de dominio en que se basa el control de existencias, el proceso de
desarrollo, los estándares y las tecnologías del sistema FarmaG. El equipo de desarrollo no dejó un
registro escrito de los criterios con que eligió cada tecnología, por lo que la justificación se
expresa en función de lo que cada una resuelve en el sistema implementado.

## 2.1 Control de inventario por lotes

Un lote es el conjunto de unidades de un mismo medicamento que ingresan juntas y comparten número de
lote y fecha de vencimiento. En FarmaG las existencias de un medicamento son la suma de las
cantidades disponibles de sus lotes, y cada dispensación descuenta primero de los lotes que vencen
antes. El proyecto llama "FIFO" a esta regla, aunque el criterio aplicado corresponde al que la
literatura denomina FEFO (*first expiry, first out*): las existencias con la fecha de vencimiento más
próxima se distribuyen o utilizan antes que las existencias idénticas con un vencimiento posterior
(Organización Mundial de la Salud [OMS], 2020). En este documento se conserva el término del proyecto
con esa aclaración.

## 2.2 Proceso Unificado de Rational (RUP)

El Proceso Unificado de Rational es un proceso de ingeniería de software iterativo, dirigido por casos
de uso y centrado en la arquitectura, que divide el ciclo de vida en cuatro fases: Inicio,
Elaboración, Construcción y Transición, cada una terminada en un hito (Kruchten, 2004). En este
proyecto se adoptó de forma adaptada: se conservan las fases como estructura del documento y sus
artefactos principales, según lo descrito en la sección 1.6.

## 2.3 Lenguaje Unificado de Modelado (UML)

UML es un estándar del Object Management Group para un lenguaje gráfico de modelado que permite
visualizar, especificar, construir y documentar los componentes de sistemas de software (Object
Management Group [OMG], 2017). Los diagramas de este documento siguen la versión 2.5.1 de la
especificación.

## 2.4 Norma ISO/IEC 25010

La norma ISO/IEC 25010:2023 define un modelo de calidad del producto de software organizado en nueve
características: adecuación funcional, eficiencia de desempeño, compatibilidad, capacidad de
interacción, fiabilidad, seguridad, mantenibilidad, flexibilidad y protección (*safety*), que sirven
para especificar requerimientos de calidad y evaluar el producto (Organización Internacional de
Normalización [ISO], 2023). En el capítulo 4 los requerimientos no funcionales se clasifican según
estas características.

## 2.5 Norma ISO/IEC/IEEE 29148

La norma ISO/IEC/IEEE 29148:2018 especifica los procesos de ingeniería de requerimientos para
sistemas y productos de software y establece las características de un requerimiento bien redactado,
como ser necesario, no ambiguo, completo, singular, factible y verificable (ISO, 2018). Los
requerimientos del capítulo 4 se redactan con base en esta norma.

## 2.6 Tecnologías del sistema

FarmaG es una aplicación web de tres capas: una interfaz de una sola página que se ejecuta en el
navegador, una API REST con la lógica de negocio y una base de datos relacional, todas ejecutadas en
contenedores Docker. La Tabla 3 resume las tecnologías principales.

Tabla 3.
Tecnologías principales del sistema

| Tecnología | Versión instalada | Uso en el sistema |
|-----------|-------------------|-------------------|
| React | 18.3.1 | Construcción de las pantallas como componentes |
| TypeScript | 5.9.3 | Lenguaje del frontend y del backend |
| Vite | 5.4.21 | Servidor de desarrollo y empaquetado del frontend |
| Tailwind CSS | 3.4.19 | Estilos de la interfaz y paleta institucional |
| Node.js | 20.20.2 | Entorno de ejecución de la API |
| Express | 4.22.3 | Framework HTTP de la API |
| Prisma ORM | 6.19.3 | Acceso a la base de datos y migraciones |
| PostgreSQL | 16.14 | Base de datos relacional |
| Docker Engine y Docker Compose | 29.5.3 y 5.1.4 | Contenedores y orquestación de los servicios |
| Nginx | No verificada | Servidor web del frontend en modo producción |
| jsonwebtoken | 9.0.3 | Firma y verificación de tokens de sesión (JWT) |
| bcryptjs | 2.4.3 | Cálculo y verificación del hash de contraseñas |

Fuente: Elaboración propia con base en la configuración del proyecto y las versiones instaladas en
el equipo de desarrollo (20 de octubre de 2026).

Las versiones corresponden al equipo de desarrollo; las del equipo de la municipalidad no se
verificaron como parte de este trabajo.

### 2.6.1 Frontend

React es una biblioteca para construir interfaces de usuario a partir de componentes reutilizables
(React, s.f.). Cada vista de FarmaG es una página de React, y los elementos que se repiten, como
botones, tablas y formularios, son componentes compartidos. La aplicación es de una sola página, por
lo que se usa desde cualquier navegador de la red local, incluido el teléfono que toma las
fotografías de evidencia. Vite sirve la interfaz durante el desarrollo y genera los archivos
estáticos de producción (Vite, s.f.), y Tailwind CSS aporta los estilos mediante clases utilitarias
(Tailwind CSS, s.f.), con una paleta tomada de los colores de la Municipalidad de Gualán. TypeScript
se usa en el frontend y en el backend para detectar en la compilación errores en la forma de los
datos.

### 2.6.2 Backend

Node.js es un entorno de ejecución de JavaScript dirigido por eventos (OpenJS Foundation, s.f.-b) que
ejecuta la API y las tareas programadas, como la verificación diaria de lotes vencidos. Express, un
framework web mínimo para Node.js (OpenJS Foundation, s.f.-a), organiza la API en un conjunto de
rutas por módulo y resuelve las tareas comunes, como la verificación de la sesión y el manejo de
errores. Prisma ORM genera, a partir de un único esquema, un cliente con tipos para consultar la base
de datos y administra las migraciones versionadas del esquema (Prisma, s.f.).

### 2.6.3 Base de datos

PostgreSQL es un sistema de gestión de bases de datos objeto-relacional de código abierto que ofrece
claves foráneas, integridad transaccional y control de concurrencia, con una licencia que permite
usarlo sin costo (The PostgreSQL Global Development Group, s.f.). En FarmaG almacena las 14 tablas
del sistema; sus transacciones con bloqueo de filas impiden que dos dispensaciones simultáneas
descuenten las mismas unidades de un lote.

### 2.6.4 Contenedores

Docker separa el software de la infraestructura en que se ejecuta mediante imágenes y contenedores
(Docker Inc., s.f.-b), y Docker Compose define y ejecuta aplicaciones de varios contenedores con un
solo comando (Docker Inc., s.f.-a). FarmaG se compone de cuatro servicios: la base de datos, la API,
la interfaz y un servicio de respaldo periódico. Así, el sistema se ejecuta igual en los equipos de
desarrollo y en el de la farmacia, sin instalar Node.js ni PostgreSQL en el sistema operativo. En
producción, Nginx, un servidor web que también funciona como proxy inverso (nginx, s.f.), entrega la
interfaz y reenvía a la API las peticiones dirigidas a ella.

### 2.6.5 Seguridad

La sesión se mantiene con un JSON Web Token, un formato compacto de declaraciones firmadas entre dos
partes (Jones et al., 2015). Al iniciar sesión, la API firma un token con el usuario y su rol, con
vigencia de 8 horas, y en cada petición verifica la firma y que el usuario siga activo. Las
contraseñas se guardan con bcrypt, una función de hash cuyo costo de cálculo es ajustable para
resistir el aumento de velocidad del hardware (Provos y Mazières, 1999); la base de datos solo
almacena el hash.

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
