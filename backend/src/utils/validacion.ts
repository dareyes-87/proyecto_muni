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

/** Exige que el valor sea una cadena no vacía (rechaza objeto/arreglo/number/null). */
export function exigirCadena(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErrorValidacion(`El campo ${campo} es requerido y debe ser texto`);
  }
  return valor;
}

/** true solo si es un entero positivo real (no NaN, no string, no objeto, no float). */
export function esEnteroPositivo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
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
