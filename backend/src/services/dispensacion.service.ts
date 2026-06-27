import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// BENEFICIARIOS
// ============================================

export async function buscarBeneficiarios(q: string) {
  if (!q || q.trim() === '') {
    return prisma.beneficiario.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  const texto = q.trim();
  const esDpi = /^\d+$/.test(texto);

  if (esDpi) {
    return prisma.beneficiario.findMany({
      where: {
        activo: true,
        dpi: { startsWith: texto },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  return prisma.beneficiario.findMany({
    where: {
      activo: true,
      nombreCompleto: { contains: texto, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function crearBeneficiario(data: {
  nombreCompleto: string;
  dpi?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
}) {
  if (data.dpi) {
    const existe = await prisma.beneficiario.findUnique({ where: { dpi: data.dpi } });
    if (existe) {
      throw new Error(`Ya existe un beneficiario con DPI ${data.dpi}`);
    }
  }

  return prisma.beneficiario.create({
    data: {
      nombreCompleto: data.nombreCompleto,
      dpi: data.dpi || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      observaciones: data.observaciones || null,
    },
  });
}

export async function obtenerBeneficiario(id: string) {
  const beneficiario = await prisma.beneficiario.findUnique({
    where: { id },
    include: {
      dispensaciones: {
        orderBy: { createdAt: 'desc' },
        include: {
          usuario: { select: { nombreCompleto: true } },
          detalles: {
            select: {
              cantidad: true,
              nombreMedicamentoSnapshot: true,
              presentacionSnapshot: true,
              concentracionSnapshot: true,
            },
          },
        },
      },
    },
  });

  if (!beneficiario) {
    throw new Error('Beneficiario no encontrado');
  }

  return beneficiario;
}

export async function editarBeneficiario(
  id: string,
  data: {
    nombreCompleto?: string;
    dpi?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    observaciones?: string | null;
  }
) {
  const actual = await prisma.beneficiario.findUnique({ where: { id } });
  if (!actual) {
    throw new Error('Beneficiario no encontrado');
  }

  if (data.dpi && data.dpi !== actual.dpi) {
    const existe = await prisma.beneficiario.findUnique({ where: { dpi: data.dpi } });
    if (existe) {
      throw new Error(`Ya existe un beneficiario con DPI ${data.dpi}`);
    }
  }

  return prisma.beneficiario.update({
    where: { id },
    data: {
      nombreCompleto: data.nombreCompleto ?? actual.nombreCompleto,
      dpi: data.dpi !== undefined ? (data.dpi || null) : actual.dpi,
      telefono: data.telefono !== undefined ? (data.telefono || null) : actual.telefono,
      direccion: data.direccion !== undefined ? (data.direccion || null) : actual.direccion,
      observaciones: data.observaciones !== undefined ? (data.observaciones || null) : actual.observaciones,
    },
  });
}

// ============================================
// DISPENSACIÓN — FIFO + CONCURRENCIA
// ============================================

interface ItemDispensacion {
  medicamentoId: string;
  cantidad: number;
}

interface LoteBloqueado {
  id: string;
  medicamento_id: string;
  cantidad_actual: number;
  numero_lote: string;
  fecha_vencimiento: Date;
  estado: string;
}

export async function despachar(
  beneficiarioId: string,
  usuarioId: string,
  items: ItemDispensacion[],
  observaciones?: string | null
) {
  if (!items || items.length === 0) {
    throw new Error('Debe incluir al menos un medicamento');
  }

  for (const item of items) {
    if (!item.medicamentoId || !item.cantidad || item.cantidad <= 0) {
      throw new Error('Cada ítem debe tener medicamentoId y cantidad mayor a 0');
    }
  }

  const beneficiario = await prisma.beneficiario.findUnique({
    where: { id: beneficiarioId },
  });
  if (!beneficiario || !beneficiario.activo) {
    throw new Error('Beneficiario no encontrado o inactivo');
  }

  return prisma.$transaction(async (tx) => {
    const detallesCreados: Array<{
      loteId: string;
      medicamentoId: string;
      cantidad: number;
      nombreMedicamentoSnapshot: string;
      presentacionSnapshot: string;
      concentracionSnapshot: string | null;
    }> = [];

    const stockActualizado: Array<{
      medicamentoId: string;
      nombreGenerico: string;
      stockDisponible: number;
    }> = [];

    for (const item of items) {
      const medicamento = await tx.medicamento.findUnique({
        where: { id: item.medicamentoId },
      });
      if (!medicamento || !medicamento.activo) {
        throw new Error(`Medicamento no encontrado o inactivo: ${item.medicamentoId}`);
      }

      // SELECT ... FOR UPDATE — bloqueo de filas FIFO
      const lotes = await tx.$queryRaw<LoteBloqueado[]>`
        SELECT id, medicamento_id, cantidad_actual, numero_lote, fecha_vencimiento, estado
        FROM lotes
        WHERE medicamento_id = ${item.medicamentoId}
          AND estado = 'DISPONIBLE'
          AND cantidad_actual > 0
        ORDER BY fecha_vencimiento ASC
        FOR UPDATE
      `;

      const stockTotal = lotes.reduce((sum, l) => sum + l.cantidad_actual, 0);
      if (stockTotal < item.cantidad) {
        throw new Error(
          `Stock insuficiente para ${medicamento.nombreGenerico}. ` +
          `Solicitado: ${item.cantidad}, Disponible: ${stockTotal}`
        );
      }

      let restante = item.cantidad;

      for (const lote of lotes) {
        if (restante <= 0) break;

        const descontar = Math.min(restante, lote.cantidad_actual);
        const nuevaCantidad = lote.cantidad_actual - descontar;

        await tx.lote.update({
          where: { id: lote.id },
          data: {
            cantidadActual: nuevaCantidad,
            estado: nuevaCantidad === 0 ? 'AGOTADO' : 'DISPONIBLE',
          },
        });

        detallesCreados.push({
          loteId: lote.id,
          medicamentoId: item.medicamentoId,
          cantidad: descontar,
          nombreMedicamentoSnapshot: medicamento.nombreGenerico,
          presentacionSnapshot: medicamento.presentacion,
          concentracionSnapshot: medicamento.concentracion,
        });

        restante -= descontar;
      }

      // Stock restante después de la dispensación
      const stockRestante = stockTotal - item.cantidad;
      stockActualizado.push({
        medicamentoId: item.medicamentoId,
        nombreGenerico: medicamento.nombreGenerico,
        stockDisponible: stockRestante,
      });
    }

    const dispensacion = await tx.dispensacion.create({
      data: {
        beneficiarioId,
        usuarioId,
        observaciones: observaciones || null,
        detalles: {
          create: detallesCreados,
        },
      },
      include: {
        beneficiario: { select: { nombreCompleto: true, dpi: true } },
        usuario: { select: { nombreCompleto: true } },
        detalles: true,
      },
    });

    return { dispensacion, stockActualizado };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

// ============================================
// HISTORIAL
// ============================================

export async function obtenerHistorial(filtros: {
  fechaDesde?: string;
  fechaHasta?: string;
  beneficiarioId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filtros.page || 1;
  const limit = filtros.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.DispensacionWhereInput = {};

  if (filtros.beneficiarioId) {
    where.beneficiarioId = filtros.beneficiarioId;
  }

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.createdAt = {};
    if (filtros.fechaDesde) {
      where.createdAt.gte = new Date(filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      const hasta = new Date(filtros.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      where.createdAt.lte = hasta;
    }
  }

  const [data, total] = await Promise.all([
    prisma.dispensacion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        beneficiario: { select: { nombreCompleto: true, dpi: true } },
        usuario: { select: { nombreCompleto: true } },
        detalles: {
          select: {
            cantidad: true,
            nombreMedicamentoSnapshot: true,
            presentacionSnapshot: true,
            concentracionSnapshot: true,
          },
        },
      },
    }),
    prisma.dispensacion.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function obtenerDispensacion(id: string) {
  const dispensacion = await prisma.dispensacion.findUnique({
    where: { id },
    include: {
      beneficiario: true,
      usuario: { select: { nombreCompleto: true } },
      detalles: {
        include: {
          lote: { select: { numeroLote: true, fechaVencimiento: true } },
          medicamento: { select: { nombreGenerico: true, presentacion: true, concentracion: true } },
        },
      },
    },
  });

  if (!dispensacion) {
    throw new Error('Dispensación no encontrada');
  }

  return dispensacion;
}

// ============================================
// CONSULTA DE STOCK (para frontend)
// ============================================

export async function obtenerStockMedicamento(medicamentoId: string) {
  const lotes = await prisma.lote.findMany({
    where: {
      medicamentoId,
      estado: 'DISPONIBLE',
      cantidadActual: { gt: 0 },
    },
    orderBy: { fechaVencimiento: 'asc' },
    select: {
      id: true,
      cantidadActual: true,
      fechaVencimiento: true,
      numeroLote: true,
    },
  });

  const stockTotal = lotes.reduce((sum, l) => sum + l.cantidadActual, 0);
  const vencimientoProximo = lotes.length > 0 ? lotes[0].fechaVencimiento : null;

  return { stockTotal, vencimientoProximo, lotes };
}
