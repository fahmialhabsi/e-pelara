const { CapaianIndikator, MonevData } = require("../../models"); // Sesuaikan dengan model yang ada
const pdfMake = require("pdfmake");
const ExcelJS = require("exceljs");

// Fungsi untuk mengambil capaian indikator berdasarkan filter
const getCapaianIndikator = async (req, res) => {
  try {
    const { periode, sasaran_id, program_id } = req.query; // Dapatkan filter dari query params

    // Query capaian indikator dengan filter yang diterapkan
    const capaian = await CapaianIndikator.findAll({
      where: {
        sasaran_id: sasaran_id,
        program_id: program_id,
        periode: periode,
      },
    });

    res.status(200).json(capaian);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving capaian indikator" });
  }
};

// Fungsi untuk mengambil data dashboard
const getDashboardData = async (req, res) => {
  const { tahun } = req.query;

  try {
    // Mengambil data Monev berdasarkan tahun atau filter lainnya
    const data = await MonevData.findAll({
      where: {
        tahun: tahun,
      },
    });

    return res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ message: "Error fetching data" });
  }
};

// Fungsi untuk export laporan PDF
const exportLaporanPDF = async (req, res) => {
  try {
    const { periode, sasaran_id, program_id } = req.query;
    const capaian = await CapaianIndikator.findAll({
      where: {
        sasaran_id: sasaran_id,
        program_id: program_id,
        periode: periode,
      },
    });

    const docDefinition = {
      content: [
        { text: "Laporan Capaian Indikator", style: "header" },
        {
          table: {
            body: [
              ["Indikator", "Capaian", "Target"],
              ...capaian.map((item) => [
                item.indikator,
                item.capaian,
                item.target,
              ]),
            ],
          },
        },
      ],
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer) => {
      res.contentType("application/pdf");
      res.send(buffer);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating PDF report" });
  }
};

// Fungsi untuk export laporan Excel
const exportLaporanExcel = async (req, res) => {
  try {
    const { periode, sasaran_id, program_id } = req.query;
    const capaian = await CapaianIndikator.findAll({
      where: {
        sasaran_id: sasaran_id,
        program_id: program_id,
        periode: periode,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan Capaian");

    worksheet.columns = [
      { header: "Indikator", key: "indikator", width: 30 },
      { header: "Capaian", key: "capaian", width: 15 },
      { header: "Target", key: "target", width: 15 },
    ];

    capaian.forEach((item) => {
      worksheet.addRow({
        indikator: item.indikator,
        capaian: item.capaian,
        target: item.target,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="laporan-capaian.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating Excel report" });
  }
};

// Fungsi untuk upload capaian indikator
const uploadCapaianIndikator = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.getWorksheet(1);
    const rows = worksheet.getRows(2, worksheet.rowCount); // Mulai dari baris 2 untuk menghindari header

    rows.forEach((row) => {
      const indikator = row.getCell(1).value;
      const capaian = row.getCell(2).value;
      const target = row.getCell(3).value;

      // Simpan data capaian ke database
      CapaianIndikator.create({
        indikator,
        capaian,
        target,
      });
    });

    res
      .status(200)
      .json({ message: "File uploaded and data saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error uploading file and saving data" });
  }
};

// Filter Sasaran berdasarkan sasaran_id
const getFilterSasaran = async (req, res) => {
  const { sasaran_id, periode } = req.query;

  try {
    // Mencari data yang sesuai dengan sasaran_id dan periode
    const sasaranData = await MonevData.findAll({
      where: {
        sasaran_id: sasaran_id,
        periode: periode, // Jika periode perlu di-filter juga
      },
      include: [
        {
          model: Sasaran, // Pastikan ini sesuai dengan asosiasi yang kamu buat di model
          attributes: ["nama_sasaran", "deskripsi_sasaran"], // Sesuaikan dengan kolom yang ada
        },
      ],
    });

    if (!sasaranData || sasaranData.length === 0) {
      return res.status(404).json({ message: "Data sasaran tidak ditemukan" });
    }

    return res.status(200).json(sasaranData);
  } catch (error) {
    console.error("Error fetching sasaran data:", error);
    return res.status(500).json({ message: "Error fetching sasaran data" });
  }
};

module.exports = {
  uploadCapaianIndikator,
  getCapaianIndikator,
  exportLaporanPDF,
  exportLaporanExcel,
  getDashboardData,
  getFilterSasaran,
};
