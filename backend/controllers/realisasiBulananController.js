// controllers/realisasiBulananController.js
const { Indikator, RealisasiBulanan } = require("../models");

exports.getRealisasiBulanan = async (req, res) => {
  try {
    const { indikatorId, tahun } = req.params;

    // Ambil indikator berdasarkan ID
    const indikator = await Indikator.findOne({
      where: { id: indikatorId },
      attributes: ["id", "kode_indikator", "nama_indikator"],
    });

    if (!indikator) {
      return res
        .status(404)
        .json({ success: false, message: "Indikator tidak ditemukan" });
    }

    // Ambil data realisasi bulanan berdasarkan indikator_id dan tahun
    const realisasiBulanan = await RealisasiBulanan.findAll({
      where: { indikator_id: indikatorId, tahun },
      attributes: ["bulan", "realisasi"],
    });

    res.status(200).json({
      success: true,
      indikator: indikator,
      data_realisasi: realisasiBulanan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
