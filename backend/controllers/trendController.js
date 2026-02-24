// controllers/trendController.js
const {
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorProgram,
  IndikatorKegiatan,
} = require("../models");

const parseTarget = (val) => {
  const num = parseFloat(val?.toString().replace(",", "."));
  return isNaN(num) ? null : num;
};

exports.getTrend = async (req, res) => {
  try {
    const allTargets = [];

    const datasets = await Promise.all([
      IndikatorTujuan.findAll({ raw: true }),
      IndikatorSasaran.findAll({ raw: true }),
      IndikatorProgram.findAll({ raw: true }),
      IndikatorKegiatan.findAll({ raw: true }),
    ]);

    for (const data of datasets.flat()) {
      allTargets.push([
        parseTarget(data.target_tahun_1),
        parseTarget(data.target_tahun_2),
        parseTarget(data.target_tahun_3),
        parseTarget(data.target_tahun_4),
        parseTarget(data.target_tahun_5),
      ]);
    }

    const tahunCount = 5;
    const totals = Array(tahunCount).fill(0);
    const counts = Array(tahunCount).fill(0);

    for (const row of allTargets) {
      row.forEach((val, i) => {
        if (val != null) {
          totals[i] += val;
          counts[i] += 1;
        }
      });
    }

    const values = totals.map((sum, i) =>
      counts[i] ? parseFloat((sum / counts[i]).toFixed(2)) : 0
    );

    return res.json({
      years: ["2021", "2022", "2023", "2024", "2025"],
      values,
    });
  } catch (err) {
    console.error("Trend error:", err);
    return res.status(500).json({ message: "Gagal mengambil data tren" });
  }
};
