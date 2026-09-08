import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Quita el padding interno (para tablas u otros contenidos que ocupan todo el borde). */
  flush?: boolean;
}

/** Contenedor blanco con borde redondeado: la superficie base de toda la app. */
export default function Card({ flush = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-xl border border-gray-200 bg-white', !flush && 'p-5', className)}
      {...rest}
    />
  );
}
