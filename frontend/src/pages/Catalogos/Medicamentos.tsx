import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Search, Plus, Pencil, Barcode, Power, Trash2, AlertTriangle, ScanBarcode, Wand2, ImagePlus, Pill } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  listarMedicamentosPaginado,
  crearMedicamento,
  editarMedicamento,
  agregarCodigoBarras,
  eliminarCodigoBarras,
  listarCategorias,
  buscarPorCodigoBarras,
  lookupFda,
  subirImagenMedicamento,
  type MedicamentoInput,
} from '../../api/catalogos';
import type { MedicamentoCatalogo, CategoriaRef } from '../../types';
import Modal from '../../components/ui/Modal';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

const formVacio: MedicamentoInput = {
  nombreGenerico: '',
  nombreComercial: '',
  presentacion: '',
  concentracion: '',
  unidadMedida: '',
  categoriaId: '',
  stockMinimo: 10,
};

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
  const [form, setForm] = useState<MedicamentoInput>(formVacio);
  const [saving, setSaving] = useState(false);
  const [duplicados, setDuplicados] = useState<{ mensaje: string; similares: MedicamentoCatalogo[] } | null>(null);

  const [codigosTarget, setCodigosTarget] = useState<MedicamentoCatalogo | null>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);

  const [scanLoading, setScanLoading] = useState(false);
  const [fdaSugerido, setFdaSugerido] = useState(false);
  const scanNuevoRef = useRef<HTMLInputElement>(null);

  const [imagenSubiendo, setImagenSubiendo] = useState(false);

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

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formVacio);
    setFdaSugerido(false);
    setFormOpen(true);
  };

  const escanearParaNuevo = async (codigo: string) => {
    const val = codigo.trim();
    if (!val) return;
    setScanLoading(true);
    setFdaSugerido(false);
    try {
      let existeLocal = false;
      try {
        const local = await buscarPorCodigoBarras(val);
        if (local?.id) {
          existeLocal = true;
          toast.error(`Este medicamento ya está registrado: ${local.nombreGenerico}`);
        }
      } catch {
        // No existe localmente: seguir a la consulta de OpenFDA.
      }
      if (existeLocal) return;

      const fda = await lookupFda(val);
      if (fda.found) {
        setForm((f) => ({
          ...f,
          nombreGenerico: fda.nombreGenerico || f.nombreGenerico,
          nombreComercial: fda.nombreComercial || f.nombreComercial,
          presentacion: fda.presentacion || f.presentacion,
          concentracion: fda.concentracion || f.concentracion,
          unidadMedida: fda.unidadMedida || f.unidadMedida,
        }));
        setFdaSugerido(true);
        toast.success('Datos sugeridos por OpenFDA — verifique antes de guardar');
      } else {
        toast('No se encontraron datos en OpenFDA para este código. Complete el formulario manualmente.');
      }
    } catch {
      toast.error('No se pudo consultar OpenFDA');
    } finally {
      setScanLoading(false);
      if (scanNuevoRef.current) scanNuevoRef.current.value = '';
    }
  };

  const abrirEditar = (m: MedicamentoCatalogo) => {
    setEditando(m);
    setForm({
      nombreGenerico: m.nombreGenerico,
      nombreComercial: m.nombreComercial ?? '',
      presentacion: m.presentacion,
      concentracion: m.concentracion ?? '',
      unidadMedida: m.unidadMedida,
      categoriaId: m.categoria?.id ?? m.categoriaId ?? '',
      stockMinimo: m.stockMinimo ?? 10,
    });
    setFdaSugerido(false);
    setFormOpen(true);
  };

  const subirFoto = async (file: File) => {
    if (!editando) return;
    setImagenSubiendo(true);
    try {
      const actualizado = await subirImagenMedicamento(editando.id, file);
      setEditando(actualizado);
      setRows((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)));
      toast.success('Foto actualizada');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo subir la foto');
    } finally {
      setImagenSubiendo(false);
    }
  };

  const guardar = async (e: React.FormEvent, forzarCreacion = false) => {
    e.preventDefault();
    if (!form.categoriaId) return toast.error('Seleccione una categoría');
    setSaving(true);
    try {
      if (editando) {
        await editarMedicamento(editando.id, form);
        toast.success('Medicamento actualizado');
        setFormOpen(false);
        cargar();
      } else {
        const res = await crearMedicamento({ ...form, forzarCreacion });
        if (res.advertencia) {
          setDuplicados({ mensaje: res.mensaje, similares: res.similares });
        } else {
          toast.success('Medicamento creado');
          setFormOpen(false);
          setDuplicados(null);
          cargar();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el medicamento');
    } finally {
      setSaving(false);
    }
  };

  const confirmarCreacionForzada = async () => {
    setSaving(true);
    try {
      const res = await crearMedicamento({ ...form, forzarCreacion: true });
      if (!res.advertencia) {
        toast.success('Medicamento creado');
        setFormOpen(false);
        setDuplicados(null);
        cargar();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el medicamento');
    } finally {
      setSaving(false);
    }
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

  const descripcionRef = useRef<HTMLInputElement>(null);

  const abrirCodigos = (m: MedicamentoCatalogo) => {
    setCodigosTarget(m);
    setTimeout(() => {
      if (codigoInputRef.current) {
        codigoInputRef.current.value = '';
      }
      if (descripcionRef.current) {
        descripcionRef.current.value = '';
      }
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
        cell: (info) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              info.getValue() ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {info.getValue() ? 'Activo' : 'Inactivo'}
          </span>
        ),
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Medicamentos</h1>
        {isAdmin && (
          <button
            onClick={abrirNuevo}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 font-medium text-white hover:bg-primary-800"
          >
            <Plus size={18} /> Nuevo medicamento
          </button>
        )}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre genérico o comercial..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
        />
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
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">Página {page} de {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editando ? 'Editar medicamento' : 'Nuevo medicamento'}>
        <form onSubmit={(e) => guardar(e)} className="space-y-4">
          {editando && (
            <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                {editando.imagenUrl ? (
                  <img src={editando.imagenUrl} alt={editando.nombreGenerico} className="h-full w-full object-cover" />
                ) : (
                  <Pill size={28} className="text-gray-300" />
                )}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  <ImagePlus size={16} />
                  {imagenSubiendo ? 'Subiendo...' : 'Subir foto'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={imagenSubiendo}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) subirFoto(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG o WEBP. Máx. 5MB.</p>
              </div>
            </div>
          )}
          {!editando && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-blue-800">
                <ScanBarcode size={16} /> Escanear código de barras (opcional)
              </label>
              <input
                ref={scanNuevoRef}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    escanearParaNuevo(e.currentTarget.value);
                  }
                }}
                disabled={scanLoading}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                placeholder={scanLoading ? 'Consultando...' : 'Escanee o escriba el código y presione Enter'}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-blue-700">
                Se busca primero en el sistema; si no existe, se consulta OpenFDA para auto-completar el formulario.
              </p>
            </div>
          )}
          {fdaSugerido && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Wand2 size={16} className="shrink-0" />
              <span>Datos sugeridos por OpenFDA — verifique antes de guardar</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre genérico</label>
              <input value={form.nombreGenerico} onChange={(e) => setForm({ ...form, nombreGenerico: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre comercial</label>
              <input value={form.nombreComercial ?? ''} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Presentación</label>
              <input value={form.presentacion} onChange={(e) => setForm({ ...form, presentacion: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Concentración</label>
              <input value={form.concentracion ?? ''} onChange={(e) => setForm({ ...form, concentracion: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unidad de medida</label>
              <input value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stock mínimo</label>
              <input
                type="number"
                min={0}
                value={form.stockMinimo ?? 0}
                onChange={(e) => setForm({ ...form, stockMinimo: parseInt(e.target.value, 10) || 0 })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
            <select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} className={inputClass} required>
              <option value="">Seleccione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
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

      {/* Modal advertencia de duplicados */}
      <Modal open={!!duplicados} onClose={() => setDuplicados(null)} title="Posibles duplicados">
        {duplicados && (
          <div>
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{duplicados.mensaje}</span>
            </div>
            <ul className="mb-4 space-y-2">
              {duplicados.similares.map((s) => (
                <li key={s.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <div className="font-medium text-gray-900">{s.nombreGenerico}</div>
                  <div className="text-xs text-gray-500">
                    {[s.concentracion, s.presentacion].filter(Boolean).join(' · ')}
                    {s.nombreComercial ? ` · ${s.nombreComercial}` : ''}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDuplicados(null)} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">
                Revisar de nuevo
              </button>
              <button
                onClick={confirmarCreacionForzada}
                disabled={saving}
                className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? 'Creando...' : 'Crear de todos modos'}
              </button>
            </div>
          </div>
        )}
      </Modal>

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
                  <button type="button" onClick={() => agregarCodigo()} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800">
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
