const dayjs = require('dayjs');

function toNumber(value) {
  const parsed = Number(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDecimal(value, digits = 2) {
  return Number(toNumber(value).toFixed(digits));
}

function calculateTotal(baseImponible, porcentajeImpuesto) {
  const base = toNumber(baseImponible);
  const impuesto = toNumber(porcentajeImpuesto);
  return Number((base * (1 + impuesto / 100)).toFixed(2));
}

function getEffectiveStatus(record, today = dayjs()) {
  if (!record) return 'Pendiente';
  const estado = record.estado || record.estadoEfectivo;
  if (['Pagada', 'Cobrado', 'Aprobada'].includes(estado)) return estado;
  const dueDate = record.fechaVencimiento || record.fechaVigencia;
  if (dueDate && dayjs(dueDate).isBefore(today, 'day')) {
    return 'Vencida';
  }
  return estado || 'Pendiente';
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
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(toNumber(value));
}

function sanitizeFilename(name) {
  return String(name || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value ?? null), 'utf8').toString('base64');
}

function decodeJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(String(value), 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function progressPercentage(current, total) {
  const denominator = toNumber(total);
  if (denominator <= 0) return 0;
  return Math.min(100, Math.max(0, (toNumber(current) / denominator) * 100));
}

function yesNo(value) {
  return value ? 'Si' : 'No';
}

function getByPath(object, path) {
  if (!object || !path) return '';
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc == null ? acc : acc[key]), object);
}

function buildQueryString(query = {}, overrides = {}) {
  const params = new URLSearchParams();
  const merged = { ...query, ...overrides };
  Object.entries(merged).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const str = params.toString();
  return str ? `?${str}` : '';
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const parsedA = Date.parse(a);
  const parsedB = Date.parse(b);
  if (!Number.isNaN(parsedA) && !Number.isNaN(parsedB)) return parsedA - parsedB;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

module.exports = {
  calculateTotal,
  decodeJson,
  encodeJson,
  formatCurrency,
  formatDate,
  formatDateReadable,
  buildQueryString,
  compareValues,
  getByPath,
  getEffectiveStatus,
  progressPercentage,
  sanitizeFilename,
  toDecimal,
  toNumber,
  yesNo,
};
