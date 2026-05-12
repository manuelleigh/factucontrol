const asyncHandler = require('../middleware/asyncHandler');
const { authenticateUser } = require('../services/userService');

const renderLogin = asyncHandler(async (req, res) => {
  res.render('login', {
    title: 'Iniciar sesion',
    error: null,
    email: '',
  });
});

const login = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { email, password } = body;
  const user = await authenticateUser(email, password);

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.usuarioId = user.id;
      req.session.usuario = user;
      return resolve();
    });
  });

  if (req.path.startsWith('/api/')) {
    return res.json({ ok: true, user, redirectTo: '/' });
  }
  return res.redirect('/');
});

const logout = asyncHandler(async (req, res) => {
  if (!req.session) {
    return req.path.startsWith('/api/') ? res.json({ ok: true }) : res.redirect('/login');
  }

  await new Promise((resolve) => req.session.destroy(() => resolve()));
  res.clearCookie('connect.sid');
  if (req.path.startsWith('/api/')) {
    return res.json({ ok: true, redirectTo: '/login' });
  }
  return res.redirect('/login');
});

module.exports = { login, logout, renderLogin };
