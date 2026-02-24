"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("program_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      kebijakan_id: { type: Sequelize.INTEGER, allowNull: false },
      program_id: { type: Sequelize.INTEGER, allowNull: false },
      kode_program: { type: Sequelize.STRING, allowNull: false },
      nama_program: { type: Sequelize.STRING, allowNull: false },
      indikator_program: { type: Sequelize.TEXT, allowNull: true },
      opd_penanggung_jawab: { type: Sequelize.STRING, allowNull: true },
      bidang_opd_penanggung_jawab: { type: Sequelize.STRING, allowNull: true },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("program_opd");
  },
};
