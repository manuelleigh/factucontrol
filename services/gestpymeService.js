const { Op, literal } = require('sequelize');
const dayjs = require('dayjs');
const {
  Proveedor,
  Cliente,
  Obra,
  Cobro,
  Categoria,
  Presupuesto,
  Cotizacion,
  GastoOperativo,
  CompraBien,
  AuditLog,
  sequelize,
} = require('../models');
const { createHttpError } = require('../utils/httpError');
const { calculateTotal, compareValues, getByPath, progressPercentage, toNumber } = require('../utils/helpers');
const {
  CATEGORIA_TIPOS,
  COBRO_ESTADOS,
  COMPRA_BIEN_ESTADOS,
  COTIZACION_ESTADOS,
  GASTO_CATEGORIAS,
  METODOS_COBRO,
  OBRA_ESTADOS,
  PRESUPUESTO_ESTADOS,
  REGISTRO_ESTADOS,
} = require('../utils/constants');
const { writeAudit } = require('./auditService');
const { sendNotificationEmail } = require('./notificationService');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeSearch(search) {
  return normalizeText(search).toLowerCase();
}

function normalizeFlag(value) {
  if (value === undefined || value === null || value === '') return null;
  return ['1', 'true', 'yes', 'si', 'activo'].includes(String(value).toLowerCase());
}

function normalizeList(value) {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateRequired(value, field, message, errors) {
  if (!normalizeText(value)) errors[field] = message;
}

function validateDecimal(value, field, message, errors, min = 0) {
  const number = toNumber(value);
  if (Number.isNaN(number) || number < min) errors[field] = message;
  return number;
}

function validateDate(value, field, message, errors) {
  if (!value || !dayjs(value, 'YYYY-MM-DD', true).isValid()) {
    errors[field] = message;
  }
}

function applyPagination(items, page = 1, pageSize = 12) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page: currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    },
  };
}

function applyFilteredPagination(items, query = {}, predicate = () => true) {
  const filtered = items.filter(predicate);
  return applyPagination(filtered, query.page, query.pageSize);
}

function applySort(items, query = {}, allowedSorts = []) {
  const sortKey = String(query.sort || '').trim();
  if (!sortKey || !allowedSorts.includes(sortKey)) return items;
  const direction = String(query.dir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  return [...items].sort((left, right) => compareValues(getByPath(left, sortKey), getByPath(right, sortKey)) * direction);
}

async function refreshOverdueStates() {
  const today = dayjs().format('YYYY-MM-DD');
  await Promise.all([
    GastoOperativo.update({ estado: 'Vencida' }, { where: { estado: 'Pendiente', fechaVencimiento: { [Op.lt]: today } } }),
    CompraBien.update({ estado: 'Vencida' }, { where: { estado: 'Pendiente', fechaVencimiento: { [Op.lt]: today } } }),
    Cobro.update({ estado: 'Vencido' }, { where: { estado: 'Pendiente', fechaCobro: { [Op.lt]: today } } }),
  ]);
}

async function listProveedores(query = {}) {
  const search = normalizeSearch(query.search);
  const proveedores = await Proveedor.findAll({
    where: search
      ? {
          [Op.or]: [
            { nombre: { [Op.like]: `%${search}%` } },
            { identificacionFiscal: { [Op.like]: `%${search}%` } },
          ],
        }
    : {},
    order: [['nombre', 'ASC']],
  });
  const items = proveedores.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['nombre', 'identificacionFiscal', 'giro', 'telefono', 'correo', 'activo']);
  return applyFilteredPagination(sorted, query, (item) => {
    const activo = normalizeFlag(query.activo);
    if (activo !== null && Boolean(item.activo) !== activo) return false;
    return true;
  });
}

