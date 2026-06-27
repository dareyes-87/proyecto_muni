import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Users, Eye, Edit2, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

// ============================================
// TIPOS
// ============================================

interface Beneficiario {
  id: string;
  nombreCompleto: string;
  dpi: string | null;
  telefono: string | null;
  direccion: string | null;
  observaciones: string | null;
  createdAt: string;
}

interface BeneficiarioDetalle extends Beneficiario {
  dispensaciones: Array<{
    id: string;
    createdAt: string;
    observaciones: string | null;
    usuario: { nombreCompleto: string };
    detalles: Array<{
      cantidad: number;
      nombreMedicamentoSnapshot: string;
      presentacionSnapshot: string;
      concentracionSnapshot: string | null;
    }>;
  }>;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Beneficiarios() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Beneficiario | null>(null);
  const [detalle, setDetalle] = useState<BeneficiarioDetalle | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ============================================
  // CARGAR / BUSCAR BENEFICIARIOS
  // ============================================

  const buscar = async (texto: string) => {
    setLoading(true);
    try {
      const q = texto.trim() || '';
      // Si hay query, buscar; si no, traer los más recientes
      if (q.length >= 2) {
        const { data } = await api.get(`/dispensacion/beneficiarios/buscar?q=${encodeURIComponent(q)}`);
        setBeneficiarios(data.data || []);
      } else if (q.length === 0) {
        // Sin query, traer todos (el endpoint maneja vacío)
        const { data } = await api.get('/dispensacion/beneficiarios/buscar?q=');
        setBeneficiarios(data.data || []);
      }
    } catch {
      toast.error('Error al buscar beneficiarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscar('');
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ============================================
  // VER DETALLE
  // ============================================

  const verDetalle = async (id: string) => {
    try {
      const { data } = await api.get(`/dispensacion/beneficiarios/${id}`);
      setDetalle(data);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  // ============================================
  // RENDER — VISTA DETALLE
  // ============================================

  if (detalle) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setDetalle(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={16} /> Volver al listado
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{detalle.nombreCompleto}</h1>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {detalle.dpi && <p>DPI: {detalle.dpi}</p>}
                {detalle.telefono && <p>Teléfono: {detalle.telefono}</p>}
                {detalle.direccion && <p>Dirección: {detalle.direccion}</p>}
                {detalle.observaciones && <p className="italic text-gray-400">{detalle.observaciones}</p>}
              </div>
            </div>
            <button
              onClick={() => {
                setEditando(detalle);
                setShowModal(true);
              }}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Edit2 size={16} /> Editar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historial de dispensaciones ({detalle.dispensaciones.length})
          </h2>

          {detalle.dispensaciones.length === 0 ? (
            <p className="text-gray-400 text-center py-6">No hay dispensaciones registradas</p>
          ) : (
            <div className="space-y-3">
              {detalle.dispensaciones.map((disp) => (
                <div key={disp.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(disp.createdAt).toLocaleDateString('es-GT', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-400">
                      Atendido por: {disp.usuario.nombreCompleto}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {disp.detalles.map((det, i) => (
                      <p key={i} className="text-sm text-gray-600">
                        • {det.nombreMedicamentoSnapshot} {det.presentacionSnapshot}
                        {det.concentracionSnapshot ? ` ${det.concentracionSnapshot}` : ''}
                        {' — '}<span className="font-medium">{det.cantidad} unid.</span>
                      </p>
                    ))}
                  </div>

                  {disp.observaciones && (
                    <p className="text-sm text-gray-400 italic mt-2">{disp.observaciones}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de edición reutilizado */}
        {showModal && editando && (
          <ModalBeneficiario
            beneficiario={editando}
            onClose={() => { setShowModal(false); setEditando(null); }}
            onGuardado={async () => {
              setShowModal(false);
              setEditando(null);
              await verDetalle(detalle.id);
              buscar(query);
            }}
          />
        )}
      </div>
    );
  }

  // ============================================
  // RENDER — LISTADO PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-primary-600" size={28} />
            Beneficiarios
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de personas atendidas</p>
        </div>
        <button
          onClick={() => { setEditando(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <UserPlus size={18} />
          Nuevo beneficiario
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre o DPI..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : beneficiarios.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-2 opacity-50" />
            <p>{query ? 'No se encontraron resultados' : 'No hay beneficiarios registrados'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">DPI</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Registrado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {beneficiarios.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.nombreCompleto}</td>
                    <td className="px-4 py-3 text-gray-600">{b.dpi || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{b.telefono || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('es-GT') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => verDetalle(b.id)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => { setEditando(b); setShowModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <ModalBeneficiario
          beneficiario={editando}
          onClose={() => { setShowModal(false); setEditando(null); }}
          onGuardado={() => {
            setShowModal(false);
            setEditando(null);
            buscar(query);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// MODAL: CREAR / EDITAR BENEFICIARIO
// ============================================

function ModalBeneficiario({
  beneficiario,
  onClose,
  onGuardado,
}: {
  beneficiario: Beneficiario | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const esEdicion = !!beneficiario;
  const [form, setForm] = useState({
    nombreCompleto: beneficiario?.nombreCompleto || '',
    dpi: beneficiario?.dpi || '',
    telefono: beneficiario?.telefono || '',
    direccion: beneficiario?.direccion || '',
    observaciones: beneficiario?.observaciones || '',
  });
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async () => {
    if (!form.nombreCompleto.trim() || form.nombreCompleto.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    if (form.dpi && !/^\d{13}$/.test(form.dpi)) {
      toast.error('El DPI debe tener exactamente 13 dígitos');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombreCompleto: form.nombreCompleto.trim(),
        dpi: form.dpi || null,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        observaciones: form.observaciones || null,
      };

      if (esEdicion) {
        await api.put(`/dispensacion/beneficiarios/${beneficiario!.id}`, payload);
        toast.success('Beneficiario actualizado');
      } else {
        await api.post('/dispensacion/beneficiarios', payload);
        toast.success('Beneficiario registrado');
      }

      onGuardado();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar beneficiario' : 'Nuevo beneficiario'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombreCompleto}
              onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DPI <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              maxLength={13}
              value={form.dpi}
              onChange={(e) => setForm({ ...form, dpi: e.target.value.replace(/\D/g, '') })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0000000000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {esEdicion ? 'Guardar cambios' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
