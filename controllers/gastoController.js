const asyncHandler = require('../middleware/asyncHandler');
const { createRegistro, listRegistros, marcarComoPagada, updateRegistro } = require('../services/registroService');

const getAll = asyncHandler(async (req, res) => {
  const records = await listRegistros('gasto', req.query);
  res.json(records);
});

const create = asyncHandler(async (req, res) => {
  const record = await createRegistro('gasto', req.body, req.file);
  res.status(201).json({ message: 'Gasto registrado correctamente.', record });
});

const update = asyncHandler(async (req, res) => {
  const record = await updateRegistro('gasto', req.params.id, req.body, req.file);
  res.json({ message: 'Gasto actualizado correctamente.', record });
});

const pay = asyncHandler(async (req, res) => {
  const record = await marcarComoPagada('gasto', req.params.id, req.body);
  res.json({ message: 'Pago registrado correctamente.', record });
});

module.exports = { create, getAll, pay, update };
