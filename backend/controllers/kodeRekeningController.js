/**
 * kodeRekeningController.js
 * Lookup & validasi kode rekening dari referensi Permendagri 90.
 *
 * Endpoints:
 *   GET /api/rekening/search?q=belanja&level=&kelompok=5&limit=20
 *   GET /api/rekening/detail?kode=5.1.01  → detail satu kode (query, bukan path)
 *   POST /api/rekening/validate           → validasi batch kode
 */

const { sequelize } = require("../models");

// ── Search / autocomplete ─────────────────────────────────────────────────────
exports.search = async (req, res) => {
  const {
    q = "",
    level,
    kelompok,
    parent_kode,
    limit: limitParam = "30",
  } = req.query;

  const limit = Math.min(parseInt(limitParam) || 30, 100);

  try {
    const conds   = [];
    const repls   = { limit };

    if (q.trim()) {
      conds.push("(kode_rekening LIKE :q OR nama LIKE :q)");
      repls.q = `%${q.trim()}%`;
    }
    if (level)      { conds.push("level = :level");           repls.level = parseInt(level); }
    if (kelompok)   { conds.push("kelompok = :kelompok");     repls.kelompok = String(kelompok); }
    if (parent_kode){ conds.push("parent_kode = :parent_kode"); repls.parent_kode = String(parent_kode); }

    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const [rows] = await sequelize.query(
      `SELECT kode_rekening, nama, level, kelompok, jenis, objek, rincian, parent_kode
       FROM kode_rekening
       ${where}
       ORDER BY kode_rekening ASC
       LIMIT :limit`,
      { replacements: repls }
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows.map((r) => ({
        ...r,
        label: `${r.kode_rekening} — ${r.nama}`,
        value: r.kode_rekening,
      })),
    });
  } catch (err) {
    console.error("[rekening] search:", err.message);
    return res.status(500).json({ success: false, message: "Gagal mencari kode rekening: " + err.message });
  }
};

// ── Get by kode ────────────────────────────────────────────────────────────────
exports.getByKode = async (req, res) => {
  const kode = req.params.kode || req.query.kode;
  if (!kode) return res.status(400).json({ success: false, message: "Kode rekening wajib diisi (gunakan query ?kode=)" });

  try {
    const [[row]] = await sequelize.query(
      "SELECT kode_rekening, nama, level, kelompok, jenis, objek, rincian, parent_kode FROM kode_rekening WHERE kode_rekening = :kode LIMIT 1",
      { replacements: { kode } }
    );
    if (!row) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `Kode rekening "${kode}" tidak ditemukan dalam referensi Permendagri 90`,
      });
    }
    return res.json({ success: true, valid: true, data: { ...row, label: `${row.kode_rekening} — ${row.nama}` } });
  } catch (err) {
    console.error("[rekening] getByKode:", err.message);
    return res.status(500).json({ success: false, message: "Gagal ambil detail kode rekening" });
  }
};

// ── Validate batch (untuk bulk-import atau form multi-item) ───────────────────
exports.validateBatch = async (req, res) => {
  const { kode_list } = req.body;
  if (!Array.isArray(kode_list) || kode_list.length === 0) {
    return res.status(400).json({ success: false, message: "kode_list harus array tidak kosong" });
  }
  if (kode_list.length > 100) {
    return res.status(400).json({ success: false, message: "Maksimal 100 kode per request" });
  }

  try {
    const [rows] = await sequelize.query(
      "SELECT kode_rekening FROM kode_rekening WHERE kode_rekening IN (:codes)",
      { replacements: { codes: kode_list } }
    );
    const found   = new Set(rows.map((r) => r.kode_rekening));
    const results = kode_list.map((k) => ({ kode: k, valid: found.has(k) }));
    const invalid = results.filter((r) => !r.valid).map((r) => r.kode);

    return res.json({
      success: true,
      data:    results,
      valid_count:   kode_list.length - invalid.length,
      invalid_count: invalid.length,
      invalid_kode:  invalid,
    });
  } catch (err) {
    console.error("[rekening] validateBatch:", err.message);
    return res.status(500).json({ success: false, message: "Gagal validasi batch" });
  }
};

// ── Internal helper: validasi satu kode (dipakai oleh dpaController) ──────────
exports.validateOne = async (kode) => {
  if (!kode) return { valid: true, row: null }; // null = skip (backward compat)
  const [[row]] = await sequelize.query(
    "SELECT kode_rekening, nama FROM kode_rekening WHERE kode_rekening = :kode LIMIT 1",
    { replacements: { kode } }
  );
  return { valid: !!row, row: row || null };
};
