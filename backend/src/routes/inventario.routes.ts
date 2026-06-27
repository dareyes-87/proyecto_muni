import { Router, Request, Response } from 'express';
import { PrismaClient, EstadoLote } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';
import {
  getUmbrales,
  calcularSemaforo,
  diasParaVencer,
  esDispensable,
  hoyMedianoche,
} from '../services/inventario.service';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// Validación
// ============================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'Fecha inválida (formato esperado YYYY-MM-DD)');

const loteEntradaSchema = z.object({
  medicamentoId: z.string().uuid('medicamentoId inválido'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  numeroLote: z.string().trim().min(1, 'El número de lote es requerido'),
  fechaVencimiento: fechaISO,
  costoUnitario: z.number().nonnegative().optional().nullable(),
  ubicacionId: z.string().uuid('ubicacionId inválido').optional().nullable(),
});

const entradaSchema = z.object({
  proveedorId: z.string().uuid('proveedorId inválido'),
  origen: z.enum(['DONACION', 'PRESUPUESTO_MUNICIPAL']),
  observaciones: z.string().trim().optional().nullable(),
  lotes: z.array(loteEntradaSchema).min(1, 'Debe registrar al menos un lote'),
});

/** Convierte 'YYYY-MM-DD' a un Date a medianoche local (columna @db.Date). */
function parseFechaVencimiento(valor: string): Date {
  return new Date(`${valor.slice(0, 10)}T00:00:00`);
}

// ============================================
// POST /api/inventario/entradas
// Registrar entrada de medicamentos con sus lotes (ADMIN y ENCARGADO).
// ============================================
router.post('/entradas', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const parsed = entradaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
    return;
  }
  const { proveedorId, origen, observaciones, lotes } = parsed.data;

  try {
    // Validar existencia de referencias para dar errores claros (en vez de P2003 de Prisma).
    const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
    if (!proveedor || !proveedor.activo) {
      res.status(400).json({ error: 'Proveedor no encontrado o inactivo' });
      return;
    }

    const medicamentoIds = [...new Set(lotes.map((l) => l.medicamentoId))];
    const medicamentos = await prisma.medicamento.findMany({
      where: { id: { in: medicamentoIds }, activo: true },
      select: { id: true },
    });
    if (medicamentos.length !== medicamentoIds.length) {
      res.status(400).json({ error: 'Uno o más medicamentos no existen o están inactivos' });
      return;
    }

    const ubicacionIds = [...new Set(lotes.map((l) => l.ubicacionId).filter(Boolean))] as string[];
    if (ubicacionIds.length > 0) {
      const ubicaciones = await prisma.ubicacion.findMany({
        where: { id: { in: ubicacionIds } },
        select: { id: true },
      });
      if (ubicaciones.length !== ubicacionIds.length) {
        res.status(400).json({ error: 'Una o más ubicaciones no existen' });
        return;
      }
    }

    const entrada = await prisma.$transaction(async (tx) => {
      const nuevaEntrada = await tx.entrada.create({
        data: {
          proveedorId,
          origen,
          usuarioId: req.user!.userId,
          observaciones: observaciones || null,
        },
      });

      await tx.lote.createMany({
        data: lotes.map((l) => ({
          entradaId: nuevaEntrada.id,
          medicamentoId: l.medicamentoId,
          cantidad: l.cantidad,
          cantidadActual: l.cantidad,
          numeroLote: l.numeroLote,
          fechaVencimiento: parseFechaVencimiento(l.fechaVencimiento),
          costoUnitario: l.costoUnitario ?? null,
          ubicacionId: l.ubicacionId ?? null,
          estado: EstadoLote.DISPONIBLE,
        })),
      });

      return tx.entrada.findUnique({
        where: { id: nuevaEntrada.id },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          lotes: {
            include: { medicamento: { select: { id: true, nombreGenerico: true } } },
          },
        },
      });
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'entrada',
      entidadId: entrada!.id,
      datosNuevos: { proveedorId, origen, lotes: lotes.length },
      ipAddress: req.ip,
    });

    res.status(201).json(entrada);
  } catch (error) {
    console.error('Error registrando entrada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// GET /api/inventario/entradas
// Historial de entradas registradas.
// ============================================
router.get('/entradas', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)));

    const [entradas, total] = await Promise.all([
      prisma.entrada.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          proveedor: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombreCompleto: true } },
          _count: { select: { lotes: true } },
        },
      }),
      prisma.entrada.count(),
    ]);

    res.json({
      data: entradas,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Error listando entradas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// GET /api/inventario
// Listado agregado por medicamento con stock disponible y semáforo del lote más próximo.
// Filtros: q, categoriaId, soloStockBajo. Paginación en memoria (escala pequeña).
// ============================================
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, categoriaId } = req.query as Record<string, string | undefined>;
    const soloStockBajo = req.query.soloStockBajo === 'true';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)));

    const where: any = { activo: true };
    if (categoriaId) where.categoriaId = categoriaId;
    if (q) {
      where.OR = [
        { nombreGenerico: { contains: q, mode: 'insensitive' } },
        { nombreComercial: { contains: q, mode: 'insensitive' } },
      ];
    }

    const umbrales = await getUmbrales();
    const medicamentos = await prisma.medicamento.findMany({
      where,
      orderBy: { nombreGenerico: 'asc' },
      include: {
        categoria: { select: { id: true, nombre: true } },
        lotes: {
          select: { cantidadActual: true, fechaVencimiento: true, estado: true },
        },
      },
    });

    const hoy = hoyMedianoche();

    let filas = medicamentos.map((med) => {
      const lotesDispensables = med.lotes.filter((l) => esDispensable(l, hoy));
      const stockDisponible = lotesDispensables.reduce((s, l) => s + l.cantidadActual, 0);

      // El semáforo de la fila refleja el lote dispensable que vence primero.
      const proximo = lotesDispensables
        .slice()
        .sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime())[0];

      const semaforo = proximo
        ? calcularSemaforo(proximo.fechaVencimiento, umbrales, proximo.estado)
        : null;

      return {
        id: med.id,
        nombreGenerico: med.nombreGenerico,
        nombreComercial: med.nombreComercial,
        presentacion: med.presentacion,
        concentracion: med.concentracion,
        unidadMedida: med.unidadMedida,
        categoria: med.categoria,
        stockMinimo: med.stockMinimo,
        stockDisponible,
        numeroLotes: lotesDispensables.length,
        proximoVencimiento: proximo?.fechaVencimiento ?? null,
        diasProximoVencimiento: proximo ? diasParaVencer(proximo.fechaVencimiento, hoy) : null,
        semaforo,
        stockBajo: stockDisponible < med.stockMinimo,
      };
    });

    if (soloStockBajo) filas = filas.filter((f) => f.stockBajo);

    const total = filas.length;
    const data = filas.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    res.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Error listando inventario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// GET /api/inventario/alertas
