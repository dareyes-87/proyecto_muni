/** Formatea una fecha/hora como dd/mm/aaaa HH:mm (24 horas, sin segundos). */
export function formatFechaHora(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
}

/** Formatea una fecha (sin hora) como dd/mm/aaaa. */
export function formatFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
