// routes/kinerjaRoutes.js
const express = require("express");
const router = express.Router();
const { sequelize } = require("../models");

router.get("/kinerja-rpjmd", async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT ri.periode AS tahun, ROUND(AVG(ri.nilai_realisasi), 2) as rata_capaian
      FROM realisasi_indikator ri
      JOIN indikator i ON ri.indikator_id = i.id
      WHERE 1=1
      GROUP BY ri.periode
      ORDER BY ri.periode ASC
    `);

    const labels = results.map((r) => r.tahun);
    const data = results.map((r) => parseFloat(r.rata_capaian));

    res.json({
      labels,
      datasets: [
        {
          label: "Kinerja Tahunan",
          data,
        },
      ],
      title: "Tren Kinerja RPJMD",
    });
  } catch (error) {
    console.error("[ERROR] /api/kinerja-rpjmd:", error);
    res.status(500).json({ message: "Gagal mengambil data kinerja RPJMD" });
  }
});

module.exports = router;
