/**
 * lakipGeneratorRoutes.js
 * Endpoint: /api/lakip-generator
 */
const express    = require("express");
const router     = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles  = require("../middlewares/allowRoles");
const ctrl       = require("../controllers/lakipGeneratorController");
const exportCtrl = require("../controllers/lakipExportController");

const ALL_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

// JSON data — untuk frontend preview widget
router.get("/data",    verifyToken, allowRoles(ALL_ROLES), ctrl.getData);

// HTML preview — buka di tab baru
router.get("/preview", verifyToken, allowRoles(ALL_ROLES), ctrl.preview);

// Export PDF — server-side via puppeteer (cepat, tanpa nomor halaman Daftar Isi — dipakai sehari-hari)
router.get("/export/pdf",  verifyToken, allowRoles(ALL_ROLES), exportCtrl.exportPdf);

// Export PDF FINAL — dengan nomor halaman Daftar Isi (Fase 19, lebih lambat — dipakai saat dokumen mau diterbitkan resmi)
router.get("/export/pdf-final", verifyToken, allowRoles(ALL_ROLES), exportCtrl.exportPdfFinal);

// Export DOCX — server-side via html-to-docx
router.get("/export/docx", verifyToken, allowRoles(ALL_ROLES), exportCtrl.exportDocx);

module.exports = router;
