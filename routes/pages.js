const express = require('express');
const { renderCompras, renderDashboard, renderGastos, renderProveedores } = require('../controllers/pageController');

const router = express.Router();

router.get('/', renderDashboard);
router.get('/proveedores', renderProveedores);
router.get('/gastos', renderGastos);
router.get('/compras', renderCompras);

module.exports = router;
