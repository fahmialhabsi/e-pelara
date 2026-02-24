"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("kegiatan_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      program_id: { type: Sequelize.INTEGER, allowNull: false },
      kode_kegiatan: { type: Sequelize.STRING, allowNull: false },
      nama_kegiatan: { type: Sequelize.STRING, allowNull: false },
      bidang_opd: { type: Sequelize.STRING, allowNull: true },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("kegiatan_opd");
  },
};
