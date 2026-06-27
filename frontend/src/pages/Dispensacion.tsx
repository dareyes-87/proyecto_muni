import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HandHeart, Search, UserPlus, Plus, Trash2, X,
  AlertCircle, CheckCircle, Package, Barcode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

// ============================================
// TIPOS
// ============================================

interface Beneficiario {
  id: string;
  nombreCompleto: string;
  dpi: string | null;
  telefono: string | null;
}

interface Medicamento {
  id: string;
  nombreGenerico: string;
  presentacion: string;
  concentracion: string | null;
  unidadMedida: string;
}

interface StockInfo {
  stockTotal: number;
  vencimientoProximo: string | null;
}

interface ItemCarrito {
  medicamento: Medicamento;
  cantidad: number;
  stock: StockInfo;
}

interface DispensacionReciente {
  id: string;
  createdAt: string;
  observaciones: string | null;
  detalles: Array<{
    cantidad: number;
    nombreMedicamentoSnapshot: string;
    presentacionSnapshot: string;
    concentracionSnapshot: string | null;
  }>;
}

// ============================================
// HELPERS
// ============================================

function semaforo(fechaVencimiento: string | null): { color: string; label: string } {
  if (!fechaVencimiento) return { color: 'gray', label: 'Sin datos' };
  const dias = Math.floor((new Date(fechaVencimiento).getTime() - Date.now()) / 86400000);
  if (dias < 0) return { color: 'red', label: 'VENCIDO' };
  if (dias < 30) return { color: 'red', label: `${dias}d` };
  if (dias < 90) return { color: 'yellow', label: `${dias}d` };
  return { color: 'green', label: `${dias}d` };
}

