"use strict";

/**
 * Kolom 'jenis' di beberapa tabel indikator masih VARCHAR(100) — terlalu pendek
 * untuk uraian bebas. Ubah semua ke TEXT.
 *
 * Tabel yang difix:
 *   - indikatorsasarans      (Sasaran step)
 *   - indikatorkegiatans     (Kegiatan step)
 *   - indikatorarahkebijakans (Arah Kebijakan step) ← tabel baru
 *   - indikatorsubkegiatans  (Sub Kegiatan step)    ← tabel baru
 *
 * Sudah TEXT sebelumnya (tidak diubah):
 *   - indikator_program   → sudah TEXT
 *   - indikatorstrategis  → sudah difix migration 20260415120001
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const TEXT = { type: Sequelize.TEXT, allowNull: true };

    await queryInterface.changeColumn("indikatorsasarans",      "jenis", TEXT);
    await queryInterface.changeColumn("indikatorkegiatans",     "jenis", TEXT);
    await queryInterface.changeColumn("indikatorarahkebijakans","jenis", TEXT);
    await queryInterface.changeColumn("indikatorsubkegiatans",  "jenis", TEXT);
  },

  async down(queryInterface, Sequelize) {
    const STR100 = { type: Sequelize.STRING(100), allowNull: true };

    await queryInterface.changeColumn("indikatorsasarans",      "jenis", STR100);
    await queryInterface.changeColumn("indikatorkegiatans",     "jenis", STR100);
    await queryInterface.changeColumn("indikatorarahkebijakans","jenis", STR100);
    await queryInterface.changeColumn("indikatorsubkegiatans",  "jenis", STR100);
  },
};
