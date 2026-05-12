const express = require('express');
const { clientes } = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', clientes.list);
router.post('/', requireRole('admin', 'operador'), clientes.create);
router.put('/:id', requireRole('admin', 'operador'), clientes.update);
router.patch('/:id/desactivar', requireRole('admin'), clientes.deactivate);

module.exports = router;
