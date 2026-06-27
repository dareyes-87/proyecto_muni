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
    const { id } = req.params as { id: string };

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

// PUT /api/usuarios/:id
// Editar datos del usuario (nombre, email, rol). No cambia la contraseña.
router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { nombreCompleto, email, rol } = req.body;

    if (rol && rol !== 'ADMIN' && rol !== 'ENCARGADO_BENEFICENCIA') {
      res.status(400).json({ error: 'Rol inválido' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Evitar que el admin se quite a sí mismo el rol ADMIN (quedarse sin acceso).
    if (usuario.id === req.user!.userId && rol && rol !== 'ADMIN') {
      res.status(400).json({ error: 'No puede cambiar su propio rol de administrador' });
      return;
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: {
        nombreCompleto: nombreCompleto ?? usuario.nombreCompleto,
        email: email !== undefined ? email : usuario.email,
        rol: rol ?? usuario.rol,
      },
      select: { id: true, username: true, nombreCompleto: true, email: true, rol: true, activo: true },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'EDITAR',
      entidad: 'usuario',
      entidadId: id,
      datosAnteriores: { nombreCompleto: usuario.nombreCompleto, email: usuario.email, rol: usuario.rol },
      datosNuevos: { nombreCompleto: updated.nombreCompleto, email: updated.email, rol: updated.rol },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error editando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/usuarios/:id/password
// Restablecer la contraseña de un usuario.
router.put('/:id/password', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.usuario.update({ where: { id }, data: { passwordHash } });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'EDITAR',
      entidad: 'usuario',
      entidadId: id,
      datosNuevos: { password: '***restablecida***' },
      ipAddress: req.ip,
    });

    res.json({ data: { id, message: 'Contraseña actualizada' } });
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
