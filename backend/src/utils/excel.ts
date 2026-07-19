import ExcelJS from 'exceljs';

export interface ExcelTablaOptions {
  hoja: string;
  columnas: { header: string; key: string; width?: number }[];
  filas: Record<string, unknown>[];
}

export async function generarExcel(opts: ExcelTablaOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FarmaRH';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(opts.hoja.slice(0, 31));
  sheet.columns = opts.columnas;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  sheet.addRows(opts.filas);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: opts.columnas.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
