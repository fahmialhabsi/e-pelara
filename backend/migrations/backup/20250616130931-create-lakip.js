"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("lakip", {
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
      },

      kegiatan: {
        type: Sequelize.STRING,
      },

      indikator_kinerja: {
        type: Sequelize.TEXT,
      },

      target: {
        type: Sequelize.STRING,
      },

      realisasi: {
        type: Sequelize.STRING,
      },

      evaluasi: {
        type: Sequelize.TEXT,
      },

      rekomendasi: {
        type: Sequelize.TEXT,
      },

      jenis_dokumen: {
        type: Sequelize.STRING,
      },

      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "renstra_program",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      rkpd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "rkpd",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      renja_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "renja",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      lk_dispang_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "lk_dispang",
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
    await queryInterface.dropTable("lakip");
  },
};
