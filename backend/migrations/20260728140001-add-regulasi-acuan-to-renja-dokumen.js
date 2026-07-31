'use strict';

/**
 * Menambahkan kolom penanda acuan regulasi sistematika Renja pada
 * renja_dokumen, guna mendukung dua sistematika berdampingan:
 *
 * - 86_2017 : Permendagri 86/2017 (final untuk Renja Tahun 2020–2025,
 *             tidak boleh berubah agar jejak dokumen yang sudah
 *             ditetapkan tetap konsisten).
 * - 14_2026 : Permendagri 14/2026 tentang Pedoman Penyusunan RKPD
 *             Tahun 2027 (berlaku untuk Renja Tahun 2026 dan 2027).
 *
 * Default '86_2017' agar seluruh dokumen existing tidak berubah perilaku
 * generator/render-nya setelah migrasi ini dijalankan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renja_dokumen', 'regulasi_acuan', {
      type: Sequelize.ENUM('86_2017', '14_2026'),
      allowNull: false,
      defaultValue: '86_2017',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('renja_dokumen', 'regulasi_acuan');
  },
};
