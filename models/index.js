const sequelize = require('../database/db');
const defineProveedor = require('./Proveedor');
const defineGastoOperativo = require('./GastoOperativo');
const defineCompraBien = require('./CompraBien');

const Proveedor = defineProveedor(sequelize);
const GastoOperativo = defineGastoOperativo(sequelize);
const CompraBien = defineCompraBien(sequelize);

Proveedor.hasMany(GastoOperativo, { foreignKey: 'proveedor_id', as: 'gastos' });
Proveedor.hasMany(CompraBien, { foreignKey: 'proveedor_id', as: 'compras' });
GastoOperativo.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
CompraBien.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });

module.exports = { sequelize, Proveedor, GastoOperativo, CompraBien };
