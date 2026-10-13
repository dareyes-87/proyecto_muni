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

const UMBRALES: Umbrales = { rojo: 30, amarillo: 90 };

/** Devuelve un Date a medianoche a N días de hoy (N negativo = pasado). */
function enDias(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
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
