const { chatCompletion, fetchActiveModels, parseJsonContent } = require('./groqService');

function compactDashboardSnapshot(dashboard) {
  return {
    resumen: dashboard.resumen,
    distribution: dashboard.distribution.slice(0, 5),
    moduleTotals: dashboard.moduleTotals,
    topProviders: dashboard.topProviders.slice(0, 5),
    recentRecords: dashboard.recentRecords.slice(0, 5).map((record) => ({
      modulo: record.modulo,
      numeroFactura: record.numeroFactura,
      proveedor: record.proveedor?.nombre || 'Sin proveedor',
      categoria: record.categoria,
      total: Number(record.total),
      estado: record.estadoEfectivo,
      vencimiento: record.fechaVencimiento,
    })),
  };
}

function buildSystemPrompt() {
  return [
    'Eres un asistente financiero breve para una app universitaria de control de facturas.',
    'Responde en español, con tono claro y útil.',
    'Devuelve JSON válido con estas claves exactas:',
    '"titulo", "resumen", "alertas", "acciones", "modelo_recomendado".',
    'No escribas texto fuera del JSON.',
    'Mantén el resultado corto, práctico y orientado a una demostración ligera.',
  ].join(' ');
}

async function generateDashboardInsight({ dashboard, currentUser }) {
  const { selected, available, source } = await fetchActiveModels();
  const prompt = {
    proyecto: 'FactuControl',
    usuario: currentUser ? { nombre: currentUser.name, rol: currentUser.role } : null,
    contexto: compactDashboardSnapshot(dashboard),
    instruccion:
      'Analiza el estado general y sugiere el mejor siguiente paso para un proyecto universitario ligero. Prioriza bajo costo, respuesta rápida y simplicidad.',
  };

  const response = await chatCompletion({
    model: selected,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: JSON.stringify(prompt) },
    ],
    responseFormat: { type: 'json_object' },
    maxCompletionTokens: Number(process.env.GROQ_MAX_COMPLETION_TOKENS || 220),
    temperature: 0.2,
  });

  const content = response?.choices?.[0]?.message?.content || '{}';
  const parsed = parseJsonContent(content) || {
    titulo: 'Análisis no estructurado',
    resumen: String(content).trim(),
    alertas: [],
    acciones: [],
    modelo_recomendado: selected,
  };

  return {
    model: selected,
    modelSource: source,
    availableModels: available,
    insight: parsed,
  };
}

module.exports = { generateDashboardInsight };
