import { Router, Request, Response } from 'express';
import multer from 'multer';
import { TipoFoto } from '@prisma/client';
import {
  obtenerCapturaPorToken,
  registrarFotoCaptura,
  extensionDeMime,
} from '../services/dispensacion.service';

// ============================================
// CAPTURA DE EVIDENCIA DESDE EL CELULAR — RUTAS PÚBLICAS
// ============================================
// Estas rutas NO llevan authMiddleware a propósito: la encargada escanea el QR
// desde su celular, que no tiene sesión iniciada. La credencial es el token que
// viaja en la URL, y por eso está acotado por todos lados: es aleatorio
// (nanoid, 10 chars), vive 30 minutos, sirve para una sola dispensación, solo
// admite 2 tipos de foto (subir el mismo tipo reemplaza, no acumula) y se marca
// como usado en cuanto se completan las dos.
// ============================================

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!extensionDeMime(file.mimetype)) {
      cb(new Error('Formato de imagen no permitido. Use JPG, PNG o WEBP'));
      return;
    }
    cb(null, true);
  },
});

const TIPOS_VALIDOS: TipoFoto[] = ['RECETA', 'EVIDENCIA_ENTREGA'];

// GET /api/captura/:token/info
router.get('/:token/info', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const info = await obtenerCapturaPorToken(token);
    res.json(info);
  } catch {
    // Token inexistente, usado o vencido: siempre el mismo 404, sin distinguir cuál.
    res.status(404).json({ error: 'Enlace inválido o expirado' });
  }
});

// POST /api/captura/:token/foto
router.post(
  '/:token/foto',
  upload.single('foto'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params as { token: string };

      if (!req.file) {
        res.status(400).json({ error: 'Debe adjuntar una imagen en el campo "foto"' });
        return;
      }

      const tipo = req.body?.tipo as TipoFoto;
      if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
        res.status(400).json({ error: 'Tipo inválido. Use RECETA o EVIDENCIA_ENTREGA' });
        return;
      }

      const resultado = await registrarFotoCaptura(token, tipo, {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      });

      res.json({ success: true, ...resultado });
    } catch (error: any) {
      if (error?.message?.includes('inválido o expirado')) {
        res.status(404).json({ error: 'Enlace inválido o expirado' });
        return;
      }
      if (error?.message?.includes('Formato de imagen')) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Error subiendo foto de captura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

export default router;
