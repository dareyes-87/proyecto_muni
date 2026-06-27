import api from './client';
import type { Usuario, Rol } from '../types';

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get('/usuarios');
  return data;
}

export async function crearUsuario(payload: {
  username: string;
  password: string;
  nombreCompleto: string;
  email?: string;
  rol: Rol;
}): Promise<Usuario> {
  const { data } = await api.post('/usuarios', payload);
  return data;
}

export async function editarUsuario(
  id: string,
  payload: { nombreCompleto?: string; email?: string | null; rol?: Rol }
): Promise<Usuario> {
  const { data } = await api.put(`/usuarios/${id}`, payload);
  return data;
}

export async function toggleUsuario(id: string): Promise<{ id: string; activo: boolean }> {
  const { data } = await api.put(`/usuarios/${id}/toggle`);
  return data;
}

export async function restablecerPassword(id: string, password: string) {
  const { data } = await api.put(`/usuarios/${id}/password`, { password });
  return data;
}
