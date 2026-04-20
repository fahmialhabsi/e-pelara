"use strict";

/**
 * Menambahkan kolom is_import_reference ke tabel indikatortujuans.
 *
 * Tujuan: memisahkan data referensi impor (dari "Terapkan" PDF/Excel) dari
 * data final hasil wizard "Simpan & Lanjut".
 *   - is_import_reference = 1 → baris ditulis oleh alur impor (referensi/staging)
 *   - is_import_reference = 0 → baris final yang disimpan pengguna via wizard
 *
 * Dengan flag ini:
 *   • dropdown Nama Indikator di Step Tujuan membaca baris referensi (is_import_reference=1)
 *   • Daftar Indikator RPJMD hanya menampilkan baris final (is_import_reference=0)
 *   • kode generator hanya menghitung baris final → urutan mulai dari T1-01-01
 *   • Wizard "Simpan" me-promote baris referensi menjadi final (tidak create baru → tidak ada 409)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatortujuans", "is_import_reference", {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0,
      comment:
        "1 = baris referensi dari impor PDF/Excel; 0 = data final hasil wizard",
      after: "periode_id",
    });

    // Tandai semua baris yang ada sebagai data final (0) — data lama sudah disimpan via wizard
    await queryInterface.sequelize.query(
      "UPDATE indikatortujuans SET is_import_reference = 0 WHERE is_import_reference IS NULL"
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn(
      "indikatortujuans",
      "is_import_reference"
    );
  },
};
