import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/reportes/dispensaciones
router.get('/dispensaciones', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Reporte de dispensaciones con filtros de fecha
  res.json({ message: 'TODO: Reporte dispensaciones', data: [] });
});

// GET /api/reportes/consumo-medicamentos
router.get('/consumo-medicamentos', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Ranking de medicamentos más dispensados
  res.json({ message: 'TODO: Consumo por medicamento', data: [] });
});

// GET /api/reportes/inventario-actual
router.get('/inventario-actual', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Stock completo con códigos de barras
  res.json({ message: 'TODO: Inventario actual', data: [] });
});

// GET /api/reportes/por-vencer
router.get('/por-vencer', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Medicamentos por vencer en los próximos N días
  res.json({ message: 'TODO: Medicamentos por vencer', data: [] });
});

// GET /api/reportes/entradas-proveedor
router.get('/entradas-proveedor', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Entradas agrupadas por proveedor
  res.json({ message: 'TODO: Entradas por proveedor', data: [] });
});

// GET /api/reportes/exportar/:tipo/:formato
router.get('/exportar/:tipo/:formato', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Exportar reporte a PDF o Excel
  // :tipo = dispensaciones | inventario | por-vencer | consumo | entradas
  // :formato = pdf | xlsx
  res.json({ message: 'TODO: Exportar reporte' });
});

export default router;
