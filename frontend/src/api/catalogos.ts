import api from './client';
import type {
  MedicamentoCatalogo,
  Proveedor,
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

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data } = await api.get('/catalogos/proveedores');
  return data.data;
}

export async function listarUbicaciones(): Promise<Ubicacion[]> {
  const { data } = await api.get('/catalogos/ubicaciones');
  return data.data;
}

export async function listarCategorias(): Promise<CategoriaRef[]> {
  const { data } = await api.get('/catalogos/categorias');
  return data.data;
}

export async function listarCategoriasCompleto(): Promise<Categoria[]> {
  const { data } = await api.get('/catalogos/categorias');
  return data.data;
}

// ============================================
// MEDICAMENTOS (CRUD completo)
// ============================================

export async function listarMedicamentosPaginado(params: {
  page?: number;
  limit?: number;
  q?: string;
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
// PROVEEDORES / DONANTES (CRUD completo)
// ============================================

export async function listarProveedoresPorTipo(tipo?: 'INSTITUCION' | 'PERSONA'): Promise<Proveedor[]> {
  const { data } = await api.get('/catalogos/proveedores', { params: tipo ? { tipo } : {} });
  return data.data;
}

export async function crearProveedor(payload: {
  nombre: string;
  tipo: 'INSTITUCION' | 'PERSONA';
  contacto?: string | null;
  notas?: string | null;
}): Promise<Proveedor> {
  const { data } = await api.post('/catalogos/proveedores', payload);
  return data.data;
}

export async function editarProveedor(
  id: string,
  payload: {
    nombre?: string;
    tipo?: 'INSTITUCION' | 'PERSONA';
    contacto?: string | null;
    notas?: string | null;
    activo?: boolean;
  }
): Promise<Proveedor> {
  const { data } = await api.put(`/catalogos/proveedores/${id}`, payload);
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
