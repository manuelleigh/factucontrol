const asyncHandler = require('../middleware/asyncHandler');
const { askAssistant, buildAssistantSnapshot, getAssistantConfig, normalizeScope, SCOPE_LABELS } = require('../services/asistenteService');

const renderAsistente = asyncHandler(async (req, res) => {
  const snapshot = await buildAssistantSnapshot(req.query);
  res.render('asistente', {
    title: 'Asistente IA',
    assistant: getAssistantConfig(),
    snapshot,
    scopes: Object.entries(SCOPE_LABELS).map(([value, label]) => ({ value, label })),
    currentScope: normalizeScope(req.query.scope),
  });
});

const consultar = asyncHandler(async (req, res) => {
  const result = await askAssistant({
    question: req.body.question,
    scope: req.body.scope,
    month: req.body.month,
    year: req.body.year,
  });
  res.json(result);
});

module.exports = {
  consultar,
  renderAsistente,
};
