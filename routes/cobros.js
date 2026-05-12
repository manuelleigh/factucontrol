const express = require('express');
const { cobros } = require('../controllers/apiController');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', cobros.list);
router.post('/', requireRole('admin', 'operador'), upload.single('comprobanteAdjunto'), cobros.create);
router.put('/:id', requireRole('admin', 'operador'), upload.single('comprobanteAdjunto'), cobros.update);

module.exports = router;
