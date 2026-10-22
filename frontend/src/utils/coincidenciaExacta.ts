const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Pone primero la coincidencia exacta con lo escrito: DPI idéntico (sin espacios) y luego nombre
 * idéntico (sin distinguir mayúsculas ni tildes). El resto conserva el orden que dio el backend.
 */
export function exactosPrimero<T>(
  items: T[],
  texto: string,
  dpi: (t: T) => string | null | undefined,
  nombre: (t: T) => string
): T[] {
  const sinEspacios = texto.replace(/\s+/g, '');
  const normal = normalizar(texto);
  const rango = (t: T) => (sinEspacios && dpi(t) === sinEspacios ? 0 : normal && normalizar(nombre(t)) === normal ? 1 : 2);
  return [...items].sort((a, b) => rango(a) - rango(b)); // sort estable
}
