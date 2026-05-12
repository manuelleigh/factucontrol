const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Cotizacion',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      proveedorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'proveedor_id' },
      obraId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'obra_id' },
      descripcion: { type: DataTypes.STRING(255), allowNull: false },
      monto: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      fechaVigencia: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_vigencia' },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      facturaCompraId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'factura_compra_id' },
    },
    { tableName: 'cotizaciones', timestamps: false }
  );
