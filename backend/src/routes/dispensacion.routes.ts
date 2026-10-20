import { Router, Request, Response } from 'express';
import { TipoFoto } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';
import { responderError } from '../utils/httpError';
import { textoQuery } from '../utils/validacion';
import {
  buscarBeneficiarios,
  crearBeneficiario,
  obtenerBeneficiario,
  editarBeneficiario,
  despachar,
  obtenerHistorial,
  obtenerDispensacion,
  obtenerStockMedicamento,
  generarTokenCaptura,
  obtenerFotos,
  obtenerArchivoFoto,
} from '../services/dispensacion.service';

const TIPOS_FOTO_VALIDOS: TipoFoto[] = ['RECETA', 'EVIDENCIA_ENTREGA'];

const router = Router();

// ============================================
// BENEFICIARIOS
// ============================================

// GET /api/dispensacion/beneficiarios/buscar?q=...
router.get('/beneficiarios/buscar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const q = textoQuery(req.query.q) || '';
    const data = await buscarBeneficiarios(q);
    res.json({ data });
  } catch (error) {
    responderError(res, error);
  }
});

// POST /api/dispensacion/beneficiarios
router.post('/beneficiarios', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { nombreCompleto, dpi, telefono, direccion, observaciones } = req.body;

    // nombreCompleto debe ser texto: un objeto/arreglo rompía `.trim()` → 500.
    if (typeof nombreCompleto !== 'string' || nombreCompleto.trim().length < 3) {
      res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
      return;
    }

    // Los campos opcionales, si vienen, deben ser texto (evita 500 de Prisma).
    for (const [campo, val] of Object.entries({ dpi, telefono, direccion, observaciones })) {
      if (val !== undefined && val !== null && typeof val !== 'string') {
        res.status(400).json({ error: `El campo ${campo} debe ser texto` });
        return;
      }
    }

    if (dpi && !/^\d{13}$/.test(dpi)) {
      res.status(400).json({ error: 'El DPI debe tener exactamente 13 dígitos' });
      return;
    }

    const beneficiario = await crearBeneficiario({
      nombreCompleto: nombreCompleto.trim(),
      dpi: dpi || null,
      telefono: telefono || null,
      direccion: direccion || null,
      observaciones: observaciones || null,
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'Beneficiario',
      entidadId: beneficiario.id,
      datosNuevos: beneficiario,
      ipAddress: req.ip,
    });

    res.status(201).json(beneficiario);
  } catch (error) {
    responderError(res, error, [{ match: 'Ya existe', status: 409 }]);
  }
});

// GET /api/dispensacion/beneficiarios/:id
router.get('/beneficiarios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const beneficiario = await obtenerBeneficiario(id);
    res.json(beneficiario);
  } catch (error) {
    responderError(res, error, [{ match: 'no encontrado', status: 404 }]);
  }
});

// PUT /api/dispensacion/beneficiarios/:id
router.put('/beneficiarios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { nombreCompleto, dpi, telefono, direccion, observaciones } = req.body;

    if (nombreCompleto !== undefined && (typeof nombreCompleto !== 'string' || nombreCompleto.trim().length < 3)) {
      res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
      return;
    }

    for (const [campo, val] of Object.entries({ dpi, telefono, direccion, observaciones })) {
      if (val !== undefined && val !== null && typeof val !== 'string') {
        res.status(400).json({ error: `El campo ${campo} debe ser texto` });
        return;
      }
    }

    if (dpi && !/^\d{13}$/.test(dpi)) {
      res.status(400).json({ error: 'El DPI debe tener exactamente 13 dígitos' });
      return;
    }

    const anterior = await obtenerBeneficiario(id);
    const actualizado = await editarBeneficiario(id, {
      nombreCompleto: nombreCompleto?.trim(),
      dpi,
      telefono,
      direccion,
      observaciones,
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'EDITAR',
      entidad: 'Beneficiario',
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: actualizado,
      ipAddress: req.ip,
    });

    res.json(actualizado);
  } catch (error) {
    responderError(res, error, [
      { match: 'no encontrado', status: 404 },
      { match: 'Ya existe', status: 409 },
    ]);
  }
});

// ============================================
// DISPENSACIONES
// ============================================

