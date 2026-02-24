// utils/pdfUtils.js
const fs = require("fs");
const pdf = require("pdfkit");

const generatePDFReport = (data, res) => {
  const doc = new pdf();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=Laporan.pdf");

  doc.pipe(res);

  doc.fontSize(16).text("Laporan Evaluasi", 100, 100);

  data.forEach((row) => {
    doc
      .fontSize(12)
      .text(
        `${row.indikator} | Target: ${row.target} | Capaian: ${row.capaian} | Rekomendasi: ${row.rekomendasi}`,
        100,
        120
      );
  });

  doc.end();
};

module.exports = { generatePDFReport };
