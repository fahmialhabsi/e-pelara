"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("rkpd", {
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

      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // FK sementara dinonaktifkan
      },

      renstra_program_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // FK sementara dinonaktifkan
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
    await queryInterface.dropTable("rkpd");
  },
};
