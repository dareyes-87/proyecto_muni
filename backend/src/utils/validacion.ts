// Validación de entrada reutilizable (endurecimiento tras la auditoría de seguridad
// 2026-10-07). El objetivo es que ningún valor de usuario con tipo/rango inesperado
// (objeto, arreglo, string no numérico, página negativa) llegue a Prisma y provoque
// un HTTP 500: se traduce en el borde a un 400 claro. Los errores llevan `status`
// para que `responderError`/`errorHandler` respondan 400 sin filtrar detalle interno.

/** Error de validación de entrada: se traduce a HTTP 400. */
export class ErrorValidacion extends Error {
  status = 400;
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorValidacion';
  }
}

/**
 * Normaliza un parámetro de query que debe ser texto. Express entrega un arreglo
 * cuando el parámetro se repite (`?q=a&q=b`, HTTP Parameter Pollution); si eso
 * llega a un `.trim()` o a un filtro Prisma `contains` provoca un HTTP 500. Aquí
 * se toma el primer elemento si es arreglo, se devuelve la cadena si lo es, y
 * `undefined` en cualquier otro caso (objeto, número, etc.).
 */
export function textoQuery(valor: unknown): string | undefined {
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) {
    const primero = valor.find((v) => typeof v === 'string');
    return typeof primero === 'string' ? primero : undefined;
  }
  return undefined;
}

/**
 * Normaliza page/limit de query a enteros seguros. page >= 1; limit en [1, maxLimit].
 * Un valor inválido (negativo, NaN, texto) cae al valor por defecto, nunca a un
 * `skip` negativo (que Prisma rechaza con un 500).
 */
export function clampPaginacion(
  page: unknown,
  limit: unknown,
  opciones: { defLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number; skip: number } {
  const defLimit = opciones.defLimit ?? 50;
  const maxLimit = opciones.maxLimit ?? 100;

  const pRaw = parseInt(String(page ?? ''), 10);
  const lRaw = parseInt(String(limit ?? ''), 10);

  const p = Number.isFinite(pRaw) && pRaw >= 1 ? pRaw : 1;
  const l = Number.isFinite(lRaw) && lRaw >= 1 ? Math.min(lRaw, maxLimit) : defLimit;

  return { page: p, limit: l, skip: (p - 1) * l };
}

/** Máximo de registros que se exportan a PDF/Excel. */
export const LIMITE_EXPORT = 5000;

/** Un reporte más grande que el límite saldría cortado sin aviso: se rechaza en vez de truncarlo. */
export function verificarLimiteExport(total: number): void {
  if (total > LIMITE_EXPORT) {
    throw new ErrorValidacion(
      `El reporte tiene ${total} registros y el máximo exportable es ${LIMITE_EXPORT}. Reduzca el rango de fechas o aplique más filtros.`
    );
  }
}
