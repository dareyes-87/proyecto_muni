# Lineamientos de la documentación de FarmaG

## Identificación

- **Sistema:** FarmaG — Sistema de Inventario y Dispensación de Medicamentos
- **Institución beneficiaria:** Farmacia Municipal de Gualán, Zacapa, Guatemala
- **Contexto:** proyecto de último año, curso de Seminario, Ingeniería en Sistemas,
  Universidad Mariano Gálvez de Guatemala
- **Equipo de desarrollo:**
  - Daniel Reyes — Inventario, configuración base, administración
  - Jorge Vargas — Dispensación
  - Audias Guevara — Catálogos
- **Responsable de la documentación:** Audias Guevara
- **Metodología documentada:** RUP adaptado. Las iteraciones se reconstruyen a partir del
  historial real de Git; nunca se inventan fases, fechas ni duraciones.
- **Estándares de referencia:**
  - ISO/IEC/IEEE 29148 (requerimientos)
  - ISO/IEC 25010 (calidad / requerimientos no funcionales)
  - UML 2.5 (diagramas)
  - Modelo de vistas 4+1 de Kruchten (arquitectura)
  - APA 7 (citas y referencias)

## Reglas de veracidad (obligatorias)

1. Toda afirmación técnica debe provenir del código, la configuración o los documentos
   existentes del repositorio. En los archivos de `analisis/` cada hecho debe llevar su fuente
   en formato: `(fuente: ruta/archivo.ext, líneas X–Y o nombre de función/endpoint)`.
2. Nunca inventar: requerimientos, datos de la municipalidad, entrevistas, cantidades, costos,
   fechas, nombres de personas, métricas ni resultados de pruebas.
3. Todo dato que no pueda obtenerse del repositorio se marca exactamente así:
   `[COMPLETAR: descripción de lo que falta]`. El responsable lo llenará manualmente.
4. Si el código y la especificación técnica (`docs/FarmaG_Especificacion_Tecnica_v1.md`) no
   coinciden, manda el código (es lo que realmente está implementado) y la discrepancia se
   anota en `analisis/discrepancias.md`.
5. Si algo es ambiguo, se anota como pregunta en `analisis/preguntas_abiertas.md` en lugar de
   suponer.

## Reglas de redacción

- Español formal, impersonal ("se implementó", "el sistema permite…"), sin primera persona, sin
  tono publicitario ni frases de relleno.
- Terminología consistente según el glosario (`analisis/glosario.md` cuando exista).
- Figuras y tablas con numeración corrida en todo el documento (Figura 1, Figura 2…; Tabla 1,
  Tabla 2…), **no** por capítulo.
- Formato de cada figura o tabla, en este orden:
  1. Línea 1: "Figura N." o "Tabla N." (número seguido de punto).
  2. Línea 2: título descriptivo.
  3. Luego: la imagen o la tabla.
  4. Última línea: "Fuente: Elaboración propia" o "Fuente: Autor (año)."
- Toda figura y tabla debe mencionarse en el texto antes de aparecer (ej. "En la Figura 5 se
  muestra…"). El número mencionado debe coincidir exactamente con el de la figura.
- Identificadores:
  - Casos de uso: `CU-XX`
  - Requerimientos funcionales: `RF-XX`
  - Requerimientos no funcionales: `RNF-XX`
  - Reglas de negocio: `RN-XX`
  - Casos de prueba: `CP-XX`

  Una vez asignado un código, no se renumera.

## Formato del documento (APA 7 adaptado según el asesor)

- **Referencia de formato:** tesis de Jonathan David Franco Sosa (UMG, 2026), estilo solicitado
  por el asesor.
- **Paginación:** páginas preliminares numeradas en romanos; el cuerpo inicia en 1 desde la
  Introducción.
- **Encabezado de capítulo** en dos líneas: "CAPÍTULO I" y debajo "1 TÍTULO DEL CAPÍTULO" en
  mayúsculas.
- **Secciones numeradas:** 1.1, 1.1.1. Niveles inferiores con a), b), c) o 1), 2), 3).
- **Introducción:** termina describiendo brevemente el contenido de cada capítulo.
- **Orden final del documento:** último capítulo → Glosario → Referencias bibliográficas →
  Anexos.
- **Glosario:** lista numerada, en orden alfabético, término seguido de dos puntos y definición.
- **Citas en el texto:** (Autor, año) o Autor (año); dos autores unidos con "y"; tres o más con
  "et al.".
