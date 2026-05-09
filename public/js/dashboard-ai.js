const aiButton = document.getElementById('aiDashboardButton');
const aiResult = document.getElementById('aiDashboardResult');
const aiMeta = document.getElementById('aiDashboardMeta');

function renderList(label, items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `
    <div class="ai-block">
      <strong>${window.appUtils.escapeHtml(label)}</strong>
      <ul>
        ${items.map((item) => `<li>${window.appUtils.escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `;
}

if (aiButton && aiResult && aiMeta) {
  aiButton.addEventListener('click', async () => {
    aiButton.disabled = true;
    aiButton.textContent = 'Analizando...';
    aiMeta.textContent = 'Consultando Groq y seleccionando el modelo activo más liviano...';
    aiResult.textContent = 'Generando respuesta...';

    try {
      const data = await window.appUtils.request('/api/ia/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const insight = data.insight || {};
      aiMeta.textContent = `Modelo usado: ${data.model}${data.modelSource ? ` · fuente: ${data.modelSource}` : ''}`;
      aiResult.innerHTML = `
        <div class="ai-title">${window.appUtils.escapeHtml(insight.titulo || 'Análisis IA')}</div>
        <p>${window.appUtils.escapeHtml(insight.resumen || 'Sin resumen disponible.')}</p>
        ${renderList('Alertas', insight.alertas)}
        ${renderList('Acciones', insight.acciones)}
        <div class="ai-footnote">Modelo recomendado por la IA: ${window.appUtils.escapeHtml(insight.modelo_recomendado || data.model || '')}</div>
      `;
    } catch (error) {
      aiMeta.textContent = 'No se pudo completar el análisis.';
      aiResult.textContent = error.message || 'Error inesperado.';
      window.appUtils.showToast(error.message || 'No se pudo analizar con IA.', 'danger');
    } finally {
      aiButton.disabled = false;
      aiButton.textContent = 'Analizar ahora';
    }
  });
}
