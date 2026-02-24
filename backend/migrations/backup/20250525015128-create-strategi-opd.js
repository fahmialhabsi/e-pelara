"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("strategi_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      sasaran_id: { type: Sequelize.INTEGER, allowNull: false },
      rpjmd_strategi_id: { type: Sequelize.INTEGER, allowNull: true },
      kode_strategi: { type: Sequelize.STRING, allowNull: true },
      deskripsi: { type: Sequelize.TEXT, allowNull: false },
      no_rpjmd: { type: Sequelize.STRING, allowNull: true },
      isi_strategi_rpjmd: { type: Sequelize.TEXT, allowNull: true },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("strategi_opd");
  },
};