// Para el dashboard: stock bajo + por vencer + vencidos sin baja + resumen.
// ============================================
router.get('/alertas', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const umbrales = await getUmbrales();
    const hoy = hoyMedianoche();
    const limiteAmarillo = new Date(hoy);
    limiteAmarillo.setDate(limiteAmarillo.getDate() + umbrales.amarillo);

    const inicioDia = hoy;
    const finDia = new Date(hoy);
    finDia.setDate(finDia.getDate() + 1);

    const [medicamentos, lotesPorVencer, lotesVencidos, dispensacionesHoy, beneficiarios] =
      await Promise.all([
        // Stock bajo: necesitamos sumar lotes dispensables por medicamento.
        prisma.medicamento.findMany({
          where: { activo: true },
          select: {
            id: true,
            nombreGenerico: true,
            presentacion: true,
            stockMinimo: true,
            lotes: { select: { cantidadActual: true, fechaVencimiento: true, estado: true } },
          },
        }),
        // Próximos a vencer: DISPONIBLE, con stock, que vencen dentro del umbral amarillo.
        prisma.lote.findMany({
          where: {
            estado: 'DISPONIBLE',
            cantidadActual: { gt: 0 },
            fechaVencimiento: { gte: hoy, lte: limiteAmarillo },
          },
          orderBy: { fechaVencimiento: 'asc' },
          include: { medicamento: { select: { id: true, nombreGenerico: true, presentacion: true } } },
        }),
        // Vencidos sin baja: marcados VENCIDO o DISPONIBLE con fecha pasada, con stock.
        prisma.lote.findMany({
          where: {
            cantidadActual: { gt: 0 },
            OR: [
              { estado: 'VENCIDO' },
              { estado: 'DISPONIBLE', fechaVencimiento: { lt: hoy } },
            ],
          },
          orderBy: { fechaVencimiento: 'asc' },
          include: { medicamento: { select: { id: true, nombreGenerico: true, presentacion: true } } },
        }),
        prisma.dispensacion.count({ where: { createdAt: { gte: inicioDia, lt: finDia } } }),
        prisma.beneficiario.count({ where: { activo: true } }),
      ]);

    const stockBajo = medicamentos
      .map((med) => {
        const stock = med.lotes
          .filter((l) => esDispensable(l, hoy))
          .reduce((s, l) => s + l.cantidadActual, 0);
        return {
          id: med.id,
          nombreGenerico: med.nombreGenerico,
          presentacion: med.presentacion,
          stockDisponible: stock,
          stockMinimo: med.stockMinimo,
        };
      })
      .filter((m) => m.stockDisponible < m.stockMinimo)
      .sort((a, b) => a.stockDisponible - b.stockDisponible);

    const porVencer = lotesPorVencer.map((l) => ({
      id: l.id,
      numeroLote: l.numeroLote,
      medicamento: l.medicamento,
      cantidadActual: l.cantidadActual,
      fechaVencimiento: l.fechaVencimiento,
      diasParaVencer: diasParaVencer(l.fechaVencimiento, hoy),
      semaforo: calcularSemaforo(l.fechaVencimiento, umbrales, l.estado),
    }));

    const vencidos = lotesVencidos.map((l) => ({
      id: l.id,
      numeroLote: l.numeroLote,
      medicamento: l.medicamento,
      cantidadActual: l.cantidadActual,
      fechaVencimiento: l.fechaVencimiento,
      diasVencido: -diasParaVencer(l.fechaVencimiento, hoy),
    }));

    res.json({
      data: {
        stockBajo,
        porVencer,
        vencidos,
        resumen: {
          totalMedicamentos: medicamentos.length,
          stockBajo: stockBajo.length,
          porVencer: porVencer.length,
          vencidos: vencidos.length,
          dispensacionesHoy,
          beneficiarios,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// GET /api/inventario/medicamento/:id
// Detalle de stock por medicamento: todos sus lotes con semáforo.
// ============================================
router.get('/medicamento/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const umbrales = await getUmbrales();
    const medicamento = await prisma.medicamento.findUnique({
      where: { id },
      include: {
        categoria: { select: { id: true, nombre: true } },
        codigosBarras: { select: { id: true, codigo: true, descripcion: true } },
        lotes: {
          orderBy: { fechaVencimiento: 'asc' },
          include: {
            ubicacion: { select: { id: true, codigo: true, descripcion: true } },
            entrada: {
              select: {
                id: true,
                origen: true,
                createdAt: true,
                proveedor: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!medicamento) {
      res.status(404).json({ error: 'Medicamento no encontrado' });
      return;
    }

    const hoy = hoyMedianoche();
    const lotes = medicamento.lotes.map((l) => ({
      ...l,
      diasParaVencer: diasParaVencer(l.fechaVencimiento, hoy),
      semaforo: calcularSemaforo(l.fechaVencimiento, umbrales, l.estado),
    }));

    const stockDisponible = medicamento.lotes
      .filter((l) => esDispensable(l, hoy))
      .reduce((s, l) => s + l.cantidadActual, 0);

    res.json({
      data: {
        id: medicamento.id,
        nombreGenerico: medicamento.nombreGenerico,
        nombreComercial: medicamento.nombreComercial,
        presentacion: medicamento.presentacion,
        concentracion: medicamento.concentracion,
        unidadMedida: medicamento.unidadMedida,
        categoria: medicamento.categoria,
        codigosBarras: medicamento.codigosBarras,
        stockMinimo: medicamento.stockMinimo,
        stockDisponible,
        stockBajo: stockDisponible < medicamento.stockMinimo,
        lotes,
      },
    });
  } catch (error) {
    console.error('Error obteniendo detalle de medicamento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// PUT /api/inventario/lotes/:id/baja
// Dar de baja físicamente un lote (DADO_DE_BAJA). Solo ADMIN.
// ============================================
router.put(
  '/lotes/:id/baja',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : null;

      const lote = await prisma.lote.findUnique({
        where: { id },
        include: { medicamento: { select: { nombreGenerico: true } } },
      });
      if (!lote) {
        res.status(404).json({ error: 'Lote no encontrado' });
        return;
      }
      if (lote.estado === 'DADO_DE_BAJA') {
        res.status(409).json({ error: 'El lote ya fue dado de baja' });
        return;
      }

      const actualizado = await prisma.lote.update({
        where: { id },
        data: { estado: EstadoLote.DADO_DE_BAJA },
      });

      await registrarAuditoria({
        usuarioId: req.user!.userId,
        accion: 'BAJA',
        entidad: 'lote',
        entidadId: id,
        datosAnteriores: { estado: lote.estado, cantidadActual: lote.cantidadActual },
        datosNuevos: { estado: 'DADO_DE_BAJA', motivo },
        ipAddress: req.ip,
      });

      res.json({ data: actualizado });
    } catch (error) {
      console.error('Error dando de baja lote:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// ============================================
// GET /api/inventario/configuracion
// Umbrales de alerta de vencimiento (ambos roles los necesitan para el semáforo).
// ============================================
router.get('/configuracion', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const umbrales = await getUmbrales();
    res.json({ data: umbrales });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// PUT /api/inventario/configuracion
// Actualizar umbrales de alerta. Solo ADMIN. Requiere rojo < amarillo.
// ============================================
const configSchema = z.object({
  rojo: z.number().int().positive(),
  amarillo: z.number().int().positive(),
});

router.put(
  '/configuracion',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
      return;
    }
    const { rojo, amarillo } = parsed.data;
    if (rojo >= amarillo) {
      res.status(400).json({ error: 'El umbral rojo debe ser menor que el amarillo' });
      return;
    }

    try {
      const anterior = await getUmbrales();

      await prisma.$transaction([
        prisma.configuracionSistema.upsert({
          where: { clave: 'ALERTA_VENCIMIENTO_ROJO' },
          update: { valor: String(rojo) },
          create: {
            clave: 'ALERTA_VENCIMIENTO_ROJO',
            valor: String(rojo),
            descripcion: 'Días para alerta roja de vencimiento',
          },
        }),
        prisma.configuracionSistema.upsert({
          where: { clave: 'ALERTA_VENCIMIENTO_AMARILLO' },
          update: { valor: String(amarillo) },
          create: {
            clave: 'ALERTA_VENCIMIENTO_AMARILLO',
            valor: String(amarillo),
            descripcion: 'Días para alerta amarilla de vencimiento',
          },
        }),
      ]);

      await registrarAuditoria({
        usuarioId: req.user!.userId,
        accion: 'EDITAR',
        entidad: 'configuracion',
        datosAnteriores: anterior,
        datosNuevos: { rojo, amarillo },
        ipAddress: req.ip,
      });

      res.json({ data: { rojo, amarillo } });
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

export default router;
