import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/inventario
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Listar inventario con stock actual, semáforo de vencimiento
  res.json({ message: 'TODO: Listar inventario', data: [] });
});

// GET /api/inventario/alertas
router.get('/alertas', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Alertas de stock bajo + lotes por vencer + lotes vencidos sin baja
  res.json({ message: 'TODO: Alertas', data: { stockBajo: [], porVencer: [], vencidos: [] } });
});

// GET /api/inventario/medicamento/:id
router.get('/medicamento/:id', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Detalle de stock por medicamento (todos sus lotes con semáforo)
  res.json({ message: 'TODO: Stock por medicamento', data: null });
});

// POST /api/inventario/entradas
router.post('/entradas', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Registrar entrada de medicamentos (con lotes)
  // Accesible por ADMIN y ENCARGADO_BENEFICENCIA
  res.json({ message: 'TODO: Registrar entrada' });
});

// GET /api/inventario/entradas
router.get('/entradas', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Listar historial de entradas
  res.json({ message: 'TODO: Historial de entradas', data: [] });
});

// PUT /api/inventario/lotes/:id/baja
router.put('/lotes/:id/baja', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Dar de baja un lote vencido (cambiar estado a DADO_DE_BAJA)
  res.json({ message: 'TODO: Dar de baja lote' });
});

export default router;
