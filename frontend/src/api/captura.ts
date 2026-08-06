import axios from 'axios';
import api from './client';

export type TipoFoto = 'RECETA' | 'EVIDENCIA_ENTREGA';

export interface FotoDispensacion {
  id: string;
  tipo: TipoFoto;
  imagenUrl: string;
  createdAt?: string;
}

export interface CapturaInfo {
  dispensacionId: string;
  beneficiario: string;
  fecha: string;
  expiraEn: string;
  fotosSubidas: TipoFoto[];
}

export interface TokenCapturaResultado {
  token: string;
  url: string;
  expiraEn: string;
}

// ============================================
// Lado escritorio (requiere sesión → usa el cliente con JWT)
// ============================================

export async function generarTokenCaptura(dispensacionId: string): Promise<TokenCapturaResultado> {
  const { data } = await api.post(`/dispensacion/${dispensacionId}/generar-token`);
  return data;
}

export async function obtenerFotosDispensacion(dispensacionId: string): Promise<FotoDispensacion[]> {
  const { data } = await api.get(`/dispensacion/${dispensacionId}/fotos`);
  return data.data;
}

// ============================================
// Lado celular (SIN sesión)
// ============================================
// Estas llamadas usan una instancia limpia de axios a propósito: el cliente
// compartido inyecta el JWT y, ante un 401/404, redirige a /login. En el celular
// no hay sesión y esa redirección sacaría al usuario de la pantalla de captura.

const publico = axios.create({ baseURL: '/api' });

export async function obtenerInfoCaptura(token: string): Promise<CapturaInfo> {
  const { data } = await publico.get(`/captura/${encodeURIComponent(token)}/info`);
  return data;
}

export async function subirFotoCaptura(
  token: string,
  tipo: TipoFoto,
  archivo: File
): Promise<{ success: boolean; fotosSubidas: TipoFoto[]; completo: boolean }> {
  const formData = new FormData();
  formData.append('foto', archivo);
  formData.append('tipo', tipo);
  const { data } = await publico.post(`/captura/${encodeURIComponent(token)}/foto`, formData);
  return data;
}
