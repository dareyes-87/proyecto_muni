import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  /** Encabezado de la columna. */
  header: ReactNode;
  /** Contenido de la celda para una fila. */
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Clases extra para el <th> y <td> de esta columna (ancho, etc.). */
  className?: string;
  /** Oculta la columna (útil para columnas solo-admin). */
  hidden?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  loading?: boolean;
  /** Mensaje cuando no hay filas. */
  emptyMessage?: string;
  /** Contenido personalizado del estado vacío (reemplaza emptyMessage). */
  empty?: ReactNode;
  /** Clase por fila (p.ej. atenuar filas dadas de baja). */
  rowClassName?: (row: T) => string | undefined;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/** Tabla de datos estándar: shell con borde, encabezado gris, estados de carga y
 *  vacío ya resueltos. Elimina el markup de tabla repetido en cada página CRUD. */
export default function DataTable<T>({
  columns,
  rows,
  keyFn,
  loading = false,
  emptyMessage = 'Sin resultados',
  empty,
  rowClassName,
}: DataTableProps<T>) {
  const cols = columns.filter((c) => !c.hidden);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            {cols.map((c, i) => (
              <th key={i} className={cn('px-4 py-3', c.align && alignClass[c.align], c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={cols.length} className="px-4 py-10 text-center text-gray-400">
                Cargando...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-4 py-10 text-center text-gray-400">
                {empty ?? emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={keyFn(row)} className={cn('hover:bg-gray-50', rowClassName?.(row))}>
                {cols.map((c, i) => (
                  <td key={i} className={cn('px-4 py-3', c.align && alignClass[c.align], c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
