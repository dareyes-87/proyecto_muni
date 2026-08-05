import { Router, Request, Response } from 'express';
import { PrismaClient, EstadoLote, OrigenEntrada } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import ExcelJS from 'exceljs';
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

// ============================================
// IMPORTACIÓN MASIVA POR EXCEL
// ============================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/** Columnas esperadas del Excel, en el orden de la plantilla. */
const COLUMNAS_EXCEL = [
  'nombreGenerico',
  'nombreComercial',
  'presentacion',
  'concentracion',
  'unidadMedida',
  'categoria',
  'codigoBarras',
  'cantidad',
  'numeroLote',
  'fechaVencimiento',
  'ubicacion',
  'origen',
  'proveedor',
] as const;
type CampoExcel = (typeof COLUMNAS_EXCEL)[number];

const DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

function normalizarHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_A_CAMPO: Record<string, CampoExcel> = Object.fromEntries(
  COLUMNAS_EXCEL.map((c) => [normalizarHeader(c), c])
) as Record<string, CampoExcel>;

/** Convierte un valor de celda de exceljs a texto plano (soporta rich text y fórmulas). */
function celdaATexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor) return (valor as any).richText.map((r: any) => r.text).join('');
    if ('result' in valor) return String((valor as any).result ?? '');
    if ('text' in valor) return String((valor as any).text ?? '');
    return '';
  }
  return String(valor).trim();
}

/** Interpreta una celda de fecha: Date nativo de Excel, 'YYYY-MM-DD' o 'DD/MM/YYYY'. */
function parseFechaCelda(valor: ExcelJS.CellValue): Date | null {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const d = new Date(valor);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const texto = celdaATexto(valor).trim();
  if (!texto) return null;

  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[0]}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const dmyMatch = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    const d = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const ORIGENES_VALIDOS: Record<string, OrigenEntrada> = {
  donacion: 'DONACION',
  presupuestomunicipal: 'PRESUPUESTO_MUNICIPAL',
};

interface FilaValidada {
  nombreGenerico: string;
  nombreComercial: string | null;
  presentacion: string;
  concentracion: string | null;
  unidadMedida: string;
  categoria: string;
  codigoBarras: string | null;
  cantidad: number;
  numeroLote: string;
  fechaVencimiento: Date;
  ubicacion: string | null;
  origen: OrigenEntrada;
  proveedor: string;
}

function validarFila(raw: Record<CampoExcel, ExcelJS.CellValue>): { datos: FilaValidada } | { error: string } {
  const errores: string[] = [];

  const nombreGenerico = celdaATexto(raw.nombreGenerico);
  if (!nombreGenerico) errores.push('nombreGenerico es requerido');

  const presentacion = celdaATexto(raw.presentacion);
  if (!presentacion) errores.push('presentacion es requerida');

  const unidadMedida = celdaATexto(raw.unidadMedida);
  if (!unidadMedida) errores.push('unidadMedida es requerida');

  const categoria = celdaATexto(raw.categoria);
  if (!categoria) errores.push('categoria es requerida');

  const proveedor = celdaATexto(raw.proveedor);
  if (!proveedor) errores.push('proveedor es requerido');

  const numeroLote = celdaATexto(raw.numeroLote);
  if (!numeroLote) errores.push('numeroLote es requerido');

  const origenTexto = normalizarHeader(celdaATexto(raw.origen));
  const origen = ORIGENES_VALIDOS[origenTexto];
  if (!origen) errores.push('origen inválido (use DONACION o PRESUPUESTO_MUNICIPAL)');

  const cantidadTexto = celdaATexto(raw.cantidad);
  const cantidad = parseInt(cantidadTexto, 10);
  if (!cantidadTexto) errores.push('cantidad es requerida');
  else if (!Number.isFinite(cantidad) || cantidad <= 0) errores.push('cantidad debe ser un entero mayor a 0');

  const fechaVencimiento = parseFechaCelda(raw.fechaVencimiento);
  if (!fechaVencimiento) errores.push('fechaVencimiento es requerida y debe tener formato YYYY-MM-DD o DD/MM/YYYY');

  if (errores.length > 0) return { error: errores.join('; ') };

  const nombreComercial = celdaATexto(raw.nombreComercial) || null;
  const concentracion = celdaATexto(raw.concentracion) || null;
  const codigoBarras = celdaATexto(raw.codigoBarras) || null;
  const ubicacion = celdaATexto(raw.ubicacion) || null;

  return {
    datos: {
      nombreGenerico,
      nombreComercial,
      presentacion,
      concentracion,
      unidadMedida,
      categoria,
      codigoBarras,
      cantidad,
      numeroLote,
      fechaVencimiento: fechaVencimiento!,
      ubicacion,
      origen,
      proveedor,
    },
  };
}

