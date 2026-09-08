/** Une clases de Tailwind ignorando valores vacíos/falsos. Sin dependencias. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
