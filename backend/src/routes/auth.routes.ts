import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { authMiddleware } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // Actualizar último acceso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    const token = jwt.sign(
      {
        userId: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    await registrarAuditoria({
      usuarioId: usuario.id,
      accion: 'LOGIN',
      entidad: 'usuario',
      entidadId: usuario.id,
      ipAddress: req.ip,
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.rol,
        email: usuario.email,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/perfil
router.get('/perfil', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        nombreCompleto: true,
        email: true,
        rol: true,
        ultimoAcceso: true,
        createdAt: true,
      },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
