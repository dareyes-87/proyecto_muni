import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

interface Opciones<T> {
  items: T[];
  /** Texto actual del campo. */
  texto: string;
  /** Texto con el que se pidieron `items`: solo si coincide con `texto` son los resultados de lo que se ve escrito. */
  textoDeItems: string;
  abierto: boolean;
  setAbierto: (abierto: boolean) => void;
  onElegir: (item: T) => void;
  /** Largo mínimo del texto para que haya búsqueda. */
  minimo?: number;
}

/**
 * Teclado y accesibilidad (combobox/listbox) para un buscador con lista desplegable:
 * resalta el primer resultado, ↑/↓ mueven el resaltado, Enter elige, Esc cierra.
 * Enter nunca elige resultados de una búsqueda anterior: si los resultados aún no
 * corresponden al texto del campo, espera a los de ese texto y entonces solo elige si hay
 * exactamente uno (si hay varios deja la lista abierta para que la persona escoja).
 * Esc o salir del campo cancelan esa espera. El clic con el ratón lo maneja cada pantalla.
 */
export function useAutocompleteTeclado<T>({ items, texto, textoDeItems, abierto, setAbierto, onElegir, minimo = 2 }: Opciones<T>) {
  const id = useId();
  const listaId = `${id}-lista`;
  const opcionId = (i: number) => `${id}-op-${i}`;
  const [activo, setActivo] = useState(0);
  // Texto sobre el que se pulsó Enter antes de que llegaran sus resultados.
  const pendiente = useRef<string | null>(null);

  const alDia = textoDeItems === texto;

  useEffect(() => setActivo(0), [items]);

  useEffect(() => {
    if (abierto && alDia) document.getElementById(opcionId(activo))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, abierto, alDia]);

  useEffect(() => {
    if (pendiente.current === null) return;
    if (pendiente.current !== texto) {
      pendiente.current = null; // siguió escribiendo: ya no aplica
      return;
    }
    if (!alDia) return;
    pendiente.current = null;
    if (items.length === 1) onElegir(items[0]);
    else if (items.length > 1) setAbierto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, texto, alDia]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (items.length === 0 || !alDia) return;
      e.preventDefault();
      if (!abierto) return setAbierto(true);
      setActivo((a) => Math.min(items.length - 1, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter') {
      if (texto.length < minimo) return;
      if (!alDia) {
        e.preventDefault();
        pendiente.current = texto;
      } else if (abierto && items.length > 0) {
        e.preventDefault();
        onElegir(items[Math.min(activo, items.length - 1)]);
      }
    } else if (e.key === 'Escape') {
      pendiente.current = null;
      if (abierto) {
        e.preventDefault();
        setAbierto(false);
      }
    }
  };

  // Resaltado solo cuando la lista es la del texto actual: si no, Enter no elegiría esa fila.
  const mostrando = abierto && items.length > 0 && alDia;
  return {
    activo,
    inputProps: {
      role: 'combobox' as const,
      'aria-autocomplete': 'list' as const,
      'aria-expanded': abierto && items.length > 0,
      'aria-controls': listaId,
      'aria-activedescendant': mostrando ? opcionId(Math.min(activo, items.length - 1)) : undefined,
      onKeyDown,
      // Salir del campo cancela un Enter pendiente y cierra la lista (con margen para el clic en una opción).
      onBlur: () => {
        pendiente.current = null;
        setTimeout(() => setAbierto(false), 200);
      },
    },
    listaProps: { id: listaId, role: 'listbox' as const },
    opcionProps: (i: number) => ({
      id: opcionId(i),
      role: 'option' as const,
      'aria-selected': alDia && i === activo,
      tabIndex: -1,
    }),
    claseOpcion: (i: number) => (alDia && i === activo ? 'bg-primary-50' : 'hover:bg-gray-50'),
  };
}
