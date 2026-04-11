const express = require('express');
const { create, getAll, pay, update } = require('../controllers/gastoController');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', getAll);
router.post('/', upload.single('archivoAdjunto'), create);
router.put('/:id', upload.single('archivoAdjunto'), update);
router.put('/:id/pagar', pay);

module.exports = router;
