const test = require('node:test');
const assert = require('node:assert/strict');
const dayjs = require('dayjs');

const {
  computeDashboardSummary,
  validateDateRange,
  validatePaymentDate,
} = require('../utils/registroRules');
const { calculateTotal, getEffectiveStatus } = require('../utils/helpers');

test('calculateTotal applies tax correctly', () => {
  assert.equal(calculateTotal(100, 18), 118);
  assert.equal(calculateTotal(100, 0), 100);
});

test('getEffectiveStatus derives vencida from due date', () => {
  assert.equal(
    getEffectiveStatus({ estado: 'Pendiente', fechaVencimiento: '2026-04-01' }, dayjs('2026-04-11')),
    'Vencida'
  );
  assert.equal(
    getEffectiveStatus({ estado: 'Pagada', fechaVencimiento: '2026-04-01' }, dayjs('2026-04-11')),
    'Pagada'
  );
});

test('validateDateRange rejects inverted dates', () => {
  assert.equal(
    validateDateRange('2026-04-12', '2026-04-11'),
    'La fecha de vencimiento no puede ser anterior a la fecha de emisión.'
  );
  assert.equal(validateDateRange('2026-04-11', '2026-04-11'), null);
});

test('validatePaymentDate rejects payments before issue date', () => {
  assert.equal(
    validatePaymentDate('2026-04-01', '2026-04-11'),
    'La fecha de pago no puede ser anterior a la fecha de emisión.'
  );
  assert.equal(validatePaymentDate('2026-04-12', '2026-04-11'), null);
});

test('computeDashboardSummary matches PDF logic for pending upcoming and overdue', () => {
  const registros = [
    { fechaEmision: '2026-04-03', fechaVencimiento: '2026-04-20', estadoEfectivo: 'Pendiente', categoria: 'Arriendo', total: 100 },
    { fechaEmision: '2026-04-05', fechaVencimiento: '2026-04-15', estadoEfectivo: 'Pendiente', categoria: 'Internet', total: 50 },
    { fechaEmision: '2026-04-02', fechaVencimiento: '2026-04-09', estadoEfectivo: 'Vencida', categoria: 'Arriendo', total: 80 },
    { fechaEmision: '2026-04-01', fechaVencimiento: '2026-04-30', estadoEfectivo: 'Pagada', categoria: 'Equipos', total: 200 },
  ];

  const summary = computeDashboardSummary(registros, dayjs('2026-04-11'));

  assert.equal(summary.resumen.totalMes, 430);
  assert.equal(summary.resumen.pendientesCantidad, 2);
  assert.equal(summary.resumen.pendientesMonto, 150);
  assert.equal(summary.resumen.proximasCantidad, 1);
  assert.equal(summary.resumen.proximasMonto, 50);
  assert.equal(summary.resumen.vencidasCantidad, 1);
  assert.equal(summary.resumen.vencidasMonto, 80);
  assert.equal(summary.distribution[0].categoria, 'Equipos');
});
