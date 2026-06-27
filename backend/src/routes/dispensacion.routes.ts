import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';
import {
  buscarBeneficiarios,
  crearBeneficiario,
  obtenerBeneficiario,
  editarBeneficiario,
  despachar,
  obtenerHistorial,
  obtenerDispensacion,
  obtenerStockMedicamento,
} from '../services/dispensacion.service';

const router = Router();

// ============================================
// BENEFICIARIOS
// ============================================

// GET /api/dispensacion/beneficiarios/buscar?q=...
router.get('/beneficiarios/buscar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const data = await buscarBeneficiarios(q);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al buscar beneficiarios' });
  }
});

// POST /api/dispensacion/beneficiarios
router.post('/beneficiarios', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { nombreCompleto, dpi, telefono, direccion, observaciones } = req.body;

    if (!nombreCompleto || nombreCompleto.trim().length < 3) {
      res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
      return;
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
  } catch (error: any) {
    const status = error.message?.includes('Ya existe') ? 409 : 500;
    res.status(status).json({ error: error.message || 'Error al crear beneficiario' });
  }
});

// GET /api/dispensacion/beneficiarios/:id
router.get('/beneficiarios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const beneficiario = await obtenerBeneficiario(req.params.id);
    res.json(beneficiario);
  } catch (error: any) {
    const status = error.message?.includes('no encontrado') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Error al obtener beneficiario' });
  }
});

// PUT /api/dispensacion/beneficiarios/:id
router.put('/beneficiarios/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { nombreCompleto, dpi, telefono, direccion, observaciones } = req.body;

    if (nombreCompleto !== undefined && nombreCompleto.trim().length < 3) {
      res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
      return;
    }

    if (dpi && !/^\d{13}$/.test(dpi)) {
      res.status(400).json({ error: 'El DPI debe tener exactamente 13 dígitos' });
      return;
    }

    const anterior = await obtenerBeneficiario(req.params.id);
    const actualizado = await editarBeneficiario(req.params.id, {
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
      entidadId: actualizado.id,
      datosAnteriores: anterior,
      datosNuevos: actualizado,
      ipAddress: req.ip,
    });

    res.json(actualizado);
  } catch (error: any) {
    const status = error.message?.includes('no encontrado') ? 404
      : error.message?.includes('Ya existe') ? 409 : 500;
    res.status(status).json({ error: error.message || 'Error al editar beneficiario' });
  }
});

// ============================================
// DISPENSACIONES
// ============================================

// POST /api/dispensacion/despachar
router.post('/despachar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { beneficiarioId, items, observaciones } = req.body;

    if (!beneficiarioId) {
      res.status(400).json({ error: 'beneficiarioId es requerido' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Debe incluir al menos un medicamento en items' });
      return;
    }

    for (const item of items) {
      if (!item.medicamentoId || !item.cantidad || item.cantidad <= 0) {
        res.status(400).json({ error: 'Cada ítem debe tener medicamentoId y cantidad mayor a 0' });
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
  } catch (error: any) {
    const status = error.message?.includes('Stock insuficiente') ? 409
      : error.message?.includes('no encontrado') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Error al registrar dispensación' });
  }
});

// GET /api/dispensacion/historial
router.get('/historial', authMiddleware, async (req: Request, res: Response) => {
  try {
    const resultado = await obtenerHistorial({
      fechaDesde: req.query.fechaDesde as string,
      fechaHasta: req.query.fechaHasta as string,
      beneficiarioId: req.query.beneficiarioId as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener historial' });
  }
});

// GET /api/dispensacion/stock/:medicamentoId
router.get('/stock/:medicamentoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stock = await obtenerStockMedicamento(req.params.medicamentoId);
    res.json(stock);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener stock' });
  }
});

// GET /api/dispensacion/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dispensacion = await obtenerDispensacion(req.params.id);
    res.json(dispensacion);
  } catch (error: any) {
    const status = error.message?.includes('no encontrada') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Error al obtener dispensación' });
  }
});

export default router;
