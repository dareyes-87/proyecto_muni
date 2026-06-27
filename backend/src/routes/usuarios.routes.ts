import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';

const router = Router();
const prisma = new PrismaClient();

// GET /api/usuarios
router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        username: true,
        nombreCompleto: true,
        email: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(usuarios);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/usuarios
router.post('/', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { username, password, nombreCompleto, email, rol } = req.body;

    if (!username || !password || !nombreCompleto || !rol) {
      res.status(400).json({ error: 'Campos requeridos: username, password, nombreCompleto, rol' });
      return;
    }

    const exists = await prisma.usuario.findUnique({ where: { username } });
    if (exists) {
      res.status(409).json({ error: 'El nombre de usuario ya existe' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const usuario = await prisma.usuario.create({
      data: { username, passwordHash, nombreCompleto, email, rol },
      select: {
        id: true,
        username: true,
        nombreCompleto: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'usuario',
      entidadId: usuario.id,
      datosNuevos: { username, nombreCompleto, email, rol },
      ipAddress: req.ip,
    });

    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/usuarios/:id/toggle
router.put('/:id/toggle', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (usuario.id === req.user!.userId) {
      res.status(400).json({ error: 'No puede desactivar su propia cuenta' });
      return;
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: { activo: !usuario.activo },
      select: { id: true, username: true, activo: true },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: updated.activo ? 'ACTIVAR' : 'DESACTIVAR',
      entidad: 'usuario',
      entidadId: id,
      datosAnteriores: { activo: usuario.activo },
      datosNuevos: { activo: updated.activo },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
