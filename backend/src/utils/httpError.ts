import { Response } from 'express';

interface ReglaError {
  /** Subcadena a buscar en el mensaje del error. */
  match: string;
  /** Código HTTP a devolver si coincide. */
  status: number;
}

/**
 * Responde a un error de un handler: si el mensaje coincide con una regla de
 * negocio conocida (p. ej. "Stock insuficiente" → 409), devuelve ese status con
 * el mensaje (son mensajes propios y seguros). Cualquier otro error es un 500 y
 * NO expone el detalle interno salvo en desarrollo (H-13 / H-07).
 */
export function responderError(res: Response, error: any, reglas: ReglaError[] = []): void {
  const mensaje: string = error?.message || '';

  for (const regla of reglas) {
    if (mensaje.includes(regla.match)) {
      res.status(regla.status).json({ error: mensaje });
      return;
    }
  }

  // Errores de validación que ya traen un status 4xx (p. ej. ErrorFechaInvalida).
  // Su mensaje es propio y seguro, así que se puede devolver al cliente.
  const statusError = error?.status ?? error?.statusCode;
  if (typeof statusError === 'number' && statusError >= 400 && statusError < 500) {
    res.status(statusError).json({ error: mensaje || 'Petición inválida' });
    return;
  }

  // Errores conocidos de Prisma: duplicado por restricción única y registro no
  // encontrado. Antes terminaban en 500 (H-15).
  if (error?.code === 'P2002') {
    const campos = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'valor único';
    res.status(409).json({ error: `Ya existe un registro con el mismo ${campos}` });
    return;
  }
  if (error?.code === 'P2025') {
    res.status(404).json({ error: 'Registro no encontrado' });
    return;
  }

  console.error('❌ Error:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? mensaje : undefined,
  });
}
