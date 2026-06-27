import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, PackageX, Eye, Ban } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  listarInventario,
  detalleMedicamento,
  darDeBajaLote,
} from '../api/inventario';
import type { InventarioRow, MedicamentoDetalle } from '../types';
import Semaforo from '../components/ui/Semaforo';
import Modal from '../components/ui/Modal';

function fmtFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Inventario() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<InventarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const [detalle, setDetalle] = useState<MedicamentoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarInventario({ q: q.trim() || undefined, soloStockBajo });
      setRows(res.data);
    } catch {
      toast.error('No se pudo cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, [q, soloStockBajo]);

  // Búsqueda con debounce.
  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  const abrirDetalle = async (id: string) => {
    setDetalleLoading(true);
    setDetalle(null);
    try {
      setDetalle(await detalleMedicamento(id));
    } catch {
      toast.error('No se pudo cargar el detalle');
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleBaja = async (loteId: string) => {
    if (!confirm('¿Dar de baja este lote? Esta acción quedará registrada en auditoría.')) return;
    try {
      await darDeBajaLote(loteId);
      toast.success('Lote dado de baja');
      if (detalle) await abrirDetalle(detalle.id);
      cargar();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'No se pudo dar de baja el lote');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Inventario</h1>

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre genérico o comercial..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={soloStockBajo}
            onChange={(e) => setSoloStockBajo(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          Solo stock bajo
        </label>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Medicamento</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-center">Lotes</th>
              <th className="px-4 py-3">Próx. vencimiento</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Cargando...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  <PackageX className="mx-auto mb-2" size={28} />
                  Sin resultados
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.nombreGenerico}</div>
                    <div className="text-xs text-gray-500">
                      {[r.concentracion, r.presentacion].filter(Boolean).join(' · ')}
                      {r.nombreComercial ? ` · ${r.nombreComercial}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.categoria?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={r.stockBajo ? 'font-semibold text-red-600' : 'text-gray-900'}>
                      {r.stockDisponible}
                    </span>
                    <span className="text-xs text-gray-400"> / mín {r.stockMinimo}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.numeroLotes}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Semaforo estado={r.semaforo} dias={r.diasProximoVencimiento} />
                      <span className="text-xs text-gray-400">{fmtFecha(r.proximoVencimiento)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirDetalle(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-primary-700 hover:bg-primary-50"
                    >
                      <Eye size={16} /> Detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      <Modal
        open={detalleLoading || !!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? detalle.nombreGenerico : 'Detalle'}
        maxWidth="max-w-3xl"
      >
        {detalleLoading || !detalle ? (
          <p className="py-6 text-center text-gray-400">Cargando...</p>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              <span>{[detalle.concentracion, detalle.presentacion].filter(Boolean).join(' · ')}</span>
              <span>Categoría: {detalle.categoria?.nombre ?? '—'}</span>
              <span>
                Stock disponible:{' '}
                <strong className={detalle.stockBajo ? 'text-red-600' : 'text-gray-900'}>
                  {detalle.stockDisponible}
                </strong>{' '}
                (mín {detalle.stockMinimo})
              </span>
            </div>

            <h4 className="mb-2 text-sm font-semibold text-gray-700">Lotes</h4>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Lote</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2">Vence</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Ubicación</th>
                    {isAdmin && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detalle.lotes.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-3 py-6 text-center text-gray-400">
                        Sin lotes registrados
                      </td>
                    </tr>
                  ) : (
                    detalle.lotes.map((l) => (
                      <tr key={l.id} className={l.estado === 'DADO_DE_BAJA' ? 'opacity-50' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-800">{l.numeroLote}</td>
                        <td className="px-3 py-2 text-right">{l.cantidadActual}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Semaforo estado={l.semaforo} dias={l.diasParaVencer} />
                            <span className="text-xs text-gray-400">{fmtFecha(l.fechaVencimiento)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{l.estado}</td>
                        <td className="px-3 py-2 text-gray-600">{l.ubicacion?.codigo ?? '—'}</td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right">
                            {l.estado !== 'DADO_DE_BAJA' && (
                              <button
                                onClick={() => handleBaja(l.id)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                <Ban size={14} /> Dar de baja
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
