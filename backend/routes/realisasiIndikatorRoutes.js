// routes/realisasiIndikatorRoutes.js
const express = require("express");
const router = express.Router();
const realisasiController = require("../controllers/realisasiIndikatorController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// POST   /api/realisasi-indikator
router.post("/", async (req, res) => {
  try {
    const { indikator_id, periode, nilai_realisasi } = req.body;

    if (!indikator_id || !nilai_realisasi) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const newEntry = await db.realisasi_indikator.create({
      indikator_id,
      periode,
      nilai_realisasi,
    });

    res.status(201).json({ message: "Data berhasil disimpan", data: newEntry });
  } catch (error) {
    console.error("Gagal simpan realisasi:", error);
    res.status(500).json({ message: "Gagal simpan data" });
  }
});

// GET    /api/realisasi-indikator?indikator_id=123
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  realisasiController.getRealisasiByIndikator
);

module.exports = router;
