const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'CompraBien',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      proveedorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'proveedor_id' },
      numeroFactura: { type: DataTypes.STRING(60), allowNull: false, field: 'numero_factura' },
      fechaEmision: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_emision' },
      fechaVencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'fecha_vencimiento',
      },
      categoria: { type: DataTypes.STRING(80), allowNull: false },
      concepto: { type: DataTypes.STRING(255), allowNull: false },
      baseImponible: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'base_imponible',
      },
      porcentajeImpuesto: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'porcentaje_impuesto',
      },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Pagada', 'Vencida'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      fechaPago: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_pago' },
      metodoPago: {
        type: DataTypes.ENUM('Efectivo', 'Transferencia bancaria'),
        allowNull: true,
        field: 'metodo_pago',
      },
      archivoAdjunto: { type: DataTypes.STRING(255), allowNull: true, field: 'archivo_adjunto' },
      fechaRegistro: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'fecha_registro',
      },
      nombreBien: { type: DataTypes.STRING(150), allowNull: false, field: 'nombre_bien' },
      cantidad: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      estadoBien: {
        type: DataTypes.ENUM('Nuevo', 'Usado'),
        allowNull: false,
        field: 'estado_bien',
      },
    },
    { tableName: 'compras_bienes' }
  );
