const asyncHandler = require('../middleware/asyncHandler');
const dayjs = require('dayjs');
const { createHttpError } = require('../utils/httpError');
const { getDashboardData, getRentabilidadData } = require('../services/gestpymeService');
const {
  buildMonthlyRows,
  buildRentabilityRows,
  renderMonthlyPdf,
  renderRentabilityPdf,
  sendCsv,
  sendXlsx,
} = require('../services/reportService');

const monthly = asyncHandler(async (req, res) => {
  const month = Number(req.query.month || dayjs().month() + 1);
  const year = Number(req.query.year || dayjs().year());
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    throw createHttpError(400, 'Debes indicar un mes y anio validos.');
  }

  const report = await getDashboardData({ month, year });
  const format = String(req.query.format || 'pdf').toLowerCase();
  if (format === 'csv') return sendCsv(res, 'gestpyme-reporte-mensual.csv', buildMonthlyRows(report));
  if (format === 'xlsx') return sendXlsx(res, 'gestpyme-reporte-mensual.xlsx', 'Reporte Mensual', buildMonthlyRows(report));
  return renderMonthlyPdf(res, report);
});

const rentability = asyncHandler(async (req, res) => {
  const data = await getRentabilidadData();
  const format = String(req.query.format || 'pdf').toLowerCase();
  if (format === 'csv') return sendCsv(res, 'gestpyme-rentabilidad.csv', buildRentabilityRows(data));
  if (format === 'xlsx') return sendXlsx(res, 'gestpyme-rentabilidad.xlsx', 'Rentabilidad', buildRentabilityRows(data));
  return renderRentabilityPdf(res, data);
});

module.exports = { monthly, rentability };
