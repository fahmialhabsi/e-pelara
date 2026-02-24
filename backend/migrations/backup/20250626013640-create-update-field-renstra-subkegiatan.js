"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("renstra_subkegiatan", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      renstra_program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "renstra_program",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "renstra_kegiatan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sub_kegiatan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      kode_sub_kegiatan: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nama_sub_kegiatan: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      sub_bidang_opd: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      nama_opd: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      nama_bidang_opd: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      renstra_opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "renstra_opd",
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
    await queryInterface.dropTable("renstra_subkegiatan");
  },
};
