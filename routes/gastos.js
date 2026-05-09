const express = require('express');
const { create, getAll, pay, update } = require('../controllers/gastoController');
const { upload } = require('../middleware/upload');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getAll);
router.post('/', requireRole('admin', 'accountant'), upload.single('archivoAdjunto'), create);
router.put('/:id', requireRole('admin', 'accountant'), upload.single('archivoAdjunto'), update);
router.put('/:id/pagar', requireRole('admin', 'accountant'), pay);

module.exports = router;
