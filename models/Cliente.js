const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Cliente',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      razonSocial: { type: DataTypes.STRING(160), allowNull: false, field: 'razon_social' },
      ruc: { type: DataTypes.STRING(11), allowNull: false, unique: true },
      direccion: { type: DataTypes.STRING(180), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: true },
      correo: { type: DataTypes.STRING(120), allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'clientes', timestamps: false }
  );
