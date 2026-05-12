function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container') || (() => {
    const wrapper = document.createElement('div');
    wrapper.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(wrapper);
    return wrapper;
  })();

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.role = 'alert';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'No se pudo completar la operacion.');
    error.details = data.details || null;
    error.redirectTo = data.redirectTo || null;
    error.status = response.status;
    throw error;
  }
  return data;
}

function decodeRecord(value) {
  try {
    return JSON.parse(atob(value));
  } catch {
    return null;
  }
}

function setFieldValue(form, field, value) {
  const input = form.elements[field];
  if (!input) return;
  if (input.type === 'checkbox') {
    input.checked = Boolean(value);
    return;
  }
  if (input.type === 'file') return;
  input.value = value ?? '';
}

function populateForm(form, record = {}) {
  form.reset();
  Object.entries(record).forEach(([key, value]) => {
    setFieldValue(form, key, value);
  });
  if (form.elements.id) form.elements.id.value = record.id || '';
}

function clearErrors(form) {
  const target = form.querySelector('.js-form-errors');
  if (target) {
    target.classList.add('d-none');
    target.textContent = '';
  }
}

function showErrors(form, errors) {
  const target = form.querySelector('.js-form-errors');
  if (!target) return;
  const items = Array.isArray(errors) ? errors : [errors];
  target.classList.remove('d-none');
  target.innerHTML = items.map((item) => `<div>${escapeHtml(item)}</div>`).join('');
}

function formToPayload(form) {
  const formData = new FormData(form);
  form.querySelectorAll('input[type="checkbox"][name]').forEach((checkbox) => {
    if (!formData.has(checkbox.name)) {
      formData.append(checkbox.name, 'false');
    }
  });
  return formData;
}

