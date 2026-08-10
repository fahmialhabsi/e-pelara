'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 (mandat §22). Upload middleware
 * DEDICATED, mengikuti pola persis `prosnpUpload.js` (tenant-scoped folder,
 * UUID filename, MIME allowlist) TANPA memodifikasi/menyatukan
 * `prosnpUpload.js` (mandat §22: "Do NOT modify prosnpUpload.js").
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png',
]);
const allowedExtensions = new Set(['.pdf', '.xlsx', '.docx', '.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const target = path.join(__dirname, '..', 'uploads', 'food-operations', String(req.tenantId || 'unknown'));
    fs.mkdirSync(target, { recursive: true });
    callback(null, target);
  },
  filename(req, file, callback) {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) return callback(new Error('Tipe berkas tidak diizinkan.'));
    return callback(null, true);
  },
});

function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran berkas maksimal 10 MB.' : error.message || 'Unggahan dokumen gagal.';
    return res.status(422).json({ success: false, message, code: 'FOOD_OPS_UPLOAD_INVALID' });
  });
}

module.exports = { uploadSingle };
