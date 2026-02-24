"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("kegiatan", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      program_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "program", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      kode_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      definisi_operasional: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metode_penghitungan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      jenis_indikator: {
        type: Sequelize.ENUM("kuantitatif", "kualitatif"),
        allowNull: false,
      },
      definisi_kuantitatif: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      definisi_kualitatif: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      satuan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      baseline: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      target_2025: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      target_2026: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      target_2027: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      target_2028: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      target_2029: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      target_akhir: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      realisasi_2025: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      realisasi_2026: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      realisasi_2027: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      realisasi_2028: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      realisasi_2029: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      realisasi_akhir: {
        type: Sequelize.DECIMAL,
        allowNull: true,
      },
      rasional_indikator: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      penanggungjawab_indikator: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tanggal_revisi: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("kegiatan");
  },
};
