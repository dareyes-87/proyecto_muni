import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function iniciarCronVencimiento(): void {
  // Ejecutar todos los días a las 00:05
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ Ejecutando verificación de lotes vencidos...');

    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const resultado = await prisma.lote.updateMany({
        where: {
          estado: 'DISPONIBLE',
          fechaVencimiento: {
            lt: hoy,
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
  });

  console.log('⏰ Cron de vencimiento programado (diario a las 00:05)');
}
