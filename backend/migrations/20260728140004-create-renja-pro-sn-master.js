'use strict';

/**
 * Tabel C-1 — Program Strategis Nasional (Pro-SN).
 *
 * Daftar tetap dari Kemendagri, sama untuk semua provinsi. Di-seed
 * sekali sebagai data referensi, dipakai sebagai sumber pilihan
 * (dropdown) Pro-SN dan Proyek/Kegiatan saat OPD mengisi Tabel C-2.
 * Tidak terikat tahun/OPD.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renja_pro_sn_master', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      pro_sn: { type: Sequelize.STRING(150), allowNull: false },
      proyek_kegiatan: { type: Sequelize.STRING(255), allowNull: false },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renja_pro_sn_master', ['pro_sn']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renja_pro_sn_master');
  },
};
