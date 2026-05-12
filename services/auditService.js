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
  await AuditLog.create({
    userId,
    modulo,
    accion,
    entidad,
    entidadId,
    beforeData: beforeData ? JSON.stringify(beforeData) : null,
    afterData: afterData ? JSON.stringify(afterData) : null,
  });
}

module.exports = { writeAudit };
