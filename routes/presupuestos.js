const express = require('express');
const { presupuestos } = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', presupuestos.list);
router.post('/', requireRole('admin', 'operador'), presupuestos.create);
router.put('/:id', requireRole('admin', 'operador'), presupuestos.update);
router.patch('/:id/aprobar', requireRole('admin', 'operador'), presupuestos.approve);
router.patch('/:id/rechazar', requireRole('admin', 'operador'), presupuestos.reject);

module.exports = router;
