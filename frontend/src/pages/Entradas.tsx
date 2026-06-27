import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save } from 'lucide-react';
import {
  registrarEntrada,
  listarEntradas,
  type LoteEntradaInput,
} from '../api/inventario';
import { listarMedicamentos, listarProveedores, listarUbicaciones } from '../api/catalogos';
import type { MedicamentoCatalogo, Proveedor, Ubicacion, Origen } from '../types';

interface LoteForm {
  medicamentoId: string;
  cantidad: string;
  numeroLote: string;
  fechaVencimiento: string;
  costoUnitario: string;
  ubicacionId: string;
}

const loteVacio: LoteForm = {
  medicamentoId: '',
  cantidad: '',
  numeroLote: '',
  fechaVencimiento: '',
  costoUnitario: '',
  ubicacionId: '',
};

export default function Entradas() {
  const [medicamentos, setMedicamentos] = useState<MedicamentoCatalogo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);

  const [proveedorId, setProveedorId] = useState('');
  const [origen, setOrigen] = useState<Origen>('DONACION');
  const [observaciones, setObservaciones] = useState('');
  const [lotes, setLotes] = useState<LoteForm[]>([{ ...loteVacio }]);
  const [guardando, setGuardando] = useState(false);

  const [entradas, setEntradas] = useState<any[]>([]);

  const cargarEntradas = async () => {
    try {
      const res = await listarEntradas();
      setEntradas(res.data);
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    Promise.all([listarMedicamentos(), listarProveedores(), listarUbicaciones()])
      .then(([meds, provs, ubis]) => {
        setMedicamentos(meds);
        setProveedores(provs);
        setUbicaciones(ubis);
        if (provs.length === 1) setProveedorId(provs[0].id);
      })
      .catch(() => toast.error('No se pudieron cargar los catálogos'));
    cargarEntradas();
  }, []);

  const setLote = (i: number, campo: keyof LoteForm, valor: string) => {
    setLotes((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  };
  const agregarLote = () => setLotes((prev) => [...prev, { ...loteVacio }]);
  const quitarLote = (i: number) => setLotes((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorId) return toast.error('Seleccione un proveedor');

    const lotesValidados: LoteEntradaInput[] = [];
    for (const l of lotes) {
      if (!l.medicamentoId || !l.cantidad || !l.numeroLote || !l.fechaVencimiento) {
        return toast.error('Complete medicamento, cantidad, número de lote y vencimiento en cada lote');
      }
      const cantidad = parseInt(l.cantidad, 10);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return toast.error('La cantidad debe ser mayor a 0');
      }
      lotesValidados.push({
        medicamentoId: l.medicamentoId,
        cantidad,
        numeroLote: l.numeroLote.trim(),
        fechaVencimiento: l.fechaVencimiento,
        costoUnitario: l.costoUnitario ? parseFloat(l.costoUnitario) : null,
        ubicacionId: l.ubicacionId || null,
      });
    }

    setGuardando(true);
    try {
      await registrarEntrada({
        proveedorId,
        origen,
        observaciones: observaciones.trim() || null,
        lotes: lotesValidados,
      });
      toast.success('Entrada registrada');
      setObservaciones('');
      setLotes([{ ...loteVacio }]);
      cargarEntradas();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo registrar la entrada');
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Registrar Entrada</h1>

      <form onSubmit={submit} className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Proveedor / Donante</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputClass}>
              <option value="">Seleccione...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Origen</label>
            <select value={origen} onChange={(e) => setOrigen(e.target.value as Origen)} className={inputClass}>
              <option value="DONACION">Donación</option>
              <option value="PRESUPUESTO_MUNICIPAL">Presupuesto municipal</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Observaciones</label>
            <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputClass} placeholder="Opcional" />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Lotes</h2>
            <button type="button" onClick={agregarLote} className="inline-flex items-center gap-1 text-sm text-primary-700 hover:text-primary-900">
              <Plus size={16} /> Agregar lote
            </button>
          </div>

          <div className="space-y-3">
            {lotes.map((l, i) => (
              <div key={i} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">Medicamento</label>
                  <select value={l.medicamentoId} onChange={(e) => setLote(i, 'medicamentoId', e.target.value)} className={inputClass}>
                    <option value="">Seleccione...</option>
                    {medicamentos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombreGenerico} {m.concentracion ? `(${m.concentracion})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">N° lote</label>
                  <input value={l.numeroLote} onChange={(e) => setLote(i, 'numeroLote', e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs text-gray-500">Cant.</label>
                  <input type="number" min={1} value={l.cantidad} onChange={(e) => setLote(i, 'cantidad', e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Vence</label>
                  <input type="date" value={l.fechaVencimiento} onChange={(e) => setLote(i, 'fechaVencimiento', e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Ubicación</label>
                  <select value={l.ubicacionId} onChange={(e) => setLote(i, 'ubicacionId', e.target.value)} className={inputClass}>
                    <option value="">—</option>
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>{u.codigo}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  {origen === 'PRESUPUESTO_MUNICIPAL' && (
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-500">Costo unit.</label>
                      <input type="number" step="0.01" min={0} value={l.costoUnitario} onChange={(e) => setLote(i, 'costoUnitario', e.target.value)} className={inputClass} />
                    </div>
                  )}
                  {lotes.length > 1 && (
                    <button type="button" onClick={() => quitarLote(i)} className="mb-0.5 rounded-md p-2 text-red-500 hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 font-medium text-white hover:bg-primary-800 disabled:opacity-50"
          >
            <Save size={18} /> {guardando ? 'Guardando...' : 'Registrar entrada'}
          </button>
        </div>
      </form>

      {/* Historial reciente */}
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Entradas recientes</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3 text-center">Lotes</th>
              <th className="px-4 py-3">Registró</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entradas.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin entradas registradas</td></tr>
            ) : (
              entradas.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(e.createdAt).toLocaleString('es-GT')}</td>
                  <td className="px-4 py-3 text-gray-900">{e.proveedor?.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{e.origen === 'DONACION' ? 'Donación' : 'Presupuesto'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{e._count?.lotes ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.usuario?.nombreCompleto}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
