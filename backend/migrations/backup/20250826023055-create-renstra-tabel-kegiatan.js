"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_tabel_kegiatan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "renstra_program",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "renstra_kegiatan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "indikator_renstra",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      baseline: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_1: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_2: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_3: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_4: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_5: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_tahun_6: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      pagu_tahun_1: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      pagu_tahun_2: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      pagu_tahun_3: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      pagu_tahun_4: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      pagu_tahun_5: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      pagu_tahun_6: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      lokasi: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      kode_kegiatan: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      nama_kegiatan: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      bidang_penanggung_jawab: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      target_akhir_renstra: {
        type: Sequelize.DECIMAL(10, 0),
        allowNull: true,
      },
      pagu_akhir_renstra: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("renstra_tabel_kegiatan");
  },
};
