const asyncHandler = require('../middleware/asyncHandler');
const { getReportDataByMonth, getReportDataByRange } = require('../services/registroService');
const { renderCategoryReport, renderMonthlyReport } = require('../services/reportService');

const monthly = asyncHandler(async (req, res) => {
  const month = Number(req.query.month);
  const year = Number(req.query.year);
  if (!month || !year) {
    const error = new Error('Debes indicar mes y año para generar el reporte.');
    error.statusCode = 400;
    throw error;
  }
  const report = await getReportDataByMonth(month, year);
  renderMonthlyReport(res, report);
});

const byCategory = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    const error = new Error('Debes indicar fecha inicial y final para generar el reporte.');
    error.statusCode = 400;
    throw error;
  }
  const report = await getReportDataByRange(startDate, endDate);
  renderCategoryReport(res, report);
});

module.exports = { byCategory, monthly };
