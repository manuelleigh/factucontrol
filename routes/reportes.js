const express = require('express');
const { byCategory, monthly } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/mensual', monthly);
router.get('/categorias', byCategory);

module.exports = router;
