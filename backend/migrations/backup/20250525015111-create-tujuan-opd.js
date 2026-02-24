"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("tujuan_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      renstra_id: { type: Sequelize.INTEGER, allowNull: false },
      rpjmd_tujuan_id: { type: Sequelize.UUID, allowNull: false },
      misi_id: { type: Sequelize.INTEGER, allowNull: true },
      no_tujuan: { type: Sequelize.STRING, allowNull: false },
      isi_tujuan: { type: Sequelize.TEXT, allowNull: false },
      no_rpjmd: { type: Sequelize.STRING, allowNull: true },
      isi_tujuan_rpjmd: { type: Sequelize.TEXT, allowNull: true },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("tujuan_opd");
  },
};
