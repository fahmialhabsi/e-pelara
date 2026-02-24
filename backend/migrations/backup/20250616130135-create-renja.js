"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("renja", {
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
      program: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sub_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      indikator: {
        type: Sequelize.STRING,
      },
      target: {
        type: Sequelize.STRING,
      },
      anggaran: {
        type: Sequelize.DOUBLE,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
      },
      rkpd_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "rkpd",
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
    await queryInterface.dropTable("renja");
  },
};
