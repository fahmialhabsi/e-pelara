// controllers/exportController.js
// Export laporan Excel untuk modul-modul utama menggunakan exportService

const { exportExcel } = require("../services/exportService");
const { Misi, Program, Kegiatan, Sasaran, Tujuan } = require("../models");

// ────────────────────────────────────────────────
// GET /api/export/program?periode_id=X&jenis_dokumen=RPJMD
// Export daftar Program ke Excel
// ────────────────────────────────────────────────
const exportProgram = async (req, res) => {
  const { periode_id, jenis_dokumen, tahun } = req.query;
  try {
    const where = {};
    if (periode_id) where.periode_id = parseInt(periode_id);
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
    if (tahun) where.tahun = tahun;

    const rows = await Program.findAll({
      where,
      order: [["kode_program", "ASC"]],
    });

    const columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Kode Program", key: "kode_program", width: 22 },
      { header: "Nama Program", key: "nama_program", width: 45 },
      { header: "OPD Penanggungjawab", key: "opd_penanggung_jawab", width: 35 },
      { header: "Pagu Anggaran (Rp)", key: "pagu_anggaran", width: 22 },
      { header: "Total Pagu (Rp)", key: "total_pagu_anggaran", width: 22 },
      { header: "Jenis Dokumen", key: "jenis_dokumen", width: 16 },
      { header: "Tahun", key: "tahun", width: 10 },
    ];

    const data = rows.map((r, i) => ({
      no: i + 1,
      kode_program: r.kode_program,
      nama_program: r.nama_program,
      opd_penanggung_jawab: r.opd_penanggung_jawab,
      pagu_anggaran: r.pagu_anggaran,
      total_pagu_anggaran: r.total_pagu_anggaran,
      jenis_dokumen: r.jenis_dokumen,
      tahun: r.tahun,
    }));

    await exportExcel(
      res,
      "Laporan-Program",
      "Program",
      columns,
      data,
      "LAPORAN DAFTAR PROGRAM",
    );
  } catch (err) {
    console.error("exportController.exportProgram:", err);
    if (!res.headersSent)
      return res.status(500).json({ message: "Gagal export program" });
  }
};

// ────────────────────────────────────────────────
// GET /api/export/kegiatan?periode_id=X&jenis_dokumen=RPJMD
// Export daftar Kegiatan ke Excel
// ────────────────────────────────────────────────
const exportKegiatan = async (req, res) => {
  const { periode_id, jenis_dokumen, tahun } = req.query;
  try {
    const where = {};
    if (periode_id) where.periode_id = parseInt(periode_id);
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
    if (tahun) where.tahun = tahun;

    const rows = await Kegiatan.findAll({
      where,
      include: [
        {
          model: Program,
          as: "program",
          attributes: ["kode_program", "nama_program"],
        },
      ],
      order: [["kode_kegiatan", "ASC"]],
    });

    const columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Kode Kegiatan", key: "kode_kegiatan", width: 22 },
      { header: "Nama Kegiatan", key: "nama_kegiatan", width: 45 },
      { header: "Kode Program", key: "kode_program", width: 22 },
      { header: "Nama Program", key: "nama_program", width: 35 },
      { header: "OPD Penanggungjawab", key: "opd_penanggung_jawab", width: 35 },
      { header: "Pagu Anggaran (Rp)", key: "pagu_anggaran", width: 22 },
      { header: "Total Pagu (Rp)", key: "total_pagu_anggaran", width: 22 },
      { header: "Jenis Dokumen", key: "jenis_dokumen", width: 16 },
      { header: "Tahun", key: "tahun", width: 10 },
    ];

    const data = rows.map((r, i) => ({
      no: i + 1,
      kode_kegiatan: r.kode_kegiatan,
      nama_kegiatan: r.nama_kegiatan,
      kode_program: r.program?.kode_program || "",
      nama_program: r.program?.nama_program || "",
      opd_penanggung_jawab: r.opd_penanggung_jawab,
      pagu_anggaran: r.pagu_anggaran,
      total_pagu_anggaran: r.total_pagu_anggaran,
      jenis_dokumen: r.jenis_dokumen,
      tahun: r.tahun,
    }));

    await exportExcel(
      res,
      "Laporan-Kegiatan",
      "Kegiatan",
      columns,
      data,
      "LAPORAN DAFTAR KEGIATAN",
    );
  } catch (err) {
    console.error("exportController.exportKegiatan:", err);
    if (!res.headersSent)
      return res.status(500).json({ message: "Gagal export kegiatan" });
  }
};

// ────────────────────────────────────────────────
// GET /api/export/misi?periode_id=X
// Export daftar Misi ke Excel
// ────────────────────────────────────────────────
const exportMisi = async (req, res) => {
  const { periode_id, jenis_dokumen, tahun } = req.query;
  try {
    const where = {};
    if (periode_id) where.periode_id = parseInt(periode_id);
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
    if (tahun) where.tahun = tahun;

    const rows = await Misi.findAll({
      where,
      order: [["no_misi", "ASC"]],
    });

    const columns = [
      { header: "No Misi", key: "no_misi", width: 10 },
      { header: "Isi Misi", key: "isi_misi", width: 60 },
      { header: "Deskripsi", key: "deskripsi", width: 45 },
      { header: "Jenis Dokumen", key: "jenis_dokumen", width: 16 },
      { header: "Tahun", key: "tahun", width: 10 },
    ];

    const data = rows.map((r) => ({
      no_misi: r.no_misi,
      isi_misi: r.isi_misi,
      deskripsi: r.deskripsi || "",
      jenis_dokumen: r.jenis_dokumen,
      tahun: r.tahun,
    }));

    await exportExcel(
      res,
      "Laporan-Misi",
      "Misi",
      columns,
      data,
      "LAPORAN DAFTAR MISI",
    );
  } catch (err) {
    console.error("exportController.exportMisi:", err);
    if (!res.headersSent)
      return res.status(500).json({ message: "Gagal export misi" });
  }
};

// ────────────────────────────────────────────────
// GET /api/export/sasaran?periode_id=X
// Export daftar Sasaran ke Excel
// ────────────────────────────────────────────────
const exportSasaran = async (req, res) => {
  const { periode_id, jenis_dokumen, tahun } = req.query;
  try {
    const where = {};
    if (periode_id) where.periode_id = parseInt(periode_id);
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
    if (tahun) where.tahun = tahun;

    const rows = await Sasaran.findAll({
      where,
      include: [{ model: Tujuan, as: "Tujuan", attributes: ["isi_tujuan"] }],
      order: [["id", "ASC"]],
    });

    const columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Isi Tujuan", key: "isi_tujuan", width: 50 },
      { header: "Isi Sasaran", key: "isi_sasaran", width: 50 },
      { header: "Jenis Dokumen", key: "jenis_dokumen", width: 16 },
      { header: "Tahun", key: "tahun", width: 10 },
    ];

    const data = rows.map((r, i) => ({
      no: i + 1,
      isi_tujuan: r.Tujuan?.isi_tujuan || "",
      isi_sasaran: r.isi_sasaran || "",
      jenis_dokumen: r.jenis_dokumen,
      tahun: r.tahun,
    }));

    await exportExcel(
      res,
      "Laporan-Sasaran",
      "Sasaran",
      columns,
      data,
      "LAPORAN DAFTAR SASARAN",
    );
  } catch (err) {
    console.error("exportController.exportSasaran:", err);
    if (!res.headersSent)
      return res.status(500).json({ message: "Gagal export sasaran" });
  }
};

module.exports = { exportProgram, exportKegiatan, exportMisi, exportSasaran };
