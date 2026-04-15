// routes/renstra_opd.js
const express = require("express");
const router = express.Router();
const renstraOpdController = require("../controllers/renstra_opdController");
const renstraGenerateController = require("../controllers/renstraGenerateController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

// Buat data baru
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  renstraOpdController.create
);

// Ambil semua data
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  renstraOpdController.findAll
);

// Ambil renstra aktif
router.get(
  "/aktif",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  renstraOpdController.getAktif
);

// Ambil detail per ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  renstraOpdController.findOne
);

// Update data
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  renstraOpdController.update
);

// Set aktif
router.put(
  "/:id/set-aktif",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  renstraOpdController.setAktif
);

// Hapus data
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  renstraOpdController.delete
);

// ── Auto-generate Renstra Document ──────────────────────────────────────────
// GET /api/renstra-opd/:id/generate-docx  → download file .docx
router.get(
  "/:id/generate-docx",
  verifyToken,
  allowRoles(READ_ROLES),
  renstraGenerateController.generateDocx
);

// GET /api/renstra-opd/:id/generate-pdf  → download file .pdf
router.get(
  "/:id/generate-pdf",
  verifyToken,
  allowRoles(READ_ROLES),
  renstraGenerateController.generatePdf
);

// GET /api/renstra-opd/:id/preview-html  → preview di browser (dev only)
router.get(
  "/:id/preview-html",
  verifyToken,
  allowRoles(READ_ROLES),
  renstraGenerateController.previewHtml
);

module.exports = router;
