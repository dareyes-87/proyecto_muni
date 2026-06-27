import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/auditoria
router.get('/', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      usuario,
      accion,
      entidad,
      desde,
      hasta,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (usuario) where.usuarioId = usuario;
    if (accion) where.accion = accion;
    if (entidad) where.entidad = entidad;
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt.gte = new Date(desde as string);
      if (hasta) where.createdAt.lte = new Date(hasta as string);
    }

    const [logs, total] = await Promise.all([
      prisma.logAuditoria.findMany({
        where,
        include: {
          usuario: {
            select: { username: true, nombreCompleto: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.logAuditoria.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error consultando auditoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
