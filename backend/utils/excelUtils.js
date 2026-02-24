// utils/excelUtils.js
const ExcelJS = require("exceljs");

const generateExcelReport = (data, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan");

  worksheet.addRow(["Indikator", "Target", "Capaian", "Rekomendasi"]);

  data.forEach((row) => {
    worksheet.addRow([row.Indikator, row.Target, row.Capaian, row.Rekomendasi]);
  });

  // Menyimpan file Excel dan mengirimnya sebagai respons
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=Laporan.xlsx");

  workbook.xlsx.write(res).then(() => res.end());
};

module.exports = { generateExcelReport };
