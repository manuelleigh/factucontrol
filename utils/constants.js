const APP_TITLE = 'FactuControl';

const GASTO_CATEGORIAS = [
  'Arriendo',
  'Servicios públicos',
  'Internet y telefonía',
  'Papelería y materiales de oficina',
  'Transporte y movilidad',
  'Honorarios y subcontratación',
  'Mantenimiento',
  'Otros',
];

const COMPRA_CATEGORIAS = [
  'Equipos y tecnología',
  'Herramientas de trabajo',
  'Muebles y enseres',
  'Materiales e insumos operativos',
  'Dotación y uniformes',
  'Otros',
];

const METODOS_PAGO = ['Efectivo', 'Transferencia bancaria'];
const ESTADOS_REGISTRO = ['Pendiente', 'Pagada', 'Vencida'];
const ESTADOS_BIEN = ['Nuevo', 'Usado'];

module.exports = {
  APP_TITLE,
  GASTO_CATEGORIAS,
  COMPRA_CATEGORIAS,
  METODOS_PAGO,
  ESTADOS_REGISTRO,
  ESTADOS_BIEN,
};
