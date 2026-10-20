# Ensambla los capítulos en salida\FarmaG_Documentacion_<fecha>.docx.
# Uso (desde cualquier carpeta): .\docs\documentacion\plantilla\ensamblar.ps1 [-Forzar] [-Verificar]
#   -Forzar     genera el .docx aunque haya menciones a tablas/figuras inexistentes.
#   -Verificar  revisa fuentes, interlineado y márgenes del .docx y, si existe la
#               imagen farmag-docx-lo:1, cuenta las páginas convirtiéndolo a PDF.
param([switch]$Forzar, [switch]$Verificar)
# 'Continue': en PowerShell 5.1 cualquier línea en stderr de docker sería un error fatal.
# Los fallos se detectan con $LASTEXITCODE.
$ErrorActionPreference = 'Continue'

$Pandoc = 'pandoc/core:3.5'
$Py = 'farmag-docx:1'
$PyLo = 'farmag-docx-lo:1'

$Plantilla = $PSScriptRoot
$Raiz = Split-Path $Plantilla -Parent
$Fecha = Get-Date -Format 'yyyy-MM-dd'
$Nombre = "FarmaG_Documentacion_$Fecha.docx"

function Test-Imagen($img) { docker image inspect $img *> $null; return ($LASTEXITCODE -eq 0) }
function Invoke-Py { docker run --rm -v "${Raiz}:/doc" -w /doc/plantilla $Py python @args; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

if (-not (Test-Imagen $Py)) {
    Write-Host "Construyendo la imagen local $Py (python:3.12-slim + python-docx)..."
    docker build -q -t $Py -f "$Plantilla\docker\Dockerfile" "$Plantilla\docker"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host '1/3 Uniendo capítulos...'
$extra = @(); if ($Forzar) { $extra = @('--forzar') }
Invoke-Py ensamblar.py /doc /doc/salida/_tmp/ensamblado.md @extra

Write-Host '2/3 Convirtiendo con pandoc...'
docker run --rm -v "${Raiz}:/doc" -w /doc $Pandoc `
    salida/_tmp/ensamblado.md -f markdown-yaml_metadata_block -t docx `
    --reference-doc=plantilla/referencia.docx --toc --toc-depth=3 `
    -M "toc-title=ÍNDICE GENERAL" -M lang=es-GT `
    -o salida/_tmp/pandoc.docx
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '3/3 Ajustando estilos y secciones...'
Invoke-Py postproceso.py /doc/salida/_tmp/pandoc.docx "/doc/salida/$Nombre"
Write-Host "Generado: $Raiz\salida\$Nombre"

if ($Verificar) {
    Invoke-Py verificar.py "/doc/salida/$Nombre"
    if (Test-Imagen $PyLo) {
        docker run --rm -v "${Raiz}:/doc" -w /doc/salida/_tmp $PyLo `
            soffice --headless --convert-to pdf --outdir /doc/salida/_tmp "/doc/salida/$Nombre" *> $null
        $pdf = [IO.Path]::ChangeExtension($Nombre, '.pdf')
        Invoke-Py verificar.py --paginas "/doc/salida/_tmp/$pdf"
    } else {
        Write-Host "(Para contar páginas construya $PyLo`: ver plantilla\README.md)"
    }
}
