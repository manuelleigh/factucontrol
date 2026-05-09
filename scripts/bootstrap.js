require('dotenv').config({ quiet: true });

const { sequelize } = require('../models');
const { runMigrations } = require('../database/migrate');
const { ensureDefaultAdminUser } = require('../services/userService');

async function main() {
  try {
    await sequelize.authenticate();
    await runMigrations(sequelize);
    const admin = await ensureDefaultAdminUser();
    if (admin) {
      console.log(`Usuario administrador inicial creado: ${admin.user.email}`);
      console.log(`Contraseña inicial: ${admin.password}`);
    } else {
      console.log('Base preparada correctamente. Ya existía al menos un usuario.');
    }
    await sequelize.close();
  } catch (error) {
    console.error('No se pudo preparar la base de datos:', error.message);
    process.exit(1);
  }
}

main();
