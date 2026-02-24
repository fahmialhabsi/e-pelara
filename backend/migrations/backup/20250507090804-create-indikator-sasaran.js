'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IndikatorSasarans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tujuan_id: {
        type: Sequelize.UUID
      },
      kode_sasaran: {
        type: Sequelize.STRING
      },
      uraian: {
        type: Sequelize.TEXT
      },
      satuan: {
        type: Sequelize.STRING
      },
      target_awal: {
        type: Sequelize.FLOAT
      },
      target_akhir: {
        type: Sequelize.FLOAT
      },
      tahun_awal: {
        type: Sequelize.INTEGER
      },
      tahun_akhir: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('IndikatorSasarans');
  }
};