"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("lk_dispang", {
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
        allowNull: false,
      },

      sub_kegiatan: {
        type: Sequelize.STRING,
      },

      akun_belanja: {
        type: Sequelize.STRING,
      },

      jenis_belanja: {
        type: Sequelize.STRING,
      },

      anggaran: {
        type: Sequelize.DOUBLE,
      },

      realisasi: {
        type: Sequelize.DOUBLE,
      },

      sisa: {
        type: Sequelize.DOUBLE,
      },

      persen_realisasi: {
        type: Sequelize.DOUBLE,
      },

      sumber_dana: {
        type: Sequelize.STRING,
      },

      jenis_dokumen: {
        type: Sequelize.STRING,
      },

      dpa_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "dpa",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      penatausahaan_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "penatausahaan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      bmd_id: {
        type: Sequelize.INTEGER,
        references: {
          model: "bmd",
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
    await queryInterface.dropTable("lk_dispang");
  },
};
