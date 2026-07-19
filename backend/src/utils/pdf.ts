import PDFDocument from 'pdfkit';

export interface PdfTablaOptions {
  nombreFarmacia: string;
  titulo: string;
  filtrosTexto: string;
  columnas: string[];
  filas: (string | number)[][];
}

export function generarPdfTabla(opts: PdfTablaOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text(opts.nombreFarmacia, { align: 'center' });
    doc.fontSize(13).font('Helvetica-Bold').text(opts.titulo, { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`Generado: ${new Date().toLocaleString('es-GT')}`, { align: 'center' });
    doc.text(`Filtros aplicados: ${opts.filtrosTexto || 'ninguno'}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1);

    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / Math.max(1, opts.columnas.length);
    let y = doc.y;

    const nuevaPagina = () => {
      doc.addPage();
      y = doc.page.margins.top;
    };

    const dibujarFila = (valores: (string | number)[], bold = false) => {
      if (y > doc.page.height - doc.page.margins.bottom - 20) nuevaPagina();
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      valores.forEach((valor, i) => {
        doc.text(String(valor ?? ''), startX + i * colWidth, y, {
          width: colWidth - 4,
          ellipsis: true,
        });
      });
      y += 18;
    };

    dibujarFila(opts.columnas, true);
    doc
      .moveTo(startX, y - 4)
      .lineTo(startX + pageWidth, y - 4)
      .strokeColor('#cccccc')
      .stroke();

    if (opts.filas.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#888888').text('Sin registros para los filtros aplicados.', startX, y + 4);
    } else {
      opts.filas.forEach((fila) => dibujarFila(fila));
    }

    doc.end();
  });
}
