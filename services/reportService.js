const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const dayjs = require('dayjs');
const { formatCurrency, toNumber } = require('../utils/helpers');

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const COLORS = {
  page: '#f8fafc',
  header: '#0f766e',
  headerAccent: '#0ea5e9',
  headerSoft: '#134e4a',
  surface: '#ffffff',
  surfaceAlt: '#eef4f7',
  border: '#d9e3e8',
  ink: '#0f172a',
  muted: '#475569',
  success: '#166534',
  successSoft: '#e9f8ef',
  warning: '#b45309',
  warningSoft: '#fff3dd',
  danger: '#b91c1c',
  dangerSoft: '#fdecec',
  info: '#0369a1',
  infoSoft: '#e4f3fb',
  softInk: '#334155',
};

const PAGE = {
  margin: 40,
  headerHeight: 108,
  contentTop: 128,
  footerHeight: 26,
};

function monthLabel(month, year) {
  const monthName = MONTHS_ES[Math.max(0, Math.min(11, Number(month) - 1))] || 'Mes';
  return `${monthName} ${year}`;
}

function shortDateTime(date = dayjs()) {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

function safeText(value) {
  return value === null || value === undefined ? '' : String(value);
}

function drawRoundedBox(doc, x, y, w, h, fill, stroke = COLORS.border, radius = 16) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
  doc.restore();
}

function drawPageChrome(doc, meta) {
  const { width, height } = doc.page;
  doc.save();
  doc.rect(0, 0, width, height).fill(COLORS.page);
  doc.rect(0, 0, width, PAGE.headerHeight).fill(COLORS.header);
  doc.rect(0, PAGE.headerHeight - 6, width, 6).fill(COLORS.headerAccent);

  doc.fillColor('#ffffff');
  doc.font('Helvetica-Bold').fontSize(20).text(meta.brand, PAGE.margin, 24);
  doc.font('Helvetica-Bold').fontSize(19).text(meta.title, PAGE.margin, 48);
  doc.font('Helvetica').fontSize(9.5).fillColor('#e6fffb').text(meta.subtitle, PAGE.margin, 78, {
    width: 300,
  });

  const boxWidth = 186;
  const boxX = width - PAGE.margin - boxWidth;
  drawRoundedBox(doc, boxX, 20, boxWidth, 72, COLORS.headerSoft, '#2a6b65', 18);
  doc.fillColor('#ffffff');
  doc.font('Helvetica-Bold').fontSize(9).text(meta.periodLabel, boxX + 14, 32, {
    width: boxWidth - 28,
    align: 'left',
  });
  doc.font('Helvetica').fontSize(8.5).fillColor('#f0fffd').text(`Generado: ${meta.generatedAt}`, boxX + 14, 48, {
    width: boxWidth - 28,
  });
  doc.font('Helvetica').fontSize(8.5).fillColor('#d6f8f3').text(meta.note, boxX + 14, 62, {
    width: boxWidth - 28,
  });
  doc.restore();

  doc.x = PAGE.margin;
  doc.y = PAGE.contentTop;
}

function setupReportPages(doc, meta) {
  drawPageChrome(doc, meta);
  doc.on('pageAdded', () => {
    drawPageChrome(doc, meta);
  });
}

function drawSectionHeading(doc, y, kicker, title, description) {
  const innerWidth = doc.page.width - PAGE.margin * 2;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.info).text(kicker.toUpperCase(), PAGE.margin, y, {
    width: innerWidth,
    characterSpacing: 0.8,
  });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.ink).text(title, PAGE.margin, y + 14, {
    width: innerWidth,
  });
  if (description) {
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(description, PAGE.margin, y + 34, {
      width: innerWidth,
    });
  }
  return y + (description ? 54 : 38);
}

