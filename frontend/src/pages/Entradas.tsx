import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, Barcode, ScanBarcode, FileSpreadsheet, Download, Upload } from 'lucide-react';
import {
  registrarEntrada,
  listarEntradas,
  descargarPlantillaExcel,
  importarExcelInventario,
  type LoteEntradaInput,
} from '../api/inventario';
import { listarMedicamentos, listarProveedores, listarUbicaciones, buscarPorCodigoBarras } from '../api/catalogos';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import type { MedicamentoCatalogo, Proveedor, Ubicacion, Origen, ResumenImportacionExcel } from '../types';

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
  const { isAdmin } = useAuth();
  const [medicamentos, setMedicamentos] = useState<MedicamentoCatalogo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);

  const [proveedorId, setProveedorId] = useState('');
  const [origen, setOrigen] = useState<Origen>('DONACION');
  const [observaciones, setObservaciones] = useState('');
  const [lotes, setLotes] = useState<LoteForm[]>([{ ...loteVacio }]);
  const [guardando, setGuardando] = useState(false);

  const [entradas, setEntradas] = useState<any[]>([]);

  const barcodeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [importOpen, setImportOpen] = useState(false);
  const [archivoImport, setArchivoImport] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<ResumenImportacionExcel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const escanearBarcode = useCallback(async (codigo: string, loteIndex: number) => {
    if (!codigo.trim()) return;
    try {
      const med = await buscarPorCodigoBarras(codigo.trim());
      if (med && med.id) {
        setLotes((prev) => prev.map((l, idx) => (idx === loteIndex ? { ...l, medicamentoId: med.id } : l)));
        toast.success(`${med.nombreGenerico} seleccionado`);
        if (barcodeRefs.current[loteIndex]) {
          barcodeRefs.current[loteIndex]!.value = '';
        }
      } else {
        toast.error('No se encontró medicamento con ese código');
      }
    } catch {
      toast.error('No se encontró medicamento con ese código de barras');
    }
  }, []);

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

  const abrirImport = () => {
    setArchivoImport(null);
    setResultadoImport(null);
    setImportOpen(true);
  };

  const descargarPlantilla = async () => {
    setDescargandoPlantilla(true);
    try {
      const blob = await descargarPlantillaExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-importacion-medicamentos.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar la plantilla');
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  const subirExcel = async () => {
    if (!archivoImport) return toast.error('Seleccione un archivo .xlsx');
    setImportando(true);
    try {
      const resultado = await importarExcelInventario(archivoImport);
      setResultadoImport(resultado);
      if (resultado.lotesRegistrados > 0) {
        toast.success(`${resultado.lotesRegistrados} lote(s) importado(s) correctamente`);
        cargarEntradas();
      }
      if (resultado.errores.length > 0) {
        toast.error(`${resultado.errores.length} fila(s) con errores`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo importar el archivo');
    } finally {
      setImportando(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

  const getMedNombre = (id: string) => {
    const m = medicamentos.find((med) => med.id === id);
    return m ? `${m.nombreGenerico}${m.concentracion ? ` (${m.concentracion})` : ''}` : '';
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registrar Entrada</h1>
        {isAdmin && (
          <button
            onClick={abrirImport}
            className="inline-flex items-center gap-2 rounded-lg border border-primary-700 px-4 py-2 font-medium text-primary-700 hover:bg-primary-50"
          >
            <FileSpreadsheet size={18} /> Importar desde Excel
          </button>
        )}
      </div>

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
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                {/* Fila de escaneo */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Barcode size={16} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      ref={(el) => { barcodeRefs.current[i] = el; }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = barcodeRefs.current[i]?.value;
                          if (val) escanearBarcode(val, i);
                        }
                      }}
                      className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 pl-10 pr-3 text-sm font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                      placeholder="Escanear código de barras del medicamento..."
                      autoComplete="off"
                    />
                  </div>
                  <ScanBarcode size={20} className="shrink-0 text-blue-500" />
                  {l.medicamentoId && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {getMedNombre(l.medicamentoId)}
                    </span>
                  )}
                </div>

                {/* Fila de datos del lote */}
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
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

      {/* Modal de importación masiva por Excel */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar desde Excel" maxWidth="max-w-2xl">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm text-gray-600">
              Descargue la plantilla, complétela con sus medicamentos y lotes, y súbala aquí. Cada fila
              representa un lote de un medicamento.
            </p>
            <button
              type="button"
              onClick={descargarPlantilla}
              disabled={descargandoPlantilla}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={16} /> {descargandoPlantilla ? 'Descargando...' : 'Descargar plantilla Excel'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Archivo completado (.xlsx)</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => setArchivoImport(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
            <button
              type="button"
              onClick={subirExcel}
              disabled={!archivoImport || importando}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
            >
              <Upload size={16} /> {importando ? 'Importando...' : 'Importar'}
            </button>
          </div>

          {resultadoImport && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-800">Resultado</h3>
              <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-2 text-center">
                  <div className="text-lg font-bold text-gray-900">{resultadoImport.totalFilas}</div>
                  <div className="text-xs text-gray-500">Filas leídas</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 text-center">
                  <div className="text-lg font-bold text-emerald-700">{resultadoImport.lotesRegistrados}</div>
                  <div className="text-xs text-emerald-600">Lotes registrados</div>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 text-center">
                  <div className="text-lg font-bold text-blue-700">{resultadoImport.medicamentosCreados}</div>
                  <div className="text-xs text-blue-600">Medicamentos nuevos</div>
                </div>
                <div className="rounded-lg bg-red-50 p-2 text-center">
                  <div className="text-lg font-bold text-red-700">{resultadoImport.errores.length}</div>
                  <div className="text-xs text-red-600">Filas con error</div>
                </div>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                {resultadoImport.medicamentosExistentes} medicamento(s) ya existían · {resultadoImport.categoriasCreadas}{' '}
                categoría(s) nueva(s) · {resultadoImport.proveedoresCreados} proveedor(es) nuevo(s) ·{' '}
                {resultadoImport.ubicacionesCreadas} ubicación(es) nueva(s) · {resultadoImport.codigosBarrasVinculados}{' '}
                código(s) de barras vinculado(s)
              </p>

              {resultadoImport.errores.length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-1 text-xs font-semibold uppercase text-red-600">Errores por fila</h4>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                    {resultadoImport.errores.map((e, i) => (
                      <li key={i}><strong>Fila {e.fila}:</strong> {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {resultadoImport.avisos.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-amber-600">Avisos</h4>
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    {resultadoImport.avisos.map((a, i) => (
                      <li key={i}><strong>Fila {a.fila}:</strong> {a.aviso}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
