// Pruebas de regresión de los controles de validación endurecidos en la auditoría
// de seguridad (2026-10-07). Cubren la causa raíz de H-020..H-023: entradas de
// tipo/rango inesperado que antes provocaban HTTP 500 o lógica incorrecta.
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/validacion.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPaginacion, esEnteroPositivo, exigirCadena, textoQuery, ErrorValidacion } from '../src/utils/validacion';

// --- esEnteroPositivo: núcleo del fix H-020 (cantidad de despacho) ---
test('esEnteroPositivo: acepta enteros positivos', () => {
  assert.equal(esEnteroPositivo(1), true);
  assert.equal(esEnteroPositivo(100), true);
});

test('esEnteroPositivo: rechaza NaN, string, objeto, 0, negativo, float (antes creaba dispensación fantasma)', () => {
  assert.equal(esEnteroPositivo('abc' as unknown), false);
  assert.equal(esEnteroPositivo('5' as unknown), false);
  assert.equal(esEnteroPositivo({ gt: 0 } as unknown), false);
  assert.equal(esEnteroPositivo(0), false);
  assert.equal(esEnteroPositivo(-3), false);
  assert.equal(esEnteroPositivo(1.5), false);
  assert.equal(esEnteroPositivo(NaN), false);
  assert.equal(esEnteroPositivo(null as unknown), false);
});

// --- exigirCadena: fix H-021 (login) / IDs de despacho ---
test('exigirCadena: devuelve la cadena cuando es válida', () => {
  assert.equal(exigirCadena('sec_admin', 'username'), 'sec_admin');
});

test('exigirCadena: lanza ErrorValidacion (400) con objeto/arreglo/vacío (antes 500)', () => {
  for (const malo of [{ a: 1 }, ['a'], '', '   ', 123, null, undefined]) {
    assert.throws(() => exigirCadena(malo as unknown, 'campo'), (e: any) => {
      return e instanceof ErrorValidacion && e.status === 400;
    });
  }
});

// --- clampPaginacion: fix H-022 (skip negativo → 500; limit sin tope) ---
test('clampPaginacion: page negativa no produce skip negativo', () => {
  const r = clampPaginacion(-5, 10, { maxLimit: 100 });
  assert.equal(r.page, 1);
  assert.equal(r.skip, 0);
  assert.ok(r.skip >= 0);
});

test('clampPaginacion: limit se topa en maxLimit', () => {
  const r = clampPaginacion(1, 999999, { defLimit: 50, maxLimit: 100 });
  assert.equal(r.limit, 100);
});

test('clampPaginacion: valores no numéricos caen a los por defecto', () => {
  const r = clampPaginacion('abc', 'xyz', { defLimit: 20, maxLimit: 100 });
  assert.equal(r.page, 1);
  assert.equal(r.limit, 20);
  assert.equal(r.skip, 0);
});

test('clampPaginacion: página válida calcula skip correcto', () => {
  const r = clampPaginacion(3, 25, { maxLimit: 100 });
  assert.equal(r.page, 3);
  assert.equal(r.limit, 25);
  assert.equal(r.skip, 50);
});

// --- textoQuery: evita 500 por HPP (?q=a&q=b) y tipos inesperados en query ---
test('textoQuery: devuelve la cadena cuando es string', () => {
  assert.equal(textoQuery('aceta'), 'aceta');
});

test('textoQuery: arreglo (HPP) → primer string (antes rompía .trim/Prisma con 500)', () => {
  assert.equal(textoQuery(['a', 'b']), 'a');
});

test('textoQuery: objeto / número / undefined → undefined (no se pasa a Prisma)', () => {
  assert.equal(textoQuery({ gt: '' } as unknown), undefined);
  assert.equal(textoQuery(123 as unknown), undefined);
  assert.equal(textoQuery(undefined), undefined);
  assert.equal(textoQuery([] as unknown), undefined);
});
