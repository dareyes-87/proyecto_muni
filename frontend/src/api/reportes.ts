import api from './client';
import type {
  CatalogoPagination,
  ReporteDispensacionRow,
  ReporteConsumoRow,
  ReporteInventarioRow,
  ReportePorVencerRow,
  ReporteEntradaRow,
  ReporteBajaRow,
} from '../types';

interface ConPaginacion<T> {
  data: T[];
  pagination: CatalogoPagination;
}

export async function reporteDispensaciones(
  params: Record<string, unknown>
): Promise<ConPaginacion<ReporteDispensacionRow>> {
  const { data } = await api.get('/reportes/dispensaciones', { params });
  return data;
}

export async function reporteConsumoMedicamentos(
  params: Record<string, unknown>
): Promise<ConPaginacion<ReporteConsumoRow>> {
  const { data } = await api.get('/reportes/consumo-medicamentos', { params });
  return data;
}

export async function reporteInventarioActual(
  params: Record<string, unknown>
): Promise<ConPaginacion<ReporteInventarioRow>> {
  const { data } = await api.get('/reportes/inventario-actual', { params });
  return data;
}

export async function reportePorVencer(
  params: Record<string, unknown>
): Promise<ConPaginacion<ReportePorVencerRow> & { umbralDias: number }> {
  const { data } = await api.get('/reportes/por-vencer', { params });
  return data;
}

export async function reporteEntradasProveedor(
  params: Record<string, unknown>
): Promise<ConPaginacion<ReporteEntradaRow>> {
  const { data } = await api.get('/reportes/entradas-proveedor', { params });
  return data;
}

export async function reporteMedicamentosBaja(
  params: Record<string, unknown>
): Promise<ConPaginacion<ReporteBajaRow> & { resumen: { totalUnidadesPerdidas: number; costoTotalEstimado: number } }> {
  const { data } = await api.get('/reportes/medicamentos-baja', { params });
  return data;
}

export type TipoReporte = 'dispensaciones' | 'consumo' | 'inventario' | 'por-vencer' | 'entradas' | 'baja';

export async function exportarReporte(
  tipo: TipoReporte,
  formato: 'pdf' | 'xlsx',
  params: Record<string, unknown>
): Promise<Blob> {
  const { data } = await api.get(`/reportes/exportar/${tipo}/${formato}`, {
    params,
    responseType: 'blob',
  });
  return data;
}

export async function extraerErrorDeBlob(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const texto = await data.text();
      return JSON.parse(texto).error || 'No se pudo exportar el reporte';
    } catch {
      return 'No se pudo exportar el reporte';
    }
  }
  return (data as { error?: string })?.error || 'No se pudo exportar el reporte';
}
