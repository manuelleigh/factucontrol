const express = require('express');
const { monthly, rentability } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/mensual', monthly);
router.get('/rentabilidad', rentability);

module.exports = router;
