/** Formatea una fecha/hora como dd/mm/aaaa HH:mm (24 horas, sin segundos). */
export function formatFechaHora(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
}

/** Formatea una fecha (sin hora) como dd/mm/aaaa. */
export function formatFecha(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Formatea una fecha de calendario (columna @db.Date, p. ej. vencimiento) como
 * dd/mm/aaaa. Llega como medianoche UTC, así que se lee con getters UTC; con los
 * locales se vería un día antes en Guatemala.
 */
export function formatFechaDia(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
