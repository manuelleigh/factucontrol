const asyncHandler = require('../middleware/asyncHandler');
const { listActiveProveedores, listProveedores } = require('../services/proveedorService');
const { getDashboardData, getDefaultCategories, listRegistros } = require('../services/registroService');
const { ESTADOS_BIEN, ESTADOS_REGISTRO, METODOS_PAGO } = require('../utils/constants');

const renderDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboardData();
  res.render('index', { title: 'Panel de Inicio', dashboard });
});

const renderProveedores = asyncHandler(async (req, res) => {
  const { items: proveedores, pagination } = await listProveedores(req.query.search || '', req.query);
  res.render('proveedores', {
    title: 'Proveedores',
    proveedores,
    search: req.query.search || '',
    pagination,
  });
});

async function renderRegistroPage(req, res, type) {
  const proveedores = await listActiveProveedores();
  const { items: records, pagination } = await listRegistros(type, req.query);
  res.render(type === 'compra' ? 'compras' : 'gastos', {
    title: type === 'compra' ? 'Compras de Bienes' : 'Gastos Operativos',
    proveedores,
    records,
    categories: getDefaultCategories(type),
    metodosPago: METODOS_PAGO,
    estadosRegistro: ESTADOS_REGISTRO,
    estadosBien: ESTADOS_BIEN,
    pagination,
    filters: {
      proveedorId: req.query.proveedorId || '',
      categoria: req.query.categoria || '',
      estado: req.query.estado || '',
      fechaInicio: req.query.fechaInicio || '',
      fechaFin: req.query.fechaFin || '',
      search: req.query.search || '',
    },
    sectionTitle: type === 'compra' ? 'Compras de bienes' : 'Gastos operativos',
    singular: type === 'compra' ? 'compra' : 'gasto',
    pageType: type,
  });
}

const renderGastos = asyncHandler(async (req, res) => {
  await renderRegistroPage(req, res, 'gasto');
});

const renderCompras = asyncHandler(async (req, res) => {
  await renderRegistroPage(req, res, 'compra');
});

module.exports = { renderCompras, renderDashboard, renderGastos, renderProveedores };
