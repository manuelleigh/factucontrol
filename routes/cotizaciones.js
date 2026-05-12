const express = require('express');
const { cotizaciones } = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', cotizaciones.list);
router.post('/', requireRole('admin', 'operador'), cotizaciones.create);
router.put('/:id', requireRole('admin', 'operador'), cotizaciones.update);
router.patch('/:id/aprobar', requireRole('admin', 'operador'), cotizaciones.approve);
router.patch('/:id/rechazar', requireRole('admin', 'operador'), cotizaciones.reject);

module.exports = router;
