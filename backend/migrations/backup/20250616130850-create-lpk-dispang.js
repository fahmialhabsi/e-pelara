"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("lpk_dispang", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tahun: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      pelaksana: {
        type: Sequelize.STRING,
      },
      capaian: {
        type: Sequelize.TEXT,
      },
      kendala: {
        type: Sequelize.TEXT,
      },
      rekomendasi: {
        type: Sequelize.TEXT,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
      },
      monev_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "monev",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("lpk_dispang");
  },
};
