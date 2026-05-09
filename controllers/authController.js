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
  const { email, password } = req.body;

  try {
    const user = await authenticateUser(email, password);
    req.session.regenerate((regenError) => {
      if (regenError) {
        return res.status(500).render('login', {
          title: 'Iniciar sesion',
          error: 'No se pudo iniciar sesion.',
          email: req.body?.email || '',
        });
      }

      req.session.userId = user.id;
      req.session.user = user;
      return res.redirect('/');
    });
  } catch (error) {
    res.status(error.statusCode || 500).render('login', {
      title: 'Iniciar sesion',
      error: error.message || 'No se pudo iniciar sesion.',
      email: req.body?.email || '',
    });
  }
});

const logout = asyncHandler(async (req, res) => {
  if (!req.session) return res.redirect('/login');

  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

module.exports = { login, logout, renderLogin };
