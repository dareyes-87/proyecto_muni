import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

/** Clase compartida para inputs/selects. Antes estaba redefinida idéntica en
 *  cada página de formulario. Importar desde aquí en vez de recrearla. */
export const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ' +
  'transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ' +
  'aria-invalid:!border-red-500 aria-invalid:focus:!ring-red-500';

export const errorId = (id: string) => `${id}-error`;

/** Atributos de un input con error de validación (borde rojo vía inputClass). Esparcir junto con su `id`,
 *  el mismo que se pasa a <Field htmlFor error>, que dibuja el mensaje al que apunta aria-describedby. */
export const ariaError = (id: string, error?: string) =>
  error ? ({ 'aria-invalid': true, 'aria-describedby': errorId(id) } as const) : {};

export const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Texto de ayuda opcional bajo el campo. */
  hint?: string;
  required?: boolean;
  /** Mensaje de validación; reemplaza a `hint`. Requiere `htmlFor` para enlazarse al input. */
  error?: string;
  children: ReactNode;
}

/** Envuelve un input con su etiqueta y ayuda opcional, con espaciado consistente. */
export function Field({ label, htmlFor, hint, required, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && htmlFor ? (
        <p id={errorId(htmlFor)} className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>
      )}
    </div>
  );
}

/** Oculta las flechitas nativas de <input type="number"> (Chromium y Firefox). */
const sinFlechitas =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** Input de texto con el estilo del sistema ya aplicado. En type="number" sin flechitas nativas
 *  y la rueda del ratón no cambia el valor: en Chromium cambiaba el campo enfocado al desplazar
 *  la página, así que la rueda hace que el campo suelte el foco. */
export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onWheel, ...rest }, ref) => {
    const numerico = rest.type === 'number';
    return (
      <input
        ref={ref}
        className={cn(inputClass, numerico && sinFlechitas, className)}
        onWheel={numerico ? (e) => { e.currentTarget.blur(); onWheel?.(e); } : onWheel}
        {...rest}
      />
    );
  }
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
