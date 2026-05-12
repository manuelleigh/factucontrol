const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Categoria',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      tipo: {
        type: DataTypes.ENUM('gasto_operativo', 'compra_bien'),
        allowNull: false,
      },
      presupuestoMensual: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'presupuesto_mensual',
      },
      mes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      anio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'categorias', timestamps: false }
  );