async function saveProveedor(body, userId = null, id = null) {
  const errors = {};
  validateRequired(body.nombre, 'nombre', 'El nombre del proveedor es obligatorio.', errors);
  validateRequired(body.identificacionFiscal, 'identificacionFiscal', 'La identificacion fiscal es obligatoria.', errors);
  if (body.correo && !String(body.correo).includes('@')) errors.correo = 'El correo debe ser valido.';
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos del proveedor.', errors);

  const payload = {
    nombre: normalizeText(body.nombre),
    identificacionFiscal: normalizeText(body.identificacionFiscal),
    giro: normalizeText(body.giro),
    telefono: normalizeText(body.telefono),
    correo: normalizeText(body.correo),
    activo: body.activo === undefined ? true : body.activo !== 'false',
  };

  const record = id ? await Proveedor.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const saved = record ? await record.update(payload) : await Proveedor.create(payload);
  await writeAudit({
    userId,
    modulo: 'proveedores',
    accion: record ? 'update' : 'create',
    entidad: 'Proveedor',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function deactivateProveedor(id, userId = null) {
  const record = await Proveedor.findByPk(id);
  if (!record) throw createHttpError(404, 'Proveedor no encontrado.');
  const beforeData = record.get({ plain: true });
  await record.update({ activo: false });
  await writeAudit({
    userId,
    modulo: 'proveedores',
    accion: 'deactivate',
    entidad: 'Proveedor',
    entidadId: record.id,
    beforeData,
    afterData: record.get({ plain: true }),
  });
  return record.get({ plain: true });
}

async function listClientes(query = {}) {
  const search = normalizeSearch(query.search);
  const clientes = await Cliente.findAll({
    where: search
      ? {
          [Op.or]: [
            { razonSocial: { [Op.like]: `%${search}%` } },
            { ruc: { [Op.like]: `%${search}%` } },
          ],
        }
    : {},
    order: [['razonSocial', 'ASC']],
  });
  const items = clientes.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['razonSocial', 'ruc', 'direccion', 'telefono', 'correo', 'activo']);
  return applyFilteredPagination(sorted, query, (item) => {
    const activo = normalizeFlag(query.activo);
    if (activo !== null && Boolean(item.activo) !== activo) return false;
    return true;
  });
}

async function saveCliente(body, userId = null, id = null) {
  const errors = {};
  validateRequired(body.razonSocial, 'razonSocial', 'La razon social es obligatoria.', errors);
  validateRequired(body.ruc, 'ruc', 'El RUC es obligatorio.', errors);
  if (String(body.ruc || '').replace(/\D/g, '').length !== 11) errors.ruc = 'El RUC debe tener 11 digitos.';
  if (body.correo && !String(body.correo).includes('@')) errors.correo = 'El correo debe ser valido.';
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos del cliente.', errors);

  const payload = {
    razonSocial: normalizeText(body.razonSocial),
    ruc: String(body.ruc || '').replace(/\D/g, ''),
    direccion: normalizeText(body.direccion),
    telefono: normalizeText(body.telefono),
    correo: normalizeText(body.correo),
    activo: body.activo === undefined ? true : body.activo !== 'false',
  };
  const record = id ? await Cliente.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const saved = record ? await record.update(payload) : await Cliente.create(payload);
  await writeAudit({
    userId,
    modulo: 'clientes',
    accion: record ? 'update' : 'create',
    entidad: 'Cliente',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function deactivateCliente(id, userId = null) {
  const record = await Cliente.findByPk(id);
  if (!record) throw createHttpError(404, 'Cliente no encontrado.');
  const beforeData = record.get({ plain: true });
  await record.update({ activo: false });
  await writeAudit({
    userId,
    modulo: 'clientes',
    accion: 'deactivate',
    entidad: 'Cliente',
    entidadId: record.id,
    beforeData,
    afterData: record.get({ plain: true }),
  });
  return record.get({ plain: true });
}

async function listCategorias(query = {}) {
  const search = normalizeSearch(query.search);
  const categorias = await Categoria.findAll({
    where: search ? { nombre: { [Op.like]: `%${search}%` } } : {},
    order: [['mes', 'DESC'], ['nombre', 'ASC']],
  });
  const items = categorias.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['nombre', 'tipo', 'presupuestoMensual', 'mes', 'anio', 'activo']);
  return applyFilteredPagination(sorted, query, (item) => {
    const activo = normalizeFlag(query.activo);
    if (activo !== null && Boolean(item.activo) !== activo) return false;
    if (query.tipo && item.tipo !== query.tipo) return false;
    if (query.mes && Number(query.mes) !== Number(item.mes)) return false;
    if (query.anio && Number(query.anio) !== Number(item.anio)) return false;
    return true;
  });
}

async function saveCategoria(body, userId = null, id = null) {
  const errors = {};
  validateRequired(body.nombre, 'nombre', 'El nombre de la categoria es obligatorio.', errors);
  if (!CATEGORIA_TIPOS.includes(body.tipo)) errors.tipo = 'El tipo de categoria no es valido.';
  const mes = Number(body.mes);
  const anio = Number(body.anio);
  if (!(mes >= 1 && mes <= 12)) errors.mes = 'El mes debe estar entre 1 y 12.';
  if (!(anio >= 2020 && anio <= 2100)) errors.anio = 'El anio debe ser valido.';
  const presupuestoMensual = validateDecimal(body.presupuestoMensual, 'presupuestoMensual', 'Ingresa un presupuesto mensual valido.', errors, 0);
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos de la categoria.', errors);

  const payload = {
    nombre: normalizeText(body.nombre),
    tipo: body.tipo,
    presupuestoMensual,
    mes,
    anio,
    activo: body.activo === undefined ? true : body.activo !== 'false',
  };
  const record = id ? await Categoria.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const saved = record ? await record.update(payload) : await Categoria.create(payload);
  await writeAudit({
    userId,
    modulo: 'categorias',
    accion: record ? 'update' : 'create',
    entidad: 'Categoria',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function listObras(query = {}) {
  const search = normalizeSearch(query.search);
  const obras = await Obra.findAll({
    where: search ? { nombre: { [Op.like]: `%${search}%` } } : {},
    include: [{ model: Cliente, as: 'cliente' }],
    order: [['id', 'DESC']],
  });
  const items = obras.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['nombre', 'cliente.razonSocial', 'presupuestoTotal', 'estado', 'activo']);
  return applyFilteredPagination(sorted, query, (item) => {
    const activo = normalizeFlag(query.activo);
    if (activo !== null && Boolean(item.activo) !== activo) return false;
    if (query.estado && item.estado !== query.estado) return false;
    if (query.clienteId && Number(query.clienteId) !== Number(item.clienteId)) return false;
    return true;
  });
}

async function saveObra(body, userId = null, id = null) {
  const errors = {};
  validateRequired(body.nombre, 'nombre', 'El nombre de la obra es obligatorio.', errors);
  validateRequired(body.clienteId, 'clienteId', 'Debes seleccionar un cliente.', errors);
  const presupuestoTotal = validateDecimal(body.presupuestoTotal, 'presupuestoTotal', 'El presupuesto total debe ser valido.', errors, 0);
  if (body.estado && !OBRA_ESTADOS.includes(body.estado)) errors.estado = 'El estado de la obra no es valido.';
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos de la obra.', errors);

  const record = id ? await Obra.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const payload = {
    nombre: normalizeText(body.nombre),
    clienteId: Number(body.clienteId),
    fechaInicio: body.fechaInicio || null,
    fechaFinEstimada: body.fechaFinEstimada || null,
    presupuestoTotal,
    estado: body.estado || 'En formulacion',
    descripcion: normalizeText(body.descripcion),
    activo: body.activo === undefined ? true : body.activo !== 'false',
  };
  const saved = record ? await record.update(payload) : await Obra.create(payload);
  await writeAudit({
    userId,
    modulo: 'obras',
    accion: record ? 'update' : 'create',
    entidad: 'Obra',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function closeObra(id, userId = null) {
  const obra = await Obra.findByPk(id, { include: [{ model: Cobro, as: 'cobros' }] });
  if (!obra) throw createHttpError(404, 'Obra no encontrada.');
  const pendingInvoices = await GastoOperativo.count({ where: { obraId: id, estado: { [Op.in]: ['Pendiente', 'Vencida'] } } });
  const pendingPurchases = await CompraBien.count({ where: { obraId: id, estado: { [Op.in]: ['Pendiente', 'Vencida'] } } });
  const pendingCharges = await Cobro.count({ where: { obraId: id, estado: { [Op.in]: ['Pendiente', 'Vencido'] } } });
  if (pendingInvoices || pendingPurchases || pendingCharges) {
    throw createHttpError(400, 'La obra no se puede cerrar mientras tenga pagos, compras o cobros pendientes.');
  }
  const beforeData = obra.get({ plain: true });
  await obra.update({ estado: 'Cerrada', activo: false });
  await writeAudit({
    userId,
    modulo: 'obras',
    accion: 'close',
    entidad: 'Obra',
    entidadId: obra.id,
    beforeData,
    afterData: obra.get({ plain: true }),
  });
  return obra.get({ plain: true });
}

async function listCobros(query = {}) {
  await refreshOverdueStates();
  const cobros = await Cobro.findAll({ include: [{ model: Obra, as: 'obra' }, { model: Cliente, as: 'cliente' }], order: [['fechaCobro', 'DESC']] });
  const items = cobros.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['concepto', 'obra.nombre', 'cliente.razonSocial', 'montoCobrado', 'estado', 'fechaCobro']);
  return applyFilteredPagination(sorted, query, (item) => {
    if (query.estado && item.estado !== query.estado) return false;
    if (query.obraId && Number(query.obraId) !== Number(item.obraId)) return false;
    if (query.clienteId && Number(query.clienteId) !== Number(item.clienteId)) return false;
    if (query.metodoCobro && item.metodoCobro !== query.metodoCobro) return false;
    if (query.fechaDesde && dayjs(item.fechaCobro).isBefore(dayjs(query.fechaDesde), 'day')) return false;
    if (query.fechaHasta && dayjs(item.fechaCobro).isAfter(dayjs(query.fechaHasta), 'day')) return false;
    return true;
  });
}

async function saveCobro(body, userId = null, id = null, file = null) {
  const errors = {};
  validateRequired(body.obraId, 'obraId', 'Debes seleccionar una obra.', errors);
  validateRequired(body.clienteId, 'clienteId', 'Debes seleccionar un cliente.', errors);
  validateRequired(body.fechaCobro, 'fechaCobro', 'La fecha de cobro es obligatoria.', errors);
  if (!METODOS_COBRO.includes(body.metodoCobro)) errors.metodoCobro = 'El metodo de cobro no es valido.';
  if (!COBRO_ESTADOS.includes(body.estado || 'Pendiente')) errors.estado = 'El estado del cobro no es valido.';
  const montoCobrado = validateDecimal(body.montoCobrado, 'montoCobrado', 'Ingresa un monto valido.', errors, 0);
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos del cobro.', errors);

  const record = id ? await Cobro.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const payload = {
    obraId: Number(body.obraId),
    clienteId: Number(body.clienteId),
    montoCobrado,
    fechaCobro: body.fechaCobro,
    metodoCobro: body.metodoCobro,
    estado: body.estado || 'Pendiente',
    concepto: normalizeText(body.concepto),
    comprobanteAdjunto: file ? `/uploads/${file.filename}` : body.comprobanteAdjunto || (record ? record.comprobanteAdjunto : null),
  };
  const saved = record ? await record.update(payload) : await Cobro.create(payload);
  await writeAudit({
    userId,
    modulo: 'cobros',
    accion: record ? 'update' : 'create',
    entidad: 'Cobro',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function listPresupuestos(query = {}) {
  const presupuestos = await Presupuesto.findAll({ include: [{ model: Cliente, as: 'cliente' }, { model: Obra, as: 'obra' }], order: [['id', 'DESC']] });
  const items = presupuestos.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['nombre', 'cliente.razonSocial', 'montoEstimado', 'estado', 'fechaSolicitud']);
  return applyFilteredPagination(sorted, query, (item) => {
    if (query.estado && item.estado !== query.estado) return false;
    if (query.clienteId && Number(query.clienteId) !== Number(item.clienteId)) return false;
    if (query.conObra === '1' && !item.obraId) return false;
    return true;
  });
}

async function savePresupuesto(body, userId = null, id = null) {
  const errors = {};
  validateRequired(body.clienteId, 'clienteId', 'Debes seleccionar un cliente.', errors);
  validateRequired(body.nombre, 'nombre', 'El nombre del presupuesto es obligatorio.', errors);
  validateRequired(body.fechaSolicitud, 'fechaSolicitud', 'La fecha de solicitud es obligatoria.', errors);
  const montoEstimado = validateDecimal(body.montoEstimado, 'montoEstimado', 'El monto estimado debe ser valido.', errors, 0);
  if (body.estado && !PRESUPUESTO_ESTADOS.includes(body.estado)) errors.estado = 'El estado del presupuesto no es valido.';
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos del presupuesto.', errors);

  const record = id ? await Presupuesto.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const payload = {
    clienteId: Number(body.clienteId),
    nombre: normalizeText(body.nombre),
    descripcion: normalizeText(body.descripcion),
    montoEstimado,
    fechaSolicitud: body.fechaSolicitud,
    estado: body.estado || 'Pendiente',
    obraId: body.obraId ? Number(body.obraId) : null,
  };
  const saved = record ? await record.update(payload) : await Presupuesto.create(payload);
  await writeAudit({
    userId,
    modulo: 'presupuestos',
    accion: record ? 'update' : 'create',
    entidad: 'Presupuesto',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function approvePresupuesto(id, userId = null) {
  const presupuesto = await Presupuesto.findByPk(id);
  if (!presupuesto) throw createHttpError(404, 'Presupuesto no encontrado.');
  const beforeData = presupuesto.get({ plain: true });
  const obra = await sequelize.transaction(async (transaction) => {
    await presupuesto.update({ estado: 'Aprobado' }, { transaction });
    const newObra = await Obra.create(
      {
        nombre: presupuesto.nombre,
        clienteId: presupuesto.clienteId,
        fechaInicio: dayjs().format('YYYY-MM-DD'),
        fechaFinEstimada: null,
        presupuestoTotal: presupuesto.montoEstimado,
        estado: 'En formulacion',
        descripcion: presupuesto.descripcion,
        activo: true,
      },
      { transaction }
    );
    await presupuesto.update({ obraId: newObra.id }, { transaction });
    return newObra;
  });
  await writeAudit({
    userId,
    modulo: 'presupuestos',
    accion: 'approve',
    entidad: 'Presupuesto',
    entidadId: presupuesto.id,
    beforeData,
    afterData: presupuesto.get({ plain: true }),
  });
  return { presupuesto: presupuesto.get({ plain: true }), obra: obra.get({ plain: true }) };
}

async function rejectPresupuesto(id, userId = null) {
  const presupuesto = await Presupuesto.findByPk(id);
  if (!presupuesto) throw createHttpError(404, 'Presupuesto no encontrado.');
  const beforeData = presupuesto.get({ plain: true });
  await presupuesto.update({ estado: 'Rechazado' });
  await writeAudit({
    userId,
    modulo: 'presupuestos',
    accion: 'reject',
    entidad: 'Presupuesto',
    entidadId: presupuesto.id,
    beforeData,
    afterData: presupuesto.get({ plain: true }),
  });
  return presupuesto.get({ plain: true });
}

async function listCotizaciones(query = {}) {
  const cotizaciones = await Cotizacion.findAll({ include: [{ model: Proveedor, as: 'proveedor' }, { model: Obra, as: 'obra' }], order: [['id', 'DESC']] });
  const items = cotizaciones.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['proveedor.nombre', 'obra.nombre', 'descripcion', 'monto', 'estado', 'fechaVigencia']);
  return applyFilteredPagination(sorted, query, (item) => {
    if (query.estado && item.estado !== query.estado) return false;
    if (query.proveedorId && Number(query.proveedorId) !== Number(item.proveedorId)) return false;
    if (query.obraId && Number(query.obraId) !== Number(item.obraId)) return false;
    return true;
  });
}

async function saveCotizacion(body, userId = null, id = null) {
  const errors = {};
  validateRequired(body.proveedorId, 'proveedorId', 'Debes seleccionar un proveedor.', errors);
  validateRequired(body.obraId, 'obraId', 'Debes seleccionar una obra.', errors);
  validateRequired(body.descripcion, 'descripcion', 'La descripcion es obligatoria.', errors);
  validateRequired(body.fechaVigencia, 'fechaVigencia', 'La fecha de vigencia es obligatoria.', errors);
  const monto = validateDecimal(body.monto, 'monto', 'El monto debe ser valido.', errors, 0);
  if (body.estado && !COTIZACION_ESTADOS.includes(body.estado)) errors.estado = 'El estado de la cotizacion no es valido.';
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos de la cotizacion.', errors);

  const record = id ? await Cotizacion.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const payload = {
    proveedorId: Number(body.proveedorId),
    obraId: Number(body.obraId),
    descripcion: normalizeText(body.descripcion),
    monto,
    fechaVigencia: body.fechaVigencia,
    estado: body.estado || 'Pendiente',
    facturaCompraId: body.facturaCompraId ? Number(body.facturaCompraId) : null,
  };
  const saved = record ? await record.update(payload) : await Cotizacion.create(payload);
  await writeAudit({
    userId,
    modulo: 'cotizaciones',
    accion: record ? 'update' : 'create',
    entidad: 'Cotizacion',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function approveCotizacion(id, userId = null) {
  const cotizacion = await Cotizacion.findByPk(id);
  if (!cotizacion) throw createHttpError(404, 'Cotizacion no encontrada.');
  const beforeData = cotizacion.get({ plain: true });
  await sequelize.transaction(async (transaction) => {
    await Cotizacion.update(
      { estado: 'Rechazada' },
      { where: { obraId: cotizacion.obraId, descripcion: cotizacion.descripcion, id: { [Op.ne]: cotizacion.id } }, transaction }
    );
    await cotizacion.update({ estado: 'Aprobada' }, { transaction });
  });
  await writeAudit({
    userId,
    modulo: 'cotizaciones',
    accion: 'approve',
    entidad: 'Cotizacion',
    entidadId: cotizacion.id,
    beforeData,
    afterData: cotizacion.get({ plain: true }),
  });
  return cotizacion.get({ plain: true });
}

async function rejectCotizacion(id, userId = null) {
  const cotizacion = await Cotizacion.findByPk(id);
  if (!cotizacion) throw createHttpError(404, 'Cotizacion no encontrada.');
  const beforeData = cotizacion.get({ plain: true });
  await cotizacion.update({ estado: 'Rechazada' });
  await writeAudit({
    userId,
    modulo: 'cotizaciones',
    accion: 'reject',
    entidad: 'Cotizacion',
    entidadId: cotizacion.id,
    beforeData,
    afterData: cotizacion.get({ plain: true }),
  });
  return cotizacion.get({ plain: true });
}

async function listGastos(query = {}) {
  await refreshOverdueStates();
  const gastos = await GastoOperativo.findAll({
    include: [{ model: Proveedor, as: 'proveedor' }, { model: Obra, as: 'obra' }, { model: Categoria, as: 'categoria' }],
    order: [['fechaEmision', 'DESC']],
  });
  const items = gastos.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['numeroFactura', 'proveedor.nombre', 'obra.nombre', 'categoria.nombre', 'total', 'estado', 'fechaEmision']);
  return applyFilteredPagination(sorted, query, (item) => {
    if (query.estado && item.estado !== query.estado) return false;
    if (query.proveedorId && Number(query.proveedorId) !== Number(item.proveedorId)) return false;
    if (query.obraId && Number(query.obraId) !== Number(item.obraId)) return false;
    if (query.categoriaId && Number(query.categoriaId) !== Number(item.categoriaId)) return false;
    if (query.fechaDesde && dayjs(item.fechaEmision).isBefore(dayjs(query.fechaDesde), 'day')) return false;
    if (query.fechaHasta && dayjs(item.fechaEmision).isAfter(dayjs(query.fechaHasta), 'day')) return false;
    if (query.search) {
      const term = normalizeSearch(query.search);
      const haystack = `${item.numeroFactura} ${item.concepto} ${item.proveedor?.nombre || ''} ${item.obra?.nombre || ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

async function saveGasto(body, userId = null, id = null, file = null) {
  const errors = {};
  validateRequired(body.proveedorId, 'proveedorId', 'Debes seleccionar un proveedor.', errors);
  validateRequired(body.obraId, 'obraId', 'Debes seleccionar una obra.', errors);
  validateRequired(body.categoriaId, 'categoriaId', 'Debes seleccionar una categoria.', errors);
  validateRequired(body.numeroFactura, 'numeroFactura', 'El numero de factura es obligatorio.', errors);
  validateRequired(body.fechaEmision, 'fechaEmision', 'La fecha de emision es obligatoria.', errors);
  validateRequired(body.fechaVencimiento, 'fechaVencimiento', 'La fecha de vencimiento es obligatoria.', errors);
  validateRequired(body.concepto, 'concepto', 'El concepto es obligatorio.', errors);
  const baseImponible = validateDecimal(body.baseImponible, 'baseImponible', 'La base imponible debe ser valida.', errors, 0);
  const porcentajeImpuesto = validateDecimal(body.porcentajeImpuesto, 'porcentajeImpuesto', 'El IVA debe ser valido.', errors, 0);
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos del gasto.', errors);

  const record = id ? await GastoOperativo.findByPk(id) : null;
  const payload = {
    proveedorId: Number(body.proveedorId),
    obraId: Number(body.obraId),
    categoriaId: Number(body.categoriaId),
    numeroFactura: normalizeText(body.numeroFactura),
    fechaEmision: body.fechaEmision,
    fechaVencimiento: body.fechaVencimiento,
    concepto: normalizeText(body.concepto),
    baseImponible,
    porcentajeImpuesto,
    total: calculateTotal(baseImponible, porcentajeImpuesto),
    estado: body.estado || 'Pendiente',
    fechaPago: body.fechaPago || null,
    metodoPago: body.metodoPago || null,
    archivoAdjunto: file ? `/uploads/${file.filename}` : body.archivoAdjunto || (record ? record.archivoAdjunto : null),
  };

  const beforeData = record ? record.get({ plain: true }) : null;
  const saved = record ? await record.update(payload) : await GastoOperativo.create(payload);
  await writeAudit({
    userId,
    modulo: 'gastos',
    accion: record ? 'update' : 'create',
    entidad: 'GastoOperativo',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function payGasto(id, body, userId = null) {
  const record = await GastoOperativo.findByPk(id);
  if (!record) throw createHttpError(404, 'Gasto no encontrado.');
  const beforeData = record.get({ plain: true });
  await record.update({
    estado: 'Pagada',
    fechaPago: body.fechaPago || dayjs().format('YYYY-MM-DD'),
    metodoPago: body.metodoPago || 'Transferencia',
  });
  await writeAudit({
    userId,
    modulo: 'gastos',
    accion: 'pay',
    entidad: 'GastoOperativo',
    entidadId: record.id,
    beforeData,
    afterData: record.get({ plain: true }),
  });
  return record.get({ plain: true });
}

async function listCompras(query = {}) {
  await refreshOverdueStates();
  const compras = await CompraBien.findAll({
    include: [{ model: Proveedor, as: 'proveedor' }, { model: Obra, as: 'obra' }, { model: Categoria, as: 'categoria' }, { model: Cotizacion, as: 'cotizacion' }],
    order: [['fechaEmision', 'DESC']],
  });
  const items = compras.map((item) => item.get({ plain: true }));
  const sorted = applySort(items, query, ['numeroFactura', 'proveedor.nombre', 'obra.nombre', 'categoria.nombre', 'nombreBien', 'total', 'estado', 'fechaEmision', 'tipoBien']);
  return applyFilteredPagination(sorted, query, (item) => {
    if (query.estado && item.estado !== query.estado) return false;
    if (query.proveedorId && Number(query.proveedorId) !== Number(item.proveedorId)) return false;
    if (query.obraId && Number(query.obraId) !== Number(item.obraId)) return false;
    if (query.categoriaId && Number(query.categoriaId) !== Number(item.categoriaId)) return false;
    if (query.tipoBien && item.tipoBien !== query.tipoBien) return false;
    if (query.estadoBien && item.estadoBien !== query.estadoBien) return false;
    if (query.fechaDesde && dayjs(item.fechaEmision).isBefore(dayjs(query.fechaDesde), 'day')) return false;
    if (query.fechaHasta && dayjs(item.fechaEmision).isAfter(dayjs(query.fechaHasta), 'day')) return false;
    if (query.search) {
      const term = normalizeSearch(query.search);
      const haystack = `${item.numeroFactura} ${item.concepto} ${item.nombreBien} ${item.proveedor?.nombre || ''} ${item.obra?.nombre || ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

async function saveCompra(body, userId = null, id = null, file = null) {
  const errors = {};
  validateRequired(body.proveedorId, 'proveedorId', 'Debes seleccionar un proveedor.', errors);
  validateRequired(body.obraId, 'obraId', 'Debes seleccionar una obra.', errors);
  validateRequired(body.categoriaId, 'categoriaId', 'Debes seleccionar una categoria.', errors);
  validateRequired(body.numeroFactura, 'numeroFactura', 'El numero de factura es obligatorio.', errors);
  validateRequired(body.fechaEmision, 'fechaEmision', 'La fecha de emision es obligatoria.', errors);
  validateRequired(body.fechaVencimiento, 'fechaVencimiento', 'La fecha de vencimiento es obligatoria.', errors);
  validateRequired(body.concepto, 'concepto', 'El concepto es obligatorio.', errors);
  validateRequired(body.nombreBien, 'nombreBien', 'El nombre del bien es obligatorio.', errors);
  validateRequired(body.estadoBien, 'estadoBien', 'Debes indicar el estado del bien.', errors);
  validateRequired(body.tipoBien, 'tipoBien', 'Debes indicar el tipo del bien.', errors);
  const baseImponible = validateDecimal(body.baseImponible, 'baseImponible', 'La base imponible debe ser valida.', errors, 0);
  const porcentajeImpuesto = validateDecimal(body.porcentajeImpuesto, 'porcentajeImpuesto', 'El IVA debe ser valido.', errors, 0);
  if (Object.keys(errors).length) throw createHttpError(400, 'Revisa los datos de la compra.', errors);

  const payload = {
    proveedorId: Number(body.proveedorId),
    obraId: Number(body.obraId),
    categoriaId: Number(body.categoriaId),
    cotizacionId: body.cotizacionId ? Number(body.cotizacionId) : null,
    numeroFactura: normalizeText(body.numeroFactura),
    fechaEmision: body.fechaEmision,
    fechaVencimiento: body.fechaVencimiento,
    concepto: normalizeText(body.concepto),
    baseImponible,
    porcentajeImpuesto,
    total: calculateTotal(baseImponible, porcentajeImpuesto),
    estado: body.estado || 'Pendiente',
    fechaPago: body.fechaPago || null,
    metodoPago: body.metodoPago || null,
    archivoAdjunto: file ? `/uploads/${file.filename}` : body.archivoAdjunto || (record ? record.archivoAdjunto : null),
    nombreBien: normalizeText(body.nombreBien),
    cantidad: Number(body.cantidad || 1),
    estadoBien: body.estadoBien,
    tipoBien: body.tipoBien,
  };

  const record = id ? await CompraBien.findByPk(id) : null;
  const beforeData = record ? record.get({ plain: true }) : null;
  const saved = record ? await record.update(payload) : await CompraBien.create(payload);
  await writeAudit({
    userId,
    modulo: 'compras',
    accion: record ? 'update' : 'create',
    entidad: 'CompraBien',
    entidadId: saved.id,
    beforeData,
    afterData: saved.get({ plain: true }),
  });
  return saved.get({ plain: true });
}

async function payCompra(id, body, userId = null) {
  const record = await CompraBien.findByPk(id);
  if (!record) throw createHttpError(404, 'Compra no encontrada.');
  const beforeData = record.get({ plain: true });
  await record.update({
    estado: 'Pagada',
    fechaPago: body.fechaPago || dayjs().format('YYYY-MM-DD'),
    metodoPago: body.metodoPago || 'Transferencia',
  });
  await writeAudit({
    userId,
    modulo: 'compras',
    accion: 'pay',
    entidad: 'CompraBien',
    entidadId: record.id,
    beforeData,
    afterData: record.get({ plain: true }),
  });
  return record.get({ plain: true });
}

async function getDashboardData({ month, year } = {}) {
  await refreshOverdueStates();
  const currentMonth = Number(month || dayjs().month() + 1);
  const currentYear = Number(year || dayjs().year());
  const monthStart = dayjs(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`);
  const monthEnd = monthStart.endOf('month');

  const [gastos, compras, cobros, categorias, obras, presupuestos, cotizaciones, auditLogs] = await Promise.all([
    GastoOperativo.findAll({ include: [{ model: Categoria, as: 'categoria' }, { model: Obra, as: 'obra' }] }),
    CompraBien.findAll({ include: [{ model: Categoria, as: 'categoria' }, { model: Obra, as: 'obra' }] }),
    Cobro.findAll({ include: [{ model: Obra, as: 'obra' }, { model: Cliente, as: 'cliente' }] }),
    Categoria.findAll({ order: [['nombre', 'ASC']] }),
    Obra.findAll({ include: [{ model: Cliente, as: 'cliente' }] }),
    Presupuesto.findAll({ include: [{ model: Cliente, as: 'cliente' }] }),
    Cotizacion.findAll({ include: [{ model: Proveedor, as: 'proveedor' }, { model: Obra, as: 'obra' }] }),
    AuditLog.findAll({ order: [['id', 'DESC']], limit: 10, include: [{ model: require('../models').User, as: 'user' }] }),
  ]);

  const allExpenses = [...gastos, ...compras].map((item) => item.get({ plain: true }));
  const cobrosPlain = cobros.map((item) => item.get({ plain: true }));
  const obraPlain = obras.map((item) => item.get({ plain: true }));
  const presupuestosPlain = presupuestos.map((item) => item.get({ plain: true }));
  const cotizacionesPlain = cotizaciones.map((item) => item.get({ plain: true }));

  const inMonth = (date) => {
    const value = dayjs(date).valueOf();
    return value >= monthStart.valueOf() && value <= monthEnd.valueOf();
  };
  const ingresosMes = cobrosPlain.filter((item) => inMonth(item.fechaCobro) && item.estado === 'Cobrado').reduce((sum, item) => sum + toNumber(item.montoCobrado), 0);
  const gastosMes = allExpenses.filter((item) => inMonth(item.fechaEmision) && item.estado !== 'Anulada').reduce((sum, item) => sum + toNumber(item.total), 0);
  const cuentasPorCobrar = cobrosPlain.filter((item) => item.estado === 'Pendiente').reduce((sum, item) => sum + toNumber(item.montoCobrado), 0);
  const cuentasPorPagar = allExpenses.filter((item) => item.estado === 'Pendiente').reduce((sum, item) => sum + toNumber(item.total), 0);
  const obrasActivas = obraPlain.filter((item) => item.estado !== 'Cerrada' && item.activo).length;

  const lastSixMonths = Array.from({ length: 6 }, (_, index) => dayjs(monthStart).subtract(5 - index, 'month'));
  const graficaBarras = lastSixMonths.map((monthItem) => {
    const label = monthItem.format('MMM YY');
    const ingreso = cobrosPlain
      .filter((item) => item.estado === 'Cobrado' && dayjs(item.fechaCobro).isSame(monthItem, 'month'))
      .reduce((sum, item) => sum + toNumber(item.montoCobrado), 0);
    const gasto = allExpenses
      .filter((item) => dayjs(item.fechaEmision).isSame(monthItem, 'month'))
      .reduce((sum, item) => sum + toNumber(item.total), 0);
    return { label, ingreso, gasto };
  });

  const gastosPorCategoria = allExpenses
    .filter((item) => inMonth(item.fechaEmision))
    .reduce((acc, item) => {
      const key = item.categoria?.nombre || 'Sin categoria';
      acc[key] = (acc[key] || 0) + toNumber(item.total);
      return acc;
    }, {});

  const costoPorObra = obraPlain.map((obra) => {
    const totalGastos = allExpenses
      .filter((item) => item.obraId === obra.id)
      .reduce((sum, item) => sum + toNumber(item.total), 0);
    const totalCobros = cobrosPlain
      .filter((item) => item.obraId === obra.id && item.estado === 'Cobrado')
      .reduce((sum, item) => sum + toNumber(item.montoCobrado), 0);
    return {
      obra: obra.nombre,
      totalGastos,
      totalCobros,
      ejecucion: progressPercentage(totalGastos, obra.presupuestoTotal),
    };
  });

  const categoriasSemaforo = categorias.map((categoria) => {
    const gastoMesCategoria = allExpenses
      .filter((item) => item.categoriaId === categoria.id && inMonth(item.fechaEmision))
      .reduce((sum, item) => sum + toNumber(item.total), 0);
    const porcentaje = progressPercentage(gastoMesCategoria, categoria.presupuestoMensual);
    const color = porcentaje >= 100 ? 'danger' : porcentaje >= 75 ? 'warning' : 'success';
    return {
      nombre: categoria.nombre,
      presupuesto: toNumber(categoria.presupuestoMensual),
      gastado: gastoMesCategoria,
      porcentaje,
      color,
    };
  });

  const alertas = [];
  allExpenses.filter((item) => item.estado === 'Vencida').slice(0, 5).forEach((item) => {
    alertas.push(`Factura vencida: ${item.numeroFactura}`);
  });
  cobrosPlain.filter((item) => item.estado === 'Vencido').slice(0, 5).forEach((item) => {
    alertas.push(`Cobro vencido: ${item.concepto}`);
  });
  categoriasSemaforo.filter((item) => item.porcentaje >= 75).forEach((item) => {
    alertas.push(`Categoria en alerta: ${item.nombre} (${item.porcentaje.toFixed(0)}%)`);
  });

  const resumen = {
    resultadoMes: ingresosMes - gastosMes,
    cuentasPorCobrar,
    cuentasPorPagar,
    obrasActivas,
    ingresosMes,
    gastosMes,
    presupuestoTotalObras: obraPlain.reduce((sum, obra) => sum + toNumber(obra.presupuestoTotal), 0),
    cotizacionesPendientes: cotizacionesPlain.filter((item) => item.estado === 'Pendiente').length,
    presupuestosPendientes: presupuestosPlain.filter((item) => item.estado === 'Pendiente').length,
    alertasActivas: alertas.length,
  };

  return {
    currentMonth,
    currentYear,
    resumen,
    categoriasSemaforo,
    graficaBarras,
    graficaTorta: Object.entries(gastosPorCategoria).map(([label, value]) => ({ label, value })),
    graficaObras: costoPorObra,
    alertas,
    actividadReciente: auditLogs.map((item) => item.get({ plain: true })),
  };
}

async function getRentabilidadData() {
  await refreshOverdueStates();
  const [obras, cobros, gastos, compras] = await Promise.all([
    Obra.findAll({ include: [{ model: Cliente, as: 'cliente' }] }),
    Cobro.findAll(),
    GastoOperativo.findAll(),
    CompraBien.findAll(),
  ]);
  const cobrosPlain = cobros.map((item) => item.get({ plain: true }));
  const gastosPlain = gastos.map((item) => item.get({ plain: true }));
  const comprasPlain = compras.map((item) => item.get({ plain: true }));

  return obras.map((obraInstance) => {
    const obra = obraInstance.get({ plain: true });
    const ingresos = cobrosPlain
      .filter((item) => item.obraId === obra.id && item.estado === 'Cobrado')
      .reduce((sum, item) => sum + toNumber(item.montoCobrado), 0);
    const egresos = [
      ...gastosPlain.filter((item) => item.obraId === obra.id),
      ...comprasPlain.filter((item) => item.obraId === obra.id),
    ].reduce((sum, item) => sum + toNumber(item.total), 0);
    const utilidad = ingresos - egresos;
    const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;
    return {
      ...obra,
      ingresos,
      egresos,
      utilidad,
      margen,
      color: margen >= 10 ? 'success' : margen >= 0 ? 'warning' : 'danger',
    };
  }).sort((a, b) => b.margen - a.margen);
}

async function sendOverdueNotificationSummary(userEmail) {
  const gastosVencidos = await GastoOperativo.count({ where: { estado: 'Vencida' } });
  const cobrosVencidos = await Cobro.count({ where: { estado: 'Vencido' } });
  const alertText = `Tienes ${gastosVencidos} gastos vencidos y ${cobrosVencidos} cobros vencidos.`;
  await sendNotificationEmail({
    to: userEmail,
    subject: 'Alerta GestPyme',
    text: alertText,
    html: `<p>${alertText}</p>`,
  });
}

module.exports = {
  approveCotizacion,
  approvePresupuesto,
  closeObra,
  deactivateCliente,
  deactivateProveedor,
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
  payCompra,
  payGasto,
  rejectCotizacion,
  rejectPresupuesto,
  saveCategoria,
  saveCliente,
  saveCobro,
  saveCompra,
  saveCotizacion,
  saveGasto,
  saveObra,
  savePresupuesto,
  saveProveedor,
  sendOverdueNotificationSummary,
};
