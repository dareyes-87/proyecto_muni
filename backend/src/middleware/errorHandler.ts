import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('❌ Error:', err.message);

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Datos inválidos',
      detalles: JSON.parse(err.message),
    });
    return;
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
