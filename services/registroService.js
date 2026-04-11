const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { CompraBien, GastoOperativo, Proveedor } = require('../models');
const {
  COMPRA_CATEGORIAS,
  ESTADOS_BIEN,
  GASTO_CATEGORIAS,
  METODOS_PAGO,
} = require('../utils/constants');
const { calculateTotal, getEffectiveStatus, toDecimal } = require('../utils/helpers');
const {
  computeDashboardSummary,
  validateDateRange,
  validatePaymentDate,
} = require('../utils/registroRules');

function getModel(type) {
  return type === 'compra' ? CompraBien : GastoOperativo;
}

function getDefaultCategories(type) {
  return type === 'compra' ? COMPRA_CATEGORIAS : GASTO_CATEGORIAS;
}

function buildWhereClause(query = {}) {
  const where = {};
  if (query.proveedorId) where.proveedorId = query.proveedorId;
  if (query.categoria) where.categoria = query.categoria;
  if (query.fechaInicio || query.fechaFin) {
    where.fechaEmision = {};
    if (query.fechaInicio) where.fechaEmision[Op.gte] = query.fechaInicio;
    if (query.fechaFin) where.fechaEmision[Op.lte] = query.fechaFin;
  }
  return where;
}

function appendEffectiveStatus(records, status) {
  const normalized = records.map((record) => {
    const plain = record.get ? record.get({ plain: true }) : record;
    return { ...plain, estadoEfectivo: getEffectiveStatus(plain) };
  });

  if (!status) return normalized;
  return normalized.filter((record) => record.estadoEfectivo === status);
}

async function syncExpiredStatuses(model) {
  await model.update(
    { estado: 'Vencida' },
    {
      where: {
        estado: 'Pendiente',
        fechaVencimiento: { [Op.lt]: dayjs().format('YYYY-MM-DD') },
      },
    }
  );
}

function validateCommonPayload(payload, type) {
  const errors = {};
  ['proveedorId', 'numeroFactura', 'fechaEmision', 'fechaVencimiento', 'categoria', 'concepto'].forEach(
    (field) => {
      if (!payload[field]) errors[field] = 'Este campo es obligatorio.';
    }
  );

  if (payload.baseImponible <= 0) errors.baseImponible = 'La base imponible debe ser mayor a cero.';
  if (payload.porcentajeImpuesto < 0) errors.porcentajeImpuesto = 'El impuesto no puede ser negativo.';
  if (payload.porcentajeImpuesto > 100) {
    errors.porcentajeImpuesto = 'El impuesto no puede ser mayor a 100%.';
  }
  if (!getDefaultCategories(type).includes(payload.categoria)) {
    errors.categoria = 'La categoría seleccionada no es válida.';
  }

  const dateError = validateDateRange(payload.fechaEmision, payload.fechaVencimiento);
  if (dateError) errors.fechaVencimiento = dateError;

  if (type === 'compra') {
    if (!payload.nombreBien) errors.nombreBien = 'El nombre del bien es obligatorio.';
    if (!payload.cantidad || payload.cantidad < 1) errors.cantidad = 'La cantidad debe ser mayor a cero.';
    if (!ESTADOS_BIEN.includes(payload.estadoBien)) {
      errors.estadoBien = 'El estado del bien es inválido.';
    }
  }

  return errors;
}

async function ensureProveedorActivo(proveedorId) {
  const proveedor = await Proveedor.findByPk(proveedorId);
  if (!proveedor || !proveedor.activo) {
    const error = new Error('Debes seleccionar un proveedor activo.');
    error.statusCode = 400;
    throw error;
  }
}

function buildPayload(body, file, type, currentRecord = null) {
  const isPaidRecord = currentRecord && currentRecord.estado === 'Pagada';
  const payload = {
    proveedorId: Number(body.proveedorId),
    numeroFactura: String(body.numeroFactura || '').trim(),
    fechaEmision: body.fechaEmision,
    fechaVencimiento: body.fechaVencimiento,
    categoria: String(body.categoria || '').trim(),
    concepto: String(body.concepto || '').trim(),
    baseImponible: toDecimal(body.baseImponible),
    porcentajeImpuesto: toDecimal(body.porcentajeImpuesto),
    total: calculateTotal(body.baseImponible, body.porcentajeImpuesto),
    estado: isPaidRecord ? 'Pagada' : 'Pendiente',
    fechaPago: isPaidRecord ? currentRecord.fechaPago : null,
    metodoPago: isPaidRecord ? currentRecord.metodoPago : null,
    archivoAdjunto: currentRecord ? currentRecord.archivoAdjunto : null,
  };

  if (file) payload.archivoAdjunto = `/uploads/${file.filename}`;

  if (type === 'compra') {
    payload.nombreBien = String(body.nombreBien || '').trim();
    payload.cantidad = Number(body.cantidad);
    payload.estadoBien = body.estadoBien;
  }

  return payload;
}

function safeDeleteUpload(filePath) {
  if (!filePath) return;
  const relativePath = filePath.replace(/^\/+/, '');
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
}

async function listRegistros(type, query = {}) {
  const model = getModel(type);
  await syncExpiredStatuses(model);

  const records = await model.findAll({
    where: buildWhereClause(query),
    include: [{ model: Proveedor, as: 'proveedor' }],
    order: [['fechaEmision', 'DESC']],
  });

  return appendEffectiveStatus(records, query.estado);
}

