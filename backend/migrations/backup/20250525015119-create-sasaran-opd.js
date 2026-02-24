"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("sasaran_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tujuan_id: { type: Sequelize.INTEGER, allowNull: false },
      rpjmd_sasaran_id: { type: Sequelize.INTEGER, allowNull: false },
      nomor: { type: Sequelize.STRING, allowNull: false },
      isi_sasaran: { type: Sequelize.TEXT, allowNull: false },
      no_rpjmd: { type: Sequelize.STRING, allowNull: true },
      isi_sasaran_rpjmd: { type: Sequelize.TEXT, allowNull: true },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("sasaran_opd");
  },
};