async function submitEntityForm(form) {
  const endpoint = form.dataset.apiEndpoint;
  const id = form.elements.id?.value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${endpoint}/${id}` : endpoint;
  const hasFileInput = Boolean(form.querySelector('input[type="file"]'));
  let payload;
  const options = { method };
  if (hasFileInput) {
    payload = formToPayload(form);
    options.body = payload;
  } else {
    const formData = new FormData(form);
    form.querySelectorAll('input[type="checkbox"][name]').forEach((checkbox) => {
      if (!formData.has(checkbox.name)) {
        formData.append(checkbox.name, 'false');
      }
    });
    payload = new URLSearchParams();
    formData.forEach((value, key) => {
      if (value !== null && value !== undefined) payload.append(key, value);
    });
    options.body = payload;
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' };
  }
  const result = await request(url, options);
  return result;
}

function resolveActionUrl(button) {
  const base = button.dataset.baseUrl;
  const id = button.dataset.id;
  const action = button.dataset.action;
  const suffixMap = {
    approve: '/aprobar',
    reject: '/rechazar',
    pay: '/pagar',
    close: '/cerrar',
    deactivate: '/desactivar',
  };
  return `${base}/${id}${suffixMap[action] || ''}`;
}

async function handleActionButton(button) {
  const action = button.dataset.action;
  const needsConfirm = ['approve', 'reject', 'pay', 'close', 'deactivate'].includes(action);
  if (needsConfirm && !window.confirm('Deseas continuar con esta accion?')) return;
  await request(resolveActionUrl(button), { method: 'PATCH' });
  showToast('Operacion completada.');
  window.location.reload();
}

function renderDashboardCharts() {
  const data = window.dashboardData;
  if (!data || typeof Chart === 'undefined') return;

  const bar = document.getElementById('chartIncomeExpenses');
  if (bar) {
    new Chart(bar, {
      type: 'bar',
      data: {
        labels: data.graficaBarras.map((item) => item.label),
        datasets: [
          { label: 'Ingresos', data: data.graficaBarras.map((item) => item.ingreso), backgroundColor: '#34d399' },
          { label: 'Gastos', data: data.graficaBarras.map((item) => item.gasto), backgroundColor: '#0ea5e9' },
        ],
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#eff7f4' } } }, scales: { x: { ticks: { color: '#eff7f4' }, grid: { color: 'rgba(255,255,255,0.08)' } }, y: { ticks: { color: '#eff7f4' }, grid: { color: 'rgba(255,255,255,0.08)' } } } },
    });
  }

  const pie = document.getElementById('chartCategorySpend');
  if (pie) {
    new Chart(pie, {
      type: 'pie',
      data: {
        labels: data.graficaTorta.map((item) => item.label),
        datasets: [{ data: data.graficaTorta.map((item) => item.value), backgroundColor: ['#34d399', '#0ea5e9', '#f59e0b', '#f97316', '#a855f7', '#ef4444'] }],
      },
      options: { plugins: { legend: { labels: { color: '#eff7f4' } } } },
    });
  }

  const works = document.getElementById('chartWorks');
  if (works) {
    new Chart(works, {
      type: 'bar',
      data: {
        labels: data.graficaObras.map((item) => item.obra),
        datasets: [
          { label: 'Costo', data: data.graficaObras.map((item) => item.totalGastos), backgroundColor: '#34d399' },
          { label: 'Cobros', data: data.graficaObras.map((item) => item.totalCobros), backgroundColor: '#0ea5e9' },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { labels: { color: '#eff7f4' } } },
        scales: {
          x: { ticks: { color: '#eff7f4' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: { ticks: { color: '#eff7f4' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        },
      },
    });
  }
}

function renderRentabilityChart() {
  const data = window.rentabilidadData;
  if (!data || typeof Chart === 'undefined') return;
  const canvas = document.getElementById('chartRentability');
  if (!canvas) return;
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map((item) => item.nombre),
      datasets: [{ label: 'Margen %', data: data.map((item) => Number(item.margen || 0)), backgroundColor: '#34d399' }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { labels: { color: '#eff7f4' } } },
      scales: {
        x: { ticks: { color: '#eff7f4' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#eff7f4' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

function bindEntityPage() {
  const page = window.gestpymePage;
  const form = document.querySelector('.entity-form');
  const modal = document.getElementById('entityModal');
  const errorBox = form?.querySelector('.js-form-errors');
  const submitButton = form?.querySelector('button[type="submit"]');
  let isSubmitting = false;

  document.querySelectorAll('.js-edit-record').forEach((button) => {
    button.addEventListener('click', () => {
      const record = decodeRecord(button.dataset.record);
      if (record) {
        populateForm(form, record);
        clearErrors(form);
      }
    });
  });

  document.querySelectorAll('.js-entity-action').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await handleActionButton(button);
      } catch (error) {
        showToast(error.message || 'No se pudo ejecutar la accion.', 'danger');
      }
    });
  });

  modal?.addEventListener('hidden.bs.modal', () => {
    form?.reset();
    if (form?.elements.id) form.elements.id.value = '';
    clearErrors(form);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent || 'Guardar';
      submitButton.textContent = 'Guardando...';
    }
    clearErrors(form);
    try {
      await submitEntityForm(form);
      showToast('Cambios guardados.');
      window.location.reload();
    } catch (error) {
      const messages = error.details ? Object.values(error.details) : [error.message];
      showErrors(form, messages);
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || 'Guardar';
      }
    }
  });

  if (page && errorBox) {
    errorBox.classList.add('d-none');
  }
}

function bindLogin() {
  const form = document.getElementById('loginForm');
  const errorBox = document.querySelector('.js-login-error');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox?.classList.add('d-none');
    try {
      const formData = new FormData(form);
      const body = new URLSearchParams();
      formData.forEach((value, key) => body.append(key, value));
      await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
      });
      window.location.href = '/';
    } catch (error) {
      if (error.status === 429) {
        errorBox.textContent = error.message || 'Tu usuario quedo bloqueado temporalmente.';
      } else {
        errorBox.textContent = error.message || 'No se pudo iniciar sesion.';
      }
      errorBox?.classList.remove('d-none');
    }
  });
}

window.appUtils = { request, showToast, escapeHtml };

bindLogin();
bindEntityPage();
renderDashboardCharts();
renderRentabilityChart();
