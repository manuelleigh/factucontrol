const dayjs = require('dayjs');

function isValidDate(value) {
  return Boolean(value) && dayjs(value, 'YYYY-MM-DD', true).isValid();
}

function validateDateRange(fechaEmision, fechaVencimiento) {
  if (!isValidDate(fechaEmision) || !isValidDate(fechaVencimiento)) {
    return 'Debes ingresar fechas válidas.';
  }

  if (dayjs(fechaVencimiento).isBefore(dayjs(fechaEmision), 'day')) {
    return 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.';
  }

  return null;
}

function validatePaymentDate(fechaPago, fechaEmision) {
  if (!isValidDate(fechaPago)) return 'La fecha de pago es obligatoria.';
  if (fechaEmision && dayjs(fechaPago).isBefore(dayjs(fechaEmision), 'day')) {
    return 'La fecha de pago no puede ser anterior a la fecha de emisión.';
  }
  return null;
}

function computeDashboardSummary(registros, today = dayjs()) {
  const todayStr = today.format('YYYY-MM-DD');
  const monthStart = today.startOf('month').format('YYYY-MM-DD');
  const monthEnd = today.endOf('month').format('YYYY-MM-DD');
  const upcomingLimit = today.add(7, 'day').format('YYYY-MM-DD');

  const monthRecords = registros.filter(
    (record) => record.fechaEmision >= monthStart && record.fechaEmision <= monthEnd
  );
  const pendientes = registros.filter(
    (record) => record.estadoEfectivo === 'Pendiente' && record.fechaVencimiento >= todayStr
  );
  const proximas = pendientes.filter((record) => record.fechaVencimiento <= upcomingLimit);
  const vencidas = registros.filter((record) => record.estadoEfectivo === 'Vencida');

  const totalMes = monthRecords.reduce((acc, record) => acc + Number(record.total), 0);
  const categoryMap = new Map();
  monthRecords.forEach((record) => {
    categoryMap.set(record.categoria, (categoryMap.get(record.categoria) || 0) + Number(record.total));
  });

  const distribution = [...categoryMap.entries()]
    .map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: totalMes ? Number(((total / totalMes) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    resumen: {
      totalMes,
      pendientesCantidad: pendientes.length,
      pendientesMonto: pendientes.reduce((acc, record) => acc + Number(record.total), 0),
      proximasCantidad: proximas.length,
      proximasMonto: proximas.reduce((acc, record) => acc + Number(record.total), 0),
      vencidasCantidad: vencidas.length,
      vencidasMonto: vencidas.reduce((acc, record) => acc + Number(record.total), 0),
    },
    distribution,
  };
}

module.exports = {
  computeDashboardSummary,
  isValidDate,
  validateDateRange,
  validatePaymentDate,
};
