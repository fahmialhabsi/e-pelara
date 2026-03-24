// routes/periodeRoutes.js
const express = require("express");
const router = express.Router();
const { PeriodeRpjmd } = require("../models");
const {
  getActivePeriode,
  updatePeriodeById,
  deletePeriodeById,
  createPeriode,
  getPeriodeById,
} = require("../controllers/periodeController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { validatePeriode } = require("../utils/entityValidator");

// GET /api/periode-rpjmd — semua role yang authenticated boleh baca daftar periode
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  // Note: SSO path: SEKRETARIS→ADMINISTRATOR, KEPALA_BIDANG→PENGAWAS, dst (per allowRoles.js mapping)
  async (req, res) => {
    try {
      const data = await PeriodeRpjmd.findAll({
        order: [["tahun_awal", "ASC"]],
      });
      res.json(data);
    } catch (err) {
      console.error("Gagal ambil data periode:", err);
      res.status(500).json({ message: "Gagal mengambil data periode." });
    }
  }
);

router.get(
  "/active",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  getActivePeriode
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  getPeriodeById
);

// POST /api/periode-rpjmd (create)
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  validatePeriode, // ✅ Validasi input
  createPeriode
);

// Update Periode
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  validatePeriode,
  updatePeriodeById
);

// Hapus Periode
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  deletePeriodeById
);

module.exports = router;
