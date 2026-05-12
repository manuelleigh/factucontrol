const express = require('express');
const {
  renderCategorias,
  renderClientes,
  renderCompras,
  renderCobros,
  renderCotizaciones,
  renderDashboard,
  renderGastos,
  renderObras,
  renderProveedores,
  renderPresupuestos,
  renderRentabilidad,
  renderReportes,
} = require('../controllers/pageController');
const { renderAsistente } = require('../controllers/asistenteController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', renderDashboard);
router.get('/proveedores', renderProveedores);
router.get('/clientes', renderClientes);
router.get('/obras', renderObras);
router.get('/categorias', renderCategorias);
router.get('/cobros', renderCobros);
router.get('/presupuestos', renderPresupuestos);
router.get('/cotizaciones', renderCotizaciones);
router.get('/gastos', renderGastos);
router.get('/compras', renderCompras);
router.get('/rentabilidad', renderRentabilidad);
router.get('/reportes', renderReportes);
router.get('/asistente', renderAsistente);

module.exports = router;
