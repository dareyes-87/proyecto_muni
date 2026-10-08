import { AccionAuditoria } from '@prisma/client';
import { prisma } from '../config/prisma';

interface AuditParams {
  usuarioId: string;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string;
  datosAnteriores?: object | null;
  datosNuevos?: object | null;
  ipAddress?: string;
}

export async function registrarAuditoria(params: AuditParams): Promise<void> {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: params.usuarioId,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId || null,
        datosAnteriores: params.datosAnteriores || undefined,
        datosNuevos: params.datosNuevos || undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}
