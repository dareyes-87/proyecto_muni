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
- Figuras y tablas numeradas por capítulo (Figura 4.2, Tabla 5.1) con título y fuente.
- Identificadores:
  - Casos de uso: `CU-XX`
  - Requerimientos funcionales: `RF-XX`
  - Requerimientos no funcionales: `RNF-XX`
  - Reglas de negocio: `RN-XX`
  - Casos de prueba: `CP-XX`

  Una vez asignado un código, no se renumera.

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

**Capítulo 3 — Fase de Inicio:** documento de visión, interesados y usuarios, glosario, riesgos,
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

**Cierre:** conclusiones, recomendaciones, referencias.

**Anexos:** manual de usuario, informe de pentesting.
