const express = require('express');
const { compras } = require('../controllers/apiController');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', compras.list);
router.post('/', requireRole('admin', 'operador'), upload.single('archivoAdjunto'), compras.create);
router.put('/:id', requireRole('admin', 'operador'), upload.single('archivoAdjunto'), compras.update);
router.patch('/:id/pagar', requireRole('admin', 'operador'), compras.pay);

module.exports = router;
