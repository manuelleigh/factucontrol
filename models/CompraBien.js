const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'CompraBien',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      proveedorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'proveedor_id' },
      obraId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'obra_id' },
      categoriaId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'categoria_id' },
      categoriaNombre: { type: DataTypes.STRING(80), allowNull: false, field: 'categoria' },
      cotizacionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'cotizacion_id' },
      numeroFactura: { type: DataTypes.STRING(60), allowNull: false, field: 'numero_factura' },
      fechaEmision: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_emision' },
      fechaVencimiento: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_vencimiento' },
      concepto: { type: DataTypes.STRING(255), allowNull: false },
      baseImponible: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'base_imponible' },
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
        type: DataTypes.ENUM('Efectivo', 'Transferencia'),
        allowNull: true,
        field: 'metodo_pago',
      },
      archivoAdjunto: { type: DataTypes.STRING(255), allowNull: true, field: 'archivo_adjunto' },
      nombreBien: { type: DataTypes.STRING(150), allowNull: false, field: 'nombre_bien' },
      cantidad: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      estadoBien: {
        type: DataTypes.ENUM('Nuevo', 'Usado'),
        allowNull: false,
        field: 'estado_bien',
      },
      tipoBien: {
        type: DataTypes.ENUM('Consumible', 'Activo'),
        allowNull: false,
        defaultValue: 'Consumible',
        field: 'tipo_bien',
      },
      fechaRegistro: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'fecha_registro' },
    },
    { tableName: 'compras_bienes', timestamps: false }
  );