function drawMetricCard(doc, x, y, w, h, metric) {
  drawRoundedBox(doc, x, y, w, h, COLORS.surface, COLORS.border, 16);
  doc.save();
  doc.roundedRect(x, y, w, 5, 16).fill(metric.accent || COLORS.headerAccent);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(COLORS.muted).text(metric.label.toUpperCase(), x + 14, y + 12, {
    width: w - 28,
    characterSpacing: 0.4,
  });
  doc.font('Helvetica-Bold').fontSize(metric.valueFontSize || 18).fillColor(COLORS.ink).text(metric.value, x + 14, y + 27, {
    width: w - 28,
  });
  if (metric.note) {
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(metric.note, x + 14, y + h - 21, {
      width: w - 28,
      ellipsis: true,
    });
  }
}

function drawMetricGrid(doc, metrics, y, { columns = 3, cardHeight = 78, gap = 12 } = {}) {
  const innerWidth = doc.page.width - PAGE.margin * 2;
  const cardWidth = (innerWidth - gap * (columns - 1)) / columns;
  metrics.forEach((metric, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const cardX = PAGE.margin + column * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);
    drawMetricCard(doc, cardX, cardY, cardWidth, cardHeight, metric);
  });
  const rows = Math.max(1, Math.ceil(metrics.length / columns));
  return y + rows * cardHeight + (rows - 1) * gap;
}

function drawInsightCard(doc, y, title, body, badge, tone = 'info') {
  const innerWidth = doc.page.width - PAGE.margin * 2;
  const height = 98;
  const fill = tone === 'danger' ? COLORS.dangerSoft : tone === 'warning' ? COLORS.warningSoft : COLORS.infoSoft;
  const accent = tone === 'danger' ? COLORS.danger : tone === 'warning' ? COLORS.warning : COLORS.info;
  drawRoundedBox(doc, PAGE.margin, y, innerWidth, height, fill, COLORS.border, 18);
  doc.save();
  doc.roundedRect(PAGE.margin, y, innerWidth, 6, 18).fill(accent);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(accent).text('LECTURA GERENCIAL', PAGE.margin + 16, y + 14, {
    width: innerWidth - 180,
    characterSpacing: 0.8,
  });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.ink).text(title, PAGE.margin + 16, y + 30, {
    width: innerWidth - 180,
  });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.softInk).text(body, PAGE.margin + 16, y + 52, {
    width: innerWidth - 180,
    lineGap: 2,
  });
  drawRoundedBox(doc, PAGE.margin + innerWidth - 146, y + 20, 118, 48, COLORS.surface, COLORS.border, 14);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(accent).text('Punto clave', PAGE.margin + innerWidth - 132, y + 30, {
    width: 92,
  });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.ink).text(badge, PAGE.margin + innerWidth - 132, y + 44, {
    width: 92,
  });
  return y + height;
}

function drawAlertCard(doc, y, alerts, totalAlerts) {
  const innerWidth = doc.page.width - PAGE.margin * 2;
  const visible = alerts.slice(0, 6);
  const lines = Math.max(1, visible.length);
  const height = 58 + lines * 18 + (totalAlerts > visible.length ? 18 : 0);
  drawRoundedBox(doc, PAGE.margin, y, innerWidth, height, COLORS.surface, COLORS.border, 18);
  doc.save();
  doc.roundedRect(PAGE.margin, y, innerWidth, 6, 18).fill(COLORS.warning);
  doc.restore();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink).text('Alertas y focos de revision', PAGE.margin + 16, y + 16, {
    width: innerWidth - 32,
  });
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(
    totalAlerts
      ? 'Estas son las principales incidencias que conviene revisar antes del cierre del periodo.'
      : 'No se detectaron alertas activas para el periodo consultado.',
    PAGE.margin + 16,
    y + 34,
    { width: innerWidth - 32 }
  );

  let bulletY = y + 54;
  if (visible.length) {
    visible.forEach((alert) => {
      doc.fillColor(COLORS.warning).circle(PAGE.margin + 20, bulletY + 5, 2.2).fill();
      doc.font('Helvetica').fontSize(9.6).fillColor(COLORS.ink).text(alert, PAGE.margin + 30, bulletY, {
        width: innerWidth - 46,
      });
      bulletY += 18;
    });
  } else {
    doc.font('Helvetica').fontSize(9.6).fillColor(COLORS.ink).text('Sin alertas activas.', PAGE.margin + 16, bulletY, {
      width: innerWidth - 32,
    });
    bulletY += 18;
  }

  if (totalAlerts > visible.length) {
    doc.font('Helvetica').fontSize(8.8).fillColor(COLORS.muted).text(
      `Se muestran ${visible.length} de ${totalAlerts} alertas. El detalle completo esta disponible en la vista operativa.`,
      PAGE.margin + 16,
      y + height - 22,
      { width: innerWidth - 32 }
    );
  }

  return y + height;
}

