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

const ROLES: { value: Rol; label: string }[] = [
  { value: 'ENCARGADO_BENEFICENCIA', label: 'Encargado de Beneficencia' },
  { value: 'ADMIN', label: 'Administrador' },
];

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <button onClick={abrirNuevo} className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800">
          <UserPlus size={18} /> Nuevo usuario
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último acceso</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Cargando...</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.username}</td>
                  <td className="px-4 py-3 text-gray-700">{u.nombreCompleto}</td>
                  <td className="px-4 py-3 text-gray-600">{u.rol === 'ADMIN' ? 'Administrador' : 'Enc. Beneficencia'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-GT') : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Usuario</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputClass}
              required
              disabled={!!editando}
            />
            {editando && <p className="mt-1 text-xs text-gray-400">El nombre de usuario no se puede cambiar.</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo</label>
            <input value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          {!editando && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} required />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })} className={inputClass}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal reset password */}
      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} title={`Restablecer contraseña — ${pwTarget?.username ?? ''}`}>
        <form onSubmit={guardarPassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</label>
            <input type="password" value={nuevaPw} onChange={(e) => setNuevaPw(e.target.value)} className={inputClass} required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPwTarget(null)} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" className="rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800">Actualizar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
