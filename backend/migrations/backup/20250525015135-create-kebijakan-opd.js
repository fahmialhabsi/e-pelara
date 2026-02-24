"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("kebijakan_opd", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      strategi_id: { type: Sequelize.INTEGER, allowNull: false },
      rpjmd_arah_id: { type: Sequelize.INTEGER, allowNull: true },
      kode_arah: { type: Sequelize.STRING, allowNull: true },
      deskripsi: { type: Sequelize.TEXT, allowNull: false },
      prioritas: {
        type: Sequelize.ENUM("Tinggi", "Sedang", "Rendah"),
        allowNull: true,
      },
      no_rpjmd: { type: Sequelize.STRING, allowNull: true },
      isi_arah_rpjmd: { type: Sequelize.TEXT, allowNull: true },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("kebijakan_opd");
  },
};