function statusColorForMargin(margin) {
  if (margin >= 15) return { fill: COLORS.successSoft, ink: COLORS.success };
  if (margin >= 0) return { fill: COLORS.warningSoft, ink: COLORS.warning };
  return { fill: COLORS.dangerSoft, ink: COLORS.danger };
}

function drawRentabilitySummaryCard(doc, y, best, worst, averageMargin, profitableCount, total) {
  const innerWidth = doc.page.width - PAGE.margin * 2;
  const height = 88;
  drawRoundedBox(doc, PAGE.margin, y, innerWidth, height, COLORS.surfaceAlt, COLORS.border, 18);
  doc.save();
  doc.roundedRect(PAGE.margin, y, innerWidth, 6, 18).fill(COLORS.success);
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.ink).text('Lectura del ranking', PAGE.margin + 16, y + 15, {
    width: innerWidth - 32,
  });
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(
    total
      ? `El ${profitableCount} de ${total} proyectos muestra margen positivo. El margen promedio es ${averageMargin.toFixed(1)}%.`
      : 'No hay obras cargadas para evaluar rentabilidad.',
    PAGE.margin + 16,
    y + 34,
    { width: innerWidth - 32 }
  );

  const leftWidth = (innerWidth - 44) / 2;
  drawRoundedBox(doc, PAGE.margin + 16, y + 52, leftWidth, 24, COLORS.surface, COLORS.border, 12);
  drawRoundedBox(doc, PAGE.margin + 28 + leftWidth, y + 52, leftWidth, 24, COLORS.surface, COLORS.border, 12);

  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(COLORS.muted).text('MEJOR OBRA', PAGE.margin + 26, y + 59, {
    width: leftWidth - 16,
  });
  doc.font('Helvetica-Bold').fontSize(10.2).fillColor(COLORS.success).text(
    best ? `${best.nombre} | ${Number(best.margen || 0).toFixed(2)}%` : 'Sin datos',
    PAGE.margin + 26,
    y + 70,
    { width: leftWidth - 16 }
  );

  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(COLORS.muted).text('OBRA A REVISAR', PAGE.margin + 38 + leftWidth, y + 59, {
    width: leftWidth - 16,
  });
  doc.font('Helvetica-Bold').fontSize(10.2).fillColor(COLORS.danger).text(
    worst ? `${worst.nombre} | ${Number(worst.margen || 0).toFixed(2)}%` : 'Sin datos',
    PAGE.margin + 38 + leftWidth,
    y + 70,
    { width: leftWidth - 16 }
  );

  return y + height;
}

