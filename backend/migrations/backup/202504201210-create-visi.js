"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("visi", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      isi_visi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tahun_awal: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      tahun_akhir: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("visi");
  },
};
