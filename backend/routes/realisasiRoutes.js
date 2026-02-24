// routes/realisasiRoutes.js
const express = require("express");
const router = express.Router();
const realisasiBulananController = require("../controllers/realisasiBulananController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Endpoint: GET /api/realisasi/:indikatorId/:tahun
router.get(
  "/realisasi/:indikatorId/:tahun",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  realisasiBulananController.getRealisasiBulanan
);

module.exports = router;
