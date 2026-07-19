import ExcelJS from 'exceljs';

export interface ExcelTablaOptions {
  hoja: string;
  columnas: { header: string; key: string; width?: number }[];
  filas: Record<string, unknown>[];
}

const COLOR_HEADER_BG = 'FF1E3F88';
const COLOR_HEADER_TEXTO = 'FFFFFFFF';
const ANCHO_MIN = 10;
const ANCHO_MAX = 40;

export async function generarExcel(opts: ExcelTablaOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FarmaRH';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(opts.hoja.slice(0, 31));
  sheet.columns = opts.columnas;
  sheet.addRows(opts.filas);

  const filaHeader = sheet.getRow(1);
  filaHeader.font = { bold: true, color: { argb: COLOR_HEADER_TEXTO } };
  filaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
  filaHeader.alignment = { vertical: 'middle' };

  // Fila de encabezado siempre visible al hacer scroll.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: opts.columnas.length } };

  // Ancho de columna según el contenido real (encabezado y todas las filas), no un valor fijo.
  sheet.columns.forEach((column, i) => {
    let maxLength = opts.columnas[i]?.header?.length ?? ANCHO_MIN;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const largo = cell.value != null ? String(cell.value).length : 0;
      if (largo > maxLength) maxLength = largo;
    });
    column.width = Math.min(Math.max(maxLength + 3, ANCHO_MIN), ANCHO_MAX);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
