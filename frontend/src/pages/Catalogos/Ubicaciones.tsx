import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarUbicaciones, crearUbicacion, editarUbicacion } from '../../api/catalogos';
import type { Ubicacion } from '../../types';
import Modal from '../../components/ui/Modal';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

export default function Ubicaciones() {
  const { isAdmin } = useAuth();
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Ubicacion | null>(null);
  const [form, setForm] = useState({ codigo: '', descripcion: '' });
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      setUbicaciones(await listarUbicaciones());
    } catch {
      toast.error('No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ codigo: '', descripcion: '' });
    setFormOpen(true);
  };

  const abrirEditar = (u: Ubicacion) => {
    setEditando(u);
    setForm({ codigo: u.codigo, descripcion: u.descripcion ?? '' });
    setFormOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await editarUbicacion(editando.id, { codigo: form.codigo, descripcion: form.descripcion || null });
        toast.success('Ubicación actualizada');
      } else {
        await crearUbicacion({ codigo: form.codigo.trim(), descripcion: form.descripcion.trim() || null });
        toast.success('Ubicación creada');
      }
      setFormOpen(false);
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ubicaciones / Estantes</h1>
        {isAdmin && (
          <button onClick={abrirNuevo} className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800">
            <Plus size={18} /> Nueva ubicación
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descripción</th>
              {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={isAdmin ? 3 : 2} className="px-4 py-10 text-center text-gray-400">Cargando...</td></tr>
            ) : ubicaciones.length === 0 ? (
              <tr><td colSpan={isAdmin ? 3 : 2} className="px-4 py-10 text-center text-gray-400">Sin ubicaciones</td></tr>
            ) : (
              ubicaciones.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.codigo}</td>
                  <td className="px-4 py-3 text-gray-600">{u.descripcion ?? '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEditar(u)} title="Editar" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar ubicación' : 'Nueva ubicación'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
