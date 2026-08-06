import { Camera } from 'lucide-react';
import type { FotoDispensacion } from '../../api/captura';

/**
 * Badge del estado de evidencia fotográfica de una dispensación:
 * verde = las 2 fotos, ámbar = 1, gris = ninguna.
 */
export default function EvidenciaBadge({ fotos }: { fotos?: FotoDispensacion[] }) {
  const total = fotos?.length ?? 0;

  const { clases, texto } =
    total >= 2
      ? { clases: 'bg-emerald-100 text-emerald-800', texto: 'Evidencia completa' }
      : total === 1
        ? { clases: 'bg-amber-100 text-amber-800', texto: 'Parcial' }
        : { clases: 'bg-gray-100 text-gray-500', texto: 'Sin evidencia' };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${clases}`}
    >
      <Camera size={13} />
      {texto}
    </span>
  );
}
