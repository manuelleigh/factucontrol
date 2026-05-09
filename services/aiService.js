const { chatCompletion, fetchActiveModels, parseJsonContent } = require('./groqService');
const { CompraBien, GastoOperativo, Proveedor } = require('../models');
const { getEffectiveStatus } = require('../utils/helpers');
const { createHttpError } = require('../utils/httpError');

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

function compactRecord(record) {
  return {
    tipo: record.modulo,
    numeroFactura: record.numeroFactura,
    proveedor: record.proveedor?.nombre || 'Sin proveedor',
    categoria: record.categoria,
    concepto: record.concepto,
    fechaEmision: record.fechaEmision,
    fechaVencimiento: record.fechaVencimiento,
    total: Number(record.total),
    estado: record.estadoEfectivo || getEffectiveStatus(record),
    tieneAdjunto: Boolean(record.archivoAdjunto),
    moduloEsCompra: record.modulo === 'Compra',
    nombreBien: record.nombreBien || null,
    cantidad: record.cantidad || null,
    estadoBien: record.estadoBien || null,
  };
}

function buildRecordPrompt(record) {
  return [
    'Analiza esta factura de forma breve para una demostración universitaria.',
    'Devuelve JSON con claves exactas: titulo, resumen, alertas, acciones, prioridad.',
    'La respuesta debe ser concisa y útil.',
    JSON.stringify(record),
  ].join('\n');
}

function buildProviderPrompt(provider, stats) {
  return [
    'Analiza este proveedor de forma breve para una demostración universitaria.',
    'Devuelve JSON con claves exactas: titulo, resumen, alertas, acciones, prioridad.',
    'La respuesta debe ser concisa y útil.',
    JSON.stringify({ proveedor, stats }),
  ].join('\n');
}

async function generateRecordInsight(type, id) {
  const model = type === 'compra' ? CompraBien : GastoOperativo;
  const record = await model.findByPk(id, { include: [{ model: Proveedor, as: 'proveedor' }] });
  if (!record) throw createHttpError(404, 'Factura no encontrada.');

  const plain = record.get({ plain: true });
  const contextualRecord = {
    ...plain,
    modulo: type === 'compra' ? 'Compra' : 'Gasto',
    estadoEfectivo: getEffectiveStatus(plain),
  };

  const { selected, source } = await fetchActiveModels();
  const response = await chatCompletion({
    model: selected,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildRecordPrompt(compactRecord(contextualRecord)) },
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
    prioridad: 'Media',
  };

  return {
    model: selected,
    modelSource: source,
    insight: parsed,
    record: compactRecord(contextualRecord),
  };
}

async function generateProviderInsight(providerId, stats = {}) {
  const provider = await Proveedor.findByPk(providerId);
  if (!provider) throw createHttpError(404, 'Proveedor no encontrado.');

  const { selected, source } = await fetchActiveModels();
  const response = await chatCompletion({
    model: selected,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildProviderPrompt(provider.get({ plain: true }), stats) },
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
    prioridad: 'Media',
  };

  return {
    model: selected,
    modelSource: source,
    insight: parsed,
    provider: provider.get({ plain: true }),
  };
}

function buildChatMessages(history = [], prompt) {
  const trimmed = Array.isArray(history) ? history.slice(-6) : [];
  const messages = [{ role: 'system', content: buildSystemPrompt() }];
  trimmed.forEach((entry) => {
    if (!entry || !entry.role || !entry.content) return;
    messages.push({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: String(entry.content),
    });
  });
  messages.push({ role: 'user', content: prompt });
  return messages;
}

async function generateChatAssistant({ messages = [], dashboard, currentUser }) {
  const { selected, available, source } = await fetchActiveModels();
  const prompt = JSON.stringify({
    contexto: compactDashboardSnapshot(dashboard),
    usuario: currentUser ? { nombre: currentUser.name, rol: currentUser.role } : null,
    instruccion:
      'Responde como asistente de la app. Si el usuario pide recomendaciones, sugiere acciones concretas y cortas. Si pide datos, usa el contexto compartido.',
  });

  const response = await chatCompletion({
    model: selected,
    messages: buildChatMessages(messages, prompt),
    responseFormat: { type: 'json_object' },
    maxCompletionTokens: Number(process.env.GROQ_MAX_COMPLETION_TOKENS || 220),
    temperature: 0.3,
  });

  const content = response?.choices?.[0]?.message?.content || '{}';
  const parsed = parseJsonContent(content) || {
    answer: String(content).trim(),
    suggestions: [],
  };

  return {
    model: selected,
    modelSource: source,
    availableModels: available,
    response: parsed,
  };
}

module.exports = {
  generateChatAssistant,
  generateDashboardInsight,
  generateProviderInsight,
  generateRecordInsight,
};