function SemaforoBadge({ fecha }: { fecha: string | null }) {
  const { color, label } = semaforo(fecha);
  const clases: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clases[color]}`}>
      {label}
    </span>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Dispensacion() {
  // --- Estado del flujo ---
  const [beneficiario, setBeneficiario] = useState<Beneficiario | null>(null);
  const [historialReciente, setHistorialReciente] = useState<DispensacionReciente[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [despachando, setDespachando] = useState(false);
  const [exitoso, setExitoso] = useState(false);

  // --- Búsqueda de beneficiario ---
  const [queryBenef, setQueryBenef] = useState('');
  const [resultadosBenef, setResultadosBenef] = useState<Beneficiario[]>([]);
  const [buscandoBenef, setBuscandoBenef] = useState(false);
  const [showDropdownBenef, setShowDropdownBenef] = useState(false);
  const [showModalBenef, setShowModalBenef] = useState(false);
  const debounceRefBenef = useRef<ReturnType<typeof setTimeout>>();

  // --- Búsqueda de medicamento ---
  const [queryMed, setQueryMed] = useState('');
  const [resultadosMed, setResultadosMed] = useState<Medicamento[]>([]);
  const [buscandoMed, setBuscandoMed] = useState(false);
  const [showDropdownMed, setShowDropdownMed] = useState(false);
  const debounceRefMed = useRef<ReturnType<typeof setTimeout>>();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // BUSCAR BENEFICIARIO
  // ============================================

  useEffect(() => {
    if (queryBenef.length < 2) {
      setResultadosBenef([]);
      setShowDropdownBenef(false);
      return;
    }
    clearTimeout(debounceRefBenef.current);
    debounceRefBenef.current = setTimeout(async () => {
      setBuscandoBenef(true);
      try {
        const { data } = await api.get(`/dispensacion/beneficiarios/buscar?q=${encodeURIComponent(queryBenef)}`);
        setResultadosBenef(data.data || []);
        setShowDropdownBenef(true);
      } catch {
        toast.error('Error al buscar beneficiario');
      } finally {
        setBuscandoBenef(false);
      }
    }, 300);
    return () => clearTimeout(debounceRefBenef.current);
  }, [queryBenef]);

  const seleccionarBeneficiario = useCallback(async (b: Beneficiario) => {
    setBeneficiario(b);
    setQueryBenef('');
    setShowDropdownBenef(false);
    setResultadosBenef([]);
    try {
      const { data } = await api.get(`/dispensacion/beneficiarios/${b.id}`);
      setHistorialReciente((data.dispensaciones || []).slice(0, 5));
    } catch {
      setHistorialReciente([]);
    }
  }, []);

  // ============================================
  // BUSCAR MEDICAMENTO (texto)
  // ============================================

  useEffect(() => {
    if (queryMed.length < 2) {
      setResultadosMed([]);
      setShowDropdownMed(false);
      return;
    }
    clearTimeout(debounceRefMed.current);
    debounceRefMed.current = setTimeout(async () => {
      setBuscandoMed(true);
      try {
        const { data } = await api.get(`/catalogos/medicamentos/buscar?q=${encodeURIComponent(queryMed)}`);
        setResultadosMed(data.data || data || []);
        setShowDropdownMed(true);
      } catch {
        toast.error('Error al buscar medicamento');
      } finally {
        setBuscandoMed(false);
      }
    }, 300);
    return () => clearTimeout(debounceRefMed.current);
  }, [queryMed]);

  // ============================================
  // ESCANEO DE CÓDIGO DE BARRAS
  // ============================================

  const [codigoBarras, setCodigoBarras] = useState('');

  const buscarPorBarcode = async (codigo: string) => {
    if (!codigo.trim()) return;
    try {
      const { data } = await api.get(`/catalogos/medicamentos/barcode/${encodeURIComponent(codigo.trim())}`);
      const med = data.data || data;
      if (med && med.id) {
        await agregarAlCarrito(med);
      } else {
        toast.error('No se encontró medicamento con ese código');
      }
    } catch {
      toast.error('No se encontró medicamento con ese código de barras');
    }
    setCodigoBarras('');
  };

  // ============================================
  // CARRITO
  // ============================================

  const agregarAlCarrito = async (med: Medicamento) => {
    const yaEnCarrito = carrito.find((i) => i.medicamento.id === med.id);
    if (yaEnCarrito) {
      toast.error('Este medicamento ya está en la lista');
      return;
    }

    try {
      const { data: stock } = await api.get(`/dispensacion/stock/${med.id}`);
      if (stock.stockTotal <= 0) {
        toast.error(`${med.nombreGenerico} no tiene stock disponible`);
        return;
      }
      setCarrito((prev) => [...prev, { medicamento: med, cantidad: 1, stock }]);
      setQueryMed('');
      setShowDropdownMed(false);
      setResultadosMed([]);
    } catch {
      toast.error('Error al consultar stock');
    }
  };

  const actualizarCantidad = (medId: string, cantidad: number) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.medicamento.id !== medId) return item;
        const cantidadFinal = Math.max(1, Math.min(cantidad, item.stock.stockTotal));
        return { ...item, cantidad: cantidadFinal };
      })
    );
  };

  const quitarDelCarrito = (medId: string) => {
    setCarrito((prev) => prev.filter((i) => i.medicamento.id !== medId));
  };

  // ============================================
  // CONFIRMAR DISPENSACIÓN
  // ============================================

  const confirmarDispensacion = async () => {
    if (!beneficiario) {
      toast.error('Seleccione un beneficiario');
      return;
    }
    if (carrito.length === 0) {
      toast.error('Agregue al menos un medicamento');
      return;
    }

    setDespachando(true);
    try {
      await api.post('/dispensacion/despachar', {
        beneficiarioId: beneficiario.id,
        observaciones: observaciones || null,
        items: carrito.map((i) => ({
          medicamentoId: i.medicamento.id,
          cantidad: i.cantidad,
        })),
      });

      toast.success('Dispensación registrada correctamente');
      setExitoso(true);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al registrar dispensación';
      toast.error(msg);
    } finally {
      setDespachando(false);
    }
  };

  const nuevaDispensacion = () => {
    setBeneficiario(null);
    setHistorialReciente([]);
    setCarrito([]);
    setObservaciones('');
    setExitoso(false);
    setQueryBenef('');
  };

  // ============================================
  // RENDER — ÉXITO
  // ============================================

  if (exitoso) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <CheckCircle size={64} className="mx-auto text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">Dispensación registrada</h2>
        <p className="text-gray-500">
          Se entregaron {carrito.length} medicamento(s) a{' '}
          <span className="font-medium">{beneficiario?.nombreCompleto}</span>
        </p>
        <button
          onClick={nuevaDispensacion}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Nueva dispensación
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER — FLUJO PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HandHeart className="text-primary-600" size={28} />
          Dispensación
        </h1>
        <p className="text-sm text-gray-500 mt-1">Entrega de medicamentos a beneficiarios</p>
      </div>

      {/* ================================================ */}
      {/* PASO 1: SELECCIONAR BENEFICIARIO */}
      {/* ================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          1. Beneficiario
        </h2>

        {beneficiario ? (
          <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div>
              <p className="font-medium text-gray-900">{beneficiario.nombreCompleto}</p>
              <p className="text-sm text-gray-500">
                {beneficiario.dpi ? `DPI: ${beneficiario.dpi}` : 'Sin DPI'}
                {beneficiario.telefono ? ` | Tel: ${beneficiario.telefono}` : ''}
              </p>
            </div>
            <button
              onClick={() => { setBeneficiario(null); setHistorialReciente([]); }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o DPI..."
                  value={queryBenef}
                  onChange={(e) => setQueryBenef(e.target.value)}
                  onFocus={() => resultadosBenef.length > 0 && setShowDropdownBenef(true)}
                  onBlur={() => setTimeout(() => setShowDropdownBenef(false), 200)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
                {buscandoBenef && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Dropdown resultados */}
                {showDropdownBenef && resultadosBenef.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {resultadosBenef.map((b) => (
                      <button
                        key={b.id}
                        onMouseDown={() => seleccionarBeneficiario(b)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="font-medium text-sm text-gray-900">{b.nombreCompleto}</p>
                        <p className="text-xs text-gray-500">{b.dpi || 'Sin DPI'}</p>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdownBenef && queryBenef.length >= 2 && resultadosBenef.length === 0 && !buscandoBenef && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 text-center text-sm text-gray-500">
                    No se encontraron resultados
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowModalBenef(true)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"
                title="Registrar nuevo"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
            </div>
          </div>
        )}

        {/* Historial reciente */}
        {beneficiario && historialReciente.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Últimas dispensaciones
            </p>
            <div className="space-y-1.5">
              {historialReciente.map((d) => (
                <div key={d.id} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                  <span className="text-gray-400 shrink-0">
                    {new Date(d.createdAt).toLocaleDateString('es-GT')}
                  </span>
                  <span>
                    {d.detalles.map((det) =>
                      `${det.nombreMedicamentoSnapshot} x${det.cantidad}`
                    ).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================================================ */}
      {/* PASO 2: AGREGAR MEDICAMENTOS */}
      {/* ================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          2. Medicamentos
        </h2>

        {/* Escaneo de código de barras */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Escanear código de barras..."
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buscarPorBarcode(codigoBarras);
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Búsqueda manual */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar medicamento por nombre..."
            value={queryMed}
            onChange={(e) => setQueryMed(e.target.value)}
            onFocus={() => resultadosMed.length > 0 && setShowDropdownMed(true)}
            onBlur={() => setTimeout(() => setShowDropdownMed(false), 200)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          />
          {buscandoMed && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {showDropdownMed && resultadosMed.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
              {resultadosMed.map((m) => (
                <button
                  key={m.id}
                  onMouseDown={() => agregarAlCarrito(m)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <p className="font-medium text-sm text-gray-900">{m.nombreGenerico}</p>
                  <p className="text-xs text-gray-500">
                    {m.presentacion}{m.concentracion ? ` — ${m.concentracion}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}

          {showDropdownMed && queryMed.length >= 2 && resultadosMed.length === 0 && !buscandoMed && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 text-center text-sm text-gray-500">
              No se encontraron medicamentos
            </div>
          )}
        </div>

        {/* Lista del carrito */}
        {carrito.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Escanee o busque medicamentos para agregar</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Medicamento</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 w-28">Cantidad</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 w-20">Stock</th>
                  <th className="text-center px-4 py-2 font-semibold text-gray-600 w-20">Vence</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => (
                  <tr key={item.medicamento.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.medicamento.nombreGenerico}</p>
                      <p className="text-xs text-gray-500">
                        {item.medicamento.presentacion}
                        {item.medicamento.concentracion ? ` — ${item.medicamento.concentracion}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => actualizarCantidad(item.medicamento.id, item.cantidad - 1)}
                          className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 text-gray-600 text-lg leading-none"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.stock.stockTotal}
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(item.medicamento.id, parseInt(e.target.value, 10) || 1)}
                          className="w-14 text-center border border-gray-300 rounded py-1 text-sm"
                        />
                        <button
                          onClick={() => actualizarCantidad(item.medicamento.id, item.cantidad + 1)}
                          className="w-7 h-7 rounded border border-gray-300 hover:bg-gray-100 text-gray-600 text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.stock.stockTotal}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SemaforoBadge fecha={item.stock.vencimientoProximo} />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => quitarDelCarrito(item.medicamento.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================ */}
      {/* PASO 3: OBSERVACIONES Y CONFIRMAR */}
      {/* ================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          3. Confirmar
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Ej: Receta Dr. García, tratamiento hipertensión..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>

        {/* Resumen */}
        {carrito.length > 0 && beneficiario && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Beneficiario:</span> {beneficiario.nombreCompleto}
            </p>
            <p className="text-gray-700 mt-1">
              <span className="font-medium">Medicamentos:</span> {carrito.length} —{' '}
              Total unidades: {carrito.reduce((s, i) => s + i.cantidad, 0)}
            </p>
          </div>
        )}

        {(!beneficiario || carrito.length === 0) && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <AlertCircle size={16} />
            {!beneficiario
              ? 'Seleccione un beneficiario para continuar'
              : 'Agregue al menos un medicamento'}
          </div>
        )}

        <button
          onClick={confirmarDispensacion}
          disabled={!beneficiario || carrito.length === 0 || despachando}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {despachando ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Confirmar dispensación
            </>
          )}
        </button>
      </div>

      {/* ================================================ */}
      {/* MODAL: CREAR BENEFICIARIO RÁPIDO */}
      {/* ================================================ */}
      {showModalBenef && (
        <ModalNuevoBeneficiario
          onClose={() => setShowModalBenef(false)}
          onCreado={(b) => {
            setShowModalBenef(false);
            seleccionarBeneficiario(b);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// MODAL: NUEVO BENEFICIARIO (inline rápido)
// ============================================

function ModalNuevoBeneficiario({
  onClose,
  onCreado,
}: {
  onClose: () => void;
  onCreado: (b: Beneficiario) => void;
}) {
  const [form, setForm] = useState({
    nombreCompleto: '',
    dpi: '',
    telefono: '',
    direccion: '',
    observaciones: '',
  });
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async () => {
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
      const { data } = await api.post('/dispensacion/beneficiarios', {
        nombreCompleto: form.nombreCompleto.trim(),
        dpi: form.dpi || null,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        observaciones: form.observaciones || null,
      });
      toast.success('Beneficiario registrado');
      onCreado(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Nuevo beneficiario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombreCompleto}
              onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DPI <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              maxLength={13}
              value={form.dpi}
              onChange={(e) => setForm({ ...form, dpi: e.target.value.replace(/\D/g, '') })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="0000000000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
