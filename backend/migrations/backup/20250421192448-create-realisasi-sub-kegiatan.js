'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('RealisasiSubKegiatans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sub_kegiatan_id: {
        type: Sequelize.INTEGER
      },
      tahun: {
        type: Sequelize.INTEGER
      },
      triwulan: {
        type: Sequelize.INTEGER
      },
      target_fisik: {
        type: Sequelize.FLOAT
      },
      realisasi_fisik: {
        type: Sequelize.FLOAT
      },
      target_anggaran: {
        type: Sequelize.FLOAT
      },
      realisasi_anggaran: {
        type: Sequelize.FLOAT
      },
      kendala: {
        type: Sequelize.TEXT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RealisasiSubKegiatans');
  }
};