// POST /api/dispensacion/despachar
router.post('/despachar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { beneficiarioId, items, observaciones } = req.body;

    // beneficiarioId debe ser una cadena: un objeto/arreglo no debe llegar a Prisma
    // (provocaría un 500).
    if (typeof beneficiarioId !== 'string' || !beneficiarioId) {
      res.status(400).json({ error: 'beneficiarioId es requerido' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Debe incluir al menos un medicamento en items' });
      return;
    }

    for (const item of items) {
      // cantidad debe ser un ENTERO POSITIVO real. Antes una cantidad no numérica
      // ("abc" o {"gt":0}) burlaba la comparación `stockTotal < cantidad` (NaN) y
      // creaba una dispensación sin renglones (201) o escribía NaN en el stock (500).
      if (
        !item ||
        typeof item.medicamentoId !== 'string' ||
        !item.medicamentoId ||
        typeof item.cantidad !== 'number' ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad <= 0
      ) {
        res.status(400).json({ error: 'Cada ítem debe tener medicamentoId (texto) y cantidad entera mayor a 0' });
        return;
      }
    }

    const resultado = await despachar(
      beneficiarioId,
      req.user!.userId,
      items,
      observaciones
    );

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'DISPENSAR',
      entidad: 'Dispensacion',
      entidadId: resultado.dispensacion.id,
      datosNuevos: {
        beneficiario: resultado.dispensacion.beneficiario,
        items: resultado.dispensacion.detalles,
        observaciones: resultado.dispensacion.observaciones,
      },
      ipAddress: req.ip,
    });

    res.status(201).json(resultado);
  } catch (error) {
    responderError(res, error, [
      { match: 'Stock insuficiente', status: 409 },
      { match: 'no encontrado', status: 404 },
      { match: 'inactivo', status: 400 },
    ]);
  }
});

// GET /api/dispensacion/historial
router.get('/historial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const resultado = await obtenerHistorial({
      fechaDesde: textoQuery(req.query.fechaDesde),
      fechaHasta: textoQuery(req.query.fechaHasta),
      beneficiarioId: textoQuery(req.query.beneficiarioId),
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json(resultado);
  } catch (error) {
    responderError(res, error);
  }
});

// GET /api/dispensacion/stock/:medicamentoId
router.get('/stock/:medicamentoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { medicamentoId } = req.params as { medicamentoId: string };
    const stock = await obtenerStockMedicamento(medicamentoId);
    res.json(stock);
  } catch (error) {
    responderError(res, error);
  }
});

// ============================================
// EVIDENCIA FOTOGRÁFICA (lado escritorio)
// ============================================

// POST /api/dispensacion/:id/generar-token
// Genera (o reutiliza) el token que va dentro del QR para capturar desde el celular.
router.post('/:id/generar-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resultado = await generarTokenCaptura(id);

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'TokenCaptura',
      entidadId: id,
      datosNuevos: { dispensacionId: id, expiraEn: resultado.expiraEn },
      ipAddress: req.ip,
    });

    res.json(resultado);
  } catch (error) {
    responderError(res, error, [
      { match: 'no encontrada', status: 404 },
      { match: 'ya está completa', status: 409 },
    ]);
  }
});

// GET /api/dispensacion/:id/fotos
router.get('/:id/fotos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const fotos = await obtenerFotos(id);
    res.json({ data: fotos });
  } catch (error) {
    responderError(res, error);
  }
});

// GET /api/dispensacion/:id/foto/:tipo
// Sirve una foto de receta/evidencia SOLO a usuarios autenticados (H-11). Las
// fotos ya no se exponen estáticamente en /uploads. El tipo se valida contra el
// enum y la ruta física se deriva del registro en BD (sin path traversal).
router.get('/:id/foto/:tipo', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, tipo } = req.params as { id: string; tipo: string };
    if (!TIPOS_FOTO_VALIDOS.includes(tipo as TipoFoto)) {
      res.status(400).json({ error: 'Tipo de foto inválido' });
      return;
    }

    const archivo = await obtenerArchivoFoto(id, tipo as TipoFoto);
    if (!archivo) {
      res.status(404).json({ error: 'Foto no encontrada' });
      return;
    }

    res.setHeader('Content-Type', archivo.mimetype);
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(archivo.filePath);
  } catch (error) {
    responderError(res, error);
  }
});

// GET /api/dispensacion/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const dispensacion = await obtenerDispensacion(id);
    res.json(dispensacion);
  } catch (error) {
    responderError(res, error, [{ match: 'no encontrada', status: 404 }]);
  }
});

export default router;
