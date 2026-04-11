const dayjs = require('dayjs');

function toDecimal(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateTotal(baseImponible, porcentajeImpuesto) {
  const base = toDecimal(baseImponible);
  const impuesto = toDecimal(porcentajeImpuesto);
  return Number((base + (base * impuesto) / 100).toFixed(2));
}

function getEffectiveStatus(record, today = dayjs()) {
  if (!record) return 'Pendiente';
  if (record.estado === 'Pagada') return 'Pagada';
  if (dayjs(record.fechaVencimiento).isBefore(today, 'day')) return 'Vencida';
  return 'Pendiente';
}

function formatDate(date) {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
}

function formatDateReadable(date) {
  if (!date) return 'Sin fecha';
  return dayjs(date).format('DD/MM/YYYY');
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount);
}

function sanitizeFilename(name) {
  return String(name || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

module.exports = {
  calculateTotal,
  formatCurrency,
  formatDate,
  formatDateReadable,
  getEffectiveStatus,
  sanitizeFilename,
  toDecimal,
};
