const express = require('express');
const { dashboardInsight } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/dashboard', dashboardInsight);

module.exports = router;
