// routes/dokumenRoutes.js
// Manajemen dokumen pendukung per entitas (upload, list, download, delete)

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const {
  uploadDokumen,
  handleUploadError,
} = require("../middlewares/uploadDokumen");
const {
  getByEntity,
  upload,
  download,
  remove,
} = require("../controllers/dokumenController");

// Semua route butuh login
router.use(verifyToken);

// GET  /api/dokumen?entity_type=misi&entity_id=5
// Semua user yang login bisa lihat daftar dokumen
router.get("/", getByEntity);

// POST /api/dokumen  (multipart/form-data: file, entity_type, entity_id, judul, keterangan)
// Upload dokumen — semua user yang login
router.post(
  "/",
  (req, res, next) =>
    uploadDokumen.single("file")(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    }),
  upload,
);

// GET /api/dokumen/:id/download
router.get("/:id/download", download);

// DELETE /api/dokumen/:id
// Admin bisa hapus semua, user biasa hanya miliknya (dicek di controller)
router.delete("/:id", remove);

module.exports = router;
