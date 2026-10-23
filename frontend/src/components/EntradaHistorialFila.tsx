import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { detalleEntrada, type EntradaResumen, type EntradaDetalle, type LoteHistorial } from '../api/inventario';
import { formatFechaDia, formatFechaHora } from '../utils/formatDate';

const nombreLote = (l: LoteHistorial) =>
  `${l.medicamento.nombreGenerico}${l.medicamento.concentracion ? ` ${l.medicamento.concentracion}` : ''}`;

/** Fila del historial de entradas: resumen de lo que entró y, al expandir, todos sus lotes y las observaciones. */
export default function EntradaHistorialFila({ entrada }: { entrada: EntradaResumen }) {
  const [abierto, setAbierto] = useState(false);
  const [detalle, setDetalle] = useState<EntradaDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const panelId = `entrada-${entrada.id}-detalle`;
  const fecha = formatFechaHora(entrada.createdAt);
  const total = entrada._count.lotes;
  const restantes = total - entrada.lotes.length;
  // Mismo texto que ve quien usa el ratón: distingue entradas registradas en el mismo minuto.
  const resumen = entrada.lotes.map((l) => `${nombreLote(l)} × ${l.cantidad}`).join(', ') + (restantes > 0 ? ` y ${restantes} más` : '');

  const alternar = async () => {
    setAbierto(!abierto);
    if (abierto || detalle || cargando) return;
    setCargando(true);
    setError(false);
    try {
      setDetalle(await detalleEntrada(entrada.id));
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <tr className="align-top hover:bg-gray-50">
        <td className="px-4 py-3 text-gray-600">{fecha}</td>
        <td className="px-4 py-3 text-gray-700">
          {entrada.lotes.map((l) => (
            <div key={l.id}>
              {nombreLote(l)} × {l.cantidad}
            </div>
          ))}
          {restantes > 0 && <div className="text-xs text-gray-500">+{restantes} más</div>}
        </td>
        <td className="px-4 py-3 text-center text-gray-600">{total}</td>
        <td className="px-4 py-3 text-gray-600">{entrada.usuario.nombreCompleto}</td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={alternar}
            aria-expanded={abierto}
            aria-controls={abierto ? panelId : undefined}
            aria-label={`${abierto ? 'Ocultar' : 'Ver'} detalle de la entrada del ${fecha}: ${resumen}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-primary-700 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            {abierto ? 'Ocultar' : 'Ver detalle'}
            {abierto ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr id={panelId} className="bg-gray-50">
          <td colSpan={5} className="px-4 py-3">
            {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                No se pudo cargar el detalle. Cierre y vuelva a abrir para reintentar.
              </p>
            )}
            {detalle && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Observaciones:</span>{' '}
                  {detalle.observaciones || 'Sin observaciones'}
                </p>
                {/* Altura máxima con scroll propio; tabIndex para poder desplazarlo con el teclado. */}
                <div
                  role="region"
                  aria-label={`Lotes de la entrada del ${fecha}`}
                  tabIndex={0}
                  className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                >
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="sticky top-0 bg-gray-100 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Medicamento</th>
                        <th className="px-3 py-2">N.º de lote</th>
                        <th className="px-3 py-2 text-right">Cantidad recibida</th>
                        <th className="px-3 py-2">Vencimiento</th>
                        <th className="px-3 py-2">Ubicación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detalle.lotes.map((l) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 text-gray-700">{nombreLote(l)}</td>
                          <td className="px-3 py-2 text-gray-600">{l.numeroLote}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{l.cantidad}</td>
                          <td className="px-3 py-2 text-gray-600">{formatFechaDia(l.fechaVencimiento)}</td>
                          <td className="px-3 py-2 text-gray-600">{l.ubicacion?.codigo ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
