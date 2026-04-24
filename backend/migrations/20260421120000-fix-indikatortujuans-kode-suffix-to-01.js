"use strict";

/**
 * Data-fix: koreksi kode_indikator untuk baris is_import_reference = true pada indikatortujuans.
 *
 * Desain bisnis: satu no_tujuan unik = satu indikator tujuan referensi → kode suffix SELALU "-01".
 * Dedup berbasis tujuan.no_tujuan karena tabel tujuan sendiri bisa punya duplikat no_tujuan
 * (id berbeda, no_tujuan sama). Simpan 1 baris per (no_tujuan, jenis_dokumen, tahun, periode_id).
 *
 * Urutan aman: (1) dedup dulu, (2) update kode.
 */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;

    // 1. Hapus duplikat import reference berdasarkan no_tujuan yang sama.
    //    Pertahankan id MIN per (no_tujuan, periode_id, jenis_dokumen, tahun), hapus sisanya.
    await qi.query(
      `DELETE it FROM indikatortujuans it
       JOIN tujuan t ON t.id = it.tujuan_id
       JOIN (
         SELECT MIN(it2.id) AS keep_id,
                t2.no_tujuan,
                it2.periode_id,
                it2.jenis_dokumen,
                it2.tahun
         FROM indikatortujuans it2
         JOIN tujuan t2 ON t2.id = it2.tujuan_id
         WHERE it2.is_import_reference = 1
           AND it2.tujuan_id IS NOT NULL
           AND t2.no_tujuan IS NOT NULL
         GROUP BY t2.no_tujuan, it2.periode_id, it2.jenis_dokumen, it2.tahun
         HAVING COUNT(*) > 1
       ) dup ON t.no_tujuan = dup.no_tujuan
             AND it.periode_id = dup.periode_id
             AND it.jenis_dokumen = dup.jenis_dokumen
             AND it.tahun = dup.tahun
       WHERE it.is_import_reference = 1
         AND it.id != dup.keep_id`,
      { raw: true }
    );

    // 2. Update kode_indikator → ${no_tujuan}-01
    //    Setelah dedup, setiap no_tujuan hanya punya 1 baris → tidak ada konflik unique.
    await qi.query(
      `UPDATE indikatortujuans it
       JOIN tujuan t ON t.id = it.tujuan_id
       SET it.kode_indikator = CONCAT(t.no_tujuan, '-01')
       WHERE it.is_import_reference = 1
         AND it.tujuan_id IS NOT NULL
         AND t.no_tujuan IS NOT NULL
         AND t.no_tujuan != ''`,
      { raw: true }
    );
  },

  async down() {
    // Tidak ada rollback — data-fix hanya ke depan.
  },
};
