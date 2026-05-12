const { createHttpError } = require('../utils/httpError');
const { formatCurrency, toNumber } = require('../utils/helpers');
const { getDashboardData, getRentabilidadData } = require('./gestpymeService');

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SCOPE_LABELS = {
  general: 'Lectura general',
  riesgos: 'Riesgos y alertas',
  rentabilidad: 'Rentabilidad',
  cobros: 'Cobros',
  gastos: 'Gastos y compras',
  reportes: 'Reportes',
};

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeScope(value) {
  return Object.prototype.hasOwnProperty.call(SCOPE_LABELS, value) ? value : 'general';
}

function hasGroqConfig() {
  return Boolean(process.env.GROQ_API_KEY);
}

function getAssistantConfig() {
  return {
    provider: hasGroqConfig() ? 'Groq' : 'Local',
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    enabled: hasGroqConfig(),
    maxTokens: Number(process.env.GROQ_MAX_COMPLETION_TOKENS || 220),
  };
}

function monthLabel(month, year) {
  const monthName = MONTHS_ES[Math.max(0, Math.min(11, Number(month) - 1))] || 'mes';
  return `${monthName} de ${year}`;
}

function sortByMargin(items) {
  return [...items].sort((left, right) => Number(right.margen || 0) - Number(left.margen || 0));
}

function summarizeRentability(rentabilidad) {
  const ordered = sortByMargin(rentabilidad);
  const best = ordered[0] || null;
  const worst = ordered.length ? ordered[ordered.length - 1] : null;
  const profitableCount = ordered.filter((item) => Number(item.margen || 0) >= 0).length;
  const averageMargin = ordered.length
    ? ordered.reduce((sum, item) => sum + toNumber(item.margen), 0) / ordered.length
    : 0;

  return { best, worst, profitableCount, averageMargin };
}

function buildStructuredResponse({
  question,
  scopeLabel,
  periodLabel,
  dashboard,
  summary,
  topAlerts,
  mode,
  provider,
  model,
  warning = null,
}) {
  const diagnosticLines = [];
  const riskLines = [];
  const actionLines = [];

  diagnosticLines.push(`Periodo analizado: ${periodLabel}.`);
  diagnosticLines.push(`Resultado del mes: ${formatCurrency(dashboard.resumen.resultadoMes)}.`);
  diagnosticLines.push(`Obras activas: ${dashboard.resumen.obrasActivas}, alertas activas: ${dashboard.resumen.alertasActivas}.`);

  if (summary.best) {
    diagnosticLines.push(`Mejor obra: ${summary.best.nombre} con margen de ${Number(summary.best.margen || 0).toFixed(1)}%.`);
  }
  if (summary.worst) {
    diagnosticLines.push(`Obra a revisar: ${summary.worst.nombre} con margen de ${Number(summary.worst.margen || 0).toFixed(1)}%.`);
  }

  if (dashboard.resumen.resultadoMes < 0) {
    riskLines.push('El negocio cerró el mes en negativo, por lo que conviene revisar egresos no críticos.');
  } else {
    riskLines.push('El cierre del mes es positivo, pero sigue siendo importante cuidar el flujo de caja.');
  }

  if (dashboard.resumen.cuentasPorCobrar > dashboard.resumen.cuentasPorPagar) {
    riskLines.push('Hay más dinero por cobrar que por pagar, lo que puede presionar la liquidez si la cobranza se demora.');
  } else {
    riskLines.push('La carga de pagos es manejable, pero la caja necesita seguimiento si aparecen nuevos gastos.');
  }

  if (topAlerts.length) {
    riskLines.push(`Alertas prioritarias: ${topAlerts.slice(0, 3).join('; ')}.`);
  }

  actionLines.push('Prioriza la cobranza de vencidos y el seguimiento de alertas críticas.');
  actionLines.push('Revisa la obra con menor margen y ajusta su estructura de costos.');
  actionLines.push('Usa los reportes mensuales para tomar decisiones semanales sobre caja y presupuesto.');

  return {
    mode,
    provider,
    model,
    question,
    answer: [
      'Diagnóstico',
      diagnosticLines.map((line) => `- ${line}`).join('\n'),
      'Riesgo',
      riskLines.map((line) => `- ${line}`).join('\n'),
      'Acciones',
      actionLines.map((line, index) => `${index + 1}. ${line}`).join('\n'),
    ].join('\n\n'),
    sections: {
      diagnostico: diagnosticLines.join(' '),
      riesgo: riskLines.join(' '),
      acciones: actionLines,
    },
    recommendations: actionLines,
    keyFindings: [
      `Resultado mensual: ${formatCurrency(dashboard.resumen.resultadoMes)}`,
      `Alertas activas: ${dashboard.resumen.alertasActivas}`,
      `Obras activas: ${dashboard.resumen.obrasActivas}`,
    ],
    context: {
      periodLabel,
      resultMonth: dashboard.resumen.resultadoMes,
      alertasActivas: dashboard.resumen.alertasActivas,
      mejorObra: summary.best ? summary.best.nombre : null,
      peorObra: summary.worst ? summary.worst.nombre : null,
      scopeLabel,
    },
    warning,
  };
}

