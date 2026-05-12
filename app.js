const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3');

dotenv.config({ quiet: true });

const { sequelize } = require('./models');
const { runMigrations } = require('./database/migrate');
const { ensureDefaultAdminUser } = require('./services/userService');
const authRoutes = require('./routes/auth');
const pageRoutes = require('./routes/pages');
const proveedorRoutes = require('./routes/proveedores');
const clienteRoutes = require('./routes/clientes');
const obraRoutes = require('./routes/obras');
const gastoRoutes = require('./routes/gastos');
const compraRoutes = require('./routes/compras');
const cobroRoutes = require('./routes/cobros');
const categoriaRoutes = require('./routes/categorias');
const presupuestoRoutes = require('./routes/presupuestos');
const cotizacionRoutes = require('./routes/cotizaciones');
const reporteRoutes = require('./routes/reportes');
const apiController = require('./controllers/apiController');
const { requireAuth } = require('./middleware/auth');
const { hydrateCurrentUser } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { ensureUploadDir } = require('./middleware/upload');
const { APP_TITLE } = require('./utils/constants');
const helpers = require('./utils/helpers');

const SQLiteStore = SQLiteStoreFactory(session);
const app = express();
const port = Number(process.env.PORT || 3000);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const envWarnings = [];

if (!process.env.SESSION_SECRET) envWarnings.push('SESSION_SECRET');

ensureUploadDir(uploadDir);

const sessionStore = new SQLiteStore({
  db: process.env.SESSION_DB || 'sessions.sqlite',
  dir: path.resolve(process.cwd(), 'database'),
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'gestpyme-dev-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Number(process.env.SESSION_MAX_AGE || 7200000),
    },
  })
);

app.use(hydrateCurrentUser);

app.locals.appTitle = APP_TITLE;
app.locals.helpers = helpers;

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use(authRoutes);
app.use('/uploads', express.static(uploadDir));
app.use('/', pageRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/obras', obraRoutes);
app.use('/api/gastos', gastoRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/cobros', cobroRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/presupuestos', presupuestoRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/reportes', reporteRoutes);
app.get('/api/dashboard', requireAuth, apiController.dashboard);
app.get('/api/rentabilidad', requireAuth, apiController.rentabilidad);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    if (envWarnings.length) {
      console.warn(`Aviso: faltan variables de entorno recomendadas: ${envWarnings.join(', ')}`);
    }
    await sequelize.authenticate();
    await runMigrations(sequelize);
    await ensureDefaultAdminUser();
    app.listen(port, async () => {
      console.log(`${APP_TITLE} ejecutandose en http://localhost:${port}`);
      if (process.env.NODE_ENV !== 'production') {
        try {
          const open = (await import('open')).default;
          await open(`http://localhost:${port}`);
        } catch (error) {
          console.warn('No se pudo abrir el navegador automaticamente:', error.message);
        }
      }
    });
  } catch (error) {
    console.error('No se pudo iniciar la aplicacion:', error.message);
    process.exit(1);
  }
}

start();
