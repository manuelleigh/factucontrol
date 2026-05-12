const express = require('express');
const { categorias } = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', categorias.list);
router.post('/', requireRole('admin', 'operador'), categorias.create);
router.put('/:id', requireRole('admin', 'operador'), categorias.update);

module.exports = router;
