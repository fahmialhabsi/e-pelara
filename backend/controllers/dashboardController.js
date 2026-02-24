// controllers/dashboardController.js
const { Indikator } = require("../models");

exports.getDashboardMonitoring = async (req, res) => {
  const { jenis_dokumen, tahun } = req.query;

  const where = {};
  if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
  if (tahun) where.tahun = tahun;

  try {
    // Ambil semua indikator
    const indikatorList = await Indikator.findAll({
      attributes: [
        "id",
        "kode_indikator",
        "nama_indikator",
        "satuan",
        "target_tahun_1",
      ],
    });

    // Dummy realisasi_terbaru untuk contoh
    const dataMonitoring = indikatorList.map((indikator) => {
      const target = parseFloat(indikator.target_tahun_1) || 0;
      const realisasi_terbaru = Math.random() * target; // misal random data untuk testing
      const persentase_capaian =
        target > 0 ? ((realisasi_terbaru / target) * 100).toFixed(2) : 0;

      return {
        id: indikator.id,
        kode_indikator: indikator.kode_indikator,
        nama_indikator: indikator.nama_indikator,
        satuan: indikator.satuan,
        target: target,
        realisasi_terbaru: realisasi_terbaru.toFixed(2),
        persentase_capaian: persentase_capaian,
      };
    });

    res.status(200).json({
      success: true,
      data: dataMonitoring,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
