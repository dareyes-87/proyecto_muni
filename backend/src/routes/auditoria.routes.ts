import { Router, Request, Response } from 'express';
import { AccionAuditoria } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { parseRangoFechas } from '../utils/fecha';
import { clampPaginacion, textoQuery } from '../utils/validacion';
import { responderError } from '../utils/httpError';

const router = Router();

const ACCIONES_VALIDAS = Object.values(AccionAuditoria);

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

    // Clamp seguro: page>=1, limit en [1,100]. Antes page negativa producía un
    // skip negativo que Prisma rechazaba con un 500, y no había tope de limit.
    const { page: pageNum, limit: limitNum, skip } = clampPaginacion(page, limit, { defLimit: 50, maxLimit: 100 });

    // Coerción segura de filtros (evita 500 por HPP `?x=a&x=b` o tipos inesperados
    // que llegarían a Prisma como arreglo/objeto).
    const usuarioF = textoQuery(usuario);
    const accionF = textoQuery(accion);
    const entidadF = textoQuery(entidad);

    const where: any = {};
    if (usuarioF) where.usuarioId = usuarioF;
    if (accionF) {
      // accion es un enum: un valor inválido daba 500 en Prisma. Ahora 400.
      if (!ACCIONES_VALIDAS.includes(accionF as AccionAuditoria)) {
        res.status(400).json({ error: `accion inválida. Use: ${ACCIONES_VALIDAS.join(', ')}` });
        return;
      }
      where.accion = accionF;
    }
    // Insensible a mayúsculas: los nombres de entidad se guardaron con distinto
    // casing a lo largo del tiempo (p. ej. "Dispensacion" vs "medicamento") (H-30).
    if (entidadF) where.entidad = { equals: entidadF, mode: 'insensitive' };
    const { desde: desdeFecha, hasta: hastaFecha } = parseRangoFechas(desde, hasta);
    if (desdeFecha || hastaFecha) {
      where.createdAt = {};
      if (desdeFecha) where.createdAt.gte = desdeFecha;
      if (hastaFecha) where.createdAt.lte = hastaFecha;
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
    responderError(res, error);
  }
});

export default router;
