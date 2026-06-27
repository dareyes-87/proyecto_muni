import type { Semaforo as SemaforoTipo } from '../../types';

const ESTILOS: Record<SemaforoTipo, { label: string; clase: string }> = {
  VERDE: { label: 'Sin riesgo', clase: 'bg-emerald-100 text-emerald-800' },
  AMARILLO: { label: 'Por vencer', clase: 'bg-amber-100 text-amber-800' },
  ROJO: { label: 'Urgente', clase: 'bg-red-100 text-red-800' },
  VENCIDO: { label: 'Vencido', clase: 'bg-gray-200 text-gray-700' },
};

/** Badge de color del semáforo de vencimiento. */
export default function Semaforo({
  estado,
  dias,
}: {
  estado: SemaforoTipo | null;
  dias?: number | null;
}) {
  if (!estado) {
    return <span className="text-xs text-gray-400">Sin stock</span>;
  }

  const { label, clase } = ESTILOS[estado];
  const texto =
    dias != null && estado !== 'VENCIDO'
      ? `${label} · ${dias}d`
      : estado === 'VENCIDO' && dias != null && dias < 0
      ? `Vencido · ${Math.abs(dias)}d`
      : label;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      {texto}
    </span>
  );
}
