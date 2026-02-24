"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabel utama: renstra_target
    await queryInterface.createTable("renstra_target", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      lokasi: {
        type: Sequelize.STRING,
      },
      capaian_program: {
        type: Sequelize.DECIMAL(18, 2),
      },
      capaian_kegiatan: {
        type: Sequelize.DECIMAL(18, 2),
      },
      capaian_subkegiatan: {
        type: Sequelize.DECIMAL(18, 2),
      },
      satuan_program: Sequelize.STRING,
      pagu_program: Sequelize.BIGINT,
      satuan_kegiatan: Sequelize.STRING,
      pagu_kegiatan: Sequelize.BIGINT,
      satuan_subkegiatan: Sequelize.STRING,
      pagu_subkegiatan: Sequelize.BIGINT,
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    // Tabel detail: renstra_target_detail (multi-tahun)
    await queryInterface.createTable("renstra_target_detail", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      renstra_target_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "renstra_target",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      level: {
        // program/kegiatan/subkegiatan
        type: Sequelize.STRING,
        allowNull: false,
      },
      tahun: {
        // tahun target
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      target_value: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("renstra_target_detail");
    await queryInterface.dropTable("renstra_target");
  },
};