async function createRegistro(type, body, file) {
  const model = getModel(type);
  const payload = buildPayload(body, file, type);
  const errors = validateCommonPayload(payload, type);

  if (Object.keys(errors).length) {
    if (file) safeDeleteUpload(`/uploads/${file.filename}`);
    const error = new Error('No se pudo registrar la factura.');
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  await ensureProveedorActivo(payload.proveedorId);
  return model.create(payload);
}

async function updateRegistro(type, id, body, file) {
  const model = getModel(type);
  const record = await model.findByPk(id);
  if (!record) {
    if (file) safeDeleteUpload(`/uploads/${file.filename}`);
    const error = new Error('Registro no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const payload = buildPayload(body, file, type, record);
  const errors = validateCommonPayload(payload, type);
  if (Object.keys(errors).length) {
    if (file) safeDeleteUpload(`/uploads/${file.filename}`);
    const error = new Error('No se pudo actualizar la factura.');
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  await ensureProveedorActivo(payload.proveedorId);
  const previousAttachment = record.archivoAdjunto;
  await record.update(payload);

  if (file && previousAttachment && previousAttachment !== payload.archivoAdjunto) {
    safeDeleteUpload(previousAttachment);
  }

  return record;
}

async function marcarComoPagada(type, id, body) {
  const model = getModel(type);
  const record = await model.findByPk(id);
  if (!record) {
    const error = new Error('Registro no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const errors = {};
  const paymentDateError = validatePaymentDate(body.fechaPago, record.fechaEmision);
  if (paymentDateError) errors.fechaPago = paymentDateError;
  if (!METODOS_PAGO.includes(body.metodoPago)) {
    errors.metodoPago = 'El método de pago es inválido.';
  }

  if (Object.keys(errors).length) {
    const error = new Error('No se pudo registrar el pago.');
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  await record.update({
    estado: 'Pagada',
    fechaPago: body.fechaPago,
    metodoPago: body.metodoPago,
  });

  return record;
}

async function getDashboardData() {
  await Promise.all([syncExpiredStatuses(GastoOperativo), syncExpiredStatuses(CompraBien)]);

  const [gastos, compras] = await Promise.all([
    GastoOperativo.findAll({ include: [{ model: Proveedor, as: 'proveedor' }] }),
    CompraBien.findAll({ include: [{ model: Proveedor, as: 'proveedor' }] }),
  ]);

  const registros = [...gastos, ...compras].map((item) => {
    const plain = item.get({ plain: true });
    return {
      ...plain,
      estadoEfectivo: getEffectiveStatus(plain),
      modulo: item instanceof CompraBien ? 'Compra' : 'Gasto',
    };
  });

  const summary = computeDashboardSummary(registros);

  return {
    ...summary,
    recentRecords: registros
      .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
      .slice(0, 8),
  };
}

async function getReportDataByMonth(month, year) {
  const monthString = `${year}-${String(month).padStart(2, '0')}`;
  const startDate = `${monthString}-01`;
  const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
  return getReportDataByRange(startDate, endDate);
}

async function getReportDataByRange(startDate, endDate) {
  await Promise.all([syncExpiredStatuses(GastoOperativo), syncExpiredStatuses(CompraBien)]);

  const where = { fechaEmision: { [Op.gte]: startDate, [Op.lte]: endDate } };
  const [gastos, compras] = await Promise.all([
    GastoOperativo.findAll({ where, include: [{ model: Proveedor, as: 'proveedor' }] }),
    CompraBien.findAll({ where, include: [{ model: Proveedor, as: 'proveedor' }] }),
  ]);

  const records = [...gastos, ...compras]
    .map((item) => {
      const plain = item.get({ plain: true });
      return {
        ...plain,
        modulo: item instanceof CompraBien ? 'Compra' : 'Gasto',
        estadoEfectivo: getEffectiveStatus(plain),
      };
    })
    .sort((a, b) => new Date(a.fechaEmision) - new Date(b.fechaEmision));

  const total = records.reduce((acc, record) => acc + Number(record.total), 0);
  const groupedByCategory = records.reduce((acc, record) => {
    const current = acc[record.categoria] || { categoria: record.categoria, total: 0, cantidad: 0 };
    current.total += Number(record.total);
    current.cantidad += 1;
    acc[record.categoria] = current;
    return acc;
  }, {});
  const groupedByModule = records.reduce(
    (acc, record) => {
      const key = record.modulo;
      acc[key].total += Number(record.total);
      acc[key].cantidad += 1;
      return acc;
    },
    {
      Gasto: { total: 0, cantidad: 0 },
      Compra: { total: 0, cantidad: 0 },
    }
  );

  const categories = Object.values(groupedByCategory)
    .map((item) => ({
      ...item,
      porcentaje: total ? Number(((item.total / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    startDate,
    endDate,
    records,
    total,
    categories,
    modules: groupedByModule,
  };
}

module.exports = {
  createRegistro,
  getDashboardData,
  getDefaultCategories,
  getReportDataByMonth,
  getReportDataByRange,
  listRegistros,
  marcarComoPagada,
  updateRegistro,
};
