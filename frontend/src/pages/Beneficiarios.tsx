import { useState, useEffect, useRef } from 'react';
import { UserPlus, Users, Eye, Pencil, X, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import EvidenciaBadge from '../components/ui/EvidenciaBadge';
import type { FotoDispensacion } from '../api/captura';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import DataTable, { type Column } from '../components/ui/DataTable';
import { Field, TextInput, inputClass } from '../components/ui/Field';
import { formatFecha, formatFechaHora } from '../utils/formatDate';

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
    fotos?: FotoDispensacion[];
    detalles: Array<{
      cantidad: number;
      nombreMedicamentoSnapshot: string;
      presentacionSnapshot: string;
      concentracionSnapshot: string | null;
    }>;
  }>;
}

export default function Beneficiarios() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Beneficiario | null>(null);
  const [detalle, setDetalle] = useState<BeneficiarioDetalle | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<FotoDispensacion | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const buscar = async (texto: string) => {
    setLoading(true);
    try {
      const q = texto.trim() || '';
      if (q.length >= 2) {
        const { data } = await api.get(`/dispensacion/beneficiarios/buscar?q=${encodeURIComponent(q)}`);
        setBeneficiarios(data.data || []);
      } else if (q.length === 0) {
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

  const verDetalle = async (id: string) => {
    try {
      const { data } = await api.get(`/dispensacion/beneficiarios/${id}`);
      setDetalle(data);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  // ============================================
  // VISTA DETALLE
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

        <Card>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditando(detalle);
                setShowModal(true);
              }}
            >
              <Pencil size={16} /> Editar
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Historial de dispensaciones ({detalle.dispensaciones.length})
          </h2>

          {detalle.dispensaciones.length === 0 ? (
            <p className="py-6 text-center text-gray-400">No hay dispensaciones registradas</p>
          ) : (
            <div className="space-y-3">
              {detalle.dispensaciones.map((disp) => (
                <div key={disp.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-700">{formatFechaHora(disp.createdAt)}</p>
                      <EvidenciaBadge fotos={disp.fotos} />
                    </div>
                    <p className="text-xs text-gray-400">Atendido por: {disp.usuario.nombreCompleto}</p>
                  </div>

                  <div className="space-y-1">
                    {disp.detalles.map((det, i) => (
                      <p key={i} className="text-sm text-gray-600">
                        • {det.nombreMedicamentoSnapshot} {det.presentacionSnapshot}
                        {det.concentracionSnapshot ? ` ${det.concentracionSnapshot}` : ''}
                        {' — '}
                        <span className="font-medium">{det.cantidad} unid.</span>
                      </p>
                    ))}
                  </div>

                  {disp.observaciones && <p className="mt-2 text-sm italic text-gray-400">{disp.observaciones}</p>}

                  {disp.fotos && disp.fotos.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {disp.fotos.map((foto) => (
                        <button
                          key={foto.id}
                          onClick={() => setFotoAmpliada(foto)}
                          title={foto.tipo === 'RECETA' ? 'Receta' : 'Evidencia de entrega'}
                          className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 hover:border-primary-500"
                        >
                          <img
                            src={foto.imagenUrl}
                            alt={foto.tipo === 'RECETA' ? 'Receta' : 'Evidencia de entrega'}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] text-white">
                            {foto.tipo === 'RECETA' ? 'Receta' : 'Entrega'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {showModal && editando && (
          <ModalBeneficiario
            beneficiario={editando}
            onClose={() => {
              setShowModal(false);
              setEditando(null);
            }}
            onGuardado={async () => {
              setShowModal(false);
              setEditando(null);
              await verDetalle(detalle.id);
              buscar(query);
            }}
          />
        )}

        {fotoAmpliada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setFotoAmpliada(null)}>
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute right-4 top-4 text-white/80 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={28} />
            </button>
            <figure className="max-h-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={fotoAmpliada.imagenUrl}
                alt={fotoAmpliada.tipo === 'RECETA' ? 'Receta' : 'Evidencia de entrega'}
                className="max-h-[80vh] max-w-full rounded-lg object-contain"
              />
              <figcaption className="mt-3 text-center text-sm text-white">
                {fotoAmpliada.tipo === 'RECETA' ? 'Receta' : 'Evidencia de entrega'}
              </figcaption>
            </figure>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // LISTADO PRINCIPAL
  // ============================================
  const columns: Column<Beneficiario>[] = [
    { header: 'Nombre', cell: (b) => <span className="font-medium text-gray-900">{b.nombreCompleto}</span> },
    { header: 'DPI', cell: (b) => <span className="text-gray-600">{b.dpi || '—'}</span> },
    { header: 'Teléfono', className: 'hidden sm:table-cell', cell: (b) => <span className="text-gray-600">{b.telefono || '—'}</span> },
    { header: 'Registrado', className: 'hidden md:table-cell', cell: (b) => <span className="text-gray-500">{b.createdAt ? formatFecha(b.createdAt) : '—'}</span> },
    {
      header: 'Acciones',
      align: 'right',
      cell: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => verDetalle(b.id)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" title="Ver detalle">
            <Eye size={16} />
          </button>
          <button onClick={() => { setEditando(b); setShowModal(true); }} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" title="Editar">
            <Pencil size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Beneficiarios"
        subtitle="Gestión de personas atendidas"
        actions={
          <Button onClick={() => { setEditando(null); setShowModal(true); }}>
            <UserPlus size={18} /> Nuevo beneficiario
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput placeholder="Buscar por nombre o DPI..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        rows={beneficiarios}
        keyFn={(b) => b.id}
        loading={loading}
        empty={
          <span className="flex flex-col items-center text-gray-400">
            <Users size={40} className="mb-2 opacity-50" />
            {query ? 'No se encontraron resultados' : 'No hay beneficiarios registrados'}
          </span>
        }
      />

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <Modal open onClose={onClose} title={esEdicion ? 'Editar beneficiario' : 'Nuevo beneficiario'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre completo" required>
          <TextInput value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} autoFocus />
        </Field>
        <Field label="DPI" hint="Opcional. 13 dígitos.">
          <TextInput
            maxLength={13}
            value={form.dpi}
            onChange={(e) => setForm({ ...form, dpi: e.target.value.replace(/\D/g, '') })}
            placeholder="0000000000000"
          />
        </Field>
        <Field label="Teléfono">
          <TextInput type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </Field>
        <Field label="Dirección">
          <TextInput value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </Field>
        <Field label="Observaciones">
          <textarea
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
