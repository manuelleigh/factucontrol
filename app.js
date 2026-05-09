const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const SequelizeStoreFactory = require('connect-session-sequelize');

dotenv.config({ quiet: true });

const { sequelize } = require('./models');
const { runMigrations } = require('./database/migrate');
const { ensureDefaultAdminUser } = require('./services/userService');
const authRoutes = require('./routes/auth');
const iaRoutes = require('./routes/ia');
const pageRoutes = require('./routes/pages');
const proveedorRoutes = require('./routes/proveedores');
const gastoRoutes = require('./routes/gastos');
const compraRoutes = require('./routes/compras');
const reporteRoutes = require('./routes/reportes');
const { hydrateCurrentUser, requireAuth } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { ensureUploadDir } = require('./middleware/upload');
const { APP_TITLE } = require('./utils/constants');
const helpers = require('./utils/helpers');

const SequelizeStore = SequelizeStoreFactory(session.Store);
const app = express();
const port = Number(process.env.PORT || 3000);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const envWarnings = [];

if (!process.env.DB_NAME) envWarnings.push('DB_NAME');
if (!process.env.DB_USER) envWarnings.push('DB_USER');
if (!process.env.SESSION_SECRET) envWarnings.push('SESSION_SECRET');

ensureUploadDir(uploadDir);

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'Sessions',
  disableTouch: true,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'factucontrol-dev-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
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
app.use('/uploads', requireAuth, express.static(uploadDir));
app.use('/', pageRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/gastos', gastoRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/reportes', reporteRoutes);

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
    app.listen(port, () => {
      console.log(`${APP_TITLE} ejecutándose en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar la aplicación:', error.message);
    process.exit(1);
  }
}

start();
