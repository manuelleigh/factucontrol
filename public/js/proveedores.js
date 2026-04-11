const proveedorForm = document.getElementById('proveedorForm');
const proveedorModal = document.getElementById('proveedorModal');
const proveedorErrors = document.getElementById('proveedorErrors');

function clearProviderValidation() {
  if (proveedorErrors) {
    proveedorErrors.className = 'col-12 d-none';
    proveedorErrors.innerHTML = '';
  }
  proveedorForm.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
}

function showProviderErrors(errors) {
  if (!proveedorErrors || !errors.length) {
    clearProviderValidation();
    return;
  }

  proveedorErrors.className = 'col-12 form-errors';
  proveedorErrors.innerHTML = `
    <strong>Revisa la información del proveedor:</strong>
    <ul class="mb-0 mt-2">${errors.map((error) => `<li>${error}</li>`).join('')}</ul>
  `;
}

function markProviderFieldErrors(details = {}) {
  Object.entries(details).forEach(([field, message]) => {
    const input = proveedorForm.elements[field];
    if (!input) return;
    input.classList.add('is-invalid');
    input.setAttribute('title', message);
  });
}

if (proveedorForm) {
  proveedorModal.addEventListener('hidden.bs.modal', () => {
    proveedorForm.reset();
    clearProviderValidation();
  });

  document.querySelectorAll('.js-edit-proveedor').forEach((button) => {
    button.addEventListener('click', () => {
      clearProviderValidation();
      const proveedor = JSON.parse(button.dataset.proveedor);
      Object.entries(proveedor).forEach(([key, value]) => {
        if (proveedorForm.elements[key]) proveedorForm.elements[key].value = value ?? '';
      });
    });
  });

  proveedorForm.addEventListener('input', (event) => {
    event.target.classList.remove('is-invalid');
  });

  proveedorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearProviderValidation();
    const id = proveedorForm.elements.id.value;
    const payload = Object.fromEntries(new FormData(proveedorForm).entries());

    try {
      await window.appUtils.request(id ? `/api/proveedores/${id}` : '/api/proveedores', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      window.appUtils.showToast(id ? 'Proveedor actualizado.' : 'Proveedor creado.');
      window.location.reload();
    } catch (error) {
      if (error.details) markProviderFieldErrors(error.details);
      showProviderErrors(error.details ? Object.values(error.details) : [error.message]);
    }
  });

  document.querySelectorAll('.js-deactivate-proveedor').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Se desactivará este proveedor pero se conservará su historial.')) return;
      try {
        await window.appUtils.request(`/api/proveedores/${button.dataset.id}/desactivar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
        window.appUtils.showToast('Proveedor desactivado.');
        window.location.reload();
      } catch (error) {
        window.appUtils.showToast(error.message, 'danger');
      }
    });
  });
}
