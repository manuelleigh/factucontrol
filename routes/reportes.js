const express = require('express');
const { byCategory, monthly } = require('../controllers/reportController');

const router = express.Router();

router.get('/mensual', monthly);
router.get('/categorias', byCategory);

module.exports = router;
