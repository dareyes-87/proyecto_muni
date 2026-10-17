// Pruebas de INTEGRACIÓN de rutas contra la base de datos real (mismo patrón que
// despacho_vencimiento.test.ts): montan los routers en un servidor Express temporal
// y los llaman por HTTP con un JWT de un usuario ADMIN sembrado.
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/rutas_integracion.test.ts"
//
// Cubren: (1) la importación por Excel no duplica un lote ya existente, ni siquiera
// al subir el mismo archivo dos veces, y no deja nada creado por la fila omitida;
// (2) el stock del lector de códigos de barras excluye lotes vencidos por fecha.
// Crean sus propios datos y los eliminan al terminar.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import { prisma } from '../src/config/prisma';
import { config } from '../src/config/env';
import inventarioRoutes from '../src/routes/inventario.routes';
import catalogosRoutes from '../src/routes/catalogos.routes';
import { buscarLoteDuplicado } from '../src/services/inventario.service';

// Medianoche UTC del día de calendario local, como Prisma entrega/guarda @db.Date.
function enDias(n: number): Date {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() + n));
}

const sufijo = Date.now();
let server: Server;
let base: string;
let token: string;
let usuarioId: string;
let categoriaId: string;
let medId: string;
let entradaId: string;
const ubicacionCodigo = `QA-UBI-${sufijo}`;
const codigoBarras = `QA-BC-${sufijo}`;

