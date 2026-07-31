'use strict';

/**
 * Inovasi Bidang Urusan.
 *
 * Dikelola di modul RKPD (per tahun/OPD), lalu ditarik (recall) oleh
 * modul Renja Permendagri 14/2026 untuk mengisi Bab II.5 saat generate
 * dokumen. Sama seperti Pokir DPRD, data tidak selalu tersedia setiap
 * tahun, sehingga disimpan per tahun tanpa terikat ke dokumen Renja
 * tertentu.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renja_inovasi_bidang_urusan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      perangkat_daerah_id: { type: Sequelize.INTEGER, allowNull: false },
      nama_inovasi: { type: Sequelize.STRING(255), allowNull: false },
      bentuk_inovasi: { type: Sequelize.STRING(150), allowNull: true },
      deskripsi: { type: Sequelize.TEXT, allowNull: true },
      tahun_mulai: { type: Sequelize.STRING(4), allowNull: true },
      manfaat: { type: Sequelize.TEXT, allowNull: true },
      jumlah: { type: Sequelize.INTEGER, allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renja_inovasi_bidang_urusan', ['tahun', 'perangkat_daerah_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renja_inovasi_bidang_urusan');
  },
};
