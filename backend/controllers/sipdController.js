/**
 * sipdController.js — SIPD Internal Module (placeholder, diisi lengkap di Tahap 3)
 * Sementara ini endpoint memberikan 200 OK agar server tidak crash.
 */
const { sequelize } = require("../models");

const safeQuery = async (sql, replacements = {}) => {
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows;
  } catch (e) {
    return [];
  }
};

module.exports = {
  async getProgram(req, res) {
    const rows = await safeQuery(
      "SELECT * FROM sipd_ref_program ORDER BY kode LIMIT 500"
    );
    res.json({ data: rows, total: rows.length });
  },

  async getKegiatan(req, res) {
    const { program_id } = req.query;
    const sql = program_id
      ? "SELECT * FROM sipd_ref_kegiatan WHERE program_id = :pid ORDER BY kode"
      : "SELECT * FROM sipd_ref_kegiatan ORDER BY kode LIMIT 500";
    const rows = await safeQuery(sql, { pid: program_id });
    res.json({ data: rows, total: rows.length });
  },

  async getSubKegiatan(req, res) {
    const { kegiatan_id } = req.query;
    const sql = kegiatan_id
      ? "SELECT * FROM sipd_ref_subkegiatan WHERE kegiatan_id = :kid ORDER BY kode"
      : "SELECT * FROM sipd_ref_subkegiatan ORDER BY kode LIMIT 500";
    const rows = await safeQuery(sql, { kid: kegiatan_id });
    res.json({ data: rows, total: rows.length });
  },

  async getKodeRekening(req, res) {
    const rows = await safeQuery(
      "SELECT * FROM kode_rekening ORDER BY kode_rekening LIMIT 1000"
    );
    res.json({ data: rows, total: rows.length });
  },

  async getKodeNeraca(req, res) {
    const rows = await safeQuery(
      "SELECT * FROM kode_neraca ORDER BY kode_neraca LIMIT 1000"
    );
    res.json({ data: rows, total: rows.length });
  },

  async getRealisasi(req, res) {
    const { tahun, program_id } = req.query;
    const sql = `
      SELECT sr.*, sp.nama as program_nama, sk.nama as kegiatan_nama
      FROM sipd_realisasi sr
      LEFT JOIN sipd_ref_program sp ON sr.program_id = sp.id
      LEFT JOIN sipd_ref_kegiatan sk ON sr.kegiatan_id = sk.id
      WHERE (:tahun IS NULL OR sr.tahun = :tahun)
        AND (:pid IS NULL OR sr.program_id = :pid)
      ORDER BY sr.tahun DESC, sr.bulan DESC
      LIMIT 200
    `;
    const rows = await safeQuery(sql, { tahun: tahun || null, pid: program_id || null });
    res.json({ data: rows, total: rows.length });
  },

  async getSummary(req, res) {
    const { tahun } = req.query;
    const sql = `
      SELECT
        sp.kode,
        sp.nama AS program,
        COALESCE(SUM(d.anggaran), 0) AS total_anggaran,
        COALESCE(SUM(sr.realisasi), 0) AS total_realisasi,
        CASE
          WHEN COALESCE(SUM(d.anggaran), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(sr.realisasi), 0) / SUM(d.anggaran) * 100, 2)
        END AS persen_realisasi
      FROM sipd_ref_program sp
      LEFT JOIN dpa d ON d.program LIKE CONCAT('%', sp.kode, '%')
        AND (:tahun IS NULL OR d.tahun = :tahun)
      LEFT JOIN sipd_realisasi sr ON sr.program_id = sp.id
        AND (:tahun IS NULL OR sr.tahun = :tahun)
      GROUP BY sp.id, sp.kode, sp.nama
      ORDER BY sp.kode
    `;
    const rows = await safeQuery(sql, { tahun: tahun || null });
    res.json({ data: rows });
  },

  async syncMock(req, res) {
    res.json({
      success: true,
      message: "SIPD sync mock — data internal sudah terkini (integrasi SIPD asli belum aktif)",
      synced_at: new Date().toISOString(),
      note: "Untuk integrasi SIPD Kemendagri nyata, tambahkan SIPD_API_URL dan SIPD_API_KEY di .env",
    });
  },

  // ─── Write: Realisasi ─────────────────────────────────────────────

  async createRealisasi(req, res) {
    const { program_id, kegiatan_id, subkegiatan_id, tahun, bulan, anggaran, realisasi, keterangan } = req.body;
    if (!tahun || !bulan) {
      return res.status(400).json({ success: false, message: "tahun dan bulan wajib diisi" });
    }
    if (isNaN(parseInt(bulan)) || parseInt(bulan) < 1 || parseInt(bulan) > 12) {
      return res.status(400).json({ success: false, message: "bulan harus antara 1-12" });
    }
    try {
      const [result] = await sequelize.query(
        `INSERT INTO sipd_realisasi (program_id, kegiatan_id, subkegiatan_id, tahun, bulan, anggaran, realisasi, keterangan, created_by, created_at, updated_at)
         VALUES (:program_id, :kegiatan_id, :subkegiatan_id, :tahun, :bulan, :anggaran, :realisasi, :keterangan, :user_id, NOW(), NOW())`,
        {
          replacements: {
            program_id: program_id || null, kegiatan_id: kegiatan_id || null,
            subkegiatan_id: subkegiatan_id || null, tahun, bulan: parseInt(bulan),
            anggaran: anggaran || 0, realisasi: realisasi || 0,
            keterangan: keterangan || null, user_id: req.user?.id || null,
          },
        }
      );
      return res.status(201).json({ success: true, message: "Realisasi berhasil dicatat", data: { id: result } });
    } catch (e) {
      console.error("[sipd] createRealisasi:", e.message);
      return res.status(500).json({ success: false, message: "Gagal menyimpan realisasi" });
    }
  },

  async updateRealisasi(req, res) {
    const { id } = req.params;
    const { anggaran, realisasi, keterangan } = req.body;
    if (!parseInt(id)) return res.status(400).json({ success: false, message: "ID tidak valid" });
    try {
      const [affected] = await sequelize.query(
        "UPDATE sipd_realisasi SET anggaran=:anggaran, realisasi=:realisasi, keterangan=:keterangan, updated_at=NOW() WHERE id=:id",
        { replacements: { anggaran: anggaran||0, realisasi: realisasi||0, keterangan: keterangan||null, id: parseInt(id) } }
      );
      if (!affected) return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
      return res.json({ success: true, message: "Realisasi diperbarui" });
    } catch (e) {
      console.error("[sipd] updateRealisasi:", e.message);
      return res.status(500).json({ success: false, message: "Gagal update realisasi" });
    }
  },

  async deleteRealisasi(req, res) {
    const { id } = req.params;
    if (!parseInt(id)) return res.status(400).json({ success: false, message: "ID tidak valid" });
    try {
      await sequelize.query("DELETE FROM sipd_realisasi WHERE id = :id", { replacements: { id: parseInt(id) } });
      return res.json({ success: true, message: "Realisasi dihapus" });
    } catch (e) {
      console.error("[sipd] deleteRealisasi:", e.message);
      return res.status(500).json({ success: false, message: "Gagal hapus realisasi" });
    }
  },
};
