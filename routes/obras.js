const express = require('express');
const { obras } = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', obras.list);
router.post('/', requireRole('admin', 'operador'), obras.create);
router.put('/:id', requireRole('admin', 'operador'), obras.update);
router.patch('/:id/cerrar', requireRole('admin', 'operador'), obras.close);

module.exports = router;
