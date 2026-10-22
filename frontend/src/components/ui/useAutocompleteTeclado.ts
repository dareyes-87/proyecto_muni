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
 * corresponden al texto del campo, espera a que lleguen los de ese texto.
 * El clic con el ratón lo maneja cada pantalla, como antes.
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
    if (abierto) document.getElementById(opcionId(activo))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, abierto]);

  useEffect(() => {
    if (pendiente.current === null) return;
    if (pendiente.current !== texto) pendiente.current = null; // siguió escribiendo: ya no aplica
    else if (alDia) {
      pendiente.current = null;
      if (items.length > 0) onElegir(items[0]);
    }
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
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault();
      pendiente.current = null;
      setAbierto(false);
    }
  };

  const mostrando = abierto && items.length > 0;
  return {
    activo,
    inputProps: {
      role: 'combobox' as const,
      'aria-autocomplete': 'list' as const,
      'aria-expanded': mostrando,
      'aria-controls': listaId,
      'aria-activedescendant': mostrando ? opcionId(Math.min(activo, items.length - 1)) : undefined,
      onKeyDown,
    },
    listaProps: { id: listaId, role: 'listbox' as const },
    opcionProps: (i: number) => ({
      id: opcionId(i),
      role: 'option' as const,
      'aria-selected': i === activo,
      tabIndex: -1,
    }),
    claseOpcion: (i: number) => (i === activo ? 'bg-primary-50' : 'hover:bg-gray-50'),
  };
}
