const asyncHandler = require('../middleware/asyncHandler');
const {
  approveCotizacion,
  approvePresupuesto,
  closeObra,
  deactivateCliente,
  deactivateProveedor,
  getDashboardData,
  getRentabilidadData,
  listCategorias,
  listClientes,
  listCobros,
  listCompras,
  listCotizaciones,
  listGastos,
  listObras,
  listPresupuestos,
  listProveedores,
  payCompra,
  payGasto,
  rejectCotizacion,
  rejectPresupuesto,
  saveCategoria,
  saveCliente,
  saveCobro,
  saveCompra,
  saveCotizacion,
  saveGasto,
  saveObra,
  savePresupuesto,
  saveProveedor,
  sendOverdueNotificationSummary,
} = require('../services/gestpymeService');

function sendList(res, result) {
  return res.json(result);
}

const dashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardData(req.query);
  if (data.alertas.length && req.user?.email) {
    sendOverdueNotificationSummary(req.user.email).catch(() => {});
  }
  return res.json(data);
});
const rentabilidad = asyncHandler(async (req, res) => res.json(await getRentabilidadData()));

const proveedores = {
  list: asyncHandler(async (req, res) => sendList(res, await listProveedores(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ proveedor: await saveProveedor(req.body, req.user?.id) })),
  update: asyncHandler(async (req, res) => res.json({ proveedor: await saveProveedor(req.body, req.user?.id, req.params.id) })),
  deactivate: asyncHandler(async (req, res) => res.json({ proveedor: await deactivateProveedor(req.params.id, req.user?.id) })),
};

const clientes = {
  list: asyncHandler(async (req, res) => sendList(res, await listClientes(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ cliente: await saveCliente(req.body, req.user?.id) })),
  update: asyncHandler(async (req, res) => res.json({ cliente: await saveCliente(req.body, req.user?.id, req.params.id) })),
  deactivate: asyncHandler(async (req, res) => res.json({ cliente: await deactivateCliente(req.params.id, req.user?.id) })),
};

const categorias = {
  list: asyncHandler(async (req, res) => sendList(res, await listCategorias(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ categoria: await saveCategoria(req.body, req.user?.id) })),
  update: asyncHandler(async (req, res) => res.json({ categoria: await saveCategoria(req.body, req.user?.id, req.params.id) })),
};

const obras = {
  list: asyncHandler(async (req, res) => sendList(res, await listObras(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ obra: await saveObra(req.body, req.user?.id) })),
  update: asyncHandler(async (req, res) => res.json({ obra: await saveObra(req.body, req.user?.id, req.params.id) })),
  close: asyncHandler(async (req, res) => res.json({ obra: await closeObra(req.params.id, req.user?.id) })),
};

const cobros = {
  list: asyncHandler(async (req, res) => sendList(res, await listCobros(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ cobro: await saveCobro(req.body, req.user?.id, null, req.file) })),
  update: asyncHandler(async (req, res) => res.json({ cobro: await saveCobro(req.body, req.user?.id, req.params.id, req.file) })),
};

const presupuestos = {
  list: asyncHandler(async (req, res) => sendList(res, await listPresupuestos(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ presupuesto: await savePresupuesto(req.body, req.user?.id) })),
  update: asyncHandler(async (req, res) => res.json({ presupuesto: await savePresupuesto(req.body, req.user?.id, req.params.id) })),
  approve: asyncHandler(async (req, res) => res.json(await approvePresupuesto(req.params.id, req.user?.id))),
  reject: asyncHandler(async (req, res) => res.json({ presupuesto: await rejectPresupuesto(req.params.id, req.user?.id) })),
};

const cotizaciones = {
  list: asyncHandler(async (req, res) => sendList(res, await listCotizaciones(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ cotizacion: await saveCotizacion(req.body, req.user?.id) })),
  update: asyncHandler(async (req, res) => res.json({ cotizacion: await saveCotizacion(req.body, req.user?.id, req.params.id) })),
  approve: asyncHandler(async (req, res) => res.json({ cotizacion: await approveCotizacion(req.params.id, req.user?.id) })),
  reject: asyncHandler(async (req, res) => res.json({ cotizacion: await rejectCotizacion(req.params.id, req.user?.id) })),
};

const gastos = {
  list: asyncHandler(async (req, res) => sendList(res, await listGastos(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ gasto: await saveGasto(req.body, req.user?.id, null, req.file) })),
  update: asyncHandler(async (req, res) => res.json({ gasto: await saveGasto(req.body, req.user?.id, req.params.id, req.file) })),
  pay: asyncHandler(async (req, res) => res.json({ gasto: await payGasto(req.params.id, req.body, req.user?.id) })),
};

const compras = {
  list: asyncHandler(async (req, res) => sendList(res, await listCompras(req.query))),
  create: asyncHandler(async (req, res) => res.status(201).json({ compra: await saveCompra(req.body, req.user?.id, null, req.file) })),
  update: asyncHandler(async (req, res) => res.json({ compra: await saveCompra(req.body, req.user?.id, req.params.id, req.file) })),
  pay: asyncHandler(async (req, res) => res.json({ compra: await payCompra(req.params.id, req.body, req.user?.id) })),
};

module.exports = {
  compras,
  cobros,
  categorias,
  clientes,
  cotizaciones,
  dashboard,
  gastos,
  obras,
  proveedores,
  presupuestos,
  rentabilidad,
};
