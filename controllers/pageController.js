const asyncHandler = require('../middleware/asyncHandler');
const {
  getDashboardData,
  getRentabilidadData,
  listCategorias,
  listClientes,
  listCobros,
  listCompras,
  listCotizaciones,
  listGastos,
  listObras,
  listPresupuestos,
  listProveedores,
  sendOverdueNotificationSummary,
} = require('../services/gestpymeService');
const {
  CATEGORIA_TIPOS,
  COMPRA_BIEN_ESTADOS,
  COTIZACION_ESTADOS,
  METODOS_COBRO,
  OBRA_ESTADOS,
  PRESUPUESTO_ESTADOS,
  REGISTRO_ESTADOS,
} = require('../utils/constants');

function renderEntityPage(res, options) {
  return res.render('entity-page', options);
}

function buildCrudPage({
  title,
  description,
  endpoint,
  resource,
  items,
  pagination,
  fields,
  columns,
  pageType,
  extraButtons = [],
  filters = [],
  query = {},
  pageSizeOptions = [10, 20, 50],
}) {
  return {
    title,
    description,
    endpoint,
    resource,
    items,
    pagination,
    fields,
    columns,
    pageType,
    extraButtons,
    filters,
    query,
    sort: query.sort || '',
    dir: query.dir || 'asc',
    pageSizeOptions,
  };
}

const renderDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboardData(req.query);
  if (dashboard.alertas.length && req.user?.email) {
    sendOverdueNotificationSummary(req.user.email).catch(() => {});
  }
  res.render('dashboard', { title: 'Dashboard', dashboard });
});

const renderProveedores = asyncHandler(async (req, res) => {
  const { items, pagination } = await listProveedores(req.query);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Proveedores',
      description: 'Administracion de proveedores y contactos.',
      endpoint: '/api/proveedores',
      resource: 'proveedor',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'activo', label: 'Estado', type: 'select', options: ['', '1', '0'], labels: ['Todos', 'Activos', 'Inactivos'] },
      ],
      fields: [
        { name: 'nombre', label: 'Nombre o razon social', type: 'text', required: true },
        { name: 'identificacionFiscal', label: 'Identificacion fiscal', type: 'text', required: true },
        { name: 'giro', label: 'Giro', type: 'text' },
        { name: 'telefono', label: 'Telefono', type: 'text' },
        { name: 'correo', label: 'Correo', type: 'email' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      columns: [
        { label: 'Proveedor', key: 'nombre' },
        { label: 'Identificacion', key: 'identificacionFiscal' },
        { label: 'Giro', key: 'giro' },
        { label: 'Telefono', key: 'telefono' },
        { label: 'Correo', key: 'correo' },
        { label: 'Activo', key: 'activo', format: 'yesNo' },
      ],
    })
  );
});

const renderClientes = asyncHandler(async (req, res) => {
  const { items, pagination } = await listClientes(req.query);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Clientes',
      description: 'Base de clientes vinculada a obras, cobros y presupuestos.',
      endpoint: '/api/clientes',
      resource: 'cliente',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'activo', label: 'Estado', type: 'select', options: ['', '1', '0'], labels: ['Todos', 'Activos', 'Inactivos'] },
      ],
      fields: [
        { name: 'razonSocial', label: 'Razon social', type: 'text', required: true },
        { name: 'ruc', label: 'RUC', type: 'text', required: true },
        { name: 'direccion', label: 'Direccion', type: 'text' },
        { name: 'telefono', label: 'Telefono', type: 'text' },
        { name: 'correo', label: 'Correo', type: 'email' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      columns: [
        { label: 'Cliente', key: 'razonSocial' },
        { label: 'RUC', key: 'ruc' },
        { label: 'Direccion', key: 'direccion' },
        { label: 'Telefono', key: 'telefono' },
        { label: 'Correo', key: 'correo' },
        { label: 'Activo', key: 'activo', format: 'yesNo' },
      ],
    })
  );
});

