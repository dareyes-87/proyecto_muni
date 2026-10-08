// Pruebas de regresión del rate limit por IP del login (cierre de seguridad).
// SEC-RATE-001..005. Usa temporizadores simulados para la expiración de ventana.
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/ipRateLimit.test.ts"

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_INTENTOS_IP,
  VENTANA_IP_MS,
  registrarIntentoIp,
  msLimiteIpRestante,
  limpiarIp,
} from '../src/middleware/ipRateLimit';
import { MAX_INTENTOS, registrarFallo, msBloqueoRestante, limpiarIntentos } from '../src/middleware/loginRateLimit';

test('SEC-RATE-001: IP dentro del límite → permite solicitudes', () => {
  const ip = '10.0.0.1';
  limpiarIp(ip);
  for (let i = 1; i <= MAX_INTENTOS_IP; i++) {
    const r = registrarIntentoIp(ip);
    assert.equal(r.limitado, false, `intento ${i} dentro del límite`);
  }
  assert.equal(msLimiteIpRestante(ip), 0, 'aún no limitada en el límite exacto');
  limpiarIp(ip);
});

test('SEC-RATE-002: IP supera el límite → 429 (limitado)', () => {
  const ip = '10.0.0.2';
  limpiarIp(ip);
  for (let i = 0; i < MAX_INTENTOS_IP; i++) registrarIntentoIp(ip);
  const r = registrarIntentoIp(ip); // MAX+1
  assert.equal(r.limitado, true);
  assert.ok(r.restanteMs > 0);
  assert.ok(msLimiteIpRestante(ip) > 0);
  limpiarIp(ip);
});

test('SEC-RATE-003: tras superar el límite, sigue limitada (contraseña correcta no entra)', () => {
  const ip = '10.0.0.3';
  limpiarIp(ip);
  for (let i = 0; i <= MAX_INTENTOS_IP; i++) registrarIntentoIp(ip); // ya superado
  // Más solicitudes (p. ej. con la contraseña correcta) siguen limitadas: la ruta
  // consulta el límite ANTES de verificar credenciales.
  const r = registrarIntentoIp(ip);
  assert.equal(r.limitado, true, 'una solicitud posterior sigue bloqueada');
  assert.ok(msLimiteIpRestante(ip) > 0);
  limpiarIp(ip);
});

test('SEC-RATE-004: expira la ventana → vuelve a permitir', (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const ip = '10.0.0.4';
  limpiarIp(ip);
  for (let i = 0; i <= MAX_INTENTOS_IP; i++) registrarIntentoIp(ip);
  assert.ok(msLimiteIpRestante(ip) > 0, 'limitada dentro de la ventana');

  t.mock.timers.tick(VENTANA_IP_MS + 1000); // la ventana expira
  assert.equal(msLimiteIpRestante(ip), 0, 'tras expirar la ventana ya no está limitada');
  const r = registrarIntentoIp(ip);
  assert.equal(r.limitado, false, 'nueva ventana permite solicitudes de nuevo');
  limpiarIp(ip);
});

test('SEC-RATE-005: el lockout por usuario funciona independiente del límite por IP', () => {
  const ip = '10.0.0.5';
  const user = 'qa_rate_user';
  limpiarIp(ip);
  limpiarIntentos(user);
  // 3 fallos de un usuario desde una IP que NO ha superado su límite (3 << 20):
  for (let i = 0; i < MAX_INTENTOS; i++) registrarFallo(user);
  assert.ok(msBloqueoRestante(user) > 0, 'el usuario queda bloqueado por el lockout de cuenta');
  // La IP, con solo 3 intentos, NO está limitada: las dos capas son independientes.
  for (let i = 0; i < MAX_INTENTOS; i++) registrarIntentoIp(ip);
  assert.equal(msLimiteIpRestante(ip), 0, 'la IP no está limitada con pocos intentos');
  limpiarIp(ip);
  limpiarIntentos(user);
});
