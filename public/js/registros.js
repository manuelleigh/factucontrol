const registroForm = document.getElementById('registroForm');
const pagoForm = document.getElementById('pagoForm');
const totalPreview = document.getElementById('totalPreview');
const confirmSummary = document.getElementById('confirmSummary');
const confirmSaveButton = document.getElementById('confirmSaveButton');
const registroErrors = document.getElementById('registroErrors');
const pagoErrors = document.getElementById('pagoErrors');
const aiRegistroTitle = document.getElementById('aiRegistroTitle');
const aiRegistroMeta = document.getElementById('aiRegistroMeta');
const aiRegistroResult = document.getElementById('aiRegistroResult');

let pendingSubmission = null;

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
}

function updateTotalPreview() {
  const base = Number(registroForm.querySelector('.js-base-imponible')?.value || 0);
  const impuesto = Number(registroForm.querySelector('.js-impuesto')?.value || 0);
  totalPreview.textContent = formatCurrency(base + (base * impuesto) / 100);
}

function clearFieldValidation(form) {
  form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
}

function applyFieldErrors(form, details = {}) {
  clearFieldValidation(form);
  Object.entries(details).forEach(([field, message]) => {
    const input = form.elements[field];
    if (!input) return;
    input.classList.add('is-invalid');
    input.setAttribute('title', message);
  });
}

function showFormErrors(errors) {
  if (!registroErrors) return;
  if (!errors.length) {
    registroErrors.className = 'col-12 d-none';
    registroErrors.innerHTML = '';
    return;
  }

  registroErrors.className = 'col-12 form-errors';
  registroErrors.innerHTML = `
    <strong>Revisa la información ingresada:</strong>
    <ul class="mb-0 mt-2">${errors.map((error) => `<li>${window.appUtils.escapeHtml(error)}</li>`).join('')}</ul>
  `;
}

function showPaymentErrors(errors) {
  if (!pagoErrors) return;
  if (!errors.length) {
    pagoErrors.className = 'd-none';
    pagoErrors.innerHTML = '';
    return;
  }

  pagoErrors.className = 'form-errors mb-3';
  pagoErrors.innerHTML = `
    <strong>Revisa los datos del pago:</strong>
    <ul class="mb-0 mt-2">${errors.map((error) => `<li>${window.appUtils.escapeHtml(error)}</li>`).join('')}</ul>
  `;
}

function collectClientErrors(formData) {
  const errors = [];
  const details = {};
  const fechaEmision = formData.get('fechaEmision');
  const fechaVencimiento = formData.get('fechaVencimiento');
  const baseImponible = Number(formData.get('baseImponible') || 0);
  const porcentajeImpuesto = Number(formData.get('porcentajeImpuesto') || 0);
  const file = formData.get('archivoAdjunto');
  const isCompra = registroForm.dataset.type === 'compra';

  if (fechaEmision && fechaVencimiento && fechaVencimiento < fechaEmision) {
    details.fechaVencimiento = 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.';
  }
  if (!(baseImponible > 0)) details.baseImponible = 'La base imponible debe ser mayor a cero.';
  if (porcentajeImpuesto < 0 || porcentajeImpuesto > 100) {
    details.porcentajeImpuesto = 'El impuesto debe estar entre 0 y 100.';
  }
  if (isCompra) {
    if (!formData.get('nombreBien')) details.nombreBien = 'El nombre del bien es obligatorio.';
    if (!(Number(formData.get('cantidad')) > 0)) details.cantidad = 'La cantidad debe ser mayor a cero.';
    if (!formData.get('estadoBien')) details.estadoBien = 'Debes seleccionar el estado del bien.';
  }
  if (file && file.size) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) details.archivoAdjunto = 'Solo se permiten archivos PDF, JPG, PNG o WEBP.';
    if (file.size > 5 * 1024 * 1024) details.archivoAdjunto = 'El archivo adjunto no puede superar 5 MB.';
  }

  Object.values(details).forEach((value) => errors.push(value));
  return { errors, details };
}

function buildConfirmationItems(formData) {
  const proveedorText =
    registroForm.elements.proveedorId.options[registroForm.elements.proveedorId.selectedIndex]?.text || '-';
  const categoriaText =
    registroForm.elements.categoria.options[registroForm.elements.categoria.selectedIndex]?.text || '-';
  const items = [
    ['Proveedor', proveedorText],
    ['Número de factura', formData.get('numeroFactura') || '-'],
    ['Categoría', categoriaText],
    ['Fecha de emisión', formData.get('fechaEmision') || '-'],
    ['Fecha de vencimiento', formData.get('fechaVencimiento') || '-'],
    ['Base imponible', formatCurrency(formData.get('baseImponible') || 0)],
    ['IVA', `${formData.get('porcentajeImpuesto') || 0}%`],
    ['Total calculado', totalPreview.textContent],
    ['Concepto', formData.get('concepto') || '-'],
  ];

  if (registroForm.dataset.type === 'compra') {
    items.push(
      ['Nombre del bien', formData.get('nombreBien') || '-'],
      ['Cantidad', formData.get('cantidad') || '-'],
      ['Estado del bien', formData.get('estadoBien') || '-']
    );
  }

  const file = formData.get('archivoAdjunto');
  items.push(['Adjunto', file && file.name ? file.name : 'Sin cambio de archivo']);

  return items;
}

