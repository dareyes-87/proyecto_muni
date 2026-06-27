import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ============================================
// BENEFICIARIOS
// ============================================

// GET /api/dispensacion/beneficiarios/buscar?q=...
router.get('/beneficiarios/buscar', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Buscar beneficiario por DPI o nombre parcial
  res.json({ message: 'TODO: Buscar beneficiario', data: [] });
});

// POST /api/dispensacion/beneficiarios
router.post('/beneficiarios', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Registrar nuevo beneficiario
  res.json({ message: 'TODO: Crear beneficiario' });
});

// GET /api/dispensacion/beneficiarios/:id
router.get('/beneficiarios/:id', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Detalle de beneficiario con historial de dispensaciones
  res.json({ message: 'TODO: Detalle beneficiario', data: null });
});

// PUT /api/dispensacion/beneficiarios/:id
router.put('/beneficiarios/:id', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Editar datos de beneficiario
  res.json({ message: 'TODO: Editar beneficiario' });
});

// ============================================
// DISPENSACIONES
// ============================================

// POST /api/dispensacion/despachar
router.post('/despachar', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Registrar dispensación completa
  // - Recibe: beneficiarioId, array de { medicamentoId, cantidad }
  // - Lógica FIFO: SELECT ... FOR UPDATE, ordenar por fecha_vencimiento ASC
  // - Verificación de concurrencia (stock real al momento del commit)
  // - Snapshot de datos del medicamento en detalle_dispensaciones
  // - Descuento atómico de cantidad_actual en lotes
  // - Si lote llega a 0, cambiar estado a AGOTADO
  // - Registrar en auditoría
  // - Devolver stock actualizado en la respuesta
  res.json({ message: 'TODO: Registrar dispensación' });
});

// GET /api/dispensacion/historial
router.get('/historial', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Historial de dispensaciones con filtros (fecha, beneficiario, medicamento)
  res.json({ message: 'TODO: Historial dispensaciones', data: [] });
});

// GET /api/dispensacion/:id
router.get('/:id', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Detalle de una dispensación específica
  res.json({ message: 'TODO: Detalle dispensación', data: null });
});

export default router;