- **Referencias:** título "REFERENCIAS BIBLIOGRÁFICAS", orden alfabético, sangría francesa,
  formato:

  > Apellido, A. (año). *Título en cursiva*. Institución o editorial. Recuperado el D de mes de
  > AAAA de URL.

  Solo en español: nunca usar "Retrieved" ni "from".
- **Fuentes:** solo se citan fuentes reales y verificables. Nunca inventar autores, años ni URL.
  Si falta una referencia, usar `[COMPLETAR: referencia sobre X]`.
- **Casos de uso:** en tabla titulada "Tabla N. Caso de uso #X: Nombre", con filas en este orden:
  1. Caso de uso
  2. Descripción
  3. Actores
  4. Precondición
  5. Flujo normal (pasos numerados sin repetir números)
  6. Flujo alternativo
  7. Postcondiciones
- **Papel:** tamaño Carta (8.5 × 11 pulgadas).
- **Márgenes:** 2.54 cm en los cuatro lados.
- **Cuerpo del texto:** Times New Roman 12 pt, justificado, interlineado doble (2.0), sangría de
  primera línea de 1.27 cm, sin espacio adicional antes ni después de los párrafos.
- **Títulos:** Times New Roman 12 pt en negrita (no se usan tamaños mayores). "INTRODUCCIÓN",
  "CAPÍTULO I" y el título del capítulo van centrados y en mayúsculas. Las secciones (1.1) y
  subsecciones (1.1.1) van alineadas a la izquierda, en negrita y sin sangría.
- **Tablas:** Times New Roman; se permite reducir hasta 10 pt dentro de tablas grandes para que
  el contenido quepa. El interlineado dentro de las tablas es sencillo.
- **Pies de figura y tabla** ("Figura N.", título y "Fuente: …"): Times New Roman 12 pt,
  interlineado sencillo.

## Diagramas

- Todos los diagramas se escriben como código PlantUML en `diagramas/fuentes/` con nombre
  `<capitulo>_<tipo>_<nombre>.puml` (ej. `05_secuencia_dispensar.puml`).
- Las imágenes exportadas van a `diagramas/imagenes/` con el mismo nombre en `.png`.
- Etiquetas de los diagramas en español.

## Flujo de trabajo por fases

1. **Extracción** (`analisis/`): solo hechos con fuente, sin redacción final.
2. **Diagramas** (`diagramas/`).
3. **Redacción por capítulo** (`capitulos/`), basada únicamente en `analisis/`.
4. **Pruebas funcionales** (`pruebas/`): plan y casos derivados de los casos de uso.
5. **Ensamblado del documento Word** (`salida/`) usando la plantilla de `plantilla/`.

## Índice aprobado del documento

**Preliminares:** portada, índice general, índice de figuras, índice de tablas, resumen,
introducción.

**Capítulo 1 — Generalidades:** antecedentes, planteamiento del problema, justificación,
objetivos, alcances y límites, metodología.

**Capítulo 2 — Marco de referencia:** tecnologías utilizadas y su justificación.

**Capítulo 3 — Fase de Inicio:** documento de visión, interesados y usuarios, riesgos,
factibilidad.

**Capítulo 4 — Requerimientos:** RF por módulo, RNF (ISO 25010), reglas de negocio, modelo de
casos de uso, especificación de casos de uso, matriz de trazabilidad.

**Capítulo 5 — Análisis y Diseño:** diagramas de actividad y secuencia de procesos críticos,
diagrama de clases de dominio, diagramas de estados, modelo entidad-relación, diccionario de
datos, arquitectura 4+1, especificación de la API, diseño de seguridad y matriz de permisos,
diseño de interfaz.

**Capítulo 6 — Construcción:** estructura del repositorio, estándares de código, flujo Git,
iteraciones reales, distribución de módulos.

**Capítulo 7 — Transición:** requisitos, instalación y despliegue, configuración, respaldo y
restauración, mantenimiento.

**Capítulo 8 — Aseguramiento de la calidad:** plan de pruebas funcionales, casos de prueba,
resultados, referencia al informe de pentesting (anexo).

**Cierre:** conclusiones, recomendaciones, glosario, referencias bibliográficas.

**Anexos:** manual de usuario, informe de pentesting.
