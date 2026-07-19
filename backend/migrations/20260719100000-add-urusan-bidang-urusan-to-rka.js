'use strict';

/**
 * Field "Urusan Pemerintahan" & "Bidang Urusan" (Permendagri 90/2019) belum
 * pernah dimodelkan — export/print RKA selama ini mengandalkan fallback teks
 * hardcode salah ("URUSAN PEMERINTAHAN WAJIB" tanpa embel-embel) + kode yang
 * keliru diambil (2 segmen kode_program alih-alih 1 segmen Urusan saja).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rka', 'urusan', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama Urusan Pemerintahan (mis. "URUSAN PEMERINTAHAN WAJIB YANG TIDAK BERKAITAN DENGAN PELAYANAN DASAR")',
    });
    await queryInterface.addColumn('rka', 'kode_urusan', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: 'Kode Urusan 1 digit (mis. "2")',
    });
    await queryInterface.addColumn('rka', 'bidang_urusan', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama Bidang Urusan (mis. "URUSAN PEMERINTAHAN BIDANG PANGAN")',
    });
    await queryInterface.addColumn('rka', 'kode_bidang_urusan', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: 'Kode Bidang Urusan (mis. "2.09")',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rka', 'urusan');
    await queryInterface.removeColumn('rka', 'kode_urusan');
    await queryInterface.removeColumn('rka', 'bidang_urusan');
    await queryInterface.removeColumn('rka', 'kode_bidang_urusan');
  },
};
