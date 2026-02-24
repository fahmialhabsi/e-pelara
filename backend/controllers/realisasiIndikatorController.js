// controllers/realisasiController.js
const { RealisasiIndikator } = require("../models");

// Simpan realisasi baru
exports.createRealisasi = async (req, res) => {
  try {
    const { indikator_id, periode, nilai_realisasi } = req.body;
    if (!indikator_id || !periode || nilai_realisasi == null) {
      return res.status(400).json({
        message: "indikator_id, periode, dan nilai_realisasi wajib diisi",
      });
    }
    const baru = await RealisasiIndikator.create({
      indikator_id,
      periode,
      nilai_realisasi,
    });
    return res.status(201).json(baru);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan realisasi", error: err.message });
  }
};

// Ambil semua realisasi untuk satu indikator (opsional)
exports.getRealisasiByIndikator = async (req, res) => {
  try {
    const { indikator_id } = req.query;
    const where = indikator_id ? { indikator_id } : {};
    const list = await RealisasiIndikator.findAll({
      where,
      order: [["periode", "ASC"]],
    });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gagal mengambil data realisasi" });
  }
};