// ============================================
// POST /api/inventario/importar-excel
// Importación masiva de medicamentos + entradas desde un archivo .xlsx. Solo ADMIN.
// ============================================
router.post(
  '/importar-excel',
  authMiddleware,
  requireRole('ADMIN'),
  upload.single('archivo'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'Debe adjuntar un archivo .xlsx en el campo "archivo"' });
      return;
    }

    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer as any);
    } catch {
      res.status(400).json({ error: 'El archivo no es un Excel (.xlsx) válido' });
      return;
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      res.status(400).json({ error: 'El archivo no contiene filas de datos' });
      return;
    }

    // Mapear columnas por encabezado (no depende del orden exacto de la plantilla).
    const headerRow = sheet.getRow(1);
    const columnaACampo: Record<number, CampoExcel> = {};
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const campo = HEADER_A_CAMPO[normalizarHeader(celdaATexto(cell.value))];
      if (campo) columnaACampo[colNumber] = campo;
    });
    const camposFaltantes = COLUMNAS_EXCEL.filter((c) => !Object.values(columnaACampo).includes(c));
    if (camposFaltantes.length > 0) {
      res.status(400).json({
        error: `Faltan columnas en el Excel: ${camposFaltantes.join(', ')}. Descargue la plantilla actualizada.`,
      });
      return;
    }

    // Validar todas las filas primero (en memoria, sin tocar la BD).
    const filasValidas: { fila: FilaValidada; numeroFila: number }[] = [];
    const errores: { fila: number; error: string }[] = [];
    const avisos: { fila: number; aviso: string }[] = [];
    let totalFilas = 0;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (row.actualCellCount === 0) continue; // fila vacía
      totalFilas++;

      const raw = {} as Record<CampoExcel, ExcelJS.CellValue>;
      for (const [colNumber, campo] of Object.entries(columnaACampo)) {
        raw[campo] = row.getCell(Number(colNumber)).value;
      }

      const resultado = validarFila(raw);
      if ('error' in resultado) {
        errores.push({ fila: r, error: resultado.error });
      } else {
        filasValidas.push({ fila: resultado.datos, numeroFila: r });
      }
    }

    // Procesar filas válidas secuencialmente (para reutilizar entidades creadas por filas previas).
    let medicamentosCreados = 0;
    let medicamentosExistentes = 0;
    let categoriasCreadas = 0;
    let proveedoresCreados = 0;
    let ubicacionesCreadas = 0;
    let codigosBarrasVinculados = 0;
    let lotesRegistrados = 0;

    for (const { fila, numeroFila } of filasValidas) {
      try {
        const resultado = await prisma.$transaction(async (tx) => {
          let categoria = await tx.categoria.findFirst({
            where: { nombre: { equals: fila.categoria, mode: 'insensitive' } },
          });
          let categoriaCreada = false;
          if (!categoria) {
            categoria = await tx.categoria.create({ data: { nombre: fila.categoria } });
            categoriaCreada = true;
          }

          let proveedor = await tx.proveedor.findFirst({
            where: { nombre: { equals: fila.proveedor, mode: 'insensitive' } },
          });
          let proveedorCreado = false;
          if (!proveedor) {
            // Sin columna de tipo en el Excel: se crea como INSTITUCION por defecto
            // (editable luego en Catálogos > Proveedores).
            proveedor = await tx.proveedor.create({
              data: { nombre: fila.proveedor, tipo: 'INSTITUCION' },
            });
            proveedorCreado = true;
          } else if (!proveedor.activo) {
            throw new Error(`El proveedor "${fila.proveedor}" existe pero está inactivo`);
          }

          let ubicacion = null as Awaited<ReturnType<typeof tx.ubicacion.findFirst>>;
          let ubicacionCreada = false;
          if (fila.ubicacion) {
            ubicacion = await tx.ubicacion.findFirst({
              where: { codigo: { equals: fila.ubicacion, mode: 'insensitive' } },
            });
            if (!ubicacion) {
              ubicacion = await tx.ubicacion.create({ data: { codigo: fila.ubicacion } });
              ubicacionCreada = true;
            }
          }

          const concentracionNorm = (fila.concentracion || '').toLowerCase().trim();
          const candidatos = await tx.medicamento.findMany({
            where: {
              nombreGenerico: { equals: fila.nombreGenerico, mode: 'insensitive' },
              presentacion: { equals: fila.presentacion, mode: 'insensitive' },
            },
          });
          let medicamento = candidatos.find(
            (m) => (m.concentracion || '').toLowerCase().trim() === concentracionNorm
          );
          let medicamentoCreado = false;
          if (!medicamento) {
            medicamento = await tx.medicamento.create({
              data: {
                nombreGenerico: fila.nombreGenerico,
                nombreComercial: fila.nombreComercial,
                presentacion: fila.presentacion,
                concentracion: fila.concentracion,
                unidadMedida: fila.unidadMedida,
                categoriaId: categoria.id,
                stockMinimo: 10,
              },
            });
            medicamentoCreado = true;
          }

          let codigoBarrasVinculado = false;
          let codigoBarrasAviso: string | null = null;
          if (fila.codigoBarras) {
            const existente = await tx.codigoBarras.findUnique({ where: { codigo: fila.codigoBarras } });
            if (!existente) {
              await tx.codigoBarras.create({
                data: { codigo: fila.codigoBarras, medicamentoId: medicamento.id },
              });
              codigoBarrasVinculado = true;
            } else if (existente.medicamentoId !== medicamento.id) {
              codigoBarrasAviso = `El código de barras "${fila.codigoBarras}" ya pertenece a otro medicamento; no se vinculó`;
            }
          }

          const entrada = await tx.entrada.create({
            data: {
              proveedorId: proveedor.id,
              origen: fila.origen,
              usuarioId: req.user!.userId,
              observaciones: `Importado desde Excel (fila ${numeroFila})`,
            },
          });

          await tx.lote.create({
            data: {
              entradaId: entrada.id,
              medicamentoId: medicamento.id,
              cantidad: fila.cantidad,
              cantidadActual: fila.cantidad,
              numeroLote: fila.numeroLote,
              fechaVencimiento: fila.fechaVencimiento,
              ubicacionId: ubicacion?.id ?? null,
              estado: EstadoLote.DISPONIBLE,
            },
          });

          return {
            categoria,
            categoriaCreada,
            proveedor,
            proveedorCreado,
            ubicacion,
            ubicacionCreada,
            medicamento,
            medicamentoCreado,
            codigoBarrasVinculado,
            codigoBarrasAviso,
            entradaId: entrada.id,
          };
        });

        if (resultado.medicamentoCreado) {
          medicamentosCreados++;
          await registrarAuditoria({
            usuarioId: req.user!.userId,
            accion: 'CREAR',
            entidad: 'medicamento',
            entidadId: resultado.medicamento.id,
            datosNuevos: { ...resultado.medicamento, origenImportacion: 'excel', fila: numeroFila },
            ipAddress: req.ip,
          });
        } else {
          medicamentosExistentes++;
        }
        if (resultado.categoriaCreada) {
          categoriasCreadas++;
          await registrarAuditoria({
            usuarioId: req.user!.userId,
            accion: 'CREAR',
            entidad: 'categoria',
            entidadId: resultado.categoria.id,
            datosNuevos: resultado.categoria,
            ipAddress: req.ip,
          });
        }
        if (resultado.proveedorCreado) {
          proveedoresCreados++;
          await registrarAuditoria({
            usuarioId: req.user!.userId,
            accion: 'CREAR',
            entidad: 'proveedor',
            entidadId: resultado.proveedor.id,
            datosNuevos: resultado.proveedor,
            ipAddress: req.ip,
          });
        }
        if (resultado.ubicacionCreada && resultado.ubicacion) {
          ubicacionesCreadas++;
          await registrarAuditoria({
            usuarioId: req.user!.userId,
            accion: 'CREAR',
            entidad: 'ubicacion',
            entidadId: resultado.ubicacion.id,
            datosNuevos: resultado.ubicacion,
            ipAddress: req.ip,
          });
        }
        if (resultado.codigoBarrasVinculado) codigosBarrasVinculados++;
        if (resultado.codigoBarrasAviso) {
          avisos.push({ fila: numeroFila, aviso: resultado.codigoBarrasAviso });
        }

        lotesRegistrados++;
        await registrarAuditoria({
          usuarioId: req.user!.userId,
          accion: 'CREAR',
          entidad: 'entrada',
          entidadId: resultado.entradaId,
          datosNuevos: {
            proveedorId: resultado.proveedor.id,
            origen: fila.origen,
            lotes: 1,
            origenImportacion: 'excel',
            fila: numeroFila,
          },
          ipAddress: req.ip,
        });
      } catch (err) {
        errores.push({
          fila: numeroFila,
          error: err instanceof Error ? err.message : 'Error desconocido al procesar la fila',
        });
      }
    }

    res.json({
      data: {
        totalFilas,
        medicamentosCreados,
        medicamentosExistentes,
        categoriasCreadas,
        proveedoresCreados,
        ubicacionesCreadas,
        codigosBarrasVinculados,
        lotesRegistrados,
        errores,
        avisos,
      },
    });
  }
);

