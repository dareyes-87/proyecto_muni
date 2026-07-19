import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { FileBarChart, FileText, FileSpreadsheet, X } from 'lucide-react';
import api from '../api/client';
import {
  reporteDispensaciones,
  reporteConsumoMedicamentos,
  reporteInventarioActual,
  reportePorVencer,
  reporteEntradasProveedor,
  reporteMedicamentosBaja,
  exportarReporte,
  extraerErrorDeBlob,
  type TipoReporte,
} from '../api/reportes';
import { listarCategorias, listarProveedores, buscarMedicamentos } from '../api/catalogos';
import Semaforo from '../components/ui/Semaforo';
import type { CategoriaRef, Proveedor } from '../types';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

const TIPOS: { value: TipoReporte; label: string }[] = [
  { value: 'dispensaciones', label: 'Dispensaciones' },
  { value: 'consumo', label: 'Consumo por medicamento' },
  { value: 'inventario', label: 'Inventario actual' },
  { value: 'por-vencer', label: 'Por vencer' },
  { value: 'entradas', label: 'Entradas por proveedor' },
  { value: 'baja', label: 'Dados de baja' },
];

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-GT');
const fmtDT = (iso: string) => new Date(iso).toLocaleString('es-GT');
const quetzales = (n: number) => `Q${n.toFixed(2)}`;

const filtrosVacios = {
  desde: '',
  hasta: '',
  beneficiarioId: '',
  beneficiarioLabel: '',
  medicamentoId: '',
  medicamentoLabel: '',
  categoriaId: '',
  proveedorId: '',
  origen: '' as '' | 'DONACION' | 'PRESUPUESTO_MUNICIPAL',
  estado: '' as '' | 'DISPONIBLE' | 'AGOTADO' | 'VENCIDO' | 'DADO_DE_BAJA',
  dias: 90,
};

interface Opcion {
  id: string;
  label: string;
}

