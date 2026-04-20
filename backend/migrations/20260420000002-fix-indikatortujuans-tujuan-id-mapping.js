"use strict";

/**
 * Perbaiki tujuan_id yang salah pada tabel indikatortujuans.
 *
 * Bug: saat import Excel, mapping tujuan_id menggunakan fallback posisional
 * (baris ke-i → tujuan urutan ke-i) karena parser kode T1-01-02 tidak mengenal
 * format standar T{misi}-{noTujuan}-{seq}. Akibatnya:
 *   T1-01-01 → tujuan_id 1 ✅  (kebetulan baris pertama)
 *   T1-01-02 → tujuan_id 2 ❌  (harusnya 1, tujuan yang sama)
 *   T1-01-03 → tujuan_id 5 ❌  (harusnya 1)
 *   T1-02-01 → tujuan_id 29 ❌ (harusnya sesuai tujuan T1-02)
 *
 * Fix: untuk setiap baris indikatortujuans dengan kode_indikator berformat
 * T{misi}-{no}-{seq}, cari tujuan yang memiliki no_tujuan cocok (prefix) di
 * periode yang sama, lalu update tujuan_id dan misi_id.
 */
module.exports = {
  up: async (queryInterface) => {
    const [indikators] = await queryInterface.sequelize.query(
      `SELECT it.id, it.kode_indikator, it.tujuan_id, it.misi_id, it.periode_id
       FROM indikatortujuans it
       WHERE it.kode_indikator REGEXP '^T[0-9]+-[0-9]+-[0-9]+'
       ORDER BY it.id`
    );

    if (!indikators.length) {
      console.log("[migration] Tidak ada baris indikatortujuans untuk diperbaiki.");
      return;
    }

    // Muat semua tujuan yang relevan (semua periode)
    const [tujuans] = await queryInterface.sequelize.query(
      `SELECT id, no_tujuan, misi_id, periode_id
       FROM tujuan
       WHERE no_tujuan IS NOT NULL AND no_tujuan != ''`
    );

    // Bangun map: "periode_id|no_tujuan_lower" → { id, misi_id }
    const tujuanMap = new Map();
    for (const t of tujuans) {
      const noLower = String(t.no_tujuan || "").trim().toLowerCase();
      if (!noLower) continue;
      const key = `${t.periode_id}|${noLower}`;
      if (!tujuanMap.has(key)) {
        tujuanMap.set(key, { id: t.id, misi_id: t.misi_id });
      }
    }

    /**
     * Parse prefix tujuan dari kode standar T{misi}-{no}-{seq}.
     * Contoh: "T1-01-02" → "t1-01", "T12-03-01" → "t12-03"
     * Juga coba variasi padding untuk toleransi format berbeda.
     */
    function extractPrefix(kode) {
      const m = String(kode || "").trim().match(/^(T(\d+)-(\d+))-\d+$/i);
      if (!m) return [];
      const misiN = parseInt(m[2], 10);
      const tujuanN = parseInt(m[3], 10);
      return [
        m[1].toLowerCase(),                                                       // T1-01
        `t${misiN}-${String(tujuanN).padStart(2, "0")}`,                          // t1-01
        `t${misiN}-${tujuanN}`,                                                    // t1-1
        `t${String(misiN).padStart(2, "0")}-${String(tujuanN).padStart(2, "0")}`, // t01-01
      ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate
    }

    let fixed = 0;
    let skipped = 0;
    const updates = [];

    for (const row of indikators) {
      const prefixes = extractPrefix(row.kode_indikator);
      if (!prefixes.length) { skipped++; continue; }

      let matched = null;
      for (const prefix of prefixes) {
        const key = `${row.periode_id}|${prefix}`;
        if (tujuanMap.has(key)) {
          matched = tujuanMap.get(key);
          break;
        }
      }

      if (!matched) { skipped++; continue; }
      if (matched.id === row.tujuan_id) { skipped++; continue; } // sudah benar

      updates.push({ id: row.id, tujuan_id: matched.id, misi_id: matched.misi_id });
      fixed++;
    }

    if (updates.length) {
      for (const upd of updates) {
        await queryInterface.sequelize.query(
          `UPDATE indikatortujuans SET tujuan_id = ?, misi_id = ? WHERE id = ?`,
          { replacements: [upd.tujuan_id, upd.misi_id, upd.id] }
        );
      }
      console.log(`[migration] Diperbaiki: ${fixed} baris indikatortujuans (tujuan_id dikoreksi).`);
    } else {
      console.log(`[migration] Semua baris sudah benar atau tidak ada yang cocok (skip: ${skipped}).`);
    }
  },

  down: async () => {
    // Tidak ada rollback otomatis — data asli (salah) tidak disimpan.
    // Jalankan ulang import jika perlu rollback.
    console.warn("[migration] down: tidak ada rollback otomatis untuk fix tujuan_id.");
  },
};
