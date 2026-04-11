const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { sanitizeFilename } = require('../utils/helpers');

function ensureUploadDir(uploadDir) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname);
    const base = path.basename(file.originalname, extension);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${sanitizeFilename(base)}${extension.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      const error = new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP.');
      error.statusCode = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

module.exports = { upload, ensureUploadDir };
