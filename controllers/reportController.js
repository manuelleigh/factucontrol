const asyncHandler = require('../middleware/asyncHandler');
const dayjs = require('dayjs');
const { createHttpError } = require('../utils/httpError');
const { getReportDataByMonth, getReportDataByRange } = require('../services/registroService');
const { renderCategoryReport, renderMonthlyReport } = require('../services/reportService');

const monthly = asyncHandler(async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    throw createHttpError(400, 'Debes indicar un mes válido y un año válido para generar el reporte.');
  }

  const report = await getReportDataByMonth(month, year);
  renderMonthlyReport(res, report);
});

const byCategory = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const isValidStart = dayjs(startDate, 'YYYY-MM-DD', true).isValid();
  const isValidEnd = dayjs(endDate, 'YYYY-MM-DD', true).isValid();
  if (!startDate || !endDate || !isValidStart || !isValidEnd) {
    throw createHttpError(400, 'Debes indicar fecha inicial y final para generar el reporte.');
  }

  const report = await getReportDataByRange(startDate, endDate);
  renderCategoryReport(res, report);
});

module.exports = { byCategory, monthly };