async function prepararAmbiente() {
  const usuario = await prisma.usuario.findFirst({ where: { rol: 'ADMIN' } });
  assert.ok(usuario, 'se requiere un usuario ADMIN');
  const cat = await prisma.categoria.findFirst();
  assert.ok(cat, 'se requiere al menos una categoría sembrada');
  usuarioId = usuario!.id;
  categoriaId = cat!.id;
  token = jwt.sign({ userId: usuario!.id, username: usuario!.username, rol: usuario!.rol }, config.jwtSecret);

  const app = express();
  app.use(express.json());
  app.use('/api/inventario', inventarioRoutes);
  app.use('/api/catalogos', catalogosRoutes);
  server = await new Promise<Server>((ok) => {
    const s = app.listen(0, () => ok(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;

  const med = await prisma.medicamento.create({
    data: {
      nombreGenerico: `QA_RUTAS_${sufijo}`,
      presentacion: 'Tableta',
      concentracion: '10mg',
      unidadMedida: 'Tableta',
      categoriaId,
      stockMinimo: 0,
      codigosBarras: { create: { codigo: codigoBarras } },
    },
  });
  medId = med.id;
  const entrada = await prisma.entrada.create({ data: { usuarioId, observaciones: 'QA rutas' } });
  entradaId = entrada.id;
}

after(async () => {
  if (server) await new Promise((ok) => server.close(ok));
  if (medId) {
    const lotes = await prisma.lote.findMany({ where: { medicamentoId: medId }, select: { entradaId: true } });
    const entradaIds = [...new Set([...lotes.map((l) => l.entradaId), entradaId])];
    await prisma.logAuditoria.deleteMany({ where: { entidadId: { in: entradaIds } } });
    await prisma.lote.deleteMany({ where: { medicamentoId: medId } });
    await prisma.entrada.deleteMany({ where: { id: { in: entradaIds } } });
    await prisma.codigoBarras.deleteMany({ where: { medicamentoId: medId } });
    await prisma.medicamento.delete({ where: { id: medId } });
  }
  await prisma.ubicacion.deleteMany({ where: { codigo: ubicacionCodigo } });
  await prisma.$disconnect();
});

test('buscarLoteDuplicado: mismo medicamento + lote + vencimiento (sin distinguir mayúsculas)', async () => {
  await prepararAmbiente();
  const venc = enDias(400);
  await prisma.lote.create({
    data: { entradaId, medicamentoId: medId, cantidad: 10, cantidadActual: 10, numeroLote: 'Lote-Dup', fechaVencimiento: venc },
  });

  await prisma.$transaction(async (tx) => {
    assert.ok(await buscarLoteDuplicado(tx, { medicamentoId: medId, numeroLote: 'lote-dup', fechaVencimiento: venc }), 'mismo lote');
    assert.equal(await buscarLoteDuplicado(tx, { medicamentoId: medId, numeroLote: 'Lote-Dup', fechaVencimiento: enDias(401) }), null, 'otra fecha');
    assert.equal(await buscarLoteDuplicado(tx, { medicamentoId: medId, numeroLote: 'Otro', fechaVencimiento: venc }), null, 'otro número de lote');
    assert.equal(await buscarLoteDuplicado(tx, { medicamentoId: '00000000-0000-0000-0000-000000000000', numeroLote: 'Lote-Dup', fechaVencimiento: venc }), null, 'otro medicamento');
  });
});

test('importar-excel: una fila con lote existente se omite, y subir el mismo archivo otra vez no duplica stock', async () => {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Plantilla');
  hoja.addRow(['nombreGenerico', 'nombreComercial', 'presentacion', 'concentracion', 'unidadMedida', 'categoria', 'codigoBarras', 'cantidad', 'numeroLote', 'fechaVencimiento', 'ubicacion']);
  const fechaTxt = enDias(400).toISOString().slice(0, 10);
  const cat = (await prisma.categoria.findUnique({ where: { id: categoriaId } }))!.nombre;
  // Fila 2: repite el lote que ya existe (con una ubicación nueva que NO debe crearse).
  hoja.addRow([`QA_RUTAS_${sufijo}`, '', 'Tableta', '10mg', 'Tableta', cat, '', 5, 'Lote-Dup', fechaTxt, ubicacionCodigo]);
  // Fila 3: lote nuevo.
  hoja.addRow([`QA_RUTAS_${sufijo}`, '', 'Tableta', '10mg', 'Tableta', cat, '', 7, 'Lote-Nuevo', fechaTxt, '']);
  const archivo = Buffer.from(await wb.xlsx.writeBuffer());

  const subir = async () => {
    const fd = new FormData();
    fd.append('archivo', new Blob([archivo]), 'qa.xlsx');
    const r = await fetch(`${base}/inventario/importar-excel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    assert.equal(r.status, 200);
    return ((await r.json()) as any).data;
  };

  const primera = await subir();
  assert.equal(primera.lotesRegistrados, 1, 'solo el lote nuevo');
  assert.equal(primera.lotesOmitidos, 1, 'el lote existente se omite');
  assert.equal(primera.errores.length, 0);
  assert.match(primera.avisos[0].aviso, /Ya existe el lote Lote-Dup de QA_RUTAS_\d+ con vencimiento \d{2}\/\d{2}\/\d{4}; no se importó/);
  assert.equal(await prisma.ubicacion.findUnique({ where: { codigo: ubicacionCodigo } }), null, 'la fila omitida no crea ubicación');

  const segunda = await subir();
  assert.equal(segunda.lotesRegistrados, 0, 'reimportar el mismo archivo no registra nada');
  assert.equal(segunda.lotesOmitidos, 2);

  const lotes = await prisma.lote.findMany({ where: { medicamentoId: medId }, select: { numeroLote: true, cantidad: true } });
  assert.equal(lotes.length, 2, 'Lote-Dup (original) y Lote-Nuevo, sin copias');
  assert.equal(lotes.find((l) => l.numeroLote === 'Lote-Dup')!.cantidad, 10, 'el lote original no cambió');
});

test('GET barcode: stockActual excluye lotes vencidos por fecha aunque sigan DISPONIBLE', async () => {
  // Ya existen 10 (Lote-Dup, vigente) + 7 (Lote-Nuevo, vigente); se agrega un vencido con 100.
  await prisma.lote.create({
    data: { entradaId, medicamentoId: medId, cantidad: 100, cantidadActual: 100, numeroLote: 'VENCIDO-DISP', fechaVencimiento: enDias(-1), estado: 'DISPONIBLE' },
  });
  const r = await fetch(`${base}/catalogos/medicamentos/barcode/${codigoBarras}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(r.status, 200);
  const { data } = (await r.json()) as any;
  assert.equal(data.stockActual, 17, 'los 100 del lote vencido no cuentan (antes daba 117)');
});
