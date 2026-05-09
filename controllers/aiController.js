const asyncHandler = require('../middleware/asyncHandler');
const { getDashboardData } = require('../services/registroService');
const {
  generateChatAssistant,
  generateDashboardInsight,
  generateProviderInsight,
  generatePurchaseDraftFromPdf,
  generateRecordInsight,
} = require('../services/aiService');
const { createHttpError } = require('../utils/httpError');
const { CompraBien, GastoOperativo } = require('../models');
const { listActiveProveedores } = require('../services/proveedorService');

const dashboardInsight = asyncHandler(async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    throw createHttpError(503, 'Configura GROQ_API_KEY para usar el asistente IA.');
  }

  const dashboard = await getDashboardData();
  const result = await generateDashboardInsight({
    dashboard,
    currentUser: req.user,
  });

  res.json({
    ok: true,
    ...result,
  });
});

const chatAssistant = asyncHandler(async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    throw createHttpError(503, 'Configura GROQ_API_KEY para usar el asistente IA.');
  }

  const dashboard = await getDashboardData();
  const result = await generateChatAssistant({
    messages: Array.isArray(req.body?.messages) ? req.body.messages : [],
    dashboard,
    currentUser: req.user,
  });

  res.json({ ok: true, ...result });
});

const recordInsight = asyncHandler(async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    throw createHttpError(503, 'Configura GROQ_API_KEY para usar el asistente IA.');
  }

  const { type, id } = req.params;
  if (!['gasto', 'compra'].includes(type)) {
    throw createHttpError(400, 'Tipo de registro inválido.');
  }

  const result = await generateRecordInsight(type, id);
  res.json({ ok: true, ...result });
});

const providerInsight = asyncHandler(async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    throw createHttpError(503, 'Configura GROQ_API_KEY para usar el asistente IA.');
  }

  const { id } = req.params;
  const [gastosCount, comprasCount, gastoTotal, compraTotal] = await Promise.all([
    GastoOperativo.count({ where: { proveedorId: id } }),
    CompraBien.count({ where: { proveedorId: id } }),
    GastoOperativo.sum('total', { where: { proveedorId: id } }),
    CompraBien.sum('total', { where: { proveedorId: id } }),
  ]);

  const result = await generateProviderInsight(id, {
    gastosCount,
    comprasCount,
    gastoTotal: Number(gastoTotal || 0),
    compraTotal: Number(compraTotal || 0),
    registrosTotal: gastosCount + comprasCount,
  });

  res.json({ ok: true, ...result });
});

const purchaseDraft = asyncHandler(async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    throw createHttpError(503, 'Configura GROQ_API_KEY para usar el asistente IA.');
  }

  if (!req.file) {
    throw createHttpError(400, 'Debes subir un PDF para generar el borrador.');
  }

  try {
    const providers = await listActiveProveedores();
    const result = await generatePurchaseDraftFromPdf({
      filePath: req.file.path,
      originalName: req.file.originalname,
      providers,
    });
    res.json({
      ok: true,
      ...result,
      draftFilePath: `/uploads/drafts/${req.file.filename}`,
    });
  } catch (error) {
    const fs = require('fs');
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error;
  }
});

module.exports = { chatAssistant, dashboardInsight, providerInsight, purchaseDraft, recordInsight };
