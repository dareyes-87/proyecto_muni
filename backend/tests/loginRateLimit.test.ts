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

const IP_A = '10.0.0.1';
const IP_B = '10.0.0.2';

test('registrarFallo: bloquea tras MAX_INTENTOS fallos', () => {
  const u = 'qa_lock_a';
  let r;
  for (let i = 0; i < MAX_INTENTOS; i++) r = registrarFallo(u, IP_A);
  assert.equal(r!.bloqueado, true, 'queda bloqueado al 3er fallo');
  assert.equal(r!.intentosRestantes, 0);
  assert.ok(msBloqueoRestante(u, IP_A) > 0, 'hay tiempo de bloqueo restante');
  limpiarIntentos(u, IP_A);
});

test('antes de MAX_INTENTOS no bloquea y descuenta intentos', () => {
  const u = 'qa_lock_b';
  const r1 = registrarFallo(u, IP_A);
  assert.equal(r1.bloqueado, false);
  assert.equal(r1.intentosRestantes, MAX_INTENTOS - 1);
  assert.equal(msBloqueoRestante(u, IP_A), 0, 'sin bloqueo todavía');
  limpiarIntentos(u, IP_A);
});

test('el bloqueo EXPIRA tras BLOQUEO_MS (timers simulados)', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const u = 'qa_lock_c';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u, IP_A);
  assert.ok(msBloqueoRestante(u, IP_A) > 0, 'bloqueado justo después');

  t.mock.timers.tick(BLOQUEO_MS - 1000); // casi expira
  assert.ok(msBloqueoRestante(u, IP_A) > 0, 'sigue bloqueado 1s antes de expirar');

  t.mock.timers.tick(2000); // supera el límite
  assert.equal(msBloqueoRestante(u, IP_A), 0, 'tras BLOQUEO_MS el bloqueo se libera');
  limpiarIntentos(u, IP_A);
});

test('limpiarIntentos reinicia el contador (login exitoso)', () => {
  const u = 'qa_lock_d';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u, IP_A);
  assert.ok(msBloqueoRestante(u, IP_A) > 0);
  limpiarIntentos(u, IP_A);
  assert.equal(msBloqueoRestante(u, IP_A), 0, 'tras limpiar, sin bloqueo');
  const r = registrarFallo(u, IP_A);
  assert.equal(r.intentosRestantes, MAX_INTENTOS - 1, 'el contador arranca de cero');
  limpiarIntentos(u, IP_A);
});

test('la clave del bloqueo es insensible a mayúsculas/espacios (no se evade variando el caso)', () => {
  const u = 'QA_Lock_E';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u, IP_A);
  assert.ok(msBloqueoRestante('qa_lock_e', IP_A) > 0, 'misma clave en minúsculas');
  assert.ok(msBloqueoRestante('  QA_LOCK_E  ', IP_A) > 0, 'misma clave con espacios');
  limpiarIntentos(u, IP_A);
});

test('el bloqueo es por usuario+IP: 3 fallos desde A no bloquean al usuario desde B', () => {
  const u = 'qa_lock_f';
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(u, IP_A);
  assert.ok(msBloqueoRestante(u, IP_A) > 0, 'bloqueado desde la IP A');
  assert.equal(msBloqueoRestante(u, IP_B), 0, 'desde la IP B puede seguir entrando');
  const r = registrarFallo(u, IP_B);
  assert.equal(r.bloqueado, false, 'los fallos de A no cuentan para B');
  assert.equal(r.intentosRestantes, MAX_INTENTOS - 1);
  limpiarIntentos(u, IP_A);
  limpiarIntentos(u, IP_B);
});
