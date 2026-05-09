const fs = require('fs');
const path = require('path');

async function ensureSchemaMigrationsTable(queryInterface) {
  try {
    await queryInterface.describeTable('schema_migrations');
    return;
  } catch {
    await queryInterface.createTable('schema_migrations', {
      name: {
        type: require('sequelize').DataTypes.STRING(160),
        primaryKey: true,
        allowNull: false,
      },
      executed_at: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: false,
        defaultValue: require('sequelize').DataTypes.NOW,
      },
    });
  }
}

async function runMigrations(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  await ensureSchemaMigrationsTable(queryInterface);

  const [rows] = await sequelize.query('SELECT name FROM schema_migrations ORDER BY name ASC');
  const applied = new Set(rows.map((row) => row.name));

  const migrationsDir = path.resolve(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

  for (const file of files) {
    const migration = require(path.join(migrationsDir, file));
    const name = migration.name || file;
    if (applied.has(name)) continue;

    await migration.up(queryInterface, require('sequelize'));
    await sequelize.query('INSERT INTO schema_migrations (name, executed_at) VALUES (?, ?)', {
      replacements: [name, new Date()],
    });
  }
}

module.exports = { runMigrations };
