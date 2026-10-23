import api from './client';
import type {
  InventarioRow,
  MedicamentoDetalle,
  Alertas,
  Umbrales,
  Pagination,
  ResumenImportacionExcel,
} from '../types';

export interface LoteEntradaInput {
  medicamentoId: string;
  cantidad: number;
  numeroLote: string;
  fechaVencimiento: string;
  ubicacionId?: string | null;
}

export interface EntradaInput {
  observaciones?: string | null;
  lotes: LoteEntradaInput[];
}

export async function listarInventario(params: {
  q?: string;
  categoriaId?: string;
  soloStockBajo?: boolean;
  page?: number;
}): Promise<{ data: InventarioRow[]; pagination: Pagination }> {
  const { data } = await api.get('/inventario', { params });
  return data;
}

export async function detalleMedicamento(id: string): Promise<MedicamentoDetalle> {
  const { data } = await api.get(`/inventario/medicamento/${id}`);
  return data.data;
}

export async function obtenerAlertas(): Promise<Alertas> {
  const { data } = await api.get('/inventario/alertas');
  return data.data;
}

export async function registrarEntrada(entrada: EntradaInput) {
  const { data } = await api.post('/inventario/entradas', entrada);
  return data;
}

/** Lote de una entrada tal como lo muestra el historial: lo recibido, no la existencia actual. */
export interface LoteHistorial {
  id: string;
  numeroLote: string;
  cantidad: number;
  fechaVencimiento: string;
  medicamento: { nombreGenerico: string; concentracion: string | null };
  ubicacion: { codigo: string } | null;
}

interface EntradaBase {
  id: string;
  createdAt: string;
  observaciones: string | null;
  usuario: { id: string; nombreCompleto: string };
}

/** Fila del historial: solo los primeros lotes; el total viene en `_count.lotes`. */
export interface EntradaResumen extends EntradaBase {
  _count: { lotes: number };
  lotes: LoteHistorial[];
}

export interface EntradaDetalle extends EntradaBase {
  lotes: LoteHistorial[];
}

export async function listarEntradas(page = 1): Promise<{ data: EntradaResumen[]; pagination: Pagination }> {
  const { data } = await api.get('/inventario/entradas', { params: { page } });
  return data;
}

export async function detalleEntrada(id: string): Promise<EntradaDetalle> {
  const { data } = await api.get(`/inventario/entradas/${id}`);
  return data.data;
}

export async function darDeBajaLote(loteId: string, motivo?: string) {
  const { data } = await api.put(`/inventario/lotes/${loteId}/baja`, { motivo });
  return data.data;
}

export async function obtenerConfiguracion(): Promise<Umbrales> {
  const { data } = await api.get('/inventario/configuracion');
  return data.data;
}

export async function actualizarConfiguracion(umbrales: Umbrales): Promise<Umbrales> {
  const { data } = await api.put('/inventario/configuracion', umbrales);
  return data.data;
}

// ============================================
// IMPORTACIÓN MASIVA POR EXCEL
// ============================================

export async function descargarPlantillaExcel(): Promise<Blob> {
  const { data } = await api.get('/inventario/plantilla-excel', { responseType: 'blob' });
  return data;
}

export async function importarExcelInventario(archivo: File): Promise<ResumenImportacionExcel> {
  const formData = new FormData();
  formData.append('archivo', archivo);
  const { data } = await api.post('/inventario/importar-excel', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}