function renderConfirmation(formData) {
  const items = buildConfirmationItems(formData);
  confirmSummary.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="confirmation-item">
          <strong>${window.appUtils.escapeHtml(label)}</strong>
          <span>${window.appUtils.escapeHtml(value)}</span>
        </article>
      `
    )
    .join('');
}

function extractApiError(error, fallback) {
  if (error?.details && typeof error.details === 'object') return Object.values(error.details);
  return [error?.error || fallback];
}

function renderInsightBlock(insight = {}) {
  const renderList = (label, items) => {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <div class="ai-block">
        <strong>${window.appUtils.escapeHtml(label)}</strong>
        <ul>${items.map((item) => `<li>${window.appUtils.escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    `;
  };

  return `
    <div class="ai-title">${window.appUtils.escapeHtml(insight.titulo || 'Análisis IA')}</div>
    <p>${window.appUtils.escapeHtml(insight.resumen || 'Sin resumen disponible.')}</p>
    ${renderList('Alertas', insight.alertas)}
    ${renderList('Acciones', insight.acciones)}
    ${insight.prioridad ? `<div class="ai-footnote">Prioridad sugerida: ${window.appUtils.escapeHtml(insight.prioridad)}</div>` : ''}
  `;
}

if (registroForm) {
  const registroModal = document.getElementById('registroModal');
  const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

  registroModal.addEventListener('hidden.bs.modal', () => {
    registroForm.reset();
    registroForm.elements.id.value = '';
    pendingSubmission = null;
    showFormErrors([]);
    clearFieldValidation(registroForm);
    updateTotalPreview();
  });

  registroForm.addEventListener('input', (event) => {
    event.target.classList.remove('is-invalid');
  });

  registroForm.querySelector('.js-base-imponible').addEventListener('input', updateTotalPreview);
  registroForm.querySelector('.js-impuesto').addEventListener('input', updateTotalPreview);
  updateTotalPreview();

  document.querySelectorAll('.js-edit-registro').forEach((button) => {
    button.addEventListener('click', () => {
      const registro = JSON.parse(button.dataset.registro);
      showFormErrors([]);
      clearFieldValidation(registroForm);
      Object.entries(registro).forEach(([key, value]) => {
        if (registroForm.elements[key]) registroForm.elements[key].value = value ?? '';
      });
      updateTotalPreview();
    });
  });

  registroForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(registroForm);
    const clientValidation = collectClientErrors(formData);
    if (clientValidation.errors.length) {
      applyFieldErrors(registroForm, clientValidation.details);
      showFormErrors(clientValidation.errors);
      return;
    }

    showFormErrors([]);
    clearFieldValidation(registroForm);
    pendingSubmission = formData;
    renderConfirmation(formData);
    confirmModal.show();
  });

  confirmSaveButton.addEventListener('click', async () => {
    if (!pendingSubmission) return;

    const id = pendingSubmission.get('id');
    const type = registroForm.dataset.type;
    const baseUrl = `/api/${type === 'compra' ? 'compras' : 'gastos'}`;

    try {
      const response = await fetch(id ? `${baseUrl}/${id}` : baseUrl, {
        method: id ? 'PUT' : 'POST',
        body: pendingSubmission,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.details) applyFieldErrors(registroForm, data.details);
        showFormErrors(extractApiError(data, 'No se pudo guardar el registro.'));
        confirmModal.hide();
        return;
      }
      window.appUtils.showToast(id ? 'Factura actualizada.' : 'Factura registrada.');
      window.location.reload();
    } catch (error) {
      showFormErrors([error.message || 'No se pudo guardar el registro.']);
      confirmModal.hide();
    }
  });
}

if (pagoForm && registroForm) {
  pagoForm.addEventListener('input', (event) => {
    event.target.classList.remove('is-invalid');
  });

  document.querySelectorAll('.js-pay-registro').forEach((button) => {
    button.addEventListener('click', () => {
      showPaymentErrors([]);
      clearFieldValidation(pagoForm);
      pagoForm.elements.id.value = button.dataset.id;
      document.getElementById('pagoFacturaNumero').textContent = button.dataset.numero;
      pagoForm.elements.fechaPago.value = new Date().toISOString().slice(0, 10);
    });
  });

  pagoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const type = registroForm.dataset.type;
    const id = pagoForm.elements.id.value;
    const payload = {
      fechaPago: pagoForm.elements.fechaPago.value,
      metodoPago: pagoForm.elements.metodoPago.value,
    };
    const baseUrl = `/api/${type === 'compra' ? 'compras' : 'gastos'}`;

    try {
      showPaymentErrors([]);
      await window.appUtils.request(`${baseUrl}/${id}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      window.appUtils.showToast('Pago registrado correctamente.');
      window.location.reload();
    } catch (error) {
      if (error.details) applyFieldErrors(pagoForm, error.details);
      showPaymentErrors(error.details ? Object.values(error.details) : [error.message]);
    }
  });
}

document.querySelectorAll('.js-ai-registro').forEach((button) => {
  button.addEventListener('click', async () => {
    const type = button.dataset.type;
    const id = button.dataset.id;
    if (aiRegistroTitle) aiRegistroTitle.textContent = 'Factura';
    if (aiRegistroMeta) aiRegistroMeta.textContent = 'Cargando análisis...';
    if (aiRegistroResult) aiRegistroResult.textContent = 'Consultando IA...';

    try {
      const data = await window.appUtils.request(`/api/ia/record/${type}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (aiRegistroTitle) aiRegistroTitle.textContent = data.record?.numeroFactura || 'Factura';
      if (aiRegistroMeta) aiRegistroMeta.textContent = `Modelo: ${data.model}${data.modelSource ? ` · fuente: ${data.modelSource}` : ''}`;
      if (aiRegistroResult) aiRegistroResult.innerHTML = renderInsightBlock(data.insight);
    } catch (error) {
      if (aiRegistroMeta) aiRegistroMeta.textContent = 'No se pudo completar el análisis.';
      if (aiRegistroResult) aiRegistroResult.textContent = error.message || 'Error inesperado.';
    }
  });
});
