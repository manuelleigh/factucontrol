function showToast(message, type = 'success') {
  const wrapper = document.createElement('div');
  wrapper.className = 'toast-container position-fixed top-0 end-0 p-3';
  wrapper.innerHTML = `
    <div class="toast align-items-center text-bg-${type} border-0 show" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), 4000);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'No se pudo completar la operación.');
    error.details = data.details || null;
    throw error;
  }
  return data;
}

window.appUtils = { request, showToast };
