import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// ============================================
// MEDICAMENTOS
// ============================================

// GET /api/catalogos/medicamentos
router.get('/medicamentos', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Listar medicamentos con paginación y búsqueda
  res.json({ message: 'TODO: Listar medicamentos', data: [] });
});

// GET /api/catalogos/medicamentos/buscar?q=aceta
router.get('/medicamentos/buscar', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Búsqueda por nombre parcial (autocompletado)
  res.json({ message: 'TODO: Buscar medicamentos', data: [] });
});

// GET /api/catalogos/medicamentos/barcode/:codigo
router.get('/medicamentos/barcode/:codigo', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Buscar medicamento por código de barras
  res.json({ message: 'TODO: Buscar por código de barras', data: null });
});

// POST /api/catalogos/medicamentos
router.post('/medicamentos', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Crear medicamento con detección de duplicados
  res.json({ message: 'TODO: Crear medicamento' });
});

// PUT /api/catalogos/medicamentos/:id
router.put('/medicamentos/:id', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Editar medicamento + registrar auditoría
  res.json({ message: 'TODO: Editar medicamento' });
});

// ============================================
// CÓDIGOS DE BARRAS
// ============================================

// POST /api/catalogos/medicamentos/:id/codigos
router.post('/medicamentos/:id/codigos', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Agregar código de barras a medicamento
  res.json({ message: 'TODO: Agregar código de barras' });
});

// DELETE /api/catalogos/codigos/:id
router.delete('/codigos/:id', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Eliminar código de barras
  res.json({ message: 'TODO: Eliminar código de barras' });
});

// ============================================
// CATEGORÍAS
// ============================================

// GET /api/catalogos/categorias
router.get('/categorias', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Listar categorías
  res.json({ message: 'TODO: Listar categorías', data: [] });
});

// POST /api/catalogos/categorias
router.post('/categorias', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Crear categoría
  res.json({ message: 'TODO: Crear categoría' });
});

// PUT /api/catalogos/categorias/:id
router.put('/categorias/:id', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Editar categoría
  res.json({ message: 'TODO: Editar categoría' });
});

// ============================================
// PROVEEDORES
// ============================================

// GET /api/catalogos/proveedores
router.get('/proveedores', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Listar proveedores
  res.json({ message: 'TODO: Listar proveedores', data: [] });
});

// POST /api/catalogos/proveedores
router.post('/proveedores', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Crear proveedor
  res.json({ message: 'TODO: Crear proveedor' });
});

// PUT /api/catalogos/proveedores/:id
router.put('/proveedores/:id', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Editar proveedor
  res.json({ message: 'TODO: Editar proveedor' });
});

// ============================================
// UBICACIONES
// ============================================

// GET /api/catalogos/ubicaciones
router.get('/ubicaciones', authMiddleware, async (_req: Request, res: Response) => {
  // TODO: Listar ubicaciones
  res.json({ message: 'TODO: Listar ubicaciones', data: [] });
});

// POST /api/catalogos/ubicaciones
router.post('/ubicaciones', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Crear ubicación
  res.json({ message: 'TODO: Crear ubicación' });
});

export default router;
