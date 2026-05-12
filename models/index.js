const sequelize = require('../database/db');
const defineUser = require('./User');
const defineProveedor = require('./Proveedor');
const defineCliente = require('./Cliente');
const defineObra = require('./Obra');
const defineCobro = require('./Cobro');
const defineCategoria = require('./Categoria');
const definePresupuesto = require('./Presupuesto');
const defineCotizacion = require('./Cotizacion');
const defineGastoOperativo = require('./GastoOperativo');
const defineCompraBien = require('./CompraBien');
const defineAuditLog = require('./AuditLog');

const User = defineUser(sequelize);
const Proveedor = defineProveedor(sequelize);
const Cliente = defineCliente(sequelize);
const Obra = defineObra(sequelize);
const Cobro = defineCobro(sequelize);
const Categoria = defineCategoria(sequelize);
const Presupuesto = definePresupuesto(sequelize);
const Cotizacion = defineCotizacion(sequelize);
const GastoOperativo = defineGastoOperativo(sequelize);
const CompraBien = defineCompraBien(sequelize);
const AuditLog = defineAuditLog(sequelize);

Cliente.hasMany(Obra, { foreignKey: 'clienteId', as: 'obras' });
Obra.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

Cliente.hasMany(Cobro, { foreignKey: 'clienteId', as: 'cobros' });
Cobro.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

Obra.hasMany(Cobro, { foreignKey: 'obraId', as: 'cobros' });
Cobro.belongsTo(Obra, { foreignKey: 'obraId', as: 'obra' });

Obra.hasMany(GastoOperativo, { foreignKey: 'obraId', as: 'gastos' });
GastoOperativo.belongsTo(Obra, { foreignKey: 'obraId', as: 'obra' });
Proveedor.hasMany(GastoOperativo, { foreignKey: 'proveedorId', as: 'gastos' });
GastoOperativo.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
Categoria.hasMany(GastoOperativo, { foreignKey: 'categoriaId', as: 'gastos' });
GastoOperativo.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

Obra.hasMany(CompraBien, { foreignKey: 'obraId', as: 'compras' });
CompraBien.belongsTo(Obra, { foreignKey: 'obraId', as: 'obra' });
Proveedor.hasMany(CompraBien, { foreignKey: 'proveedorId', as: 'compras' });
CompraBien.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
Categoria.hasMany(CompraBien, { foreignKey: 'categoriaId', as: 'compras' });
CompraBien.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });
Cotizacion.hasMany(CompraBien, { foreignKey: 'cotizacionId', as: 'facturas' });
CompraBien.belongsTo(Cotizacion, { foreignKey: 'cotizacionId', as: 'cotizacion' });

Proveedor.hasMany(Cotizacion, { foreignKey: 'proveedorId', as: 'cotizaciones' });
Cotizacion.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
Obra.hasMany(Cotizacion, { foreignKey: 'obraId', as: 'cotizaciones' });
Cotizacion.belongsTo(Obra, { foreignKey: 'obraId', as: 'obra' });

Cliente.hasMany(Presupuesto, { foreignKey: 'clienteId', as: 'presupuestos' });
Presupuesto.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });
Obra.hasMany(Presupuesto, { foreignKey: 'obraId', as: 'presupuestos' });
Presupuesto.belongsTo(Obra, { foreignKey: 'obraId', as: 'obra' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'audits' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Proveedor,
  Cliente,
  Obra,
  Cobro,
  Categoria,
  Presupuesto,
  Cotizacion,
  GastoOperativo,
  CompraBien,
  AuditLog,
};
