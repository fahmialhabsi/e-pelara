"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("renstra_tabel_subkegiatan", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "renstra_program", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "renstra_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subkegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "renstra_subkegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      indikator_manual: { type: Sequelize.STRING(255), allowNull: true },
      baseline: { type: Sequelize.FLOAT, allowNull: true },
      satuan_target: { type: Sequelize.STRING(255), allowNull: true },
      kode_subkegiatan: { type: Sequelize.STRING(255), allowNull: true },
      nama_subkegiatan: { type: Sequelize.STRING(255), allowNull: true },
      sub_bidang_penanggung_jawab: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      target_tahun_1: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_2: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_3: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_4: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_5: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_6: { type: Sequelize.FLOAT, allowNull: true },
      pagu_tahun_1: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_2: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_3: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_4: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_5: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_6: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      target_akhir_renstra: { type: Sequelize.DECIMAL(10, 0), allowNull: true },
      pagu_akhir_renstra: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      renstra_opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "renstra_opd", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("renstra_tabel_subkegiatan");
  },
};
