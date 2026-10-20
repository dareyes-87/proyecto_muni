import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { config } from '../config/env';
import { prisma } from '../config/prisma';

export interface AuthPayload {
  userId: string;
  username: string;
  rol: Rol;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  try {
    // No basta con que el JWT sea válido: se verifica contra la BD que el usuario
    // siga existiendo y activo, y se toma su ROL ACTUAL (no el del token). Así,
    // desactivar un usuario o cambiarle el rol surte efecto de inmediato, sin
    // esperar a que expire el token (H-10).
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, rol: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      res.status(401).json({ error: 'La cuenta ya no está activa. Inicie sesión nuevamente.' });
      return;
    }

    req.user = { userId: usuario.id, username: usuario.username, rol: usuario.rol };
    next();
  } catch (error) {
    console.error('Error verificando usuario en authMiddleware:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

export function requireRole(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'No tiene permisos para esta acción' });
      return;
    }

    next();
  };
}
