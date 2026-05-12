const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { sanitizeFilename } = require('../utils/helpers');

function ensureUploadDir(uploadDir) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function buildStorage(subdirectory) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads', subdirectory || '');
      ensureUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename(req, file, cb) {
      const extension = path.extname(file.originalname);
      const base = path.basename(file.originalname, extension);
      cb(null, `${crypto.randomUUID()}-${sanitizeFilename(base)}${extension.toLowerCase()}`);
    },
  });
}

function buildUpload({ subdirectory = '', allowed = ['application/pdf', 'image/jpeg', 'image/png'] } = {}) {
  return multer({
    storage: buildStorage(subdirectory),
    limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024 },
    fileFilter(req, file, cb) {
      if (!allowed.includes(file.mimetype)) {
        const error = new Error('Solo se permiten archivos PDF, JPG o PNG.');
        error.statusCode = 400;
        return cb(error);
      }
      return cb(null, true);
    },
  });
}

const upload = buildUpload();
const draftUpload = buildUpload({ subdirectory: 'drafts', allowed: ['application/pdf'] });

module.exports = { draftUpload, ensureUploadDir, upload };
