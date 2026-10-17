import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { authMiddleware } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';
import {
  msBloqueoRestante,
  registrarFallo,
  limpiarIntentos,
  msAMinutos,
} from '../middleware/loginRateLimit';
import { registrarIntentoIp, msASegundos } from '../middleware/ipRateLimit';

const router = Router();

/**
 * Responde al intento fallido: cuenta el fallo para el bloqueo y, si el usuario
 * existe, lo registra en la auditoría (H-09). Los usuarios inexistentes no se
 * auditan porque usuarioId es una FK obligatoria.
 */
async function responderFallo(res: Response, username: string, usuarioId?: string, ip?: string): Promise<void> {
  const resultado = registrarFallo(username, ip ?? 'desconocida');

  if (usuarioId) {
    await registrarAuditoria({
      usuarioId,
      accion: 'LOGIN',
      entidad: 'usuario',
      entidadId: usuarioId,
      datosNuevos: {
        exito: false,
        motivo: 'credenciales inválidas',
        bloqueado: resultado.bloqueado,
        intentosRestantes: resultado.intentosRestantes,
      },
      ipAddress: ip,
    });
  }

  if (resultado.bloqueado) {
    res.set('Retry-After', String(msASegundos(resultado.restanteMs)));
    res.status(429).json({
      error: `Demasiados intentos fallidos. Intente de nuevo en ${msAMinutos(resultado.restanteMs)} minuto(s).`,
    });
    return;
  }
  res.status(401).json({
    error: 'Credenciales inválidas',
    intentosRestantes: resultado.intentosRestantes,
  });
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // CAPA 1 — Rate limit por IP (antes de todo lo demás, incluso de validar el
    // cuerpo): frena fuerza bruta / credential stuffing / barrido de muchos
    // usernames desde una misma red. Cuenta toda solicitud de login de la IP.
    const ip = req.ip || 'desconocida';
    const limiteIp = registrarIntentoIp(ip);
    if (limiteIp.limitado) {
      res.set('Retry-After', String(msASegundos(limiteIp.restanteMs)));
      res.status(429).json({
        error: 'Demasiadas solicitudes de inicio de sesión desde esta red. Intente de nuevo más tarde.',
      });
      return;
    }

    const { username, password } = req.body;

    // El tipo debe ser string: un objeto/arreglo (p. ej. {"gt":""}) no debe llegar
    // a Prisma/bcrypt y provocar un 500. Se rechaza en el borde con 400. Esto
    // también neutraliza sondas de inyección por tipo en un endpoint sin auth.
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      return;
    }

    // CAPA 2 — Lockout por usuario: si la cuenta está bloqueada por intentos
    // fallidos, no se verifican credenciales (H-09). Independiente del límite por IP.
    const restante = msBloqueoRestante(username, ip);
    if (restante > 0) {
      res.set('Retry-After', String(msASegundos(restante)));
      res.status(429).json({
        error: `Demasiados intentos fallidos. Intente de nuevo en ${msAMinutos(restante)} minuto(s).`,
      });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!usuario || !usuario.activo) {
      await responderFallo(res, username, usuario?.id, req.ip);
      return;
    }

    const passwordValid = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValid) {
      await responderFallo(res, username, usuario.id, req.ip);
      return;
    }

    // Login correcto: se reinicia el contador de intentos del usuario.
    limpiarIntentos(username, ip);

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
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
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
