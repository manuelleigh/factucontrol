const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Proveedor',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      identificacionFiscal: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'identificacion_fiscal',
      },
      giro: { type: DataTypes.STRING(120), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: true },
      correo: { type: DataTypes.STRING(120), allowNull: true, field: 'correo' },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fechaRegistro: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'fecha_registro' },
    },
    { tableName: 'proveedores', timestamps: false }
  );
