const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const MODEL_PREFERENCE = [
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'llama3-8b-8192',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

let modelCache = { at: 0, model: null, available: [] };

function getApiKey() {
  return process.env.GROQ_API_KEY || '';
}

function getPreferredModel() {
  return process.env.GROQ_MODEL || MODEL_PREFERENCE[0];
}

async function fetchActiveModels() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { available: [], selected: getPreferredModel(), source: 'env-fallback' };
  }

  if (modelCache.model && Date.now() - modelCache.at < 10 * 60 * 1000) {
    return { available: modelCache.available, selected: modelCache.model, source: 'cache' };
  }

  const response = await fetch(`${GROQ_API_BASE}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo consultar el catálogo de modelos de Groq.');
  }

  const payload = await response.json();
  const available = Array.isArray(payload?.data)
    ? payload.data.filter((model) => model && model.active).map((model) => model.id)
    : [];
  const selected = MODEL_PREFERENCE.find((candidate) => available.includes(candidate)) || getPreferredModel();

  modelCache = { at: Date.now(), model: selected, available };
  return { available, selected, source: 'remote' };
}

async function chatCompletion({ model, messages, responseFormat, maxCompletionTokens = 220, temperature = 0.2 }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Falta configurar GROQ_API_KEY.');
  }

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_completion_tokens: maxCompletionTokens,
      response_format: responseFormat || { type: 'json_object' },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      'Groq no pudo generar el análisis en este momento.';
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = payload?.error || payload?.details || null;
    throw error;
  }

  return payload;
}

function parseJsonContent(content) {
  if (!content) return null;
  const trimmed = String(content).trim();
  const cleaned = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

module.exports = {
  chatCompletion,
  fetchActiveModels,
  parseJsonContent,
};
