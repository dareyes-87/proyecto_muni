import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarProveedoresPorTipo, crearProveedor, editarProveedor } from '../../api/catalogos';
import type { Proveedor } from '../../types';
import Modal from '../../components/ui/Modal';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

type FiltroTipo = '' | 'INSTITUCION' | 'PERSONA';

const formVacio = { nombre: '', tipo: 'INSTITUCION' as 'INSTITUCION' | 'PERSONA', contacto: '', notas: '' };

export default function Proveedores() {
  const { isAdmin } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [form, setForm] = useState(formVacio);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setProveedores(await listarProveedoresPorTipo(filtroTipo || undefined));
    } catch {
      toast.error('No se pudieron cargar los proveedores');
    } finally {
      setLoading(false);
    }
  }, [filtroTipo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formVacio);
    setFormOpen(true);
  };

  const abrirEditar = (p: Proveedor) => {
    setEditando(p);
    setForm({ nombre: p.nombre, tipo: p.tipo, contacto: p.contacto ?? '', notas: p.notas ?? '' });
    setFormOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await editarProveedor(editando.id, {
          nombre: form.nombre,
          tipo: form.tipo,
          contacto: form.contacto || null,
          notas: form.notas || null,
        });
        toast.success('Proveedor actualizado');
      } else {
        await crearProveedor({
          nombre: form.nombre.trim(),
          tipo: form.tipo,
          contacto: form.contacto.trim() || null,
          notas: form.notas.trim() || null,
        });
        toast.success('Proveedor creado');
      }
      setFormOpen(false);
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Proveedor) => {
    try {
      await editarProveedor(p.id, { activo: !p.activo });
      toast.success(p.activo ? 'Proveedor desactivado' : 'Proveedor activado');
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores / Donantes</h1>
        {isAdmin && (
          <button onClick={abrirNuevo} className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800">
            <Plus size={18} /> Nuevo proveedor
          </button>
        )}
      </div>

      <div className="mb-4">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)} className={`${inputClass} max-w-xs`}>
          <option value="">Todos los tipos</option>
          <option value="INSTITUCION">Institución</option>
          <option value="PERSONA">Persona</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Estado</th>
              {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-gray-400">Cargando...</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-gray-400">Sin proveedores</td></tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{p.tipo === 'INSTITUCION' ? 'Institución' : 'Persona'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.contacto ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => abrirEditar(p)} title="Editar" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleToggle(p)}
                          title={p.activo ? 'Desactivar' : 'Activar'}
                          className={`rounded-md p-1.5 hover:bg-gray-100 ${p.activo ? 'text-red-500' : 'text-emerald-600'}`}
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar proveedor' : 'Nuevo proveedor'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'INSTITUCION' | 'PERSONA' })} className={inputClass}>
              <option value="INSTITUCION">Institución</option>
              <option value="PERSONA">Persona</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contacto</label>
            <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className={inputClass} placeholder="Teléfono, email, etc." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
            <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={inputClass} />
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