function drawRentabilityTable(doc, data, y) {
  const columns = [
    { key: 'obra', label: 'Obra', width: 146, align: 'left' },
    { key: 'cliente', label: 'Cliente', width: 104, align: 'left' },
    { key: 'ingresos', label: 'Ingresos', width: 71, align: 'right' },
    { key: 'egresos', label: 'Egresos', width: 71, align: 'right' },
    { key: 'utilidad', label: 'Utilidad', width: 71, align: 'right' },
    { key: 'margen', label: 'Margen', width: 52, align: 'right' },
  ];
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  let currentY = y;
  const headerHeight = 28;
  const rowHeight = 24;

  const drawHeaderRow = () => {
    drawRoundedBox(doc, PAGE.margin, currentY, tableWidth, headerHeight, COLORS.headerSoft, COLORS.border, 14);
    let offsetX = PAGE.margin;
    columns.forEach((column, index) => {
      doc.font('Helvetica-Bold').fontSize(8.4).fillColor('#ffffff').text(column.label, offsetX + 10, currentY + 9, {
        width: column.width - 20,
        align: column.align,
      });
      if (index < columns.length - 1) {
        doc.moveTo(offsetX + column.width, currentY + 6).lineTo(offsetX + column.width, currentY + headerHeight - 6).stroke(COLORS.headerAccent);
      }
      offsetX += column.width;
    });
    currentY += headerHeight + 6;
  };

  drawHeaderRow();

  if (!data.length) {
    drawRoundedBox(doc, PAGE.margin, currentY, tableWidth, rowHeight + 12, COLORS.surface, COLORS.border, 12);
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('No hay obras para mostrar en este periodo.', PAGE.margin + 14, currentY + 11, {
      width: tableWidth - 28,
    });
    return currentY + rowHeight + 12;
  }

  data.forEach((item, index) => {
    if (currentY + rowHeight > doc.page.height - PAGE.margin - PAGE.footerHeight) {
      doc.addPage();
      currentY = PAGE.contentTop;
      drawHeaderRow();
    }

    const theme = statusColorForMargin(Number(item.margen || 0));
    const rowFill = index % 2 === 0 ? COLORS.surface : '#f9fbfc';
    drawRoundedBox(doc, PAGE.margin, currentY, tableWidth, rowHeight, rowFill, COLORS.border, 12);
    if (Number(item.margen || 0) >= 15) {
      doc.save();
      doc.roundedRect(PAGE.margin, currentY, 4, rowHeight, 12).fill(COLORS.success);
      doc.restore();
    } else if (Number(item.margen || 0) >= 0) {
      doc.save();
      doc.roundedRect(PAGE.margin, currentY, 4, rowHeight, 12).fill(COLORS.warning);
      doc.restore();
    } else {
      doc.save();
      doc.roundedRect(PAGE.margin, currentY, 4, rowHeight, 12).fill(COLORS.danger);
      doc.restore();
    }

    const values = {
      obra: safeText(item.nombre),
      cliente: safeText(item.cliente?.razonSocial || item.cliente?.name || 'Sin cliente'),
      ingresos: formatCurrency(item.ingresos || 0),
      egresos: formatCurrency(item.egresos || 0),
      utilidad: formatCurrency(item.utilidad || 0),
      margen: `${Number(item.margen || 0).toFixed(2)}%`,
    };

    let offsetX = PAGE.margin;
    columns.forEach((column) => {
      const value = values[column.key];
      const textColor =
        column.key === 'margen' ? theme.ink : column.key === 'utilidad' && Number(item.utilidad || 0) < 0 ? COLORS.danger : COLORS.ink;
      doc.font(column.key === 'obra' || column.key === 'cliente' ? 'Helvetica' : 'Helvetica-Bold')
        .fontSize(9.1)
        .fillColor(textColor)
        .text(value, offsetX + 10, currentY + 7, {
          width: column.width - 20,
          align: column.align,
          ellipsis: true,
        });
      offsetX += column.width;
    });
    currentY += rowHeight + 6;
  });

  return currentY;
}

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
    const reportDate = dayjs();
    setupReportPages(doc, {
      brand: 'GestPyme',
      title: 'Reporte gerencial mensual',
      subtitle: 'Resumen ejecutivo de ingresos, gastos, liquidez y alertas del periodo.',
      periodLabel: monthLabel(data.currentMonth, data.currentYear),
      generatedAt: shortDateTime(reportDate),
      note: 'Uso interno / gerencia',
    });

    const summary = data.resumen || {};
    const result = toNumber(summary.resultadoMes || 0);
    const resultLabel = result >= 0 ? 'Cierre con superavit operativo' : 'Cierre con deficit operativo';
    const resultBadge = result >= 0 ? 'El resultado es positivo.' : 'Hay presion en caja.';
    const monthlyMetrics = [
      {
        label: 'Resultado del mes',
        value: formatCurrency(summary.resultadoMes || 0),
        note: result >= 0 ? 'Ingresos por encima de los gastos' : 'Gastos por encima de los ingresos',
        accent: result >= 0 ? COLORS.success : COLORS.danger,
      },
      {
        label: 'Ingresos del mes',
        value: formatCurrency(summary.ingresosMes || 0),
        note: 'Cobros efectivamente registrados',
        accent: COLORS.info,
      },
      {
        label: 'Gastos del mes',
        value: formatCurrency(summary.gastosMes || 0),
        note: 'Compras y gastos del periodo',
        accent: COLORS.warning,
      },
      {
        label: 'Cuentas por cobrar',
        value: formatCurrency(summary.cuentasPorCobrar || 0),
        note: 'Cobros aun pendientes',
        accent: COLORS.headerAccent,
      },
      {
        label: 'Cuentas por pagar',
        value: formatCurrency(summary.cuentasPorPagar || 0),
        note: 'Obligaciones pendientes',
        accent: COLORS.danger,
      },
      {
        label: 'Obras activas',
        value: String(summary.obrasActivas || 0),
        note: 'Frentes abiertos en seguimiento',
        accent: COLORS.success,
      },
    ];

    let y = PAGE.contentTop;
    y = drawMetricGrid(doc, monthlyMetrics, y, { columns: 3, cardHeight: 78, gap: 12 });
    y += 16;
    y = drawInsightCard(
      doc,
      y,
      resultLabel,
      `El periodo cierra con ${formatCurrency(Math.abs(result))} ${result >= 0 ? 'de excedente' : 'de presion financiera'}. ${summary.alertasActivas || 0} alertas siguen activas y conviene priorizar el seguimiento de caja.`,
      resultBadge,
      result >= 0 ? 'info' : 'danger'
    );
    y += 16;
    y = drawSectionHeading(
      doc,
      y,
      'Alertas del periodo',
      'Indicadores que requieren revision',
      'La lista se concentra en vencimientos y categorias en semaforo para acelerar la toma de decisiones.'
    );
    y += 10;
    drawAlertCard(doc, y, data.alertas || [], summary.alertasActivas || 0);
  });
}

