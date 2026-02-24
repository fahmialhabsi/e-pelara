"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_tabel_subkegiatan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      subkegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      baseline: {
        type: Sequelize.FLOAT,
      },
      satuan_target: {
        type: Sequelize.STRING,
      },

      // tambahan field identitas
      kode_subkegiatan: {
        type: Sequelize.STRING,
      },
      nama_subkegiatan: {
        type: Sequelize.STRING,
      },
      sub_bidang_penanggung_jawab: {
        type: Sequelize.STRING,
      },

      // target per tahun
      target_tahun_1: { type: Sequelize.FLOAT },
      target_tahun_2: { type: Sequelize.FLOAT },
      target_tahun_3: { type: Sequelize.FLOAT },
      target_tahun_4: { type: Sequelize.FLOAT },
      target_tahun_5: { type: Sequelize.FLOAT },
      target_tahun_6: { type: Sequelize.FLOAT },

      // pagu per tahun
      pagu_tahun_1: { type: Sequelize.DECIMAL(20, 2) },
      pagu_tahun_2: { type: Sequelize.DECIMAL(20, 2) },
      pagu_tahun_3: { type: Sequelize.DECIMAL(20, 2) },
      pagu_tahun_4: { type: Sequelize.DECIMAL(20, 2) },
      pagu_tahun_5: { type: Sequelize.DECIMAL(20, 2) },
      pagu_tahun_6: { type: Sequelize.DECIMAL(20, 2) },

      lokasi: {
        type: Sequelize.STRING,
      },
      target_akhir_renstra: {
        type: Sequelize.DECIMAL(10, 0),
      },
      pagu_akhir_renstra: {
        type: Sequelize.DECIMAL(20, 2),
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("renstra_tabel_subkegiatan");
  },
};
