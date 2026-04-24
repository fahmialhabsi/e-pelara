"use strict";

/**
 * Kolom 'jenis' di ketiga tabel indikator baru terlalu pendek (VARCHAR 100).
 * Ubah ke TEXT agar bisa menerima uraian panjang.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const TEXT = { type: Sequelize.TEXT, allowNull: true };

    await queryInterface.changeColumn("indikatorstrategis",      "jenis", TEXT);
    await queryInterface.changeColumn("indikatorarahkebijakans", "jenis", TEXT);
    await queryInterface.changeColumn("indikatorsubkegiatans",   "jenis", TEXT);
  },

  async down(queryInterface, Sequelize) {
    const STR100 = { type: Sequelize.STRING(100), allowNull: true };

    await queryInterface.changeColumn("indikatorstrategis",      "jenis", STR100);
    await queryInterface.changeColumn("indikatorarahkebijakans", "jenis", STR100);
    await queryInterface.changeColumn("indikatorsubkegiatans",   "jenis", STR100);
  },
};
