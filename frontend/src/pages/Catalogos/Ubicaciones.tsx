import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listarUbicaciones, crearUbicacion, editarUbicacion } from '../../api/catalogos';
import type { Ubicacion } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { Field, TextInput } from '../../components/ui/Field';

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

  const columns: Column<Ubicacion>[] = [
    { header: 'Código', cell: (u) => <span className="font-medium text-gray-900">{u.codigo}</span> },
    { header: 'Descripción', cell: (u) => <span className="text-gray-600">{u.descripcion ?? '—'}</span> },
    {
      header: 'Acciones',
      align: 'right',
      hidden: !isAdmin,
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => abrirEditar(u)} title="Editar" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <Pencil size={16} />
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
            <Plus size={18} /> Nueva ubicación
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={ubicaciones}
        keyFn={(u) => u.id}
        loading={loading}
        emptyMessage="Sin ubicaciones"
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar ubicación' : 'Nueva ubicación'}>
        <form onSubmit={guardar} className="space-y-4">
          <Field label="Código" required>
            <TextInput value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
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
