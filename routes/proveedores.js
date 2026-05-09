const express = require('express');
const { create, deactivate, getAll, update } = require('../controllers/proveedorController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getAll);
router.post('/', requireRole('admin', 'accountant'), create);
router.put('/:id', requireRole('admin', 'accountant'), update);
router.put('/:id/desactivar', requireRole('admin'), deactivate);

module.exports = router;
