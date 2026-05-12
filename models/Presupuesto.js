const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Presupuesto',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      clienteId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'cliente_id' },
      nombre: { type: DataTypes.STRING(160), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: true },
      montoEstimado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'monto_estimado' },
      fechaSolicitud: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_solicitud' },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Aprobado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      obraId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'obra_id' },
    },
    { tableName: 'presupuestos', timestamps: false }
  );
