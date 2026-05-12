const { AuditLog } = require('../models');

async function writeAudit({
  userId = null,
  modulo,
  accion,
  entidad = null,
  entidadId = null,
  beforeData = null,
  afterData = null,
}) {
  try {
    await AuditLog.create({
      userId,
      modulo,
      accion,
      entidad,
      entidadId,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
    });
  } catch (error) {
    console.warn('No se pudo registrar la auditoria:', error.message);
  }
}

module.exports = { writeAudit };
