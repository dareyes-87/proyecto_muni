// Pruebas de regresión del bloqueo de login (H-09). Usa temporizadores simulados
// (node:test mock.timers) para verificar la EXPIRACIÓN del bloqueo de forma
// determinista, sin esperar 5 minutos reales.
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/loginRateLimit.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_INTENTOS,
  BLOQUEO_MS,
  registrarFallo,
  msBloqueoRestante,
  limpiarIntentos,
} from '../src/middleware/loginRateLimit';

test('registrarFallo: bloquea tras MAX_INTENTOS fallos', () => {
  const u = 'qa_lock_a';
  let r;
  for (let i = 0; i < MAX_INTENTOS; i++) r = registrarFallo(u);
  assert.equal(r!.bloqueado, true, 'queda bloqueado al 3er fallo');
  assert.equal(r!.intentosRestantes, 0);
  assert.ok(msBloqueoRestante(u) > 0, 'hay tiempo de bloqueo restante');
  limpiarIntentos(u);
});

test('antes de MAX_INTENTOS no bloquea y descuenta intentos', () => {
  const u = 'qa_lock_b';
  const r1 = registrarFallo(u);
  assert.equal(r1.bloqueado, false);
  assert.equal(r1.intentosRestantes, MAX_INTENTOS - 1);
  assert.equal(msBloqueoRestante(u), 0, 'sin bloqueo todavía');
  limpiarIntentos(u);
});

test('el bloqueo EXPIRA tras BLOQUEO_MS (timers simulados)', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const u = 'qa_lock_c';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u);
  assert.ok(msBloqueoRestante(u) > 0, 'bloqueado justo después');

  t.mock.timers.tick(BLOQUEO_MS - 1000); // casi expira
  assert.ok(msBloqueoRestante(u) > 0, 'sigue bloqueado 1s antes de expirar');

  t.mock.timers.tick(2000); // supera el límite
  assert.equal(msBloqueoRestante(u), 0, 'tras BLOQUEO_MS el bloqueo se libera');
  limpiarIntentos(u);
});

test('limpiarIntentos reinicia el contador (login exitoso)', () => {
  const u = 'qa_lock_d';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u);
  assert.ok(msBloqueoRestante(u) > 0);
  limpiarIntentos(u);
  assert.equal(msBloqueoRestante(u), 0, 'tras limpiar, sin bloqueo');
  const r = registrarFallo(u);
  assert.equal(r.intentosRestantes, MAX_INTENTOS - 1, 'el contador arranca de cero');
  limpiarIntentos(u);
});

test('la clave del bloqueo es insensible a mayúsculas/espacios (no se evade variando el caso)', () => {
  const u = 'QA_Lock_E';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u);
  assert.ok(msBloqueoRestante('qa_lock_e') > 0, 'misma clave en minúsculas');
  assert.ok(msBloqueoRestante('  QA_LOCK_E  ') > 0, 'misma clave con espacios');
  limpiarIntentos(u);
});
