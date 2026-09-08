import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Pencil, Barcode, Power, Trash2, ScanBarcode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  listarMedicamentosPaginado,
  editarMedicamento,
  agregarCodigoBarras,
  eliminarCodigoBarras,
  listarCategorias,
} from '../../api/catalogos';
import type { MedicamentoCatalogo, CategoriaRef } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SearchInput from '../../components/ui/SearchInput';
import { StatusBadge } from '../../components/ui/Badge';
import { inputClass } from '../../components/ui/Field';
import MedicamentoFormModal from '../../components/MedicamentoFormModal';

const columnHelper = createColumnHelper<MedicamentoCatalogo>();

export default function Medicamentos() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<MedicamentoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categorias, setCategorias] = useState<CategoriaRef[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<MedicamentoCatalogo | null>(null);

  const [codigosTarget, setCodigosTarget] = useState<MedicamentoCatalogo | null>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const descripcionRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarMedicamentosPaginado({ page, limit: 20, q: q.trim() || undefined });
      setRows(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch {
      toast.error('No se pudieron cargar los medicamentos');
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => toast.error('No se pudieron cargar las categorías'));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const abrirEditar = (m: MedicamentoCatalogo) => {
    setEditando(m);
    setFormOpen(true);
  };

  const handleToggleActivo = async (m: MedicamentoCatalogo) => {
    try {
      await editarMedicamento(m.id, { activo: !m.activo });
      toast.success(m.activo ? 'Medicamento desactivado' : 'Medicamento activado');
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const abrirCodigos = (m: MedicamentoCatalogo) => {
    setCodigosTarget(m);
    setTimeout(() => {
      if (codigoInputRef.current) codigoInputRef.current.value = '';
      if (descripcionRef.current) descripcionRef.current.value = '';
      codigoInputRef.current?.focus();
    }, 150);
  };

  useEffect(() => {
    if (!codigosTarget) return;
    const handler = (e: KeyboardEvent) => {
      const input = codigoInputRef.current;
      if (!input) return;
      if (document.activeElement === input || document.activeElement === descripcionRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (input.value.trim()) agregarCodigo();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        input.focus();
        input.value += e.key;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [codigosTarget]);

  const agregarCodigo = async () => {
    const codigoValue = codigoInputRef.current?.value?.trim();
    if (!codigosTarget || !codigoValue) {
      toast.error('Escanee o escriba un código de barras');
      codigoInputRef.current?.focus();
      return;
    }
    const descripcionValue = descripcionRef.current?.value?.trim() || null;
    try {
      const creado = await agregarCodigoBarras(codigosTarget.id, {
        codigo: codigoValue,
        descripcion: descripcionValue,
      });
      setCodigosTarget({
        ...codigosTarget,
        codigosBarras: [...(codigosTarget.codigosBarras ?? []), creado],
      });
      if (codigoInputRef.current) codigoInputRef.current.value = '';
      if (descripcionRef.current) descripcionRef.current.value = '';
      toast.success('Código de barras registrado');
      cargar();
      setTimeout(() => codigoInputRef.current?.focus(), 50);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo agregar el código');
      setTimeout(() => codigoInputRef.current?.focus(), 50);
    }
  };

  const quitarCodigo = async (codigoId: string) => {
    if (!codigosTarget) return;
    try {
      await eliminarCodigoBarras(codigoId);
      setCodigosTarget({
        ...codigosTarget,
        codigosBarras: (codigosTarget.codigosBarras ?? []).filter((c) => c.id !== codigoId),
      });
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar el código');
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('nombreGenerico', {
        header: 'Medicamento',
        cell: (info) => {
          const m = info.row.original;
          return (
            <div>
              <div className="font-medium text-gray-900">{m.nombreGenerico}</div>
              <div className="text-xs text-gray-500">
                {[m.concentracion, m.presentacion].filter(Boolean).join(' · ')}
                {m.nombreComercial ? ` · ${m.nombreComercial}` : ''}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.categoria?.nombre ?? '—', {
        id: 'categoria',
        header: 'Categoría',
        cell: (info) => <span className="text-gray-600">{info.getValue()}</span>,
      }),
      columnHelper.accessor('unidadMedida', {
        header: 'Unidad',
        cell: (info) => <span className="text-gray-600">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.codigosBarras?.length ?? 0, {
        id: 'codigos',
        header: 'Códigos de barras',
        cell: (info) => (
          <button
            onClick={() => abrirCodigos(info.row.original)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary-700 hover:bg-primary-50"
          >
            <Barcode size={15} /> {info.getValue()}
          </button>
        ),
      }),
      columnHelper.accessor('activo', {
        header: 'Estado',
        cell: (info) => <StatusBadge activo={info.getValue()} />,
      }),
      ...(isAdmin
        ? [
            columnHelper.display({
              id: 'acciones',
              header: '',
              cell: (info) => {
                const m = info.row.original;
                return (
                  <div className="flex justify-end gap-1">
                    <button onClick={() => abrirEditar(m)} title="Editar" className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleActivo(m)}
                      title={m.activo ? 'Desactivar' : 'Activar'}
                      className={`rounded-md p-1.5 hover:bg-gray-100 ${m.activo ? 'text-red-500' : 'text-emerald-600'}`}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                );
              },
            }),
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <div className="mb-4">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre genérico o comercial..."
          className="sm:max-w-md"
        />
        {isAdmin && (
          <p className="mt-2 text-xs text-gray-400">
            Para registrar un medicamento nuevo, usa el botón «Nuevo medicamento» en Inventario → Registrar entrada.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">Cargando...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">Sin resultados</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-gray-500">Página {page} de {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      {/* Editar medicamento (crear vive en Registrar entrada) */}
      <MedicamentoFormModal
        open={formOpen}
        medicamento={editando}
        categorias={categorias}
        onClose={() => setFormOpen(false)}
        onSaved={() => cargar()}
      />

      {/* Modal gestión de códigos de barras */}
      <Modal open={!!codigosTarget} onClose={() => setCodigosTarget(null)} title={`Códigos de barras — ${codigosTarget?.nombreGenerico ?? ''}`}>
        {codigosTarget && (
          <div>
            <ul className="mb-4 space-y-2">
              {(codigosTarget.codigosBarras ?? []).length === 0 ? (
                <li className="text-sm text-gray-400">Sin códigos registrados</li>
              ) : (
                (codigosTarget.codigosBarras ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <div>
                      <div className="font-mono text-gray-900">{c.codigo}</div>
                      {c.descripcion && <div className="text-xs text-gray-500">{c.descripcion}</div>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => quitarCodigo(c.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
            {isAdmin && (
              <div className="border-t border-gray-200 pt-4">
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  <ScanBarcode size={18} className="shrink-0" />
                  <span>Escanee con la pistola de códigos o escriba el código manualmente</span>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">Código de barras</label>
                    <div className="relative">
                      <Barcode size={16} className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        ref={codigoInputRef}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            agregarCodigo();
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                        placeholder="Escanear o escribir código..."
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-gray-500">Descripción (opcional)</label>
                    <input ref={descripcionRef} className={inputClass} placeholder="Ej: Caja de 20 tabletas" />
                  </div>
                  <Button onClick={() => agregarCodigo()}>Agregar</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
