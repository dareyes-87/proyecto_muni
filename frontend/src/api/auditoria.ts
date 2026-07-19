import api from './client';
import type { LogAuditoria, CatalogoPagination, AccionAuditoria } from '../types';

export interface AuditoriaFiltros {
  page?: number;
  limit?: number;
  usuario?: string;
  accion?: AccionAuditoria;
  entidad?: string;
  desde?: string;
  hasta?: string;
}

export async function listarAuditoria(
  filtros: AuditoriaFiltros
): Promise<{ data: LogAuditoria[]; pagination: CatalogoPagination }> {
  const { data } = await api.get('/auditoria', { params: filtros });
  return data;
}
