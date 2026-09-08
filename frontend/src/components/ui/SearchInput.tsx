import { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Input de búsqueda con icono de lupa, unificado. */
export default function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search size={18} className="pointer-events-none absolute left-3 top-2.5 text-gray-400" />
      <input
        type="search"
        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
        {...rest}
      />
    </div>
  );
}
