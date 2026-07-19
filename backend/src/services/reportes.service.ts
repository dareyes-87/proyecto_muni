import { PrismaClient, EstadoLote, OrigenEntrada } from '@prisma/client';
import { getUmbrales, calcularSemaforo, diasParaVencer, hoyMedianoche } from './inventario.service';

const prisma = new PrismaClient();

export interface PaginacionParams {
  page?: number;
  limit?: number;
}

interface PaginacionResuelta {
  skip: number;
  take: number;
  pageNum: number;
  limitNum: number;
}

function resolverPaginacion({ page = 1, limit = 20 }: PaginacionParams): PaginacionResuelta {
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(5000, Math.max(1, limit));
  return { skip: (pageNum - 1) * limitNum, take: limitNum, pageNum, limitNum };
}

function paginacionRespuesta(p: PaginacionResuelta, total: number) {
  return { page: p.pageNum, limit: p.limitNum, total, totalPages: Math.ceil(total / p.limitNum) };
}

function costoNumerico(costo: unknown): number {
  return costo ? Number(costo) : 0;
}

// ============================================
// 1. DISPENSACIONES
// ============================================

export interface FiltrosDispensaciones extends PaginacionParams {
  desde?: string;
  hasta?: string;
  beneficiarioId?: string;
  medicamentoId?: string;
}

