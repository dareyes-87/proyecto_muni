import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';

const tones: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-200 text-gray-700',
  blue: 'bg-primary-100 text-primary-800',
};

/** Píldora de estado genérica. */
export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/** Estado activo/inactivo, unificado (antes copiado en cada tabla de catálogo). */
export function StatusBadge({ activo }: { activo?: boolean | null }) {
  return <Badge tone={activo ? 'green' : 'gray'}>{activo ? 'Activo' : 'Inactivo'}</Badge>;
}
