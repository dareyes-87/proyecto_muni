import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarCategoriasCompleto, crearCategoria, editarCategoria } from '../../api/catalogos';
import type { Categoria } from '../../types';
import Modal from '../../components/ui/Modal';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

export default function Categorias() {
  const { isAdmin } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      setCategorias(await listarCategoriasCompleto());
    } catch {
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', descripcion: '' });
    setFormOpen(true);
  };

  const abrirEditar = (c: Categoria) => {
    setEditando(c);
    setForm({ nombre: c.nombre, descripcion: c.descripcion ?? '' });
    setFormOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await editarCategoria(editando.id, { nombre: form.nombre, descripcion: form.descripcion || null });
        toast.success('Categoría actualizada');
      } else {
        await crearCategoria({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null });
        toast.success('Categoría creada');
      }
      setFormOpen(false);
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: Categoria) => {
    try {
      await editarCategoria(c.id, { activo: !c.activo });
      toast.success(c.activo ? 'Categoría desactivada' : 'Categoría activada');
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        {isAdmin && (
          <button onClick={abrirNuevo} className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800">
            <Plus size={18} /> Nueva categoría
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Estado</th>
              {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-gray-400">Cargando...</td></tr>
            ) : categorias.length === 0 ? (
              <tr><td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-gray-400">Sin categorías</td></tr>
            ) : (
              categorias.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.descripcion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEditar(c)} title="Editar" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggle(c)}
                          title={c.activo ? 'Desactivar' : 'Activar'}
                          className={`rounded-md p-1.5 hover:bg-gray-100 ${c.activo ? 'text-red-500' : 'text-emerald-600'}`}
                        >
                          <Power size={16} />
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar categoría' : 'Nueva categoría'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} required />
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
