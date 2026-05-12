const dayjs = require('dayjs');
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

  return {
    best,
    worst,
    profitableCount,
    averageMargin,
  };
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
  const lines = [];
  const recommendations = [];

  lines.push(`Lectura para ${periodLabel} con foco en ${scopeLabel.toLowerCase()}.`);

  if (dashboard.resumen.resultadoMes >= 0) {
    lines.push(`El mes cierra con un resultado positivo de ${formatCurrency(dashboard.resumen.resultadoMes)}.`);
  } else {
    lines.push(`El mes cierra en negativo por ${formatCurrency(Math.abs(dashboard.resumen.resultadoMes))}.`);
    recommendations.push('Reducir egresos no criticos y priorizar pagos que no afecten la operacion.');
  }

  lines.push(`Hay ${dashboard.resumen.alertasActivas} alertas activas, ${dashboard.resumen.obrasActivas} obras activas y ${formatCurrency(dashboard.resumen.cuentasPorCobrar)} por cobrar.`);

  if (summary.best) {
    lines.push(`La obra mas rentable es ${summary.best.nombre} con margen de ${Number(summary.best.margen || 0).toFixed(1)}%.`);
  }

  if (summary.worst) {
    lines.push(`La obra mas debil es ${summary.worst.nombre} con margen de ${Number(summary.worst.margen || 0).toFixed(1)}%.`);
    recommendations.push(`Revisar la estructura de costos de ${summary.worst.nombre} antes de seguir ampliando alcance.`);
  }

  if (topAlerts.length) {
    lines.push(`Alertas prioritarias: ${topAlerts.slice(0, 3).join('; ')}.`);
    recommendations.push('Atender primero cobros vencidos y categorias con semaforo rojo o amarillo.');
  }

  if (dashboard.resumen.cuentasPorCobrar > dashboard.resumen.cuentasPorPagar) {
    recommendations.push('Hay mas dinero por cobrar que por pagar, asi que conviene acelerar cobranza.');
  } else {
    recommendations.push('Conviene equilibrar pagos y cobranzas para evitar tension de caja.');
  }

  if (!recommendations.length) {
    recommendations.push('Mantener seguimiento semanal del flujo de caja y de las obras con mayor costo.');
  }

    return {
      mode: 'local',
      provider: 'Reglas locales',
      model: 'gestpyme-local',
      question,
      answer: lines.join('\n\n'),
      recommendations: [...new Set(recommendations)].slice(0, 5),
      keyFindings: [
        `Resultado mensual: ${formatCurrency(dashboard.resumen.resultadoMes)}`,
        `Alertas activas: ${dashboard.resumen.alertasActivas}`,
        `Obras activas: ${dashboard.resumen.obrasActivas}`,
      ],
      context: {
        periodLabel: snapshot.periodLabel,
        resultMonth: dashboard.resumen.resultadoMes,
        alertasActivas: dashboard.resumen.alertasActivas,
        mejorObra: summary.best ? summary.best.nombre : null,
        peorObra: summary.worst ? summary.worst.nombre : null,
      },
    };
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
    '- Cierra con 3 acciones concretas y priorizadas.',
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
      snapshot,
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
  SCOPE_LABELS,
};