const renderObras = asyncHandler(async (req, res) => {
  const [clientes, { items, pagination }] = await Promise.all([listClientes({ pageSize: 500 }), listObras(req.query)]);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Obras',
      description: 'Control central de proyectos, estado y presupuesto.',
      endpoint: '/api/obras',
      resource: 'obra',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'estado', label: 'Estado', type: 'select', options: ['', ...OBRA_ESTADOS], labels: ['Todos', ...OBRA_ESTADOS] },
        { name: 'clienteId', label: 'Cliente', type: 'select', options: ['', ...clientes.items.map((item) => String(item.id))], labels: ['Todos', ...clientes.items.map((item) => item.razonSocial)] },
        { name: 'activo', label: 'Activo', type: 'select', options: ['', '1', '0'], labels: ['Todos', 'Activos', 'Inactivos'] },
      ],
      fields: [
        { name: 'nombre', label: 'Nombre de la obra', type: 'text', required: true },
        { name: 'clienteId', label: 'Cliente', type: 'select', options: clientes.items.map((item) => ({ value: item.id, label: item.razonSocial })) },
        { name: 'fechaInicio', label: 'Fecha inicio', type: 'date' },
        { name: 'fechaFinEstimada', label: 'Fecha fin estimada', type: 'date' },
        { name: 'presupuestoTotal', label: 'Presupuesto total', type: 'number', step: '0.01', required: true },
        { name: 'estado', label: 'Estado', type: 'select', options: OBRA_ESTADOS },
        { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      columns: [
        { label: 'Obra', key: 'nombre' },
        { label: 'Cliente', key: 'cliente.razonSocial' },
        { label: 'Presupuesto', key: 'presupuestoTotal', format: 'currency' },
        { label: 'Estado', key: 'estado' },
        { label: 'Activo', key: 'activo', format: 'yesNo' },
      ],
      extraButtons: [{ label: 'Cerrar', action: 'close', className: 'btn-outline-danger js-action-close' }],
    })
  );
});

const renderCategorias = asyncHandler(async (req, res) => {
  const { items, pagination } = await listCategorias(req.query);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Categorias',
      description: 'Presupuestos mensuales y semaforo de gasto.',
      endpoint: '/api/categorias',
      resource: 'categoria',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'tipo', label: 'Tipo', type: 'select', options: ['', ...CATEGORIA_TIPOS], labels: ['Todos', ...CATEGORIA_TIPOS] },
        { name: 'mes', label: 'Mes', type: 'number' },
        { name: 'anio', label: 'Anio', type: 'number' },
        { name: 'activo', label: 'Activo', type: 'select', options: ['', '1', '0'], labels: ['Todos', 'Activos', 'Inactivos'] },
      ],
      fields: [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'tipo', label: 'Tipo', type: 'select', options: CATEGORIA_TIPOS },
        { name: 'presupuestoMensual', label: 'Presupuesto mensual', type: 'number', step: '0.01' },
        { name: 'mes', label: 'Mes', type: 'number', min: 1, max: 12, required: true },
        { name: 'anio', label: 'Anio', type: 'number', min: 2020, max: 2100, required: true },
        { name: 'activo', label: 'Activo', type: 'checkbox' },
      ],
      columns: [
        { label: 'Nombre', key: 'nombre' },
        { label: 'Tipo', key: 'tipo' },
        { label: 'Presupuesto', key: 'presupuestoMensual', format: 'currency' },
        { label: 'Periodo', key: 'mes', format: 'period' },
        { label: 'Activo', key: 'activo', format: 'yesNo' },
      ],
    })
  );
});

