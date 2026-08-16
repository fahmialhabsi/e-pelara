// routes/realisasiIndikatorRoutes.js
const express = require("express");
const router = express.Router();
const realisasiController = require("../controllers/realisasiIndikatorController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// POST   /api/realisasi-indikator
// Sprint 4 — S4-03/S4-DISC-010: handler inline sebelumnya TIDAK punya
// verifyToken/allowRoles sama sekali (endpoint mutasi yang bisa diakses
// tanpa otentikasi) DAN mereferensikan `db.realisasi_indikator` yang tidak
// pernah didefinisikan di file ini (ReferenceError saat dieksekusi).
// Diperbaiki sekaligus (satu remediasi atomik) dengan: (1) menambahkan
// verifyToken + allowRoles(WRITE) mengikuti konvensi persis
// realisasiIndikatorRenstraRoutes.js (WRITE = SUPER_ADMIN, ADMINISTRATOR),
// dan (2) mendelegasikan ke realisasiController.createRealisasi yang sudah
// ada dan sudah memakai model RealisasiIndikator yang benar (bukan model
// baru yang dibuat untuk keperluan ini).
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  realisasiController.createRealisasi
);

// GET    /api/realisasi-indikator?indikator_id=123
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  realisasiController.getRealisasiByIndikator
);

module.exports = router;
