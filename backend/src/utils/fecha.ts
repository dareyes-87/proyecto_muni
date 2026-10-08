// Validación de fechas recibidas por query string (H-004).
//
// Antes, un filtro de fecha inválido (p. ej. ?desde=basura) se pasaba tal cual a
// `new Date(...)`, produciendo un Invalid Date que Prisma rechazaba lanzando un
// error no controlado → HTTP 500. Ahora se valida en el borde y, si la fecha es
// inválida, se lanza un error con `status: 400` que los handlers traducen a una
// respuesta 400 con mensaje claro (sin exponer detalle interno).

/** Error de validación de entrada: `responderError` lo traduce a 400. */
export class ErrorFechaInvalida extends Error {
  status = 400;
  constructor(mensaje = 'Fecha inválida. Use el formato AAAA-MM-DD') {
    super(mensaje);
    this.name = 'ErrorFechaInvalida';
  }
}

/**
 * Convierte una cadena de query a Date. Devuelve undefined si no se envió (vacío),
 * y lanza ErrorFechaInvalida (400) si se envió pero no es una fecha válida.
 */
export function parseFechaQuery(valor: unknown, campo = 'fecha'): Date | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') {
    throw new ErrorFechaInvalida(`El filtro de ${campo} es inválido`);
  }
  const d = new Date(valor);
  if (isNaN(d.getTime())) {
    throw new ErrorFechaInvalida(`El filtro de ${campo} no es una fecha válida (use AAAA-MM-DD)`);
  }
  return d;
}

/**
 * Valida un rango [desde, hasta]. Ambos son opcionales; si se envían, deben ser
 * válidos y `desde` no puede ser posterior a `hasta`.
 */
export function parseRangoFechas(
  desde: unknown,
  hasta: unknown
): { desde?: Date; hasta?: Date } {
  const d = parseFechaQuery(desde, 'fecha desde');
  const h = parseFechaQuery(hasta, 'fecha hasta');
  if (d && h && d.getTime() > h.getTime()) {
    throw new ErrorFechaInvalida('El rango de fechas es inválido: "desde" es posterior a "hasta"');
  }
  return { desde: d, hasta: h };
}
