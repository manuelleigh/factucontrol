const express = require('express');
const { consultar } = require('../controllers/asistenteController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/consultar', consultar);

module.exports = router;
