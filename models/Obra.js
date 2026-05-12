const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Obra',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(160), allowNull: false },
      clienteId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'cliente_id' },
      fechaInicio: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_inicio' },
      fechaFinEstimada: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_fin_estimada' },
      presupuestoTotal: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'presupuesto_total',
      },
      estado: {
        type: DataTypes.ENUM('En formulacion', 'En ejecucion', 'Finalizada', 'Cerrada'),
        allowNull: false,
        defaultValue: 'En formulacion',
      },
      descripcion: { type: DataTypes.TEXT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'obras', timestamps: false }
  );
