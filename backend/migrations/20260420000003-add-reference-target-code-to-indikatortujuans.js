"use strict";

/**
 * Tambahkan kolom `reference_target_code` ke `indikatortujuans`.
 *
 * Kolom ini menyimpan kode prefix tujuan yang di-parse dari `kode_indikator`
 * saat import Excel, misal "T1-01" dari "T1-01-02". Dipakai frontend untuk
 * mem-filter dropdown referensi berdasarkan tujuan yang dipilih pengguna,
 * tanpa bergantung pada `tujuan_id` / `misi_id` lama yang mungkin salah.
 *
 * Backfill: semua baris `is_import_reference = 1` yang `kode_indikator`-nya
 * berformat T{misi}-{no}-{seq} akan langsung diisi prefix-nya.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Tambah kolom
    await queryInterface.addColumn("indikatortujuans", "reference_target_code", {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      after: "is_import_reference",
    });

    // 2. Backfill: isi reference_target_code dari kode_indikator format T{m}-{n}-{seq}
    //    Hanya baris is_import_reference = 1 yang perlu diisi (baris referensi impor).
    //    Baris final (is_import_reference = 0) tidak memerlukan kolom ini.
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, kode_indikator
       FROM indikatortujuans
       WHERE is_import_reference = 1
         AND kode_indikator REGEXP '^T[0-9]+-[0-9]+-[0-9]+'`
    );

    if (!rows.length) {
      console.log("[migration] Tidak ada baris referensi impor untuk dibackfill reference_target_code.");
      return;
    }

    let filled = 0;
    for (const row of rows) {
      const m = String(row.kode_indikator || "").trim().match(/^(T\d+-\d+)-\d+$/i);
      if (!m) continue;
      // Normalisasi ke huruf besar agar konsisten (T1-01 bukan t1-01)
      const prefix = m[1].toUpperCase();
      await queryInterface.sequelize.query(
        `UPDATE indikatortujuans SET reference_target_code = ? WHERE id = ?`,
        { replacements: [prefix, row.id] }
      );
      filled++;
    }

    console.log(`[migration] reference_target_code diisi untuk ${filled} baris referensi impor.`);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("indikatortujuans", "reference_target_code");
  },
};
