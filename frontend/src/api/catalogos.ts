import api from './client';
import type { MedicamentoCatalogo, Proveedor, Ubicacion, CategoriaRef } from '../types';

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
