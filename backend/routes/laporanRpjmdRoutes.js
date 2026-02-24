// routes/laporanRpjmdRoutes.js
const express = require("express");
const router = express.Router();
const laporanRpjmdController = require("../controllers/laporanRpjmdController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Menambahkan rute untuk mendapatkan laporan RPJMD
router.get(
  "/laporan/rpjmd/:opdId/:tahun",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  laporanRpjmdController.getLaporanRpjmd
);

module.exports = router;
