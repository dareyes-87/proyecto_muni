import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

/** Clase compartida para inputs/selects. Antes estaba redefinida idéntica en
 *  cada página de formulario. Importar desde aquí en vez de recrearla. */
export const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ' +
  'transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

export const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Texto de ayuda opcional bajo el campo. */
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/** Envuelve un input con su etiqueta y ayuda opcional, con espaciado consistente. */
export function Field({ label, htmlFor, hint, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

/** Input de texto con el estilo del sistema ya aplicado. */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cn(inputClass, className)} {...rest} />
);
TextInput.displayName = 'TextInput';

/** Select con el estilo del sistema ya aplicado. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn(inputClass, className)} {...rest}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';
