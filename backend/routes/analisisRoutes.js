const express = require("express");
const router = express.Router();

const monitoringIndikatorController = require("../controllers/monitoringIndikatorController");
const evaluasiController = require("../controllers/evaluasiController");
const exportLaporanController = require("../controllers/exportLaporanController");
const rekomendasiOtomatisController = require("../controllers/rekomendasiOtomatisController");
const generateExcelController = require("../controllers/generateExcelController");
const generatePdfController = require("../controllers/generatePdfController");

// Monitoring Indikator
router.post("/monitoring-indikator", (req, res, next) => {
  console.log("POST /monitoring-indikator");
  monitoringIndikatorController.create(req, res, next);
});
router.get("/monitoring-indikator", (req, res, next) => {
  console.log("GET /monitoring-indikator");
  monitoringIndikatorController.findAll(req, res, next);
});

// Evaluasi
router.post("/evaluasi", (req, res, next) => {
  console.log("POST /evaluasi");
  evaluasiController.createEvaluasi(req, res, next);
});
router.get("/evaluasi", (req, res, next) => {
  console.log("GET /evaluasi");
  evaluasiController.getEvaluasi(req, res, next);
});

// Export Laporan
router.post("/export-laporan", (req, res, next) => {
  console.log("POST /export-laporan");
  exportLaporanController.create(req, res, next);
});
router.get("/export-laporan", (req, res, next) => {
  console.log("GET /export-laporan");
  exportLaporanController.findAll(req, res, next);
});

// Rekomendasi Otomatis
router.post("/rekomendasi", (req, res, next) => {
  console.log("POST /rekomendasi");
  rekomendasiOtomatisController.create(req, res, next);
});
router.get("/rekomendasi", (req, res, next) => {
  console.log("GET /rekomendasi");
  rekomendasiOtomatisController.findAll(req, res, next);
});

// Rute untuk mengunduh laporan Excel dan PDF berdasarkan tahun
router.get(
  "/download-excel-report/:tahun",
  generateExcelController.downloadExcelReport
);
router.get(
  "/download-pdf-report/:tahun",
  generatePdfController.downloadPDFReport
);

module.exports = router;
