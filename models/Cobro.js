const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Cobro',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      obraId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'obra_id' },
      clienteId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'cliente_id' },
      montoCobrado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'monto_cobrado' },
      fechaCobro: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_cobro' },
      metodoCobro: {
        type: DataTypes.ENUM('Efectivo', 'Transferencia'),
        allowNull: false,
        field: 'metodo_cobro',
      },
      estado: {
        type: DataTypes.ENUM('Cobrado', 'Pendiente', 'Vencido'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      concepto: { type: DataTypes.STRING(255), allowNull: false },
      comprobanteAdjunto: { type: DataTypes.STRING(255), allowNull: true, field: 'comprobante_adjunto' },
    },
    { tableName: 'cobros', timestamps: false }
  );
