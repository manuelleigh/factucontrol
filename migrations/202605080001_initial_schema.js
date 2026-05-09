const { DataTypes } = require('sequelize');

async function ensureTable(queryInterface, tableName, attributes, options = {}) {
  try {
    await queryInterface.describeTable(tableName);
    return false;
  } catch (error) {
    await queryInterface.createTable(tableName, attributes, options);
    return true;
  }
}

module.exports = {
  name: '202605080001_initial_schema',
  async up(queryInterface) {
    await ensureTable(queryInterface, 'users', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM('admin', 'accountant', 'viewer'),
        allowNull: false,
        defaultValue: 'viewer',
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
    });

    await ensureTable(queryInterface, 'Sessions', {
      sid: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
      expires: { type: DataTypes.DATE, allowNull: true },
      data: { type: DataTypes.TEXT('long'), allowNull: false },
    });

    await ensureTable(queryInterface, 'proveedores', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: DataTypes.STRING(120), allowNull: false },
      identificacion_fiscal: { type: DataTypes.STRING(50), allowNull: false },
      giro: { type: DataTypes.STRING(120), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: true },
      correo: { type: DataTypes.STRING(120), allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      fecha_registro: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await ensureTable(queryInterface, 'gastos_operativos', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      proveedor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'proveedores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      numero_factura: { type: DataTypes.STRING(60), allowNull: false },
      fecha_emision: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: false },
      categoria: { type: DataTypes.STRING(80), allowNull: false },
      concepto: { type: DataTypes.STRING(255), allowNull: false },
      base_imponible: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      porcentaje_impuesto: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Pagada', 'Vencida'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      fecha_pago: { type: DataTypes.DATEONLY, allowNull: true },
      metodo_pago: {
        type: DataTypes.ENUM('Efectivo', 'Transferencia bancaria'),
        allowNull: true,
      },
      archivo_adjunto: { type: DataTypes.STRING(255), allowNull: true },
      fecha_registro: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await ensureTable(queryInterface, 'compras_bienes', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      proveedor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'proveedores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      numero_factura: { type: DataTypes.STRING(60), allowNull: false },
      fecha_emision: { type: DataTypes.DATEONLY, allowNull: false },
      fecha_vencimiento: { type: DataTypes.DATEONLY, allowNull: false },
      categoria: { type: DataTypes.STRING(80), allowNull: false },
      concepto: { type: DataTypes.STRING(255), allowNull: false },
      base_imponible: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      porcentaje_impuesto: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Pagada', 'Vencida'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      fecha_pago: { type: DataTypes.DATEONLY, allowNull: true },
      metodo_pago: {
        type: DataTypes.ENUM('Efectivo', 'Transferencia bancaria'),
        allowNull: true,
      },
      archivo_adjunto: { type: DataTypes.STRING(255), allowNull: true },
      fecha_registro: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      nombre_bien: { type: DataTypes.STRING(150), allowNull: false },
      cantidad: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      estado_bien: { type: DataTypes.ENUM('Nuevo', 'Usado'), allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('compras_bienes');
    await queryInterface.dropTable('gastos_operativos');
    await queryInterface.dropTable('proveedores');
    await queryInterface.dropTable('Sessions');
    await queryInterface.dropTable('users');
  },
};
