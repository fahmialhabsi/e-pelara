// routes/laporanRoutes.js
const express = require("express");
const router = express.Router();
const {
  downloadCSV,
  downloadPDF,
  downloadExcel,
} = require("../controllers/laporanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Unduh laporan dalam berbagai format
router.get(
  "/csv",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  downloadCSV
);
router.get(
  "/pdf",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  downloadPDF
);
router.get(
  "/excel",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  downloadExcel
);

module.exports = router;
