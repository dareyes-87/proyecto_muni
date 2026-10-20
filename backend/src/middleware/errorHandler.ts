import { Request, Response, NextFunction } from 'express';

/**
 * Manejador de errores global. Traduce errores de cliente (JSON malformado,
 * cuerpo demasiado grande, archivo rechazado, validación) a códigos 4xx con un
 * mensaje claro, y oculta el detalle interno de los errores 500 salvo en
 * desarrollo (H-07, H-12).
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const esDesarrollo = process.env.NODE_ENV === 'development';

  // Error de validación Zod.
  if (err?.name === 'ZodError') {
    let detalles: unknown = undefined;
    try {
      detalles = typeof err.message === 'string' ? JSON.parse(err.message) : err.issues;
    } catch {
      detalles = err.issues;
    }
    res.status(400).json({ error: 'Datos inválidos', detalles });
    return;
  }

  // JSON malformado en el cuerpo (body-parser).
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    return;
  }

  // Cuerpo demasiado grande (body-parser).
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
    return;
  }

  // Errores de multer (subida de archivos).
  if (err?.name === 'MulterError') {
    const mensaje =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo permitido'
        : 'Archivo no válido';
    res.status(400).json({ error: mensaje });
    return;
  }

  // Otros errores de cliente que ya traen un status 4xx.
  const status = err?.status || err?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: err.message || 'Petición inválida' });
    return;
  }

  // Error interno: no se filtra el detalle salvo en desarrollo.
  console.error('❌ Error:', err?.message || err);
  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: esDesarrollo ? err?.message : undefined,
  });
}