function BuscadorInline({
  label,
  placeholder,
  valorId,
  valorLabel,
  onSeleccionar,
  onLimpiar,
  buscar,
}: {
  label: string;
  placeholder: string;
  valorId: string;
  valorLabel: string;
  onSeleccionar: (id: string, label: string) => void;
  onLimpiar: () => void;
  buscar: (q: string) => Promise<Opcion[]>;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Opcion[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      buscar(q)
        .then((r) => {
          setResultados(r);
          setAbierto(true);
        })
        .catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q, buscar]);

  if (valorId) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
        <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <span className="truncate">{valorLabel}</span>
          <button type="button" onClick={onLimpiar} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => resultados.length > 0 && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder}
        className={inputClass}
      />
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onSeleccionar(r.id, r.label);
                  setQ('');
                  setAbierto(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const columnHelper = createColumnHelper<any>();

export default function Reportes() {
  const [tipo, setTipo] = useState<TipoReporte>('dispensaciones');
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [filas, setFilas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<{ totalUnidadesPerdidas: number; costoTotalEstimado: number } | null>(null);
  const [categorias, setCategorias] = useState<CategoriaRef[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [exportando, setExportando] = useState<'pdf' | 'xlsx' | null>(null);

  useEffect(() => {
    listarCategorias().catch(() => []).then((r) => setCategorias(r ?? []));
    listarProveedores().catch(() => []).then((r) => setProveedores(r ?? []));
  }, []);

  useEffect(() => {
    setFiltros(filtrosVacios);
    setPage(1);
  }, [tipo]);

  useEffect(() => {
    setPage(1);
  }, [filtros]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const base = { page, limit: 20 };
      const hasta = filtros.hasta ? `${filtros.hasta}T23:59:59.999` : undefined;

      switch (tipo) {
        case 'dispensaciones': {
          const res = await reporteDispensaciones({
            ...base,
            desde: filtros.desde || undefined,
            hasta,
            beneficiarioId: filtros.beneficiarioId || undefined,
            medicamentoId: filtros.medicamentoId || undefined,
          });
          setFilas(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
          setResumen(null);
          break;
        }
        case 'consumo': {
          const res = await reporteConsumoMedicamentos({
            ...base,
            desde: filtros.desde || undefined,
            hasta,
            categoriaId: filtros.categoriaId || undefined,
          });
          setFilas(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
          setResumen(null);
          break;
        }
        case 'inventario': {
          const res = await reporteInventarioActual({
            ...base,
            categoriaId: filtros.categoriaId || undefined,
            origen: filtros.origen || undefined,
            estado: filtros.estado || undefined,
          });
          setFilas(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
          setResumen(null);
          break;
        }
        case 'por-vencer': {
          const res = await reportePorVencer({ ...base, dias: filtros.dias || undefined });
          setFilas(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
          setResumen(null);
          break;
        }
        case 'entradas': {
          const res = await reporteEntradasProveedor({
            ...base,
            desde: filtros.desde || undefined,
            hasta,
            proveedorId: filtros.proveedorId || undefined,
            origen: filtros.origen || undefined,
          });
          setFilas(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
          setResumen(null);
          break;
        }
        case 'baja': {
          const res = await reporteMedicamentosBaja({ ...base, desde: filtros.desde || undefined, hasta });
          setFilas(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
          setResumen(res.resumen);
          break;
        }
      }
    } catch {
      toast.error('No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [tipo, filtros, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const buscarBeneficiarios = useCallback(async (q: string): Promise<Opcion[]> => {
    const { data } = await api.get('/dispensacion/beneficiarios/buscar', { params: { q } });
    return (data.data as { id: string; nombreCompleto: string; dpi: string | null }[]).map((b) => ({
      id: b.id,
      label: b.dpi ? `${b.nombreCompleto} · ${b.dpi}` : b.nombreCompleto,
    }));
  }, []);

  const buscarMeds = useCallback(async (q: string): Promise<Opcion[]> => {
    const meds = await buscarMedicamentos(q);
    return meds.map((m) => ({ id: m.id, label: `${m.nombreGenerico} · ${m.presentacion}` }));
  }, []);

  const construirFiltrosExport = (): Record<string, unknown> => {
    const f: Record<string, unknown> = {};
    if (filtros.desde) f.desde = filtros.desde;
    if (filtros.hasta) f.hasta = `${filtros.hasta}T23:59:59.999`;
    if (tipo === 'dispensaciones') {
      if (filtros.beneficiarioId) f.beneficiarioId = filtros.beneficiarioId;
      if (filtros.medicamentoId) f.medicamentoId = filtros.medicamentoId;
    }
    if (tipo === 'consumo' && filtros.categoriaId) f.categoriaId = filtros.categoriaId;
    if (tipo === 'inventario') {
      if (filtros.categoriaId) f.categoriaId = filtros.categoriaId;
      if (filtros.origen) f.origen = filtros.origen;
      if (filtros.estado) f.estado = filtros.estado;
    }
    if (tipo === 'por-vencer' && filtros.dias) f.dias = filtros.dias;
    if (tipo === 'entradas') {
      if (filtros.proveedorId) f.proveedorId = filtros.proveedorId;
      if (filtros.origen) f.origen = filtros.origen;
    }
    return f;
  };

  const handleExportar = async (formato: 'pdf' | 'xlsx') => {
    setExportando(formato);
    try {
      const blob = await exportarReporte(tipo, formato, construirFiltrosExport());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}-${Date.now()}.${formato}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Reporte exportado');
    } catch (err) {
      toast.error(await extraerErrorDeBlob(err));
    } finally {
      setExportando(null);
    }
  };

  const columns = useMemo(() => {
    switch (tipo) {
      case 'dispensaciones':
        return [
          columnHelper.accessor('createdAt', { header: 'Fecha', cell: (i) => fmtDT(i.getValue()) }),
          columnHelper.accessor((r) => r.beneficiario.nombreCompleto, { id: 'beneficiario', header: 'Beneficiario' }),
          columnHelper.accessor((r) => r.beneficiario.dpi ?? '—', { id: 'dpi', header: 'DPI' }),
          columnHelper.display({
            id: 'medicamentos',
            header: 'Medicamentos',
            cell: (i) => (
              <div className="space-y-0.5">
                {i.row.original.medicamentos.map((m: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-600">
                    {m.nombreGenerico} · {m.presentacion} × {m.cantidad}
                  </div>
                ))}
              </div>
            ),
          }),
          columnHelper.accessor((r) => r.usuario.nombreCompleto, { id: 'usuario', header: 'Usuario' }),
        ];
      case 'consumo':
        return [
          columnHelper.accessor('nombreGenerico', { header: 'Medicamento' }),
          columnHelper.accessor('presentacion', { header: 'Presentación' }),
          columnHelper.accessor('categoria', { header: 'Categoría' }),
          columnHelper.accessor('cantidadTotalDispensada', { header: 'Cant. total dispensada' }),
          columnHelper.accessor('numeroDispensaciones', { header: 'N.º dispensaciones' }),
        ];
      case 'inventario':
        return [
          columnHelper.accessor((r) => r.medicamento.nombreGenerico, { id: 'medicamento', header: 'Medicamento' }),
          columnHelper.accessor('numeroLote', { header: 'Lote' }),
          columnHelper.accessor((r) => r.codigoBarras ?? '—', { id: 'codigoBarras', header: 'Cód. barras' }),
          columnHelper.accessor('cantidadActual', { header: 'Cantidad' }),
          columnHelper.accessor((r) => fmt(r.fechaVencimiento), { id: 'vence', header: 'Vence' }),
          columnHelper.display({
            id: 'semaforo',
            header: 'Semáforo',
            cell: (i) => <Semaforo estado={i.row.original.semaforo} dias={i.row.original.diasParaVencer} />,
          }),
          columnHelper.accessor((r) => r.ubicacion?.codigo ?? '—', { id: 'ubicacion', header: 'Ubicación' }),
          columnHelper.accessor('proveedor', { header: 'Proveedor' }),
        ];
      case 'por-vencer':
        return [
          columnHelper.accessor((r) => r.medicamento.nombreGenerico, { id: 'medicamento', header: 'Medicamento' }),
          columnHelper.accessor('numeroLote', { header: 'Lote' }),
          columnHelper.accessor((r) => r.codigoBarras ?? '—', { id: 'codigoBarras', header: 'Cód. barras' }),
          columnHelper.accessor('cantidadActual', { header: 'Cantidad' }),
          columnHelper.accessor((r) => fmt(r.fechaVencimiento), { id: 'vence', header: 'Vence' }),
          columnHelper.accessor('diasParaVencer', { header: 'Días' }),
          columnHelper.display({
            id: 'semaforo',
            header: 'Semáforo',
            cell: (i) => <Semaforo estado={i.row.original.semaforo} dias={i.row.original.diasParaVencer} />,
          }),
          columnHelper.accessor((r) => r.ubicacion?.codigo ?? '—', { id: 'ubicacion', header: 'Ubicación' }),
        ];
      case 'entradas':
        return [
          columnHelper.accessor((r) => fmtDT(r.createdAt), { id: 'fecha', header: 'Fecha' }),
          columnHelper.accessor('proveedor', { header: 'Proveedor' }),
          columnHelper.accessor('origen', { header: 'Origen' }),
          columnHelper.accessor('usuario', { header: 'Usuario' }),
          columnHelper.accessor('totalLotes', { header: 'N.º lotes' }),
          columnHelper.accessor('totalUnidades', { header: 'Unidades' }),
          columnHelper.accessor((r) => quetzales(r.costoTotal), { id: 'costoTotal', header: 'Costo total' }),
        ];
      case 'baja':
        return [
          columnHelper.accessor((r) => r.medicamento.nombreGenerico, { id: 'medicamento', header: 'Medicamento' }),
          columnHelper.accessor('numeroLote', { header: 'Lote' }),
          columnHelper.accessor('estado', { header: 'Estado' }),
          columnHelper.accessor((r) => fmt(r.fechaVencimiento), { id: 'vencimiento', header: 'Vencimiento' }),
          columnHelper.accessor('cantidadPerdida', { header: 'Cant. perdida' }),
          columnHelper.accessor((r) => (r.costoEstimado != null ? quetzales(r.costoEstimado) : '—'), {
            id: 'costoEstimado',
            header: 'Costo estimado',
          }),
          columnHelper.accessor('proveedor', { header: 'Proveedor' }),
        ];
      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const table = useReactTable({ data: filas, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <FileBarChart size={22} className="text-primary-700" />
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTipo(t.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tipo === t.value ? 'bg-primary-700 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {(tipo === 'dispensaciones' || tipo === 'consumo' || tipo === 'entradas' || tipo === 'baja') && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
              <input
                type="date"
                value={filtros.desde}
                onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
              <input
                type="date"
                value={filtros.hasta}
                onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
                className={inputClass}
              />
            </div>
          </>
        )}

        {tipo === 'dispensaciones' && (
          <>
            <BuscadorInline
              label="Beneficiario"
              placeholder="Buscar por nombre o DPI..."
              valorId={filtros.beneficiarioId}
              valorLabel={filtros.beneficiarioLabel}
              onSeleccionar={(id, label) => setFiltros({ ...filtros, beneficiarioId: id, beneficiarioLabel: label })}
              onLimpiar={() => setFiltros({ ...filtros, beneficiarioId: '', beneficiarioLabel: '' })}
              buscar={buscarBeneficiarios}
            />
            <BuscadorInline
              label="Medicamento"
              placeholder="Buscar medicamento..."
              valorId={filtros.medicamentoId}
              valorLabel={filtros.medicamentoLabel}
              onSeleccionar={(id, label) => setFiltros({ ...filtros, medicamentoId: id, medicamentoLabel: label })}
              onLimpiar={() => setFiltros({ ...filtros, medicamentoId: '', medicamentoLabel: '' })}
              buscar={buscarMeds}
            />
          </>
        )}

        {(tipo === 'consumo' || tipo === 'inventario') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Categoría</label>
            <select
              value={filtros.categoriaId}
              onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })}
              className={inputClass}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {(tipo === 'inventario' || tipo === 'entradas') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Origen</label>
            <select
              value={filtros.origen}
              onChange={(e) => setFiltros({ ...filtros, origen: e.target.value as typeof filtros.origen })}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="DONACION">Donación</option>
              <option value="PRESUPUESTO_MUNICIPAL">Presupuesto municipal</option>
            </select>
          </div>
        )}

        {tipo === 'inventario' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Estado del lote</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as typeof filtros.estado })}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="AGOTADO">Agotado</option>
              <option value="VENCIDO">Vencido</option>
              <option value="DADO_DE_BAJA">Dado de baja</option>
            </select>
          </div>
        )}

        {tipo === 'por-vencer' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Umbral de días</label>
            <select
              value={filtros.dias}
              onChange={(e) => setFiltros({ ...filtros, dias: parseInt(e.target.value, 10) })}
              className={inputClass}
            >
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        )}

        {tipo === 'entradas' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Proveedor</label>
            <select
              value={filtros.proveedorId}
              onChange={(e) => setFiltros({ ...filtros, proveedorId: e.target.value })}
              className={inputClass}
            >
              <option value="">Todos</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button onClick={() => setFiltros(filtrosVacios)} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            Limpiar filtros
          </button>
        </div>
      </div>

      {resumen && (
        <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div>
            <span className="font-medium">Unidades perdidas:</span> {resumen.totalUnidadesPerdidas}
          </div>
          <div>
            <span className="font-medium">Costo total estimado:</span> {quetzales(resumen.costoTotalEstimado)}
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => handleExportar('pdf')}
          disabled={exportando !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <FileText size={16} /> {exportando === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
        </button>
        <button
          onClick={() => handleExportar('xlsx')}
          disabled={exportando !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <FileSpreadsheet size={16} /> {exportando === 'xlsx' ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                  Cargando...
                </td>
              </tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>
          {total} registro{total === 1 ? '' : 's'}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
