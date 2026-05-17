// controllers/dashboardAgregatPaguController.js
const {
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
} = require("../models");

const { fn, col } = require("sequelize");

const sumCachedPagu = async (Model) => {
  const result = await Model.findOne({
    attributes: [[fn("SUM", col("pagu_cached")), "total"]],
    raw: true,
  });

  return Number(result?.total || 0);
};

exports.getDashboardPagu = async (req, res) => {
  try {
    const [
      totalTujuan,
      totalSasaran,
      totalStrategi,
      totalArahKebijakan,
      totalProgram,
      totalKegiatan,
      totalSubKegiatan,
    ] = await Promise.all([
      sumCachedPagu(IndikatorTujuan),
      sumCachedPagu(IndikatorSasaran),
      sumCachedPagu(IndikatorStrategi),
      sumCachedPagu(IndikatorArahKebijakan),
      sumCachedPagu(IndikatorProgram),
      sumCachedPagu(IndikatorKegiatan),
      sumCachedPagu(IndikatorSubKegiatan),
    ]);

    return res.json({
      success: true,
      message: "Berhasil mengambil dashboard agregasi pagu cached",
      summary: {
        total_tujuan: totalTujuan,
        total_sasaran: totalSasaran,
        total_strategi: totalStrategi,
        total_arah_kebijakan: totalArahKebijakan,
        total_program: totalProgram,
        total_kegiatan: totalKegiatan,
        total_sub_kegiatan: totalSubKegiatan,
      },
    });
  } catch (error) {
    console.error("Dashboard pagu cached error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil dashboard pagu cached",
      error: error.message,
    });
  }
};