export async function reporteDispensaciones(filtros: FiltrosDispensaciones) {
  const p = resolverPaginacion(filtros);
  const where: any = {};
  if (filtros.desde || filtros.hasta) {
    where.createdAt = {};
    if (filtros.desde) where.createdAt.gte = new Date(filtros.desde);
    if (filtros.hasta) where.createdAt.lte = new Date(filtros.hasta);
  }
  if (filtros.beneficiarioId) where.beneficiarioId = filtros.beneficiarioId;
  if (filtros.medicamentoId) where.detalles = { some: { medicamentoId: filtros.medicamentoId } };

  const [rows, total] = await Promise.all([
    prisma.dispensacion.findMany({
      where,
      include: {
        beneficiario: { select: { nombreCompleto: true, dpi: true } },
        usuario: { select: { nombreCompleto: true, username: true } },
        detalles: { include: { medicamento: { include: { codigosBarras: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.take,
    }),
    prisma.dispensacion.count({ where }),
  ]);

  const data = rows.map((d) => ({
    id: d.id,
    createdAt: d.createdAt,
    observaciones: d.observaciones,
    beneficiario: d.beneficiario,
    usuario: d.usuario,
    medicamentos: d.detalles.map((det) => ({
      medicamentoId: det.medicamentoId,
      nombreGenerico: det.nombreMedicamentoSnapshot,
      presentacion: det.presentacionSnapshot,
      concentracion: det.concentracionSnapshot,
      cantidad: det.cantidad,
      codigoBarras: det.medicamento.codigosBarras[0]?.codigo ?? null,
    })),
  }));

  return { data, pagination: paginacionRespuesta(p, total) };
}

// ============================================
// 2. CONSUMO POR MEDICAMENTO
// ============================================

export interface FiltrosConsumo extends PaginacionParams {
  desde?: string;
  hasta?: string;
  categoriaId?: string;
}

export async function reporteConsumoMedicamentos(filtros: FiltrosConsumo) {
  const p = resolverPaginacion(filtros);
  const where: any = {};
  if (filtros.desde || filtros.hasta) {
    where.dispensacion = { createdAt: {} };
    if (filtros.desde) where.dispensacion.createdAt.gte = new Date(filtros.desde);
    if (filtros.hasta) where.dispensacion.createdAt.lte = new Date(filtros.hasta);
  }
  if (filtros.categoriaId) where.medicamento = { categoriaId: filtros.categoriaId };

  const agrupado = await prisma.detalleDispensacion.groupBy({
    by: ['medicamentoId'],
    where,
    _sum: { cantidad: true },
    _count: { _all: true },
  });

  agrupado.sort((a, b) => (b._sum.cantidad ?? 0) - (a._sum.cantidad ?? 0));
  const total = agrupado.length;
  const pagina = agrupado.slice(p.skip, p.skip + p.take);

  const medicamentos = await prisma.medicamento.findMany({
    where: { id: { in: pagina.map((row) => row.medicamentoId) } },
    include: { categoria: true },
  });
  const medMap = new Map(medicamentos.map((m) => [m.id, m]));

  const data = pagina.map((row) => {
    const m = medMap.get(row.medicamentoId);
    return {
      medicamentoId: row.medicamentoId,
      nombreGenerico: m?.nombreGenerico ?? '—',
      presentacion: m?.presentacion ?? '—',
      categoria: m?.categoria?.nombre ?? '—',
      cantidadTotalDispensada: row._sum.cantidad ?? 0,
      numeroDispensaciones: row._count._all,
    };
  });

  return { data, pagination: paginacionRespuesta(p, total) };
}

// ============================================
// 3. INVENTARIO ACTUAL (a nivel de lote)
// ============================================

export interface FiltrosInventarioActual extends PaginacionParams {
  categoriaId?: string;
  origen?: OrigenEntrada;
  estado?: EstadoLote;
}

export async function reporteInventarioActual(filtros: FiltrosInventarioActual) {
  const p = resolverPaginacion(filtros);
  const umbrales = await getUmbrales();

  const where: any = {};
  if (filtros.categoriaId) where.medicamento = { categoriaId: filtros.categoriaId };
  if (filtros.origen) where.entrada = { origen: filtros.origen };
  if (filtros.estado) where.estado = filtros.estado;

  const [lotes, total] = await Promise.all([
    prisma.lote.findMany({
      where,
      include: {
        medicamento: { include: { categoria: true, codigosBarras: true } },
        ubicacion: true,
        entrada: { include: { proveedor: true } },
      },
      orderBy: { fechaVencimiento: 'asc' },
      skip: p.skip,
      take: p.take,
    }),
    prisma.lote.count({ where }),
  ]);

  const data = lotes.map((l) => ({
    loteId: l.id,
    numeroLote: l.numeroLote,
    medicamento: {
      id: l.medicamento.id,
      nombreGenerico: l.medicamento.nombreGenerico,
      presentacion: l.medicamento.presentacion,
      concentracion: l.medicamento.concentracion,
      categoria: l.medicamento.categoria?.nombre ?? null,
    },
    codigoBarras: l.medicamento.codigosBarras[0]?.codigo ?? null,
    cantidadActual: l.cantidadActual,
    fechaVencimiento: l.fechaVencimiento,
    diasParaVencer: diasParaVencer(l.fechaVencimiento),
    semaforo: calcularSemaforo(l.fechaVencimiento, umbrales, l.estado),
    estado: l.estado,
    ubicacion: l.ubicacion ? { codigo: l.ubicacion.codigo, descripcion: l.ubicacion.descripcion } : null,
    origen: l.entrada.origen,
    proveedor: l.entrada.proveedor.nombre,
  }));

  return { data, pagination: paginacionRespuesta(p, total) };
}

// ============================================
// 4. MEDICAMENTOS POR VENCER
// ============================================

export interface FiltrosPorVencer extends PaginacionParams {
  dias?: number;
}

export async function reportePorVencer(filtros: FiltrosPorVencer) {
  const p = resolverPaginacion(filtros);
  const dias = filtros.dias && filtros.dias > 0 ? filtros.dias : 90;
  const umbrales = await getUmbrales();
  const hoy = hoyMedianoche();
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + dias);

  const where = {
    estado: EstadoLote.DISPONIBLE,
    cantidadActual: { gt: 0 },
    fechaVencimiento: { gte: hoy, lte: limite },
  };

  const [lotes, total] = await Promise.all([
    prisma.lote.findMany({
      where,
      include: {
        medicamento: { include: { codigosBarras: true, categoria: true } },
        ubicacion: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
      skip: p.skip,
      take: p.take,
    }),
    prisma.lote.count({ where }),
  ]);

  const data = lotes.map((l) => ({
    loteId: l.id,
    numeroLote: l.numeroLote,
    medicamento: {
      id: l.medicamento.id,
      nombreGenerico: l.medicamento.nombreGenerico,
      presentacion: l.medicamento.presentacion,
      categoria: l.medicamento.categoria?.nombre ?? null,
    },
    codigoBarras: l.medicamento.codigosBarras[0]?.codigo ?? null,
    cantidadActual: l.cantidadActual,
    fechaVencimiento: l.fechaVencimiento,
    diasParaVencer: diasParaVencer(l.fechaVencimiento, hoy),
    semaforo: calcularSemaforo(l.fechaVencimiento, umbrales, l.estado),
    ubicacion: l.ubicacion ? { codigo: l.ubicacion.codigo } : null,
  }));

  return { data, pagination: paginacionRespuesta(p, total), umbralDias: dias };
}

// ============================================
// 5. ENTRADAS POR PROVEEDOR
// ============================================

export interface FiltrosEntradas extends PaginacionParams {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  origen?: OrigenEntrada;
}

export async function reporteEntradasProveedor(filtros: FiltrosEntradas) {
  const p = resolverPaginacion(filtros);
  const where: any = {};
  if (filtros.desde || filtros.hasta) {
    where.createdAt = {};
    if (filtros.desde) where.createdAt.gte = new Date(filtros.desde);
    if (filtros.hasta) where.createdAt.lte = new Date(filtros.hasta);
  }
  if (filtros.proveedorId) where.proveedorId = filtros.proveedorId;
  if (filtros.origen) where.origen = filtros.origen;

  const [entradas, total] = await Promise.all([
    prisma.entrada.findMany({
      where,
      include: {
        proveedor: true,
        usuario: { select: { nombreCompleto: true } },
        lotes: { include: { medicamento: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: p.skip,
      take: p.take,
    }),
    prisma.entrada.count({ where }),
  ]);

  const data = entradas.map((e) => {
    const totalUnidades = e.lotes.reduce((s, l) => s + l.cantidad, 0);
    const costoTotal = e.lotes.reduce((s, l) => s + costoNumerico(l.costoUnitario) * l.cantidad, 0);
    return {
      id: e.id,
      createdAt: e.createdAt,
      origen: e.origen,
      proveedor: e.proveedor.nombre,
      usuario: e.usuario.nombreCompleto,
      totalLotes: e.lotes.length,
      totalUnidades,
      costoTotal,
      lotes: e.lotes.map((l) => ({
        numeroLote: l.numeroLote,
        medicamento: l.medicamento.nombreGenerico,
        cantidad: l.cantidad,
        costoUnitario: l.costoUnitario,
        fechaVencimiento: l.fechaVencimiento,
      })),
    };
  });

  return { data, pagination: paginacionRespuesta(p, total) };
}

// ============================================
// 6. MEDICAMENTOS DADOS DE BAJA
// ============================================

export interface FiltrosBaja extends PaginacionParams {
  desde?: string;
  hasta?: string;
}

/**
 * El filtro de fecha se aplica sobre fechaVencimiento: el Lote no tiene un
 * timestamp propio de "cuándo pasó a VENCIDO/DADO_DE_BAJA" (el motivo de baja
 * queda solo en el log de auditoría), así que es el dato de fecha más
 * significativo disponible en el modelo.
 */
export async function reporteMedicamentosBaja(filtros: FiltrosBaja) {
  const p = resolverPaginacion(filtros);
  const where: any = { estado: { in: [EstadoLote.VENCIDO, EstadoLote.DADO_DE_BAJA] } };
  if (filtros.desde || filtros.hasta) {
    where.fechaVencimiento = {};
    if (filtros.desde) where.fechaVencimiento.gte = new Date(filtros.desde);
    if (filtros.hasta) where.fechaVencimiento.lte = new Date(filtros.hasta);
  }

  const [lotes, total, agregados] = await Promise.all([
    prisma.lote.findMany({
      where,
      include: {
        medicamento: { include: { categoria: true } },
        entrada: { include: { proveedor: true } },
      },
      orderBy: { fechaVencimiento: 'desc' },
      skip: p.skip,
      take: p.take,
    }),
    prisma.lote.count({ where }),
    prisma.lote.findMany({ where, select: { cantidadActual: true, costoUnitario: true } }),
  ]);

  const totalUnidadesPerdidas = agregados.reduce((s, l) => s + l.cantidadActual, 0);
  const costoTotalEstimado = agregados.reduce((s, l) => s + costoNumerico(l.costoUnitario) * l.cantidadActual, 0);

  const data = lotes.map((l) => ({
    loteId: l.id,
    numeroLote: l.numeroLote,
    medicamento: {
      nombreGenerico: l.medicamento.nombreGenerico,
      presentacion: l.medicamento.presentacion,
      categoria: l.medicamento.categoria?.nombre ?? null,
    },
    estado: l.estado,
    fechaVencimiento: l.fechaVencimiento,
    cantidadPerdida: l.cantidadActual,
    costoUnitario: l.costoUnitario,
    costoEstimado: l.costoUnitario ? costoNumerico(l.costoUnitario) * l.cantidadActual : null,
    proveedor: l.entrada.proveedor.nombre,
  }));

  return {
    data,
    pagination: paginacionRespuesta(p, total),
    resumen: { totalUnidadesPerdidas, costoTotalEstimado },
  };
}

export async function obtenerNombreFarmacia(): Promise<string> {
  const config = await prisma.configuracionSistema.findUnique({ where: { clave: 'NOMBRE_FARMACIA' } });
  return config?.valor ?? 'Farmacia Municipal';
}
