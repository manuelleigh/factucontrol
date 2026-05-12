const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'user_id' },
      modulo: { type: DataTypes.STRING(50), allowNull: false },
      accion: { type: DataTypes.STRING(60), allowNull: false },
      entidad: { type: DataTypes.STRING(80), allowNull: true },
      entidadId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'entidad_id' },
      beforeData: { type: DataTypes.TEXT, allowNull: true, field: 'before_data' },
      afterData: { type: DataTypes.TEXT, allowNull: true, field: 'after_data' },
    },
    { tableName: 'audit_logs', timestamps: false }
  );
