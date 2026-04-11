const { Op } = require('sequelize');
const { Proveedor } = require('../models');

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
  if (!payload.identificacionFiscal) {
    errors.identificacionFiscal = 'La identificación fiscal es obligatoria.';
  }
  return errors;
}

async function listProveedores(search = '') {
  const where = {};

  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { identificacionFiscal: { [Op.like]: `%${search}%` } },
    ];
  }

  return Proveedor.findAll({
    where,
    order: [
      ['activo', 'DESC'],
      ['nombre', 'ASC'],
    ],
  });
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
    const error = new Error('No se pudo crear el proveedor.');
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  return Proveedor.create(payload);
}

async function updateProveedor(id, body) {
  const proveedor = await Proveedor.findByPk(id);
  if (!proveedor) {
    const error = new Error('Proveedor no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const payload = buildProveedorPayload(body);
  const errors = validateProveedor(payload);
  if (Object.keys(errors).length) {
    const error = new Error('No se pudo actualizar el proveedor.');
    error.statusCode = 400;
    error.details = errors;
    throw error;
  }

  await proveedor.update(payload);
  return proveedor;
}

async function deactivateProveedor(id) {
  const proveedor = await Proveedor.findByPk(id);
  if (!proveedor) {
    const error = new Error('Proveedor no encontrado.');
    error.statusCode = 404;
    throw error;
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
