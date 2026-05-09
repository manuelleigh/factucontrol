function notFoundHandler(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso no encontrado.', details: null });
  }

  return res.status(404).render('error', {
    title: 'Página no encontrada',
    message: 'La ruta que buscas no existe o fue movida.',
    statusCode: 404,
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocurrió un error inesperado.';

  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({ error: message, details: err.details || null });
  }

  return res.status(statusCode).render('error', {
    title: 'Error',
    message,
    statusCode,
  });
}

module.exports = { notFoundHandler, errorHandler };
