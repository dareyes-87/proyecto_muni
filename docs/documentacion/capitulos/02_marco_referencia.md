# CAPÍTULO II

# 2 MARCO DE REFERENCIA

Este capítulo presenta el concepto en que se basa el control de existencias de FarmaG, la metodología
y las normas que guiaron su desarrollo, y las tecnologías con que se construyó.

## 2.1 Control de inventario por lotes

Un lote es el conjunto de unidades de un mismo medicamento que ingresan juntas y comparten número de
lote y fecha de vencimiento. En FarmaG las existencias de un medicamento son la suma de las unidades
disponibles de sus lotes, y cada entrega descuenta primero del lote que vence antes. Este criterio se
conoce como FEFO (*first expiry, first out*, primero en vencer, primero en salir): las existencias con
la fecha de vencimiento más próxima se utilizan antes que las que vencen después (Organización
Mundial de la Salud [OMS], 2020). Es la regla central del sistema, porque reduce las pérdidas de
medicamentos donados.

## 2.2 Proceso Unificado de Rational (RUP)

RUP es un proceso de desarrollo de software iterativo, guiado por casos de uso y centrado en la
arquitectura. Divide el trabajo en cuatro fases, Inicio, Elaboración, Construcción y Transición, cada
una con un objetivo y un resultado definidos (Kruchten, 2004). En este proyecto se aplicó de forma
adaptada, como se explicó en la sección 1.6.

## 2.3 Lenguaje Unificado de Modelado (UML)

UML es el lenguaje gráfico estándar para representar sistemas de software mediante diagramas, como
los de casos de uso, actividad, secuencia y estados (Object Management Group [OMG], 2017). Los
diagramas de este documento siguen esa notación.

## 2.4 Normas ISO/IEC 25010 e ISO/IEC/IEEE 29148

La norma ISO/IEC 25010 define un modelo de calidad del software organizado en características como la
seguridad, la fiabilidad, la usabilidad y la mantenibilidad, que sirven para especificar y evaluar la
calidad de un producto (Organización Internacional de Normalización [ISO], 2023). La norma
ISO/IEC/IEEE 29148 describe cómo redactar buenos requerimientos: necesarios, claros, completos,
factibles y verificables (ISO, 2018). En el capítulo 4 los requerimientos se redactan con base en la
segunda y los no funcionales se clasifican según la primera.

## 2.5 Tecnologías del sistema

FarmaG es una aplicación web de tres capas: la interfaz que el usuario ve en el navegador, el servidor
que aplica las reglas del negocio y la base de datos donde se guarda la información. La Tabla 3
resume las tecnologías principales.

Tabla 3.
Tecnologías principales del sistema

| Tecnología | Función en el sistema |
|------------|-----------------------|
| React y TypeScript | Construcción de las pantallas de la aplicación |
| Node.js y Express | Servidor que recibe las operaciones y aplica las reglas del negocio |
| Prisma | Acceso a la base de datos y control de sus cambios |
| PostgreSQL | Base de datos donde se guarda toda la información |
| Docker | Empaquetado e instalación del sistema en el servidor |

Fuente: Elaboración propia.

La interfaz se construyó con React, una biblioteca para crear pantallas a partir de componentes
reutilizables (React, s.f.). Al ser una aplicación web, se usa desde cualquier navegador de la red
local, incluido el teléfono con que se toman las fotografías de respaldo.

El servidor funciona sobre Node.js, un entorno para ejecutar programas escritos en JavaScript
(OpenJS Foundation, s.f.-b), con Express, que organiza las funciones del sistema por módulo (OpenJS
Foundation, s.f.-a). El acceso a la base de datos se hace con Prisma, que además lleva el control de
los cambios en la estructura de la base (Prisma, s.f.).

La base de datos es PostgreSQL, un sistema de código abierto y sin costo de licencia que garantiza la
integridad de la información y permite que varias operaciones se hagan al mismo tiempo sin
interferir entre sí (The PostgreSQL Global Development Group, s.f.). Esto es lo que impide que dos
entregas simultáneas descuenten las mismas unidades.

Todo el sistema se instala con Docker, que empaqueta cada parte en un contenedor independiente
(Docker Inc., s.f.-b), y Docker Compose, que los pone en marcha en conjunto con una sola instrucción
(Docker Inc., s.f.-a). Así el sistema funciona igual en los equipos del equipo de desarrollo y en el
de la farmacia.

## REFERENCIAS DEL CAPÍTULO

> Nota para el ensamblado: estas referencias se trasladarán a la sección "REFERENCIAS
> BIBLIOGRÁFICAS" del documento final, en orden alfabético y con sangría francesa.

Docker Inc. (s.f.-a). *Docker Compose*. Recuperado el 20 de octubre de 2026 de
https://docs.docker.com/compose/

Docker Inc. (s.f.-b). *What is Docker?* Recuperado el 20 de octubre de 2026 de
https://docs.docker.com/get-started/docker-overview/

Kruchten, P. (2004). *The Rational Unified Process: An introduction* (3.ª ed.). Addison-Wesley.

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

React. (s.f.). *Quick Start*. Recuperado el 20 de octubre de 2026 de https://react.dev/learn

The PostgreSQL Global Development Group. (s.f.). *What is PostgreSQL?* En *PostgreSQL 16
documentation*. Recuperado el 20 de octubre de 2026 de
https://www.postgresql.org/docs/16/intro-whatis.html
