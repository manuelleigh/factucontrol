const asyncHandler = require('../middleware/asyncHandler');
const { getDashboardData } = require('../services/registroService');
const { generateDashboardInsight } = require('../services/aiService');
const { createHttpError } = require('../utils/httpError');

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

module.exports = { dashboardInsight };
