import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// MEDICAMENTOS
// ============================================

// GET /api/catalogos/medicamentos
// NOTA: lectura mínima implementada por el módulo de Inventario para poblar
// formularios (entradas). El CRUD completo con detección de duplicados es de Catálogos.
router.get('/medicamentos', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) || undefined;
    const where: any = { activo: true };
    if (q) {
      where.OR = [
        { nombreGenerico: { contains: q, mode: 'insensitive' } },
        { nombreComercial: { contains: q, mode: 'insensitive' } },
      ];
    }
    const medicamentos = await prisma.medicamento.findMany({
      where,
      orderBy: { nombreGenerico: 'asc' },
      include: {
        categoria: { select: { id: true, nombre: true } },
        codigosBarras: { select: { id: true, codigo: true } },
      },
    });
    res.json({ data: medicamentos });
  } catch (error) {
    console.error('Error listando medicamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/catalogos/medicamentos/buscar?q=aceta
router.get('/medicamentos/buscar', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (q.length < 2) {
      res.json({ data: [] });
      return;
    }
    const medicamentos = await prisma.medicamento.findMany({
      where: {
        activo: true,
        OR: [
          { nombreGenerico: { contains: q, mode: 'insensitive' } },
          { nombreComercial: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { nombreGenerico: 'asc' },
      take: 10,
      select: {
        id: true,
        nombreGenerico: true,
        nombreComercial: true,
        presentacion: true,
        concentracion: true,
        unidadMedida: true,
      },
    });
    res.json({ data: medicamentos });
  } catch (error) {
    console.error('Error buscando medicamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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
router.get('/categorias', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ data: categorias });
  } catch (error) {
    console.error('Error listando categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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
router.get('/proveedores', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ data: proveedores });
  } catch (error) {
    console.error('Error listando proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
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
router.get('/ubicaciones', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      orderBy: { codigo: 'asc' },
    });
    res.json({ data: ubicaciones });
  } catch (error) {
    console.error('Error listando ubicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/catalogos/ubicaciones
router.post('/ubicaciones', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  // TODO: Crear ubicación
  res.json({ message: 'TODO: Crear ubicación' });
});

export default router;
