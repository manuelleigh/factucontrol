const { DataTypes } = require('sequelize');

async function ensureTable(queryInterface, tableName, attributes) {
  try {
    await queryInterface.describeTable(tableName);
    return false;
  } catch {
    await queryInterface.createTable(tableName, attributes);
    return true;
  }
}

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName).catch(() => null);
  if (!table || table[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function ensureIndex(queryInterface, tableName, fields, options = {}) {
  try {
    await queryInterface.addIndex(tableName, fields, options);
  } catch {
    // Ignore duplicate indexes on re-runs.
  }
}

module.exports = {
  name: '202605110001_gestpyme_schema',
  async up(queryInterface) {
    await ensureColumn(queryInterface, 'users', 'intentos_fallidos', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await ensureColumn(queryInterface, 'users', 'bloqueado_hasta', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await ensureTable(queryInterface, 'clientes', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      razon_social: { type: DataTypes.STRING(160), allowNull: false },
      ruc: { type: DataTypes.STRING(11), allowNull: false, unique: true },
      direccion: { type: DataTypes.STRING(180), allowNull: true },
      telefono: { type: DataTypes.STRING(30), allowNull: true },
      correo: { type: DataTypes.STRING(120), allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await ensureTable(queryInterface, 'obras', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: DataTypes.STRING(160), allowNull: false },
      cliente_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      fecha_inicio: { type: DataTypes.DATEONLY, allowNull: true },
      fecha_fin_estimada: { type: DataTypes.DATEONLY, allowNull: true },
      presupuesto_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      estado: {
        type: DataTypes.ENUM('En formulacion', 'En ejecucion', 'Finalizada', 'Cerrada'),
        allowNull: false,
        defaultValue: 'En formulacion',
      },
      descripcion: { type: DataTypes.TEXT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await ensureTable(queryInterface, 'cobros', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      obra_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'obras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      cliente_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      monto_cobrado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      fecha_cobro: { type: DataTypes.DATEONLY, allowNull: false },
      metodo_cobro: {
        type: DataTypes.ENUM('Efectivo', 'Transferencia'),
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM('Cobrado', 'Pendiente', 'Vencido'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      concepto: { type: DataTypes.STRING(255), allowNull: false },
      comprobante_adjunto: { type: DataTypes.STRING(255), allowNull: true },
    });

    await ensureTable(queryInterface, 'categorias', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      tipo: { type: DataTypes.ENUM('gasto_operativo', 'compra_bien'), allowNull: false },
      presupuesto_mensual: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      mes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      anio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await ensureTable(queryInterface, 'presupuestos', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nombre: { type: DataTypes.STRING(160), allowNull: false },
      descripcion: { type: DataTypes.TEXT, allowNull: true },
      monto_estimado: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      fecha_solicitud: { type: DataTypes.DATEONLY, allowNull: false },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Aprobado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      obra_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'obras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
    });

    await ensureTable(queryInterface, 'cotizaciones', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      proveedor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'proveedores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      obra_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'obras', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      descripcion: { type: DataTypes.STRING(255), allowNull: false },
      monto: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      fecha_vigencia: { type: DataTypes.DATEONLY, allowNull: false },
      estado: {
        type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      factura_compra_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    });

    await ensureColumn(queryInterface, 'gastos_operativos', 'obra_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'obras', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await ensureColumn(queryInterface, 'gastos_operativos', 'categoria_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'categorias', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await ensureColumn(queryInterface, 'gastos_operativos', 'metodo_pago', {
      type: DataTypes.ENUM('Efectivo', 'Transferencia'),
      allowNull: true,
    });

    await ensureColumn(queryInterface, 'compras_bienes', 'obra_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'obras', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await ensureColumn(queryInterface, 'compras_bienes', 'categoria_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'categorias', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await ensureColumn(queryInterface, 'compras_bienes', 'cotizacion_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'cotizaciones', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await ensureColumn(queryInterface, 'compras_bienes', 'tipo_bien', {
      type: DataTypes.ENUM('Consumible', 'Activo'),
      allowNull: false,
      defaultValue: 'Consumible',
    });
    await ensureColumn(queryInterface, 'compras_bienes', 'metodo_pago', {
      type: DataTypes.ENUM('Efectivo', 'Transferencia'),
      allowNull: true,
    });

    await ensureTable(queryInterface, 'audit_logs', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      modulo: { type: DataTypes.STRING(50), allowNull: false },
      accion: { type: DataTypes.STRING(60), allowNull: false },
      entidad: { type: DataTypes.STRING(80), allowNull: true },
      entidad_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      before_data: { type: DataTypes.TEXT, allowNull: true },
      after_data: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await ensureIndex(queryInterface, 'gastos_operativos', ['proveedor_id', 'numero_factura'], {
      unique: true,
      name: 'uq_gastos_proveedor_factura',
    });
    await ensureIndex(queryInterface, 'compras_bienes', ['proveedor_id', 'numero_factura'], {
      unique: true,
      name: 'uq_compras_proveedor_factura',
    });
    await ensureIndex(queryInterface, 'clientes', ['ruc'], {
      unique: true,
      name: 'uq_clientes_ruc',
    });
    await ensureIndex(queryInterface, 'proveedores', ['identificacion_fiscal'], {
      unique: true,
      name: 'uq_proveedores_identificacion',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs').catch(() => {});
    await queryInterface.dropTable('cotizaciones').catch(() => {});
    await queryInterface.dropTable('presupuestos').catch(() => {});
    await queryInterface.dropTable('categorias').catch(() => {});
    await queryInterface.dropTable('cobros').catch(() => {});
    await queryInterface.dropTable('obras').catch(() => {});
    await queryInterface.dropTable('clientes').catch(() => {});
    await queryInterface.removeColumn('users', 'intentos_fallidos').catch(() => {});
    await queryInterface.removeColumn('users', 'bloqueado_hasta').catch(() => {});
  },
};