// ============================================
// GET /api/inventario/plantilla-excel
// Descarga una plantilla .xlsx vacía con las columnas correctas + ejemplo + instrucciones. Solo ADMIN.
// ============================================
router.get(
  '/plantilla-excel',
  authMiddleware,
  requireRole('ADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet('Plantilla');
    sheet.columns = COLUMNAS_EXCEL.map((c) => ({ header: c, key: c, width: 18 }));
    sheet.getRow(1).font = { bold: true };

    const filaEjemplo = sheet.addRow({
      nombreGenerico: 'Acetaminofén',
      nombreComercial: 'Panadol',
      presentacion: 'Tableta',
      concentracion: '500mg',
      unidadMedida: 'Tableta',
      categoria: 'Analgésico',
      codigoBarras: '7501234567890',
      cantidad: 100,
      numeroLote: 'L-2026-001',
      fechaVencimiento: new Date('2027-12-31T00:00:00'),
      ubicacion: 'A-1',
      origen: 'DONACION',
      proveedor: 'Cruz Roja Guatemalteca',
    });
    filaEjemplo.getCell('fechaVencimiento').numFmt = 'yyyy-mm-dd';
    filaEjemplo.font = { italic: true, color: { argb: 'FF888888' } };

    const instrucciones = workbook.addWorksheet('Instrucciones');
    instrucciones.columns = [{ width: 100 }];
    const lineas = [
      'INSTRUCCIONES PARA IMPORTAR MEDICAMENTOS DESDE EXCEL',
      '',
      '1. No elimine ni reordene la fila de encabezados (fila 1) de la hoja "Plantilla".',
      '2. La fila 2 es un ejemplo — puede borrarla o sobrescribirla, no la deje como dato real.',
      '3. Cada fila representa UN lote de UN medicamento (una entrada individual).',
      '4. Campos obligatorios: nombreGenerico, presentacion, unidadMedida, categoria, cantidad,',
      '   numeroLote, fechaVencimiento, origen, proveedor.',
      '5. Campos opcionales: nombreComercial, concentracion, codigoBarras, ubicacion.',
      '6. origen debe ser exactamente: DONACION o PRESUPUESTO_MUNICIPAL.',
      '7. fechaVencimiento en formato AAAA-MM-DD (ej. 2027-12-31) o como fecha de Excel.',
      '8. Si categoria, proveedor o ubicacion no existen en el sistema, se crean automáticamente.',
      '9. Si el medicamento ya existe (mismo nombreGenerico + presentacion + concentracion),',
      '   se reutiliza y solo se registra el nuevo lote.',
      '10. Los proveedores nuevos se crean por defecto como INSTITUCION; puede editarlos luego',
      '    en Catálogos > Proveedores si corresponde a una PERSONA.',
      '11. Si una fila tiene errores, se omite pero el resto del archivo se procesa igual.',
    ];
    lineas.forEach((linea, i) => {
      const row = instrucciones.getRow(i + 1);
      row.getCell(1).value = linea;
      if (i === 0) row.getCell(1).font = { bold: true, size: 13 };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-importacion-medicamentos.xlsx"');
    res.send(Buffer.from(buffer));
  }
);

export default router;
