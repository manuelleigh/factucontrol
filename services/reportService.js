const PDFDocument = require('pdfkit');
const { formatCurrency, formatDateReadable } = require('../utils/helpers');

function buildPdfResponse(res, fileName) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  return new PDFDocument({ margin: 36, size: 'A4' });
}

function renderHeader(doc, title, subtitle) {
  doc.roundedRect(36, 28, 523, 68, 16).fillAndStroke('#e7f1ed', '#d8e8e1');
  doc.fillColor('#173d3f').fontSize(19).text(title, 52, 44);
  doc.fillColor('#486066').fontSize(10).text(subtitle, 52, 67);
  doc.moveDown(3.8);
}

function ensureSpace(doc, needed = 60) {
  if (doc.y > doc.page.height - needed) doc.addPage();
}

function renderSummaryCards(doc, cards) {
  const startY = doc.y;
  cards.forEach((card, index) => {
    const x = 36 + index * 170;
    doc.roundedRect(x, startY, 158, 52, 14).fillAndStroke('#ffffff', '#dde5e3');
    doc.fillColor('#637377').fontSize(9).text(card.label, x + 12, startY + 10);
    doc.fillColor('#173d3f').fontSize(13).text(card.value, x + 12, startY + 26);
  });
  doc.y = startY + 72;
}

function renderSectionTitle(doc, title) {
  ensureSpace(doc, 80);
  doc.fillColor('#173d3f').fontSize(13).text(title);
  doc.moveDown(0.5);
}

function renderMonthlyReport(res, report) {
  const doc = buildPdfResponse(res, 'reporte-mensual-factucontrol.pdf');
  doc.pipe(res);

  renderHeader(
    doc,
    'FactuControl - Reporte mensual',
    `Periodo analizado: ${formatDateReadable(report.startDate)} al ${formatDateReadable(report.endDate)}`
  );

  renderSummaryCards(doc, [
    { label: 'Total general', value: formatCurrency(report.total) },
    { label: 'Gastos operativos', value: `${report.modules.Gasto.cantidad} registros` },
    { label: 'Compras de bienes', value: `${report.modules.Compra.cantidad} registros` },
  ]);

  renderSectionTitle(doc, 'Subtotales por módulo');
  doc
    .fontSize(10)
    .fillColor('#364248')
    .text(
      `Gastos operativos: ${formatCurrency(report.modules.Gasto.total)} | Compras de bienes: ${formatCurrency(report.modules.Compra.total)}`
    );
  doc.moveDown(1);

  renderSectionTitle(doc, 'Detalle de facturas');
  report.records.forEach((record, index) => {
    ensureSpace(doc, 72);
    doc
      .roundedRect(36, doc.y, 523, 52, 12)
      .fillAndStroke(index % 2 === 0 ? '#fbfcfb' : '#f4f7f6', '#e3ebea');
    const top = doc.y + 10;
    doc
      .fillColor('#173d3f')
      .fontSize(10)
      .text(`${index + 1}. ${record.modulo} · Factura ${record.numeroFactura}`, 48, top);
    doc
      .fillColor('#39484d')
      .fontSize(9)
      .text(`Proveedor: ${record.proveedor.nombre}`, 48, top + 16)
      .text(
        `Emisión: ${formatDateReadable(record.fechaEmision)} | Vencimiento: ${formatDateReadable(record.fechaVencimiento)} | Estado: ${record.estadoEfectivo}`,
        48,
        top + 29
      );
    doc.text(`Concepto: ${record.concepto}`, 300, top + 16, { width: 180 });
    doc.fillColor('#173d3f').fontSize(10).text(formatCurrency(record.total), 470, top, { align: 'right', width: 70 });
    doc.y += 60;
  });

  doc.moveDown(0.5);
  doc.fillColor('#173d3f').fontSize(12).text(`Total general del periodo: ${formatCurrency(report.total)}`);
  doc.end();
}

function renderCategoryReport(res, report) {
  const doc = buildPdfResponse(res, 'reporte-categorias-factucontrol.pdf');
  doc.pipe(res);

  renderHeader(
    doc,
    'FactuControl - Resumen por categoría',
    `Periodo analizado: ${formatDateReadable(report.startDate)} al ${formatDateReadable(report.endDate)}`
  );

  renderSummaryCards(doc, [
    { label: 'Total general', value: formatCurrency(report.total) },
    { label: 'Categorías', value: `${report.categories.length} agrupaciones` },
    { label: 'Facturas', value: `${report.records.length} registros` },
  ]);

  renderSectionTitle(doc, 'Participación por categoría');
  report.categories.forEach((category, index) => {
    ensureSpace(doc, 54);
    doc
      .roundedRect(36, doc.y, 523, 38, 12)
      .fillAndStroke(index % 2 === 0 ? '#fbfcfb' : '#f4f7f6', '#e3ebea');
    const top = doc.y + 11;
    doc.fillColor('#173d3f').fontSize(10).text(category.categoria, 48, top);
    doc.fillColor('#4d5d62').fontSize(9).text(`${category.cantidad} facturas`, 250, top);
    doc.fillColor('#4d5d62').fontSize(9).text(`${category.porcentaje}% del total`, 360, top);
    doc.fillColor('#173d3f').fontSize(10).text(formatCurrency(category.total), 460, top, { align: 'right', width: 85 });
    doc.y += 46;
  });

  doc.moveDown(0.5);
  doc.fillColor('#173d3f').fontSize(12).text(`Total general del periodo: ${formatCurrency(report.total)}`);
  doc.end();
}

module.exports = { renderCategoryReport, renderMonthlyReport };
