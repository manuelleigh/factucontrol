const express = require('express');
const { create, deactivate, getAll, update } = require('../controllers/proveedorController');

const router = express.Router();

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.put('/:id/desactivar', deactivate);

module.exports = router;
