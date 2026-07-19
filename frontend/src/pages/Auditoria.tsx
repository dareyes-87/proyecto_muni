import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { listarAuditoria } from '../api/auditoria';
import { listarUsuarios } from '../api/usuarios';
import type { LogAuditoria, Usuario, AccionAuditoria } from '../types';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

const ACCIONES: AccionAuditoria[] = [
  'CREAR',
  'EDITAR',
  'ELIMINAR',
  'DISPENSAR',
  'BAJA',
  'LOGIN',
  'LOGOUT',
  'ACTIVAR',
  'DESACTIVAR',
];

const ENTIDADES = [
  'Beneficiario',
  'categoria',
  'codigo_barras',
  'configuracion',
  'Dispensacion',
  'entrada',
  'lote',
  'medicamento',
  'proveedor',
  'ubicacion',
  'usuario',
];

const accionBadgeClass: Record<AccionAuditoria, string> = {
  CREAR: 'bg-emerald-100 text-emerald-800',
  EDITAR: 'bg-blue-100 text-blue-800',
  ELIMINAR: 'bg-red-100 text-red-800',
  DISPENSAR: 'bg-purple-100 text-purple-800',
  BAJA: 'bg-amber-100 text-amber-800',
  LOGIN: 'bg-gray-100 text-gray-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  ACTIVAR: 'bg-emerald-100 text-emerald-800',
  DESACTIVAR: 'bg-red-100 text-red-800',
};

const filtrosVacios = {
  usuario: '',
  accion: '' as AccionAuditoria | '',
  entidad: '',
  desde: '',
  hasta: '',
};

const columnHelper = createColumnHelper<LogAuditoria>();

export default function Auditoria() {
  const [rows, setRows] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtros, setFiltros] = useState(filtrosVacios);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarAuditoria({
        page,
        limit: 20,
        usuario: filtros.usuario || undefined,
        accion: filtros.accion || undefined,
        entidad: filtros.entidad || undefined,
        desde: filtros.desde || undefined,
        hasta: filtros.hasta ? `${filtros.hasta}T23:59:59.999` : undefined,
      });
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch {
      toast.error('No se pudo cargar la auditoría');
    } finally {
      setLoading(false);
    }
  }, [page, filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => toast.error('No se pudieron cargar los usuarios'));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filtros]);

  const limpiarFiltros = () => setFiltros(filtrosVacios);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'expandir',
        header: '',
        cell: (info) => {
          const l = info.row.original;
          const abierto = expandedId === l.id;
          return (
            <button
              onClick={() => setExpandedId(abierto ? null : l.id)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          );
        },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Fecha',
        cell: (info) => (
          <span className="whitespace-nowrap text-gray-600">
            {new Date(info.getValue()).toLocaleString('es-GT')}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.usuario?.nombreCompleto ?? '—', {
        id: 'usuario',
        header: 'Usuario',
        cell: (info) => {
          const l = info.row.original;
          return (
            <div>
              <div className="font-medium text-gray-900">{l.usuario?.nombreCompleto ?? '—'}</div>
              {l.usuario?.username && <div className="text-xs text-gray-500">@{l.usuario.username}</div>}
            </div>
          );
        },
      }),
      columnHelper.accessor('accion', {
        header: 'Acción',
        cell: (info) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${accionBadgeClass[info.getValue()]}`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('entidad', {
        header: 'Entidad',
        cell: (info) => <span className="text-gray-600">{info.getValue()}</span>,
      }),
      columnHelper.accessor('ipAddress', {
        header: 'IP',
        cell: (info) => <span className="font-mono text-xs text-gray-500">{info.getValue() ?? '—'}</span>,
      }),
    ],
    [expandedId]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Shield size={22} className="text-primary-700" />
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Usuario</label>
          <select
            value={filtros.usuario}
            onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
            className={inputClass}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Acción</label>
          <select
            value={filtros.accion}
            onChange={(e) => setFiltros({ ...filtros, accion: e.target.value as AccionAuditoria | '' })}
            className={inputClass}
          >
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Entidad</label>
          <select
            value={filtros.entidad}
            onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })}
            className={inputClass}
          >
            <option value="">Todas</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
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
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            onClick={limpiarFiltros}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Limpiar filtros
          </button>
        </div>
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const l = row.original;
                const abierto = expandedId === l.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {abierto && (
                      <tr className="bg-gray-50">
                        <td colSpan={columns.length} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                            {l.entidadId && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-gray-500">ID de entidad: </span>
                                <span className="font-mono text-gray-700">{l.entidadId}</span>
                              </div>
                            )}
                            <div>
                              <div className="mb-1 font-medium text-gray-500">Datos anteriores</div>
                              <pre className="max-h-48 overflow-auto rounded-lg bg-white p-2 text-gray-700 ring-1 ring-gray-200">
                                {l.datosAnteriores ? JSON.stringify(l.datosAnteriores, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <div className="mb-1 font-medium text-gray-500">Datos nuevos</div>
                              <pre className="max-h-48 overflow-auto rounded-lg bg-white p-2 text-gray-700 ring-1 ring-gray-200">
                                {l.datosNuevos ? JSON.stringify(l.datosNuevos, null, 2) : '—'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>{total} registro{total === 1 ? '' : 's'}</span>
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
