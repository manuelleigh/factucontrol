const express = require('express');
const { chatAssistant, dashboardInsight, providerInsight, purchaseDraft, recordInsight } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { draftUpload } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);
router.post('/chat', chatAssistant);
router.post('/dashboard', dashboardInsight);
router.post('/purchase-draft', draftUpload.single('archivoAdjunto'), purchaseDraft);
router.post('/record/:type/:id', recordInsight);
router.post('/provider/:id', providerInsight);

module.exports = router;
