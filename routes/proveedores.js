const express = require('express');
const { proveedores } = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', proveedores.list);
router.post('/', requireRole('admin', 'operador'), proveedores.create);
router.put('/:id', requireRole('admin', 'operador'), proveedores.update);
router.patch('/:id/desactivar', requireRole('admin'), proveedores.deactivate);

module.exports = router;
