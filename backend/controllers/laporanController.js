// controllers/laporanController.js
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { Indikator, RealisasiIndikator } = require("../models");

// Helper: ambil data laporan
async function getDataLaporan() {
  const indikatorList = await Indikator.findAll();
  const results = [];

  for (const indik of indikatorList) {
    const target = parseFloat(indik.target_tahun_1) || 0;
    const realRec = await RealisasiIndikator.findOne({
      where: { indikator_id: indik.id },
      order: [["periode", "DESC"]],
    });
    const real = realRec ? parseFloat(realRec.nilai_realisasi) : 0;
    const pct = target > 0 ? ((real / target) * 100).toFixed(2) : "0.00";

    results.push({
      id: indik.id,
      nama_indikator: indik.nama_indikator,
      target,
      realisasi_terbaru: real,
      pencapaian: pct,
    });
  }

  return results;
}

// Download CSV
async function downloadCSV(req, res) {
  try {
    const data = await getDataLaporan();
    const csvPath = path.join(__dirname, "../tmp/laporan.csv");
    const writer = createCsvWriter({
      path: csvPath,
      header: [
        { id: "id", title: "ID" },
        { id: "nama_indikator", title: "Nama Indikator" },
        { id: "target", title: "Target" },
        { id: "realisasi_terbaru", title: "Realisasi Terbaru" },
        { id: "pencapaian", title: "Pencapaian (%)" },
      ],
    });

    await writer.writeRecords(data);
    res.download(csvPath, "laporan.csv", (err) => {
      if (!err) fs.unlinkSync(csvPath);
    });
  } catch (err) {
    console.error("Error generating CSV report:", err);
    res.status(500).send("Error generating CSV report");
  }
}

// Download PDF
async function downloadPDF(req, res) {
  try {
    const data = await getDataLaporan();
    const pdfPath = path.join(__dirname, "../tmp/laporan.pdf");
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(18).text("Laporan Monitoring Realisasi", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text("ID | Nama Indikator | Target | Realisasi Terbaru | Pencapaian");
    data.forEach((item) => {
      doc.text(
        `${item.id} | ${item.nama_indikator} | ${item.target} | ${item.realisasi_terbaru} | ${item.pencapaian}%`
      );
    });
    doc.end();

    writeStream.on("finish", () => {
      res.download(pdfPath, "laporan.pdf", (err) => {
        if (!err) fs.unlinkSync(pdfPath);
      });
    });
  } catch (err) {
    console.error("Error generating PDF report:", err);
    res.status(500).send("Error generating PDF report");
  }
}

// Download Excel
async function downloadExcel(req, res) {
  try {
    const data = await getDataLaporan();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Monitoring");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nama Indikator", key: "nama_indikator", width: 30 },
      { header: "Target", key: "target", width: 15 },
      { header: "Realisasi Terbaru", key: "realisasi_terbaru", width: 20 },
      { header: "Pencapaian (%)", key: "pencapaian", width: 20 },
    ];

    data.forEach((item) => {
      sheet.addRow(item);
    });

    const excelPath = path.join(__dirname, "../tmp/laporan.xlsx");
    await workbook.xlsx.writeFile(excelPath);
    res.download(excelPath, "laporan.xlsx", (err) => {
      if (!err) fs.unlinkSync(excelPath);
    });
  } catch (err) {
    console.error("Error generating Excel report:", err);
    res.status(500).send("Error generating Excel report");
  }
}

module.exports = { downloadCSV, downloadPDF, downloadExcel };
