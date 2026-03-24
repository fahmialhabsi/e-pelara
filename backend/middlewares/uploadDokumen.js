// middlewares/uploadDokumen.js
// Multer middleware khusus untuk upload dokumen pendukung
// Validasi: tipe file (pdf, doc, docx, xls, xlsx, jpg, png) dan ukuran max 10 MB

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tipe file yang diizinkan beserta mime type-nya
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
];

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Pastikan folder tujuan ada sebelum menyimpan file
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Subfolder berdasarkan entity_type dari body request: uploads/dokumen/{entity_type}/
    const entityType = req.body.entity_type || "umum";
    // Sanitasi entity_type: hanya huruf, angka, underscore, strip
    const safe = entityType.replace(/[^a-zA-Z0-9_-]/g, "");
    const destPath = path.join(__dirname, "..", "uploads", "dokumen", safe);
    ensureDir(destPath);
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `dok_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    !ALLOWED_EXTENSIONS.includes(ext) ||
    !ALLOWED_MIME_TYPES.includes(file.mimetype)
  ) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Tipe file tidak diizinkan. Gunakan: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`,
      ),
    );
  }
  cb(null, true);
}

const uploadDokumen = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Handler error multer agar response konsisten
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "Ukuran file melebihi batas maksimal 10 MB" });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: err.field });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  next(err);
}

module.exports = { uploadDokumen, handleUploadError };
