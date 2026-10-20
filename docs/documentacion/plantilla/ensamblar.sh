#!/usr/bin/env bash
# Ensambla los capítulos en salida/FarmaG_Documentacion_<fecha>.docx.
# Uso (desde cualquier carpeta): bash docs/documentacion/plantilla/ensamblar.sh [--forzar] [--verificar]
#   --forzar     genera el .docx aunque haya menciones a tablas/figuras inexistentes.
#   --verificar  revisa fuentes, interlineado y márgenes del .docx y, si existe la
#                imagen farmag-docx-lo:1, cuenta las páginas convirtiéndolo a PDF.
set -euo pipefail
export MSYS_NO_PATHCONV=1          # Git Bash: no reescribir las rutas /doc/...

PANDOC=pandoc/core:3.5
PY=farmag-docx:1
PY_LO=farmag-docx-lo:1

PLANTILLA="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(dirname "$PLANTILLA")"
RAIZ_DOCKER="$(cd "$RAIZ" && (pwd -W 2>/dev/null || pwd))"
FECHA="$(date +%F)"
NOMBRE="FarmaG_Documentacion_${FECHA}.docx"

FORZAR=""; VERIFICAR=0
for a in "$@"; do
  case "$a" in
    --forzar) FORZAR="--forzar" ;;
    --verificar) VERIFICAR=1 ;;
    *) echo "Opción desconocida: $a" >&2; exit 1 ;;
  esac
done

if ! docker image inspect "$PY" >/dev/null 2>&1; then
  echo "Construyendo la imagen local $PY (python:3.12-slim + python-docx)..."
  docker build -q -t "$PY" -f "$PLANTILLA/docker/Dockerfile" "$PLANTILLA/docker"
fi

py() { docker run --rm -v "$RAIZ_DOCKER:/doc" -w /doc/plantilla "$PY" python "$@"; }

echo "1/3 Uniendo capítulos..."
py ensamblar.py /doc /doc/salida/_tmp/ensamblado.md $FORZAR

echo "2/3 Convirtiendo con pandoc..."
docker run --rm -v "$RAIZ_DOCKER:/doc" -w /doc "$PANDOC" \
  salida/_tmp/ensamblado.md -f markdown-yaml_metadata_block -t docx \
  --reference-doc=plantilla/referencia.docx --toc --toc-depth=3 \
  -M "toc-title=ÍNDICE GENERAL" -M lang=es-GT \
  -o salida/_tmp/pandoc.docx

echo "3/3 Ajustando estilos y secciones..."
py postproceso.py /doc/salida/_tmp/pandoc.docx "/doc/salida/$NOMBRE"
echo "Generado: $RAIZ/salida/$NOMBRE"

if [ "$VERIFICAR" = 1 ]; then
  py verificar.py "/doc/salida/$NOMBRE"
  if docker image inspect "$PY_LO" >/dev/null 2>&1; then
    docker run --rm -v "$RAIZ_DOCKER:/doc" -w /doc/salida/_tmp "$PY_LO" \
      soffice --headless --convert-to pdf --outdir /doc/salida/_tmp "/doc/salida/$NOMBRE" >/dev/null 2>&1
    py verificar.py --paginas "/doc/salida/_tmp/${NOMBRE%.docx}.pdf"
  else
    echo "(Para contar páginas construya $PY_LO: ver plantilla/README.md)"
  fi
fi
