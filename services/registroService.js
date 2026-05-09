const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const { CompraBien, GastoOperativo, Proveedor } = require('../models');
const { createHttpError } = require('../utils/httpError');
const { buildPaginationMeta, normalizePagination } = require('../utils/pagination');
const {
  COMPRA_CATEGORIAS,
  ESTADOS_BIEN,
  GASTO_CATEGORIAS,
  METODOS_PAGO,
} = require('../utils/constants');
const { calculateTotal, getEffectiveStatus, sanitizeFilename, toDecimal } = require('../utils/helpers');
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

function buildWhereClause(type, query = {}) {
  const where = {};
  if (query.proveedorId) where.proveedorId = query.proveedorId;
  if (query.categoria) where.categoria = query.categoria;
  if (query.search) {
    const or = [
      { numeroFactura: { [Op.like]: `%${query.search}%` } },
      { concepto: { [Op.like]: `%${query.search}%` } },
    ];
    if (type === 'compra') {
      or.push({ nombreBien: { [Op.like]: `%${query.search}%` } });
    }
    where[Op.or] = or;
  }
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
  if (payload.numeroFactura && payload.numeroFactura.length > 60) {
    errors.numeroFactura = 'El número de factura no puede superar 60 caracteres.';
  }
  if (payload.concepto && payload.concepto.length > 255) {
    errors.concepto = 'El concepto no puede superar 255 caracteres.';
  }
  if (type === 'compra' && payload.nombreBien && payload.nombreBien.length > 150) {
    errors.nombreBien = 'El nombre del bien no puede superar 150 caracteres.';
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
    throw createHttpError(400, 'Debes seleccionar un proveedor activo.');
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

function moveDraftUploadToFinal(draftFilePath) {
  if (!draftFilePath) return null;
  const normalized = String(draftFilePath).replace(/^\/+/, '');
  const sourceAbsolute = path.resolve(process.cwd(), normalized);
  if (!fs.existsSync(sourceAbsolute)) {
    throw createHttpError(400, 'El archivo temporal del borrador ya no existe.');
  }

  const finalDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
  const extension = path.extname(sourceAbsolute);
  const base = path.basename(sourceAbsolute, extension);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const finalFilename = `${unique}-${sanitizeFilename(base)}${extension.toLowerCase()}`;
  const finalAbsolute = path.join(finalDir, finalFilename);
  fs.renameSync(sourceAbsolute, finalAbsolute);
  return `/uploads/${finalFilename}`;
}

function resolveAttachmentPath(body, file) {
  if (file) return `/uploads/${file.filename}`;
  if (body?.draftFilePath) return moveDraftUploadToFinal(body.draftFilePath);
  return null;
}

function safeDeleteUpload(filePath) {
  if (!filePath) return;
  const relativePath = filePath.replace(/^\/+/, '');
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
}

async function ensureUniqueInvoice(type, payload, currentId = null) {
  const model = getModel(type);
  const where = {
    proveedorId: payload.proveedorId,
    numeroFactura: payload.numeroFactura,
  };
  if (currentId) where.id = { [Op.ne]: currentId };

  const existing = await model.findOne({ where });
  if (existing) {
    throw createHttpError(409, 'Ya existe una factura con ese número para este proveedor.');
  }
}

async function listRegistros(type, query = {}) {
  const model = getModel(type);
  await syncExpiredStatuses(model);
  const pagination = normalizePagination(query, { pageSize: 10, maxPageSize: 50 });

  const rows = await model.findAll({
    where: buildWhereClause(type, query),
    include: [{ model: Proveedor, as: 'proveedor' }],
    order: [['fechaEmision', 'DESC']],
  });

  const records = appendEffectiveStatus(rows, query.estado);
  const totalItems = records.length;
  const pageRecords = records.slice(pagination.offset, pagination.offset + pagination.limit);
  return {
    items: pageRecords,
    pagination: buildPaginationMeta(pagination.page, pagination.pageSize, totalItems),
  };
}

async function createRegistro(type, body, file) {
  const model = getModel(type);
  const attachmentPath = resolveAttachmentPath(body, file);
  const payload = buildPayload(body, attachmentPath ? { filename: attachmentPath.replace(/^\/uploads\//, '') } : null, type);
  if (attachmentPath) payload.archivoAdjunto = attachmentPath;
  const errors = validateCommonPayload(payload, type);

  if (Object.keys(errors).length) {
    if (attachmentPath) safeDeleteUpload(attachmentPath);
    throw createHttpError(400, 'No se pudo registrar la factura.', errors);
  }

  await ensureProveedorActivo(payload.proveedorId);
  await ensureUniqueInvoice(type, payload);
  return model.create(payload);
}

async function updateRegistro(type, id, body, file) {
  const model = getModel(type);
  const record = await model.findByPk(id);
  if (!record) {
    if (file) safeDeleteUpload(`/uploads/${file.filename}`);
    if (body?.draftFilePath) safeDeleteUpload(body.draftFilePath);
    throw createHttpError(404, 'Registro no encontrado.');
  }

  const attachmentPath = resolveAttachmentPath(body, file);
  const payload = buildPayload(body, attachmentPath ? { filename: attachmentPath.replace(/^\/uploads\//, '') } : null, type, record);
  if (attachmentPath) payload.archivoAdjunto = attachmentPath;
  const errors = validateCommonPayload(payload, type);
  if (Object.keys(errors).length) {
    if (attachmentPath) safeDeleteUpload(attachmentPath);
    throw createHttpError(400, 'No se pudo actualizar la factura.', errors);
  }

  await ensureProveedorActivo(payload.proveedorId);
  await ensureUniqueInvoice(type, payload, record.id);
  const previousAttachment = record.archivoAdjunto;
  await record.update(payload);

  if ((file || attachmentPath) && previousAttachment && previousAttachment !== payload.archivoAdjunto) {
    safeDeleteUpload(previousAttachment);
  }

  return record;
}

async function marcarComoPagada(type, id, body) {
  const model = getModel(type);
  const record = await model.findByPk(id);
  if (!record) {
    throw createHttpError(404, 'Registro no encontrado.');
  }

  const errors = {};
  const paymentDateError = validatePaymentDate(body.fechaPago, record.fechaEmision);
  if (paymentDateError) errors.fechaPago = paymentDateError;
  if (!METODOS_PAGO.includes(body.metodoPago)) {
    errors.metodoPago = 'El método de pago es inválido.';
  }

  if (Object.keys(errors).length) {
    throw createHttpError(400, 'No se pudo registrar el pago.', errors);
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
  const moduleTotals = registros.reduce(
    (acc, record) => {
      acc[record.modulo].cantidad += 1;
      acc[record.modulo].total += Number(record.total);
      return acc;
    },
    {
      Gasto: { cantidad: 0, total: 0 },
      Compra: { cantidad: 0, total: 0 },
    }
  );
  const providerTotals = registros.reduce((acc, record) => {
    const key = record.proveedor?.nombre || 'Sin proveedor';
    const current = acc[key] || { proveedor: key, total: 0, cantidad: 0 };
    current.total += Number(record.total);
    current.cantidad += 1;
    acc[key] = current;
    return acc;
  }, {});

  return {
    ...summary,
    moduleTotals,
    topProviders: Object.values(providerTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
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
  if (dayjs(endDate).isBefore(dayjs(startDate), 'day')) {
    throw createHttpError(400, 'La fecha final no puede ser anterior a la fecha inicial.');
  }

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
