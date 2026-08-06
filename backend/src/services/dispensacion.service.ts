import { PrismaClient, Prisma, TipoFoto } from '@prisma/client';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';

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
          fotos: { select: { id: true, tipo: true, imagenUrl: true } },
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
        fotos: { select: { id: true, tipo: true, imagenUrl: true } },
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
      fotos: { select: { id: true, tipo: true, imagenUrl: true, createdAt: true } },
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
// EVIDENCIA FOTOGRÁFICA (captura desde celular vía QR)
// ============================================

/** Minutos de vida de un token de captura. */
const TOKEN_VIGENCIA_MIN = 30;

/** Directorio raíz donde se guardan las fotos de dispensaciones. */
export const UPLOADS_DISPENSACIONES = path.join(
  __dirname,
  '..',
  '..',
  'uploads',
  'dispensaciones'
);

/**
 * Devuelve el token de captura vigente de una dispensación, o crea uno nuevo.
 * `dispensacionId` es único en TokenCaptura, así que si ya hay una fila pero el
 * token venció o ya se usó, se reemplaza el valor en vez de insertar otra.
 */
export async function generarTokenCaptura(dispensacionId: string) {
  const dispensacion = await prisma.dispensacion.findUnique({
    where: { id: dispensacionId },
    select: { id: true },
  });
  if (!dispensacion) {
    throw new Error('Dispensación no encontrada');
  }

  const ahora = new Date();
  const existente = await prisma.tokenCaptura.findUnique({
    where: { dispensacionId },
  });

  if (existente && !existente.usado && existente.expiraEn > ahora) {
    return {
      token: existente.token,
      url: `/captura/${existente.token}`,
      expiraEn: existente.expiraEn,
    };
  }

  const token = nanoid(10);
  const expiraEn = new Date(ahora.getTime() + TOKEN_VIGENCIA_MIN * 60_000);

  const registro = await prisma.tokenCaptura.upsert({
    where: { dispensacionId },
    update: { token, expiraEn, usado: false },
    create: { dispensacionId, token, expiraEn },
  });

  return {
    token: registro.token,
    url: `/captura/${registro.token}`,
    expiraEn: registro.expiraEn,
  };
}

export async function obtenerFotos(dispensacionId: string) {
  return prisma.fotoDispensacion.findMany({
    where: { dispensacionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, tipo: true, imagenUrl: true, createdAt: true },
  });
}

/**
 * Valida un token de captura y devuelve el contexto mínimo que necesita la
 * pantalla móvil. Lanza si el token no existe, ya se usó o expiró — desde el
 * punto de vista del cliente los tres casos son indistinguibles (404), para no
 * filtrar si un token existió alguna vez.
 */
export async function obtenerCapturaPorToken(token: string) {
  const registro = await prisma.tokenCaptura.findUnique({
    where: { token },
    include: {
      dispensacion: {
        select: {
          id: true,
          createdAt: true,
          beneficiario: { select: { nombreCompleto: true } },
          fotos: { select: { tipo: true } },
        },
      },
    },
  });

  if (!registro || registro.usado || registro.expiraEn <= new Date()) {
    throw new Error('Enlace inválido o expirado');
  }

  return {
    dispensacionId: registro.dispensacion.id,
    beneficiario: registro.dispensacion.beneficiario.nombreCompleto,
    fecha: registro.dispensacion.createdAt,
    expiraEn: registro.expiraEn,
    fotosSubidas: registro.dispensacion.fotos.map((f) => f.tipo),
  };
}

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extensionDeMime(mimetype: string): string | null {
  return EXT_POR_MIME[mimetype] ?? null;
}

/**
 * Guarda (o reemplaza) la foto de un tipo para la dispensación asociada al token.
 * Cuando ya están las dos, marca el token como usado para que el enlace deje de
 * servir — es lo que impide que un QR fotografiado siga aceptando subidas.
 */
export async function registrarFotoCaptura(
  token: string,
  tipo: TipoFoto,
  archivo: { buffer: Buffer; mimetype: string }
) {
  const contexto = await obtenerCapturaPorToken(token);
  const ext = extensionDeMime(archivo.mimetype);
  if (!ext) {
    throw new Error('Formato de imagen no permitido. Use JPG, PNG o WEBP');
  }

  const dispensacionId = contexto.dispensacionId;
  const carpeta = path.join(UPLOADS_DISPENSACIONES, dispensacionId);
  fs.mkdirSync(carpeta, { recursive: true });

  // Borrar cualquier archivo previo del mismo tipo (puede tener otra extensión).
  for (const archivoPrevio of fs.readdirSync(carpeta)) {
    if (archivoPrevio.startsWith(`${tipo}.`)) {
      fs.unlinkSync(path.join(carpeta, archivoPrevio));
    }
  }

  const nombreArchivo = `${tipo}.${ext}`;
  fs.writeFileSync(path.join(carpeta, nombreArchivo), archivo.buffer);
  const imagenUrl = `/uploads/dispensaciones/${dispensacionId}/${nombreArchivo}`;

  await prisma.fotoDispensacion.upsert({
    where: { dispensacionId_tipo: { dispensacionId, tipo } },
    update: { imagenUrl, createdAt: new Date() },
    create: { dispensacionId, tipo, imagenUrl },
  });

  const fotos = await prisma.fotoDispensacion.findMany({
    where: { dispensacionId },
    select: { tipo: true },
  });
  const fotosSubidas = fotos.map((f) => f.tipo);

  const completo =
    fotosSubidas.includes('RECETA') && fotosSubidas.includes('EVIDENCIA_ENTREGA');
  if (completo) {
    await prisma.tokenCaptura.update({
      where: { token },
      data: { usado: true },
    });
  }

  return { dispensacionId, fotosSubidas, completo };
}

/** Borra los tokens ya vencidos. Lo llama el cron diario. */
export async function limpiarTokensExpirados(): Promise<number> {
  const { count } = await prisma.tokenCaptura.deleteMany({
    where: { expiraEn: { lt: new Date() } },
  });
  return count;
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
