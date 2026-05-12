const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { formatCurrency, formatDateReadable } = require('../utils/helpers');

function streamPdf(res, fileName, build) {
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/pdf');
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);
  build(doc);
  doc.end();
}

function sendCsv(res, fileName, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '');
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(`\ufeff${csv}`);
}

function sendXlsx(res, fileName, sheetName, rows) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

function buildMonthlyRows(data) {
  return [
    ['Metrica', 'Valor'],
    ['Resultado del mes', formatCurrency(data.resumen?.resultadoMes || 0)],
    ['Ingresos del mes', formatCurrency(data.resumen?.ingresosMes || 0)],
    ['Gastos del mes', formatCurrency(data.resumen?.gastosMes || 0)],
    ['Cuentas por cobrar', formatCurrency(data.resumen?.cuentasPorCobrar || 0)],
    ['Cuentas por pagar', formatCurrency(data.resumen?.cuentasPorPagar || 0)],
    ['Obras activas', data.resumen?.obrasActivas || 0],
  ];
}

function buildRentabilityRows(data) {
  return [
    ['Obra', 'Cliente', 'Ingresos', 'Egresos', 'Utilidad', 'Margen %'],
    ...data.map((item) => [
      item.nombre,
      item.cliente?.razonSocial || item.cliente?.name || 'Sin cliente',
      formatCurrency(item.ingresos || 0),
      formatCurrency(item.egresos || 0),
      formatCurrency(item.utilidad || 0),
      `${Number(item.margen || 0).toFixed(2)}%`,
    ]),
  ];
}

function renderMonthlyPdf(res, data) {
  streamPdf(res, 'gestpyme-reporte-mensual.pdf', (doc) => {
    doc.fillColor('#123d40').fontSize(20).text('GestPyme', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(13).fillColor('#334155').text('Reporte mensual');
    doc.moveDown();
    doc.fontSize(11).fillColor('#0f172a');
    doc.text(`Resultado del mes: ${formatCurrency(data.resumen?.resultadoMes || 0)}`);
    doc.text(`Ingresos del mes: ${formatCurrency(data.resumen?.ingresosMes || 0)}`);
    doc.text(`Gastos del mes: ${formatCurrency(data.resumen?.gastosMes || 0)}`);
    doc.text(`Cuentas por cobrar: ${formatCurrency(data.resumen?.cuentasPorCobrar || 0)}`);
    doc.text(`Cuentas por pagar: ${formatCurrency(data.resumen?.cuentasPorPagar || 0)}`);
    doc.text(`Obras activas: ${data.resumen?.obrasActivas || 0}`);
    doc.moveDown();
    doc.fontSize(12).fillColor('#123d40').text('Alertas', { underline: true });
    doc.moveDown(0.2);
    (data.alertas || []).slice(0, 10).forEach((item) => {
      doc.fontSize(10).fillColor('#0f172a').text(`- ${item}`);
    });
  });
}

function renderRentabilityPdf(res, data) {
  streamPdf(res, 'gestpyme-rentabilidad.pdf', (doc) => {
    doc.fillColor('#123d40').fontSize(20).text('GestPyme', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(13).fillColor('#334155').text('Reporte de rentabilidad');
    doc.moveDown();
    data.slice(0, 20).forEach((item) => {
      doc.fontSize(10).fillColor('#0f172a').text(
        `${item.nombre} | Ingresos ${formatCurrency(item.ingresos)} | Egresos ${formatCurrency(item.egresos)} | Margen ${Number(item.margen || 0).toFixed(2)}%`
      );
    });
  });
}

module.exports = {
  buildMonthlyRows,
  buildRentabilityRows,
  renderMonthlyPdf,
  renderRentabilityPdf,
  sendCsv,
  sendXlsx,
};
