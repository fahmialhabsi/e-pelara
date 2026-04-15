// controllers/dashboardController.js — REAL DATA, tidak ada hardcoded dummy
const {
  Indikator,
  RealisasiIndikator,
  Dpa,
  Lakip,
  Rka,
  Renja,
  Rkpd,
  User,
  ApprovalLog,
  sequelize: db,
} = require("../models");
const { Op } = require("sequelize");

// ────────────────────────────────────────────
// GET /api/dashboard-stats
// KPI cards: total dokumen, pending approval, approved, users
// ────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalDpa,
      totalLakip,
      totalRka,
      totalRenja,
      totalRkpd,
      totalUsers,
    ] = await Promise.all([
      Dpa.count(),
      Lakip.count(),
      Rka.count(),
      Renja.count(),
      Rkpd.count(),
      User.count(),
    ]);

    const totalDokumen = totalDpa + totalLakip + totalRka + totalRenja + totalRkpd;

    // Hitung approved dari kolom approval_status
    const [approvedRows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM dpa   WHERE approval_status = 'APPROVED') +
        (SELECT COUNT(*) FROM lakip WHERE approval_status = 'APPROVED') +
        (SELECT COUNT(*) FROM rka   WHERE approval_status = 'APPROVED') +
        (SELECT COUNT(*) FROM renja WHERE approval_status = 'APPROVED') +
        (SELECT COUNT(*) FROM rkpd  WHERE approval_status = 'APPROVED') AS total_approved
    `);
    const totalApproved = approvedRows[0]?.total_approved || 0;

    // Hitung pending dari approval_logs (status terkini = SUBMITTED)
    const [[pendingRow]] = await db.query(`
      SELECT COUNT(*) AS cnt
      FROM approval_logs al
      INNER JOIN (
        SELECT entity_type, entity_id, MAX(created_at) AS max_created
        FROM approval_logs
        GROUP BY entity_type, entity_id
      ) latest ON al.entity_type = latest.entity_type
              AND al.entity_id = latest.entity_id
              AND al.created_at = latest.max_created
      WHERE al.to_status = 'SUBMITTED'
    `);
    const totalPending = pendingRow?.cnt || 0;

    const pctApproved =
      totalDokumen > 0
        ? Math.round((totalApproved / totalDokumen) * 100)
        : 0;

    return res.json({
      success: true,
      data: {
        total_dokumen: totalDokumen,
        total_approved: totalApproved,
        total_pending: totalPending,
        total_users: totalUsers,
        pct_approved: pctApproved,
        breakdown: {
          dpa: totalDpa,
          lakip: totalLakip,
          rka: totalRka,
          renja: totalRenja,
          rkpd: totalRkpd,
        },
      },
    });
  } catch (err) {
    console.error("getDashboardStats:", err);
    return res.status(500).json({ success: false, message: "Gagal mengambil statistik" });
  }
};

// ────────────────────────────────────────────
// GET /api/dashboard-monitoring
// Bug fix: sekarang filter `where` benar-benar diterapkan
// ────────────────────────────────────────────
exports.getDashboardMonitoring = async (req, res) => {
  const { jenis_dokumen, tahun } = req.query;

  const where = {};
  if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
  if (tahun) where.tahun = tahun;

  try {
    // FIX: terapkan `where` ke findAll
    const indikatorList = await Indikator.findAll({
      where,                // ← sebelumnya tidak diterapkan
      attributes: [
        "id",
        "kode_indikator",
        "nama_indikator",
        "satuan",
        "target_tahun_1",
        "jenis_dokumen",
        "tahun",
      ],
      order: [["kode_indikator", "ASC"]],
    });

    // Fix N+1: ambil semua realisasi sekaligus dalam 1 query
    const indikatorIds = indikatorList.map((i) => i.id);
    let realisasiMap = {};

    if (indikatorIds.length > 0) {
      const [realisasiRows] = await db.query(
        `SELECT r1.indikator_id, r1.nilai_realisasi
         FROM realisasi_indikator r1
         INNER JOIN (
           SELECT indikator_id, MAX(created_at) AS max_created
           FROM realisasi_indikator
           WHERE indikator_id IN (:ids)
           GROUP BY indikator_id
         ) r2 ON r1.indikator_id = r2.indikator_id AND r1.created_at = r2.max_created`,
        { replacements: { ids: indikatorIds } }
      );
      for (const r of realisasiRows) {
        realisasiMap[r.indikator_id] = parseFloat(r.nilai_realisasi) || 0;
      }
    }

    const dataMonitoring = indikatorList.map((indikator) => {
      const target = parseFloat(indikator.target_tahun_1) || 0;
      const realisasi_terbaru = realisasiMap[indikator.id] || 0;
      const persentase_capaian =
        target > 0 ? ((realisasi_terbaru / target) * 100).toFixed(2) : 0;

      return {
        id: indikator.id,
        kode_indikator: indikator.kode_indikator,
        nama_indikator: indikator.nama_indikator,
        satuan: indikator.satuan,
        jenis_dokumen: indikator.jenis_dokumen,
        tahun: indikator.tahun,
        target,
        realisasi_terbaru: realisasi_terbaru.toFixed(2),
        persentase_capaian,
      };
    });

    return res.status(200).json({ success: true, data: dataMonitoring });
  } catch (error) {
    console.error("getDashboardMonitoring:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ────────────────────────────────────────────
// GET /api/dashboard-anggaran-realisasi
// Anggaran vs Realisasi per DPA
// ────────────────────────────────────────────
exports.getAnggaranVsRealisasi = async (req, res) => {
  const { tahun } = req.query;
  try {
    const where = tahun ? `WHERE d.tahun = '${tahun}'` : "";
    const [rows] = await db.query(`
      SELECT
        d.program,
        d.tahun,
        COALESCE(SUM(d.anggaran), 0)           AS total_anggaran,
        COALESCE(SUM(rb.nilai_realisasi), 0)   AS total_realisasi,
        CASE
          WHEN COALESCE(SUM(d.anggaran), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(rb.nilai_realisasi), 0) / SUM(d.anggaran) * 100, 2)
        END AS persen_realisasi
      FROM dpa d
      LEFT JOIN realisasi_bulanan rb
        ON rb.program_id IS NOT NULL
      ${where}
      GROUP BY d.program, d.tahun
      ORDER BY d.tahun DESC, d.program
      LIMIT 50
    `);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getAnggaranVsRealisasi:", err);
    return res.status(500).json({ success: false, message: "Gagal ambil anggaran vs realisasi" });
  }
};
