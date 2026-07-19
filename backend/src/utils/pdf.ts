import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export type Alineacion = 'left' | 'right' | 'center';

export interface PdfTablaOptions {
  nombreFarmacia: string;
  titulo: string;
  filtrosTexto: string;
  columnas: string[];
  filas: (string | number)[][];
  /** Una por columna; por defecto 'left'. Usar 'right' para columnas numéricas. */
  alineaciones?: Alineacion[];
}

// Azul muy oscuro de la Municipalidad de Gualán (= primary-900 en tailwind.config.js).
const COLOR_INSTITUCIONAL = '#003d8b';
const COLOR_HEADER_TABLA_BG = '#003d8b';
const COLOR_HEADER_TABLA_TEXTO = '#ffffff';
const COLOR_ZEBRA = '#f3f4f6';
const COLOR_BANDA_INFO = '#f3f4f6';
const COLOR_TEXTO_SECUNDARIO = '#6b7280';
const COLOR_BORDE = '#d1d5db';

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-municipalidad.png');
const ALTO_FILA = 20;
const ALTO_HEADER_TABLA = 22;

function rutaLogoSiExiste(): string | null {
  try {
    return fs.existsSync(LOGO_PATH) ? LOGO_PATH : null;
  } catch {
    return null;
  }
}

export function generarPdfTabla(opts: PdfTablaOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const alineaciones = opts.alineaciones ?? opts.columnas.map(() => 'left' as Alineacion);
    const colWidth = pageWidth / Math.max(1, opts.columnas.length);
    const logoPath = rutaLogoSiExiste();

    // ============================================
    // ENCABEZADO (logo a la izquierda + nombre/título a la derecha del logo)
    // ============================================
    const dibujarEncabezado = () => {
      const yInicio = doc.page.margins.top;
      const logoAncho = 55;
      const textoX = logoPath ? startX + logoAncho + 15 : startX;

      if (logoPath) {
        try {
          doc.image(logoPath, startX, yInicio, { width: logoAncho, height: logoAncho, fit: [logoAncho, logoAncho] });
        } catch {
          // Si el archivo existe pero no es una imagen válida, seguimos sin logo
          // en vez de tronar la generación del PDF.
        }
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(COLOR_INSTITUCIONAL)
        .text(opts.nombreFarmacia, textoX, yInicio, { width: pageWidth - (textoX - startX) });
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#374151')
        .text(opts.titulo, textoX, doc.y + 2, { width: pageWidth - (textoX - startX) });

      const yTrasLogo = yInicio + logoAncho;
      const yTrasTexto = doc.y;
      let y = Math.max(yTrasLogo, yTrasTexto) + 10;

      // Línea divisoria institucional
      doc.moveTo(startX, y).lineTo(startX + pageWidth, y).lineWidth(2).strokeColor(COLOR_INSTITUCIONAL).stroke();
      y += 8;

      // Franja gris con fecha de generación y filtros aplicados
      const alturaBanda = 30;
      doc.rect(startX, y, pageWidth, alturaBanda).fill(COLOR_BANDA_INFO);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLOR_TEXTO_SECUNDARIO)
        .text(`Generado: ${new Date().toLocaleString('es-GT')}`, startX + 8, y + 6, { width: pageWidth - 16 })
        .text(`Filtros aplicados: ${opts.filtrosTexto || 'ninguno'}`, startX + 8, y + 17, { width: pageWidth - 16 });
      y += alturaBanda + 10;

      return y;
    };

    // ============================================
    // ENCABEZADO DE COLUMNAS DE LA TABLA (se repite en cada página)
    // ============================================
    const dibujarHeaderTabla = (y: number): number => {
      doc.rect(startX, y, pageWidth, ALTO_HEADER_TABLA).fill(COLOR_HEADER_TABLA_BG);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR_HEADER_TABLA_TEXTO);
      opts.columnas.forEach((col, i) => {
        doc.text(col, startX + i * colWidth + 5, y + 6, {
          width: colWidth - 10,
          height: 11,
          align: alineaciones[i] ?? 'left',
          ellipsis: true,
        });
      });
      return y + ALTO_HEADER_TABLA;
    };

    let y = dibujarEncabezado();
    y = dibujarHeaderTabla(y);

    // En saltos de página solo se repite el encabezado de columnas (no el logo/nombre/franja
    // completos): repetir el bloque institucional en cada página desperdiciaría ~165pt por
    // página y multiplicaría el número de páginas en reportes largos sin aportar nada nuevo.
    const nuevaPagina = () => {
      doc.addPage();
      y = doc.page.margins.top;
      y = dibujarHeaderTabla(y);
    };

    const dibujarFila = (valores: (string | number)[], indice: number) => {
      if (y + ALTO_FILA > doc.page.height - doc.page.margins.bottom - 30) nuevaPagina();

      if (indice % 2 === 1) {
        doc.rect(startX, y, pageWidth, ALTO_FILA).fill(COLOR_ZEBRA);
      }
      doc.font('Helvetica').fontSize(8).fillColor('#1f2937');
      valores.forEach((valor, i) => {
        doc.text(String(valor ?? ''), startX + i * colWidth + 5, y + 5, {
          width: colWidth - 10,
          height: 10,
          align: alineaciones[i] ?? 'left',
          ellipsis: true,
        });
      });
      y += ALTO_FILA;
    };

    if (opts.filas.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(9)
        .fillColor(COLOR_TEXTO_SECUNDARIO)
        .text('Sin registros para los filtros aplicados.', startX, y + 8);
    } else {
      opts.filas.forEach((fila, i) => dibujarFila(fila, i));
    }

    // ============================================
    // PIE DE PÁGINA (número de página, solo se sabe el total al final)
    // ============================================
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      // OJO: debe quedar estrictamente dentro del área de contenido (arriba del margen
      // inferior). Escribir por debajo de `page.height - margins.bottom` hace que pdfkit
      // interprete el texto como desbordado y agregue páginas en blanco silenciosamente.
      const yPie = doc.page.height - doc.page.margins.bottom - 14;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLOR_TEXTO_SECUNDARIO)
        .text('Documento generado por el Sistema FarmaRH', startX, yPie, {
          width: pageWidth / 2,
          height: 12,
          align: 'left',
          ellipsis: true,
        })
        .text(`Página ${i - rango.start + 1} de ${rango.count}`, startX + pageWidth / 2, yPie, {
          width: pageWidth / 2,
          height: 12,
          align: 'right',
          ellipsis: true,
        });
    }

    doc.end();
  });
}
