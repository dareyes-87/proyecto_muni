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
  await prisma.ubicacion.deleteMany({ where: { codigo: { startsWith: `QA-UBI-${sufijo}` } } });
  await prisma.$disconnect();
});

test('buscarLoteDuplicado: mismo medicamento + lote + vencimiento (sin distinguir mayúsculas)', async () => {
  await prepararAmbiente();
  const venc = enDias(400);
  await prisma.lote.create({
    data: { entradaId, medicamentoId: medId, cantidad: 10, cantidadActual: 10, numeroLote: 'Lote-Dup', fechaVencimiento: venc },
  });

  const antes = new Date(Date.now() + 60_000); // el lote se creó antes de este instante
  await prisma.$transaction(async (tx) => {
    const d = { medicamentoId: medId, numeroLote: 'Lote-Dup', fechaVencimiento: venc, creadoAntesDe: antes };
    assert.ok(await buscarLoteDuplicado(tx, { ...d, numeroLote: 'lote-dup' }), 'mismo lote');
    assert.equal(await buscarLoteDuplicado(tx, { ...d, fechaVencimiento: enDias(401) }), null, 'otra fecha');
    assert.equal(await buscarLoteDuplicado(tx, { ...d, numeroLote: 'Otro' }), null, 'otro número de lote');
    assert.equal(await buscarLoteDuplicado(tx, { ...d, medicamentoId: '00000000-0000-0000-0000-000000000000' }), null, 'otro medicamento');
    assert.equal(await buscarLoteDuplicado(tx, { ...d, creadoAntesDe: new Date(Date.now() - 60_000) }), null, 'un lote creado después del corte no cuenta');
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

test('importar-excel: el mismo lote en dos filas (dos ubicaciones) importa ambas; reimportar omite ambas', async () => {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Plantilla');
  hoja.addRow(['nombreGenerico', 'nombreComercial', 'presentacion', 'concentracion', 'unidadMedida', 'categoria', 'codigoBarras', 'cantidad', 'numeroLote', 'fechaVencimiento', 'ubicacion']);
  const fechaTxt = enDias(500).toISOString().slice(0, 10);
  const cat = (await prisma.categoria.findUnique({ where: { id: categoriaId } }))!.nombre;
  hoja.addRow([`QA_RUTAS_${sufijo}`, '', 'Tableta', '10mg', 'Tableta', cat, '', 3, 'Lote-Dividido', fechaTxt, `QA-UBI-${sufijo}-A`]);
  hoja.addRow([`QA_RUTAS_${sufijo}`, '', 'Tableta', '10mg', 'Tableta', cat, '', 4, 'Lote-Dividido', fechaTxt, `QA-UBI-${sufijo}-B`]);
  const archivo = Buffer.from(await wb.xlsx.writeBuffer());

  const subir = async () => {
    const fd = new FormData();
    fd.append('archivo', new Blob([archivo]), 'qa.xlsx');
    const r = await fetch(`${base}/inventario/importar-excel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    assert.equal(r.status, 200);
    return ((await r.json()) as any).data;
  };

  const primera = await subir();
  assert.equal(primera.lotesRegistrados, 2, 'las dos filas del mismo lote se importan');
  assert.equal(primera.lotesOmitidos, 0);
  assert.equal(await prisma.lote.count({ where: { medicamentoId: medId, numeroLote: 'Lote-Dividido' } }), 2);

  const segunda = await subir();
  assert.equal(segunda.lotesRegistrados, 0, 'reimportar el archivo completo no registra nada');
  assert.equal(segunda.lotesOmitidos, 2);
  assert.equal(await prisma.lote.count({ where: { medicamentoId: medId, numeroLote: 'Lote-Dividido' } }), 2, 'sin copias');
});

test('GET inventario y alertas: los lotes AGOTADO/VENCIDO/DADO_DE_BAJA/pasados no suman stock; el detalle sí los lista', async () => {
  const med = await prisma.medicamento.create({
    data: { nombreGenerico: `QA_STOCK_${sufijo}`, presentacion: 'Tableta', concentracion: '5mg', unidadMedida: 'Tableta', categoriaId, stockMinimo: 100 },
  });
  try {
    const lote = (numeroLote: string, cantidadActual: number, dias: number, estado: 'DISPONIBLE' | 'AGOTADO' | 'VENCIDO' | 'DADO_DE_BAJA') =>
      ({ entradaId, medicamentoId: med.id, cantidad: 10, cantidadActual, numeroLote, fechaVencimiento: enDias(dias), estado });
    await prisma.lote.createMany({
      data: [
        lote('OK', 10, 200, 'DISPONIBLE'),
        lote('AGOTADO', 0, 200, 'AGOTADO'),
        lote('VENCIDO', 5, -10, 'VENCIDO'),
        lote('BAJA', 7, 200, 'DADO_DE_BAJA'),
        lote('PASADO', 3, -1, 'DISPONIBLE'), // el cron aún no lo marcó
      ],
    });
    const get = async (ruta: string) => {
      const r = await fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(r.status, 200);
      return ((await r.json()) as any).data;
    };

    const fila = (await get(`/inventario?q=QA_STOCK_${sufijo}`))[0];
    assert.equal(fila.stockDisponible, 10);
    assert.equal(fila.numeroLotes, 1);
    assert.equal(fila.stockBajo, true);

    const alertas = await get('/inventario/alertas');
    assert.equal(alertas.stockBajo.find((m: any) => m.id === med.id)?.stockDisponible, 10);
    const vencidos = alertas.vencidos.filter((l: any) => l.medicamento.id === med.id).map((l: any) => l.numeroLote).sort();
    assert.deepEqual(vencidos, ['PASADO', 'VENCIDO']);

    const detalle = await get(`/inventario/medicamento/${med.id}`);
    assert.equal(detalle.lotes.length, 5, 'el detalle no filtra lotes');
    assert.equal(detalle.stockDisponible, 10);
  } finally {
    await prisma.lote.deleteMany({ where: { medicamentoId: med.id } });
    await prisma.medicamento.delete({ where: { id: med.id } });
  }
});

test('PUT medicamentos y categorías: un tipo incorrecto en activo/descripcion da 400, no 500', async () => {
  const put = (ruta: string, body: unknown) =>
    fetch(`${base}${ruta}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  assert.equal((await put(`/catalogos/medicamentos/${medId}`, { activo: 'no' })).status, 400);
  assert.equal((await put(`/catalogos/categorias/${categoriaId}`, { activo: 'no' })).status, 400);
  assert.equal((await put(`/catalogos/categorias/${categoriaId}`, { descripcion: 5 })).status, 400);
  assert.equal((await put(`/catalogos/categorias/${categoriaId}`, { nombre: '  ' })).status, 400);
  assert.equal((await put(`/catalogos/medicamentos/${medId}`, { stockMinimo: 0 })).status, 200, 'un cuerpo válido sigue pasando');
});

test('importar-excel: cantidad no entera es error de fila; código de barras numérico avisa', async () => {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Plantilla');
  hoja.addRow(['nombreGenerico', 'nombreComercial', 'presentacion', 'concentracion', 'unidadMedida', 'categoria', 'codigoBarras', 'cantidad', 'numeroLote', 'fechaVencimiento', 'ubicacion']);
  const fechaTxt = enDias(450).toISOString().slice(0, 10);
  const cat = (await prisma.categoria.findUnique({ where: { id: categoriaId } }))!.nombre;
  hoja.addRow([`QA_RUTAS_${sufijo}`, '', 'Tableta', '10mg', 'Tableta', cat, '', 12.5, 'Lote-Decimal', fechaTxt, '']); // fila 2
  hoja.addRow([`QA_RUTAS_${sufijo}`, '', 'Tableta', '10mg', 'Tableta', cat, sufijo, 4, 'Lote-Num', fechaTxt, '']); // fila 3: código como número
  const fd = new FormData();
  fd.append('archivo', new Blob([Buffer.from(await wb.xlsx.writeBuffer())]), 'qa.xlsx');
  const r = await fetch(`${base}/inventario/importar-excel`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  assert.equal(r.status, 200);
  const d = ((await r.json()) as any).data;

  assert.equal(d.errores.length, 1);
  assert.equal(d.errores[0].fila, 2);
  assert.match(d.errores[0].error, /entero/);
  assert.equal(await prisma.lote.count({ where: { medicamentoId: medId, numeroLote: 'Lote-Decimal' } }), 0, 'no se truncó a 12');

  assert.equal(d.lotesRegistrados, 1);
  assert.ok(d.avisos.some((a: any) => a.fila === 3 && /leyó como número/.test(a.aviso)));
});
