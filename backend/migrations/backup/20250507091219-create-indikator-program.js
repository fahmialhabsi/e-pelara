'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IndikatorPrograms', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sasaran_id: {
        type: Sequelize.BIGINT
      },
      kode_program: {
        type: Sequelize.STRING
      },
      nama_program: {
        type: Sequelize.TEXT
      },
      uraian: {
        type: Sequelize.TEXT
      },
      satuan: {
        type: Sequelize.STRING
      },
      target: {
        type: Sequelize.FLOAT
      },
      tahun: {
        type: Sequelize.INTEGER
      },
      anggaran: {
        type: Sequelize.FLOAT
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
    await queryInterface.dropTable('IndikatorPrograms');
  }
};