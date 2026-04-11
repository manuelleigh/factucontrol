const asyncHandler = require('../middleware/asyncHandler');
const { createProveedor, deactivateProveedor, listProveedores, updateProveedor } = require('../services/proveedorService');

const getAll = asyncHandler(async (req, res) => {
  const proveedores = await listProveedores(req.query.search || '');
  res.json(proveedores);
});

const create = asyncHandler(async (req, res) => {
  const proveedor = await createProveedor(req.body);
  res.status(201).json({ message: 'Proveedor creado correctamente.', proveedor });
});

const update = asyncHandler(async (req, res) => {
  const proveedor = await updateProveedor(req.params.id, req.body);
  res.json({ message: 'Proveedor actualizado correctamente.', proveedor });
});

const deactivate = asyncHandler(async (req, res) => {
  const proveedor = await deactivateProveedor(req.params.id);
  res.json({ message: 'Proveedor desactivado correctamente.', proveedor });
});

module.exports = { create, deactivate, getAll, update };
