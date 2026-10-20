"""Une los capítulos markdown en un solo archivo listo para pandoc.

Uso: python ensamblar.py <raiz docs/documentacion> <salida.md> [--forzar]

- Quita comentarios HTML.
- Junta las secciones "REFERENCIAS ..." de todos los archivos en una sola
  "REFERENCIAS BIBLIOGRÁFICAS" (orden alfabético, sin duplicados).
- Renumera "Tabla N." y "Figura N." de forma corrida y actualiza las menciones.
- Sustituye {{imagen: archivo.png}} por la imagen de diagramas/imagenes/ (máx. 15 cm).
- Imprime el resumen. Sale con código 2 si hay errores (salvo --forzar).
"""
import glob
import os
import re
import struct
import sys
import unicodedata

ANCHO_MAX_CM = 15.0
ALTO_MAX_CM = 19.0          # alto útil de la página Carta (22.86 cm) menos título y fuente
MARCA_INDICE = "@@INDICE_GENERAL@@"
MARCA_CUERPO = "@@INICIO_CUERPO@@"
MARCA_REFS = "@@REFERENCIAS@@"

# (etiqueta, patrón, parte). Se aceptan varios archivos por patrón (se ordenan por nombre).
ORDEN = [
    ("Portada", "capitulos/00_portada*.md", "prelim"),
    ("Índices", None, "indices"),
    ("Resumen", "capitulos/00_resumen*.md", "prelim"),
    ("Introducción", "capitulos/00_introduccion*.md", "cuerpo"),
] + [(f"Capítulo {n}", f"capitulos/0{n}_*.md", "capitulo") for n in range(1, 9)] + [
    ("Conclusiones", "capitulos/09_conclusiones*.md", "cuerpo"),
    ("Recomendaciones", "capitulos/10_recomendaciones*.md", "cuerpo"),
    ("Glosario", "capitulos/11_glosario*.md", "cuerpo"),
    ("Referencias", "capitulos/12_referencias*.md", "referencias"),
    ("Anexos", "capitulos/13_anexo*.md", "cuerpo"),
]

RE_CAPTION = re.compile(r"^(Tabla|Figura)\s+(\d+)\.\s*$")
RE_IMAGEN = re.compile(r"^\{\{\s*imagen:\s*([^}|]+?)\s*(?:\|\s*ancho\s*=\s*([\d.]+)\s*cm\s*)?\}\}\s*$")
# ![](../diagramas/imagenes/x.png) o ![](../diagramas/imagenes/x.png){width=12cm}, en una línea sola
RE_IMAGEN_MD = re.compile(r"^!\[[^\]]*\]\(\s*<?([^)>\s]+)>?\s*\)(?:\{[^}]*?width=([\d.]+)cm[^}]*\})?\s*$")
RE_REF_TITULO = re.compile(r"^(#{1,6})\s+REFERENCIAS\b", re.IGNORECASE)
RE_TITULO = re.compile(r"^(#{1,6})\s")
RE_FENCE = re.compile(r"^\s*(```|~~~)")
# "Tabla 12", "Figura 3", "Tablas 22 a 27", "Figuras 4, 5 y 6"
RE_MENCION = re.compile(
    r"(?<![\w])(Tabla|Figura)(s?)(\s+)(\d+)"
    r"((?:(?:\s*,\s*|\s+(?:y|e|a|o)\s+)\d+)*)"
)
RE_NUM = re.compile(r"\d+")

errores, avisos = [], []


def normalizar(texto):
    texto = texto.replace("*", "").replace("_", "")
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto).strip().casefold()


def quitar_comentarios(texto):
    return re.sub(r"<!--.*?-->", "", texto, flags=re.DOTALL)


def separar_referencias(lineas, archivo_completo=False):
    """Devuelve (lineas_sin_referencias, entradas)."""
    restantes, bloque, dentro, nivel = [], [], archivo_completo, 0
    for linea in lineas:
        m = RE_REF_TITULO.match(linea)
        t = RE_TITULO.match(linea)
        if m and not archivo_completo:
            dentro, nivel = True, len(m.group(1))
            continue
        if dentro and t and not archivo_completo and len(t.group(1)) <= nivel:
            dentro = False
        if dentro:
            if not t:
                bloque.append(linea)
        else:
            restantes.append(linea)
    entradas, actual = [], []
    for linea in bloque + [""]:
        s = linea.strip()
        if s.startswith(">"):
            continue
        if s:
            actual.append(s)
        elif actual:
            entradas.append(" ".join(actual))
            actual = []
    return restantes, entradas


