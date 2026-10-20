import api from './client';
import type {
  MedicamentoCatalogo,
  Ubicacion,
  CategoriaRef,
  Categoria,
  CodigoBarras,
  CatalogoPagination,
} from '../types';

export async function listarMedicamentos(q?: string): Promise<MedicamentoCatalogo[]> {
  const { data } = await api.get('/catalogos/medicamentos', { params: q ? { q } : {} });
  return data.data;
}

/**
 * Trae TODOS los medicamentos recorriendo todas las páginas del backend (que
 * pagina de a 20/100). Lo usa el formulario de Registrar entrada para que el
 * selector y el escaneo encuentren cualquier medicamento, no solo los primeros
 * 20 (H-24).
 */
export async function listarMedicamentosTodos(): Promise<MedicamentoCatalogo[]> {
  const limit = 100;
  const primera = await api.get('/catalogos/medicamentos', { params: { page: 1, limit } });
  let todos = (primera.data.data as MedicamentoCatalogo[]) ?? [];
  const totalPages = primera.data.pagination?.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    const { data } = await api.get('/catalogos/medicamentos', { params: { page, limit } });
    todos = todos.concat((data.data as MedicamentoCatalogo[]) ?? []);
  }
  return todos;
}

export async function listarUbicaciones(): Promise<Ubicacion[]> {
  const { data } = await api.get('/catalogos/ubicaciones');
  return data.data;
}

export async function listarCategorias(): Promise<CategoriaRef[]> {
  const { data } = await api.get('/catalogos/categorias');
  return data.data;
}

export async function listarCategoriasCompleto(incluirInactivos = false): Promise<Categoria[]> {
  const { data } = await api.get('/catalogos/categorias', {
    params: incluirInactivos ? { incluirInactivos: true } : {},
  });
  return data.data;
}

// ============================================
// MEDICAMENTOS (CRUD completo)
// ============================================

export async function listarMedicamentosPaginado(params: {
  page?: number;
  limit?: number;
  q?: string;
  incluirInactivos?: boolean;
}): Promise<{ data: MedicamentoCatalogo[]; pagination: CatalogoPagination }> {
  const { data } = await api.get('/catalogos/medicamentos', { params });
  return data;
}

export async function buscarMedicamentos(q: string): Promise<MedicamentoCatalogo[]> {
  const { data } = await api.get('/catalogos/medicamentos/buscar', { params: { q } });
  return data.data;
}

export async function buscarPorCodigoBarras(
  codigo: string
): Promise<MedicamentoCatalogo & { stockActual: number }> {
  const { data } = await api.get(`/catalogos/medicamentos/barcode/${encodeURIComponent(codigo)}`);
  return data.data;
}

export interface LookupFdaResultado {
  found: boolean;
  nombreGenerico?: string | null;
  nombreComercial?: string | null;
  presentacion?: string | null;
  concentracion?: string | null;
  unidadMedida?: string | null;
  categoriaSugerida?: string | null;
}

export async function lookupFda(codigo: string): Promise<LookupFdaResultado> {
  const { data } = await api.get(`/catalogos/medicamentos/lookup-fda/${encodeURIComponent(codigo)}`);
  return data;
}

export async function subirImagenMedicamento(id: string, archivo: File): Promise<MedicamentoCatalogo> {
  const formData = new FormData();
  formData.append('imagen', archivo);
  const { data } = await api.post(`/catalogos/medicamentos/${id}/imagen`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return data.data;
}

export interface MedicamentoInput {
  nombreGenerico: string;
  nombreComercial?: string | null;
  presentacion: string;
  concentracion?: string | null;
  unidadMedida: string;
  categoriaId: string;
  stockMinimo?: number;
  forzarCreacion?: boolean;
}

export type CrearMedicamentoResultado =
  | { advertencia: true; mensaje: string; similares: MedicamentoCatalogo[] }
  | { advertencia?: undefined; data: MedicamentoCatalogo };

export async function crearMedicamento(payload: MedicamentoInput): Promise<CrearMedicamentoResultado> {
  const { data } = await api.post('/catalogos/medicamentos', payload);
  return data;
}

export async function editarMedicamento(
  id: string,
  payload: Partial<MedicamentoInput> & { activo?: boolean }
): Promise<MedicamentoCatalogo> {
  const { data } = await api.put(`/catalogos/medicamentos/${id}`, payload);
  return data.data;
}

export async function agregarCodigoBarras(
  medicamentoId: string,
  payload: { codigo: string; descripcion?: string | null }
): Promise<CodigoBarras> {
  const { data } = await api.post(`/catalogos/medicamentos/${medicamentoId}/codigos`, payload);
  return data.data;
}

export async function eliminarCodigoBarras(id: string): Promise<void> {
  await api.delete(`/catalogos/codigos/${id}`);
}

// ============================================
// CATEGORÍAS (CRUD completo)
// ============================================

export async function crearCategoria(payload: { nombre: string; descripcion?: string | null }): Promise<Categoria> {
  const { data } = await api.post('/catalogos/categorias', payload);
  return data.data;
}

export async function editarCategoria(
  id: string,
  payload: { nombre?: string; descripcion?: string | null; activo?: boolean }
): Promise<Categoria> {
  const { data } = await api.put(`/catalogos/categorias/${id}`, payload);
  return data.data;
}

// ============================================
// UBICACIONES / ESTANTES (CRUD completo)
// ============================================

export async function crearUbicacion(payload: { codigo: string; descripcion?: string | null }): Promise<Ubicacion> {
  const { data } = await api.post('/catalogos/ubicaciones', payload);
  return data.data;
}

export async function editarUbicacion(
  id: string,
  payload: { codigo?: string; descripcion?: string | null }
): Promise<Ubicacion> {
  const { data } = await api.put(`/catalogos/ubicaciones/${id}`, payload);
  return data.data;
}
