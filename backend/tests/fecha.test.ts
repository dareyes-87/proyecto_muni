// Pruebas de regresión del validador de fechas de query (H-004).
// Reproduce lo que antes provocaba HTTP 500: una fecha inválida ahora lanza
// ErrorFechaInvalida (status 400), y una fecha/rango válidos se aceptan.
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/fecha.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFechaQuery, parseRangoFechas, ErrorFechaInvalida } from '../src/utils/fecha';

test('parseFechaQuery: fecha válida (AAAA-MM-DD) → Date', () => {
  const d = parseFechaQuery('2026-10-07', 'fecha desde');
  assert.ok(d instanceof Date);
  assert.equal(isNaN(d!.getTime()), false);
});

test('parseFechaQuery: fecha vacía/ausente → undefined (no error)', () => {
  assert.equal(parseFechaQuery(''), undefined);
  assert.equal(parseFechaQuery(undefined), undefined);
  assert.equal(parseFechaQuery(null), undefined);
});

test('parseFechaQuery: cadena inválida → ErrorFechaInvalida con status 400 (antes 500)', () => {
  assert.throws(
    () => parseFechaQuery('basura', 'fecha desde'),
    (err: any) => err instanceof ErrorFechaInvalida && err.status === 400
  );
});

test('parseFechaQuery: formato incorrecto → 400', () => {
  assert.throws(() => parseFechaQuery('2026-13-45'), (err: any) => err.status === 400); // mes/día inexistentes (ISO)
  assert.throws(() => parseFechaQuery('no-fecha'), (err: any) => err.status === 400);
  assert.throws(() => parseFechaQuery('basura-total'), (err: any) => err.status === 400);
});

test('parseFechaQuery: tipo no-string → 400', () => {
  assert.throws(() => parseFechaQuery(12345 as unknown), (err: any) => err.status === 400);
});

test('parseRangoFechas: rango válido → ambas fechas', () => {
  const { desde, hasta } = parseRangoFechas('2026-01-01', '2026-12-31');
  assert.ok(desde && hasta);
});

test('parseRangoFechas: una inválida → 400', () => {
  assert.throws(() => parseRangoFechas('2026-01-01', 'xx'), (err: any) => err.status === 400);
});

test('parseRangoFechas: rango invertido (desde > hasta) → 400', () => {
  assert.throws(
    () => parseRangoFechas('2026-12-31', '2026-01-01'),
    (err: any) => err instanceof ErrorFechaInvalida && err.status === 400
  );
});

test('parseRangoFechas: ambas vacías → sin fechas, sin error', () => {
  const { desde, hasta } = parseRangoFechas(undefined, '');
  assert.equal(desde, undefined);
  assert.equal(hasta, undefined);
});
