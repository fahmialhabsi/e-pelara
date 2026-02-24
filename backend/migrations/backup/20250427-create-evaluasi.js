"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("evaluasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      tanggal_evaluasi: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      catatan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      target: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      realisasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      realisasi: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("evaluasi");
  },
};
