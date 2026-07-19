import { Router, Request, Response } from 'express';
import { EstadoLote, OrigenEntrada } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';
import {
  reporteDispensaciones,
  reporteConsumoMedicamentos,
  reporteInventarioActual,
  reportePorVencer,
  reporteEntradasProveedor,
  reporteMedicamentosBaja,
  obtenerNombreFarmacia,
} from '../services/reportes.service';
import { generarPdfTabla, type Alineacion } from '../utils/pdf';
import { generarExcel } from '../utils/excel';

const router = Router();

const ORIGENES_VALIDOS = Object.values(OrigenEntrada);
const ESTADOS_VALIDOS = Object.values(EstadoLote);

function parsePage(v: unknown): number | undefined {
  const n = parseInt(v as string, 10);
  return Number.isFinite(n) ? n : undefined;
}

// GET /api/reportes/dispensaciones
router.get('/dispensaciones', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta, beneficiarioId, medicamentoId, page, limit } = req.query;
    const resultado = await reporteDispensaciones({
      desde: desde as string | undefined,
      hasta: hasta as string | undefined,
      beneficiarioId: beneficiarioId as string | undefined,
      medicamentoId: medicamentoId as string | undefined,
      page: parsePage(page),
      limit: parsePage(limit),
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte de dispensaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/consumo-medicamentos
router.get('/consumo-medicamentos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta, categoriaId, page, limit } = req.query;
    const resultado = await reporteConsumoMedicamentos({
      desde: desde as string | undefined,
      hasta: hasta as string | undefined,
      categoriaId: categoriaId as string | undefined,
      page: parsePage(page),
      limit: parsePage(limit),
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte de consumo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/inventario-actual
router.get('/inventario-actual', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoriaId, origen, estado, page, limit } = req.query;

    if (origen && !ORIGENES_VALIDOS.includes(origen as OrigenEntrada)) {
      res.status(400).json({ error: `Origen inválido. Use: ${ORIGENES_VALIDOS.join(', ')}` });
      return;
    }
    if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoLote)) {
      res.status(400).json({ error: `Estado inválido. Use: ${ESTADOS_VALIDOS.join(', ')}` });
      return;
    }

    const resultado = await reporteInventarioActual({
      categoriaId: categoriaId as string | undefined,
      origen: origen as OrigenEntrada | undefined,
      estado: estado as EstadoLote | undefined,
      page: parsePage(page),
      limit: parsePage(limit),
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte de inventario actual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/por-vencer
router.get('/por-vencer', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { dias, page, limit } = req.query;
    const resultado = await reportePorVencer({
      dias: dias ? parseInt(dias as string, 10) : undefined,
      page: parsePage(page),
      limit: parsePage(limit),
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte de por vencer:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/entradas-proveedor
router.get('/entradas-proveedor', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { desde, hasta, proveedorId, origen, page, limit } = req.query;

    if (origen && !ORIGENES_VALIDOS.includes(origen as OrigenEntrada)) {
      res.status(400).json({ error: `Origen inválido. Use: ${ORIGENES_VALIDOS.join(', ')}` });
      return;
    }

    const resultado = await reporteEntradasProveedor({
      desde: desde as string | undefined,
      hasta: hasta as string | undefined,
      proveedorId: proveedorId as string | undefined,
      origen: origen as OrigenEntrada | undefined,
      page: parsePage(page),
      limit: parsePage(limit),
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte de entradas por proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/medicamentos-baja
router.get('/medicamentos-baja', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { desde, hasta, page, limit } = req.query;
    const resultado = await reporteMedicamentosBaja({
      desde: desde as string | undefined,
      hasta: hasta as string | undefined,
      page: parsePage(page),
      limit: parsePage(limit),
    });
    res.json(resultado);
  } catch (error) {
    console.error('Error en reporte de medicamentos dados de baja:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// EXPORTACIÓN PDF / EXCEL
// ============================================

const TIPOS_VALIDOS = ['dispensaciones', 'consumo', 'inventario', 'por-vencer', 'entradas', 'baja'] as const;
type TipoReporte = (typeof TIPOS_VALIDOS)[number];
const FORMATOS_VALIDOS = ['pdf', 'xlsx'] as const;

interface TablaExport {
  titulo: string;
  columnasPdf: string[];
  alineacionesPdf: Alineacion[];
  filasPdf: (string | number)[][];
  columnasExcel: { header: string; key: string; width?: number }[];
  filasExcel: Record<string, unknown>[];
}

async function construirTabla(tipo: TipoReporte, query: Request['query']): Promise<TablaExport> {
  const LIMITE_EXPORT = 5000;

  switch (tipo) {
    case 'dispensaciones': {
      const { data } = await reporteDispensaciones({
        desde: query.desde as string | undefined,
        hasta: query.hasta as string | undefined,
        beneficiarioId: query.beneficiarioId as string | undefined,
        medicamentoId: query.medicamentoId as string | undefined,
        page: 1,
        limit: LIMITE_EXPORT,
      });
      const filas = data.flatMap((d) =>
        d.medicamentos.map((m) => ({
          fecha: new Date(d.createdAt).toLocaleString('es-GT'),
          beneficiario: d.beneficiario.nombreCompleto,
          dpi: d.beneficiario.dpi ?? '',
          medicamento: m.nombreGenerico,
          presentacion: m.presentacion,
          cantidad: m.cantidad,
          codigoBarras: m.codigoBarras ?? '',
          usuario: d.usuario.nombreCompleto,
        }))
      );
      return {
        titulo: 'Reporte de Dispensaciones',
        columnasPdf: ['Fecha', 'Beneficiario', 'DPI', 'Medicamento', 'Present.', 'Cant.', 'Cód. barras', 'Usuario'],
        alineacionesPdf: ['left', 'left', 'left', 'left', 'left', 'right', 'left', 'left'],
        filasPdf: filas.map((f) => [f.fecha, f.beneficiario, f.dpi, f.medicamento, f.presentacion, f.cantidad, f.codigoBarras, f.usuario]),
        columnasExcel: [
          { header: 'Fecha', key: 'fecha', width: 20 },
          { header: 'Beneficiario', key: 'beneficiario', width: 25 },
          { header: 'DPI', key: 'dpi', width: 16 },
          { header: 'Medicamento', key: 'medicamento', width: 25 },
          { header: 'Presentación', key: 'presentacion', width: 15 },
          { header: 'Cantidad', key: 'cantidad', width: 10 },
          { header: 'Código de barras', key: 'codigoBarras', width: 18 },
          { header: 'Usuario', key: 'usuario', width: 20 },
        ],
        filasExcel: filas,
      };
    }

    case 'consumo': {
      const { data } = await reporteConsumoMedicamentos({
        desde: query.desde as string | undefined,
        hasta: query.hasta as string | undefined,
        categoriaId: query.categoriaId as string | undefined,
        page: 1,
        limit: LIMITE_EXPORT,
      });
      return {
        titulo: 'Reporte de Consumo por Medicamento',
        columnasPdf: ['Medicamento', 'Presentación', 'Categoría', 'Cant. total dispensada', 'N.º dispensaciones'],
        alineacionesPdf: ['left', 'left', 'left', 'right', 'right'],
        filasPdf: data.map((d) => [d.nombreGenerico, d.presentacion, d.categoria, d.cantidadTotalDispensada, d.numeroDispensaciones]),
        columnasExcel: [
          { header: 'Medicamento', key: 'nombreGenerico', width: 25 },
          { header: 'Presentación', key: 'presentacion', width: 15 },
          { header: 'Categoría', key: 'categoria', width: 18 },
          { header: 'Cantidad total dispensada', key: 'cantidadTotalDispensada', width: 22 },
          { header: 'Número de dispensaciones', key: 'numeroDispensaciones', width: 22 },
        ],
        filasExcel: data,
      };
    }

    case 'inventario': {
      const { data } = await reporteInventarioActual({
        categoriaId: query.categoriaId as string | undefined,
        origen: query.origen as OrigenEntrada | undefined,
        estado: query.estado as EstadoLote | undefined,
        page: 1,
        limit: LIMITE_EXPORT,
      });
      const filas = data.map((l) => ({
        medicamento: l.medicamento.nombreGenerico,
        presentacion: l.medicamento.presentacion,
        categoria: l.medicamento.categoria ?? '',
        numeroLote: l.numeroLote,
        codigoBarras: l.codigoBarras ?? '',
        cantidadActual: l.cantidadActual,
        fechaVencimiento: new Date(l.fechaVencimiento).toLocaleDateString('es-GT'),
        semaforo: l.semaforo,
        ubicacion: l.ubicacion?.codigo ?? '',
        origen: l.origen,
        proveedor: l.proveedor,
      }));
      return {
        titulo: 'Reporte de Inventario Actual',
        columnasPdf: ['Medicamento', 'Lote', 'Cód. barras', 'Cant.', 'Vence', 'Semáforo', 'Ubicación', 'Proveedor'],
        alineacionesPdf: ['left', 'left', 'left', 'right', 'left', 'left', 'left', 'left'],
        filasPdf: filas.map((f) => [f.medicamento, f.numeroLote, f.codigoBarras, f.cantidadActual, f.fechaVencimiento, f.semaforo, f.ubicacion, f.proveedor]),
        columnasExcel: [
          { header: 'Medicamento', key: 'medicamento', width: 25 },
          { header: 'Presentación', key: 'presentacion', width: 15 },
          { header: 'Categoría', key: 'categoria', width: 18 },
          { header: 'N.º de lote', key: 'numeroLote', width: 15 },
          { header: 'Código de barras', key: 'codigoBarras', width: 18 },
          { header: 'Cantidad actual', key: 'cantidadActual', width: 15 },
          { header: 'Fecha de vencimiento', key: 'fechaVencimiento', width: 18 },
          { header: 'Semáforo', key: 'semaforo', width: 12 },
          { header: 'Ubicación', key: 'ubicacion', width: 12 },
          { header: 'Origen', key: 'origen', width: 20 },
          { header: 'Proveedor', key: 'proveedor', width: 25 },
        ],
        filasExcel: filas,
      };
    }

    case 'por-vencer': {
      const { data } = await reportePorVencer({
        dias: query.dias ? parseInt(query.dias as string, 10) : undefined,
        page: 1,
        limit: LIMITE_EXPORT,
      });
      const filas = data.map((l) => ({
        medicamento: l.medicamento.nombreGenerico,
        presentacion: l.medicamento.presentacion,
        categoria: l.medicamento.categoria ?? '',
        numeroLote: l.numeroLote,
        codigoBarras: l.codigoBarras ?? '',
        cantidadActual: l.cantidadActual,
        fechaVencimiento: new Date(l.fechaVencimiento).toLocaleDateString('es-GT'),
        diasParaVencer: l.diasParaVencer,
        semaforo: l.semaforo,
        ubicacion: l.ubicacion?.codigo ?? '',
      }));
      return {
        titulo: 'Reporte de Medicamentos por Vencer',
        columnasPdf: ['Medicamento', 'Lote', 'Cód. barras', 'Cant.', 'Vence', 'Días', 'Semáforo', 'Ubicación'],
        alineacionesPdf: ['left', 'left', 'left', 'right', 'left', 'right', 'left', 'left'],
        filasPdf: filas.map((f) => [f.medicamento, f.numeroLote, f.codigoBarras, f.cantidadActual, f.fechaVencimiento, f.diasParaVencer, f.semaforo, f.ubicacion]),
        columnasExcel: [
          { header: 'Medicamento', key: 'medicamento', width: 25 },
          { header: 'Presentación', key: 'presentacion', width: 15 },
          { header: 'Categoría', key: 'categoria', width: 18 },
          { header: 'N.º de lote', key: 'numeroLote', width: 15 },
          { header: 'Código de barras', key: 'codigoBarras', width: 18 },
          { header: 'Cantidad actual', key: 'cantidadActual', width: 15 },
          { header: 'Fecha de vencimiento', key: 'fechaVencimiento', width: 18 },
          { header: 'Días para vencer', key: 'diasParaVencer', width: 14 },
          { header: 'Semáforo', key: 'semaforo', width: 12 },
          { header: 'Ubicación', key: 'ubicacion', width: 12 },
        ],
        filasExcel: filas,
      };
    }

    case 'entradas': {
      const { data } = await reporteEntradasProveedor({
        desde: query.desde as string | undefined,
        hasta: query.hasta as string | undefined,
        proveedorId: query.proveedorId as string | undefined,
        origen: query.origen as OrigenEntrada | undefined,
        page: 1,
        limit: LIMITE_EXPORT,
      });
      const filas = data.map((e) => ({
        fecha: new Date(e.createdAt).toLocaleString('es-GT'),
        proveedor: e.proveedor,
        origen: e.origen,
        usuario: e.usuario,
        totalLotes: e.totalLotes,
        totalUnidades: e.totalUnidades,
        costoTotal: e.costoTotal,
      }));
      return {
        titulo: 'Reporte de Entradas por Proveedor',
        columnasPdf: ['Fecha', 'Proveedor', 'Origen', 'Usuario', 'N.º lotes', 'Unidades', 'Costo total'],
        alineacionesPdf: ['left', 'left', 'left', 'left', 'right', 'right', 'right'],
        filasPdf: filas.map((f) => [f.fecha, f.proveedor, f.origen, f.usuario, f.totalLotes, f.totalUnidades, f.costoTotal.toFixed(2)]),
        columnasExcel: [
          { header: 'Fecha', key: 'fecha', width: 20 },
          { header: 'Proveedor', key: 'proveedor', width: 25 },
          { header: 'Origen', key: 'origen', width: 20 },
          { header: 'Usuario', key: 'usuario', width: 20 },
          { header: 'N.º de lotes', key: 'totalLotes', width: 12 },
          { header: 'Unidades totales', key: 'totalUnidades', width: 15 },
          { header: 'Costo total', key: 'costoTotal', width: 15 },
        ],
        filasExcel: filas,
      };
    }

    case 'baja': {
      const { data } = await reporteMedicamentosBaja({
        desde: query.desde as string | undefined,
        hasta: query.hasta as string | undefined,
        page: 1,
        limit: LIMITE_EXPORT,
      });
      const filas = data.map((l) => ({
        medicamento: l.medicamento.nombreGenerico,
        presentacion: l.medicamento.presentacion,
        categoria: l.medicamento.categoria ?? '',
        numeroLote: l.numeroLote,
        estado: l.estado,
        fechaVencimiento: new Date(l.fechaVencimiento).toLocaleDateString('es-GT'),
        cantidadPerdida: l.cantidadPerdida,
        costoEstimado: l.costoEstimado !== null ? l.costoEstimado.toFixed(2) : '',
        proveedor: l.proveedor,
      }));
      return {
        titulo: 'Reporte de Medicamentos Dados de Baja',
        columnasPdf: ['Medicamento', 'Lote', 'Estado', 'Vencimiento', 'Cant. perdida', 'Costo est.', 'Proveedor'],
        alineacionesPdf: ['left', 'left', 'left', 'left', 'right', 'right', 'left'],
        filasPdf: filas.map((f) => [f.medicamento, f.numeroLote, f.estado, f.fechaVencimiento, f.cantidadPerdida, f.costoEstimado, f.proveedor]),
        columnasExcel: [
          { header: 'Medicamento', key: 'medicamento', width: 25 },
          { header: 'Presentación', key: 'presentacion', width: 15 },
          { header: 'Categoría', key: 'categoria', width: 18 },
          { header: 'N.º de lote', key: 'numeroLote', width: 15 },
          { header: 'Estado', key: 'estado', width: 15 },
          { header: 'Fecha de vencimiento', key: 'fechaVencimiento', width: 18 },
          { header: 'Cantidad perdida', key: 'cantidadPerdida', width: 15 },
          { header: 'Costo estimado', key: 'costoEstimado', width: 15 },
          { header: 'Proveedor', key: 'proveedor', width: 25 },
        ],
        filasExcel: filas,
      };
    }
  }
}

// GET /api/reportes/exportar/:tipo/:formato
router.get(
  '/exportar/:tipo/:formato',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tipo, formato } = req.params as { tipo: string; formato: string };

      if (!TIPOS_VALIDOS.includes(tipo as TipoReporte)) {
        res.status(400).json({ error: `Tipo de reporte inválido. Use: ${TIPOS_VALIDOS.join(', ')}` });
        return;
      }
      if (!FORMATOS_VALIDOS.includes(formato as (typeof FORMATOS_VALIDOS)[number])) {
        res.status(400).json({ error: `Formato inválido. Use: ${FORMATOS_VALIDOS.join(', ')}` });
        return;
      }

      const tabla = await construirTabla(tipo as TipoReporte, req.query);
      const filtrosTexto = Object.entries(req.query)
        .filter(([k]) => !['page', 'limit'].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

      let buffer: Buffer;
      let contentType: string;
      const extension = formato === 'pdf' ? 'pdf' : 'xlsx';

      if (formato === 'pdf') {
        const nombreFarmacia = await obtenerNombreFarmacia();
        buffer = await generarPdfTabla({
          nombreFarmacia,
          titulo: tabla.titulo,
          filtrosTexto,
          columnas: tabla.columnasPdf,
          alineaciones: tabla.alineacionesPdf,
          filas: tabla.filasPdf,
        });
        contentType = 'application/pdf';
      } else {
        buffer = await generarExcel({
          hoja: tabla.titulo,
          columnas: tabla.columnasExcel,
          filas: tabla.filasExcel,
        });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      await registrarAuditoria({
        usuarioId: req.user!.userId,
        accion: 'CREAR',
        entidad: 'reporte',
        datosNuevos: { tipo, formato, filtros: req.query },
        ipAddress: req.ip,
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${Date.now()}.${extension}"`);
      res.send(buffer);
    } catch (error) {
      console.error('Error exportando reporte:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

export default router;
