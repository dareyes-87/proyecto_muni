import cron from 'node-cron';
import { limpiarTokensExpirados } from './dispensacion.service';
import { hoyMedianoche } from './inventario.service';
import { prisma } from '../config/prisma';

export function iniciarCronVencimiento(): void {
  // Ejecutar todos los días a las 00:05
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ Ejecutando verificación de lotes vencidos...');

    try {
      // Un lote vence cuando su fecha es HOY o anterior (<=), no solo anterior (<).
      // Antes se usaba `lt`, por lo que un lote que vencía hoy seguía DISPONIBLE
      // hasta la ejecución del día siguiente (H-01).
      const hoy = hoyMedianoche();

      const resultado = await prisma.lote.updateMany({
        where: {
          estado: 'DISPONIBLE',
          fechaVencimiento: {
            lte: hoy,
          },
        },
        data: {
          estado: 'VENCIDO',
        },
      });

      if (resultado.count > 0) {
        console.log(`⚠️  ${resultado.count} lote(s) marcado(s) como VENCIDO`);
      } else {
        console.log('✅ No hay lotes vencidos nuevos');
      }
    } catch (error) {
      console.error('❌ Error en cron de vencimiento:', error);
    }

    // Limpieza de tokens de captura vencidos (independiente de lo anterior:
    // si falla el marcado de lotes, igual queremos purgar los tokens).
    try {
      const tokensBorrados = await limpiarTokensExpirados();
      if (tokensBorrados > 0) {
        console.log(`🧹 ${tokensBorrados} token(s) de captura expirado(s) eliminado(s)`);
      }
    } catch (error) {
      console.error('❌ Error limpiando tokens de captura:', error);
    }
  });

  console.log('⏰ Cron de vencimiento programado (diario a las 00:05)');
}
