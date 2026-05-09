const { User } = require('../models');
const { serializeUser } = require('../services/userService');

function isApiRequest(req) {
  return req.path.startsWith('/api/');
}

async function hydrateCurrentUser(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isAuthenticated = false;
      return next();
    }

    const user = await User.findByPk(userId);
    if (!user || !user.active) {
      await new Promise((resolve) => req.session.destroy(() => resolve()));
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isAuthenticated = false;
      return next();
    }

    req.user = serializeUser(user);
    res.locals.currentUser = req.user;
    res.locals.isAuthenticated = true;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (isApiRequest(req)) {
    return res.status(401).json({ error: 'Debes iniciar sesion para continuar.', details: null });
  }
  return res.redirect('/login');
}

function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) return requireAuth(req, res, next);
    if (allowedRoles.includes(req.user.role)) return next();
    if (isApiRequest(req)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta accion.', details: null });
    }
    return res.status(403).render('error', {
      title: 'Acceso restringido',
      message: 'No tienes permisos para realizar esta accion.',
      statusCode: 403,
    });
  };
}

function redirectIfAuthenticated(req, res, next) {
  if (req.user) return res.redirect('/');
  return next();
}

module.exports = {
  hydrateCurrentUser,
  requireAuth,
  requireRole,
  redirectIfAuthenticated,
};