const renderCobros = asyncHandler(async (req, res) => {
  const [clientes, obras, { items, pagination }] = await Promise.all([listClientes({ pageSize: 500 }), listObras({ pageSize: 500 }), listCobros(req.query)]);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Cobros',
      description: 'Registro de ingresos por obra y cliente.',
      endpoint: '/api/cobros',
      resource: 'cobro',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'estado', label: 'Estado', type: 'select', options: ['', 'Cobrado', 'Pendiente', 'Vencido'], labels: ['Todos', 'Cobrado', 'Pendiente', 'Vencido'] },
        { name: 'obraId', label: 'Obra', type: 'select', options: ['', ...obras.items.map((item) => String(item.id))], labels: ['Todas', ...obras.items.map((item) => item.nombre)] },
        { name: 'clienteId', label: 'Cliente', type: 'select', options: ['', ...clientes.items.map((item) => String(item.id))], labels: ['Todos', ...clientes.items.map((item) => item.razonSocial)] },
        { name: 'fechaDesde', label: 'Desde', type: 'date' },
        { name: 'fechaHasta', label: 'Hasta', type: 'date' },
      ],
      fields: [
        { name: 'obraId', label: 'Obra', type: 'select', options: obras.items.map((item) => ({ value: item.id, label: item.nombre })) },
        { name: 'clienteId', label: 'Cliente', type: 'select', options: clientes.items.map((item) => ({ value: item.id, label: item.razonSocial })) },
        { name: 'montoCobrado', label: 'Monto cobrado', type: 'number', step: '0.01', required: true },
        { name: 'fechaCobro', label: 'Fecha de cobro', type: 'date', required: true },
        { name: 'metodoCobro', label: 'Metodo', type: 'select', options: METODOS_COBRO },
        { name: 'estado', label: 'Estado', type: 'select', options: ['Cobrado', 'Pendiente', 'Vencido'] },
        { name: 'concepto', label: 'Concepto', type: 'text', required: true },
        { name: 'comprobanteAdjunto', label: 'Comprobante', type: 'file' },
      ],
      columns: [
        { label: 'Concepto', key: 'concepto' },
        { label: 'Obra', key: 'obra.nombre' },
        { label: 'Cliente', key: 'cliente.razonSocial' },
        { label: 'Monto', key: 'montoCobrado', format: 'currency' },
        { label: 'Estado', key: 'estado' },
      ],
    })
  );
});

const renderPresupuestos = asyncHandler(async (req, res) => {
  const [clientes, obras, { items, pagination }] = await Promise.all([
    listClientes({ pageSize: 500 }),
    listObras({ pageSize: 500 }),
    listPresupuestos(req.query),
  ]);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Presupuestos',
      description: 'Solicitudes que pueden aprobarse para generar una obra.',
      endpoint: '/api/presupuestos',
      resource: 'presupuesto',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'estado', label: 'Estado', type: 'select', options: ['', ...PRESUPUESTO_ESTADOS], labels: ['Todos', ...PRESUPUESTO_ESTADOS] },
        { name: 'clienteId', label: 'Cliente', type: 'select', options: ['', ...clientes.items.map((item) => String(item.id))], labels: ['Todos', ...clientes.items.map((item) => item.razonSocial)] },
        { name: 'conObra', label: 'Con obra', type: 'select', options: ['', '1'], labels: ['Todos', 'Solo aprobados'] },
      ],
      fields: [
        { name: 'clienteId', label: 'Cliente', type: 'select', options: clientes.items.map((item) => ({ value: item.id, label: item.razonSocial })) },
        { name: 'nombre', label: 'Nombre', type: 'text', required: true },
        { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
        { name: 'montoEstimado', label: 'Monto estimado', type: 'number', step: '0.01', required: true },
        { name: 'fechaSolicitud', label: 'Fecha solicitud', type: 'date', required: true },
        { name: 'estado', label: 'Estado', type: 'select', options: PRESUPUESTO_ESTADOS },
        {
          name: 'obraId',
          label: 'Obra vinculada',
          type: 'select',
          options: [{ value: '', label: 'Sin obra' }, ...obras.items.map((item) => ({ value: item.id, label: item.nombre }))],
        },
      ],
      columns: [
        { label: 'Nombre', key: 'nombre' },
        { label: 'Cliente', key: 'cliente.razonSocial' },
        { label: 'Obra vinculada', key: 'obra.nombre' },
        { label: 'Monto', key: 'montoEstimado', format: 'currency' },
        { label: 'Estado', key: 'estado' },
      ],
      extraButtons: [
        { label: 'Aprobar', action: 'approve', className: 'btn-success js-action-approve' },
        { label: 'Rechazar', action: 'reject', className: 'btn-outline-danger js-action-reject' },
      ],
    })
  );
});

