// controllers/kpiController.js
const {
  IndikatorKegiatan,
  IndikatorProgram,
  IndikatorSasaran,
  IndikatorTujuan,
} = require("../models");

exports.getKPI = async (req, res) => {
  try {
    const kegiatanCount = await IndikatorKegiatan.count();
    const programCount = await IndikatorProgram.count();
    const sasaranCount = await IndikatorSasaran.count();
    const tujuanCount = await IndikatorTujuan.count();

    return res.status(200).json({
      programs: programCount,
      activities: kegiatanCount,
      indicators: kegiatanCount + programCount + sasaranCount + tujuanCount,
    });
  } catch (error) {
    console.error("Error fetching KPI:", error);
    return res.status(500).json({ message: "Gagal mengambil data KPI." });
  }
};
