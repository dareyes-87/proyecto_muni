import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PackageX, Eye, Ban } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listarInventario, detalleMedicamento, darDeBajaLote } from '../api/inventario';
import type { InventarioRow, MedicamentoDetalle } from '../types';
import Semaforo from '../components/ui/Semaforo';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import SearchInput from '../components/ui/SearchInput';
import DataTable, { type Column } from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatFecha } from '../utils/formatDate';

export default function Inventario() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<InventarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const [detalle, setDetalle] = useState<MedicamentoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [bajaLote, setBajaLote] = useState<{ id: string; numero: string } | null>(null);
  const [bajaLoading, setBajaLoading] = useState(false);

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

  const confirmarBaja = async () => {
    if (!bajaLote) return;
    setBajaLoading(true);
    try {
      await darDeBajaLote(bajaLote.id);
      toast.success('Lote dado de baja');
      setBajaLote(null);
      if (detalle) await abrirDetalle(detalle.id);
      cargar();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'No se pudo dar de baja el lote');
    } finally {
      setBajaLoading(false);
    }
  };

  const columns: Column<InventarioRow>[] = [
    {
      header: 'Medicamento',
      cell: (r) => (
        <div>
          <div className="font-medium text-gray-900">{r.nombreGenerico}</div>
          <div className="text-xs text-gray-500">
            {[r.concentracion, r.presentacion].filter(Boolean).join(' · ')}
            {r.nombreComercial ? ` · ${r.nombreComercial}` : ''}
          </div>
        </div>
      ),
    },
    { header: 'Categoría', cell: (r) => <span className="text-gray-600">{r.categoria?.nombre ?? '—'}</span> },
    {
      header: 'Stock',
      align: 'right',
      cell: (r) => (
        <>
          <span className={r.stockBajo ? 'font-semibold text-red-600' : 'text-gray-900'}>{r.stockDisponible}</span>
          <span className="text-xs text-gray-400"> / mín {r.stockMinimo}</span>
        </>
      ),
    },
    { header: 'Lotes', align: 'center', cell: (r) => <span className="text-gray-600">{r.numeroLotes}</span> },
    {
      header: 'Próx. vencimiento',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Semaforo estado={r.semaforo} dias={r.diasProximoVencimiento} />
          <span className="text-xs text-gray-400">{r.proximoVencimiento ? formatFecha(r.proximoVencimiento) : '—'}</span>
        </div>
      ),
    },
    {
      header: '',
      align: 'right',
      cell: (r) => (
        <Button variant="ghost" size="sm" onClick={() => abrirDetalle(r.id)}>
          <Eye size={16} /> Detalle
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Existencias por medicamento con semáforo de vencimiento" />

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre genérico o comercial..."
          className="flex-1"
        />
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

      <DataTable
        columns={columns}
        rows={rows}
        keyFn={(r) => r.id}
        loading={loading}
        empty={
          <span className="flex flex-col items-center text-gray-400">
            <PackageX className="mb-2" size={28} />
            Sin resultados
          </span>
        }
      />

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
                <strong className={detalle.stockBajo ? 'text-red-600' : 'text-gray-900'}>{detalle.stockDisponible}</strong>{' '}
                (mín {detalle.stockMinimo})
              </span>
            </div>

            <h4 className="mb-2 text-sm font-semibold text-gray-700">Lotes</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                            <span className="text-xs text-gray-400">{formatFecha(l.fechaVencimiento)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{l.estado}</td>
                        <td className="px-3 py-2 text-gray-600">{l.ubicacion?.codigo ?? '—'}</td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right">
                            {l.estado !== 'DADO_DE_BAJA' && (
                              <button
                                onClick={() => setBajaLote({ id: l.id, numero: l.numeroLote })}
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

      {/* Confirmación de baja de lote (acción irreversible) */}
      <ConfirmDialog
        open={!!bajaLote}
        title="Dar de baja lote"
        message={
          <>
            ¿Seguro que deseas dar de baja el lote <strong>{bajaLote?.numero}</strong>? Esta acción quedará
            registrada en auditoría y no se puede deshacer.
          </>
        }
        confirmLabel="Dar de baja"
        loading={bajaLoading}
        onConfirm={confirmarBaja}
        onClose={() => setBajaLote(null)}
      />
    </div>
  );
}
