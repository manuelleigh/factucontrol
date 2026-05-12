function normalizeSequelizeErrors(err) {
  if (err?.name !== 'SequelizeValidationError' && err?.name !== 'SequelizeUniqueConstraintError') return null;

  const details = {};
  for (const item of err.errors || []) {
    const field = item.path || item.instance?.path || item.field || 'general';
    details[field] = item.message || (err.name === 'SequelizeUniqueConstraintError' ? 'Este valor ya existe.' : 'Revisa este campo.');
  }

  return {
    statusCode: 400,
    message: err.name === 'SequelizeUniqueConstraintError' ? 'Ya existe un registro con ese valor.' : 'Revisa los datos ingresados.',
    details: Object.keys(details).length ? details : null,
  };
}

function notFoundHandler(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Recurso no encontrado.', details: null });
  }

  return res.status(404).render('error', {
    title: 'Pagina no encontrada',
    message: 'La ruta que buscas no existe o fue movida.',
    statusCode: 404,
  });
}

function errorHandler(err, req, res, next) {
  const sequelizeError = normalizeSequelizeErrors(err);
  const statusCode = sequelizeError?.statusCode || err.statusCode || 500;
  const message = sequelizeError?.message || err.message || 'Ocurrio un error inesperado.';
  const details = sequelizeError?.details || err.details || null;

  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({ error: message, details });
  }

  return res.status(statusCode).render('error', {
    title: 'Error',
    message,
    statusCode,
  });
}

module.exports = { notFoundHandler, errorHandler };
