const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const { sequelize } = require('./models');
const pageRoutes = require('./routes/pages');
const proveedorRoutes = require('./routes/proveedores');
const gastoRoutes = require('./routes/gastos');
const compraRoutes = require('./routes/compras');
const reporteRoutes = require('./routes/reportes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { ensureUploadDir } = require('./middleware/upload');
const { APP_TITLE } = require('./utils/constants');
const helpers = require('./utils/helpers');

const app = express();
const port = Number(process.env.PORT || 3000);
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const envWarnings = [];

if (!process.env.DB_NAME) envWarnings.push('DB_NAME');
if (!process.env.DB_USER) envWarnings.push('DB_USER');

ensureUploadDir(uploadDir);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

app.locals.appTitle = APP_TITLE;
app.locals.helpers = helpers;

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use('/', pageRoutes);
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
    await sequelize.sync();
    app.listen(port, () => {
      console.log(`${APP_TITLE} ejecutándose en http://localhost:${port}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar la aplicación:', error.message);
    process.exit(1);
  }
}

start();
