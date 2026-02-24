"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("monev", {
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
      lokasi: {
        type: Sequelize.STRING,
      },
      capaian_kinerja: {
        type: Sequelize.TEXT,
      },
      kendala: {
        type: Sequelize.TEXT,
      },
      tindak_lanjut: {
        type: Sequelize.TEXT,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
      },
      pengkeg_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "pengkeg",
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
    await queryInterface.dropTable("monev");
  },
};
