import cron from 'node-cron';
import { limpiarTokensExpirados } from './dispensacion.service';
import { hoyMedianoche } from './inventario.service';
import { prisma } from '../config/prisma';

/** Pasa a VENCIDO los lotes DISPONIBLE cuya fecha es hoy o anterior. Devuelve cuántos. */
export async function marcarLotesVencidos(): Promise<number> {
  // Un lote vence cuando su fecha es HOY o anterior (<=), no solo anterior (<).
  // Antes se usaba `lt`, por lo que un lote que vencía hoy seguía DISPONIBLE
  // hasta la ejecución del día siguiente (H-01).
  const { count } = await prisma.lote.updateMany({
    where: { estado: 'DISPONIBLE', fechaVencimiento: { lte: hoyMedianoche() } },
    data: { estado: 'VENCIDO' },
  });
  return count;
}

/**
 * Mantenimiento diario: marca lotes vencidos y purga tokens de captura expirados.
 * Corre al arrancar (el servidor puede haber estado apagado a las 00:05) y en el cron.
 * Nunca lanza: cada paso tiene su propio try/catch.
 */
export async function ejecutarMantenimientoVencimiento(): Promise<void> {
  try {
    const n = await marcarLotesVencidos();
    console.log(n > 0 ? `⚠️  ${n} lote(s) marcado(s) como VENCIDO` : '✅ No hay lotes vencidos nuevos');
  } catch (error) {
    console.error('❌ Error marcando lotes vencidos:', error);
  }

  // Independiente de lo anterior: si falla el marcado de lotes, igual se purgan los tokens.
  try {
    const n = await limpiarTokensExpirados();
    if (n > 0) console.log(`🧹 ${n} token(s) de captura expirado(s) eliminado(s)`);
  } catch (error) {
    console.error('❌ Error limpiando tokens de captura:', error);
  }
}

export function iniciarCronVencimiento(): void {
  // Ejecutar todos los días a las 00:05
  cron.schedule('5 0 * * *', () => {
    console.log('⏰ Ejecutando verificación de lotes vencidos...');
    void ejecutarMantenimientoVencimiento();
  });

  console.log('⏰ Cron de vencimiento programado (diario a las 00:05)');
  // Sin await: no bloquea el arranque.
  void ejecutarMantenimientoVencimiento();
}
