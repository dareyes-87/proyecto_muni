import ExcelJS from 'exceljs';

/** Convierte un valor de celda de exceljs a texto plano (soporta rich text y fórmulas). */
export function celdaATexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor) return (valor as any).richText.map((r: any) => r.text).join('');
    if ('result' in valor) return String((valor as any).result ?? '');
    if ('text' in valor) return String((valor as any).text ?? '');
    return '';
  }
  return String(valor).trim();
}


/**
 * Interpreta una celda de fecha: Date nativo de Excel, 'YYYY-MM-DD' o 'DD/MM/YYYY'.
 * Devuelve medianoche UTC de la fecha de calendario (como Prisma guarda @db.Date).
 * exceljs entrega las fechas nativas ya en medianoche UTC: se leen con getUTC*,
 * no con setHours local, que las movería al día anterior en Guatemala.
 */
export function parseFechaCelda(valor: ExcelJS.CellValue): Date | null {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
  }
  const texto = celdaATexto(valor).trim();
  if (!texto) return null;

  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[0]}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const dmyMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export interface ExcelTablaOptions {
  hoja: string;
  columnas: { header: string; key: string; width?: number }[];
  filas: Record<string, unknown>[];
}

// Azul muy oscuro de la Municipalidad de Gualán (= primary-900 en tailwind.config.js).
const COLOR_HEADER_BG = 'FF003D8B';
const COLOR_HEADER_TEXTO = 'FFFFFFFF';
const ANCHO_MIN = 10;
const ANCHO_MAX = 40;

export async function generarExcel(opts: ExcelTablaOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FarmaG';
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
