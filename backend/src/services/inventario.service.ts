import { PrismaClient, EstadoLote } from '@prisma/client';

const prisma = new PrismaClient();

export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

export interface Umbrales {
  /** Días para alerta roja (urgente). */
  rojo: number;
  /** Días para alerta amarilla (priorizar uso). */
  amarillo: number;
}

const UMBRALES_DEFAULT: Umbrales = { rojo: 30, amarillo: 90 };

/**
 * Lee los umbrales de vencimiento desde configuracion_sistema.
 * Si no existen o son inválidos, usa los valores por defecto (30 / 90).
 */
export async function getUmbrales(): Promise<Umbrales> {
  const configs = await prisma.configuracionSistema.findMany({
    where: { clave: { in: ['ALERTA_VENCIMIENTO_ROJO', 'ALERTA_VENCIMIENTO_AMARILLO'] } },
  });

  const leer = (clave: string, def: number): number => {
    const valor = configs.find((c) => c.clave === clave)?.valor;
    const n = valor ? parseInt(valor, 10) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : def;
  };

  return {
    rojo: leer('ALERTA_VENCIMIENTO_ROJO', UMBRALES_DEFAULT.rojo),
    amarillo: leer('ALERTA_VENCIMIENTO_AMARILLO', UMBRALES_DEFAULT.amarillo),
  };
}

/** Medianoche local de hoy, para comparaciones por día (la fecha de vencimiento es @db.Date). */
export function hoyMedianoche(): Date {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return h;
}

/** Días enteros que faltan para vencer. Negativo si ya venció. */
export function diasParaVencer(fechaVencimiento: Date, hoy: Date = hoyMedianoche()): number {
  const f = new Date(fechaVencimiento);
  f.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / 86_400_000);
}

/**
 * Calcula el color del semáforo de vencimiento de un lote.
 * Un lote ya marcado VENCIDO o DADO_DE_BAJA, o con fecha pasada, es 'VENCIDO'.
 */
export function calcularSemaforo(
  fechaVencimiento: Date,
  umbrales: Umbrales,
  estado?: EstadoLote
): Semaforo {
  if (estado === 'VENCIDO' || estado === 'DADO_DE_BAJA') return 'VENCIDO';
  const dias = diasParaVencer(fechaVencimiento);
  if (dias < 0) return 'VENCIDO';
  if (dias <= umbrales.rojo) return 'ROJO';
  if (dias <= umbrales.amarillo) return 'AMARILLO';
  return 'VERDE';
}

/** Un lote cuenta como stock dispensable si está DISPONIBLE, no venció y tiene unidades. */
export function esDispensable(
  lote: { estado: EstadoLote; fechaVencimiento: Date; cantidadActual: number },
  hoy: Date = hoyMedianoche()
): boolean {
  return (
    lote.estado === 'DISPONIBLE' &&
    lote.cantidadActual > 0 &&
    diasParaVencer(lote.fechaVencimiento, hoy) >= 0
  );
}
