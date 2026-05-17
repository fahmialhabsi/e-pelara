// backend/middlewares/uploadDokumen.js
"use strict";

/**
 * Middleware Upload Dokumen MR
 * ---------------------------------------------------------------------------
 * Digunakan untuk upload dokumen pendukung MR, termasuk:
 * - Dokumen Rencana Tindak Pengendalian
 * - Bukti Realisasi Aktual Monitoring/Realisasi
 *
 * Guard:
 * - Maksimal 1 file per request.
 * - Maksimal ukuran file 10 MB.
 * - Hanya mengizinkan PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.
 * - Tidak mengizinkan executable/script/archive.
 * - Folder tujuan ditentukan dari entity_type yang sudah disanitasi.
 * - Response error memakai bahasa pemerintahan.
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = Object.freeze([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);

const ALLOWED_EXTENSIONS = Object.freeze([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
]);

const BLOCKED_EXTENSIONS = Object.freeze([
  ".exe",
  ".js",
  ".sh",
  ".bat",
  ".cmd",
  ".php",
  ".html",
  ".htm",
  ".svg",
  ".zip",
  ".rar",
  ".7z",
]);

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeEntityType = (entityType = "umum") => {
  const safe = String(entityType || "umum").replace(/[^a-zA-Z0-9_-]/g, "");
  return safe || "umum";
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const entityType = sanitizeEntityType(req.body?.entity_type || "umum");
    const destPath = path.join(__dirname, "..", "uploads", "dokumen", entityType);

    ensureDir(destPath);
    cb(null, destPath);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `dok_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mimeType = file.mimetype;

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Jenis file tidak diizinkan."
      )
    );
  }

  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Tipe dokumen tidak diizinkan. Gunakan dokumen PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, atau PNG."
      )
    );
  }

  return cb(null, true);
};

const uploadDokumen = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Ukuran dokumen melebihi batas maksimal 10 MB.",
        code: "MR_DOCUMENT_UPLOAD_SIZE_EXCEEDED",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message:
          err.message ||
          "Tipe dokumen tidak diizinkan. Gunakan dokumen PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, atau PNG.",
        code: "MR_DOCUMENT_UPLOAD_TYPE_NOT_ALLOWED",
      });
    }

    return res.status(400).json({
      success: false,
      message: `Upload dokumen gagal: ${err.message}`,
      code: "MR_DOCUMENT_UPLOAD_FAILED",
    });
  }

  return next(err);
};

module.exports = {
  uploadDokumen,
  handleUploadError,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
};