// Pruebas unitarias de la lógica de dominio pura del módulo de inventario.
// No tocan la base de datos (solo funciones puras). Se ejecutan con el runner
// integrado de Node sin dependencias extra:
//
//   docker compose exec api sh -c "cd /app && node --import tsx --test tests/inventario.service.test.ts"
//
// Cubren el criterio de vencimiento (fuente única estaVencido), el semáforo, la
// dispensabilidad y la validación de fecha de entrada — la lógica detrás de los
// hallazgos H-01 y H-34.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diasParaVencer,
  estaVencido,
  calcularSemaforo,
  esDispensable,
  validarFechaVencimientoEntrada,
  type Umbrales,
} from '../src/services/inventario.service';
import { formatFechaDia } from '../src/utils/formatDate';
import { parseFechaCelda } from '../src/utils/excel';

const UMBRALES: Umbrales = { rojo: 30, amarillo: 90 };

/**
 * Fecha de lote a N días de hoy (N negativo = pasado), como la entrega Prisma para
 * una columna @db.Date: medianoche UTC del día de calendario local. Con medianoche
 * local estas pruebas no veían el desfase de un día en zonas al oeste de UTC.
 */
function enDias(n: number): Date {
  const h = new Date();
  return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate() + n));
}

test('diasParaVencer: hoy = 0, futuro positivo, pasado negativo', () => {
  assert.equal(diasParaVencer(enDias(0)), 0);
  assert.equal(diasParaVencer(enDias(10)), 10);
  assert.equal(diasParaVencer(enDias(-3)), -3);
});

test('estaVencido: hoy y pasado cuentan como vencido (<= 0); futuro no', () => {
  assert.equal(estaVencido(enDias(0)), true, 'un lote que vence hoy está vencido (H-01)');
  assert.equal(estaVencido(enDias(-1)), true);
  assert.equal(estaVencido(enDias(1)), false);
  assert.equal(estaVencido(enDias(400)), false);
});

test('calcularSemaforo: VERDE / AMARILLO / ROJO / VENCIDO por umbrales', () => {
  assert.equal(calcularSemaforo(enDias(200), UMBRALES), 'VERDE');
  assert.equal(calcularSemaforo(enDias(60), UMBRALES), 'AMARILLO');
  assert.equal(calcularSemaforo(enDias(90), UMBRALES), 'AMARILLO'); // límite amarillo inclusivo
  assert.equal(calcularSemaforo(enDias(30), UMBRALES), 'ROJO'); // límite rojo inclusivo
  assert.equal(calcularSemaforo(enDias(10), UMBRALES), 'ROJO');
  assert.equal(calcularSemaforo(enDias(0), UMBRALES), 'VENCIDO');
  assert.equal(calcularSemaforo(enDias(-5), UMBRALES), 'VENCIDO');
});

test('calcularSemaforo: estado VENCIDO/DADO_DE_BAJA fuerza VENCIDO aunque la fecha sea futura', () => {
  assert.equal(calcularSemaforo(enDias(200), UMBRALES, 'VENCIDO'), 'VENCIDO');
  assert.equal(calcularSemaforo(enDias(200), UMBRALES, 'DADO_DE_BAJA'), 'VENCIDO');
});

test('esDispensable: solo DISPONIBLE + stock > 0 + fecha futura', () => {
  const futura = enDias(100);
  assert.equal(esDispensable({ estado: 'DISPONIBLE', fechaVencimiento: futura, cantidadActual: 5 }), true);
  assert.equal(esDispensable({ estado: 'DISPONIBLE', fechaVencimiento: futura, cantidadActual: 0 }), false, 'sin stock');
  assert.equal(esDispensable({ estado: 'AGOTADO', fechaVencimiento: futura, cantidadActual: 5 }), false, 'agotado');
  assert.equal(esDispensable({ estado: 'DISPONIBLE', fechaVencimiento: enDias(0), cantidadActual: 5 }), false, 'vence hoy (H-01)');
  assert.equal(esDispensable({ estado: 'DISPONIBLE', fechaVencimiento: enDias(-1), cantidadActual: 5 }), false, 'vencido');
});

test('validarFechaVencimientoEntrada: rechaza hoy/pasado, acepta futuro (H-34)', () => {
  assert.ok(validarFechaVencimientoEntrada(enDias(-1)), 'pasado → mensaje de error');
  assert.ok(validarFechaVencimientoEntrada(enDias(0)), 'hoy → mensaje de error');
  assert.equal(validarFechaVencimientoEntrada(enDias(1)), null, 'mañana → válido');
});

// Estas pruebas fijan `hoy` con componentes locales y el lote como medianoche UTC,
// así que valen en cualquier zona horaria; con el código anterior fallaban con
// TZ=America/Guatemala (el lote caía en el día anterior).
test('diasParaVencer: lote que vence mañana da 1 día y no está vencido; el de hoy sí está vencido', () => {
  const hoy = new Date(2026, 9, 16); // 16/10/2026, medianoche local
  const manana = new Date('2026-10-17T00:00:00Z');
  const hoyLote = new Date('2026-10-16T00:00:00Z');
  assert.equal(diasParaVencer(manana, hoy), 1);
  assert.equal(estaVencido(manana, hoy), false);
  assert.equal(diasParaVencer(hoyLote, hoy), 0);
  assert.equal(estaVencido(hoyLote, hoy), true);
  assert.equal(diasParaVencer(new Date('2026-10-15T00:00:00Z'), hoy), -1);
});

test('formatFechaDia: fecha de calendario sin desfase', () => {
  const venc = new Date('2027-12-31T00:00:00Z');
  assert.equal(formatFechaDia(venc), '31/12/2027');
  assert.equal(formatFechaDia('2027-12-31T00:00:00.000Z'), '31/12/2027');
});

test('parseFechaCelda: fecha de Excel, ISO y DD/MM/AAAA dan la misma fecha de calendario', () => {
  const dia = (d: Date | null) => d?.toISOString().slice(0, 10);
  // exceljs entrega las fechas nativas como medianoche UTC
  assert.equal(dia(parseFechaCelda(new Date('2027-12-31T00:00:00Z'))), '2027-12-31');
  assert.equal(dia(parseFechaCelda('2027-12-31')), '2027-12-31');
  assert.equal(dia(parseFechaCelda('31/12/2027')), '2027-12-31');
  assert.equal(parseFechaCelda('2027-02-31'), null, 'fecha imposible');
  assert.equal(parseFechaCelda('31/02/2027'), null, 'fecha imposible dd/mm/aaaa');
  assert.equal(parseFechaCelda(''), null);
});