function parseAssistantSections(answer) {
  const text = normalizeText(answer);
  if (!text) return null;

  const diagnosticoMatch = text.match(/diagn[oó]stico\s*:?\s*([\s\S]*?)(?=\n\s*riesgo\s*:|\n\s*acciones\s*:|$)/i);
  const riesgoMatch = text.match(/riesgo\s*:?\s*([\s\S]*?)(?=\n\s*acciones\s*:|$)/i);
  const accionesMatch = text.match(/acciones\s*:?\s*([\s\S]*)/i);

  const diagnostico = diagnosticoMatch ? diagnosticoMatch[1].replace(/\n+/g, ' ').trim() : '';
  const riesgo = riesgoMatch ? riesgoMatch[1].replace(/\n+/g, ' ').trim() : '';
  const acciones = accionesMatch
    ? accionesMatch[1]
        .split(/\n+/)
        .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
        .filter(Boolean)
    : [];

  if (!diagnostico && !riesgo && !acciones.length) return null;
  return { diagnostico, riesgo, acciones };
}

async function buildAssistantSnapshot(query = {}) {
  const dashboard = await getDashboardData(query);
  const rentabilidad = await getRentabilidadData();
  const summary = summarizeRentability(rentabilidad);
  const topAlerts = dashboard.alertas.slice(0, 6);
  const topCategories = dashboard.categoriasSemaforo.slice(0, 6);

  return {
    currentMonth: dashboard.currentMonth,
    currentYear: dashboard.currentYear,
    periodLabel: monthLabel(dashboard.currentMonth, dashboard.currentYear),
    dashboard,
    rentabilidad,
    summary,
    topAlerts,
    topCategories,
    summaryCards: [
      {
        label: 'Resultado del mes',
        value: formatCurrency(dashboard.resumen.resultadoMes),
        note: dashboard.resumen.resultadoMes >= 0 ? 'Cierre positivo' : 'Cierre en negativo',
      },
      {
        label: 'Alertas activas',
        value: String(dashboard.resumen.alertasActivas),
        note: 'Vencidos y categorias criticas',
      },
      {
        label: 'Obras activas',
        value: String(dashboard.resumen.obrasActivas),
        note: 'Proyectos en ejecucion',
      },
      {
        label: 'Cuentas por cobrar',
        value: formatCurrency(dashboard.resumen.cuentasPorCobrar),
        note: 'Pendientes de cobro',
      },
      {
        label: 'Mejor obra',
        value: summary.best ? summary.best.nombre : 'Sin datos',
        note: summary.best ? `${Number(summary.best.margen || 0).toFixed(1)}% de margen` : 'No hay obras cargadas',
      },
      {
        label: 'Obra a revisar',
        value: summary.worst ? summary.worst.nombre : 'Sin datos',
        note: summary.worst ? `${Number(summary.worst.margen || 0).toFixed(1)}% de margen` : 'No hay obras cargadas',
      },
    ],
    quickActions: [
      'Resume el mes actual y dame 3 acciones concretas.',
      'Indica riesgos de cobros y gastos que vea urgentes.',
      'Explica que obras tienen mejor y peor margen.',
      'Dame una lectura ejecutiva para presentacion final.',
    ],
  };
}

