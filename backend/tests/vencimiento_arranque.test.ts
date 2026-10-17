// Prueba contra Postgres: el marcado de lotes vencidos que corre al arrancar y en el
// cron de las 00:05. Crea sus datos y los elimina al terminar.
//
//   TZ=America/Guatemala node --import tsx --test tests/vencimiento_arranque.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma';
import { marcarLotesVencidos } from '../src/services/vencimiento.service';

// Medianoche UTC del día de calendario local, como Prisma entrega/guarda @db.Date.
function enDias(n: number): Date {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() + n));
}

test('marcarLotesVencidos: DISPONIBLE con fecha ayer/hoy pasa a VENCIDO; mañana sigue DISPONIBLE', async (t) => {
  const cat = await prisma.categoria.findFirst();
  const usuario = await prisma.usuario.findFirst({ where: { rol: 'ADMIN' } });
  assert.ok(cat && usuario, 'se requiere una categoría y un usuario ADMIN sembrados');

  const med = await prisma.medicamento.create({
    data: { nombreGenerico: 'QA_TEST_CRON_' + Date.now(), presentacion: 'T', unidadMedida: 'T', categoriaId: cat.id, stockMinimo: 0 },
  });
  const entrada = await prisma.entrada.create({ data: { usuarioId: usuario.id, observaciones: 'QA test cron' } });
  t.after(async () => {
    await prisma.lote.deleteMany({ where: { entradaId: entrada.id } });
    await prisma.entrada.delete({ where: { id: entrada.id } });
    await prisma.medicamento.delete({ where: { id: med.id } });
  });

  const defs = [
    { numeroLote: 'AYER', fechaVencimiento: enDias(-1) },
    { numeroLote: 'HOY', fechaVencimiento: enDias(0) },
    { numeroLote: 'MANANA', fechaVencimiento: enDias(1) },
  ];
  for (const d of defs) {
    await prisma.lote.create({
      data: { entradaId: entrada.id, medicamentoId: med.id, cantidad: 10, cantidadActual: 10, ...d },
    });
  }

  // Otras pruebas corren en paralelo contra la misma base: solo se exige haber marcado al menos 2.
  assert.ok((await marcarLotesVencidos()) >= 2);

  const lotes = await prisma.lote.findMany({ where: { entradaId: entrada.id } });
  const estado = Object.fromEntries(lotes.map((l) => [l.numeroLote, l.estado]));
  assert.deepEqual(estado, { AYER: 'VENCIDO', HOY: 'VENCIDO', MANANA: 'DISPONIBLE' });
});