const renderCotizaciones = asyncHandler(async (req, res) => {
  const [proveedores, obras, { items, pagination }] = await Promise.all([
    listProveedores({ pageSize: 500 }),
    listObras({ pageSize: 500 }),
    listCotizaciones(req.query),
  ]);
  renderEntityPage(
    res,
    buildCrudPage({
      title: 'Cotizaciones',
      description: 'Comparacion de ofertas vinculadas a obras.',
      endpoint: '/api/cotizaciones',
      resource: 'cotizacion',
      items,
      pagination,
      query: req.query,
      filters: [
        { name: 'estado', label: 'Estado', type: 'select', options: ['', ...COTIZACION_ESTADOS], labels: ['Todos', ...COTIZACION_ESTADOS] },
        { name: 'proveedorId', label: 'Proveedor', type: 'select', options: ['', ...proveedores.items.map((item) => String(item.id))], labels: ['Todos', ...proveedores.items.map((item) => item.nombre)] },
        { name: 'obraId', label: 'Obra', type: 'select', options: ['', ...obras.items.map((item) => String(item.id))], labels: ['Todas', ...obras.items.map((item) => item.nombre)] },
      ],
      fields: [
        { name: 'proveedorId', label: 'Proveedor', type: 'select', options: proveedores.items.map((item) => ({ value: item.id, label: item.nombre })) },
        { name: 'obraId', label: 'Obra', type: 'select', options: obras.items.map((item) => ({ value: item.id, label: item.nombre })) },
        { name: 'descripcion', label: 'Descripcion', type: 'text', required: true },
        { name: 'monto', label: 'Monto', type: 'number', step: '0.01', required: true },
        { name: 'fechaVigencia', label: 'Fecha vigencia', type: 'date', required: true },
        { name: 'estado', label: 'Estado', type: 'select', options: COTIZACION_ESTADOS },
        { name: 'facturaCompraId', label: 'Factura compra vinculada', type: 'number' },
      ],
      columns: [
        { label: 'Proveedor', key: 'proveedor.nombre' },
        { label: 'Obra', key: 'obra.nombre' },
        { label: 'Descripcion', key: 'descripcion' },
        { label: 'Monto', key: 'monto', format: 'currency' },
        { label: 'Estado', key: 'estado' },
      ],
      extraButtons: [
        { label: 'Aprobar', action: 'approve', className: 'btn-success js-action-approve' },
        { label: 'Rechazar', action: 'reject', className: 'btn-outline-danger js-action-reject' },
      ],
    })
  );
});

