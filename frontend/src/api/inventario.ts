import api from './client';
import type {
  InventarioRow,
  MedicamentoDetalle,
  Alertas,
  Umbrales,
  Pagination,
} from '../types';

export interface LoteEntradaInput {
  medicamentoId: string;
  cantidad: number;
  numeroLote: string;
  fechaVencimiento: string;
  costoUnitario?: number | null;
  ubicacionId?: string | null;
}

export interface EntradaInput {
  proveedorId: string;
  origen: 'DONACION' | 'PRESUPUESTO_MUNICIPAL';
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

export async function listarEntradas(page = 1) {
  const { data } = await api.get('/inventario/entradas', { params: { page } });
  return data;
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
