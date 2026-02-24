const express = require("express");
const router = express.Router();
const monitoringController = require("../controllers/monitoringController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Route untuk menampilkan semua Misi dengan Tujuan, Sasaran, Program, dan Kegiatan yang terkait
router.get(
  "/monitoring",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  monitoringController.getMonitoring
);

// Route untuk monitoring Kegiatan berdasarkan ID Misi dan ID Program
router.get(
  "/monitoring/kegiatan/:misiId/:programId",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  monitoringController.getKegiatanByMisi
);

// Route untuk menampilkan indikator untuk Sasaran berdasarkan ID Sasaran
router.get(
  "/monitoring/indikator/:sasaranId",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  monitoringController.getIndikatorBySasaran
);

module.exports = router;
