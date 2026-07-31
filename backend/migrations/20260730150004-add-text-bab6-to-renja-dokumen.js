'use strict';

/**
 * Kolom `text_bab6` pada `renja_dokumen`.
 *
 * Sistematika Permendagri 86/2017 hanya 5 bab sehingga tabel ini berhenti di
 * `text_bab5`. Permendagri 14/2026 menambah BAB VI PENUTUP, dan pada
 * sistematika baru itu BAB V berisi Kinerja Penyelenggaraan Bidang Urusan —
 * jadi isi penutup tidak boleh ditumpangkan ke `text_bab5`.
 *
 * Kolom ini tetap kosong untuk dokumen ber-`regulasi_acuan='86_2017'`.
 * Tipe disamakan dengan `text_bab1`..`text_bab5` yang sudah ada (MEDIUMTEXT).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renja_dokumen', 'text_bab6', {
      type: Sequelize.TEXT('medium'),
      allowNull: true,
      after: 'text_bab5',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('renja_dokumen', 'text_bab6');
  },
};
