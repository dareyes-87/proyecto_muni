// Prueba contra Postgres: el seed corre en CADA arranque, así que no debe revivir lo
// que la farmacia cambió ni crear medicamentos de ejemplo en producción.
// Usa una base propia (la crea y la borra) para no depender del estado de la compartida.
// Necesita DATABASE_URL con permiso CREATEDB.
//
//   node --import tsx --test tests/seed.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../src/config/prisma';

const backend = new URL('..', import.meta.url).pathname;
const nombreDb = `farmag_seed_test_${Date.now()}`;
const url = new URL(process.env.DATABASE_URL!);
url.pathname = '/' + nombreDb;
const entorno = { ...process.env, DATABASE_URL: url.toString(), ADMIN_INITIAL_PASSWORD: 'Seed-Prueba-2026', SEED_DEMO: '' };

const correr = (cmd: string[], extra: Record<string, string> = {}) =>
  execFileSync(process.execPath, cmd, { cwd: backend, env: { ...entorno, ...extra }, stdio: 'pipe' });
const sembrar = (extra?: Record<string, string>) => correr(['--import', 'tsx', 'prisma/seed.ts'], extra);

test('seed: no revive ubicaciones/categorías cambiadas y solo crea medicamentos con SEED_DEMO=true', async (t) => {
  await prisma.$executeRawUnsafe(`CREATE DATABASE "${nombreDb}"`);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  t.after(async () => {
    await db.$disconnect();
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${nombreDb}" WITH (FORCE)`);
  });
  correr(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);

  // Instalación nueva: catálogos sí, medicamentos no.
  sembrar();
  const nUbicaciones = await db.ubicacion.count();
  const nCategorias = await db.categoria.count();
  assert.ok(nUbicaciones > 0 && nCategorias > 0, 'una instalación nueva trae catálogos');
  assert.equal(await db.medicamento.count(), 0, 'sin SEED_DEMO no hay medicamentos de ejemplo');

  // La farmacia renombra una ubicación y una categoría, y desactiva otra categoría.
  await db.ubicacion.update({ where: { codigo: 'A' }, data: { codigo: 'ESTANTE-1' } });
  await db.categoria.update({ where: { nombre: 'Otro' }, data: { nombre: 'Varios' } });
  await db.categoria.update({ where: { nombre: 'Oftálmico' }, data: { activo: false } });

  sembrar();
  assert.equal(await db.ubicacion.count({ where: { codigo: 'A' } }), 0, 'el código viejo no reaparece');
  assert.equal(await db.categoria.count({ where: { nombre: 'Otro' } }), 0, 'el nombre viejo no reaparece');
  assert.equal((await db.categoria.findUnique({ where: { nombre: 'Oftálmico' } }))?.activo, false);
  assert.equal(await db.ubicacion.count(), nUbicaciones);
  assert.equal(await db.categoria.count(), nCategorias);
  assert.equal(await db.medicamento.count(), 0);

  // SEED_DEMO sin ninguna categoría activa: avisa y no crea nada ni falla.
  await db.categoria.updateMany({ data: { activo: false } });
  sembrar({ SEED_DEMO: 'true' });
  assert.equal(await db.medicamento.count(), 0);

  // SEED_DEMO con todas las categorías renombradas (ni la del ejemplo ni "Otro" existen):
  // usa la primera activa. Una segunda corrida no duplica.
  await db.categoria.updateMany({ data: { activo: true } });
  for (const [i, c] of (await db.categoria.findMany()).entries()) {
    await db.categoria.update({ where: { id: c.id }, data: { nombre: `Renombrada ${i}` } });
  }
  sembrar({ SEED_DEMO: 'true' });
  sembrar({ SEED_DEMO: 'true' });
  assert.equal(await db.medicamento.count(), 5);
});
