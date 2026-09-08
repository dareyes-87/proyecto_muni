import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ScanBarcode, Wand2, ImagePlus, Pill } from 'lucide-react';
import {
  crearMedicamento,
  editarMedicamento,
  buscarPorCodigoBarras,
  lookupFda,
  subirImagenMedicamento,
  type MedicamentoInput,
} from '../api/catalogos';
import type { MedicamentoCatalogo, CategoriaRef } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Field, TextInput, Select } from './ui/Field';

const formVacio: MedicamentoInput = {
  nombreGenerico: '',
  nombreComercial: '',
  presentacion: '',
  concentracion: '',
  unidadMedida: '',
  categoriaId: '',
  stockMinimo: 10,
};

interface Props {
  open: boolean;
  /** null = crear; un medicamento = editar. */
  medicamento: MedicamentoCatalogo | null;
  categorias: CategoriaRef[];
  onClose: () => void;
  /** Se llama con el medicamento creado/actualizado tras guardar. */
  onSaved: (m: MedicamentoCatalogo) => void;
}

/**
 * Modal reutilizable para crear/editar un medicamento. Encapsula el escaneo +
 * autocompletado OpenFDA, la detección de duplicados y (al editar) la foto.
 * Lo usan la página de Catálogos (editar) y Registrar entrada (crear al vuelo).
 */
export default function MedicamentoFormModal({ open, medicamento, categorias, onClose, onSaved }: Props) {
  const [current, setCurrent] = useState<MedicamentoCatalogo | null>(medicamento);
  const [form, setForm] = useState<MedicamentoInput>(formVacio);
  const [saving, setSaving] = useState(false);
  const [duplicados, setDuplicados] = useState<{ mensaje: string; similares: MedicamentoCatalogo[] } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [fdaSugerido, setFdaSugerido] = useState(false);
  const [imagenSubiendo, setImagenSubiendo] = useState(false);
  const scanNuevoRef = useRef<HTMLInputElement>(null);

  // Reinicia el formulario cada vez que se abre o cambia el medicamento objetivo.
  useEffect(() => {
    if (!open) return;
    setCurrent(medicamento);
    setDuplicados(null);
    setFdaSugerido(false);
    if (medicamento) {
      setForm({
        nombreGenerico: medicamento.nombreGenerico,
        nombreComercial: medicamento.nombreComercial ?? '',
        presentacion: medicamento.presentacion,
        concentracion: medicamento.concentracion ?? '',
        unidadMedida: medicamento.unidadMedida,
        categoriaId: medicamento.categoria?.id ?? medicamento.categoriaId ?? '',
        stockMinimo: medicamento.stockMinimo ?? 10,
      });
    } else {
      setForm(formVacio);
    }
  }, [open, medicamento]);

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

  const subirFoto = async (file: File) => {
    if (!current) return;
    setImagenSubiendo(true);
    try {
      const actualizado = await subirImagenMedicamento(current.id, file);
      setCurrent(actualizado);
      onSaved(actualizado);
      toast.success('Foto actualizada');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo subir la foto');
    } finally {
      setImagenSubiendo(false);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoriaId) return toast.error('Seleccione una categoría');
    setSaving(true);
    try {
      if (current) {
        const upd = await editarMedicamento(current.id, form);
        toast.success('Medicamento actualizado');
        onSaved(upd);
        onClose();
      } else {
        const res = await crearMedicamento({ ...form });
        if (res.advertencia) {
          setDuplicados({ mensaje: res.mensaje, similares: res.similares });
        } else {
          toast.success('Medicamento creado');
          setDuplicados(null);
          onSaved(res.data);
          onClose();
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
        setDuplicados(null);
        onSaved(res.data);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el medicamento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={current ? 'Editar medicamento' : 'Nuevo medicamento'}>
        <form onSubmit={guardar} className="space-y-4">
          {current && (
            <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                {current.imagenUrl ? (
                  <img src={current.imagenUrl} alt={current.nombreGenerico} className="h-full w-full object-cover" />
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
          {!current && (
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
            <Field label="Nombre genérico" required>
              <TextInput value={form.nombreGenerico} onChange={(e) => setForm({ ...form, nombreGenerico: e.target.value })} required />
            </Field>
            <Field label="Nombre comercial">
              <TextInput value={form.nombreComercial ?? ''} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} />
            </Field>
            <Field label="Presentación" required>
              <TextInput value={form.presentacion} onChange={(e) => setForm({ ...form, presentacion: e.target.value })} required />
            </Field>
            <Field label="Concentración">
              <TextInput value={form.concentracion ?? ''} onChange={(e) => setForm({ ...form, concentracion: e.target.value })} />
            </Field>
            <Field label="Unidad de medida" required>
              <TextInput value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} required />
            </Field>
            <Field label="Stock mínimo">
              <TextInput
                type="number"
                min={0}
                value={form.stockMinimo ?? 0}
                onChange={(e) => setForm({ ...form, stockMinimo: parseInt(e.target.value, 10) || 0 })}
              />
            </Field>
          </div>
          <Field label="Categoría" required>
            <Select value={form.categoriaId} onChange={(e) => setForm({ ...form, categoriaId: e.target.value })} required>
              <option value="">Seleccione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Advertencia de duplicados */}
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
              <Button variant="secondary" onClick={() => setDuplicados(null)}>Revisar de nuevo</Button>
              <button
                onClick={confirmarCreacionForzada}
                disabled={saving}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? 'Creando...' : 'Crear de todos modos'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
