const { Op } = require('sequelize');
const { Proveedor } = require('../models');
const { createHttpError } = require('../utils/httpError');
const { buildPaginationMeta, normalizePagination } = require('../utils/pagination');

function buildProveedorPayload(payload) {
  return {
    nombre: String(payload.nombre || '').trim(),
    identificacionFiscal: String(payload.identificacionFiscal || '').trim(),
    giro: String(payload.giro || '').trim() || null,
    telefono: String(payload.telefono || '').trim() || null,
    correo: String(payload.correo || '').trim() || null,
    activo: payload.activo === 'false' || payload.activo === false ? false : true,
  };
}

function validateProveedor(payload) {
  const errors = {};
  if (!payload.nombre) errors.nombre = 'El nombre del proveedor es obligatorio.';
  if (payload.nombre && payload.nombre.length > 120) {
    errors.nombre = 'El nombre del proveedor no puede superar 120 caracteres.';
  }
  if (!payload.identificacionFiscal) {
    errors.identificacionFiscal = 'La identificación fiscal es obligatoria.';
  }
  if (payload.identificacionFiscal && payload.identificacionFiscal.length > 50) {
    errors.identificacionFiscal = 'La identificación fiscal no puede superar 50 caracteres.';
  }
  if (payload.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.correo)) {
    errors.correo = 'El correo electrónico no tiene un formato válido.';
  }
  return errors;
}

async function listProveedores(search = '', query = {}) {
  const where = {};

  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { identificacionFiscal: { [Op.like]: `%${search}%` } },
      { giro: { [Op.like]: `%${search}%` } },
    ];
  }

  const pagination = normalizePagination(query, { pageSize: 10, maxPageSize: 50 });
  const { count, rows } = await Proveedor.findAndCountAll({
    where,
    order: [
      ['activo', 'DESC'],
      ['nombre', 'ASC'],
    ],
    limit: pagination.limit,
    offset: pagination.offset,
  });

  return {
    items: rows,
    pagination: buildPaginationMeta(pagination.page, pagination.pageSize, count),
  };
}

async function listActiveProveedores() {
  return Proveedor.findAll({
    where: { activo: true },
    order: [['nombre', 'ASC']],
  });
}

async function createProveedor(body) {
  const payload = buildProveedorPayload(body);
  const errors = validateProveedor(payload);
  if (Object.keys(errors).length) {
    throw createHttpError(400, 'No se pudo crear el proveedor.', errors);
  }

  const existing = await Proveedor.findOne({
    where: { identificacionFiscal: payload.identificacionFiscal },
  });
  if (existing) {
    throw createHttpError(409, 'Ya existe un proveedor con esa identificación fiscal.');
  }

  return Proveedor.create(payload);
}

async function updateProveedor(id, body) {
  const proveedor = await Proveedor.findByPk(id);
  if (!proveedor) {
    throw createHttpError(404, 'Proveedor no encontrado.');
  }

  const payload = buildProveedorPayload(body);
  const errors = validateProveedor(payload);
  if (Object.keys(errors).length) {
    throw createHttpError(400, 'No se pudo actualizar el proveedor.', errors);
  }

  const duplicate = await Proveedor.findOne({
    where: {
      identificacionFiscal: payload.identificacionFiscal,
      id: { [Op.ne]: proveedor.id },
    },
  });
  if (duplicate) {
    throw createHttpError(409, 'Ya existe otro proveedor con esa identificación fiscal.');
  }

  await proveedor.update(payload);
  return proveedor;
}

async function deactivateProveedor(id) {
  const proveedor = await Proveedor.findByPk(id);
  if (!proveedor) {
    throw createHttpError(404, 'Proveedor no encontrado.');
  }

  await proveedor.update({ activo: false });
  return proveedor;
}

module.exports = {
  createProveedor,
  deactivateProveedor,
  listActiveProveedores,
  listProveedores,
  updateProveedor,
};