function renderRentabilityPdf(res, data) {
  streamPdf(res, 'gestpyme-rentabilidad.pdf', (doc) => {
    const reportDate = dayjs();
    const best = data[0] || null;
    const worst = data.length ? data[data.length - 1] : null;
    const profitableCount = data.filter((item) => Number(item.margen || 0) > 0).length;
    const averageMargin = data.length
      ? data.reduce((sum, item) => sum + toNumber(item.margen || 0), 0) / data.length
      : 0;

    setupReportPages(doc, {
      brand: 'GestPyme',
      title: 'Reporte de rentabilidad',
      subtitle: 'Comparativo financiero por obra con utilidad, egresos e ingresos consolidados.',
      periodLabel: 'Ranking general de obras',
      generatedAt: shortDateTime(reportDate),
      note: 'Ordenado de mayor a menor margen',
    });

    let y = PAGE.contentTop;
    y = drawMetricGrid(
      doc,
      [
        {
          label: 'Obras evaluadas',
          value: String(data.length),
          note: 'Proyectos incluidos en el ranking',
          accent: COLORS.info,
        },
        {
          label: 'Obras rentables',
          value: String(profitableCount),
          note: 'Margen positivo sobre ingresos',
          accent: COLORS.success,
        },
        {
          label: 'Margen promedio',
          value: `${averageMargin.toFixed(1)}%`,
          note: 'Promedio ponderado por obra',
          accent: averageMargin >= 0 ? COLORS.success : COLORS.danger,
        },
        {
          label: 'Mejor margen',
          value: best ? `${Number(best.margen || 0).toFixed(2)}%` : '0.00%',
          note: best ? best.nombre : 'Sin datos',
          accent: COLORS.headerAccent,
        },
      ],
      y,
      { columns: 4, cardHeight: 78, gap: 10 }
    );
    y += 14;
    y = drawRentabilitySummaryCard(doc, y, best, worst, averageMargin, profitableCount, data.length);
    y += 16;
    y = drawSectionHeading(
      doc,
      y,
      'Ranking por obra',
      'Detalle financiero de proyectos',
      'La tabla resalta el margen para encontrar rapidamente las obras que aportan valor y las que necesitan ajustes.'
    );
    y += 8;
    drawRentabilityTable(doc, data, y);
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
