// monevRoutes.js
const express = require("express");
const router = express.Router();
const monevController = require("../controllers/monevController");
const verifyToken = require("../../middlewares/verifyToken");
const allowRoles = require("../../middlewares/allowRoles");
const uploadMiddleware = require("../../monev/middleware/uploadMiddleware");

// Rute untuk dashboard (tanpa otorisasi khusus)
router.get("/dashboard", monevController.getDashboardData);

// Rute untuk ekspor laporan (PDF & Excel)
router.get(
  "/export-pdf",
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR"]),
  monevController.exportLaporanPDF
);

router.get(
  "/export-excel",
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR"]),
  monevController.exportLaporanExcel
);

// Menambahkan rute untuk mengambil capaian indikator
router.get(
  "/capaian",
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR"]),
  monevController.getCapaianIndikator
);

// Rute untuk upload capaian indikator
router.post(
  "/upload",
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR"]),
  uploadMiddleware,
  monevController.uploadCapaianIndikator
);

router.get(
  "/monev/filter-sasaran", // Menambahkan rute untuk filter sasaran
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR", "SUPERVISOR"]),
  monevController.getFilterSasaran // Menghubungkan dengan fungsi controller filter sasaran
);

module.exports = router;
