// Prueba de regresión de INTEGRACIÓN del bug crítico de lote vencido (H-01).
// A diferencia de inventario.service.test.ts (lógica pura), esta prueba ejerce el
// SELECT ... FOR UPDATE real de `despachar` contra la base de datos, para garantizar
// que un lote con estado DISPONIBLE pero fecha ya vencida NUNCA sea elegible, aunque
// el cron todavía no lo haya marcado VENCIDO.
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/despacho_vencimiento.test.ts"
//
// Crea sus propios datos y los elimina al terminar (no deja residuos).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/prisma';
import { despachar, obtenerStockMedicamento } from '../src/services/dispensacion.service';

// Medianoche UTC del día de calendario local, como Prisma entrega/guarda @db.Date.
function enDias(n: number): Date {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() + n));
}

test('despachar: un lote vencido (estado DISPONIBLE, fecha pasada/hoy) nunca es elegible (H-01)', async (t) => {
  const cat = await prisma.categoria.findFirst();
  assert.ok(cat, 'se requiere al menos una categoría sembrada');
  const usuario = await prisma.usuario.findFirst({ where: { rol: 'ADMIN' } });
  assert.ok(usuario, 'se requiere un usuario ADMIN');

  const med = await prisma.medicamento.create({
    data: { nombreGenerico: 'QA_TEST_VENC_' + Date.now(), presentacion: 'T', unidadMedida: 'T', categoriaId: cat!.id, stockMinimo: 0 },
  });
  const entrada = await prisma.entrada.create({ data: { usuarioId: usuario!.id, observaciones: 'QA test venc' } });
  const ben = await prisma.beneficiario.create({ data: { nombreCompleto: 'QA Test Venc Ben ' + Date.now() } });

  const defs = [
    { numeroLote: 'AYER', fechaVencimiento: enDias(-1), estado: 'DISPONIBLE' as const, cantidadActual: 10 },
    { numeroLote: 'HOY', fechaVencimiento: enDias(0), estado: 'DISPONIBLE' as const, cantidadActual: 10 },
    { numeroLote: 'MANANA', fechaVencimiento: enDias(1), estado: 'DISPONIBLE' as const, cantidadActual: 10 },
    { numeroLote: 'EST_VENCIDO', fechaVencimiento: enDias(5), estado: 'VENCIDO' as const, cantidadActual: 10 },
    { numeroLote: 'STOCK0', fechaVencimiento: enDias(10), estado: 'DISPONIBLE' as const, cantidadActual: 0 },
  ];
  for (const d of defs) {
    await prisma.lote.create({
      data: { entradaId: entrada.id, medicamentoId: med.id, cantidad: 10, cantidadActual: d.cantidadActual, numeroLote: d.numeroLote, fechaVencimiento: d.fechaVencimiento, estado: d.estado },
    });
  }

  t.after(async () => {
    const disps = await prisma.dispensacion.findMany({ where: { beneficiarioId: ben.id }, select: { id: true } });
    const dids = disps.map((x) => x.id);
    await prisma.detalleDispensacion.deleteMany({ where: { dispensacionId: { in: dids } } });
    await prisma.dispensacion.deleteMany({ where: { beneficiarioId: ben.id } });
    await prisma.lote.deleteMany({ where: { entradaId: entrada.id } });
    await prisma.entrada.delete({ where: { id: entrada.id } });
    await prisma.medicamento.delete({ where: { id: med.id } });
    await prisma.beneficiario.delete({ where: { id: ben.id } });
  });

  // Solo el lote futuro cuenta como stock.
  const stock = await obtenerStockMedicamento(med.id);
  assert.equal(stock.stockTotal, 10, 'solo el lote MANANA (futuro) es stock dispensable');
  assert.equal(stock.lotes.length, 1);
  assert.equal(stock.lotes[0].numeroLote, 'MANANA');

  // Pedir más de lo elegible → stock insuficiente (los 40 "aparentes" de lotes vencidos no cuentan).
  await assert.rejects(
    () => despachar(ben.id, usuario!.id, [{ medicamentoId: med.id, cantidad: 11 }]),
    /Stock insuficiente/,
    'no debe poder dispensar 11 cuando solo hay 10 no vencidos'
  );

  // Despachar exactamente lo elegible → éxito, consumiendo SOLO el lote MANANA.
  const res = await despachar(ben.id, usuario!.id, [{ medicamentoId: med.id, cantidad: 10 }]);
  assert.ok(res.dispensacion.id);

  const lotes = await prisma.lote.findMany({ where: { medicamentoId: med.id }, select: { numeroLote: true, cantidadActual: true, estado: true } });
  const byLote = Object.fromEntries(lotes.map((l) => [l.numeroLote, l]));
  assert.equal(byLote['MANANA'].cantidadActual, 0, 'MANANA se consumió');
  assert.equal(byLote['MANANA'].estado, 'AGOTADO');
  assert.equal(byLote['AYER'].cantidadActual, 10, 'AYER (vencido) jamás se tocó');
  assert.equal(byLote['HOY'].cantidadActual, 10, 'HOY (vence hoy) jamás se tocó');
  assert.equal(byLote['EST_VENCIDO'].cantidadActual, 10, 'estado VENCIDO jamás se tocó');

  // Ya no queda nada elegible → siguiente despacho falla por stock.
  await assert.rejects(
    () => despachar(ben.id, usuario!.id, [{ medicamentoId: med.id, cantidad: 1 }]),
    /Stock insuficiente/,
    'sin lotes futuros con stock, no se puede dispensar aunque existan lotes vencidos con unidades'
  );
});
