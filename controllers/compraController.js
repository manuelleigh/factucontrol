const asyncHandler = require('../middleware/asyncHandler');
const { createRegistro, listRegistros, marcarComoPagada, updateRegistro } = require('../services/registroService');

const getAll = asyncHandler(async (req, res) => {
  const records = await listRegistros('compra', req.query);
  res.json(records);
});

const create = asyncHandler(async (req, res) => {
  const record = await createRegistro('compra', req.body, req.file);
  res.status(201).json({ message: 'Compra registrada correctamente.', record });
});

const update = asyncHandler(async (req, res) => {
  const record = await updateRegistro('compra', req.params.id, req.body, req.file);
  res.json({ message: 'Compra actualizada correctamente.', record });
});

const pay = asyncHandler(async (req, res) => {
  const record = await marcarComoPagada('compra', req.params.id, req.body);
  res.json({ message: 'Pago registrado correctamente.', record });
});

module.exports = { create, getAll, pay, update };
