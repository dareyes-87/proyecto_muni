# Plantilla Word y ensamblado del documento

Convierte los capítulos de `capitulos/` en `salida/FarmaG_Documentacion_<fecha>.docx` con el
formato de `00_lineamientos.md`. Se puede regenerar cuantas veces haga falta. Los `.docx` de
`salida/` no se versionan.

## Requisitos

Solo Docker. No se instala nada en Windows:

| Imagen | Uso |
|--------|-----|
| `pandoc/core:3.5` | Conversión de markdown a .docx |
| `farmag-docx:1` | Imagen local (`python:3.12-slim` + `python-docx`). El script la construye la primera vez desde `docker/Dockerfile` |
| `farmag-docx-lo:1` | Opcional, agrega LibreOffice para contar páginas con `-Verificar`: `docker build -t farmag-docx-lo:1 -f docker/Dockerfile.libreoffice docker` (desde `plantilla/`, después de crear `farmag-docx:1`) |

## Uso

PowerShell (desde la raíz del repositorio):

```powershell
.\docs\documentacion\plantilla\ensamblar.ps1             # genera el .docx
.\docs\documentacion\plantilla\ensamblar.ps1 -Verificar  # además revisa el formato y cuenta páginas
.\docs\documentacion\plantilla\ensamblar.ps1 -Forzar     # genera aunque haya menciones rotas
```

Git Bash, Linux o macOS: `bash docs/documentacion/plantilla/ensamblar.sh [--verificar] [--forzar]`.

Al final se imprime: capítulos incluidos, tablas, figuras, referencias y `[COMPLETAR]` pendientes.
Si una mención ("la Tabla 12") apunta a una tabla o figura que no existe, se lista como `ERROR`
y **no** se genera el documento, salvo con `-Forzar`.

## Orden y nombres de archivo

Se toman de `capitulos/`. Los que no existen se saltan con un aviso.

| Parte | Archivo |
|-------|---------|
| Portada | `00_portada*.md` |
| Índice general, de figuras y de tablas | Los genera el script |
| Resumen | `00_resumen*.md` |
| Introducción (aquí empieza la numeración arábiga) | `00_introduccion*.md` |
| Capítulos I a VIII | `01_*.md` … `08_*.md` |
| Conclusiones, recomendaciones, glosario | `09_conclusiones*.md`, `10_recomendaciones*.md`, `11_glosario*.md` |
| Referencias adicionales (opcional) | `12_referencias*.md`: solo entradas, se unen a las de los capítulos |
| Anexos | `13_anexo*.md` (varios, en orden de nombre) |

## Convenciones que reconoce el script

- **Referencias:** cada capítulo puede terminar con una sección cuyo título empiece por
  `REFERENCIAS` (p. ej. `## REFERENCIAS DEL CAPÍTULO`), una entrada por párrafo. Se quitan del
  capítulo, se eliminan duplicados y se ordenan alfabéticamente en "REFERENCIAS BIBLIOGRÁFICAS",
  después del glosario. Las citas en bloque (`> Nota…`) de esas secciones se descartan.
- **Tablas y figuras:** línea en blanco, `Tabla N.` (o `Figura N.`), título en la línea siguiente.
  El número de origen da igual: se renumera de forma corrida. Las menciones se resuelven primero
  dentro del mismo archivo y, si no, en el único otro archivo que tenga ese número.
- **Fuente:** el párrafo que empieza con `Fuente:` toma el estilo "Fuente" (sencillo).
- **Imágenes:** en una línea sola, con cualquiera de estas dos sintaxis:
  - `{{imagen: 05_despliegue.png}}`: nombre del archivo de `diagramas/imagenes/` (la extensión
    `.png` es opcional).
  - `![](../diagramas/imagenes/05_despliegue.png)`: imagen markdown estándar con la ruta relativa
    al capítulo; debe apuntar a `diagramas/imagenes/`. El texto alternativo se ignora (el título va
    en la línea "Figura N." y la siguiente).

  Ambas se tratan igual (estilo "Imagen", ancho máximo 15 cm). Ejemplo:

  ```markdown
  Figura 5.
  Diagrama de despliegue

  {{imagen: 05_despliegue.png}}

  Fuente: Elaboración propia.
  ```

  Ancho máximo 15 cm (alto máximo 19 cm). Para un ancho menor: `{{imagen: 05_despliegue | ancho=12cm}}`
  o `![](../diagramas/imagenes/05_despliegue.png){width=12cm}`.
- Los comentarios HTML `<!-- … -->` se eliminan.

## Archivos

| Archivo | Función |
|---------|---------|
| `referencia.docx` | Estilos de la tesis (se pasa a pandoc con `--reference-doc`) |
| `estilos.py` | Define los estilos. Para regenerar `referencia.docx`: extraer el de pandoc con `pandoc -o _default.docx --print-default-data-file reference.docx` y ejecutar `python estilos.py _default.docx referencia.docx` en `farmag-docx:1` |
| `ensamblar.py` | Une, renumera, junta referencias e inserta imágenes → `salida/_tmp/ensamblado.md` |
| `postproceso.py` | Mueve el índice tras la portada, secciones romanas/arábigas, saltos de capítulo, estilo de tablas |
| `verificar.py` | Comprueba página, márgenes, fuente, tamaño, interlineado y sangrías de todos los párrafos |
| `ensamblar.ps1`, `ensamblar.sh` | Ejecutan todo lo anterior en contenedores |

Lo que ya resuelve el script: Carta y márgenes de 2.54 cm, estilos de texto y títulos, salto de
página antes de cada título de nivel 1 (no entre "CAPÍTULO N" y su título), romanos en preliminares
y arábigos desde 1 en la introducción (o el primer capítulo), número de página centrado al pie.

## Retoques manuales en Word (pandoc no los resuelve)

1. **Actualizar los índices.** Al abrir, Word pregunta si actualiza los campos: aceptar. Si no lo
   pregunta: Ctrl+A, F9. Los índices de figuras y de tablas se arman con los estilos
   "Titulo de figura" y "Titulo de tabla". Revisar que cada entrada se vea en una línea (el título
   lleva un salto de línea tras "Tabla N.").
2. **Portada sin número de página.** En la sección de preliminares, activar "Primera página
   diferente" en el pie de página.
3. **Revisar la numeración romana.** Si no hay introducción, el cuerpo empieza en 1 desde el
   Capítulo I. Si se agrega contenido antes de la introducción a mano, confirmar el salto de sección.
4. **Saltos de página y tablas largas.** Revisar tablas partidas entre páginas (el encabezado se
   repite solo), títulos de tabla o figura que queden solos al pie de una página, y páginas casi
   vacías antes de una imagen grande.
5. **Anchos de columna.** pandoc los reparte según los guiones de la fila separadora del markdown;
   ajustar en Word las tablas que queden desproporcionadas.
6. **Tamaño de letra en tablas.** El estilo "Texto de tabla" usa 11 pt. Para una tabla grande se
   puede bajar a 10 pt (permitido por los lineamientos); para todas, cambiar `TAM_TABLA` en
   `estilos.py` y regenerar `referencia.docx`.
7. **Glosario.** La lista numerada sale con la numeración de pandoc; revisar sangría y orden.
8. **Encabezado de capítulo.** "CAPÍTULO I" y "1 TÍTULO" son dos títulos de nivel 1, así que ambos
   aparecen en el índice general. Si el asesor quiere uno solo, quitar uno de los dos del índice.
9. **Revisión final** con la tesis de referencia (Franco Sosa, 2026): viudas y huérfanas, cortes
   de página antes de cada capítulo y la ortografía (el documento está marcado en es-GT).
