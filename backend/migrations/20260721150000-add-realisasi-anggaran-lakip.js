"use strict";

/**
 * Tambah kolom pagu & realisasi anggaran (Rp) ke Lakip. Lakip tidak punya
 * kode_sub_kegiatan/pagu sama sekali sebelumnya (kolom target/realisasi yang
 * sudah ada dipakai untuk realisasi KINERJA, bukan Rp). Nilainya di-sync dari
 * renstra_tabel_subkegiatan (yang sudah lebih dulu di-sync dari Penatausahaan,
 * lihat renstraRealisasiAnggaranSyncService.js), bukan diisi manual lewat form.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("lakip", "pagu_anggaran", {
      type: Sequelize.DECIMAL(20, 2),
      defaultValue: 0,
    });
    await queryInterface.addColumn("lakip", "realisasi_anggaran", {
      type: Sequelize.DECIMAL(20, 2),
      defaultValue: 0,
    });
    await queryInterface.addColumn("lakip", "realisasi_anggaran_synced_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("lakip", "pagu_anggaran");
    await queryInterface.removeColumn("lakip", "realisasi_anggaran");
    await queryInterface.removeColumn("lakip", "realisasi_anggaran_synced_at");
  },
};
