import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Pencil, KeyRound, Power } from 'lucide-react';
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  toggleUsuario,
  restablecerPassword,
} from '../api/usuarios';
import type { Usuario, Rol } from '../types';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import DataTable, { type Column } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/Badge';
import { Field, TextInput, Select } from '../components/ui/Field';
import { formatFechaHora } from '../utils/formatDate';

const ROLES: { value: Rol; label: string }[] = [
  { value: 'ENCARGADO_BENEFICENCIA', label: 'Encargado de Beneficencia' },
  { value: 'ADMIN', label: 'Administrador' },
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ username: '', password: '', nombreCompleto: '', email: '', rol: 'ENCARGADO_BENEFICENCIA' as Rol });
  const [saving, setSaving] = useState(false);

  const [pwTarget, setPwTarget] = useState<Usuario | null>(null);
  const [nuevaPw, setNuevaPw] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      setUsuarios(await listarUsuarios());
    } catch {
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ username: '', password: '', nombreCompleto: '', email: '', rol: 'ENCARGADO_BENEFICENCIA' });
    setFormOpen(true);
  };

  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    setForm({ username: u.username, password: '', nombreCompleto: u.nombreCompleto, email: u.email ?? '', rol: u.rol });
    setFormOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editando) {
        await editarUsuario(editando.id, {
          nombreCompleto: form.nombreCompleto,
          email: form.email || null,
          rol: form.rol,
        });
        toast.success('Usuario actualizado');
      } else {
        if (form.password.length < 6) {
          setSaving(false);
          return toast.error('La contraseña debe tener al menos 6 caracteres');
        }
        await crearUsuario({
          username: form.username.trim(),
          password: form.password,
          nombreCompleto: form.nombreCompleto.trim(),
          email: form.email.trim() || undefined,
          rol: form.rol,
        });
        toast.success('Usuario creado');
      }
      setFormOpen(false);
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u: Usuario) => {
    try {
      await toggleUsuario(u.id);
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const guardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTarget) return;
    if (nuevaPw.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    try {
      await restablecerPassword(pwTarget.id, nuevaPw);
      toast.success('Contraseña actualizada');
      setPwTarget(null);
      setNuevaPw('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo actualizar la contraseña');
    }
  };

  const columns: Column<Usuario>[] = [
    { header: 'Usuario', cell: (u) => <span className="font-medium text-gray-900">{u.username}</span> },
    { header: 'Nombre', cell: (u) => <span className="text-gray-700">{u.nombreCompleto}</span> },
    { header: 'Rol', cell: (u) => <span className="text-gray-600">{u.rol === 'ADMIN' ? 'Administrador' : 'Enc. Beneficencia'}</span> },
    { header: 'Estado', cell: (u) => <StatusBadge activo={u.activo} /> },
    { header: 'Último acceso', cell: (u) => <span className="text-gray-500">{u.ultimoAcceso ? formatFechaHora(u.ultimoAcceso) : 'Nunca'}</span> },
    {
      header: 'Acciones',
      align: 'right',
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => abrirEditar(u)} title="Editar" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <Pencil size={16} />
          </button>
          <button onClick={() => setPwTarget(u)} title="Restablecer contraseña" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
            <KeyRound size={16} />
          </button>
          <button
            onClick={() => handleToggle(u)}
            title={u.activo ? 'Desactivar' : 'Activar'}
            className={`rounded-md p-1.5 hover:bg-gray-100 ${u.activo ? 'text-red-500' : 'text-emerald-600'}`}
          >
            <Power size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de acceso al sistema"
        actions={
          <Button onClick={abrirNuevo}>
            <UserPlus size={18} /> Nuevo usuario
          </Button>
        }
      />

      <DataTable columns={columns} rows={usuarios} keyFn={(u) => u.id} loading={loading} emptyMessage="Sin usuarios" />

      {/* Modal crear/editar */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={guardar} className="space-y-4">
          <Field label="Usuario" required hint={editando ? 'El nombre de usuario no se puede cambiar.' : undefined}>
            <TextInput
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              disabled={!!editando}
            />
          </Field>
          <Field label="Nombre completo" required>
            <TextInput value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} required />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          {!editando && (
            <Field label="Contraseña" required hint="Mínimo 6 caracteres.">
              <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
          )}
          <Field label="Rol">
            <Select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal reset password */}
      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} title={`Restablecer contraseña — ${pwTarget?.username ?? ''}`}>
        <form onSubmit={guardarPassword} className="space-y-4">
          <Field label="Nueva contraseña" required hint="Mínimo 6 caracteres.">
            <TextInput type="password" value={nuevaPw} onChange={(e) => setNuevaPw(e.target.value)} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPwTarget(null)}>Cancelar</Button>
            <Button type="submit">Actualizar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
