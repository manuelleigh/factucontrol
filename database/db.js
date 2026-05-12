const path = require('path');
const { Sequelize } = require('sequelize');

const storagePath = path.resolve(process.cwd(), process.env.DB_PATH || 'database/gestpyme.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
});

module.exports = sequelize;
