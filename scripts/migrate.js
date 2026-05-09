require('dotenv').config({ quiet: true });

const { sequelize } = require('../models');
const { runMigrations } = require('../database/migrate');

async function main() {
  try {
    await sequelize.authenticate();
    await runMigrations(sequelize);
    console.log('Migraciones aplicadas correctamente.');
    await sequelize.close();
  } catch (error) {
    console.error('No se pudieron aplicar las migraciones:', error.message);
    process.exit(1);
  }
}

main();