def tam_png(ruta):
    """(ancho_cm, alto_cm) según los píxeles y el pHYs del PNG (96 ppp si no lo trae, como pandoc)."""
    with open(ruta, "rb") as f:
        datos = f.read()
    if datos[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    ancho, alto = struct.unpack(">II", datos[16:24])
    ppp_x = ppp_y = 96.0
    i = 8
    while i < len(datos):
        largo, tipo = struct.unpack(">I4s", datos[i:i + 8])
        if tipo == b"pHYs":
            px, py, unidad = struct.unpack(">IIB", datos[i + 8:i + 17])
            if unidad == 1 and px and py:
                ppp_x, ppp_y = px * 0.0254, py * 0.0254
            break
        if tipo == b"IDAT":
            break
        i += 12 + largo
    return ancho / ppp_x * 2.54, alto / ppp_y * 2.54


def bloque_imagen(raiz, nombre, ancho_pedido, origen):
    if not os.path.splitext(nombre)[1]:
        nombre += ".png"
    ruta = os.path.join(raiz, "diagramas", "imagenes", nombre)
    if not os.path.isfile(ruta):
        errores.append(f"{origen}: no existe la imagen diagramas/imagenes/{nombre}")
        return [f"**[FALTA IMAGEN: {nombre}]**"]
    medidas = tam_png(ruta) if nombre.lower().endswith(".png") else None
    ancho = min(float(ancho_pedido), ANCHO_MAX_CM) if ancho_pedido else None
    if medidas:
        w, h = medidas
        ancho = min(ancho or w, ANCHO_MAX_CM)
        if h * ancho / w > ALTO_MAX_CM:
            atributo = f"height={ALTO_MAX_CM:.2f}cm"
        else:
            atributo = f"width={ancho:.2f}cm"
    else:
        atributo = f"width={ancho or ANCHO_MAX_CM:.2f}cm"
    # Ruta absoluta dentro del contenedor; pandoc monta la misma carpeta en /doc.
    return ['::: {custom-style="Imagen"}', f"![]({ruta}){{{atributo}}}", ":::"]


def leer_archivos(raiz):
    piezas = []     # (etiqueta, ruta_relativa | None, parte)
    for etiqueta, patron, parte in ORDEN:
        if patron is None:
            piezas.append((etiqueta, None, parte))
            continue
        encontrados = sorted(glob.glob(os.path.join(raiz, patron)))
        if not encontrados:
            avisos.append(f"No existe todavía: {patron} ({etiqueta}); se omite.")
        if len(encontrados) > 1 and parte == "capitulo":
            avisos.append(f"Hay {len(encontrados)} archivos para {etiqueta}; se unen en orden de nombre.")
        for ruta in encontrados:
            piezas.append((etiqueta, os.path.relpath(ruta, raiz).replace("\\", "/"), parte))
    return piezas


def main():
    raiz, salida = sys.argv[1], sys.argv[2]
    forzar = "--forzar" in sys.argv[3:]
    piezas = leer_archivos(raiz)

    # 1. Leer, quitar comentarios y separar referencias.
    textos, referencias = [], []
    for etiqueta, rel, parte in piezas:
        if rel is None:
            textos.append((etiqueta, None, parte, []))
            continue
        with open(os.path.join(raiz, rel), encoding="utf-8") as f:
            lineas = quitar_comentarios(f.read()).splitlines()
        lineas, entradas = separar_referencias(lineas, archivo_completo=(parte == "referencias"))
        referencias.extend(entradas)
        if parte != "referencias":
            textos.append((etiqueta, rel, parte, lineas))

    # 2. Localizar títulos de tabla/figura y asignar numeración corrida.
    contador = {"Tabla": 0, "Figura": 0}
    por_archivo = {}             # (rel, tipo, viejo) -> nuevo
    por_numero = {}              # (tipo, viejo) -> [(rel, nuevo)]
    captions = {}                # (rel, indice_linea) -> (tipo, nuevo)
    for _, rel, _, lineas in textos:
        en_codigo = False
        for i, linea in enumerate(lineas):
            if RE_FENCE.match(linea):
                en_codigo = not en_codigo
            if en_codigo:
                continue
            m = RE_CAPTION.match(linea)
            if not m or (i > 0 and lineas[i - 1].strip()):
                continue
            tipo, viejo = m.group(1), int(m.group(2))
            if i + 1 >= len(lineas) or not lineas[i + 1].strip():
                errores.append(f"{rel}: '{tipo} {viejo}.' sin título en la línea siguiente")
            contador[tipo] += 1
            nuevo = contador[tipo]
            if (rel, tipo, viejo) in por_archivo:
                errores.append(f"{rel}: '{tipo} {viejo}.' aparece dos veces como título")
            por_archivo[(rel, tipo, viejo)] = nuevo
            por_numero.setdefault((tipo, viejo), []).append((rel, nuevo))
            captions[(rel, i)] = (tipo, nuevo)

    def resolver(rel, tipo, viejo, contexto):
        if (rel, tipo, viejo) in por_archivo:
            return por_archivo[(rel, tipo, viejo)]
        otros = por_numero.get((tipo, viejo), [])
        if len(otros) == 1:
            return otros[0][1]
        motivo = "no existe" if not otros else "es ambigua (está en varios archivos)"
        errores.append(f"{rel}: la mención a '{tipo} {viejo}' {motivo}: «…{contexto.strip()}…»")
        return None

    # 3. Reescribir cada archivo.
    mencionados = {}             # (tipo, nuevo) -> posición de la primera mención
    posiciones = {}              # (tipo, nuevo) -> posición del título
    salida_md, completar = [], 0
    pos = 0
    for etiqueta, rel, parte, lineas in textos:
        if parte == "indices":
            salida_md += [MARCA_INDICE, ""]
            for titulo, estilo in (("Índice de figuras", "Titulo de figura"),
                                   ("Índice de tablas", "Titulo de tabla")):
                salida_md += ['::: {custom-style="Titulo preliminar"}', titulo, ":::", "",
                              "```{=openxml}", campo_indice(estilo), "```", ""]
            continue
        if etiqueta == "Anexos" and MARCA_REFS not in salida_md:
            salida_md.append(MARCA_REFS)
        if parte in ("cuerpo", "capitulo") and MARCA_CUERPO not in salida_md:
            salida_md += [MARCA_CUERPO, ""]

        # Bloques: código (intacto) y texto (se procesa como un todo para menciones partidas en dos líneas).
        resultado, texto, en_codigo = [], [], False

        def volcar_texto():
            nonlocal pos
            if not texto:
                return
            bloque = "\n".join(texto)

            def sustituir(m):
                tipo = m.group(1)
                inicio = max(0, m.start() - 40)
                contexto = bloque[inicio:m.end() + 10].replace("\n", " ")
                nums = [int(m.group(4))] + [int(x) for x in RE_NUM.findall(m.group(5))]
                nuevos = [resolver(rel, tipo, n, contexto) for n in nums]
                for n in nuevos:
                    if n is not None:
                        mencionados.setdefault((tipo, n), pos + m.start())
                if any(n is None for n in nuevos):
                    return m.group(0)
                resto = m.group(5)
                for viejo, nuevo in zip(nums[1:], nuevos[1:]):
                    resto = re.sub(rf"(?<!\d){viejo}(?!\d)", str(nuevo), resto, count=1)
                return f"{tipo}{m.group(2)}{m.group(3)}{nuevos[0]}{resto}"

            bloque = RE_MENCION.sub(sustituir, bloque)
            pos += len(bloque)
            resultado.extend(bloque.split("\n"))
            texto.clear()

        i = 0
        while i < len(lineas):
            linea = lineas[i]
            if RE_FENCE.match(linea):
                if not en_codigo:
                    volcar_texto()
                en_codigo = not en_codigo
                resultado.append(linea)
                i += 1
                continue
            if en_codigo:
                resultado.append(linea)
                i += 1
                continue
            if (rel, i) in captions:
                volcar_texto()
                tipo, nuevo = captions[(rel, i)]
                posiciones[(tipo, nuevo)] = pos
                titulo = []
                i += 1
                while i < len(lineas) and lineas[i].strip():
                    titulo.append(lineas[i].strip())
                    i += 1
                estilo = "Titulo de tabla" if tipo == "Tabla" else "Titulo de figura"
                resultado += [f'::: {{custom-style="{estilo}"}}', f"{tipo} {nuevo}.\\", " ".join(titulo), ":::"]
                continue
            m = RE_IMAGEN.match(linea)
            if m:
                volcar_texto()
                resultado += bloque_imagen(raiz, m.group(1), m.group(2), rel)
                i += 1
                continue
            m = RE_IMAGEN_MD.match(linea)
            if m:
                volcar_texto()
                # La ruta es relativa al capítulo y debe apuntar a diagramas/imagenes/.
                destino = os.path.normpath(os.path.join(os.path.dirname(rel), m.group(1))).replace("\\", "/")
                carpeta, nombre = os.path.split(destino)
                if carpeta != "diagramas/imagenes":
                    errores.append(f"{rel}: la imagen {m.group(1)} no está en diagramas/imagenes/")
                    resultado.append(f"**[FALTA IMAGEN: {m.group(1)}]**")
                else:
                    resultado += bloque_imagen(raiz, nombre, m.group(2), rel)
                i += 1
                continue
            if linea.startswith("Fuente:") and (i == 0 or not lineas[i - 1].strip()):
                volcar_texto()
                parrafo = []
                while i < len(lineas) and lineas[i].strip():
                    parrafo.append(lineas[i].strip())
                    i += 1
                resultado += ['::: {custom-style="Fuente"}', " ".join(parrafo), ":::"]
                continue
            texto.append(linea)
            i += 1
        volcar_texto()
        completar += sum(l.count("[COMPLETAR") for l in resultado)
        salida_md += resultado + [""]

    # 4. Referencias unificadas.
    unicas = {}
    for ref in referencias:
        unicas.setdefault(normalizar(ref), ref)
    bloque_refs = []
    if unicas:
        bloque_refs = ["# REFERENCIAS BIBLIOGRÁFICAS", "", '::: {custom-style="Bibliography"}']
        # Las referencias [COMPLETAR: ...] van al final para no encabezar la lista.
        for clave in sorted(unicas, key=lambda c: (c.startswith("[completar"), c)):
            bloque_refs += [unicas[clave], ""]
        bloque_refs += [":::", ""]
        completar += sum(r.count("[COMPLETAR") for r in unicas.values())
    # Van después del glosario y antes de los anexos.
    if MARCA_REFS not in salida_md:
        salida_md.append(MARCA_REFS)
    k = salida_md.index(MARCA_REFS)
    salida_md[k:k + 1] = bloque_refs

    # 5. Avisos: títulos no mencionados o mencionados después de aparecer.
    for clave, p in sorted(posiciones.items(), key=lambda x: (x[0][0], x[0][1])):
        tipo, n = clave
        if clave not in mencionados:
            avisos.append(f"{tipo} {n} no se menciona en el texto.")
        elif mencionados[clave] > p:
            avisos.append(f"{tipo} {n} se menciona por primera vez después de aparecer.")

    os.makedirs(os.path.dirname(salida), exist_ok=True)
    with open(salida, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(salida_md) + "\n")

    capitulos = sorted({e for e, r, p, _ in textos if p == "capitulo"})
    print("=== Archivos incluidos ===")
    for etiqueta, rel, parte, _ in textos:
        if rel:
            print(f"  {etiqueta:<16} {rel}")
    for a in avisos:
        print(f"AVISO: {a}")
    for e in errores:
        print(f"ERROR: {e}")
    print("=== Resumen ===")
    print(f"Capítulos incluidos: {len(capitulos)} ({', '.join(capitulos) or 'ninguno'})")
    print(f"Tablas: {contador['Tabla']}")
    print(f"Figuras: {contador['Figura']}")
    print(f"Referencias: {len(unicas)} (de {len(referencias)} entradas, sin duplicados)")
    print(f"[COMPLETAR] pendientes: {completar}")
    if errores and not forzar:
        print(f"Se encontraron {len(errores)} errores; no se genera el documento (use --forzar para generarlo igual).")
        sys.exit(2)


def campo_indice(estilo):
    """Campo TOC de Word que arma el índice a partir de un estilo de párrafo."""
    return (
        '<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
        f'<w:r><w:instrText xml:space="preserve"> TOC \\h \\z \\t "{estilo},1" </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        '<w:r><w:t>Actualice este índice en Word: clic derecho, Actualizar campo.</w:t></w:r>'
        '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>'
    )


if __name__ == "__main__":
    main()
