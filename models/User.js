const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      role: {
        type: DataTypes.ENUM('admin', 'operador'),
        allowNull: false,
        defaultValue: 'operador',
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      failedAttempts: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'intentos_fallidos',
      },
      blockedUntil: { type: DataTypes.DATE, allowNull: true, field: 'bloqueado_hasta' },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    },
    { tableName: 'users', timestamps: false }
  );
