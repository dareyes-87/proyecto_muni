import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarCategoriasCompleto, crearCategoria, editarCategoria } from '../../api/catalogos';
import type { Categoria } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { Field, TextInput } from '../../components/ui/Field';

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

  const columns: Column<Categoria>[] = [
    { header: 'Nombre', cell: (c) => <span className="font-medium text-gray-900">{c.nombre}</span> },
    { header: 'Descripción', cell: (c) => <span className="text-gray-600">{c.descripcion ?? '—'}</span> },
    { header: 'Estado', cell: (c) => <StatusBadge activo={c.activo} /> },
    {
      header: 'Acciones',
      align: 'right',
      hidden: !isAdmin,
      cell: (c) => (
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
      ),
    },
  ];

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button onClick={abrirNuevo}>
            <Plus size={18} /> Nueva categoría
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={categorias}
        keyFn={(c) => c.id}
        loading={loading}
        emptyMessage="Sin categorías"
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar categoría' : 'Nueva categoría'}>
        <form onSubmit={guardar} className="space-y-4">
          <Field label="Nombre" required>
            <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </Field>
          <Field label="Descripción">
            <TextInput value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
