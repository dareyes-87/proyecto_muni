// Arranque en producción con secretos de ejemplo: por defecto se ADVIERTE y se
// arranca (el servidor no se puede corregir en sitio); con STRICT_SECRETS=true se
// aborta. Se ejecuta config/env.ts en un proceso aparte porque llama process.exit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const raiz = path.join(__dirname, '..');

function cargarEnv(extra: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'farmag-env-'));
  const r = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "require('./src/config/env.ts'); console.log('CARGADO')"],
    {
      cwd: raiz,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        PREDEPLOY_BACKUP_DIR: dir,
        DATABASE_URL: 'postgresql://farmag:farmag_secret_2026@db:5432/farmag_db',
        JWT_SECRET: 'farmag_jwt_secret_cambiar_en_produccion',
        ...extra,
      },
    }
  );
  const estado = path.join(dir, 'ESTADO_ARRANQUE.txt');
  return { ...r, estado: fs.existsSync(estado) ? fs.readFileSync(estado, 'utf8') : '' };
}

test('producción con secretos de ejemplo: advierte, deja AVISO y arranca', () => {
  const r = cargarEnv({ NODE_ENV: 'production' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CARGADO/);
  assert.match(r.estado, /AVISO: .*JWT_SECRET/);
  assert.match(r.estado, /base de datos/);
});

test('producción con secretos de ejemplo y STRICT_SECRETS=true: no arranca', () => {
  const r = cargarEnv({ NODE_ENV: 'production', STRICT_SECRETS: 'true' });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, /CARGADO/);
});

test('el .env.example actual (CAMBIE_...) también cuenta como valor de ejemplo', () => {
  const r = cargarEnv({
    NODE_ENV: 'production',
    JWT_SECRET: 'CAMBIE_ESTE_SECRETO_POR_UNO_ALEATORIO',
    DATABASE_URL: 'postgresql://farmag:CAMBIE_ESTA_CONTRASENA@db:5432/farmag_db',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.estado, /JWT_SECRET/);
  assert.match(r.estado, /base de datos/);
});

test('desarrollo con secretos de ejemplo: sin aviso', () => {
  const r = cargarEnv({ NODE_ENV: 'development' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.estado, '');
});

test('producción con secretos propios: sin aviso', () => {
  const r = cargarEnv({
    NODE_ENV: 'production',
    JWT_SECRET: 'a3f9c1e07b5d4e8a9c217d4e5f6a8b90',
    DATABASE_URL: 'postgresql://farmag:Xk82-propia-larga@db:5432/farmag_db',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.estado, '');
});