function buildLocalInsights(snapshot, scopeLabel, question) {
  const { dashboard, summary, topAlerts, periodLabel } = snapshot;
  const build = buildStructuredResponse({
    question,
    scopeLabel,
    periodLabel,
    dashboard,
    summary,
    topAlerts,
    mode: 'local',
    provider: 'Reglas locales',
    model: 'gestpyme-local',
  });

  if (dashboard.resumen.resultadoMes < 0) {
    build.warning = 'El resultado del mes está en negativo y merece revisión.';
  }

  return build;
}

function buildGroqPrompt(snapshot, scopeLabel, question) {
  const { dashboard, summary, topAlerts, topCategories, periodLabel } = snapshot;
  return [
    `Consulta del usuario: ${question}`,
    `Enfoque solicitado: ${scopeLabel}`,
    `Periodo de analisis: ${periodLabel}`,
    'Contexto operativo en JSON:',
    JSON.stringify(
      {
        resumen: dashboard.resumen,
        alertas: topAlerts,
        categoriasSemaforo: topCategories.map((item) => ({
          nombre: item.nombre,
          porcentaje: Number(item.porcentaje.toFixed ? item.porcentaje.toFixed(1) : item.porcentaje),
          color: item.color,
        })),
        mejorObra: summary.best
          ? {
              nombre: summary.best.nombre,
              margen: Number(summary.best.margen || 0),
              utilidad: Number(summary.best.utilidad || 0),
              ingresos: Number(summary.best.ingresos || 0),
              egresos: Number(summary.best.egresos || 0),
            }
          : null,
        obraARevisar: summary.worst
          ? {
              nombre: summary.worst.nombre,
              margen: Number(summary.worst.margen || 0),
              utilidad: Number(summary.worst.utilidad || 0),
              ingresos: Number(summary.worst.ingresos || 0),
              egresos: Number(summary.worst.egresos || 0),
            }
          : null,
      },
      null,
      2
    ),
    'Reglas:',
    '- Responde en español.',
    '- Se breve, claro y ejecutivo.',
    '- No inventes datos que no esten en el contexto.',
    '- Si falta informacion, dilo y explica que dato seria necesario.',
    '- Usa exactamente estos bloques en este orden: Diagnóstico, Riesgo, Acciones.',
    '- En Acciones escribe exactamente 3 pasos numerados.',
  ].join('\n');
}

async function askAssistant({ question, scope, month, year }) {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    throw createHttpError(400, 'Escribe una pregunta para el asistente.', {
      question: 'La pregunta no puede estar vacia.',
    });
  }

  const normalizedScope = normalizeScope(scope);
  const scopeLabel = SCOPE_LABELS[normalizedScope];
  const snapshot = await buildAssistantSnapshot({ month, year });
  const localFallback = buildLocalInsights(snapshot, scopeLabel, normalizedQuestion);
  const config = getAssistantConfig();

  if (!config.enabled) {
    return {
      ...localFallback,
      config,
    };
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content:
              'Eres el asistente ejecutivo de GestPyme. Analizas finanzas, compras, gastos, cobros, obras y rentabilidad. Respondes con criterio practico, lenguaje claro y sin inventar datos. Si el contexto no alcanza, lo dices.',
          },
          {
            role: 'user',
            content: buildGroqPrompt(snapshot, scopeLabel, normalizedQuestion),
          },
        ],
        temperature: 0.2,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      throw createHttpError(response.status, `Groq respondio con error ${response.status}.`);
    }

    const payload = await response.json();
    const answer = payload?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      throw createHttpError(502, 'La IA no devolvio una respuesta util.');
    }

    return {
      mode: 'groq',
      provider: 'Groq',
      model: config.model,
      question: normalizedQuestion,
      answer,
      sections: localFallback.sections,
      recommendations: localFallback.recommendations,
      keyFindings: localFallback.keyFindings,
      config,
      context: localFallback.context,
    };
  } catch (error) {
    return {
      ...localFallback,
      config,
      context: localFallback.context,
      warning: error.message || 'Se uso el modo local por un error con Groq.',
    };
  }
}

module.exports = {
  askAssistant,
  buildAssistantSnapshot,
  getAssistantConfig,
  normalizeScope,
  parseAssistantSections,
  SCOPE_LABELS,
};
