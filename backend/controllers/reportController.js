const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

exports.generateReport = async (req, res) => {
  const { data } = req.body; // misal: list dari frontend
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan");

  ws.addRow(["Indikator", "Nilai", "Evaluasi"]);
  data.forEach((item) =>
    ws.addRow([item.indikator, item.nilai, item.evaluasi])
  );

  const filename = `laporan-${Date.now()}.xlsx`;
  const filePath = path.join(__dirname, `../reports/${filename}`);

  await wb.xlsx.writeFile(filePath);
  res.json({ file: filename });
};