async function renderRegistroPage(req, res, type) {
  const [proveedores, obras, categorias, cotizaciones, records] = await Promise.all([
    listProveedores({ pageSize: 500 }),
    listObras({ pageSize: 500 }),
    listCategorias({ pageSize: 500 }),
    listCotizaciones({ pageSize: 500 }),
    type === 'compra' ? listCompras(req.query) : listGastos(req.query),
  ]);

  const page = buildCrudPage({
    title: type === 'compra' ? 'Compras de Bienes' : 'Gastos Operativos',
    description: 'Registro de facturas con obra y categoria obligatorias.',
      endpoint: `/api/${type === 'compra' ? 'compras' : 'gastos'}`,
      resource: type === 'compra' ? 'compra' : 'gasto',
      items: records.items,
      pagination: records.pagination,
      query: req.query,
      pageSizeOptions: [10, 20, 50, 100],
      filters: [
        { name: 'estado', label: 'Estado', type: 'select', options: ['', 'Pendiente', 'Pagada', 'Vencida'], labels: ['Todos', 'Pendiente', 'Pagada', 'Vencida'] },
        { name: 'proveedorId', label: 'Proveedor', type: 'select', options: ['', ...proveedores.items.map((item) => String(item.id))], labels: ['Todos', ...proveedores.items.map((item) => item.nombre)] },
        { name: 'obraId', label: 'Obra', type: 'select', options: ['', ...obras.items.map((item) => String(item.id))], labels: ['Todas', ...obras.items.map((item) => item.nombre)] },
        { name: 'categoriaId', label: 'Categoria', type: 'select', options: ['', ...categorias.items.map((item) => String(item.id))], labels: ['Todas', ...categorias.items.map((item) => item.nombre)] },
        { name: 'fechaDesde', label: 'Desde', type: 'date' },
        { name: 'fechaHasta', label: 'Hasta', type: 'date' },
        ...(type === 'compra'
          ? [
              { name: 'tipoBien', label: 'Tipo de bien', type: 'select', options: ['', 'Consumible', 'Activo'], labels: ['Todos', 'Consumible', 'Activo'] },
              { name: 'estadoBien', label: 'Estado del bien', type: 'select', options: ['', ...COMPRA_BIEN_ESTADOS], labels: ['Todos', ...COMPRA_BIEN_ESTADOS] },
            ]
          : []),
      ],
      fields: [
      { name: 'proveedorId', label: 'Proveedor', type: 'select', options: proveedores.items.map((item) => ({ value: item.id, label: item.nombre })) },
      { name: 'obraId', label: 'Obra', type: 'select', options: obras.items.map((item) => ({ value: item.id, label: item.nombre })) },
      { name: 'categoriaId', label: 'Categoria', type: 'select', options: categorias.items.map((item) => ({ value: item.id, label: item.nombre })) },
      { name: 'numeroFactura', label: 'Numero factura', type: 'text', required: true },
      { name: 'fechaEmision', label: 'Fecha emision', type: 'date', required: true },
      { name: 'fechaVencimiento', label: 'Fecha vencimiento', type: 'date', required: true },
      { name: 'concepto', label: 'Concepto', type: 'text', required: true },
      { name: 'baseImponible', label: 'Base imponible', type: 'number', step: '0.01', required: true },
      { name: 'porcentajeImpuesto', label: 'IVA (%)', type: 'number', step: '0.01' },
      ...(type === 'compra'
        ? [
            { name: 'nombreBien', label: 'Nombre del bien', type: 'text', required: true },
            { name: 'cantidad', label: 'Cantidad', type: 'number', min: 1, required: true },
            { name: 'estadoBien', label: 'Estado del bien', type: 'select', options: COMPRA_BIEN_ESTADOS },
            { name: 'tipoBien', label: 'Tipo de bien', type: 'select', options: ['Consumible', 'Activo'] },
            { name: 'cotizacionId', label: 'Cotizacion', type: 'select', options: [{ value: '', label: 'Sin cotizacion' }, ...cotizaciones.items.map((item) => ({ value: item.id, label: `${item.descripcion} - ${item.proveedor?.nombre || ''}` }))] },
          ]
        : []),
      { name: 'archivoAdjunto', label: 'Adjunto', type: 'file' },
    ],
    columns: [
      { label: 'Factura', key: 'numeroFactura' },
      { label: 'Proveedor', key: 'proveedor.nombre' },
      { label: 'Obra', key: 'obra.nombre' },
      { label: 'Categoria', key: 'categoria.nombre' },
      { label: 'Total', key: 'total', format: 'currency' },
      { label: 'Estado', key: 'estado' },
    ],
    extraButtons: [{ label: 'Pagar', action: 'pay', className: 'btn-success js-action-pay' }],
  });

  renderEntityPage(res, page);
}

const renderGastos = asyncHandler(async (req, res) => {
  await renderRegistroPage(req, res, 'gasto');
});

const renderCompras = asyncHandler(async (req, res) => {
  await renderRegistroPage(req, res, 'compra');
});

const renderRentabilidad = asyncHandler(async (req, res) => {
  const rentabilidad = await getRentabilidadData();
  res.render('rentabilidad', { title: 'Rentabilidad', rentabilidad });
});

const renderReportes = asyncHandler(async (req, res) => {
  res.render('reportes', { title: 'Reportes' });
});

module.exports = {
  renderCategorias,
  renderClientes,
  renderCompras,
  renderCobros,
  renderCotizaciones,
  renderDashboard,
  renderGastos,
  renderObras,
  renderProveedores,
  renderPresupuestos,
  renderRentabilidad,
  renderReportes,
};
