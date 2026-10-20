"""Verifica el formato del .docx generado contra 00_lineamientos.md.

Uso: python verificar.py <documento.docx>
     python verificar.py --paginas <documento.pdf>   (cuenta páginas del PDF de LibreOffice)

Resuelve cada propiedad como lo hace Word: formato directo del párrafo/run,
luego la cadena de estilos (base_style) y por último los valores por defecto.
"""
import re
import sys
import warnings

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH as A, WD_LINE_SPACING as L
from docx.oxml.ns import qn
from docx.shared import Cm

warnings.filterwarnings("ignore", "style lookup by style_id")


def cadena(estilo):
    while estilo is not None:
        yield estilo
        estilo = estilo.base_style


def efectivo(p, prop):
    run = next((r for r in p.runs if r.text.strip()), None)
    if prop in ("font", "size", "bold"):
        if run is not None:
            v = {"font": run.font.name, "size": run.font.size, "bold": run.font.bold}[prop]
            if v is not None:
                return v
        for st in cadena(p.style):
            v = {"font": st.font.name, "size": st.font.size, "bold": st.font.bold}[prop]
            if v is not None:
                return v
        return None
    getters = {
        "align": lambda pf: pf.alignment,
        "spacing": lambda pf: pf.line_spacing_rule,
        "first": lambda pf: pf.first_line_indent,
        "left": lambda pf: pf.left_indent,
        "before": lambda pf: pf.space_before,
        "after": lambda pf: pf.space_after,
        "pagebreak": lambda pf: pf.page_break_before,
    }
    v = getters[prop](p.paragraph_format)
    if v is not None:
        return v
    for st in cadena(p.style):
        v = getters[prop](st.paragraph_format)
        if v is not None:
            return v
    return None


def cm(v):
    return round((v or 0) / 360000, 2)


ESPERADO = {
    "cuerpo": dict(font="Times New Roman", size=12, align=A.JUSTIFY, spacing=L.DOUBLE, first=1.27, before=0, after=0),
    "h1": dict(font="Times New Roman", size=12, bold=True, align=A.CENTER, first=0),
    "h23": dict(font="Times New Roman", size=12, bold=True, align=A.LEFT, first=0),
    "tabla": dict(font="Times New Roman", spacing=L.SINGLE, first=0),
    "caption": dict(font="Times New Roman", size=12, spacing=L.SINGLE),
    "codigo": dict(font="Courier New", size=10, spacing=L.SINGLE, first=0),
    "referencia": dict(font="Times New Roman", size=12, first=-1.27, left=1.27),
}


def comprobar(p, tipo):
    fallos = []
    for prop, esperado in ESPERADO[tipo].items():
        v = efectivo(p, prop)
        if prop == "size":
            v = v.pt if v is not None else None
            ok = v == esperado if tipo != "tabla" else v is not None and 10 <= v <= 12
        elif prop in ("first", "left", "before", "after"):
            v = cm(v) if prop in ("first", "left") else (v.pt if v is not None else 0)
            ok = abs(v - esperado) < 0.02
        elif prop == "bold":
            ok = bool(v) == esperado
        elif prop == "align" and esperado == A.LEFT:
            ok = v in (None, A.LEFT)
        else:
            ok = v == esperado
        if not ok:
            fallos.append(f"{prop}={v} (se esperaba {esperado})")
    if tipo == "tabla":
        tam = efectivo(p, "size")
        if tam is None or not 10 <= tam.pt <= 12:
            fallos.append(f"size={tam} (se esperaba 10–12)")
    return fallos


def muestras(doc):
    grupos = {k: [] for k in ESPERADO}
    for p in doc.paragraphs:
        if not p.text.strip():
            continue
        n = p.style.name
        if n in ("Body Text", "First Paragraph"):
            grupos["cuerpo"].append(p)
        elif n == "Heading 1":
            grupos["h1"].append(p)
        elif n in ("Heading 2", "Heading 3"):
            grupos["h23"].append(p)
        elif n in ("Titulo de tabla", "Titulo de figura", "Fuente"):
            grupos["caption"].append(p)
        elif n == "Source Code":
            grupos["codigo"].append(p)
        elif n == "Bibliography":
            grupos["referencia"].append(p)
    for t in doc.tables:
        for fila in t.rows:
            for c in fila.cells:
                grupos["tabla"].extend(x for x in c.paragraphs if x.text.strip())
    return grupos


def verificar_docx(ruta):
    doc = Document(ruta)
    problemas = 0
    print("=== Secciones ===")
    for i, s in enumerate(doc.sections, 1):
        medidas = [cm(s.page_width), cm(s.page_height), cm(s.top_margin), cm(s.bottom_margin),
                   cm(s.left_margin), cm(s.right_margin)]
        num = s._sectPr.find(qn("w:pgNumType"))
        fmt = num.get(qn("w:fmt")) if num is not None else "decimal"
        ok = medidas[:2] == [21.59, 27.94] and all(abs(m - 2.54) < 0.01 for m in medidas[2:])
        problemas += not ok
        print(f"  Sección {i}: {medidas[0]}×{medidas[1]} cm, márgenes {medidas[2:]} cm, "
              f"numeración {fmt} -> {'OK' if ok else 'NO COINCIDE'}")
    print("=== Párrafos (todos los de cada tipo) ===")
    for tipo, ps in muestras(doc).items():
        malos = [(p, comprobar(p, tipo)) for p in ps]
        malos = [(p, f) for p, f in malos if f]
        problemas += len(malos)
        print(f"  {tipo:<10} {len(ps):>5} párrafos, {len(malos)} con diferencias")
        for p, f in malos[:3]:
            print(f"      «{p.text.strip()[:50]}»: {'; '.join(f)}")
    # Capítulos: el título que sigue a "CAPÍTULO N" no debe abrir otra página.
    h1 = [p for p in doc.paragraphs if p.style.name == "Heading 1" and p.text.strip()]
    for a, b in zip(h1, h1[1:]):
        if a.text.upper().startswith("CAPÍTULO") and efectivo(b, "pagebreak"):
            problemas += 1
            print(f"  Salto de página indebido antes de «{b.text}»")
    print(f"=== {'Sin diferencias' if not problemas else f'{problemas} diferencias'} ===")


def paginas_pdf(ruta):
    with open(ruta, "rb") as f:
        datos = f.read()
    n = len(re.findall(rb"/Type\s*/Page[^s]", datos))
    print(f"Páginas (PDF de LibreOffice, Liberation Serif en lugar de Times New Roman): {n}")


if __name__ == "__main__":
    if sys.argv[1] == "--paginas":
        paginas_pdf(sys.argv[2])
    else:
        verificar_docx(sys.argv[1])
