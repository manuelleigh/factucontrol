const APP_TITLE = 'GestPyme';

const ROLES = ['admin', 'operador'];

const OBRA_ESTADOS = ['En formulacion', 'En ejecucion', 'Finalizada', 'Cerrada'];
const COBRO_ESTADOS = ['Cobrado', 'Pendiente', 'Vencido'];
const METODOS_COBRO = ['Efectivo', 'Transferencia'];
const CATEGORIA_TIPOS = ['gasto_operativo', 'compra_bien'];
const PRESUPUESTO_ESTADOS = ['Pendiente', 'Aprobado', 'Rechazado'];
const COTIZACION_ESTADOS = ['Pendiente', 'Aprobada', 'Rechazada'];
const COMPRA_BIEN_ESTADOS = ['Nuevo', 'Usado'];
const REGISTRO_ESTADOS = ['Pendiente', 'Pagada', 'Vencida'];
const METODOS_PAGO = ['Efectivo', 'Transferencia'];

const GASTO_CATEGORIAS = [
  'Alquiler y servicios',
  'Administracion',
  'Movilidad y transporte',
  'Mantenimiento',
  'Equipos y herramientas',
  'Materiales e insumos',
  'RRHH y honorarios',
  'Otros',
];

const COMPRA_CATEGORIAS = [
  'Consumo operativo',
  'Activos y equipos',
  'Insumos de obra',
  'Uniformes y seguridad',
  'Mobiliario',
  'Otros',
];

module.exports = {
  APP_TITLE,
  CATEGORIA_TIPOS,
  COBRO_ESTADOS,
  COMPRA_BIEN_ESTADOS,
  COTIZACION_ESTADOS,
  COMPRA_CATEGORIAS,
  GASTO_CATEGORIAS,
  METODOS_COBRO,
  METODOS_PAGO,
  OBRA_ESTADOS,
  PRESUPUESTO_ESTADOS,
  REGISTRO_ESTADOS,
  ROLES,
};
