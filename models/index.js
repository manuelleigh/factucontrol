const sequelize = require('../database/db');
const defineProveedor = require('./Proveedor');
const defineGastoOperativo = require('./GastoOperativo');
const defineCompraBien = require('./CompraBien');
const defineUser = require('./User');

const Proveedor = defineProveedor(sequelize);
const GastoOperativo = defineGastoOperativo(sequelize);
const CompraBien = defineCompraBien(sequelize);
const User = defineUser(sequelize);

Proveedor.hasMany(GastoOperativo, { foreignKey: 'proveedor_id', as: 'gastos' });
Proveedor.hasMany(CompraBien, { foreignKey: 'proveedor_id', as: 'compras' });
GastoOperativo.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
CompraBien.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });

module.exports = { sequelize, User, Proveedor, GastoOperativo, CompraBien };
