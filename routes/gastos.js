const express = require('express');
const { gastos } = require('../controllers/apiController');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', gastos.list);
router.post('/', requireRole('admin', 'operador'), upload.single('archivoAdjunto'), gastos.create);
router.put('/:id', requireRole('admin', 'operador'), upload.single('archivoAdjunto'), gastos.update);
router.patch('/:id/pagar', requireRole('admin', 'operador'), gastos.pay);

module.exports = router;
